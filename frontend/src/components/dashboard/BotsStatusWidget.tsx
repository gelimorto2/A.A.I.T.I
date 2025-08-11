import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Fade, Zoom, useTheme } from '@mui/material';
import { SmartToy, CheckCircle, Error, Stop } from '@mui/icons-material';
import DashboardWidget from './DashboardWidget';
import LoadingSkeleton from '../common/LoadingSkeleton';

interface BotsStatusWidgetProps {
  id: string;
  runningBots: number;
  stoppedBots: number;
  errorBots: number;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
  loading?: boolean;
}

const BotsStatusWidget: React.FC<BotsStatusWidgetProps> = ({
  id,
  runningBots,
  stoppedBots,
  errorBots,
  onRemove,
  onSettings,
  loading = false,
}) => {
  const theme = useTheme();
  const [displayRunning, setDisplayRunning] = useState(0);
  const totalBots = runningBots + stoppedBots + errorBots;
  const healthPercentage = totalBots > 0 ? (runningBots / totalBots) * 100 : 0;

  // Animated counter effect
  useEffect(() => {
    if (!loading && runningBots !== displayRunning) {
      const increment = runningBots > displayRunning ? 1 : -1;
      const timer = setInterval(() => {
        setDisplayRunning(prev => {
          const newValue = prev + increment;
          if ((increment > 0 && newValue >= runningBots) || 
              (increment < 0 && newValue <= runningBots)) {
            clearInterval(timer);
            return runningBots;
          }
          return newValue;
        });
      }, 50);

      return () => clearInterval(timer);
    }
  }, [runningBots, displayRunning, loading]);

  if (loading) {
    return <LoadingSkeleton variant="widget" height={250} />;
  }

  return (
    <DashboardWidget
      id={id}
      title="AI AGENTS STATUS"
      onRemove={onRemove}
      onSettings={onSettings}
    >
      <Fade in timeout={500}>
        <Box>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Zoom in timeout={700}>
              <SmartToy 
                sx={{ 
                  color: 'primary.main', 
                  fontSize: 40, 
                  mb: 1,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    filter: `drop-shadow(0 0 8px ${theme.palette.primary.main}40)`,
                  }
                }} 
              />
            </Zoom>
            <Typography 
              variant="h3" 
              color="primary.main" 
              fontWeight="bold"
              sx={{
                transition: 'all 0.3s ease-in-out',
                fontFamily: 'monospace',
              }}
            >
              {displayRunning}
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
                transition: 'all 0.5s ease-in-out',
                backgroundColor: theme.palette.action.hover,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: healthPercentage >= 75 ? '#00ff88' : 
                                healthPercentage >= 50 ? '#ffaa00' : '#ff3366',
                  transition: 'background-color 0.5s ease-in-out',
                  borderRadius: 4,
                }
              }}
            />
            <Typography 
              variant="caption" 
              sx={{ 
                color: healthPercentage >= 75 ? '#00ff88' : 
                       healthPercentage >= 50 ? '#ffaa00' : '#ff3366',
                fontWeight: 'bold',
                transition: 'color 0.3s ease-in-out',
              }}
            >
              {healthPercentage.toFixed(0)}%
            </Typography>
          </Box>

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-around', 
            mt: 2,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            gap: { xs: 2, sm: 0 }
          }}>
            <Fade in timeout={600} style={{ transitionDelay: '100ms' }}>
              <Box sx={{ 
                textAlign: 'center',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                }
              }}>
                <CheckCircle 
                  sx={{ 
                    color: '#00ff88', 
                    mb: 0.5,
                    transition: 'all 0.3s ease-in-out',
                    filter: runningBots > 0 ? 'drop-shadow(0 0 4px #00ff8840)' : 'none',
                  }} 
                />
                <Typography variant="body2" color="text.secondary">
                  {runningBots} Running
                </Typography>
              </Box>
            </Fade>
            
            <Fade in timeout={600} style={{ transitionDelay: '200ms' }}>
              <Box sx={{ 
                textAlign: 'center',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                }
              }}>
                <Stop 
                  sx={{ 
                    color: '#666', 
                    mb: 0.5,
                    transition: 'all 0.3s ease-in-out',
                  }} 
                />
                <Typography variant="body2" color="text.secondary">
                  {stoppedBots} Stopped
                </Typography>
              </Box>
            </Fade>
            
            <Fade in timeout={600} style={{ transitionDelay: '300ms' }}>
              <Box sx={{ 
                textAlign: 'center',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                }
              }}>
                <Error 
                  sx={{ 
                    color: '#ff3366', 
                    mb: 0.5,
                    transition: 'all 0.3s ease-in-out',
                    filter: errorBots > 0 ? 'drop-shadow(0 0 4px #ff336640)' : 'none',
                    animation: errorBots > 0 ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.7 },
                      '100%': { opacity: 1 },
                    }
                  }} 
                />
                <Typography variant="body2" color="text.secondary">
                  {errorBots} Errors
                </Typography>
              </Box>
            </Fade>
          </Box>
        </Box>
      </Fade>
    </DashboardWidget>
  );
};

export default BotsStatusWidget;