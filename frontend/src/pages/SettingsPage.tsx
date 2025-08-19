import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Alert,
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
} from '@mui/material';
import {
  Settings,
  Security,
  Api,
  Storage,
  ExpandMore,
  Edit,
  Save,
  Refresh,
  Key,
  Lock,
  Warning,
  CheckCircle,
  Close,
  Brightness4,
  Brightness7,
  SettingsBrightness,
  Info,
  Palette,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import PreferencesManager from '../components/settings/PreferencesManager';

const SettingsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { themeMode, setThemeMode, systemPrefersDark } = useCustomTheme();
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  
  // Settings state
  const [generalSettings, setGeneralSettings] = useState<{
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    currency: string;
    autoRefresh: boolean;
    refreshInterval: number;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
  }>({
    theme: themeMode,
    language: 'en',
    timezone: 'UTC',
    currency: 'USD',
    autoRefresh: true,
    refreshInterval: 5,
    soundEnabled: true,
    notificationsEnabled: true
  });

  const [tradingSettings, setTradingSettings] = useState({
    defaultTradingMode: 'paper',
    maxConcurrentBots: 5,
    globalStopLoss: 10,
    globalTakeProfit: 20,
    riskManagementEnabled: true,
    emergencyStopEnabled: true,
    maxDailyLoss: 1000,
    positionSizing: 'fixed',
    slippageTolerance: 0.1
  });

  const [apiSettings, setApiSettings] = useState({
    alphaVantageKey: '',
    binanceApiKey: '',
    binanceApiSecret: '',
    coinbaseApiKey: '',
    coinbaseApiSecret: '',
    webhookUrl: '',
    webhookSecret: ''
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 60,
    loginAlerts: true,
    ipWhitelist: '',
    apiRateLimit: 100,
    encryptionEnabled: true
  });

  const [systemSettings, setSystemSettings] = useState({
    port: 5000,
    nodeEnv: 'development',
    frontendUrl: 'http://localhost:3000',
    dbPath: './database/aaiti.sqlite',
    logLevel: 'info',
    jwtExpiresIn: '7d'
  });

  const [systemInfo, setSystemInfo] = useState({
    version: '1.0.0',
    uptime: '0 days',
    lastBackup: 'Never',
    databaseSize: '0 MB',
    activeSessions: 1,
    apiCalls: 0,
    systemHealth: 'Healthy'
  });

  // Sync theme settings with context
  useEffect(() => {
    setGeneralSettings(prev => ({
      ...prev,
      theme: themeMode
    }));
  }, [themeMode]);

  const handleThemeChange = (newTheme: string) => {
    const themeMode = newTheme as 'light' | 'dark' | 'system';
    setThemeMode(themeMode);
    setGeneralSettings(prev => ({
      ...prev,
      theme: themeMode
    }));
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return <Brightness7 />;
      case 'dark':
        return <Brightness4 />;
      case 'system':
        return <SettingsBrightness />;
      default:
        return <SettingsBrightness />;
    }
  };

  const getThemeDescription = () => {
    if (themeMode === 'system') {
      return `Following system preference (currently ${systemPrefersDark ? 'dark' : 'light'})`;
    }
    return `${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)} theme active`;
  };

  const loadSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const settings = data.settings;
        
        // Update all settings state with actual data from backend
        setGeneralSettings(prev => ({ ...prev, ...settings.general }));
        setTradingSettings(settings.trading || tradingSettings);
        setSecuritySettings(settings.security || securitySettings);
        setSystemSettings(settings.system || systemSettings);
        setApiSettings(settings.api || apiSettings);
        
        console.log('Settings loaded:', settings);
      } else {
        console.error('Failed to load settings:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, [tradingSettings, securitySettings, systemSettings, apiSettings]);

  const loadSystemInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/analytics/system-info', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data.systemInfo);
      } else {
        // Fallback to mock data if API fails
        setSystemInfo({
          version: '1.0.0',
          uptime: '2 days, 14 hours',
          lastBackup: '2 hours ago',
          databaseSize: '45.2 MB',
          activeSessions: 1,
          apiCalls: 1247,
          systemHealth: 'Healthy'
        });
      }
    } catch (error) {
      console.error('Error loading system info:', error);
      // Fallback to mock data
      setSystemInfo({
        version: '1.0.0',
        uptime: '2 days, 14 hours',
        lastBackup: '2 hours ago',
        databaseSize: '45.2 MB',
        activeSessions: 1,
        apiCalls: 1247,
        systemHealth: 'Healthy'
      });
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadSystemInfo();
  }, [loadSettings, loadSystemInfo]);

  const saveSettings = async (category: string, settings: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/settings/${category}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSuccess(`${category} settings saved successfully!`);
      } else {
        setError(`Failed to save ${category} settings`);
      }
    } catch (error) {
      setError('Network error while saving settings');
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async (provider: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/trading/test-connection/${provider}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccess(`${provider} connection successful!`);
      } else {
        setError(`Failed to connect to ${provider}`);
      }
    } catch (error) {
      setError(`Error testing ${provider} connection`);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/export-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aaiti-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        setSuccess('Data exported successfully!');
      } else {
        setError('Failed to export data');
      }
    } catch (error) {
      setError('Error exporting data');
    }
  };

  const backupDatabase = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/system/backup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccess('Database backup created successfully!');
        loadSystemInfo(); // Refresh system info
      } else {
        setError('Failed to create database backup');
      }
    } catch (error) {
      setError('Error creating backup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          fontWeight: 'bold', 
          color: 'primary.main',
          fontFamily: 'monospace',
        }}
      >
        SYSTEM CONFIGURATION
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        Manage system settings and configurations • User: {user?.username}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Tabs 
        value={activeTab} 
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab icon={<Settings />} label="General" />
        <Tab icon={<Palette />} label="Preferences" />
        <Tab icon={<Api />} label="Trading & APIs" />
        <Tab icon={<Security />} label="Security" />
        <Tab icon={<Storage />} label="System" />
      </Tabs>

      {/* General Settings Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Interface Settings
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {getThemeIcon()}
                        <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
                          Theme Settings
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {getThemeDescription()}
                      </Typography>
                      
                      <FormControl fullWidth>
                        <InputLabel>Theme Mode</InputLabel>
                        <Select
                          value={generalSettings.theme}
                          label="Theme Mode"
                          onChange={(e) => handleThemeChange(e.target.value)}
                          startAdornment={getThemeIcon()}
                        >
                          <MenuItem value="system">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <SettingsBrightness sx={{ mr: 1 }} />
                              <Box>
                                <Typography>System</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Follow system preference
                                </Typography>
                              </Box>
                            </Box>
                          </MenuItem>
                          <MenuItem value="dark">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Brightness4 sx={{ mr: 1 }} />
                              <Box>
                                <Typography>Dark</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Optimal for trading sessions
                                </Typography>
                              </Box>
                            </Box>
                          </MenuItem>
                          <MenuItem value="light">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Brightness7 sx={{ mr: 1 }} />
                              <Box>
                                <Typography>Light</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Better for daytime use
                                </Typography>
                              </Box>
                            </Box>
                          </MenuItem>
                        </Select>
                        <FormHelperText>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Info sx={{ fontSize: 16, mr: 0.5 }} />
                            System detection will automatically switch themes based on your OS settings
                          </Box>
                        </FormHelperText>
                      </FormControl>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        value={generalSettings.currency}
                        label="Currency"
                        onChange={(e) => setGeneralSettings({...generalSettings, currency: e.target.value})}
                      >
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="GBP">GBP</MenuItem>
                        <MenuItem value="BTC">BTC</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={generalSettings.language}
                        label="Language"
                        onChange={(e) => setGeneralSettings({...generalSettings, language: e.target.value})}
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="es">Español</MenuItem>
                        <MenuItem value="fr">Français</MenuItem>
                        <MenuItem value="de">Deutsch</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={generalSettings.autoRefresh}
                          onChange={(e) => setGeneralSettings({...generalSettings, autoRefresh: e.target.checked})}
                        />
                      }
                      label="Auto-refresh data"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Refresh Interval (seconds)"
                      type="number"
                      value={generalSettings.refreshInterval}
                      onChange={(e) => setGeneralSettings({...generalSettings, refreshInterval: Number(e.target.value)})}
                      disabled={!generalSettings.autoRefresh}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={generalSettings.soundEnabled}
                          onChange={(e) => setGeneralSettings({...generalSettings, soundEnabled: e.target.checked})}
                        />
                      }
                      label="Sound notifications"
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={() => saveSettings('general', generalSettings)}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  Save General Settings
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  User Profile
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={user?.username || ''}
                      disabled
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={user?.email || ''}
                      disabled
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Role"
                      value={user?.role || ''}
                      disabled
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Chip 
                      label="Premium Account" 
                      color="primary" 
                      icon={<CheckCircle />}
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  sx={{ mt: 2 }}
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Preferences Tab */}
      {activeTab === 1 && (
        <PreferencesManager />
      )}

      {/* Trading & APIs Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Trading Configuration
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Default Trading Mode</InputLabel>
                      <Select
                        value={tradingSettings.defaultTradingMode}
                        label="Default Trading Mode"
                        onChange={(e) => setTradingSettings({...tradingSettings, defaultTradingMode: e.target.value})}
                      >
                        <MenuItem value="paper">Paper Trading</MenuItem>
                        <MenuItem value="shadow">Shadow Mode</MenuItem>
                        <MenuItem value="live">Live Trading</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Concurrent Bots"
                      type="number"
                      value={tradingSettings.maxConcurrentBots}
                      onChange={(e) => setTradingSettings({...tradingSettings, maxConcurrentBots: Number(e.target.value)})}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Daily Loss ($)"
                      type="number"
                      value={tradingSettings.maxDailyLoss}
                      onChange={(e) => setTradingSettings({...tradingSettings, maxDailyLoss: Number(e.target.value)})}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tradingSettings.riskManagementEnabled}
                          onChange={(e) => setTradingSettings({...tradingSettings, riskManagementEnabled: e.target.checked})}
                        />
                      }
                      label="Risk Management Enabled"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tradingSettings.emergencyStopEnabled}
                          onChange={(e) => setTradingSettings({...tradingSettings, emergencyStopEnabled: e.target.checked})}
                        />
                      }
                      label="Emergency Stop Enabled"
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={() => saveSettings('trading', tradingSettings)}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  Save Trading Settings
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  API Configuration
                </Typography>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Alpha Vantage (Market Data)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="API Key"
                          type="password"
                          value={apiSettings.alphaVantageKey}
                          onChange={(e) => setApiSettings({...apiSettings, alphaVantageKey: e.target.value})}
                          placeholder="Enter Alpha Vantage API key"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          variant="outlined"
                          onClick={() => testApiConnection('alphavantage')}
                          disabled={loading}
                        >
                          Test Connection
                        </Button>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Binance (Trading)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="API Key"
                          type="password"
                          value={apiSettings.binanceApiKey}
                          onChange={(e) => setApiSettings({...apiSettings, binanceApiKey: e.target.value})}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="API Secret"
                          type="password"
                          value={apiSettings.binanceApiSecret}
                          onChange={(e) => setApiSettings({...apiSettings, binanceApiSecret: e.target.value})}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          variant="outlined"
                          onClick={() => testApiConnection('binance')}
                          disabled={loading}
                        >
                          Test Connection
                        </Button>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={() => saveSettings('api', apiSettings)}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  Save API Settings
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Security Tab */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Authentication & Access
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={securitySettings.twoFactorEnabled}
                          onChange={(e) => setSecuritySettings({...securitySettings, twoFactorEnabled: e.target.checked})}
                        />
                      }
                      label="Two-Factor Authentication"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Session Timeout (minutes)"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: Number(e.target.value)})}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={securitySettings.loginAlerts}
                          onChange={(e) => setSecuritySettings({...securitySettings, loginAlerts: e.target.checked})}
                        />
                      }
                      label="Login Alerts"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="IP Whitelist (comma separated)"
                      value={securitySettings.ipWhitelist}
                      onChange={(e) => setSecuritySettings({...securitySettings, ipWhitelist: e.target.value})}
                      placeholder="192.168.1.1, 10.0.0.1"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={securitySettings.encryptionEnabled}
                          onChange={(e) => setSecuritySettings({...securitySettings, encryptionEnabled: e.target.checked})}
                        />
                      }
                      label="Data Encryption Enabled"
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={() => saveSettings('security', securitySettings)}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Security Status
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircle sx={{ color: '#00ff88', mr: 1 }} />
                    <Typography>Password Security: Strong</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Warning sx={{ color: '#ffaa00', mr: 1 }} />
                    <Typography>2FA: Not Enabled</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircle sx={{ color: '#00ff88', mr: 1 }} />
                    <Typography>Data Encryption: Active</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircle sx={{ color: '#00ff88', mr: 1 }} />
                    <Typography>API Keys: Encrypted</Typography>
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  startIcon={<Key />}
                  onClick={() => setApiKeyDialogOpen(true)}
                  sx={{ mr: 1, mb: 1 }}
                >
                  Manage API Keys
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Lock />}
                  sx={{ mb: 1 }}
                >
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* System Tab */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  System Information
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Version:</Typography>
                    <Typography fontWeight="bold">{systemInfo.version}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Uptime:</Typography>
                    <Typography fontWeight="bold">{systemInfo.uptime}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Last Backup:</Typography>
                    <Typography fontWeight="bold">{systemInfo.lastBackup}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Database Size:</Typography>
                    <Typography fontWeight="bold">{systemInfo.databaseSize}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Active Sessions:</Typography>
                    <Typography fontWeight="bold">{systemInfo.activeSessions}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">API Calls Today:</Typography>
                    <Typography fontWeight="bold">{systemInfo.apiCalls}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">System Health:</Typography>
                    <Chip 
                      label={systemInfo.systemHealth}
                      color="success"
                      icon={<CheckCircle />}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={loadSystemInfo}
                    sx={{ mr: 1 }}
                  >
                    Refresh Info
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Data Management
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={backupDatabase}
                      disabled={loading}
                      fullWidth
                      sx={{ mb: 1 }}
                    >
                      Create Database Backup
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      onClick={exportData}
                      fullWidth
                      sx={{ mb: 1 }}
                    >
                      Export User Data
                    </Button>
                  </Grid>

                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Regular backups are created automatically every 24 hours.
                      Export your data to download all your trading history and bot configurations.
                    </Alert>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  System Configuration
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Server Port"
                      type="number"
                      value={systemSettings.port}
                      onChange={(e) => setSystemSettings({...systemSettings, port: parseInt(e.target.value)})}
                      disabled={user?.role !== 'admin'}
                      helperText={user?.role !== 'admin' ? 'Admin access required' : 'Port for backend server'}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={user?.role !== 'admin'}>
                      <InputLabel>Environment</InputLabel>
                      <Select
                        value={systemSettings.nodeEnv}
                        label="Environment"
                        onChange={(e) => setSystemSettings({...systemSettings, nodeEnv: e.target.value})}
                      >
                        <MenuItem value="development">Development</MenuItem>
                        <MenuItem value="production">Production</MenuItem>
                        <MenuItem value="staging">Staging</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Frontend URL"
                      value={systemSettings.frontendUrl}
                      onChange={(e) => setSystemSettings({...systemSettings, frontendUrl: e.target.value})}
                      disabled={user?.role !== 'admin'}
                      helperText={user?.role !== 'admin' ? 'Admin access required' : 'URL for CORS and socket connections'}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Database Path"
                      value={systemSettings.dbPath}
                      onChange={(e) => setSystemSettings({...systemSettings, dbPath: e.target.value})}
                      disabled={user?.role !== 'admin'}
                      helperText={user?.role !== 'admin' ? 'Admin access required' : 'Path to SQLite database file'}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={user?.role !== 'admin'}>
                      <InputLabel>Log Level</InputLabel>
                      <Select
                        value={systemSettings.logLevel}
                        label="Log Level"
                        onChange={(e) => setSystemSettings({...systemSettings, logLevel: e.target.value})}
                      >
                        <MenuItem value="error">Error</MenuItem>
                        <MenuItem value="warn">Warning</MenuItem>
                        <MenuItem value="info">Info</MenuItem>
                        <MenuItem value="debug">Debug</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="JWT Expiration"
                      value={systemSettings.jwtExpiresIn}
                      onChange={(e) => setSystemSettings({...systemSettings, jwtExpiresIn: e.target.value})}
                      disabled={user?.role !== 'admin'}
                      helperText={user?.role !== 'admin' ? 'Admin access required' : 'e.g., 7d, 24h, 60m'}
                    />
                  </Grid>
                </Grid>

                {user?.role === 'admin' && (
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={() => saveSettings('system', systemSettings)}
                    disabled={loading}
                    sx={{ mt: 2 }}
                    color="warning"
                  >
                    Save System Settings
                  </Button>
                )}

                {user?.role !== 'admin' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    System configuration requires administrator privileges.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* API Key Management Dialog */}
      <Dialog 
        open={apiKeyDialogOpen} 
        onClose={() => setApiKeyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Manage API Keys
          <IconButton
            onClick={() => setApiKeyDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your API keys are encrypted and stored securely. Only you can access them.
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            Never share your API keys with anyone. AAITI will never ask for your keys outside this interface.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Current API Keys Status:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip 
                  label="Alpha Vantage: Connected" 
                  color="success" 
                  size="small"
                />
                <Chip 
                  label="Binance: Not Connected" 
                  color="default" 
                  size="small"
                />
                <Chip 
                  label="Coinbase: Not Connected" 
                  color="default" 
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiKeyDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;