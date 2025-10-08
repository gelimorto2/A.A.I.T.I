const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * HMAC Authentication Middleware
 * Provides HMAC-SHA256 signing for critical trading endpoints
 * Implements nonce/timestamp validation to prevent replay attacks
 */
class HMACMiddleware {
  constructor(options = {}) {
    this.algorithm = options.algorithm || 'sha256';
    this.timestampWindow = options.timestampWindow || 300000; // 5 minutes in milliseconds
    this.nonceStore = new Map(); // In production, use Redis
    this.nonceCleanupInterval = options.nonceCleanupInterval || 600000; // 10 minutes
    
    // Start nonce cleanup process
    this.startNonceCleanup();
    
    logger.info('HMAC middleware initialized', {
      algorithm: this.algorithm,
      timestampWindow: this.timestampWindow
    });
  }

  /**
   * Generate HMAC signature for request
   */
  generateSignature(secret, method, path, body, timestamp, nonce) {
    try {
      // Create string to sign: METHOD|PATH|BODY|TIMESTAMP|NONCE
      const bodyString = typeof body === 'object' ? JSON.stringify(body) : (body || '');
      const stringToSign = `${method.toUpperCase()}|${path}|${bodyString}|${timestamp}|${nonce}`;
      
      // Generate HMAC signature
      const hmac = crypto.createHmac(this.algorithm, secret);
      hmac.update(stringToSign);
      const signature = hmac.digest('hex');
      
      logger.debug('HMAC signature generated', {
        method,
        path,
        timestamp,
        nonce: nonce.substring(0, 8) + '...',
        stringLength: stringToSign.length
      });
      
      return signature;
      
    } catch (error) {
      logger.error('HMAC signature generation failed:', error);
      throw error;
    }
  }

  /**
   * Validate HMAC signature
   */
  validateSignature(secret, signature, method, path, body, timestamp, nonce) {
    try {
      const expectedSignature = this.generateSignature(secret, method, path, body, timestamp, nonce);
      
      // Use constant-time comparison to prevent timing attacks
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      
      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
      
    } catch (error) {
      logger.error('HMAC signature validation failed:', error);
      return false;
    }
  }

  /**
   * Validate timestamp window
   */
  validateTimestamp(timestamp) {
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    
    if (isNaN(requestTime)) {
      logger.warn('Invalid timestamp format', { timestamp });
      return false;
    }
    
    const timeDiff = Math.abs(now - requestTime);
    
    if (timeDiff > this.timestampWindow) {
      logger.warn('Request timestamp outside acceptable window', {
        timestamp: requestTime,
        now,
        timeDiff,
        window: this.timestampWindow
      });
      return false;
    }
    
    return true;
  }

  /**
   * Validate nonce (prevent replay attacks)
   */
  validateNonce(nonce, timestamp) {
    if (!nonce || nonce.length < 16) {
      logger.warn('Invalid nonce format', { nonce });
      return false;
    }
    
    // Check if nonce already used
    if (this.nonceStore.has(nonce)) {
      logger.warn('Nonce replay attack detected', { nonce });
      return false;
    }
    
    // Store nonce with timestamp
    this.nonceStore.set(nonce, parseInt(timestamp));
    
    logger.debug('Nonce validated and stored', { 
      nonce: nonce.substring(0, 8) + '...',
      timestamp 
    });
    
    return true;
  }

  /**
   * Get user's HMAC secret key
   */
  async getUserHMACSecret(userId) {
    try {
      // In production, retrieve from secure database
      // For now, generate a deterministic secret based on user ID
      const baseSecret = process.env.HMAC_BASE_SECRET || 'fallback-hmac-secret';
      const userSecret = crypto.createHash('sha256')
        .update(`${baseSecret}:${userId}`)
        .digest('hex');
      
      return userSecret;
      
    } catch (error) {
      logger.error('Failed to get user HMAC secret:', error);
      throw new Error('Unable to retrieve HMAC secret');
    }
  }

