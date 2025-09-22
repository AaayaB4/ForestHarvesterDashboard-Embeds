import React from 'react';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import { BrowserRouter, Routes, Route, useSearchParams, useParams, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import EmbedChart from './components/EmbedChart';
import { SensorData } from './types';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#E0E0E0',
    },
    secondary: {
      main: '#9E9E9E',
    },
    background: {
      default: '#1A1A1A',
      paper: '#242424',
    },
    success: {
      main: '#66BB6A',
      dark: '#1B5E20',
    },
    warning: {
      main: '#FFA726',
      dark: '#E65100',
    },
    error: {
      main: '#EF5350',
      dark: '#C62828',
    },
    text: {
      primary: '#E0E0E0',
      secondary: '#9E9E9E',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 300,
      letterSpacing: '-0.5px',
    },
    h6: {
      fontWeight: 500,
      letterSpacing: '0.5px',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

const EmbedRoute = () => {
  const [params] = useSearchParams();
  const { sensorKey: rawKey } = useParams();
  const sensorKey = decodeURIComponent(rawKey || '') as keyof SensorData;
  const type = (params.get('type') as 'line' | 'bar' | 'area') || 'line';
  const compare = params.get('compare') as keyof SensorData | null;
  const hideStatus = params.get('hideStatus') === '1' || params.get('hideStatus') === 'true';

  return (
    <EmbedChart
      sensorKey={sensorKey}
      chartType={type}
      compareWith={compare || undefined}
      hideStatus={hideStatus}
    />
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/embed/:sensorKey" element={<EmbedRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
