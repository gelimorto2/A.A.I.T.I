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
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const mlRoutes = require('./routes/ml');
const notificationRoutes = require('./routes/notifications');
const advancedPortfolioRoutes = require('./routes/advancedPortfolio');
const advancedTradingRoutes = require('./routes/advancedTrading');
const { router: metricsRoutes, collectRequestMetrics } = require('./routes/metrics');

const { initializeDatabase } = require('./database/init');
const { authenticateSocket } = require('./middleware/auth');
const { initializeUserCredentials, getCredentials } = require('./utils/credentials');
const marketDataService = require('./utils/marketData');
const logger = require('./utils/logger');
const ASCIIDashboard = require('./utils/asciiDashboard');

// Performance configuration
const performanceConfig = require('./config/performance');

const app = express();
const server = http.createServer(app);

// Apply performance configurations to server
server.maxConnections = performanceConfig.server.maxConnections;
server.keepAliveTimeout = performanceConfig.server.keepAliveTimeout;
server.headersTimeout = performanceConfig.server.headersTimeout;
server.requestTimeout = performanceConfig.server.requestTimeout;

// Initialize ASCII Dashboard
const dashboard = new ASCIIDashboard();

// Connect logger to dashboard
logger.setDashboard(dashboard);

// Initialize credentials and get configuration
let config = {};

const initializeConfig = async () => {
  logger.info('🔧 Initializing AAITI configuration...', { service: 'aaiti-backend' });
  
  await initializeUserCredentials();
  const credentials = getCredentials();
  
  // Merge default configuration with stored settings
  config = {
    port: credentials?.system?.port || process.env.PORT || 5000,
    nodeEnv: credentials?.system?.nodeEnv || process.env.NODE_ENV || 'development',
    frontendUrl: credentials?.system?.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000',
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
  
  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true
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
  app.use(morgan('combined'));

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

  logger.info('🛣️ Registering API routes...', { service: 'aaiti-backend' });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/bots', botRoutes);
  app.use('/api/trading', tradingRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/ml', mlRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/portfolio', advancedPortfolioRoutes);
  app.use('/api/advanced-trading', advancedTradingRoutes);
  
  // Metrics routes (for monitoring)
  app.use('/api', metricsRoutes);

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

  logger.info('✅ Middleware setup completed', { service: 'aaiti-backend' });
};

// Socket.IO connection handling and real-time data
const initializeSocketHandlers = (io) => {
  logger.info('🔌 Setting up WebSocket authentication...', { service: 'aaiti-backend' });
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
  setInterval(broadcastData, 5000); // Every 5 seconds
  
  logger.info('✅ WebSocket handlers initialized successfully', { service: 'aaiti-backend' });
  return io;
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
    
    // Initialize database
    logger.info('💾 Initializing database connection...', { service: 'aaiti-backend' });
    await initializeDatabase();
    logger.info('✅ Database initialized successfully', { service: 'aaiti-backend' });
    
    // Initialize middleware
    logger.info('⚙️ Setting up application middleware...', { service: 'aaiti-backend' });
    initializeMiddleware();
    logger.info('✅ Middleware initialized successfully', { service: 'aaiti-backend' });
    
    // Initialize Socket.IO
    logger.info('🔌 Initializing WebSocket server...', { service: 'aaiti-backend' });
    const io = initializeSocketIO();
    initializeSocketHandlers(io);
    logger.info('✅ Socket.IO initialized successfully', { service: 'aaiti-backend' });
    
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