import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add,
  ViewModule,
  Edit,
  Save,
} from '@mui/icons-material';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchBots } from '../../store/slices/botsSlice';
import { fetchPortfolio } from '../../store/slices/analyticsSlice';

// Import Widget Components
import BotsStatusWidget from './BotsStatusWidget';
import PnLWidget from './PnLWidget';
import WinRateWidget from './WinRateWidget';
import SystemHealthWidget from './SystemHealthWidget';
import MarketHeatMapWidget from './MarketHeatMapWidget';
import EnhancedChartWidget from './EnhancedChartWidget';

// CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive) as any;

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
}

const availableWidgets: DashboardWidget[] = [
  { id: 'bots-status', type: 'bots-status', title: 'AI Agents Status', enabled: true },
  { id: 'pnl', type: 'pnl', title: 'Profit & Loss', enabled: true },
  { id: 'win-rate', type: 'win-rate', title: 'Win Rate', enabled: true },
  { id: 'system-health', type: 'system-health', title: 'System Health', enabled: true },
  { id: 'enhanced-chart', type: 'enhanced-chart', title: 'Enhanced Trading Chart', enabled: true },
  { id: 'market-heatmap', type: 'market-heatmap', title: 'Market Heat Map', enabled: true },
];

const defaultLayouts = {
  lg: [
    { i: 'bots-status', x: 0, y: 0, w: 3, h: 3 },
    { i: 'pnl', x: 3, y: 0, w: 3, h: 3 },
    { i: 'win-rate', x: 6, y: 0, w: 3, h: 3 },
    { i: 'system-health', x: 9, y: 0, w: 3, h: 3 },
    { i: 'enhanced-chart', x: 0, y: 3, w: 8, h: 4 },
    { i: 'market-heatmap', x: 8, y: 3, w: 4, h: 4 },
  ],
  md: [
    { i: 'bots-status', x: 0, y: 0, w: 6, h: 3 },
    { i: 'pnl', x: 6, y: 0, w: 6, h: 3 },
    { i: 'win-rate', x: 0, y: 3, w: 6, h: 3 },
    { i: 'system-health', x: 6, y: 3, w: 6, h: 3 },
    { i: 'enhanced-chart', x: 0, y: 6, w: 12, h: 4 },
    { i: 'market-heatmap', x: 0, y: 10, w: 12, h: 4 },
  ],
  sm: [
    { i: 'bots-status', x: 0, y: 0, w: 12, h: 3 },
    { i: 'pnl', x: 0, y: 3, w: 12, h: 3 },
    { i: 'win-rate', x: 0, y: 6, w: 12, h: 3 },
    { i: 'system-health', x: 0, y: 9, w: 12, h: 3 },
    { i: 'enhanced-chart', x: 0, y: 12, w: 12, h: 4 },
    { i: 'market-heatmap', x: 0, y: 16, w: 12, h: 4 },
  ],
  xs: [
    { i: 'bots-status', x: 0, y: 0, w: 12, h: 4 },
    { i: 'pnl', x: 0, y: 4, w: 12, h: 4 },
    { i: 'win-rate', x: 0, y: 8, w: 12, h: 4 },
    { i: 'system-health', x: 0, y: 12, w: 12, h: 4 },
    { i: 'enhanced-chart', x: 0, y: 16, w: 12, h: 5 },
    { i: 'market-heatmap', x: 0, y: 21, w: 12, h: 5 },
  ],
  xxs: [
    { i: 'bots-status', x: 0, y: 0, w: 12, h: 5 },
    { i: 'pnl', x: 0, y: 5, w: 12, h: 5 },
    { i: 'win-rate', x: 0, y: 10, w: 12, h: 5 },
    { i: 'system-health', x: 0, y: 15, w: 12, h: 5 },
    { i: 'enhanced-chart', x: 0, y: 20, w: 12, h: 6 },
    { i: 'market-heatmap', x: 0, y: 26, w: 12, h: 6 },
  ],
};

const CustomizableDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { bots } = useSelector((state: RootState) => state.bots);
  const { portfolio } = useSelector((state: RootState) => state.analytics);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [layouts, setLayouts] = useState(() => {
    const saved = localStorage.getItem('dashboard-layouts');
    return saved ? JSON.parse(saved) : defaultLayouts;
  });
  
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    return saved ? JSON.parse(saved) : availableWidgets;
  });
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      try {
        await Promise.all([
          dispatch(fetchBots()),
          dispatch(fetchPortfolio())
        ]);
      } finally {
        // Add minimum loading time for smooth UX
        setTimeout(() => setDataLoading(false), 1000);
      }
    };
    
    loadData();
  }, [dispatch]);

  const saveLayout = useCallback((newLayouts: any) => {
    setLayouts(newLayouts);
    localStorage.setItem('dashboard-layouts', JSON.stringify(newLayouts));
  }, []);

  const saveWidgets = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('dashboard-widgets', JSON.stringify(newWidgets));
  }, []);

  const handleLayoutChange = useCallback((layout: Layout[], layouts: any) => {
    if (isEditMode) {
      saveLayout(layouts);
    }
  }, [isEditMode, saveLayout]);

  const removeWidget = useCallback((widgetId: string) => {
    const newWidgets = widgets.map((w: DashboardWidget) => 
      w.id === widgetId ? { ...w, enabled: false } : w
    );
    saveWidgets(newWidgets);
  }, [widgets, saveWidgets]);

  const toggleWidget = useCallback((widgetId: string) => {
    const newWidgets = widgets.map((w: DashboardWidget) => 
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );
    saveWidgets(newWidgets);
  }, [widgets, saveWidgets]);

  const resetLayout = useCallback(() => {
    saveLayout(defaultLayouts);
    saveWidgets(availableWidgets);
  }, [saveLayout, saveWidgets]);

  // Calculate metrics
  const runningBots = bots.filter(bot => bot.status === 'running');
  const stoppedBots = bots.filter(bot => bot.status === 'stopped');
  const errorBots = bots.filter(bot => bot.status === 'error');
  const totalPnL = portfolio?.overall?.total_pnl || 0;
  const totalTrades = portfolio?.overall?.total_trades || 0;
  const winRate = portfolio?.overall?.win_rate || 0;

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.enabled) return null;

    switch (widget.type) {
      case 'bots-status':
        return (
          <BotsStatusWidget
            id={widget.id}
            runningBots={runningBots.length}
            stoppedBots={stoppedBots.length}
            errorBots={errorBots.length}
            onRemove={isEditMode ? removeWidget : undefined}
            loading={dataLoading}
          />
        );
      case 'pnl':
        return (
          <PnLWidget
            id={widget.id}
            totalPnL={totalPnL}
            totalTrades={totalTrades}
            onRemove={isEditMode ? removeWidget : undefined}
          />
        );
      case 'win-rate':
        return (
          <WinRateWidget
            id={widget.id}
            winRate={winRate}
            onRemove={isEditMode ? removeWidget : undefined}
          />
        );
      case 'system-health':
        return (
          <SystemHealthWidget
            id={widget.id}
            onRemove={isEditMode ? removeWidget : undefined}
          />
        );
      case 'market-heatmap':
        return (
          <MarketHeatMapWidget
            id={widget.id}
            onRemove={isEditMode ? removeWidget : undefined}
          />
        );
      case 'enhanced-chart':
        return (
          <EnhancedChartWidget
            id={widget.id}
            onRemove={isEditMode ? removeWidget : undefined}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 3,
        gap: { xs: 2, sm: 0 }
      }}>
        <Box>
          <Typography 
            variant="h4"
            gutterBottom 
            sx={{ 
              fontWeight: 'bold', 
              color: 'primary.main',
              fontFamily: 'monospace',
              fontSize: { xs: '1.5rem', sm: '2rem' }
            }}
          >
            COMMAND CENTER
          </Typography>
          <Typography 
            variant="subtitle1" 
            color="text.secondary" 
            sx={{ 
              fontFamily: 'monospace',
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Welcome back, {user?.username} • Mission Status: ACTIVE
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'row', sm: 'row' },
          gap: 1,
          flexWrap: 'wrap'
        }}>
          <Chip
            icon={<ViewModule />}
            label={isEditMode ? 'Edit Mode' : 'View Mode'}
            color={isEditMode ? 'warning' : 'primary'}
            onClick={() => setIsEditMode(!isEditMode)}
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          />
          <Chip
            icon={<Edit />}
            label="Customize"
            onClick={() => setShowCustomizeDialog(true)}
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          />
        </Box>
      </Box>

      {/* Edit Mode Alert */}
      {isEditMode && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => setIsEditMode(false)}
              startIcon={<Save />}
            >
              Save Layout
            </Button>
          }
        >
          Edit Mode: Drag widgets to rearrange or click X to remove them
        </Alert>
      )}

      {/* System Alerts */}
      {errorBots.length > 0 && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, bgcolor: 'rgba(255, 51, 102, 0.1)' }}
        >
          {errorBots.length} agent(s) require immediate attention
        </Alert>
      )}

      {/* Dashboard Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 320 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        rowHeight={70}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        margin={[8, 8]}
        containerPadding={[8, 8]}
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
        autoSize={true}
      >
        {widgets.filter((w: DashboardWidget) => w.enabled).map((widget: DashboardWidget) => (
          <Box 
            key={widget.id}
            sx={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: isEditMode ? 'scale(1.02)' : 'none',
                zIndex: isEditMode ? 10 : 'auto',
              },
            }}
          >
            {renderWidget(widget)}
          </Box>
        ))}
      </ResponsiveGridLayout>

      {/* Customize Dialog */}
      <Dialog 
        open={showCustomizeDialog} 
        onClose={() => setShowCustomizeDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile} // Full screen on mobile
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 2 },
            margin: { xs: 0, sm: 2 },
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Customize Dashboard
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: { xs: 8, sm: 2 } }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Toggle widgets on/off and configure your dashboard layout
          </Typography>
          
          {availableWidgets.map((widget: DashboardWidget) => (
            <FormControlLabel
              key={widget.id}
              control={
                <Switch
                  checked={widgets.find((w: DashboardWidget) => w.id === widget.id)?.enabled || false}
                  onChange={() => toggleWidget(widget.id)}
                />
              }
              label={widget.title}
              sx={{ 
                display: 'block', 
                mb: 1,
                '& .MuiFormControlLabel-label': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
              }}
            />
          ))}
        </DialogContent>
        <DialogActions sx={{ 
          p: 2,
          position: { xs: 'fixed', sm: 'relative' },
          bottom: { xs: 0, sm: 'auto' },
          left: { xs: 0, sm: 'auto' },
          right: { xs: 0, sm: 'auto' },
          backgroundColor: 'background.paper',
          borderTop: { xs: '1px solid', sm: 'none' },
          borderColor: 'divider',
          justifyContent: { xs: 'space-around', sm: 'flex-end' }
        }}>
          <Button 
            onClick={resetLayout} 
            color="warning"
            size={isMobile ? 'large' : 'medium'}
          >
            Reset to Default
          </Button>
          <Button 
            onClick={() => setShowCustomizeDialog(false)}
            size={isMobile ? 'large' : 'medium'}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Add Button (for future widget additions) */}
      {isEditMode && (
        <Fab
          color="primary"
          aria-label="add widget"
          sx={{ 
            position: 'fixed', 
            bottom: { xs: 80, sm: 16 }, 
            right: 16,
            zIndex: 1000,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: (theme) => `0 8px 25px ${theme.palette.primary.main}40`,
            }
          }}
          onClick={() => setShowCustomizeDialog(true)}
        >
          <Add />
        </Fab>
      )}
    </Box>
  );
};

export default CustomizableDashboard;