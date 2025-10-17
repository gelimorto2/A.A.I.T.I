/**
 * HMAC Signing Service
 * Provides HMAC-based request signing with nonce tracking and timestamp validation
 * to prevent replay attacks on trade-critical endpoints
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * HMAC Signing Service
 * Implements replay attack prevention through:
 * - HMAC-SHA256 signatures
 * - Nonce tracking (prevents duplicate requests)
 * - Timestamp validation (5-minute window)
 */
class HMACSigningService {
  constructor() {
    // Nonce store: Map of nonce -> expiry timestamp
    this.nonceStore = new Map();
    
    // Timestamp window (5 minutes in milliseconds)
    this.timestampWindow = 5 * 60 * 1000;
    
    // Cleanup interval (every 10 minutes)
    this.cleanupInterval = 10 * 60 * 1000;
    
    // Start cleanup timer
    this.startCleanup();
    
    logger.info('HMAC Signing Service initialized');
  }

  /**
   * Generate HMAC signature for request
   * @param {Object} params - Request parameters
   * @param {string} params.method - HTTP method (GET, POST, etc.)
   * @param {string} params.path - Request path
   * @param {Object} params.body - Request body
   * @param {string} params.timestamp - ISO timestamp
   * @param {string} params.nonce - Unique nonce
   * @param {string} secret - API secret key
   * @returns {string} HMAC signature
   */
  generateSignature(params, secret) {
    const { method, path, body, timestamp, nonce } = params;

    // Validate required parameters
    if (!method || !path || !timestamp || !nonce) {
      throw new Error('Missing required parameters for signature generation');
    }

    if (!secret) {
      throw new Error('Secret key is required');
    }

    // Create canonical request string
    const canonicalString = this.createCanonicalString(params);

    // Generate HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(canonicalString);
    const signature = hmac.digest('hex');

    logger.debug('Generated HMAC signature', { method, path, nonce });

    return signature;
  }

  /**
   * Verify HMAC signature for request
   * @param {Object} params - Request parameters
   * @param {string} params.method - HTTP method
   * @param {string} params.path - Request path
   * @param {Object} params.body - Request body
   * @param {string} params.timestamp - ISO timestamp
   * @param {string} params.nonce - Unique nonce
   * @param {string} params.signature - HMAC signature to verify
   * @param {string} secret - API secret key
   * @returns {Object} Verification result
   */
  verifySignature(params, secret) {
    const { method, path, body, timestamp, nonce, signature } = params;

    try {
      // Validate required parameters
      if (!signature) {
        return {
          valid: false,
          error: 'Missing signature',
          code: 'MISSING_SIGNATURE'
        };
      }

      // Validate timestamp
      const timestampValidation = this.validateTimestamp(timestamp);
      if (!timestampValidation.valid) {
        return timestampValidation;
      }

      // Validate nonce
      const nonceValidation = this.validateNonce(nonce);
      if (!nonceValidation.valid) {
        return nonceValidation;
      }

      // Generate expected signature
      const expectedSignature = this.generateSignature(
        { method, path, body, timestamp, nonce },
        secret
      );

      // Compare signatures using constant-time comparison
      const isValid = this.constantTimeCompare(signature, expectedSignature);

      if (isValid) {
        // Mark nonce as used
        this.markNonceUsed(nonce, timestamp);

        logger.info('HMAC signature verified successfully', { method, path, nonce });

        return {
          valid: true,
          message: 'Signature verified successfully'
        };
      } else {
        logger.warn('HMAC signature verification failed', { method, path, nonce });

        return {
          valid: false,
          error: 'Invalid signature',
          code: 'INVALID_SIGNATURE'
        };
      }
    } catch (error) {
      logger.error('Error verifying HMAC signature', { error: error.message });

      return {
        valid: false,
        error: 'Signature verification failed',
        code: 'VERIFICATION_ERROR',
        details: error.message
      };
    }
  }

  /**
   * Create canonical request string for signing
   * @param {Object} params - Request parameters
   * @returns {string} Canonical string
   */
  createCanonicalString(params) {
    const { method, path, body, timestamp, nonce } = params;

    // Convert body to canonical JSON string (sorted keys)
    const bodyString = body ? this.canonicalizeJSON(body) : '';

    // Create canonical string
    // Format: METHOD\nPATH\nTIMESTAMP\nNONCE\nBODY
    return `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyString}`;
  }

