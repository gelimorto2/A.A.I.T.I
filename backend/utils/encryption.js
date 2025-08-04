const crypto = require('crypto');
const { getCredentials } = require('./credentials');
const logger = require('./logger');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // For GCM, this is 12 bytes
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from credentials or generate one
 */
const getEncryptionKey = () => {
  const credentials = getCredentials();
  const encryptionKey = credentials?.security?.encryptionKey || process.env.ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    logger.warn('No encryption key found in credentials. Using fallback key generation.');
    // In production, this should be set in credentials
    return crypto.scryptSync('fallback-encryption-key', 'salt', KEY_LENGTH);
  }
  
  return Buffer.from(encryptionKey, 'hex');
};

/**
 * Encrypt sensitive data using AES-256-CBC
 * @param {string} text - Text to encrypt
 * @returns {object} - Encrypted data with IV and encrypted text
 */
const encrypt = (text) => {
  try {
    if (!text) {
      throw new Error('Text to encrypt cannot be empty');
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // 128-bit IV for AES
    
    const cipher = crypto.createCipher('aes256', key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      iv: iv.toString('hex'),
      encrypted: encrypted
    };
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt sensitive data
 * @param {object} encryptedData - Object containing encrypted text
 * @returns {string} - Decrypted text
 */
const decrypt = (encryptedData) => {
  try {
    if (!encryptedData || !encryptedData.encrypted) {
      throw new Error('Invalid encrypted data provided');
    }

    const { encrypted } = encryptedData;
    const key = getEncryptionKey();

    const decipher = crypto.createDecipher('aes256', key);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Generate a secure random API key
 * @param {number} length - Length of the API key (default: 32)
 * @returns {string} - Generated API key
 */
const generateApiKey = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a secure hash for API key verification
 * @param {string} apiKey - API key to hash
 * @param {string} salt - Salt for hashing (optional)
 * @returns {object} - Hash and salt
 */
const hashApiKey = (apiKey, salt = null) => {
  try {
    const actualSalt = salt || crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hash = crypto.scryptSync(apiKey, actualSalt, KEY_LENGTH).toString('hex');
    
    return {
      hash,
      salt: actualSalt
    };
  } catch (error) {
    logger.error('API key hashing error:', error);
    throw new Error('Failed to hash API key');
  }
};

/**
 * Verify API key against hash
 * @param {string} apiKey - API key to verify
 * @param {string} hash - Stored hash
 * @param {string} salt - Salt used for hashing
 * @returns {boolean} - True if API key is valid
 */
const verifyApiKey = (apiKey, hash, salt) => {
  try {
    const derivedHash = crypto.scryptSync(apiKey, salt, KEY_LENGTH).toString('hex');
    return derivedHash === hash;
  } catch (error) {
    logger.error('API key verification error:', error);
    return false;
  }
};

/**
 * Generate a secure random string for various security purposes
 * @param {number} length - Length of the random string
 * @returns {string} - Random string
 */
const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

module.exports = {
  encrypt,
  decrypt,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  generateSecureRandom
};