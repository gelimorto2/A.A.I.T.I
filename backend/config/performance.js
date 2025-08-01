// Performance Configuration for AAITI
// This file contains performance-optimized settings for production deployment

module.exports = {
  // Server Performance Settings
  server: {
    // Maximum concurrent connections
    maxConnections: parseInt(process.env.MAX_CONNECTIONS) || 1000,
    
    // Keep-alive timeout (milliseconds)
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 65000,
    
    // Headers timeout (milliseconds)  
    headersTimeout: parseInt(process.env.HEADERS_TIMEOUT) || 66000,
    
    // Request timeout (milliseconds)
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 300000,
    
    // Body parser limits
    bodyLimit: process.env.BODY_LIMIT || '50mb',
    parameterLimit: parseInt(process.env.PARAMETER_LIMIT) || 10000,
    
    // Compression settings
    compression: {
      level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
      threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024,
      windowBits: parseInt(process.env.COMPRESSION_WINDOW_BITS) || 15
    }
  },

  // Database Performance Settings
  database: {
    // SQLite specific optimizations
    sqlite: {
      // Cache size in pages (-1 = auto)
      cacheSize: parseInt(process.env.SQLITE_CACHE_SIZE) || 10000,
      
      // Journal mode (DELETE, TRUNCATE, PERSIST, MEMORY, WAL, OFF)
      journalMode: process.env.SQLITE_JOURNAL_MODE || 'WAL',
      
      // Synchronous mode (OFF, NORMAL, FULL, EXTRA)
      synchronous: process.env.SQLITE_SYNCHRONOUS || 'NORMAL',
      
      // Temp store (DEFAULT, FILE, MEMORY)
      tempStore: process.env.SQLITE_TEMP_STORE || 'MEMORY',
      
      // Memory-mapped I/O size (bytes)
      mmapSize: parseInt(process.env.SQLITE_MMAP_SIZE) || 268435456, // 256MB
      
      // Page size (512, 1024, 2048, 4096, 8192, 16384, 32768, 65536)
      pageSize: parseInt(process.env.SQLITE_PAGE_SIZE) || 4096,
      
      // Auto vacuum (NONE, FULL, INCREMENTAL)
      autoVacuum: process.env.SQLITE_AUTO_VACUUM || 'INCREMENTAL',
      
      // Locking mode (NORMAL, EXCLUSIVE)
      lockingMode: process.env.SQLITE_LOCKING_MODE || 'NORMAL'
    },
    
    // Connection pool settings
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 30000,
      createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 30000,
      destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 1000,
      createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL) || 200
    }
  },

  // Caching Configuration
  cache: {
    // Memory cache settings
    memory: {
      // Maximum number of items in cache
      maxItems: parseInt(process.env.CACHE_MAX_ITEMS) || 10000,
      
      // TTL for cache items (seconds)
      defaultTTL: parseInt(process.env.CACHE_TTL) || 300,
      
      // Check period for expired items (seconds)
      checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 120,
      
      // Maximum memory usage (bytes)
      maxMemory: parseInt(process.env.CACHE_MAX_MEMORY) || 134217728 // 128MB
    },
    
    // Redis settings (if enabled)
    redis: {
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: parseInt(process.env.REDIS_DB) || 0,
      keyPrefix: process.env.REDIS_PREFIX || 'aaiti:',
      
      // Connection settings
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
      lazyConnect: process.env.REDIS_LAZY_CONNECT !== 'false',
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY) || 100,
      
      // Pool settings
      family: parseInt(process.env.REDIS_FAMILY) || 4,
      keepAlive: process.env.REDIS_KEEP_ALIVE !== 'false',
      maxMemoryPolicy: process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru'
    }
  },

  // API Performance Settings
  api: {
    // Rate limiting
    rateLimit: {
      windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW) || 900000, // 15 minutes
      max: parseInt(process.env.API_RATE_LIMIT_MAX) || 1000, // requests per window
      standardHeaders: process.env.API_RATE_LIMIT_HEADERS !== 'false',
      legacyHeaders: process.env.API_RATE_LIMIT_LEGACY !== 'true',
      
      // Skip successful requests for rate limiting
      skipSuccessfulRequests: process.env.API_RATE_LIMIT_SKIP_SUCCESS === 'true',
      
      // Skip failed requests for rate limiting  
      skipFailedRequests: process.env.API_RATE_LIMIT_SKIP_FAILED === 'true'
    },
    
    // Request processing
    concurrency: {
      // Maximum concurrent requests
      maxConcurrent: parseInt(process.env.CONCURRENT_REQUESTS) || 50,
      
      // Queue timeout (milliseconds)
      queueTimeout: parseInt(process.env.QUEUE_TIMEOUT) || 30000
    },
    
    // Response optimization
    response: {
      // ETag generation
      etag: process.env.API_ETAG !== 'false',
      
      // Response compression
      compress: process.env.API_COMPRESS !== 'false',
      
      // JSON stringify optimizations
      jsonSpaces: parseInt(process.env.JSON_SPACES) || 0
    }
  },

  // WebSocket Performance Settings
  websocket: {
    // Socket.IO configuration
    socketIO: {
      // Transport methods
      transports: ['websocket', 'polling'],
      
      // Ping settings
      pingTimeout: parseInt(process.env.WS_PING_TIMEOUT) || 60000,
      pingInterval: parseInt(process.env.WS_PING_INTERVAL) || 25000,
      
      // Connection settings
      upgradeTimeout: parseInt(process.env.WS_UPGRADE_TIMEOUT) || 10000,
      maxHttpBufferSize: parseInt(process.env.WS_MAX_BUFFER_SIZE) || 1048576, // 1MB
      
      // Compression
      compression: process.env.WS_COMPRESSION !== 'false',
      perMessageDeflate: {
        threshold: parseInt(process.env.WS_COMPRESSION_THRESHOLD) || 1024
      }
    }
  },

  // Market Data Performance Settings
  marketData: {
    // API call optimization
    batchSize: parseInt(process.env.MARKET_DATA_BATCH_SIZE) || 10,
    requestDelay: parseInt(process.env.MARKET_DATA_REQUEST_DELAY) || 1000,
    maxRetries: parseInt(process.env.MARKET_DATA_MAX_RETRIES) || 3,
    timeout: parseInt(process.env.MARKET_DATA_TIMEOUT) || 15000,
    
    // Caching
    cacheTTL: parseInt(process.env.MARKET_DATA_CACHE_TTL) || 60,
    cacheSize: parseInt(process.env.MARKET_DATA_CACHE_SIZE) || 1000
  },

  // Logging Performance Settings
  logging: {
    // Log levels and rotation
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    
    // Console logging
    colorize: process.env.LOG_COLORIZE !== 'false',
    timestamp: process.env.LOG_TIMESTAMP !== 'false',
    
    // Performance logging
    logRequests: process.env.LOG_REQUESTS !== 'false',
    logSqlQueries: process.env.LOG_SQL_QUERIES === 'true',
    logCacheHits: process.env.LOG_CACHE_HITS === 'true'
  },

  // Monitoring and Metrics
  monitoring: {
    // Health check intervals
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    
    // Metrics collection
    collectMetrics: process.env.COLLECT_METRICS !== 'false',
    metricsPath: process.env.METRICS_PATH || '/api/metrics',
    
    // Performance monitoring
    monitorMemory: process.env.MONITOR_MEMORY !== 'false',
    monitorCPU: process.env.MONITOR_CPU !== 'false',
    monitorDatabase: process.env.MONITOR_DATABASE !== 'false'
  },

  // Security Performance Settings
  security: {
    // JWT settings
    jwt: {
      algorithm: process.env.JWT_ALGORITHM || 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: process.env.JWT_ISSUER || 'aaiti',
      audience: process.env.JWT_AUDIENCE || 'aaiti-users'
    },
    
    // Helmet settings
    helmet: {
      contentSecurityPolicy: process.env.CSP_ENABLED !== 'false',
      hsts: process.env.HSTS_ENABLED !== 'false',
      noSniff: process.env.NO_SNIFF !== 'false'
    }
  }
};