const NodeCache = require('node-cache');
const logger = require('./logger');

/**
 * AAITI Advanced Caching System
 * Implements Redis-compatible interface with fallback to in-memory cache
 * Part of System Enhancements - Performance Optimizations
 */

class CacheManager {
  constructor(options = {}) {
    // Default cache configuration
    this.config = {
      stdTTL: options.stdTTL || 300, // 5 minutes default TTL
      checkperiod: options.checkperiod || 120, // Check for expired keys every 2 minutes
      useClones: options.useClones !== false, // Use clones by default for data safety
      maxKeys: options.maxKeys || 10000, // Maximum number of keys
      enableLogs: options.enableLogs !== false,
      ...options
    };

    // Initialize in-memory cache
    this.memoryCache = new NodeCache(this.config);
    this.redis = null;
    this.isRedisConnected = false;

    // Initialize Redis if available (skip in tests)
    if (process.env.NODE_ENV !== 'test') {
      this.initializeRedis();
    }

    // Setup cache event handlers
    this.setupEventHandlers();

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      lastReset: new Date()
    };

    this.log('Cache Manager initialized', { config: this.config });
  }

  /**
   * Initialize Redis connection if Redis is available
   */
  async initializeRedis() {
    try {
      // Try to require Redis - if not available, continue with memory cache
      const Redis = require('ioredis');
      const performanceConfig = require('../config/performance');
      
      this.redis = new Redis({
        host: performanceConfig.cache.redis.host,
        port: performanceConfig.cache.redis.port,
        password: performanceConfig.cache.redis.password,
        db: performanceConfig.cache.redis.db,
        keyPrefix: performanceConfig.cache.redis.keyPrefix,
        connectTimeout: performanceConfig.cache.redis.connectTimeout,
        lazyConnect: performanceConfig.cache.redis.lazyConnect,
        maxRetriesPerRequest: performanceConfig.cache.redis.maxRetriesPerRequest,
        retryDelayOnFailover: performanceConfig.cache.redis.retryDelayOnFailover,
        family: performanceConfig.cache.redis.family,
        keepAlive: performanceConfig.cache.redis.keepAlive,
      });

      // Test Redis connection
      await this.redis.ping();
      this.isRedisConnected = true;
      this.log('Redis cache connected successfully');

      // Setup Redis error handling
      this.redis.on('error', (err) => {
        this.isRedisConnected = false;
        this.stats.errors++;
        this.log('Redis connection error, falling back to memory cache', { error: err.message });
      });

      this.redis.on('connect', () => {
        this.isRedisConnected = true;
        this.log('Redis cache reconnected');
      });

    } catch (error) {
      this.log('Redis not available, using memory cache only', { error: error.message });
    }
  }

  /**
   * Setup event handlers for cache operations
   */
  setupEventHandlers() {
    this.memoryCache.on('set', (key, value) => {
      this.stats.sets++;
      if (this.config.enableLogs) {
        this.log('Cache SET', { key, type: 'memory' });
      }
    });

    this.memoryCache.on('del', (key, value) => {
      this.stats.deletes++;
      if (this.config.enableLogs) {
        this.log('Cache DELETE', { key, type: 'memory' });
      }
    });

    this.memoryCache.on('expired', (key, value) => {
      if (this.config.enableLogs) {
        this.log('Cache EXPIRED', { key, type: 'memory' });
      }
    });
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or undefined
   */
  async get(key) {
    try {
      let value;

      // Try Redis first if connected
      if (this.isRedisConnected) {
        try {
          const redisValue = await this.redis.get(key);
          if (redisValue !== null) {
            value = JSON.parse(redisValue);
            this.stats.hits++;
            if (this.config.enableLogs) {
              this.log('Cache HIT (Redis)', { key });
            }
            return value;
          }
        } catch (redisError) {
          this.log('Redis GET error, trying memory cache', { key, error: redisError.message });
        }
      }

      // Try memory cache
      value = this.memoryCache.get(key);
      if (value !== undefined) {
        this.stats.hits++;
        if (this.config.enableLogs) {
          this.log('Cache HIT (Memory)', { key });
        }
        return value;
      }

      this.stats.misses++;
      if (this.config.enableLogs) {
        this.log('Cache MISS', { key });
      }
      return undefined;

    } catch (error) {
      this.stats.errors++;
      this.log('Cache GET error', { key, error: error.message });
      return undefined;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = null) {
    try {
      const effectiveTTL = ttl || this.config.stdTTL;

      // Set in Redis if connected
      if (this.isRedisConnected) {
        try {
          await this.redis.setex(key, effectiveTTL, JSON.stringify(value));
          if (this.config.enableLogs) {
            this.log('Cache SET (Redis)', { key, ttl: effectiveTTL });
          }
        } catch (redisError) {
          this.log('Redis SET error', { key, error: redisError.message });
        }
      }

      // Always set in memory cache as backup
      const success = this.memoryCache.set(key, value, effectiveTTL);
      this.stats.sets++;
      
      return success;

    } catch (error) {
      this.stats.errors++;
      this.log('Cache SET error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    try {
      let success = false;

      // Delete from Redis if connected
      if (this.isRedisConnected) {
        try {
          await this.redis.del(key);
          success = true;
        } catch (redisError) {
          this.log('Redis DELETE error', { key, error: redisError.message });
        }
      }

      // Delete from memory cache
      const memoryDeleted = this.memoryCache.del(key);
      this.stats.deletes++;

      return success || memoryDeleted > 0;

    } catch (error) {
      this.stats.errors++;
      this.log('Cache DELETE error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Existence status
   */
  async has(key) {
    try {
      // Check Redis first if connected
      if (this.isRedisConnected) {
        try {
          const exists = await this.redis.exists(key);
          if (exists) return true;
        } catch (redisError) {
          this.log('Redis EXISTS error', { key, error: redisError.message });
        }
      }

      // Check memory cache
      return this.memoryCache.has(key);

    } catch (error) {
      this.stats.errors++;
      this.log('Cache EXISTS error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Clear all cache entries
   * @returns {Promise<boolean>} - Success status
   */
  async clear() {
    try {
      let success = false;

      // Clear Redis if connected
      if (this.isRedisConnected) {
        try {
          await this.redis.flushdb();
          success = true;
        } catch (redisError) {
          this.log('Redis CLEAR error', { error: redisError.message });
        }
      }

      // Clear memory cache
      this.memoryCache.flushAll();

      this.log('Cache cleared');
      return success;

    } catch (error) {
      this.stats.errors++;
      this.log('Cache CLEAR error', { error: error.message });
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getStats() {
    const memoryStats = this.memoryCache.getStats();
    return {
      ...this.stats,
      memoryCache: memoryStats,
      redisConnected: this.isRedisConnected,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      uptime: Date.now() - this.stats.lastReset.getTime()
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      lastReset: new Date()
    };
  }

  /**
   * Get cache configuration
   * @returns {object} - Cache configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Close cache connections
   */
  async close() {
    try {
      if (this.redis && this.isRedisConnected) {
        await this.redis.quit();
        this.log('Redis connection closed');
      }
      this.memoryCache.close();
      this.log('Cache manager closed');
    } catch (error) {
      this.log('Error closing cache manager', { error: error.message });
    }
  }

  /**
   * Log cache operations
   * @private
   */
  log(message, data = {}) {
    if (logger && typeof logger.info === 'function') {
      logger.info(`[Cache] ${message}`, { service: 'cache-manager', ...data });
    } else {
      console.log(`[Cache] ${message}`, data);
    }
  }
}

// Create singleton instance
let cacheInstance = null;

/**
 * Get cache manager instance
 * @param {object} options - Cache options
 * @returns {CacheManager} - Cache manager instance
 */
function getCache(options = {}) {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(options);
  }
  return cacheInstance;
}

/**
 * Cache middleware for Express routes
 * @param {number} ttl - Time to live in seconds
 * @param {function} keyGenerator - Function to generate cache key
 * @returns {function} - Express middleware
 */
function cacheMiddleware(ttl = 300, keyGenerator = null) {
  const cache = getCache();

  return async (req, res, next) => {
    try {
      // Generate cache key
      const key = keyGenerator ? keyGenerator(req) : `route:${req.method}:${req.originalUrl}`;
      
      // Try to get cached response
      const cachedResponse = await cache.get(key);
      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache response
      res.json = function(data) {
        // Cache the response data
        cache.set(key, data, ttl).catch(err => {
          cache.log('Failed to cache response', { key, error: err.message });
        });

        // Call original json method
        return originalJson.call(this, data);
      };

      next();

    } catch (error) {
      cache.log('Cache middleware error', { error: error.message });
      next();
    }
  };
}

module.exports = {
  CacheManager,
  getCache,
  cacheMiddleware
};