import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Stack
} from '@mui/material';
import {
  Timeline,
  ShowChart,
  BarChart,
  PieChart,
  Fullscreen,
  Download,
  Refresh
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  PieChart as RechartsPieChart,
  Cell
} from 'recharts';

import { mlPerformanceService, MetricTimeSeries, LiveDataUpdate, TimeframeType } from '../../services/mlPerformanceService';

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
  latency: number;
  memoryUsage: number;
  errorRate: number;
}

interface MetricsChartsProps {
  models: ModelData[];
  timeframe: TimeframeType;
  selectedModels: string[];
  historicalData: Record<string, MetricTimeSeries[]>;
  liveData: LiveDataUpdate[];
}

interface TimeSeriesData {
  timestamp: string;
  [key: string]: any; // Dynamic model keys
}

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
];

const MetricsCharts: React.FC<MetricsChartsProps> = ({
  models,
  timeframe,
  selectedModels,
  historicalData,
  liveData
}) => {
  const theme = useTheme();
  const [chartData, setChartData] = useState<{
    accuracy: TimeSeriesData[];
    predictions: TimeSeriesData[];
    drift: TimeSeriesData[];
    confidence: TimeSeriesData[];
  }>({
    accuracy: [],
    predictions: [],
    drift: [],
    confidence: []
  });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'line' | 'area' | 'bar'>('line');
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'accuracy' | 'predictions' | 'drift' | 'confidence'>('accuracy');

  const displayModels = selectedModels.length > 0 ? 
    models.filter(m => selectedModels.includes(m.id)) : 
    models.slice(0, 5); // Show top 5 if none selected

  useEffect(() => {
    processHistoricalData();
  }, [historicalData, liveData, selectedModels, timeframe]);

  const processHistoricalData = () => {
    setLoading(true);
    try {
      // Process historical data from the enhanced data service
      const processedData = {
        accuracy: processMetricData('accuracy'),
        predictions: processMetricData('predictions'),
        drift: processMetricData('drift'),
        confidence: processMetricData('confidence')
      };

      setChartData(processedData);
    } catch (error) {
      console.error('Error processing historical data:', error);
      // Fallback to mock data if processing fails
      generateMockData();
    } finally {
      setLoading(false);
    }
  };

  const processMetricData = (metric: string): TimeSeriesData[] => {
    const metricSeries = historicalData[metric] || [];
    
    if (metricSeries.length === 0) {
      return generateMockTimeSeriesData(metric);
    }

    // Get all unique timestamps across all models
    const allTimestamps = new Set<number>();
    metricSeries.forEach(series => {
      if (selectedModels.length === 0 || selectedModels.includes(series.modelId)) {
        series.data.forEach(point => allTimestamps.add(point.timestamp));
      }
    });

    const sortedTimestamps = Array.from(allTimestamps).sort();
    
    // Create combined data points
    return sortedTimestamps.map(timestamp => {
      const dataPoint: TimeSeriesData = { 
        timestamp: new Date(timestamp).toLocaleTimeString()
      };
      
      metricSeries.forEach(series => {
        if (selectedModels.length === 0 || selectedModels.includes(series.modelId)) {
          const point = series.data.find(p => p.timestamp === timestamp);
          if (point) {
            dataPoint[series.modelId] = point.value;
          }
        }
      });
      
      return dataPoint;
    });
  };

  const generateMockTimeSeriesData = (metric: string): TimeSeriesData[] => {
    const timePoints = generateTimePoints(timeframe);
    
    return timePoints.map(time => {
      const dataPoint: TimeSeriesData = { timestamp: time };
      displayModels.forEach(model => {
        let value: number;
        
        switch (metric) {
          case 'accuracy':
            const baseAccuracy = model.accuracy;
            const variance = 0.05 * Math.sin(Date.parse(time) / 1000000) + Math.random() * 0.02 - 0.01;
            value = Math.max(0, Math.min(1, baseAccuracy + variance));
            break;
          case 'predictions':
            const basePredictions = model.totalPredictions / timePoints.length;
            const predVariance = Math.random() * basePredictions * 0.3;
            value = Math.floor(basePredictions + predVariance);
            break;
          case 'drift':
            const baseDrift = model.drift;
            const driftVariance = 0.02 * Math.sin(Date.parse(time) / 500000) + Math.random() * 0.01;
            value = Math.max(0, baseDrift + driftVariance);
            break;
          case 'confidence':
            const baseConf = model.confidenceAvg;
            const confVariance = 0.03 * Math.cos(Date.parse(time) / 800000) + Math.random() * 0.015 - 0.0075;
            value = Math.max(0, Math.min(1, baseConf + confVariance));
            break;
          default:
            value = Math.random();
        }
        
        dataPoint[model.id] = value;
      });
      return dataPoint;
    });
  };

  const generateMockData = () => {
    try {
      const timePoints = generateTimePoints(timeframe);
      
      const accuracyData = timePoints.map(time => {
        const dataPoint: TimeSeriesData = { timestamp: time };
        displayModels.forEach(model => {
          // Simulate time series data with some variance
          const baseAccuracy = model.accuracy;
          const variance = 0.05 * Math.sin(Date.parse(time) / 1000000) + Math.random() * 0.02 - 0.01;
          dataPoint[model.id] = Math.max(0, Math.min(1, baseAccuracy + variance));
        });
        return dataPoint;
      });

      const predictionsData = timePoints.map(time => {
        const dataPoint: TimeSeriesData = { timestamp: time };
        displayModels.forEach(model => {
          // Simulate prediction count over time
          const basePredictions = model.totalPredictions / timePoints.length;
          const variance = Math.random() * basePredictions * 0.3;
          dataPoint[model.id] = Math.floor(basePredictions + variance);
        });
        return dataPoint;
      });

      const driftData = timePoints.map(time => {
        const dataPoint: TimeSeriesData = { timestamp: time };
        displayModels.forEach(model => {
          // Simulate drift over time
          const baseDrift = model.drift;
          const variance = 0.02 * Math.sin(Date.parse(time) / 500000) + Math.random() * 0.01 - 0.005;
          dataPoint[model.id] = Math.max(0, baseDrift + variance);
        });
        return dataPoint;
      });

      const confidenceData = timePoints.map(time => {
        const dataPoint: TimeSeriesData = { timestamp: time };
        displayModels.forEach(model => {
          // Simulate confidence over time
          const baseConfidence = model.confidenceAvg;
          const variance = 0.1 * Math.sin(Date.parse(time) / 800000) + Math.random() * 0.05 - 0.025;
          dataPoint[model.id] = Math.max(0, Math.min(1, baseConfidence + variance));
        });
        return dataPoint;
      });

      setChartData({
        accuracy: accuracyData,
        predictions: predictionsData,
        drift: driftData,
        confidence: confidenceData
      });
    } catch (error) {
      console.error('Failed to fetch metrics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimePoints = (timeframe: string): string[] => {
    const now = new Date();
    const points: string[] = [];
    let interval: number;
    let count: number;

    switch (timeframe) {
      case '1h':
        interval = 5 * 60 * 1000; // 5 minutes
        count = 12;
        break;
      case '6h':
        interval = 30 * 60 * 1000; // 30 minutes
        count = 12;
        break;
      case '24h':
        interval = 2 * 60 * 60 * 1000; // 2 hours
        count = 12;
        break;
      case '7d':
        interval = 12 * 60 * 60 * 1000; // 12 hours
        count = 14;
        break;
      case '30d':
        interval = 24 * 60 * 60 * 1000; // 1 day
        count = 30;
        break;
      default:
        interval = 60 * 60 * 1000; // 1 hour
        count = 24;
    }

    for (let i = count - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * interval);
      points.push(time.toISOString());
    }

    return points;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (timeframe === '1h' || timeframe === '6h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (timeframe === '24h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatValue = (value: number, metric: string) => {
    switch (metric) {
      case 'accuracy':
      case 'confidence':
        return `${(value * 100).toFixed(1)}%`;
      case 'drift':
        return `${(value * 100).toFixed(2)}%`;
      case 'predictions':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const renderChart = (data: TimeSeriesData[], metric: string, title: string) => {
    const ChartComponent = viewMode === 'area' ? AreaChart : 
                          viewMode === 'bar' ? RechartsBarChart : LineChart;

    return (
      <Card sx={{ height: '100%' }}>
        <CardHeader
          title={title}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Download Chart">
                <IconButton size="small">
                  <Download />
                </IconButton>
              </Tooltip>
              <Tooltip title="Fullscreen">
                <IconButton size="small">
                  <Fullscreen />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ChartComponent data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTimestamp}
                stroke={theme.palette.text.secondary}
              />
              <YAxis 
                tickFormatter={(value) => formatValue(value, metric)}
                stroke={theme.palette.text.secondary}
              />
              <RechartsTooltip 
                labelFormatter={(label) => new Date(label).toLocaleString()}
                formatter={(value: number) => [formatValue(value, metric), '']}
              />
              {showLegend && <Legend />}
              
              {displayModels.map((model, index) => {
                if (viewMode === 'area') {
                  return (
                    <Area
                      key={model.id}
                      type="monotone"
                      dataKey={model.id}
                      stackId="1"
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.6}
                      name={model.id}
                    />
                  );
                } else if (viewMode === 'bar') {
                  return (
                    <Bar
                      key={model.id}
                      dataKey={model.id}
                      fill={COLORS[index % COLORS.length]}
                      name={model.id}
                    />
                  );
                } else {
                  return (
                    <Line
                      key={model.id}
                      type="monotone"
                      dataKey={model.id}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name={model.id}
                    />
                  );
                }
              })}
            </ChartComponent>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderModelComparisonChart = () => {
    const comparisonData = displayModels.map(model => ({
      name: model.id,
      accuracy: model.accuracy,
      drift: model.drift,
      predictions: model.totalPredictions,
      confidence: model.confidenceAvg
    }));

    return (
      <Card>
        <CardHeader title="Model Comparison - Current State" />
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="accuracy" 
                name="Accuracy"
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                stroke={theme.palette.text.secondary}
              />
              <YAxis 
                dataKey="drift" 
                name="Drift"
                tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                stroke={theme.palette.text.secondary}
              />
              <RechartsTooltip 
                formatter={(value, name) => {
                  if (name === 'accuracy' || name === 'confidence') return `${(Number(value) * 100).toFixed(1)}%`;
                  if (name === 'drift') return `${(Number(value) * 100).toFixed(2)}%`;
                  return value;
                }}
              />
              <Scatter 
                dataKey="predictions" 
                fill={theme.palette.primary.main}
                name="Models"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderDistributionChart = () => {
    const distributionData = [
      { name: 'High Accuracy (>80%)', value: models.filter(m => m.accuracy > 0.8).length, color: theme.palette.success.main },
      { name: 'Medium Accuracy (60-80%)', value: models.filter(m => m.accuracy >= 0.6 && m.accuracy <= 0.8).length, color: theme.palette.warning.main },
      { name: 'Low Accuracy (<60%)', value: models.filter(m => m.accuracy < 0.6).length, color: theme.palette.error.main }
    ];

    return (
      <Card>
        <CardHeader title="Model Performance Distribution" />
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Chart Type</InputLabel>
            <Select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              label="Chart Type"
            >
              <MenuItem value="line">Line Chart</MenuItem>
              <MenuItem value="area">Area Chart</MenuItem>
              <MenuItem value="bar">Bar Chart</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Focus Metric</InputLabel>
            <Select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              label="Focus Metric"
            >
              <MenuItem value="accuracy">Accuracy</MenuItem>
              <MenuItem value="drift">Drift</MenuItem>
              <MenuItem value="confidence">Confidence</MenuItem>
              <MenuItem value="predictions">Predictions</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={<Switch checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />}
            label="Grid"
          />
          <FormControlLabel
            control={<Switch checked={showLegend} onChange={(e) => setShowLegend(e.target.checked)} />}
            label="Legend"
          />
          <Button startIcon={<Refresh />} onClick={fetchMetricsData} disabled={loading}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Selected Models Info */}
      {displayModels.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Displaying {displayModels.length} model{displayModels.length !== 1 ? 's' : ''}:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {displayModels.map((model, index) => (
              <Chip
                key={model.id}
                label={model.id}
                size="small"
                sx={{ 
                  bgcolor: COLORS[index % COLORS.length],
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Main Charts Grid */}
      <Grid container spacing={3}>
        {/* Primary Metric Chart (Full Width) */}
        <Grid item xs={12}>
          {renderChart(
            chartData[selectedMetric],
            selectedMetric,
            `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trends Over Time`
          )}
        </Grid>

        {/* Secondary Charts */}
        <Grid item xs={12} md={6}>
          {selectedMetric !== 'accuracy' && renderChart(
            chartData.accuracy,
            'accuracy',
            'Model Accuracy Trends'
          )}
          {selectedMetric === 'accuracy' && renderChart(
            chartData.drift,
            'drift',
            'Model Drift Trends'
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {selectedMetric !== 'predictions' && renderChart(
            chartData.predictions,
            'predictions',
            'Prediction Volume'
          )}
          {selectedMetric === 'predictions' && renderChart(
            chartData.confidence,
            'confidence',
            'Confidence Trends'
          )}
        </Grid>

        {/* Comparison Charts */}
        <Grid item xs={12} md={8}>
          {renderModelComparisonChart()}
        </Grid>

        <Grid item xs={12} md={4}>
          {renderDistributionChart()}
        </Grid>
      </Grid>

      {displayModels.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ShowChart sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No models selected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select models from the overview to view their performance charts
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MetricsCharts;
