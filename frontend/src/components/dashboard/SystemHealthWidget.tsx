import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { MonitorHeart, CheckCircle, Warning, Error } from '@mui/icons-material';
import DashboardWidget from './DashboardWidget';
import HealthTooltip from '../common/HealthTooltip';

interface SystemHealthWidgetProps {
  id: string;
  healthScore?: number;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
}

const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({
  id,
  healthScore = 98,
  onRemove,
  onSettings,
}) => {
  const getHealthStatus = (score: number) => {
    if (score >= 90) return { label: 'EXCELLENT', color: '#00ff88', icon: <CheckCircle /> };
    if (score >= 75) return { label: 'GOOD', color: '#ffaa00', icon: <Warning /> };
    if (score >= 50) return { label: 'WARNING', color: '#ff9800', icon: <Warning /> };
    return { label: 'CRITICAL', color: '#ff3366', icon: <Error /> };
  };

  const status = getHealthStatus(healthScore);

  return (
    <DashboardWidget
      id={id}
      title="SYSTEM HEALTH"
      onRemove={onRemove}
      onSettings={onSettings}
    >
      <HealthTooltip>
        <Box sx={{ textAlign: 'center', cursor: 'pointer' }}>
          <MonitorHeart 
            sx={{ 
              color: status.color, 
              fontSize: 40, 
              mb: 1 
            }} 
          />
          
          <Typography 
            variant="h3" 
            color={status.color}
            fontWeight="bold"
            sx={{ mb: 1 }}
          >
            {healthScore}%
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            All systems operational
          </Typography>

          <Chip
            icon={React.cloneElement(status.icon, { fontSize: 'small' })}
            label={status.label}
            size="small"
            sx={{
              bgcolor: `${status.color}20`,
              color: status.color,
              fontWeight: 'bold',
              border: `1px solid ${status.color}`,
            }}
          />

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                CPU
              </Typography>
              <Typography variant="body2" color="#00ff88" fontWeight="bold">
                23%
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                RAM
              </Typography>
              <Typography variant="body2" color="#00ff88" fontWeight="bold">
                67%
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                API
              </Typography>
              <Typography variant="body2" color="#00ff88" fontWeight="bold">
                Online
              </Typography>
            </Box>
          </Box>
        </Box>
      </HealthTooltip>
    </DashboardWidget>
  );
};

export default SystemHealthWidget;