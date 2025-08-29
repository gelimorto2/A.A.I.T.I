import React, { useRef, useLayoutEffect, useState, createContext, useContext } from 'react';
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

interface Size { width: number; height: number; }
const WidgetSizeContext = createContext<Size | undefined>(undefined);
export const useWidgetSize = () => {
  const ctx = useContext(WidgetSizeContext);
  if (!ctx) return { width: 0, height: 0 };
  return ctx;
};

const DashboardWidget: React.FC<WidgetProps> = ({
  id,
  title,
  children,
  onRemove,
  onSettings,
  isDragging = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
      <CardContent ref={containerRef} sx={{ flexGrow: 1, p: 2 }}>
        <WidgetSizeContext.Provider value={size}>
          {children}
        </WidgetSizeContext.Provider>
      </CardContent>
    </Card>
  );
};

export default DashboardWidget;