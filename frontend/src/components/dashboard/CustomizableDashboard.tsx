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

// CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

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
];

const defaultLayouts = {
  lg: [
    { i: 'bots-status', x: 0, y: 0, w: 3, h: 3 },
    { i: 'pnl', x: 3, y: 0, w: 3, h: 3 },
    { i: 'win-rate', x: 6, y: 0, w: 3, h: 3 },
    { i: 'system-health', x: 9, y: 0, w: 3, h: 3 },
  ],
  md: [
    { i: 'bots-status', x: 0, y: 0, w: 6, h: 3 },
    { i: 'pnl', x: 6, y: 0, w: 6, h: 3 },
    { i: 'win-rate', x: 0, y: 3, w: 6, h: 3 },
    { i: 'system-health', x: 6, y: 3, w: 6, h: 3 },
  ],
  sm: [
    { i: 'bots-status', x: 0, y: 0, w: 12, h: 3 },
    { i: 'pnl', x: 0, y: 3, w: 12, h: 3 },
    { i: 'win-rate', x: 0, y: 6, w: 12, h: 3 },
    { i: 'system-health', x: 0, y: 9, w: 12, h: 3 },
  ],
  xs: [
    { i: 'bots-status', x: 0, y: 0, w: 12, h: 3 },
    { i: 'pnl', x: 0, y: 3, w: 12, h: 3 },
    { i: 'win-rate', x: 0, y: 6, w: 12, h: 3 },
    { i: 'system-health', x: 0, y: 9, w: 12, h: 3 },
  ],
};

const CustomizableDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
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

  useEffect(() => {
    dispatch(fetchBots());
    dispatch(fetchPortfolio());
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
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold', 
              color: 'primary.main',
              fontFamily: 'monospace',
            }}
          >
            COMMAND CENTER
          </Typography>
          <Typography 
            variant="subtitle1" 
            color="text.secondary" 
            sx={{ fontFamily: 'monospace' }}
          >
            Welcome back, {user?.username} • Mission Status: ACTIVE
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            icon={<ViewModule />}
            label={isEditMode ? 'Edit Mode' : 'View Mode'}
            color={isEditMode ? 'warning' : 'primary'}
            onClick={() => setIsEditMode(!isEditMode)}
            sx={{ fontWeight: 'bold' }}
          />
          <Chip
            icon={<Edit />}
            label="Customize"
            onClick={() => setShowCustomizeDialog(true)}
            sx={{ fontWeight: 'bold' }}
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
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12 }}
        rowHeight={80}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        compactType="vertical"
      >
        {widgets.filter((w: DashboardWidget) => w.enabled).map((widget: DashboardWidget) => (
          <Box key={widget.id}>
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
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Customize Dashboard
          </Typography>
        </DialogTitle>
        <DialogContent>
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
              sx={{ display: 'block', mb: 1 }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={resetLayout} color="warning">
            Reset to Default
          </Button>
          <Button onClick={() => setShowCustomizeDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Add Button (for future widget additions) */}
      {isEditMode && (
        <Fab
          color="primary"
          aria-label="add widget"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setShowCustomizeDialog(true)}
        >
          <Add />
        </Fab>
      )}
    </Box>
  );
};

export default CustomizableDashboard;