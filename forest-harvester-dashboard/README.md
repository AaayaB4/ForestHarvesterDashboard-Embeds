# Forest Harvester Dashboard Demo

This hackathon proof-of-concept shows what predictive maintenance could look like for a Ponsse-style harvester in the EU MATISSE context:

- the dashboard simulates live harvester telemetry
- the frontend sends the 5 model features to a lightweight Python backend
- the backend loads `xgb_model.pkl` and returns class `0`, `1`, or `2`
- the UI renders the traffic-light maintenance state as `Normal`, `Warning`, or `Maintenance Required`

## Project layout

- `forest-harvester-dashboard/`: React dashboard UI
- `backend/app.py`: Flask prediction API
- `backend/train_model.py`: XGBoost training script for the Excel dataset
- `backend/xgb_model.pkl`: trained model file consumed by the API

## Expected feature order

The backend always builds the model input in this exact order:

1. `Hydraulic_Pressure`
2. `Hydraulic_Oil_Temperature`
3. `Saw_Blade_RPM`
4. `Fuel_Consumption`
5. `Blade_Sharpness_Level`

## Backend setup

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Train the model

If you already have the Excel dataset and want to regenerate the model:

```bash
python3 backend/train_model.py --data /absolute/path/to/your-dataset.xlsx --label-column YourLabelColumn
```

Notes:

- If you place a single Excel file under `backend/data/`, the script can auto-discover it.
- The training output message has been corrected to `Accuracy of the XGBoost Model`.
- The trained model is saved as `backend/xgb_model.pkl`.

### Run the prediction API

```bash
python3 backend/app.py
```

The API starts on `http://127.0.0.1:8000` and exposes:

- `GET /health`
- `POST /predict`

Example request:

```json
{
  "Hydraulic_Pressure": 215.2,
  "Hydraulic_Oil_Temperature": 58.4,
  "Saw_Blade_RPM": 1620,
  "Fuel_Consumption": 16.1,
  "Blade_Sharpness_Level": 78.0
}
```

## Frontend setup

From `forest-harvester-dashboard/`:

```bash
npm install
npm start
```

The React app expects the backend at `http://127.0.0.1:8000` by default. To point it elsewhere, set:

```bash
REACT_APP_API_BASE_URL=http://your-host:your-port
```

## Demo behavior

- Sensor values remain lightweight simulated telemetry for the hackathon demo.
- Maintenance prediction is no longer random; it comes from the XGBoost backend.
- Class mapping is:
  - `0 -> Normal -> green`
  - `1 -> Warning -> yellow`
  - `2 -> Maintenance Required -> red`
