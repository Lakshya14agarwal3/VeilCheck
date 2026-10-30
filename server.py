import json
from pathlib import Path

import tenseal as ts
from fastapi import FastAPI, HTTPException, Request, Response

MODEL = json.loads(Path(__file__).with_name("model.json").read_text(encoding="utf-8"))
app = FastAPI(title="Local encrypted diabetes demo")
context = None


@app.get("/info")
def info():
    return {
        "features": MODEL["features"],
        "mean": MODEL["mean"],
        "scale": MODEL["scale"],
        "accuracy": MODEL["accuracy"],
    }


@app.get("/health")
def health():
    return {"ok": True, "model_loaded": True}


@app.post("/context")
async def set_context(request: Request):
    global context
    try:
        candidate = ts.context_from(await request.body())
        if candidate.has_secret_key():
            raise ValueError("secret key must stay on the client")
        context = candidate
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(400, f"Invalid public context: {exc}")


@app.post("/predict")
async def predict(request: Request):
    if context is None:
        raise HTTPException(409, "Send the public encryption context first")
    try:
        x = ts.ckks_vector_from(context, await request.body())
        for i, (weights, bias) in enumerate(zip(MODEL["weights"], MODEL["biases"])):
            x = x.matmul(weights) + bias
        return Response(x.serialize(), media_type="application/octet-stream")
    except Exception as exc:
        raise HTTPException(400, f"Encrypted prediction failed: {exc}")
