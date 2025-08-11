const Redis = require('ioredis');
const NodeCache = require('node-cache');
const logger = require('./logger');

/**
 * Enhanced Redis Caching Layer
 * Advanced Redis implementation with clustering, compression, and intelligent fallback
 * Part of TODO 1.1 Infrastructure Hardening - Performance Optimization
 */

class EnhancedCacheManager {
  constructor(options = {}) {
    this.config = {
      // Redis configuration
      redis: {
        host: options.redis?.host || process.env.REDIS_HOST || 'localhost',
        port: options.redis?.port || parseInt(process.env.REDIS_PORT) || 6379,
        password: options.redis?.password || process.env.REDIS_PASSWORD,
        db: options.redis?.db || parseInt(process.env.REDIS_DB) || 0,
        keyPrefix: options.redis?.keyPrefix || 'aaiti:',
        connectTimeout: options.redis?.connectTimeout || 10000,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableAutoPipelining: true,
        maxMemoryPolicy: 'allkeys-lru'
      },
      
      // Clustering configuration
      cluster: {
        enabled: options.cluster?.enabled || process.env.REDIS_CLUSTER_ENABLED === 'true',
        nodes: options.cluster?.nodes || this.parseClusterNodes(),
        options: {
          enableAutoPipelining: true,
          redisOptions: {
            password: process.env.REDIS_PASSWORD
          }
        }
      },

      // Cache behavior
      cache: {
        defaultTTL: options.cache?.defaultTTL || 300, // 5 minutes
        maxMemoryMB: options.cache?.maxMemoryMB || 256,
        compressionThreshold: options.cache?.compressionThreshold || 1024, // 1KB
        enableCompression: options.cache?.enableCompression !== false,
        enableLogging: options.cache?.enableLogging !== false
      },

      // Fallback configuration
      fallback: {
        enabled: options.fallback?.enabled !== false,
        maxKeys: options.fallback?.maxKeys || 5000,
        checkPeriod: options.fallback?.checkPeriod || 60
      }
    };

    this.redis = null;
    this.memoryCache = null;
    this.isRedisConnected = false;
    this.compressionEnabled = false;

    // Statistics
    this.stats = {
      redis: { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 },
      memory: { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 },
      compression: { compressed: 0, decompressed: 0, ratio: 0 },
      performance: { avgResponseTime: 0, totalOperations: 0 },
      startTime: Date.now()
    };

    this.initialize();
  }

  async initialize() {
    logger.info('🚀 Initializing Enhanced Cache Manager', {
      redisHost: this.config.redis.host,
      redisPort: this.config.redis.port,
      clusterEnabled: this.config.cluster.enabled,
      compressionEnabled: this.config.cache.enableCompression,
      service: 'enhanced-cache'
    });

    // Initialize compression if available
    await this.initializeCompression();

    // Initialize Redis connection
    await this.initializeRedis();

    // Initialize memory fallback
    this.initializeMemoryFallback();

    // Setup monitoring
    this.setupMonitoring();

    logger.info('✅ Enhanced Cache Manager initialized successfully', {
      redisConnected: this.isRedisConnected,
      compressionEnabled: this.compressionEnabled,
      service: 'enhanced-cache'
    });
  }

  async initializeCompression() {
    if (!this.config.cache.enableCompression) {
      return;
    }

    try {
      // Try to load compression libraries
      this.zlib = require('zlib');
      this.compressionEnabled = true;
      
      logger.info('✅ Compression enabled for cache operations', {
        threshold: this.config.cache.compressionThreshold + ' bytes',
        service: 'enhanced-cache'
      });
    } catch (error) {
      logger.warn('⚠️ Compression libraries not available', {
        error: error.message,
        service: 'enhanced-cache'
      });
    }
  }

