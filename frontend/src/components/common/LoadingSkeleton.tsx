import React from 'react';
import { Box, Card, CardContent, Skeleton, useTheme } from '@mui/material';

interface LoadingSkeletonProps {
  variant?: 'widget' | 'chart' | 'list' | 'text';
  height?: number | string;
  width?: number | string;
  animate?: boolean;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'widget',
  height = 200,
  width = '100%',
  animate = true,
}) => {
  const theme = useTheme();

  const renderWidgetSkeleton = () => (
    <Card 
      sx={{ 
        height: height, 
        width: width,
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.3s ease-in-out',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Skeleton 
            variant="circular" 
            width={24} 
            height={24} 
            animation={animate ? 'wave' : false}
            sx={{ mr: 1 }}
          />
          <Skeleton 
            variant="text" 
            width="60%" 
            height={24}
            animation={animate ? 'wave' : false}
          />
        </Box>
        
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height={60}
          animation={animate ? 'wave' : false}
          sx={{ mb: 2, borderRadius: 1 }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton 
            variant="text" 
            width="40%" 
            height={20}
            animation={animate ? 'wave' : false}
          />
          <Skeleton 
            variant="text" 
            width="30%" 
            height={20}
            animation={animate ? 'wave' : false}
          />
        </Box>
      </CardContent>
    </Card>
  );

  const renderChartSkeleton = () => (
    <Card 
      sx={{ 
        height: height, 
        width: width,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <CardContent>
        <Skeleton 
          variant="text" 
          width="50%" 
          height={28}
          animation={animate ? 'wave' : false}
          sx={{ mb: 2 }}
        />
        
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="calc(100% - 60px)"
          animation={animate ? 'wave' : false}
          sx={{ borderRadius: 1 }}
        />
      </CardContent>
    </Card>
  );

  const renderListSkeleton = () => (
    <Card 
      sx={{ 
        height: height, 
        width: width,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <CardContent>
        <Skeleton 
          variant="text" 
          width="40%" 
          height={24}
          animation={animate ? 'wave' : false}
          sx={{ mb: 2 }}
        />
        
        {[...Array(3)].map((_, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Skeleton 
              variant="circular" 
              width={20} 
              height={20}
              animation={animate ? 'wave' : false}
              sx={{ mr: 2 }}
            />
            <Box sx={{ flex: 1 }}>
              <Skeleton 
                variant="text" 
                width="80%" 
                height={16}
                animation={animate ? 'wave' : false}
              />
              <Skeleton 
                variant="text" 
                width="60%" 
                height={12}
                animation={animate ? 'wave' : false}
              />
            </Box>
            <Skeleton 
              variant="text" 
              width="15%" 
              height={16}
              animation={animate ? 'wave' : false}
            />
          </Box>
        ))}
      </CardContent>
    </Card>
  );

  const renderTextSkeleton = () => (
    <Box sx={{ width: width }}>
      <Skeleton 
        variant="text" 
        width="100%" 
        height={height}
        animation={animate ? 'wave' : false}
      />
    </Box>
  );

  switch (variant) {
    case 'chart':
      return renderChartSkeleton();
    case 'list':
      return renderListSkeleton();
    case 'text':
      return renderTextSkeleton();
    case 'widget':
    default:
      return renderWidgetSkeleton();
  }
};

export default LoadingSkeleton;