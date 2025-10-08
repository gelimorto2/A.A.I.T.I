import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Tab,
  Tabs,
  Switch,
  FormControlLabel,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  History as HistoryIcon,
  Compare as CompareIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  TrendingUp,
  TrendingDown,
  ShowChart,
  Assessment,
  Science,
  Timeline
} from '@mui/icons-material';
// Note: Using standard HTML date inputs instead of MUI DatePicker for compatibility
import { useTheme } from '@mui/material/styles';
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
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

import backtestingService, { 
  BacktestConfig, 
  BacktestResult, 
  BacktestHistoryItem,
  BacktestTrade,
  BacktestPerformance
} from '../../services/backtestingService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  TimeScale
);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const BacktestingDashboard: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Configuration state
  const [configDialog, setConfigDialog] = useState(false);
  const [config, setConfig] = useState<BacktestConfig>({
    modelIds: [],
    symbols: ['BTCUSDT'],
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    endDate: new Date().toISOString().split('T')[0],
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.0005,
    positionSizing: 'percentage',
    riskPerTrade: 0.02,
    stopLoss: 0.05,
    takeProfit: 0.10,
    maxPositions: 5,
    walkForwardOptimization: false,
    walkForwardPeriods: 12,
    monteCarloSimulations: 1000,
    benchmarkSymbol: 'BTCUSDT',
    maxDailyLoss: 0.05,
    maxDrawdown: 0.20,
    positionConcentration: 0.10,
    retrain_frequency: 'monthly',
    prediction_confidence_threshold: 0.6,
    feature_importance_analysis: true,
    drift_detection: true
  });

  // Data state
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [backtestHistory, setBacktestHistory] = useState<BacktestHistoryItem[]>([]);
  const [currentResults, setCurrentResults] = useState<BacktestResult | null>(null);
  const [selectedBacktests, setSelectedBacktests] = useState<string[]>([]);
  const [comparisonResults, setComparisonResults] = useState<any>(null);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalBacktests, setTotalBacktests] = useState(0);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [models, symbols, history] = await Promise.all([
        backtestingService.getAvailableModels(),
        backtestingService.getAvailableSymbols(),
        backtestingService.getBacktestHistory(1, rowsPerPage)
      ]);

      setAvailableModels(models);
      setAvailableSymbols(symbols);
      setBacktestHistory(history.backtests);
      setTotalBacktests(history.pagination.total);
    } catch (err) {
      setError('Failed to load initial data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleRunBacktest = async () => {
    if (config.modelIds.length === 0) {
      setError('Please select at least one model');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await backtestingService.runBacktest(config);
      setCurrentResults(result.results);
      setConfigDialog(false);
      setActiveTab(1); // Switch to results tab
      
      // Refresh history
      await loadBacktestHistory();
    } catch (err) {
      setError('Failed to run backtest');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBacktestHistory = async () => {
    try {
      const history = await backtestingService.getBacktestHistory(page + 1, rowsPerPage);
      setBacktestHistory(history.backtests);
      setTotalBacktests(history.pagination.total);
    } catch (err) {
      setError('Failed to load backtest history');
    }
  };

  const handleCompareBacktests = async () => {
    if (selectedBacktests.length < 2) {
      setError('Please select at least 2 backtests to compare');
      return;
    }

    try {
      setLoading(true);
      const comparison = await backtestingService.compareBacktests(selectedBacktests);
      setComparisonResults(comparison);
      setActiveTab(3); // Switch to comparison tab
    } catch (err) {
      setError('Failed to compare backtests');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBacktest = async (backtestId: string) => {
    if (!window.confirm('Are you sure you want to delete this backtest?')) {
      return;
    }

    try {
      await backtestingService.deleteBacktest(backtestId);
      await loadBacktestHistory();
    } catch (err) {
      setError('Failed to delete backtest');
    }
  };

  const renderConfigurationPanel = () => (
    <Dialog 
      open={configDialog} 
      onClose={() => setConfigDialog(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          Configure Backtest Parameters
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Model Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>ML Models</InputLabel>
              <Select
                multiple
                value={config.modelIds}
                onChange={(e) => setConfig({...config, modelIds: e.target.value as string[]})}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const model = availableModels.find(m => m.id === value);
                      return <Chip key={value} label={model?.name || value} size="small" />;
                    })}
                  </Box>
                )}
              >
                {availableModels.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name} ({model.model_type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Symbol Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Trading Symbols</InputLabel>
              <Select
                multiple
                value={config.symbols}
                onChange={(e) => setConfig({...config, symbols: e.target.value as string[]})}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availableSymbols.map((symbol) => (
                  <MenuItem key={symbol} value={symbol}>
                    {symbol}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date Range */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig({...config, startDate: e.target.value})}
              InputLabelProps={{
                shrink: true
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={config.endDate}
              onChange={(e) => setConfig({...config, endDate: e.target.value})}
              InputLabelProps={{
                shrink: true
              }}
            />
          </Grid>

          {/* Trading Parameters */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Initial Capital"
              type="number"
              value={config.initialCapital}
              onChange={(e) => setConfig({...config, initialCapital: Number(e.target.value)})}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Commission (%)"
              type="number"
              inputProps={{ step: 0.001, min: 0, max: 1 }}
              value={config.commission}
              onChange={(e) => setConfig({...config, commission: Number(e.target.value)})}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Slippage (%)"
              type="number"
              inputProps={{ step: 0.001, min: 0, max: 1 }}
              value={config.slippage}
              onChange={(e) => setConfig({...config, slippage: Number(e.target.value)})}
            />
          </Grid>

          {/* Risk Management */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Risk Per Trade (%)"
              type="number"
              inputProps={{ step: 0.01, min: 0, max: 0.5 }}
              value={config.riskPerTrade}
              onChange={(e) => setConfig({...config, riskPerTrade: Number(e.target.value)})}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Stop Loss (%)"
              type="number"
              inputProps={{ step: 0.01, min: 0, max: 1 }}
              value={config.stopLoss}
              onChange={(e) => setConfig({...config, stopLoss: Number(e.target.value)})}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Take Profit (%)"
              type="number"
              inputProps={{ step: 0.01, min: 0, max: 2 }}
              value={config.takeProfit}
              onChange={(e) => setConfig({...config, takeProfit: Number(e.target.value)})}
            />
          </Grid>

          {/* Advanced Options */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>Advanced Options</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.walkForwardOptimization}
                  onChange={(e) => setConfig({...config, walkForwardOptimization: e.target.checked})}
                />
              }
              label="Walk-Forward Optimization"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.feature_importance_analysis}
                  onChange={(e) => setConfig({...config, feature_importance_analysis: e.target.checked})}
                />
              }
              label="Feature Importance Analysis"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.drift_detection}
                  onChange={(e) => setConfig({...config, drift_detection: e.target.checked})}
                />
              }
              label="Model Drift Detection"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Monte Carlo Simulations"
              type="number"
              value={config.monteCarloSimulations}
              onChange={(e) => setConfig({...config, monteCarloSimulations: Number(e.target.value)})}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfigDialog(false)}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleRunBacktest}
          disabled={loading || config.modelIds.length === 0}
          startIcon={<RunIcon />}
        >
          Run Backtest
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderBacktestHistory = () => (
    <Card>
      <CardHeader
        title="Backtest History"
        action={
          <Box>
            <Tooltip title="Compare Selected">
              <IconButton 
                onClick={handleCompareBacktests}
                disabled={selectedBacktests.length < 2}
              >
                <CompareIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={loadBacktestHistory}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      <CardContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  {/* Select All Checkbox */}
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Models</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Return</TableCell>
                <TableCell>Sharpe</TableCell>
                <TableCell>Max DD</TableCell>
                <TableCell>Trades</TableCell>
                <TableCell>Win Rate</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {backtestHistory.map((backtest) => (
                <TableRow 
                  key={backtest.id}
                  selected={selectedBacktests.includes(backtest.id)}
                >
                  <TableCell padding="checkbox">
                    {/* Checkbox */}
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {backtest.symbols.join(', ')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(backtest.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={backtest.model_names} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(backtest.start_date).toLocaleDateString()} - {new Date(backtest.end_date).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      color={backtest.total_return > 0 ? 'success.main' : 'error.main'}
                    >
                      {backtestingService.formatPercentage(backtest.total_return)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {backtest.sharpe_ratio?.toFixed(2) || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="error.main">
                      {backtestingService.formatPercentage(backtest.max_drawdown)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {backtest.total_trades}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {backtestingService.formatPercentage(backtest.win_rate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small"
                      onClick={() => handleDeleteBacktest(backtest.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalBacktests}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Advanced Backtesting Framework
        </Typography>
        <Button
          variant="contained"
          startIcon={<RunIcon />}
          onClick={() => setConfigDialog(true)}
          disabled={loading}
        >
          New Backtest
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Main Content */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Dashboard" icon={<Assessment />} />
          <Tab label="Results" icon={<ShowChart />} />
          <Tab label="History" icon={<HistoryIcon />} />
          <Tab label="Comparison" icon={<CompareIcon />} />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {/* Dashboard Overview */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Available Models
                  </Typography>
                  <Typography variant="h3" color="primary">
                    {availableModels.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Trained ML models ready for backtesting
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Total Backtests
                  </Typography>
                  <Typography variant="h3" color="secondary">
                    {totalBacktests}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Historical backtest runs
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Trading Symbols
                  </Typography>
                  <Typography variant="h3" color="info.main">
                    {availableSymbols.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available for backtesting
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {/* Current Results */}
          {currentResults ? (
            <Typography variant="h6">
              Backtest Results - Implementation needed for detailed results view
            </Typography>
          ) : (
            <Typography variant="body1" color="text.secondary">
              Run a backtest to see detailed results here
            </Typography>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {/* History */}
          {renderBacktestHistory()}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {/* Comparison */}
          {comparisonResults ? (
            <Typography variant="h6">
              Backtest Comparison - Implementation needed for comparison view
            </Typography>
          ) : (
            <Typography variant="body1" color="text.secondary">
              Select multiple backtests from history to compare them
            </Typography>
          )}
        </TabPanel>
      </Paper>

      {/* Configuration Dialog */}
      {renderConfigurationPanel()}
    </Box>
  );
};

export default BacktestingDashboard;