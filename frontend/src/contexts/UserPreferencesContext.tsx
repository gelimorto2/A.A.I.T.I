import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

interface UserPreferences {
  theme: 'light' | 'dark';
  dashboardLayout: any;
  enabledWidgets: string[];
  notifications: {
    email: boolean;
    browser: boolean;
    trading: boolean;
    system: boolean;
  };
  trading: {
    confirmOrders: boolean;
    riskLimits: {
      maxPositionSize: number;
      maxDailyLoss: number;
    };
  };
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  hasPermission: (permission: string) => boolean;
}

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  dashboardLayout: null,
  enabledWidgets: ['bots-status', 'pnl', 'win-rate', 'system-health', 'market-heatmap'],
  notifications: {
    email: true,
    browser: true,
    trading: true,
    system: true,
  },
  trading: {
    confirmOrders: true,
    riskLimits: {
      maxPositionSize: 10000,
      maxDailyLoss: 1000,
    },
  },
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};

interface UserPreferencesProviderProps {
  children: ReactNode;
}

export const UserPreferencesProvider: React.FC<UserPreferencesProviderProps> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  // Load user preferences on mount or user change
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`user-preferences-${user.id}`);
      if (saved) {
        try {
          const parsedPreferences = JSON.parse(saved);
          setPreferences({ ...defaultPreferences, ...parsedPreferences });
        } catch (error) {
          console.error('Failed to parse user preferences:', error);
          setPreferences(defaultPreferences);
        }
      }
    }
  }, [user?.id]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    
    if (user?.id) {
      localStorage.setItem(`user-preferences-${user.id}`, JSON.stringify(newPreferences));
    }
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    if (user?.id) {
      localStorage.removeItem(`user-preferences-${user.id}`);
    }
  };

  // Simple permission system based on user role
  const hasPermission = (permission: string): boolean => {
    if (!user?.role) return false;

    const rolePermissions: Record<string, string[]> = {
      admin: ['*'], // Admin has all permissions
      trader: [
        'dashboard.view',
        'bots.view',
        'bots.create',
        'bots.edit',
        'bots.delete',
        'trading.execute',
        'analytics.view',
        'ml.view',
        'ml.create',
        'settings.view',
        'settings.edit',
      ],
      viewer: [
        'dashboard.view',
        'bots.view',
        'analytics.view',
        'ml.view',
      ],
      analyst: [
        'dashboard.view',
        'bots.view',
        'analytics.view',
        'analytics.advanced',
        'ml.view',
        'ml.create',
        'ml.edit',
        'settings.view',
      ],
    };

    const userPermissions = rolePermissions[user.role] || [];
    
    // Admin has all permissions
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check specific permission
    return userPermissions.includes(permission);
  };

  const value = {
    preferences,
    updatePreferences,
    resetPreferences,
    hasPermission,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};