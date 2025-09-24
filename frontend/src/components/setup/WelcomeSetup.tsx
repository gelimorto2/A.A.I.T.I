import React, { useState } from 'react';
import { Box, Paper, Typography, Button, Grid, Alert, Card, CardContent, LinearProgress, useTheme, alpha } from '@mui/material';
import { TrendingUp, CheckCircle, Rocket, AutoAwesome } from '@mui/icons-material';

interface WelcomeSetupProps {
  onComplete: () => void;
}

// Public mode: single-step welcome only
const WelcomeSetup: React.FC<WelcomeSetupProps> = ({ onComplete }) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setError(null);
    setIsLoading(true);
    try {
      localStorage.setItem('aaiti-setup-complete', JSON.stringify({
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        mode: 'public'
      }));
      onComplete();
    } catch {
      setError('Failed to start. Please try again.');
    } finally {
      setIsLoading(false);
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
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box textAlign="center" py={4}>
            <AutoAwesome sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            {isLoading && (
              <Box mb={2}>
                <LinearProgress />
              </Box>
            )}
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
              Welcome to A.A.I.T.I
            </Typography>
            <Typography variant="h6" color="text.secondary" mb={4}>
              Auto AI Trading Interface v2.1.0 (Public Demo Mode)
            </Typography>
            <Typography variant="body1" mb={4} maxWidth="700px" mx="auto">
              No login required. Explore the dashboard, bots, analytics, and strategy creator.
              Paper trading is enabled; no real orders are placed.
            </Typography>

            <Grid container spacing={3} mt={2} justifyContent="center">
              <Grid item xs={12} sm={6}>
                <Card sx={{ height: '100%', textAlign: 'center' }}>
                  <CardContent>
                    <TrendingUp sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6" gutterBottom>AI Trading</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Prebuilt strategies, paper trading, and ML models
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card sx={{ height: '100%', textAlign: 'center' }}>
                  <CardContent>
                    <AutoAwesome sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6" gutterBottom>Next-Gen AI</Typography>
                    <Typography variant="body2" color="text.secondary">
                      ML-powered insights and advanced analytics
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 4, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleStart}
                disabled={isLoading}
                startIcon={<Rocket />}
              >
                Enter Dashboard
              </Button>
            </Box>
          </Box>

          {isLoading ? (
            <Box textAlign="center" py={4}>
              <CheckCircle sx={{ fontSize: 0, visibility: 'hidden' }} />
            </Box>
          ) : null}
        </Paper>
      </Box>
    </Box>
  );
};

export default WelcomeSetup;
