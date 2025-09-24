import React from 'react';
import { Alert, AlertTitle, Box, Link } from '@mui/material';

type HelperBannerProps = {
  title: string;
  children?: React.ReactNode;
  docsHref?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  sx?: any;
};

const HelperBanner: React.FC<HelperBannerProps> = ({ title, children, docsHref, severity = 'info', sx }) => {
  return (
    <Alert severity={severity} sx={{ mb: 2, ...sx }}>
      <AlertTitle>{title}</AlertTitle>
      {children && <Box sx={{ opacity: 0.9 }}>{children}</Box>}
      {docsHref && (
        <Box sx={{ mt: 1 }}>
          <Link href={docsHref} target="_blank" rel="noreferrer noopener">
            Learn more in the docs
          </Link>
        </Box>
      )}
    </Alert>
  );
};

export default HelperBanner;
