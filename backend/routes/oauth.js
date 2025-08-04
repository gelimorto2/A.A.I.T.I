const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, logSecurityEvent } = require('../middleware/auth');
const oauthService = require('../utils/oauthService');
const { getCredentials } = require('../utils/credentials');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function to get JWT configuration
const getJwtConfig = () => {
  const credentials = getCredentials();
  return {
    secret: credentials?.security?.jwtSecret || process.env.JWT_SECRET || 'fallback-secret',
    expiresIn: credentials?.system?.jwtExpiresIn || process.env.JWT_EXPIRES_IN || '7d'
  };
};

/**
 * Get OAuth authorization URL
 * GET /api/oauth/:provider/authorize
 */
router.get('/:provider/authorize', (req, res) => {
  try {
    const { provider } = req.params;
    const { redirect_uri } = req.query;

    if (!redirect_uri) {
      return res.status(400).json({ error: 'redirect_uri parameter is required' });
    }

    // Generate state parameter for CSRF protection
    const state = uuidv4();
    
    // Store state in session or cache (for simplicity, we'll include it in the response)
    // In production, you'd want to store this server-side
    const authUrl = oauthService.getAuthorizationUrl(provider, redirect_uri, state);

    res.json({
      authUrl,
      state,
      message: `Authorization URL generated for ${provider}`
    });
  } catch (error) {
    logger.error(`OAuth authorization URL error for ${req.params.provider}:`, error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Handle OAuth callback
 * POST /api/oauth/:provider/callback
 */
router.post('/:provider/callback', 
  logSecurityEvent('oauth_login_attempt', 'info', 'OAuth login attempt'),
  async (req, res) => {
    try {
      const { provider } = req.params;
      const { code, state, redirect_uri } = req.body;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      if (!redirect_uri) {
        return res.status(400).json({ error: 'redirect_uri is required' });
      }

      // Exchange code for tokens
      const tokenData = await oauthService.exchangeCodeForToken(provider, code, redirect_uri);
      
      // Get user information
      const userData = await oauthService.getUserInfo(provider, tokenData.access_token);

      if (!userData.email) {
        return res.status(400).json({ 
          error: 'Email address is required but not provided by the OAuth provider' 
        });
      }

      // Link or create user
      const { user, isNewUser } = await oauthService.linkOrCreateUser(provider, userData, tokenData);

      // Generate JWT token
      const jwtConfig = getJwtConfig();
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      // Log successful OAuth login
      logger.info(`OAuth login successful: ${user.username} via ${provider}`);

      res.json({
        message: `Login successful via ${provider}`,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        isNewUser,
        provider
      });
    } catch (error) {
      logger.error(`OAuth callback error for ${req.params.provider}:`, error);
      
      // Log failed OAuth attempt
      logger.warn(`OAuth login failed for ${req.params.provider}: ${error.message}`);
      
      res.status(400).json({ 
        error: 'OAuth authentication failed',
        details: error.message 
      });
    }
  }
);

/**
 * Get linked OAuth providers for current user
 * GET /api/oauth/linked
 */
router.get('/linked', authenticateToken, async (req, res) => {
  try {
    const { db } = require('../database/init');
    
    const linkedProviders = await new Promise((resolve, reject) => {
      db.all(
        `SELECT provider, provider_username, provider_email, created_at 
         FROM oauth_providers 
         WHERE user_id = ?`,
        [req.user.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      message: 'Linked OAuth providers retrieved successfully',
      linkedProviders
    });
  } catch (error) {
    logger.error('Error getting linked OAuth providers:', error);
    res.status(500).json({ error: 'Failed to retrieve linked providers' });
  }
});

/**
 * Unlink OAuth provider
 * DELETE /api/oauth/:provider/unlink
 */
router.delete('/:provider/unlink', 
  authenticateToken,
  logSecurityEvent('oauth_provider_unlinked', 'info', 'OAuth provider unlinked'),
  async (req, res) => {
    try {
      const { provider } = req.params;
      const { db } = require('../database/init');

      const result = await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM oauth_providers WHERE user_id = ? AND provider = ?',
          [req.user.id, provider],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });

      if (result.changes === 0) {
        return res.status(404).json({ error: `${provider} provider not linked to your account` });
      }

      logger.info(`OAuth provider unlinked: ${provider} for user ${req.user.username}`);

      res.json({
        message: `${provider} provider unlinked successfully`
      });
    } catch (error) {
      logger.error(`Error unlinking OAuth provider ${req.params.provider}:`, error);
      res.status(500).json({ error: 'Failed to unlink OAuth provider' });
    }
  }
);

/**
 * Get available OAuth providers and their configuration status
 * GET /api/oauth/providers
 */
router.get('/providers', (req, res) => {
  try {
    const credentials = getCredentials();
    const providers = {};

    // Check which providers are configured
    ['google', 'github'].forEach(provider => {
      const config = credentials?.oauth?.[provider];
      providers[provider] = {
        available: !!(config && config.clientId && config.clientSecret),
        scopes: oauthService.providers[provider]?.scopes || []
      };
    });

    res.json({
      message: 'Available OAuth providers',
      providers
    });
  } catch (error) {
    logger.error('Error getting OAuth providers:', error);
    res.status(500).json({ error: 'Failed to get OAuth providers' });
  }
});

module.exports = router;