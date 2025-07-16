import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  TrendingUp,
  TrendingDown,
  Assessment,
  Science,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { MLModel, MLPrediction, BacktestResult } from '../types';
import { mlAPI } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
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
      id={`model-tabpanel-${index}`}
      aria-labelledby={`model-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MLModelDetailPage: React.FC = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  
  const [model, setModel] = useState<MLModel | null>(null);
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [backtests, setBacktests] = useState<BacktestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (modelId) {
      loadModelData();
    }
  }, [modelId]);

  const loadModelData = async () => {
    if (!modelId) return;
    
    try {
      setLoading(true);
      
      // Load model details
      const modelResponse = await mlAPI.getModel(modelId);
      setModel(modelResponse.model);
      
      // Load predictions
      const predictionsResponse = await mlAPI.getPredictions(modelId, { limit: 100 });
      setPredictions(predictionsResponse.predictions);
      
      // Load backtests
      const backtestsResponse = await mlAPI.getBacktests(modelId);
      setBacktests(backtestsResponse.backtests);
      
      setError(null);
    } catch (err: any) {
      setError('Failed to load model data: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const runPrediction = async () => {
    if (!model) return;
    
    try {
      await mlAPI.makePrediction(model.id, {});
      // Reload predictions
      const predictionsResponse = await mlAPI.getPredictions(model.id, { limit: 100 });
      setPredictions(predictionsResponse.predictions);
    } catch (err: any) {
      setError('Failed to run prediction: ' + (err.response?.data?.error || err.message));
    }
  };

  const getPredictionChartData = () => {
    const labels = predictions.slice(-30).map(p => 
      new Date(p.timestamp).toLocaleDateString()
    );
    
    const datasets: any[] = [];
    
    // Group predictions by symbol
    const predictionsBySymbol = predictions.slice(-30).reduce((acc, pred) => {
      if (!acc[pred.symbol]) acc[pred.symbol] = [];
      acc[pred.symbol].push(pred);
      return acc;
    }, {} as Record<string, MLPrediction[]>);
    
    const colors = ['#00ff88', '#ff3366', '#00aaff', '#ffaa00', '#ff6600'];
    let colorIndex = 0;
    
    Object.entries(predictionsBySymbol).forEach(([symbol, preds]) => {
      datasets.push({
        label: `${symbol} Predictions`,
        data: preds.map(p => p.prediction_value),
        borderColor: colors[colorIndex % colors.length],
        backgroundColor: colors[colorIndex % colors.length] + '20',
        tension: 0.1,
      });
      colorIndex++;
    });
    
    return { labels, datasets };
  };

  const getBacktestPerformanceData = () => {
    if (backtests.length === 0) return { labels: [], datasets: [] };
    
    const labels = backtests.map(b => 
      new Date(b.created_at).toLocaleDateString()
    );
    
    return {
      labels,
      datasets: [
        {
          label: 'Total Return (%)',
          data: backtests.map(b => b.total_return * 100),
          borderColor: '#00ff88',
          backgroundColor: '#00ff8820',
          tension: 0.1,
        },
        {
          label: 'Sharpe Ratio',
          data: backtests.map(b => b.sharpe_ratio),
          borderColor: '#00aaff',
          backgroundColor: '#00aaff20',
          tension: 0.1,
          yAxisID: 'y1',
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Model Performance',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!model) {
    return (
      <Box>
        <Alert severity="error">Model not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/ml')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" color="primary">
          {model.name}
        </Typography>
        <Box ml="auto">
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={runPrediction}
            disabled={model.training_status !== 'trained'}
          >
            Run Prediction
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Model Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Algorithm
              </Typography>
              <Chip
                label={model.algorithm_type.replace('_', ' ')}
                color="primary"
                variant="outlined"
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Accuracy
              </Typography>
              <Typography variant="h4" color="primary">
                {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : 'N/A'}
              </Typography>
              {model.accuracy && (
                <LinearProgress
                  variant="determinate"
                  value={model.accuracy * 100}
                  sx={{ mt: 1 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Predictions
              </Typography>
              <Typography variant="h4" color="primary">
                {model.prediction_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Status
              </Typography>
              <Chip
                label={model.training_status}
                color={model.training_status === 'trained' ? 'success' : 'warning'}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Predictions" />
          <Tab label="Backtests" />
          <Tab label="Performance Charts" />
          <Tab label="Model Details" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Recent Predictions
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Prediction</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Signal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {predictions.slice(0, 20).map((prediction) => (
                    <TableRow key={prediction.id}>
                      <TableCell>{prediction.symbol}</TableCell>
                      <TableCell>
                        <Typography
                          color={prediction.prediction_value > 0 ? 'success.main' : 'error.main'}
                        >
                          {prediction.prediction_value > 0 ? '+' : ''}
                          {(prediction.prediction_value * 100).toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <LinearProgress
                          variant="determinate"
                          value={prediction.confidence * 100}
                          sx={{ width: 100 }}
                        />
                        <Typography variant="caption">
                          {(prediction.confidence * 100).toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(prediction.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {prediction.prediction_value > 0.02 ? (
                          <Chip
                            icon={<TrendingUp />}
                            label="BUY"
                            color="success"
                            size="small"
                          />
                        ) : prediction.prediction_value < -0.02 ? (
                          <Chip
                            icon={<TrendingDown />}
                            label="SELL"
                            color="error"
                            size="small"
                          />
                        ) : (
                          <Chip
                            label="HOLD"
                            variant="outlined"
                            size="small"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Backtest Results
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Total Return</TableCell>
                    <TableCell>Sharpe Ratio</TableCell>
                    <TableCell>Max Drawdown</TableCell>
                    <TableCell>Win Rate</TableCell>
                    <TableCell>Trades</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backtests.map((backtest) => (
                    <TableRow key={backtest.id}>
                      <TableCell>
                        {new Date(backtest.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {backtest.start_date} to {backtest.end_date}
                      </TableCell>
                      <TableCell>
                        <Typography
                          color={backtest.total_return > 0 ? 'success.main' : 'error.main'}
                        >
                          {backtest.total_return > 0 ? '+' : ''}
                          {(backtest.total_return * 100).toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell>{backtest.sharpe_ratio.toFixed(2)}</TableCell>
                      <TableCell>
                        <Typography color="error.main">
                          -{(backtest.max_drawdown * 100).toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell>{(backtest.win_rate * 100).toFixed(1)}%</TableCell>
                      <TableCell>{backtest.total_trades}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Prediction Trends
                </Typography>
                {predictions.length > 0 ? (
                  <Line data={getPredictionChartData()} options={chartOptions} />
                ) : (
                  <Typography color="text.secondary">
                    No predictions available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Backtest Performance
                </Typography>
                {backtests.length > 0 ? (
                  <Line data={getBacktestPerformanceData()} options={chartOptions} />
                ) : (
                  <Typography color="text.secondary">
                    No backtest results available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Model Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Algorithm Type
                    </Typography>
                    <Typography>{model.algorithm_type.replace('_', ' ')}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Target Timeframe
                    </Typography>
                    <Typography>{model.target_timeframe}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Symbols
                    </Typography>
                    <Box>
                      {model.symbols.map(symbol => (
                        <Chip
                          key={symbol}
                          label={symbol}
                          size="small"
                          sx={{ mr: 1, mt: 1 }}
                        />
                      ))}
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography>
                      {new Date(model.created_at).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Trained
                    </Typography>
                    <Typography>
                      {model.last_trained ? 
                        new Date(model.last_trained).toLocaleDateString() : 
                        'Never'
                      }
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Performance Metrics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Accuracy
                    </Typography>
                    <Typography>
                      {model.accuracy ? `${(model.accuracy * 100).toFixed(2)}%` : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Precision Score
                    </Typography>
                    <Typography>
                      {model.precision_score ? `${(model.precision_score * 100).toFixed(2)}%` : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Predictions
                    </Typography>
                    <Typography>{model.prediction_count || 0}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Avg Confidence
                    </Typography>
                    <Typography>
                      {model.avg_confidence ? `${(model.avg_confidence * 100).toFixed(1)}%` : 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default MLModelDetailPage;