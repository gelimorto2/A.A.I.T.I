const axios = require('axios');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { getCredentials } = require('./credentials');
const { encrypt, decrypt } = require('./encryption');
const logger = require('./logger');

/**
 * OAuth2/OpenID Connect Service
 * Handles authentication with external providers
 */
class OAuthService {
  constructor() {
    this.providers = {
      google: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email', 'profile']
      },
      github: {
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scopes: ['user:email']
      }
    };
  }

  /**
   * Get OAuth configuration from credentials
   * @param {string} provider - OAuth provider name
   */
  getOAuthConfig(provider) {
    const credentials = getCredentials();
    const oauthConfig = credentials?.oauth?.[provider];
    
    if (!oauthConfig || !oauthConfig.clientId || !oauthConfig.clientSecret) {
      throw new Error(`OAuth configuration for ${provider} not found or incomplete`);
    }

    return oauthConfig;
  }

  /**
   * Generate OAuth authorization URL
   * @param {string} provider - OAuth provider (google, github)
   * @param {string} redirectUri - Redirect URI after authorization
   * @param {string} state - CSRF protection state parameter
   */
  getAuthorizationUrl(provider, redirectUri, state) {
    try {
      const providerConfig = this.providers[provider];
      if (!providerConfig) {
        throw new Error(`Unsupported OAuth provider: ${provider}`);
      }

      const oauthConfig = this.getOAuthConfig(provider);
      
      const params = new URLSearchParams({
        client_id: oauthConfig.clientId,
        redirect_uri: redirectUri,
        scope: providerConfig.scopes.join(' '),
        response_type: 'code',
        state: state
      });

      return `${providerConfig.authUrl}?${params.toString()}`;
    } catch (error) {
      logger.error(`Error generating ${provider} authorization URL:`, error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   * @param {string} provider - OAuth provider
   * @param {string} code - Authorization code
   * @param {string} redirectUri - Redirect URI
   */
  async exchangeCodeForToken(provider, code, redirectUri) {
    try {
      const providerConfig = this.providers[provider];
      const oauthConfig = this.getOAuthConfig(provider);

      const tokenData = {
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      };

      const response = await axios.post(providerConfig.tokenUrl, tokenData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      logger.error(`Error exchanging code for token with ${provider}:`, error);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Get user information from OAuth provider
   * @param {string} provider - OAuth provider
   * @param {string} accessToken - Access token
   */
  async getUserInfo(provider, accessToken) {
    try {
      const providerConfig = this.providers[provider];
      
      const response = await axios.get(providerConfig.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      // Normalize user data across providers
      const userData = response.data;
      let normalizedData = {};

      if (provider === 'google') {
        normalizedData = {
          id: userData.id,
          email: userData.email,
          username: userData.email.split('@')[0],
          name: userData.name,
          picture: userData.picture,
          verified_email: userData.verified_email
        };
      } else if (provider === 'github') {
        // Get email separately for GitHub (emails might be private)
        let email = userData.email;
        if (!email) {
          try {
            const emailResponse = await axios.get('https://api.github.com/user/emails', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
              }
            });
            const primaryEmail = emailResponse.data.find(e => e.primary);
            email = primaryEmail ? primaryEmail.email : null;
          } catch (emailError) {
            logger.warn('Could not fetch GitHub user email:', emailError);
          }
        }

        normalizedData = {
          id: userData.id.toString(),
          email: email,
          username: userData.login,
          name: userData.name,
          picture: userData.avatar_url,
          verified_email: true // GitHub emails are considered verified
        };
      }

      return normalizedData;
    } catch (error) {
      logger.error(`Error getting user info from ${provider}:`, error);
      throw new Error('Failed to get user information');
    }
  }

  /**
   * Link OAuth provider to existing user or create new user
   * @param {string} provider - OAuth provider
   * @param {Object} userData - User data from OAuth provider
   * @param {Object} tokenData - Token data from OAuth
   */
  async linkOrCreateUser(provider, userData, tokenData) {
    try {
      // Check if OAuth account is already linked
      const existingOAuth = await this.getOAuthByProvider(provider, userData.id);
      
      if (existingOAuth) {
        // Update existing OAuth record
        await this.updateOAuthTokens(existingOAuth.id, tokenData);
        
        // Get user data
        const user = await this.getUserById(existingOAuth.user_id);
        return { user, isNewUser: false };
      }

      // Check if user exists by email
      const existingUser = await this.getUserByEmail(userData.email);
      
      if (existingUser) {
        // Link OAuth to existing user
        await this.createOAuthLink(existingUser.id, provider, userData, tokenData);
        return { user: existingUser, isNewUser: false };
      }

      // Create new user
      const newUser = await this.createUserFromOAuth(userData);
      await this.createOAuthLink(newUser.id, provider, userData, tokenData);
      
      return { user: newUser, isNewUser: true };
    } catch (error) {
      logger.error('Error linking or creating OAuth user:', error);
      throw error;
    }
  }

  /**
   * Create OAuth provider link
   */
  async createOAuthLink(userId, provider, userData, tokenData) {
    const encryptedAccessToken = encrypt(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null;
    
    const expiresAt = tokenData.expires_in ? 
      new Date(Date.now() + tokenData.expires_in * 1000) : null;

    const query = `
      INSERT INTO oauth_providers (
        id, user_id, provider, provider_user_id, provider_username, 
        provider_email, access_token, refresh_token, token_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.runQuery(query, [
      uuidv4(),
      userId,
      provider,
      userData.id,
      userData.username,
      userData.email,
      JSON.stringify(encryptedAccessToken),
      encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
      expiresAt
    ]);
  }

  /**
   * Update OAuth tokens
   */
  async updateOAuthTokens(oauthId, tokenData) {
    const encryptedAccessToken = encrypt(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null;
    
    const expiresAt = tokenData.expires_in ? 
      new Date(Date.now() + tokenData.expires_in * 1000) : null;

    const query = `
      UPDATE oauth_providers 
      SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.runQuery(query, [
      JSON.stringify(encryptedAccessToken),
      encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
      expiresAt,
      oauthId
    ]);
  }

  /**
   * Create user from OAuth data
   */
  async createUserFromOAuth(userData) {
    const bcrypt = require('bcryptjs');
    const userId = uuidv4();
    
    // Generate a random password (user can change it later)
    const randomPassword = require('crypto').randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    const query = `
      INSERT INTO users (id, username, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.runQuery(query, [
      userId,
      userData.username,
      userData.email,
      passwordHash,
      'trader', // Default role
      1
    ]);

    return {
      id: userId,
      username: userData.username,
      email: userData.email,
      role: 'trader',
      is_active: 1
    };
  }

  // Helper database methods
  async getOAuthByProvider(provider, providerUserId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM oauth_providers WHERE provider = ? AND provider_user_id = ?',
        [provider, providerUserId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getUserById(userId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
}

// Singleton instance
const oauthService = new OAuthService();

module.exports = oauthService;