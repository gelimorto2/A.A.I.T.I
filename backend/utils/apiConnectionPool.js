const axios = require('axios');
const https = require('https');
const http = require('http');
const logger = require('./logger');
const performanceConfig = require('../config/performance');

/**
 * AAITI API Connection Pool Manager
 * Implements connection pooling and optimization for external API calls
 * Part of System Enhancements - Performance Optimizations
 */

class APIConnectionPool {
  constructor(options = {}) {
    this.config = {
      maxConnections: options.maxConnections || 50,
      timeout: options.timeout || 15000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      keepAlive: options.keepAlive !== false,
      maxSockets: options.maxSockets || 20,
      maxFreeSockets: options.maxFreeSockets || 10,
      ...options
    };

    // Create HTTP/HTTPS agents with connection pooling
    this.httpAgent = new http.Agent({
      keepAlive: this.config.keepAlive,
      maxSockets: this.config.maxSockets,
      maxFreeSockets: this.config.maxFreeSockets,
      timeout: this.config.timeout
    });

    this.httpsAgent = new https.Agent({
      keepAlive: this.config.keepAlive,
      maxSockets: this.config.maxSockets,
      maxFreeSockets: this.config.maxFreeSockets,
      timeout: this.config.timeout
    });

    // Connection pool for different services
    this.pools = new Map();
    
    // Request queue for rate limiting
    this.requestQueue = [];
    this.activeRequests = 0;
    this.isProcessingQueue = false;

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      queuedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      connectionErrors: 0,
      timeoutErrors: 0,
      lastReset: new Date()
    };

    // Initialize pools for common services
    this.initializeDefaultPools();