  /**
   * Canonicalize JSON object (sort keys recursively)
   * @param {Object} obj - JSON object
   * @returns {string} Canonical JSON string
   */
  canonicalizeJSON(obj) {
    if (obj === null || obj === undefined) {
      return '';
    }

    if (typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return JSON.stringify(obj.map(item => 
        typeof item === 'object' ? this.canonicalizeJSON(item) : item
      ));
    }

    // Sort object keys
    const sortedKeys = Object.keys(obj).sort();
    const sortedObj = {};

    for (const key of sortedKeys) {
      const value = obj[key];
      sortedObj[key] = typeof value === 'object' && value !== null
        ? this.canonicalizeJSON(value)
        : value;
    }

    return JSON.stringify(sortedObj);
  }

  /**
   * Validate timestamp is within acceptable window
   * @param {string} timestamp - ISO timestamp
   * @returns {Object} Validation result
   */
  validateTimestamp(timestamp) {
    if (!timestamp) {
      return {
        valid: false,
        error: 'Missing timestamp',
        code: 'MISSING_TIMESTAMP'
      };
    }

    const requestTime = new Date(timestamp).getTime();
    const currentTime = Date.now();

    // Check if timestamp is valid
    if (isNaN(requestTime)) {
      return {
        valid: false,
        error: 'Invalid timestamp format',
        code: 'INVALID_TIMESTAMP'
      };
    }

    // Check if timestamp is too old
    if (currentTime - requestTime > this.timestampWindow) {
      return {
        valid: false,
        error: 'Timestamp too old',
        code: 'TIMESTAMP_EXPIRED',
        window: this.timestampWindow / 1000 // seconds
      };
    }

    // Check if timestamp is in the future (with 1 minute tolerance)
    if (requestTime - currentTime > 60 * 1000) {
      return {
        valid: false,
        error: 'Timestamp in future',
        code: 'TIMESTAMP_FUTURE'
      };
    }

    return { valid: true };
  }

  /**
   * Validate nonce has not been used before
   * @param {string} nonce - Unique nonce
   * @returns {Object} Validation result
   */
  validateNonce(nonce) {
    if (!nonce) {
      return {
        valid: false,
        error: 'Missing nonce',
        code: 'MISSING_NONCE'
      };
    }

    // Check if nonce has been used
    if (this.nonceStore.has(nonce)) {
      logger.warn('Replay attack detected: nonce already used', { nonce });

      return {
        valid: false,
        error: 'Nonce already used',
        code: 'NONCE_REUSED'
      };
    }

    return { valid: true };
  }

  /**
   * Mark nonce as used
   * @param {string} nonce - Nonce to mark
   * @param {string} timestamp - Request timestamp
   */
  markNonceUsed(nonce, timestamp) {
    const requestTime = new Date(timestamp).getTime();
    const expiryTime = requestTime + this.timestampWindow;

    this.nonceStore.set(nonce, expiryTime);

    logger.debug('Nonce marked as used', { nonce, expiryTime: new Date(expiryTime) });
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} True if strings are equal
   */
  constantTimeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate random nonce
   * @param {number} length - Nonce length in bytes (default: 32)
   * @returns {string} Random nonce (hex encoded)
   */
  generateNonce(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Clean up expired nonces
   */
  cleanup() {
    const currentTime = Date.now();
    let cleanedCount = 0;

    for (const [nonce, expiryTime] of this.nonceStore.entries()) {
      if (expiryTime < currentTime) {
        this.nonceStore.delete(nonce);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired nonces`);
    }
  }

  /**
   * Start periodic cleanup of expired nonces
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    // Don't prevent Node.js from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get statistics about nonce store
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      activeNonces: this.nonceStore.size,
      timestampWindow: this.timestampWindow / 1000, // seconds
      cleanupInterval: this.cleanupInterval / 1000 // seconds
    };
  }

  /**
   * Clear all nonces (for testing)
   */
  clear() {
    this.nonceStore.clear();
    logger.debug('Nonce store cleared');
  }
}

// Singleton instance
let instance = null;

/**
 * Get HMAC signing service instance
 * @returns {HMACSigningService} Service instance
 */
function getInstance() {
  if (!instance) {
    instance = new HMACSigningService();
  }
  return instance;
}

module.exports = {
  getInstance,
  HMACSigningService
};
