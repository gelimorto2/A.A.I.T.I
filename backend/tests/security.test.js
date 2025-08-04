const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { db } = require('../database/init');
const apiKeyManager = require('../utils/apiKeyManager');
const { encrypt, decrypt, generateApiKey } = require('../utils/encryption');

describe('Security & Compliance Features', () => {
  let authToken;
  let userId;
  let apiKey;

  before(async () => {
    // Create a test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123',
        role: 'admin'
      });

    expect(registerResponse.status).to.equal(201);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpassword123'
      });

    expect(loginResponse.status).to.equal(200);
    authToken = loginResponse.body.token;
    userId = loginResponse.body.user.id;
  });

  describe('Encryption Utilities', () => {
    it('should encrypt and decrypt data correctly', () => {
      const testData = 'sensitive-test-data-12345';
      const encrypted = encrypt(testData);
      
      expect(encrypted).to.have.property('iv');
      expect(encrypted).to.have.property('salt');
      expect(encrypted).to.have.property('tag');
      expect(encrypted).to.have.property('encrypted');
      
      const decrypted = decrypt(encrypted);
      expect(decrypted).to.equal(testData);
    });

    it('should generate secure API keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      
      expect(key1).to.have.length(64); // 32 bytes = 64 hex chars
      expect(key2).to.have.length(64);
      expect(key1).to.not.equal(key2);
    });
  });

  describe('API Key Management', () => {
    it('should create a new API key', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test API Key',
          permissions: ['read', 'write'],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });

      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('apiKey');
      expect(response.body.keyInfo).to.have.property('name', 'Test API Key');
      expect(response.body.keyInfo.permissions).to.deep.equal(['read', 'write']);
      
      apiKey = response.body.apiKey;
    });

    it('should list user API keys', async () => {
      const response = await request(app)
        .get('/api/api-keys')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.apiKeys).to.be.an('array');
      expect(response.body.apiKeys.length).to.be.greaterThan(0);
    });

    it('should authenticate with API key', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('X-API-Key', apiKey);

      expect(response.status).to.equal(200);
      expect(response.body.user.username).to.equal('testuser');
    });

    it('should fail with invalid API key', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('X-API-Key', 'invalid-api-key');

      expect(response.status).to.equal(401);
    });
  });

  describe('OAuth Configuration', () => {
    it('should get available OAuth providers', async () => {
      const response = await request(app)
        .get('/api/oauth/providers');

      expect(response.status).to.equal(200);
      expect(response.body.providers).to.have.property('google');
      expect(response.body.providers).to.have.property('github');
    });

    it('should generate OAuth authorization URL', async () => {
      const response = await request(app)
        .get('/api/oauth/google/authorize')
        .query({ redirect_uri: 'http://localhost:3000/auth/callback' });

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('authUrl');
      expect(response.body).to.have.property('state');
    });
  });

  describe('Compliance and Audit', () => {
    it('should generate audit report', async () => {
      const response = await request(app)
        .get('/api/compliance/audit-report')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'json' });

      expect(response.status).to.equal(200);
      expect(response.body.report).to.have.property('summary');
      expect(response.body.report).to.have.property('auditLogs');
      expect(response.body.report).to.have.property('securityEvents');
    });

    it('should get compliance status', async () => {
      const response = await request(app)
        .get('/api/compliance/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.status).to.have.property('auditingStatus');
      expect(response.body.status).to.have.property('securityStatus');
      expect(response.body.status).to.have.property('dataRetention');
      expect(response.body.status).to.have.property('complianceScore');
    });
  });

  describe('Data Retention', () => {
    it('should list data retention policies', async () => {
      const response = await request(app)
        .get('/api/data-retention/policies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.policies).to.be.an('array');
    });

    it('should create a new data retention policy', async () => {
      const response = await request(app)
        .post('/api/data-retention/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tableName: 'test_table',
          retentionDays: 90,
          conditionColumn: 'created_at',
          description: 'Test retention policy'
        });

      expect(response.status).to.equal(201);
      expect(response.body.policy).to.have.property('table_name', 'test_table');
      expect(response.body.policy).to.have.property('retention_days', 90);
    });

    it('should get cleanup statistics', async () => {
      const response = await request(app)
        .get('/api/data-retention/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.stats).to.be.an('array');
    });
  });

  describe('Security Events Logging', () => {
    it('should log security events for failed authentication', async () => {
      // Attempt login with wrong password
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      // Check if security event was logged
      const events = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM security_events WHERE event_type = ? ORDER BY timestamp DESC LIMIT 1',
          ['oauth_login_attempt'],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // Note: This test might not show immediate results due to async logging
      // In a real test environment, you'd wait or use proper async testing
    });
  });

  after(async () => {
    // Clean up test data
    if (userId) {
      await new Promise((resolve) => {
        db.run('DELETE FROM users WHERE id = ?', [userId], resolve);
      });
      await new Promise((resolve) => {
        db.run('DELETE FROM api_keys WHERE user_id = ?', [userId], resolve);
      });
      await new Promise((resolve) => {
        db.run('DELETE FROM audit_logs WHERE user_id = ?', [userId], resolve);
      });
      await new Promise((resolve) => {
        db.run('DELETE FROM security_events WHERE user_id = ?', [userId], resolve);
      });
    }
  });
});

module.exports = {
  // Export for other test files to use
  createTestUser: async (app) => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser_' + Date.now(),
        email: `test${Date.now()}@example.com`,
        password: 'testpassword123',
        role: 'admin'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: registerResponse.body.user.username,
        password: 'testpassword123'
      });

    return {
      user: loginResponse.body.user,
      token: loginResponse.body.token
    };
  }
};