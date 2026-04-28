# AGENTS.md

This repository is a hackathon proof-of-concept for the EU MATISSE project. It demonstrates predictive maintenance for a Ponsse-style forest harvester by combining simulated or replayed sensor telemetry, an XGBoost classifier, a lightweight Python backend, and a React dashboard.

The goal is demo coherence, not production robustness. Do not overengineer this into a cloud, MLOps, or industrial predictive-maintenance system unless explicitly asked.

## Project Structure

- `backend/`: Python backend and ML assets.
- `backend/app.py`: Flask API used by the frontend.
- `backend/model_config.py`: shared backend constants for feature order, labels, colors, dataset file names, and Excel column mapping.
- `backend/matisse_hackathon_xgboost.py`: cleaned local version of the original Colab XGBoost script.
- `backend/train_model.py`: more general model training script.
- `backend/head harvester.xlsx`: Excel dataset used for training and dataset replay mode.
- `backend/xgb_model.pkl`: trained XGBoost model loaded by the API.
- `forest-harvester-dashboard/`: React frontend created with Create React App.
- `forest-harvester-dashboard/src/components/Dashboard.tsx`: main dashboard and mode orchestration.
- `forest-harvester-dashboard/src/api/sensors.ts`: frontend API calls, feature order, simulated telemetry, and prediction response normalization.

## Run Commands

Run backend from the Python backend directory:

```bash
cd /Users/maunu/ForestHarvesterDashboard-Embeds/backend
python3 app.py
```

Run frontend from the React app directory in a second terminal:

```bash
cd /Users/maunu/ForestHarvesterDashboard-Embeds/forest-harvester-dashboard
npm start
```

Open the app at:

```text
http://localhost:3000
```

The frontend expects the backend at `http://127.0.0.1:8000` by default. Override with:

```bash
REACT_APP_API_BASE_URL=http://host:port npm start
```

Important: `backend/` is not a Node project. Do not run `npm start` there. It has no `package.json`.

## Setup Notes

Python dependencies are listed in `backend/requirements.txt`. The project has been run directly with system/user `python3`; a venv is optional, not required.

To verify the active Python can import backend dependencies:

```bash
python3 -c "import flask, pandas, joblib, sklearn, xgboost; print('ok')"
```

On macOS, XGBoost may require `libomp`:

```bash
brew install libomp
```

Frontend dependencies are installed from `forest-harvester-dashboard/package.json`:

```bash
cd /Users/maunu/ForestHarvesterDashboard-Embeds/forest-harvester-dashboard
npm install
```

## Backend API

`GET /health`

Returns whether the model and dataset files are present:

- `model_loaded`
- `model_path`
- `dataset_loaded`
- `dataset_path`

`POST /predict`

Accepts exactly these model input fields:

```json
{
  "Hydraulic_Pressure": 215.2,
  "Hydraulic_Oil_Temperature": 58.4,
  "Saw_Blade_RPM": 1620,
  "Fuel_Consumption": 16.1,
  "Blade_Sharpness_Level": 78.0
}
```

Returns:

- `prediction`: `0`, `1`, or `2`
- `label`: `Normal`, `Warning`, or `Maintenance Required`
- `color`: `green`, `yellow`, or `red`
- `confidence`: max predicted probability when available
- `feature_importance`: model-level XGBoost feature importance
- `feature_order`: backend feature order

`GET /dataset/replay`

Returns rows from `backend/head harvester.xlsx`, converted into the frontend/model feature names. This powers Dataset Replay mode.

## Critical ML Contract

The feature order must stay exactly:

```python
[
    "Hydraulic_Pressure",
    "Hydraulic_Oil_Temperature",
    "Saw_Blade_RPM",
    "Fuel_Consumption",
    "Blade_Sharpness_Level",
]
```

The label mapping must stay:

```text
0 = Normal
1 = Warning
2 = Maintenance Required
```

The frontend color mapping must stay:

```text
0 = green
1 = yellow
2 = red
```

The Excel dataset uses different column names. `backend/model_config.py` maps them:

```text
Hydraulic Pressure (bar) -> Hydraulic_Pressure
Hydraulic Oil Temperature (°C) -> Hydraulic_Oil_Temperature
Saw Blade RPM -> Saw_Blade_RPM
Fuel Consumption (L/hour) -> Fuel_Consumption
Blade Sharpness Level (%) -> Blade_Sharpness_Level
output -> label column
```

