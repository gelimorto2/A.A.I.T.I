const winston = require('winston');

// Create logger for microservices
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    environment: process.env.NODE_ENV || 'development',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file logging in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: '/app/logs/error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: '/app/logs/combined.log' 
  }));
}

module.exports = logger;