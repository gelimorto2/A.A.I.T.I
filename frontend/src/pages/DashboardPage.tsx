import React, { useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  SmartToy,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
  Stop,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { fetchBots } from '../store/slices/botsSlice';
import { fetchPortfolio } from '../store/slices/analyticsSlice';

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bots } = useSelector((state: RootState) => state.bots);
  const { portfolio } = useSelector((state: RootState) => state.analytics);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchBots());
    dispatch(fetchPortfolio());
  }, [dispatch]);

  const runningBots = bots.filter(bot => bot.status === 'running');
  const stoppedBots = bots.filter(bot => bot.status === 'stopped');
  const errorBots = bots.filter(bot => bot.status === 'error');

  const totalPnL = portfolio?.overall?.total_pnl || 0;
  const totalTrades = portfolio?.overall?.total_trades || 0;
  const winRate = portfolio?.overall?.win_rate || 0;

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
        COMMAND CENTER
      </Typography>
      
      <Typography 
        variant="subtitle1" 
        color="text.secondary" 
        sx={{ mb: 3, fontFamily: 'monospace' }}
      >
        Welcome back, {user?.username} • Mission Status: ACTIVE
      </Typography>

      {/* System Status Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SmartToy sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  Active Agents
                </Typography>
              </Box>
              <Typography variant="h3" color="primary.main" fontWeight="bold">
                {runningBots.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stoppedBots.length} stopped • {errorBots.length} errors
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {totalPnL >= 0 ? (
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
                color={totalPnL >= 0 ? '#00ff88' : '#ff3366'}
              >
                ${totalPnL.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totalTrades} total trades
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ color: '#00ff88', mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  Win Rate
                </Typography>
              </Box>
              <Typography 
                variant="h3" 
                color={winRate >= 50 ? '#00ff88' : '#ff3366'}
                fontWeight="bold"
              >
                {winRate.toFixed(1)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={winRate} 
                sx={{ 
                  mt: 1,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: winRate >= 50 ? '#00ff88' : '#ff3366'
                  }
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning sx={{ color: '#ffaa00', mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  System Health
                </Typography>
              </Box>
              <Typography 
                variant="h3" 
                color="#00ff88"
                fontWeight="bold"
              >
                98%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All systems operational
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts */}
      {errorBots.length > 0 && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, bgcolor: 'rgba(255, 51, 102, 0.1)' }}
        >
          {errorBots.length} agent(s) require immediate attention
        </Alert>
      )}

      {/* Active Bots Grid */}
      <Typography 
        variant="h5" 
        gutterBottom 
        sx={{ 
          fontWeight: 'bold', 
          mb: 2,
          fontFamily: 'monospace',
        }}
      >
        ACTIVE AGENTS
      </Typography>

      <Grid container spacing={3}>
        {bots.slice(0, 6).map((bot) => (
          <Grid xs={12} sm={6} md={4} key={bot.id}>
            <Card 
              sx={{ 
                bgcolor: 'background.paper', 
                border: '1px solid #333',
                '&:hover': {
                  borderColor: 'primary.main',
                  cursor: 'pointer',
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {bot.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {bot.strategy_type}
                    </Typography>
                  </Box>
                  {getStatusIcon(bot.status)}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip 
                    label={bot.trading_mode.toUpperCase()} 
                    size="small" 
                    color={bot.trading_mode === 'live' ? 'error' : 'secondary'}
                    sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                  />
                  <Chip 
                    label={bot.status.toUpperCase()} 
                    size="small" 
                    sx={{ 
                      fontWeight: 'bold', 
                      fontSize: '0.7rem',
                      bgcolor: bot.status === 'running' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(102, 102, 102, 0.1)',
                      color: bot.status === 'running' ? '#00ff88' : '#666',
                    }}
                  />
                </Box>

                {bot.health_score && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Health Score
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={bot.health_score} 
                      sx={{ 
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

                {bot.pnl !== undefined && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      P&L: <span style={{ 
                        color: bot.pnl >= 0 ? '#00ff88' : '#ff3366',
                        fontWeight: 'bold' 
                      }}>
                        ${bot.pnl.toFixed(2)}
                      </span>
                    </Typography>
                    {bot.total_trades && (
                      <Typography variant="body2" color="text.secondary">
                        Trades: {bot.total_trades}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardPage;