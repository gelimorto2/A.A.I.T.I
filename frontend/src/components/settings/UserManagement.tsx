import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  useTheme,
} from '@mui/material';
import {
  People,
  PersonAdd,
  Edit,
  Delete,
  Block,
  CheckCircle,
  Cancel,
  Visibility,
  Timeline,
  Security,
  AdminPanelSettings,
  TrendingUp,
  Analytics,
  Assignment,
  Schedule,
} from '@mui/icons-material';
import { useRBAC, ProtectedComponent } from '../../contexts/RBACContext';
import { useActivity } from '../../contexts/ActivityContext';
import { UserRole, ROLE_DEFINITIONS, PERMISSIONS } from '../../types/rbac';
import { ActivityAction, UserActivity } from '../../types/activity';

const UserManagement: React.FC = () => {
  const theme = useTheme();
  const { user: currentUser, hasPermission, isAdmin } = useRBAC();
  const { getActivities, stats } = useActivity();
  
  const [users, setUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sample users data - in production this would come from API
  const sampleUsers = [
    {
      id: '1',
      username: 'admin',
      email: 'admin@aaiti.com',
      role: 'admin',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      lastLogin: '2024-01-08T12:30:00Z',
    },
    {
      id: '2',
      username: 'trader1',
      email: 'trader1@aaiti.com',
      role: 'trader',
      isActive: true,
      createdAt: '2024-01-05T00:00:00Z',
      lastLogin: '2024-01-08T11:45:00Z',
    },
    {
      id: '3',
      username: 'analyst1',
      email: 'analyst1@aaiti.com',
      role: 'analyst',
      isActive: true,
      createdAt: '2024-01-10T00:00:00Z',
      lastLogin: '2024-01-08T10:20:00Z',
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // In production, these would be API calls
      setUsers(sampleUsers);
      const recentActivities = await getActivities({ limit: 20 });
      setActivities(recentActivities);
    } catch (err) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <AdminPanelSettings color="error" />;
      case 'trader':
        return <TrendingUp color="primary" />;
      case 'analyst':
        return <Analytics color="info" />;
      case 'viewer':
        return <Visibility color="action" />;
      default:
        return <People />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'trader':
        return 'primary';
      case 'analyst':
        return 'info';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };

  const getActionIcon = (action: ActivityAction) => {
    switch (action) {
      case 'login':
      case 'logout':
        return <Security fontSize="small" />;
      case 'create_bot':
      case 'update_bot':
      case 'delete_bot':
        return <TrendingUp fontSize="small" />;
      case 'view_dashboard':
      case 'view_analytics':
        return <Analytics fontSize="small" />;
      default:
        return <Assignment fontSize="small" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Box>
      <ProtectedComponent permission={PERMISSIONS.USERS_READ}>
        <Grid container spacing={3}>
          {/* User Management Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 3,
                }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People color="primary" />
                    User Management
                  </Typography>
                  
                  <ProtectedComponent permission={PERMISSIONS.USERS_CREATE}>
                    <Button
                      variant="contained"
                      startIcon={<PersonAdd />}
                      onClick={() => {
                        setSelectedUser(null);
                        setUserDialogOpen(true);
                      }}
                    >
                      Add User
                    </Button>
                  </ProtectedComponent>
                </Box>

                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                                {user.username.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">
                                  {user.username}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {user.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getRoleIcon(user.role)}
                              label={ROLE_DEFINITIONS[user.role as UserRole]?.displayName || user.role}
                              color={getRoleColor(user.role as UserRole) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={user.isActive ? <CheckCircle /> : <Cancel />}
                              label={user.isActive ? 'Active' : 'Inactive'}
                              color={user.isActive ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {user.lastLogin ? formatTimeAgo(user.lastLogin) : 'Never'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <ProtectedComponent permission={PERMISSIONS.USERS_UPDATE}>
                                <Tooltip title="Edit User">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setUserDialogOpen(true);
                                    }}
                                  >
                                    <Edit />
                                  </IconButton>
                                </Tooltip>
                              </ProtectedComponent>

                              {user.id !== currentUser?.id && (
                                <ProtectedComponent permission={PERMISSIONS.USERS_UPDATE}>
                                  <Tooltip title={user.isActive ? 'Deactivate' : 'Activate'}>
                                    <IconButton size="small">
                                      <Block />
                                    </IconButton>
                                  </Tooltip>
                                </ProtectedComponent>
                              )}

                              {user.id !== currentUser?.id && (
                                <ProtectedComponent permission={PERMISSIONS.USERS_DELETE}>
                                  <Tooltip title="Delete User">
                                    <IconButton size="small" color="error">
                                      <Delete />
                                    </IconButton>
                                  </Tooltip>
                                </ProtectedComponent>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Activity Tracking Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Timeline color="primary" />
                  Recent Activity
                </Typography>

                <List>
                  {activities.slice(0, 10).map((activity, index) => {
                    // Find the user for this activity to show their avatar
                    const activityUser = users.find(u => u.username === activity.username);
                    
                    return (
                      <React.Fragment key={activity.id}>
                        <ListItem>
                          <ListItemAvatar>
                            {activityUser ? (
                              <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32 }}>
                                {activityUser.username.charAt(0).toUpperCase()}
                              </Avatar>
                            ) : (
                              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                {getActionIcon(activity.action as ActivityAction)}
                              </Avatar>
                            )}
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2">
                                <strong>{activity.username}</strong> {activity.action.replace('_', ' ')}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  {activity.resource} • {formatTimeAgo(activity.timestamp)}
                                </Typography>
                                {!activity.success && (
                                  <Chip
                                    label="Failed"
                                    color="error"
                                    size="small"
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < activities.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </List>

                {activities.length === 0 && (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                    No recent activity
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Activity Stats */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Analytics color="primary" />
                  Activity Statistics
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary.main">
                        {stats?.totalActivities || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Activities
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        {stats?.uniqueUsers || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Active Users
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main">
                        {stats ? Math.round(stats.errorRate * 100) : 0}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Error Rate
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main">
                        {stats ? Math.round(stats.averageSessionDuration / 60000) : 0}m
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Avg Session
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {stats?.commonActions && stats.commonActions.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Most Common Actions
                    </Typography>
                    {stats.commonActions.slice(0, 5).map((action) => (
                      <Box key={action.action} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {action.action.replace('_', ' ')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {action.count}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </ProtectedComponent>
    </Box>
  );
};

export default UserManagement;