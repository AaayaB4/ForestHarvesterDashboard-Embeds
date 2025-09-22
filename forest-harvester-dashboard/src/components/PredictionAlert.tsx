import React from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  LinearProgress,
  Tooltip,
  Fade,
  Zoom,
} from '@mui/material';
import {
  CheckCircleRounded,
  WarningRounded,
  ErrorRounded,
  BuildRounded,
  InfoRounded,
} from '@mui/icons-material';

interface Props {
  prediction: string;
  confidence?: number;
  featureImportance?: {
    name: string;
    importance: number;
  }[];
}

function PredictionAlert({ 
  prediction, 
  confidence = 0.85,
  featureImportance = [
    { name: 'Hydraulic Pressure', importance: 0.35 },
    { name: 'Oil Temperature', importance: 0.25 },
    { name: 'Blade RPM', importance: 0.20 },
    { name: 'Fuel Consumption', importance: 0.15 },
    { name: 'Blade Sharpness', importance: 0.05 },
  ]
}: Props): React.ReactElement {
  const theme = useTheme();

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Normal Operation':
        return {
          icon: <CheckCircleRounded sx={{ fontSize: 32, color: '#fff' }} />,
          color: '#00c853',
          gradientStart: '#00e676',
          gradientEnd: '#00c853',
          description: 'All systems are functioning within normal parameters',
          recommendation: 'Continue regular monitoring',
        };
      case 'Maintenance Recommended':
        return {
          icon: <WarningRounded sx={{ 
            fontSize: 32, 
            color: '#fff',
            animation: 'flash 2s infinite',
            '@keyframes flash': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }} />,
          color: '#ff9800',
          gradientStart: '#ffa726',
          gradientEnd: '#ff9800',
          description: 'Some parameters are approaching critical levels',
          recommendation: 'Schedule maintenance soon',
        };
      case 'Maintenance Required':
        return {
          icon: <ErrorRounded sx={{ 
            fontSize: 32, 
            color: '#fff',
            animation: 'pulse 1s infinite',
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.2)' },
            },
          }} />,
          color: '#d32f2f',
          gradientStart: '#ef5350',
          gradientEnd: '#d32f2f',
          description: 'Immediate maintenance needed',
          recommendation: 'Stop operations and service immediately',
        };
      default:
        return {
          icon: <BuildRounded sx={{ fontSize: 32, color: '#fff' }} />,
          color: '#546e7a',
          gradientStart: '#78909c',
          gradientEnd: '#546e7a',
          description: 'System status unknown',
          recommendation: 'Check sensors',
        };
    }
  };

  const statusInfo = getStatusInfo(prediction);

  return (
    <Fade in timeout={800}>
      <Box sx={{ width: '100%', maxWidth: 320 }}>
        <Paper
          elevation={3}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 2,
            background: theme.palette.background.paper,
            border: `1px solid ${statusInfo.color}40`,
          }}
        >
          {/* Header Section with Gradient */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${statusInfo.gradientStart}, ${statusInfo.gradientEnd})`,
              p: 2,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
              },
            }}
          >
            <Zoom in timeout={400}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  p: 1,
                  backdropFilter: 'blur(8px)',
                }}
              >
                {statusInfo.icon}
              </Box>
            </Zoom>

            <Box sx={{ flex: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontSize: '0.9rem',
                }}
              >
                {prediction}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  display: 'block',
                  fontSize: '0.75rem',
                }}
              >
                {statusInfo.description}
              </Typography>
            </Box>
          </Box>

          {/* Content Section */}
          <Box sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
            {/* Confidence Score */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  AI Confidence
                </Typography>
                <Typography variant="body2" sx={{ color: statusInfo.color, fontWeight: 600 }}>
                  {(confidence * 100).toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={confidence * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: `${statusInfo.color}15`,
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${statusInfo.gradientStart}, ${statusInfo.gradientEnd})`,
                    borderRadius: 3,
                  },
                }}
              />
            </Box>

            {/* Feature Importance */}
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 1 }}>
              Feature Importance
            </Typography>
            {featureImportance.map((feature) => (
              <Tooltip
                key={feature.name}
                title={`${feature.name} influences ${(feature.importance * 100).toFixed(1)}% of the AI's decision`}
              >
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {feature.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: statusInfo.color, fontWeight: 500 }}>
                      {(feature.importance * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={feature.importance * 100}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: `${statusInfo.color}15`,
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(90deg, ${statusInfo.gradientStart}, ${statusInfo.gradientEnd})`,
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              </Tooltip>
            ))}

            {/* AI Model Info */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                mt: 1,
                opacity: 0.7,
              }}
            >
              <InfoRounded sx={{ fontSize: 14, color: statusInfo.color }} />
              <Typography variant="caption" sx={{ color: statusInfo.color }}>
                Powered by XGBoost AI Model
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Fade>
  );
}

export default PredictionAlert; 