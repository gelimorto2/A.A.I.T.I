import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { RootState } from '../store/store';
// Auth pages removed for public mode
import DashboardPage from '../pages/DashboardPage';
import BotsPage from '../pages/BotsPage';
import BotDetailPage from '../pages/BotDetailPage';
import TradingPage from '../pages/TradingPageSimple';
import AnalyticsPage from '../pages/AnalyticsPage';
import SettingsPage from '../pages/SettingsPage';
import MLModelsPage from '../pages/MLModelsPage';
import MLModelDetailPage from '../pages/MLModelDetailPage';
import ProductionMLPage from '../pages/ProductionMLPage';
import StrategyCreatorPage from '../pages/StrategyCreatorPage';
import BacktestingPage from '../pages/BacktestingPage';

import Navbar from './layout/Navbar';
import Sidebar from './layout/Sidebar';

const AppRouter: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh',
      // Use dynamic viewport height on mobile to account for browser UI
      '@supports (height: 100dvh)': {
        height: '100dvh',
      },
      overflow: 'hidden',
    }}>
      <Sidebar />
      <Box 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          ml: isMobile ? 0 : '240px', // Offset for permanent sidebar on desktop
          overflow: 'hidden',
        }}
      >
        <Navbar />
        <Box 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: isMobile ? 1 : 2, // Less padding on mobile
            // Adjust for sticky navbar on mobile
            ...(isMobile && {
              paddingTop: 2,
            }),
          }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/bots" element={<BotsPage />} />
            <Route path="/bots/:botId" element={<BotDetailPage />} />
            <Route path="/ml" element={<MLModelsPage />} />
            <Route path="/ml/models/:modelId" element={<MLModelDetailPage />} />
            <Route path="/production-ml" element={<ProductionMLPage />} />
            <Route path="/strategy-creator" element={<StrategyCreatorPage />} />
            <Route path="/backtesting" element={<BacktestingPage />} />
            <Route path="/trading" element={<TradingPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
};

export default AppRouter;