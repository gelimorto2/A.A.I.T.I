import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { SmartToy, CheckCircle, Error, Stop } from '@mui/icons-material';
import DashboardWidget from './DashboardWidget';

interface BotsStatusWidgetProps {
  id: string;
  runningBots: number;
  stoppedBots: number;
  errorBots: number;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
}

const BotsStatusWidget: React.FC<BotsStatusWidgetProps> = ({
  id,
  runningBots,
  stoppedBots,
  errorBots,
  onRemove,
  onSettings,
}) => {
  const totalBots = runningBots + stoppedBots + errorBots;
  const healthPercentage = totalBots > 0 ? (runningBots / totalBots) * 100 : 0;

  return (
    <DashboardWidget
      id={id}
      title="AI AGENTS STATUS"
      onRemove={onRemove}
      onSettings={onSettings}
    >
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <SmartToy sx={{ color: 'primary.main', fontSize: 40, mb: 1 }} />
        <Typography variant="h3" color="primary.main" fontWeight="bold">
          {runningBots}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Active Agents
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          System Health
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={healthPercentage} 
          sx={{ 
            height: 8,
            borderRadius: 4,
            '& .MuiLinearProgress-bar': {
              backgroundColor: healthPercentage >= 75 ? '#00ff88' : 
                            healthPercentage >= 50 ? '#ffaa00' : '#ff3366'
            }
          }}
        />
        <Typography 
          variant="caption" 
          sx={{ 
            color: healthPercentage >= 75 ? '#00ff88' : 
                   healthPercentage >= 50 ? '#ffaa00' : '#ff3366',
            fontWeight: 'bold'
          }}
        >
          {healthPercentage.toFixed(0)}%
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CheckCircle sx={{ color: '#00ff88', mb: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            {runningBots} Running
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Stop sx={{ color: '#666', mb: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            {stoppedBots} Stopped
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Error sx={{ color: '#ff3366', mb: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            {errorBots} Errors
          </Typography>
        </Box>
      </Box>
    </DashboardWidget>
  );
};

export default BotsStatusWidget;