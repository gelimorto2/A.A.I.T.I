import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  Alert,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AccountCircle,
  Settings,
  Security,
  TrendingUp,
  CheckCircle,
  Rocket,
  AutoAwesome,
} from '@mui/icons-material';

interface WelcomeSetupProps {
  onComplete: () => void;
}

const steps = ['Welcome', 'Admin Account', 'Trading Settings', 'Security', 'Complete'];

interface SetupData {
  admin: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  trading: {
    defaultExchange: string;
    riskLevel: string;
    autoTrading: boolean;
    paperTrading: boolean;
  };
  security: {
    twoFactor: boolean;
    sessionTimeout: number;
    apiAccess: boolean;
  };
}

const WelcomeSetup: React.FC<WelcomeSetupProps> = ({ onComplete }) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [setupData, setSetupData] = useState<SetupData>({
    admin: {
      username: 'admin',
      email: 'admin@example.com',
      password: '',
      confirmPassword: '',
    },
    trading: {
      defaultExchange: 'binance',
      riskLevel: 'medium',
      autoTrading: false,
      paperTrading: true,
    },
    security: {
      twoFactor: false,
      sessionTimeout: 24,
      apiAccess: true,
    },
  });

  const handleNext = async () => {
    setError(null);
    
    // Validation
    if (activeStep === 1) {
      if (!setupData.admin.username || !setupData.admin.email || !setupData.admin.password) {
        setError('Please fill in all admin account fields');
        return;
      }
      if (setupData.admin.password !== setupData.admin.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (setupData.admin.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }

    if (activeStep === steps.length - 1) {
      // Final setup
      setIsLoading(true);
      try {
        // Send setup data to backend
        const response = await fetch('/api/setup/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            admin: setupData.admin,
            trading: setupData.trading,
            security: setupData.security,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Setup failed');
        }

        const result = await response.json();
        
        // Save to localStorage as backup
        localStorage.setItem('aaiti-setup-complete', JSON.stringify({
          timestamp: new Date().toISOString(),
          admin: {
            username: setupData.admin.username,
            email: setupData.admin.email,
          },
          trading: setupData.trading,
          security: setupData.security,
          version: '2.1.0',
        }));
        
        onComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const updateSetupData = (section: keyof SetupData, field: string, value: any) => {
    setSetupData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const renderWelcomeStep = () => (
    <Box textAlign="center" py={4}>
      <AutoAwesome sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
      <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
        Welcome to A.A.I.T.I
      </Typography>
      <Typography variant="h6" color="text.secondary" mb={4}>
        Auto AI Trading Interface v2.1.0
      </Typography>
      <Typography variant="body1" mb={4} maxWidth="600px" mx="auto">
        Let's get you set up in just a few minutes. We'll configure your admin account, 
        trading preferences, and security settings to get you started with automated trading.
      </Typography>
      
      <Grid container spacing={3} mt={2} justifyContent="center">
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent>
              <AccountCircle sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Admin Setup</Typography>
              <Typography variant="body2" color="text.secondary">
                Create your administrator account
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent>
              <TrendingUp sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Trading Config</Typography>
              <Typography variant="body2" color="text.secondary">
                Configure your trading preferences
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent>
              <Security sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Security</Typography>
              <Typography variant="body2" color="text.secondary">
                Set up security and access controls
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderAdminStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>Administrator Account</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Create your admin account to manage A.A.I.T.I
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Username"
            value={setupData.admin.username}
            onChange={(e) => updateSetupData('admin', 'username', e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={setupData.admin.email}
            onChange={(e) => updateSetupData('admin', 'email', e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={setupData.admin.password}
            onChange={(e) => updateSetupData('admin', 'password', e.target.value)}
            required
            helperText="Minimum 8 characters"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
            value={setupData.admin.confirmPassword}
            onChange={(e) => updateSetupData('admin', 'confirmPassword', e.target.value)}
            required
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderTradingStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>Trading Configuration</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Configure your default trading settings
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Default Exchange</InputLabel>
            <Select
              value={setupData.trading.defaultExchange}
              onChange={(e) => updateSetupData('trading', 'defaultExchange', e.target.value)}
            >
              <MenuItem value="binance">Binance</MenuItem>
              <MenuItem value="coinbase">Coinbase Pro</MenuItem>
              <MenuItem value="kraken">Kraken</MenuItem>
              <MenuItem value="bybit">ByBit</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Risk Level</InputLabel>
            <Select
              value={setupData.trading.riskLevel}
              onChange={(e) => updateSetupData('trading', 'riskLevel', e.target.value)}
            >
              <MenuItem value="low">Low Risk</MenuItem>
              <MenuItem value="medium">Medium Risk</MenuItem>
              <MenuItem value="high">High Risk</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={setupData.trading.paperTrading}
                onChange={(e) => updateSetupData('trading', 'paperTrading', e.target.checked)}
              />
            }
            label="Enable Paper Trading (Recommended for beginners)"
          />
          <Typography variant="body2" color="text.secondary" ml={5}>
            Practice trading with virtual money before using real funds
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={setupData.trading.autoTrading}
                onChange={(e) => updateSetupData('trading', 'autoTrading', e.target.checked)}
              />
            }
            label="Enable Automatic Trading"
          />
          <Typography variant="body2" color="text.secondary" ml={5}>
            Allow AI agents to execute trades automatically
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );

  const renderSecurityStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom>Security Settings</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Configure security and access controls
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={setupData.security.twoFactor}
                onChange={(e) => updateSetupData('security', 'twoFactor', e.target.checked)}
              />
            }
            label="Enable Two-Factor Authentication (Recommended)"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Session Timeout (hours)</InputLabel>
            <Select
              value={setupData.security.sessionTimeout}
              onChange={(e) => updateSetupData('security', 'sessionTimeout', e.target.value)}
            >
              <MenuItem value={1}>1 hour</MenuItem>
              <MenuItem value={8}>8 hours</MenuItem>
              <MenuItem value={24}>24 hours</MenuItem>
              <MenuItem value={168}>1 week</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={setupData.security.apiAccess}
                onChange={(e) => updateSetupData('security', 'apiAccess', e.target.checked)}
              />
            }
            label="Enable API Access"
          />
          <Typography variant="body2" color="text.secondary" ml={5}>
            Allow external applications to access A.A.I.T.I API
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );

  const renderCompleteStep = () => (
    <Box textAlign="center" py={4}>
      {isLoading ? (
        <>
          <Box mb={4}>
            <LinearProgress />
          </Box>
          <Typography variant="h5" gutterBottom>Setting up A.A.I.T.I...</Typography>
          <Typography variant="body1" color="text.secondary">
            Please wait while we configure your system
          </Typography>
        </>
      ) : (
        <>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Setup Complete!
          </Typography>
          <Typography variant="body1" mb={4} maxWidth="500px" mx="auto">
            A.A.I.T.I has been configured successfully. You can now start trading with your AI agents.
          </Typography>
          
          <Box mb={4}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item>
                <Chip 
                  icon={<AccountCircle />} 
                  label={`Admin: ${setupData.admin.username}`} 
                  color="primary" 
                />
              </Grid>
              <Grid item>
                <Chip 
                  icon={<TrendingUp />} 
                  label={setupData.trading.paperTrading ? 'Paper Trading' : 'Live Trading'} 
                  color={setupData.trading.paperTrading ? 'warning' : 'success'} 
                />
              </Grid>
              <Grid item>
                <Chip 
                  icon={<Security />} 
                  label={setupData.security.twoFactor ? '2FA Enabled' : '2FA Disabled'} 
                  color={setupData.security.twoFactor ? 'success' : 'default'} 
                />
              </Grid>
            </Grid>
          </Box>
        </>
      )}
    </Box>
  );

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderWelcomeStep();
      case 1:
        return renderAdminStep();
      case 2:
        return renderTradingStep();
      case 3:
        return renderSecurityStep();
      case 4:
        return renderCompleteStep();
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
        py: 4,
      }}
    >
      <Box maxWidth="800px" mx="auto" px={2}>
        <Paper elevation={4} sx={{ p: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 4 }}>
            <Button
              color="inherit"
              disabled={activeStep === 0 || isLoading}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isLoading}
              startIcon={activeStep === steps.length - 1 ? <Rocket /> : undefined}
            >
              {activeStep === steps.length - 1 ? 'Launch A.A.I.T.I' : 'Next'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default WelcomeSetup;
