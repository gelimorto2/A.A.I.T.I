/**
 * HMAC Middleware Tests
 * Tests for Express middleware integration
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { verifyHMAC, requireTradeSignature, generateSignatureHeaders } = require('../../middleware/hmac');
const { getInstance } = require('../../services/hmacSigningService');

describe('HMAC Middleware', function() {
  let req, res, next;
  let hmacService;

  beforeEach(() => {
    hmacService = getInstance();
    hmacService.clear();

    req = {
      method: 'POST',
      path: '/api/trades',
      body: { symbol: 'BTC', quantity: 1 },
      headers: {},
      user: null
    };

    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis()
    };

    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('verifyHMAC Middleware', () => {
    const secret = 'test-secret-key';

    it('should accept valid HMAC signature', async () => {
      const timestamp = new Date().toISOString();
      const nonce = hmacService.generateNonce();
      const signature = hmacService.generateSignature(
        {
          method: req.method,
          path: req.path,
          body: req.body,
          timestamp,
          nonce
        },
        secret
      );

      req.headers = {
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature
      };

      req.user = { apiSecret: secret };

      const middleware = verifyHMAC();
      await middleware(req, res, next);

      expect(next.called).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should reject missing timestamp header', async () => {
      req.headers = {
        'x-nonce': 'nonce-123',
        'x-signature': 'signature-123'
      };

      const middleware = verifyHMAC();
      await middleware(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith(sinon.match({
        code: 'MISSING_HMAC_HEADERS'
      }))).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should reject missing nonce header', async () => {
      req.headers = {
        'x-timestamp': new Date().toISOString(),
        'x-signature': 'signature-123'
      };

      const middleware = verifyHMAC();
      await middleware(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should reject missing signature header', async () => {
      req.headers = {
        'x-timestamp': new Date().toISOString(),
        'x-nonce': 'nonce-123'
      };

      const middleware = verifyHMAC();
      await middleware(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should reject invalid signature', async () => {
      req.headers = {
        'x-timestamp': new Date().toISOString(),
        'x-nonce': hmacService.generateNonce(),
        'x-signature': 'invalid-signature'
      };

      req.user = { apiSecret: secret };

      const middleware = verifyHMAC();
      await middleware(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledWith(sinon.match({
        code: 'INVALID_SIGNATURE'
      }))).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should reject expired timestamp', async () => {
      // 10 minutes ago
      const timestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const nonce = hmacService.generateNonce();
      const signature = hmacService.generateSignature(
        {
          method: req.method,
          path: req.path,
          body: req.body,
          timestamp,
          nonce
        },
        secret
      );

      req.headers = {
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature
      };

      req.user = { apiSecret: secret };

      const middleware = verifyHMAC();
      await middleware(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledWith(sinon.match({
        code: 'TIMESTAMP_EXPIRED'
      }))).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should reject reused nonce (replay attack)', async () => {
      const timestamp = new Date().toISOString();
      const nonce = hmacService.generateNonce();
      const signature = hmacService.generateSignature(
        {
          method: req.method,
          path: req.path,
          body: req.body,
          timestamp,
          nonce
        },
        secret
      );

      req.headers = {
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature
      };

      req.user = { apiSecret: secret };

      const middleware = verifyHMAC();

      // First request should succeed
      await middleware(req, res, next);
      expect(next.calledOnce).to.be.true;

      // Reset stubs
      next.reset();
      res.status.reset();
      res.json.reset();

      // Second request with same nonce should fail
      await middleware(req, res, next);
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledWith(sinon.match({
        code: 'NONCE_REUSED'
      }))).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should use custom getSecret function', async () => {
      const timestamp = new Date().toISOString();
      const nonce = hmacService.generateNonce();
      const signature = hmacService.generateSignature(
        {
          method: req.method,
          path: req.path,
          body: req.body,
          timestamp,
          nonce
        },
        secret
      );

      req.headers = {
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature
      };

      const getSecret = sinon.stub().resolves(secret);

      const middleware = verifyHMAC({ getSecret });
      await middleware(req, res, next);

      expect(getSecret.calledOnce).to.be.true;
      expect(next.called).to.be.true;
    });

    it('should handle getSecret error', async () => {
      req.headers = {
        'x-timestamp': new Date().toISOString(),
        'x-nonce': hmacService.generateNonce(),
        'x-signature': 'signature'
      };

      const getSecret = sinon.stub().rejects(new Error('Database error'));

      const middleware = verifyHMAC({ getSecret });
      await middleware(req, res, next);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith(sinon.match({
        code: 'SECRET_RETRIEVAL_ERROR'
      }))).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should handle missing API secret', async () => {
      req.headers = {
        'x-timestamp': new Date().toISOString(),
        'x-nonce': hmacService.generateNonce(),
        'x-signature': 'signature'
      };

      req.user = {}; // No apiSecret

      const middleware = verifyHMAC();
      await middleware(req, res, next);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith(sinon.match({
        code: 'SECRET_NOT_CONFIGURED'
      }))).to.be.true;
      expect(next.called).to.be.false;
    });
  });

  describe('requireTradeSignature Middleware', () => {
    it('should require authentication', async () => {
      req.headers = {
        'x-timestamp': new Date().toISOString(),
        'x-nonce': hmacService.generateNonce(),
        'x-signature': 'signature'
      };

      // No user authenticated
      req.user = null;

      await requireTradeSignature(req, res, next);

      expect(res.status.calledWith(500)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should require API secret configured', async () => {
      req.headers = {
        'x-timestamp': new Date().toISOString(),
        'x-nonce': hmacService.generateNonce(),
        'x-signature': 'signature'
      };

      req.user = { id: 1 }; // No apiSecret

      await requireTradeSignature(req, res, next);

      expect(res.status.calledWith(500)).to.be.true;
      expect(next.called).to.be.false;
    });
  });

  describe('generateSignatureHeaders', () => {
    const secret = 'test-secret';

    it('should generate signature headers', () => {
      const params = {
        method: 'POST',
        path: '/api/trades',
        body: { symbol: 'BTC' }
      };

      const headers = generateSignatureHeaders(params, secret);

      expect(headers).to.have.property('X-Timestamp');
      expect(headers).to.have.property('X-Nonce');
      expect(headers).to.have.property('X-Signature');
    });

    it('should generate valid signature', () => {
      const params = {
        method: 'POST',
        path: '/api/trades',
        body: { symbol: 'BTC' }
      };

      const headers = generateSignatureHeaders(params, secret);

      // Verify signature is valid
      const verification = hmacService.verifySignature(
        {
          method: params.method,
          path: params.path,
          body: params.body,
          timestamp: headers['X-Timestamp'],
          nonce: headers['X-Nonce'],
          signature: headers['X-Signature']
        },
        secret
      );

      expect(verification.valid).to.be.true;
    });
  });

  describe('Integration Scenarios', () => {
    const secret = 'integration-test-secret';

    it('should handle POST request with body', async () => {
      const body = { symbol: 'ETH', quantity: 5, price: 2000 };
      req.body = body;

      const timestamp = new Date().toISOString();
      const nonce = hmacService.generateNonce();
      const signature = hmacService.generateSignature(
        {
          method: req.method,
          path: req.path,
          body,
          timestamp,
          nonce
        },
        secret
      );

      req.headers = {
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature
      };

      req.user = { apiSecret: secret };

      const middleware = verifyHMAC();
      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });

    it('should handle GET request without body', async () => {
      req.method = 'GET';
      req.path = '/api/orders/123';
      req.body = null;

      const timestamp = new Date().toISOString();
      const nonce = hmacService.generateNonce();
      const signature = hmacService.generateSignature(
        {
          method: req.method,
          path: req.path,
          body: null,
          timestamp,
          nonce
        },
        secret
      );

      req.headers = {
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature
      };

      req.user = { apiSecret: secret };

      const middleware = verifyHMAC();
      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });

    it('should handle complex nested body', async () => {
      const body = {
        strategy: {
          name: 'Test Strategy',
          parameters: {
            stopLoss: 0.02,
            takeProfit: 0.05,
            indicators: ['RSI', 'MACD']
          }
        }
      };

      req.body = body;

      const timestamp = new Date().toISOString();
      const nonce = hmacService.generateNonce();
      const signature = hmacService.generateSignature(
        {
          method: req.method,
          path: req.path,
          body,
          timestamp,
          nonce
        },
        secret
      );

      req.headers = {
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature
      };

      req.user = { apiSecret: secret };

      const middleware = verifyHMAC();
      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware exceptions', async () => {
      req.headers = {
        'x-timestamp': new Date().toISOString(),
        'x-nonce': hmacService.generateNonce(),
        'x-signature': 'sig'
      };

      // Force an error by making getSecret throw
      const getSecret = sinon.stub().throws(new Error('Unexpected error'));

      const middleware = verifyHMAC({ getSecret });
      await middleware(req, res, next);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith(sinon.match({
        code: 'SECRET_RETRIEVAL_ERROR'
      }))).to.be.true;
      expect(next.called).to.be.false;
    });
  });
});
