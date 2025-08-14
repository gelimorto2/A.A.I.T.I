import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { 
  UserActivity, 
  UserSession, 
  ActivityStats, 
  ActivityAction, 
  ActivityFilter 
} from '../types/activity';

interface ActivityContextType {
  currentSession: UserSession | null;
  recentActivities: UserActivity[];
  stats: ActivityStats | null;
  isTracking: boolean;
  logActivity: (action: ActivityAction, resource: string, details?: Record<string, any>) => void;
  startSession: () => void;
  endSession: () => void;
  getActivities: (filter?: ActivityFilter) => Promise<UserActivity[]>;
  getStats: (dateFrom?: string, dateTo?: string) => Promise<ActivityStats>;
  setTrackingEnabled: (enabled: boolean) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};

interface ActivityProviderProps {
  children: ReactNode;
}

export const ActivityProvider: React.FC<ActivityProviderProps> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [recentActivities, setRecentActivities] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isTracking, setIsTracking] = useState(() => {
    return localStorage.getItem('activity-tracking-enabled') !== 'false';
  });

  // Activity storage in localStorage (in production, this would be sent to API)
  const storeActivity = useCallback((activity: UserActivity) => {
    if (!isTracking) return;

    try {
      const stored = localStorage.getItem('user-activities') || '[]';
      const activities = JSON.parse(stored) as UserActivity[];
      activities.push(activity);
      
      // Keep only last 1000 activities in localStorage
      if (activities.length > 1000) {
        activities.splice(0, activities.length - 1000);
      }
      
      localStorage.setItem('user-activities', JSON.stringify(activities));
      
      // Update recent activities
      setRecentActivities(prev => [activity, ...prev.slice(0, 49)]);
    } catch (error) {
      console.error('Failed to store activity:', error);
    }
  }, [isTracking]);

  const logActivity = useCallback((
    action: ActivityAction, 
    resource: string, 
    details?: Record<string, any>
  ) => {
    if (!user || !isTracking) return;

    const activity: UserActivity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id || 'unknown',
      username: user.username || 'unknown',
      action,
      resource,
      details,
      ipAddress: 'localhost', // In production, get from server
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      success: true,
    };

    storeActivity(activity);

    // Update current session
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        activities: [...prev.activities, activity],
      } : null);
    }
  }, [user, isTracking, storeActivity, currentSession]);

  const startSession = useCallback(() => {
    if (!user || !isTracking) return;

    const session: UserSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id || 'unknown',
      username: user.username || 'unknown',
      startTime: new Date().toISOString(),
      ipAddress: 'localhost',
      userAgent: navigator.userAgent,
      activities: [],
      isActive: true,
    };

    setCurrentSession(session);
    logActivity('login', 'session');
  }, [user, isTracking, logActivity]);

  const endSession = useCallback(() => {
    if (!currentSession) return;

    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(currentSession.startTime).getTime();

    const updatedSession: UserSession = {
      ...currentSession,
      endTime,
      duration,
      isActive: false,
    };

    // Store session data
    try {
      const stored = localStorage.getItem('user-sessions') || '[]';
      const sessions = JSON.parse(stored) as UserSession[];
      sessions.push(updatedSession);
      
      // Keep only last 100 sessions
      if (sessions.length > 100) {
        sessions.splice(0, sessions.length - 100);
      }
      
      localStorage.setItem('user-sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to store session:', error);
    }

    logActivity('logout', 'session', { duration });
    setCurrentSession(null);
  }, [currentSession, logActivity]);

  const getActivities = useCallback(async (filter?: ActivityFilter): Promise<UserActivity[]> => {
    try {
      const stored = localStorage.getItem('user-activities') || '[]';
      let activities = JSON.parse(stored) as UserActivity[];

      if (filter) {
        if (filter.userId) {
          activities = activities.filter(a => a.userId === filter.userId);
        }
        if (filter.username) {
          activities = activities.filter(a => a.username.includes(filter.username!));
        }
        if (filter.actions && filter.actions.length > 0) {
          activities = activities.filter(a => filter.actions!.includes(a.action as ActivityAction));
        }
        if (filter.resources && filter.resources.length > 0) {
          activities = activities.filter(a => filter.resources!.includes(a.resource));
        }
        if (filter.dateFrom) {
          activities = activities.filter(a => a.timestamp >= filter.dateFrom!);
        }
        if (filter.dateTo) {
          activities = activities.filter(a => a.timestamp <= filter.dateTo!);
        }
        if (filter.success !== undefined) {
          activities = activities.filter(a => a.success === filter.success);
        }
        if (filter.ipAddress) {
          activities = activities.filter(a => a.ipAddress === filter.ipAddress);
        }
      }

      // Sort by timestamp (newest first)
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      if (filter?.offset) {
        activities = activities.slice(filter.offset);
      }
      if (filter?.limit) {
        activities = activities.slice(0, filter.limit);
      }

      return activities;
    } catch (error) {
      console.error('Failed to get activities:', error);
      return [];
    }
  }, []);

  const getStats = useCallback(async (dateFrom?: string, dateTo?: string): Promise<ActivityStats> => {
    try {
      const activities = await getActivities({ dateFrom, dateTo });
      
      // Calculate stats
      const uniqueUsers = new Set(activities.map(a => a.userId)).size;
      
      const actionCounts: Record<string, number> = {};
      activities.forEach(a => {
        actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
      });
      
      const commonActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      const hourCounts: Record<number, number> = {};
      const dayCounts: Record<string, number> = {};
      
      activities.forEach(a => {
        const date = new Date(a.timestamp);
        const hour = date.getHours();
        const day = date.toISOString().split('T')[0];
        
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      
      const activityByHour = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: hourCounts[hour] || 0,
      }));
      
      const activityByDay = Object.entries(dayCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      const errorCount = activities.filter(a => !a.success).length;
      const errorRate = activities.length > 0 ? errorCount / activities.length : 0;
      
      // Calculate average session duration
      const sessionsStored = localStorage.getItem('user-sessions') || '[]';
      const sessions = JSON.parse(sessionsStored) as UserSession[];
      const avgSessionDuration = sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
        : 0;
      
      const mostActiveUser = Object.entries(
        activities.reduce((acc, a) => {
          acc[a.username] = (acc[a.username] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      return {
        totalActivities: activities.length,
        uniqueUsers,
        mostActiveUser,
        commonActions,
        activityByHour,
        activityByDay,
        errorRate,
        averageSessionDuration: avgSessionDuration,
      };
    } catch (error) {
      console.error('Failed to calculate stats:', error);
      return {
        totalActivities: 0,
        uniqueUsers: 0,
        mostActiveUser: '',
        commonActions: [],
        activityByHour: [],
        activityByDay: [],
        errorRate: 0,
        averageSessionDuration: 0,
      };
    }
  }, [getActivities]);

  const setTrackingEnabled = useCallback((enabled: boolean) => {
    setIsTracking(enabled);
    localStorage.setItem('activity-tracking-enabled', enabled.toString());
  }, []);

  // Load recent activities on mount
  useEffect(() => {
    if (isTracking) {
      getActivities({ limit: 50 }).then(setRecentActivities);
      getStats().then(setStats);
    }
  }, [isTracking, getActivities, getStats]);

  // Start session when user logs in
  useEffect(() => {
    if (user && isTracking && !currentSession) {
      startSession();
    }
  }, [user, isTracking, currentSession, startSession]);

  // End session on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentSession) {
        endSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentSession, endSession]);

  const value: ActivityContextType = {
    currentSession,
    recentActivities,
    stats,
    isTracking,
    logActivity,
    startSession,
    endSession,
    getActivities,
    getStats,
    setTrackingEnabled,
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
};