    this.log('API Connection Pool Manager initialized', { config: this.config });
  }

  /**
   * Initialize default connection pools for common services
   */
  initializeDefaultPools() {
    const defaultServices = [
      {
        name: 'binance',
        baseURL: 'https://api.binance.com',
        maxConcurrent: 20,
        rateLimit: 1200, // requests per minute
        timeout: 10000
      },
      {
        name: 'coinbase',
        baseURL: 'https://api.coinbase.com',
        maxConcurrent: 15,
        rateLimit: 600,
        timeout: 10000
      },
      {
        name: 'alpaca',
        baseURL: 'https://paper-api.alpaca.markets',
        maxConcurrent: 10,
        rateLimit: 200,
        timeout: 15000
      },
      {
        name: 'alpha_vantage',
        baseURL: 'https://www.alphavantage.co',
        maxConcurrent: 5,
        rateLimit: 75, // 5 per minute for free tier
        timeout: 20000
      },
      {
        name: 'polygon',
        baseURL: 'https://api.polygon.io',
        maxConcurrent: 10,
        rateLimit: 300,
        timeout: 15000
      }
    ];

    for (const service of defaultServices) {
      this.createPool(service.name, service);
    }
  }

  /**
   * Create a connection pool for a specific service
   */
  createPool(serviceName, config) {
    const poolConfig = {
      baseURL: config.baseURL,
      maxConcurrent: config.maxConcurrent || 10,
      rateLimit: config.rateLimit || 100, // requests per minute
      timeout: config.timeout || this.config.timeout,
      headers: config.headers || {},
      activeConnections: 0,
      requestQueue: [],
      lastRequestTime: 0,
      requestIntervals: [],
      ...config
    };

    // Create axios instance with optimized configuration
    poolConfig.instance = axios.create({
      baseURL: config.baseURL,
      timeout: poolConfig.timeout,
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent,
      headers: {
        'User-Agent': 'AAITI/1.3.0 Trading Bot',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        ...poolConfig.headers
      },
      // Connection optimization
      maxRedirects: 3,
      maxBodyLength: 10 * 1024 * 1024, // 10MB
      maxContentLength: 10 * 1024 * 1024
    });

    // Add request/response interceptors
    this.setupInterceptors(poolConfig.instance, serviceName);

    this.pools.set(serviceName, poolConfig);
    this.log('Connection pool created', { service: serviceName, config: poolConfig });

    return poolConfig;
  }

  /**
   * Setup request and response interceptors for monitoring and optimization
   */
  setupInterceptors(axiosInstance, serviceName) {
    // Request interceptor
    axiosInstance.interceptors.request.use(
      (config) => {
        config.metadata = {
          startTime: Date.now(),
          service: serviceName
        };
        return config;
      },
      (error) => {
        this.stats.failedRequests++;
        return Promise.reject(error);
      }
    );

    // Response interceptor
    axiosInstance.interceptors.response.use(
      (response) => {
        const endTime = Date.now();
        const duration = endTime - response.config.metadata.startTime;
        
        this.stats.successfulRequests++;
        this.stats.totalResponseTime += duration;
        this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.successfulRequests;

        this.log('API request successful', {
          service: serviceName,
          url: response.config.url,
          method: response.config.method.toUpperCase(),
          status: response.status,
          duration
        });

        return response;
      },
      (error) => {
        const endTime = Date.now();
        const duration = error.config?.metadata ? endTime - error.config.metadata.startTime : 0;
        
        this.stats.failedRequests++;

        if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
          this.stats.connectionErrors++;
        } else if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
          this.stats.timeoutErrors++;
        }

        this.log('API request failed', {
          service: serviceName,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          error: error.message,
          code: error.code,
          duration
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Make an API request with connection pooling and rate limiting
   */
  async request(serviceName, config) {
    const pool = this.pools.get(serviceName);
    if (!pool) {
      throw new Error(`Service pool '${serviceName}' not found`);
    }

    this.stats.totalRequests++;

    // Check if we need to wait for rate limiting
    await this.checkRateLimit(pool);

    // Check concurrent connection limit
    if (pool.activeConnections >= pool.maxConcurrent) {
      this.stats.queuedRequests++;
      await this.waitForAvailableConnection(pool);
    }

    pool.activeConnections++;

    try {
      const response = await this.executeWithRetry(pool.instance, config, this.config.retryAttempts);
      return response;
    } finally {
      pool.activeConnections--;
      this.updateRateLimit(pool);
    }
  }

  /**
   * Check and enforce rate limiting
   */
  async checkRateLimit(pool) {
    const now = Date.now();
    const minute = 60 * 1000;
    
    // Clean old request timestamps
    pool.requestIntervals = pool.requestIntervals.filter(time => now - time < minute);
    
    // Check if we've exceeded rate limit
    if (pool.requestIntervals.length >= pool.rateLimit) {
      const oldestRequest = Math.min(...pool.requestIntervals);
      const waitTime = minute - (now - oldestRequest);
      
      if (waitTime > 0) {
        this.log('Rate limit reached, waiting', { 
          service: pool.baseURL, 
          waitTime,
          requests: pool.requestIntervals.length,
          limit: pool.rateLimit
        });
        await this.sleep(waitTime);
      }
    }
  }

  /**
   * Update rate limit tracking
   */
  updateRateLimit(pool) {
    pool.requestIntervals.push(Date.now());
    pool.lastRequestTime = Date.now();
  }

  /**
   * Wait for an available connection
   */
  async waitForAvailableConnection(pool) {
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (pool.activeConnections < pool.maxConcurrent) {
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  /**
   * Execute request with retry logic
   */
  async executeWithRetry(axiosInstance, config, maxRetries) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axiosInstance(config);
        if (attempt > 0) {
          this.stats.retriedRequests++;
          this.log('Request succeeded after retry', { attempt, url: config.url });
        }
        return response;
      } catch (error) {
        lastError = error;
        
        // Don't retry for certain error types
        if (this.shouldNotRetry(error)) {
          break;
        }
        
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          this.log('Request failed, retrying', { 
            attempt: attempt + 1, 
            maxRetries, 
            delay,
            error: error.message 
          });
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Determine if we should not retry a request
   */
  shouldNotRetry(error) {
    // Don't retry for client errors (4xx)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return true;
    }
    
    // Don't retry for auth errors
    if (error.response && error.response.status === 401) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateRetryDelay(attempt) {
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get pool statistics
   */
  getStats(serviceName = null) {
    if (serviceName) {
      const pool = this.pools.get(serviceName);
      if (!pool) {
        throw new Error(`Service pool '${serviceName}' not found`);
      }
      
      return {
        service: serviceName,
        baseURL: pool.baseURL,
        activeConnections: pool.activeConnections,
        maxConcurrent: pool.maxConcurrent,
        queuedRequests: pool.requestQueue.length,
        rateLimit: pool.rateLimit,
        recentRequests: pool.requestIntervals.length,
        lastRequestTime: pool.lastRequestTime
      };
    }
    
    return {
      global: this.stats,
      pools: Array.from(this.pools.entries()).map(([name, pool]) => ({
        name,
        baseURL: pool.baseURL,
        activeConnections: pool.activeConnections,
        maxConcurrent: pool.maxConcurrent,
        queuedRequests: pool.requestQueue.length,
        rateLimit: pool.rateLimit,
        recentRequests: pool.requestIntervals.length
      })),
      agents: {
        http: {
          sockets: Object.keys(this.httpAgent.sockets).length,
          freeSockets: Object.keys(this.httpAgent.freeSockets).length
        },
        https: {
          sockets: Object.keys(this.httpsAgent.sockets).length,
          freeSockets: Object.keys(this.httpsAgent.freeSockets).length
        }
      }
    };
  }

  /**
   * Get available services
   */
  getServices() {
    return Array.from(this.pools.keys());
  }

  /**
   * Update pool configuration
   */
  updatePoolConfig(serviceName, newConfig) {
    const pool = this.pools.get(serviceName);
    if (!pool) {
      throw new Error(`Service pool '${serviceName}' not found`);
    }
    
    Object.assign(pool, newConfig);
    this.log('Pool configuration updated', { service: serviceName, config: newConfig });
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      queuedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      connectionErrors: 0,
      timeoutErrors: 0,
      lastReset: new Date()
    };
  }

  /**
   * Close all connections and cleanup
   */
  async close() {
    try {
      // Destroy all agents
      this.httpAgent.destroy();
      this.httpsAgent.destroy();
      
      // Clear pools
      this.pools.clear();
      
      this.log('API Connection Pool Manager closed');
    } catch (error) {
      this.log('Error closing connection pool manager', { error: error.message });
    }
  }

  /**
   * Log connection pool operations
   * @private
   */
  log(message, data = {}) {
    if (logger && typeof logger.info === 'function') {
      logger.info(`[API Pool] ${message}`, { service: 'api-connection-pool', ...data });
    } else {
      console.log(`[API Pool] ${message}`, data);
    }
  }
}

// Create singleton instance
let apiPoolInstance = null;

/**
 * Get API connection pool instance
 * @param {object} options - Pool options
 * @returns {APIConnectionPool} - API connection pool instance
 */
function getAPIPool(options = {}) {
  if (!apiPoolInstance) {
    apiPoolInstance = new APIConnectionPool(options);
  }
  return apiPoolInstance;
}

/**
 * Helper function to make API requests
 * @param {string} service - Service name
 * @param {object} config - Request configuration
 * @returns {Promise} - Request promise
 */
async function apiRequest(service, config) {
  const pool = getAPIPool();
  return pool.request(service, config);
}

module.exports = {
  APIConnectionPool,
  getAPIPool,
  apiRequest
};