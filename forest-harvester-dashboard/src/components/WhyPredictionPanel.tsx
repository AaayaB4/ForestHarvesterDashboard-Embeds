import React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { FeatureImportance, PredictionLabel, SensorData } from '../types';
import { sensorConfig } from '../config/sensorConfig';

interface Props {
  prediction?: PredictionLabel;
  confidence?: number;
  sensorData?: SensorData;
  featureImportance?: FeatureImportance[];
}

const DISPLAY_NAME_TO_SENSOR_KEY: Partial<Record<string, keyof SensorData>> = {
  'Hydraulic Pressure': 'Hydraulic_Pressure',
  'Hydraulic Oil Temperature': 'Hydraulic_Oil_Temperature',
  'Oil Temperature': 'Hydraulic_Oil_Temperature',
  'Saw Blade RPM': 'Saw_Blade_RPM',
  'Blade RPM': 'Saw_Blade_RPM',
  'Fuel Consumption': 'Fuel_Consumption',
  'Fuel Usage': 'Fuel_Consumption',
  'Blade Sharpness Level': 'Blade_Sharpness_Level',
  'Blade Sharpness': 'Blade_Sharpness_Level',
};

const getInterpretation = (prediction?: PredictionLabel) => {
  switch (prediction) {
    case 'Normal':
      return 'The current reading combination looks similar to patterns the model has learned to associate with stable operation.';
    case 'Warning':
      return 'The current reading combination resembles patterns the model has learned to associate with elevated maintenance risk.';
    case 'Maintenance Required':
      return 'The current reading combination is close to patterns the model treats as a high-priority maintenance case.';
    default:
      return 'Run a prediction to see which inputs the model is most sensitive to.';
  }
};

function WhyPredictionPanel({
  prediction,
  confidence,
  sensorData,
  featureImportance = [],
}: Props): React.ReactElement {
  const topFeatures = featureImportance.slice(0, 3);

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Why This Prediction
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This is a lightweight model-insight view based on the XGBoost model&apos;s strongest overall drivers, not a full root-cause explanation for one exact row.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Current assessment
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {prediction || 'No prediction yet'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {confidence !== undefined ? `Confidence ${(confidence * 100).toFixed(1)}%` : 'Confidence will appear after a prediction runs.'}
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Top model drivers
          </Typography>
          {topFeatures.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Feature-importance information will appear here after the model responds.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {topFeatures.map((feature) => {
                const sensorKey = DISPLAY_NAME_TO_SENSOR_KEY[feature.name];
                const currentValue = sensorKey && sensorData ? sensorData[sensorKey] : null;
                const unit = sensorKey ? sensorConfig[sensorKey].unit : '';

                return (
                  <Box key={feature.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {feature.name}
                      </Typography>
                      <Typography variant="body2">
                        {(feature.importance * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {currentValue !== null
                        ? `Current input: ${currentValue.toFixed(1)} ${unit}`
                        : 'Current input shown in the control panel'}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Interpretation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {getInterpretation(prediction)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default WhyPredictionPanel;
