const validator = require('validator');
const logger = require('../utils/logger');

/**
 * Input Canonicalization and Injection Prevention Middleware
 * Normalizes and validates all input data to prevent injection attacks
 */
class InputCanonicalizationMiddleware {
  constructor() {
    this.suspiciousPatterns = [
      // SQL Injection patterns
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(\b(or|and)\s+\d+\s*=\s*\d+)/gi,
      /(--|#|\/\*|\*\/)/g,
      
      // NoSQL Injection patterns
      /(\$where|\$ne|\$gt|\$lt|\$regex)/gi,
      
      // XSS patterns
      /(<script|<\/script|javascript:|vbscript:|onload=|onerror=)/gi,
      /<[^>]*>/g, // HTML tags
      
      // Command Injection patterns
      /(;|\||&|\$\(|\`)/g,
      /(\b(cat|ls|pwd|whoami|id|uname|wget|curl|nc|netcat)\b)/gi,
      
      // Path traversal
      /(\.\.\/|\.\.\\|\.\.\%2f|\.\.\%5c)/gi,
      
      // LDAP Injection
      /(\(|\)|&|\||\*)/g,
      
      // Format string attacks
      /(%[ds]|%[0-9]+\$[ds])/g
    ];

    this.maxStringLength = 10000;
    this.maxArrayLength = 1000;
    this.maxObjectDepth = 10;
  }

  /**
   * Canonicalize string input
   */
  canonicalizeString(input, options = {}) {
    try {
      if (typeof input !== 'string') {
        return input;
      }

      let canonicalized = input;

      // Basic normalization
      if (options.trim !== false) {
        canonicalized = canonicalized.trim();
      }

      if (options.toLowerCase) {
        canonicalized = canonicalized.toLowerCase();
      }

      // Remove null bytes
      canonicalized = canonicalized.replace(/\0/g, '');

      // Normalize Unicode
      canonicalized = canonicalized.normalize('NFC');

      // HTML entity decode (but not encode to prevent double encoding)
      canonicalized = validator.unescape(canonicalized);

      // Validate length
      if (canonicalized.length > this.maxStringLength) {
        throw new Error(`String too long: ${canonicalized.length} > ${this.maxStringLength}`);
      }

      return canonicalized;

    } catch (error) {
      logger.error('String canonicalization error:', error);
      throw new Error('Input canonicalization failed');
    }
  }

  /**
   * Validate input against suspicious patterns
   */
  validateAgainstInjection(input, fieldName = 'unknown') {
    try {
      if (typeof input !== 'string') {
        return { valid: true };
      }

      const detectedPatterns = [];

      for (let i = 0; i < this.suspiciousPatterns.length; i++) {
        const pattern = this.suspiciousPatterns[i];
        if (pattern.test(input)) {
          detectedPatterns.push({
            pattern: pattern.toString(),
            matches: input.match(pattern)
          });
        }
      }

      if (detectedPatterns.length > 0) {
        logger.warn('Suspicious input detected', {
          fieldName,
          input: input.substring(0, 100), // Log first 100 chars only
          patterns: detectedPatterns.map(p => p.pattern)
        });

        return {
          valid: false,
          reason: 'Suspicious patterns detected',
          detectedPatterns: detectedPatterns.map(p => p.pattern)
        };
      }

      return { valid: true };

    } catch (error) {
      logger.error('Injection validation error:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Canonicalize object recursively
   */
  canonicalizeObject(obj, depth = 0, options = {}) {
    try {
      if (depth > this.maxObjectDepth) {
        throw new Error(`Object depth too deep: ${depth} > ${this.maxObjectDepth}`);
      }

      if (obj === null || obj === undefined) {
        return obj;
      }

      if (typeof obj === 'string') {
        return this.canonicalizeString(obj, options);
      }

      if (typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
      }

      if (Array.isArray(obj)) {
        if (obj.length > this.maxArrayLength) {
          throw new Error(`Array too long: ${obj.length} > ${this.maxArrayLength}`);
        }

        return obj.map(item => this.canonicalizeObject(item, depth + 1, options));
      }

      if (typeof obj === 'object') {
        const canonicalized = {};
        const keys = Object.keys(obj);

        if (keys.length > this.maxArrayLength) {
          throw new Error(`Too many object keys: ${keys.length} > ${this.maxArrayLength}`);
        }

        for (const key of keys) {
          const canonicalizedKey = this.canonicalizeString(key, options);
          canonicalized[canonicalizedKey] = this.canonicalizeObject(obj[key], depth + 1, options);
        }

        return canonicalized;
      }

      return obj;

    } catch (error) {
      logger.error('Object canonicalization error:', error);
      throw new Error('Input canonicalization failed');
    }
  }

  /**
   * Validate entire object against injection patterns
   */
  validateObjectAgainstInjection(obj, path = '') {
    try {
      const issues = [];

      if (typeof obj === 'string') {
        const validation = this.validateAgainstInjection(obj, path);
        if (!validation.valid) {
          issues.push({
            path,
            reason: validation.reason,
            patterns: validation.detectedPatterns
          });
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const itemIssues = this.validateObjectAgainstInjection(item, `${path}[${index}]`);
          issues.push(...itemIssues);
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => {
          const keyPath = path ? `${path}.${key}` : key;
          
          // Validate key itself
          const keyValidation = this.validateAgainstInjection(key, `${keyPath}(key)`);
          if (!keyValidation.valid) {
            issues.push({
              path: `${keyPath}(key)`,
              reason: keyValidation.reason,
              patterns: keyValidation.detectedPatterns
            });
          }

          // Validate value
          const valueIssues = this.validateObjectAgainstInjection(obj[key], keyPath);
          issues.push(...valueIssues);
        });
      }

      return issues;

    } catch (error) {
      logger.error('Object injection validation error:', error);
      return [{ path, reason: 'Validation error', error: error.message }];
    }
  }

  /**
   * Express middleware for input canonicalization
   */
  canonicalize(options = {}) {
    return (req, res, next) => {
      try {
        // Canonicalize request body
        if (req.body) {
          req.body = this.canonicalizeObject(req.body, 0, options);
        }

        // Canonicalize query parameters
        if (req.query) {
          req.query = this.canonicalizeObject(req.query, 0, options);
        }

        // Canonicalize route parameters
        if (req.params) {
          req.params = this.canonicalizeObject(req.params, 0, options);
        }

        next();

      } catch (error) {
        logger.error('Input canonicalization middleware error:', error);
        res.status(400).json({
          success: false,
          error: 'Input canonicalization failed',
          code: 'INPUT_CANONICALIZATION_ERROR',
          message: error.message
        });
      }
    };
  }

  /**
   * Express middleware for injection prevention
   */
  preventInjection() {
    return (req, res, next) => {
      try {
        const issues = [];

        // Validate request body
        if (req.body) {
          const bodyIssues = this.validateObjectAgainstInjection(req.body, 'body');
          issues.push(...bodyIssues);
        }

        // Validate query parameters
        if (req.query) {
          const queryIssues = this.validateObjectAgainstInjection(req.query, 'query');
          issues.push(...queryIssues);
        }

        // Validate route parameters
        if (req.params) {
          const paramIssues = this.validateObjectAgainstInjection(req.params, 'params');
          issues.push(...paramIssues);
        }

        if (issues.length > 0) {
          logger.warn('Injection attempt detected', {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            issues: issues.slice(0, 5) // Log first 5 issues only
          });

          return res.status(400).json({
            success: false,
            error: 'Potentially malicious input detected',
            code: 'INJECTION_DETECTED',
            issues: issues.map(issue => ({
              path: issue.path,
              reason: issue.reason
            }))
          });
        }

        next();

      } catch (error) {
        logger.error('Injection prevention middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Input validation failed',
          code: 'INPUT_VALIDATION_ERROR'
        });
      }
    };
  }

  /**
   * Combined middleware for canonicalization and injection prevention
   */
  secureInput(options = {}) {
    return [
      this.canonicalize(options),
      this.preventInjection()
    ];
  }

  /**
   * Fuzz testing - generate malicious inputs for testing
   */
  generateFuzzInputs() {
    return {
      sqlInjection: [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "' UNION SELECT * FROM users --",
        "1; UPDATE users SET password='hacked' WHERE id=1; --"
      ],
      xss: [
        "<script>alert('XSS')</script>",
        "javascript:alert('XSS')",
        "<img src=x onerror=alert('XSS')>",
        "<iframe src=javascript:alert('XSS')></iframe>",
        "onload=alert('XSS')"
      ],
      commandInjection: [
        "; ls -la",
        "| cat /etc/passwd",
        "&& rm -rf /",
        "`whoami`",
        "$(cat /etc/passwd)"
      ],
      pathTraversal: [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\config\\sam",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        "....//....//....//etc/passwd"
      ],
      nosqlInjection: [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$where": "this.username == this.password"}',
        '{"$regex": ".*"}'
      ]
    };
  }

  /**
   * Run fuzz tests against the validation system
   */
  runFuzzTests() {
    const fuzzInputs = this.generateFuzzInputs();
    const results = {
      total: 0,
      blocked: 0,
      passed: 0,
      details: []
    };

    Object.entries(fuzzInputs).forEach(([category, inputs]) => {
      inputs.forEach(input => {
        results.total++;
        const validation = this.validateAgainstInjection(input, 'fuzz-test');
        
        if (!validation.valid) {
          results.blocked++;
          results.details.push({
            category,
            input,
            status: 'BLOCKED',
            reason: validation.reason
          });
        } else {
          results.passed++;
          results.details.push({
            category,
            input,
            status: 'PASSED'
          });
        }
      });
    });

    logger.info('Fuzz test results', {
      total: results.total,
      blocked: results.blocked,
      passed: results.passed,
      blockRate: `${((results.blocked / results.total) * 100).toFixed(2)}%`
    });

    return results;
  }
}

// Create singleton instance
const inputCanonicalization = new InputCanonicalizationMiddleware();

// Add middleware method and aliases
inputCanonicalization.middleware = inputCanonicalization.canonicalize.bind(inputCanonicalization);
inputCanonicalization.canonicalizeInput = inputCanonicalization.canonicalizeObject.bind(inputCanonicalization);
inputCanonicalization.detectSuspiciousPatterns = inputCanonicalization.validateAgainstInjection.bind(inputCanonicalization);

module.exports = {
  InputCanonicalizationMiddleware,
  inputCanonicalizer: inputCanonicalization,
  canonicalize: (options) => inputCanonicalization.canonicalize(options),
  preventInjection: () => inputCanonicalization.preventInjection(),
  secureInput: (options) => inputCanonicalization.secureInput(options)
};