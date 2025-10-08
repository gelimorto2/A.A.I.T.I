import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as TrainIcon,
  Prediction as PredictIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// ML Architecture colors for charts
const ARCHITECTURE_COLORS = {
  LSTM: '#FF6B6B',
  GRU: '#4ECDC4',
  CNN: '#45B7D1',
  TRANSFORMER: '#96CEB4',
  ENSEMBLE: '#FECA57'
};

const ProductionMLDashboard = () => {
  const [models, setModels] = useState([]);
  const [activeModels, setActiveModels] = useState([]);
  const [architectures, setArchitectures] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [trainDialogOpen, setTrainDialogOpen] = useState(false);
  const [predictDialogOpen, setPredictDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  
  // Form states
  const [newModel, setNewModel] = useState({
    name: '',
    architecture: 'LSTM',
    symbols: ['BTCUSDT'],
    timeframe: '1h',
    description: '',
    customConfig: {}
  });
  
  const [trainingConfig, setTrainingConfig] = useState({
    epochs: 100,
    batchSize: 32,
    validationSplit: 0.2,
    earlyStopping: true,
    patience: 15
  });
  
  const [predictionInput, setPredictionInput] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Filter states
  const [filterArchitecture, setFilterArchitecture] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // Fetch data
  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch('/api/production-ml/models', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      } else {
        throw new Error('Failed to fetch models');
      }
    } catch (error) {
      setError(`Error fetching models: ${error.message}`);
    }
  }, []);

  const fetchActiveModels = useCallback(async () => {
    try {
      const response = await fetch('/api/production-ml/active-models', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveModels(data.models || []);
      }
    } catch (error) {
      console.error('Error fetching active models:', error);
    }
  }, []);

  const fetchArchitectures = useCallback(async () => {
    try {
      const response = await fetch('/api/production-ml/architectures', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setArchitectures(data.architectures || {});
      }
    } catch (error) {
      console.error('Error fetching architectures:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchModels(),
        fetchActiveModels(),
        fetchArchitectures()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [fetchModels, fetchActiveModels, fetchArchitectures]);

  // Create new model
  const handleCreateModel = async () => {
    try {
      const response = await fetch('/api/production-ml/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newModel)
      });
      
      if (response.ok) {
        const data = await response.json();
        setCreateDialogOpen(false);
        setNewModel({
          name: '',
          architecture: 'LSTM',
          symbols: ['BTCUSDT'],
          timeframe: '1h',
          description: '',
          customConfig: {}
        });
        fetchModels();
        setError('');
        alert(`Model created successfully! Model ID: ${data.modelId}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create model');
      }
    } catch (error) {
      setError(`Error creating model: ${error.message}`);
    }
  };

  // Train model
  const handleTrainModel = async () => {
    if (!selectedModel) return;
    
    try {
      const response = await fetch(`/api/production-ml/models/${selectedModel.id}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(trainingConfig)
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrainDialogOpen(false);
        fetchModels();
        setError('');
        alert(`Training started for ${selectedModel.name}. Estimated time: ${data.estimatedTime}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start training');
      }
    } catch (error) {
      setError(`Error training model: ${error.message}`);
    }
  };

  // Make prediction
  const handlePredict = async () => {
    if (!selectedModel || !predictionInput) return;
    
    try {
      const inputData = JSON.parse(predictionInput);
      
      const response = await fetch(`/api/production-ml/models/${selectedModel.id}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ inputData, includeConfidence: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPredictionResult(data.prediction);
        setError('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to make prediction');
      }
    } catch (error) {
      setError(`Error making prediction: ${error.message}`);
    }
  };

  // Deploy model
  const handleDeployModel = async (modelId) => {
    try {
      const response = await fetch(`/api/production-ml/models/${modelId}/deploy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchModels();
        fetchActiveModels();
        alert('Model deployed successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to deploy model');
      }
    } catch (error) {
      setError(`Error deploying model: ${error.message}`);
    }
  };

  // Delete model
  const handleDeleteModel = async (modelId) => {
    if (!window.confirm('Are you sure you want to delete this model?')) return;
    
    try {
      const response = await fetch(`/api/production-ml/models/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchModels();
        fetchActiveModels();
        alert('Model deleted successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete model');
      }
    } catch (error) {
      setError(`Error deleting model: ${error.message}`);
    }
  };

  // Filter models
  const filteredModels = models.filter(model => {
    return (!filterArchitecture || model.architecture === filterArchitecture) &&
           (!filterStatus || model.status === filterStatus);
  });

  // Generate architecture statistics
  const architectureStats = models.reduce((acc, model) => {
    acc[model.architecture] = (acc[model.architecture] || 0) + 1;
    return acc;
  }, {});

  const architectureChartData = Object.entries(architectureStats).map(([arch, count]) => ({
    name: arch,
    value: count,
    color: ARCHITECTURE_COLORS[arch] || '#8884d8'
  }));

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
          <Typography variant="h6" align="center" sx={{ mt: 2 }}>
            Loading Production ML Dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          <MemoryIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Production TensorFlow ML Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Real TensorFlow.js models with LSTM, GRU, CNN, Transformer, and Ensemble architectures
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Models
                  </Typography>
                  <Typography variant="h4">
                    {models.length}
                  </Typography>
                </Box>
                <AssessmentIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Models
                  </Typography>
                  <Typography variant="h4">
                    {activeModels.length}
                  </Typography>
                </Box>
                <SpeedIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Trained Models
                  </Typography>
                  <Typography variant="h4">
                    {models.filter(m => m.training_status === 'trained').length}
                  </Typography>
                </Box>
                <TrendingUpIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Deployed Models
                  </Typography>
                  <Typography variant="h4">
                    {models.filter(m => m.status === 'deployed').length}
                  </Typography>
                </Box>
                <CloudUploadIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Card sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="Models" />
          <Tab label="Architecture Stats" />
          <Tab label="Active Models" />
          <Tab label="Create Model" />
        </Tabs>
        
        {/* Models Tab */}
        {activeTab === 0 && (
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Architecture</InputLabel>
                <Select
                  value={filterArchitecture}
                  label="Architecture"
                  onChange={(e) => setFilterArchitecture(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="LSTM">LSTM</MenuItem>
                  <MenuItem value="GRU">GRU</MenuItem>
                  <MenuItem value="CNN">CNN</MenuItem>
                  <MenuItem value="TRANSFORMER">Transformer</MenuItem>
                  <MenuItem value="ENSEMBLE">Ensemble</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="created">Created</MenuItem>
                  <MenuItem value="deployed">Deployed</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Model
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  fetchModels();
                  fetchActiveModels();
                }}
              >
                Refresh
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Architecture</TableCell>
                    <TableCell>Symbols</TableCell>
                    <TableCell>Timeframe</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Training Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredModels.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{model.name}</Typography>
                        {model.description && (
                          <Typography variant="caption" color="text.secondary">
                            {model.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={model.architecture}
                          size="small"
                          sx={{
                            backgroundColor: ARCHITECTURE_COLORS[model.architecture] || '#8884d8',
                            color: 'white'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {JSON.parse(model.symbols || '[]').join(', ')}
                      </TableCell>
                      <TableCell>{model.timeframe}</TableCell>
                      <TableCell>
                        <Chip
                          label={model.status}
                          size="small"
                          color={model.status === 'deployed' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={model.training_status}
                          size="small"
                          color={model.training_status === 'trained' ? 'success' : 
                                 model.training_status === 'training' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(model.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Train Model">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedModel(model);
                                setTrainDialogOpen(true);
                              }}
                              disabled={model.training_status === 'training'}
                            >
                              <TrainIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Make Prediction">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedModel(model);
                                setPredictDialogOpen(true);
                                setPredictionResult(null);
                              }}
                              disabled={model.training_status !== 'trained'}
                            >
                              <PredictIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Deploy Model">
                            <IconButton
                              size="small"
                              onClick={() => handleDeployModel(model.id)}
                              disabled={model.training_status !== 'trained' || model.status === 'deployed'}
                            >
                              <CloudUploadIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Delete Model">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteModel(model.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Architecture Stats Tab */}
        {activeTab === 1 && (
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Architecture Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={architectureChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {architectureChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Architecture Information
                </Typography>
                {Object.entries(architectures).map(([arch, info]) => (
                  <Accordion key={arch}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        <Chip
                          label={arch}
                          size="small"
                          sx={{
                            backgroundColor: ARCHITECTURE_COLORS[arch] || '#8884d8',
                            color: 'white',
                            mr: 1
                          }}
                        />
                        {info.name}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        {info.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Use Case:</strong> {info.useCase}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Active Models Tab */}
        {activeTab === 2 && (
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Currently Active Models
            </Typography>
            {activeModels.length === 0 ? (
              <Alert severity="info">
                No models are currently active. Deploy trained models to see them here.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {activeModels.map((model) => (
                  <Grid item xs={12} md={6} lg={4} key={model.modelId}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {model.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Architecture: {model.architecture}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Status: {model.status}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Last Prediction: {model.lastPrediction ? 
                            new Date(model.lastPrediction).toLocaleString() : 'Never'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        )}

        {/* Create Model Tab */}
        {activeTab === 3 && (
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Create New TensorFlow Model
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Model Name"
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  margin="normal"
                />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Architecture</InputLabel>
                  <Select
                    value={newModel.architecture}
                    label="Architecture"
                    onChange={(e) => setNewModel({ ...newModel, architecture: e.target.value })}
                  >
                    <MenuItem value="LSTM">LSTM - Long Short-Term Memory</MenuItem>
                    <MenuItem value="GRU">GRU - Gated Recurrent Unit</MenuItem>
                    <MenuItem value="CNN">CNN - Convolutional Neural Network</MenuItem>
                    <MenuItem value="TRANSFORMER">Transformer - Attention-based</MenuItem>
                    <MenuItem value="ENSEMBLE">Ensemble - Combined Models</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Timeframe</InputLabel>
                  <Select
                    value={newModel.timeframe}
                    label="Timeframe"
                    onChange={(e) => setNewModel({ ...newModel, timeframe: e.target.value })}
                  >
                    <MenuItem value="1m">1 Minute</MenuItem>
                    <MenuItem value="5m">5 Minutes</MenuItem>
                    <MenuItem value="15m">15 Minutes</MenuItem>
                    <MenuItem value="1h">1 Hour</MenuItem>
                    <MenuItem value="4h">4 Hours</MenuItem>
                    <MenuItem value="1d">1 Day</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={newModel.description}
                  onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Trading Symbols
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {newModel.symbols.map((symbol, index) => (
                    <Chip
                      key={index}
                      label={symbol}
                      onDelete={() => {
                        const newSymbols = newModel.symbols.filter((_, i) => i !== index);
                        setNewModel({ ...newModel, symbols: newSymbols });
                      }}
                    />
                  ))}
                </Box>
                
                <TextField
                  fullWidth
                  label="Add Symbol"
                  placeholder="e.g., ETHUSDT"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      const symbol = e.target.value.toUpperCase();
                      if (!newModel.symbols.includes(symbol)) {
                        setNewModel({ 
                          ...newModel, 
                          symbols: [...newModel.symbols, symbol] 
                        });
                      }
                      e.target.value = '';
                    }
                  }}
                  margin="normal"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={showAdvancedConfig}
                      onChange={(e) => setShowAdvancedConfig(e.target.checked)}
                    />
                  }
                  label="Show Advanced Configuration"
                />
                
                {showAdvancedConfig && (
                  <TextField
                    fullWidth
                    label="Custom Configuration (JSON)"
                    multiline
                    rows={4}
                    value={JSON.stringify(newModel.customConfig, null, 2)}
                    onChange={(e) => {
                      try {
                        const config = JSON.parse(e.target.value);
                        setNewModel({ ...newModel, customConfig: config });
                      } catch (error) {
                        // Invalid JSON, ignore
                      }
                    }}
                    margin="normal"
                    placeholder='{"sequenceLength": 60, "lstmUnits": 100}'
                  />
                )}
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleCreateModel}
                disabled={!newModel.name || !newModel.architecture}
                startIcon={<AddIcon />}
              >
                Create Model
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => {
                  setNewModel({
                    name: '',
                    architecture: 'LSTM',
                    symbols: ['BTCUSDT'],
                    timeframe: '1h',
                    description: '',
                    customConfig: {}
                  });
                  setShowAdvancedConfig(false);
                }}
              >
                Reset Form
              </Button>
            </Box>
          </CardContent>
        )}
      </Card>

      {/* Training Dialog */}
      <Dialog
        open={trainDialogOpen}
        onClose={() => setTrainDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Train Model: {selectedModel?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Epochs"
                type="number"
                value={trainingConfig.epochs}
                onChange={(e) => setTrainingConfig({
                  ...trainingConfig,
                  epochs: parseInt(e.target.value)
                })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Batch Size"
                type="number"
                value={trainingConfig.batchSize}
                onChange={(e) => setTrainingConfig({
                  ...trainingConfig,
                  batchSize: parseInt(e.target.value)
                })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Validation Split"
                type="number"
                inputProps={{ step: 0.1, min: 0, max: 1 }}
                value={trainingConfig.validationSplit}
                onChange={(e) => setTrainingConfig({
                  ...trainingConfig,
                  validationSplit: parseFloat(e.target.value)
                })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Patience"
                type="number"
                value={trainingConfig.patience}
                onChange={(e) => setTrainingConfig({
                  ...trainingConfig,
                  patience: parseInt(e.target.value)
                })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={trainingConfig.earlyStopping}
                    onChange={(e) => setTrainingConfig({
                      ...trainingConfig,
                      earlyStopping: e.target.checked
                    })}
                  />
                }
                label="Early Stopping"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrainDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleTrainModel}
            variant="contained"
            startIcon={<TrainIcon />}
          >
            Start Training
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prediction Dialog */}
      <Dialog
        open={predictDialogOpen}
        onClose={() => setPredictDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Make Prediction: {selectedModel?.name}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Input Data (JSON Array)"
            multiline
            rows={8}
            value={predictionInput}
            onChange={(e) => setPredictionInput(e.target.value)}
            placeholder='[[50000, 100, 75, 0.5, 15], [51000, 120, 80, 0.7, 16], ...]'
            margin="normal"
          />
          
          {predictionResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Prediction Result:
              </Typography>
              <Paper sx={{ p: 2 }}>
                <pre>{JSON.stringify(predictionResult, null, 2)}</pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPredictDialogOpen(false)}>
            Close
          </Button>
          <Button
            onClick={handlePredict}
            variant="contained"
            startIcon={<PredictIcon />}
            disabled={!predictionInput}
          >
            Predict
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProductionMLDashboard;