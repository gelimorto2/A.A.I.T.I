/**
 * HMAC Signing Middleware
 * Express middleware for HMAC signature verification
 */

const { getInstance } = require('../services/hmacSigningService');
const logger = require('../utils/logger');

/**
 * Middleware to verify HMAC signature
 * Expects headers:
 * - X-Timestamp: ISO timestamp
 * - X-Nonce: Unique nonce
 * - X-Signature: HMAC signature
 * 
 * The signature should be generated from:
 * METHOD\nPATH\nTIMESTAMP\nNONCE\nBODY
 * 
 * @param {Object} options - Middleware options
 * @param {Function} options.getSecret - Function to get API secret for user
 * @returns {Function} Express middleware
 */
function verifyHMAC(options = {}) {
  const hmacService = getInstance();

  return async (req, res, next) => {
    try {
      // Extract signature components from headers
      const timestamp = req.headers['x-timestamp'];
      const nonce = req.headers['x-nonce'];
      const signature = req.headers['x-signature'];

      // Validate headers exist
      if (!timestamp || !nonce || !signature) {
        logger.warn('HMAC verification failed: missing headers', {
          path: req.path,
          hasTimestamp: !!timestamp,
          hasNonce: !!nonce,
          hasSignature: !!signature
        });

        return res.status(400).json({
          error: 'Missing required HMAC headers',
          code: 'MISSING_HMAC_HEADERS',
          required: ['X-Timestamp', 'X-Nonce', 'X-Signature']
        });
      }

      // Get API secret for user
      let secret;
      if (options.getSecret) {
        try {
          secret = await options.getSecret(req);
        } catch (error) {
          logger.error('Error getting API secret', { error: error.message });
          return res.status(500).json({
            error: 'Failed to retrieve API secret',
            code: 'SECRET_RETRIEVAL_ERROR'
          });
        }
      } else if (req.user && req.user.apiSecret) {
        secret = req.user.apiSecret;
      } else {
        logger.error('No API secret available for HMAC verification');
        return res.status(500).json({
          error: 'API secret not configured',
          code: 'SECRET_NOT_CONFIGURED'
        });
      }

      // Verify signature
      const verification = hmacService.verifySignature(
        {
          method: req.method,
          path: req.path,
          body: req.body,
          timestamp,
          nonce,
          signature
        },
        secret
      );

      if (!verification.valid) {
        logger.warn('HMAC signature verification failed', {
          path: req.path,
          method: req.method,
          error: verification.error,
          code: verification.code
        });

        return res.status(403).json({
          error: verification.error,
          code: verification.code,
          details: verification.details
        });
      }

      // Signature verified successfully
      next();
    } catch (error) {
      logger.error('HMAC middleware error', { error: error.message });
      return res.status(500).json({
        error: 'HMAC verification failed',
        code: 'HMAC_ERROR'
      });
    }
  };
}

/**
 * Middleware to require HMAC signature for trade-critical endpoints
 * Uses user's API secret from database
 */
function requireTradeSignature(req, res, next) {
  return verifyHMAC({
    getSecret: async (req) => {
      // Get API secret from database
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      // In production, retrieve from database
      // For now, use user's apiSecret property
      if (!req.user.apiSecret) {
        throw new Error('User API secret not configured');
      }

      return req.user.apiSecret;
    }
  })(req, res, next);
}

/**
 * Generate HMAC signature for client requests
 * Helper function for documentation/testing
 * 
 * @param {Object} params - Request parameters
 * @param {string} params.method - HTTP method
 * @param {string} params.path - Request path
 * @param {Object} params.body - Request body
 * @param {string} secret - API secret
 * @returns {Object} Signature headers
 */
function generateSignatureHeaders(params, secret) {
  const hmacService = getInstance();
  
  const timestamp = new Date().toISOString();
  const nonce = hmacService.generateNonce();

  const signature = hmacService.generateSignature(
    {
      method: params.method,
      path: params.path,
      body: params.body,
      timestamp,
      nonce
    },
    secret
  );

  return {
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': signature
  };
}

/**
 * Middleware to attach HMAC helper to request
 * Adds req.hmac with utility functions
 */
function attachHMACHelper(req, res, next) {
  const hmacService = getInstance();

  req.hmac = {
    generateNonce: () => hmacService.generateNonce(),
    generateSignature: (params, secret) => hmacService.generateSignature(params, secret),
    getStatistics: () => hmacService.getStatistics()
  };

  next();
}

module.exports = {
  verifyHMAC,
  requireTradeSignature,
  generateSignatureHeaders,
  attachHMACHelper
};
