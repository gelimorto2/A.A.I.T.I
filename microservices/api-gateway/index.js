const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const serviceDiscovery = require('../shared/utils/serviceDiscovery');
const logger = require('../shared/utils/logger');

require('dotenv').config();

class APIGateway {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.startTime = Date.now();
    
    // Service configuration
    this.services = {
      'auth-service': {
        path: '/api/auth',
        target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        healthCheck: '/health'
      },
      'trading-service': {
        path: '/api/trading',
        target: process.env.TRADING_SERVICE_URL || 'http://localhost:3002',
        healthCheck: '/health'
      },
      'analytics-service': {
        path: '/api/analytics',
        target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3003',
        healthCheck: '/health'
      },
      'ml-service': {
        path: '/api/ml',
        target: process.env.ML_SERVICE_URL || 'http://localhost:3004',
        healthCheck: '/health'
      },
      'notification-service': {
        path: '/api/notifications',
        target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
        healthCheck: '/health'
      },
      'user-service': {
        path: '/api/users',
        target: process.env.USER_SERVICE_URL || 'http://localhost:3006',
        healthCheck: '/health'
      }
    };

    this.setupMiddleware();
    this.setupProxies();
    this.setupHealthChecking();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Enhanced rate limiting for API Gateway
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 1000, // Higher limit for gateway
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW || 900000) / 1000)
      }
    });
    this.app.use(limiter);

    // Logging with custom format
    this.app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim(), { service: 'api-gateway' })
      }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    logger.info('✅ API Gateway middleware setup completed', { 
      service: 'api-gateway' 
    });
  }

  setupProxies() {
    Object.entries(this.services).forEach(([serviceName, config]) => {
      const proxyOptions = {
        target: config.target,
        changeOrigin: true,
        timeout: 30000, // 30 seconds
        retries: 3,
        logLevel: 'info',
        onError: (err, req, res) => {
          logger.error(`❌ Proxy error for ${serviceName}`, {
            service: 'api-gateway',
            targetService: serviceName,
            error: err.message,
            url: req.url
          });
          
          if (!res.headersSent) {
            res.status(503).json({
              error: 'Service temporarily unavailable',
              service: serviceName,
              timestamp: new Date().toISOString()
            });
          }
        },
        onProxyReq: (proxyReq, req, res) => {
          // Add gateway headers
          proxyReq.setHeader('X-Gateway-Service', 'aaiti-api-gateway');
          proxyReq.setHeader('X-Gateway-Version', '1.0.0');
          proxyReq.setHeader('X-Request-ID', req.headers['x-request-id'] || require('crypto').randomUUID());
          
          logger.debug(`🔄 Proxying request to ${serviceName}`, {
            service: 'api-gateway',
            targetService: serviceName,
            method: req.method,
            url: req.url,
            target: config.target
          });
        },
        onProxyRes: (proxyRes, req, res) => {
          // Add response headers
          proxyRes.headers['X-Gateway-Service'] = 'aaiti-api-gateway';
          proxyRes.headers['X-Response-Time'] = Date.now() - req.startTime;
          
          logger.debug(`✅ Response from ${serviceName}`, {
            service: 'api-gateway',
            targetService: serviceName,
            status: proxyRes.statusCode,
            responseTime: Date.now() - req.startTime + 'ms'
          });
        }
      };

      // Add request timing
      this.app.use(config.path, (req, res, next) => {
        req.startTime = Date.now();
        next();
      });

      // Create proxy middleware
      const proxy = createProxyMiddleware(proxyOptions);
      this.app.use(config.path, proxy);

      logger.info(`✅ Proxy configured for ${serviceName}`, {
        service: 'api-gateway',
        path: config.path,
        target: config.target
      });
    });
  }

  setupHealthChecking() {
    // Gateway health endpoint
    this.app.get('/health', async (req, res) => {
      const health = {
        service: 'api-gateway',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        memory: process.memoryUsage(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {}
      };

      // Check health of all services
      for (const [serviceName, config] of Object.entries(this.services)) {
        try {
          const healthUrl = `${config.target}${config.healthCheck}`;
          const response = await require('axios').get(healthUrl, { timeout: 5000 });
          
          health.services[serviceName] = {
            status: 'healthy',
            target: config.target,
            responseTime: response.headers['x-response-time'] || 'unknown'
          };
        } catch (error) {
          health.services[serviceName] = {
            status: 'unhealthy',
            target: config.target,
            error: error.message
          };
        }
      }

      // Determine overall status
      const unhealthyServices = Object.values(health.services).filter(s => s.status === 'unhealthy');
      if (unhealthyServices.length > 0) {
        health.status = 'degraded';
        res.status(503);
      }

      res.json(health);
    });

    // Service discovery status endpoint
    this.app.get('/services', (req, res) => {
      res.json({
        discoveredServices: serviceDiscovery.getServiceStatus(),
        configuredServices: this.services,
        timestamp: new Date().toISOString()
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      const memory = process.memoryUsage();
      
      const metrics = `
# HELP api_gateway_uptime_seconds API Gateway uptime in seconds
# TYPE api_gateway_uptime_seconds counter
api_gateway_uptime_seconds ${uptime}

# HELP api_gateway_memory_usage_bytes API Gateway memory usage in bytes
# TYPE api_gateway_memory_usage_bytes gauge
api_gateway_memory_usage_bytes{type="rss"} ${memory.rss}
api_gateway_memory_usage_bytes{type="heapTotal"} ${memory.heapTotal}
api_gateway_memory_usage_bytes{type="heapUsed"} ${memory.heapUsed}
api_gateway_memory_usage_bytes{type="external"} ${memory.external}
`.trim();

      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    });

    // Periodic health checks (every 30 seconds)
    cron.schedule('*/30 * * * * *', async () => {
      logger.debug('🔍 Performing periodic service health checks', {
        service: 'api-gateway'
      });

      for (const [serviceName, config] of Object.entries(this.services)) {
        try {
          const healthUrl = `${config.target}${config.healthCheck}`;
          await require('axios').get(healthUrl, { timeout: 5000 });
        } catch (error) {
          logger.warn(`⚠️ Service health check failed: ${serviceName}`, {
            service: 'api-gateway',
            targetService: serviceName,
            target: config.target,
            error: error.message
          });
        }
      }
    });

    logger.info('✅ Health checking setup completed', { 
      service: 'api-gateway' 
    });
  }

  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logger.info(`🚀 API Gateway started on port ${this.port}`, {
          service: 'api-gateway',
          port: this.port,
          environment: process.env.NODE_ENV,
          servicesConfigured: Object.keys(this.services).length
        });

        logger.info(`🔗 API Gateway endpoints:`, {
          service: 'api-gateway',
          health: `http://localhost:${this.port}/health`,
          services: `http://localhost:${this.port}/services`,
          metrics: `http://localhost:${this.port}/metrics`
        });

        resolve(this.server);
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        logger.info('🛑 API Gateway stopped', { 
          service: 'api-gateway' 
        });
      });
    }
  }
}

// Start gateway if run directly
if (require.main === module) {
  const gateway = new APIGateway();
  
  gateway.start().catch(error => {
    logger.error('❌ Failed to start API Gateway', {
      service: 'api-gateway',
      error: error.message
    });
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => gateway.stop());
  process.on('SIGINT', () => gateway.stop());
}

module.exports = APIGateway;