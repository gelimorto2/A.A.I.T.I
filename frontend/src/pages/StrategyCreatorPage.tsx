import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fab,
  Drawer,
  AppBar,
  Toolbar,
  useTheme,
  alpha
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  PlayArrow as PlayIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon,
  Assessment as AssessmentIcon,
  Psychology as PsychologyIcon,
  Speed as SpeedIcon,
  Tune as TuneIcon,
  Info as InfoIcon,
  Help as HelpIcon,
  Code as CodeIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  FileCopy as CopyIcon,
  Download as DownloadIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { DndProvider, useDrag, useDrop, DropTargetMonitor } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

interface StrategyComponent {
  id: string;
  type: 'indicator' | 'condition' | 'action' | 'risk';
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  parameters: { [key: string]: any };
  inputs: string[];
  outputs: string[];
}

interface Connection {
  from: string;
  to: string;
  output: string;
  input: string;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  components: StrategyComponent[];
  connections: Connection[];
  parameters: { [key: string]: any };
  backtest?: any;
}

const AVAILABLE_COMPONENTS: StrategyComponent[] = [
  // Indicators
  {
    id: 'sma',
    type: 'indicator',
    name: 'Simple Moving Average',
    description: 'Calculate simple moving average over specified period',
    icon: <TimelineIcon />,
    color: '#2196F3',
    parameters: { period: 20 },
    inputs: ['price'],
    outputs: ['sma_value']
  },
  {
    id: 'ema',
    type: 'indicator',
    name: 'Exponential Moving Average',
    description: 'Calculate exponential moving average with more weight on recent prices',
    icon: <TrendingUpIcon />,
    color: '#4CAF50',
    parameters: { period: 12 },
    inputs: ['price'],
    outputs: ['ema_value']
  },
  {
    id: 'rsi',
    type: 'indicator',
    name: 'RSI',
    description: 'Relative Strength Index momentum oscillator',
    icon: <SpeedIcon />,
    color: '#FF9800',
    parameters: { period: 14, oversold: 30, overbought: 70 },
    inputs: ['price'],
    outputs: ['rsi_value', 'oversold_signal', 'overbought_signal']
  },
  {
    id: 'bollinger',
    type: 'indicator',
    name: 'Bollinger Bands',
    description: 'Volatility bands around moving average',
    icon: <ShowChartIcon />,
    color: '#9C27B0',
    parameters: { period: 20, stdDev: 2 },
    inputs: ['price'],
    outputs: ['upper_band', 'middle_band', 'lower_band']
  },
  {
    id: 'macd',
    type: 'indicator',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence',
    icon: <AssessmentIcon />,
    color: '#607D8B',
    parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    inputs: ['price'],
    outputs: ['macd_line', 'signal_line', 'histogram']
  },

  // Conditions
  {
    id: 'crossover',
    type: 'condition',
    name: 'Crossover',
    description: 'Detect when one line crosses above another',
    icon: <TuneIcon />,
    color: '#E91E63',
    parameters: { threshold: 0 },
    inputs: ['line1', 'line2'],
    outputs: ['crossover_signal']
  },
  {
    id: 'threshold',
    type: 'condition',
    name: 'Threshold',
    description: 'Check if value is above/below threshold',
    icon: <SpeedIcon />,
    color: '#795548',
    parameters: { threshold: 50, operator: 'above' },
    inputs: ['value'],
    outputs: ['threshold_signal']
  },
  {
    id: 'and_gate',
    type: 'condition',
    name: 'AND Gate',
    description: 'All inputs must be true',
    icon: <PsychologyIcon />,
    color: '#3F51B5',
    parameters: {},
    inputs: ['signal1', 'signal2'],
    outputs: ['combined_signal']
  },
  {
    id: 'or_gate',
    type: 'condition',
    name: 'OR Gate',
    description: 'At least one input must be true',
    icon: <PsychologyIcon />,
    color: '#3F51B5',
    parameters: {},
    inputs: ['signal1', 'signal2'],
    outputs: ['combined_signal']
  },

  // Actions
  {
    id: 'buy_order',
    type: 'action',
    name: 'Buy Order',
    description: 'Execute a buy order',
    icon: <TrendingUpIcon />,
    color: '#4CAF50',
    parameters: { orderType: 'market', quantity: 100 },
    inputs: ['signal'],
    outputs: ['order_result']
  },
  {
    id: 'sell_order',
    type: 'action',
    name: 'Sell Order',
    description: 'Execute a sell order',
    icon: <TrendingUpIcon />,
    color: '#F44336',
    parameters: { orderType: 'market', quantity: 100 },
    inputs: ['signal'],
    outputs: ['order_result']
  },

  // Risk Management
  {
    id: 'stop_loss',
    type: 'risk',
    name: 'Stop Loss',
    description: 'Automatic stop loss protection',
    icon: <SettingsIcon />,
    color: '#FF5722',
    parameters: { percentage: 5 },
    inputs: ['entry_price'],
    outputs: ['stop_price']
  },
  {
    id: 'take_profit',
    type: 'risk',
    name: 'Take Profit',
    description: 'Automatic profit taking',
    icon: <SettingsIcon />,
    color: '#8BC34A',
    parameters: { percentage: 10 },
    inputs: ['entry_price'],
    outputs: ['target_price']
  }
];

