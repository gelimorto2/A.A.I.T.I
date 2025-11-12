import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Badge,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material';
import {
  Notifications,
  AccountCircle,
  PowerSettingsNew,
  DarkMode,
  LightMode,
  SettingsBrightness,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';

const Navbar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isConnected } = useSocket();
  const { isDarkMode, themeMode, setThemeMode, systemPrefersDark } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setThemeMenuAnchor(null);
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    handleThemeMenuClose();
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return <LightMode />;
      case 'dark':
        return <DarkMode />;
      case 'system':
        return <SettingsBrightness />;
      default:
        return <SettingsBrightness />;
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return `Auto (${systemPrefersDark ? 'Dark' : 'Light'})`;
      default:
        return 'Auto';
    }
  };

  return (
    <AppBar 
      position={isMobile ? "sticky" : "static"}
      elevation={0}
      sx={{ 
        bgcolor: 'background.paper',
        borderBottom: '1px solid #333',
        height: 64,
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        // Add safe area insets for iOS devices
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <Toolbar sx={{ minHeight: '64px !important', paddingTop: 'env(safe-area-inset-top)' }}>
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

          {/* Enhanced Theme Selector */}
          <Tooltip title="Theme Settings">
            <Chip
              icon={getThemeIcon()}
              label={getThemeLabel()}
              onClick={handleThemeMenuOpen}
              deleteIcon={<KeyboardArrowDown />}
              onDelete={handleThemeMenuOpen}
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                color: 'text.primary',
                fontWeight: 'bold',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                },
                '& .MuiChip-deleteIcon': {
                  color: 'text.primary',
                }
              }}
            />
          </Tooltip>

          <Menu
            anchorEl={themeMenuAnchor}
            open={Boolean(themeMenuAnchor)}
            onClose={handleThemeMenuClose}
            PaperProps={{
              sx: {
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                minWidth: 200,
              },
            }}
          >
            <MenuItem 
              onClick={() => handleThemeChange('system')}
              selected={themeMode === 'system'}
            >
              <ListItemIcon>
                <SettingsBrightness />
              </ListItemIcon>
              <ListItemText 
                primary="System" 
                secondary={`Follow OS preference (${systemPrefersDark ? 'Dark' : 'Light'})`}
              />
            </MenuItem>
            <Divider />
            <MenuItem 
              onClick={() => handleThemeChange('dark')}
              selected={themeMode === 'dark'}
            >
              <ListItemIcon>
                <DarkMode />
              </ListItemIcon>
              <ListItemText 
                primary="Dark" 
                secondary="Optimal for trading"
              />
            </MenuItem>
            <MenuItem 
              onClick={() => handleThemeChange('light')}
              selected={themeMode === 'light'}
            >
              <ListItemIcon>
                <LightMode />
              </ListItemIcon>
              <ListItemText 
                primary="Light" 
                secondary="Better for daytime"
              />
            </MenuItem>
          </Menu>

          {/* Notifications */}
          <IconButton color="inherit">
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* User Info (guest in public mode) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountCircle />
            <Typography variant="body2" color="text.primary">
              {user?.username || 'guest'}
            </Typography>
            <Chip 
              label={(user?.role || 'admin').toUpperCase()} 
              size="small" 
              color="secondary"
              sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
            />
          </Box>

          {/* Logout hidden in public mode; keep button for future private mode if needed */}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;