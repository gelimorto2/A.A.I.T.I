import React, { useMemo, useEffect, useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Typography,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import {
  Refresh,
  Fullscreen,
  Settings,
  Timeline,
  BarChart,
  ShowChart,
  TrendingUp,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

interface CandlestickData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingChartProps {
  symbol: string;
  data?: CandlestickData[];
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
  realTime?: boolean;
}

type ChartType = 'candlestick' | 'line' | 'area' | 'volume';
type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  data = [],
  height = 400,
  showVolume = true,
  showIndicators = true,
  realTime = false,
}) => {
  const theme = useTheme();
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1h');
  // Indicators placeholder (future local ML/TA calculations)
  const [indicators] = useState<string[]>(['sma20', 'ema12']);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Simulated real-time data updates
  const [liveData, setLiveData] = useState<CandlestickData[]>(data);

  useEffect(() => {
    if (realTime && data.length > 0) {
      const interval = setInterval(() => {
        setLiveData(prev => {
          if (prev.length === 0) return prev;
          
          const lastCandle = prev[prev.length - 1];
          const newPrice = lastCandle.close + (Math.random() - 0.5) * lastCandle.close * 0.01;
          
          const updatedCandle = {
            ...lastCandle,
            close: newPrice,
            high: Math.max(lastCandle.high, newPrice),
            low: Math.min(lastCandle.low, newPrice),
            timestamp: new Date().toISOString(),
          };
          
          return [...prev.slice(0, -1), updatedCandle];
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [realTime, data]);

  // Adjust data based on selected timeframe by simple downsampling/aggregation
  const aggregatedData = useMemo(() => {
    const source = (liveData.length > 0 ? liveData : data).slice();
    if (source.length === 0) return [] as CandlestickData[];
    const frameMap: Record<TimeFrame, number> = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440, '1w': 10080 };
    const targetMinutes = frameMap[timeFrame];
    // Assume base interval ~1h or less; estimate base minutes from first 2 candles
    const baseMs = source.length > 1 ? (new Date(source[1].timestamp).getTime() - new Date(source[0].timestamp).getTime()) : 60*60*1000;
    const baseMinutes = Math.max(1, Math.round(baseMs / 60000));
    const groupSize = Math.max(1, Math.round(targetMinutes / baseMinutes));
    if (groupSize <= 1) return source;
    const aggregated: CandlestickData[] = [];
    for (let i = 0; i < source.length; i += groupSize) {
      const slice = source.slice(i, i + groupSize);
      if (slice.length === 0) continue;
      aggregated.push({
        timestamp: slice[0].timestamp,
        open: slice[0].open,
        high: Math.max(...slice.map(s => s.high)),
        low: Math.min(...slice.map(s => s.low)),
        close: slice[slice.length - 1].close,
        volume: slice.reduce((a, s) => a + s.volume, 0),
      });
    }
    return aggregated;
  }, [liveData, data, timeFrame]);

  const chartData = useMemo(() => {
    const workingData = aggregatedData;
    
    if (workingData.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = workingData.map(d => {
      const dt = new Date(d.timestamp);
      if (['1d','1w'].includes(timeFrame)) return dt.toLocaleDateString();
      if (['4h','1h'].includes(timeFrame)) return dt.toLocaleString(undefined,{ hour:'2-digit', minute:'2-digit'});
      return dt.toLocaleTimeString();
    });
    
    if (chartType === 'line') {
      return {
        labels,
        datasets: [
          {
            label: `${symbol} Price`,
            data: workingData.map(d => d.close),
            borderColor: theme.palette.primary.main,
            backgroundColor: theme.palette.mode === 'dark' ? 
              'rgba(0, 255, 136, 0.1)' : 'rgba(46, 125, 50, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1,
          },
        ],
      };
    }

    if (chartType === 'candlestick') {
      // Approximate candlesticks using bar chart (high-low as background band + close line)
      const bullishColor = theme.palette.mode === 'dark' ? '#00ff88' : '#2e7d32';
      const bearishColor = theme.palette.mode === 'dark' ? '#ff3366' : '#d32f2f';
      const ohlcHeights = workingData.map(d => d.high - d.low);
      return {
        labels,
        datasets: [
          {
            type: 'bar' as const,
            label: 'Range',
            data: workingData.map((d, idx) => ({ x: labels[idx], y: d.high, y1: d.low })),
            // Chart.js fallback – represent range via top value; styling hints
            dataParser: 'ohlc', // custom hint (not native)
            backgroundColor: workingData.map(d => (d.close >= d.open ? bullishColor + '25' : bearishColor + '25')),
            borderColor: workingData.map(d => (d.close >= d.open ? bullishColor : bearishColor)),
            borderWidth: 1,
          },
          {
            label: 'Close',
            data: workingData.map(d => d.close),
            borderColor: theme.palette.primary.main,
            backgroundColor: theme.palette.primary.main,
            pointRadius: 1,
            borderWidth: 2,
            tension: 0.2,
            type: 'line' as const,
          }
        ]
      };
    }

    if (chartType === 'volume') {
      return {
        labels,
        datasets: [
          {
            label: 'Volume',
            data: workingData.map(d => d.volume),
            backgroundColor: theme.palette.secondary.main + '80',
            borderColor: theme.palette.secondary.main,
            borderWidth: 1,
          },
        ],
      };
    }

    return { labels: [], datasets: [] };
  }, [aggregatedData, chartType, symbol, theme, timeFrame]);

  const chartOptions: ChartOptions<'line' | 'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme.palette.text.primary,
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${chartType === 'volume' ? value.toLocaleString() : '$' + value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: theme.palette.divider,
          drawOnChartArea: true,
        },
        ticks: {
          color: theme.palette.text.secondary,
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: {
          color: theme.palette.divider,
          drawOnChartArea: true,
        },
        ticks: {
          color: theme.palette.text.secondary,
          callback: (value) => {
            if (chartType === 'volume') {
              return Number(value).toLocaleString();
            }
            return `$${Number(value).toFixed(2)}`;
          },
        },
      },
    },
    animation: {
      duration: realTime ? 0 : 1000,
    },
  }), [theme, realTime, chartType]);

  const handleChartTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: ChartType | null,
  ) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  const handleTimeFrameChange = (event: any) => {
    setTimeFrame(event.target.value as TimeFrame);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const refreshData = () => {
    // Trigger data refresh
    console.log('Refreshing chart data for', symbol);
  };

  const renderChart = () => {
    if (chartType === 'volume') {
      return <Bar data={chartData as any} options={chartOptions as any} />;
    } else {
      return <Line data={chartData as any} options={chartOptions as any} />;
    }
  };

  return (
    <Card 
      sx={{ 
        height: isFullscreen ? '100vh' : height + 100,
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        width: isFullscreen ? '100vw' : '100%',
        zIndex: isFullscreen ? 1300 : 1,
        borderRadius: isFullscreen ? 0 : 1,
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Chart Controls */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
        }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp color="primary" />
            {symbol} Chart
            {realTime && (
              <Tooltip title="Real-time data">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                      '100%': { opacity: 1 },
                    },
                  }}
                />
              </Tooltip>
            )}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Chart Type Selector */}
            <ToggleButtonGroup
              value={chartType}
              exclusive
              onChange={handleChartTypeChange}
              size="small"
            >
              <ToggleButton value="candlestick">
                <Tooltip title="Candlestick">
                  <BarChart />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="line">
                <Tooltip title="Line Chart">
                  <ShowChart />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="volume">
                <Tooltip title="Volume">
                  <Timeline />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Time Frame Selector */}
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel>Time</InputLabel>
              <Select
                value={timeFrame}
                label="Time"
                onChange={handleTimeFrameChange}
              >
                <MenuItem value="1m">1m</MenuItem>
                <MenuItem value="5m">5m</MenuItem>
                <MenuItem value="15m">15m</MenuItem>
                <MenuItem value="1h">1h</MenuItem>
                <MenuItem value="4h">4h</MenuItem>
                <MenuItem value="1d">1d</MenuItem>
                <MenuItem value="1w">1w</MenuItem>
              </Select>
            </FormControl>

            {/* Chart Actions */}
            <Tooltip title="Refresh">
              <IconButton onClick={refreshData} size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Settings">
              <IconButton size="small">
                <Settings />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <IconButton onClick={toggleFullscreen} size="small">
                <Fullscreen />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Chart Container */}
        <Box sx={{ 
          flex: 1, 
          minHeight: 0,
          position: 'relative',
        }}>
          {renderChart()}
        </Box>

        {/* Chart Status */}
        {data.length === 0 && (
          <Box sx={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}>
            <Typography variant="body2" color="text.secondary">
              No chart data available for {symbol}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TradingChart;