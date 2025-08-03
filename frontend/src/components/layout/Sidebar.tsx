import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard,
  SmartToy,
  TrendingUp,
  Analytics,
  Settings,
  Science,
  Psychology,
  Menu,
  Close,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 240;

const menuItems = [
  { 
    text: 'Command Center', 
    icon: <Dashboard />, 
    path: '/dashboard',
    description: 'Mission Control'
  },
  { 
    text: 'AI Agents', 
    icon: <SmartToy />, 
    path: '/bots',
    description: 'Bot Management'
  },
  { 
    text: 'ML Models', 
    icon: <Science />, 
    path: '/ml',
    description: 'Machine Learning'
  },
  { 
    text: 'Advanced ML', 
    icon: <Psychology />, 
    path: '/ml/advanced',
    description: 'AI Intelligence'
  },
  { 
    text: 'Live Trading', 
    icon: <TrendingUp />, 
    path: '/trading',
    description: 'Execution Interface'
  },
  { 
    text: 'Analytics', 
    icon: <Analytics />, 
    path: '/analytics',
    description: 'Performance Intel'
  },
  { 
    text: 'Settings', 
    icon: <Settings />, 
    path: '/settings',
    description: 'System Config'
  },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenuToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawerContent = (
    <>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'primary.main', 
            fontWeight: 'bold',
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: 2,
          }}
        >
          NEURAL
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary',
            display: 'block',
            fontFamily: 'monospace',
          }}
        >
          COMMAND DECK
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'grey.700' }} />

      <List sx={{ pt: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            selected={location.pathname === item.path}
            onClick={() => handleNavigation(item.path)}
            sx={{
              mx: 1,
              mb: 0.5,
              borderRadius: 1,
              '&.Mui-selected': {
                bgcolor: 'rgba(0, 255, 136, 0.1)',
                '&:hover': {
                  bgcolor: 'rgba(0, 255, 136, 0.15)',
                },
                '& .MuiListItemIcon-root': {
                  color: 'primary.main',
                },
                '& .MuiListItemText-primary': {
                  color: 'primary.main',
                  fontWeight: 'bold',
                },
              },
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text}
              secondary={!isMobile ? item.description : undefined}
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: location.pathname === item.path ? 'bold' : 'normal',
              }}
              secondaryTypographyProps={{
                fontSize: '0.7rem',
                color: 'text.disabled',
              }}
            />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.disabled',
            fontFamily: 'monospace',
          }}
        >
          v1.0.0 • ALPHA
        </Typography>
      </Box>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <IconButton
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1300,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'grey.700',
            '&:hover': {
              bgcolor: 'rgba(0, 255, 136, 0.1)',
            },
          }}
          onClick={handleMenuToggle}
        >
          {mobileOpen ? <Close /> : <Menu />}
        </IconButton>

        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleMenuToggle}
          ModalProps={{
            keepMounted: true, // Better performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'grey.700',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'grey.700',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;