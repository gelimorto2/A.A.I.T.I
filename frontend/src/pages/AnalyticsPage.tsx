import React from 'react';
import { Box, Typography } from '@mui/material';

const AnalyticsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        ANALYTICS
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Performance analytics interface coming soon...
      </Typography>
    </Box>
  );
};

export default AnalyticsPage;