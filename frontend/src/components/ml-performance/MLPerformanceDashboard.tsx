import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Alert,
  LinearProgress,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Analytics,
  Compare,
  Science,
  Timeline,
  Assessment,
  TableChart
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

import ModelPerformanceOverview from './ModelPerformanceOverview';
import MetricsCharts from './MetricsCharts';
import ModelDriftAnalysis from './ModelDriftAnalysis';
import ModelComparison from './ModelComparison';
import ABTestManager from './ABTestManager';
import PerformanceAlerts from './PerformanceAlerts';
import ModelPerformanceTable from './ModelPerformanceTable';

import { mlPerformanceService, TIMEFRAMES, TimeframeType } from '../../services/mlPerformanceService';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useMLPerformanceData } from '../../hooks/useMLPerformanceData';

interface DashboardData {
  overview: {
    totalModels: number;
    activeModels: number;
    modelsNeedingRetraining: number;
    totalPredictions: number;
    avgAccuracy: number;
  };
  models: Array<{
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
  }>;
  alerts: Array<{
    modelId: string;
    type: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  abTests: Array<{
    id: string;
    modelA: { id: string; accuracy: number };
    modelB: { id: string; accuracy: number };
    status: string;
    startTime: number;
  }>;
  timeframe: string;
}

const MLPerformanceDashboard: React.FC = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [timeframe, setTimeframe] = useState<TimeframeType>('24h');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // Enhanced ML performance data hook
  const {
    dashboard: dashboardData,
    historicalData,
    liveData,
    loading,
    error,
    lastUpdated,
    isConnected,
    refreshData,
    getTimeframeData,
    webSocketConnected
  } = useMLPerformanceData({
    autoRefresh,
    refreshInterval,
    enableWebSocket: true,
    timeframe,
    modelIds: selectedModels,
    metrics: ['accuracy', 'drift', 'latency', 'errorRate', 'precision', 'recall', 'f1Score']
  });

  // Handle timeframe changes
  const handleTimeframeChange = useCallback(async (newTimeframe: TimeframeType) => {
    setTimeframe(newTimeframe);
    try {
      await getTimeframeData(newTimeframe, selectedModels);
    } catch (error) {
      console.error('Failed to fetch data for new timeframe:', error);
    }
  }, [getTimeframeData, selectedModels]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleRefresh = () => {
    refreshData(true);
  };

  const handleModelSelection = (modelIds: string[]) => {
    setSelectedModels(modelIds);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'training': return 'warning';
      case 'error': return 'error';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'warning': return <Warning color="warning" />;
      case 'info': return <CheckCircle color="info" />;
      default: return <CheckCircle />;
    }
  };