const StrategyCreatorPage: React.FC = () => {
  const theme = useTheme();
  const [strategy, setStrategy] = useState<Strategy>({
    id: '',
    name: 'New Strategy',
    description: 'Drag and drop components to build your strategy',
    components: [],
    connections: [],
    parameters: {
      symbol: 'BTCUSDT',
      timeframe: '1h',
      initialCapital: 10000,
      commission: 0.001
    }
  });

  const [selectedComponent, setSelectedComponent] = useState<StrategyComponent | null>(null);
  const [isParameterDialogOpen, setIsParameterDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Drag and Drop handlers
  const handleDrop = useCallback((item: StrategyComponent, monitor: DropTargetMonitor) => {
    if (!monitor.isOver()) return;

    const newComponent: StrategyComponent = {
      ...item,
      id: `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      parameters: { ...item.parameters }
    };

    setStrategy(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));
  }, []);

  const [, drop] = useDrop(() => ({
    accept: 'component',
    drop: handleDrop,
  }), [handleDrop]);

  // Component management
  const removeComponent = (componentId: string) => {
    setStrategy(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== componentId),
      connections: prev.connections.filter(
        conn => conn.from !== componentId && conn.to !== componentId
      )
    }));
  };

  const updateComponentParameters = (componentId: string, parameters: any) => {
    setStrategy(prev => ({
      ...prev,
      components: prev.components.map(c => 
        c.id === componentId ? { ...c, parameters: { ...c.parameters, ...parameters } } : c
      )
    }));
  };

  // Strategy operations
  const saveStrategy = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement API call to save strategy
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Strategy saved:', strategy);
    } catch (error) {
      console.error('Error saving strategy:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const testStrategy = async () => {
    setIsTesting(true);
    try {
      // TODO: Implement backtesting API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock test results
      const mockResults = {
        totalReturn: 15.3,
        sharpeRatio: 1.8,
        maxDrawdown: -8.2,
        winRate: 62.5,
        totalTrades: 145,
        profitFactor: 1.4,
        equityCurve: Array.from({ length: 100 }, (_, i) => ({
          x: i,
          y: 10000 * (1 + (Math.sin(i / 10) * 0.1) + (i * 0.001))
        }))
      };
      
      setTestResults(mockResults);
    } catch (error) {
      console.error('Error testing strategy:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const exportStrategy = () => {
    const strategyJson = JSON.stringify(strategy, null, 2);
    const blob = new Blob([strategyJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${strategy.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Sidebar */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={sidebarOpen}
          sx={{
            width: 320,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 320,
              boxSizing: 'border-box',
              bgcolor: 'background.paper',
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Strategy Components
            </Typography>
            
            {Object.entries(
              AVAILABLE_COMPONENTS.reduce((acc, component) => {
                if (!acc[component.type]) acc[component.type] = [];
                acc[component.type].push(component);
                return acc;
              }, {} as { [key: string]: StrategyComponent[] })
            ).map(([type, components]) => (
              <Accordion key={type} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                    {type}s ({components.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Grid container spacing={1}>
                    {components.map((component) => (
                      <Grid item xs={12} key={component.id}>
                        <DraggableComponent component={component} />
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Drawer>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Toolbar */}
          <AppBar position="static" color="default" elevation={1}>
            <Toolbar>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {strategy.name}
              </Typography>
              
              <Button
                startIcon={<SaveIcon />}
                onClick={saveStrategy}
                disabled={isSaving}
                sx={{ mr: 1 }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              
              <Button
                startIcon={<PlayIcon />}
                onClick={testStrategy}
                disabled={isTesting}
                variant="contained"
                sx={{ mr: 1 }}
              >
                {isTesting ? 'Testing...' : 'Test Strategy'}
              </Button>
              
              <Button
                startIcon={<DownloadIcon />}
                onClick={exportStrategy}
                sx={{ mr: 1 }}
              >
                Export
              </Button>
              
              <Button
                startIcon={<VisibilityIcon />}
                onClick={() => setPreviewOpen(true)}
              >
                Preview
              </Button>
            </Toolbar>
          </AppBar>

          {/* Canvas */}
          <Box
            ref={drop}
            sx={{
              flexGrow: 1,
              position: 'relative',
              overflow: 'auto',
              bgcolor: alpha(theme.palette.primary.main, 0.02),
              backgroundImage: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          >
            <div ref={canvasRef} style={{ minHeight: '100%', position: 'relative', padding: '20px' }}>
              {strategy.components.length === 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary'
                  }}
                >
                  <DragIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h5" gutterBottom>
                    Start Building Your Strategy
                  </Typography>
                  <Typography variant="body1" align="center" sx={{ maxWidth: 400 }}>
                    Drag components from the sidebar to create your custom trading strategy.
                    Connect indicators, conditions, and actions to build sophisticated algorithms.
                  </Typography>
                </Box>
              )}
              
              {strategy.components.map((component, index) => (
                <CanvasComponent
                  key={component.id}
                  component={component}
                  position={{ x: 50 + (index % 3) * 300, y: 50 + Math.floor(index / 3) * 200 }}
                  onRemove={() => removeComponent(component.id)}
                  onEdit={() => {
                    setSelectedComponent(component);
                    setIsParameterDialogOpen(true);
                  }}
                />
              ))}
            </div>
          </Box>
        </Box>

        {/* Parameter Dialog */}
        <Dialog
          open={isParameterDialogOpen}
          onClose={() => setIsParameterDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Configure {selectedComponent?.name}
          </DialogTitle>
          <DialogContent>
            {selectedComponent && (
              <ParameterEditor
                component={selectedComponent}
                onParametersChange={(params) => updateComponentParameters(selectedComponent.id, params)}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsParameterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsParameterDialogOpen(false)} variant="contained">
              Apply
            </Button>
          </DialogActions>
        </Dialog>

        {/* Test Results Dialog */}
        <Dialog
          open={!!testResults}
          onClose={() => setTestResults(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Backtest Results</DialogTitle>
          <DialogContent>
            {testResults && <BacktestResults results={testResults} />}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTestResults(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Strategy Preview Dialog */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Strategy Preview</DialogTitle>
          <DialogContent>
            <StrategyPreview strategy={strategy} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Loading indicator */}
        {isTesting && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 9999
            }}
          >
            <LinearProgress />
          </Box>
        )}
      </Box>
    </DndProvider>
  );
};

// Draggable Component in Sidebar
const DraggableComponent: React.FC<{ component: StrategyComponent }> = ({ component }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'component',
    item: component,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <Card
      ref={drag}
      sx={{
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        '&:hover': {
          elevation: 4,
        },
      }}
      elevation={2}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: component.color }}>
            {component.icon}
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {component.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {component.description}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Canvas Component
const CanvasComponent: React.FC<{
  component: StrategyComponent;
  position: { x: number; y: number };
  onRemove: () => void;
  onEdit: () => void;
}> = ({ component, position, onRemove, onEdit }) => {
  return (
    <Card
      sx={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: 250,
        cursor: 'move',
        border: `2px solid ${component.color}`,
        '&:hover': {
          elevation: 8,
        },
      }}
      elevation={4}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ color: component.color }}>
            {component.icon}
          </Box>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            {component.name}
          </Typography>
          <Chip
            label={component.type}
            size="small"
            sx={{ bgcolor: component.color, color: 'white' }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {component.description}
        </Typography>
        
        {/* Input/Output indicators */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Inputs: {component.inputs.join(', ')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Outputs: {component.outputs.join(', ')}
            </Typography>
          </Box>
        </Box>
      </CardContent>
      
      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
        <Button size="small" startIcon={<SettingsIcon />} onClick={onEdit}>
          Configure
        </Button>
        <IconButton size="small" color="error" onClick={onRemove}>
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};

// Parameter Editor
const ParameterEditor: React.FC<{
  component: StrategyComponent;
  onParametersChange: (params: any) => void;
}> = ({ component, onParametersChange }) => {
  const [parameters, setParameters] = useState(component.parameters);

  const handleParameterChange = (key: string, value: any) => {
    const newParams = { ...parameters, [key]: value };
    setParameters(newParams);
    onParametersChange(newParams);
  };

  return (
    <Box sx={{ mt: 2 }}>
      {Object.entries(parameters).map(([key, value]) => (
        <Box key={key} sx={{ mb: 2 }}>
          {typeof value === 'number' ? (
            <TextField
              fullWidth
              label={key}
              type="number"
              value={value}
              onChange={(e) => handleParameterChange(key, parseFloat(e.target.value))}
            />
          ) : typeof value === 'boolean' ? (
            <FormControlLabel
              control={
                <Switch
                  checked={value}
                  onChange={(e) => handleParameterChange(key, e.target.checked)}
                />
              }
              label={key}
            />
          ) : (
            <TextField
              fullWidth
              label={key}
              value={value}
              onChange={(e) => handleParameterChange(key, e.target.value)}
            />
          )}
        </Box>
      ))}
    </Box>
  );
};

// Backtest Results Component
const BacktestResults: React.FC<{ results: any }> = ({ results }) => {
  const chartData = {
    labels: results.equityCurve.map((_: any, i: number) => i),
    datasets: [
      {
        label: 'Equity Curve',
        data: results.equityCurve.map((point: any) => point.y),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
      },
    ],
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Total Return"
                    secondary={`${results.totalReturn}%`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Sharpe Ratio"
                    secondary={results.sharpeRatio}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Max Drawdown"
                    secondary={`${results.maxDrawdown}%`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Win Rate"
                    secondary={`${results.winRate}%`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Total Trades"
                    secondary={results.totalTrades}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Profit Factor"
                    secondary={results.profitFactor}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Equity Curve
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: false,
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Strategy Preview Component
const StrategyPreview: React.FC<{ strategy: Strategy }> = ({ strategy }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Strategy Overview
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Basic Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Name" secondary={strategy.name} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Description" secondary={strategy.description} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Components" secondary={strategy.components.length} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Connections" secondary={strategy.connections.length} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Components Used
              </Typography>
              <List dense>
                {strategy.components.map((component) => (
                  <ListItem key={component.id}>
                    <ListItemIcon sx={{ color: component.color }}>
                      {component.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={component.name}
                      secondary={component.type}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StrategyCreatorPage;