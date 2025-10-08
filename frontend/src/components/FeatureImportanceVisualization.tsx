import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  TreemapChart,
  Treemap,
  Cell
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

import mlPerformanceService, { FeatureImportance } from '../services/mlPerformanceService';

interface FeatureImportanceProps {
  modelId: string;
  maxFeatures?: number;
  showHistoricalTrends?: boolean;
  chartType?: 'bar' | 'radar' | 'table' | 'treemap';
}

interface FeatureWithTrend extends FeatureImportance {
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  category: string;
  description?: string;
}

const FEATURE_CATEGORIES = {
  price: { color: '#0088FE', label: 'Price Indicators' },
  volume: { color: '#00C49F', label: 'Volume Indicators' },
  technical: { color: '#FFBB28', label: 'Technical Indicators' },
  sentiment: { color: '#FF8042', label: 'Sentiment Indicators' },
  market: { color: '#8884D8', label: 'Market Indicators' },
  other: { color: '#82CA9D', label: 'Other Features' }
};

const FeatureImportanceVisualization: React.FC<FeatureImportanceProps> = ({
  modelId,
  maxFeatures = 20,
  showHistoricalTrends = true,
  chartType = 'bar'
}) => {
  const [features, setFeatures] = useState<FeatureWithTrend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureWithTrend | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [currentChartType, setCurrentChartType] = useState(chartType);

  // Categorize feature based on name
  const categorizeFeature = (featureName: string): keyof typeof FEATURE_CATEGORIES => {
    const name = featureName.toLowerCase();
    if (name.includes('price') || name.includes('close') || name.includes('open') || name.includes('high') || name.includes('low')) {
      return 'price';
    }
    if (name.includes('volume') || name.includes('vol')) {
      return 'volume';
    }
    if (name.includes('rsi') || name.includes('macd') || name.includes('ema') || name.includes('sma') || name.includes('bollinger')) {
      return 'technical';
    }
    if (name.includes('sentiment') || name.includes('fear') || name.includes('greed')) {
      return 'sentiment';
    }
    if (name.includes('market') || name.includes('cap') || name.includes('dominance')) {
      return 'market';
    }
    return 'other';
  };

  // Generate mock trend data (in real implementation, this would come from historical API data)
  const addTrendData = (features: FeatureImportance[]): FeatureWithTrend[] => {
    return features.map(feature => {
      const changePercent = (Math.random() - 0.5) * 20; // -10% to +10% change
      const trend = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';
      const category = categorizeFeature(feature.feature);
      
      return {
        ...feature,
        trend,
        changePercent,
        category,
        description: getFeatureDescription(feature.feature)
      };
    });
  };

  // Get feature description
  const getFeatureDescription = (featureName: string): string => {
    const descriptions: Record<string, string> = {
      'rsi': 'Relative Strength Index - measures momentum',
      'macd': 'Moving Average Convergence Divergence - trend indicator',
      'volume': 'Trading volume - market activity indicator',
      'price': 'Asset price - fundamental value indicator',
      'ema': 'Exponential Moving Average - trend smoothing',
      'sma': 'Simple Moving Average - price trend',
      'bollinger_upper': 'Bollinger Bands Upper - volatility indicator',
      'bollinger_lower': 'Bollinger Bands Lower - volatility indicator',
      'sentiment': 'Market sentiment score'
    };
    
    const key = Object.keys(descriptions).find(k => featureName.toLowerCase().includes(k));
    return key ? descriptions[key] : 'Feature importance indicator';
  };

  useEffect(() => {
    const loadFeatureImportance = async () => {
      if (!modelId) return;

      setLoading(true);
      setError(null);

      try {
        const data = await mlPerformanceService.getFeatureImportance(modelId);
        const featuresWithTrends = addTrendData(data.features.slice(0, maxFeatures));
        setFeatures(featuresWithTrends);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feature importance');
      } finally {
        setLoading(false);
      }
    };

    loadFeatureImportance();
  }, [modelId, maxFeatures]);

  const handleFeatureClick = (feature: FeatureWithTrend) => {
    setSelectedFeature(feature);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" height={300}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading feature importance...
            </Typography>
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
          <Typography variant="subtitle2">{label}</Typography>
          <Typography variant="body2">
            Importance: {(data.importance * 100).toFixed(2)}%
          </Typography>
          <Typography variant="body2">
            Usage Count: {data.count}
          </Typography>
          {data.trend && (
            <Typography variant="body2" sx={{ 
              color: data.trend === 'up' ? 'success.main' : 
                     data.trend === 'down' ? 'error.main' : 'text.secondary'
            }}>
              Trend: {data.trend} ({data.changePercent > 0 ? '+' : ''}{data.changePercent.toFixed(1)}%)
            </Typography>
          )}
        </Box>
      );
    }
    return null;
  };

  // Prepare data for different chart types
  const chartData = features.map(feature => ({
    ...feature,
    importancePercent: feature.importance * 100,
    categoryColor: FEATURE_CATEGORIES[feature.category as keyof typeof FEATURE_CATEGORIES]?.color || '#999999'
  }));

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Feature Importance Analysis
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1}>
            {['bar', 'radar', 'table', 'treemap'].map((type) => (
              <Button
                key={type}
                variant={currentChartType === type ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setCurrentChartType(type as any)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Chart Visualization */}
        {currentChartType === 'bar' && (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="feature" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis 
                label={{ value: 'Importance (%)', angle: -90, position: 'insideLeft' }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="importancePercent" 
                name="Importance %"
                onClick={(data: any) => handleFeatureClick(data)}
                style={{ cursor: 'pointer' }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.categoryColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {currentChartType === 'radar' && (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={chartData.slice(0, 8)}>
              <PolarGrid />
              <PolarAngleAxis dataKey="feature" />
              <PolarRadiusAxis 
                angle={45}
                domain={[0, Math.max(...chartData.map(d => d.importancePercent))]}
              />
              <Radar
                name="Feature Importance"
                dataKey="importancePercent"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <RechartsTooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        )}

        {currentChartType === 'table' && (
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Feature</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Importance</TableCell>
                  <TableCell align="right">Usage Count</TableCell>
                  {showHistoricalTrends && <TableCell align="center">Trend</TableCell>}
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {features.map((feature, index) => (
                  <TableRow key={feature.feature} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {feature.feature}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={FEATURE_CATEGORIES[feature.category as keyof typeof FEATURE_CATEGORIES]?.label || 'Other'}
                        size="small"
                        sx={{ 
                          backgroundColor: FEATURE_CATEGORIES[feature.category as keyof typeof FEATURE_CATEGORIES]?.color || '#999999',
                          color: 'white'
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end">
                        <Box sx={{ width: 100, mr: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={feature.importance * 100}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                        <Typography variant="body2">
                          {(feature.importance * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {feature.count.toLocaleString()}
                      </Typography>
                    </TableCell>
                    {showHistoricalTrends && (
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" justifyContent="center">
                          {feature.trend === 'up' && <TrendingUpIcon color="success" />}
                          {feature.trend === 'down' && <TrendingDownIcon color="error" />}
                          {feature.trend === 'stable' && <Typography>—</Typography>}
                          <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {feature.changePercent > 0 ? '+' : ''}{feature.changePercent.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    )}
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleFeatureClick(feature)}
                        >
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Category Summary */}
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>
            Feature Categories
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {Object.entries(FEATURE_CATEGORIES).map(([key, category]) => {
              const count = features.filter(f => f.category === key).length;
              if (count === 0) return null;
              
              return (
                <Chip
                  key={key}
                  label={`${category.label} (${count})`}
                  size="small"
                  sx={{ 
                    backgroundColor: category.color,
                    color: 'white'
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Feature Details Modal */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Feature Details: {selectedFeature?.feature}
          </DialogTitle>
          <DialogContent>
            {selectedFeature && (
              <Box>
                <Typography variant="body1" paragraph>
                  {selectedFeature.description}
                </Typography>
                
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={2}>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      Importance Score
                    </Typography>
                    <Typography variant="h6">
                      {(selectedFeature.importance * 100).toFixed(2)}%
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      Usage Count
                    </Typography>
                    <Typography variant="h6">
                      {selectedFeature.count.toLocaleString()}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      Category
                    </Typography>
                    <Chip
                      label={FEATURE_CATEGORIES[selectedFeature.category as keyof typeof FEATURE_CATEGORIES]?.label || 'Other'}
                      sx={{ 
                        backgroundColor: FEATURE_CATEGORIES[selectedFeature.category as keyof typeof FEATURE_CATEGORIES]?.color || '#999999',
                        color: 'white'
                      }}
                    />
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      Recent Trend
                    </Typography>
                    <Box display="flex" alignItems="center">
                      {selectedFeature.trend === 'up' && <TrendingUpIcon color="success" />}
                      {selectedFeature.trend === 'down' && <TrendingDownIcon color="error" />}
                      {selectedFeature.trend === 'stable' && <Typography>Stable</Typography>}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {selectedFeature.changePercent > 0 ? '+' : ''}{selectedFeature.changePercent.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Historical trend would go here in a real implementation */}
                <Alert severity="info">
                  Historical trend analysis and detailed feature correlation data would be displayed here in a production environment.
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default FeatureImportanceVisualization;