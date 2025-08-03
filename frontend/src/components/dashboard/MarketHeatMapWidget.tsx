import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Tooltip } from '@mui/material';
import DashboardWidget from './DashboardWidget';

interface HeatMapItem {
  symbol: string;
  change: number;
  price: number;
  volume: number;
}

interface MarketHeatMapWidgetProps {
  id: string;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
}

const MarketHeatMapWidget: React.FC<MarketHeatMapWidgetProps> = ({
  id,
  onRemove,
  onSettings,
}) => {
  // Mock market data for demonstration
  const marketData: HeatMapItem[] = [
    { symbol: 'BTC', change: 5.2, price: 42350, volume: 1200000 },
    { symbol: 'ETH', change: -2.1, price: 2850, volume: 850000 },
    { symbol: 'ADA', change: 8.7, price: 0.42, volume: 95000 },
    { symbol: 'SOL', change: -1.5, price: 98.5, volume: 450000 },
    { symbol: 'DOT', change: 3.2, price: 7.8, volume: 180000 },
    { symbol: 'LINK', change: -4.8, price: 15.2, volume: 320000 },
    { symbol: 'AVAX', change: 6.1, price: 28.9, volume: 125000 },
    { symbol: 'MATIC', change: 2.3, price: 0.85, volume: 210000 },
  ];

  const getHeatMapColor = (change: number) => {
    const intensity = Math.min(Math.abs(change) / 10, 1);
    if (change > 0) {
      return `rgba(0, 255, 136, ${0.3 + intensity * 0.7})`;
    } else {
      return `rgba(255, 51, 102, ${0.3 + intensity * 0.7})`;
    }
  };

  const getTextColor = (change: number) => {
    return change > 0 ? '#00ff88' : '#ff3366';
  };

  return (
    <DashboardWidget
      id={id}
      title="MARKET HEAT MAP"
      onRemove={onRemove}
      onSettings={onSettings}
    >
      <Grid container spacing={1}>
        {marketData.map((item, index) => (
          <Grid item xs={6} sm={3} key={item.symbol}>
            <Tooltip
              title={
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    {item.symbol}
                  </Typography>
                  <Typography variant="caption">
                    Price: ${item.price.toLocaleString()}
                  </Typography>
                  <br />
                  <Typography variant="caption">
                    Volume: ${item.volume.toLocaleString()}
                  </Typography>
                  <br />
                  <Typography 
                    variant="caption" 
                    sx={{ color: getTextColor(item.change) }}
                  >
                    Change: {item.change > 0 ? '+' : ''}{item.change}%
                  </Typography>
                </Box>
              }
            >
              <Card
                sx={{
                  height: 60,
                  bgcolor: getHeatMapColor(item.change),
                  border: '1px solid',
                  borderColor: 'grey.700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    borderColor: 'primary.main',
                  },
                }}
              >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="bold"
                    sx={{ 
                      color: 'text.primary',
                      fontSize: '0.8rem',
                      textAlign: 'center',
                    }}
                  >
                    {item.symbol}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: getTextColor(item.change),
                      fontWeight: 'bold',
                      display: 'block',
                      textAlign: 'center',
                      fontSize: '0.7rem',
                    }}
                  >
                    {item.change > 0 ? '+' : ''}{item.change}%
                  </Typography>
                </CardContent>
              </Card>
            </Tooltip>
          </Grid>
        ))}
      </Grid>
      
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Real-time market performance • Updated every 5s
        </Typography>
      </Box>
    </DashboardWidget>
  );
};

export default MarketHeatMapWidget;