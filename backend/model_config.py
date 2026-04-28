FEATURE_ORDER = [
    "Hydraulic_Pressure",
    "Hydraulic_Oil_Temperature",
    "Saw_Blade_RPM",
    "Fuel_Consumption",
    "Blade_Sharpness_Level",
]

FEATURE_DISPLAY_NAMES = {
    "Hydraulic_Pressure": "Hydraulic Pressure",
    "Hydraulic_Oil_Temperature": "Hydraulic Oil Temperature",
    "Saw_Blade_RPM": "Saw Blade RPM",
    "Fuel_Consumption": "Fuel Consumption",
    "Blade_Sharpness_Level": "Blade Sharpness Level",
}

LABEL_MAP = {
    0: "Normal",
    1: "Warning",
    2: "Maintenance Required",
}

COLOR_MAP = {
    0: "green",
    1: "yellow",
    2: "red",
}

MODEL_FILENAME = "xgb_model.pkl"
DATASET_FILENAME = "head harvester.xlsx"
DATASET_LABEL_COLUMN = "output"

EXCEL_TO_MODEL_COLUMNS = {
    "Hydraulic Pressure (bar)": "Hydraulic_Pressure",
    "Hydraulic Oil Temperature (°C)": "Hydraulic_Oil_Temperature",
    "Saw Blade RPM": "Saw_Blade_RPM",
    "Fuel Consumption (L/hour)": "Fuel_Consumption",
    "Blade Sharpness Level (%)": "Blade_Sharpness_Level",
}
