import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  ShowChart,
  GridView,
  Refresh,
  Settings,
} from '@mui/icons-material';
import DashboardWidget from './DashboardWidget';
import TradingChart from '../charts/TradingChart';
import PortfolioHeatMap from '../charts/PortfolioHeatMap';

interface EnhancedChartWidgetProps {
  id: string;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
}

type ViewMode = 'chart' | 'heatmap';

const EnhancedChartWidget: React.FC<EnhancedChartWidgetProps> = ({
  id,
  onRemove,
  onSettings,
}) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate sample chart data
  useEffect(() => {
    generateSampleData();
  }, [selectedSymbol]);

  const generateSampleData = () => {
    setIsLoading(true);
    
    // Simulate API call to generate realistic candlestick data
    setTimeout(() => {
      const data = [];
      const basePrice = selectedSymbol === 'BTC' ? 65000 : 
                       selectedSymbol === 'ETH' ? 3400 :
                       selectedSymbol === 'ADA' ? 0.8 : 12;
      
      let currentPrice = basePrice;
      const now = new Date();
      
      for (let i = 100; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // Hourly data
        
        // Generate realistic price movement
        const volatility = 0.02; // 2% volatility
        const priceChange = (Math.random() - 0.5) * volatility * currentPrice;
        const open = currentPrice;
        const close = open + priceChange;
        const high = Math.max(open, close) + Math.random() * 0.01 * currentPrice;
        const low = Math.min(open, close) - Math.random() * 0.01 * currentPrice;
        const volume = Math.random() * 1000000 + 500000;
        
        data.push({
          timestamp: timestamp.toISOString(),
          open,
          high,
          low,
          close,
          volume,
        });
        
        currentPrice = close;
      }
      
      setChartData(data);
      setIsLoading(false);
    }, 1000);
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: ViewMode | null,
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleRefresh = () => {
    if (viewMode === 'chart') {
      generateSampleData();
    }
  };

  const headerControls = (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={handleViewModeChange}
        size="small"
      >
        <ToggleButton value="chart">
          <Tooltip title="Trading Chart">
            <ShowChart />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="heatmap">
          <Tooltip title="Portfolio Heat Map">
            <GridView />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      <Tooltip title="Refresh">
        <IconButton onClick={handleRefresh} size="small" disabled={isLoading}>
          <Refresh sx={{ 
            animation: isLoading ? 'spin 1s linear infinite' : 'none',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }} />
        </IconButton>
      </Tooltip>

      {onSettings && (
        <Tooltip title="Settings">
          <IconButton onClick={() => onSettings(id)} size="small">
            <Settings />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  return (
    <DashboardWidget
      id={id}
      title={viewMode === 'chart' ? `${selectedSymbol} Chart` : 'Portfolio Heat Map'}
      onRemove={onRemove}
      onSettings={onSettings}
    >
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
      }}>
        {/* View Mode Controls */}
        <Box sx={{ 
          p: 1, 
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Typography variant="caption" color="text.secondary">
            {viewMode === 'chart' ? 'Real-time Trading Data' : 'Portfolio Overview'}
          </Typography>
          {headerControls}
        </Box>

        {/* Content Area */}
        <Box sx={{ 
          flex: 1, 
          minHeight: 0,
          p: 1,
        }}>
          {viewMode === 'chart' ? (
            <TradingChart
              symbol={selectedSymbol}
              data={chartData}
              height={350}
              realTime={true}
              showVolume={true}
              showIndicators={true}
            />
          ) : (
            <PortfolioHeatMap
              height={350}
              autoRefresh={true}
              refreshInterval={30000}
            />
          )}
        </Box>

        {/* Loading Overlay */}
        {isLoading && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1,
          }}>
            <Typography variant="body2" color="white">
              Loading {viewMode === 'chart' ? 'chart' : 'heat map'} data...
            </Typography>
          </Box>
        )}
      </Box>
    </DashboardWidget>
  );
};

export default EnhancedChartWidget;