from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from model_config import (
    COLOR_MAP,
    DATASET_FILENAME,
    DATASET_LABEL_COLUMN,
    EXCEL_TO_MODEL_COLUMNS,
    FEATURE_DISPLAY_NAMES,
    FEATURE_ORDER,
    LABEL_MAP,
    MODEL_FILENAME,
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / MODEL_FILENAME
DATASET_PATH = BASE_DIR / DATASET_FILENAME

app = Flask(__name__)
CORS(app)

_model = None
_dataset_rows = None


def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model file not found at {MODEL_PATH}. "
                "Run train_model.py or copy in the existing xgb_model.pkl."
            )
        _model = joblib.load(MODEL_PATH)
    return _model


def get_dataset_rows():
    global _dataset_rows
    if _dataset_rows is None:
        if not DATASET_PATH.exists():
            raise FileNotFoundError(
                f"Dataset file not found at {DATASET_PATH}. "
                "Copy the Excel dataset into backend/ to enable replay mode."
            )

        dataframe = pd.read_excel(DATASET_PATH).rename(columns=EXCEL_TO_MODEL_COLUMNS)

        missing_features = [feature for feature in FEATURE_ORDER if feature not in dataframe.columns]
        if missing_features:
            raise ValueError(f"Dataset is missing required features: {', '.join(missing_features)}")

        if DATASET_LABEL_COLUMN not in dataframe.columns:
            raise ValueError(f"Dataset is missing label column '{DATASET_LABEL_COLUMN}'")

        _dataset_rows = []
        for row_index, record in enumerate(dataframe.to_dict(orient="records"), start=1):
            sensor_data = {
                feature_name: float(record[feature_name])
                for feature_name in FEATURE_ORDER
            }
            dataset_class = int(record[DATASET_LABEL_COLUMN])
            _dataset_rows.append(
                {
                    "row_id": row_index,
                    "sensor_data": sensor_data,
                    "dataset_class": dataset_class,
                    "dataset_label": LABEL_MAP[dataset_class],
                }
            )

    return _dataset_rows


def build_feature_array(payload: Dict[str, Any]) -> pd.DataFrame:
    missing_features = [feature for feature in FEATURE_ORDER if feature not in payload]
    if missing_features:
        raise ValueError(f"Missing required features: {', '.join(missing_features)}")

    ordered_values: List[float] = []
    for feature in FEATURE_ORDER:
        try:
            ordered_values.append(float(payload[feature]))
        except (TypeError, ValueError) as error:
            raise ValueError(f"Feature '{feature}' must be numeric.") from error

    return pd.DataFrame([ordered_values], columns=FEATURE_ORDER, dtype=float)


def build_feature_importance(model: Any) -> List[Dict[str, float]]:
    importances = getattr(model, "feature_importances_", None)
    if importances is None:
        return []

    formatted = [
        {
            "name": FEATURE_DISPLAY_NAMES[feature_name],
            "importance": float(importance),
        }
        for feature_name, importance in zip(FEATURE_ORDER, importances)
    ]
    return sorted(formatted, key=lambda item: item["importance"], reverse=True)


@app.get("/health")
def healthcheck():
    model_ready = MODEL_PATH.exists()
    dataset_ready = DATASET_PATH.exists()
    return jsonify(
        {
            "status": "ok",
            "model_loaded": model_ready,
            "model_path": str(MODEL_PATH),
            "dataset_loaded": dataset_ready,
            "dataset_path": str(DATASET_PATH),
        }
    )


@app.get("/dataset/replay")
def dataset_replay():
    try:
        rows = get_dataset_rows()
    except FileNotFoundError as error:
        return jsonify({"detail": str(error)}), 404
    except ValueError as error:
        return jsonify({"detail": str(error)}), 400
    except Exception as error:  # pragma: no cover - demo-friendly safeguard
        return jsonify({"detail": f"Dataset replay failed: {error}"}), 500

    return jsonify(
        {
            "rows": rows,
            "total_rows": len(rows),
            "feature_order": FEATURE_ORDER,
        }
    )


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"detail": "Request body must be a JSON object."}), 400

    try:
        features = build_feature_array(payload)
        model = get_model()
        prediction = int(model.predict(features)[0])
    except FileNotFoundError as error:
        return jsonify({"detail": str(error)}), 503
    except ValueError as error:
        return jsonify({"detail": str(error)}), 400
    except Exception as error:  # pragma: no cover - demo-friendly safeguard
        return jsonify({"detail": f"Prediction failed: {error}"}), 500

    confidence = None
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(features)[0]
        confidence = float(np.max(probabilities))

    response = {
        "prediction": prediction,
        "label": LABEL_MAP[prediction],
        "color": COLOR_MAP[prediction],
        "feature_order": FEATURE_ORDER,
        "feature_importance": build_feature_importance(model),
    }

    if confidence is not None:
        response["confidence"] = confidence

    return jsonify(response)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
