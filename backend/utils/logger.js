const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Dashboard instance will be set by the main application
let dashboardInstance = null;

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

// Custom transport for dashboard logs
class DashboardTransport extends winston.Transport {
  log(info, callback) {
    try {
      if (dashboardInstance && typeof dashboardInstance.addLog === 'function') {
        dashboardInstance.addLog(info.level, info.message, info);
      }
    } catch (error) {
      // Don't let dashboard logging errors break the main application
      console.error('Dashboard logging error:', error.message);
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

module.exports = logger;