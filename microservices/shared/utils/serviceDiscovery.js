const axios = require('axios');
const logger = require('./logger');

/**
 * Service Discovery Client for microservices communication
 */
class ServiceDiscovery {
  constructor() {
    this.services = new Map();
    this.healthCheckInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000; // 30 seconds
    this.registryUrl = process.env.SERVICE_REGISTRY_URL || 'http://localhost:8500'; // Consul default
    
    this.startHealthChecking();
  }

  /**
   * Register a service instance
   */
  async registerService(serviceName, host, port, healthCheckPath = '/health') {
    const serviceId = `${serviceName}-${host}-${port}`;
    const serviceInfo = {
      id: serviceId,
      name: serviceName,
      host,
      port,
      healthCheckPath,
      url: `http://${host}:${port}`,
      registeredAt: new Date().toISOString(),
      lastHealthCheck: null,
      healthy: true
    };

    this.services.set(serviceId, serviceInfo);
    
    logger.info(`📋 Service registered: ${serviceName}`, {
      serviceId,
      host,
      port,
      service: 'service-discovery'
    });

    return serviceId;
  }

  /**
   * Discover service instances
   */
  discoverService(serviceName) {
    const instances = [];
    
    for (const [id, service] of this.services) {
      if (service.name === serviceName && service.healthy) {
        instances.push(service);
      }
    }

    logger.debug(`🔍 Service discovery for ${serviceName}`, {
      instanceCount: instances.length,
      service: 'service-discovery'
    });

    return instances;
  }

  /**
   * Get a healthy service instance (simple round-robin)
   */
  getServiceInstance(serviceName) {
    const instances = this.discoverService(serviceName);
    
    if (instances.length === 0) {
      throw new Error(`No healthy instances found for service: ${serviceName}`);
    }

    // Simple round-robin selection
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  /**
   * Make HTTP request to a service
   */
  async callService(serviceName, path, options = {}) {
    try {
      const instance = this.getServiceInstance(serviceName);
      const url = `${instance.url}${path}`;
      
      logger.debug(`🌐 Calling service: ${serviceName}${path}`, {
        url,
        method: options.method || 'GET',
        service: 'service-discovery'
      });

      const response = await axios({
        url,
        method: options.method || 'GET',
        data: options.data,
        headers: options.headers,
        timeout: options.timeout || 10000
      });

      return response.data;
    } catch (error) {
      logger.error(`❌ Service call failed: ${serviceName}${path}`, {
        error: error.message,
        service: 'service-discovery'
      });
      throw error;
    }
  }

  /**
   * Perform health checks on registered services
   */
  async performHealthChecks() {
    for (const [id, service] of this.services) {
      try {
        const healthUrl = `${service.url}${service.healthCheckPath}`;
        const response = await axios.get(healthUrl, { timeout: 5000 });
        
        if (response.status === 200) {
          service.healthy = true;
          service.lastHealthCheck = new Date().toISOString();
        } else {
          service.healthy = false;
        }
      } catch (error) {
        service.healthy = false;
        logger.warn(`⚠️ Health check failed for ${service.name}`, {
          serviceId: id,
          error: error.message,
          service: 'service-discovery'
        });
      }
    }
  }

  /**
   * Start periodic health checking
   */
  startHealthChecking() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);

    logger.info(`💓 Health checking started`, {
      interval: `${this.healthCheckInterval}ms`,
      service: 'service-discovery'
    });
  }

  /**
   * Get all registered services status
   */
  getServiceStatus() {
    const status = {};
    
    for (const [id, service] of this.services) {
      if (!status[service.name]) {
        status[service.name] = [];
      }
      
      status[service.name].push({
        id,
        host: service.host,
        port: service.port,
        healthy: service.healthy,
        lastHealthCheck: service.lastHealthCheck,
        registeredAt: service.registeredAt
      });
    }

    return status;
  }
}

// Singleton instance
const serviceDiscovery = new ServiceDiscovery();

module.exports = serviceDiscovery;