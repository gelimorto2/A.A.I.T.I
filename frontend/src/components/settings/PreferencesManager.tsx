import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  FormControlLabel,
  Switch,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  Download,
  Upload,
  Refresh,
  Speed,
  Notifications,
  Palette,
  TrendingUp,
} from '@mui/icons-material';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useTheme } from '../../contexts/ThemeContext';

const PreferencesManager: React.FC = () => {
  const { 
    preferences, 
    updatePreferences, 
    resetPreferences, 
    exportPreferences, 
    importPreferences,
    hasPermission,
    isLoading 
  } = useUserPreferences();
  const { setThemeMode } = useTheme();
  
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleExport = () => {
    try {
      const data = exportPreferences();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aaiti-preferences-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      showSnackbar('Preferences exported successfully!', 'success');
      setShowExportDialog(false);
    } catch (error) {
      showSnackbar('Failed to export preferences', 'error');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportData(content);
        setShowImportDialog(true);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    try {
      const success = await importPreferences(importData);
      if (success) {
        showSnackbar('Preferences imported successfully!', 'success');
        setShowImportDialog(false);
        setImportData('');
      } else {
        showSnackbar('Failed to import preferences - invalid format', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to import preferences', 'error');
    }
  };

  const handleReset = async () => {
    try {
      await resetPreferences();
      showSnackbar('Preferences reset to defaults', 'success');
      setShowResetDialog(false);
    } catch (error) {
      showSnackbar('Failed to reset preferences', 'error');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeMode(newTheme);
    updatePreferences({
      theme: newTheme
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading preferences...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            User Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Customize your trading experience
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasPermission('preferences.export') && (
            <Tooltip title="Export Settings">
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => setShowExportDialog(true)}
                size="small"
              >
                Export
              </Button>
            </Tooltip>
          )}
          
          {hasPermission('preferences.import') && (
            <Tooltip title="Import Settings">
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={() => fileInputRef.current?.click()}
                size="small"
              >
                Import
              </Button>
            </Tooltip>
          )}
          
          <Tooltip title="Reset to Defaults">
            <Button
              variant="outlined"
              color="warning"
              startIcon={<Refresh />}
              onClick={() => setShowResetDialog(true)}
              size="small"
            >
              Reset
            </Button>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Interface Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Palette sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Interface
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={preferences.theme}
                      label="Theme"
                      onChange={(e) => handleThemeChange(e.target.value as any)}
                    >
                      <MenuItem value="system">System</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="light">Light</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={preferences.interface.language}
                      label="Language"
                      onChange={(e) => updatePreferences({
                        interface: { ...preferences.interface, language: e.target.value }
                      })}
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="es">Español</MenuItem>
                      <MenuItem value="fr">Français</MenuItem>
                      <MenuItem value="de">Deutsch</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={preferences.interface.currency}
                      label="Currency"
                      onChange={(e) => updatePreferences({
                        interface: { ...preferences.interface, currency: e.target.value }
                      })}
                    >
                      <MenuItem value="USD">USD</MenuItem>
                      <MenuItem value="EUR">EUR</MenuItem>
                      <MenuItem value="GBP">GBP</MenuItem>
                      <MenuItem value="BTC">BTC</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.interface.showAdvancedFeatures}
                        onChange={(e) => updatePreferences({
                          interface: { ...preferences.interface, showAdvancedFeatures: e.target.checked }
                        })}
                      />
                    }
                    label="Show Advanced Features"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Speed sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Performance
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.performance.animationsEnabled}
                        onChange={(e) => updatePreferences({
                          performance: { ...preferences.performance, animationsEnabled: e.target.checked }
                        })}
                      />
                    }
                    label="Enable Animations"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.performance.highPerformanceMode}
                        onChange={(e) => updatePreferences({
                          performance: { ...preferences.performance, highPerformanceMode: e.target.checked }
                        })}
                      />
                    }
                    label="High Performance Mode"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Data Refresh Rate: {preferences.performance.dataRefreshRate}ms
                  </Typography>
                  <Slider
                    value={preferences.performance.dataRefreshRate}
                    onChange={(_, value) => updatePreferences({
                      performance: { ...preferences.performance, dataRefreshRate: value as number }
                    })}
                    min={500}
                    max={5000}
                    step={250}
                    marks={[
                      { value: 500, label: '500ms' },
                      { value: 1000, label: '1s' },
                      { value: 2500, label: '2.5s' },
                      { value: 5000, label: '5s' },
                    ]}
                    valueLabelDisplay="auto"
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Trading Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Trading
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.trading.confirmOrders}
                        onChange={(e) => updatePreferences({
                          trading: { ...preferences.trading, confirmOrders: e.target.checked }
                        })}
                      />
                    }
                    label="Confirm Orders"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Default Order Type</InputLabel>
                    <Select
                      value={preferences.trading.defaultOrderType}
                      label="Default Order Type"
                      onChange={(e) => updatePreferences({
                        trading: { ...preferences.trading, defaultOrderType: e.target.value as any }
                      })}
                    >
                      <MenuItem value="market">Market</MenuItem>
                      <MenuItem value="limit">Limit</MenuItem>
                      <MenuItem value="stop">Stop</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Daily Loss ($)"
                    type="number"
                    size="small"
                    value={preferences.trading.riskLimits.maxDailyLoss}
                    onChange={(e) => updatePreferences({
                      trading: {
                        ...preferences.trading,
                        riskLimits: {
                          ...preferences.trading.riskLimits,
                          maxDailyLoss: Number(e.target.value)
                        }
                      }
                    })}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Notifications sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Notifications
                </Typography>
              </Box>

              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notifications.browser}
                        onChange={(e) => updatePreferences({
                          notifications: { ...preferences.notifications, browser: e.target.checked }
                        })}
                      />
                    }
                    label="Browser Notifications"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notifications.sound}
                        onChange={(e) => updatePreferences({
                          notifications: { ...preferences.notifications, sound: e.target.checked }
                        })}
                      />
                    }
                    label="Sound Notifications"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notifications.trading}
                        onChange={(e) => updatePreferences({
                          notifications: { ...preferences.notifications, trading: e.target.checked }
                        })}
                      />
                    }
                    label="Trading Alerts"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notifications.system}
                        onChange={(e) => updatePreferences({
                          notifications: { ...preferences.notifications, system: e.target.checked }
                        })}
                      />
                    }
                    label="System Notifications"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onClose={() => setShowExportDialog(false)}>
        <DialogTitle>Export Preferences</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will download a JSON file containing all your preferences and settings.
            You can use this file to backup your configuration or import it on another device.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportDialog(false)}>Cancel</Button>
          <Button onClick={handleExport} variant="contained" startIcon={<Download />}>
            Export
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onClose={() => setShowImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Preferences</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will overwrite your current preferences. Make sure to export your current settings first if you want to keep them.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder="Paste your preferences JSON here..."
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImportDialog(false)}>Cancel</Button>
          <Button onClick={handleImport} variant="contained" startIcon={<Upload />}>
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onClose={() => setShowResetDialog(false)}>
        <DialogTitle>Reset Preferences</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            This will reset all your preferences to default values. This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetDialog(false)}>Cancel</Button>
          <Button onClick={handleReset} color="warning" variant="contained">
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PreferencesManager;