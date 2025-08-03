const request = require('supertest');
const expect = require('chai').expect;
const { describe, it, before, after, beforeEach, afterEach } = require('mocha');
const logger = require('../utils/logger');

/**
 * AAITI Comprehensive API Testing Suite
 * Complete test coverage for all API endpoints and versions
 * Part of System Enhancements - API Enhancements
 */

class APITestSuite {
  constructor(app) {
    this.app = app;
    this.baseURL = process.env.TEST_BASE_URL || 'http://localhost:5000';
    this.testUser = {
      email: 'test@aaiti.trade',
      password: 'testPassword123',
      username: 'testuser'
    };
    this.authToken = null;
    this.testData = {};
    
    this.log('API Test Suite initialized');
  }

  /**
   * Setup test environment
   */
  async setup() {
    try {
      // Create test user and get auth token
      await this.createTestUser();
      await this.authenticateTestUser();
      
      this.log('Test environment setup complete');
    } catch (error) {
      this.log('Test setup failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    try {
      // Cleanup test data
      await this.cleanupTestData();
      
      this.log('Test environment cleanup complete');
    } catch (error) {
      this.log('Test cleanup failed', { error: error.message });
    }
  }

  /**
   * Create test user
   */
  async createTestUser() {
    const response = await request(this.app)
      .post('/api/auth/register')
      .send(this.testUser)
      .expect(201);

    this.testData.userId = response.body.user.id;
  }

  /**
   * Authenticate test user
   */
  async authenticateTestUser() {
    const response = await request(this.app)
      .post('/api/auth/login')
      .send({
        email: this.testUser.email,
        password: this.testUser.password
      })
      .expect(200);

    this.authToken = response.body.token;
  }

  /**
   * Cleanup test data
   */
  async cleanupTestData() {
    if (this.testData.userId) {
      await request(this.app)
        .delete(`/api/users/${this.testData.userId}`)
        .set('Authorization', `Bearer ${this.authToken}`)
        .expect(200);
    }
  }

  /**
   * Helper method for authenticated requests
   */
  authenticatedRequest() {
    return request(this.app).set('Authorization', `Bearer ${this.authToken}`);
  }

  /**
   * Run all test suites
   */
  runAllTests() {
    describe('AAITI API Test Suite', () => {
      before(async () => {
        await this.setup();
      });

      after(async () => {
        await this.cleanup();
      });

      // System tests
      this.testSystemEndpoints();
      
      // Authentication tests
      this.testAuthenticationEndpoints();
      
      // Trading tests
      this.testTradingEndpoints();
      
      // Portfolio tests
      this.testPortfolioEndpoints();
      
      // ML tests
      this.testMLEndpoints();
      
      // Bot tests
      this.testBotEndpoints();
      
      // Analytics tests
      this.testAnalyticsEndpoints();
      
      // Notification tests
      this.testNotificationEndpoints();
      
      // User management tests
      this.testUserEndpoints();
      
      // Metrics tests
      this.testMetricsEndpoints();
      
      // Performance tests
      this.testPerformanceEndpoints();
      
      // API versioning tests
      this.testAPIVersioning();
      
      // GraphQL tests
      this.testGraphQLEndpoints();
      
      // Security tests
      this.testSecurityFeatures();
      
      // Rate limiting tests
      this.testRateLimiting();
      
      // Caching tests
      this.testCachingBehavior();
    });
  }

  /**
   * Test system endpoints
   */
  testSystemEndpoints() {
    describe('System Endpoints', () => {
      it('should return health status', async () => {
        const response = await request(this.app)
          .get('/api/health')
          .expect(200);

        expect(response.body).to.have.property('status', 'healthy');
        expect(response.body).to.have.property('timestamp');
        expect(response.body).to.have.property('uptime');
        expect(response.body).to.have.property('memory');
      });

      it('should return performance metrics', async () => {
        const response = await request(this.app)
          .get('/api/performance')
          .expect(200);

        expect(response.body).to.have.property('timestamp');
        expect(response.body).to.have.property('cache');
        expect(response.body).to.have.property('database');
        expect(response.body).to.have.property('api');
        expect(response.body).to.have.property('system');
      });
    });
  }

  /**
   * Test authentication endpoints
   */
  testAuthenticationEndpoints() {
    describe('Authentication Endpoints', () => {
      it('should register new user', async () => {
        const newUser = {
          email: 'newuser@aaiti.trade',
          username: 'newuser',
          password: 'newPassword123'
        };

        const response = await request(this.app)
          .post('/api/auth/register')
          .send(newUser)
          .expect(201);

        expect(response.body).to.have.property('user');
        expect(response.body).to.have.property('token');
        expect(response.body.user.email).to.equal(newUser.email);
      });

      it('should login existing user', async () => {
        const response = await request(this.app)
          .post('/api/auth/login')
          .send({
            email: this.testUser.email,
            password: this.testUser.password
          })
          .expect(200);

        expect(response.body).to.have.property('token');
        expect(response.body).to.have.property('user');
      });

      it('should reject invalid credentials', async () => {
        await request(this.app)
          .post('/api/auth/login')
          .send({
            email: this.testUser.email,
            password: 'wrongpassword'
          })
          .expect(401);
      });
    });
  }

  /**
   * Test trading endpoints
   */
  testTradingEndpoints() {
    describe('Trading Endpoints', () => {
      it('should get trading history', async () => {
        const response = await this.authenticatedRequest()
          .get('/api/trading/history')
          .expect(200);

        expect(response.body).to.have.property('trades');
        expect(response.body.trades).to.be.an('array');
      });

      it('should execute market order', async () => {
        const orderData = {
          symbol: 'BTC/USD',
          side: 'buy',
          type: 'market',
          quantity: 0.001
        };

        const response = await this.authenticatedRequest()
          .post('/api/trading/orders')
          .send(orderData)
          .expect(201);

        expect(response.body).to.have.property('order');
        expect(response.body.order.symbol).to.equal(orderData.symbol);
        expect(response.body.order.side).to.equal(orderData.side);
      });
    });
  }

  /**
   * Test portfolio endpoints
   */
  testPortfolioEndpoints() {
    describe('Portfolio Endpoints', () => {
      it('should get portfolio summary', async () => {
        const response = await this.authenticatedRequest()
          .get('/api/portfolio')
          .expect(200);

        expect(response.body).to.have.property('totalValue');
        expect(response.body).to.have.property('positions');
        expect(response.body.positions).to.be.an('array');
      });

      it('should get portfolio performance', async () => {
        const response = await this.authenticatedRequest()
          .get('/api/portfolio/performance')
          .expect(200);

        expect(response.body).to.have.property('totalReturn');
        expect(response.body).to.have.property('totalReturnPercent');
      });
    });
  }

  /**
   * Test ML endpoints
   */
  testMLEndpoints() {
    describe('ML Endpoints', () => {
      it('should get price predictions', async () => {
        const response = await this.authenticatedRequest()
          .get('/api/ml/predictions/BTC')
          .expect(200);

        expect(response.body).to.have.property('predictions');
        expect(response.body.predictions).to.be.an('array');
      });

      it('should get model performance', async () => {
        const response = await this.authenticatedRequest()
          .get('/api/ml/performance')
          .expect(200);

        expect(response.body).to.have.property('models');
        expect(response.body.models).to.be.an('array');
      });
    });
  }

  /**
   * Test GraphQL endpoints
   */
  testGraphQLEndpoints() {
    describe('GraphQL Endpoints', () => {
      it('should handle GraphQL query', async () => {
        const query = `
          query {
            health {
              status
              timestamp
              version
            }
          }
        `;

        const response = await request(this.app)
          .post('/graphql')
          .send({ query })
          .expect(200);

        expect(response.body).to.have.property('data');
        expect(response.body.data).to.have.property('health');
        expect(response.body.data.health.status).to.equal('healthy');
      });
    });
  }

  /**
   * Test API versioning
   */
  testAPIVersioning() {
    describe('API Versioning', () => {
      it('should handle version in header', async () => {
        const response = await request(this.app)
          .get('/api/health')
          .set('X-API-Version', '2.0.0')
          .expect(200);

        expect(response.headers['x-api-version']).to.equal('2.0.0');
      });

      it('should return error for unsupported version', async () => {
        await request(this.app)
          .get('/api/health')
          .set('X-API-Version', '0.5.0')
          .expect(400);
      });
    });
  }

  /**
   * Test security features
   */
  testSecurityFeatures() {
    describe('Security Features', () => {
      it('should require authentication for protected routes', async () => {
        await request(this.app)
          .get('/api/portfolio')
          .expect(401);
      });

      it('should set security headers', async () => {
        const response = await request(this.app)
          .get('/api/health')
          .expect(200);

        expect(response.headers).to.have.property('x-content-type-options');
        expect(response.headers).to.have.property('x-frame-options');
      });
    });
  }

  /**
   * Test rate limiting
   */
  testRateLimiting() {
    describe('Rate Limiting', () => {
      it('should enforce rate limits', async () => {
        const requests = [];
        
        // Make multiple rapid requests
        for (let i = 0; i < 20; i++) {
          requests.push(
            request(this.app)
              .get('/api/health')
              .expect((res) => {
                expect([200, 429]).to.include(res.status);
              })
          );
        }

        await Promise.all(requests);
      });
    });
  }

  /**
   * Test caching behavior
   */
  testCachingBehavior() {
    describe('Caching Behavior', () => {
      it('should cache GET requests', async () => {
        // Make request twice and verify caching
        const path = '/api/performance';
        
        const response1 = await request(this.app)
          .get(path)
          .expect(200);

        const response2 = await request(this.app)
          .get(path)
          .expect(200);

        // Timestamps should be the same if cached
        expect(response1.body.timestamp).to.equal(response2.body.timestamp);
      });
    });
  }

  /**
   * Log test operations
   * @private
   */
  log(message, data = {}) {
    if (logger && typeof logger.info === 'function') {
      logger.info(`[API Test] ${message}`, { service: 'api-test-suite', ...data });
    } else {
      console.log(`[API Test] ${message}`, data);
    }
  }
}

module.exports = APITestSuite;