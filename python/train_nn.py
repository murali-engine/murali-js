"""Generate deterministic, frame-friendly training data for a tiny 2-3-3 MLP."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

SEED = 7
EPOCHS = 80
OUTPUT = Path(__file__).parent / "output" / "training_run.json"


def softmax(values: np.ndarray) -> np.ndarray:
    shifted = values - values.max(axis=1, keepdims=True)
    exp = np.exp(shifted)
    return exp / exp.sum(axis=1, keepdims=True)


def main() -> None:
    rng = np.random.default_rng(SEED)
    centers = np.array([[-1.2, -0.7], [1.1, -0.5], [0.0, 1.25]])
    x = np.vstack([center + rng.normal(0, 0.32, (48, 2)) for center in centers])
    y = np.repeat(np.arange(3), 48)
    targets = np.eye(3)[y]

    w1 = rng.normal(0, 0.45, (2, 3))
    b1 = np.zeros((1, 3))
    w2 = rng.normal(0, 0.45, (3, 3))
    b2 = np.zeros((1, 3))
    learning_rate = 0.12
    snapshots: list[dict[str, object]] = []

    for epoch in range(EPOCHS + 1):
        hidden = np.tanh(x @ w1 + b1)
        probabilities = softmax(hidden @ w2 + b2)
        loss = -np.mean(np.log(probabilities[np.arange(len(y)), y] + 1e-12))
        accuracy = np.mean(np.argmax(probabilities, axis=1) == y)
        snapshots.append({
            "epoch": epoch,
            "loss": float(loss),
            "accuracy": float(accuracy),
            "weights": {"input": w1.tolist(), "output": w2.tolist()},
            "sampleActivations": hidden[0].tolist(),
        })
        if epoch == EPOCHS:
            break
        output_gradient = (probabilities - targets) / len(y)
        w2_gradient = hidden.T @ output_gradient
        b2_gradient = output_gradient.sum(axis=0, keepdims=True)
        hidden_gradient = (output_gradient @ w2.T) * (1 - hidden**2)
        w1 -= learning_rate * (x.T @ hidden_gradient)
        b1 -= learning_rate * hidden_gradient.sum(axis=0, keepdims=True)
        w2 -= learning_rate * w2_gradient
        b2 -= learning_rate * b2_gradient

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"seed": SEED, "epochs": snapshots}, separators=(",", ":")))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
