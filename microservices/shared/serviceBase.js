const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

/**
 * Common Express application setup for microservices
 */
class ServiceBase {
  constructor(serviceName, port) {
    this.serviceName = serviceName;
    this.port = port || process.env.PORT || 3000;
    this.app = express();
    this.startTime = Date.now();
    
    this.setupMiddleware();
    this.setupHealthCheck();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // Logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim(), { service: this.serviceName })
      }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    logger.info(`✅ Middleware setup completed for ${this.serviceName}`, { 
      service: this.serviceName 
    });
  }

  setupHealthCheck() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const healthData = {
        service: this.serviceName,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        memory: process.memoryUsage(),
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
      
      res.json(healthData);
    });

    // Metrics endpoint (Prometheus format)
    this.app.get('/metrics', (req, res) => {
      const metrics = this.getPrometheusMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    });

    logger.info(`✅ Health check endpoints setup for ${this.serviceName}`, { 
      service: this.serviceName 
    });
  }

  getPrometheusMetrics() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const memory = process.memoryUsage();
    
    return `
# HELP service_uptime_seconds Service uptime in seconds
# TYPE service_uptime_seconds counter
service_uptime_seconds{service="${this.serviceName}"} ${uptime}

# HELP service_memory_usage_bytes Service memory usage in bytes
# TYPE service_memory_usage_bytes gauge
service_memory_usage_bytes{service="${this.serviceName}",type="rss"} ${memory.rss}
service_memory_usage_bytes{service="${this.serviceName}",type="heapTotal"} ${memory.heapTotal}
service_memory_usage_bytes{service="${this.serviceName}",type="heapUsed"} ${memory.heapUsed}
service_memory_usage_bytes{service="${this.serviceName}",type="external"} ${memory.external}
`.trim();
  }

  addRoutes(basePath, router) {
    this.app.use(basePath, router);
    logger.info(`✅ Routes registered for ${basePath}`, { 
      service: this.serviceName 
    });
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logger.info(`🚀 ${this.serviceName} started on port ${this.port}`, {
          service: this.serviceName,
          port: this.port,
          environment: process.env.NODE_ENV,
          version: process.env.SERVICE_VERSION || '1.0.0'
        });
        resolve(this.server);
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        logger.info(`🛑 ${this.serviceName} stopped`, { 
          service: this.serviceName 
        });
      });
    }
  }
}

module.exports = ServiceBase;