import React from 'react';
import { Box, Typography } from '@mui/material';

const BotsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        AI AGENTS
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Bot management interface coming soon...
      </Typography>
    </Box>
  );
};

export default BotsPage;