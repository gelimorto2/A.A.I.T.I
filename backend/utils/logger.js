const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Dashboard instance will be set by the main application
let dashboardInstance = null;

// In-memory recent logs buffer for quick API access
const RECENT_LOGS_MAX = 50;
let recentLogs = [];

// GitHub issue reporter instance
let githubReporter = null;

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create logs directory:', error.message);
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'aaiti-backend' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      handleExceptions: true
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      handleExceptions: true
    })
  ],
  exitOnError: false
});

// Custom transport for dashboard logs and GitHub issue reporting
class DashboardTransport extends winston.Transport {
  log(info, callback) {
    try {
      const entry = {
        timestamp: info.timestamp || new Date().toISOString(),
        level: info.level,
        message: info.message,
        meta: { ...info }
      };

      // Track recent logs for API access
      recentLogs.push(entry);
      if (recentLogs.length > RECENT_LOGS_MAX) {
        recentLogs = recentLogs.slice(-RECENT_LOGS_MAX);
      }

      // Send to dashboard
      if (dashboardInstance && typeof dashboardInstance.addLog === 'function') {
        dashboardInstance.addLog(info.level, info.message, info);
      }

      // Send critical errors to GitHub Issues (only if reporter enabled)
      if (githubReporter && githubReporter.getStatus && githubReporter.getStatus().enabled && (info.level === 'error' || info.level === 'critical')) {
        const error = new Error(info.message);
        error.stack = info.stack;
        error.metadata = info.metadata || info;
        
        githubReporter.reportError(error, {
          severity: info.level,
          timestamp: info.timestamp,
          service: info.service,
          additionalInfo: JSON.stringify(info, null, 2)
        }).catch(err => {
          // Don't let GitHub reporting errors break the main application
          console.error('GitHub issue reporting error:', err.message);
        });
      }
    } catch (error) {
      // Don't let logging errors break the main application
      console.error('Logging transport error:', error.message);
    }
    callback();
  }
}

// Add dashboard transport
logger.add(new DashboardTransport());

// If we're not in production, log to console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Function to set dashboard instance
logger.setDashboard = (dashboard) => {
  dashboardInstance = dashboard;
};

// Function to set GitHub issue reporter
logger.setGitHubReporter = (reporter) => {
  githubReporter = reporter;
  console.log('GitHub issue reporter connected to logger');
};

// Enhanced logging methods with GitHub integration
logger.reportError = async (error, context = {}) => {
  logger.error(error.message, { stack: error.stack, ...context });
  
  if (githubReporter && githubReporter.getStatus && githubReporter.getStatus().enabled) {
    try {
      await githubReporter.reportError(error, context);
    } catch (err) {
      console.error('Failed to report error to GitHub:', err.message);
    }
  }
};

logger.reportPerformanceIssue = async (metric, value, threshold, context = {}) => {
  logger.warn(`Performance threshold exceeded: ${metric}`, {
    metric,
    value,
    threshold,
    percentage: ((value / threshold) * 100).toFixed(2),
    ...context
  });
  
  if (githubReporter) {
    try {
      await githubReporter.reportPerformanceIssue(metric, value, threshold, context);
    } catch (err) {
      console.error('Failed to report performance issue to GitHub:', err.message);
    }
  }
};

module.exports = logger;

// Expose recent logs helper methods at the end to avoid circular issues
logger.getRecentLogs = (limit = 10) => {
  const n = Math.max(1, Math.min(limit, RECENT_LOGS_MAX));
  return recentLogs.slice(-n);
};

logger.getLastLog = () => recentLogs.length ? recentLogs[recentLogs.length - 1] : null;