  async initializeRedis() {
    try {
      if (this.config.cluster.enabled && this.config.cluster.nodes.length > 0) {
        // Initialize Redis Cluster
        this.redis = new Redis.Cluster(this.config.cluster.nodes, this.config.cluster.options);
        logger.info('🔄 Redis Cluster mode enabled', {
          nodes: this.config.cluster.nodes.length,
          service: 'enhanced-cache'
        });
      } else {
        // Initialize single Redis instance
        this.redis = new Redis(this.config.redis);
      }

      // Test connection
      await this.redis.ping();
      this.isRedisConnected = true;

      // Setup Redis event handlers
      this.setupRedisEventHandlers();

      // Optimize Redis configuration
      await this.optimizeRedisConfig();

      logger.info('✅ Redis connection established', {
        cluster: this.config.cluster.enabled,
        service: 'enhanced-cache'
      });

    } catch (error) {
      logger.error('❌ Redis initialization failed', {
        error: error.message,
        fallbackEnabled: this.config.fallback.enabled,
        service: 'enhanced-cache'
      });
      
      if (!this.config.fallback.enabled) {
        throw error;
      }
    }
  }

  initializeMemoryFallback() {
    if (!this.config.fallback.enabled) {
      return;
    }

    this.memoryCache = new NodeCache({
      stdTTL: this.config.cache.defaultTTL,
      checkperiod: this.config.fallback.checkPeriod,
      maxKeys: this.config.fallback.maxKeys,
      useClones: false // Performance optimization
    });

    // Setup memory cache event handlers
    this.memoryCache.on('set', () => this.stats.memory.sets++);
    this.memoryCache.on('del', () => this.stats.memory.deletes++);
    this.memoryCache.on('expired', (key) => {
      logger.debug('Memory cache key expired', { key, service: 'enhanced-cache' });
    });

    logger.info('✅ Memory fallback cache initialized', {
      maxKeys: this.config.fallback.maxKeys,
      service: 'enhanced-cache'
    });
  }

