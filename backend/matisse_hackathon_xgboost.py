# -*- coding: utf-8 -*-
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from model_config import (
    DATASET_FILENAME,
    DATASET_LABEL_COLUMN,
    EXCEL_TO_MODEL_COLUMNS,
    FEATURE_ORDER,
    MODEL_FILENAME,
)

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / DATASET_FILENAME
MODEL_PATH = BASE_DIR / MODEL_FILENAME


def load_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}")

    dataframe = pd.read_excel(DATASET_PATH)
    dataframe = dataframe.rename(columns=EXCEL_TO_MODEL_COLUMNS)

    missing_columns = [column for column in FEATURE_ORDER if column not in dataframe.columns]
    if missing_columns:
        raise ValueError(
            "Dataset is missing required feature columns: "
            + ", ".join(missing_columns)
        )

    if DATASET_LABEL_COLUMN not in dataframe.columns:
        raise ValueError(f"Dataset is missing label column '{DATASET_LABEL_COLUMN}'")

    return dataframe


def main() -> None:
    dataframe = load_dataset()

    X = dataframe[FEATURE_ORDER]
    y = dataframe[DATASET_LABEL_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=1,
        stratify=y,
    )

    model = XGBClassifier(
        max_depth=3,
        learning_rate=0.5,
        n_estimators=3,
        objective="multi:softprob",
        eval_metric="mlogloss",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred) * 100
    print(f"Accuracy of the XGBoost Model: {accuracy:.2f}%")

    sample_input = pd.DataFrame(
        [[290, 75, 2600, 22, 50]],
        columns=FEATURE_ORDER,
    )
    sample_prediction = int(model.predict(sample_input)[0])
    print(f"Sample prediction for {sample_input.iloc[0].to_dict()}: {sample_prediction}")

    joblib.dump(model, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")
    print(f"Feature order used by the model: {FEATURE_ORDER}")


if __name__ == "__main__":
    main()
