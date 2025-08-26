const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const CREDENTIALS_FILE = path.join(__dirname, '..', 'config', 'credentials.enc');
const KEY_FILE = path.join(__dirname, '..', 'config', 'encryption.key');

// Ensure config directory exists
const configDir = path.dirname(CREDENTIALS_FILE);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

/**
 * Generate or load encryption key
 */
const getEncryptionKey = () => {
  try {
    if (fs.existsSync(KEY_FILE)) {
      return fs.readFileSync(KEY_FILE);
    } else {
      // Generate new key
      const key = crypto.randomBytes(32);
      fs.writeFileSync(KEY_FILE, key, { mode: 0o600 });
      logger.info('Generated new encryption key');
      return key;
    }
  } catch (error) {
    logger.error('Error handling encryption key:', error);
    throw error;
  }
};

/**
 * Encrypt data using AES-256-CBC
 */
const encrypt = (text) => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  } catch (error) {
    logger.error('Encryption error:', error);
    throw error;
  }
};

/**
 * Decrypt data using AES-256-CBC
 */
const decrypt = (encryptedData) => {
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw error;
  }
};

/**
 * Store encrypted credentials
 */
const storeCredentials = (credentials) => {
  try {
    const encryptedData = encrypt(JSON.stringify(credentials));
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(encryptedData), { mode: 0o600 });
    logger.info('Credentials stored securely');
  } catch (error) {
    logger.error('Error storing credentials:', error);
    throw error;
  }
};

/**
 * Load and decrypt credentials
 */
const loadCredentials = () => {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      logger.warn('Credentials file not found, returning default configuration');
      return null;
    }
    
    const encryptedData = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    const decryptedText = decrypt(encryptedData);
    return JSON.parse(decryptedText);
  } catch (error) {
    logger.error('Error loading credentials:', error);
    return null;
  }
};

/**
 * Initialize default credentials for the specified user
 */
const initializeUserCredentials = () => {
  const defaultCredentials = {
    user: {
      username: 'gelimorto',
      password: 'AAITI2025',
      role: 'admin'
    },
    general: {
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      autoRefresh: true,
      refreshInterval: 5,
      soundEnabled: true,
      notificationsEnabled: true
    },
    trading: {
      // Default trading settings
      defaultTradingMode: 'paper',
      maxConcurrentBots: 5,
      globalStopLoss: 10,
      globalTakeProfit: 20,
      riskManagementEnabled: true,
      emergencyStopEnabled: true,
      maxDailyLoss: 1000,
      positionSizing: 'fixed',
      slippageTolerance: 0.1,
      // API credentials
      alphaVantage: {
        apiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo'
      },
      binance: {
        apiKey: process.env.BINANCE_API_KEY || '',
        apiSecret: process.env.BINANCE_API_SECRET || '',
        sandbox: process.env.BINANCE_SANDBOX === 'true'
      }
    },
    security: {
      jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
      sessionTimeout: '7d',
      maxLoginAttempts: 5,
      twoFactorEnabled: false,
      loginAlerts: true,
      ipWhitelist: '',
      apiRateLimit: 100,
      encryptionEnabled: true
    },
    system: {
      port: parseInt(process.env.PORT) || 5000,
      nodeEnv: process.env.NODE_ENV || 'development',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      dbPath: process.env.DB_PATH || './database/aaiti.sqlite',
      logLevel: process.env.LOG_LEVEL || 'info',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    database: {
      encryption: true,
      backupEnabled: true
    }
  };
  
  // Only initialize if credentials don't exist
  if (!loadCredentials()) {
    storeCredentials(defaultCredentials);
    logger.info('Default credentials initialized for user: gelimorto');
  }
  
  return loadCredentials();
};

/**
 * Get specific credential category
 */
const getCredentials = (category = null) => {
  const credentials = loadCredentials();
  if (!credentials) {
    return null;
  }
  
  return category ? credentials[category] : credentials;
};

/**
 * Update specific credentials
 */
const updateCredentials = (category, data) => {
  const credentials = loadCredentials() || {};
  credentials[category] = { ...credentials[category], ...data };
  storeCredentials(credentials);
  logger.info(`Updated credentials for category: ${category}`);
};

module.exports = {
  storeCredentials,
  loadCredentials,
  getCredentials,
  updateCredentials,
  initializeUserCredentials,
  encrypt,
  decrypt,
  // Alias for backward compatibility
  setCredentials: storeCredentials
};