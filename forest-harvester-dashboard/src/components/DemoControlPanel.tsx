import React from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { sensorConfig } from '../config/sensorConfig';
import {
  DashboardMode,
  DatasetReplayRow,
  PredictionLabel,
  SensorData,
} from '../types';
import { FEATURE_ORDER } from '../api/sensors';

type ManualPreset = {
  id: string;
  label: string;
  values: SensorData;
};

interface Props {
  mode: DashboardMode;
  currentSensorData?: SensorData;
  currentPrediction?: PredictionLabel;
  manualValues: SensorData;
  presets: ManualPreset[];
  replayRow: DatasetReplayRow | null;
  replayTotalRows: number;
  onManualChange: (sensorKey: keyof SensorData, value: number) => void;
  onManualPredict: () => void;
  onApplyPreset: (values: SensorData) => void;
  onAdvanceReplay: () => void;
  onRefreshLive: () => void;
}

function DemoControlPanel({
  mode,
  currentSensorData,
  currentPrediction,
  manualValues,
  presets,
  replayRow,
  replayTotalRows,
  onManualChange,
  onManualPredict,
  onApplyPreset,
  onAdvanceReplay,
  onRefreshLive,
}: Props): React.ReactElement {
  const valuesToShow = currentSensorData || manualValues;
  const replayMatchesModel =
    replayRow && currentPrediction
      ? replayRow.dataset_label === currentPrediction
      : null;

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Demo Controls
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === 'simulated' && 'Simulated live telemetry with real XGBoost inference.'}
            {mode === 'replay' && 'Replaying real Excel rows while the backend predicts each snapshot.'}
            {mode === 'manual' && 'Edit the 5 model inputs manually and send them straight to the predictor.'}
          </Typography>
        </Box>

        {mode === 'simulated' && (
          <Button variant="outlined" onClick={onRefreshLive}>
            Refresh Live Sample
          </Button>
        )}

        {mode === 'replay' && (
          <Stack spacing={1.5}>
            <Button variant="outlined" onClick={onAdvanceReplay}>
              Next Dataset Row
            </Button>
            {replayRow && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Row ${replayRow.row_id}/${replayTotalRows}`} size="small" />
                <Chip label={`Dataset: ${replayRow.dataset_label}`} size="small" color="primary" />
                {currentPrediction && (
                  <Chip
                    label={`Model: ${currentPrediction}`}
                    size="small"
                    color={replayMatchesModel ? 'success' : 'warning'}
                  />
                )}
              </Stack>
            )}
            {replayMatchesModel !== null && (
              <Typography variant="caption" color="text.secondary">
                {replayMatchesModel
                  ? 'The trained model agrees with the dataset label for this sample.'
                  : 'The model prediction differs from the dataset label for this sample.'}
              </Typography>
            )}
          </Stack>
        )}

        {mode === 'manual' && (
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Scenario Presets</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  size="small"
                  variant="outlined"
                  onClick={() => onApplyPreset(preset.values)}
                >
                  {preset.label}
                </Button>
              ))}
            </Stack>

            <Typography variant="subtitle2">Manual Model Inputs</Typography>
            {FEATURE_ORDER.map((sensorKey) => (
              <TextField
                key={sensorKey}
                label={sensorConfig[sensorKey].label}
                size="small"
                type="number"
                value={manualValues[sensorKey]}
                onChange={(event) => onManualChange(sensorKey, Number(event.target.value))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="caption" color="text.secondary">
                        {sensorConfig[sensorKey].unit}
                      </Typography>
                    </InputAdornment>
                  ),
                }}
              />
            ))}

            <Button variant="contained" onClick={onManualPredict}>
              Predict Manual Scenario
            </Button>
          </Stack>
        )}

        <Divider />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Current Model Input
          </Typography>
          <Stack spacing={0.75}>
            {FEATURE_ORDER.map((sensorKey) => (
              <Box
                key={sensorKey}
                sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
              >
                <Typography variant="caption" color="text.secondary">
                  {sensorConfig[sensorKey].label}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {valuesToShow[sensorKey].toFixed(1)} {sensorConfig[sensorKey].unit}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

export default DemoControlPanel;
