import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box } from '@mui/material';
import { RootState, AppDispatch } from '../store/store';
import { getProfile } from '../store/slices/authSlice';

import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import BotsPage from '../pages/BotsPage';
import BotDetailPage from '../pages/BotDetailPage';
import TradingPage from '../pages/TradingPageSimple';
import AnalyticsPage from '../pages/AnalyticsPage';
import SettingsPage from '../pages/SettingsPage';
import MLModelsPage from '../pages/MLModelsPage';
import MLModelDetailPage from '../pages/MLModelDetailPage';
import AdvancedMLPage from '../pages/AdvancedMLPage';

import Navbar from './layout/Navbar';
import Sidebar from './layout/Sidebar';
import LoadingScreen from './common/LoadingScreen';

const AppRouter: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading, token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Try to authenticate with stored token on app load
    if (token && !isAuthenticated) {
      dispatch(getProfile());
    }
  }, [dispatch, token, isAuthenticated]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/bots" element={<BotsPage />} />
            <Route path="/bots/:botId" element={<BotDetailPage />} />
            <Route path="/ml" element={<MLModelsPage />} />
            <Route path="/ml/models/:modelId" element={<MLModelDetailPage />} />
            <Route path="/ml/advanced" element={<AdvancedMLPage />} />
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