  /**
   * Express middleware for HMAC authentication
   */
  authenticate() {
    return async (req, res, next) => {
      try {
        // Check if HMAC is required for this endpoint
        if (!this.isHMACRequired(req.path)) {
          return next();
        }

        // Extract HMAC headers
        const signature = req.headers['x-hmac-signature'];
        const timestamp = req.headers['x-hmac-timestamp'];
        const nonce = req.headers['x-hmac-nonce'];
        const userId = req.headers['x-user-id'] || req.user?.id;

        if (!signature || !timestamp || !nonce || !userId) {
          logger.warn('Missing HMAC headers', {
            signature: !!signature,
            timestamp: !!timestamp,
            nonce: !!nonce,
            userId: !!userId,
            path: req.path,
            method: req.method,
            ip: req.ip
          });
          
          return res.status(401).json({
            success: false,
            error: 'HMAC authentication required',
            message: 'Missing required HMAC headers'
          });
        }

        // Validate timestamp
        if (!this.validateTimestamp(timestamp)) {
          return res.status(401).json({
            success: false,
            error: 'HMAC authentication failed',
            message: 'Invalid or expired timestamp'
          });
        }

        // Validate nonce
        if (!this.validateNonce(nonce, timestamp)) {
          return res.status(401).json({
            success: false,
            error: 'HMAC authentication failed',
            message: 'Invalid or replayed nonce'
          });
        }

        // Get user's HMAC secret
        const secret = await this.getUserHMACSecret(userId);

        // Validate signature
        const isValidSignature = this.validateSignature(
          secret,
          signature,
          req.method,
          req.path,
          req.body,
          timestamp,
          nonce
        );

        if (!isValidSignature) {
          logger.warn('HMAC signature validation failed', {
            userId,
            method: req.method,
            path: req.path,
            timestamp,
            nonce: nonce.substring(0, 8) + '...',
            ip: req.ip
          });

          return res.status(401).json({
            success: false,
            error: 'HMAC authentication failed',
            message: 'Invalid signature'
          });
        }

        logger.info('HMAC authentication successful', {
          userId,
          method: req.method,
          path: req.path,
          timestamp
        });

        // Add HMAC info to request
        req.hmac = {
          userId,
          timestamp: parseInt(timestamp),
          nonce,
          authenticated: true
        };

        next();

      } catch (error) {
        logger.error('HMAC authentication error:', error);
        res.status(500).json({
          success: false,
          error: 'HMAC authentication error',
          message: 'Internal authentication error'
        });
      }
    };
  }

  /**
   * Check if HMAC is required for endpoint
   */
  isHMACRequired(path) {
    const protectedPaths = [
      '/api/trading',
      '/api/strategies',
      '/api/ml-models'
    ];
    
    return protectedPaths.some(protectedPath => 
      path.startsWith(protectedPath)
    );
  }

  /**
   * Generate secure random nonce
   */
  generateNonce(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create signature for client use
   */
  createClientSignature(secret, method, path, body = null, timestamp = null, nonce = null) {
    const requestTimestamp = timestamp || Date.now().toString();
    const requestNonce = nonce || this.generateNonce();
    
    const signature = this.generateSignature(secret, method, path, body, requestTimestamp, requestNonce);
    
    return {
      signature,
      timestamp: requestTimestamp,
      nonce: requestNonce,
      headers: {
        'X-HMAC-Signature': signature,
        'X-HMAC-Timestamp': requestTimestamp,
        'X-HMAC-Nonce': requestNonce
      }
    };
  }

  /**
   * Start periodic nonce cleanup
   */
  startNonceCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [nonce, timestamp] of this.nonceStore.entries()) {
        if (now - timestamp > this.timestampWindow) {
          this.nonceStore.delete(nonce);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.debug(`Cleaned up ${cleanedCount} expired nonces`);
      }
      
    }, this.nonceCleanupInterval);
  }

  /**
   * Get HMAC middleware statistics
   */
  getStats() {
    return {
      activeNonces: this.nonceStore.size,
      algorithm: this.algorithm,
      timestampWindow: this.timestampWindow,
      nonceCleanupInterval: this.nonceCleanupInterval
    };
  }
}

// Create singleton instance
const hmacMiddleware = new HMACMiddleware({
  algorithm: 'sha256',
  timestampWindow: 300000, // 5 minutes
  nonceCleanupInterval: 600000 // 10 minutes
});

// Add middleware method and aliases
hmacMiddleware.middleware = hmacMiddleware.authenticate.bind(hmacMiddleware);
hmacMiddleware.createSignature = hmacMiddleware.generateSignature.bind(hmacMiddleware);
hmacMiddleware.validateSignature = hmacMiddleware.validateSignature.bind(hmacMiddleware);

module.exports = {
  HMACMiddleware,
  hmac: hmacMiddleware,
  hmacAuth: () => hmacMiddleware.authenticate()
};