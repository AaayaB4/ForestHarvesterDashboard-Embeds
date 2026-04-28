import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import DemoControlPanel from './DemoControlPanel';
import FederatedDigitalTwinsPanel from './FederatedDigitalTwinsPanel';
import RecentPredictionsPanel from './RecentPredictionsPanel';
import WhyPredictionPanel from './WhyPredictionPanel';
import {
  ApiResponse,
  DashboardMode,
  DatasetReplayRow,
  HistoricalDataPoint,
  RecentPredictionItem,
  SensorData,
} from '../types';
import { sensorConfig } from '../config/sensorConfig';
import {
  buildDashboardResponse,
  buildSimulatedSensorData,
  fetchReplayDataset,
  predictMaintenance,
} from '../api/sensors';

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

const MAX_HISTORY_POINTS = 30;
const UPDATE_INTERVAL = 1000;
const MAX_RECENT_PREDICTIONS = 5;

const createEmptyHistoricalData = (): Record<keyof SensorData, HistoricalDataPoint[]> => ({
  Hydraulic_Pressure: [],
  Hydraulic_Oil_Temperature: [],
  Saw_Blade_RPM: [],
  Fuel_Consumption: [],
  Blade_Sharpness_Level: [],
});

const MANUAL_PRESETS: Array<{
  id: string;
  label: string;
  values: SensorData;
}> = [
  {
    id: 'balanced',
    label: 'Balanced',
    values: {
      Hydraulic_Pressure: 235,
      Hydraulic_Oil_Temperature: 50,
      Saw_Blade_RPM: 1800,
      Fuel_Consumption: 17,
      Blade_Sharpness_Level: 82,
    },
  },
  {
    id: 'high-load',
    label: 'High Load',
    values: {
      Hydraulic_Pressure: 275,
      Hydraulic_Oil_Temperature: 66,
      Saw_Blade_RPM: 2350,
      Fuel_Consumption: 21,
      Blade_Sharpness_Level: 63,
    },
  },
  {
    id: 'service',
    label: 'Service Edge',
    values: {
      Hydraulic_Pressure: 295,
      Hydraulic_Oil_Temperature: 78,
      Saw_Blade_RPM: 2580,
      Fuel_Consumption: 23,
      Blade_Sharpness_Level: 42,
    },
  },
];

function Dashboard() {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [mode, setMode] = useState<DashboardMode>('simulated');
  const [replayRows, setReplayRows] = useState<DatasetReplayRow[]>([]);
  const [currentReplayRow, setCurrentReplayRow] = useState<DatasetReplayRow | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<Array<{
    sensorKey: keyof SensorData;
    compareWith?: keyof SensorData;
  }>>([{ sensorKey: 'Hydraulic_Pressure' }]);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [historicalData, setHistoricalData] = useState<Record<keyof SensorData, HistoricalDataPoint[]>>(
    createEmptyHistoricalData(),
  );
  const [manualValues, setManualValues] = useState<SensorData>({ ...MANUAL_PRESETS[0].values });
  const [recentPredictions, setRecentPredictions] = useState<RecentPredictionItem[]>([]);

  const timeRef = useRef(Date.now());
  const isFetchingRef = useRef(false);
  const replayIndexRef = useRef(0);

  const appendHistoricalSnapshot = useCallback((sensorSnapshot: SensorData, timestamp: string) => {
    setHistoricalData((prev) => {
      const nextData = { ...prev };

      (Object.keys(sensorSnapshot) as Array<keyof SensorData>).forEach((sensorKey) => {
        const newValue = sensorSnapshot[sensorKey];
        const lastPoint = prev[sensorKey][prev[sensorKey].length - 1];

        if (!lastPoint || Math.abs(lastPoint.value - newValue) > 0.1) {
          nextData[sensorKey] = [
            ...prev[sensorKey],
            {
              timestamp,
              value: newValue,
            },
          ].slice(-MAX_HISTORY_POINTS);
        }
      });

      return nextData;
    });
  }, []);

  const applyPredictionToDashboard = useCallback(
    (
      sensorSnapshot: SensorData,
      predictionResult: Awaited<ReturnType<typeof predictMaintenance>>,
      timestamp: string,
      sourceMode: DashboardMode,
      context: string,
    ) => {
      const response = buildDashboardResponse(sensorSnapshot, predictionResult);
      setData(response);
      appendHistoricalSnapshot(sensorSnapshot, timestamp);
      setRecentPredictions((prev) => [
        {
          id: `${Date.now()}-${predictionResult.prediction}-${context}`,
          timestamp,
          mode: sourceMode,
          prediction: response.prediction,
          confidence: response.confidence,
          context,
        },
        ...prev,
      ].slice(0, MAX_RECENT_PREDICTIONS));
      setError(null);
    },
    [appendHistoricalSnapshot],
  );

  const getReplayRows = useCallback(async (): Promise<DatasetReplayRow[]> => {
    if (replayRows.length) {
      return replayRows;
    }

    const rows = await fetchReplayDataset();
    setReplayRows(rows);
    return rows;
  }, [replayRows]);

  const runPrediction = useCallback(
    async (
      sensorSnapshot: SensorData,
      timestamp: string,
      sourceMode: DashboardMode,
      context: string,
    ) => {
      const predictionResult = await predictMaintenance(sensorSnapshot);
      applyPredictionToDashboard(sensorSnapshot, predictionResult, timestamp, sourceMode, context);
    },
    [applyPredictionToDashboard],
  );

  const fetchTelemetryFrame = useCallback(async () => {
    if (isFetchingRef.current || mode === 'manual') {
      return;
    }

    isFetchingRef.current = true;

    try {
      if (mode === 'simulated') {
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - timeRef.current) / 1000;
        const sensorSnapshot = buildSimulatedSensorData(elapsedSeconds);
        setCurrentReplayRow(null);
        await runPrediction(
          sensorSnapshot,
          new Date().toLocaleTimeString(),
          'simulated',
          'Live telemetry sample',
        );
      } else {
        const rows = await getReplayRows();
        if (!rows.length) {
          throw new Error('Dataset replay returned no rows.');
        }

        const replayRow = rows[replayIndexRef.current % rows.length];
        replayIndexRef.current = (replayIndexRef.current + 1) % rows.length;
        setCurrentReplayRow(replayRow);
        await runPrediction(
          replayRow.sensor_data,
          `Row ${replayRow.row_id}`,
          'replay',
          `Dataset row ${replayRow.row_id}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch telemetry');
      console.error(err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [getReplayRows, mode, runPrediction]);

  const runManualPrediction = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      setCurrentReplayRow(null);
      await runPrediction(
        manualValues,
        new Date().toLocaleTimeString(),
        'manual',
        'Manual scenario input',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run manual prediction');
      console.error(err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [manualValues, runPrediction]);

  useEffect(() => {
    if (mode === 'replay' && !replayRows.length) {
      void getReplayRows().catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load dataset replay rows');
      });
    }
  }, [getReplayRows, mode, replayRows.length]);

  useEffect(() => {
    setHistoricalData(createEmptyHistoricalData());
    setError(null);

    if (mode === 'simulated') {
      timeRef.current = Date.now();
      setCurrentReplayRow(null);
      void fetchTelemetryFrame();
      const interval = setInterval(() => {
        void fetchTelemetryFrame();
      }, UPDATE_INTERVAL);
      return () => clearInterval(interval);
    }

    if (mode === 'replay') {
      replayIndexRef.current = 0;
      void fetchTelemetryFrame();
      const interval = setInterval(() => {
        void fetchTelemetryFrame();
      }, UPDATE_INTERVAL);
      return () => clearInterval(interval);
    }

    setCurrentReplayRow(null);
    setData(null);
    return undefined;
  }, [fetchTelemetryFrame, mode]);

  const handleChartTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: 'line' | 'bar' | 'area',
  ) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: DashboardMode,
  ) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  const handleAddChart = (sensorKey: keyof SensorData) => {
    setSelectedCharts((prev) => {
      const isAlreadyDisplayed = prev.some(
        (chart) => chart.sensorKey === sensorKey || chart.compareWith === sensorKey,
      );
      if (isAlreadyDisplayed) {
        return prev;
      }
      return [...prev, { sensorKey }];
    });
  };

  const handleRemoveChart = (index: number) => {
    setSelectedCharts((prev) => prev.filter((_, chartIndex) => chartIndex !== index));
  };

  const handleCompareClick = (sensorKey: keyof SensorData, chartIndex: number) => {
    setSelectedCharts((prev) => {
      const nextCharts = [...prev];
      const chart = nextCharts[chartIndex];
      if (chart.compareWith === sensorKey) {
        delete chart.compareWith;
      } else if (sensorKey !== chart.sensorKey) {
        chart.compareWith = sensorKey;
      }
      return nextCharts;
    });
  };

  const handleManualChange = (sensorKey: keyof SensorData, value: number) => {
    setManualValues((prev) => ({
      ...prev,
      [sensorKey]: Number.isFinite(value) ? value : 0,
    }));
  };

  const handleApplyPreset = (values: SensorData) => {
    setManualValues({ ...values });
  };

  const handleRefreshAction = () => {
    if (mode === 'manual') {
      void runManualPrediction();
      return;
    }

    void fetchTelemetryFrame();
  };

  const currentSensorValues = mode === 'manual' && !data ? manualValues : data?.sensor_data[0];

  if (error && !data && mode !== 'manual') {
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
        <Button variant="contained" onClick={handleRefreshAction}>
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
          <Box sx={{ mb: 3 }}>
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

          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 4 }} flexWrap="wrap" useFlexGap>
            <Chip label={`Mode: ${mode === 'simulated' ? 'Simulated Live' : mode === 'replay' ? 'Dataset Replay' : 'Manual Prediction'}`} />
            {currentReplayRow && <Chip label={`Replay Row ${currentReplayRow.row_id}/${replayRows.length || 0}`} color="primary" />}
            {currentReplayRow && <Chip label={`Dataset Label: ${currentReplayRow.dataset_label}`} color="secondary" />}
            {data && <Chip label={`Model Output: ${data.prediction}`} color="success" />}
          </Stack>

          <Box sx={{ mb: 4 }}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <ToggleButtonGroup
                  value={mode}
                  exclusive
                  onChange={handleModeChange}
                  size="small"
                >
                  <ToggleButton value="simulated">Simulated Live</ToggleButton>
                  <ToggleButton value="replay">Dataset Replay</ToggleButton>
                  <ToggleButton value="manual">Manual Prediction</ToggleButton>
                </ToggleButtonGroup>

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

              <IconButton onClick={handleRefreshAction} size="small">
                <RefreshRounded />
              </IconButton>
            </Paper>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={9}>
              <Grid container spacing={3}>
                {(data || currentSensorValues) && selectedCharts.map((chart, index) => (
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
                        status={data?.color[0][chart.sensorKey]}
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            <Grid item xs={12} md={3}>
              <Stack spacing={3}>
                <Paper sx={{ p: 3, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PredictionAlert
                    prediction={data?.prediction || 'Unknown'}
                    confidence={data?.confidence}
                    featureImportance={data?.feature_importance}
                  />
                </Paper>

                <WhyPredictionPanel
                  prediction={data?.prediction}
                  confidence={data?.confidence}
                  sensorData={currentSensorValues}
                  featureImportance={data?.feature_importance}
                />

                <FederatedDigitalTwinsPanel
                  prediction={data?.prediction}
                  confidence={data?.confidence}
                  sensorData={currentSensorValues}
                />

                <RecentPredictionsPanel items={recentPredictions} />

                <DemoControlPanel
                  mode={mode}
                  currentSensorData={currentSensorValues}
                  currentPrediction={data?.prediction}
                  manualValues={manualValues}
                  presets={MANUAL_PRESETS}
                  replayRow={currentReplayRow}
                  replayTotalRows={replayRows.length}
                  onManualChange={handleManualChange}
                  onManualPredict={() => void runManualPrediction()}
                  onApplyPreset={handleApplyPreset}
                  onAdvanceReplay={() => void fetchTelemetryFrame()}
                  onRefreshLive={handleRefreshAction}
                />
              </Stack>
            </Grid>

            {(data || currentSensorValues) && Object.entries(sensorConfig).map(([key, config]) => {
              const sensorKey = key as keyof SensorData;
              const displayValue = currentSensorValues?.[sensorKey] ?? 0;

              return (
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
                          {displayValue.toFixed(1)}
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
                              onClick={() => handleCompareClick(sensorKey, index)}
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
                            onClick={() => handleAddChart(sensorKey)}
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
              );
            })}
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default Dashboard;
