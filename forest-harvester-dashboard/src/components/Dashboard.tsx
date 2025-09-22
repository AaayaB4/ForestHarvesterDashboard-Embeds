import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  useTheme,
  Button,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  ThemeProvider,
  createTheme,
  Chip,
  Stack,
} from '@mui/material';
import {
  TimelineRounded,
  BarChartRounded,
  ShowChartRounded,
  RefreshRounded,
  AddRounded,
  CloseRounded,
} from '@mui/icons-material';
import SensorChart from './SensorChart';
import PredictionAlert from './PredictionAlert';
import { SensorData, ApiResponse, HistoricalDataPoint } from '../types';
import { sensorConfig } from '../config/sensorConfig';

// Create a custom theme with white background
const customTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

const MAX_HISTORY_POINTS = 30; // Increased for smoother visualization
const UPDATE_INTERVAL = 1000; // 1 second interval

function Dashboard() {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<Array<{
    sensorKey: keyof SensorData;
    compareWith?: keyof SensorData;
  }>>([{ sensorKey: 'Hydraulic_Pressure' }]);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [historicalData, setHistoricalData] = useState<Record<keyof SensorData, HistoricalDataPoint[]>>({
    Hydraulic_Pressure: [],
    Hydraulic_Oil_Temperature: [],
    Saw_Blade_RPM: [],
    Fuel_Consumption: [],
    Blade_Sharpness_Level: [],
  });

  const timeRef = useRef(Date.now());

  // Generate mock data with more stable transitions
  const generateMockData = useCallback(() => {
    const currentTime = Date.now();
    const timeDiff = (currentTime - timeRef.current) / 1000;
    
    const mockData: ApiResponse = {
      sensor_data: [{
        Hydraulic_Pressure: 200 + Math.sin(timeDiff) * 25,
        Hydraulic_Oil_Temperature: 50 + Math.sin(timeDiff * 0.5) * 10,
        Saw_Blade_RPM: 1500 + Math.sin(timeDiff * 0.3) * 250,
        Fuel_Consumption: 15 + Math.sin(timeDiff * 0.2) * 2.5,
        Blade_Sharpness_Level: 70 + Math.sin(timeDiff * 0.1) * 10,
      }],
      color: [{
        Hydraulic_Pressure: 'green',
        Hydraulic_Oil_Temperature: 'green',
        Saw_Blade_RPM: 'green',
        Fuel_Consumption: 'green',
        Blade_Sharpness_Level: 'green',
      }],
      prediction: 'Normal Operation',
      confidence: 0.85,
      feature_importance: [
        { name: 'Hydraulic Pressure', importance: 0.35 },
        { name: 'Oil Temperature', importance: 0.25 },
        { name: 'Blade RPM', importance: 0.20 },
        { name: 'Fuel Consumption', importance: 0.15 },
        { name: 'Blade Sharpness', importance: 0.05 },
      ],
    };

    // Update colors based on thresholds
    Object.entries(mockData.sensor_data[0]).forEach(([key, value]) => {
      const sensorKey = key as keyof SensorData;
      const config = sensorConfig[sensorKey];
      const normalizedValue = (value - config.min) / (config.max - config.min);
      
      if (normalizedValue < 0.2 || normalizedValue > 0.8) {
        mockData.color[0][sensorKey] = 'red';
      } else if (normalizedValue < 0.3 || normalizedValue > 0.7) {
        mockData.color[0][sensorKey] = 'yellow';
      }
    });

    // Update prediction based on colors
    if (Object.values(mockData.color[0]).includes('red')) {
      mockData.prediction = 'Maintenance Required';
    } else if (Object.values(mockData.color[0]).includes('yellow')) {
      mockData.prediction = 'Maintenance Recommended';
    }

    return mockData;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const response = generateMockData();
      setData(response);
      
      const timestamp = new Date().toLocaleTimeString();
      setHistoricalData(prev => {
        const newData = { ...prev };
        Object.keys(response.sensor_data[0]).forEach((key) => {
          const sensorKey = key as keyof SensorData;
          // Only add new data point if it's different from the last one
          const lastPoint = prev[sensorKey][prev[sensorKey].length - 1];
          const newValue = response.sensor_data[0][sensorKey];
          
          if (!lastPoint || Math.abs(lastPoint.value - newValue) > 0.1) {
            newData[sensorKey] = [
              ...prev[sensorKey],
              {
                timestamp,
                value: newValue,
              },
            ].slice(-MAX_HISTORY_POINTS);
          }
        });
        return newData;
      });

      setError(null);
    } catch (err) {
      setError('Failed to fetch sensor data');
      console.error(err);
    }
  }, [generateMockData]);

  // Initialize timeRef and start data updates
  useEffect(() => {
    timeRef.current = Date.now();
    fetchData();
    const interval = setInterval(fetchData, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleChartTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: 'line' | 'bar' | 'area',
  ) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  const handleAddChart = (sensorKey: keyof SensorData) => {
    setSelectedCharts(prev => {
      // Check if sensor is already displayed
      const isAlreadyDisplayed = prev.some(
        chart => chart.sensorKey === sensorKey || chart.compareWith === sensorKey
      );
      if (isAlreadyDisplayed) return prev;
      return [...prev, { sensorKey }];
    });
  };

  const handleRemoveChart = (index: number) => {
    setSelectedCharts(prev => prev.filter((_, i) => i !== index));
  };

  const handleCompareClick = (sensorKey: keyof SensorData, chartIndex: number) => {
    setSelectedCharts(prev => {
      const newCharts = [...prev];
      const chart = newCharts[chartIndex];
      if (chart.compareWith === sensorKey) {
        delete chart.compareWith;
      } else if (sensorKey !== chart.sensorKey) {
        chart.compareWith = sensorKey;
      }
      return newCharts;
    });
  };

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={fetchData}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={customTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          py: 4,
          backgroundColor: 'background.default',
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{ 
                color: theme.palette.text.primary,
                fontWeight: 300,
                textAlign: 'center',
              }}
            >
              Forest Harvester Head Performance
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <ToggleButtonGroup
                  value={chartType}
                  exclusive
                  onChange={handleChartTypeChange}
                  size="small"
                >
                  <ToggleButton value="line">
                    <Tooltip title="Line Chart">
                      <ShowChartRounded />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="area">
                    <Tooltip title="Area Chart">
                      <TimelineRounded />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="bar">
                    <Tooltip title="Bar Chart">
                      <BarChartRounded />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <IconButton onClick={fetchData} size="small">
                <RefreshRounded />
              </IconButton>
            </Paper>
          </Box>

          <Grid container spacing={3}>
            {/* Charts Section */}
            <Grid item xs={12} md={9}>
              <Grid container spacing={3}>
                {data && selectedCharts.map((chart, index) => (
                  <Grid item xs={12} key={`${chart.sensorKey}-${index}`}>
                    <Paper sx={{ p: 3, height: '400px', position: 'relative' }}>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveChart(index)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1,
                        }}
                      >
                        <CloseRounded />
                      </IconButton>
                      <SensorChart
                        data={historicalData[chart.sensorKey]}
                        compareData={chart.compareWith ? historicalData[chart.compareWith] : undefined}
                        label={sensorConfig[chart.sensorKey].label}
                        unit={sensorConfig[chart.sensorKey].unit}
                        color={sensorConfig[chart.sensorKey].color}
                        compareColor={chart.compareWith ? sensorConfig[chart.compareWith].color : undefined}
                        min={sensorConfig[chart.sensorKey].min}
                        max={sensorConfig[chart.sensorKey].max}
                        chartType={chartType}
                        status={data.color[0][chart.sensorKey] as 'green' | 'yellow' | 'red'}
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* System Status */}
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 3, height: '400px', display: 'flex', alignItems: 'center' }}>
                <PredictionAlert 
                  prediction={data?.prediction || 'Unknown'} 
                  confidence={data?.confidence}
                  featureImportance={data?.feature_importance}
                />
              </Paper>
            </Grid>

            {/* Sensor Selection */}
            {data && Object.entries(sensorConfig).map(([key, config]) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <Paper
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: config.color,
                    },
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {config.label}
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{
                          color: config.color,
                          fontWeight: 300,
                        }}
                      >
                        {data.sensor_data[0][key as keyof SensorData].toFixed(1)}
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '1rem',
                            color: theme.palette.text.secondary,
                            ml: 1,
                          }}
                        >
                          {config.unit}
                        </Typography>
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        {selectedCharts.map((chart, index) => (
                          <Chip
                            key={index}
                            size="small"
                            label={chart.sensorKey === key ? 'Primary' : 'Compare'}
                            onClick={() => handleCompareClick(key as keyof SensorData, index)}
                            color={
                              chart.sensorKey === key || chart.compareWith === key
                                ? 'primary'
                                : 'default'
                            }
                            sx={{
                              opacity:
                                chart.sensorKey === key || chart.compareWith === key ? 1 : 0.5,
                            }}
                          />
                        ))}
                        <IconButton
                          size="small"
                          onClick={() => handleAddChart(key as keyof SensorData)}
                          sx={{
                            color: theme.palette.text.secondary,
                          }}
                        >
                          <AddRounded />
                        </IconButton>
                      </Stack>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default Dashboard; 