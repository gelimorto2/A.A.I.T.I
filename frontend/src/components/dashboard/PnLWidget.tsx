import React from 'react';
import { Box, Typography } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import DashboardWidget from './DashboardWidget';
import PnLChartTooltip from '../common/PnLChartTooltip';

interface PnLWidgetProps {
  id: string;
  totalPnL: number;
  totalTrades: number;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
}

const PnLWidget: React.FC<PnLWidgetProps> = ({
  id,
  totalPnL,
  totalTrades,
  onRemove,
  onSettings,
}) => {
  const isPositive = totalPnL >= 0;

  return (
    <DashboardWidget
      id={id}
      title="PROFIT & LOSS"
      onRemove={onRemove}
      onSettings={onSettings}
    >
      <PnLChartTooltip currentPnL={totalPnL}>
        <Box sx={{ textAlign: 'center', cursor: 'pointer' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            {isPositive ? (
              <TrendingUp sx={{ color: '#00ff88', fontSize: 40 }} />
            ) : (
              <TrendingDown sx={{ color: '#ff3366', fontSize: 40 }} />
            )}
          </Box>
          
          <Typography 
            variant="h3" 
            fontWeight="bold"
            color={isPositive ? '#00ff88' : '#ff3366'}
            sx={{ mb: 1 }}
          >
            ${Math.abs(totalPnL).toFixed(2)}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            {totalTrades} Total Trades
          </Typography>

          <Box 
            sx={{ 
              p: 1, 
              borderRadius: 1, 
              bgcolor: isPositive ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)',
              border: '1px solid',
              borderColor: isPositive ? '#00ff88' : '#ff3366',
            }}
          >
            <Typography 
              variant="caption" 
              fontWeight="bold"
              color={isPositive ? '#00ff88' : '#ff3366'}
            >
              {isPositive ? '↗ PROFIT' : '↘ LOSS'}
            </Typography>
          </Box>
        </Box>
      </PnLChartTooltip>
    </DashboardWidget>
  );
};

export default PnLWidget;