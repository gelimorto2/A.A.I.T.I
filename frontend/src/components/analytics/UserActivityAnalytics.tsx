import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Timeline, Speed, TrendingUp, Assessment } from '@mui/icons-material';

interface ActivityAnalytics {
  timeframe: string;
  summary: {
    total_actions: number;
    unique_actions: number;
    avg_response_time: number;
    successful_actions: number;
    failed_actions: number;
    active_days: number;
  };
  actionStats: Array<{
    action: string;
    count: number;
    avg_duration: number;
    success_count: number;
    error_count: number;
  }>;
  timeStats: Array<{
    hour: string;
    count: number;
    avg_duration: number;
  }>;
  resourceStats: Array<{
    resource: string;
    count: number;
    avg_duration: number;
  }>;
  recentActivity: Array<{
    action: string;
    resource: string;
    timestamp: string;
    duration_ms: number;
    success: boolean;
    ip_address: string;
  }>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UserActivityAnalytics: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [timeframe, setTimeframe] = useState('7d');
  const [analytics, setAnalytics] = useState<ActivityAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user-activity/analytics?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Colors for charts
  const chartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No activity data available
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Activity Analytics
        </Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Timeframe</InputLabel>
          <Select
            value={timeframe}
            label="Timeframe"
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <MenuItem value="1d">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Assessment sx={{ color: 'primary.main', mr: 1 }} />
                <Box>
                  <Typography variant="h6">{analytics.summary.total_actions}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Actions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Speed sx={{ color: 'secondary.main', mr: 1 }} />
                <Box>
                  <Typography variant="h6">
                    {formatDuration(analytics.summary.avg_response_time)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Response Time
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ color: 'success.main', mr: 1 }} />
                <Box>
                  <Typography variant="h6">
                    {((analytics.summary.successful_actions / analytics.summary.total_actions) * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Timeline sx={{ color: 'info.main', mr: 1 }} />
                <Box>
                  <Typography variant="h6">{analytics.summary.active_days}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Days
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Activity by Action" />
            <Tab label="Activity Over Time" />
            <Tab label="Resource Usage" />
            <Tab label="Recent Activity" />
          </Tabs>
        </Box>

        {/* Activity by Action */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Actions Breakdown
          </Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.actionStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="action" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'count' ? value : formatDuration(Number(value)),
                    name === 'count' ? 'Actions' : 'Avg Duration'
                  ]}
                />
                <Bar dataKey="count" fill={chartColors[0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </TabPanel>

        {/* Activity Over Time */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Activity Timeline
          </Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.timeStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'count' ? value : formatDuration(Number(value)),
                    name === 'count' ? 'Actions' : 'Avg Duration'
                  ]}
                />
                <Line type="monotone" dataKey="count" stroke={chartColors[1]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </TabPanel>

        {/* Resource Usage */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Most Used Resources
          </Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.resourceStats}
                  dataKey="count"
                  nameKey="resource"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={({ resource, count }) => `${resource}: ${count}`}
                >
                  {analytics.resourceStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </TabPanel>

        {/* Recent Activity */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.recentActivity.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>{activity.resource || '-'}</TableCell>
                    <TableCell>{formatDateTime(activity.timestamp)}</TableCell>
                    <TableCell>{formatDuration(activity.duration_ms)}</TableCell>
                    <TableCell>
                      <Chip
                        label={activity.success ? 'Success' : 'Failed'}
                        color={activity.success ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{activity.ip_address}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default UserActivityAnalytics;