const express = require('express');
const router = express.Router();
const { getCredentials, storeCredentials } = require('../utils/credentials');
const { db } = require('../database/init');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// Check setup status
router.get('/status', async (req, res) => {
  try {
    const credentials = getCredentials();
    const hasSystemConfig = credentials?.system?.port;
    // Determine admin/user existence from users table to avoid stale credentials file reliance
    db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
      let userCount = 0;
      if (!err && row) userCount = row.count;
      const hasAnyUser = userCount > 0;
      const setupComplete = hasAnyUser; // Core requirement: at least one user (first becomes admin via auto-promotion logic)
      res.json({
        setupComplete,
        hasUsers: hasAnyUser,
        userCount,
        hasSystemConfig: !!hasSystemConfig,
        version: '2.1.0'
      });
    });
  } catch (error) {
    logger.error('Error checking setup status:', error);
    res.json({
      setupComplete: false,
      hasUsers: false,
      userCount: 0,
      hasSystemConfig: false,
      version: '2.1.0'
    });
  }
});

// Complete initial setup
router.post('/complete', async (req, res) => {
  try {
    const { admin, trading, security } = req.body;

    if (!admin?.username || !admin?.email || !admin?.password) {
      return res.status(400).json({
        error: 'Admin account information is required'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(admin.password, 10);

    // Prepare configuration
    const config = {
      admin: {
        username: admin.username,
        email: admin.email,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      },
      system: {
        port: process.env.PORT || 5000,
        frontendUrl: process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 5000}`,
        nodeEnv: process.env.NODE_ENV || 'production',
        setupComplete: true,
        setupTimestamp: new Date().toISOString()
      },
      trading: {
        defaultExchange: trading?.defaultExchange || 'binance',
        riskLevel: trading?.riskLevel || 'medium',
        autoTrading: trading?.autoTrading || false,
        paperTrading: trading?.paperTrading !== false, // Default to true
        defaultSettings: {
          maxTradeAmount: 100,
          stopLossPercentage: 5,
          takeProfitPercentage: 10
        }
      },
      security: {
        jwtSecret: require('crypto').randomBytes(64).toString('hex'),
        jwtExpiresIn: '7d',
        twoFactor: security?.twoFactor || false,
        sessionTimeout: security?.sessionTimeout || 24,
        apiAccess: security?.apiAccess !== false, // Default to true
        maxLoginAttempts: 5,
        lockoutDuration: 15 // minutes
      }
    };

  // Save configuration (non-blocking baseline); but final authority for setupComplete now is presence of at least one user
  await storeCredentials(config);

    logger.info('Initial setup completed', {
      admin: admin.username,
      email: admin.email,
      trading: trading,
      security: {
        ...security,
        twoFactor: config.security.twoFactor,
        apiAccess: config.security.apiAccess
      }
    });

    res.json({
      success: true,
      message: 'Setup completed successfully',
      admin: {
        username: admin.username,
        email: admin.email
      }
    });

  } catch (error) {
    logger.error('Error completing setup:', error);
    res.status(500).json({
      error: 'Failed to complete setup',
      details: error.message
    });
  }
});

// Reset setup (for development/testing)
router.post('/reset', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Setup reset not allowed in production'
      });
    }

    // Clear credentials
    await storeCredentials({});
    
    logger.info('Setup reset completed');
    
    res.json({
      success: true,
      message: 'Setup reset successfully'
    });

  } catch (error) {
    logger.error('Error resetting setup:', error);
    res.status(500).json({
      error: 'Failed to reset setup',
      details: error.message
    });
  }
});

module.exports = router;
