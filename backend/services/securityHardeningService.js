/**
 * Sprint 4: Security Hardening Service
 * Comprehensive security middleware for input validation, canonicalization, and header hardening
 */

const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

class SecurityHardeningService {
  constructor() {
    this.setupCSPNonces();
    this.setupSecurityPolicies();
  }

  /**
   * Setup Content Security Policy with dynamic nonces
   */
  setupCSPNonces() {
    this.cspNonces = new Map();
    this.nonceCleanupInterval = setInterval(() => {
      this.cleanupExpiredNonces();
    }, 60000); // Cleanup every minute
  }

  /**
   * Setup security policies
   */
  setupSecurityPolicies() {
    this.securityPolicies = {
      maxRequestSize: '10mb',
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || [],
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000 // 15 minutes
    };
  }

  /**
   * Generate CSP nonce for request
   */
  generateCSPNonce(req) {
    const nonce = crypto.randomBytes(16).toString('base64');
    const sessionId = req.sessionID || req.ip;
    
    this.cspNonces.set(sessionId, {
      nonce,
      timestamp: Date.now()
    });

    return nonce;
  }

  /**
   * Cleanup expired CSP nonces
   */
  cleanupExpiredNonces() {
    const now = Date.now();
    const expiration = 60 * 60 * 1000; // 1 hour

    for (const [sessionId, data] of this.cspNonces.entries()) {
      if (now - data.timestamp > expiration) {
        this.cspNonces.delete(sessionId);
      }
    }
  }

  /**
   * Main security middleware configuration
   */
  configureSecurityMiddleware(app) {
    // Trust proxy settings
    if (this.securityPolicies.trustedProxies.length > 0) {
      app.set('trust proxy', this.securityPolicies.trustedProxies);
    }

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: (req) => {
        const userRole = req.user?.role || 'anonymous';
        const limits = {
          admin: 1000,
          trader: 500,
          analyst: 300,
          viewer: 100,
          anonymous: 50
        };
        return limits[userRole] || 50;
      },
      message: {
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health' || req.path === '/api/ready';
      }
    });

    app.use(limiter);

    // Helmet security headers with dynamic CSP
    app.use((req, res, next) => {
      const nonce = this.generateCSPNonce(req);
      req.cspNonce = nonce;

      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              `'nonce-${nonce}'`,
              "'unsafe-inline'", // Remove in production after nonce implementation
              "https://cdn.jsdelivr.net",
              "https://unpkg.com"
            ],
            styleSrc: [
              "'self'",
              `'nonce-${nonce}'`,
              "'unsafe-inline'",
              "https://fonts.googleapis.com"
            ],
            fontSrc: [
              "'self'",
              "https://fonts.gstatic.com"
            ],
            imgSrc: [
              "'self'",
              "data:",
              "https:"
            ],
            connectSrc: [
              "'self'",
              "https://api.binance.com",
              "https://api.coinbase.com",
              "wss://stream.binance.com"
            ],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: []
          },
          reportOnly: process.env.NODE_ENV !== 'production'
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        noSniff: true,
        frameguard: { action: 'deny' },
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
      })(req, res, next);
    });

    console.log('✅ Security middleware configured');
  }

  /**
   * Input canonicalization and validation middleware
   */
  canonicalizeInput() {
    return (req, res, next) => {
      try {
        // Canonicalize and validate request body
        if (req.body && typeof req.body === 'object') {
          req.body = this.canonicalizeObject(req.body);
        }

        // Canonicalize query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.canonicalizeObject(req.query);
        }

        // Canonicalize URL parameters
        if (req.params && typeof req.params === 'object') {
          req.params = this.canonicalizeObject(req.params);
        }

        next();

      } catch (error) {
        console.error('❌ Input canonicalization error:', error);
        res.status(400).json({
          error: 'Invalid input data',
          code: 'INPUT_CANONICALIZATION_ERROR'
        });
      }
    };
  }

  /**
   * Recursively canonicalize object properties
   */
  canonicalizeObject(obj, depth = 0) {
    if (depth > 10) {
      throw new Error('Object nesting too deep');
    }

    if (Array.isArray(obj)) {
      return obj.map(item => 
        typeof item === 'object' && item !== null 
          ? this.canonicalizeObject(item, depth + 1)
          : this.canonicalizeValue(item)
      );
    }

    if (typeof obj === 'object' && obj !== null) {
      const canonicalized = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const cleanKey = this.canonicalizeKey(key);
        
        if (typeof value === 'object' && value !== null) {
          canonicalized[cleanKey] = this.canonicalizeObject(value, depth + 1);
        } else {
          canonicalized[cleanKey] = this.canonicalizeValue(value);
        }
      }
      
      return canonicalized;
    }

    return this.canonicalizeValue(obj);
  }

  /**
   * Canonicalize object keys
   */
  canonicalizeKey(key) {
    if (typeof key !== 'string') {
      return key;
    }

    // Remove potentially dangerous characters
    let cleaned = key.replace(/[<>\"'&]/g, '');
    
    // Normalize unicode
    cleaned = cleaned.normalize('NFC');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    // Validate key length
    if (cleaned.length > 100) {
      throw new Error(`Object key too long: ${cleaned.substring(0, 50)}...`);
    }

    return cleaned;
  }

  /**
   * Canonicalize individual values
   */
  canonicalizeValue(value) {
    if (typeof value === 'string') {
      return this.canonicalizeString(value);
    }

    if (typeof value === 'number') {
      return this.canonicalizeNumber(value);
    }

    return value;
  }

  /**
   * Canonicalize string values
   */
  canonicalizeString(str) {
    if (typeof str !== 'string') {
      return str;
    }

    // Normalize unicode
    let cleaned = str.normalize('NFC');
    
    // Remove null bytes and control characters except newlines and tabs
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Trim whitespace and convert to lowercase
    cleaned = cleaned.trim().toLowerCase();
    
    // Validate string length
    if (cleaned.length > 10000) {
      throw new Error('String value too long');
    }

    // Check for SQL injection patterns
    if (this.containsSQLInjection(cleaned)) {
      throw new Error('Potential SQL injection detected');
    }

    // Check for script injection patterns
    if (this.containsScriptInjection(cleaned)) {
      throw new Error('Potential script injection detected');
    }

    return cleaned;
  }

  /**
   * Canonicalize numeric values
   */
  canonicalizeNumber(num) {
    if (typeof num !== 'number') {
      return num;
    }

    // Check for NaN and Infinity
    if (!Number.isFinite(num)) {
      throw new Error('Invalid numeric value');
    }

    // Check for reasonable bounds
    if (Math.abs(num) > Number.MAX_SAFE_INTEGER) {
      throw new Error('Numeric value out of safe range');
    }

    return num;
  }

  /**
   * Detect potential SQL injection patterns
   */
  containsSQLInjection(str) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /('|(\\')|('')|(\bOR\b\s+\d+\s*=\s*\d+))/i,
      /(;|\|\||&&|--|#|\/\*|\*\/)/i,
      /(\bxp_|\bsp_|\bsys)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Detect potential script injection patterns
   */
  containsScriptInjection(str) {
    const scriptPatterns = [
      /<script[^>]*>.*?<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>.*?<\/iframe>/i,
      /eval\s*\(/i,
      /document\.(write|writeln|cookie)/i,
      /window\.(location|open)/i
    ];

    return scriptPatterns.some(pattern => pattern.test(str));
  }

  /**
   * API key scope enforcement middleware
   */
  enforceAPIKeyScopes() {
    return (req, res, next) => {
      const apiKey = req.apiKey;
      
      if (!apiKey) {
        return next(); // Not an API key request
      }

      const requiredScope = this.getRequiredScope(req);
      
      if (!requiredScope) {
        return next(); // No specific scope required
      }

      if (!apiKey.scopes || !apiKey.scopes.includes(requiredScope)) {
        return res.status(403).json({
          error: `API key lacks required scope: ${requiredScope}`,
          code: 'INSUFFICIENT_API_SCOPE',
          required_scope: requiredScope,
          available_scopes: apiKey.scopes || []
        });
      }

      next();
    };
  }

  /**
   * Determine required scope based on request
   */
  getRequiredScope(req) {
    const method = req.method;
    const path = req.path;

    // Strategy deployment (must be checked before general ML paths)
    if (path.includes('/deploy') && method === 'POST') {
      return 'strategy:deploy';
    }

    // Trading operations
    if (path.startsWith('/api/trading/') && method === 'POST') {
      return 'trading:execute';
    }

    // Model management
    if (path.startsWith('/api/ml-') && method === 'POST') {
      return 'model:create';
    }

    // Default read scope for GET requests
    if (method === 'GET') {
      return 'read';
    }

    return null;
  }

  /**
   * Session security middleware
   */
  secureSession() {
    return (req, res, next) => {
      // Check session timeout
      if (req.session && req.session.lastActivity) {
        const now = Date.now();
        const sessionAge = now - req.session.lastActivity;
        
        if (sessionAge > this.securityPolicies.sessionTimeout) {
          req.session.destroy();
          return res.status(401).json({
            error: 'Session expired',
            code: 'SESSION_EXPIRED'
          });
        }
      }

      // Update last activity
      if (req.session) {
        req.session.lastActivity = Date.now();
      }

      // Set secure session cookies
      if (req.session && res.getHeader) {
        res.cookie('sessionId', req.sessionID, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: this.securityPolicies.sessionTimeout
        });
      }

      next();
    };
  }

  /**
   * Brute force protection middleware
   */
  bruteForcePrevention() {
    const attempts = new Map();

    return (req, res, next) => {
      const key = req.ip + ':' + (req.body?.username || req.body?.email || 'unknown');
      const now = Date.now();
      
      const userAttempts = attempts.get(key) || { count: 0, lastAttempt: 0, lockedUntil: 0 };

      // Check if user is locked out
      if (userAttempts.lockedUntil > now) {
        return res.status(429).json({
          error: 'Account temporarily locked due to too many failed attempts',
          code: 'ACCOUNT_LOCKED',
          retry_after: Math.ceil((userAttempts.lockedUntil - now) / 1000)
        });
      }

      // Reset count if last attempt was more than 15 minutes ago
      if (now - userAttempts.lastAttempt > this.securityPolicies.lockoutDuration) {
        userAttempts.count = 0;
      }

      // Increment attempt count for failed logins
      res.on('finish', () => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          userAttempts.count++;
          userAttempts.lastAttempt = now;

          if (userAttempts.count >= this.securityPolicies.maxLoginAttempts) {
            userAttempts.lockedUntil = now + this.securityPolicies.lockoutDuration;
            console.log(`🚨 Account locked: ${key} after ${userAttempts.count} failed attempts`);
            
            // In production, alert security team
            this.alertSecurityTeam('account_locked', { key, attempts: userAttempts.count });
          }

          attempts.set(key, userAttempts);
        } else if (res.statusCode === 200) {
          // Successful login, reset attempts
          attempts.delete(key);
        }
      });

      next();
    };
  }

  /**
   * Alert security team about suspicious activity
   */
  alertSecurityTeam(eventType, data) {
    const alert = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      data,
      severity: 'high'
    };

    console.log('🚨 Security Alert:', JSON.stringify(alert));
    
    // In production, integrate with security monitoring system
    // this.securityMonitor.sendAlert(alert);
  }

  /**
   * Request logging for security audit
   */
  securityAuditLogger() {
    return (req, res, next) => {
      const sensitiveEndpoints = [
        '/api/auth/',
        '/api/trading/',
        '/api/admin/',
        '/api/ml-strategy/strategies'
      ];

      const shouldLog = sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint));

      if (shouldLog) {
        const logEntry = {
          timestamp: new Date().toISOString(),
          ip: req.ip,
          method: req.method,
          path: req.path,
          user_agent: req.get('User-Agent'),
          user_id: req.user?.id || 'anonymous',
          session_id: req.sessionID,
          request_id: req.id
        };

        console.log('🔍 Security Audit Log:', JSON.stringify(logEntry));
      }

      next();
    };
  }

  /**
   * Check rate limiting for user
   */
  async checkRateLimit(user, req) {
    // Simple in-memory rate limiting for testing
    const userId = user?.id || 'anonymous';
    const now = Date.now();
    const key = `rate_limit_${userId}`;
    
    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }
    
    const userLimits = this.rateLimitStore.get(key) || { count: 0, resetTime: now + 60000 };
    
    // Reset if time window has passed
    if (now > userLimits.resetTime) {
      userLimits.count = 0;
      userLimits.resetTime = now + 60000; // 1 minute window
    }
    
    userLimits.count += 1;
    this.rateLimitStore.set(key, userLimits);
    
    const limit = 100; // 100 requests per minute
    const remaining = Math.max(0, limit - userLimits.count);
    const exceeded = userLimits.count > limit;
    
    return {
      allowed: !exceeded,
      limit,
      remaining,
      resetTime: userLimits.resetTime
    };
  }

  /**
   * Cleanup resources on shutdown
   */
  cleanup() {
    if (this.nonceCleanupInterval) {
      clearInterval(this.nonceCleanupInterval);
    }
  }
}

module.exports = SecurityHardeningService;