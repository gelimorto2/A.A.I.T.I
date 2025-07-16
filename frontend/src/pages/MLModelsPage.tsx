import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  PlayArrow,
  Stop,
  Delete,
  Edit,
  TrendingUp,
  Assessment,
  Science,
  Memory,
} from '@mui/icons-material';
import { MLModel, MLModelConfig, BacktestConfig } from '../types';
import { mlAPI } from '../services/api';

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
      id={`ml-tabpanel-${index}`}
      aria-labelledby={`ml-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MLModelsPage: React.FC = () => {
  const [models, setModels] = useState<MLModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [backtestDialogOpen, setBacktestDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Form states
  const [newModel, setNewModel] = useState<MLModelConfig>({
    name: '',
    algorithmType: 'linear_regression',
    targetTimeframe: '1d',
    symbols: ['AAPL', 'GOOGL', 'MSFT'],
    parameters: {},
    trainingPeriodDays: 365,
  });
  
  const [backtestConfig, setBacktestConfig] = useState<BacktestConfig>({
    startDate: '',
    endDate: '',
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.0005,
    positionSizing: 'percentage',
    riskPerTrade: 0.02,
    stopLoss: 0.05,
    takeProfit: 0.10,
    maxPositions: 5,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await mlAPI.getModels();
      setModels(response.models);
      setError(null);
    } catch (err: any) {
      setError('Failed to load ML models: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModel = async () => {
    try {
      setActionLoading('create');
      const response = await mlAPI.createModel(newModel);
      setModels([response.model, ...models]);
      setCreateDialogOpen(false);
      setSuccess('ML model created and trained successfully');
      setNewModel({
        name: '',
        algorithmType: 'linear_regression',
        targetTimeframe: '1d',
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
        parameters: {},
        trainingPeriodDays: 365,
      });
    } catch (err: any) {
      setError('Failed to create ML model: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteModel = async () => {
    if (!selectedModel) return;
    
    try {
      setActionLoading('delete');
      await mlAPI.deleteModel(selectedModel.id);
      setModels(models.filter(m => m.id !== selectedModel.id));
      setDeleteDialogOpen(false);
      setSelectedModel(null);
      setSuccess('ML model deleted successfully');
    } catch (err: any) {
      setError('Failed to delete ML model: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunBacktest = async () => {
    if (!selectedModel) return;
    
    try {
      setActionLoading('backtest');
      const response = await mlAPI.runBacktest(selectedModel.id, backtestConfig);
      setBacktestDialogOpen(false);
      setSuccess(`Backtest completed with ${(response.backtest.totalReturn * 100).toFixed(2)}% return`);
      // Refresh models to update backtest count
      loadModels();
    } catch (err: any) {
      setError('Failed to run backtest: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const getAlgorithmIcon = (algorithm: string) => {
    switch (algorithm) {
      case 'linear_regression':
      case 'polynomial_regression':
        return <TrendingUp />;
      case 'random_forest':
        return <Memory />;
      case 'naive_bayes':
        return <Assessment />;
      default:
        return <Science />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trained':
        return 'success';
      case 'training':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" color="primary">
          🧠 ML Models
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          size="large"
        >
          Create Model
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Models Overview" />
          <Tab label="Performance Comparison" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {models.map((model) => (
            <Grid item xs={12} md={6} lg={4} key={model.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    {getAlgorithmIcon(model.algorithm_type)}
                    <Typography variant="h6" ml={1} component="div">
                      {model.name}
                    </Typography>
                  </Box>
                  
                  <Box mb={2}>
                    <Chip
                      label={model.training_status}
                      color={getStatusColor(model.training_status)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={model.algorithm_type.replace('_', ' ')}
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Timeframe: {model.target_timeframe}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Symbols: {model.symbols.join(', ')}
                  </Typography>

                  {model.accuracy && (
                    <Box mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Accuracy: {(model.accuracy * 100).toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={model.accuracy * 100}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  )}

                  <Grid container spacing={1} mt={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Predictions: {model.prediction_count || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Backtests: {model.backtest_count || 0}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>

                <Box p={2} pt={0}>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Tooltip title="Run Backtest">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedModel(model);
                            setBacktestDialogOpen(true);
                          }}
                          disabled={model.training_status !== 'trained'}
                        >
                          <PlayArrow />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                    <Grid item xs={4}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            // Navigate to model details page
                            window.location.href = `/ml/models/${model.id}`;
                          }}
                        >
                          <Assessment />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                    <Grid item xs={4}>
                      <Tooltip title="Delete Model">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedModel(model);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Box>
              </Card>
            </Grid>
          ))}

          {models.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Science sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" mb={1}>
                  No ML Models Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Create your first machine learning model to start making AI-powered trading predictions.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Your First Model
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Model</TableCell>
                <TableCell>Algorithm</TableCell>
                <TableCell>Accuracy</TableCell>
                <TableCell>Predictions</TableCell>
                <TableCell>Avg Return</TableCell>
                <TableCell>Win Rate</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>{model.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={model.algorithm_type.replace('_', ' ')}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : 'N/A'}
                  </TableCell>
                  <TableCell>{model.prediction_count || 0}</TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>
                    <Chip
                      label={model.training_status}
                      color={getStatusColor(model.training_status)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Create Model Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New ML Model</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Model Name"
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                placeholder="e.g., AAPL Price Predictor"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Algorithm Type</InputLabel>
                <Select
                  value={newModel.algorithmType}
                  onChange={(e) => setNewModel({ ...newModel, algorithmType: e.target.value })}
                >
                  <MenuItem value="linear_regression">Linear Regression</MenuItem>
                  <MenuItem value="polynomial_regression">Polynomial Regression</MenuItem>
                  <MenuItem value="random_forest">Random Forest</MenuItem>
                  <MenuItem value="naive_bayes">Naive Bayes</MenuItem>
                  <MenuItem value="moving_average">Moving Average</MenuItem>
                  <MenuItem value="technical_indicators">Technical Indicators</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Target Timeframe</InputLabel>
                <Select
                  value={newModel.targetTimeframe}
                  onChange={(e) => setNewModel({ ...newModel, targetTimeframe: e.target.value })}
                >
                  <MenuItem value="5m">5 Minutes</MenuItem>
                  <MenuItem value="15m">15 Minutes</MenuItem>
                  <MenuItem value="1h">1 Hour</MenuItem>
                  <MenuItem value="4h">4 Hours</MenuItem>
                  <MenuItem value="1d">1 Day</MenuItem>
                  <MenuItem value="1w">1 Week</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Symbols (comma separated)"
                value={newModel.symbols.join(', ')}
                onChange={(e) => setNewModel({ 
                  ...newModel, 
                  symbols: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                })}
                placeholder="AAPL, GOOGL, MSFT, TSLA"
                helperText="Enter stock symbols separated by commas"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Training Period (days)"
                value={newModel.trainingPeriodDays}
                onChange={(e) => setNewModel({ ...newModel, trainingPeriodDays: parseInt(e.target.value) })}
                inputProps={{ min: 30, max: 1825 }}
                helperText="30-1825 days of historical data"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateModel}
            variant="contained"
            disabled={!newModel.name || !newModel.symbols.length || actionLoading === 'create'}
            startIcon={actionLoading === 'create' ? <CircularProgress size={20} /> : <Add />}
          >
            {actionLoading === 'create' ? 'Creating...' : 'Create & Train'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backtest Dialog */}
      <Dialog open={backtestDialogOpen} onClose={() => setBacktestDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Run Backtest - {selectedModel?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={backtestConfig.startDate}
                onChange={(e) => setBacktestConfig({ ...backtestConfig, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={backtestConfig.endDate}
                onChange={(e) => setBacktestConfig({ ...backtestConfig, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Initial Capital"
                value={backtestConfig.initialCapital}
                onChange={(e) => setBacktestConfig({ ...backtestConfig, initialCapital: parseFloat(e.target.value) })}
                inputProps={{ min: 1000 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Risk Per Trade (%)"
                value={(backtestConfig.riskPerTrade || 0) * 100}
                onChange={(e) => setBacktestConfig({ ...backtestConfig, riskPerTrade: parseFloat(e.target.value) / 100 })}
                inputProps={{ min: 0.1, max: 10, step: 0.1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Stop Loss (%)"
                value={(backtestConfig.stopLoss || 0) * 100}
                onChange={(e) => setBacktestConfig({ ...backtestConfig, stopLoss: parseFloat(e.target.value) / 100 })}
                inputProps={{ min: 1, max: 20, step: 0.5 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Take Profit (%)"
                value={(backtestConfig.takeProfit || 0) * 100}
                onChange={(e) => setBacktestConfig({ ...backtestConfig, takeProfit: parseFloat(e.target.value) / 100 })}
                inputProps={{ min: 1, max: 50, step: 0.5 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBacktestDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRunBacktest}
            variant="contained"
            disabled={!backtestConfig.startDate || !backtestConfig.endDate || actionLoading === 'backtest'}
            startIcon={actionLoading === 'backtest' ? <CircularProgress size={20} /> : <PlayArrow />}
          >
            {actionLoading === 'backtest' ? 'Running...' : 'Run Backtest'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Model</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedModel?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteModel}
            variant="contained"
            color="error"
            disabled={actionLoading === 'delete'}
            startIcon={actionLoading === 'delete' ? <CircularProgress size={20} /> : <Delete />}
          >
            {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MLModelsPage;