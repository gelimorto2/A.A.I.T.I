import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Chip, CircularProgress, Tooltip, IconButton } from '@mui/material';
import { MonitorHeart, CheckCircle, Warning, Error } from '@mui/icons-material';
import DashboardWidget from './DashboardWidget';
import HealthTooltip from '../common/HealthTooltip';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface SystemHealthWidgetProps {
  id: string;
  healthScore?: number;
  onRemove?: (id: string) => void;
  onSettings?: (id: string) => void;
}

const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({ id, onRemove, onSettings }) => {
  const token = useSelector((s: RootState) => s.auth.token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<{
    status: string;
    score: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
    rps: number;
    github?: { enabled: boolean; configured: boolean; rateLimitOk: boolean };
  } | null>(null);

  const computeScore = (mem: number, cpu: number, err: number) => {
    // Simple weighted score (lower is better)
    const memScore = Math.max(0, 1 - mem);
    const cpuScore = Math.max(0, 1 - cpu);
    const errScore = Math.max(0, 1 - err);
    return Math.round(((memScore * 0.35) + (cpuScore * 0.35) + (errScore * 0.30)) * 100);
  };

  const getHealthStatus = (score: number) => {
    if (score >= 90) return { label: 'EXCELLENT', color: '#00ff88', icon: <CheckCircle /> };
    if (score >= 75) return { label: 'GOOD', color: '#ffaa00', icon: <Warning /> };
    if (score >= 50) return { label: 'WARNING', color: '#ff9800', icon: <Warning /> };
    return { label: 'CRITICAL', color: '#ff3366', icon: <Error /> };
  };

  const fetchHealth = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [healthRes] = await Promise.all([
        axios.get('/api/performance/health', { headers: { Authorization: `Bearer ${token}` } })
        // metrics endpoint could be added here later
      ]);
      const h = healthRes.data;
      const mem = parseFloat(h.performance.memory.usage) / 100; // already percent string
      const cpu = parseFloat(h.performance.cpu.usage) / 100;
      const errRate = parseFloat(h.performance.requests.errorRate) / 100;
      const rps = parseFloat(h.performance.requests.rps);
      const score = computeScore(mem, cpu, errRate);
      setHealth({
        status: h.status,
        score,
        memoryUsage: mem,
        cpuUsage: cpu,
        errorRate: errRate,
        rps,
        github: h.services?.github
      });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load health');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const status = getHealthStatus(health?.score || 0);

  return (
    <DashboardWidget
      id={id}
      title="SYSTEM HEALTH"
      onRemove={onRemove}
      onSettings={onSettings}
    >
      <HealthTooltip>
        <Box sx={{ textAlign: 'center', cursor: 'pointer', position: 'relative', minHeight: 160 }}>
          {loading && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={32} />
            </Box>
          )}
          {!loading && error && (
            <Typography variant="body2" color="error">{error}</Typography>
          )}
          {!loading && health && (
            <>
              <MonitorHeart 
                sx={{ 
                  color: status.color, 
                  fontSize: 40, 
                  mb: 1 
                }} 
              />
              <Typography 
                variant="h3" 
                color={status.color}
                fontWeight="bold"
                sx={{ mb: 1 }}
              >
                {health.score}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {health.status === 'healthy' ? 'All systems nominal' : 'Degraded performance'}
              </Typography>
              <Chip
                icon={React.cloneElement(status.icon, { fontSize: 'small' })}
                label={status.label}
                size="small"
                sx={{
                  bgcolor: `${status.color}20`,
                  color: status.color,
                  fontWeight: 'bold',
                  border: `1px solid ${status.color}`,
                  mb: 1
                }}
              />
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-around' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">CPU</Typography>
                  <Typography variant="body2" color={health.cpuUsage < 0.8 ? '#00ff88' : '#ff3366'} fontWeight="bold">
                    {(health.cpuUsage * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">MEM</Typography>
                  <Typography variant="body2" color={health.memoryUsage < 0.8 ? '#00ff88' : '#ff3366'} fontWeight="bold">
                    {(health.memoryUsage * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">ERR</Typography>
                  <Typography variant="body2" color={health.errorRate < 0.05 ? '#00ff88' : '#ff3366'} fontWeight="bold">
                    {(health.errorRate * 100).toFixed(1)}%
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">RPS</Typography>
                  <Typography variant="body2" color="#00ff88" fontWeight="bold">
                    {health.rps}
                  </Typography>
                </Box>
              </Box>
              {health.github && (
                <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                  GH: {health.github.enabled ? (health.github.rateLimitOk ? 'OK' : 'Rate') : 'Off'}
                </Typography>
              )}
            </>
          )}
        </Box>
      </HealthTooltip>
    </DashboardWidget>
  );
};

export default SystemHealthWidget;