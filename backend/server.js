const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const botRoutes = require('./routes/bots');
const tradingRoutes = require('./routes/trading');
const tradingEnhancedRoutes = require('./routes/tradingEnhanced');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const mlRoutes = require('./routes/ml');
const notificationRoutes = require('./routes/notifications');
const functionsRoutes = require('./routes/functions');
const logsRoutes = require('./routes/logs');
const setupRoutes = require('./routes/setup');
const { router: metricsRoutes, collectRequestMetrics } = require('./routes/metrics');
// Security & Compliance routes
const apiKeysRoutes = require('./routes/apiKeys');
const oauthRoutes = require('./routes/oauth');
const complianceRoutes = require('./routes/compliance');
const dataRetentionRoutes = require('./routes/dataRetention');
// Advanced Features routes
const aiInsightsRoutes = require('./routes/aiInsights');
const integrationsRoutes = require('./routes/integrations');
// Exchange Integration Hub routes (TODO 3.1)
const exchangeIntegrationRoutes = require('./routes/exchangeIntegration');
// Next-Generation AI & ML routes (TODO 2.1)
const nextGenAIRoutes = require('./routes/nextGenAI');
// Advanced Analytics & Reporting routes (TODO 2.2)
const advancedAnalyticsRoutes = require('./routes/advancedAnalytics');
// Paper Trading routes
const paperTradingRoutes = require('./routes/paperTrading');
// High-Frequency Trading routes (TODO 3.2)
const highFrequencyTradingRoutes = require('./routes/highFrequencyTrading');
// Intelligent Trading Assistants routes (TODO 5.1)
const intelligentTradingAssistantsRoutes = require('./routes/intelligentTradingAssistants');
// Production Trading routes - Real ML trading integration
const productionTradingRoutes = require('./routes/productionTrading');

const { initializeDatabase } = require('./database/init');
const databaseConfig = require('./config/database');
const { v4: uuidv4 } = require('uuid');
const { authenticateSocket } = require('./middleware/auth');
const { initializeUserCredentials, getCredentials } = require('./utils/credentials');
const marketDataService = require('./utils/marketData');
const logger = require('./utils/logger');
const ASCIIDashboard = require('./utils/asciiDashboard');
const { getCache, cacheMiddleware } = require('./utils/cache');
const { getDatabaseOptimizer } = require('./utils/databaseOptimizer');
const { getAPIPool } = require('./utils/apiConnectionPool');
const { getMetrics } = require('./utils/prometheusMetrics');
const { getNotificationManager } = require('./utils/notificationManager');
const { createGraphQLServer } = require('./routes/graphql');
const { getVersionManager } = require('./utils/apiVersionManager');
// Security & Compliance services
const apiKeyManager = require('./utils/apiKeyManager');
const dataRetentionService = require('./utils/dataRetentionService');

// Performance configuration
const performanceConfig = require('./config/performance');

// Performance and GitHub reporting services
const { getPerformanceMonitor } = require('./utils/performanceMonitor');
const { getGitHubIssueReporter } = require('./utils/githubIssueReporter');

const app = express();
const server = http.createServer(app);
let socketCtx = null;

// Apply performance configurations to server
server.maxConnections = performanceConfig.server.maxConnections;
server.keepAliveTimeout = performanceConfig.server.keepAliveTimeout;
server.headersTimeout = performanceConfig.server.headersTimeout;
server.requestTimeout = performanceConfig.server.requestTimeout;

// Initialize ASCII Dashboard
const dashboard = new ASCIIDashboard();

// Connect logger to dashboard
logger.setDashboard(dashboard);

// Initialize performance monitor and GitHub issue reporter
let performanceMonitor;
let githubReporter;

const initializePerformanceServices = () => {
  try {
    // Initialize GitHub issue reporter
    const isProd = (process.env.NODE_ENV === 'production');
    githubReporter = getGitHubIssueReporter({
      enabled: isProd && !!process.env.GITHUB_TOKEN,
      autoCreate: isProd && process.env.GITHUB_AUTO_CREATE_ISSUES !== 'false',
      minSeverity: isProd ? 'error' : 'critical'
    });
    
    // Connect GitHub reporter to logger
    logger.setGitHubReporter(githubReporter);
    
    // Initialize performance monitor
    performanceMonitor = getPerformanceMonitor({
      reportToGitHub: process.env.GITHUB_TOKEN ? true : false,
      alertOnThresholds: true
    });
    
    logger.info('🚀 Performance services initialized', {
      githubReporting: githubReporter.getStatus().enabled,
      performanceMonitoring: true
    });
  } catch (error) {
    logger.error('Failed to initialize performance services', error);
  }
};

