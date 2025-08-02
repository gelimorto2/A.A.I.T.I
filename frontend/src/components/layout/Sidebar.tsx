import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import {
  Dashboard,
  SmartToy,
  TrendingUp,
  Analytics,
  Settings,
  Science,
  Psychology,
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

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid #333',
        },
      }}
    >
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

      <Divider sx={{ borderColor: '#333' }} />

      <List sx={{ pt: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
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
              secondary={item.description}
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
    </Drawer>
  );
};

export default Sidebar;