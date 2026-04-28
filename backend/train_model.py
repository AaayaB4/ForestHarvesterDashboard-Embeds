import argparse
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from model_config import DATASET_LABEL_COLUMN, EXCEL_TO_MODEL_COLUMNS, FEATURE_ORDER, MODEL_FILENAME

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = BASE_DIR / "data"
DEFAULT_OUTPUT_PATH = BASE_DIR / MODEL_FILENAME


def resolve_label_column(dataframe: pd.DataFrame, requested_label_column: Optional[str]) -> str:
    if requested_label_column:
        if requested_label_column not in dataframe.columns:
            raise ValueError(f"Label column '{requested_label_column}' not found in dataset.")
        return requested_label_column

    remaining_columns = [column for column in dataframe.columns if column not in FEATURE_ORDER]
    if len(remaining_columns) == 1:
        return remaining_columns[0]

    for candidate in ("Condition", "Status", "Label", "Target", "Class"):
        if candidate in dataframe.columns:
            return candidate

    raise ValueError(
        "Could not infer the label column from the Excel file. "
        "Pass --label-column explicitly."
    )


def resolve_dataset_path(requested_path: Optional[str]) -> Path:
    if requested_path:
        dataset_path = Path(requested_path).expanduser().resolve()
        if not dataset_path.exists():
            raise FileNotFoundError(f"Dataset not found at {dataset_path}")
        return dataset_path

    if not DEFAULT_DATA_DIR.exists():
        raise FileNotFoundError(
            f"No dataset path provided and {DEFAULT_DATA_DIR} does not exist. "
            "Place the Excel file under backend/data or pass --data."
        )

    excel_files = sorted(DEFAULT_DATA_DIR.glob("*.xlsx")) + sorted(DEFAULT_DATA_DIR.glob("*.xls"))
    if len(excel_files) != 1:
        raise FileNotFoundError(
            "Expected exactly one Excel file under backend/data, "
            f"found {len(excel_files)}."
        )

    return excel_files[0]


def main():
    parser = argparse.ArgumentParser(description="Train the harvester maintenance XGBoost classifier.")
    parser.add_argument("--data", help="Path to the Excel dataset.")
    parser.add_argument("--label-column", help="Name of the target column in the Excel file.")
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT_PATH),
        help="Where to save the trained xgb_model.pkl file.",
    )
    args = parser.parse_args()

    dataset_path = resolve_dataset_path(args.data)
    dataframe = pd.read_excel(dataset_path)
    dataframe = dataframe.rename(columns=EXCEL_TO_MODEL_COLUMNS)

    missing_features = [feature for feature in FEATURE_ORDER if feature not in dataframe.columns]
    if missing_features:
        raise ValueError(
            f"Dataset is missing required feature columns: {', '.join(missing_features)}"
        )

    label_column = resolve_label_column(dataframe, args.label_column or DATASET_LABEL_COLUMN)

    X = dataframe[FEATURE_ORDER]
    y = dataframe[label_column]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y if y.nunique() > 1 else None,
    )

    model = XGBClassifier(
        max_depth=3,
        learning_rate=0.5,
        n_estimators=3,
        objective="multi:softprob",
        eval_metric="mlogloss",
    )
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"Accuracy of the XGBoost Model: {accuracy:.4f}")

    output_path = Path(args.output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)
    print(f"Saved trained model to {output_path}")
    print(f"Feature order used by the model: {FEATURE_ORDER}")


if __name__ == "__main__":
    main()
