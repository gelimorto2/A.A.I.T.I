import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Alert,
  Chip,
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Stack,
  Divider
} from '@mui/material';
import {
  Warning,
  TrendingDown,
  TrendingUp,
  Analytics,
  Refresh,
  ModelTraining,
  Assessment,
  Timeline,
  Info,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

import { mlPerformanceService } from '../../services/mlPerformanceService';

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

interface DriftAnalysis {
  modelId: string;
  overallDrift: number;
  accuracyDrift: number;
  confidenceDrift: number;
  featureDrift: { [key: string]: number };
  predictionDrift: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: Array<{
    type: string;
    priority: string;
    message: string;
  }>;
  lastCalculated: string;
}

interface ModelDriftAnalysisProps {
  models: ModelData[];
  selectedModels: string[];
}

const ModelDriftAnalysis: React.FC<ModelDriftAnalysisProps> = ({
  models,
  selectedModels
}) => {
  const theme = useTheme();
  const [driftAnalyses, setDriftAnalyses] = useState<{ [key: string]: DriftAnalysis }>({});
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'drift' | 'severity' | 'updated'>('drift');
  const [showOnlyDrifted, setShowOnlyDrifted] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const displayModels = selectedModels.length > 0 ? 
    models.filter(m => selectedModels.includes(m.id)) : 
    models;

  useEffect(() => {
    if (displayModels.length > 0) {
      fetchDriftAnalyses();
    }
  }, [displayModels]);

  const fetchDriftAnalyses = async () => {
    setLoading(true);
    try {
      const analyses: { [key: string]: DriftAnalysis } = {};
      
      for (const model of displayModels) {
        // Simulate drift analysis data
        const overallDrift = model.drift;
        const accuracyDrift = Math.abs(model.accuracy - model.recentAccuracy);
        const confidenceDrift = Math.random() * 0.15;
        const featureDrift = {
          'price': Math.random() * 0.1,
          'volume': Math.random() * 0.08,
          'rsi': Math.random() * 0.12,
          'macd': Math.random() * 0.09,
          'bollinger_bands': Math.random() * 0.07
        };
        const predictionDrift = Math.random() * 0.1;

        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (overallDrift > 0.15) severity = 'critical';
        else if (overallDrift > 0.1) severity = 'high';
        else if (overallDrift > 0.05) severity = 'medium';

        const recommendations = generateRecommendations(overallDrift, accuracyDrift, confidenceDrift);

        analyses[model.id] = {
          modelId: model.id,
          overallDrift,
          accuracyDrift,
          confidenceDrift,
          featureDrift,
          predictionDrift,
          severity,
          recommendations,
          lastCalculated: new Date().toISOString()
        };
      }
      
      setDriftAnalyses(analyses);
    } catch (error) {
      console.error('Failed to fetch drift analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = (overallDrift: number, accuracyDrift: number, confidenceDrift: number) => {
    const recommendations = [];

    if (overallDrift > 0.15) {
      recommendations.push({
        type: 'retraining',
        priority: 'critical',
        message: 'Immediate retraining required due to severe drift'
      });
    } else if (overallDrift > 0.1) {
      recommendations.push({
        type: 'monitoring',
        priority: 'high',
        message: 'Increase monitoring frequency and prepare for retraining'
      });
    } else if (overallDrift > 0.05) {
      recommendations.push({
        type: 'review',
        priority: 'medium',
        message: 'Review model performance and consider preventive measures'
      });
    }

    if (accuracyDrift > 0.1) {
      recommendations.push({
        type: 'accuracy',
        priority: 'high',
        message: 'Significant accuracy degradation detected'
      });
    }

    if (confidenceDrift > 0.1) {
      recommendations.push({
        type: 'confidence',
        priority: 'medium',
        message: 'Model confidence has shifted significantly'
      });
    }

    return recommendations;
  };

  const handleRefreshModel = async (modelId: string) => {
    setRefreshing(modelId);
    try {
      // In real implementation, this would trigger drift recalculation
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchDriftAnalyses();
    } catch (error) {
      console.error('Failed to refresh drift analysis:', error);
    } finally {
      setRefreshing(null);
    }
  };

  const getDriftColor = (drift: number) => {
    if (drift < 0.05) return theme.palette.success.main;
    if (drift < 0.1) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const sortedAnalyses = Object.values(driftAnalyses)
    .filter(analysis => !showOnlyDrifted || analysis.overallDrift > 0.05)
    .sort((a, b) => {
      switch (sortBy) {
        case 'drift': return b.overallDrift - a.overallDrift;
        case 'severity': 
          const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        case 'updated': return new Date(b.lastCalculated).getTime() - new Date(a.lastCalculated).getTime();
        default: return 0;
      }
    });

  const renderDriftOverview = () => {
    const driftDistribution = {
      low: sortedAnalyses.filter(a => a.severity === 'low').length,
      medium: sortedAnalyses.filter(a => a.severity === 'medium').length,
      high: sortedAnalyses.filter(a => a.severity === 'high').length,
      critical: sortedAnalyses.filter(a => a.severity === 'critical').length
    };

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Low Drift
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {driftDistribution.low}
                  </Typography>
                </Box>
                <TrendingUp color="success" sx={{ fontSize: 40 }} />
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
                    Medium Drift
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {driftDistribution.medium}
                  </Typography>
                </Box>
                <Warning color="warning" sx={{ fontSize: 40 }} />
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
                    High Drift
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {driftDistribution.high}
                  </Typography>
                </Box>
                <TrendingDown color="error" sx={{ fontSize: 40 }} />
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
                    Critical
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {driftDistribution.critical}
                  </Typography>
                </Box>
                <ErrorIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderDriftChart = () => {
    const chartData = sortedAnalyses.map(analysis => ({
      name: analysis.modelId.substring(0, 8) + '...',
      fullName: analysis.modelId,
      overallDrift: analysis.overallDrift * 100,
      accuracyDrift: analysis.accuracyDrift * 100,
      confidenceDrift: analysis.confidenceDrift * 100,
      predictionDrift: analysis.predictionDrift * 100
    }));

    return (
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Drift Comparison Across Models" />
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                stroke={theme.palette.text.secondary}
              />
              <YAxis 
                label={{ value: 'Drift (%)', angle: -90, position: 'insideLeft' }}
                stroke={theme.palette.text.secondary}
              />
              <RechartsTooltip 
                labelFormatter={(label, payload) => {
                  const item = chartData.find(d => d.name === label);
                  return item?.fullName || label;
                }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
              />
              <Legend />
              <Bar dataKey="overallDrift" fill={theme.palette.primary.main} name="Overall Drift" />
              <Bar dataKey="accuracyDrift" fill={theme.palette.warning.main} name="Accuracy Drift" />
              <Bar dataKey="confidenceDrift" fill={theme.palette.info.main} name="Confidence Drift" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderFeatureDriftRadar = (analysis: DriftAnalysis) => {
    const radarData = Object.entries(analysis.featureDrift).map(([feature, drift]) => ({
      feature: feature.replace('_', ' ').toUpperCase(),
      drift: drift * 100,
      fullMark: 15
    }));

    return (
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="feature" />
          <PolarRadiusAxis angle={90} domain={[0, 15]} />
          <Radar
            name="Feature Drift"
            dataKey="drift"
            stroke={theme.palette.primary.main}
            fill={theme.palette.primary.main}
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const renderDriftTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Model ID</TableCell>
            <TableCell>Overall Drift</TableCell>
            <TableCell>Severity</TableCell>
            <TableCell>Accuracy Drift</TableCell>
            <TableCell>Confidence Drift</TableCell>
            <TableCell>Last Updated</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedAnalyses.map((analysis) => (
            <TableRow key={analysis.modelId}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {analysis.modelId}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(analysis.overallDrift * 500, 100)}
                    sx={{
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getDriftColor(analysis.overallDrift)
                      }
                    }}
                  />
                  <Typography variant="body2" color={getDriftColor(analysis.overallDrift)}>
                    {(analysis.overallDrift * 100).toFixed(2)}%
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={analysis.severity.toUpperCase()}
                  color={getSeverityColor(analysis.severity)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {(analysis.accuracyDrift * 100).toFixed(2)}%
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {(analysis.confidenceDrift * 100).toFixed(2)}%
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {new Date(analysis.lastCalculated).toLocaleString()}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedModel(analysis.modelId);
                        setDetailsOpen(true);
                      }}
                    >
                      <Info fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Refresh Analysis">
                    <IconButton
                      size="small"
                      onClick={() => handleRefreshModel(analysis.modelId)}
                      disabled={refreshing === analysis.modelId}
                    >
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {analysis.severity === 'high' || analysis.severity === 'critical' ? (
                    <Tooltip title="Trigger Retraining">
                      <IconButton size="small" color="warning">
                        <ModelTraining fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const selectedAnalysis = selectedModel ? driftAnalyses[selectedModel] : null;

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
              <MenuItem value="drift">Drift Level</MenuItem>
              <MenuItem value="severity">Severity</MenuItem>
              <MenuItem value="updated">Last Updated</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={showOnlyDrifted}
                onChange={(e) => setShowOnlyDrifted(e.target.checked)}
              />
            }
            label="Show Only Drifted Models"
          />
        </Box>

        <Button
          startIcon={<Refresh />}
          onClick={fetchDriftAnalyses}
          disabled={loading}
        >
          Refresh All
        </Button>
      </Box>

      {/* Overview Cards */}
      {renderDriftOverview()}

      {/* Critical Alerts */}
      {sortedAnalyses.some(a => a.severity === 'critical' || a.severity === 'high') && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="medium">
            {sortedAnalyses.filter(a => a.severity === 'critical').length} models require immediate attention
          </Typography>
          <Typography variant="caption">
            High drift levels detected. Consider retraining or reviewing model performance.
          </Typography>
        </Alert>
      )}

      {/* Charts */}
      {sortedAnalyses.length > 0 && renderDriftChart()}

      {/* Detailed Table */}
      <Card>
        <CardHeader title="Detailed Drift Analysis" />
        <CardContent>
          {renderDriftTable()}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Drift Analysis Details - {selectedModel}
        </DialogTitle>
        <DialogContent>
          {selectedAnalysis && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Feature Drift Analysis
                  </Typography>
                  {renderFeatureDriftRadar(selectedAnalysis)}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Recommendations
                  </Typography>
                  <Stack spacing={2}>
                    {selectedAnalysis.recommendations.map((rec, index) => (
                      <Alert
                        key={index}
                        severity={rec.priority === 'critical' ? 'error' : 
                                 rec.priority === 'high' ? 'warning' : 'info'}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {rec.message}
                        </Typography>
                        <Typography variant="caption">
                          Type: {rec.type} • Priority: {rec.priority}
                        </Typography>
                      </Alert>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Drift Breakdown
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Overall Drift
                  </Typography>
                  <Typography variant="h6" color={getDriftColor(selectedAnalysis.overallDrift)}>
                    {(selectedAnalysis.overallDrift * 100).toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Accuracy Drift
                  </Typography>
                  <Typography variant="h6">
                    {(selectedAnalysis.accuracyDrift * 100).toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Confidence Drift
                  </Typography>
                  <Typography variant="h6">
                    {(selectedAnalysis.confidenceDrift * 100).toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Prediction Drift
                  </Typography>
                  <Typography variant="h6">
                    {(selectedAnalysis.predictionDrift * 100).toFixed(2)}%
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
          {selectedAnalysis && (selectedAnalysis.severity === 'high' || selectedAnalysis.severity === 'critical') && (
            <Button variant="contained" color="warning" startIcon={<ModelTraining />}>
              Trigger Retraining
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {sortedAnalyses.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Analytics sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No drift analysis available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select models to analyze drift patterns and performance degradation
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ModelDriftAnalysis;
