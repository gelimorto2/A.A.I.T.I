import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  Grid,
  Chip,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Memory,
  Speed,
  Schedule,
  CloudDone,
  DataArray,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchSystemHealth } from '../../store/slices/healthSlice';

interface HealthTooltipProps {
  children: React.ReactElement;
}

const HealthTooltip: React.FC<HealthTooltipProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { data: healthData, loading } = useSelector((state: RootState) => state.health);

  useEffect(() => {
    dispatch(fetchSystemHealth());
    const interval = setInterval(() => {
      dispatch(fetchSystemHealth());
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [dispatch]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getMemoryUsagePercentage = () => {
    if (!healthData?.memory) return 0;
    return (healthData.memory.heapUsed / healthData.memory.heapTotal) * 100;
  };

  const tooltipContent = loading ? (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
      <CircularProgress size={20} sx={{ mr: 1 }} />
      <Typography variant="body2">Loading health data...</Typography>
    </Box>
  ) : healthData ? (
    <Box sx={{ p: 2, minWidth: 350, maxWidth: 400 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
        🏥 System Health Details
      </Typography>
      
      <Grid container spacing={2}>
        {/* Status */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CloudDone sx={{ mr: 1, color: '#00ff88' }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Status:</Typography>
            <Chip 
              label={healthData.status.toUpperCase()} 
              size="small" 
              color={healthData.status === 'healthy' ? 'success' : 'error'}
              sx={{ ml: 1, fontWeight: 'bold' }} 
            />
          </Box>
        </Grid>

        {/* Uptime */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Schedule sx={{ mr: 1, color: '#00ff88' }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Uptime:</Typography>
            <Typography variant="body2" sx={{ ml: 1, color: '#00ff88' }}>
              {formatUptime(healthData.uptime)}
            </Typography>
          </Box>
        </Grid>

        {/* Memory Usage */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Memory sx={{ mr: 1, color: '#ffaa00' }} />
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Memory Usage:</Typography>
              <Typography variant="body2" sx={{ ml: 1 }}>
                {formatMemory(healthData.memory.heapUsed)} / {formatMemory(healthData.memory.heapTotal)}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={getMemoryUsagePercentage()} 
              sx={{ 
                height: 6,
                borderRadius: 3,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getMemoryUsagePercentage() > 80 ? '#ff3366' : 
                                 getMemoryUsagePercentage() > 60 ? '#ffaa00' : '#00ff88'
                }
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {getMemoryUsagePercentage().toFixed(1)}% used
            </Typography>
          </Box>
        </Grid>

        {/* Market Data Cache */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <DataArray sx={{ mr: 1, color: '#00aaff' }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Market Data:</Typography>
          </Box>
          <Box sx={{ ml: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Provider: {healthData.marketData.provider}
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              Cache: {healthData.marketData.cacheStats.hits} hits, {healthData.marketData.cacheStats.misses} misses
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              Cache Size: {healthData.marketData.cacheStats.cacheSize} entries
            </Typography>
          </Box>
        </Grid>

        {/* System Info */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Speed sx={{ mr: 1, color: '#aa00ff' }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>System Info:</Typography>
          </Box>
          <Box sx={{ ml: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Version: {healthData.config.version}
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              Environment: {healthData.config.nodeEnv}
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              Port: {healthData.config.port}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Last updated: {new Date(healthData.timestamp).toLocaleTimeString()}
      </Typography>
    </Box>
  ) : (
    <Box sx={{ p: 2 }}>
      <Typography variant="body2" color="error">
        Unable to load health data
      </Typography>
    </Box>
  );

  return (
    <Tooltip 
      title={tooltipContent}
      placement="top"
      arrow
      sx={{
        '& .MuiTooltip-tooltip': {
          bgcolor: 'background.paper',
          border: '1px solid #333',
          maxWidth: 'none',
        },
      }}
    >
      {children}
    </Tooltip>
  );
};

export default HealthTooltip;