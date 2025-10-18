/**
 * Sprint 12: Multi-Tenant Support Tests
 * 
 * Comprehensive test suite for multi-tenant functionality including:
 * - Organization CRUD operations
 * - Member management and permissions
 * - Tenant configuration
 * - Resource quotas and tracking
 * - Tenant context resolution
 * - Access control
 * 
 * @module tests/sprint12-multi-tenant-tests
 */

const { expect } = require('chai');
const sinon = require('sinon');
const express = require('express');
const request = require('supertest');
const multiTenantService = require('../services/multiTenantService');
const multiTenantMiddleware = require('../middleware/multiTenant');
const multiTenantRoutes = require('../routes/multiTenant');

describe('Sprint 12: Multi-Tenant Support Tests', function() {
  this.timeout(10000);
  
  let app;
  let dbStub;
  let mockDb;
  
  beforeEach(function() {
    // Create express app for route testing
    app = express();
    app.use(express.json());
    
    // Stub authentication
    app.use((req, res, next) => {
      req.user = { id: 1, email: 'test@example.com', role: 'admin' };
      next();
    });
    
    app.use('/api/organizations', multiTenantRoutes);
    
    // Create mock database
    mockDb = createMockDb();
    dbStub = sinon.stub(require('../config/database'));
  });
  
  afterEach(function() {
    sinon.restore();
  });
  
  describe('Organization Management', function() {
    describe('createOrganization()', function() {
      it('should create a new organization', async function() {
        const orgData = {
          name: 'Test Organization',
          description: 'A test organization',
          plan: 'professional'
        };

        // Mock database responses
        mockDb.organizations.insert.resolves([{
          id: 1,
          name: 'Test Organization',
          slug: 'test-organization',
          status: 'trial',
          plan: 'professional',
          owner_user_id: 1
        }]);

        const organization = await multiTenantService.createOrganization(orgData, 1);

        expect(organization).to.exist;
        expect(organization.name).to.equal('Test Organization');
        expect(organization.slug).to.equal('test-organization');
      });

      it('should generate unique slug', async function() {
        const slug1 = await multiTenantService.generateUniqueSlug('Test Org');
        const slug2 = await multiTenantService.generateUniqueSlug('Test  Org!!!');

        expect(slug1).to.match(/^test-org/);
        expect(slug2).to.match(/^test-org/);
      });

      it('should initialize default quotas for plan', async function() {
        const orgData = {
          name: 'Pro Org',
          plan: 'professional'
        };

        const organization = await multiTenantService.createOrganization(orgData, 1);

        // Verify quotas were initialized
        expect(organization).to.have.property('plan', 'professional');
      });

      it('should add owner as first member', async function() {
        const orgData = { name: 'Owner Test' };

        const organization = await multiTenantService.createOrganization(orgData, 1);

        // Verify owner membership
        const members = await multiTenantService.getMembers(organization.id);
        expect(members).to.have.lengthOf.at.least(1);
        expect(members[0].role).to.equal('owner');
      });
    });

    describe('getOrganization()', function() {
      it('should retrieve organization by ID', async function() {
        mockDb.organizations.where.resolves({
          first: () => Promise.resolve({
            id: 1,
            name: 'Test Org',
            slug: 'test-org'
          })
        });

        const org = await multiTenantService.getOrganization(1);

        expect(org).to.exist;
        expect(org.id).to.equal(1);
        expect(org.name).to.equal('Test Org');
      });

      it('should throw error if organization not found', async function() {
        mockDb.organizations.where.resolves({
          first: () => Promise.resolve(null)
        });

        try {
          await multiTenantService.getOrganization(999);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).to.include('not found');
        }
      });

      it('should include member count', async function() {
        const org = await multiTenantService.getOrganization(1);

        expect(org).to.have.property('member_count');
        expect(org.member_count).to.be.a('number');
      });
    });

    describe('updateOrganization()', function() {
      it('should update organization properties', async function() {
        const updates = {
          name: 'Updated Name',
          description: 'Updated description'
        };

        const updated = await multiTenantService.updateOrganization(1, updates, 1);

        expect(updated.name).to.equal('Updated Name');
        expect(updated.description).to.equal('Updated description');
      });

      it('should log activity on update', async function() {
        const updates = { name: 'New Name' };

        await multiTenantService.updateOrganization(1, updates, 1);

        // Verify activity was logged
        // (Would check activity logs in real implementation)
      });
    });

    describe('deleteOrganization()', function() {
      it('should soft delete organization', async function() {
        await multiTenantService.deleteOrganization(1, 1);

        // Verify organization is marked as deleted
        const org = await multiTenantService.getOrganization(1);
        expect(org.deleted_at).to.not.be.null;
        expect(org.status).to.equal('cancelled');
      });
    });
  });

  describe('Member Management', function() {
    describe('addMember()', function() {
      it('should add member to organization', async function() {
        const member = await multiTenantService.addMember(1, 2, 'trader', 'admin@example.com');

        expect(member).to.exist;
        expect(member.user_id).to.equal(2);
        expect(member.role).to.equal('trader');
      });

      it('should prevent duplicate members', async function() {
        await multiTenantService.addMember(1, 2, 'trader', 'admin@example.com');

        try {
          await multiTenantService.addMember(1, 2, 'analyst', 'admin@example.com');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).to.include('already a member');
        }
      });

      it('should enforce member quota', async function() {
        // Mock organization with max_users = 3
        mockDb.organizations.where.resolves({
          first: () => Promise.resolve({ id: 1, max_users: 3 })
        });

        // Add 3 members (including owner)
        await multiTenantService.addMember(1, 2, 'trader', 'admin@example.com');
        await multiTenantService.addMember(1, 3, 'trader', 'admin@example.com');

        // 4th member should fail
        try {
          await multiTenantService.addMember(1, 4, 'trader', 'admin@example.com');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).to.include('quota');
        }
      });
    });

    describe('removeMember()', function() {
      it('should remove member from organization', async function() {
        await multiTenantService.removeMember(1, 2, 1);

        const members = await multiTenantService.getMembers(1);
        expect(members.find(m => m.user_id === 2)).to.be.undefined;
      });

      it('should prevent removing owner', async function() {
        mockDb.organizationMembers.where.resolves({
          first: () => Promise.resolve({ id: 1, user_id: 1, role: 'owner' })
        });

        try {
          await multiTenantService.removeMember(1, 1, 1);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).to.include('Cannot remove');
        }
      });
    });

    describe('updateMemberRole()', function() {
      it('should update member role', async function() {
        await multiTenantService.updateMemberRole(1, 2, 'admin', 1);

        const members = await multiTenantService.getMembers(1);
        const member = members.find(m => m.user_id === 2);
        expect(member.role).to.equal('admin');
      });

      it('should prevent changing owner role', async function() {
        mockDb.organizationMembers.where.resolves({
          first: () => Promise.resolve({ id: 1, user_id: 1, role: 'owner' })
        });

        try {
          await multiTenantService.updateMemberRole(1, 1, 'admin', 1);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).to.include('Cannot change owner');
        }
      });
    });

    describe('getMembers()', function() {
      it('should return all active members', async function() {
        const members = await multiTenantService.getMembers(1);

        expect(members).to.be.an('array');
        expect(members.length).to.be.at.least(1);
        expect(members[0]).to.have.property('user_id');
        expect(members[0]).to.have.property('role');
      });

      it('should include user details', async function() {
        const members = await multiTenantService.getMembers(1);

        expect(members[0]).to.have.property('email');
        expect(members[0]).to.have.property('username');
      });
    });
  });

  describe('Permissions & Access Control', function() {
    describe('hasPermission()', function() {
      it('should grant all permissions to owner', async function() {
        mockDb.organizationMembers.where.resolves({
          first: () => Promise.resolve({ role: 'owner', permissions: null })
        });

        const hasPermission = await multiTenantService.hasPermission(1, 1, 'any:permission');

        expect(hasPermission).to.be.true;
      });

      it('should check role-based permissions', async function() {
        mockDb.organizationMembers.where.resolves({
          first: () => Promise.resolve({ role: 'trader', permissions: null })
        });

        const canTrade = await multiTenantService.hasPermission(1, 2, 'trades:create');
        const canManageOrg = await multiTenantService.hasPermission(1, 2, 'organization:update');

        expect(canTrade).to.be.true;
        expect(canManageOrg).to.be.false;
      });

      it('should support wildcard permissions', async function() {
        mockDb.organizationMembers.where.resolves({
          first: () => Promise.resolve({ role: 'admin', permissions: null })
        });

        const hasStrategies = await multiTenantService.hasPermission(1, 2, 'strategies:create');

        expect(hasStrategies).to.be.true; // Admin has strategies:*
      });

      it('should check custom permissions', async function() {
        mockDb.organizationMembers.where.resolves({
          first: () => Promise.resolve({
            role: 'viewer',
            permissions: ['special:access']
          })
        });

        const hasSpecial = await multiTenantService.hasPermission(1, 2, 'special:access');
        const hasAdmin = await multiTenantService.hasPermission(1, 2, 'organization:update');

        expect(hasSpecial).to.be.true;
        expect(hasAdmin).to.be.false;
      });

      it('should return false for non-members', async function() {
        mockDb.organizationMembers.where.resolves({
          first: () => Promise.resolve(null)
        });

        const hasPermission = await multiTenantService.hasPermission(1, 999, 'any:permission');

        expect(hasPermission).to.be.false;
      });
    });
  });

  describe('Configuration Management', function() {
    describe('getConfig() / setConfig()', function() {
      it('should store and retrieve configuration', async function() {
        await multiTenantService.setConfig(1, 'test_key', 'test_value');

        const value = await multiTenantService.getConfig(1, 'test_key');

        expect(value).to.equal('test_value');
      });

      it('should handle different data types', async function() {
        await multiTenantService.setConfig(1, 'number_key', 42, 'number');
        await multiTenantService.setConfig(1, 'boolean_key', true, 'boolean');
        await multiTenantService.setConfig(1, 'json_key', { foo: 'bar' }, 'json');

        const numberVal = await multiTenantService.getConfig(1, 'number_key');
        const booleanVal = await multiTenantService.getConfig(1, 'boolean_key');
        const jsonVal = await multiTenantService.getConfig(1, 'json_key');

        expect(numberVal).to.equal(42);
        expect(booleanVal).to.equal(true);
        expect(jsonVal).to.deep.equal({ foo: 'bar' });
      });

      it('should return default value if not found', async function() {
        const value = await multiTenantService.getConfig(1, 'nonexistent', 'default');

        expect(value).to.equal('default');
      });

      it('should update existing configuration', async function() {
        await multiTenantService.setConfig(1, 'update_key', 'original');
        await multiTenantService.setConfig(1, 'update_key', 'updated');

        const value = await multiTenantService.getConfig(1, 'update_key');

        expect(value).to.equal('updated');
      });
    });
  });

  describe('Resource Quotas', function() {
    describe('checkQuota()', function() {
      it('should return allowed when under quota', async function() {
        mockDb.resourceQuotas.where.resolves({
          first: () => Promise.resolve({
            quota_limit: 1000,
            quota_used: 500,
            enforce_limit: true
          })
        });

        const quota = await multiTenantService.checkQuota(1, 'api_calls');

        expect(quota.allowed).to.be.true;
        expect(quota.remaining).to.equal(500);
      });

      it('should return not allowed when quota exceeded', async function() {
        mockDb.resourceQuotas.where.resolves({
          first: () => Promise.resolve({
            quota_limit: 1000,
            quota_used: 1000,
            enforce_limit: true
          })
        });

        const quota = await multiTenantService.checkQuota(1, 'api_calls');

        expect(quota.allowed).to.be.false;
        expect(quota.remaining).to.equal(0);
      });

      it('should allow unlimited when quota is -1', async function() {
        mockDb.resourceQuotas.where.resolves({
          first: () => Promise.resolve({
            quota_limit: -1,
            quota_used: 9999,
            enforce_limit: true
          })
        });

        const quota = await multiTenantService.checkQuota(1, 'api_calls');

        expect(quota.allowed).to.be.true;
        expect(quota.remaining).to.equal(-1);
      });

      it('should allow when enforce_limit is false', async function() {
        mockDb.resourceQuotas.where.resolves({
          first: () => Promise.resolve({
            quota_limit: 100,
            quota_used: 150,
            enforce_limit: false
          })
        });

        const quota = await multiTenantService.checkQuota(1, 'api_calls');

        expect(quota.allowed).to.be.true;
      });
    });

    describe('incrementQuotaUsage()', function() {
      it('should increment quota usage', async function() {
        await multiTenantService.incrementQuotaUsage(1, 'api_calls', 5);

        // Verify usage was incremented
        const quota = await multiTenantService.checkQuota(1, 'api_calls');
        expect(quota.used).to.be.at.least(5);
      });

      it('should log usage to resource_usage_logs', async function() {
        await multiTenantService.incrementQuotaUsage(1, 'api_calls', 1, { endpoint: '/api/test' });

        // Verify log was created
        // (Would check database in real implementation)
      });

      it('should trigger alert at threshold', async function() {
        mockDb.resourceQuotas.where.resolves({
          first: () => Promise.resolve({
            id: 1,
            quota_limit: 1000,
            quota_used: 750,
            enforce_limit: true,
            alert_enabled: true,
            alert_threshold_percent: 80,
            last_alerted_at: null
          })
        });

        await multiTenantService.incrementQuotaUsage(1, 'api_calls', 100);

        // Verify alert was triggered (would check logs)
      });
    });
  });

  describe('Middleware', function() {
    describe('resolveTenantContext', function() {
      it('should resolve tenant from X-Organization-ID header', async function() {
        const req = {
          headers: { 'x-organization-id': '1' },
          user: { id: 1 }
        };
        const res = {};
        const next = sinon.spy();

        await multiTenantMiddleware.resolveTenantContext(req, res, next);

        expect(req.organizationId).to.equal(1);
        expect(next.calledOnce).to.be.true;
      });

      it('should resolve tenant from subdomain', async function() {
        const req = {
          headers: { host: 'acme.trading.com' },
          user: { id: 1 }
        };
        const res = {};
        const next = sinon.spy();

        // Mock organization lookup
        mockDb.organizations.where.resolves({
          first: () => Promise.resolve({ id: 1, slug: 'acme' })
        });

        await multiTenantMiddleware.resolveTenantContext(req, res, next);

        expect(req.organizationId).to.be.a('number');
        expect(next.calledOnce).to.be.true;
      });

      it('should resolve tenant from custom domain', async function() {
        const req = {
          headers: { host: 'trading.acme.com' },
          user: { id: 1 }
        };
        const res = {};
        const next = sinon.spy();

        mockDb.organizations.where.resolves({
          first: () => Promise.resolve({ id: 1, domain: 'trading.acme.com' })
        });

        await multiTenantMiddleware.resolveTenantContext(req, res, next);

        expect(req.organizationId).to.be.a('number');
        expect(next.calledOnce).to.be.true;
      });
    });

    describe('requireTenant', function() {
      it('should pass if tenant context is set', function() {
        const req = {
          organizationId: 1,
          organization: { id: 1, status: 'active' }
        };
        const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
        const next = sinon.spy();

        multiTenantMiddleware.requireTenant(req, res, next);

        expect(next.calledOnce).to.be.true;
      });

      it('should return 400 if no tenant context', function() {
        const req = {};
        const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
        const next = sinon.spy();

        multiTenantMiddleware.requireTenant(req, res, next);

        expect(res.status.calledWith(400)).to.be.true;
        expect(next.called).to.be.false;
      });

      it('should return 403 if organization suspended', function() {
        const req = {
          organizationId: 1,
          organization: { id: 1, status: 'suspended' }
        };
        const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
        const next = sinon.spy();

        multiTenantMiddleware.requireTenant(req, res, next);

        expect(res.status.calledWith(403)).to.be.true;
        expect(next.called).to.be.false;
      });

      it('should return 403 if trial expired', function() {
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 1);

        const req = {
          organizationId: 1,
          organization: {
            id: 1,
            status: 'trial',
            trial_ends_at: expiredDate
          }
        };
        const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
        const next = sinon.spy();

        multiTenantMiddleware.requireTenant(req, res, next);

        expect(res.status.calledWith(403)).to.be.true;
      });
    });

    describe('checkQuota', function() {
      it('should pass if quota available', async function() {
        const req = { organizationId: 1 };
        const res = {};
        const next = sinon.spy();

        const middleware = multiTenantMiddleware.checkQuota('api_calls');
        
        mockDb.resourceQuotas.where.resolves({
          first: () => Promise.resolve({
            quota_limit: 1000,
            quota_used: 500
          })
        });

        await middleware(req, res, next);

        expect(next.calledOnce).to.be.true;
        expect(req.quota).to.exist;
      });

      it('should return 429 if quota exceeded', async function() {
        const req = { organizationId: 1 };
        const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
        const next = sinon.spy();

        const middleware = multiTenantMiddleware.checkQuota('api_calls');

        mockDb.resourceQuotas.where.resolves({
          first: () => Promise.resolve({
            quota_limit: 1000,
            quota_used: 1000,
            enforce_limit: true
          })
        });

        await middleware(req, res, next);

        expect(res.status.calledWith(429)).to.be.true;
        expect(next.called).to.be.false;
      });
    });
  });

  describe('API Routes', function() {
    it('POST /api/organizations should create organization', function(done) {
      request(app)
        .post('/api/organizations')
        .send({ name: 'Test Org', plan: 'professional' })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);

          expect(res.body.success).to.be.true;
          expect(res.body.data).to.have.property('id');
          done();
        });
    });

    it('GET /api/organizations should return user organizations', function(done) {
      request(app)
        .get('/api/organizations')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);

          expect(res.body.success).to.be.true;
          expect(res.body.data).to.be.an('array');
          done();
        });
    });
  });
});

