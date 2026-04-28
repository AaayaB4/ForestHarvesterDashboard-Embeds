import { sensorConfig } from '../config/sensorConfig';
import {
  ApiResponse,
  DatasetReplayResponse,
  DatasetReplayRow,
  FeatureImportance,
  PredictionApiResponse,
  PredictionClass,
  PredictionLabel,
  SensorColors,
  SensorData,
  StatusColor,
} from '../types';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export const FEATURE_ORDER: Array<keyof SensorData> = [
  'Hydraulic_Pressure',
  'Hydraulic_Oil_Temperature',
  'Saw_Blade_RPM',
  'Fuel_Consumption',
  'Blade_Sharpness_Level',
];

const PREDICTION_LABELS: Record<PredictionClass, PredictionLabel> = {
  0: 'Normal',
  1: 'Warning',
  2: 'Maintenance Required',
};

const PREDICTION_COLORS: Record<PredictionClass, StatusColor> = {
  0: 'green',
  1: 'yellow',
  2: 'red',
};

const DEFAULT_FEATURE_IMPORTANCE: FeatureImportance[] = [
  { name: 'Hydraulic Pressure', importance: 0.35 },
  { name: 'Hydraulic Oil Temperature', importance: 0.25 },
  { name: 'Saw Blade RPM', importance: 0.2 },
  { name: 'Fuel Consumption', importance: 0.15 },
  { name: 'Blade Sharpness Level', importance: 0.05 },
];

export const buildSimulatedSensorData = (elapsedSeconds: number): SensorData => ({
  Hydraulic_Pressure: 200 + Math.sin(elapsedSeconds) * 25,
  Hydraulic_Oil_Temperature: 50 + Math.sin(elapsedSeconds * 0.5) * 10,
  Saw_Blade_RPM: 1500 + Math.sin(elapsedSeconds * 0.3) * 250,
  Fuel_Consumption: 15 + Math.sin(elapsedSeconds * 0.2) * 2.5,
  Blade_Sharpness_Level: 70 + Math.sin(elapsedSeconds * 0.1) * 10,
});

export const calculateSensorColors = (sensorData: SensorData): SensorColors => {
  const colors: SensorColors = {
    Hydraulic_Pressure: 'green',
    Hydraulic_Oil_Temperature: 'green',
    Saw_Blade_RPM: 'green',
    Fuel_Consumption: 'green',
    Blade_Sharpness_Level: 'green',
  };

  FEATURE_ORDER.forEach((sensorKey) => {
    const value = sensorData[sensorKey];
    const config = sensorConfig[sensorKey];
    const normalizedValue = (value - config.min) / (config.max - config.min);

    if (normalizedValue < 0.2 || normalizedValue > 0.8) {
      colors[sensorKey] = 'red';
    } else if (normalizedValue < 0.3 || normalizedValue > 0.7) {
      colors[sensorKey] = 'yellow';
    }
  });

  return colors;
};

const normalizePrediction = (result: PredictionApiResponse): Required<PredictionApiResponse> => {
  const label = result.label || PREDICTION_LABELS[result.prediction];
  const color = result.color || PREDICTION_COLORS[result.prediction];
  const confidence = result.confidence ?? 0.85;
  const feature_importance = result.feature_importance?.length
    ? result.feature_importance
    : DEFAULT_FEATURE_IMPORTANCE;

  return {
    prediction: result.prediction,
    label,
    color,
    confidence,
    feature_importance,
  };
};

export const buildDashboardResponse = (
  sensorData: SensorData,
  predictionResult: PredictionApiResponse,
): ApiResponse => {
  const normalizedPrediction = normalizePrediction(predictionResult);

  return {
    sensor_data: [sensorData],
    color: [calculateSensorColors(sensorData)],
    prediction: normalizedPrediction.label,
    predictionClass: normalizedPrediction.prediction,
    predictionColor: normalizedPrediction.color,
    confidence: normalizedPrediction.confidence,
    feature_importance: normalizedPrediction.feature_importance,
  };
};

export const predictMaintenance = async (sensorData: SensorData): Promise<Required<PredictionApiResponse>> => {
  const payload = FEATURE_ORDER.reduce<Record<string, number>>((accumulator, featureName) => {
    accumulator[featureName] = sensorData[featureName];
    return accumulator;
  }, {});

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = 'Prediction request failed';

    try {
      const errorPayload = await response.json();
      detail = errorPayload.detail || errorPayload.error || detail;
    } catch (error) {
      detail = response.statusText || detail;
    }

    throw new Error(detail);
  }

  const result = (await response.json()) as PredictionApiResponse;
  return normalizePrediction(result);
};

export const fetchReplayDataset = async (): Promise<DatasetReplayRow[]> => {
  const response = await fetch(`${API_BASE_URL}/dataset/replay`);

  if (!response.ok) {
    let detail = 'Dataset replay request failed';

    try {
      const errorPayload = await response.json();
      detail = errorPayload.detail || errorPayload.error || detail;
    } catch (error) {
      detail = response.statusText || detail;
    }

    throw new Error(detail);
  }

  const result = (await response.json()) as DatasetReplayResponse;
  return result.rows;
};
