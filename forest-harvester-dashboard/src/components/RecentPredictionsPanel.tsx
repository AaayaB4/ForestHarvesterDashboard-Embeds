import React from 'react';
import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { RecentPredictionItem } from '../types';

interface Props {
  items: RecentPredictionItem[];
}

const getPredictionChipColor = (prediction: RecentPredictionItem['prediction']) => {
  switch (prediction) {
    case 'Normal':
      return 'success';
    case 'Warning':
      return 'warning';
    case 'Maintenance Required':
      return 'error';
    default:
      return 'default';
  }
};

const getModeLabel = (mode: RecentPredictionItem['mode']) => {
  switch (mode) {
    case 'simulated':
      return 'Simulated';
    case 'replay':
      return 'Replay';
    case 'manual':
      return 'Manual';
    default:
      return mode;
  }
};

function RecentPredictionsPanel({ items }: Props): React.ReactElement {
  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Recent Predictions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A rolling view of the latest model decisions across live, replay, and manual scenarios.
          </Typography>
        </Box>

        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Predictions will appear here as soon as the model starts evaluating telemetry.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  <Chip size="small" label={item.timestamp} />
                  <Chip size="small" variant="outlined" label={getModeLabel(item.mode)} />
                  <Chip size="small" color={getPredictionChipColor(item.prediction)} label={item.prediction} />
                </Stack>

                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.context}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Confidence {(item.confidence * 100).toFixed(1)}%
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

export default RecentPredictionsPanel;
