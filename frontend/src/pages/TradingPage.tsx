import React from 'react';
import { Box, Typography } from '@mui/material';

const TradingPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        LIVE TRADING
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Trading execution interface coming soon...
      </Typography>
    </Box>
  );
};

export default TradingPage;