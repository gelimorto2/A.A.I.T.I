import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Badge,
  Chip,
} from '@mui/material';
import {
  Notifications,
  AccountCircle,
  PowerSettingsNew,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { useSocket } from '../../contexts/SocketContext';

const Navbar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isConnected } = useSocket();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        bgcolor: 'background.paper',
        borderBottom: '1px solid #333',
        height: 64,
      }}
    >
      <Toolbar sx={{ minHeight: '64px !important' }}>
        <Typography 
          variant="h5" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 700,
            color: 'primary.main',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          A.A.I.T.I
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Connection Status */}
          <Chip
            icon={<div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              backgroundColor: isConnected ? '#00ff88' : '#ff3366' 
            }} />}
            label={isConnected ? 'LIVE' : 'OFFLINE'}
            size="small"
            sx={{
              bgcolor: isConnected ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)',
              color: isConnected ? '#00ff88' : '#ff3366',
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }}
          />

          {/* Notifications */}
          <IconButton color="inherit">
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* User Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountCircle />
            <Typography variant="body2" color="text.primary">
              {user?.username}
            </Typography>
            <Chip 
              label={user?.role?.toUpperCase()} 
              size="small" 
              color="secondary"
              sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
            />
          </Box>

          {/* Logout */}
          <IconButton 
            color="error" 
            onClick={handleLogout}
            title="Logout"
          >
            <PowerSettingsNew />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;