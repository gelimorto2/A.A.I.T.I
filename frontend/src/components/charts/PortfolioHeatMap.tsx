import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tooltip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Refresh,
  GridView,
  ViewModule,
  Settings,
} from '@mui/icons-material';

interface HeatMapData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  allocation: number; // Portfolio allocation percentage
}

interface PortfolioHeatMapProps {
  height?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const PortfolioHeatMap: React.FC<PortfolioHeatMapProps> = ({
  height = 400,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const theme = useTheme();
  const [viewType, setViewType] = useState<'allocation' | 'performance'>('allocation');
  const [data, setData] = useState<HeatMapData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize data - sample data that would come from API
    const sampleData: HeatMapData[] = [
      {
        symbol: 'BTC',
        price: 65432.10,
        change24h: 1234.56,
        changePercent24h: 1.92,
        volume24h: 28000000000,
        marketCap: 1280000000000,
        allocation: 35.2,
      },
      {
        symbol: 'ETH',
        price: 3421.75,
        change24h: -89.33,
        changePercent24h: -2.55,
        volume24h: 12000000000,
        marketCap: 411000000000,
        allocation: 28.7,
      },
      {
        symbol: 'ADA',
        price: 0.8234,
        change24h: 0.0523,
        changePercent24h: 6.78,
        volume24h: 890000000,
        marketCap: 28000000000,
        allocation: 15.1,
      },
      {
        symbol: 'DOT',
        price: 12.45,
        change24h: 0.89,
        changePercent24h: 7.69,
        volume24h: 456000000,
        marketCap: 14500000000,
        allocation: 10.3,
      },
      {
        symbol: 'LINK',
        price: 28.76,
        change24h: -1.23,
        changePercent24h: -4.11,
        volume24h: 678000000,
        marketCap: 16200000000,
        allocation: 6.9,
      },
      {
        symbol: 'UNI',
        price: 8.92,
        change24h: 0.34,
        changePercent24h: 3.97,
        volume24h: 234000000,
        marketCap: 5400000000,
        allocation: 3.8,
      },
    ];
    setData(sampleData);
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshData();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const refreshData = () => {
    setIsLoading(true);
    // Simulate API call with random price updates
    setTimeout(() => {
      setData(prev => prev.map(item => ({
        ...item,
        price: item.price * (1 + (Math.random() - 0.5) * 0.02),
        change24h: item.change24h * (1 + (Math.random() - 0.5) * 0.1),
        changePercent24h: item.changePercent24h * (1 + (Math.random() - 0.5) * 0.1),
      })));
      setIsLoading(false);
    }, 1000);
  };

  const getHeatMapColor = (value: number, isPerformance: boolean = false) => {
    const intensity = Math.min(Math.abs(value) / (isPerformance ? 10 : 40), 1);
    
    if (isPerformance) {
      // For performance view, color based on price change
      if (value > 0) {
        return alpha(theme.palette.success.main, 0.2 + intensity * 0.6);
      } else {
        return alpha(theme.palette.error.main, 0.2 + intensity * 0.6);
      }
    } else {
      // For allocation view, color based on allocation size
      return alpha(theme.palette.primary.main, 0.2 + intensity * 0.6);
    }
  };

  const getGridSize = (allocation: number) => {
    // Calculate grid size based on allocation
    const minSize = 120;
    const maxSize = 200;
    const normalizedAllocation = Math.min(allocation / 40, 1); // Max 40% allocation
    return minSize + (maxSize - minSize) * normalizedAllocation;
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (viewType === 'allocation') {
        return b.allocation - a.allocation;
      } else {
        return Math.abs(b.changePercent24h) - Math.abs(a.changePercent24h);
      }
    });
  }, [data, viewType]);

  const handleViewTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewType: 'allocation' | 'performance' | null,
  ) => {
    if (newViewType !== null) {
      setViewType(newViewType);
    }
  };

  return (
    <Card sx={{ height, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2,
        }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GridView color="primary" />
            Portfolio Heat Map
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <ToggleButtonGroup
              value={viewType}
              exclusive
              onChange={handleViewTypeChange}
              size="small"
            >
              <ToggleButton value="allocation">
                <Tooltip title="View by Allocation">
                  <ViewModule />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="performance">
                <Tooltip title="View by Performance">
                  <TrendingUp />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            <Tooltip title="Refresh Data">
              <IconButton onClick={refreshData} size="small" disabled={isLoading}>
                <Refresh sx={{ 
                  animation: isLoading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton size="small">
                <Settings />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Heat Map Grid */}
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignContent: 'flex-start',
          overflow: 'auto',
        }}>
          {sortedData.map((item) => {
            const isPositive = item.changePercent24h > 0;
            const size = viewType === 'allocation' ? getGridSize(item.allocation) : 140;
            
            return (
              <Tooltip
                key={item.symbol}
                title={
                  <Box>
                    <Typography variant="subtitle2">{item.symbol}</Typography>
                    <Typography variant="body2">
                      Price: ${item.price.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">
                      24h Change: {isPositive ? '+' : ''}{item.changePercent24h.toFixed(2)}%
                    </Typography>
                    <Typography variant="body2">
                      Allocation: {item.allocation.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2">
                      Volume: ${(item.volume24h / 1000000).toFixed(0)}M
                    </Typography>
                  </Box>
                }
              >
                <Box
                  sx={{
                    width: size,
                    height: Math.max(size * 0.6, 80),
                    backgroundColor: getHeatMapColor(
                      viewType === 'allocation' ? item.allocation : item.changePercent24h,
                      viewType === 'performance'
                    ),
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: theme.shadows[4],
                    },
                  }}
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.text.primary,
                    }}
                  >
                    {item.symbol}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: theme.palette.text.secondary,
                      textAlign: 'center',
                    }}
                  >
                    ${item.price.toFixed(2)}
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    mt: 0.5,
                  }}>
                    {isPositive ? (
                      <TrendingUp 
                        sx={{ 
                          color: theme.palette.success.main,
                          fontSize: '1rem',
                        }} 
                      />
                    ) : (
                      <TrendingDown 
                        sx={{ 
                          color: theme.palette.error.main,
                          fontSize: '1rem',
                        }} 
                      />
                    )}
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: isPositive ? theme.palette.success.main : theme.palette.error.main,
                        fontWeight: 'medium',
                      }}
                    >
                      {isPositive ? '+' : ''}{item.changePercent24h.toFixed(2)}%
                    </Typography>
                  </Box>

                  {viewType === 'allocation' && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: theme.palette.text.secondary,
                        mt: 0.5,
                      }}
                    >
                      {item.allocation.toFixed(1)}% alloc
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {/* Legend */}
        <Box sx={{ 
          mt: 2, 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
        }}>
          <Typography variant="caption" color="text.secondary">
            {viewType === 'allocation' ? 'Size = Allocation' : 'Color = Performance'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 12, 
              height: 12, 
              backgroundColor: getHeatMapColor(viewType === 'allocation' ? 40 : 10, viewType === 'performance'),
              borderRadius: 0.5,
            }} />
            <Typography variant="caption" color="text.secondary">
              {viewType === 'allocation' ? 'High' : 'Gain'}
            </Typography>
          </Box>

          {viewType === 'performance' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 12, 
                height: 12, 
                backgroundColor: getHeatMapColor(-10, true),
                borderRadius: 0.5,
              }} />
              <Typography variant="caption" color="text.secondary">
                Loss
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default PortfolioHeatMap;