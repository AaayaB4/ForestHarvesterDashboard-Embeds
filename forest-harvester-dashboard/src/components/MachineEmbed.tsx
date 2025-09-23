import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { CloseRounded, OpenInNewRounded } from '@mui/icons-material';
import { sensorConfig } from '../config/sensorConfig';
import { SensorData } from '../types';

type SensorKey = keyof SensorData;

const sensors: SensorKey[] = [
  'Hydraulic_Pressure',
  'Hydraulic_Oil_Temperature',
  'Saw_Blade_RPM',
  'Fuel_Consumption',
  'Blade_Sharpness_Level',
];

function buildEmbedUrl(sensorKey: SensorKey, type: 'line' | 'area' | 'bar' = 'line') {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/embed/${encodeURIComponent(sensorKey)}?type=${type}`;
}

function MachineEmbed() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SensorKey>('Hydraulic_Pressure');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

  const iframeSrc = useMemo(() => buildEmbedUrl(selected, chartType), [selected, chartType]);

  // Load ThingLink responsive helper script once
  useEffect(() => {
    const existing = document.querySelector('script[data-thinglink]');
    if (existing) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = '//cdn.thinglink.me/jse/responsive.js';
    s.setAttribute('data-thinglink', 'true');
    document.body.appendChild(s);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default, py: 4 }}>
      <Container maxWidth="xl">
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 400 }}>
          Harvester 3D View and Live Charts
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 0, overflow: 'hidden' }}>
              <Box sx={{ position: 'relative', pt: '56.25%' }}>
                <Box sx={{ position: 'absolute', inset: 0 }}>
                  <iframe
                    title="ThingLink 3D Harvester"
                    width="640"
                    height="360"
                    data-original-width="640"
                    data-original-height="360"
                    src="https://www.thinglink.com/view/scene/1955717240800149990"
                    style={{ border: 'none', width: '100%', height: '100%' }}
                    scrolling="no"
                    allowFullScreen
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Systems
              </Typography>
              <Stack spacing={1.5}>
                {sensors.map((key) => (
                  <Box
                    key={key}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      p: 1.25,
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 500 }}>{sensorConfig[key].label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {sensorConfig[key].unit}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelected(key);
                          setChartType('line');
                          setOpen(true);
                        }}
                      >
                        Open
                      </Button>
                      <IconButton
                        size="small"
                        component="a"
                        href={buildEmbedUrl(key, 'line')}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <OpenInNewRounded fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg">
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ mr: 2 }}>
              {sensorConfig[selected].label}
            </Typography>
            <IconButton onClick={() => setOpen(false)}>
              <CloseRounded />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ width: '100%', height: 520 }}>
              <iframe
                title={`Chart - ${sensorConfig[selected].label}`}
                src={iframeSrc}
                style={{ border: '0', width: '100%', height: '100%', background: '#fff' }}
                allow="fullscreen"
              />
            </Box>
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
}

export default MachineEmbed;


