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
  MenuItem,
  Chip,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { AccountCircle, Email, Lock } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../store/store';
import { register, clearError } from '../store/slices/authSlice';

const RegisterPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'trader',
  });

  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    setValidationError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return;
    }

    const result = await dispatch(register({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    }));

    if (register.fulfilled.match(result)) {
      navigate('/login');
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
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
          <Chip 
            label="ACCESS REQUEST" 
            color="secondary" 
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
              Authorization Request
            </Typography>

            {(error || validationError) && (
              <Alert 
                severity="error" 
                sx={{ mb: 3, bgcolor: 'rgba(255, 51, 102, 0.1)' }}
              >
                {error || validationError}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username"
                value={formData.username}
                onChange={handleChange('username')}
                margin="normal"
                required
                autoFocus
                InputProps={{
                  startAdornment: <AccountCircle sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                margin="normal"
                required
                InputProps={{
                  startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />

              <TextField
                fullWidth
                label="Role"
                select
                value={formData.role}
                onChange={handleChange('role')}
                margin="normal"
                helperText="Select your intended access level"
              >
                <MenuItem value="trader">Trader - Full Trading Access</MenuItem>
                <MenuItem value="viewer">Viewer - Read-Only Access</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                margin="normal"
                required
                helperText="Minimum 8 characters"
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
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
                  bgcolor: 'secondary.main',
                  '&:hover': {
                    bgcolor: 'secondary.dark',
                  },
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                }}
              >
                REQUEST ACCESS
              </LoadingButton>
            </form>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have credentials?{' '}
                <Link 
                  component={RouterLink} 
                  to="/login"
                  sx={{ 
                    color: 'primary.main',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Initiate Connection
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default RegisterPage;