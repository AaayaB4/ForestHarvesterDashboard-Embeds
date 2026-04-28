export interface SensorData {
  Hydraulic_Pressure: number;
  Hydraulic_Oil_Temperature: number;
  Saw_Blade_RPM: number;
  Fuel_Consumption: number;
  Blade_Sharpness_Level: number;
}

export type StatusColor = 'green' | 'yellow' | 'red';
export type PredictionClass = 0 | 1 | 2;
export type PredictionLabel = 'Normal' | 'Warning' | 'Maintenance Required';
export type DashboardMode = 'simulated' | 'replay' | 'manual';

export interface SensorColors {
  Hydraulic_Pressure: StatusColor;
  Hydraulic_Oil_Temperature: StatusColor;
  Saw_Blade_RPM: StatusColor;
  Fuel_Consumption: StatusColor;
  Blade_Sharpness_Level: StatusColor;
}

export interface FeatureImportance {
  name: string;
  importance: number;
}

export interface PredictionApiResponse {
  prediction: PredictionClass;
  label?: PredictionLabel;
  color?: StatusColor;
  confidence?: number;
  feature_importance?: FeatureImportance[];
}

export interface DatasetReplayRow {
  row_id: number;
  sensor_data: SensorData;
  dataset_class: PredictionClass;
  dataset_label: PredictionLabel;
}

export interface DatasetReplayResponse {
  rows: DatasetReplayRow[];
  total_rows: number;
  feature_order: Array<keyof SensorData>;
}

export interface RecentPredictionItem {
  id: string;
  timestamp: string;
  mode: DashboardMode;
  prediction: PredictionLabel;
  confidence: number;
  context: string;
}

export interface ApiResponse {
  sensor_data: SensorData[];
  color: SensorColors[];
  prediction: PredictionLabel;
  predictionClass: PredictionClass;
  predictionColor: StatusColor;
  confidence: number;
  feature_importance: FeatureImportance[];
}

export interface HistoricalDataPoint {
  timestamp: string;
  value: number;
} 
