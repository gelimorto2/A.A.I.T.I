import React from 'react';
import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';
import { DragIndicator, Settings, Close } from '@mui/icons-material';

export interface WidgetProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
  isDragging?: boolean;
}

const DashboardWidget: React.FC<WidgetProps> = ({
  id,
  title,
  children,
  onRemove,
  onSettings,
  isDragging = false,
}) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: isDragging ? 'primary.main' : 'grey.700',
        opacity: isDragging ? 0.8 : 1,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: 'primary.main',
          '& .widget-controls': {
            opacity: 1,
          },
        },
      }}
    >
      {/* Widget Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'grey.700',
          bgcolor: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DragIndicator 
            sx={{ 
              color: 'text.secondary', 
              cursor: 'grab',
              '&:active': {
                cursor: 'grabbing',
              },
            }} 
          />
          <Typography 
            variant="subtitle2" 
            fontWeight="bold"
            sx={{ fontFamily: 'monospace' }}
          >
            {title}
          </Typography>
        </Box>

        <Box 
          className="widget-controls"
          sx={{ 
            display: 'flex', 
            gap: 0.5,
            opacity: 0,
            transition: 'opacity 0.2s ease-in-out',
          }}
        >
          {onSettings && (
            <IconButton 
              size="small" 
              onClick={() => onSettings(id)}
              sx={{ color: 'text.secondary' }}
            >
              <Settings fontSize="small" />
            </IconButton>
          )}
          {onRemove && (
            <IconButton 
              size="small" 
              onClick={() => onRemove(id)}
              sx={{ color: 'error.main' }}
            >
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Widget Content */}
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        {children}
      </CardContent>
    </Card>
  );
};

export default DashboardWidget;