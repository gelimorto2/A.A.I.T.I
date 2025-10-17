/**
 * RBAC Middleware Integration Tests
 * Tests for Express middleware integration
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { RESOURCES, ACTIONS } = require('../../services/rbacSystem');
const {
  requirePermission,
  requireRole,
  requireOwnership,
  attachPermissions,
  // Permission shortcuts
  readUsers,
  createUsers,
  deleteUsers,
  executeTrade,
  deployStrategy,
  deployModel,
  manageAdmin
} = require('../../middleware/rbac');

describe('RBAC Middleware', function() {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null,
      params: {},
      body: {},
      query: {}
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

  describe('requirePermission Middleware', () => {
    it('should deny access without authentication', async () => {
      const middleware = requirePermission(RESOURCES.USERS, ACTIONS.READ);

      await middleware(req, res, next);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith(sinon.match({
        error: 'Authentication required'
      }))).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should allow superadmin access to all resources', async () => {
      req.user = { id: 1, username: 'superadmin', role: 'superadmin' };

      const middleware = requirePermission(RESOURCES.ADMIN, ACTIONS.MANAGE);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should deny insufficient permissions', async () => {
      req.user = { id: 2, username: 'user', role: 'user' };

      const middleware = requirePermission(RESOURCES.ADMIN, ACTIONS.MANAGE);

      await middleware(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledWith(sinon.match({
        error: 'Insufficient permissions'
      }))).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should allow access with sufficient permissions', async () => {
      req.user = { id: 3, username: 'trader', role: 'trader' };

      const middleware = requirePermission(RESOURCES.TRADING, ACTIONS.CREATE);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should allow owner access to own resources', async () => {
      req.user = { id: 4, username: 'user', role: 'user' };
      req.params = { userId: '4' };

      const ownerIdExtractor = (req) => parseInt(req.params.userId);
      const middleware = requirePermission(RESOURCES.USERS, ACTIONS.UPDATE, ownerIdExtractor);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should deny non-owner access to protected resources', async () => {
      req.user = { id: 5, username: 'user', role: 'user' };
      req.params = { userId: '999' };

      const ownerIdExtractor = (req) => parseInt(req.params.userId);
      const middleware = requirePermission(RESOURCES.USERS, ACTIONS.UPDATE, ownerIdExtractor);

      await middleware(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });
  });

  describe('requireRole Middleware', () => {
    it('should allow access with correct role', async () => {
      req.user = { id: 10, username: 'trader', role: 'trader' };

      const middleware = requireRole('trader', 'analyst');

      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });

    it('should allow access with higher role', async () => {
      req.user = { id: 11, username: 'admin', role: 'admin' };

      const middleware = requireRole('user', 'trader');

      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });

    it('should deny access with lower role', async () => {
      req.user = { id: 12, username: 'user', role: 'user' };

      const middleware = requireRole('admin');

      await middleware(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should deny access without authentication', async () => {
      const middleware = requireRole('user');

      await middleware(req, res, next);

      expect(res.status.calledWith(401)).to.be.true;
      expect(next.called).to.be.false;
    });
  });

  describe('requireOwnership Middleware', () => {
    it('should allow owner access', async () => {
      req.user = { id: 20, username: 'user', role: 'user' };
      req.params = { id: '20' };

      const ownerIdExtractor = (req) => parseInt(req.params.id);
      const middleware = requireOwnership(ownerIdExtractor);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });

    it('should deny non-owner access', async () => {
      req.user = { id: 21, username: 'user', role: 'user' };
      req.params = { id: '999' };

      const ownerIdExtractor = (req) => parseInt(req.params.id);
      const middleware = requireOwnership(ownerIdExtractor);

      await middleware(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should allow admin access regardless of ownership', async () => {
      req.user = { id: 22, username: 'admin', role: 'admin' };
      req.params = { id: '999' };

      const ownerIdExtractor = (req) => parseInt(req.params.id);
      const middleware = requireOwnership(ownerIdExtractor);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });
  });

  describe('attachPermissions Middleware', () => {
    it('should attach permissions to request', async () => {
      req.user = { id: 30, username: 'trader', role: 'trader' };

      const middleware = attachPermissions();

      await middleware(req, res, next);

      expect(req).to.have.property('permissions');
      expect(req.permissions).to.have.property(RESOURCES.TRADING);
      expect(next.called).to.be.true;
    });

    it('should not attach permissions without authentication', async () => {
      const middleware = attachPermissions();

      await middleware(req, res, next);

      expect(req).to.not.have.property('permissions');
      expect(next.called).to.be.true; // Still proceeds
    });
  });

  describe('Permission Shortcuts', () => {
    it('readUsers should check USER resource READ permission', async () => {
      req.user = { id: 40, username: 'user', role: 'user' };

      await readUsers(req, res, next);

      expect(next.called).to.be.true;
    });

    it('createUsers should require ADMIN role', async () => {
      req.user = { id: 41, username: 'user', role: 'user' };

      await createUsers(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('deleteUsers should require ADMIN role', async () => {
      req.user = { id: 42, username: 'admin', role: 'admin' };

      await deleteUsers(req, res, next);

      expect(next.called).to.be.true;
    });

    it('executeTrade should require TRADER role', async () => {
      req.user = { id: 43, username: 'user', role: 'user' };

      await executeTrade(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('deployStrategy should require MANAGER role', async () => {
      req.user = { id: 44, username: 'trader', role: 'trader' };

      await deployStrategy(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('deployModel should require MANAGER role', async () => {
      req.user = { id: 45, username: 'manager', role: 'manager' };

      await deployModel(req, res, next);

      expect(next.called).to.be.true;
    });

    it('manageAdmin should require ADMIN role', async () => {
      req.user = { id: 46, username: 'manager', role: 'manager' };

      await manageAdmin(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });
  });

  describe('Owner ID Extraction', () => {
    it('should extract owner ID from params', async () => {
      req.user = { id: 50, username: 'user', role: 'user' };
      req.params = { strategyId: '50' };

      const ownerIdExtractor = (req) => parseInt(req.params.strategyId);
      const middleware = requirePermission(RESOURCES.STRATEGIES, ACTIONS.UPDATE, ownerIdExtractor);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });

    it('should extract owner ID from body', async () => {
      req.user = { id: 51, username: 'user', role: 'user' };
      req.body = { userId: 51 };

      const ownerIdExtractor = (req) => req.body.userId;
      const middleware = requirePermission(RESOURCES.USERS, ACTIONS.UPDATE, ownerIdExtractor);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });

    it('should extract owner ID from query', async () => {
      req.user = { id: 52, username: 'user', role: 'user' };
      req.query = { ownerId: '52' };

      const ownerIdExtractor = (req) => parseInt(req.query.ownerId);
      const middleware = requirePermission(RESOURCES.PORTFOLIO, ACTIONS.READ, ownerIdExtractor);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle extraction errors gracefully', async () => {
      req.user = { id: 60, username: 'user', role: 'user' };

      const ownerIdExtractor = (req) => {
        throw new Error('Extraction failed');
      };
      const middleware = requirePermission(RESOURCES.USERS, ACTIONS.UPDATE, ownerIdExtractor);

      await middleware(req, res, next);

      expect(res.status.calledWith(500)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should handle invalid user role gracefully', async () => {
      req.user = { id: 61, username: 'user', role: 'invalid_role' };

      const middleware = requirePermission(RESOURCES.USERS, ACTIONS.READ);

      await middleware(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle user reading own portfolio', async () => {
      req.user = { id: 70, username: 'user', role: 'user' };
      req.params = { userId: '70' };

      const ownerIdExtractor = (req) => parseInt(req.params.userId);
      const middleware = requirePermission(RESOURCES.PORTFOLIO, ACTIONS.READ, ownerIdExtractor);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });

    it('should handle trader creating strategy', async () => {
      req.user = { id: 71, username: 'trader', role: 'trader' };

      const middleware = requirePermission(RESOURCES.STRATEGIES, ACTIONS.CREATE);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });

    it('should handle analyst approving strategy', async () => {
      req.user = { id: 72, username: 'analyst', role: 'analyst' };

      const middleware = requirePermission(RESOURCES.STRATEGIES, ACTIONS.APPROVE);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });

    it('should handle manager deploying model', async () => {
      req.user = { id: 73, username: 'manager', role: 'manager' };

      const middleware = requirePermission(RESOURCES.ML_MODELS, ACTIONS.DEPLOY);

      await middleware(req, res, next);

      expect(next.called).to.be.true;
    });

    it('should deny trader deleting strategy', async () => {
      req.user = { id: 74, username: 'trader', role: 'trader' };

      const middleware = requirePermission(RESOURCES.STRATEGIES, ACTIONS.DELETE);

      await middleware(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });
  });

  describe('Response Format', () => {
    it('should return consistent error format for 401', async () => {
      const middleware = requirePermission(RESOURCES.USERS, ACTIONS.READ);

      await middleware(req, res, next);

      expect(res.json.firstCall.args[0]).to.deep.include({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    });

    it('should return consistent error format for 403', async () => {
      req.user = { id: 80, username: 'user', role: 'user' };

      const middleware = requirePermission(RESOURCES.ADMIN, ACTIONS.MANAGE);

      await middleware(req, res, next);

      expect(res.json.firstCall.args[0]).to.deep.include({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      expect(res.json.firstCall.args[0]).to.have.property('required');
    });
  });
});