  setupRedisEventHandlers() {
    this.redis.on('connect', () => {
      this.isRedisConnected = true;
      logger.info('🔗 Redis connected', { service: 'enhanced-cache' });
    });

    this.redis.on('ready', () => {
      logger.info('✅ Redis ready for operations', { service: 'enhanced-cache' });
    });

    this.redis.on('error', (error) => {
      this.isRedisConnected = false;
      this.stats.redis.errors++;
      logger.error('🚨 Redis error occurred', {
        error: error.message,
        fallbackAvailable: !!this.memoryCache,
        service: 'enhanced-cache'
      });
    });

    this.redis.on('close', () => {
      this.isRedisConnected = false;
      logger.warn('⚠️ Redis connection closed', { service: 'enhanced-cache' });
    });

    this.redis.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...', { service: 'enhanced-cache' });
    });

    if (this.redis.isCluster) {
      this.redis.on('node error', (error, node) => {
        logger.error('🚨 Redis cluster node error', {
          node: `${node.options.host}:${node.options.port}`,
          error: error.message,
          service: 'enhanced-cache'
        });
      });
    }
  }

  async optimizeRedisConfig() {
    try {
      // Set memory policies for optimal caching
      await this.redis.config('SET', 'maxmemory-policy', this.config.redis.maxMemoryPolicy);
      
      // Enable key expiration notifications if needed
      await this.redis.config('SET', 'notify-keyspace-events', 'Ex');

      logger.debug('🔧 Redis configuration optimized', {
        memoryPolicy: this.config.redis.maxMemoryPolicy,
        service: 'enhanced-cache'
      });
    } catch (error) {
      logger.warn('⚠️ Could not optimize Redis configuration', {
        error: error.message,
        service: 'enhanced-cache'
      });
    }
  }

  setupMonitoring() {
    // Performance monitoring every 30 seconds
    setInterval(async () => {
      if (this.isRedisConnected) {
        try {
          const info = await this.redis.info('memory');
          const memoryUsage = this.parseRedisMemoryInfo(info);
          
          if (memoryUsage.usedMemoryMB > this.config.cache.maxMemoryMB) {
            logger.warn('🚨 Redis memory usage high', {
              usedMemoryMB: memoryUsage.usedMemoryMB,
              maxMemoryMB: this.config.cache.maxMemoryMB,
              service: 'enhanced-cache'
            });
          }
        } catch (error) {
          logger.debug('Could not retrieve Redis memory info', {
            error: error.message,
            service: 'enhanced-cache'
          });
        }
      }
    }, 30000);
  }

  parseClusterNodes() {
    const nodes = process.env.REDIS_CLUSTER_NODES;
    if (!nodes) return [];
    
    return nodes.split(',').map(node => {
      const [host, port] = node.trim().split(':');
      return { host, port: parseInt(port) || 6379 };
    });
  }

  parseRedisMemoryInfo(info) {
    const lines = info.split('\r\n');
    const memoryInfo = {};
    
    lines.forEach(line => {
      if (line.includes('used_memory:')) {
        memoryInfo.usedMemoryMB = parseInt(line.split(':')[1]) / (1024 * 1024);
      }
    });
    
    return memoryInfo;
  }

  async compress(data) {
    if (!this.compressionEnabled) return data;
    
    const serialized = JSON.stringify(data);
    if (serialized.length < this.config.cache.compressionThreshold) {
      return { data: serialized, compressed: false };
    }

    try {
      const compressed = this.zlib.gzipSync(serialized);
      this.stats.compression.compressed++;
      
      const ratio = (1 - compressed.length / serialized.length) * 100;
      this.stats.compression.ratio = 
        (this.stats.compression.ratio + ratio) / this.stats.compression.compressed;

      return { data: compressed.toString('base64'), compressed: true };
    } catch (error) {
      logger.warn('Compression failed, storing uncompressed', {
        error: error.message,
        service: 'enhanced-cache'
      });
      return { data: serialized, compressed: false };
    }
  }

  async decompress(cached) {
    if (!cached.compressed || !this.compressionEnabled) {
      return JSON.parse(cached.data);
    }

    try {
      const decompressed = this.zlib.gunzipSync(Buffer.from(cached.data, 'base64'));
      this.stats.compression.decompressed++;
      return JSON.parse(decompressed.toString());
    } catch (error) {
      logger.error('Decompression failed', {
        error: error.message,
        service: 'enhanced-cache'
      });
      throw new Error('Cache data corruption detected');
    }
  }

  async get(key) {
    const startTime = Date.now();
    
    try {
      // Try Redis first
      if (this.isRedisConnected) {
        try {
          const cached = await this.redis.get(key);
          if (cached) {
            const data = await this.decompress(JSON.parse(cached));
            this.stats.redis.hits++;
            this.updatePerformanceStats(Date.now() - startTime);
            return data;
          }
          this.stats.redis.misses++;
        } catch (error) {
          this.stats.redis.errors++;
          logger.warn('Redis GET error, trying fallback', {
            key,
            error: error.message,
            service: 'enhanced-cache'
          });
        }
      }

      // Try memory fallback
      if (this.memoryCache) {
        const data = this.memoryCache.get(key);
        if (data !== undefined) {
          this.stats.memory.hits++;
          this.updatePerformanceStats(Date.now() - startTime);
          return data;
        }
        this.stats.memory.misses++;
      }

      this.updatePerformanceStats(Date.now() - startTime);
      return undefined;

    } catch (error) {
      logger.error('Cache GET operation failed', {
        key,
        error: error.message,
        service: 'enhanced-cache'
      });
      this.updatePerformanceStats(Date.now() - startTime);
      return undefined;
    }
  }

  async set(key, value, ttl = null) {
    const startTime = Date.now();
    const effectiveTTL = ttl || this.config.cache.defaultTTL;
    
    try {
      const compressed = await this.compress(value);
      
      // Set in Redis if connected
      if (this.isRedisConnected) {
        try {
          await this.redis.setex(key, effectiveTTL, JSON.stringify(compressed));
          this.stats.redis.sets++;
        } catch (error) {
          this.stats.redis.errors++;
          logger.warn('Redis SET error', {
            key,
            error: error.message,
            service: 'enhanced-cache'
          });
        }
      }

      // Set in memory fallback
      if (this.memoryCache) {
        this.memoryCache.set(key, value, effectiveTTL);
        this.stats.memory.sets++;
      }

      this.updatePerformanceStats(Date.now() - startTime);
      return true;

    } catch (error) {
      logger.error('Cache SET operation failed', {
        key,
        error: error.message,
        service: 'enhanced-cache'
      });
      this.updatePerformanceStats(Date.now() - startTime);
      return false;
    }
  }

  async del(key) {
    const startTime = Date.now();
    let success = false;

    try {
      // Delete from Redis
      if (this.isRedisConnected) {
        try {
          const result = await this.redis.del(key);
          this.stats.redis.deletes++;
          success = result > 0;
        } catch (error) {
          this.stats.redis.errors++;
          logger.warn('Redis DELETE error', {
            key,
            error: error.message,
            service: 'enhanced-cache'
          });
        }
      }

      // Delete from memory fallback
      if (this.memoryCache) {
        const deleted = this.memoryCache.del(key);
        this.stats.memory.deletes++;
        success = success || deleted > 0;
      }

      this.updatePerformanceStats(Date.now() - startTime);
      return success;

    } catch (error) {
      logger.error('Cache DELETE operation failed', {
        key,
        error: error.message,
        service: 'enhanced-cache'
      });
      this.updatePerformanceStats(Date.now() - startTime);
      return false;
    }
  }

  async mget(keys) {
    const startTime = Date.now();
    const results = {};

    try {
      // Try Redis batch get
      if (this.isRedisConnected && keys.length > 0) {
        try {
          const cached = await this.redis.mget(...keys);
          for (let i = 0; i < keys.length; i++) {
            if (cached[i]) {
              try {
                results[keys[i]] = await this.decompress(JSON.parse(cached[i]));
                this.stats.redis.hits++;
              } catch (error) {
                this.stats.redis.errors++;
              }
            } else {
              this.stats.redis.misses++;
            }
          }
        } catch (error) {
          this.stats.redis.errors++;
          logger.warn('Redis MGET error', {
            error: error.message,
            service: 'enhanced-cache'
          });
        }
      }

      // Fill missing keys from memory cache
      if (this.memoryCache) {
        for (const key of keys) {
          if (!(key in results)) {
            const value = this.memoryCache.get(key);
            if (value !== undefined) {
              results[key] = value;
              this.stats.memory.hits++;
            } else {
              this.stats.memory.misses++;
            }
          }
        }
      }

      this.updatePerformanceStats(Date.now() - startTime);
      return results;

    } catch (error) {
      logger.error('Cache MGET operation failed', {
        keyCount: keys.length,
        error: error.message,
        service: 'enhanced-cache'
      });
      this.updatePerformanceStats(Date.now() - startTime);
      return {};
    }
  }

  updatePerformanceStats(responseTime) {
    this.stats.performance.totalOperations++;
    this.stats.performance.avgResponseTime = 
      (this.stats.performance.avgResponseTime + responseTime) / this.stats.performance.totalOperations;
  }

  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const totalHits = this.stats.redis.hits + this.stats.memory.hits;
    const totalMisses = this.stats.redis.misses + this.stats.memory.misses;
    
    return {
      uptime,
      hitRate: totalHits / (totalHits + totalMisses) || 0,
      redisConnected: this.isRedisConnected,
      compressionEnabled: this.compressionEnabled,
      compressionRatio: this.stats.compression.ratio,
      avgResponseTime: this.stats.performance.avgResponseTime,
      ...this.stats
    };
  }

  async healthCheck() {
    const health = {
      redis: { status: 'disconnected', latency: null, error: null },
      memory: { status: this.memoryCache ? 'active' : 'disabled', keys: 0 },
      compression: { status: this.compressionEnabled ? 'enabled' : 'disabled' }
    };

    // Check Redis health
    if (this.isRedisConnected) {
      try {
        const start = Date.now();
        await this.redis.ping();
        health.redis = {
          status: 'connected',
          latency: Date.now() - start,
          error: null
        };
      } catch (error) {
        health.redis = {
          status: 'error',
          latency: null,
          error: error.message
        };
      }
    }

    // Check memory cache health
    if (this.memoryCache) {
      health.memory.keys = this.memoryCache.keys().length;
    }

    return health;
  }

  async close() {
    logger.info('🔌 Closing Enhanced Cache Manager', {
      service: 'enhanced-cache'
    });

    if (this.redis && this.isRedisConnected) {
      try {
        await this.redis.quit();
        logger.info('✅ Redis connection closed gracefully', {
          service: 'enhanced-cache'
        });
      } catch (error) {
        logger.warn('⚠️ Error closing Redis connection', {
          error: error.message,
          service: 'enhanced-cache'
        });
      }
    }

    if (this.memoryCache) {
      this.memoryCache.close();
      logger.info('✅ Memory cache closed', {
        service: 'enhanced-cache'
      });
    }
  }
}

module.exports = EnhancedCacheManager;