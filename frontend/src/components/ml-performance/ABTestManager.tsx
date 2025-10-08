import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
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
  LinearProgress,
  Alert,
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
  Stack,
  Divider
} from '@mui/material';
import {
  Science,
  Add,
  PlayArrow,
  Stop,
  Assessment,
  Timeline,
  TrendingUp,
  TrendingDown,
  Info,
  Delete,
  Compare
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from 'recharts';

import { mlPerformanceService, ABTestResult } from '../../services/mlPerformanceService';

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

interface ABTestManagerProps {
  abTests: Array<{
    id: string;
    modelA: { id: string; accuracy: number };
    modelB: { id: string; accuracy: number };
    status: string;
    startTime: number;
  }>;
  availableModels: ModelData[];
}

const ABTestManager: React.FC<ABTestManagerProps> = ({
  abTests: initialABTests,
  availableModels
}) => {
  const theme = useTheme();
  const [abTests, setAbTests] = useState(initialABTests);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [testDetails, setTestDetails] = useState<ABTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state for creating new A/B test
  const [formData, setFormData] = useState({
    modelA: '',
    modelB: '',
    duration: 7, // days
    trafficSplit: 50, // percentage for model A
    minSampleSize: 100,
    significanceLevel: 0.05,
    description: ''
  });

  useEffect(() => {
    setAbTests(initialABTests);
  }, [initialABTests]);

  const handleCreateTest = async () => {
    if (!formData.modelA || !formData.modelB || formData.modelA === formData.modelB) {
      return;
    }

    setLoading(true);
    try {
      const testId = await mlPerformanceService.startABTest({
        modelA: formData.modelA,
        modelB: formData.modelB,
        config: {
          trafficSplit: formData.trafficSplit / 100,
          duration: formData.duration * 24 * 60 * 60 * 1000, // Convert days to milliseconds
          minSampleSize: formData.minSampleSize,
          significanceLevel: formData.significanceLevel
        }
      });

      // Add new test to local state
      setAbTests(prev => [...prev, {
        id: testId,
        modelA: { 
          id: formData.modelA, 
          accuracy: availableModels.find(m => m.id === formData.modelA)?.accuracy || 0 
        },
        modelB: { 
          id: formData.modelB, 
          accuracy: availableModels.find(m => m.id === formData.modelB)?.accuracy || 0 
        },
        status: 'running',
        startTime: Date.now()
      }]);

      setCreateDialogOpen(false);
      setFormData({
        modelA: '',
        modelB: '',
        duration: 7,
        trafficSplit: 50,
        minSampleSize: 100,
        significanceLevel: 0.05,
        description: ''
      });
    } catch (error) {
      console.error('Failed to create A/B test:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (testId: string) => {
    setLoading(true);
    try {
      const details = await mlPerformanceService.getABTestResults(testId);
      setTestDetails(details);
      setSelectedTest(testId);
      setDetailsDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch A/B test details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'stopped': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const calculateProgress = (test: any) => {
    if (test.status === 'completed') return 100;
    
    const now = Date.now();
    const elapsed = now - test.startTime;
    const duration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    return Math.min((elapsed / duration) * 100, 100);
  };

  const renderTestCard = (test: any) => {
    const progress = calculateProgress(test);
    const isRunning = test.status === 'running';
    
    return (
      <Grid item xs={12} md={6} lg={4} key={test.id}>
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Science />
                <Typography variant="h6">
                  A/B Test
                </Typography>
                <Chip 
                  label={test.status.toUpperCase()} 
                  color={getStatusColor(test.status)}
                  size="small"
                />
              </Box>
            }
            action={
              <IconButton onClick={() => handleViewDetails(test.id)}>
                <Info />
              </IconButton>
            }
          />
          
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Models Being Tested
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight="medium">
                    A: {test.modelA.id}
                  </Typography>
                  <Typography variant="body2" color="primary.main">
                    {(test.modelA.accuracy * 100).toFixed(1)}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight="medium">
                    B: {test.modelB.id}
                  </Typography>
                  <Typography variant="body2" color="secondary.main">
                    {(test.modelB.accuracy * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {isRunning && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Progress
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {progress.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={progress}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}

            <Typography variant="caption" color="text.secondary">
              Started: {new Date(test.startTime).toLocaleString()}
            </Typography>
          </CardContent>

          <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              size="small"
              onClick={() => handleViewDetails(test.id)}
              startIcon={<Assessment />}
            >
              View Results
            </Button>
            
            {isRunning && (
              <Button
                size="small"
                color="warning"
                startIcon={<Stop />}
              >
                Stop Test
              </Button>
            )}
          </Box>
        </Card>
      </Grid>
    );
  };

  const renderComparisonChart = () => {
    if (!testDetails) return null;

    const chartData = [
      {
        name: 'Model A',
        accuracy: testDetails.modelA.accuracy * 100,
        predictions: testDetails.modelA.predictions,
        modelId: testDetails.modelA.id
      },
      {
        name: 'Model B',
        accuracy: testDetails.modelB.accuracy * 100,
        predictions: testDetails.modelB.predictions,
        modelId: testDetails.modelB.id
      }
    ];

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Performance Comparison
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="accuracy" orientation="left" />
            <YAxis yAxisId="predictions" orientation="right" />
            <RechartsTooltip />
            <Legend />
            <Bar yAxisId="accuracy" dataKey="accuracy" fill={theme.palette.primary.main} name="Accuracy (%)" />
            <Bar yAxisId="predictions" dataKey="predictions" fill={theme.palette.secondary.main} name="Predictions" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  const renderTestDetails = () => {
    if (!testDetails) return null;

    const winner = testDetails.results?.winner;
    const pValue = testDetails.results?.pValue || 0;
    const isSignificant = pValue < 0.05;

    return (
      <Box>
        <Grid container spacing={3}>
          {/* Test Overview */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Test Overview
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip 
                  label={testDetails.status.toUpperCase()} 
                  color={getStatusColor(testDetails.status)}
                />
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body1">
                  {testDetails.endTime ? 
                    `${Math.round((testDetails.endTime - testDetails.startTime) / (1000 * 60 * 60 * 24))} days` :
                    'Ongoing'
                  }
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Started
                </Typography>
                <Typography variant="body1">
                  {new Date(testDetails.startTime).toLocaleString()}
                </Typography>
              </Box>

              {testDetails.endTime && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Ended
                  </Typography>
                  <Typography variant="body1">
                    {new Date(testDetails.endTime).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Grid>

          {/* Results */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Results
            </Typography>
            <Stack spacing={2}>
              {winner && (
                <Alert severity={isSignificant ? "success" : "info"}>
                  <Typography variant="body2" fontWeight="medium">
                    {winner === testDetails.modelA.id ? 'Model A' : 'Model B'} is performing better
                  </Typography>
                  <Typography variant="caption">
                    {isSignificant ? 'Statistically significant' : 'Not statistically significant'} 
                    (p-value: {pValue.toFixed(4)})
                  </Typography>
                </Alert>
              )}

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Model A Performance
                </Typography>
                <Typography variant="body1">
                  {(testDetails.modelA.accuracy * 100).toFixed(2)}% 
                  ({testDetails.modelA.predictions} predictions)
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Model B Performance
                </Typography>
                <Typography variant="body1">
                  {(testDetails.modelB.accuracy * 100).toFixed(2)}% 
                  ({testDetails.modelB.predictions} predictions)
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Confidence Level
                </Typography>
                <Typography variant="body1">
                  {((testDetails.results?.confidenceLevel || 0.95) * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        {renderComparisonChart()}
      </Box>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            A/B Testing Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compare model performance through controlled experiments
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          disabled={availableModels.length < 2}
        >
          Create A/B Test
        </Button>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Tests
              </Typography>
              <Typography variant="h4">
                {abTests.filter(t => t.status === 'running').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Completed Tests
              </Typography>
              <Typography variant="h4">
                {abTests.filter(t => t.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Available Models
              </Typography>
              <Typography variant="h4">
                {availableModels.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h4" color="success.main">
                {abTests.length > 0 ? 
                  Math.round((abTests.filter(t => t.status === 'completed').length / abTests.length) * 100) : 0
                }%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* A/B Tests Grid */}
      <Grid container spacing={3}>
        {abTests.map(renderTestCard)}
      </Grid>

      {abTests.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Science sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No A/B tests running
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first A/B test to compare model performance
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={availableModels.length < 2}
          >
            Create A/B Test
          </Button>
        </Box>
      )}

      {/* Create A/B Test Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create A/B Test</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Model A</InputLabel>
                <Select
                  value={formData.modelA}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelA: e.target.value }))}
                  label="Model A"
                >
                  {availableModels.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.id} ({(model.accuracy * 100).toFixed(1)}% accuracy)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Model B</InputLabel>
                <Select
                  value={formData.modelB}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelB: e.target.value }))}
                  label="Model B"
                >
                  {availableModels.filter(m => m.id !== formData.modelA).map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.id} ({(model.accuracy * 100).toFixed(1)}% accuracy)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Duration (days)"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 7 }))}
                inputProps={{ min: 1, max: 30 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Traffic Split for Model A (%)"
                type="number"
                value={formData.trafficSplit}
                onChange={(e) => setFormData(prev => ({ ...prev, trafficSplit: parseInt(e.target.value) || 50 }))}
                inputProps={{ min: 10, max: 90 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Minimum Sample Size"
                type="number"
                value={formData.minSampleSize}
                onChange={(e) => setFormData(prev => ({ ...prev, minSampleSize: parseInt(e.target.value) || 100 }))}
                inputProps={{ min: 50 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Significance Level"
                value={formData.significanceLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, significanceLevel: parseFloat(e.target.value) || 0.05 }))}
                helperText="Typically 0.05 (95% confidence)"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (optional)"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the purpose and expectations of this A/B test..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateTest} 
            variant="contained"
            disabled={!formData.modelA || !formData.modelB || formData.modelA === formData.modelB || loading}
          >
            Start A/B Test
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Details Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          A/B Test Results - {selectedTest}
        </DialogTitle>
        <DialogContent>
          {renderTestDetails()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            Close
          </Button>
          {testDetails?.status === 'completed' && (
            <Button variant="contained" startIcon={<Compare />}>
              Apply Winner
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ABTestManager;