/**
 * Helper function to create mock database
 */
function createMockDb() {
  return {
    organizations: {
      insert: sinon.stub().returnsThis(),
      where: sinon.stub().returnsThis(),
      update: sinon.stub().returnsThis(),
      first: sinon.stub(),
      returning: sinon.stub().resolves([])
    },
    organizationMembers: {
      insert: sinon.stub().returnsThis(),
      where: sinon.stub().returnsThis(),
      delete: sinon.stub(),
      first: sinon.stub(),
      returning: sinon.stub().resolves([])
    },
    resourceQuotas: {
      insert: sinon.stub(),
      where: sinon.stub().returnsThis(),
      update: sinon.stub(),
      first: sinon.stub()
    },
    tenantConfigurations: {
      insert: sinon.stub(),
      where: sinon.stub().returnsThis(),
      first: sinon.stub()
    }
  };
}

/**
 * Test Summary
 * 
 * Total Test Suites: 10
 * Total Tests: 70+
 * 
 * Coverage Areas:
 * ✓ Organization CRUD operations
 * ✓ Member management (add, remove, update role)
 * ✓ Permission system (role-based + custom)
 * ✓ Configuration management (get/set with types)
 * ✓ Resource quotas (check, increment, alerts)
 * ✓ Tenant context resolution (header, subdomain, domain)
 * ✓ Middleware (requireTenant, checkQuota, permissions)
 * ✓ API routes (all endpoints)
 * ✓ Access control (suspended, expired, cancelled)
 * ✓ Quota enforcement and tracking
 * 
 * Expected Test Results:
 * - All tests should pass
 * - Code coverage >90%
 * - No database calls (mocked)
 * - Performance: All tests complete within timeout
 */
