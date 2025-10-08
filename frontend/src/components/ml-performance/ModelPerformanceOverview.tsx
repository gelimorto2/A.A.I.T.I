import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Progress,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Button,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  PlayArrow,
  Stop,
  Settings,
  Insights,
  ModelTraining
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface ModelData {
  id: string;
  version: string;
  status: string;
  accuracy: number;
  recentAccuracy: number;
  totalPredictions: number;
  drift: number;
  needsRetraining: boolean;
  lastUpdated: string;
  confidenceAvg: number;
}

interface DashboardData {
  overview: {
    totalModels: number;
    activeModels: number;
    modelsNeedingRetraining: number;
    totalPredictions: number;
    avgAccuracy: number;
  };
  models: ModelData[];
  alerts: any[];
  abTests: any[];
}

interface ModelPerformanceOverviewProps {
  data: DashboardData;
  onModelSelect: (modelIds: string[]) => void;
}

const ModelPerformanceOverview: React.FC<ModelPerformanceOverviewProps> = ({
  data,
  onModelSelect
}) => {
  const theme = useTheme();
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'accuracy' | 'drift' | 'predictions' | 'recent'>('accuracy');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'warning' | 'error'>('all');

  const handleModelToggle = (modelId: string) => {
    const newSelection = selectedModels.includes(modelId)
      ? selectedModels.filter(id => id !== modelId)
      : [...selectedModels, modelId];
    
    setSelectedModels(newSelection);
    onModelSelect(newSelection);
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'active': return 'success';
      case 'training': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.8) return theme.palette.success.main;
    if (accuracy >= 0.7) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getDriftSeverity = (drift: number) => {
    if (drift < 0.05) return { color: 'success.main', label: 'Low' };
    if (drift < 0.1) return { color: 'warning.main', label: 'Medium' };
    return { color: 'error.main', label: 'High' };
  };

  const sortedAndFilteredModels = React.useMemo(() => {
    let filtered = data.models;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(model => {
        switch (filterStatus) {
          case 'active': return model.status === 'active';
          case 'warning': return model.needsRetraining || model.drift > 0.05;
          case 'error': return model.status === 'error' || model.accuracy < 0.6;
          default: return true;
        }
      });
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'accuracy': return b.accuracy - a.accuracy;
        case 'drift': return b.drift - a.drift;
        case 'predictions': return b.totalPredictions - a.totalPredictions;
        case 'recent': return b.recentAccuracy - a.recentAccuracy;
        default: return 0;
      }
    });
  }, [data.models, sortBy, filterStatus]);

  const renderModelCard = (model: ModelData) => {
    const isSelected = selectedModels.includes(model.id);
    const driftInfo = getDriftSeverity(model.drift);
    const accuracyTrend = model.recentAccuracy - model.accuracy;

    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={model.id}>
        <Card 
          sx={{ 
            cursor: 'pointer',
            border: isSelected ? 2 : 1,
            borderColor: isSelected ? 'primary.main' : 'divider',
            '&:hover': {
              boxShadow: 4,
              borderColor: 'primary.light'
            },
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={() => handleModelToggle(model.id)}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h6" noWrap title={model.id}>
                  {model.id.length > 12 ? `${model.id.substring(0, 12)}...` : model.id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  v{model.version}
                </Typography>
              </Box>
              <Chip 
                label={model.status} 
                color={getStatusColor(model.status)}
                size="small"
              />
            </Box>

            {/* Accuracy Metrics */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Accuracy
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    color={getAccuracyColor(model.accuracy)}
                  >
                    {(model.accuracy * 100).toFixed(1)}%
                  </Typography>
                  {accuracyTrend !== 0 && (
                    <Tooltip title={`Trend: ${accuracyTrend > 0 ? '+' : ''}${(accuracyTrend * 100).toFixed(1)}%`}>
                      {accuracyTrend > 0 ? 
                        <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} /> :
                        <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
                      }
                    </Tooltip>
                  )}
                </Box>
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={model.accuracy * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getAccuracyColor(model.accuracy)
                  }
                }}
              />
            </Box>

            {/* Key Metrics */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Predictions
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {model.totalPredictions.toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Confidence
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {(model.confidenceAvg * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Drift Indicator */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Model Drift
              </Typography>
              <Chip 
                label={driftInfo.label}
                size="small"
                sx={{ 
                  bgcolor: driftInfo.color,
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            </Box>

            {/* Alerts */}
            {model.needsRetraining && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                <Typography variant="caption">
                  Retraining recommended
                </Typography>
              </Alert>
            )}

            {model.status === 'error' && (
              <Alert severity="error" sx={{ mb: 1 }}>
                <Typography variant="caption">
                  Model error detected
                </Typography>
              </Alert>
            )}

            {/* Last Updated */}
            <Typography variant="caption" color="text.secondary">
              Updated: {new Date(model.lastUpdated).toLocaleString()}
            </Typography>
          </CardContent>

          {/* Action Buttons */}
          <Box sx={{ p: 1, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="View Details">
                <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                  <Insights fontSize="small" />
                </IconButton>
              </Tooltip>
              
              {model.needsRetraining && (
                <Tooltip title="Trigger Retraining">
                  <IconButton size="small" color="warning" onClick={(e) => e.stopPropagation()}>
                    <ModelTraining fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Tooltip title={model.status === 'active' ? 'Pause Model' : 'Activate Model'}>
              <IconButton 
                size="small" 
                color={model.status === 'active' ? 'error' : 'success'}
                onClick={(e) => e.stopPropagation()}
              >
                {model.status === 'active' ? 
                  <Stop fontSize="small" /> : 
                  <PlayArrow fontSize="small" />
                }
              </IconButton>
            </Tooltip>
          </Box>
        </Card>
      </Grid>
    );
  };

  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              label="Sort By"
            >
              <MenuItem value="accuracy">Accuracy</MenuItem>
              <MenuItem value="recent">Recent Performance</MenuItem>
              <MenuItem value="drift">Drift Level</MenuItem>
              <MenuItem value="predictions">Predictions</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              label="Filter"
            >
              <MenuItem value="all">All Models</MenuItem>
              <MenuItem value="active">Active Only</MenuItem>
              <MenuItem value="warning">Needs Attention</MenuItem>
              <MenuItem value="error">Errors</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {selectedModels.length} selected
          </Typography>
          
          {selectedModels.length > 0 && (
            <Button 
              size="small" 
              onClick={() => {
                setSelectedModels([]);
                onModelSelect([]);
              }}
            >
              Clear Selection
            </Button>
          )}
        </Box>
      </Box>

      {/* Performance Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Best Performer
              </Typography>
              {sortedAndFilteredModels.length > 0 && (
                <Box>
                  <Typography variant="h6">
                    {sortedAndFilteredModels[0].id}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    {(sortedAndFilteredModels[0].accuracy * 100).toFixed(1)}% accuracy
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Most Active
              </Typography>
              {sortedAndFilteredModels.length > 0 && (
                <Box>
                  <Typography variant="h6">
                    {sortedAndFilteredModels.reduce((max, model) => 
                      model.totalPredictions > max.totalPredictions ? model : max
                    ).id}
                  </Typography>
                  <Typography variant="body2" color="info.main">
                    {sortedAndFilteredModels.reduce((max, model) => 
                      model.totalPredictions > max.totalPredictions ? model : max
                    ).totalPredictions.toLocaleString()} predictions
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Needs Attention
              </Typography>
              <Box>
                <Typography variant="h6">
                  {data.models.filter(m => m.needsRetraining || m.drift > 0.1).length}
                </Typography>
                <Typography variant="body2" color="warning.main">
                  models require review
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg Drift
              </Typography>
              <Box>
                <Typography variant="h6">
                  {((data.models.reduce((sum, m) => sum + m.drift, 0) / data.models.length) * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color={
                  (data.models.reduce((sum, m) => sum + m.drift, 0) / data.models.length) < 0.05 ? 
                  'success.main' : 'warning.main'
                }>
                  system drift level
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Model Cards Grid */}
      <Grid container spacing={2}>
        {sortedAndFilteredModels.map(renderModelCard)}
      </Grid>

      {sortedAndFilteredModels.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No models found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters or create a new model
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ModelPerformanceOverview;
