import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import SensorChart from './SensorChart';
import { sensorConfig } from '../config/sensorConfig';
import { ApiResponse, HistoricalDataPoint, SensorData } from '../types';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: { default: '#ffffff', paper: '#ffffff' },
  },
});

const MAX_HISTORY_POINTS = 30;
const UPDATE_INTERVAL = 1000;

const validKeys: Array<keyof SensorData> = [
  'Hydraulic_Pressure',
  'Hydraulic_Oil_Temperature',
  'Saw_Blade_RPM',
  'Fuel_Consumption',
  'Blade_Sharpness_Level',
];

type EmbedChartProps = {
  sensorKey: keyof SensorData;
  chartType: 'line' | 'bar' | 'area';
  compareWith?: keyof SensorData;
  hideStatus?: boolean;
};

function EmbedChart({ sensorKey, chartType, compareWith, hideStatus }: EmbedChartProps): React.ReactElement {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [historicalData, setHistoricalData] = useState<Record<keyof SensorData, HistoricalDataPoint[]>>({
    Hydraulic_Pressure: [],
    Hydraulic_Oil_Temperature: [],
    Saw_Blade_RPM: [],
    Fuel_Consumption: [],
    Blade_Sharpness_Level: [],
  });
  const timeRef = useRef(Date.now());

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

    Object.entries(mockData.sensor_data[0]).forEach(([key, value]) => {
      const k = key as keyof SensorData;
      const cfg = sensorConfig[k];
      const normalized = (value - cfg.min) / (cfg.max - cfg.min);
      if (normalized < 0.2 || normalized > 0.8) mockData.color[0][k] = 'red';
      else if (normalized < 0.3 || normalized > 0.7) mockData.color[0][k] = 'yellow';
    });

    return mockData;
  }, []);

  const fetchData = useCallback(() => {
    const response = generateMockData();
    setData(response);
    const timestamp = new Date().toLocaleTimeString();
    setHistoricalData(prev => {
      const next = { ...prev };
      (Object.keys(response.sensor_data[0]) as Array<keyof SensorData>).forEach((k) => {
        const newValue = response.sensor_data[0][k];
        const last = prev[k][prev[k].length - 1];
        if (!last || Math.abs(last.value - newValue) > 0.1) {
          next[k] = [...prev[k], { timestamp, value: newValue }].slice(-MAX_HISTORY_POINTS);
        }
      });
      return next;
    });
  }, [generateMockData]);

  useEffect(() => {
    timeRef.current = Date.now();
    fetchData();
    const id = setInterval(fetchData, UPDATE_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  const status = useMemo(() => data?.color[0][sensorKey], [data, sensorKey]);
  const comp = compareWith && validKeys.includes(compareWith) ? compareWith : undefined;

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', p: 0, m: 0 }}>
        <Box sx={{ height: '100vh' }}>
          <SensorChart
            data={historicalData[sensorKey]}
            compareData={comp ? historicalData[comp] : undefined}
            label={sensorConfig[sensorKey].label}
            unit={sensorConfig[sensorKey].unit}
            color={sensorConfig[sensorKey].color}
            compareColor={comp ? sensorConfig[comp].color : undefined}
            min={sensorConfig[sensorKey].min}
            max={sensorConfig[sensorKey].max}
            chartType={chartType}
            status={hideStatus ? undefined : status}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default EmbedChart;


