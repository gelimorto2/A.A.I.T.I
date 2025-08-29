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
} from '@mui/material';
  import { Popover, List, ListItem, ListItemAvatar, Avatar } from '@mui/material';
import {
  Notifications,
  AccountCircle,
  PowerSettingsNew,
  DarkMode,
  LightMode,
  SettingsBrightness,
  KeyboardArrowDown,
} from '@mui/icons-material';
  import { Warning, CheckCircle, TrendingUp } from '@mui/icons-material';
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
  
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    dispatch(logout());
  };

  // Notifications demo data (could be wired to backend later)
  const notifications = [
    { id: '1', type: 'system', icon: <CheckCircle color="success" fontSize="small" />, title: 'System Stable', detail: 'All services operational', time: 'just now' },
  { id: '2', type: 'trading', icon: <TrendingUp color="primary" fontSize="small" />, title: 'BTC Strategy', detail: 'Generated new buy signal', time: '2m' },
    { id: '3', type: 'risk', icon: <Warning color="warning" fontSize="small" />, title: 'Drawdown Watch', detail: 'Bot Alpha nearing risk limit', time: '10m' },
  ];

  const openNotifications = (e: React.MouseEvent<HTMLElement>) => setNotifAnchor(e.currentTarget);
  const closeNotifications = () => setNotifAnchor(null);
  const notifOpen = Boolean(notifAnchor);

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
          <IconButton color="inherit" onClick={openNotifications} aria-describedby="notifications-popover">
            <Badge badgeContent={notifications.length} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          <Popover
            id="notifications-popover"
            open={notifOpen}
            anchorEl={notifAnchor}
            onClose={closeNotifications}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { width: 320, maxHeight: 400 } }}
          >
            <Box sx={{ p: 1.5, pb: 0 }}>
              <Typography variant="subtitle2" fontWeight={600}>Notifications</Typography>
              <Typography variant="caption" color="text.secondary">Latest system & trading updates</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <List dense sx={{ py: 0 }}>
              {notifications.map(n => (
                <ListItem key={n.id} alignItems="flex-start" sx={{ py: 0.75 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: 'background.paper' }}>
                      {n.icon}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight={500}>{n.title}</Typography>}
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {n.detail} • {n.time}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
              {notifications.length === 0 && (
                <ListItem>
                  <ListItemText primary={<Typography variant="body2" color="text.secondary">No notifications</Typography>} />
                </ListItem>
              )}
            </List>
          </Popover>

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

          {/* User Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountCircle />
            <Typography variant="body2" color="text.primary">
              {user?.username === 'admin' ? 'Administrator' : user?.username}
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