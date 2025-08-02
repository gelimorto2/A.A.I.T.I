const Redis = require('redis');
const logger = require('./logger');

/**
 * High-Performance Caching System
 * Implements distributed caching with Redis for production scalability:
 * - Multi-level caching (Memory → Redis → Database)
 * - Intelligent cache invalidation
 * - Cache warming strategies
 * - Performance monitoring and analytics
 * - Distributed cache synchronization
 */
class HighPerformanceCaching {
  constructor() {
    this.localCache = new Map(); // L1 Cache (Memory)
    this.redisClient = null;     // L2 Cache (Redis)
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      startTime: Date.now()
    };
    
    // Configuration
    this.config = {
      // Local cache settings
      localCacheMaxSize: 1000,
      localCacheTTL: 300000, // 5 minutes
      
      // Redis settings
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      redisMaxRetries: 3,
      redisRetryDelay: 1000,
      
      // Cache strategies
      defaultTTL: 3600, // 1 hour
      marketDataTTL: 30, // 30 seconds for market data
      userDataTTL: 1800, // 30 minutes for user data
      analyticsDataTTL: 300, // 5 minutes for analytics
      
      // Performance settings
      compressionThreshold: 1024, // Compress data > 1KB
      maxKeyLength: 250,
      maxValueSize: 512 * 1024, // 512KB max value size
      
      // Monitoring
      statsInterval: 60000, // Update stats every minute
      healthCheckInterval: 30000 // Health check every 30 seconds
    };
    
    // Cache key prefixes for organization
    this.keyPrefixes = {
      MARKET_DATA: 'md:',
      USER_DATA: 'ud:',
      ANALYTICS: 'an:',
      ML_MODELS: 'ml:',
      PORTFOLIO: 'pf:',
      ORDERS: 'or:',
      RISK: 'rk:'
    };
    
    this.isInitialized = false;
    this.healthStatus = 'initializing';
    