// Initialize credentials and get configuration
let config = {};

const initializeConfig = async () => {
  logger.info('🔧 Initializing AAITI configuration...', { service: 'aaiti-backend' });
  
  // Initialize performance services first
  initializePerformanceServices();
  
  await initializeUserCredentials();
  const credentials = getCredentials();
  
  // Merge default configuration with stored settings
  const resolvedPort = credentials?.system?.port || process.env.PORT || 5000;
  const nodeEnv = credentials?.system?.nodeEnv || process.env.NODE_ENV || 'development';
  config = {
    port: resolvedPort,
    nodeEnv,
    // Default frontend to backend port in production to enable same-origin serving
    frontendUrl: credentials?.system?.frontendUrl || process.env.FRONTEND_URL || (nodeEnv === 'production' ? `http://localhost:${resolvedPort}` : 'http://localhost:3000'),
    dbPath: credentials?.system?.dbPath || process.env.DB_PATH || './database/aaiti.sqlite',
    logLevel: credentials?.system?.logLevel || process.env.LOG_LEVEL || 'info',
    jwtSecret: credentials?.security?.jwtSecret || process.env.JWT_SECRET || 'fallback-secret',
    jwtExpiresIn: credentials?.system?.jwtExpiresIn || process.env.JWT_EXPIRES_IN || '7d'
  };
  
  logger.info('✅ Configuration loaded successfully', { 
    port: config.port,
    environment: config.nodeEnv,
    frontendUrl: config.frontendUrl,
    logLevel: config.logLevel,
    databasePath: config.dbPath,
    jwtExpiresIn: config.jwtExpiresIn,
    service: 'aaiti-backend'
  });
  
  return config;
};

// Configure CORS for Socket.IO
const initializeSocketIO = () => {
  return socketIo(server, {
    cors: {
      origin: config.frontendUrl,
      methods: ["GET", "POST"],
      credentials: true
    },
    // Performance optimizations from config
    transports: performanceConfig.websocket.socketIO.transports,
    pingTimeout: performanceConfig.websocket.socketIO.pingTimeout,
    pingInterval: performanceConfig.websocket.socketIO.pingInterval,
    upgradeTimeout: performanceConfig.websocket.socketIO.upgradeTimeout,
    maxHttpBufferSize: performanceConfig.websocket.socketIO.maxHttpBufferSize,
    compression: performanceConfig.websocket.socketIO.compression,
    perMessageDeflate: performanceConfig.websocket.socketIO.perMessageDeflate
  });
};

