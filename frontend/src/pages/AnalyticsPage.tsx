import React, { useState, useEffect, useCallback } from 'react';
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { AppDispatch, RootState } from '../store/store';
import { fetchPortfolio } from '../store/slices/analyticsSlice';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

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

  // Generate mock data for demonstration
  const generateMockPerformanceData = useCallback((days: number): PerformanceData[] => {
    const data: PerformanceData[] = [];
    let cumulativePnl = 0;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dailyPnl = (Math.random() - 0.4) * 200; // Slightly positive bias
      cumulativePnl += dailyPnl;
      
      data.push({
        date: date.toISOString().split('T')[0],
        pnl: cumulativePnl,
        trades: Math.floor(Math.random() * 10) + 1,
        winRate: Math.random() * 40 + 40, // 40-80%
        sharpeRatio: Math.random() * 2 + 0.5, // 0.5-2.5
        maxDrawdown: Math.random() * -10 - 2 // -2% to -12%
      });
    }
    
    return data;
  }, []);

  const generateMockBotPerformance = useCallback((): BotPerformance[] => {
    return [
      {
        botId: '1',
        botName: 'Momentum Trader',
        totalTrades: 156,
        totalPnl: 2347.50,
        winRate: 57.1,
        sharpeRatio: 1.34,
        maxDrawdown: -5.2,
        status: 'running'
      },
      {
        botId: '2',
        botName: 'Arbitrage Hunter',
        totalTrades: 203,
        totalPnl: 1892.30,
        winRate: 66.0,
        sharpeRatio: 1.78,
        maxDrawdown: -3.1,
        status: 'running'
      },
      {
        botId: '3',
        botName: 'Grid Trader',
        totalTrades: 87,
        totalPnl: -234.10,
        winRate: 51.7,
        sharpeRatio: 0.89,
        maxDrawdown: -8.4,
        status: 'stopped'
      }
    ];
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch performance data
      const perfResponse = await fetch(`/api/analytics/performance?days=${timeframe}&botId=${selectedBot}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (perfResponse.ok) {
        setPerformanceData(generateMockPerformanceData(timeframe));
      }

      // Fetch bot-specific performance
      const botResponse = await fetch('/api/analytics/bots-performance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (botResponse.ok) {
        setBotPerformance(generateMockBotPerformance());
      }
    } catch (error) {
      setError('Failed to fetch analytics data');
    }
  }, [timeframe, selectedBot, generateMockPerformanceData, generateMockBotPerformance]);

  useEffect(() => {
    dispatch(fetchPortfolio());
    fetchAnalyticsData();
  }, [dispatch, fetchAnalyticsData]);

  const getPerformanceChartData = () => {
    const labels = performanceData.map(d => d.date);
    const pnlData = performanceData.map(d => d.pnl);
    
    return {
      labels,
      datasets: [
        {
          label: 'Cumulative P&L ($)',
          data: pnlData,
          borderColor: pnlData[pnlData.length - 1] >= 0 ? '#00ff88' : '#ff3366',
          backgroundColor: pnlData[pnlData.length - 1] >= 0 ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.1,
        },
      ],
    };
  };

  const getTradesChartData = () => {
    const labels = performanceData.map(d => d.date);
    const tradesData = performanceData.map(d => d.trades);
    
    return {
      labels,
      datasets: [
        {
          label: 'Daily Trades',
          data: tradesData,
          backgroundColor: '#00ff88',
          borderColor: '#00ff88',
          borderWidth: 1,
        },
      ],
    };
  };

  const getBotAllocationData = () => {
    const runningBots = botPerformance.filter(bot => bot.status === 'running');
    
    return {
      labels: runningBots.map(bot => bot.botName),
      datasets: [
        {
          data: runningBots.map(bot => Math.abs(bot.totalPnl)),
          backgroundColor: [
            '#00ff88',
            '#ff3366',
            '#ffaa00',
            '#00aaff',
            '#ff6600',
            '#9966ff',
            '#66ffaa',
            '#ff66aa',
          ],
          borderWidth: 0,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#ffffff' }
      },
    },
    scales: {
      y: {
        ticks: { color: '#ffffff' },
        grid: { color: '#333' }
      },
      x: {
        ticks: { color: '#ffffff' },
        grid: { color: '#333' }
      }
    },
    maintainAspectRatio: false,
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { color: '#ffffff' }
      },
    },
    maintainAspectRatio: false,
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
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
          <Grid size={{ xs: 12, lg: 8 }}>
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

          <Grid size={{ xs: 12, lg: 4 }}>
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
          <Grid size={12}>
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
          <Grid size={{ xs: 12, md: 6 }}>
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

          <Grid size={{ xs: 12, md: 6 }}>
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