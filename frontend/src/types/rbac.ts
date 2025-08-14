export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export type UserRole = 'admin' | 'trader' | 'analyst' | 'viewer';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface RoleDefinition {
  name: UserRole;
  displayName: string;
  description: string;
  permissions: string[];
  hierarchy: number; // Higher number = more permissions
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access with administrative privileges',
    permissions: ['*'],
    hierarchy: 100,
  },
  trader: {
    name: 'trader',
    displayName: 'Trader',
    description: 'Full trading access with portfolio management',
    permissions: [
      'trading.create',
      'trading.read',
      'trading.update',
      'trading.delete',
      'portfolio.read',
      'portfolio.update',
      'bots.create',
      'bots.read',
      'bots.update',
      'bots.delete',
      'analytics.read',
      'settings.read',
      'settings.update',
    ],
    hierarchy: 75,
  },
  analyst: {
    name: 'analyst',
    displayName: 'Analyst',
    description: 'Read-only access to analytics and reports',
    permissions: [
      'analytics.read',
      'portfolio.read',
      'bots.read',
      'trading.read',
      'reports.read',
      'reports.create',
    ],
    hierarchy: 50,
  },
  viewer: {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Limited read-only access to basic information',
    permissions: [
      'dashboard.read',
      'portfolio.read',
      'analytics.read',
    ],
    hierarchy: 25,
  },
};

export const PERMISSIONS = {
  // Trading permissions
  TRADING_CREATE: 'trading.create',
  TRADING_READ: 'trading.read',
  TRADING_UPDATE: 'trading.update',
  TRADING_DELETE: 'trading.delete',
  
  // Portfolio permissions
  PORTFOLIO_READ: 'portfolio.read',
  PORTFOLIO_UPDATE: 'portfolio.update',
  PORTFOLIO_DELETE: 'portfolio.delete',
  
  // Bot permissions
  BOTS_CREATE: 'bots.create',
  BOTS_READ: 'bots.read',
  BOTS_UPDATE: 'bots.update',
  BOTS_DELETE: 'bots.delete',
  
  // Analytics permissions
  ANALYTICS_READ: 'analytics.read',
  ANALYTICS_CREATE: 'analytics.create',
  
  // Settings permissions
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  SETTINGS_SYSTEM: 'settings.system',
  
  // User management permissions
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  
  // System permissions
  SYSTEM_CONFIG: 'system.config',
  SYSTEM_LOGS: 'system.logs',
  SYSTEM_BACKUP: 'system.backup',
  
  // All permissions
  ALL: '*',
} as const;

export type PermissionType = typeof PERMISSIONS[keyof typeof PERMISSIONS];