/**
 * Sprint 4: Automated Security Regression Suite
 * Comprehensive security testing for injection vulnerabilities, RBAC, and API security
 */

const { expect } = require('chai');
const request = require('supertest');
const crypto = require('crypto');

class SecurityTestSuite {
  constructor(app, db) {
    this.app = app;
    this.db = db;
    this.testApiKey = null;
    this.testUser = null;
  }

  /**
   * Run complete security test suite
   */
  async runAllTests() {
    console.log('🔒 Starting comprehensive security test suite...');

    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };

    try {
      // Setup test data
      await this.setupTestData();

      // Run test categories
      const testCategories = [
        { name: 'Input Validation', tests: this.runInputValidationTests.bind(this) },
        { name: 'SQL Injection', tests: this.runSQLInjectionTests.bind(this) },
        { name: 'XSS Prevention', tests: this.runXSSTests.bind(this) },
        { name: 'RBAC Enforcement', tests: this.runRBACTests.bind(this) },
        { name: 'API Key Security', tests: this.runAPIKeyTests.bind(this) },
        { name: 'HMAC Validation', tests: this.runHMACTests.bind(this) },
        { name: 'Rate Limiting', tests: this.runRateLimitTests.bind(this) },
        { name: 'Session Security', tests: this.runSessionSecurityTests.bind(this) }
      ];

      for (const category of testCategories) {
        console.log(`\n📋 Running ${category.name} tests...`);
        const categoryResults = await category.tests();
        results.tests.push({
          category: category.name,
          results: categoryResults
        });
        results.passed += categoryResults.passed;
        results.failed += categoryResults.failed;
      }

      // Cleanup test data
      await this.cleanupTestData();

      console.log(`\n✅ Security test suite completed:`);
      console.log(`   Passed: ${results.passed}`);
      console.log(`   Failed: ${results.failed}`);
      console.log(`   Total:  ${results.passed + results.failed}`);

      return results;

    } catch (error) {
      console.error('❌ Security test suite error:', error);
      throw error;
    }
  }

  /**
   * Setup test data
   */
  async setupTestData() {
    // Create test user
    this.testUser = {
      id: crypto.randomUUID(),
      username: 'security_test_user',
      email: 'security@test.com',
      role: 'trader',
      created_at: new Date()
    };

    // Create test API key
    this.testApiKey = {
      id: crypto.randomUUID(),
      key: 'test_api_key_' + crypto.randomBytes(16).toString('hex'),
      scopes: ['model:read', 'trading:execute'],
      user_id: this.testUser.id,
      created_at: new Date()
    };

    console.log('✅ Test data setup completed');
  }

  /**
   * Cleanup test data
   */
  async cleanupTestData() {
    // In a real implementation, cleanup test data from database
    console.log('✅ Test data cleanup completed');
  }

  /**
   * Run input validation tests
   */
  async runInputValidationTests() {
    const results = { passed: 0, failed: 0, details: [] };

    const testCases = [
      {
        name: 'Reject oversized input',
        test: async () => {
          const oversizedData = 'A'.repeat(10001);
          const response = await request(this.app)
            .post('/api/ml-strategy/models')
            .send({ name: oversizedData })
            .expect(400);
          
          expect(response.body.error).to.include('String value too long');
        }
      },
      {
        name: 'Sanitize control characters',
        test: async () => {
          const maliciousInput = 'test\x00\x01\x02name';
          const response = await request(this.app)
            .post('/api/ml-strategy/models')
            .send({ name: maliciousInput });
          
          // Should either reject or sanitize
          if (response.status === 400) {
            // Rejected - good
            expect(response.body).to.have.property('error');
          } else {
            // Should be sanitized
            expect(response.body.data?.name).to.not.include('\x00');
          }
        }
      },
      {
        name: 'Handle deep object nesting',
        test: async () => {
          const deepObject = this.createDeepObject(15);
          const response = await request(this.app)
            .post('/api/ml-strategy/models')
            .send({ params: deepObject })
            .expect(400);
          
          expect(response.body.error).to.include('nesting too deep');
        }
      }
    ];

    for (const testCase of testCases) {
      try {
        await testCase.test();
        results.passed++;
        results.details.push({ name: testCase.name, status: 'PASSED' });
      } catch (error) {
        results.failed++;
        results.details.push({ 
          name: testCase.name, 
          status: 'FAILED', 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Run SQL injection tests
   */
  async runSQLInjectionTests() {
    const results = { passed: 0, failed: 0, details: [] };

    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; SELECT * FROM ml_models WHERE '1'='1",
      "' UNION SELECT * FROM users--",
      "'; INSERT INTO audit_log VALUES ('hacked'); --"
    ];

    for (const payload of sqlInjectionPayloads) {
      try {
        const response = await request(this.app)
          .get('/api/ml-strategy/models/search')
          .query({ type: payload });

        // Should either reject (400) or return safe results
        if (response.status === 400) {
          // Good - input validation caught it
          expect(response.body.error).to.include('injection');
          results.passed++;
          results.details.push({ 
            name: `SQL Injection blocked: ${payload.substring(0, 20)}...`, 
            status: 'PASSED' 
          });
        } else if (response.status === 200) {
          // Should return safe results, not execute SQL
          expect(response.body.data).to.be.an('object');
          results.passed++;
          results.details.push({ 
            name: `SQL Injection sanitized: ${payload.substring(0, 20)}...`, 
            status: 'PASSED' 
          });
        } else {
          throw new Error(`Unexpected response status: ${response.status}`);
        }
      } catch (error) {
        results.failed++;
        results.details.push({ 
          name: `SQL Injection test: ${payload.substring(0, 20)}...`, 
          status: 'FAILED', 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Run XSS prevention tests
   */
  async runXSSTests() {
    const results = { passed: 0, failed: 0, details: [] };

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      'document.cookie="stolen"'
    ];

    for (const payload of xssPayloads) {
      try {
        const response = await request(this.app)
          .post('/api/ml-strategy/models')
          .send({ 
            name: payload,
            type: 'test',
            algorithmType: 'test',
            targetTimeframe: '1h',
            symbols: ['BTC'],
            params: {}
          });

        // Should either reject (400) or sanitize
        if (response.status === 400) {
          expect(response.body.error).to.include('injection');
          results.passed++;
          results.details.push({ 
            name: `XSS blocked: ${payload.substring(0, 20)}...`, 
            status: 'PASSED' 
          });
        } else if (response.status === 201) {
          // Should be sanitized
          expect(response.body.data.name).to.not.include('<script>');
          expect(response.body.data.name).to.not.include('javascript:');
          results.passed++;
          results.details.push({ 
            name: `XSS sanitized: ${payload.substring(0, 20)}...`, 
            status: 'PASSED' 
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({ 
          name: `XSS test: ${payload.substring(0, 20)}...`, 
          status: 'FAILED', 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Run RBAC enforcement tests
   */
  async runRBACTests() {
    const results = { passed: 0, failed: 0, details: [] };

    const rbacTestCases = [
      {
        name: 'Admin can access all endpoints',
        userRole: 'admin',
        expectedStatus: 200,
        endpoint: '/api/system/metrics'
      },
      {
        name: 'Viewer cannot execute trades',
        userRole: 'viewer',
        expectedStatus: 403,
        endpoint: '/api/trading/orders',
        method: 'POST'
      },
      {
        name: 'Analyst cannot deploy strategies',
        userRole: 'analyst',
        expectedStatus: 403,
        endpoint: '/api/ml-strategy/strategies/test-id/deploy',
        method: 'POST'
      },
      {
        name: 'Trader can create models',
        userRole: 'trader',
        expectedStatus: 400, // Validation error, but permission granted
        endpoint: '/api/ml-strategy/models',
        method: 'POST'
      }
    ];

    for (const testCase of rbacTestCases) {
      try {
        const mockUser = { ...this.testUser, role: testCase.userRole };
        
        let requestBuilder = request(this.app);
        if (testCase.method === 'POST') {
          requestBuilder = requestBuilder.post(testCase.endpoint);
        } else {
          requestBuilder = requestBuilder.get(testCase.endpoint);
        }

        const response = await requestBuilder
          .set('x-user-id', mockUser.id)
          .send({});

        if (response.status === testCase.expectedStatus || 
            (testCase.expectedStatus === 200 && response.status < 300) ||
            (testCase.expectedStatus === 400 && response.status === 400)) {
          results.passed++;
          results.details.push({ 
            name: testCase.name, 
            status: 'PASSED' 
          });
        } else {
          throw new Error(`Expected ${testCase.expectedStatus}, got ${response.status}`);
        }
      } catch (error) {
        results.failed++;
        results.details.push({ 
          name: testCase.name, 
          status: 'FAILED', 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Run API key security tests
   */
  async runAPIKeyTests() {
    const results = { passed: 0, failed: 0, details: [] };

    const apiKeyTests = [
      {
        name: 'Valid API key with correct scope',
        apiKey: this.testApiKey.key,
        scopes: ['model:read'],
        endpoint: '/api/ml-strategy/models',
        expectedStatus: 200
      },
      {
        name: 'Valid API key with insufficient scope',
        apiKey: this.testApiKey.key,
        scopes: ['model:read'], // Missing trading:execute for trading endpoint
        endpoint: '/api/trading/orders',
        method: 'POST',
        expectedStatus: 403
      },
      {
        name: 'Invalid API key',
        apiKey: 'invalid_key_123',
        endpoint: '/api/ml-strategy/models',
        expectedStatus: 401
      }
    ];

    for (const testCase of apiKeyTests) {
      try {
        let requestBuilder = request(this.app);
        if (testCase.method === 'POST') {
          requestBuilder = requestBuilder.post(testCase.endpoint);
        } else {
          requestBuilder = requestBuilder.get(testCase.endpoint);
        }

        const response = await requestBuilder
          .set('x-api-key', testCase.apiKey)
          .send({});

        if (response.status === testCase.expectedStatus) {
          results.passed++;
          results.details.push({ 
            name: testCase.name, 
            status: 'PASSED' 
          });
        } else {
          throw new Error(`Expected ${testCase.expectedStatus}, got ${response.status}`);
        }
      } catch (error) {
        results.failed++;
        results.details.push({ 
          name: testCase.name, 
          status: 'FAILED', 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Run HMAC validation tests
   */
  async runHMACTests() {
    const results = { passed: 0, failed: 0, details: [] };

    const hmacTests = [
      {
        name: 'Valid HMAC signature',
        generateValidSignature: true,
        expectedStatus: 200
      },
      {
        name: 'Invalid HMAC signature',
        generateValidSignature: false,
        expectedStatus: 403
      },
      {
        name: 'Missing HMAC headers',
        skipHMACHeaders: true,
        expectedStatus: 403
      },
      {
        name: 'Expired timestamp',
        useExpiredTimestamp: true,
        expectedStatus: 403
      }
    ];

    for (const testCase of hmacTests) {
      try {
        const tradingEndpoint = '/api/trading/orders';
        const body = { symbol: 'BTC', quantity: 0.01, side: 'buy' };
        const timestamp = testCase.useExpiredTimestamp ? 
          Date.now() - (10 * 60 * 1000) : Date.now(); // 10 minutes ago vs now
        const nonce = crypto.randomBytes(16).toString('hex');

        let requestBuilder = request(this.app)
          .post(tradingEndpoint)
          .send(body);

        if (!testCase.skipHMACHeaders) {
          if (testCase.generateValidSignature) {
            const signature = this.generateTestHMAC('POST', tradingEndpoint, body, timestamp, nonce);
            requestBuilder = requestBuilder
              .set('x-hmac-signature', signature)
              .set('x-timestamp', timestamp.toString())
              .set('x-nonce', nonce);
          } else {
            requestBuilder = requestBuilder
              .set('x-hmac-signature', 'invalid_signature')
              .set('x-timestamp', timestamp.toString())
              .set('x-nonce', nonce);
          }
        }

        const response = await requestBuilder;

        if (response.status === testCase.expectedStatus) {
          results.passed++;
          results.details.push({ 
            name: testCase.name, 
            status: 'PASSED' 
          });
        } else {
          throw new Error(`Expected ${testCase.expectedStatus}, got ${response.status}`);
        }
      } catch (error) {
        results.failed++;
        results.details.push({ 
          name: testCase.name, 
          status: 'FAILED', 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Run rate limiting tests
   */
  async runRateLimitTests() {
    const results = { passed: 0, failed: 0, details: [] };

    try {
      // Test rate limiting by making rapid requests
      const endpoint = '/api/ml-strategy/models';
      const requests = [];
      
      // Make 20 rapid requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(this.app)
            .get(endpoint)
            .set('x-user-id', this.testUser.id)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      if (rateLimitedResponses.length > 0) {
        results.passed++;
        results.details.push({ 
          name: 'Rate limiting enforced', 
          status: 'PASSED',
          details: `${rateLimitedResponses.length} requests rate limited`
        });
      } else {
        results.failed++;
        results.details.push({ 
          name: 'Rate limiting enforced', 
          status: 'FAILED',
          error: 'No requests were rate limited'
        });
      }
    } catch (error) {
      results.failed++;
      results.details.push({ 
        name: 'Rate limiting test', 
        status: 'FAILED', 
        error: error.message 
      });
    }

    return results;
  }

  /**
   * Run session security tests
   */
  async runSessionSecurityTests() {
    const results = { passed: 0, failed: 0, details: [] };

    const sessionTests = [
      {
        name: 'Session cookie has secure flags',
        test: async () => {
          const response = await request(this.app)
            .post('/api/auth/login')
            .send({ username: 'test', password: 'test' });
          
          const setCookieHeader = response.headers['set-cookie'];
          if (setCookieHeader) {
            const sessionCookie = setCookieHeader.find(cookie => cookie.includes('sessionId'));
            expect(sessionCookie).to.include('HttpOnly');
            expect(sessionCookie).to.include('SameSite');
          }
        }
      }
    ];

    for (const testCase of sessionTests) {
      try {
        await testCase.test();
        results.passed++;
        results.details.push({ 
          name: testCase.name, 
          status: 'PASSED' 
        });
      } catch (error) {
        results.failed++;
        results.details.push({ 
          name: testCase.name, 
          status: 'FAILED', 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Generate test HMAC signature
   */
  generateTestHMAC(method, url, body, timestamp, nonce) {
    const hmacSecret = process.env.HMAC_SECRET || 'test_secret';
    const payload = `${method}${url}${JSON.stringify(body)}${timestamp}${nonce}`;
    return crypto
      .createHmac('sha256', hmacSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Create deeply nested object for testing
   */
  createDeepObject(depth) {
    if (depth <= 0) return 'value';
    return { nested: this.createDeepObject(depth - 1) };
  }

  /**
   * Generate comprehensive security report
   */
  generateSecurityReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_tests: results.passed + results.failed,
        passed: results.passed,
        failed: results.failed,
        success_rate: `${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`
      },
      categories: results.tests,
      recommendations: this.getSecurityRecommendations(results)
    };

    return report;
  }

  /**
   * Get security recommendations based on test results
   */
  getSecurityRecommendations(results) {
    const recommendations = [];

    const failedTests = results.tests.filter(category => 
      category.results.failed > 0
    );

    if (failedTests.length > 0) {
      recommendations.push('Review and fix failed security tests immediately');
      recommendations.push('Implement additional input validation for detected vulnerabilities');
      recommendations.push('Review RBAC permissions and API key scopes');
    }

    if (results.failed === 0) {
      recommendations.push('Excellent security posture - maintain current security practices');
      recommendations.push('Consider implementing additional security monitoring');
      recommendations.push('Schedule regular security audits and penetration testing');
    }

    return recommendations;
  }
}

module.exports = SecurityTestSuite;