import React from 'react';
import { Box, Typography } from '@mui/material';

const BotDetailPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        BOT DETAILS
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Bot detail interface coming soon...
      </Typography>
    </Box>
  );
};

export default BotDetailPage;