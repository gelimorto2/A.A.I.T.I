const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const logger = require('./logger');
const { getCredentials } = require('./credentials');

/**
 * Enhanced Security Module
 * Implements JWT refresh token rotation, 2FA, and comprehensive audit logging
 * Part of TODO 1.1 Infrastructure Hardening implementation
 */

class EnhancedSecurity {
  constructor() {
    this.credentials = null;
    this.refreshTokens = new Map(); // In production, use Redis
    this.securityEvents = [];
    this.rateLimitMap = new Map();
    
    // Security configuration
    this.config = {
      jwt: {
        accessTokenExpiry: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        algorithm: 'HS256'
      },
      rateLimit: {
        maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        windowMs: parseInt(process.env.LOGIN_WINDOW_MS) || 900000, // 15 minutes
        blockDurationMs: parseInt(process.env.LOGIN_BLOCK_DURATION) || 3600000 // 1 hour
      },
      twoFA: {
        issuer: process.env.TWO_FA_ISSUER || 'AAITI',
        window: parseInt(process.env.TWO_FA_WINDOW) || 2
      }
    };
  }

  async initialize() {
    this.credentials = getCredentials();
    
    logger.info('🔐 Initializing enhanced security module', {
      features: ['JWT Refresh Rotation', '2FA Support', 'Enhanced Audit Logging', 'Rate Limiting'],
      service: 'enhanced-security'
    });

    // Start security event cleanup job
    this.startSecurityEventCleanup();
    
    return true;
  }

  /**
   * JWT Token Management with Refresh Rotation
   */
  generateTokenPair(userId, userInfo = {}) {
    const accessTokenPayload = {
      userId,
      type: 'access',
      ...userInfo,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID()
    };

    const refreshTokenPayload = {
      userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID()
    };

    const jwtSecret = this.credentials?.security?.jwtSecret || process.env.JWT_SECRET || 'fallback-secret';

    const accessToken = jwt.sign(accessTokenPayload, jwtSecret, {
      expiresIn: this.config.jwt.accessTokenExpiry,
      algorithm: this.config.jwt.algorithm
    });

    const refreshToken = jwt.sign(refreshTokenPayload, jwtSecret, {
      expiresIn: this.config.jwt.refreshTokenExpiry,
      algorithm: this.config.jwt.algorithm
    });

    // Store refresh token with metadata
    this.refreshTokens.set(refreshTokenPayload.jti, {
      userId,
      token: refreshToken,
      createdAt: new Date(),
      used: false,
      ipAddress: userInfo.ipAddress,
      userAgent: userInfo.userAgent
    });

    // Clean up old refresh tokens for this user
    this.cleanupUserRefreshTokens(userId);

    this.logSecurityEvent({
      userId,
      eventType: 'token_generated',
      description: 'New token pair generated',
      ipAddress: userInfo.ipAddress,
      userAgent: userInfo.userAgent,
      severity: 'info'
    });

    logger.debug('🔑 Token pair generated', {
      userId,
      accessTokenId: accessTokenPayload.jti,
      refreshTokenId: refreshTokenPayload.jti,
      service: 'enhanced-security'
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiry: this.config.jwt.accessTokenExpiry,
      refreshTokenExpiry: this.config.jwt.refreshTokenExpiry
    };
  }

  async refreshAccessToken(refreshToken, ipAddress, userAgent) {
    try {
      const jwtSecret = this.credentials?.security?.jwtSecret || process.env.JWT_SECRET || 'fallback-secret';
      const decoded = jwt.verify(refreshToken, jwtSecret);

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const storedTokenData = this.refreshTokens.get(decoded.jti);
      
      if (!storedTokenData || storedTokenData.used) {
        this.logSecurityEvent({
          userId: decoded.userId,
          eventType: 'token_refresh_failed',
          description: 'Refresh token reuse attempt detected',
          ipAddress,
          userAgent,
          severity: 'warning'
        });
        throw new Error('Invalid or used refresh token');
      }

      // Mark old refresh token as used
      storedTokenData.used = true;

      // Generate new token pair
      const newTokenPair = this.generateTokenPair(decoded.userId, {
        ipAddress,
        userAgent
      });

      this.logSecurityEvent({
        userId: decoded.userId,
        eventType: 'token_refreshed',
        description: 'Access token refreshed successfully',
        ipAddress,
        userAgent,
        severity: 'info'
      });

      return newTokenPair;

    } catch (error) {
      logger.warn('🚨 Refresh token validation failed', {
        error: error.message,
        ipAddress,
        userAgent,
        service: 'enhanced-security'
      });
      throw error;
    }
  }

  cleanupUserRefreshTokens(userId) {
    // Remove old refresh tokens for user (keep only last 3)
    const userTokens = Array.from(this.refreshTokens.entries())
      .filter(([_, data]) => data.userId === userId)
      .sort((a, b) => b[1].createdAt - a[1].createdAt);

    if (userTokens.length > 3) {
      const tokensToRemove = userTokens.slice(3);
      tokensToRemove.forEach(([tokenId]) => {
        this.refreshTokens.delete(tokenId);
      });
    }
  }

  /**
   * Two-Factor Authentication Support
   */
  generateTwoFASecret(userId) {
    const secret = speakeasy.generateSecret({
      name: `${this.config.twoFA.issuer} (${userId})`,
      issuer: this.config.twoFA.issuer,
      length: 32
    });

    this.logSecurityEvent({
      userId,
      eventType: '2fa_secret_generated',
      description: '2FA secret generated',
      severity: 'info'
    });

    logger.info('🔐 2FA secret generated for user', {
      userId,
      service: 'enhanced-security'
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
      backupCodes: this.generateBackupCodes()
    };
  }

  verifyTwoFAToken(secret, token) {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.config.twoFA.window
    });

    logger.debug('🔐 2FA token verification', {
      verified,
      service: 'enhanced-security'
    });

    return verified;
  }

  generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Enhanced Rate Limiting per User
   */
  checkRateLimit(identifier, action = 'default') {
    const key = `${identifier}:${action}`;
    const now = Date.now();
    
    if (!this.rateLimitMap.has(key)) {
      this.rateLimitMap.set(key, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
        blockedUntil: null
      });
      return { allowed: true, remaining: this.config.rateLimit.maxAttempts - 1 };
    }

    const data = this.rateLimitMap.get(key);

    // Check if still blocked
    if (data.blockedUntil && now < data.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        blockedUntil: data.blockedUntil,
        reason: 'Rate limit exceeded'
      };
    }

    // Reset if outside window
    if (now - data.firstAttempt > this.config.rateLimit.windowMs) {
      data.attempts = 1;
      data.firstAttempt = now;
      data.lastAttempt = now;
      data.blockedUntil = null;
      return { allowed: true, remaining: this.config.rateLimit.maxAttempts - 1 };
    }

    // Increment attempts
    data.attempts++;
    data.lastAttempt = now;

    if (data.attempts > this.config.rateLimit.maxAttempts) {
      data.blockedUntil = now + this.config.rateLimit.blockDurationMs;
      
      this.logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        description: `Rate limit exceeded for ${action}`,
        ipAddress: identifier,
        severity: 'warning',
        additionalData: {
          action,
          attempts: data.attempts,
          blockedUntil: data.blockedUntil
        }
      });

      return {
        allowed: false,
        remaining: 0,
        blockedUntil: data.blockedUntil,
        reason: 'Rate limit exceeded'
      };
    }

    return {
      allowed: true,
      remaining: this.config.rateLimit.maxAttempts - data.attempts
    };
  }

  /**
   * Enhanced Security Audit Logging
   */
  logSecurityEvent(event) {
    const securityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: event.userId || null,
      eventType: event.eventType,
      description: event.description,
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
      severity: event.severity || 'info',
      additionalData: event.additionalData || null
    };

    this.securityEvents.push(securityEvent);

    // Log to main logger with appropriate level
    const logLevel = securityEvent.severity === 'error' ? 'error' : 
                    securityEvent.severity === 'warning' ? 'warn' : 'info';

    logger[logLevel](`🔒 Security Event: ${securityEvent.eventType}`, {
      ...securityEvent,
      service: 'enhanced-security'
    });

    // Alert on critical events
    if (securityEvent.severity === 'error' || securityEvent.severity === 'critical') {
      this.alertOnCriticalEvent(securityEvent);
    }

    // Maintain event history (keep last 1000 events)
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }
  }

  alertOnCriticalEvent(event) {
    logger.error('🚨 CRITICAL SECURITY EVENT DETECTED', {
      eventId: event.id,
      eventType: event.eventType,
      userId: event.userId,
      ipAddress: event.ipAddress,
      description: event.description,
      timestamp: event.timestamp,
      service: 'enhanced-security'
    });

    // In production, implement additional alerting (email, Slack, etc.)
  }

  startSecurityEventCleanup() {
    // Clean up old security events every hour
    setInterval(() => {
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const initialCount = this.securityEvents.length;
      
      this.securityEvents = this.securityEvents.filter(event => 
        new Date(event.timestamp).getTime() > oneWeekAgo
      );

      if (this.securityEvents.length < initialCount) {
        logger.debug('🧹 Security events cleanup completed', {
          removed: initialCount - this.securityEvents.length,
          remaining: this.securityEvents.length,
          service: 'enhanced-security'
        });
      }
    }, 3600000); // 1 hour
  }

  /**
   * Utility Methods
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  hashPassword(password, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
    return { hash: actualSalt + ':' + hash, salt: actualSalt };
  }

  verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  getSecurityStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    return {
      timestamp: new Date().toISOString(),
      refreshTokens: {
        total: this.refreshTokens.size,
        active: Array.from(this.refreshTokens.values()).filter(t => !t.used).length
      },
      securityEvents: {
        total: this.securityEvents.length,
        lastHour: this.securityEvents.filter(e => 
          new Date(e.timestamp).getTime() > oneHourAgo
        ).length,
        severityCounts: this.securityEvents.reduce((acc, event) => {
          acc[event.severity] = (acc[event.severity] || 0) + 1;
          return acc;
        }, {})
      },
      rateLimiting: {
        activeBlocks: Array.from(this.rateLimitMap.values()).filter(d => 
          d.blockedUntil && now < d.blockedUntil
        ).length,
        totalTracked: this.rateLimitMap.size
      }
    };
  }

  cleanup() {
    logger.info('🧹 Cleaning up enhanced security module', {
      service: 'enhanced-security'
    });
    
    this.refreshTokens.clear();
    this.securityEvents.length = 0;
    this.rateLimitMap.clear();
  }
}

module.exports = new EnhancedSecurity();