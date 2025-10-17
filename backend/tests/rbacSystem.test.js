/**
 * RBAC System Tests
 * Comprehensive test suite for role-based access control
 */

const { expect } = require('chai');
const { getInstance: getRBACSystem, ROLES, RESOURCES, ACTIONS } = require('../../services/rbacSystem');

describe('RBAC System', function() {
  let rbac;

  beforeEach(() => {
    rbac = getRBACSystem();
    // Clear audit log
    rbac.auditLog = [];
  });

  describe('Role Hierarchy', () => {
    it('should have correct role levels', () => {
      expect(ROLES.GUEST.level).to.equal(0);
      expect(ROLES.USER.level).to.equal(10);
      expect(ROLES.TRADER.level).to.equal(20);
      expect(ROLES.ANALYST.level).to.equal(30);
      expect(ROLES.MANAGER.level).to.equal(40);
      expect(ROLES.ADMIN.level).to.equal(50);
      expect(ROLES.SUPERADMIN.level).to.equal(100);
    });

    it('should get role level by ID', () => {
      expect(rbac.getRoleLevel('user')).to.equal(10);
      expect(rbac.getRoleLevel('admin')).to.equal(50);
      expect(rbac.getRoleLevel('invalid')).to.equal(0);
    });

    it('should get role object by ID', () => {
      const role = rbac.getRole('trader');
      expect(role).to.not.be.null;
      expect(role.id).to.equal('trader');
      expect(role.level).to.equal(20);
    });
  });

  describe('Permission Checks', () => {
    it('should allow superadmin full access', () => {
      const superadmin = { id: 1, role: 'superadmin' };

      expect(rbac.hasPermission(superadmin, RESOURCES.USERS, ACTIONS.DELETE)).to.be.true;
      expect(rbac.hasPermission(superadmin, RESOURCES.ADMIN, ACTIONS.MANAGE)).to.be.true;
      expect(rbac.hasPermission(superadmin, RESOURCES.ML_MODELS, ACTIONS.DEPLOY)).to.be.true;
    });

    it('should deny guest access to protected resources', () => {
      const guest = { id: 2, role: 'guest' };

      expect(rbac.hasPermission(guest, RESOURCES.TRADING, ACTIONS.CREATE)).to.be.false;
      expect(rbac.hasPermission(guest, RESOURCES.USERS, ACTIONS.CREATE)).to.be.false;
      expect(rbac.hasPermission(guest, RESOURCES.ADMIN, ACTIONS.READ)).to.be.false;
    });

    it('should allow user to read own resources', () => {
      const user = { id: 3, role: 'user' };

      expect(rbac.hasPermission(user, RESOURCES.USERS, ACTIONS.READ, 3)).to.be.true;
      expect(rbac.hasPermission(user, RESOURCES.PORTFOLIO, ACTIONS.READ)).to.be.true;
    });

    it('should deny user access to create trading orders', () => {
      const user = { id: 4, role: 'user' };

      expect(rbac.hasPermission(user, RESOURCES.TRADING, ACTIONS.CREATE)).to.be.false;
      expect(rbac.hasPermission(user, RESOURCES.TRADING, ACTIONS.EXECUTE)).to.be.false;
    });

    it('should allow trader to create and execute trades', () => {
      const trader = { id: 5, role: 'trader' };

      expect(rbac.hasPermission(trader, RESOURCES.TRADING, ACTIONS.CREATE)).to.be.true;
      expect(rbac.hasPermission(trader, RESOURCES.TRADING, ACTIONS.EXECUTE)).to.be.true;
      expect(rbac.hasPermission(trader, RESOURCES.STRATEGIES, ACTIONS.CREATE)).to.be.true;
    });

    it('should deny trader access to approve strategies', () => {
      const trader = { id: 6, role: 'trader' };

      expect(rbac.hasPermission(trader, RESOURCES.STRATEGIES, ACTIONS.APPROVE)).to.be.false;
      expect(rbac.hasPermission(trader, RESOURCES.STRATEGIES, ACTIONS.DEPLOY)).to.be.false;
    });

    it('should allow analyst to approve strategies and models', () => {
      const analyst = { id: 7, role: 'analyst' };

      expect(rbac.hasPermission(analyst, RESOURCES.STRATEGIES, ACTIONS.APPROVE)).to.be.true;
      expect(rbac.hasPermission(analyst, RESOURCES.ML_MODELS, ACTIONS.APPROVE)).to.be.true;
      expect(rbac.hasPermission(analyst, RESOURCES.ANALYTICS, ACTIONS.EXECUTE)).to.be.true;
    });

    it('should allow manager to deploy strategies', () => {
      const manager = { id: 8, role: 'manager' };

      expect(rbac.hasPermission(manager, RESOURCES.STRATEGIES, ACTIONS.DEPLOY)).to.be.true;
      expect(rbac.hasPermission(manager, RESOURCES.ML_MODELS, ACTIONS.DEPLOY)).to.be.true;
      expect(rbac.hasPermission(manager, RESOURCES.STRATEGIES, ACTIONS.DELETE)).to.be.true;
    });

    it('should allow admin to manage users and system', () => {
      const admin = { id: 9, role: 'admin' };

      expect(rbac.hasPermission(admin, RESOURCES.USERS, ACTIONS.CREATE)).to.be.true;
      expect(rbac.hasPermission(admin, RESOURCES.USERS, ACTIONS.DELETE)).to.be.true;
      expect(rbac.hasPermission(admin, RESOURCES.ADMIN, ACTIONS.MANAGE)).to.be.true;
    });
  });

  describe('Own Resource Access', () => {
    it('should allow user to update own profile', () => {
      const user = { id: 10, role: 'user' };

      expect(rbac.hasPermission(user, RESOURCES.USERS, ACTIONS.UPDATE, 10)).to.be.true;
    });

    it('should deny user to update other users profile', () => {
      const user = { id: 11, role: 'user' };

      expect(rbac.hasPermission(user, RESOURCES.USERS, ACTIONS.UPDATE, 999)).to.be.false;
    });

    it('should allow user to delete own strategies', () => {
      const user = { id: 12, role: 'trader' };

      // Trader can create/update but not delete unless manager+
      expect(rbac.hasPermission(user, RESOURCES.STRATEGIES, ACTIONS.DELETE, 12)).to.be.false;
    });
  });

  describe('Role Management', () => {
    it('should allow manager to manage lower roles', () => {
      expect(rbac.canManageRole('manager', 'user')).to.be.true;
      expect(rbac.canManageRole('manager', 'trader')).to.be.true;
      expect(rbac.canManageRole('manager', 'analyst')).to.be.true;
    });

    it('should deny manager to manage same or higher roles', () => {
      expect(rbac.canManageRole('manager', 'manager')).to.be.false;
      expect(rbac.canManageRole('manager', 'admin')).to.be.false;
    });

    it('should allow admin to manage managers', () => {
      expect(rbac.canManageRole('admin', 'manager')).to.be.true;
    });
  });

  describe('Role Permissions', () => {
    it('should get all permissions for a role', () => {
      const permissions = rbac.getRolePermissions('trader');

      expect(permissions).to.have.property(RESOURCES.TRADING);
      expect(permissions[RESOURCES.TRADING][ACTIONS.CREATE]).to.be.true;
      expect(permissions[RESOURCES.USERS][ACTIONS.DELETE]).to.be.false;
    });

    it('should show increasing permissions for higher roles', () => {
      const userPerms = rbac.getRolePermissions('user');
      const traderPerms = rbac.getRolePermissions('trader');
      const adminPerms = rbac.getRolePermissions('admin');

      // Count granted permissions
      const countPerms = (perms) => {
        let count = 0;
        for (const resource of Object.values(perms)) {
          for (const granted of Object.values(resource)) {
            if (granted) count++;
          }
        }
        return count;
      };

      expect(countPerms(traderPerms)).to.be.greaterThan(countPerms(userPerms));
      expect(countPerms(adminPerms)).to.be.greaterThan(countPerms(traderPerms));
    });
  });

  describe('Audit Log', () => {
    it('should log access attempts', () => {
      const user = { id: 20, username: 'testuser', role: 'user' };

      rbac.hasPermission(user, RESOURCES.PORTFOLIO, ACTIONS.READ);

      expect(rbac.auditLog.length).to.equal(1);
      expect(rbac.auditLog[0]).to.have.property('userId', 20);
      expect(rbac.auditLog[0]).to.have.property('resource', RESOURCES.PORTFOLIO);
      expect(rbac.auditLog[0]).to.have.property('granted', true);
    });

    it('should log denied access', () => {
      const user = { id: 21, username: 'testuser', role: 'user' };

      rbac.hasPermission(user, RESOURCES.ADMIN, ACTIONS.MANAGE);

      expect(rbac.auditLog.length).to.equal(1);
      expect(rbac.auditLog[0]).to.have.property('granted', false);
      expect(rbac.auditLog[0]).to.have.property('reason', 'DENIED');
    });

    it('should filter audit log by user', () => {
      const user1 = { id: 22, username: 'user1', role: 'user' };
      const user2 = { id: 23, username: 'user2', role: 'trader' };

      rbac.hasPermission(user1, RESOURCES.PORTFOLIO, ACTIONS.READ);
      rbac.hasPermission(user2, RESOURCES.TRADING, ACTIONS.CREATE);
      rbac.hasPermission(user1, RESOURCES.SETTINGS, ACTIONS.READ);

      const filtered = rbac.getAuditLog({ userId: 22 });

      expect(filtered.length).to.equal(2);
      expect(filtered.every(entry => entry.userId === 22)).to.be.true;
    });

    it('should filter audit log by resource', () => {
      const user = { id: 24, username: 'user', role: 'trader' };

      rbac.hasPermission(user, RESOURCES.TRADING, ACTIONS.CREATE);
      rbac.hasPermission(user, RESOURCES.STRATEGIES, ACTIONS.CREATE);
      rbac.hasPermission(user, RESOURCES.TRADING, ACTIONS.EXECUTE);

      const filtered = rbac.getAuditLog({ resource: RESOURCES.TRADING });

      expect(filtered.length).to.equal(2);
      expect(filtered.every(entry => entry.resource === RESOURCES.TRADING)).to.be.true;
    });

    it('should filter audit log by granted status', () => {
      const user = { id: 25, username: 'user', role: 'user' };

      rbac.hasPermission(user, RESOURCES.PORTFOLIO, ACTIONS.READ);  // Granted
      rbac.hasPermission(user, RESOURCES.ADMIN, ACTIONS.MANAGE);    // Denied
      rbac.hasPermission(user, RESOURCES.SETTINGS, ACTIONS.READ);   // Granted

      const granted = rbac.getAuditLog({ granted: true });
      const denied = rbac.getAuditLog({ granted: false });

      expect(granted.length).to.equal(2);
      expect(denied.length).to.equal(1);
    });
  });

  describe('Permission Report', () => {
    it('should generate comprehensive permission report', () => {
      const report = rbac.generatePermissionReport();

      expect(report).to.have.property('roles');
      expect(report).to.have.property('matrix');
      expect(report).to.have.property('statistics');

      expect(report.roles).to.have.property('USER');
      expect(report.roles).to.have.property('ADMIN');
      expect(report.statistics.totalRoles).to.be.greaterThan(0);
    });

    it('should count permissions correctly', () => {
      const report = rbac.generatePermissionReport();

      expect(report.roles.SUPERADMIN.permissionCount).to.be.greaterThan(report.roles.ADMIN.permissionCount);
      expect(report.roles.ADMIN.permissionCount).to.be.greaterThan(report.roles.USER.permissionCount);
    });
  });

  describe('Matrix Validation', () => {
    it('should validate permission matrix', () => {
      const validation = rbac.validateMatrix();

      expect(validation).to.have.property('valid');
      expect(validation).to.have.property('errors');
      expect(validation).to.have.property('warnings');

      expect(validation.valid).to.be.true;
      expect(validation.errors).to.be.an('array').that.is.empty;
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid resource gracefully', () => {
      const user = { id: 30, role: 'user' };

      expect(rbac.hasPermission(user, 'invalid_resource', ACTIONS.READ)).to.be.false;
    });

    it('should handle invalid action gracefully', () => {
      const user = { id: 31, role: 'user' };

      expect(rbac.hasPermission(user, RESOURCES.USERS, 'invalid_action')).to.be.false;
    });

    it('should handle malformed user object', () => {
      const malformed = { id: 32 }; // Missing role

      expect(rbac.hasPermission(malformed, RESOURCES.USERS, ACTIONS.READ)).to.be.false;
    });
  });

  describe('Edge Cases', () => {
    it('should handle null owner ID', () => {
      const user = { id: 40, role: 'user' };

      const result = rbac.hasPermission(user, RESOURCES.USERS, ACTIONS.UPDATE, null);

      expect(result).to.be.false;
    });

    it('should limit audit log size', () => {
      const user = { id: 41, role: 'user' };

      // Generate more than 1000 entries
      for (let i = 0; i < 1100; i++) {
        rbac.hasPermission(user, RESOURCES.PORTFOLIO, ACTIONS.READ);
      }

      expect(rbac.auditLog.length).to.be.at.most(1000);
    });
  });
});
