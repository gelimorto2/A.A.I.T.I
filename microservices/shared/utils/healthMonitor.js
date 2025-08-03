const axios = require('axios');
const { EventEmitter } = require('events');
const logger = require('./logger');

/**
 * Service Health Monitor for AAITI Microservices
 */
class ServiceHealthMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.services = new Map();
    this.checkInterval = config.checkInterval || 30000; // 30 seconds
    this.timeout = config.timeout || 5000; // 5 seconds
    this.retries = config.retries || 3;
    this.alertThreshold = config.alertThreshold || 3; // consecutive failures
    
    this.intervalId = null;
    this.isRunning = false;
    
    // Health status tracking
    this.serviceStatus = new Map();
    this.alertsSent = new Map();
  }

  /**
   * Register a service for health monitoring
   */
  registerService(serviceName, healthUrl, options = {}) {
    const serviceConfig = {
      name: serviceName,
      healthUrl,
      timeout: options.timeout || this.timeout,
      retries: options.retries || this.retries,
      alertThreshold: options.alertThreshold || this.alertThreshold,
      headers: options.headers || {},
      expectedStatus: options.expectedStatus || 200,
      expectedBody: options.expectedBody || null,
      ...options
    };

    this.services.set(serviceName, serviceConfig);
    
    // Initialize status tracking
    this.serviceStatus.set(serviceName, {
      healthy: true,
      consecutiveFailures: 0,
      lastCheck: null,
      lastError: null,
      responseTime: null,
      uptime: 0,
      totalChecks: 0,
      successfulChecks: 0
    });

    this.alertsSent.set(serviceName, false);

    logger.info(`📋 Service registered for health monitoring`, {
      service: 'health-monitor',
      targetService: serviceName,
      healthUrl
    });

    return this;
  }

  /**
   * Start health monitoring
   */
  start() {
    if (this.isRunning) {
      logger.warn('Health monitor is already running', {
        service: 'health-monitor'
      });
      return;
    }

    this.isRunning = true;
    
    // Perform initial health check
    this.performHealthChecks();
    
    // Schedule periodic health checks
    this.intervalId = setInterval(() => {
      this.performHealthChecks();
    }, this.checkInterval);

    logger.info(`💓 Health monitoring started`, {
      service: 'health-monitor',
      servicesCount: this.services.size,
      checkInterval: `${this.checkInterval}ms`
    });

    this.emit('monitor.started', {
      servicesCount: this.services.size,
      checkInterval: this.checkInterval
    });
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info(`🛑 Health monitoring stopped`, {
      service: 'health-monitor'
    });

    this.emit('monitor.stopped');
  }

  /**
   * Perform health checks on all registered services
   */
  async performHealthChecks() {
    const promises = Array.from(this.services.entries()).map(
      ([serviceName, config]) => this.checkServiceHealth(serviceName, config)
    );

    await Promise.allSettled(promises);
    
    this.emit('healthcheck.completed', this.getOverallStatus());
  }

  /**
   * Check health of a single service
   */
  async checkServiceHealth(serviceName, config) {
    const status = this.serviceStatus.get(serviceName);
    const startTime = Date.now();

    try {
      const response = await axios.get(config.healthUrl, {
        timeout: config.timeout,
        headers: config.headers,
        validateStatus: () => true // Don't throw on 4xx/5xx
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = this.validateHealthResponse(response, config);

      status.lastCheck = new Date().toISOString();
      status.responseTime = responseTime;
      status.totalChecks++;

      if (isHealthy) {
        // Service is healthy
        if (!status.healthy) {
          // Service recovered
          logger.info(`✅ Service recovered`, {
            service: 'health-monitor',
            targetService: serviceName,
            responseTime: `${responseTime}ms`,
            downtime: status.consecutiveFailures * this.checkInterval / 1000 + 's'
          });

          this.emit('service.recovered', {
            serviceName,
            responseTime,
            downtime: status.consecutiveFailures * this.checkInterval
          });

          this.alertsSent.set(serviceName, false);
        }

        status.healthy = true;
        status.consecutiveFailures = 0;
        status.successfulChecks++;
        status.lastError = null;
        status.uptime += this.checkInterval;

      } else {
        // Service is unhealthy
        this.handleUnhealthyService(serviceName, status, responseTime, 
          `HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.handleUnhealthyService(serviceName, status, responseTime, error.message);
    }
  }

  /**
   * Handle unhealthy service detection
   */
  handleUnhealthyService(serviceName, status, responseTime, errorMessage) {
    status.lastCheck = new Date().toISOString();
    status.responseTime = responseTime;
    status.totalChecks++;
    status.consecutiveFailures++;
    status.lastError = errorMessage;

    if (status.consecutiveFailures >= this.services.get(serviceName).alertThreshold) {
      if (!this.alertsSent.get(serviceName)) {
        // Send alert only once per incident
        logger.error(`❌ Service unhealthy`, {
          service: 'health-monitor',
          targetService: serviceName,
          consecutiveFailures: status.consecutiveFailures,
          error: errorMessage,
          responseTime: `${responseTime}ms`
        });

        this.emit('service.unhealthy', {
          serviceName,
          consecutiveFailures: status.consecutiveFailures,
          error: errorMessage,
          responseTime
        });

        this.alertsSent.set(serviceName, true);
      }

      status.healthy = false;
    }

    // Emit degraded event if service is failing but not yet unhealthy
    if (status.consecutiveFailures > 1 && status.consecutiveFailures < this.services.get(serviceName).alertThreshold) {
      this.emit('service.degraded', {
        serviceName,
        consecutiveFailures: status.consecutiveFailures,
        error: errorMessage
      });
    }
  }

  /**
   * Validate health response
   */
  validateHealthResponse(response, config) {
    // Check status code
    if (response.status !== config.expectedStatus) {
      return false;
    }

    // Check response body if specified
    if (config.expectedBody) {
      try {
        const body = typeof response.data === 'string' 
          ? response.data 
          : JSON.stringify(response.data);
        
        if (typeof config.expectedBody === 'string') {
          return body.includes(config.expectedBody);
        } else if (config.expectedBody instanceof RegExp) {
          return config.expectedBody.test(body);
        } else if (typeof config.expectedBody === 'function') {
          return config.expectedBody(response.data);
        }
      } catch (error) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get overall system status
   */
  getOverallStatus() {
    const services = [];
    let healthyCount = 0;
    let totalServices = this.services.size;

    for (const [serviceName, status] of this.serviceStatus) {
      const config = this.services.get(serviceName);
      
      services.push({
        name: serviceName,
        healthy: status.healthy,
        consecutiveFailures: status.consecutiveFailures,
        lastCheck: status.lastCheck,
        lastError: status.lastError,
        responseTime: status.responseTime,
        uptime: status.uptime,
        availability: status.totalChecks > 0 ? 
          (status.successfulChecks / status.totalChecks * 100).toFixed(2) + '%' : 'N/A',
        url: config.healthUrl
      });

      if (status.healthy) {
        healthyCount++;
      }
    }

    const overallHealth = healthyCount === totalServices ? 'healthy' : 
                          healthyCount > 0 ? 'degraded' : 'unhealthy';

    return {
      status: overallHealth,
      timestamp: new Date().toISOString(),
      services,
      summary: {
        total: totalServices,
        healthy: healthyCount,
        unhealthy: totalServices - healthyCount,
        availability: totalServices > 0 ? 
          (healthyCount / totalServices * 100).toFixed(1) + '%' : '0%'
      }
    };
  }

  /**
   * Get status of a specific service
   */
  getServiceStatus(serviceName) {
    const status = this.serviceStatus.get(serviceName);
    const config = this.services.get(serviceName);
    
    if (!status || !config) {
      return null;
    }

    return {
      name: serviceName,
      healthy: status.healthy,
      consecutiveFailures: status.consecutiveFailures,
      lastCheck: status.lastCheck,
      lastError: status.lastError,
      responseTime: status.responseTime,
      uptime: status.uptime,
      availability: status.totalChecks > 0 ? 
        (status.successfulChecks / status.totalChecks * 100).toFixed(2) + '%' : 'N/A',
      url: config.healthUrl,
      config: {
        timeout: config.timeout,
        retries: config.retries,
        alertThreshold: config.alertThreshold
      }
    };
  }

  /**
   * Update service configuration
   */
  updateServiceConfig(serviceName, updates) {
    const config = this.services.get(serviceName);
    if (!config) {
      throw new Error(`Service ${serviceName} not found`);
    }

    Object.assign(config, updates);
    this.services.set(serviceName, config);

    logger.info(`⚙️ Service configuration updated`, {
      service: 'health-monitor',
      targetService: serviceName,
      updates
    });
  }

  /**
   * Remove service from monitoring
   */
  unregisterService(serviceName) {
    this.services.delete(serviceName);
    this.serviceStatus.delete(serviceName);
    this.alertsSent.delete(serviceName);

    logger.info(`🗑️ Service unregistered from health monitoring`, {
      service: 'health-monitor',
      targetService: serviceName
    });
  }
}

module.exports = ServiceHealthMonitor;