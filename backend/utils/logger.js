const winston = require('winston');

// Dashboard instance will be set by the main application
let dashboardInstance = null;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'aaiti-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Custom transport for dashboard logs
class DashboardTransport extends winston.Transport {
  log(info, callback) {
    if (dashboardInstance && dashboardInstance.addLog) {
      dashboardInstance.addLog(info.level, info.message, info);
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