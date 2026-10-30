import csv
import json
import joblib
from pathlib import Path

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler

HERE = Path(__file__).resolve().parent
DATA = HERE / "prepared_diabetes.csv"
MODEL = HERE / "model.json"
MODEL_FILE = HERE / "diabetes_model.joblib"
FEATURES = ("hba1c", "fbg", "ogtt", "insulin")


def main():
    if not DATA.exists():
        raise SystemExit("Run python prepare_data.py first")
    with DATA.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    x = np.array([[float(row[k]) for k in FEATURES] for row in rows])
    y = np.array([int(row["diabetes"]) for row in rows])
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=0, stratify=y
    )
    scaler = StandardScaler().fit(x_train)
    network = MLPClassifier(hidden_layer_sizes=(), activation="logistic",
                            solver="lbfgs", max_iter=300, random_state=0)
    network.fit(scaler.transform(x_train), y_train)
    model = {
        "features": list(FEATURES),
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
        "weights": [w.tolist() for w in network.coefs_],
        "biases": [b.tolist() for b in network.intercepts_],
        "accuracy": float(network.score(scaler.transform(x_test), y_test)),
    }
    MODEL.write_text(json.dumps(model, indent=2), encoding="utf-8")
    joblib.dump({"model": network, "scaler": scaler, "features": list(FEATURES)}, MODEL_FILE)
    print(f"Saved {MODEL.name}; test accuracy: {model['accuracy']:.3f}")
    print(f"Saved {MODEL_FILE.name}")


if __name__ == "__main__":
    main()
