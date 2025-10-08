import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ReferenceLine
} from 'recharts';

import mlPerformanceService, { ModelPerformance } from '../services/mlPerformanceService';

interface ModelPerformanceChartProps {
  modelId: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  showConfidenceInterval?: boolean;
  showDriftThreshold?: boolean;
  height?: number;
}

interface PerformanceDataPoint {
  timestamp: number;
  accuracy: number;
  confidence: number;
  predictions: number;
  drift: number;
  date: string;
  time: string;
}

const ModelPerformanceChart: React.FC<ModelPerformanceChartProps> = ({
  modelId,
  timeRange = '24h',
  showConfidenceInterval = true,
  showDriftThreshold = true,
  height = 400
}) => {
  const [data, setData] = useState<PerformanceDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'area' | 'scatter'>('line');
  const [showPredictionVolume, setShowPredictionVolume] = useState<boolean>(false);
  const [showDrift, setShowDrift] = useState<boolean>(true);

  // Generate mock historical data (in a real implementation, this would come from the API)
  const generateHistoricalData = (modelId: string, range: string): PerformanceDataPoint[] => {
    const now = Date.now();
    const ranges = {
      '1h': { points: 60, interval: 60000 }, // 1 minute intervals
      '24h': { points: 288, interval: 300000 }, // 5 minute intervals
      '7d': { points: 168, interval: 3600000 }, // 1 hour intervals
      '30d': { points: 180, interval: 14400000 } // 4 hour intervals
    };

    const config = ranges[range];
    const data: PerformanceDataPoint[] = [];

    for (let i = config.points; i >= 0; i--) {
      const timestamp = now - (i * config.interval);
      const date = new Date(timestamp);
      
      // Simulate model performance with some trends and noise
      const baseAccuracy = 0.75 + Math.sin(i / 20) * 0.1 + (Math.random() - 0.5) * 0.05;
      const baseConfidence = 0.8 + Math.cos(i / 15) * 0.08 + (Math.random() - 0.5) * 0.04;
      const baseDrift = Math.max(0, 0.05 + Math.sin(i / 30) * 0.03 + (Math.random() - 0.5) * 0.02);
      const predictions = Math.floor(50 + Math.sin(i / 10) * 20 + Math.random() * 30);

      data.push({
        timestamp,
        accuracy: Math.max(0, Math.min(1, baseAccuracy)),
        confidence: Math.max(0, Math.min(1, baseConfidence)),
        predictions,
        drift: Math.max(0, Math.min(0.2, baseDrift)),
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString()
      });
    }

    return data;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // In a real implementation, you would fetch historical data from the API
        // For now, we'll generate mock data
        const historicalData = generateHistoricalData(modelId, timeRange);
        setData(historicalData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };

    if (modelId) {
      loadData();
    }
  }, [modelId, timeRange]);

  // Format data for display
  const formatDataForChart = (data: PerformanceDataPoint[]) => {
    return data.map(point => ({
      ...point,
      accuracyPercent: point.accuracy * 100,
      confidencePercent: point.confidence * 100,
      driftPercent: point.drift * 100,
      tooltip: `${point.date} ${point.time}`
    }));
  };

  const chartData = formatDataForChart(data);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" height={height}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            boxShadow: 2
          }}
        >
          <Typography variant="subtitle2">
            {data.tooltip}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              {entry.name.includes('Percent') ? '%' : ''}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Performance Trends
          </Typography>
          
          <Box display="flex" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={chartType}
                label="Chart Type"
                onChange={(e) => setChartType(e.target.value as any)}
              >
                <MenuItem value="line">Line</MenuItem>
                <MenuItem value="area">Area</MenuItem>
                <MenuItem value="scatter">Scatter</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={showPredictionVolume}
                  onChange={(e) => setShowPredictionVolume(e.target.checked)}
                  size="small"
                />
              }
              label="Volume"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showDrift}
                  onChange={(e) => setShowDrift(e.target.checked)}
                  size="small"
                />
              }
              label="Drift"
            />
          </Box>
        </Box>

        <ResponsiveContainer width="100%" height={height}>
          {chartType === 'line' && (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="time"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                yAxisId="percent"
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
              />
              {showPredictionVolume && (
                <YAxis 
                  yAxisId="volume"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Predictions', angle: 90, position: 'insideRight' }}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Line
                yAxisId="percent"
                type="monotone"
                dataKey="accuracyPercent"
                stroke="#0088FE"
                strokeWidth={2}
                name="Accuracy %"
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
              
              {showConfidenceInterval && (
                <Line
                  yAxisId="percent"
                  type="monotone"
                  dataKey="confidencePercent"
                  stroke="#00C49F"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Confidence %"
                  dot={{ r: 2 }}
                />
              )}
              
              {showDrift && (
                <Line
                  yAxisId="percent"
                  type="monotone"
                  dataKey="driftPercent"
                  stroke="#FF8042"
                  strokeWidth={2}
                  name="Drift %"
                  dot={{ r: 2 }}
                />
              )}
              
              {showPredictionVolume && (
                <Line
                  yAxisId="volume"
                  type="monotone"
                  dataKey="predictions"
                  stroke="#FFBB28"
                  strokeWidth={1}
                  name="Predictions"
                  dot={{ r: 1 }}
                />
              )}
              
              {showDriftThreshold && (
                <ReferenceLine
                  yAxisId="percent"
                  y={10}
                  stroke="#FF0000"
                  strokeDasharray="3 3"
                  label="Drift Threshold"
                />
              )}
            </LineChart>
          )}
          
          {chartType === 'area' && (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Area
                type="monotone"
                dataKey="accuracyPercent"
                stackId="1"
                stroke="#0088FE"
                fill="#0088FE"
                fillOpacity={0.3}
                name="Accuracy %"
              />
              
              {showConfidenceInterval && (
                <Area
                  type="monotone"
                  dataKey="confidencePercent"
                  stackId="2"
                  stroke="#00C49F"
                  fill="#00C49F"
                  fillOpacity={0.3}
                  name="Confidence %"
                />
              )}
              
              {showDrift && (
                <Area
                  type="monotone"
                  dataKey="driftPercent"
                  stackId="3"
                  stroke="#FF8042"
                  fill="#FF8042"
                  fillOpacity={0.3}
                  name="Drift %"
                />
              )}
              
              {showDriftThreshold && (
                <ReferenceLine
                  y={10}
                  stroke="#FF0000"
                  strokeDasharray="3 3"
                  label="Drift Threshold"
                />
              )}
            </AreaChart>
          )}
          
          {chartType === 'scatter' && (
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="accuracyPercent"
                type="number"
                domain={[0, 100]}
                name="Accuracy %"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                dataKey="confidencePercent"
                type="number"
                domain={[0, 100]}
                name="Confidence %"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Scatter
                name="Performance Points"
                data={chartData}
                fill="#8884d8"
              />
              
              <ReferenceLine x={70} stroke="#FF0000" strokeDasharray="3 3" label="Min Accuracy" />
              <ReferenceLine y={70} stroke="#FF0000" strokeDasharray="3 3" label="Min Confidence" />
            </ScatterChart>
          )}
        </ResponsiveContainer>

        {/* Performance Summary */}
        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" color="textSecondary">
              Latest Accuracy: <strong>{chartData[chartData.length - 1]?.accuracyPercent.toFixed(2)}%</strong>
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Latest Drift: <strong>{chartData[chartData.length - 1]?.driftPercent.toFixed(2)}%</strong>
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Data points: <strong>{chartData.length}</strong>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ModelPerformanceChart;