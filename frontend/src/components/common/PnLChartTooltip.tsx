import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
} from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface PnLChartTooltipProps {
  children: React.ReactElement;
  botId?: string;
  currentPnL: number;
}

const PnLChartTooltip: React.FC<PnLChartTooltipProps> = ({ children, botId, currentPnL }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: Fetch real chart data from API when botId is provided
    // For now, we'll show a placeholder message
    if (botId) {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setChartData([]);
        setLoading(false);
      }, 1000);
    }
  }, [currentPnL, botId]);

  const getPnLTrend = () => {
    if (chartData.length < 2) return 'neutral';
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    return last > first ? 'up' : 'down';
  };

  const getPercentageChange = () => {
    if (chartData.length < 2) return 0;
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    return ((last - first) / Math.abs(first)) * 100;
  };

  const getMaxValue = () => Math.max(...chartData.map(d => d.value));
  const getMinValue = () => Math.min(...chartData.map(d => d.value));

  const trend = getPnLTrend();
  const percentageChange = getPercentageChange();

  const tooltipContent = loading ? (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
      <CircularProgress size={20} sx={{ mr: 1 }} />
      <Typography variant="body2">Loading P&L chart...</Typography>
    </Box>
  ) : chartData.length === 0 ? (
    <Box sx={{ p: 2, minWidth: 300 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
        📈 P&L Performance
      </Typography>
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">Current P&L:</Typography>
        <Typography variant="h6" sx={{ 
          color: currentPnL >= 0 ? '#00ff88' : '#ff3366',
          fontWeight: 'bold'
        }}>
          ${currentPnL.toFixed(2)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Historical chart data will be available once trading begins
        </Typography>
      </Box>
    </Box>
  ) : (
    <Box sx={{ p: 2, minWidth: 400, maxWidth: 450 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
        📈 P&L Performance (30 Days)
      </Typography>
      
      <Grid container spacing={2}>
        {/* Current Stats */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">Current P&L:</Typography>
              <Typography variant="h6" sx={{ 
                color: currentPnL >= 0 ? '#00ff88' : '#ff3366',
                fontWeight: 'bold'
              }}>
                ${currentPnL.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">30-Day Change:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {trend === 'up' ? (
                  <TrendingUp sx={{ color: '#00ff88', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ color: '#ff3366', mr: 0.5 }} />
                )}
                <Typography variant="h6" sx={{ 
                  color: percentageChange >= 0 ? '#00ff88' : '#ff3366',
                  fontWeight: 'bold'
                }}>
                  {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* Mini Chart */}
        <Grid item xs={12}>
          <Box sx={{ height: 200, mb: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={currentPnL >= 0 ? '#00ff88' : '#ff3366'} 
                      stopOpacity={0.8}
                    />
                    <stop 
                      offset="95%" 
                      stopColor={currentPnL >= 0 ? '#00ff88' : '#ff3366'} 
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#666' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#666' }}
                  domain={['dataMin - 50', 'dataMax + 50']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={currentPnL >= 0 ? '#00ff88' : '#ff3366'}
                  strokeWidth={2}
                  fill="url(#pnlGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            p: 1,
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 1
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">High</Typography>
              <Typography variant="body2" sx={{ 
                color: '#00ff88',
                fontWeight: 'bold',
                display: 'block'
              }}>
                ${getMaxValue().toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Low</Typography>
              <Typography variant="body2" sx={{ 
                color: '#ff3366',
                fontWeight: 'bold',
                display: 'block'
              }}>
                ${getMinValue().toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Volatility</Typography>
              <Typography variant="body2" sx={{ 
                color: '#ffaa00',
                fontWeight: 'bold',
                display: 'block'
              }}>
                {(((getMaxValue() - getMinValue()) / Math.abs(currentPnL || 1)) * 100).toFixed(1)}%
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        <ShowChart sx={{ fontSize: 12, mr: 0.5 }} />
        Hover over chart points for detailed values
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

export default PnLChartTooltip;