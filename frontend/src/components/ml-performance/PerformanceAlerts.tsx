import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Chip,
  Alert,
  Badge,
  Collapse,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Stack,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Notifications,
  NotificationsOff,
  Settings,
  Delete,
  Add,
  ExpandMore,
  ExpandLess,
  Schedule,
  Speed,
  Accuracy,
  Assessment,
  Memory,
  Timeline,
  NotificationImportant
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

import { useWebSocket } from '../../hooks/useWebSocket';

interface PerformanceAlert {
  id: string;
  type: 'accuracy_drop' | 'drift_detected' | 'high_latency' | 'memory_usage' | 'error_rate' | 'retraining_needed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  modelId: string;
  timestamp: number;
  acknowledged: boolean;
  value: number;
  threshold: number;
  trend: 'up' | 'down' | 'stable';
  metadata?: Record<string, any>;
}

interface AlertRule {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  threshold: number;
  severity: string;
  conditions: {
    metric: string;
    operator: string;
    value: number;
    timeWindow: number;
  };
}

interface PerformanceAlertsProps {
  alerts: PerformanceAlert[];
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

const PerformanceAlerts: React.FC<PerformanceAlertsProps> = ({
  alerts: initialAlerts,
  onAcknowledge,
  onDismiss
}) => {
  const theme = useTheme();
  const [alerts, setAlerts] = useState<PerformanceAlert[]>(initialAlerts);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newRuleOpen, setNewRuleOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // WebSocket for real-time alerts
  const { data: wsData, isConnected } = useWebSocket('/alerts');

  // Form state for new alert rule
  const [newRule, setNewRule] = useState({
    name: '',
    type: 'accuracy_drop',
    threshold: 0.1,
    severity: 'medium',
    metric: 'accuracy',
    operator: 'less_than',
    value: 0.85,
    timeWindow: 300 // 5 minutes
  });

  useEffect(() => {
    if (wsData && wsData.type === 'alert') {
      const newAlert: PerformanceAlert = wsData.alert;
      setAlerts(prev => [newAlert, ...prev]);
      
      // Show browser notification if enabled
      if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`A.A.I.T.I Alert: ${newAlert.title}`, {
          body: newAlert.description,
          icon: '/favicon.ico',
          tag: newAlert.id
        });
      }
    }
  }, [wsData, notificationsEnabled]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'accuracy_drop': return <TrendingDown />;
      case 'drift_detected': return <Timeline />;
      case 'high_latency': return <Speed />;
      case 'memory_usage': return <Memory />;
      case 'error_rate': return <Error />;
      case 'retraining_needed': return <Assessment />;
      default: return <Warning />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <Info />;
      case 'medium': return <Warning />;
      case 'high': return <Error />;
      case 'critical': return <NotificationImportant />;
      default: return <Info />;
    }
  };

  const handleToggleExpand = (alertId: string) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
    onAcknowledge(alertId);
  };

  const handleDismiss = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    onDismiss(alertId);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const handleToggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    if (enabled) {
      requestNotificationPermission();
    }
  };

  const handleCreateRule = () => {
    const rule: AlertRule = {
      id: `rule_${Date.now()}`,
      name: newRule.name,
      type: newRule.type,
      enabled: true,
      threshold: newRule.threshold,
      severity: newRule.severity,
      conditions: {
        metric: newRule.metric,
        operator: newRule.operator,
        value: newRule.value,
        timeWindow: newRule.timeWindow
      }
    };
    
    setAlertRules(prev => [...prev, rule]);
    setNewRuleOpen(false);
    setNewRule({
      name: '',
      type: 'accuracy_drop',
      threshold: 0.1,
      severity: 'medium',
      metric: 'accuracy',
      operator: 'less_than',
      value: 0.85,
      timeWindow: 300
    });
  };

  const filteredAlerts = alerts.filter(alert => {
    switch (selectedFilter) {
      case 'unacknowledged': return !alert.acknowledged;
      case 'critical': return alert.severity === 'critical';
      case 'high': return alert.severity === 'high';
      case 'medium': return alert.severity === 'medium';
      case 'low': return alert.severity === 'low';
      default: return true;
    }
  });

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;

  const renderAlertItem = (alert: PerformanceAlert) => {
    const isExpanded = expandedAlerts.has(alert.id);
    
    return (
      <Card key={alert.id} sx={{ mb: 1, border: alert.acknowledged ? 'none' : `2px solid ${theme.palette[getSeverityColor(alert.severity)].main}` }}>
        <ListItem>
          <ListItemAvatar>
            <Avatar 
              sx={{ 
                bgcolor: theme.palette[getSeverityColor(alert.severity)].main,
                opacity: alert.acknowledged ? 0.5 : 1
              }}
            >
              {getAlertIcon(alert.type)}
            </Avatar>
          </ListItemAvatar>
          
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ opacity: alert.acknowledged ? 0.7 : 1 }}>
                  {alert.title}
                </Typography>
                <Chip 
                  label={alert.severity.toUpperCase()} 
                  color={getSeverityColor(alert.severity)}
                  size="small"
                  variant={alert.acknowledged ? "outlined" : "filled"}
                />
                {alert.acknowledged && (
                  <Chip label="ACKNOWLEDGED" color="success" size="small" variant="outlined" />
                )}
              </Box>
            }
            secondary={
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ opacity: alert.acknowledged ? 0.7 : 1 }}>
                  {alert.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Model: {alert.modelId} • {new Date(alert.timestamp).toLocaleString()}
                </Typography>
              </Box>
            }
          />
          
          <ListItemSecondaryAction>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                size="small" 
                onClick={() => handleToggleExpand(alert.id)}
              >
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
              
              {!alert.acknowledged && (
                <Button
                  size="small"
                  onClick={() => handleAcknowledge(alert.id)}
                  startIcon={<CheckCircle />}
                >
                  Acknowledge
                </Button>
              )}
              
              <IconButton 
                size="small" 
                onClick={() => handleDismiss(alert.id)}
                color="error"
              >
                <Delete />
              </IconButton>
            </Box>
          </ListItemSecondaryAction>
        </ListItem>
        
        <Collapse in={isExpanded}>
          <CardContent sx={{ pt: 0 }}>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Current Value
                </Typography>
                <Typography variant="h6" color={getSeverityColor(alert.severity)}>
                  {alert.value.toFixed(4)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Threshold
                </Typography>
                <Typography variant="h6">
                  {alert.threshold.toFixed(4)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Trend
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {alert.trend === 'up' ? <TrendingUp color="success" /> : 
                   alert.trend === 'down' ? <TrendingDown color="error" /> : 
                   <Timeline color="action" />}
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {alert.trend}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Alert Type
                </Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                  {alert.type.replace('_', ' ')}
                </Typography>
              </Grid>
            </Grid>
            
            {alert.metadata && Object.keys(alert.metadata).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Additional Information
                </Typography>
                <Box sx={{ bgcolor: 'background.paper', p: 1, borderRadius: 1 }}>
                  <pre style={{ fontSize: '0.75rem', margin: 0, overflow: 'auto' }}>
                    {JSON.stringify(alert.metadata, null, 2)}
                  </pre>
                </Box>
              </Box>
            )}
          </CardContent>
        </Collapse>
      </Card>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Performance Alerts
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Real-time monitoring and alerting for ML models
            </Typography>
            {isConnected ? (
              <Chip label="Connected" color="success" size="small" />
            ) : (
              <Chip label="Disconnected" color="error" size="small" />
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={notificationsEnabled}
                onChange={(e) => handleToggleNotifications(e.target.checked)}
                icon={<NotificationsOff />}
                checkedIcon={<Notifications />}
              />
            }
            label="Notifications"
          />
          
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setSettingsOpen(true)}
          >
            Rules
          </Button>
        </Box>
      </Box>

      {/* Alert Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Alerts
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4">
                  {unacknowledgedCount}
                </Typography>
                {criticalCount > 0 && (
                  <Badge badgeContent={criticalCount} color="error">
                    <NotificationImportant color="error" />
                  </Badge>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Alerts (24h)
              </Typography>
              <Typography variant="h4">
                {alerts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Alert Rules
              </Typography>
              <Typography variant="h4">
                {alertRules.filter(r => r.enabled).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Response Time
              </Typography>
              <Typography variant="h4" color="success.main">
                2.3s
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Controls */}
      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter</InputLabel>
          <Select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            label="Filter"
          >
            <MenuItem value="all">All Alerts</MenuItem>
            <MenuItem value="unacknowledged">Unacknowledged</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Alerts List */}
      {filteredAlerts.length > 0 ? (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          {filteredAlerts.map(renderAlertItem)}
        </List>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No alerts found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedFilter === 'all' ? 
              'All systems are running smoothly' : 
              `No ${selectedFilter} alerts at this time`
            }
          </Typography>
        </Box>
      )}

      {/* Alert Rules Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Alert Rules
            <Button
              startIcon={<Add />}
              onClick={() => setNewRuleOpen(true)}
            >
              New Rule
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <List>
            {alertRules.map((rule) => (
              <ListItem key={rule.id}>
                <ListItemText
                  primary={rule.name}
                  secondary={`${rule.conditions.metric} ${rule.conditions.operator} ${rule.conditions.value}`}
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={rule.enabled}
                    onChange={(e) => {
                      setAlertRules(prev => prev.map(r => 
                        r.id === rule.id ? { ...r, enabled: e.target.checked } : r
                      ));
                    }}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          {alertRules.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No alert rules configured
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* New Rule Dialog */}
      <Dialog open={newRuleOpen} onClose={() => setNewRuleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Alert Rule</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name"
                value={newRule.name}
                onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Alert Type</InputLabel>
                <Select
                  value={newRule.type}
                  onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value }))}
                  label="Alert Type"
                >
                  <MenuItem value="accuracy_drop">Accuracy Drop</MenuItem>
                  <MenuItem value="drift_detected">Drift Detected</MenuItem>
                  <MenuItem value="high_latency">High Latency</MenuItem>
                  <MenuItem value="memory_usage">Memory Usage</MenuItem>
                  <MenuItem value="error_rate">Error Rate</MenuItem>
                  <MenuItem value="retraining_needed">Retraining Needed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={newRule.severity}
                  onChange={(e) => setNewRule(prev => ({ ...prev, severity: e.target.value }))}
                  label="Severity"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Metric</InputLabel>
                <Select
                  value={newRule.metric}
                  onChange={(e) => setNewRule(prev => ({ ...prev, metric: e.target.value }))}
                  label="Metric"
                >
                  <MenuItem value="accuracy">Accuracy</MenuItem>
                  <MenuItem value="precision">Precision</MenuItem>
                  <MenuItem value="recall">Recall</MenuItem>
                  <MenuItem value="f1_score">F1 Score</MenuItem>
                  <MenuItem value="latency">Latency</MenuItem>
                  <MenuItem value="memory">Memory Usage</MenuItem>
                  <MenuItem value="drift_score">Drift Score</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Operator</InputLabel>
                <Select
                  value={newRule.operator}
                  onChange={(e) => setNewRule(prev => ({ ...prev, operator: e.target.value }))}
                  label="Operator"
                >
                  <MenuItem value="less_than">Less Than</MenuItem>
                  <MenuItem value="greater_than">Greater Than</MenuItem>
                  <MenuItem value="equals">Equals</MenuItem>
                  <MenuItem value="not_equals">Not Equals</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Threshold Value"
                type="number"
                value={newRule.value}
                onChange={(e) => setNewRule(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Time Window (seconds)"
                type="number"
                value={newRule.timeWindow}
                onChange={(e) => setNewRule(prev => ({ ...prev, timeWindow: parseInt(e.target.value) || 300 }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRuleOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateRule} 
            variant="contained"
            disabled={!newRule.name}
          >
            Create Rule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PerformanceAlerts;
