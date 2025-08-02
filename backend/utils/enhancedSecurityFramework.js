const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { EventEmitter } = require('events');
const logger = require('./logger');

/**
 * Enhanced Security Framework
 * Implements enterprise-grade security features:
 * - Advanced authentication with OAuth2/OpenID Connect preparation
 * - API key management system
 * - Security audit logging
 * - Data encryption at rest and in transit
 * - Rate limiting and DDoS protection
 * - Security monitoring and threat detection
 */
class EnhancedSecurityFramework extends EventEmitter {
  constructor() {
    super();
    
    this.securityConfig = {
      // JWT Configuration
      jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      jwtRefreshExpiresIn: '7d',
      
      // Password Policy
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecial: true,
      passwordMaxAge: 90, // days
      
      // API Key Configuration
      apiKeyLength: 32,
      apiKeyPrefix: 'aaiti_',
      apiKeyExpiresIn: 365, // days
      
      // Encryption Configuration
      encryptionAlgorithm: 'aes-256-gcm',
      encryptionKeyLength: 32,
      ivLength: 16,
      tagLength: 16,
      
      // Rate Limiting
      globalRateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // requests per window
        message: 'Too many requests from this IP'
      },
      
      apiRateLimit: {
        windowMs: 60 * 1000, // 1 minute
        max: 100, // requests per minute
        message: 'API rate limit exceeded'
      },
      
      authRateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // login attempts
        message: 'Too many authentication attempts'
      },
      
      // Security Monitoring
      maxFailedAttempts: 5,
      lockoutDuration: 30 * 60 * 1000, // 30 minutes
      anomalyDetectionThreshold: 10,
      