If changing the dataset or training script, keep this mapping coherent across backend, frontend types, and dashboard display.

## Training

The original script came from Google Colab and was cleaned for local execution in `backend/matisse_hackathon_xgboost.py`.

Run the local Colab-derived trainer:

```bash
python3 backend/matisse_hackathon_xgboost.py
```

It reads:

```text
backend/head harvester.xlsx
```

It writes:

```text
backend/xgb_model.pkl
```

It trains:

```python
XGBClassifier(max_depth=3, learning_rate=0.5, n_estimators=3)
```

The printed wording should refer to XGBoost, not Logistic Regression.

## Frontend Modes

The main dashboard has three demo modes:

- `Simulated Live`: generates smooth local telemetry in `src/api/sensors.ts`, then sends each snapshot to `/predict`.
- `Dataset Replay`: fetches real Excel rows from `/dataset/replay`, steps through them, and sends each row to `/predict`.
- `Manual Prediction`: lets the user type the 5 model inputs and run `/predict` manually.

Main components:

- `Dashboard.tsx`: mode state, polling/replay/manual prediction flow, recent prediction tracking.
- `DemoControlPanel.tsx`: mode-specific controls, manual inputs, presets, and current model input display.
- `PredictionAlert.tsx`: primary current status card.
- `WhyPredictionPanel.tsx`: lightweight explanation panel using model-level feature importance. It must not claim true row-level root cause.
- `RecentPredictionsPanel.tsx`: rolling list of recent predictions.
- `SensorChart.tsx`: Nivo chart display for selected telemetry.
- `sensorConfig.ts`: labels, units, ranges, and chart colors for all five features.

## Explanation Panel Caveat

`WhyPredictionPanel.tsx` uses `feature_importance` from the trained XGBoost model. This is model-level importance, not a local explanation like SHAP.

Use careful language:

- Good: "Top model drivers"
- Good: "The current reading combination resembles patterns the model has learned..."
- Avoid: "Root cause"
- Avoid: "Exact reason"
- Avoid: "Definitive maintenance diagnosis"

This is a hackathon demo, so the explanation should be useful but not overclaim.

## Verification Commands

Backend syntax check:

```bash
PYTHONPYCACHEPREFIX=/tmp/codex-pycache python3 -m py_compile backend/app.py backend/model_config.py backend/train_model.py backend/matisse_hackathon_xgboost.py
```

Backend smoke test:

```bash
cd /Users/maunu/ForestHarvesterDashboard-Embeds/backend
python3 -c "from app import app; c = app.test_client(); print(c.get('/health').get_json()); print(c.get('/dataset/replay').get_json()['total_rows'])"
```

Frontend test:

```bash
cd /Users/maunu/ForestHarvesterDashboard-Embeds/forest-harvester-dashboard
CI=true npm test -- --watchAll=false
```

Frontend build:

```bash
cd /Users/maunu/ForestHarvesterDashboard-Embeds/forest-harvester-dashboard
npm run build
```

Expected current warnings:

- React Router future flag warnings in tests are harmless.
- Browserslist/caniuse-lite age warnings during build are harmless for this demo.
- `tsconfig.json` includes `"ignoreDeprecations": "6.0"` to silence newer editor warnings about older CRA TypeScript settings.

## Editing Guidance

- Preserve the existing dashboard UI unless asked for a redesign.
- Prefer small, demo-focused changes.
- Keep backend and frontend feature names synchronized.
- Do not change the model feature order casually.
- Do not remove `backend/head harvester.xlsx` or `backend/xgb_model.pkl` unless replacing them deliberately.
- Do not treat this as production ML; avoid adding auth, databases, queues, cloud deployment, or heavy MLOps unless explicitly requested.
- If adding prediction explanations, be precise about whether they are model-level or row-level.
- If adding frontend panels, match the existing Material UI and dashboard layout.

## Common Mistakes

- Running `npm start` in `backend/`. Use `python3 app.py` instead.
- Starting the frontend before the backend and assuming prediction is broken. The frontend needs the Flask API.
- Changing Excel column names without updating `EXCEL_TO_MODEL_COLUMNS`.
- Sending model inputs in display order or arbitrary object order. Use `FEATURE_ORDER`.
- Saying the sensor values are all "real" in Simulated Live mode. Only Dataset Replay uses Excel rows; Simulated Live still uses generated telemetry.
- Treating `feature_importance` as a full causal explanation. It is not.
