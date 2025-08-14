export interface UserActivity {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  duration?: number; // in milliseconds
  success: boolean;
  errorMessage?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  username: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  ipAddress?: string;
  userAgent?: string;
  activities: UserActivity[];
  isActive: boolean;
}

export interface ActivityStats {
  totalActivities: number;
  uniqueUsers: number;
  mostActiveUser: string;
  commonActions: Array<{
    action: string;
    count: number;
  }>;
  activityByHour: Array<{
    hour: number;
    count: number;
  }>;
  activityByDay: Array<{
    date: string;
    count: number;
  }>;
  errorRate: number;
  averageSessionDuration: number;
}

export type ActivityAction = 
  | 'login'
  | 'logout'
  | 'view_dashboard'
  | 'view_analytics'
  | 'create_bot'
  | 'update_bot'
  | 'delete_bot'
  | 'start_bot'
  | 'stop_bot'
  | 'create_portfolio'
  | 'update_portfolio'
  | 'place_order'
  | 'cancel_order'
  | 'update_settings'
  | 'export_data'
  | 'import_data'
  | 'create_strategy'
  | 'update_strategy'
  | 'run_backtest'
  | 'view_reports'
  | 'download_report'
  | 'change_theme'
  | 'widget_interaction'
  | 'page_navigation'
  | 'api_call'
  | 'error'
  | 'performance_issue';

export interface ActivityFilter {
  userId?: string;
  username?: string;
  actions?: ActivityAction[];
  resources?: string[];
  dateFrom?: string;
  dateTo?: string;
  success?: boolean;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}