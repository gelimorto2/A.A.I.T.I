# Performance Tuning Guide

Complete performance optimization guide for A.A.I.T.I v1.2.1. Learn how to optimize system performance, reduce resource usage, and scale effectively.

## 🚀 Performance Overview

A.A.I.T.I is designed for high-performance trading operations with sub-second response times and real-time data processing capabilities.

### Performance Targets
- **API Response Time**: < 200ms (95th percentile)
- **WebSocket Latency**: < 50ms for real-time updates
- **Database Queries**: < 100ms for complex operations
- **ML Model Training**: < 60 seconds for standard models
- **Memory Usage**: < 512MB for production deployment
- **CPU Usage**: < 50% under normal load

## 🏗 System Optimization

### Node.js Backend Optimization

#### Memory Management
```javascript
// Optimize Node.js memory settings
process.env.NODE_OPTIONS = [
  '--max-old-space-size=4096',      // 4GB heap limit
  '--max-semi-space-size=128',      // Young generation limit
  '--optimize-for-size',            // Optimize for memory usage
  '--gc-interval=100',              // Garbage collection frequency
  '--trace-gc-verbose'              // GC monitoring (development only)
].join(' ');

// Memory monitoring middleware
const memoryMonitor = (req, res, next) => {
  const used = process.memoryUsage();
  const metrics = {
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,      // MB
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(used.external / 1024 / 1024 * 100) / 100
  };
  
  logger.debug('Memory usage', metrics);
  next();
};
```

#### Connection Pooling
```javascript
// Database connection optimization
const dbConfig = {
  // Connection pool settings
  pool: {
    min: 2,
    max: 10,
    idle: 30000,
    acquire: 60000,
    evict: 1000
  },
  
  // SQLite specific optimizations
  pragmas: {
    journal_mode: 'WAL',
    synchronous: 'NORMAL',
    cache_size: -64000,        // 64MB cache
    temp_store: 'MEMORY',
    mmap_size: 268435456,      // 256MB memory mapping
    busy_timeout: 30000,
    wal_autocheckpoint: 1000
  }
};

// HTTP Keep-Alive optimization
const agent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});
```

#### Caching Strategy
```javascript
// Multi-layer caching implementation
const NodeCache = require('node-cache');

class CacheManager {
  constructor() {
    // L1 Cache: Frequently accessed data (5 minutes)
    this.l1Cache = new NodeCache({ 
      stdTTL: 300, 
      checkperiod: 60,
      maxKeys: 1000 
    });
    
    // L2 Cache: Market data (1 minute)
    this.marketCache = new NodeCache({ 
      stdTTL: 60, 
      checkperiod: 10,
      maxKeys: 500 
    });
    
    // L3 Cache: User sessions (24 hours)
    this.sessionCache = new NodeCache({ 
      stdTTL: 86400, 
      checkperiod: 3600,
      maxKeys: 10000 
    });
  }

  async get(key, level = 'l1') {
    const cache = this[`${level}Cache`];
    const value = cache.get(key);
    
    if (value) {
      this.updateHitRate(level, true);
      return value;
    }
    
    this.updateHitRate(level, false);
    return null;
  }

  set(key, value, level = 'l1', ttl = null) {
    const cache = this[`${level}Cache`];
    return cache.set(key, value, ttl);
  }

  updateHitRate(level, hit) {
    // Track cache performance metrics
    const metrics = this.metrics[level] || { hits: 0, misses: 0 };
    hit ? metrics.hits++ : metrics.misses++;
    this.metrics[level] = metrics;
  }
}

const cacheManager = new CacheManager();
```

### Database Performance Optimization

#### Query Optimization
```sql
-- Optimize frequently used queries
-- Index strategy for performance

-- User queries
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE active = 1;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);

-- ML Models performance indexes
CREATE INDEX IF NOT EXISTS idx_ml_models_user_algorithm ON ml_models(user_id, algorithm_type);
CREATE INDEX IF NOT EXISTS idx_ml_models_training_status ON ml_models(training_status);
CREATE INDEX IF NOT EXISTS idx_ml_models_performance ON ml_models(user_id) WHERE training_status = 'trained';

-- Predictions optimization
CREATE INDEX IF NOT EXISTS idx_predictions_model_symbol_time ON predictions(model_id, symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_recent ON predictions(timestamp DESC) WHERE timestamp > datetime('now', '-1 day');

-- Trading bots performance
CREATE INDEX IF NOT EXISTS idx_bots_user_status_active ON trading_bots(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_bots_symbol_performance ON trading_bots(symbol, status);

-- Backtests optimization
CREATE INDEX IF NOT EXISTS idx_backtests_model_recent ON backtests(model_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backtests_user_performance ON backtests(user_id) WHERE total_return IS NOT NULL;

-- Audit logs with partitioning strategy
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_recent ON audit_logs(action, timestamp DESC) 
  WHERE timestamp > datetime('now', '-7 days');
```