// Initialize app middleware
const initializeMiddleware = () => {
  logger.info('🔐 Setting up security middleware...', { service: 'aaiti-backend' });
  
  // Get metrics instance for middleware
  const metrics = getMetrics();
  
  // Prometheus metrics middleware (before other middleware)
  app.use(metrics.createMiddleware());
  
  // Security middleware with relaxed CSP for development
  app.use(helmet({
    contentSecurityPolicy: false,  // Disable CSP for development ease
    crossOriginEmbedderPolicy: false
  }));
  // Correlation ID middleware
  app.use((req, res, next) => {
    const incomingId = req.headers['x-request-id'];
    req.id = (typeof incomingId === 'string' && incomingId.trim().length > 0) ? incomingId : uuidv4();
    res.setHeader('x-request-id', req.id);
    next();
  });
  // CORS: Allow all origins for development (simplified)
  app.use(cors({
    origin: true,  // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200
  }));

  logger.info('⚡ Configuring rate limiting...', { 
    windowMs: performanceConfig.api.rateLimit.windowMs / 1000 / 60 + ' minutes',
    maxRequests: performanceConfig.api.rateLimit.max,
    service: 'aaiti-backend'
  });

  // Rate limiting with performance configuration
  const limiter = rateLimit({
    windowMs: performanceConfig.api.rateLimit.windowMs,
    max: performanceConfig.api.rateLimit.max,
    standardHeaders: performanceConfig.api.rateLimit.standardHeaders,
    legacyHeaders: performanceConfig.api.rateLimit.legacyHeaders,
    skipSuccessfulRequests: performanceConfig.api.rateLimit.skipSuccessfulRequests,
    skipFailedRequests: performanceConfig.api.rateLimit.skipFailedRequests
  });
  app.use(limiter);

  logger.info('📝 Setting up request logging...', { service: 'aaiti-backend' });
  
  // Logging
  morgan.token('id', (req) => req.id || '-');
  app.use(morgan(':id :method :url :status :res[content-length] - :response-time ms'));

  // Body parsing with performance configuration
  app.use(express.json({ 
    limit: performanceConfig.server.bodyLimit 
  }));
  app.use(express.urlencoded({ 
    extended: true,
    parameterLimit: performanceConfig.server.parameterLimit
  }));

  // Performance metrics middleware (before routes)
  app.use(collectRequestMetrics);

  // Add performance monitoring middleware
  app.use((req, res, next) => {
    if (performanceMonitor) {
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      
      // Monitor API call performance
      performanceMonitor.monitorAPICall(endpoint, async () => {
        return new Promise((resolve) => {
          const originalSend = res.send;
          res.send = function(data) {
            resolve(data);
            return originalSend.call(this, data);
          };
          next();
        });
      }).catch(error => {
        logger.error(`API monitoring error for ${endpoint}`, error);
        next();
      });
    } else {
      next();
    }
  });

  logger.info('🛣️ Registering API routes...', { service: 'aaiti-backend' });

  // Routes
  app.use('/api/setup', setupRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/bots', botRoutes);
  app.use('/api/trading', tradingRoutes);
  app.use('/api/trading-enhanced', tradingEnhancedRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/ml', mlRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/functions', functionsRoutes);
  app.use('/api/logs', logsRoutes);
  
  // Performance and Issue Reporting routes
  const performanceRoutes = require('./routes/performance');
  app.use('/api/performance', performanceRoutes);
  
  // Security & Compliance routes
  app.use('/api/api-keys', apiKeysRoutes);
  app.use('/api/oauth', oauthRoutes);
  app.use('/api/compliance', complianceRoutes);
  app.use('/api/data-retention', dataRetentionRoutes);
  
  // Advanced Features routes
  app.use('/api/ai-insights', aiInsightsRoutes);
  app.use('/api/integrations', integrationsRoutes);
  
  // Exchange Integration Hub routes (TODO 3.1)
  app.use('/api/exchange-integration', exchangeIntegrationRoutes);
  
  // Next-Generation AI & ML routes (TODO 2.1)
  app.use('/api/next-gen-ai', nextGenAIRoutes);
  
  // Advanced Analytics & Reporting routes (TODO 2.2)
  app.use('/api/advanced-analytics', advancedAnalyticsRoutes);
  
  // Paper Trading routes
  app.use('/api/paper-trading', paperTradingRoutes);
  
  // High-Frequency Trading routes (TODO 3.2)
  app.use('/api/hft', highFrequencyTradingRoutes);
  
  // Intelligent Trading Assistants routes (TODO 5.1)
  app.use('/api/intelligent-trading-assistants', intelligentTradingAssistantsRoutes);
  
  // Production Trading routes - Real ML trading integration
  app.use('/api/production-trading', productionTradingRoutes);
  
  // Metrics routes (for monitoring) under /api/metrics to avoid /api/health conflict
  app.use('/api/metrics', metricsRoutes);
  
  // Prometheus metrics endpoint (protected in production)
  app.get('/metrics', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      const expected = process.env.METRICS_TOKEN;
      const provided = req.header('X-Metrics-Token');
      if (!expected || provided !== expected) {
        return res.status(403).send('Forbidden');
      }
    }
    try {
      const metrics = getMetrics();
      const metricsData = await metrics.getMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metricsData);
    } catch (error) {
      logger.error('Failed to generate metrics', { error: error.message, service: 'aaiti-backend' });
      res.status(500).send('Failed to generate metrics');
    }
  });

  logger.info('🏥 Setting up health check endpoint...', { service: 'aaiti-backend' });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const versionInfo = dashboard.versionInfo || { version: '1.1.0', buildNumber: '1' };
    const healthData = { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: {
        nodeEnv: config.nodeEnv,
        version: versionInfo.version,
        build: versionInfo.buildNumber,
        port: config.port,
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
      },
      marketData: {
        provider: 'CoinGecko',
        cacheStats: marketDataService.getCacheStats()
      }
    };
    
    logger.debug('Health check requested', { 
      uptime: healthData.uptime,
      memoryUsage: healthData.memory,
      version: versionInfo.version,
      service: 'aaiti-backend'
    });
    
    res.json(healthData);
  });

  // Readiness endpoint - verify DB connectivity and essential services
  app.get('/api/ready', async (req, res) => {
    try {
      const status = {
        timestamp: new Date().toISOString(),
        db: 'unknown',
        cache: 'ok',
        api: 'ok'
      };

      if (databaseConfig.type === 'postgresql') {
        const pool = databaseConfig.getPool('primary');
        await pool.query('SELECT 1');
        status.db = 'ok';
      } else {
        const sqlite = require('./database/init').db;
        await new Promise((resolve, reject) => {
          sqlite.get('SELECT 1', [], (err) => (err ? reject(err) : resolve()));
        });
        status.db = 'ok';
      }

      res.json({ ready: true, status });
    } catch (e) {
      logger.error('Readiness check failed', { error: e.message, service: 'aaiti-backend' });
      res.status(503).json({ ready: false, error: e.message });
    }
  });

  // Performance monitoring endpoint with caching
  app.get('/api/performance', cacheMiddleware(60), async (req, res) => {
    try {
      const cache = getCache();
      const dbOptimizer = getDatabaseOptimizer();
      const apiPool = getAPIPool();

      const performanceData = {
        timestamp: new Date().toISOString(),
        cache: cache.getStats(),
        database: await dbOptimizer.getStats(),
        api: apiPool.getStats(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        }
      };

      res.json(performanceData);
    } catch (error) {
      logger.error('Performance endpoint error', { error: error.message, service: 'aaiti-backend' });
      res.status(500).json({ error: 'Failed to get performance data' });
    }
  });

  logger.info('✅ Middleware setup completed', { service: 'aaiti-backend' });

  // Serve React frontend build (static files)
  try {
    const buildPath = path.resolve(__dirname, '../frontend/build');
    app.use(express.static(buildPath));
    // SPA fallback for all non-API routes
    app.get(/^\/(?!api|metrics|graphql).*/, (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
    logger.info('🖥️  Frontend static serving enabled', { path: buildPath, service: 'aaiti-backend' });
  } catch (e) {
    logger.warn('Frontend build not found; static serving disabled', { error: e.message, service: 'aaiti-backend' });
  }
};

// Socket.IO connection handling and real-time data
const initializeSocketHandlers = (io) => {
  logger.info('🔌 Setting up WebSocket (public mode)...', { service: 'aaiti-backend' });
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    // Update dashboard with new connection
    dashboard.updateStats({
      connections: io.engine.clientsCount
    });
    
    logger.info('🟢 WebSocket connection established', { 
      userId: socket.userId,
      socketId: socket.id,
      userAgent: socket.handshake.headers['user-agent'],
      service: 'aaiti-backend'
    });
    
    // Join user-specific room for personalized updates
    socket.join(`user_${socket.userId}`);
    logger.debug('User joined personal room', { 
      userId: socket.userId,
      room: `user_${socket.userId}`,
      service: 'aaiti-backend'
    });
    
    // Join bot rooms user has access to
    // This will be populated based on user permissions
    
    socket.on('subscribe_to_bot', (botId) => {
      // Verify user has access to this bot
      socket.join(`bot_${botId}`);
      logger.info('🤖 User subscribed to bot updates', { 
        userId: socket.userId,
        botId,
        service: 'aaiti-backend'
      });
    });
    
    socket.on('unsubscribe_from_bot', (botId) => {
      socket.leave(`bot_${botId}`);
      logger.info('🚫 User unsubscribed from bot updates', { 
        userId: socket.userId,
        botId,
        service: 'aaiti-backend'
      });
    });
    
    socket.on('disconnect', (reason) => {
      // Update dashboard with disconnection
      dashboard.updateStats({
        connections: Math.max(0, io.engine.clientsCount - 1)
      });
      
      logger.info('🔴 WebSocket connection closed', { 
        userId: socket.userId,
        socketId: socket.id,
        reason,
        service: 'aaiti-backend'
      });
    });
  });

  // Global real-time data broadcaster
  const broadcastData = async () => {
    try {
      const startTime = Date.now();
      
      // Get popular symbols and broadcast their prices
      const symbols = marketDataService.getPopularSymbols().slice(0, 5); // Limit to 5 to avoid API rate limits
      logger.debug('📡 Broadcasting market data', { 
        symbolCount: symbols.length,
        symbols,
        connectedUsers: io.engine.clientsCount,
        service: 'aaiti-backend'
      });
      
      const quotes = await marketDataService.getMultipleQuotes(symbols);
      const successfulQuotes = quotes.filter(q => q.success);
      
      // Broadcast to all connected users
      io.emit('market_data_update', {
        timestamp: new Date().toISOString(),
        quotes: successfulQuotes.map(q => q.data),
        metadata: {
          totalSymbols: symbols.length,
          successfulFetches: successfulQuotes.length,
          provider: 'CoinGecko'
        }
      });
      
      // Broadcast system health
      const healthData = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        connectedUsers: io.engine.clientsCount,
        marketData: {
          lastUpdate: new Date().toISOString(),
          cacheStats: marketDataService.getCacheStats()
        }
      };
      
      io.emit('system_health', healthData);
      
      const broadcastTime = Date.now() - startTime;
      logger.debug('📡 Market data broadcast completed', { 
        broadcastTime: `${broadcastTime}ms`,
        quotesDelivered: successfulQuotes.length,
        connectedUsers: io.engine.clientsCount,
        service: 'aaiti-backend'
      });
      
    } catch (error) {
      logger.error('❌ Error broadcasting real-time data', { 
        error: error.message,
        stack: error.stack,
        service: 'aaiti-backend'
      });
    }
  };

  logger.info('📡 Starting real-time data broadcaster', { 
    interval: '5 seconds',
    service: 'aaiti-backend'
  });

  // Start real-time data broadcasting
  const broadcastInterval = setInterval(broadcastData, 5000); // Every 5 seconds
  
  logger.info('✅ WebSocket handlers initialized successfully', { service: 'aaiti-backend' });
  // Return cleanup handle for graceful shutdown
  return { io, cleanup: () => clearInterval(broadcastInterval) };
};

