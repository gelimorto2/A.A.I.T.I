import React from 'react';
import { Box, Typography } from '@mui/material';

const SettingsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        SETTINGS
      </Typography>
      <Typography variant="body1" color="text.secondary">
        System configuration interface coming soon...
      </Typography>
    </Box>
  );
};

export default SettingsPage;