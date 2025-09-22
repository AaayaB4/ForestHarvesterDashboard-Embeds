import React, { useMemo } from 'react';
import { Box, Typography, useTheme, Chip, Paper } from '@mui/material';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';
import { CheckCircle, Warning, Error, Circle } from '@mui/icons-material';
import { BarTooltipProps } from '@nivo/bar';

interface DataPoint {
  timestamp: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  compareData?: DataPoint[];
  label: string;
  unit: string;
  color: string;
  compareColor?: string;
  min: number;
  max: number;
  chartType: 'line' | 'bar' | 'area';
  status?: 'green' | 'yellow' | 'red';
}

function SensorChart({
  data,
  compareData,
  label,
  unit,
  color,
  compareColor = '#666666',
  min,
  max,
  chartType,
  status,
}: Props) {
  const theme = useTheme();

  // Memoize chart data to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    const mainData = {
      id: label,
      color: color,
      data: data.map((d) => ({
        x: d.timestamp,
        y: d.value,
      })),
    };

    if (!compareData) {
      return [mainData];
    }

    const comparisonData = {
      id: `Compare: ${label}`,
      color: compareColor,
      data: compareData.map((d) => ({
        x: d.timestamp,
        y: d.value,
      })),
    };

    return [mainData, comparisonData];
  }, [data, compareData, label, color, compareColor]);

  // Prepare bar chart data
  const barChartData = useMemo(() => {
    if (!data.length) return [];
    
    return data.map((d) => ({
      timestamp: d.timestamp,
      [label]: d.value,
      ...(compareData && compareData.length > 0 ? {
        [`Compare: ${label}`]: compareData.find(cd => cd.timestamp === d.timestamp)?.value || 0
      } : {})
    }));
  }, [data, compareData, label]);

  // Calculate y-axis range with padding
  const yScale = useMemo(() => {
    const allValues = chartData.flatMap(series => series.data.map(d => d.y));
    const dataMin = Math.min(...allValues, min);
    const dataMax = Math.max(...allValues, max);
    const padding = (dataMax - dataMin) * 0.1;

    return {
      type: 'linear',
      min: Math.max(0, dataMin - padding),
      max: dataMax + padding,
      stacked: false,
    } as const;
  }, [chartData, min, max]);

  const getStatusIcon = () => {
    switch (status) {
      case 'green':
        return <CheckCircle fontSize="small" />;
      case 'yellow':
        return <Warning fontSize="small" />;
      case 'red':
        return <Error fontSize="small" />;
      default:
        return <Circle fontSize="small" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'green':
        return theme.palette.success.main;
      case 'yellow':
        return theme.palette.warning.main;
      case 'red':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  // Add this helper function after the getStatusColor function
  const formatValue = (value: number | string | Date): string => {
    if (typeof value === 'number') {
      return value.toFixed(1);
    }
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    return String(value);
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        height: '100%', 
        minHeight: 300,
        p: 2,
        backgroundColor: '#ffffff',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr auto',
        gap: 2,
        height: '100%'
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" color="textPrimary" noWrap sx={{ mr: 2 }}>
              {label}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mr: 'auto' }}>
              Current: {data[data.length - 1]?.value ? formatValue(data[data.length - 1].value) : '0'}{unit}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 250 }}>
            <Box sx={{ height: '100%', position: 'relative' }}>
              <Box sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
              }}>
                {chartType === 'bar' ? (
                  <ResponsiveBar
                    data={barChartData}
                    keys={[label, ...(compareData ? [`Compare: ${label}`] : [])]}
                    indexBy="timestamp"
                    margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                    padding={0.3}
                    valueScale={{ type: 'linear', min: yScale.min, max: yScale.max }}
                    colors={{ scheme: 'nivo' }}
                    theme={{
                      axis: {
                        domain: {
                          line: {
                            stroke: theme.palette.divider,
                          },
                        },
                        ticks: {
                          line: {
                            stroke: theme.palette.divider,
                          },
                          text: {
                            fill: theme.palette.text.secondary,
                            fontSize: 11,
                          },
                        },
                      },
                      grid: {
                        line: {
                          stroke: theme.palette.divider,
                          strokeWidth: 1,
                          strokeDasharray: '4 4',
                        },
                      },
                      tooltip: {
                        container: {
                          background: theme.palette.background.paper,
                          color: theme.palette.text.primary,
                          fontSize: 12,
                          borderRadius: 4,
                          boxShadow: theme.shadows[3],
                        },
                      },
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      format: (value: number) => `${value.toFixed(1)}${unit}`,
                    }}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: -45,
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                    animate={false}
                    tooltip={(props: BarTooltipProps<any>) => (
                      <Box
                        sx={{
                          background: theme.palette.background.paper,
                          padding: '12px',
                          border: '1px solid',
                          borderColor: theme.palette.divider,
                          borderRadius: '4px',
                        }}
                      >
                        <Typography component="span" sx={{ fontWeight: 600 }}>{String(props.id)}</Typography>: {props.value} {unit}
                      </Box>
                    )}
                  />
                ) : (
                  <ResponsiveLine
                    data={chartData}
                    margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                    xScale={{
                      type: 'point',
                    }}
                    yScale={yScale}
                    curve={chartType === 'area' ? 'monotoneX' : 'linear'}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: -45,
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      format: (value: number) => `${value.toFixed(1)}${unit}`,
                    }}
                    enablePoints={chartType === 'line'}
                    pointSize={6}
                    pointColor={{ theme: 'background' }}
                    pointBorderWidth={2}
                    pointBorderColor={{ from: 'serieColor' }}
                    enableArea={chartType === 'area'}
                    areaOpacity={0.15}
                    enableGridX={false}
                    enableGridY={true}
                    enableSlices="x"
                    animate={false}
                    colors={chartData.map(d => d.color)}
                    theme={{
                      axis: {
                        domain: {
                          line: {
                            stroke: theme.palette.divider,
                          },
                        },
                        ticks: {
                          line: {
                            stroke: theme.palette.divider,
                          },
                          text: {
                            fill: theme.palette.text.secondary,
                            fontSize: 11,
                          },
                        },
                      },
                      grid: {
                        line: {
                          stroke: theme.palette.divider,
                          strokeWidth: 1,
                          strokeDasharray: '4 4',
                        },
                      },
                      crosshair: {
                        line: {
                          stroke: theme.palette.text.secondary,
                          strokeWidth: 1,
                          strokeOpacity: 0.35,
                        },
                      },
                      tooltip: {
                        container: {
                          background: theme.palette.background.paper,
                          color: theme.palette.text.primary,
                          fontSize: 12,
                          borderRadius: 4,
                          boxShadow: theme.shadows[3],
                        },
                      },
                    }}
                    sliceTooltip={({ slice }: { slice: any }) => (
                      <Box
                        sx={{
                          background: theme.palette.background.paper,
                          padding: 1.5,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {String(slice.points[0].data.x)}
                        </Typography>
                        {slice.points.map((point: any) => (
                          <Box
                            key={point.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              mt: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: point.serieColor,
                                mr: 1,
                              }}
                            />
                            <Typography variant="body2">
                              {`${point.serieId}: ${Number(point.data.y).toFixed(1)}${unit}`}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          borderLeft: `1px solid ${theme.palette.divider}`,
          pl: 2,
        }}>
          {status && (
            <>
              <Chip
                icon={getStatusIcon()}
                label={status.toUpperCase()}
                size="small"
                sx={{
                  backgroundColor: `${getStatusColor()}15`,
                  color: getStatusColor(),
                  borderColor: getStatusColor(),
                  '& .MuiChip-icon': {
                    color: 'inherit'
                  }
                }}
                variant="outlined"
              />
              <Typography variant="caption" color="textSecondary" sx={{ writingMode: 'vertical-rl' }}>
                Current Status
              </Typography>
            </>
          )}
          <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="caption" color="textSecondary">
              Range
            </Typography>
            <Typography variant="body2" color="textPrimary">
              {min} - {max}{unit}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

export default SensorChart; 