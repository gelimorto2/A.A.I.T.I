const crypto = require('crypto');
const { getCredentials } = require('./credentials');
const logger = require('./logger');

// Encryption configuration (AES-256-GCM with per-message salt)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const SALT_LENGTH = 16; // salt for key derivation
const TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key

/**
 * Get master encryption key from credentials or environment.
 * Returns a Buffer of KEY_LENGTH bytes.
 */
const getEncryptionKey = () => {
  try {
    const credentials = getCredentials();
    const encryptionKeyHex = credentials?.security?.encryptionKey || process.env.ENCRYPTION_KEY;
    if (encryptionKeyHex && typeof encryptionKeyHex === 'string') {
      const buf = Buffer.from(encryptionKeyHex, 'hex');
      if (buf.length === KEY_LENGTH) return buf;
      // If provided but incorrect length, derive to correct length
      return crypto.scryptSync(encryptionKeyHex, 'aaiti-key-normalize', KEY_LENGTH);
    }
    logger.warn('No encryption key configured. Using derived fallback key (non-production).');
    return crypto.scryptSync('fallback-encryption-key', 'aaiti-fallback-salt', KEY_LENGTH);
  } catch (e) {
    logger.error('Error obtaining encryption key:', e);
    // ultimate fallback to constant-length buffer
    return crypto.scryptSync('fallback-encryption-key', 'aaiti-fallback-salt', KEY_LENGTH);
  }
};

/**
 * Encrypt sensitive data using AES-256-GCM with scrypt-derived key.
 * @param {string} text - UTF-8 text to encrypt
 * @returns {{iv:string,salt:string,tag:string,encrypted:string}}
 */
const encrypt = (text) => {
  try {
    if (typeof text !== 'string' || text.length === 0) {
      throw new Error('Text to encrypt cannot be empty');
    }

    const masterKey = getEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.scryptSync(masterKey, salt, KEY_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      tag: tag.toString('hex'),
      encrypted: ciphertext.toString('hex')
    };
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data produced by the encrypt() function above.
 * @param {{iv:string,salt:string,tag:string,encrypted:string}} encryptedData
 * @returns {string} Decrypted UTF-8 string
 */
const decrypt = (encryptedData) => {
  try {
    if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.salt || !encryptedData.tag) {
      throw new Error('Invalid encrypted data provided');
    }

    const iv = Buffer.from(encryptedData.iv, 'hex');
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    const ciphertext = Buffer.from(encryptedData.encrypted, 'hex');

    const masterKey = getEncryptionKey();
    const key = crypto.scryptSync(masterKey, salt, KEY_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
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