// Initialize database and start server
const startServer = async () => {
  try {
    const serverStartTime = Date.now();
    const versionInfo = dashboard.versionInfo || { version: '1.1.0', buildNumber: '1' };
    logger.info('🚀 Starting AAITI Backend Server...', { 
      version: versionInfo.version,
      build: versionInfo.buildNumber,
      nodeVersion: process.version,
      platform: process.platform,
      service: 'aaiti-backend'
    });
    
    // Initialize configuration first
    await initializeConfig();
    logger.info('✅ Configuration initialized successfully', { service: 'aaiti-backend' });
    
  // Initialize performance enhancements
    logger.info('⚡ Initializing performance optimizations...', { service: 'aaiti-backend' });
    
    // Initialize cache system
    const cache = getCache();
    logger.info('✅ Cache system initialized', { service: 'aaiti-backend' });
    
    // Initialize database optimizer
    const dbOptimizer = getDatabaseOptimizer();
    await dbOptimizer.initialize();
    await dbOptimizer.createOptimizedIndexes();
    await dbOptimizer.analyzeAndOptimize();
    logger.info('✅ Database optimizer initialized', { service: 'aaiti-backend' });
    
    // Initialize API connection pool
    const apiPool = getAPIPool();
    logger.info('✅ API connection pool initialized', { service: 'aaiti-backend' });
    
    // Initialize Prometheus metrics
    const metrics = getMetrics();
    logger.info('✅ Prometheus metrics initialized', { service: 'aaiti-backend' });
    
    // Initialize notification manager
    const notificationManager = getNotificationManager();
    logger.info('✅ Notification manager initialized', { service: 'aaiti-backend' });
    
    // Initialize API version manager
    const versionManager = getVersionManager();
    logger.info('✅ API version manager initialized', { service: 'aaiti-backend' });
    
    // Initialize database (PostgreSQL or SQLite)
    logger.info('💾 Initializing database configuration...', { service: 'aaiti-backend' });
    await databaseConfig.initialize();
    logger.info('✅ Database configuration initialized', { type: databaseConfig.type, service: 'aaiti-backend' });

    if (databaseConfig.type === 'sqlite') {
      logger.info('💾 Initializing SQLite schema...', { service: 'aaiti-backend' });
      await initializeDatabase();
      logger.info('✅ SQLite schema initialized', { service: 'aaiti-backend' });
    } else {
      logger.info('📜 Running PostgreSQL migrations (Knex)', { service: 'aaiti-backend' });
      try {
        const knexConfig = require('./knexfile');
        const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
        const knex = require('knex')(knexConfig[env]);
        await knex.migrate.latest();
        await knex.destroy();
        logger.info('✅ PostgreSQL migrations applied successfully', { service: 'aaiti-backend' });
      } catch (e) {
        logger.error('❌ Failed to run PostgreSQL migrations', { error: e.message, service: 'aaiti-backend' });
        throw e;
      }
    }
    
    // Initialize Security & Compliance services
    logger.info('🔐 Initializing security and compliance services...', { service: 'aaiti-backend' });
    
    // Initialize data retention policies
    await dataRetentionService.initializePolicies();
    logger.info('✅ Data retention policies initialized', { service: 'aaiti-backend' });
    
    // Schedule automatic cleanup (runs every 24 hours)
    dataRetentionService.scheduleCleanup(24);
    logger.info('✅ Automatic data cleanup scheduled', { service: 'aaiti-backend' });
    
    // Clean up expired API keys on startup
    await apiKeyManager.cleanupExpiredKeys();
    logger.info('✅ Expired API keys cleaned up', { service: 'aaiti-backend' });
    
    logger.info('✅ Security and compliance services initialized', { service: 'aaiti-backend' });
    
    // Initialize middleware
    logger.info('⚙️ Setting up application middleware...', { service: 'aaiti-backend' });
    initializeMiddleware();
    logger.info('✅ Middleware initialized successfully', { service: 'aaiti-backend' });
    
    // Initialize Socket.IO
    logger.info('🔌 Initializing WebSocket server...', { service: 'aaiti-backend' });
  const io = initializeSocketIO();
  socketCtx = initializeSocketHandlers(io);
    logger.info('✅ Socket.IO initialized successfully', { service: 'aaiti-backend' });
    
    // Initialize GraphQL server
    logger.info('🔗 Initializing GraphQL server...', { service: 'aaiti-backend' });
    await createGraphQLServer(app);
    logger.info('✅ GraphQL server initialized successfully', { service: 'aaiti-backend' });
    
    logger.info('🌐 Starting HTTP server...', { 
      port: config.port,
      service: 'aaiti-backend'
    });
    
    server.listen(config.port, () => {
      const serverStartupTime = Date.now() - serverStartTime;
      
      // Update dashboard with initial status
      dashboard.updateStats({
        serverStatus: 'ONLINE',
        dbStatus: 'CONNECTED',
        marketDataStatus: 'ACTIVE'
      });
      
      // Start ASCII Dashboard
      dashboard.start();
      
      logger.info('🎉 AAITI Backend Server successfully started!', {
        port: config.port,
        environment: config.nodeEnv,
        frontendUrl: config.frontendUrl,
        startupTime: `${serverStartupTime}ms`,
        service: 'aaiti-backend'
      });
      
      logger.info('🔗 Server endpoints available:', {
        api: `http://localhost:${config.port}/api`,
        health: `http://localhost:${config.port}/api/health`,
        websocket: `ws://localhost:${config.port}`,
        frontend: config.frontendUrl,
        service: 'aaiti-backend'
      });
      
      logger.info('📊 Market data provider: CoinGecko (no API key required)', { 
        service: 'aaiti-backend'
      });
    });
    
  } catch (error) {
    logger.error('💥 Failed to start server', { 
      error: error.message,
      stack: error.stack,
      service: 'aaiti-backend'
    });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, initiating graceful shutdown...', { 
    service: 'aaiti-backend'
  });
  dashboard.stop();
  try { if (typeof socketCtx?.cleanup === 'function') socketCtx.cleanup(); } catch (e) {}
  server.close(() => {
    logger.info('✅ Server shut down gracefully', { service: 'aaiti-backend' });
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received, initiating graceful shutdown...', { 
    service: 'aaiti-backend'
  });
  dashboard.stop();
  server.close(() => {
    logger.info('✅ Server shut down gracefully', { service: 'aaiti-backend' });
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught exception detected', { 
    error: error.message,
    stack: error.stack,
    service: 'aaiti-backend'
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled promise rejection detected', { 
    reason,
    promise,
    service: 'aaiti-backend'
  });
  process.exit(1);
});

// Export configuration for other modules
module.exports = { app, config, getCredentials };

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

// Test environment auto-initialization (routes without listening)
if (process.env.NODE_ENV === 'test') {
  (async () => {
    try {
      await initializeConfig();
      await databaseConfig.initialize();
      initializeMiddleware();
    } catch (e) {
      // Keep silent in tests; individual endpoints may still work
    }
  })();
}