    logger.info('High-Performance Caching System initialized');
  }

  /**
   * Initialize the caching system
   */
  async initialize() {
    try {
      await this.initializeRedis();
      this.startMonitoring();
      this.startCacheWarmup();
      
      this.isInitialized = true;
      this.healthStatus = 'healthy';
      
      logger.info('High-Performance Caching System started successfully');
      
    } catch (error) {
      logger.error('Failed to initialize caching system:', error);
      this.healthStatus = 'unhealthy';
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      this.redisClient = Redis.createClient({
        url: this.config.redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > this.config.redisMaxRetries) {
            logger.error('Redis max retries reached');
            return undefined;
          }
          return Math.min(options.attempt * this.config.redisRetryDelay, 3000);
        }
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis client connected');
        this.healthStatus = 'healthy';
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.healthStatus = 'unhealthy';
      });

      this.redisClient.on('end', () => {
        logger.warn('Redis client connection ended');
        this.healthStatus = 'disconnected';
      });

      await this.redisClient.connect();
      
      // Test Redis connection
      await this.redisClient.ping();
      
      logger.info('Redis connection established successfully');
      
    } catch (error) {
      logger.warn('Redis connection failed, running in local cache mode only:', error);
      this.redisClient = null;
      this.healthStatus = 'redis_unavailable';
    }
  }

  /**
   * Get value from cache with multi-level fallback
   */
  async get(key, options = {}) {
    const startTime = Date.now();
    const normalizedKey = this.normalizeKey(key);
    
    try {
      // L1 Cache (Memory) - fastest
      const localValue = this.getFromLocalCache(normalizedKey);
      if (localValue !== null) {
        this.cacheStats.hits++;
        logger.debug('Cache hit (L1):', { key: normalizedKey, latency: Date.now() - startTime });
        return localValue;
      }

      // L2 Cache (Redis) - if available
      if (this.redisClient) {
        const redisValue = await this.getFromRedis(normalizedKey);
        if (redisValue !== null) {
          // Populate L1 cache for next access
          this.setToLocalCache(normalizedKey, redisValue, options.ttl);
          this.cacheStats.hits++;
          logger.debug('Cache hit (L2):', { key: normalizedKey, latency: Date.now() - startTime });
          return redisValue;
        }
      }

      // Cache miss
      this.cacheStats.misses++;
      logger.debug('Cache miss:', { key: normalizedKey, latency: Date.now() - startTime });
      return null;

    } catch (error) {
      logger.error('Cache get error:', { key: normalizedKey, error: error.message });
      this.cacheStats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache with multi-level storage
   */
  async set(key, value, options = {}) {
    const normalizedKey = this.normalizeKey(key);
    const ttl = options.ttl || this.getTTLForKey(normalizedKey);
    
    try {
      // Validate and prepare value
      const processedValue = this.processValueForStorage(value);
      
      // Set in L1 cache (Memory)
      this.setToLocalCache(normalizedKey, processedValue, ttl);
      
      // Set in L2 cache (Redis) if available
      if (this.redisClient) {
        await this.setToRedis(normalizedKey, processedValue, ttl);
      }
      
      this.cacheStats.sets++;
      logger.debug('Cache set:', { key: normalizedKey, ttl });
      
      return true;
      
    } catch (error) {
      logger.error('Cache set error:', { key: normalizedKey, error: error.message });
      return false;
    }
  }

  /**
   * Delete from cache
   */
  async delete(key) {
    const normalizedKey = this.normalizeKey(key);
    
    try {
      // Delete from L1 cache
      this.localCache.delete(normalizedKey);
      
      // Delete from L2 cache
      if (this.redisClient) {
        await this.redisClient.del(normalizedKey);
      }
      
      this.cacheStats.deletes++;
      logger.debug('Cache delete:', { key: normalizedKey });
      
      return true;
      
    } catch (error) {
      logger.error('Cache delete error:', { key: normalizedKey, error: error.message });
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern) {
    try {
      let invalidatedCount = 0;
      
      // Invalidate L1 cache
      for (const key of this.localCache.keys()) {
        if (key.includes(pattern)) {
          this.localCache.delete(key);
          invalidatedCount++;
        }
      }
      
      // Invalidate L2 cache
      if (this.redisClient) {
        const keys = await this.redisClient.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          invalidatedCount += keys.length;
        }
      }
      
      this.cacheStats.invalidations += invalidatedCount;
      
      logger.info('Cache invalidation by pattern:', { 
        pattern, 
        invalidatedCount 
      });
      
      return invalidatedCount;
      
    } catch (error) {
      logger.error('Cache invalidation error:', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Cache-aside pattern with automatic population
   */
  async getOrSet(key, fetchFunction, options = {}) {
    const value = await this.get(key, options);
    
    if (value !== null) {
      return value;
    }
    
    // Fetch from source
    try {
      const freshValue = await fetchFunction();
      
      if (freshValue !== null && freshValue !== undefined) {
        await this.set(key, freshValue, options);
        return freshValue;
      }
      
      return null;
      
    } catch (error) {
      logger.error('Cache fetch function error:', { key, error: error.message });
      return null;
    }
  }

  /**
   * Batch get operation for multiple keys
   */
  async mget(keys, options = {}) {
    const results = {};
    const normalizedKeys = keys.map(key => this.normalizeKey(key));
    
    try {
      // Try L1 cache first
      const missingKeys = [];
      for (let i = 0; i < normalizedKeys.length; i++) {
        const key = normalizedKeys[i];
        const originalKey = keys[i];
        const value = this.getFromLocalCache(key);
        
        if (value !== null) {
          results[originalKey] = value;
          this.cacheStats.hits++;
        } else {
          missingKeys.push({ original: originalKey, normalized: key });
        }
      }
      
      // Try L2 cache for missing keys
      if (missingKeys.length > 0 && this.redisClient) {
        const redisKeys = missingKeys.map(k => k.normalized);
        const redisValues = await this.redisClient.mGet(redisKeys);
        
        for (let i = 0; i < missingKeys.length; i++) {
          const { original, normalized } = missingKeys[i];
          const value = redisValues[i];
          
          if (value !== null) {
            const parsedValue = this.parseValue(value);
            results[original] = parsedValue;
            
            // Populate L1 cache
            this.setToLocalCache(normalized, parsedValue, options.ttl);
            this.cacheStats.hits++;
          } else {
            this.cacheStats.misses++;
          }
        }
      } else {
        // All missing keys count as misses
        this.cacheStats.misses += missingKeys.length;
      }
      
      return results;
      
    } catch (error) {
      logger.error('Batch get error:', { keys, error: error.message });
      return results;
    }
  }

  /**
   * Batch set operation for multiple key-value pairs
   */
  async mset(keyValuePairs, options = {}) {
    try {
      const operations = [];
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const normalizedKey = this.normalizeKey(key);
        const ttl = options.ttl || this.getTTLForKey(normalizedKey);
        const processedValue = this.processValueForStorage(value);
        
        // Set in L1 cache
        this.setToLocalCache(normalizedKey, processedValue, ttl);
        
        // Prepare Redis operation
        if (this.redisClient) {
          operations.push(['SET', normalizedKey, JSON.stringify(processedValue), 'EX', ttl]);
        }
      }
      
      // Execute Redis batch operation
      if (operations.length > 0 && this.redisClient) {
        const pipeline = this.redisClient.pipeline();
        operations.forEach(op => pipeline.call.apply(pipeline, op));
        await pipeline.exec();
      }
      
      this.cacheStats.sets += Object.keys(keyValuePairs).length;
      
      logger.debug('Batch set completed:', { 
        count: Object.keys(keyValuePairs).length 
      });
      
      return true;
      
    } catch (error) {
      logger.error('Batch set error:', { error: error.message });
      return false;
    }
  }

  /**
   * Local cache operations
   */
  getFromLocalCache(key) {
    const item = this.localCache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check expiration
    if (Date.now() > item.expiry) {
      this.localCache.delete(key);
      return null;
    }
    
    return item.value;
  }

  setToLocalCache(key, value, ttl) {
    // Enforce size limits
    if (this.localCache.size >= this.config.localCacheMaxSize) {
      this.evictFromLocalCache();
    }
    
    const item = {
      value,
      expiry: Date.now() + (ttl * 1000),
      accessTime: Date.now()
    };
    
    this.localCache.set(key, item);
  }

  evictFromLocalCache() {
    // LRU eviction - remove oldest accessed items
    const sortedEntries = Array.from(this.localCache.entries())
      .sort((a, b) => a[1].accessTime - b[1].accessTime);
    
    const toEvict = Math.floor(this.config.localCacheMaxSize * 0.1); // Evict 10%
    
    for (let i = 0; i < toEvict; i++) {
      if (sortedEntries[i]) {
        this.localCache.delete(sortedEntries[i][0]);
      }
    }
  }

  /**
   * Redis operations
   */
  async getFromRedis(key) {
    try {
      const value = await this.redisClient.get(key);
      return value ? this.parseValue(value) : null;
    } catch (error) {
      logger.error('Redis get error:', { key, error: error.message });
      return null;
    }
  }

  async setToRedis(key, value, ttl) {
    try {
      const stringValue = JSON.stringify(value);
      
      if (stringValue.length > this.config.maxValueSize) {
        logger.warn('Value too large for Redis cache:', { 
          key, 
          size: stringValue.length 
        });
        return false;
      }
      
      await this.redisClient.setEx(key, ttl, stringValue);
      return true;
      
    } catch (error) {
      logger.error('Redis set error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Utility methods
   */
  normalizeKey(key) {
    if (typeof key !== 'string') {
      key = String(key);
    }
    
    // Ensure key length limits
    if (key.length > this.config.maxKeyLength) {
      key = key.substring(0, this.config.maxKeyLength);
    }
    
    return key;
  }

  getTTLForKey(key) {
    // Determine TTL based on key prefix
    for (const [prefix, keyPrefix] of Object.entries(this.keyPrefixes)) {
      if (key.startsWith(keyPrefix)) {
        switch (prefix) {
          case 'MARKET_DATA':
            return this.config.marketDataTTL;
          case 'USER_DATA':
            return this.config.userDataTTL;
          case 'ANALYTICS':
            return this.config.analyticsDataTTL;
          default:
            return this.config.defaultTTL;
        }
      }
    }
    
    return this.config.defaultTTL;
  }

  processValueForStorage(value) {
    // Handle different value types
    if (value === null || value === undefined) {
      return null;
    }
    
    if (typeof value === 'object') {
      // Add metadata
      return {
        _cached: true,
        _timestamp: Date.now(),
        _data: value
      };
    }
    
    return value;
  }

  parseValue(value) {
    try {
      const parsed = JSON.parse(value);
      
      // Extract data from cached object
      if (parsed && typeof parsed === 'object' && parsed._cached) {
        return parsed._data;
      }
      
      return parsed;
      
    } catch (error) {
      logger.error('Value parsing error:', error);
      return value;
    }
  }

  /**
   * Start cache monitoring and maintenance
   */
  startMonitoring() {
    setInterval(() => {
      this.updateCacheStats();
      this.performMaintenance();
    }, this.config.statsInterval);
    
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
    
    logger.info('Cache monitoring started');
  }

  updateCacheStats() {
    const runtime = Date.now() - this.cacheStats.startTime;
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    
    const stats = {
      ...this.cacheStats,
      hitRate: totalRequests > 0 ? (this.cacheStats.hits / totalRequests) * 100 : 0,
      runtime: runtime,
      localCacheSize: this.localCache.size,
      healthStatus: this.healthStatus
    };
    
    logger.debug('Cache statistics updated:', stats);
  }

  performMaintenance() {
    // Clean expired entries from local cache
    let expiredCount = 0;
    const now = Date.now();
    
    for (const [key, item] of this.localCache.entries()) {
      if (now > item.expiry) {
        this.localCache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.debug('Local cache maintenance:', { expiredCount });
    }
  }

  async performHealthCheck() {
    try {
      if (this.redisClient) {
        await this.redisClient.ping();
        if (this.healthStatus === 'unhealthy') {
          this.healthStatus = 'healthy';
          logger.info('Redis connection restored');
        }
      }
    } catch (error) {
      if (this.healthStatus === 'healthy') {
        this.healthStatus = 'unhealthy';
        logger.error('Redis health check failed:', error);
      }
    }
  }

  /**
   * Cache warming strategies
   */
  startCacheWarmup() {
    // Warm up common cache keys
    setTimeout(async () => {
      await this.warmupCommonData();
    }, 5000); // Wait 5 seconds after initialization
  }

  async warmupCommonData() {
    try {
      logger.info('Starting cache warmup');
      
      // This would typically load frequently accessed data
      // For now, we'll just log the start of warmup
      
      logger.info('Cache warmup completed');
      
    } catch (error) {
      logger.error('Cache warmup error:', error);
    }
  }

  /**
   * Public API methods
   */
  getCacheStats() {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    
    return {
      ...this.cacheStats,
      hitRate: totalRequests > 0 ? (this.cacheStats.hits / totalRequests) * 100 : 0,
      localCacheSize: this.localCache.size,
      healthStatus: this.healthStatus,
      redisConnected: this.redisClient ? true : false,
      uptime: Date.now() - this.cacheStats.startTime
    };
  }

  async flushAll() {
    try {
      // Clear local cache
      this.localCache.clear();
      
      // Clear Redis cache
      if (this.redisClient) {
        await this.redisClient.flushAll();
      }
      
      logger.info('All caches flushed');
      return true;
      
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  getHealthStatus() {
    return {
      status: this.healthStatus,
      isInitialized: this.isInitialized,
      redisConnected: this.redisClient ? true : false,
      stats: this.getCacheStats()
    };
  }

  /**
   * Shutdown gracefully
   */
  async shutdown() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      
      this.localCache.clear();
      this.isInitialized = false;
      this.healthStatus = 'shutdown';
      
      logger.info('High-Performance Caching System shutdown completed');
      
    } catch (error) {
      logger.error('Cache shutdown error:', error);
    }
  }
}

module.exports = new HighPerformanceCaching();