import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  dashboardLayout: any;
  enabledWidgets: string[];
  notifications: {
    email: boolean;
    browser: boolean;
    trading: boolean;
    system: boolean;
    sound: boolean;
  };
  trading: {
    confirmOrders: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
    riskLimits: {
      maxPositionSize: number;
      maxDailyLoss: number;
      stopLossPercentage: number;
      takeProfitPercentage: number;
    };
    defaultOrderType: 'market' | 'limit' | 'stop';
    defaultTimeInForce: 'GTC' | 'IOC' | 'FOK';
  };
  interface: {
    language: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    numberFormat: string;
    chartType: string;
    showAdvancedFeatures: boolean;
  };
  privacy: {
    shareUsageData: boolean;
    trackingEnabled: boolean;
    cookiesAccepted: boolean;
  };
  performance: {
    highPerformanceMode: boolean;
    animationsEnabled: boolean;
    dataRefreshRate: number;
  };
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  exportPreferences: () => string;
  importPreferences: (data: string) => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  dashboardLayout: null,
  enabledWidgets: ['bots-status', 'pnl', 'win-rate', 'system-health', 'market-heatmap'],
  notifications: {
    email: true,
    browser: true,
    trading: true,
    system: true,
    sound: true,
  },
  trading: {
    confirmOrders: true,
    autoRefresh: true,
    refreshInterval: 5,
    riskLimits: {
      maxPositionSize: 10000,
      maxDailyLoss: 1000,
      stopLossPercentage: 5,
      takeProfitPercentage: 10,
    },
    defaultOrderType: 'market',
    defaultTimeInForce: 'GTC',
  },
  interface: {
    language: 'en',
    currency: 'USD',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'en-US',
    chartType: 'candlestick',
    showAdvancedFeatures: false,
  },
  privacy: {
    shareUsageData: false,
    trackingEnabled: false,
    cookiesAccepted: false,
  },
  performance: {
    highPerformanceMode: false,
    animationsEnabled: true,
    dataRefreshRate: 1000,
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
  const [isLoading, setIsLoading] = useState(false);

  // Load user preferences on mount or user change
  useEffect(() => {
    const loadPreferences = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
          // Try to load from server first
          const response = await fetch(`/api/users/${user.id}/preferences`);

          if (response.ok) {
            const serverPreferences = await response.json();
            setPreferences({ ...defaultPreferences, ...serverPreferences });
          } else {
            // Fallback to localStorage
            const saved = localStorage.getItem(`user-preferences-${user.id}`);
            if (saved) {
              const parsedPreferences = JSON.parse(saved);
              setPreferences({ ...defaultPreferences, ...parsedPreferences });
            }
          }
        } catch (error) {
          console.error('Failed to load user preferences:', error);
          // Fallback to localStorage
          const saved = localStorage.getItem(`user-preferences-${user.id}`);
          if (saved) {
            try {
              const parsedPreferences = JSON.parse(saved);
              setPreferences({ ...defaultPreferences, ...parsedPreferences });
            } catch (parseError) {
              console.error('Failed to parse local preferences:', parseError);
              setPreferences(defaultPreferences);
            }
          }
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadPreferences();
  }, [user?.id]);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    
    if (user?.id) {
      // Save to localStorage immediately
      localStorage.setItem(`user-preferences-${user.id}`, JSON.stringify(newPreferences));
      
      // Try to save to server
      try {
        await fetch(`/api/users/${user.id}/preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newPreferences)
        });
      } catch (error) {
        console.error('Failed to save preferences to server:', error);
        // LocalStorage already updated, so not critical
      }
    }
  }, [preferences, user?.id]);

  const resetPreferences = useCallback(async () => {
    setPreferences(defaultPreferences);
    if (user?.id) {
      localStorage.removeItem(`user-preferences-${user.id}`);
      
      // Try to reset on server
      try {
        await fetch(`/api/users/${user.id}/preferences`, {
          method: 'DELETE',
          headers: {}
        });
      } catch (error) {
        console.error('Failed to reset preferences on server:', error);
      }
    }
  }, [user?.id]);

  const exportPreferences = useCallback(() => {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      username: user?.username,
      preferences: preferences,
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [preferences, user?.username]);

  const importPreferences = useCallback(async (data: string): Promise<boolean> => {
    try {
      const importData = JSON.parse(data);
      
      // Validate import data
      if (!importData.preferences || !importData.version) {
        throw new Error('Invalid import data format');
      }

      // Version compatibility check
      if (importData.version !== '1.0') {
        console.warn('Import data version mismatch, attempting compatibility...');
      }

      // Merge with defaults to ensure all required fields exist
      const newPreferences = { ...defaultPreferences, ...importData.preferences };
      
      await updatePreferences(newPreferences);
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }, [updatePreferences]);

  // Enhanced permission system based on user role
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user?.role) return false;

    const rolePermissions: Record<string, string[]> = {
      admin: ['*'], // Admin has all permissions
      trader: [
        'dashboard.view',
        'dashboard.edit',
        'bots.view',
        'bots.create',
        'bots.edit',
        'bots.delete',
        'bots.start',
        'bots.stop',
        'trading.execute',
        'trading.configure',
        'analytics.view',
        'analytics.export',
        'ml.view',
        'ml.create',
        'ml.edit',
        'settings.view',
        'settings.edit',
        'preferences.export',
        'preferences.import',
      ],
      viewer: [
        'dashboard.view',
        'bots.view',
        'analytics.view',
        'ml.view',
        'settings.view',
      ],
      analyst: [
        'dashboard.view',
        'bots.view',
        'analytics.view',
        'analytics.advanced',
        'analytics.export',
        'ml.view',
        'ml.create',
        'ml.edit',
        'ml.backtest',
        'settings.view',
        'settings.edit',
        'preferences.export',
      ],
      demo: [
        'dashboard.view',
        'bots.view',
        'analytics.view',
        'ml.view',
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
  }, [user?.role]);

  const value = {
    preferences,
    updatePreferences,
    resetPreferences,
    exportPreferences,
    importPreferences,
    hasPermission,
    isLoading,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};