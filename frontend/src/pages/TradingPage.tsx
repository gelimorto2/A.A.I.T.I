import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Tab,
  Tabs,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  PlayArrow,
  Stop,
  Add,
  Refresh,
  ShowChart,
  Close,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { AppDispatch, RootState } from '../store/store';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  isMock?: boolean;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  pnl?: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
}

const TradingPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { bots } = useSelector((state: RootState) => state.bots);

  const [activeTab, setActiveTab] = useState(0);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [historicalData, setHistoricalData] = useState<any>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Trade execution dialog
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeForm, setTradeForm] = useState({
    botId: '',
    symbol: 'AAPL',
    side: 'buy' as 'buy' | 'sell',
    quantity: 10,
    price: 0
  });

  const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META'];

  useEffect(() => {
    fetchMarketData();
    fetchHistoricalData(selectedSymbol);
    fetchTrades();
    
    // Set up real-time data updates
    const interval = setInterval(fetchMarketData, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchHistoricalData(selectedSymbol);
  }, [selectedSymbol]);

  const fetchMarketData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/trading/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ symbols: popularSymbols })
      });
      
      if (response.ok) {
        const data = await response.json();
        const quotes = data.quotes
          .filter((q: any) => q.success)
          .map((q: any) => q.data);
        setMarketData(quotes);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  const fetchHistoricalData = async (symbol: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/trading/market-data/${symbol}?timeframe=daily&limit=30`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setHistoricalData(result.data);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const fetchTrades = async () => {
    // This would fetch trades from all user's bots
    try {
      const token = localStorage.getItem('token');
      // For now, we'll just initialize empty trades
      setTrades([]);
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  };

  const executeTrade = async () => {
    if (!tradeForm.botId) {
      setError('Please select a bot to execute the trade');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/trading/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tradeForm)
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess('Trade executed successfully!');
        setTradeDialogOpen(false);
        fetchTrades(); // Refresh trades
        
        // Reset form
        setTradeForm({
          botId: '',
          symbol: 'AAPL',
          side: 'buy',
          quantity: 10,
          price: 0
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to execute trade');
      }
    } catch (error) {
      setError('Network error while executing trade');
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!historicalData?.data) return null;

    const labels = historicalData.data.map((d: any) => d.date);
    const prices = historicalData.data.map((d: any) => d.close);

    return {
      labels,
      datasets: [
        {
          label: `${selectedSymbol} Price`,
          data: prices,
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#ffffff'
        }
      },
      title: {
        display: true,
        text: `${selectedSymbol} - 30 Day Price Chart`,
        color: '#ffffff'
      },
    },
    scales: {
      y: {
        ticks: {
          color: '#ffffff'
        },
        grid: {
          color: '#333'
        }
      },
      x: {
        ticks: {
          color: '#ffffff'
        },
        grid: {
          color: '#333'
        }
      }
    },
    maintainAspectRatio: false,
  };

  return (
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
        LIVE TRADING
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Tabs 
        value={activeTab} 
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Market Watch" />
        <Tab label="Charts" />
        <Tab label="Active Trades" />
      </Tabs>

      {/* Market Watch Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid xs={12}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Market Overview
                  </Typography>
                  <Box>
                    <IconButton onClick={fetchMarketData} color="primary">
                      <Refresh />
                    </IconButton>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setTradeDialogOpen(true)}
                      sx={{ ml: 1 }}
                    >
                      Execute Trade
                    </Button>
                  </Box>
                </Box>

                <TableContainer component={Paper} sx={{ bgcolor: 'background.default' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Symbol</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Price</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Change</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Change %</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Volume</TableCell>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {marketData.map((stock) => (
                        <TableRow key={stock.symbol}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography fontWeight="bold">{stock.symbol}</Typography>
                              {stock.isMock && (
                                <Chip 
                                  label="DEMO" 
                                  size="small" 
                                  color="warning" 
                                  sx={{ ml: 1, fontSize: '0.6rem' }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight="bold">
                              ${stock.price.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {stock.change >= 0 ? (
                                <TrendingUp sx={{ color: '#00ff88', mr: 0.5 }} />
                              ) : (
                                <TrendingDown sx={{ color: '#ff3366', mr: 0.5 }} />
                              )}
                              <Typography 
                                color={stock.change >= 0 ? '#00ff88' : '#ff3366'}
                                fontWeight="bold"
                              >
                                {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              color={stock.change >= 0 ? '#00ff88' : '#ff3366'}
                              fontWeight="bold"
                            >
                              {stock.change >= 0 ? '+' : ''}{stock.changePercent}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {stock.volume.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              startIcon={<ShowChart />}
                              onClick={() => {
                                setSelectedSymbol(stock.symbol);
                                setActiveTab(1);
                              }}
                            >
                              Chart
                            </Button>
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

      {/* Charts Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Price Chart
                  </Typography>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Symbol</InputLabel>
                    <Select
                      value={selectedSymbol}
                      label="Symbol"
                      onChange={(e) => setSelectedSymbol(e.target.value)}
                    >
                      {popularSymbols.map((symbol) => (
                        <MenuItem key={symbol} value={symbol}>
                          {symbol}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ height: 400 }}>
                  {getChartData() && (
                    <Line data={getChartData()!} options={chartOptions} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Active Trades Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Active Trades
                </Typography>

                {trades.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No active trades. Execute your first trade to get started.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setTradeDialogOpen(true)}
                      sx={{ mt: 2 }}
                    >
                      Execute Trade
                    </Button>
                  </Box>
                ) : (
                  <TableContainer component={Paper} sx={{ bgcolor: 'background.default' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Symbol</TableCell>
                          <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Side</TableCell>
                          <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Quantity</TableCell>
                          <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Entry Price</TableCell>
                          <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Current P&L</TableCell>
                          <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Status</TableCell>
                          <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {trades.map((trade) => (
                          <TableRow key={trade.id}>
                            <TableCell fontWeight="bold">{trade.symbol}</TableCell>
                            <TableCell>
                              <Chip 
                                label={trade.side.toUpperCase()}
                                color={trade.side === 'buy' ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{trade.quantity}</TableCell>
                            <TableCell>${trade.entry_price.toFixed(2)}</TableCell>
                            <TableCell>
                              <Typography 
                                color={trade.pnl && trade.pnl >= 0 ? '#00ff88' : '#ff3366'}
                                fontWeight="bold"
                              >
                                ${trade.pnl?.toFixed(2) || '0.00'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={trade.status.toUpperCase()}
                                color={trade.status === 'open' ? 'primary' : 'secondary'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {trade.status === 'open' && (
                                <Button size="small" color="error" startIcon={<Stop />}>
                                  Close
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Trade Execution Dialog */}
      <Dialog 
        open={tradeDialogOpen} 
        onClose={() => setTradeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Execute Trade
          <IconButton
            onClick={() => setTradeDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Trading Bot</InputLabel>
                <Select
                  value={tradeForm.botId}
                  label="Trading Bot"
                  onChange={(e) => setTradeForm({ ...tradeForm, botId: e.target.value })}
                >
                  {bots.map((bot) => (
                    <MenuItem key={bot.id} value={bot.id}>
                      {bot.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={6}>
              <FormControl fullWidth>
                <InputLabel>Symbol</InputLabel>
                <Select
                  value={tradeForm.symbol}
                  label="Symbol"
                  onChange={(e) => setTradeForm({ ...tradeForm, symbol: e.target.value })}
                >
                  {popularSymbols.map((symbol) => (
                    <MenuItem key={symbol} value={symbol}>
                      {symbol}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={6}>
              <FormControl fullWidth>
                <InputLabel>Side</InputLabel>
                <Select
                  value={tradeForm.side}
                  label="Side"
                  onChange={(e) => setTradeForm({ ...tradeForm, side: e.target.value as 'buy' | 'sell' })}
                >
                  <MenuItem value="buy">Buy</MenuItem>
                  <MenuItem value="sell">Sell</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={6}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={tradeForm.quantity}
                onChange={(e) => setTradeForm({ ...tradeForm, quantity: Number(e.target.value) })}
              />
            </Grid>
            <Grid xs={6}>
              <TextField
                fullWidth
                label="Price (0 for market price)"
                type="number"
                value={tradeForm.price}
                onChange={(e) => setTradeForm({ ...tradeForm, price: Number(e.target.value) })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTradeDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={executeTrade} 
            variant="contained" 
            disabled={loading || !tradeForm.botId}
          >
            {loading ? 'Executing...' : 'Execute Trade'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TradingPage;