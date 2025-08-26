import React, { createContext, useContext, ReactNode } from 'react';
import { useSetupStatus } from '../hooks/useSetupStatus';
import WelcomeSetup from '../components/setup/WelcomeSetup';
import { Box, CircularProgress, Typography } from '@mui/material';

interface SetupContextType {
  isSetupComplete: boolean;
  isLoading: boolean;
  needsSetup: boolean;
  markSetupComplete: () => void;
  checkSetupStatus: () => Promise<void>;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

export const useSetup = (): SetupContextType => {
  const context = useContext(SetupContext);
  if (context === undefined) {
    throw new Error('useSetup must be used within a SetupProvider');
  }
  return context;
};

interface SetupProviderProps {
  children: ReactNode;
}

export const SetupProvider: React.FC<SetupProviderProps> = ({ children }) => {
  const setupStatus = useSetupStatus();

  // Show loading screen while checking setup status
  if (setupStatus.isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Loading A.A.I.T.I...
        </Typography>
      </Box>
    );
  }

  // Show setup wizard if needed
  if (setupStatus.needsSetup) {
    return (
      <SetupContext.Provider value={setupStatus}>
        <WelcomeSetup onComplete={setupStatus.markSetupComplete} />
      </SetupContext.Provider>
    );
  }

  // Setup is complete, render the app
  return (
    <SetupContext.Provider value={setupStatus}>
      {children}
    </SetupContext.Provider>
  );
};
