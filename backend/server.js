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

const { initializeDatabase } = require('./database/init');
const { authenticateSocket } = require('./middleware/auth');
const { initializeUserCredentials, getCredentials } = require('./utils/credentials');
const marketDataService = require('./utils/marketData');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Initialize credentials and get configuration
let config = {};

const initializeConfig = async () => {
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
  
  return config;
};

// Configure CORS for Socket.IO
const initializeSocketIO = () => {
  return socketIo(server, {
    cors: {
      origin: config.frontendUrl,
      methods: ["GET", "POST"],
      credentials: true
    }
  });
};

// Initialize app middleware
const initializeMiddleware = () => {
  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use(limiter);

  // Logging
  app.use(morgan('combined'));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/bots', botRoutes);
  app.use('/api/trading', tradingRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/ml', mlRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      config: {
        nodeEnv: config.nodeEnv,
        version: '1.0.0'
      }
    });
  });
};

// Socket.IO connection handling and real-time data
const initializeSocketHandlers = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    logger.info(`User ${socket.userId} connected`);
    
    // Join user-specific room for personalized updates
    socket.join(`user_${socket.userId}`);
    
    // Join bot rooms user has access to
    // This will be populated based on user permissions
    
    socket.on('subscribe_to_bot', (botId) => {
      // Verify user has access to this bot
      socket.join(`bot_${botId}`);
      logger.info(`User ${socket.userId} subscribed to bot ${botId}`);
    });
    
    socket.on('unsubscribe_from_bot', (botId) => {
      socket.leave(`bot_${botId}`);
      logger.info(`User ${socket.userId} unsubscribed from bot ${botId}`);
    });
    
    socket.on('disconnect', () => {
      logger.info(`User ${socket.userId} disconnected`);
    });
  });

  // Global real-time data broadcaster
  const broadcastData = async () => {
    try {
      // Get popular symbols and broadcast their prices
      const symbols = marketDataService.getPopularSymbols().slice(0, 5); // Limit to 5 to avoid API rate limits
      const quotes = await marketDataService.getMultipleQuotes(symbols);
      
      // Broadcast to all connected users
      io.emit('market_data_update', {
        timestamp: new Date().toISOString(),
        quotes: quotes.filter(q => q.success).map(q => q.data)
      });
      
      // Broadcast system health
      io.emit('system_health', {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        connectedUsers: io.engine.clientsCount
      });
    } catch (error) {
      logger.error('Error broadcasting data:', error);
    }
  };

  // Start real-time data broadcasting
  setInterval(broadcastData, 5000); // Every 5 seconds
  
  return io;
};

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize configuration first
    await initializeConfig();
    logger.info('Configuration initialized successfully');
    
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    // Initialize middleware
    initializeMiddleware();
    logger.info('Middleware initialized successfully');
    
    // Initialize Socket.IO
    const io = initializeSocketIO();
    initializeSocketHandlers(io);
    logger.info('Socket.IO initialized successfully');
    
    server.listen(config.port, () => {
      logger.info(`AAITI Backend Server running on port ${config.port}`);
      logger.info(`Frontend URL: ${config.frontendUrl}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

// Export configuration for other modules
module.exports = { app, config, getCredentials };

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}