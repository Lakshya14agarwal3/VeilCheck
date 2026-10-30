import httpx
import tenseal as ts

BASE = "http://127.0.0.1:8000"
BITS = [60, 40, 40, 60]


def main():
    info = httpx.get(f"{BASE}/info", timeout=10).json()
    if "mean" not in info or "scale" not in info:
        raise SystemExit("Server is missing model scaling information. Restart the server.")
    print("Enter four values in this order:", ", ".join(info["features"]))
    raw = [float(input(f"{name}: ")) for name in info["features"]]
    ctx = ts.context(ts.SCHEME_TYPE.CKKS, poly_modulus_degree=8192,
                     coeff_mod_bit_sizes=BITS)
    ctx.global_scale = 2**40
    ctx.generate_galois_keys()
    public = ctx.serialize(save_secret_key=False)
    response = httpx.post(f"{BASE}/context", content=public, timeout=30)
    response.raise_for_status()
    standardized = [(value - mean) / scale
                    for value, mean, scale in zip(raw, info["mean"], info["scale"])]
    encrypted = ts.ckks_vector(ctx, standardized).serialize()
    response = httpx.post(f"{BASE}/predict", content=encrypted, timeout=60)
    if response.is_error:
        raise SystemExit(f"Server prediction failed ({response.status_code}): {response.text}")
    response.raise_for_status()
    logit = ts.ckks_vector_from(ctx, response.content).decrypt()[0]
    if logit >= 0:
        probability = 1 / (1 + pow(2.718281828, -logit))
    else:
        exp_value = pow(2.718281828, logit)
        probability = exp_value / (1 + exp_value)
    print(f"Estimated probability: {probability:.1%}")
    print("Result:", "diabetic" if probability >= 0.5 else "not diabetic")


if __name__ == "__main__":
    main()
