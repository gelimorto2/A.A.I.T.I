import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  Link,
  Container,
  Divider,
  Chip,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { AccountCircle, Lock } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { AppDispatch, RootState } from '../store/store';
import { login, clearError } from '../store/slices/authSlice';

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    dispatch(login(credentials));
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'radial-gradient(circle at 25% 25%, #00ff8820 0%, transparent 50%), radial-gradient(circle at 75% 75%, #ff336620 0%, transparent 50%)',
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 700, 
              color: 'primary.main',
              fontFamily: '"JetBrains Mono", monospace',
              letterSpacing: 4,
              mb: 1,
            }}
          >
            A.A.I.T.I
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary"
            sx={{ fontFamily: 'monospace', letterSpacing: 1 }}
          >
            Auto AI Trading Interface
          </Typography>
          <Chip 
            label="NEURAL COMMAND DECK" 
            color="primary" 
            variant="outlined"
            sx={{ mt: 2, fontWeight: 'bold', fontFamily: 'monospace' }}
          />
        </Box>

        <Card 
          elevation={0}
          sx={{ 
            bgcolor: 'background.paper',
            border: '1px solid #333',
            borderRadius: 2,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                textAlign: 'center', 
                mb: 3,
                fontWeight: 600,
              }}
            >
              Mission Access
            </Typography>

            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3, bgcolor: 'rgba(255, 51, 102, 0.1)' }}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username / Email"
                value={credentials.username}
                onChange={handleChange('username')}
                margin="normal"
                required
                autoFocus
                InputProps={{
                  startAdornment: <AccountCircle sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={credentials.password}
                onChange={handleChange('password')}
                margin="normal"
                required
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ mb: 3 }}
              />

              <LoadingButton
                type="submit"
                fullWidth
                variant="contained"
                loading={isLoading}
                sx={{ 
                  py: 1.5, 
                  mb: 2,
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                }}
              >
                INITIATE CONNECTION
              </LoadingButton>
            </form>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Need access credentials?{' '}
                <Link 
                  component={RouterLink} 
                  to="/register"
                  sx={{ 
                    color: 'primary.main',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Request Authorization
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography 
            variant="caption" 
            color="text.disabled"
            sx={{ fontFamily: 'monospace' }}
          >
            MISSION-CRITICAL • REAL-TIME • AUTONOMOUS
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage;