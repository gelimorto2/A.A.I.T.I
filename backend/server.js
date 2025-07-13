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

const { initializeDatabase } = require('./database/init');
const { authenticateSocket } = require('./middleware/auth');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO connection handling
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
const broadcastData = () => {
  // This will be called periodically to send real-time updates
  // Market data, bot status, PnL updates, etc.
};

// Initialize database and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    server.listen(PORT, () => {
      logger.info(`AAITI Backend Server running on port ${PORT}`);
    });
    
    // Start real-time data broadcasting
    setInterval(broadcastData, 1000); // Every second
    
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

module.exports = { app, io };

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}