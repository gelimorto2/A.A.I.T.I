const { expect } = require('chai');
const request = require('supertest');
const { describe, it, before, after, beforeEach } = require('mocha');
const app = require('../backend/server');
const EnhancedRiskManager = require('../backend/services/enhancedRiskManager');

describe('Risk Management API Integration Tests', function() {
  let authToken;
  let adminToken;
  let testBotId;
  let riskManager;

  before(async function() {
    this.timeout(10000);
    
    // Initialize risk manager for testing
    const mockDatabase = { query: () => Promise.resolve({ rows: [] }) };
    const mockExchange = { 
      getMarketData: () => Promise.resolve({ volume24h: 2000000, spread: 0.001, priceChange24h: 0.02 }),
      getHistoricalPrices: () => Promise.resolve([{ close: 50000 }, { close: 51000 }])
    };
    
    riskManager = new EnhancedRiskManager(mockDatabase, mockExchange);
    
    // Register test user
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'risktester',
        email: 'risk@test.com',
        password: 'RiskTest123!'
      });

    if (registerRes.status === 201) {
      authToken = registerRes.body.token;
    } else {
      // Try login if user already exists
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'risk@test.com',
          password: 'RiskTest123!'
        });
      authToken = loginRes.body.token;
    }

    // Register admin user
    const adminRegisterRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'riskadmin',
        email: 'riskadmin@test.com',
        password: 'RiskAdmin123!'
      });

    if (adminRegisterRes.status === 201) {
      adminToken = adminRegisterRes.body.token;
    } else {
      const adminLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'riskadmin@test.com',
          password: 'RiskAdmin123!'
        });
      adminToken = adminLoginRes.body.token;
    }

    // Create test bot
    const botRes = await request(app)
      .post('/api/bots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Risk Test Bot',
        strategy: 'test_strategy',
        config: { risk_level: 'medium' }
      });

    testBotId = botRes.body.bot.id;
  });

  describe('GET /api/risk/status', function() {
    it('should return current risk status', async function() {
      const res = await request(app)
        .get('/api/risk/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('portfolio');
      expect(res.body.data).to.have.property('metrics');
      expect(res.body.data).to.have.property('limits');
      expect(res.body.data.portfolio).to.have.property('value');
      expect(res.body.data.portfolio).to.have.property('exposure');
      expect(res.body.data.portfolio).to.have.property('drawdown');
    });

    it('should require authentication', async function() {
      await request(app)
        .get('/api/risk/status')
        .expect(401);
    });
  });

  describe('POST /api/risk/evaluate', function() {
    const validTradeRequest = {
      botId: 'test-bot-123',
      symbol: 'BTCUSDT',
      side: 'buy',
      quantity: 0.1,
      price: 50000
    };

    it('should evaluate trade risk successfully', async function() {
      const res = await request(app)
        .post('/api/risk/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTradeRequest)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('approved');
      expect(res.body.data).to.have.property('riskScore');
      expect(res.body.data).to.have.property('originalQuantity');
      expect(res.body.data).to.have.property('recommendedQuantity');
      expect(res.body.data).to.have.property('warnings');
      expect(res.body.data).to.have.property('blockers');
      expect(res.body.data).to.have.property('recommendations');
      expect(res.body.data).to.have.property('riskBreakdown');
    });

    it('should validate required fields', async function() {
      const res = await request(app)
        .post('/api/risk/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          botId: 'test-bot-123',
          symbol: 'BTCUSDT'
          // Missing side, quantity, price
        })
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.equal('Missing required fields');
      expect(res.body.required).to.include('side');
      expect(res.body.required).to.include('quantity');
      expect(res.body.required).to.include('price');
    });

    it('should validate trade side', async function() {
      const res = await request(app)
        .post('/api/risk/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validTradeRequest,
          side: 'invalid'
        })
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.equal('Invalid side');
    });

    it('should validate positive quantity and price', async function() {
      const res = await request(app)
        .post('/api/risk/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validTradeRequest,
          quantity: -0.1,
          price: 0
        })
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.equal('Invalid quantity or price');
    });

    it('should handle metadata in trade evaluation', async function() {
      const res = await request(app)
        .post('/api/risk/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validTradeRequest,
          metadata: {
            modelConfidence: 0.85,
            strategy: 'ml_prediction'
          }
        })
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data.approved).to.exist;
    });

    it('should handle high-risk trades', async function() {
      const res = await request(app)
        .post('/api/risk/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validTradeRequest,
          quantity: 100, // Very large position
          price: 50000
        })
        .expect(200);

      expect(res.body.success).to.be.true;
      // Should have warnings or position adjustments for large trade
      expect(res.body.data.warnings.length > 0 || res.body.data.recommendedQuantity < 100).to.be.true;
    });

    it('should require authentication', async function() {
      await request(app)
        .post('/api/risk/evaluate')
        .send(validTradeRequest)
        .expect(401);
    });
  });

  describe('GET /api/risk/config', function() {
    it('should return risk configuration', async function() {
      const res = await request(app)
        .get('/api/risk/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('maxPositionSizeUSD');
      expect(res.body.data).to.have.property('maxPortfolioExposure');
      expect(res.body.data).to.have.property('maxDrawdownPercent');
      expect(res.body.data).to.have.property('dailyLossLimit');
    });

    it('should require authentication', async function() {
      await request(app)
        .get('/api/risk/config')
        .expect(401);
    });
  });

  describe('PUT /api/risk/config', function() {
    const validConfigUpdate = {
      maxPositionSizeUSD: 15000,
      maxDrawdownPercent: 0.08
    };

    it('should update risk configuration with admin token', async function() {
      const res = await request(app)
        .put('/api/risk/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validConfigUpdate)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.message).to.include('updated successfully');
      expect(res.body.updatedFields).to.include('maxPositionSizeUSD');
      expect(res.body.updatedFields).to.include('maxDrawdownPercent');
    });

    it('should reject config updates from non-admin users', async function() {
      const res = await request(app)
        .put('/api/risk/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validConfigUpdate)
        .expect(403);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.equal('Access denied');
    });

    it('should validate configuration fields', async function() {
      const res = await request(app)
        .put('/api/risk/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invalidField: 123,
          maxPositionSizeUSD: 15000
        })
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.equal('Invalid configuration fields');
      expect(res.body.invalidFields).to.include('invalidField');
    });

    it('should validate configuration ranges', async function() {
      const res = await request(app)
        .put('/api/risk/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          maxPortfolioExposure: 1.5, // Above 1.0
          maxDrawdownPercent: -0.1   // Below 0
        })
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.equal('Configuration validation failed');
      expect(res.body.validationErrors.length).to.be.greaterThan(0);
    });

    it('should require authentication', async function() {
      await request(app)
        .put('/api/risk/config')
        .send(validConfigUpdate)
        .expect(401);
    });
  });

  describe('GET /api/risk/portfolio', function() {
    it('should return portfolio risk analysis', async function() {
      const res = await request(app)
        .get('/api/risk/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('summary');
      expect(res.body.data).to.have.property('byBot');
      expect(res.body.data).to.have.property('bySymbol');
      expect(res.body.data).to.have.property('riskMetrics');
      expect(res.body.data).to.have.property('correlations');
      expect(res.body.data).to.have.property('volatilities');
    });

    it('should include portfolio summary metrics', async function() {
      const res = await request(app)
        .get('/api/risk/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.summary).to.have.property('totalPositions');
      expect(res.body.data.summary).to.have.property('totalBots');
      expect(res.body.data.summary).to.have.property('totalSymbols');
      expect(res.body.data.summary).to.have.property('portfolioValue');
      expect(res.body.data.summary).to.have.property('totalExposure');
      expect(res.body.data.summary).to.have.property('currentDrawdown');
    });

    it('should require authentication', async function() {
      await request(app)
        .get('/api/risk/portfolio')
        .expect(401);
    });
  });

  describe('GET /api/risk/alerts', function() {
    it('should return current risk alerts', async function() {
      const res = await request(app)
        .get('/api/risk/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('alerts');
      expect(res.body.data).to.have.property('alertsCount');
      expect(res.body.data).to.have.property('criticalAlerts');
      expect(res.body.data).to.have.property('highAlerts');
      expect(res.body.data).to.have.property('mediumAlerts');
      expect(res.body.data).to.have.property('lastCheck');
      expect(res.body.data.alerts).to.be.an('array');
    });

    it('should include alert details', async function() {
      const res = await request(app)
        .get('/api/risk/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (res.body.data.alerts.length > 0) {
        const alert = res.body.data.alerts[0];
        expect(alert).to.have.property('type');
        expect(alert).to.have.property('severity');
        expect(alert).to.have.property('message');
        expect(alert).to.have.property('timestamp');
      }
    });

    it('should require authentication', async function() {
      await request(app)
        .get('/api/risk/alerts')
        .expect(401);
    });
  });

  describe('GET /api/risk/health', function() {
    it('should return risk management system health', async function() {
      const res = await request(app)
        .get('/api/risk/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('status');
      expect(res.body.data).to.have.property('lastUpdate');
      expect(res.body.data).to.have.property('riskManagerActive');
      expect(res.body.data).to.have.property('monitoringActive');
    });

    it('should indicate system status', async function() {
      const res = await request(app)
        .get('/api/risk/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(['healthy', 'degraded']).to.include(res.body.data.status);
    });

    it('should require authentication', async function() {
      await request(app)
        .get('/api/risk/health')
        .expect(401);
    });
  });

  describe('GET /api/risk/metrics/historical', function() {
    it('should return historical risk metrics', async function() {
      const res = await request(app)
        .get('/api/risk/metrics/historical')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('period');
      expect(res.body.data).to.have.property('data');
      expect(res.body.data).to.have.property('summary');
      expect(res.body.data.data).to.be.an('array');
    });

    it('should accept period parameter', async function() {
      const res = await request(app)
        .get('/api/risk/metrics/historical?period=7d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.period).to.equal('7d');
    });

    it('should accept metric filter', async function() {
      const res = await request(app)
        .get('/api/risk/metrics/historical?metric=drawdown')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.requestedMetric).to.equal('drawdown');
    });

    it('should require authentication', async function() {
      await request(app)
        .get('/api/risk/metrics/historical')
        .expect(401);
    });
  });

  describe('POST /api/risk/simulate', function() {
    it('should simulate risk scenarios', async function() {
      const res = await request(app)
        .post('/api/risk/simulate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scenario: 'market_crash',
          parameters: { severity: 0.3 }
        })
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('scenario');
      expect(res.body.data).to.have.property('results');
      expect(res.body.data).to.have.property('confidence');
      expect(res.body.data.results).to.have.property('estimatedLoss');
      expect(res.body.data.results).to.have.property('recommendedActions');
    });

    it('should validate scenario parameter', async function() {
      const res = await request(app)
        .post('/api/risk/simulate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.equal('Missing scenario parameter');
      expect(res.body.validScenarios).to.be.an('array');
    });

    it('should handle different scenario types', async function() {
      const scenarios = ['market_crash', 'high_volatility', 'correlation_increase'];
      
      for (const scenario of scenarios) {
        const res = await request(app)
          .post('/api/risk/simulate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ scenario })
          .expect(200);

        expect(res.body.data.scenario).to.equal(scenario);
      }
    });

    it('should require authentication', async function() {
      await request(app)
        .post('/api/risk/simulate')
        .send({ scenario: 'market_crash' })
        .expect(401);
    });
  });

  describe('Rate Limiting', function() {
    it('should enforce rate limits on frequent requests', async function() {
      this.timeout(5000);
      
      const requests = [];
      for (let i = 0; i < 105; i++) { // Exceed 100 requests/minute limit
        requests.push(
          request(app)
            .get('/api/risk/status')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).to.be.greaterThan(0);
      
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body.error).to.include('Too many');
      }
    });
  });

  describe('Error Handling', function() {
    it('should handle server errors gracefully', async function() {
      // This test would require mocking internal failures
      // For now, we'll test that the API structure is correct
      const res = await request(app)
        .get('/api/risk/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).to.have.property('success');
      expect(res.body).to.have.property('timestamp');
    });

    it('should provide meaningful error messages', async function() {
      const res = await request(app)
        .post('/api/risk/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          botId: 'test-bot',
          symbol: 'INVALID'
          // Missing required fields
        })
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.be.a('string');
      expect(res.body.error.length).to.be.greaterThan(0);
    });
  });
});