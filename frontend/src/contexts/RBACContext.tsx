import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { 
  User, 
  UserRole, 
  Permission, 
  PermissionType, 
  ROLE_DEFINITIONS,
  PERMISSIONS 
} from '../types/rbac';

interface RBACContextType {
  user: User | null;
  hasPermission: (permission: PermissionType) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasMinimumRole: (role: UserRole) => boolean;
  canAccess: (resource: string, action: string) => boolean;
  getUserPermissions: () => string[];
  isAdmin: () => boolean;
  isTrader: () => boolean;
  isAnalyst: () => boolean;
  isViewer: () => boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};

interface RBACProviderProps {
  children: ReactNode;
}

export const RBACProvider: React.FC<RBACProviderProps> = ({ children }) => {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (authUser) {
      // Convert auth user to RBAC user format
      const rbacUser: User = {
        id: authUser.id || 'unknown',
        username: authUser.username || 'unknown',
        email: authUser.email || '',
        role: (authUser.role as UserRole) || 'viewer',
        permissions: getRolePermissions(authUser.role as UserRole),
        createdAt: new Date().toISOString(), // Default since not available in auth user
        lastLogin: new Date().toISOString(), // Default since not available in auth user
        isActive: true,
      };
      setUser(rbacUser);
    } else {
      setUser(null);
    }
  }, [authUser]);

  const getRolePermissions = (role: UserRole): Permission[] => {
    const roleDefinition = ROLE_DEFINITIONS[role];
    if (!roleDefinition) return [];

    return roleDefinition.permissions.map((permissionName, index) => ({
      id: `${role}-${index}`,
      name: permissionName,
      resource: permissionName.split('.')[0] || '*',
      action: permissionName.split('.')[1] || '*',
    }));
  };

  const getUserPermissions = useCallback((): string[] => {
    if (!user) return [];
    
    const roleDefinition = ROLE_DEFINITIONS[user.role];
    if (!roleDefinition) return [];
    
    return roleDefinition.permissions;
  }, [user]);

  const hasPermission = useCallback((permission: PermissionType): boolean => {
    if (!user) return false;

    // Admin has all permissions
    if (user.role === 'admin') return true;

    // Check for explicit permission
    const userPermissions = getUserPermissions();
    return userPermissions.includes(permission) || userPermissions.includes(PERMISSIONS.ALL);
  }, [user, getUserPermissions]);

  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.role === role;
  }, [user]);

  const hasMinimumRole = useCallback((role: UserRole): boolean => {
    if (!user) return false;

    const userRoleHierarchy = ROLE_DEFINITIONS[user.role]?.hierarchy || 0;
    const requiredRoleHierarchy = ROLE_DEFINITIONS[role]?.hierarchy || 0;

    return userRoleHierarchy >= requiredRoleHierarchy;
  }, [user]);

  const canAccess = useCallback((resource: string, action: string): boolean => {
    if (!user) return false;

    // Admin can access everything
    if (user.role === 'admin') return true;

    const permissionString = `${resource}.${action}`;
    return hasPermission(permissionString as PermissionType);
  }, [user, hasPermission]);

  const isAdmin = useCallback((): boolean => {
    return hasRole('admin');
  }, [hasRole]);

  const isTrader = useCallback((): boolean => {
    return hasMinimumRole('trader');
  }, [hasMinimumRole]);

  const isAnalyst = useCallback((): boolean => {
    return hasMinimumRole('analyst');
  }, [hasMinimumRole]);

  const isViewer = useCallback((): boolean => {
    return hasMinimumRole('viewer');
  }, [hasMinimumRole]);

  const value: RBACContextType = {
    user,
    hasPermission,
    hasRole,
    hasMinimumRole,
    canAccess,
    getUserPermissions,
    isAdmin,
    isTrader,
    isAnalyst,
    isViewer,
  };

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  );
};

// Higher-order component for protecting routes/components
interface ProtectedComponentProps {
  children: ReactNode;
  permission?: PermissionType;
  role?: UserRole;
  minimumRole?: UserRole;
  fallback?: ReactNode;
  resource?: string;
  action?: string;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  permission,
  role,
  minimumRole,
  fallback = null,
  resource,
  action,
}) => {
  const { hasPermission, hasRole, hasMinimumRole, canAccess } = useRBAC();

  let hasAccess = true;

  if (permission) {
    hasAccess = hasAccess && hasPermission(permission);
  }

  if (role) {
    hasAccess = hasAccess && hasRole(role);
  }

  if (minimumRole) {
    hasAccess = hasAccess && hasMinimumRole(minimumRole);
  }

  if (resource && action) {
    hasAccess = hasAccess && canAccess(resource, action);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};