      // Data Classification
      sensitiveFields: ['password', 'ssn', 'credit_card', 'api_key', 'private_key'],
      piiFields: ['email', 'phone', 'address', 'name']
    };
    
    // Security state tracking
    this.apiKeys = new Map();
    this.refreshTokens = new Map();
    this.failedAttempts = new Map();
    this.lockedAccounts = new Map();
    this.securityEvents = [];
    this.encryptionKeys = new Map();
    
    // Initialize encryption keys
    this.masterKey = this.deriveMasterKey();
    
    logger.info('Enhanced Security Framework initialized');
  }

  /**
   * Initialize security framework
   */
  async initialize() {
    try {
      // Initialize encryption
      await this.initializeEncryption();
      
      // Set up security monitoring
      this.startSecurityMonitoring();
      
      // Initialize rate limiters
      this.initializeRateLimiters();
      
      logger.info('Enhanced Security Framework started successfully');
      
    } catch (error) {
      logger.error('Failed to initialize security framework:', error);
      throw error;
    }
  }

  /**
   * Advanced Authentication System
   */
  
  // Enhanced JWT token generation
  generateTokenPair(user, permissions = []) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions,
      tokenType: 'access',
      iat: Math.floor(Date.now() / 1000)
    };
    
    // Access token
    const accessToken = jwt.sign(payload, this.securityConfig.jwtSecret, {
      expiresIn: this.securityConfig.jwtExpiresIn,
      issuer: 'aaiti-platform',
      audience: 'aaiti-users'
    });
    
    // Refresh token
    const refreshPayload = {
      id: user.id,
      tokenType: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };
    
    const refreshToken = jwt.sign(refreshPayload, this.securityConfig.jwtSecret, {
      expiresIn: this.securityConfig.jwtRefreshExpiresIn,
      issuer: 'aaiti-platform',
      audience: 'aaiti-users'
    });
    
    // Store refresh token
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      userAgent: payload.userAgent || 'unknown'
    });
    
    this.logSecurityEvent('TOKEN_GENERATED', {
      userId: user.id,
      tokenType: 'access_refresh_pair'
    });
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseTimeToSeconds(this.securityConfig.jwtExpiresIn),
      tokenType: 'Bearer'
    };
  }

  // Token refresh functionality
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.securityConfig.jwtSecret);
      
      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      // Check if refresh token exists and is valid
      const tokenData = this.refreshTokens.get(refreshToken);
      if (!tokenData) {
        throw new Error('Refresh token not found');
      }
      
      // Update last used time
      tokenData.lastUsed = Date.now();
      
      // Get user data (in real implementation, fetch from database)
      const user = { 
        id: decoded.id, 
        username: 'user', 
        email: 'user@example.com', 
        role: 'trader' 
      };
      
      // Generate new access token
      const newTokenPair = this.generateTokenPair(user);
      
      this.logSecurityEvent('TOKEN_REFRESHED', {
        userId: decoded.id
      });
      
      return newTokenPair;
      
    } catch (error) {
      this.logSecurityEvent('TOKEN_REFRESH_FAILED', {
        error: error.message,
        refreshToken: refreshToken.substring(0, 10) + '...'
      });
      throw new Error('Invalid refresh token');
    }
  }

  // Revoke tokens
  async revokeToken(token, type = 'refresh') {
    try {
      if (type === 'refresh') {
        const deleted = this.refreshTokens.delete(token);
        if (deleted) {
          this.logSecurityEvent('TOKEN_REVOKED', { tokenType: 'refresh' });
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      logger.error('Error revoking token:', error);
      return false;
    }
  }

  /**
   * API Key Management System
   */
  
  // Generate API key
  generateApiKey(userId, name, permissions = [], expiresIn = null) {
    const keyId = crypto.randomUUID();
    const rawKey = crypto.randomBytes(this.securityConfig.apiKeyLength).toString('hex');
    const apiKey = `${this.securityConfig.apiKeyPrefix}${rawKey}`;
    
    // Hash the key for storage
    const hashedKey = this.hashApiKey(apiKey);
    
    const keyData = {
      id: keyId,
      userId,
      name,
      hashedKey,
      permissions,
      createdAt: Date.now(),
      expiresAt: expiresIn ? Date.now() + (expiresIn * 24 * 60 * 60 * 1000) : null,
      lastUsed: null,
      isActive: true,
      usageCount: 0
    };
    
    this.apiKeys.set(keyId, keyData);
    
    this.logSecurityEvent('API_KEY_GENERATED', {
      userId,
      keyId,
      name,
      permissions
    });
    
    return {
      keyId,
      apiKey, // Return raw key only once
      name,
      permissions,
      expiresAt: keyData.expiresAt
    };
  }

  // Validate API key
  async validateApiKey(apiKey) {
    try {
      const hashedKey = this.hashApiKey(apiKey);
      
      // Find matching key
      for (const [keyId, keyData] of this.apiKeys.entries()) {
        if (keyData.hashedKey === hashedKey && keyData.isActive) {
          // Check expiration
          if (keyData.expiresAt && Date.now() > keyData.expiresAt) {
            keyData.isActive = false;
            this.logSecurityEvent('API_KEY_EXPIRED', { keyId });
            return null;
          }
          
          // Update usage statistics
          keyData.lastUsed = Date.now();
          keyData.usageCount++;
          
          this.logSecurityEvent('API_KEY_USED', { 
            keyId, 
            userId: keyData.userId 
          });
          
          return {
            keyId,
            userId: keyData.userId,
            permissions: keyData.permissions,
            name: keyData.name
          };
        }
      }
      
      this.logSecurityEvent('API_KEY_INVALID', { 
        hashedKey: hashedKey.substring(0, 10) + '...' 
      });
      
      return null;
      
    } catch (error) {
      logger.error('API key validation error:', error);
      return null;
    }
  }

  // Revoke API key
  revokeApiKey(keyId, userId) {
    const keyData = this.apiKeys.get(keyId);
    
    if (keyData && keyData.userId === userId) {
      keyData.isActive = false;
      keyData.revokedAt = Date.now();
      
      this.logSecurityEvent('API_KEY_REVOKED', {
        keyId,
        userId
      });
      
      return true;
    }
    
    return false;
  }

  // List user's API keys
  getUserApiKeys(userId) {
    const userKeys = [];
    
    for (const [keyId, keyData] of this.apiKeys.entries()) {
      if (keyData.userId === userId) {
        userKeys.push({
          keyId,
          name: keyData.name,
          permissions: keyData.permissions,
          createdAt: keyData.createdAt,
          expiresAt: keyData.expiresAt,
          lastUsed: keyData.lastUsed,
          isActive: keyData.isActive,
          usageCount: keyData.usageCount
        });
      }
    }
    
    return userKeys;
  }

  /**
   * Data Encryption System
   */
  
  // Initialize encryption
  async initializeEncryption() {
    try {
      // Generate or load encryption keys
      this.encryptionKeys.set('default', this.masterKey);
      
      logger.info('Encryption system initialized');
      
    } catch (error) {
      logger.error('Encryption initialization error:', error);
      throw error;
    }
  }

  // Encrypt sensitive data
  encryptData(data, keyId = 'default') {
    try {
      const key = this.encryptionKeys.get(keyId);
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }
      
      const iv = crypto.randomBytes(this.securityConfig.ivLength);
      const cipher = crypto.createCipher(this.securityConfig.encryptionAlgorithm, key, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        keyId
      };
      
    } catch (error) {
      logger.error('Data encryption error:', error);
      throw error;
    }
  }

  // Decrypt sensitive data
  decryptData(encryptedData) {
    try {
      const { encrypted, iv, tag, keyId } = encryptedData;
      const key = this.encryptionKeys.get(keyId || 'default');
      
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }
      
      const decipher = crypto.createDecipher(
        this.securityConfig.encryptionAlgorithm, 
        key, 
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
      
    } catch (error) {
      logger.error('Data decryption error:', error);
      throw error;
    }
  }

  /**
   * Rate Limiting and DDoS Protection
   */
  
  initializeRateLimiters() {
    // Global rate limiter
    this.globalRateLimiter = rateLimit({
      ...this.securityConfig.globalRateLimit,
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
      },
      onLimitReached: (req) => {
        this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          ip: req.ip,
          type: 'global',
          userAgent: req.get('User-Agent')
        });
      }
    });
    
    // API rate limiter
    this.apiRateLimiter = rateLimit({
      ...this.securityConfig.apiRateLimit,
      keyGenerator: (req) => {
        return req.user?.id || req.ip;
      },
      onLimitReached: (req) => {
        this.logSecurityEvent('API_RATE_LIMIT_EXCEEDED', {
          userId: req.user?.id,
          ip: req.ip,
          endpoint: req.path
        });
      }
    });
    
    // Authentication rate limiter
    this.authRateLimiter = rateLimit({
      ...this.securityConfig.authRateLimit,
      keyGenerator: (req) => {
        return req.ip;
      },
      onLimitReached: (req) => {
        this.logSecurityEvent('AUTH_RATE_LIMIT_EXCEEDED', {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
    });
    
    logger.info('Rate limiters initialized');
  }

  /**
   * Security Monitoring and Threat Detection
   */
  
  startSecurityMonitoring() {
    // Monitor for security events
    setInterval(() => {
      this.analyzeSecurityEvents();
      this.cleanupOldEvents();
    }, 60000); // Every minute
    
    // Monitor failed authentication attempts
    setInterval(() => {
      this.checkFailedAttempts();
    }, 30000); // Every 30 seconds
    
    logger.info('Security monitoring started');
  }

  // Log security events
  logSecurityEvent(type, data = {}) {
    const event = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      data,
      severity: this.getEventSeverity(type),
      processed: false
    };
    
    this.securityEvents.push(event);
    
    // Emit event for real-time monitoring
    this.emit('securityEvent', event);
    
    // Log high severity events immediately
    if (event.severity === 'HIGH') {
      logger.warn('High severity security event:', event);
    } else {
      logger.debug('Security event logged:', { type, severity: event.severity });
    }
    
    return event.id;
  }

  // Analyze security events for patterns
  analyzeSecurityEvents() {
    const recentEvents = this.securityEvents.filter(
      event => Date.now() - event.timestamp < 300000 // Last 5 minutes
    );
    
    // Detect anomalies
    this.detectAnomalies(recentEvents);
    
    // Check for attack patterns
    this.detectAttackPatterns(recentEvents);
  }

  detectAnomalies(events) {
    const eventCounts = {};
    
    events.forEach(event => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });
    
    // Check for unusual event frequencies
    Object.entries(eventCounts).forEach(([type, count]) => {
      if (count > this.securityConfig.anomalyDetectionThreshold) {
        this.logSecurityEvent('ANOMALY_DETECTED', {
          eventType: type,
          count,
          timeWindow: '5_minutes'
        });
      }
    });
  }

  detectAttackPatterns(events) {
    // Detect brute force attempts
    const failedAttempts = events.filter(e => 
      e.type === 'AUTH_FAILED' || e.type === 'API_KEY_INVALID'
    );
    
    if (failedAttempts.length > 10) {
      this.logSecurityEvent('POSSIBLE_BRUTE_FORCE', {
        attemptCount: failedAttempts.length,
        timeWindow: '5_minutes'
      });
    }
    
    // Detect unusual API usage patterns
    const apiEvents = events.filter(e => e.type === 'API_KEY_USED');
    const uniqueUsers = new Set(apiEvents.map(e => e.data.userId));
    
    if (apiEvents.length > 1000 && uniqueUsers.size < 5) {
      this.logSecurityEvent('UNUSUAL_API_PATTERN', {
        apiCalls: apiEvents.length,
        uniqueUsers: uniqueUsers.size
      });
    }
  }

  // Handle failed authentication attempts
  recordFailedAttempt(identifier, type = 'login') {
    const attempts = this.failedAttempts.get(identifier) || [];
    attempts.push({
      timestamp: Date.now(),
      type
    });
    
    this.failedAttempts.set(identifier, attempts);
    
    // Check if account should be locked
    const recentAttempts = attempts.filter(
      attempt => Date.now() - attempt.timestamp < 900000 // 15 minutes
    );
    
    if (recentAttempts.length >= this.securityConfig.maxFailedAttempts) {
      this.lockAccount(identifier);
    }
    
    this.logSecurityEvent('AUTH_FAILED', {
      identifier: this.hashIdentifier(identifier),
      attemptCount: recentAttempts.length,
      type
    });
  }

  // Lock account
  lockAccount(identifier) {
    const lockData = {
      lockedAt: Date.now(),
      expiresAt: Date.now() + this.securityConfig.lockoutDuration,
      reason: 'Too many failed attempts'
    };
    
    this.lockedAccounts.set(identifier, lockData);
    
    this.logSecurityEvent('ACCOUNT_LOCKED', {
      identifier: this.hashIdentifier(identifier),
      duration: this.securityConfig.lockoutDuration
    });
  }

  // Check if account is locked
  isAccountLocked(identifier) {
    const lockData = this.lockedAccounts.get(identifier);
    
    if (!lockData) {
      return false;
    }
    
    if (Date.now() > lockData.expiresAt) {
      this.lockedAccounts.delete(identifier);
      this.logSecurityEvent('ACCOUNT_UNLOCKED', {
        identifier: this.hashIdentifier(identifier)
      });
      return false;
    }
    
    return true;
  }

  /**
   * Password Security
   */
  
  // Validate password strength
  validatePasswordStrength(password) {
    const errors = [];
    
    if (password.length < this.securityConfig.passwordMinLength) {
      errors.push(`Password must be at least ${this.securityConfig.passwordMinLength} characters long`);
    }
    
    if (this.securityConfig.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (this.securityConfig.passwordRequireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (this.securityConfig.passwordRequireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (this.securityConfig.passwordRequireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 4, 40);
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
    
    // Pattern penalties
    if (/(.)\1{2,}/.test(password)) score -= 10; // repeated characters
    if (/123|abc|qwe/i.test(password)) score -= 15; // common patterns
    
    if (score < 30) return 'weak';
    if (score < 60) return 'medium';
    if (score < 90) return 'strong';
    return 'very_strong';
  }

  // Hash password
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Utility Methods
   */
  
  deriveMasterKey() {
    const secret = process.env.MASTER_KEY_SECRET || 'default-secret-change-in-production';
    return crypto.pbkdf2Sync(secret, 'aaiti-salt', 100000, 32, 'sha512');
  }

  hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  hashIdentifier(identifier) {
    return crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 16);
  }

  getEventSeverity(eventType) {
    const highSeverityEvents = [
      'ACCOUNT_LOCKED', 'ANOMALY_DETECTED', 'POSSIBLE_BRUTE_FORCE',
      'UNUSUAL_API_PATTERN', 'TOKEN_REFRESH_FAILED'
    ];
    
    const mediumSeverityEvents = [
      'AUTH_FAILED', 'API_KEY_INVALID', 'RATE_LIMIT_EXCEEDED'
    ];
    
    if (highSeverityEvents.includes(eventType)) return 'HIGH';
    if (mediumSeverityEvents.includes(eventType)) return 'MEDIUM';
    return 'LOW';
  }

  parseTimeToSeconds(timeString) {
    const timeUnits = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400
    };
    
    const match = timeString.match(/^(\d+)([smhd])$/);
    if (match) {
      return parseInt(match[1]) * timeUnits[match[2]];
    }
    
    return 3600; // default 1 hour
  }

  checkFailedAttempts() {
    // Clean up old failed attempts
    const cutoff = Date.now() - 900000; // 15 minutes
    
    for (const [identifier, attempts] of this.failedAttempts.entries()) {
      const recentAttempts = attempts.filter(attempt => attempt.timestamp > cutoff);
      
      if (recentAttempts.length === 0) {
        this.failedAttempts.delete(identifier);
      } else {
        this.failedAttempts.set(identifier, recentAttempts);
      }
    }
  }

  cleanupOldEvents() {
    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }
  }

  /**
   * Public API Methods
   */
  
  getSecurityStatus() {
    return {
      activeApiKeys: this.apiKeys.size,
      activeRefreshTokens: this.refreshTokens.size,
      lockedAccounts: this.lockedAccounts.size,
      recentSecurityEvents: this.securityEvents.filter(
        e => Date.now() - e.timestamp < 3600000 // Last hour
      ).length,
      encryptionEnabled: this.encryptionKeys.size > 0,
      rateLimitingEnabled: true
    };
  }

  getSecurityEvents(limit = 100, severity = null) {
    let events = this.securityEvents
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (severity) {
      events = events.filter(e => e.severity === severity.toUpperCase());
    }
    
    return events;
  }

  // Get rate limiters for middleware
  getRateLimiters() {
    return {
      global: this.globalRateLimiter,
      api: this.apiRateLimiter,
      auth: this.authRateLimiter
    };
  }
}

module.exports = new EnhancedSecurityFramework();