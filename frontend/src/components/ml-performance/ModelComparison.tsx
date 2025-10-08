import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  Avatar
} from '@mui/material';
import {
  Compare,
  TrendingUp,
  TrendingDown,
  Assessment,
  Timeline,
  Speed,
  Memory,
  Accuracy,
  Remove,
  Add,
  Swap
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';

interface ModelData {
  id: string;
  version: string;
  status: string;
  accuracy: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  recentAccuracy: number;
  totalPredictions: number;
  drift: number;
  latency?: number;
  memoryUsage?: number;
  needsRetraining: boolean;
  lastUpdated: string;
  confidenceAvg: number;
  errorRate?: number;
  metrics?: {
    auc?: number;
    mae?: number;
    mse?: number;
    r2?: number;
  };
}

interface ModelComparisonProps {
  models: ModelData[];
  selectedModels: string[];
  onModelSelect: (modelIds: string[]) => void;
}

const ModelComparison: React.FC<ModelComparisonProps> = ({
  models,
  selectedModels,
  onModelSelect
}) => {
  const theme = useTheme();
  const [availableModel, setAvailableModel] = useState<string>('');
  
  const comparisonModels = useMemo(() => {
    return models.filter(model => selectedModels.includes(model.id));
  }, [models, selectedModels]);

  const availableModelsForAdd = useMemo(() => {
    return models.filter(model => !selectedModels.includes(model.id));
  }, [models, selectedModels]);

  const handleAddModel = () => {
    if (availableModel && !selectedModels.includes(availableModel)) {
      onModelSelect([...selectedModels, availableModel]);
      setAvailableModel('');
    }
  };

  const handleRemoveModel = (modelId: string) => {
    onModelSelect(selectedModels.filter(id => id !== modelId));
  };

  const getPerformanceColor = (value: number, max: number = 1) => {
    const percentage = (value / max) * 100;
    if (percentage >= 85) return 'success.main';
    if (percentage >= 70) return 'warning.main';
    return 'error.main';
  };

  const formatMetric = (value: number | undefined, decimals: number = 3) => {
    return value ? value.toFixed(decimals) : 'N/A';
  };

  const renderPerformanceRadar = () => {
    if (comparisonModels.length === 0) return null;

    const radarData = [
      { metric: 'Accuracy', ...comparisonModels.reduce((acc, model) => ({ ...acc, [model.id]: model.accuracy * 100 }), {}) },
      { metric: 'Precision', ...comparisonModels.reduce((acc, model) => ({ ...acc, [model.id]: (model.precision || 0) * 100 }), {}) },
      { metric: 'Recall', ...comparisonModels.reduce((acc, model) => ({ ...acc, [model.id]: (model.recall || 0) * 100 }), {}) },
      { metric: 'F1 Score', ...comparisonModels.reduce((acc, model) => ({ ...acc, [model.id]: (model.f1Score || 0) * 100 }), {}) },
      { metric: 'Confidence', ...comparisonModels.reduce((acc, model) => ({ ...acc, [model.id]: model.confidenceAvg * 100 }), {}) }
    ];

    const colors = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main, theme.palette.warning.main];

    return (
      <Card>
        <CardHeader title="Performance Comparison Radar" />
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              {comparisonModels.map((model, index) => (
                <Radar
                  key={model.id}
                  name={model.id}
                  dataKey={model.id}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.1}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderMetricsTable = () => {
    const metrics = [
      { key: 'accuracy', label: 'Accuracy', format: (v: number) => `${(v * 100).toFixed(2)}%` },
      { key: 'precision', label: 'Precision', format: (v: number) => v.toFixed(3) },
      { key: 'recall', label: 'Recall', format: (v: number) => v.toFixed(3) },
      { key: 'f1Score', label: 'F1 Score', format: (v: number) => v.toFixed(3) },
      { key: 'drift', label: 'Drift Score', format: (v: number) => v.toFixed(3) },
      { key: 'errorRate', label: 'Error Rate', format: (v: number) => `${(v * 100).toFixed(2)}%` },
      { key: 'confidenceAvg', label: 'Avg Confidence', format: (v: number) => v.toFixed(3) },
      { key: 'totalPredictions', label: 'Total Predictions', format: (v: number) => v.toLocaleString() }
    ];

    return (
      <Card>
        <CardHeader title="Detailed Metrics Comparison" />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  {comparisonModels.map(model => (
                    <TableCell key={model.id} align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                          {model.id.charAt(0).toUpperCase()}
                        </Avatar>
                        {model.id}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.map(metric => (
                  <TableRow key={metric.key}>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                      {metric.label}
                    </TableCell>
                    {comparisonModels.map(model => {
                      const value = (model as any)[metric.key];
                      const isHigherBetter = !['drift', 'errorRate'].includes(metric.key);
                      const bestValue = comparisonModels.reduce((best, m) => {
                        const modelValue = (m as any)[metric.key];
                        if (modelValue == null) return best;
                        if (best == null) return modelValue;
                        return isHigherBetter ? Math.max(best, modelValue) : Math.min(best, modelValue);
                      }, null);
                      
                      const isBest = value === bestValue && value != null;
                      
                      return (
                        <TableCell 
                          key={model.id} 
                          align="center"
                          sx={{ 
                            fontWeight: isBest ? 'bold' : 'normal',
                            color: isBest ? 'success.main' : 'text.primary'
                          }}
                        >
                          {value != null ? metric.format(value) : 'N/A'}
                          {isBest && <TrendingUp sx={{ ml: 0.5, fontSize: 16 }} />}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  const renderPerformanceTrends = () => {
    if (comparisonModels.length === 0) return null;

    // Generate sample trend data
    const trendData = Array.from({ length: 24 }, (_, i) => {
      const hour = i;
      const data: any = { hour };
      
      comparisonModels.forEach(model => {
        // Simulate some variation around the base accuracy
        const variation = (Math.sin(hour * 0.2) * 0.02) + (Math.random() * 0.01 - 0.005);
        data[model.id] = Math.max(0, Math.min(1, model.accuracy + variation)) * 100;
      });
      
      return data;
    });

    const colors = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main, theme.palette.warning.main];

    return (
      <Card>
        <CardHeader title="Performance Trends (24h)" />
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis domain={[0, 100]} />
              <RechartsTooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Accuracy']} />
              <Legend />
              {comparisonModels.map((model, index) => (
                <Line
                  key={model.id}
                  type="monotone"
                  dataKey={model.id}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderModelCards = () => {
    return (
      <Grid container spacing={2}>
        {comparisonModels.map((model, index) => (
          <Grid item xs={12} sm={6} md={4} key={model.id}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: index === 0 ? 'primary.main' : index === 1 ? 'secondary.main' : 'success.main' }}>
                    {model.id.charAt(0).toUpperCase()}
                  </Avatar>
                }
                title={model.id}
                subheader={`Version ${model.version}`}
                action={
                  <IconButton onClick={() => handleRemoveModel(model.id)} color="error">
                    <Remove />
                  </IconButton>
                }
              />
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Accuracy
                    </Typography>
                    <Typography variant="h5" sx={{ color: getPerformanceColor(model.accuracy) }}>
                      {(model.accuracy * 100).toFixed(2)}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={model.accuracy * 100} 
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  
                  <Divider />
                  
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Drift
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {model.drift.toFixed(3)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Predictions
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {model.totalPredictions.toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip 
                      label={model.status.toUpperCase()} 
                      color={model.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                    {model.needsRetraining && (
                      <Chip label="NEEDS RETRAIN" color="warning" size="small" />
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Model Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compare performance metrics across multiple models
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Add Model</InputLabel>
            <Select
              value={availableModel}
              onChange={(e) => setAvailableModel(e.target.value)}
              label="Add Model"
              disabled={availableModelsForAdd.length === 0}
            >
              {availableModelsForAdd.map(model => (
                <MenuItem key={model.id} value={model.id}>
                  {model.id} ({(model.accuracy * 100).toFixed(1)}%)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAddModel}
            disabled={!availableModel || selectedModels.length >= 4}
          >
            Add
          </Button>
        </Box>
      </Box>

      {comparisonModels.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            No models selected for comparison
          </Typography>
          <Typography variant="body2">
            Select models from the overview or table view to compare their performance metrics.
          </Typography>
          {availableModelsForAdd.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<Compare />}
                onClick={() => {
                  // Auto-select top 2 performing models
                  const topModels = availableModelsForAdd
                    .sort((a, b) => b.accuracy - a.accuracy)
                    .slice(0, 2)
                    .map(m => m.id);
                  onModelSelect(topModels);
                }}
              >
                Compare Top Models
              </Button>
            </Box>
          )}
        </Alert>
      ) : (
        <Box>
          {/* Model Cards */}
          <Box sx={{ mb: 3 }}>
            {renderModelCards()}
          </Box>

          {comparisonModels.length >= 2 && (
            <Grid container spacing={3}>
              {/* Performance Radar Chart */}
              <Grid item xs={12} lg={6}>
                {renderPerformanceRadar()}
              </Grid>

              {/* Performance Trends */}
              <Grid item xs={12} lg={6}>
                {renderPerformanceTrends()}
              </Grid>

              {/* Detailed Metrics Table */}
              <Grid item xs={12}>
                {renderMetricsTable()}
              </Grid>
            </Grid>
          )}

          {comparisonModels.length === 1 && (
            <Alert severity="warning">
              Add at least one more model to see detailed comparisons and charts.
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ModelComparison;