#### Database Maintenance
```javascript
// Automated database maintenance
class DatabaseMaintenance {
  constructor(db) {
    this.db = db;
    this.maintenanceInterval = 6 * 60 * 60 * 1000; // 6 hours
    this.startMaintenance();
  }

  startMaintenance() {
    setInterval(() => {
      this.performMaintenance();
    }, this.maintenanceInterval);
  }

  async performMaintenance() {
    try {
      logger.info('Starting database maintenance');
      
      // Vacuum database to reclaim space
      await this.db.exec('VACUUM;');
      
      // Analyze tables for query optimization
      await this.db.exec('ANALYZE;');
      
      // Checkpoint WAL file
      await this.db.exec('PRAGMA wal_checkpoint(FULL);');
      
      // Clean old audit logs (older than 30 days)
      await this.db.run(
        "DELETE FROM audit_logs WHERE timestamp < datetime('now', '-30 days')"
      );
      
      // Clean old predictions (older than 7 days)
      await this.db.run(
        "DELETE FROM predictions WHERE timestamp < datetime('now', '-7 days')"
      );
      
      // Update statistics
      await this.updatePerformanceStats();
      
      logger.info('Database maintenance completed');
    } catch (error) {
      logger.error('Database maintenance failed:', error);
    }
  }

  async updatePerformanceStats() {
    const stats = await this.db.get(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM ml_models) as total_models,
        (SELECT COUNT(*) FROM predictions) as total_predictions,
        (SELECT COUNT(*) FROM trading_bots WHERE status = 'active') as active_bots
    `);
    
    logger.info('Database statistics:', stats);
  }
}
```

### Frontend Performance Optimization

#### Component Optimization
```typescript
// React performance optimizations
import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// Lazy loading for code splitting
const MLModelsPage = lazy(() => import('./pages/MLModelsPage'));
const TradingBotsPage = lazy(() => import('./pages/TradingBotsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

// Memoized components for expensive renders
const ExpensiveChart = memo(({ data, options }) => {
  const chartData = useMemo(() => {
    return processChartData(data);
  }, [data]);

  const chartOptions = useMemo(() => {
    return {
      ...defaultOptions,
      ...options,
      plugins: {
        legend: { display: data.length > 1 }
      }
    };
  }, [options, data.length]);

  return <Chart data={chartData} options={chartOptions} />;
});

// Virtual scrolling for large datasets
const VirtualizedList = ({ items, renderItem }) => {
  const parentRef = React.useRef();

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            {renderItem(items[virtualItem.index])}
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### State Management Optimization
```typescript
// Optimized Redux store configuration
import { configureStore, createEntityAdapter } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Entity adapters for normalized state
const modelsAdapter = createEntityAdapter({
  selectId: (model) => model.id,
  sortComparer: (a, b) => b.created_at.localeCompare(a.created_at)
});

const predictionsAdapter = createEntityAdapter({
  selectId: (prediction) => prediction.id,
  sortComparer: (a, b) => b.timestamp.localeCompare(a.timestamp)
});

// Selective persistence to reduce storage size
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'settings'], // Only persist essential data
  blacklist: ['marketData', 'websocket'] // Exclude real-time data
};

// Optimized selectors with memoization
const selectActiveModels = createSelector(
  [modelsAdapter.getSelectors().selectAll],
  (models) => models.filter(model => model.training_status === 'trained')
);

const selectModelPerformance = createSelector(
  [selectActiveModels],
  (models) => models.map(model => ({
    id: model.id,
    name: model.name,
    accuracy: model.performance_metrics?.accuracy || 0,
    return: model.performance_metrics?.return || 0
  }))
);
```

#### Bundle Optimization
```javascript
// Webpack optimization configuration
const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  // Code splitting strategy
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        },
        material: {
          test: /[\\/]node_modules[\\/]@mui/,
          name: 'material-ui',
          chunks: 'all',
          priority: 15
        },
        charts: {
          test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)/,
          name: 'charts',
          chunks: 'all',
          priority: 12
        }
      }
    },
    runtimeChunk: 'single'
  },

  // Tree shaking and dead code elimination
  resolve: {
    alias: {
      '@mui/icons-material': '@mui/icons-material/esm'
    }
  },

  // Compression and minification
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ]
};
```

## 🔄 Real-Time Performance

### WebSocket Optimization
```javascript
// Optimized WebSocket server configuration
const io = require('socket.io')(server, {
  // Connection optimization
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6, // 1MB

  // Transport optimization
  transports: ['websocket', 'polling'],
  allowEIO3: true,

  // CORS optimization
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  },

  // Compression
  compression: true,
  perMessageDeflate: {
    threshold: 1024,
    concurrencyLimit: 10,
    memLevel: 7
  }
});

// Connection pooling and rate limiting
class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.rateLimiter = new Map();
    this.maxConnections = 1000;
    this.maxEventsPerSecond = 10;
  }

  handleConnection(socket) {
    // Connection limit check
    if (this.connections.size >= this.maxConnections) {
      socket.disconnect(true);
      return;
    }

    // Rate limiting per connection
    const clientId = socket.handshake.auth.userId || socket.id;
    this.setupRateLimit(clientId, socket);

    // Optimized event handlers
    this.setupEventHandlers(socket);

    // Connection tracking
    this.connections.set(socket.id, {
      socket,
      clientId,
      connectedAt: Date.now(),
      eventsCount: 0
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      this.connections.delete(socket.id);
      this.rateLimiter.delete(clientId);
    });
  }

  setupRateLimit(clientId, socket) {
    const limiter = {
      events: 0,
      resetTime: Date.now() + 1000
    };

    this.rateLimiter.set(clientId, limiter);

    socket.use((packet, next) => {
      const now = Date.now();
      if (now > limiter.resetTime) {
        limiter.events = 0;
        limiter.resetTime = now + 1000;
      }

      if (limiter.events >= this.maxEventsPerSecond) {
        next(new Error('Rate limit exceeded'));
        return;
      }

      limiter.events++;
      next();
    });
  }

  broadcastMarketData(data) {
    // Efficient broadcasting with room-based filtering
    const serializedData = JSON.stringify(data);
    
    this.connections.forEach(({ socket }) => {
      if (socket.rooms.has('market-data')) {
        socket.emit('market_data_update', serializedData);
      }
    });
  }
}
```

### Data Processing Optimization
```javascript
// Efficient market data processing
class MarketDataProcessor {
  constructor() {
    this.dataBuffer = new Map();
    this.processingQueue = [];
    this.batchSize = 100;
    this.processInterval = 1000; // 1 second
    
    this.startProcessing();
  }

  addData(symbol, data) {
    if (!this.dataBuffer.has(symbol)) {
      this.dataBuffer.set(symbol, []);
    }
    
    const buffer = this.dataBuffer.get(symbol);
    buffer.push(data);
    
    // Limit buffer size to prevent memory issues
    if (buffer.length > 1000) {
      buffer.splice(0, buffer.length - 1000);
    }
  }

  startProcessing() {
    setInterval(() => {
      this.processBatch();
    }, this.processInterval);
  }

  processBatch() {
    const batch = [];
    
    for (const [symbol, buffer] of this.dataBuffer.entries()) {
      if (buffer.length > 0) {
        const data = buffer.splice(0, this.batchSize);
        batch.push({ symbol, data });
      }
    }

    if (batch.length > 0) {
      this.processMarketData(batch);
    }
  }

  processMarketData(batch) {
    // Parallel processing using worker threads
    const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
    
    if (isMainThread) {
      const worker = new Worker(__filename, {
        workerData: { batch }
      });
      
      worker.on('message', (processedData) => {
        this.broadcastProcessedData(processedData);
      });
    } else {
      // Worker thread processing
      const processedData = workerData.batch.map(({ symbol, data }) => {
        return {
          symbol,
          processed: this.calculateTechnicalIndicators(data)
        };
      });
      
      parentPort.postMessage(processedData);
    }
  }

  calculateTechnicalIndicators(data) {
    // Optimized technical indicator calculations
    const prices = data.map(d => d.price);
    
    return {
      sma: this.calculateSMA(prices, 20),
      ema: this.calculateEMA(prices, 20),
      rsi: this.calculateRSI(prices, 14),
      volatility: this.calculateVolatility(prices)
    };
  }
}
```

## 📊 Machine Learning Performance

### Model Training Optimization
```javascript
// Optimized ML training pipeline
class MLTrainingOptimizer {
  constructor() {
    this.trainingQueue = [];
    this.activeTraining = new Map();
    this.maxConcurrentTraining = 2;
    this.trainingTimeouts = new Map();
  }

  async optimizeTraining(modelConfig) {
    // Data preprocessing optimization
    const optimizedData = await this.preprocessData(modelConfig);
    
    // Parameter optimization
    const optimizedParams = await this.optimizeParameters(
      modelConfig.algorithmType, 
      optimizedData
    );
    
    // Memory-efficient training
    return this.trainWithMemoryOptimization(
      modelConfig, 
      optimizedData, 
      optimizedParams
    );
  }

  async preprocessData(modelConfig) {
    const { symbols, trainingPeriodDays } = modelConfig;
    
    // Parallel data fetching
    const dataPromises = symbols.map(symbol => 
      this.fetchMarketData(symbol, trainingPeriodDays)
    );
    
    const rawData = await Promise.all(dataPromises);
    
    // Efficient data processing with streaming
    return this.processDataStream(rawData);
  }

  async optimizeParameters(algorithmType, data) {
    // Algorithm-specific parameter optimization
    switch (algorithmType) {
      case 'arima':
        return this.optimizeARIMAParameters(data);
      case 'lstm':
        return this.optimizeLSTMParameters(data);
      case 'prophet':
        return this.optimizeProphetParameters(data);
      default:
        return this.getDefaultParameters(algorithmType);
    }
  }

  async optimizeARIMAParameters(data) {
    // Grid search with early stopping
    const parameterGrid = {
      p: [1, 2, 3],
      d: [0, 1, 2],
      q: [1, 2, 3]
    };

    let bestParams = null;
    let bestScore = -Infinity;
    const maxIterations = 10; // Limit search for performance

    for (let i = 0; i < maxIterations; i++) {
      const params = this.sampleRandomParameters(parameterGrid);
      
      try {
        const score = await this.evaluateParameters(data, params);
        
        if (score > bestScore) {
          bestScore = score;
          bestParams = params;
          
          // Early stopping if good enough
          if (score > 0.8) break;
        }
      } catch (error) {
        // Skip invalid parameter combinations
        continue;
      }
    }

    return bestParams || { p: 2, d: 1, q: 2 };
  }

  async trainWithMemoryOptimization(modelConfig, data, parameters) {
    // Memory monitoring during training
    const initialMemory = process.memoryUsage().heapUsed;
    const memoryThreshold = 1024 * 1024 * 1024; // 1GB

    // Batch processing for large datasets
    const batchSize = Math.min(1000, Math.floor(data.length / 10));
    const batches = this.createBatches(data, batchSize);

    let model = null;

    for (const batch of batches) {
      // Check memory usage
      const currentMemory = process.memoryUsage().heapUsed;
      
      if (currentMemory > memoryThreshold) {
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
        
        // Wait for memory to stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Train on batch
      model = await this.trainBatch(model, batch, parameters);
    }

    const finalMemory = process.memoryUsage().heapUsed;
    logger.info('Training memory usage:', {
      initial: Math.round(initialMemory / 1024 / 1024),
      final: Math.round(finalMemory / 1024 / 1024),
      increase: Math.round((finalMemory - initialMemory) / 1024 / 1024)
    });

    return model;
  }
}
```

### Prediction Performance
```javascript
// Optimized prediction pipeline
class PredictionOptimizer {
  constructor() {
    this.predictionCache = new LRUCache(1000);
    this.batchPredictions = new Map();
    this.batchTimeout = 100; // 100ms batch collection
  }

  async makePrediction(modelId, features, options = {}) {
    // Check cache first
    const cacheKey = this.generateCacheKey(modelId, features);
    const cached = this.predictionCache.get(cacheKey);
    
    if (cached && !options.bypassCache) {
      return cached;
    }

    // Batch predictions for efficiency
    if (options.allowBatching !== false) {
      return this.addToBatch(modelId, features, cacheKey);
    }

    // Single prediction
    return this.executePrediction(modelId, features, cacheKey);
  }

  addToBatch(modelId, features, cacheKey) {
    return new Promise((resolve, reject) => {
      if (!this.batchPredictions.has(modelId)) {
        this.batchPredictions.set(modelId, {
          requests: [],
          timeout: setTimeout(() => {
            this.processBatch(modelId);
          }, this.batchTimeout)
        });
      }

      const batch = this.batchPredictions.get(modelId);
      batch.requests.push({ features, cacheKey, resolve, reject });

      // Process immediately if batch is full
      if (batch.requests.length >= 10) {
        clearTimeout(batch.timeout);
        this.processBatch(modelId);
      }
    });
  }

  async processBatch(modelId) {
    const batch = this.batchPredictions.get(modelId);
    if (!batch) return;

    this.batchPredictions.delete(modelId);

    try {
      // Batch feature processing
      const allFeatures = batch.requests.map(req => req.features);
      const predictions = await this.executeBatchPrediction(modelId, allFeatures);

      // Resolve all promises
      batch.requests.forEach((req, index) => {
        const prediction = predictions[index];
        this.predictionCache.set(req.cacheKey, prediction);
        req.resolve(prediction);
      });
    } catch (error) {
      // Reject all promises
      batch.requests.forEach(req => req.reject(error));
    }
  }

  async executeBatchPrediction(modelId, featuresArray) {
    // Load model once for all predictions
    const model = await this.loadModel(modelId);
    
    // Vectorized prediction for better performance
    return model.predictBatch(featuresArray);
  }
}
```

## 🔧 Infrastructure Optimization

### Docker Performance
```dockerfile
# Optimized Dockerfile for production
FROM node:18-alpine AS base
RUN apk add --no-cache dumb-init
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production --omit=dev && npm cache clean --force

FROM base AS build
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
USER nodejs
EXPOSE 5000
ENV NODE_ENV=production
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### Container Resource Optimization
```yaml
# docker-compose.yml with resource optimization
version: '3.8'

services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.5'
    environment:
      - NODE_ENV=production
      - NODE_OPTIONS=--max-old-space-size=384
      - UV_THREADPOOL_SIZE=16
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
        reservations:
          memory: 128M
          cpus: '0.25'
    environment:
      - NGINX_WORKER_PROCESSES=auto
      - NGINX_WORKER_CONNECTIONS=1024
```

### Network Optimization
```nginx
# Optimized Nginx configuration
server {
    listen 80;
    server_name localhost;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy with optimizations
    location /api/ {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Performance optimizations
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket optimization
    location /socket.io/ {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

## 📈 Monitoring Performance

### Metrics Collection
```javascript
// Performance metrics collection
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requestCount: 0,
      responseTime: [],
      errorCount: 0,
      memoryUsage: [],
      cpuUsage: [],
      databaseQueries: [],
      cacheHitRate: { hits: 0, misses: 0 }
    };
    
    this.startMonitoring();
  }

  startMonitoring() {
    // System metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Every 10 seconds

    // Performance metrics cleanup
    setInterval(() => {
      this.cleanupMetrics();
    }, 300000); // Every 5 minutes
  }

  collectSystemMetrics() {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external
    });

    this.metrics.cpuUsage.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });
  }

  recordRequest(req, res, responseTime) {
    this.metrics.requestCount++;
    this.metrics.responseTime.push({
      timestamp: Date.now(),
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime
    });

    if (res.statusCode >= 400) {
      this.metrics.errorCount++;
    }
  }

  recordDatabaseQuery(query, duration) {
    this.metrics.databaseQueries.push({
      timestamp: Date.now(),
      query: query.substring(0, 100), // Truncate long queries
      duration
    });
  }

  recordCacheOperation(hit) {
    if (hit) {
      this.metrics.cacheHitRate.hits++;
    } else {
      this.metrics.cacheHitRate.misses++;
    }
  }

  getPerformanceReport() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Filter recent data
    const recentResponseTimes = this.metrics.responseTime
      .filter(rt => rt.timestamp > oneHourAgo);
    
    const recentQueries = this.metrics.databaseQueries
      .filter(q => q.timestamp > oneHourAgo);

    return {
      requests: {
        total: this.metrics.requestCount,
        recent: recentResponseTimes.length,
        averageResponseTime: this.calculateAverage(recentResponseTimes, 'responseTime'),
        p95ResponseTime: this.calculatePercentile(recentResponseTimes, 'responseTime', 95),
        errorRate: this.metrics.errorCount / this.metrics.requestCount
      },
      database: {
        totalQueries: this.metrics.databaseQueries.length,
        recentQueries: recentQueries.length,
        averageQueryTime: this.calculateAverage(recentQueries, 'duration'),
        slowQueries: recentQueries.filter(q => q.duration > 1000).length
      },
      cache: {
        hitRate: this.metrics.cacheHitRate.hits / 
                (this.metrics.cacheHitRate.hits + this.metrics.cacheHitRate.misses),
        totalOperations: this.metrics.cacheHitRate.hits + this.metrics.cacheHitRate.misses
      },
      system: {
        currentMemory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
  }

  cleanupMetrics() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    this.metrics.responseTime = this.metrics.responseTime
      .filter(rt => rt.timestamp > oneHourAgo);
    
    this.metrics.databaseQueries = this.metrics.databaseQueries
      .filter(q => q.timestamp > oneHourAgo);
    
    this.metrics.memoryUsage = this.metrics.memoryUsage
      .filter(m => m.timestamp > oneHourAgo);
    
    this.metrics.cpuUsage = this.metrics.cpuUsage
      .filter(c => c.timestamp > oneHourAgo);
  }
}
```

## 🎯 Performance Testing

### Load Testing Scripts
```javascript
// Load testing with Artillery.js
module.exports = {
  config: {
    target: 'http://localhost:5000',
    phases: [
      { duration: 60, arrivalRate: 10 }, // Warm up
      { duration: 120, arrivalRate: 50 }, // Ramp up
      { duration: 300, arrivalRate: 100 }, // Sustained load
      { duration: 60, arrivalRate: 200 } // Peak load
    ],
    payload: {
      path: './test-data.csv',
      fields: ['userId', 'symbol', 'amount']
    }
  },
  scenarios: [
    {
      name: 'Authentication flow',
      weight: 20,
      flow: [
        { post: { url: '/api/auth/login', json: { email: 'test@example.com', password: 'password' } } },
        { get: { url: '/api/ml/models', headers: { Authorization: 'Bearer {{ token }}' } } }
      ]
    },
    {
      name: 'Model operations',
      weight: 40,
      flow: [
        { get: { url: '/api/ml/models' } },
        { post: { url: '/api/ml/models/{{ modelId }}/predict', json: { features: [1, 2, 3, 4, 5] } } }
      ]
    },
    {
      name: 'Market data requests',
      weight: 40,
      flow: [
        { get: { url: '/api/trading/market-data/{{ symbol }}' } },
        { get: { url: '/api/health' } }
      ]
    }
  ]
};
```

### Benchmark Results Tracking
```javascript
// Performance benchmark tracking
class BenchmarkTracker {
  constructor() {
    this.benchmarks = new Map();
    this.historicalData = [];
  }

  async runBenchmark(name, testFunction, iterations = 1000) {
    console.log(`Running benchmark: ${name}`);
    
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      await testFunction();
      const iterationEnd = performance.now();
      
      results.push(iterationEnd - iterationStart);
    }

    const endTime = Date.now();
    
    const stats = {
      name,
      iterations,
      totalTime: endTime - startTime,
      averageTime: results.reduce((a, b) => a + b, 0) / results.length,
      minTime: Math.min(...results),
      maxTime: Math.max(...results),
      p50: this.percentile(results, 50),
      p95: this.percentile(results, 95),
      p99: this.percentile(results, 99),
      timestamp: new Date().toISOString()
    };

    this.benchmarks.set(name, stats);
    this.historicalData.push(stats);
    
    console.log(`Benchmark ${name} completed:`, {
      average: `${stats.averageTime.toFixed(2)}ms`,
      p95: `${stats.p95.toFixed(2)}ms`,
      p99: `${stats.p99.toFixed(2)}ms`
    });

    return stats;
  }

  percentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      benchmarks: Array.from(this.benchmarks.values()),
      summary: {
        totalBenchmarks: this.benchmarks.size,
        averagePerformance: this.calculateOverallAverage(),
        trends: this.analyzeTrends()
      }
    };
  }
}
```

---

**Related Guides:**
- [Architecture Overview](architecture.md) - System design details
- [Docker Guide](docker.md) - Container optimization
- [Security Guide](security.md) - Security performance impact
- [Troubleshooting](troubleshooting.md) - Performance issue resolution