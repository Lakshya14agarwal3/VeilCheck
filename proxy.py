import asyncio
import math
import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
from pydantic import BaseModel, Field
import tenseal as ts

app = FastAPI(title="VeilCheck Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVER_URL = "http://127.0.0.1:8000"
BITS = [60, 40, 40, 60]

_context: Optional[ts.Context] = None
_context_lock = asyncio.Lock()
_context_sent_to_server = False
_model_info_cache: Optional[Dict[str, Any]] = None


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"detail": "Bad input: " + str(exc)},
    )


class PredictRequest(BaseModel):
    values: List[float] = Field(..., description="List of 4 values: [hba1c, fbg, ogtt, insulin]")


def _create_context_sync() -> ts.Context:
    ctx = ts.context(
        ts.SCHEME_TYPE.CKKS,
        poly_modulus_degree=8192,
        coeff_mod_bit_sizes=BITS,
    )
    ctx.global_scale = 2**40
    ctx.generate_galois_keys()
    return ctx


async def get_or_create_context() -> ts.Context:
    global _context
    if _context is not None:
        return _context
    async with _context_lock:
        if _context is None:
            _context = await asyncio.to_thread(_create_context_sync)
        return _context


async def send_public_context_to_server(client: httpx.AsyncClient, ctx: ts.Context):
    global _context_sent_to_server
    public_bytes = await asyncio.to_thread(ctx.serialize, save_secret_key=False)
    try:
        resp = await client.post(
            f"{SERVER_URL}/context",
            content=public_bytes,
            headers={"Content-Type": "application/octet-stream"},
            timeout=30.0,
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Inference server rejected context ({resp.status_code}): {resp.text}",
            )
        _context_sent_to_server = True
    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as exc:
        _context_sent_to_server = False
        raise HTTPException(
            status_code=502,
            detail=f"Inference server unreachable at {SERVER_URL}: {exc}",
        )
    except httpx.HTTPError as exc:
        _context_sent_to_server = False
        raise HTTPException(
            status_code=502,
            detail=f"Error communicating with inference server: {exc}",
        )


async def fetch_server_info(client: httpx.AsyncClient) -> Dict[str, Any]:
    global _model_info_cache
    try:
        resp = await client.get(f"{SERVER_URL}/info", timeout=10.0)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Server returned status {resp.status_code}: {resp.text}",
            )
        data = resp.json()
        if "mean" not in data or "scale" not in data:
            raise HTTPException(
                status_code=502,
                detail="Inference server is missing model scaling information (mean/scale).",
            )
        _model_info_cache = data
        return data
    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Inference server unreachable at {SERVER_URL}: {exc}",
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Error communicating with inference server: {exc}",
        )


@app.get("/health")
def health():
    return {"ok": True, "proxy": True}


@app.get("/api/info")
async def get_info():
    async with httpx.AsyncClient() as client:
        return await fetch_server_info(client)


@app.post("/api/predict")
async def predict(req: PredictRequest):
    # Validate values
    if not isinstance(req.values, list) or len(req.values) != 4:
        raise HTTPException(
            status_code=400,
            detail=f"Expected 'values' to contain exactly 4 numeric values [hba1c, fbg, ogtt, insulin], got {len(req.values) if isinstance(req.values, list) else 'invalid type'}.",
        )
    for idx, val in enumerate(req.values):
        if val is None or not isinstance(val, (int, float)) or not math.isfinite(val) or val <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid value at index {idx} ({val}). All values must be positive, finite numbers.",
            )

    async with httpx.AsyncClient() as client:
        # Fetch or reuse model info
        info = _model_info_cache or await fetch_server_info(client)
        mean = info["mean"]
        scale = info["scale"]
        if len(mean) != 4 or len(scale) != 4:
            raise HTTPException(
                status_code=502,
                detail="Model mean or scale from server does not have 4 features.",
            )

        # Standardize inputs
        standardized = [
            (float(val) - float(m)) / float(s)
            for val, m, s in zip(req.values, mean, scale)
        ]

        # Lazy context initialization and server context synchronization
        global _context_sent_to_server
        ctx = await get_or_create_context()
        if not _context_sent_to_server:
            await send_public_context_to_server(client, ctx)

        # 1. Encrypt inputs
        t_enc_start = time.perf_counter()
        try:
            encrypted_bytes = await asyncio.to_thread(
                lambda: ts.ckks_vector(ctx, standardized).serialize()
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Encryption failed: {exc}")
        encrypt_ms = round((time.perf_counter() - t_enc_start) * 1000, 2)

        # 2. Server prediction
        t_srv_start = time.perf_counter()
        try:
            resp = await client.post(
                f"{SERVER_URL}/predict",
                content=encrypted_bytes,
                headers={"Content-Type": "application/octet-stream"},
                timeout=60.0,
            )
            # If server restarted, it might have lost the context and return 409
            if resp.status_code == 409:
                await send_public_context_to_server(client, ctx)
                resp = await client.post(
                    f"{SERVER_URL}/predict",
                    content=encrypted_bytes,
                    headers={"Content-Type": "application/octet-stream"},
                    timeout=60.0,
                )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Server prediction failed ({resp.status_code}): {resp.text}",
                )
            prediction_bytes = resp.content
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Inference server unreachable at {SERVER_URL}: {exc}",
            )
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Error communicating with inference server: {exc}",
            )
        server_ms = round((time.perf_counter() - t_srv_start) * 1000, 2)

        # 3. Decrypt logit
        t_dec_start = time.perf_counter()
        try:
            def _decrypt(data: bytes) -> float:
                vec = ts.ckks_vector_from(ctx, data)
                return float(vec.decrypt()[0])

            logit = await asyncio.to_thread(_decrypt, prediction_bytes)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Decryption failed: {exc}")
        decrypt_ms = round((time.perf_counter() - t_dec_start) * 1000, 2)

        # Numerically stable sigmoid
        if logit >= 0:
            probability = 1.0 / (1.0 + math.exp(-logit))
        else:
            exp_val = math.exp(logit)
            probability = exp_val / (1.0 + exp_val)

        label = "diabetic" if probability >= 0.5 else "not diabetic"

        ciphertext_hex = encrypted_bytes.hex()
        ciphertext_preview = ciphertext_hex[:32]

        return {
            "probability": probability,
            "label": label,
            "logit": logit,
            "ciphertext_bytes": len(encrypted_bytes),
            "ciphertext_preview": ciphertext_preview,
            "timings_ms": {
                "encrypt": encrypt_ms,
                "server": server_ms,
                "decrypt": decrypt_ms,
            },
        }

