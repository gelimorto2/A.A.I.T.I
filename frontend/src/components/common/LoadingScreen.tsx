import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingScreen: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress sx={{ mb: 2, color: 'primary.main' }} size={60} />
      <Typography variant="h6" color="text.primary">
        AAITI Loading...
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Neural Command Deck Initializing
      </Typography>
    </Box>
  );
};

export default LoadingScreen;