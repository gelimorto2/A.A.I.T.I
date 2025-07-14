import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Stop,
  Edit,
  SmartToy,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
  Timeline,
  Assessment,
  Settings,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchBots } from '../store/slices/botsSlice';
import { Bot, Trade, TradingSignal } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`bot-tabpanel-${index}`}
      aria-labelledby={`bot-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const BotDetailPage: React.FC = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { bots } = useSelector((state: RootState) => state.bots);
  
  const [tabValue, setTabValue] = useState(0);
  const [bot, setBot] = useState<Bot | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bots.length === 0) {
      dispatch(fetchBots());
    }
  }, [dispatch, bots.length]);

  useEffect(() => {
    if (botId && bots.length > 0) {
      const foundBot = bots.find(b => b.id === botId);
      if (foundBot) {
        setBot(foundBot);
        loadBotData(botId);
      } else {
        setError('Bot not found');
      }
      setLoading(false);
    }
  }, [botId, bots]);

  const loadBotData = async (botId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // Load trades
      const tradesResponse = await fetch(`/api/trading/trades/${botId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tradesResponse.ok) {
        const tradesData = await tradesResponse.json();
        setTrades(tradesData);
      }

      // Load signals
      const signalsResponse = await fetch(`/api/trading/signals/${botId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (signalsResponse.ok) {
        const signalsData = await signalsResponse.json();
        setSignals(signalsData);
      }
    } catch (error) {
      console.error('Error loading bot data:', error);
    }
  };

  const handleBotAction = async (action: 'start' | 'stop') => {
    if (!bot) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bots/${bot.id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        dispatch(fetchBots());
        // Update local bot state
        setBot({ ...bot, status: action === 'start' ? 'running' : 'stopped' });
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to ${action} bot`);
      }
    } catch (error) {
      setError(`Network error while ${action}ing bot`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle sx={{ color: '#00ff88' }} />;
      case 'stopped':
        return <Stop sx={{ color: '#666' }} />;
      case 'error':
        return <Error sx={{ color: '#ff3366' }} />;
      default:
        return <Warning sx={{ color: '#ffaa00' }} />;
    }
  };

  const getHealthColor = (score?: number) => {
    if (!score) return '#666';
    if (score >= 80) return '#00ff88';
    if (score >= 60) return '#ffaa00';
    return '#ff3366';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>Loading bot details...</Typography>
      </Box>
    );
  }

  if (error || !bot) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/bots')}
          sx={{ mb: 2 }}
        >
          Back to Bots
        </Button>
        <Alert severity="error">
          {error || 'Bot not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/bots')} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <SmartToy sx={{ color: 'primary.main', mr: 2, fontSize: 32 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'monospace' }}>
              {bot.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {bot.description || 'AI Trading Agent'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/bots/${bot.id}/edit`)}
          >
            Edit
          </Button>
          {bot.status === 'running' ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<Stop />}
              onClick={() => handleBotAction('stop')}
            >
              Stop Agent
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrow />}
              onClick={() => handleBotAction('start')}
            >
              Start Agent
            </Button>
          )}
        </Box>
      </Box>

      {/* Status Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {getStatusIcon(bot.status)}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Status
                </Typography>
              </Box>
              <Chip 
                label={bot.status.toUpperCase()} 
                color={bot.status === 'running' ? 'success' : bot.status === 'error' ? 'error' : 'default'}
                sx={{ fontWeight: 'bold' }}
              />
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Mode: {bot.trading_mode.toUpperCase()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>P&L</Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  color: bot.pnl && bot.pnl >= 0 ? '#00ff88' : '#ff3366',
                  fontWeight: 'bold'
                }}
              >
                {formatCurrency(bot.pnl || 0)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {bot.pnl && bot.pnl >= 0 ? <TrendingUp sx={{ color: '#00ff88' }} /> : <TrendingDown sx={{ color: '#ff3366' }} />}
                <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                  Total Return
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Performance</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {bot.total_trades || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Trades
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, color: bot.win_rate && bot.win_rate >= 50 ? '#00ff88' : '#ff3366' }}>
                {bot.win_rate?.toFixed(1) || '0.0'}% Win Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Health Score</Typography>
              {bot.health_score !== undefined ? (
                <>
                  <Typography variant="h4" sx={{ color: getHealthColor(bot.health_score), fontWeight: 'bold' }}>
                    {bot.health_score}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={bot.health_score} 
                    sx={{ 
                      mt: 1,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getHealthColor(bot.health_score)
                      }
                    }}
                  />
                </>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  No data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Overview" icon={<Assessment />} />
            <Tab label="Recent Trades" icon={<Timeline />} />
            <Tab label="Trading Signals" icon={<TrendingUp />} />
            <Tab label="Configuration" icon={<Settings />} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>Strategy Information</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Strategy Type</Typography>
                <Typography variant="body1">{bot.strategy_type}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body1">{formatDateTime(bot.created_at)}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Last Updated</Typography>
                <Typography variant="body1">{formatDateTime(bot.updated_at)}</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Sharpe Ratio</Typography>
                <Typography variant="body1">{bot.sharpe_ratio?.toFixed(2) || 'N/A'}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Max Drawdown</Typography>
                <Typography variant="body1">{bot.max_drawdown ? `${bot.max_drawdown.toFixed(2)}%` : 'N/A'}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Risk Score</Typography>
                <Typography variant="body1">{bot.risk_score || 'N/A'}</Typography>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>Recent Trades</Typography>
          {trades.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Side</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Entry Price</TableCell>
                    <TableCell>Exit Price</TableCell>
                    <TableCell>P&L</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trades.slice(0, 10).map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>{trade.symbol}</TableCell>
                      <TableCell>
                        <Chip 
                          label={trade.side} 
                          size="small" 
                          color={trade.side === 'buy' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>{trade.quantity}</TableCell>
                      <TableCell>{formatCurrency(trade.entry_price)}</TableCell>
                      <TableCell>{trade.exit_price ? formatCurrency(trade.exit_price) : '-'}</TableCell>
                      <TableCell sx={{ color: trade.pnl && trade.pnl >= 0 ? '#00ff88' : '#ff3366' }}>
                        {trade.pnl ? formatCurrency(trade.pnl) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={trade.status} 
                          size="small" 
                          color={trade.status === 'closed' ? 'success' : trade.status === 'open' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{formatDateTime(trade.opened_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary">No trades recorded yet</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Trading Signals</Typography>
          {signals.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Signal</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Executed</TableCell>
                    <TableCell>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {signals.slice(0, 10).map((signal) => (
                    <TableRow key={signal.id}>
                      <TableCell>{signal.symbol}</TableCell>
                      <TableCell>
                        <Chip 
                          label={signal.signal_type} 
                          size="small" 
                          color={signal.signal_type === 'buy' ? 'success' : signal.signal_type === 'sell' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{(signal.confidence * 100).toFixed(1)}%</TableCell>
                      <TableCell>{formatCurrency(signal.price)}</TableCell>
                      <TableCell>{signal.quantity}</TableCell>
                      <TableCell>
                        <Chip 
                          label={signal.executed ? 'Yes' : 'No'} 
                          size="small" 
                          color={signal.executed ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{formatDateTime(signal.timestamp)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary">No signals generated yet</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>Bot Configuration</Typography>
          {bot.config ? (
            <Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" gutterBottom>Risk Management</Typography>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Max Position Size</Typography>
                    <Typography variant="body1">{formatCurrency(bot.config.max_position_size || 0)}</Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Stop Loss</Typography>
                    <Typography variant="body1">{bot.config.stop_loss_percent || 0}%</Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Take Profit</Typography>
                    <Typography variant="body1">{bot.config.take_profit_percent || 0}%</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" gutterBottom>Trading Parameters</Typography>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Trading Pairs</Typography>
                    <Typography variant="body1">
                      {bot.config.trading_pairs ? bot.config.trading_pairs.join(', ') : 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Timeframe</Typography>
                    <Typography variant="body1">{bot.config.timeframe || 'N/A'}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Typography color="text.secondary">No configuration data available</Typography>
          )}
        </TabPanel>
      </Card>
    </Box>
  );
};

export default BotDetailPage;