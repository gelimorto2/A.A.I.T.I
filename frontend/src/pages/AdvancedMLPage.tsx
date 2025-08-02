import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Slider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Add,
  Assessment,
  Security,
  MonetizationOn,
  Timeline,
  Analytics,
  ShowChart,
  AccountBalance,
  Warning,
  CheckCircle,
  Info,
  PlayArrow,
  Refresh,
} from '@mui/icons-material';
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
      id={`advanced-ml-tabpanel-${index}`}
      aria-labelledby={`advanced-ml-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdvancedMLPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Real-time Model Adaptation State
  const [adaptationConfig, setAdaptationConfig] = useState({
    performanceThreshold: 0.15,
    volatilityThreshold: 0.25,
    evaluationWindow: 50,
    retrainCooldown: 3600000,
  });

  // GARCH Model State
  const [garchConfig, setGarchConfig] = useState({
    symbol: 'BTC',
    timeframe: '1d',
    p: 1,
    q: 1,
    trainingPeriodDays: 365,
  });
  const [garchModels, setGarchModels] = useState<any[]>([]);

  // VAR Model State
  const [varConfig, setVarConfig] = useState({
    symbols: ['BTC', 'ETH'],
    timeframe: '1d',
    lag: 2,
    trainingPeriodDays: 365,
  });
  const [varModels, setVarModels] = useState<any[]>([]);

  // Change Point Detection State
  const [changePointConfig, setChangePointConfig] = useState({
    symbol: 'BTC',
    timeframe: '1d',
    method: 'cusum',
    threshold: 5,
    minSegmentLength: 10,
    periodDays: 365,
  });
  const [changePointResults, setChangePointResults] = useState<any[]>([]);

  // Monte Carlo Simulation State
  const [monteCarloConfig, setMonteCarloConfig] = useState({
    symbols: ['BTC', 'ETH', 'ADA'],
    portfolioWeights: [0.5, 0.3, 0.2],
    simulations: 10000,
    timeHorizon: 252,
    confidenceLevel: 0.05,
    trainingPeriodDays: 365,
  });
  const [monteCarloResults, setMonteCarloResults] = useState<any[]>([]);

  // Risk Parity State
  const [riskParityConfig, setRiskParityConfig] = useState({
    symbols: ['BTC', 'ETH', 'ADA', 'SOL'],
    timeframe: '1d',
    maxIterations: 1000,
    tolerance: 1e-8,
    trainingPeriodDays: 365,
  });
  const [riskParityResults, setRiskParityResults] = useState<any[]>([]);

  // Hedge Strategy State
  const [hedgeConfig, setHedgeConfig] = useState({
    portfolio: { 'BTC': 0.6, 'ETH': 0.4 },
    hedgeRatio: 0.5,
    rebalanceThreshold: 0.1,
    volatilityTarget: 0.2,
  });
  const [hedgeStrategies, setHedgeStrategies] = useState<any[]>([]);

  useEffect(() => {
    loadAnalysisResults();
    loadHedgeStrategies();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 5000);
  };

  const loadAnalysisResults = async () => {
    try {
      const response = await mlAPI.getAnalysisResults({ limit: 20 });
      const results = response.results;
      
      setChangePointResults(results.filter((r: any) => r.analysis_type === 'change_points'));
      setMonteCarloResults(results.filter((r: any) => r.analysis_type === 'monte_carlo'));
      setRiskParityResults(results.filter((r: any) => r.analysis_type === 'risk_parity'));
    } catch (error) {
      console.error('Error loading analysis results:', error);
    }
  };

  const loadHedgeStrategies = async () => {
    try {
      const response = await mlAPI.getHedgeStrategies();
      setHedgeStrategies(response.strategies);
    } catch (error) {
      console.error('Error loading hedge strategies:', error);
    }
  };

  const handleCreateGARCH = async () => {
    setLoading(true);
    try {
      const response = await mlAPI.createGARCHModel({
        symbol: garchConfig.symbol,
        timeframe: garchConfig.timeframe,
        parameters: {
          p: garchConfig.p,
          q: garchConfig.q,
        },
        trainingPeriodDays: garchConfig.trainingPeriodDays,
      });
      
      setGarchModels([...garchModels, response.model]);
      showSuccess(`GARCH(${garchConfig.p},${garchConfig.q}) model created successfully for ${garchConfig.symbol}`);
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to create GARCH model');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVAR = async () => {
    setLoading(true);
    try {
      const response = await mlAPI.createVARModel({
        symbols: varConfig.symbols,
        timeframe: varConfig.timeframe,
        parameters: {
          lag: varConfig.lag,
        },
        trainingPeriodDays: varConfig.trainingPeriodDays,
      });
      
      setVarModels([...varModels, response.model]);
      showSuccess(`VAR(${varConfig.lag}) model created successfully for ${varConfig.symbols.join(', ')}`);
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to create VAR model');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectChangePoints = async () => {
    setLoading(true);
    try {
      const response = await mlAPI.detectChangePoints({
        symbol: changePointConfig.symbol,
        timeframe: changePointConfig.timeframe,
        method: changePointConfig.method as any,
        parameters: {
          threshold: changePointConfig.threshold,
          minSegmentLength: changePointConfig.minSegmentLength,
        },
        periodDays: changePointConfig.periodDays,
      });
      
      setChangePointResults([response.analysis, ...changePointResults]);
      showSuccess(`Change point detection completed for ${changePointConfig.symbol}. Found ${response.analysis.changePoints.length} change points.`);
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to detect change points');
    } finally {
      setLoading(false);
    }
  };

  const handleRunMonteCarlo = async () => {
    setLoading(true);
    try {
      const response = await mlAPI.runMonteCarloSimulation({
        portfolioWeights: monteCarloConfig.portfolioWeights,
        symbols: monteCarloConfig.symbols,
        parameters: {
          simulations: monteCarloConfig.simulations,
          timeHorizon: monteCarloConfig.timeHorizon,
          confidenceLevel: monteCarloConfig.confidenceLevel,
        },
        trainingPeriodDays: monteCarloConfig.trainingPeriodDays,
      });
      
      setMonteCarloResults([response.simulation, ...monteCarloResults]);
      showSuccess(`Monte Carlo simulation completed with ${monteCarloConfig.simulations} scenarios.`);
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to run Monte Carlo simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeRiskParity = async () => {
    setLoading(true);
    try {
      const response = await mlAPI.optimizeRiskParity({
        symbols: riskParityConfig.symbols,
        timeframe: riskParityConfig.timeframe,
        parameters: {
          maxIterations: riskParityConfig.maxIterations,
          tolerance: riskParityConfig.tolerance,
        },
        trainingPeriodDays: riskParityConfig.trainingPeriodDays,
      });
      
      setRiskParityResults([response.optimization, ...riskParityResults]);
      showSuccess(`Risk parity optimization completed for ${riskParityConfig.symbols.length} assets.`);
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to optimize risk parity portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHedgeStrategy = async () => {
    setLoading(true);
    try {
      const response = await mlAPI.createHedgeStrategy({
        portfolio: hedgeConfig.portfolio,
        parameters: {
          hedgeRatio: hedgeConfig.hedgeRatio,
          rebalanceThreshold: hedgeConfig.rebalanceThreshold,
          volatilityTarget: hedgeConfig.volatilityTarget,
        },
      });
      
      setHedgeStrategies([response.strategy, ...hedgeStrategies]);
      showSuccess('Dynamic hedging strategy created successfully.');
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to create hedge strategy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Analytics color="primary" fontSize="large" />
        Advanced ML & AI Intelligence
        <Chip label="NEW" color="success" size="small" />
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Professional-grade machine learning and AI capabilities for advanced trading intelligence, 
        risk management, and portfolio optimization.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Real-time Adaptation" icon={<Refresh />} />
          <Tab label="GARCH Models" icon={<Timeline />} />
          <Tab label="VAR Analysis" icon={<ShowChart />} />
          <Tab label="Change Points" icon={<Assessment />} />
          <Tab label="Monte Carlo" icon={<Security />} />
          <Tab label="Risk Parity" icon={<AccountBalance />} />
          <Tab label="Dynamic Hedging" icon={<MonetizationOn />} />
        </Tabs>
      </Box>

      {/* Real-time Model Adaptation */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Real-time Model Adaptation System
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Automatically monitor model performance and retrain when degradation is detected.
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Configuration</Typography>
                  
                  <TextField
                    label="Performance Threshold"
                    type="number"
                    value={adaptationConfig.performanceThreshold}
                    onChange={(e) => setAdaptationConfig({
                      ...adaptationConfig,
                      performanceThreshold: parseFloat(e.target.value)
                    })}
                    helperText="Degradation threshold (0.15 = 15%)"
                    fullWidth
                    margin="normal"
                    inputProps={{ step: 0.01, min: 0.01, max: 1 }}
                  />
                  
                  <TextField
                    label="Volatility Threshold"
                    type="number"
                    value={adaptationConfig.volatilityThreshold}
                    onChange={(e) => setAdaptationConfig({
                      ...adaptationConfig,
                      volatilityThreshold: parseFloat(e.target.value)
                    })}
                    helperText="High volatility threshold for model switching"
                    fullWidth
                    margin="normal"
                    inputProps={{ step: 0.01, min: 0.01, max: 1 }}
                  />
                  
                  <TextField
                    label="Evaluation Window"
                    type="number"
                    value={adaptationConfig.evaluationWindow}
                    onChange={(e) => setAdaptationConfig({
                      ...adaptationConfig,
                      evaluationWindow: parseInt(e.target.value)
                    })}
                    helperText="Number of recent predictions to evaluate"
                    fullWidth
                    margin="normal"
                    inputProps={{ min: 10, max: 200 }}
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => showSuccess('Adaptation system would be initialized for selected models')}
                    disabled={loading}
                  >
                    Initialize Adaptation
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Adaptation Status
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Performance Monitoring"
                      secondary="Real-time performance tracking active"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <Info color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Market Volatility Detection"
                      secondary="Automatic model selection based on market conditions"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <Warning color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Degradation Detection"
                      secondary="Automatic retraining when performance drops"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* GARCH Models */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Create GARCH Model
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  GARCH models for volatility prediction and risk assessment.
                </Typography>

                <TextField
                  label="Symbol"
                  value={garchConfig.symbol}
                  onChange={(e) => setGarchConfig({ ...garchConfig, symbol: e.target.value })}
                  fullWidth
                  margin="normal"
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel>Timeframe</InputLabel>
                  <Select
                    value={garchConfig.timeframe}
                    onChange={(e) => setGarchConfig({ ...garchConfig, timeframe: e.target.value })}
                  >
                    <MenuItem value="1h">1 Hour</MenuItem>
                    <MenuItem value="4h">4 Hours</MenuItem>
                    <MenuItem value="1d">1 Day</MenuItem>
                    <MenuItem value="1w">1 Week</MenuItem>
                  </Select>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="ARCH Order (p)"
                      type="number"
                      value={garchConfig.p}
                      onChange={(e) => setGarchConfig({ ...garchConfig, p: parseInt(e.target.value) })}
                      fullWidth
                      margin="normal"
                      inputProps={{ min: 1, max: 5 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="GARCH Order (q)"
                      type="number"
                      value={garchConfig.q}
                      onChange={(e) => setGarchConfig({ ...garchConfig, q: parseInt(e.target.value) })}
                      fullWidth
                      margin="normal"
                      inputProps={{ min: 1, max: 5 }}
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateGARCH}
                  disabled={loading}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Create GARCH Model'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  GARCH Models
                </Typography>
                
                {garchModels.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No GARCH models created yet. Create your first model to get started.
                  </Typography>
                ) : (
                  <List>
                    {garchModels.map((model, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={model.name}
                          secondary={`AIC: ${model.aic?.toFixed(2)} | Log-Likelihood: ${model.logLikelihood?.toFixed(2)}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* VAR Analysis */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Create VAR Model
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Vector Autoregression for multi-asset analysis and forecasting.
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Select Assets (Current: {varConfig.symbols.join(', ')})
                  </Typography>
                  
                  {['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'LINK'].map((symbol) => (
                    <FormControlLabel
                      key={symbol}
                      control={
                        <Switch
                          checked={varConfig.symbols.includes(symbol)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setVarConfig({
                                ...varConfig,
                                symbols: [...varConfig.symbols, symbol]
                              });
                            } else {
                              setVarConfig({
                                ...varConfig,
                                symbols: varConfig.symbols.filter(s => s !== symbol)
                              });
                            }
                          }}
                        />
                      }
                      label={symbol}
                    />
                  ))}
                </Box>

                <TextField
                  label="Lag Order"
                  type="number"
                  value={varConfig.lag}
                  onChange={(e) => setVarConfig({ ...varConfig, lag: parseInt(e.target.value) })}
                  fullWidth
                  margin="normal"
                  inputProps={{ min: 1, max: 10 }}
                  helperText="Number of lagged values to include"
                />

                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateVAR}
                  disabled={loading || varConfig.symbols.length < 2}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Create VAR Model'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  VAR Models
                </Typography>
                
                {varModels.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No VAR models created yet. Create your first model to analyze multi-asset relationships.
                  </Typography>
                ) : (
                  <List>
                    {varModels.map((model, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={model.name}
                          secondary={`Assets: ${model.symbols?.length} | Lag: ${model.lag}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Change Point Detection */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Change Point Detection
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Detect structural breaks and regime changes in time series data.
                </Typography>

                <TextField
                  label="Symbol"
                  value={changePointConfig.symbol}
                  onChange={(e) => setChangePointConfig({ ...changePointConfig, symbol: e.target.value })}
                  fullWidth
                  margin="normal"
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel>Detection Method</InputLabel>
                  <Select
                    value={changePointConfig.method}
                    onChange={(e) => setChangePointConfig({ ...changePointConfig, method: e.target.value })}
                  >
                    <MenuItem value="cusum">CUSUM</MenuItem>
                    <MenuItem value="pelt">PELT</MenuItem>
                    <MenuItem value="binseg">Binary Segmentation</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Threshold"
                  type="number"
                  value={changePointConfig.threshold}
                  onChange={(e) => setChangePointConfig({ ...changePointConfig, threshold: parseFloat(e.target.value) })}
                  fullWidth
                  margin="normal"
                  inputProps={{ min: 1, max: 20, step: 0.5 }}
                  helperText="Detection sensitivity threshold"
                />

                <Button
                  variant="contained"
                  startIcon={<Assessment />}
                  onClick={handleDetectChangePoints}
                  disabled={loading}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Detect Change Points'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Change Point Results
                </Typography>
                
                {changePointResults.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No change point analyses yet. Run your first analysis to identify structural breaks.
                  </Typography>
                ) : (
                  <List>
                    {changePointResults.map((result, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`${result.symbol} - ${result.method.toUpperCase()}`}
                          secondary={`Change Points: ${result.changePoints?.length} | Confidence: ${(result.confidence * 100)?.toFixed(1)}%`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Monte Carlo Simulation */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monte Carlo Simulation
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Portfolio stress testing with thousands of market scenarios.
                </Typography>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Portfolio Weights
                </Typography>
                {monteCarloConfig.symbols.map((symbol, index) => (
                  <Box key={symbol} sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      {symbol}: {(monteCarloConfig.portfolioWeights[index] * 100).toFixed(1)}%
                    </Typography>
                    <Slider
                      value={monteCarloConfig.portfolioWeights[index]}
                      onChange={(e, value) => {
                        const newWeights = [...monteCarloConfig.portfolioWeights];
                        newWeights[index] = value as number;
                        setMonteCarloConfig({ ...monteCarloConfig, portfolioWeights: newWeights });
                      }}
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${(value * 100).toFixed(1)}%`}
                    />
                  </Box>
                ))}

                <TextField
                  label="Number of Simulations"
                  type="number"
                  value={monteCarloConfig.simulations}
                  onChange={(e) => setMonteCarloConfig({ ...monteCarloConfig, simulations: parseInt(e.target.value) })}
                  fullWidth
                  margin="normal"
                  inputProps={{ min: 1000, max: 50000, step: 1000 }}
                />

                <Button
                  variant="contained"
                  startIcon={<Security />}
                  onClick={handleRunMonteCarlo}
                  disabled={loading}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Run Monte Carlo Simulation'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Simulation Results
                </Typography>
                
                {monteCarloResults.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No simulations run yet. Run your first Monte Carlo simulation for risk analysis.
                  </Typography>
                ) : (
                  <List>
                    {monteCarloResults.map((result, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`Portfolio ${index + 1}`}
                          secondary={
                            <Box>
                              <div>Expected Return: {(result.results?.expectedReturn * 100)?.toFixed(2)}%</div>
                              <div>VaR (95%): {(result.results?.valueAtRisk * 100)?.toFixed(2)}%</div>
                              <div>Max Drawdown: {(result.results?.maxDrawdown * 100)?.toFixed(2)}%</div>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Risk Parity */}
      <TabPanel value={tabValue} index={5}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Parity Optimization
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Optimal portfolio allocation based on equal risk contribution.
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Select Assets for Risk Parity (Current: {riskParityConfig.symbols.join(', ')})
                  </Typography>
                  
                  {['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'LINK', 'MATIC', 'AVAX'].map((symbol) => (
                    <FormControlLabel
                      key={symbol}
                      control={
                        <Switch
                          checked={riskParityConfig.symbols.includes(symbol)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRiskParityConfig({
                                ...riskParityConfig,
                                symbols: [...riskParityConfig.symbols, symbol]
                              });
                            } else {
                              setRiskParityConfig({
                                ...riskParityConfig,
                                symbols: riskParityConfig.symbols.filter(s => s !== symbol)
                              });
                            }
                          }}
                        />
                      }
                      label={symbol}
                    />
                  ))}
                </Box>

                <Button
                  variant="contained"
                  startIcon={<AccountBalance />}
                  onClick={handleOptimizeRiskParity}
                  disabled={loading || riskParityConfig.symbols.length < 2}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Optimize Risk Parity'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Parity Results
                </Typography>
                
                {riskParityResults.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No risk parity optimizations yet. Run your first optimization for balanced risk allocation.
                  </Typography>
                ) : (
                  <List>
                    {riskParityResults.map((result, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`Optimization ${index + 1}`}
                          secondary={
                            <Box>
                              <div>Portfolio Risk: {(result.portfolioRisk * 100)?.toFixed(2)}%</div>
                              <div>Diversification Ratio: {result.diversificationRatio?.toFixed(2)}</div>
                              <div>Assets: {result.weights?.length}</div>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Dynamic Hedging */}
      <TabPanel value={tabValue} index={6}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Create Hedge Strategy
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Dynamic hedging strategies for risk management and portfolio protection.
                </Typography>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Portfolio Allocation
                </Typography>
                {Object.entries(hedgeConfig.portfolio).map(([asset, weight]) => (
                  <Box key={asset} sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      {asset}: {(weight * 100).toFixed(1)}%
                    </Typography>
                    <Slider
                      value={weight}
                      onChange={(e, value) => {
                        setHedgeConfig({
                          ...hedgeConfig,
                          portfolio: {
                            ...hedgeConfig.portfolio,
                            [asset]: value as number
                          }
                        });
                      }}
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${(value * 100).toFixed(1)}%`}
                    />
                  </Box>
                ))}

                <TextField
                  label="Hedge Ratio"
                  type="number"
                  value={hedgeConfig.hedgeRatio}
                  onChange={(e) => setHedgeConfig({ ...hedgeConfig, hedgeRatio: parseFloat(e.target.value) })}
                  fullWidth
                  margin="normal"
                  inputProps={{ min: 0, max: 1, step: 0.1 }}
                  helperText="Proportion of portfolio to hedge (0.5 = 50%)"
                />

                <Button
                  variant="contained"
                  startIcon={<MonetizationOn />}
                  onClick={handleCreateHedgeStrategy}
                  disabled={loading}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Create Hedge Strategy'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Hedge Strategies
                </Typography>
                
                {hedgeStrategies.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No hedge strategies created yet. Create your first strategy for portfolio protection.
                  </Typography>
                ) : (
                  <List>
                    {hedgeStrategies.map((strategy, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={strategy.name}
                          secondary={
                            <Box>
                              <div>Type: {strategy.type}</div>
                              <div>Hedge Ratio: {(strategy.hedgeRatio * 100)?.toFixed(1)}%</div>
                              <div>Status: {strategy.status}</div>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}