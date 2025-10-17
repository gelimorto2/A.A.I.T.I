/**
 * HMAC Signing Service Tests
 * Comprehensive test suite for replay attack prevention
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { getInstance } = require('../../services/hmacSigningService');

describe('HMAC Signing Service', function() {
  let hmacService;
  let clock;

  beforeEach(() => {
    hmacService = getInstance();
    hmacService.clear(); // Clear nonce store
  });

  afterEach(() => {
    if (clock) {
      clock.restore();
    }
  });

  describe('Signature Generation', () => {
    const secret = 'test-secret-key';

    it('should generate HMAC signature', () => {
      const params = {
        method: 'POST',
        path: '/api/trades',
        body: { symbol: 'BTC', quantity: 1 },
        timestamp: '2025-10-17T10:00:00.000Z',
        nonce: 'unique-nonce-123'
      };

      const signature = hmacService.generateSignature(params, secret);

      expect(signature).to.be.a('string');
      expect(signature).to.have.lengthOf(64); // SHA256 hex = 64 chars
    });

    it('should generate consistent signatures for same input', () => {
      const params = {
        method: 'POST',
        path: '/api/trades',
        body: { symbol: 'BTC', quantity: 1 },
        timestamp: '2025-10-17T10:00:00.000Z',
        nonce: 'unique-nonce-123'
      };

      const signature1 = hmacService.generateSignature(params, secret);
      const signature2 = hmacService.generateSignature(params, secret);

      expect(signature1).to.equal(signature2);
    });

    it('should generate different signatures for different methods', () => {
      const baseParams = {
        path: '/api/trades',
        body: { symbol: 'BTC' },
        timestamp: '2025-10-17T10:00:00.000Z',
        nonce: 'nonce-123'
      };

      const sig1 = hmacService.generateSignature({ ...baseParams, method: 'POST' }, secret);
      const sig2 = hmacService.generateSignature({ ...baseParams, method: 'PUT' }, secret);

      expect(sig1).to.not.equal(sig2);
    });

    it('should generate different signatures for different paths', () => {
      const baseParams = {
        method: 'POST',
        body: { symbol: 'BTC' },
        timestamp: '2025-10-17T10:00:00.000Z',
        nonce: 'nonce-123'
      };

      const sig1 = hmacService.generateSignature({ ...baseParams, path: '/api/trades' }, secret);
      const sig2 = hmacService.generateSignature({ ...baseParams, path: '/api/orders' }, secret);

      expect(sig1).to.not.equal(sig2);
    });

    it('should generate different signatures for different bodies', () => {
      const baseParams = {
        method: 'POST',
        path: '/api/trades',
        timestamp: '2025-10-17T10:00:00.000Z',
        nonce: 'nonce-123'
      };

      const sig1 = hmacService.generateSignature({ ...baseParams, body: { symbol: 'BTC' } }, secret);
      const sig2 = hmacService.generateSignature({ ...baseParams, body: { symbol: 'ETH' } }, secret);

      expect(sig1).to.not.equal(sig2);
    });

    it('should generate different signatures for different timestamps', () => {
      const baseParams = {
        method: 'POST',
        path: '/api/trades',
        body: { symbol: 'BTC' },
        nonce: 'nonce-123'
      };

      const sig1 = hmacService.generateSignature({ ...baseParams, timestamp: '2025-10-17T10:00:00Z' }, secret);
      const sig2 = hmacService.generateSignature({ ...baseParams, timestamp: '2025-10-17T10:01:00Z' }, secret);

      expect(sig1).to.not.equal(sig2);
    });

    it('should generate different signatures for different nonces', () => {
      const baseParams = {
        method: 'POST',
        path: '/api/trades',
        body: { symbol: 'BTC' },
        timestamp: '2025-10-17T10:00:00.000Z'
      };

      const sig1 = hmacService.generateSignature({ ...baseParams, nonce: 'nonce-1' }, secret);
      const sig2 = hmacService.generateSignature({ ...baseParams, nonce: 'nonce-2' }, secret);

      expect(sig1).to.not.equal(sig2);
    });

    it('should throw error for missing parameters', () => {
      expect(() => {
        hmacService.generateSignature({}, secret);
      }).to.throw('Missing required parameters');
    });

    it('should throw error for missing secret', () => {
      const params = {
        method: 'POST',
        path: '/api/trades',
        body: {},
        timestamp: '2025-10-17T10:00:00.000Z',
        nonce: 'nonce-123'
      };

      expect(() => {
        hmacService.generateSignature(params, null);
      }).to.throw('Secret key is required');
    });
  });

  describe('Signature Verification', () => {
    const secret = 'test-secret-key';

    it('should verify valid signature', () => {
      const params = {
        method: 'POST',
        path: '/api/trades',
        body: { symbol: 'BTC' },
        timestamp: new Date().toISOString(),
        nonce: 'unique-nonce-valid'
      };

      const signature = hmacService.generateSignature(params, secret);

      const result = hmacService.verifySignature(
        { ...params, signature },
        secret
      );

      expect(result.valid).to.be.true;
    });

    it('should reject invalid signature', () => {
      const params = {
        method: 'POST',
        path: '/api/trades',
        body: { symbol: 'BTC' },
        timestamp: new Date().toISOString(),
        nonce: 'unique-nonce-invalid'
      };

      const result = hmacService.verifySignature(
        { ...params, signature: 'invalid-signature' },
        secret
      );

      expect(result.valid).to.be.false;
      expect(result.code).to.equal('INVALID_SIGNATURE');
    });

    it('should reject missing signature', () => {
      const params = {
        method: 'POST',
        path: '/api/trades',
        body: { symbol: 'BTC' },
        timestamp: new Date().toISOString(),
        nonce: 'nonce-123'
      };

      const result = hmacService.verifySignature(params, secret);

      expect(result.valid).to.be.false;
      expect(result.code).to.equal('MISSING_SIGNATURE');
    });
  });

  describe('Timestamp Validation', () => {
    it('should accept recent timestamp', () => {
      const timestamp = new Date().toISOString();

      const result = hmacService.validateTimestamp(timestamp);

      expect(result.valid).to.be.true;
    });

    it('should reject expired timestamp', () => {
      // 10 minutes ago (beyond 5-minute window)
      const timestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const result = hmacService.validateTimestamp(timestamp);

      expect(result.valid).to.be.false;
      expect(result.code).to.equal('TIMESTAMP_EXPIRED');
    });

    it('should reject future timestamp', () => {
      // 2 minutes in future (beyond 1-minute tolerance)
      const timestamp = new Date(Date.now() + 2 * 60 * 1000).toISOString();

      const result = hmacService.validateTimestamp(timestamp);

      expect(result.valid).to.be.false;
      expect(result.code).to.equal('TIMESTAMP_FUTURE');
    });

    it('should reject missing timestamp', () => {
      const result = hmacService.validateTimestamp(null);

      expect(result.valid).to.be.false;
      expect(result.code).to.equal('MISSING_TIMESTAMP');
    });

    it('should reject invalid timestamp format', () => {
      const result = hmacService.validateTimestamp('invalid-date');

      expect(result.valid).to.be.false;
      expect(result.code).to.equal('INVALID_TIMESTAMP');
    });

    it('should accept timestamp within 5-minute window', () => {
      // 4 minutes ago (within window)
      const timestamp = new Date(Date.now() - 4 * 60 * 1000).toISOString();

      const result = hmacService.validateTimestamp(timestamp);

      expect(result.valid).to.be.true;
    });
  });

  describe('Nonce Validation', () => {
    it('should accept new nonce', () => {
      const nonce = 'unique-nonce-new';

      const result = hmacService.validateNonce(nonce);

      expect(result.valid).to.be.true;
    });

    it('should reject reused nonce', () => {
      const nonce = 'unique-nonce-reused';
      const timestamp = new Date().toISOString();

      // Mark nonce as used
      hmacService.markNonceUsed(nonce, timestamp);

      // Try to use again
      const result = hmacService.validateNonce(nonce);

      expect(result.valid).to.be.false;
      expect(result.code).to.equal('NONCE_REUSED');
    });

    it('should reject missing nonce', () => {
      const result = hmacService.validateNonce(null);

      expect(result.valid).to.be.false;
      expect(result.code).to.equal('MISSING_NONCE');
    });
  });

  describe('Replay Attack Prevention', () => {
    const secret = 'test-secret-key';

    it('should prevent replay attack with same signature', () => {
      const params = {
        method: 'POST',
        path: '/api/trades',
        body: { symbol: 'BTC', quantity: 1 },
        timestamp: new Date().toISOString(),
        nonce: 'replay-nonce'
      };

      const signature = hmacService.generateSignature(params, secret);

      // First request should succeed
      const result1 = hmacService.verifySignature({ ...params, signature }, secret);
      expect(result1.valid).to.be.true;

      // Second request with same nonce should fail
      const result2 = hmacService.verifySignature({ ...params, signature }, secret);
      expect(result2.valid).to.be.false;
      expect(result2.code).to.equal('NONCE_REUSED');
    });

    it('should allow different nonces for similar requests', () => {
      const baseParams = {
        method: 'POST',
        path: '/api/trades',
        body: { symbol: 'BTC', quantity: 1 },
        timestamp: new Date().toISOString()
      };

      // First request
      const params1 = { ...baseParams, nonce: 'nonce-1' };
      const sig1 = hmacService.generateSignature(params1, secret);
      const result1 = hmacService.verifySignature({ ...params1, signature: sig1 }, secret);

      // Second request with different nonce
      const params2 = { ...baseParams, nonce: 'nonce-2' };
      const sig2 = hmacService.generateSignature(params2, secret);
      const result2 = hmacService.verifySignature({ ...params2, signature: sig2 }, secret);

      expect(result1.valid).to.be.true;
      expect(result2.valid).to.be.true;
    });
  });

  describe('JSON Canonicalization', () => {
    it('should canonicalize JSON with sorted keys', () => {
      const obj = { z: 1, a: 2, m: 3 };
      const canonical = hmacService.canonicalizeJSON(obj);

      expect(canonical).to.equal('{"a":2,"m":3,"z":1}');
    });

    it('should handle nested objects', () => {
      const obj = {
        outer: { z: 1, a: 2 },
        first: 'value'
      };

      const canonical = hmacService.canonicalizeJSON(obj);

      expect(canonical).to.include('"first":"value"');
      expect(canonical).to.include('"outer"');
    });

    it('should handle arrays', () => {
      const obj = { items: [1, 2, 3] };
      const canonical = hmacService.canonicalizeJSON(obj);

      expect(canonical).to.equal('{"items":[1,2,3]}');
    });

    it('should handle null and undefined', () => {
      expect(hmacService.canonicalizeJSON(null)).to.equal('');
      expect(hmacService.canonicalizeJSON(undefined)).to.equal('');
    });
  });

  describe('Constant-Time Comparison', () => {
    it('should return true for equal strings', () => {
      const result = hmacService.constantTimeCompare('test', 'test');
      expect(result).to.be.true;
    });

    it('should return false for different strings', () => {
      const result = hmacService.constantTimeCompare('test', 'fail');
      expect(result).to.be.false;
    });

    it('should return false for different lengths', () => {
      const result = hmacService.constantTimeCompare('test', 'testing');
      expect(result).to.be.false;
    });

    it('should return false for non-strings', () => {
      const result = hmacService.constantTimeCompare('test', 123);
      expect(result).to.be.false;
    });
  });

  describe('Nonce Generation', () => {
    it('should generate random nonce', () => {
      const nonce = hmacService.generateNonce();

      expect(nonce).to.be.a('string');
      expect(nonce).to.have.lengthOf(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique nonces', () => {
      const nonce1 = hmacService.generateNonce();
      const nonce2 = hmacService.generateNonce();

      expect(nonce1).to.not.equal(nonce2);
    });

    it('should respect custom length', () => {
      const nonce = hmacService.generateNonce(16);

      expect(nonce).to.have.lengthOf(32); // 16 bytes = 32 hex chars
    });
  });

  describe('Nonce Cleanup', () => {
    it('should clean up expired nonces', () => {
      clock = sinon.useFakeTimers(new Date('2025-10-17T10:00:00Z'));

      const nonce = 'cleanup-nonce';
      const timestamp = '2025-10-17T09:50:00Z'; // 10 minutes ago

      hmacService.markNonceUsed(nonce, timestamp);
      expect(hmacService.nonceStore.size).to.equal(1);

      // Advance time by 11 minutes
      clock.tick(11 * 60 * 1000);

      hmacService.cleanup();

      expect(hmacService.nonceStore.size).to.equal(0);
    });

    it('should keep active nonces', () => {
      const nonce = 'active-nonce';
      const timestamp = new Date().toISOString();

      hmacService.markNonceUsed(nonce, timestamp);
      expect(hmacService.nonceStore.size).to.equal(1);

      hmacService.cleanup();

      expect(hmacService.nonceStore.size).to.equal(1);
    });
  });

  describe('Statistics', () => {
    it('should return statistics', () => {
      const stats = hmacService.getStatistics();

      expect(stats).to.have.property('activeNonces');
      expect(stats).to.have.property('timestampWindow');
      expect(stats).to.have.property('cleanupInterval');
      expect(stats.timestampWindow).to.equal(300); // 5 minutes in seconds
    });
  });

  describe('Clear', () => {
    it('should clear all nonces', () => {
      const nonce = 'clear-nonce';
      const timestamp = new Date().toISOString();

      hmacService.markNonceUsed(nonce, timestamp);
      expect(hmacService.nonceStore.size).to.equal(1);

      hmacService.clear();

      expect(hmacService.nonceStore.size).to.equal(0);
    });
  });
});