  if (loading && !dashboardData) {
    return (
      <Box sx={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ width: '50%' }}>
          <Typography variant="h6" gutterBottom align="center">
            Loading ML Performance Dashboard...
          </Typography>
          <LinearProgress />
        </Box>
      </Box>
    );
  }

  if (error && !dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Assessment sx={{ fontSize: 32, color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              ML Performance Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Real-time model performance monitoring and analytics
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Connection Status */}
          <Tooltip title={webSocketConnected ? 'Real-time connection active' : 'Using polling mode'}>
            <Chip
              size="small"
              icon={webSocketConnected ? <CheckCircle /> : <ErrorIcon />}
              label={webSocketConnected ? 'Live' : 'Polling'}
              color={webSocketConnected ? 'success' : 'warning'}
              variant="outlined"
            />
          </Tooltip>

          {/* Last Updated */}
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </Typography>
          )}
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={timeframe}
              onChange={(e) => handleTimeframeChange(e.target.value as TimeframeType)}
              label="Timeframe"
            >
              {TIMEFRAMES.map((tf) => (
                <MenuItem key={tf.value} value={tf.value}>
                  {tf.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Settings">
            <IconButton onClick={() => setSettingsOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Overview Cards */}
      {dashboardData && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Models
                    </Typography>
                    <Typography variant="h4">
                      {dashboardData.overview.totalModels}
                    </Typography>
                  </Box>
                  <Analytics color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Active Models
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {dashboardData.overview.activeModels}
                    </Typography>
                  </Box>
                  <CheckCircle color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Need Retraining
                    </Typography>
                    <Typography 
                      variant="h4" 
                      color={dashboardData.overview.modelsNeedingRetraining > 0 ? "warning.main" : "text.primary"}
                    >
                      {dashboardData.overview.modelsNeedingRetraining}
                    </Typography>
                  </Box>
                  <Warning 
                    color={dashboardData.overview.modelsNeedingRetraining > 0 ? "warning" : "disabled"} 
                    sx={{ fontSize: 40 }} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total Predictions
                    </Typography>
                    <Typography variant="h4">
                      {dashboardData.overview.totalPredictions.toLocaleString()}
                    </Typography>
                  </Box>
                  <Timeline color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Avg Accuracy
                    </Typography>
                    <Typography 
                      variant="h4"
                      color={dashboardData.overview.avgAccuracy >= 0.8 ? "success.main" : 
                             dashboardData.overview.avgAccuracy >= 0.7 ? "warning.main" : "error.main"}
                    >
                      {(dashboardData.overview.avgAccuracy * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  {dashboardData.overview.avgAccuracy >= 0.8 ? 
                    <TrendingUp color="success" sx={{ fontSize: 40 }} /> :
                    <TrendingDown color="error" sx={{ fontSize: 40 }} />
                  }
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Alerts Section */}
      {dashboardData && dashboardData.alerts.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Alerts
          </Typography>
          <Stack spacing={1}>
            {dashboardData.alerts.slice(0, 3).map((alert, index) => (
              <Alert 
                key={index}
                severity={alert.severity}
                icon={getAlertIcon(alert.severity)}
                sx={{ '& .MuiAlert-message': { width: '100%' } }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Model: {alert.modelId} • {new Date(alert.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                  <Chip 
                    label={alert.type} 
                    size="small" 
                    color={alert.severity === 'critical' ? 'error' : 
                           alert.severity === 'warning' ? 'warning' : 'info'}
                  />
                </Box>
              </Alert>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={handleTabChange}>
            <Tab label="Overview" icon={<Assessment />} />
            <Tab label="Performance Charts" icon={<Timeline />} />
            <Tab label="Drift Analysis" icon={<TrendingDown />} />
            <Tab label="Model Comparison" icon={<Compare />} />
            <Tab label="A/B Testing" icon={<Science />} />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Alerts
                  {dashboardData && dashboardData.alerts.filter(a => a.severity === 'critical').length > 0 && (
                    <Chip 
                      label={dashboardData.alerts.filter(a => a.severity === 'critical').length} 
                      color="error" 
                      size="small" 
                    />
                  )}
                </Box>
              } 
              icon={<Warning />} 
            />
            <Tab label="Model Table" icon={<TableChart />} />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {selectedTab === 0 && dashboardData && (
            <ModelPerformanceOverview 
              data={dashboardData}
              onModelSelect={handleModelSelection}
            />
          )}
          
          {selectedTab === 1 && dashboardData && (
            <MetricsCharts 
              models={dashboardData.models}
              timeframe={timeframe}
              selectedModels={selectedModels}
              historicalData={historicalData}
              liveData={liveData}
            />
          )}
          
          {selectedTab === 2 && dashboardData && (
            <ModelDriftAnalysis 
              models={dashboardData.models}
              selectedModels={selectedModels}
            />
          )}
          
          {selectedTab === 3 && dashboardData && (
            <ModelComparison 
              models={dashboardData.models}
              selectedModels={selectedModels}
              onModelSelect={handleModelSelection}
            />
          )}
          
          {selectedTab === 4 && dashboardData && (
            <ABTestManager 
              abTests={dashboardData.abTests}
              availableModels={dashboardData.models}
            />
          )}
          
          {selectedTab === 5 && dashboardData && (
            <PerformanceAlerts 
              alerts={dashboardData.alerts.map(alert => ({
                id: `alert_${alert.timestamp}`,
                type: alert.type as any,
                severity: alert.severity === 'critical' ? 'critical' : 
                         alert.severity === 'warning' ? 'high' : 'low',
                title: alert.message,
                description: `Alert detected for model ${alert.modelId}`,
                modelId: alert.modelId,
                timestamp: alert.timestamp,
                acknowledged: false,
                value: 0,
                threshold: 0,
                trend: 'down' as const
              }))}
              onAcknowledge={(alertId) => console.log('Acknowledged:', alertId)}
              onDismiss={(alertId) => console.log('Dismissed:', alertId)}
            />
          )}
          
          {selectedTab === 6 && dashboardData && (
            <ModelPerformanceTable 
              models={dashboardData.models.map(model => ({
                ...model,
                precision: 0.85,
                recall: 0.82,
                f1Score: 0.835,
                latency: 45,
                memoryUsage: 512 * 1024 * 1024, // 512MB
                errorRate: 0.02,
                createdAt: '2024-01-01T00:00:00Z',
                trainingTime: 1800,
                datasetSize: 10000,
                features: 50,
                hyperparameters: {},
                needsRetraining: model.drift > 0.3,
                metrics: {
                  auc: 0.92,
                  mae: 0.05,
                  mse: 0.003,
                  r2: 0.88
                }
              }))}
              onViewDetails={(modelId) => console.log('View details:', modelId)}
              onEditModel={(modelId) => console.log('Edit model:', modelId)}
              onDeleteModel={(modelId) => console.log('Delete model:', modelId)}
              onCompareModels={(modelIds) => {
                setSelectedModels(modelIds);
                setSelectedTab(3); // Switch to comparison tab
              }}
              onRetrainModel={(modelId) => console.log('Retrain model:', modelId)}
            />
          )}
        </Box>
      </Paper>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dashboard Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label="Auto Refresh"
            />
            
            <FormControl fullWidth>
              <InputLabel>Refresh Interval</InputLabel>
              <Select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                label="Refresh Interval"
                disabled={!autoRefresh}
              >
                <MenuItem value={10000}>10 seconds</MenuItem>
                <MenuItem value={30000}>30 seconds</MenuItem>
                <MenuItem value={60000}>1 minute</MenuItem>
                <MenuItem value={300000}>5 minutes</MenuItem>
              </Select>
            </FormControl>
            
            <Divider />
            
            <Typography variant="h6">Performance Thresholds</Typography>
            <Typography variant="body2" color="text.secondary">
              Configure alert thresholds for model performance monitoring
            </Typography>
            
            {/* Additional settings can be added here */}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Real-time Status Indicator */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          px: 2,
          py: 1,
          borderRadius: 2,
          boxShadow: 2,
          border: 1,
          borderColor: 'divider'
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: socket?.connected ? 'success.main' : 'error.main',
            animation: socket?.connected ? 'pulse 2s infinite' : 'none'
          }}
        />
        <Typography variant="caption">
          {socket?.connected ? 'Real-time' : 'Disconnected'}
        </Typography>
      </Box>
    </Box>
  );
};

export default MLPerformanceDashboard;
