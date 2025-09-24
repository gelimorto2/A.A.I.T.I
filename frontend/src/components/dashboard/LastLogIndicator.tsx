import React, { useEffect, useState } from 'react';
import { Box, Chip, Tooltip } from '@mui/material';

type LogEntry = {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
};

const levelColor = (level: string) => {
  switch (level) {
    case 'error':
      return '#ff3366';
    case 'warn':
    case 'warning':
      return '#ffaa00';
    case 'info':
    default:
      return '#00ff88';
  }
};

const LastLogIndicator: React.FC = () => {
  const [lastLog, setLastLog] = useState<LogEntry | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/logs/latest', { credentials: 'include' });
        const data = await res.json();
        if (mounted && data?.ok) {
          setLastLog(data.latest);
        }
      } catch (_) {
        // ignore
      }
    };

    // initial fetch + interval
    fetchLatest();
    const id = setInterval(fetchLatest, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (!lastLog) return null;

  const color = levelColor(lastLog.level);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        zIndex: 1300,
      }}
    >
      <Tooltip title={`${lastLog.timestamp} • ${lastLog.level.toUpperCase()}`} placement="top-start">
        <Chip
          size="small"
          label={lastLog.message}
          sx={{
            bgcolor: `${color}20`,
            color,
            border: `1px solid ${color}`,
            fontWeight: 'bold',
            maxWidth: { xs: 240, sm: 360 },
            '.MuiChip-label': {
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          }}
        />
      </Tooltip>
    </Box>
  );
};

export default LastLogIndicator;
