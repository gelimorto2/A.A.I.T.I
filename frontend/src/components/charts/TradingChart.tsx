import React, { useMemo, useEffect, useState, useRef } from 'react';
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
import { createChart, ColorType } from 'lightweight-charts';

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
  const [indicators, setIndicators] = useState<string[]>(['sma20', 'ema12']);
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

  const chartData = useMemo(() => {
    const workingData = liveData.length > 0 ? liveData : data;
    
    if (workingData.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = workingData.map(d => new Date(d.timestamp).toLocaleTimeString());
    
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
      // Using close prices as lines since Chart.js doesn't have native candlesticks
      const bullishColor = theme.palette.mode === 'dark' ? '#00ff88' : '#2e7d32';
      const bearishColor = theme.palette.mode === 'dark' ? '#ff3366' : '#d32f2f';
      
      return {
        labels,
        datasets: [
          {
            label: 'Close Price',
            data: workingData.map(d => d.close),
            borderColor: workingData.map(d => 
              d.close > d.open ? bullishColor : bearishColor
            ),
            backgroundColor: workingData.map(d => 
              d.close > d.open ? bullishColor + '20' : bearishColor + '20'
            ),
            borderWidth: 2,
            pointBackgroundColor: workingData.map(d => 
              d.close > d.open ? bullishColor : bearishColor
            ),
            pointRadius: 1,
          },
        ],
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
  }, [liveData, data, chartType, symbol, theme]);

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