import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  TableChart,
  Assessment,
  Timeline,
  Refresh,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { createChart, ColorType } from 'lightweight-charts';
import { AppDispatch, RootState } from '../store/store';
import { fetchPortfolio } from '../store/slices/analyticsSlice';

interface PerformanceData {
  date: string;
  pnl: number;
  trades: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface BotPerformance {
  botId: string;
  botName: string;
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  status: string;
}

const AnalyticsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bots } = useSelector((state: RootState) => state.bots);

  const [activeTab, setActiveTab] = useState(0);
  const [timeframe, setTimeframe] = useState(30);
  const [selectedBot, setSelectedBot] = useState('all');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [botPerformance, setBotPerformance] = useState<BotPerformance[]>([]);
  const [error, setError] = useState('');

  // Load real performance data from backend
  const loadPerformanceData = useCallback(async (days: number): Promise<PerformanceData[]> => {
    try {
      const response = await fetch(`/api/analytics/performance?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        return data.performance || [];
      } else {
        throw new Error('Failed to load performance data');
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
      // Return minimal fallback data structure
      return [{
        date: new Date().toISOString().split('T')[0],
        pnl: 0,
        trades: 0,
        winRate: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      }];
    }
  }, []);

  const loadBotPerformance = useCallback(async (): Promise<BotPerformance[]> => {
    try {
      const response = await fetch('/api/bots/performance');
      if (response.ok) {
        const data = await response.json();
        return data.bots || [];
      } else {
        throw new Error('Failed to load bot performance data');
      }
    } catch (error) {
      console.error('Error loading bot performance data:', error);
      // Return empty array as fallback
      return [];
    }
  }, []);


  const fetchAnalyticsData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Load real performance data
      const perfData = await loadPerformanceData(timeframe);
      setPerformanceData(perfData);

      // Load real bot performance data
      const botData = await loadBotPerformance();
      setBotPerformance(botData);
    } catch (error) {
      setError('Failed to fetch analytics data');
      console.error('Analytics data fetch error:', error);
      // Set empty fallback data
      setPerformanceData([]);
      setBotPerformance([]);
    }
  }, [timeframe, selectedBot, loadPerformanceData, loadBotPerformance]);

  // Initialize TradingView chart
  useEffect(() => {
    if (!chartContainerRef.current || performanceData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#bbb',
      },
      grid: {
        vertLines: { color: '#222' },
        horzLines: { color: '#222' },
      },
      timeScale: { timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderVisible: false },
    });

    const lineSeries = chart.addLineSeries({
      color: performanceData[performanceData.length - 1]?.pnl >= 0 ? '#00ff88' : '#ff3366',
      lineWidth: 2,
    });

    const chartData = performanceData.map(d => ({
      time: Math.floor(new Date(d.date).getTime() / 1000) as any,
      value: d.pnl,
    }));

    lineSeries.setData(chartData);
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [performanceData]);

  useEffect(() => {
    dispatch(fetchPortfolio());
    fetchAnalyticsData();
  }, [dispatch, fetchAnalyticsData]);

  const getBotAllocationData = () => {
    const runningBots = botPerformance.filter(bot => bot.status === 'running');
    return {
      labels: runningBots.map(bot => bot.botName),
      data: runningBots.map(bot => Math.abs(bot.totalPnl)),
      colors: ['#00ff88', '#ff3366', '#ffaa00', '#00aaff', '#ff6600', '#9966ff', '#66ffaa', '#ff66aa']
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalPnl = botPerformance.reduce((sum, bot) => sum + bot.totalPnl, 0);
  const totalTrades = botPerformance.reduce((sum, bot) => sum + bot.totalTrades, 0);
  const avgWinRate = botPerformance.length > 0 
    ? botPerformance.reduce((sum, bot) => sum + bot.winRate, 0) / botPerformance.length 
    : 0;
  const activeBots = botPerformance.filter(bot => bot.status === 'running').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold', 
              color: 'primary.main',
              fontFamily: 'monospace',
            }}
          >
            ANALYTICS
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Performance metrics and trading analytics • {activeBots} active agents
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchAnalyticsData}
        >
          Refresh Data
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Performance Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {totalPnl >= 0 ? (
                  <TrendingUp sx={{ color: '#00ff88', mr: 1 }} />
                ) : (
                  <TrendingDown sx={{ color: '#ff3366', mr: 1 }} />
                )}
                <Typography variant="h6" fontWeight="bold">
                  Total P&L
                </Typography>
              </Box>
              <Typography 
                variant="h3" 
                fontWeight="bold"
                color={totalPnl >= 0 ? '#00ff88' : '#ff3366'}
              >
                ${totalPnl.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across all agents
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  Total Trades
                </Typography>
              </Box>
              <Typography variant="h3" color="primary.main" fontWeight="bold">
                {totalTrades}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Executed trades
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Timeline sx={{ color: '#00ff88', mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  Avg Win Rate
                </Typography>
              </Box>
              <Typography 
                variant="h3" 
                color={avgWinRate >= 50 ? '#00ff88' : '#ff3366'}
                fontWeight="bold"
              >
                {avgWinRate.toFixed(1)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={avgWinRate} 
                sx={{ 
                  mt: 1,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: avgWinRate >= 50 ? '#00ff88' : '#ff3366'
                  }
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShowChart sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  Active Agents
                </Typography>
              </Box>
              <Typography variant="h3" color="primary.main" fontWeight="bold">
                {activeBots}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently running
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Timeframe</InputLabel>
          <Select
            value={timeframe}
            label="Timeframe"
            onChange={(e) => setTimeframe(Number(e.target.value))}
          >
            <MenuItem value={7}>7 Days</MenuItem>
            <MenuItem value={30}>30 Days</MenuItem>
            <MenuItem value={90}>90 Days</MenuItem>
            <MenuItem value={365}>1 Year</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Bot Filter</InputLabel>
          <Select
            value={selectedBot}
            label="Bot Filter"
            onChange={(e) => setSelectedBot(e.target.value)}
          >
            <MenuItem value="all">All Bots</MenuItem>
            {bots.map((bot) => (
              <MenuItem key={bot.id} value={bot.id}>
                {bot.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Tabs 
        value={activeTab} 
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab icon={<ShowChart />} label="Performance Charts" />
        <Tab icon={<TableChart />} label="Bot Comparison" />
        <Tab icon={<Assessment />} label="Allocation" />
      </Tabs>

      {/* Performance Charts Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Cumulative P&L Over Time
                </Typography>
                <Box sx={{ height: 400 }}>
                  {performanceData.length > 0 && (
                    <Line data={getPerformanceChartData()} options={chartOptions} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Daily Trading Volume
                </Typography>
                <Box sx={{ height: 400 }}>
                  {performanceData.length > 0 && (
                    <Bar data={getTradesChartData()} options={chartOptions} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Bot Comparison Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Bot Performance Comparison
                </Typography>

                <TableContainer component={Paper} sx={{ bgcolor: 'background.default' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Bot Name</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Total P&L</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Trades</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Win Rate</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Sharpe Ratio</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Max Drawdown</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {botPerformance.map((bot) => (
                        <TableRow key={bot.botId}>
                          <TableCell sx={{ fontWeight: 'bold' }}>{bot.botName}</TableCell>
                          <TableCell>
                            <Chip 
                              label={bot.status.toUpperCase()}
                              color={bot.status === 'running' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography 
                              color={bot.totalPnl >= 0 ? '#00ff88' : '#ff3366'}
                              fontWeight="bold"
                            >
                              ${bot.totalPnl.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>{bot.totalTrades}</TableCell>
                          <TableCell>
                            <Typography 
                              color={bot.winRate >= 50 ? '#00ff88' : '#ff3366'}
                              fontWeight="bold"
                            >
                              {bot.winRate.toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell>{bot.sharpeRatio.toFixed(2)}</TableCell>
                          <TableCell>
                            <Typography color="#ff3366" fontWeight="bold">
                              {bot.maxDrawdown.toFixed(1)}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Allocation Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  P&L Distribution by Bot
                </Typography>
                <Box sx={{ height: 400 }}>
                  {botPerformance.length > 0 && (
                    <Doughnut data={getBotAllocationData()} options={doughnutOptions} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Risk Metrics
                </Typography>
                <Box sx={{ p: 2 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Portfolio Sharpe Ratio
                    </Typography>
                    <Typography variant="h4" color="primary.main" fontWeight="bold">
                      1.42
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Maximum Drawdown
                    </Typography>
                    <Typography variant="h4" color="#ff3366" fontWeight="bold">
                      -8.5%
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Volatility (30d)
                    </Typography>
                    <Typography variant="h4" color="#ffaa00" fontWeight="bold">
                      12.3%
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Portfolio Beta
                    </Typography>
                    <Typography variant="h4" color="primary.main" fontWeight="bold">
                      0.85
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AnalyticsPage;