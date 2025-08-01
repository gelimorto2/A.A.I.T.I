# Security Guide

Comprehensive security guide for A.A.I.T.I v1.2.1. Learn about security features, best practices, and how to secure your trading infrastructure.

## 🔒 Security Overview

A.A.I.T.I implements enterprise-grade security measures to protect your trading operations, user data, and financial information.

### Security Architecture
- **Defense in Depth**: Multiple security layers
- **Zero Trust Model**: Verify everything, trust nothing
- **Principle of Least Privilege**: Minimal necessary permissions
- **Secure by Default**: Security-first configuration

### Threat Model
- **External Attackers**: Network-based attacks, DDoS
- **Data Breaches**: Unauthorized data access
- **API Abuse**: Rate limiting, authentication bypass
- **Container Escapes**: Docker security vulnerabilities
- **Supply Chain**: Dependency vulnerabilities

## 🛡 Authentication & Authorization

### JWT-Based Authentication

#### Implementation
```javascript
// Secure JWT configuration
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthenticationManager {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecretKey();
    this.tokenExpiry = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiry = '7d';
    this.saltRounds = 12;
    
    // Token blacklist for logout/security
    this.tokenBlacklist = new Set();
    
    // Rate limiting for auth attempts
    this.authAttempts = new Map();
    this.maxAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
  }

  generateSecretKey() {
    // Generate cryptographically secure JWT secret
    const secret = crypto.randomBytes(64).toString('hex');
    console.warn('⚠️ Generated JWT secret. Set JWT_SECRET environment variable for production.');
    return secret;
  }

  async hashPassword(password) {
    // Validate password strength
    if (!this.isPasswordStrong(password)) {
      throw new Error('Password does not meet security requirements');
    }
    
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  isPasswordStrong(password) {
    // Password security requirements
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
  }

  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpiry,
      issuer: 'aaiti-api',
      audience: 'aaiti-client',
      algorithm: 'HS256'
    });

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' }, 
      this.jwtSecret, 
      { expiresIn: this.refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  }

  verifyToken(token) {
    // Check blacklist first
    if (this.tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked');
    }

    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'aaiti-api',
        audience: 'aaiti-client',
        algorithms: ['HS256']
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  revokeToken(token) {
    this.tokenBlacklist.add(token);
    
    // Clean up old tokens periodically
    if (this.tokenBlacklist.size > 10000) {
      this.cleanupBlacklist();
    }
  }

  async checkRateLimit(identifier) {
    const now = Date.now();
    const attempts = this.authAttempts.get(identifier) || { count: 0, resetTime: now };

    if (now > attempts.resetTime) {
      attempts.count = 0;
      attempts.resetTime = now + this.lockoutDuration;
    }

    if (attempts.count >= this.maxAttempts) {
      throw new Error(`Too many authentication attempts. Try again in ${Math.ceil((attempts.resetTime - now) / 60000)} minutes.`);
    }

    attempts.count++;
    this.authAttempts.set(identifier, attempts);
  }

  resetRateLimit(identifier) {
    this.authAttempts.delete(identifier);
  }
}
```

### Role-Based Access Control (RBAC)

```javascript
// RBAC implementation
class AuthorizationManager {
  constructor() {
    this.roles = {
      admin: {
        permissions: [
          'users:read', 'users:write', 'users:delete',
          'models:read', 'models:write', 'models:delete',
          'bots:read', 'bots:write', 'bots:delete',
          'settings:read', 'settings:write',
          'system:read', 'system:write'
        ]
      },
      trader: {
        permissions: [
          'models:read', 'models:write',
          'bots:read', 'bots:write',
          'predictions:read',
          'backtests:read', 'backtests:write'
        ]
      },
      viewer: {
        permissions: [
          'models:read',
          'bots:read',
          'predictions:read',
          'backtests:read'
        ]
      }
    };
  }

  hasPermission(userRole, permission) {
    const role = this.roles[userRole];
    return role && role.permissions.includes(permission);
  }

  requirePermission(permission) {
    return (req, res, next) => {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!this.hasPermission(user.role, permission)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions', 
          required: permission,
          userRole: user.role 
        });
      }

      next();
    };
  }

  requireRole(requiredRole) {
    return (req, res, next) => {
      const user = req.user;
      
      if (!user || user.role !== requiredRole) {
        return res.status(403).json({ 
          error: 'Insufficient role privileges',
          required: requiredRole,
          current: user?.role 
        });
      }

      next();
    };
  }
}
```

### Session Management

```javascript
// Secure session management
class SessionManager {
  constructor() {
    this.activeSessions = new Map();
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    this.maxSessionsPerUser = 5;
    
    // Cleanup expired sessions every hour
    setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000);
  }

  createSession(userId, tokenData, clientInfo) {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + this.sessionTimeout,
      clientInfo: {
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        country: clientInfo.country
      },
      tokenData
    };

    // Limit sessions per user
    this.enforceSessionLimit(userId);
    
    this.activeSessions.set(sessionId, session);
    return sessionId;
  }

  updateSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      session.expiresAt = Date.now() + this.sessionTimeout;
    }
  }

  terminateSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      // Add token to blacklist
      this.authManager.revokeToken(session.tokenData.accessToken);
      this.activeSessions.delete(sessionId);
    }
  }

  terminateAllUserSessions(userId) {
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.terminateSession(sessionId);
      }
    }
  }

  enforceSessionLimit(userId) {
    const userSessions = Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => b.lastActivity - a.lastActivity);

    // Remove oldest sessions if limit exceeded
    if (userSessions.length >= this.maxSessionsPerUser) {
      const sessionsToRemove = userSessions.slice(this.maxSessionsPerUser - 1);
      sessionsToRemove.forEach(session => this.terminateSession(session.id));
    }
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        this.terminateSession(sessionId);
      }
    }
  }

  getSessionInfo(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      userId: session.userId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      clientInfo: session.clientInfo
    };
  }
}
```

## 🔐 Data Protection

### Encryption at Rest

```javascript
// Database encryption for sensitive data
const crypto = require('crypto');

class DataEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    
    // Use environment variable or generate key
    this.masterKey = process.env.ENCRYPTION_KEY ? 
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : 
      this.generateMasterKey();
  }

  generateMasterKey() {
    const key = crypto.randomBytes(this.keyLength);
    console.warn('⚠️ Generated encryption key. Set ENCRYPTION_KEY environment variable for production.');
    console.log('Generated key (hex):', key.toString('hex'));
    return key;
  }

  encrypt(plaintext) {
    if (!plaintext) return null;
    
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, this.masterKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV, tag, and encrypted data
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData) {
    if (!encryptedData) return null;
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(this.algorithm, this.masterKey, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Field-level encryption for sensitive model parameters
  encryptModelParameters(parameters) {
    if (typeof parameters !== 'object') return parameters;
    
    const encrypted = {};
    for (const [key, value] of Object.entries(parameters)) {
      if (this.isSensitiveField(key)) {
        encrypted[key] = this.encrypt(JSON.stringify(value));
      } else {
        encrypted[key] = value;
      }
    }
    return encrypted;
  }

  decryptModelParameters(parameters) {
    if (typeof parameters !== 'object') return parameters;
    
    const decrypted = {};
    for (const [key, value] of Object.entries(parameters)) {
      if (this.isSensitiveField(key) && typeof value === 'string') {
        try {
          decrypted[key] = JSON.parse(this.decrypt(value));
        } catch (error) {
          // If decryption fails, assume it's not encrypted
          decrypted[key] = value;
        }
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }

  isSensitiveField(fieldName) {
    const sensitiveFields = [
      'apiKeys', 'secrets', 'privateKeys', 'passwords',
      'tokens', 'connectionStrings', 'webhookUrls'
    ];
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }
}
```

### Input Validation & Sanitization

```javascript
// Comprehensive input validation
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

class InputValidator {
  constructor() {
    this.maxStringLength = 1000;
    this.maxArrayLength = 100;
    this.maxObjectDepth = 5;
  }

  validateAndSanitize(data, schema) {
    if (!schema) {
      throw new Error('Validation schema is required');
    }

    const result = {};
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      try {
        const value = data[field];
        result[field] = this.validateField(field, value, rules);
      } catch (error) {
        errors.push({ field, error: error.message });
      }
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed');
      error.details = errors;
      throw error;
    }

    return result;
  }

  validateField(fieldName, value, rules) {
    // Required field check
    if (rules.required && (value === undefined || value === null || value === '')) {
      throw new Error(`${fieldName} is required`);
    }

    if (value === undefined || value === null) {
      return rules.default;
    }

    // Type validation
    if (rules.type) {
      value = this.validateType(fieldName, value, rules.type);
    }

    // String validation
    if (typeof value === 'string') {
      value = this.validateString(fieldName, value, rules);
    }

    // Number validation
    if (typeof value === 'number') {
      value = this.validateNumber(fieldName, value, rules);
    }

    // Array validation
    if (Array.isArray(value)) {
      value = this.validateArray(fieldName, value, rules);
    }

    // Object validation
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      value = this.validateObject(fieldName, value, rules);
    }

    // Custom validation
    if (rules.custom) {
      value = rules.custom(value);
    }

    return value;
  }

  validateType(fieldName, value, expectedType) {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`${fieldName} must be a string`);
        }
        return DOMPurify.sanitize(value);

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`${fieldName} must be a number`);
        }
        return num;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        throw new Error(`${fieldName} must be a boolean`);

      case 'email':
        if (!validator.isEmail(value)) {
          throw new Error(`${fieldName} must be a valid email`);
        }
        return validator.normalizeEmail(value);

      case 'uuid':
        if (!validator.isUUID(value)) {
          throw new Error(`${fieldName} must be a valid UUID`);
        }
        return value;

      case 'date':
        if (!validator.isISO8601(value)) {
          throw new Error(`${fieldName} must be a valid ISO 8601 date`);
        }
        return new Date(value);

      default:
        return value;
    }
  }

  validateString(fieldName, value, rules) {
    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      throw new Error(`${fieldName} must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      throw new Error(`${fieldName} must be no more than ${rules.maxLength} characters`);
    }

    if (value.length > this.maxStringLength) {
      throw new Error(`${fieldName} exceeds maximum length of ${this.maxStringLength}`);
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      throw new Error(`${fieldName} format is invalid`);
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      throw new Error(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
    }

    // SQL injection prevention
    if (this.containsSQLInjection(value)) {
      throw new Error(`${fieldName} contains potentially malicious content`);
    }

    return value.trim();
  }

  validateNumber(fieldName, value, rules) {
    if (rules.min !== undefined && value < rules.min) {
      throw new Error(`${fieldName} must be at least ${rules.min}`);
    }

    if (rules.max !== undefined && value > rules.max) {
      throw new Error(`${fieldName} must be no more than ${rules.max}`);
    }

    return value;
  }

  validateArray(fieldName, value, rules) {
    if (value.length > this.maxArrayLength) {
      throw new Error(`${fieldName} exceeds maximum array length of ${this.maxArrayLength}`);
    }

    if (rules.items) {
      return value.map((item, index) => 
        this.validateField(`${fieldName}[${index}]`, item, rules.items)
      );
    }

    return value;
  }

  validateObject(fieldName, value, rules) {
    if (this.getObjectDepth(value) > this.maxObjectDepth) {
      throw new Error(`${fieldName} exceeds maximum object depth of ${this.maxObjectDepth}`);
    }

    if (rules.properties) {
      const result = {};
      for (const [prop, propRules] of Object.entries(rules.properties)) {
        result[prop] = this.validateField(`${fieldName}.${prop}`, value[prop], propRules);
      }
      return result;
    }

    return value;
  }

  containsSQLInjection(value) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
      /(--|\/\*|\*\/|;)/gi,
      /(\bOR\b.*\b=\b|\bAND\b.*\b=\b)/gi
    ];

    return sqlPatterns.some(pattern => pattern.test(value));
  }

  getObjectDepth(obj, depth = 0) {
    if (depth > this.maxObjectDepth) return depth;
    
    if (typeof obj !== 'object' || obj === null) return depth;
    
    let maxDepth = depth;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const childDepth = this.getObjectDepth(obj[key], depth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }
    
    return maxDepth;
  }
}

// Usage example
const validator = new InputValidator();

const mlModelSchema = {
  name: { 
    required: true, 
    type: 'string', 
    minLength: 1, 
    maxLength: 100 
  },
  algorithmType: { 
    required: true, 
    type: 'string', 
    enum: ['arima', 'lstm', 'prophet', 'random_forest'] 
  },
  symbols: { 
    required: true, 
    type: 'array',
    items: { type: 'string', pattern: /^[A-Z]{3,10}$/ }
  },
  parameters: { 
    type: 'object',
    properties: {
      p: { type: 'number', min: 0, max: 10 },
      d: { type: 'number', min: 0, max: 3 },
      q: { type: 'number', min: 0, max: 10 }
    }
  }
};
```

## 🌐 Network Security

### HTTPS/TLS Configuration

```javascript
// TLS configuration for production
const https = require('https');
const fs = require('fs');

class TLSConfig {
  constructor() {
    this.sslOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH || './certs/private-key.pem'),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH || './certs/certificate.pem'),
      ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : undefined,
      
      // Security options
      secureProtocol: 'TLSv1_2_method',
      ciphers: [
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-SHA256',
        'ECDHE-RSA-AES256-SHA384'
      ].join(':'),
      honorCipherOrder: true,
      
      // Perfect Forward Secrecy
      dhparam: process.env.SSL_DH_PATH ? 
        fs.readFileSync(process.env.SSL_DH_PATH) : undefined
    };
  }

  createSecureServer(app) {
    return https.createServer(this.sslOptions, app);
  }

  // Generate self-signed certificate for development
  generateSelfSignedCert() {
    const selfsigned = require('selfsigned');
    
    const attrs = [
      { name: 'commonName', value: 'localhost' },
      { name: 'countryName', value: 'US' },
      { name: 'stateOrProvinceName', value: 'State' },
      { name: 'localityName', value: 'City' },
      { name: 'organizationName', value: 'A.A.I.T.I Development' }
    ];

    const pems = selfsigned.generate(attrs, {
      keySize: 2048,
      days: 365,
      algorithm: 'sha256'
    });

    return {
      key: pems.private,
      cert: pems.cert
    };
  }
}
```

### Rate Limiting & DDoS Protection

```javascript
// Advanced rate limiting
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

class SecurityMiddleware {
  constructor() {
    this.suspiciousIPs = new Set();
    this.blockedIPs = new Set();
    this.rateLimitStore = new Map();
  }

  // General API rate limiting
  createRateLimit(windowMs = 15 * 60 * 1000, max = 100) {
    return rateLimit({
      windowMs,
      max,
      message: {
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.logSuspiciousActivity(req.ip, 'rate_limit_exceeded');
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  }

  // Strict rate limiting for authentication endpoints
  createAuthRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      skipSuccessfulRequests: true,
      handler: (req, res) => {
        this.flagSuspiciousIP(req.ip);
        res.status(429).json({
          error: 'Too many authentication attempts',
          retryAfter: 900 // 15 minutes
        });
      }
    });
  }

  // Progressive delay for repeated requests
  createSlowDown() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 10, // Allow 10 requests per windowMs without delay
      delayMs: 500, // Add 500ms delay per request after delayAfter
      maxDelayMs: 5000, // Maximum delay of 5 seconds
      skipSuccessfulRequests: true
    });
  }

  // IP blocking middleware
  ipBlocking() {
    return (req, res, next) => {
      const clientIP = this.getClientIP(req);
      
      if (this.blockedIPs.has(clientIP)) {
        this.logSecurityEvent('blocked_ip_access', { ip: clientIP });
        return res.status(403).json({ error: 'Access denied' });
      }

      if (this.suspiciousIPs.has(clientIP)) {
        // Apply stricter rate limiting for suspicious IPs
        req.rateLimitFactor = 0.5; // Half the normal rate limit
      }

      next();
    };
  }

  getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
  }

  flagSuspiciousIP(ip) {
    this.suspiciousIPs.add(ip);
    
    // Auto-unblock after 1 hour
    setTimeout(() => {
      this.suspiciousIPs.delete(ip);
    }, 60 * 60 * 1000);
  }

  blockIP(ip, duration = 24 * 60 * 60 * 1000) {
    this.blockedIPs.add(ip);
    this.logSecurityEvent('ip_blocked', { ip, duration });
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      this.logSecurityEvent('ip_unblocked', { ip });
    }, duration);
  }

  logSuspiciousActivity(ip, activity) {
    console.warn(`⚠️ Suspicious activity from ${ip}: ${activity}`);
    
    // Implement your logging/alerting system here
    // e.g., send to security monitoring service
  }

  logSecurityEvent(event, data) {
    console.log(`🔒 Security event: ${event}`, data);
    
    // Implement security event logging
  }
}
```

### CORS Configuration

```javascript
// Secure CORS configuration
const cors = require('cors');

class CORSConfig {
  constructor() {
    this.allowedOrigins = this.getAllowedOrigins();
  }

  getAllowedOrigins() {
    const origins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://localhost:3000'
    ];

    // Add production domains
    if (process.env.NODE_ENV === 'production') {
      origins.push(
        process.env.PRODUCTION_DOMAIN,
        process.env.STAGING_DOMAIN
      );
    }

    return origins.filter(Boolean);
  }

  createCORSMiddleware() {
    return cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (this.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`⚠️ CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      
      credentials: true, // Allow cookies
      
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key'
      ],
      
      exposedHeaders: [
        'X-Total-Count',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset'
      ],
      
      optionsSuccessStatus: 200, // Support legacy browsers
      
      preflightContinue: false
    });
  }
}
```

## 🐳 Container Security

### Docker Security Best Practices

```dockerfile
# Secure Dockerfile configuration
FROM node:18-alpine AS base

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app

FROM base AS deps
# Install dependencies as root, then change ownership
COPY package*.json ./
RUN npm ci --only=production --omit=dev && \
    npm cache clean --force && \
    chown -R nodejs:nodejs /app

FROM base AS runtime
# Copy built application
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Security: Run with minimal privileges
RUN chmod 755 /app && \
    find /app -type f -exec chmod 644 {} \; && \
    find /app -type d -exec chmod 755 {} \;

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Don't run as PID 1
CMD ["node", "server.js"]
```

### Container Runtime Security

```yaml
# docker-compose.yml with security hardening
version: '3.8'

services:
  backend:
    build: .
    # Security options
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp:rw,size=100M
      - /app/logs:rw,size=50M
    
    # Capabilities
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    
    # Resource limits
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.5'
    
    # Environment security
    environment:
      - NODE_ENV=production
      - SECURE_MODE=true
    
    # Network security
    networks:
      - internal
    
    # Volume security
    volumes:
      - database:/app/database:rw
      - logs:/app/logs:rw
      - type: bind
        source: ./config
        target: /app/config
        read_only: true

networks:
  internal:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  database:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/lib/aaiti/database
  logs:
    driver: local
```

## 🔍 Security Monitoring

### Audit Logging

```javascript
// Comprehensive audit logging
class AuditLogger {
  constructor(db) {
    this.db = db;
    this.logQueue = [];
    this.batchSize = 100;
    this.flushInterval = 5000; // 5 seconds
    
    this.startBatchProcessing();
  }

  async logAction(userId, action, resourceType, resourceId, details = {}, req = null) {
    const logEntry = {
      id: crypto.randomUUID(),
      userId,
      action,
      resourceType,
      resourceId,
      details: JSON.stringify(details),
      ip: req ? this.getClientIP(req) : null,
      userAgent: req ? req.get('User-Agent') : null,
      timestamp: new Date().toISOString(),
      severity: this.determineSeverity(action)
    };

    this.logQueue.push(logEntry);

    // High-severity actions are logged immediately
    if (logEntry.severity === 'HIGH') {
      await this.flushLogs();
    }
  }

  determineSeverity(action) {
    const highSeverityActions = [
      'user_login_failed', 'user_deleted', 'admin_action',
      'security_violation', 'data_export', 'settings_changed'
    ];
    
    const mediumSeverityActions = [
      'user_login', 'user_logout', 'password_changed',
      'model_deleted', 'bot_created', 'bot_deleted'
    ];

    if (highSeverityActions.includes(action)) return 'HIGH';
    if (mediumSeverityActions.includes(action)) return 'MEDIUM';
    return 'LOW';
  }

  startBatchProcessing() {
    setInterval(() => {
      if (this.logQueue.length > 0) {
        this.flushLogs();
      }
    }, this.flushInterval);
  }

  async flushLogs() {
    if (this.logQueue.length === 0) return;

    const logsToFlush = this.logQueue.splice(0, this.batchSize);
    
    try {
      const placeholders = logsToFlush.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values = logsToFlush.flatMap(log => [
        log.id, log.userId, log.action, log.resourceType,
        log.resourceId, log.details, log.ip, log.userAgent, log.timestamp
      ]);

      await this.db.run(`
        INSERT INTO audit_logs (
          id, user_id, action, resource_type, resource_id,
          details, ip_address, user_agent, timestamp
        ) VALUES ${placeholders}
      `, values);

      // Alert on high-severity events
      logsToFlush
        .filter(log => log.severity === 'HIGH')
        .forEach(log => this.alertHighSeverityEvent(log));

    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Re-queue failed logs
      this.logQueue.unshift(...logsToFlush);
    }
  }

  alertHighSeverityEvent(logEntry) {
    console.warn('🚨 High-severity security event:', {
      action: logEntry.action,
      userId: logEntry.userId,
      ip: logEntry.ip,
      timestamp: logEntry.timestamp
    });

    // Implement alerting mechanism (email, Slack, etc.)
  }

  async generateSecurityReport(startDate, endDate) {
    const report = await this.db.all(`
      SELECT 
        action,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM audit_logs 
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY action
      ORDER BY count DESC
    `, [startDate, endDate]);

    return {
      period: { startDate, endDate },
      summary: report,
      suspiciousActivity: await this.detectSuspiciousActivity(startDate, endDate)
    };
  }

  async detectSuspiciousActivity(startDate, endDate) {
    // Multiple failed login attempts
    const failedLogins = await this.db.all(`
      SELECT ip_address, COUNT(*) as attempts
      FROM audit_logs 
      WHERE action = 'user_login_failed' 
        AND timestamp BETWEEN ? AND ?
      GROUP BY ip_address
      HAVING attempts > 10
      ORDER BY attempts DESC
    `, [startDate, endDate]);

    // Unusual activity patterns
    const unusualActivity = await this.db.all(`
      SELECT user_id, action, COUNT(*) as count
      FROM audit_logs 
      WHERE timestamp BETWEEN ? AND ?
        AND action IN ('model_deleted', 'bot_deleted', 'data_export')
      GROUP BY user_id, action
      HAVING count > 5
    `, [startDate, endDate]);

    return {
      multipleFailedLogins: failedLogins,
      unusualUserActivity: unusualActivity
    };
  }

  getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
  }
}
```

### Intrusion Detection

```javascript
// Simple intrusion detection system
class IntrusionDetectionSystem {
  constructor() {
    this.patterns = new Map();
    this.alerts = [];
    this.thresholds = {
      failedLogins: { count: 5, window: 300000 }, // 5 attempts in 5 minutes
      apiAbuse: { count: 1000, window: 60000 },   // 1000 requests in 1 minute
      suspiciousPayload: { count: 3, window: 300000 } // 3 malicious payloads in 5 minutes
    };
  }

  analyzeRequest(req, res, next) {
    const clientIP = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || '';
    const payload = JSON.stringify(req.body || {});

    // Check for suspicious patterns
    this.checkSuspiciousPayload(clientIP, payload);
    this.checkAPIAbuse(clientIP);
    this.checkUserAgent(clientIP, userAgent);

    next();
  }

  checkSuspiciousPayload(ip, payload) {
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,  // XSS attempts
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b)/gi, // SQL injection
      /(\.\.[\/\\]){2,}/g, // Directory traversal
      /(exec|system|eval|cmd)/gi, // Command injection
      /(<iframe|<object|<embed)/gi // Malicious embeds
    ];

    const matches = suspiciousPatterns.filter(pattern => pattern.test(payload));
    
    if (matches.length > 0) {
      this.recordPattern(ip, 'suspiciousPayload');
      this.createAlert('SUSPICIOUS_PAYLOAD', {
        ip,
        patterns: matches.length,
        payload: payload.substring(0, 200)
      });
    }
  }

  checkAPIAbuse(ip) {
    this.recordPattern(ip, 'apiRequest');
    
    const pattern = this.patterns.get(`${ip}:apiRequest`);
    if (pattern && pattern.count > this.thresholds.apiAbuse.count) {
      this.createAlert('API_ABUSE', {
        ip,
        requestCount: pattern.count,
        timeWindow: this.thresholds.apiAbuse.window
      });
    }
  }

  checkUserAgent(ip, userAgent) {
    const suspiciousAgents = [
      'sqlmap', 'nikto', 'nmap', 'masscan', 'zap',
      'burp', 'curl', 'wget', 'python-requests'
    ];

    const isSuspicious = suspiciousAgents.some(agent => 
      userAgent.toLowerCase().includes(agent)
    );

    if (isSuspicious) {
      this.createAlert('SUSPICIOUS_USER_AGENT', {
        ip,
        userAgent
      });
    }
  }

  recordFailedLogin(ip) {
    this.recordPattern(ip, 'failedLogin');
    
    const pattern = this.patterns.get(`${ip}:failedLogin`);
    if (pattern && pattern.count > this.thresholds.failedLogins.count) {
      this.createAlert('BRUTE_FORCE_ATTEMPT', {
        ip,
        attempts: pattern.count,
        timeWindow: this.thresholds.failedLogins.window
      });
    }
  }

  recordPattern(ip, patternType) {
    const key = `${ip}:${patternType}`;
    const now = Date.now();
    const threshold = this.thresholds[patternType];

    let pattern = this.patterns.get(key);
    if (!pattern) {
      pattern = { count: 0, firstSeen: now, lastSeen: now };
      this.patterns.set(key, pattern);
    }

    // Reset if outside time window
    if (now - pattern.firstSeen > threshold.window) {
      pattern.count = 0;
      pattern.firstSeen = now;
    }

    pattern.count++;
    pattern.lastSeen = now;
  }

  createAlert(type, data) {
    const alert = {
      id: crypto.randomUUID(),
      type,
      severity: this.getAlertSeverity(type),
      data,
      timestamp: new Date().toISOString(),
      status: 'OPEN'
    };

    this.alerts.push(alert);
    this.notifyAlert(alert);

    // Auto-block on critical alerts
    if (alert.severity === 'CRITICAL') {
      this.autoBlock(data.ip);
    }
  }

  getAlertSeverity(type) {
    const severityMap = {
      'BRUTE_FORCE_ATTEMPT': 'CRITICAL',
      'API_ABUSE': 'HIGH',
      'SUSPICIOUS_PAYLOAD': 'HIGH',
      'SUSPICIOUS_USER_AGENT': 'MEDIUM'
    };

    return severityMap[type] || 'LOW';
  }

  notifyAlert(alert) {
    console.warn(`🚨 Security Alert [${alert.severity}]: ${alert.type}`, alert.data);
    
    // Implement notification system (email, webhook, etc.)
    if (alert.severity === 'CRITICAL') {
      // Send immediate notification
      this.sendCriticalAlert(alert);
    }
  }

  autoBlock(ip) {
    // Add to blocked IPs list
    console.error(`🚫 Auto-blocking IP: ${ip}`);
    
    // Implement IP blocking logic
    // This could integrate with your SecurityMiddleware
  }

  getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
  }

  cleanup() {
    // Clean up old patterns and alerts
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean patterns
    for (const [key, pattern] of this.patterns.entries()) {
      if (now - pattern.lastSeen > maxAge) {
        this.patterns.delete(key);
      }
    }

    // Clean old alerts
    this.alerts = this.alerts.filter(alert => 
      now - new Date(alert.timestamp).getTime() < maxAge
    );
  }
}
```

## 🚨 Incident Response

### Security Incident Handling

```javascript
// Security incident response system
class IncidentResponse {
  constructor() {
    this.incidents = new Map();
    this.responseTeam = process.env.SECURITY_TEAM_EMAILS?.split(',') || [];
    this.webhookUrl = process.env.SECURITY_WEBHOOK_URL;
  }

  async handleSecurityIncident(type, severity, details) {
    const incident = {
      id: crypto.randomUUID(),
      type,
      severity,
      details,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      actions: [],
      assignee: null
    };

    this.incidents.set(incident.id, incident);

    // Immediate response actions
    await this.executeImmediateResponse(incident);

    // Notifications
    await this.notifySecurityTeam(incident);

    // Auto-escalation for critical incidents
    if (severity === 'CRITICAL') {
      await this.escalateIncident(incident.id);
    }

    return incident.id;
  }

  async executeImmediateResponse(incident) {
    const actions = [];

    switch (incident.type) {
      case 'BRUTE_FORCE_ATTACK':
        actions.push(await this.blockSuspiciousIPs(incident.details));
        actions.push(await this.enforceStrictRateLimit());
        break;

      case 'DATA_BREACH':
        actions.push(await this.enableEmergencyMode());
        actions.push(await this.revokeAllSessions());
        actions.push(await this.backupCurrentState());
        break;

      case 'MALICIOUS_PAYLOAD':
        actions.push(await this.blockAttackerIP(incident.details.ip));
        actions.push(await this.scanForCompromise());
        break;

      case 'PRIVILEGE_ESCALATION':
        actions.push(await this.auditUserPermissions());
        actions.push(await this.revokeUserSessions(incident.details.userId));
        break;
    }

    incident.actions = actions;
    this.updateIncident(incident.id, { actions });
  }

  async blockSuspiciousIPs(details) {
    // Block IPs involved in the incident
    const ipsToBlock = details.suspiciousIPs || [details.ip];
    
    for (const ip of ipsToBlock) {
      // Implement your IP blocking mechanism
      console.log(`🚫 Blocking IP: ${ip}`);
    }

    return {
      action: 'BLOCK_IPS',
      timestamp: new Date().toISOString(),
      details: { blockedIPs: ipsToBlock }
    };
  }

  async revokeAllSessions() {
    // Revoke all active sessions
    console.log('🔒 Revoking all active sessions');
    
    // Implement session revocation
    return {
      action: 'REVOKE_ALL_SESSIONS',
      timestamp: new Date().toISOString(),
      details: { sessionCount: 'all' }
    };
  }

  async enableEmergencyMode() {
    // Enable emergency read-only mode
    console.log('⚠️ Enabling emergency mode');
    
    // Implement emergency mode
    return {
      action: 'EMERGENCY_MODE',
      timestamp: new Date().toISOString(),
      details: { mode: 'read-only' }
    };
  }

  async notifySecurityTeam(incident) {
    const message = {
      incident_id: incident.id,
      type: incident.type,
      severity: incident.severity,
      details: incident.details,
      timestamp: incident.createdAt,
      immediate_actions: incident.actions?.length || 0
    };

    // Email notification
    if (this.responseTeam.length > 0) {
      await this.sendEmailAlert(message);
    }

    // Webhook notification
    if (this.webhookUrl) {
      await this.sendWebhookAlert(message);
    }

    // Console notification
    console.error(`🚨 SECURITY INCIDENT [${incident.severity}]: ${incident.type}`, message);
  }

  async sendEmailAlert(message) {
    // Implement email notification
    console.log('📧 Sending security alert email to team');
  }

  async sendWebhookAlert(message) {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AAITI-Security-System/1.0'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  async escalateIncident(incidentId) {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    incident.status = 'ESCALATED';
    incident.escalatedAt = new Date().toISOString();

    // Additional escalation actions
    console.error(`🔴 ESCALATING CRITICAL INCIDENT: ${incidentId}`);
    
    // Implement escalation procedures
    // - Page on-call engineer
    // - Create urgent ticket
    // - Notify management
  }

  updateIncident(incidentId, updates) {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      Object.assign(incident, updates);
      incident.updatedAt = new Date().toISOString();
    }
  }

  async closeIncident(incidentId, resolution) {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.status = 'CLOSED';
      incident.resolution = resolution;
      incident.closedAt = new Date().toISOString();
    }
  }

  getActiveIncidents() {
    return Array.from(this.incidents.values())
      .filter(incident => incident.status !== 'CLOSED');
  }

  generateIncidentReport(incidentId) {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    return {
      ...incident,
      duration: incident.closedAt ? 
        new Date(incident.closedAt) - new Date(incident.createdAt) : 
        Date.now() - new Date(incident.createdAt),
      timeline: this.buildTimeline(incident)
    };
  }

  buildTimeline(incident) {
    const timeline = [
      { time: incident.createdAt, event: 'Incident created', type: incident.type }
    ];

    if (incident.actions) {
      incident.actions.forEach(action => {
        timeline.push({
          time: action.timestamp,
          event: `Action taken: ${action.action}`,
          details: action.details
        });
      });
    }

    if (incident.escalatedAt) {
      timeline.push({
        time: incident.escalatedAt,
        event: 'Incident escalated',
        severity: 'CRITICAL'
      });
    }

    if (incident.closedAt) {
      timeline.push({
        time: incident.closedAt,
        event: 'Incident closed',
        resolution: incident.resolution
      });
    }

    return timeline.sort((a, b) => new Date(a.time) - new Date(b.time));
  }
}
```

## 📋 Security Checklist

### Pre-Deployment Security Checklist

```markdown
## Environment Security
- [ ] All secrets stored in environment variables, not code
- [ ] Strong JWT secret key configured (64+ characters)
- [ ] Database encryption key configured
- [ ] HTTPS/TLS certificates installed and valid
- [ ] Firewall rules configured properly
- [ ] Non-standard ports for sensitive services

## Application Security
- [ ] All user input validated and sanitized
- [ ] SQL injection protection enabled
- [ ] XSS protection implemented
- [ ] CSRF protection enabled where needed
- [ ] Rate limiting configured for all endpoints
- [ ] Authentication required for all sensitive operations
- [ ] Role-based access control implemented
- [ ] Session management secure (timeouts, revocation)

## Container Security
- [ ] Running as non-root user
- [ ] Minimal base images used
- [ ] No secrets in Docker images
- [ ] Read-only file system where possible
- [ ] Security scanning completed
- [ ] Resource limits configured
- [ ] Health checks implemented

## Network Security
- [ ] HTTPS enforced (HSTS headers)
- [ ] Secure CORS policy configured
- [ ] Rate limiting and DDoS protection
- [ ] VPN or private networks for sensitive access
- [ ] Network segmentation implemented
- [ ] Intrusion detection system active

## Monitoring & Logging
- [ ] Comprehensive audit logging enabled
- [ ] Security event monitoring configured
- [ ] Log aggregation and analysis setup
- [ ] Alerting for security events
- [ ] Incident response procedures documented
- [ ] Security metrics tracked

## Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] Encryption in transit (TLS)
- [ ] Data backup encryption
- [ ] Data retention policies defined
- [ ] GDPR/privacy compliance addressed
- [ ] Secure data deletion procedures

## Access Control
- [ ] Strong password policies enforced
- [ ] Multi-factor authentication where applicable
- [ ] Regular access reviews scheduled
- [ ] Principle of least privilege applied
- [ ] Service accounts properly managed
- [ ] Emergency access procedures defined
```

---

**Security Resources:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Web application security risks
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/) - Node.js specific security
- [Docker Security](https://docs.docker.com/engine/security/) - Container security best practices
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework) - Comprehensive security framework

**Next Steps:**
- Review [Performance Guide](performance.md) for security-performance balance
- Check [Docker Guide](docker.md) for container security implementation
- See [Architecture Overview](architecture.md) for security architecture details