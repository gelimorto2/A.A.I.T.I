import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import DashboardWidget from './DashboardWidget';

interface WinRateWidgetProps {
  id: string;
  winRate: number;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
}

const WinRateWidget: React.FC<WinRateWidgetProps> = ({
  id,
  winRate,
  onRemove,
  onSettings,
}) => {
  const isGood = winRate >= 50;

  return (
    <DashboardWidget
      id={id}
      title="WIN RATE"
      onRemove={onRemove}
      onSettings={onSettings}
    >
      <Box sx={{ textAlign: 'center' }}>
        <CheckCircle 
          sx={{ 
            color: isGood ? '#00ff88' : '#ff3366', 
            fontSize: 40, 
            mb: 1 
          }} 
        />
        
        <Typography 
          variant="h3" 
          color={isGood ? '#00ff88' : '#ff3366'}
          fontWeight="bold"
          sx={{ mb: 2 }}
        >
          {winRate.toFixed(1)}%
        </Typography>
        
        <LinearProgress 
          variant="determinate" 
          value={winRate} 
          sx={{ 
            height: 12,
            borderRadius: 6,
            mb: 1,
            '& .MuiLinearProgress-bar': {
              backgroundColor: isGood ? '#00ff88' : '#ff3366',
              borderRadius: 6,
            }
          }}
        />
        
        <Typography variant="body2" color="text.secondary">
          Success Rate
        </Typography>

        <Box 
          sx={{ 
            mt: 2,
            p: 1, 
            borderRadius: 1, 
            bgcolor: isGood ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)',
            border: '1px solid',
            borderColor: isGood ? '#00ff88' : '#ff3366',
          }}
        >
          <Typography 
            variant="caption" 
            fontWeight="bold"
            color={isGood ? '#00ff88' : '#ff3366'}
          >
            {isGood ? 'EXCELLENT' : 'NEEDS IMPROVEMENT'}
          </Typography>
        </Box>
      </Box>
    </DashboardWidget>
  );
};

export default WinRateWidget;