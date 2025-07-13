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
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,

  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add,
  PlayArrow,
  Stop,
  Edit,
  Delete,
  MoreVert,
  SmartToy,
  Warning,
  CheckCircle,
  Error,
  Close,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchBots } from '../store/slices/botsSlice';

interface Bot {
  id: string;
  name: string;
  description: string;
  strategy_type: string;
  trading_mode: 'live' | 'paper' | 'shadow';
  status: 'running' | 'stopped' | 'error' | 'paused';
  config?: any;
  health_score?: number;
  pnl?: number;
  total_trades?: number;
  win_rate?: number;
  created_at: string;
  updated_at: string;
}

const BotsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bots, loading } = useSelector((state: RootState) => state.bots);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuBotId, setMenuBotId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [botForm, setBotForm] = useState({
    name: '',
    description: '',
    strategy_type: 'momentum',
    trading_mode: 'paper' as 'live' | 'paper' | 'shadow',
    config: {
      max_position_size: 1000,
      stop_loss_percent: 5,
      take_profit_percent: 10,
      trading_pairs: ['AAPL', 'GOOGL'],
      timeframe: '1h',
      indicators: {
        rsi_period: 14,
        ma_period: 20,
        bb_period: 20
      },
      risk_management: {
        max_daily_loss: 500,
        max_concurrent_trades: 3
      }
    }
  });

  useEffect(() => {
    dispatch(fetchBots());
  }, [dispatch]);

  const strategyTypes = [
    { value: 'momentum', label: 'Momentum Trading' },
    { value: 'mean_reversion', label: 'Mean Reversion' },
    { value: 'arbitrage', label: 'Arbitrage' },
    { value: 'scalping', label: 'Scalping' },
    { value: 'swing', label: 'Swing Trading' },
    { value: 'dca', label: 'Dollar Cost Averaging' },
    { value: 'grid', label: 'Grid Trading' },
    { value: 'ml_prediction', label: 'ML Prediction' }
  ];

  const handleCreateBot = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(botForm)
      });

      if (response.ok) {
        setSuccess('Bot created successfully!');
        setCreateDialogOpen(false);
        dispatch(fetchBots());
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create bot');
      }
    } catch (error) {
      setError('Network error while creating bot');
    }
  };

  const handleUpdateBot = async () => {
    if (!selectedBot) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bots/${selectedBot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(botForm)
      });

      if (response.ok) {
        setSuccess('Bot updated successfully!');
        setEditDialogOpen(false);
        dispatch(fetchBots());
        setSelectedBot(null);
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update bot');
      }
    } catch (error) {
      setError('Network error while updating bot');
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!window.confirm('Are you sure you want to delete this bot?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Bot deleted successfully!');
        dispatch(fetchBots());
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete bot');
      }
    } catch (error) {
      setError('Network error while deleting bot');
    }
  };

  const handleBotAction = async (botId: string, action: 'start' | 'stop' | 'pause') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bots/${botId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess(`Bot ${action}ed successfully!`);
        dispatch(fetchBots());
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to ${action} bot`);
      }
    } catch (error) {
      setError(`Network error while ${action}ing bot`);
    }
  };

  const openEditDialog = (bot: Bot) => {
    setSelectedBot(bot);
    setBotForm({
      name: bot.name,
      description: bot.description,
      strategy_type: bot.strategy_type,
      trading_mode: bot.trading_mode,
      config: bot.config || botForm.config
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setBotForm({
      name: '',
      description: '',
      strategy_type: 'momentum',
      trading_mode: 'paper',
      config: {
        max_position_size: 1000,
        stop_loss_percent: 5,
        take_profit_percent: 10,
        trading_pairs: ['AAPL', 'GOOGL'],
        timeframe: '1h',
        indicators: {
          rsi_period: 14,
          ma_period: 20,
          bb_period: 20
        },
        risk_management: {
          max_daily_loss: 500,
          max_concurrent_trades: 3
        }
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle sx={{ color: '#00ff88' }} />;
      case 'stopped':
        return <Stop sx={{ color: '#666' }} />;
      case 'error':
        return <Error sx={{ color: '#ff3366' }} />;
      case 'paused':
        return <Warning sx={{ color: '#ffaa00' }} />;
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, botId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuBotId(botId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuBotId(null);
  };

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
            AI AGENTS
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your autonomous trading agents • {bots.length} active
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          size="large"
        >
          Deploy Agent
        </Button>
      </Box>

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

      {/* Bots Grid */}
      <Grid container spacing={3}>
        {bots.map((bot) => (
          <Grid item xs={12} sm={6} md={4} key={bot.id}>
            <Card 
              sx={{ 
                bgcolor: 'background.paper', 
                border: '1px solid #333',
                '&:hover': {
                  borderColor: 'primary.main',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                },
              }}
            >
              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SmartToy sx={{ color: 'primary.main', mr: 1 }} />
                    <Box>
                      <Typography variant="h6" fontWeight="bold" noWrap>
                        {bot.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {strategyTypes.find(s => s.value === bot.strategy_type)?.label}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getStatusIcon(bot.status)}
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuOpen(e, bot.id)}
                      sx={{ ml: 1 }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                </Box>

                {/* Status Chips */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    label={bot.trading_mode.toUpperCase()} 
                    size="small" 
                    color={bot.trading_mode === 'live' ? 'error' : bot.trading_mode === 'paper' ? 'primary' : 'secondary'}
                    sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                  />
                  <Chip 
                    label={bot.status.toUpperCase()} 
                    size="small" 
                    sx={{ 
                      fontWeight: 'bold', 
                      fontSize: '0.7rem',
                      bgcolor: bot.status === 'running' ? 'rgba(0, 255, 136, 0.1)' : 
                              bot.status === 'error' ? 'rgba(255, 51, 102, 0.1)' : 'rgba(102, 102, 102, 0.1)',
                      color: bot.status === 'running' ? '#00ff88' : 
                             bot.status === 'error' ? '#ff3366' : '#666',
                    }}
                  />
                </Box>

                {/* Description */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {bot.description || 'No description provided'}
                </Typography>

                {/* Health Score */}
                {bot.health_score !== undefined && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Health Score
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={bot.health_score} 
                      sx={{ 
                        mb: 0.5,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getHealthColor(bot.health_score)
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ color: getHealthColor(bot.health_score) }}>
                      {bot.health_score}%
                    </Typography>
                  </Box>
                )}

                {/* Performance Metrics */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      P&L
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight="bold"
                      color={bot.pnl && bot.pnl >= 0 ? '#00ff88' : '#ff3366'}
                    >
                      ${bot.pnl?.toFixed(2) || '0.00'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Trades
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {bot.total_trades || 0}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Win Rate
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight="bold"
                      color={bot.win_rate && bot.win_rate >= 50 ? '#00ff88' : '#ff3366'}
                    >
                      {bot.win_rate?.toFixed(1) || '0.0'}%
                    </Typography>
                  </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {bot.status === 'running' ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Stop />}
                      onClick={() => handleBotAction(bot.id, 'stop')}
                      fullWidth
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<PlayArrow />}
                      onClick={() => handleBotAction(bot.id, 'start')}
                      fullWidth
                    >
                      Start
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => openEditDialog(bot)}
                  >
                    Edit
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {bots.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SmartToy sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            No AI Agents Deployed
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Deploy your first AI trading agent to start automated trading
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            size="large"
          >
            Deploy First Agent
          </Button>
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (menuBotId) {
            const bot = bots.find(b => b.id === menuBotId);
            if (bot) openEditDialog(bot);
          }
          handleMenuClose();
        }}>
          <ListItemIcon><Edit /></ListItemIcon>
          <ListItemText>Edit Configuration</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuBotId) handleDeleteBot(menuBotId);
          handleMenuClose();
        }}>
          <ListItemIcon><Delete /></ListItemIcon>
          <ListItemText>Delete Agent</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Bot Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Deploy New AI Agent
          <IconButton
            onClick={() => setCreateDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Agent Name"
                value={botForm.name}
                onChange={(e) => setBotForm({ ...botForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Strategy Type</InputLabel>
                <Select
                  value={botForm.strategy_type}
                  label="Strategy Type"
                  onChange={(e) => setBotForm({ ...botForm, strategy_type: e.target.value })}
                >
                  {strategyTypes.map((strategy) => (
                    <MenuItem key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={botForm.description}
                onChange={(e) => setBotForm({ ...botForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Trading Mode</InputLabel>
                <Select
                  value={botForm.trading_mode}
                  label="Trading Mode"
                  onChange={(e) => setBotForm({ ...botForm, trading_mode: e.target.value as any })}
                >
                  <MenuItem value="paper">Paper Trading</MenuItem>
                  <MenuItem value="shadow">Shadow Mode</MenuItem>
                  <MenuItem value="live">Live Trading</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Position Size ($)"
                type="number"
                value={botForm.config.max_position_size}
                onChange={(e) => setBotForm({ 
                  ...botForm, 
                  config: { ...botForm.config, max_position_size: Number(e.target.value) }
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Stop Loss (%)"
                type="number"
                value={botForm.config.stop_loss_percent}
                onChange={(e) => setBotForm({ 
                  ...botForm, 
                  config: { ...botForm.config, stop_loss_percent: Number(e.target.value) }
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Take Profit (%)"
                type="number"
                value={botForm.config.take_profit_percent}
                onChange={(e) => setBotForm({ 
                  ...botForm, 
                  config: { ...botForm.config, take_profit_percent: Number(e.target.value) }
                })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateBot} 
            variant="contained" 
            disabled={!botForm.name}
          >
            Deploy Agent
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Bot Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit AI Agent
          <IconButton
            onClick={() => setEditDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Agent Name"
                value={botForm.name}
                onChange={(e) => setBotForm({ ...botForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Strategy Type</InputLabel>
                <Select
                  value={botForm.strategy_type}
                  label="Strategy Type"
                  onChange={(e) => setBotForm({ ...botForm, strategy_type: e.target.value })}
                >
                  {strategyTypes.map((strategy) => (
                    <MenuItem key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={botForm.description}
                onChange={(e) => setBotForm({ ...botForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Trading Mode</InputLabel>
                <Select
                  value={botForm.trading_mode}
                  label="Trading Mode"
                  onChange={(e) => setBotForm({ ...botForm, trading_mode: e.target.value as any })}
                >
                  <MenuItem value="paper">Paper Trading</MenuItem>
                  <MenuItem value="shadow">Shadow Mode</MenuItem>
                  <MenuItem value="live">Live Trading</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Position Size ($)"
                type="number"
                value={botForm.config.max_position_size}
                onChange={(e) => setBotForm({ 
                  ...botForm, 
                  config: { ...botForm.config, max_position_size: Number(e.target.value) }
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Stop Loss (%)"
                type="number"
                value={botForm.config.stop_loss_percent}
                onChange={(e) => setBotForm({ 
                  ...botForm, 
                  config: { ...botForm.config, stop_loss_percent: Number(e.target.value) }
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Take Profit (%)"
                type="number"
                value={botForm.config.take_profit_percent}
                onChange={(e) => setBotForm({ 
                  ...botForm, 
                  config: { ...botForm.config, take_profit_percent: Number(e.target.value) }
                })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateBot} 
            variant="contained" 
            disabled={!botForm.name}
          >
            Update Agent
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BotsPage;