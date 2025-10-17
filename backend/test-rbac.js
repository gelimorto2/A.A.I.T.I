/**
 * Quick RBAC Test Runner
 * Simple script to test RBAC without mocha
 */

const { getInstance: getRBACSystem, ROLES, RESOURCES, ACTIONS } = require('./services/rbacSystem');

console.log('🧪 RBAC System Quick Test\n');

const rbac = getRBACSystem();
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test Role Hierarchy
test('Role levels are correct', () => {
  assert(ROLES.GUEST.level === 0, 'GUEST should be level 0');
  assert(ROLES.USER.level === 10, 'USER should be level 10');
  assert(ROLES.TRADER.level === 20, 'TRADER should be level 20');
  assert(ROLES.ANALYST.level === 30, 'ANALYST should be level 30');
  assert(ROLES.MANAGER.level === 40, 'MANAGER should be level 40');
  assert(ROLES.ADMIN.level === 50, 'ADMIN should be level 50');
  assert(ROLES.SUPERADMIN.level === 100, 'SUPERADMIN should be level 100');
});

// Test Superadmin Access
test('Superadmin has full access', () => {
  const superadmin = { id: 1, role: 'superadmin' };
  assert(rbac.hasPermission(superadmin, RESOURCES.USERS, ACTIONS.DELETE), 'Superadmin should delete users');
  assert(rbac.hasPermission(superadmin, RESOURCES.ADMIN, ACTIONS.MANAGE), 'Superadmin should manage admin');
  assert(rbac.hasPermission(superadmin, RESOURCES.ML_MODELS, ACTIONS.DEPLOY), 'Superadmin should deploy models');
});

// Test Guest Restrictions
test('Guest has no access to protected resources', () => {
  const guest = { id: 2, role: 'guest' };
  assert(!rbac.hasPermission(guest, RESOURCES.TRADING, ACTIONS.CREATE), 'Guest should not create trades');
  assert(!rbac.hasPermission(guest, RESOURCES.USERS, ACTIONS.CREATE), 'Guest should not create users');
  assert(!rbac.hasPermission(guest, RESOURCES.ADMIN, ACTIONS.READ), 'Guest should not read admin');
});

// Test User Permissions
test('User can read own resources', () => {
  const user = { id: 3, role: 'user' };
  assert(rbac.hasPermission(user, RESOURCES.USERS, ACTIONS.READ, 3), 'User should read own profile');
  assert(rbac.hasPermission(user, RESOURCES.PORTFOLIO, ACTIONS.READ), 'User should read portfolio');
});

test('User cannot create trades', () => {
  const user = { id: 4, role: 'user' };
  assert(!rbac.hasPermission(user, RESOURCES.TRADING, ACTIONS.CREATE), 'User should not create trades');
  assert(!rbac.hasPermission(user, RESOURCES.TRADING, ACTIONS.EXECUTE), 'User should not execute trades');
});

// Test Trader Permissions
test('Trader can create and execute trades', () => {
  const trader = { id: 5, role: 'trader' };
  assert(rbac.hasPermission(trader, RESOURCES.TRADING, ACTIONS.CREATE), 'Trader should create trades');
  assert(rbac.hasPermission(trader, RESOURCES.TRADING, ACTIONS.EXECUTE), 'Trader should execute trades');
  assert(rbac.hasPermission(trader, RESOURCES.STRATEGIES, ACTIONS.CREATE), 'Trader should create strategies');
});

test('Trader cannot approve strategies', () => {
  const trader = { id: 6, role: 'trader' };
  assert(!rbac.hasPermission(trader, RESOURCES.STRATEGIES, ACTIONS.APPROVE), 'Trader should not approve strategies');
  assert(!rbac.hasPermission(trader, RESOURCES.STRATEGIES, ACTIONS.DEPLOY), 'Trader should not deploy strategies');
});

// Test Analyst Permissions
test('Analyst can approve strategies and models', () => {
  const analyst = { id: 7, role: 'analyst' };
  assert(rbac.hasPermission(analyst, RESOURCES.STRATEGIES, ACTIONS.APPROVE), 'Analyst should approve strategies');
  assert(rbac.hasPermission(analyst, RESOURCES.ML_MODELS, ACTIONS.APPROVE), 'Analyst should approve models');
  assert(rbac.hasPermission(analyst, RESOURCES.ANALYTICS, ACTIONS.EXECUTE), 'Analyst should execute analytics');
});

// Test Manager Permissions
test('Manager can deploy strategies', () => {
  const manager = { id: 8, role: 'manager' };
  assert(rbac.hasPermission(manager, RESOURCES.STRATEGIES, ACTIONS.DEPLOY), 'Manager should deploy strategies');
  assert(rbac.hasPermission(manager, RESOURCES.ML_MODELS, ACTIONS.DEPLOY), 'Manager should deploy models');
  assert(rbac.hasPermission(manager, RESOURCES.STRATEGIES, ACTIONS.DELETE), 'Manager should delete strategies');
});

// Test Admin Permissions
test('Admin can manage users and system', () => {
  const admin = { id: 9, role: 'admin' };
  assert(rbac.hasPermission(admin, RESOURCES.USERS, ACTIONS.CREATE), 'Admin should create users');
  assert(rbac.hasPermission(admin, RESOURCES.USERS, ACTIONS.DELETE), 'Admin should delete users');
  assert(rbac.hasPermission(admin, RESOURCES.ADMIN, ACTIONS.MANAGE), 'Admin should manage admin');
});

// Test Ownership
test('User can update own profile', () => {
  const user = { id: 10, role: 'user' };
  assert(rbac.hasPermission(user, RESOURCES.USERS, ACTIONS.UPDATE, 10), 'User should update own profile');
});

test('User cannot update other profiles', () => {
  const user = { id: 11, role: 'user' };
  assert(!rbac.hasPermission(user, RESOURCES.USERS, ACTIONS.UPDATE, 999), 'User should not update other profiles');
});

// Test Role Management
test('Manager can manage lower roles', () => {
  assert(rbac.canManageRole('manager', 'user'), 'Manager should manage users');
  assert(rbac.canManageRole('manager', 'trader'), 'Manager should manage traders');
  assert(rbac.canManageRole('manager', 'analyst'), 'Manager should manage analysts');
});

test('Manager cannot manage same or higher roles', () => {
  assert(!rbac.canManageRole('manager', 'manager'), 'Manager should not manage managers');
  assert(!rbac.canManageRole('manager', 'admin'), 'Manager should not manage admins');
});

test('Admin can manage managers', () => {
  assert(rbac.canManageRole('admin', 'manager'), 'Admin should manage managers');
});

// Test Audit Logging
test('Audit log tracks access attempts', () => {
  rbac.auditLog = []; // Clear log
  const user = { id: 20, username: 'testuser', role: 'user' };
  
  rbac.hasPermission(user, RESOURCES.PORTFOLIO, ACTIONS.READ);
  
  assert(rbac.auditLog.length === 1, 'Should have 1 audit entry');
  assert(rbac.auditLog[0].userId === 20, 'Should log correct user ID');
  assert(rbac.auditLog[0].resource === RESOURCES.PORTFOLIO, 'Should log correct resource');
  assert(rbac.auditLog[0].granted === true, 'Should log granted status');
});

test('Audit log filters by user', () => {
  rbac.auditLog = []; // Clear log
  const user1 = { id: 21, username: 'user1', role: 'user' };
  const user2 = { id: 22, username: 'user2', role: 'trader' };
  
  rbac.hasPermission(user1, RESOURCES.PORTFOLIO, ACTIONS.READ);
  rbac.hasPermission(user2, RESOURCES.TRADING, ACTIONS.CREATE);
  rbac.hasPermission(user1, RESOURCES.SETTINGS, ACTIONS.READ);
  
  const filtered = rbac.getAuditLog({ userId: 21 });
  
  assert(filtered.length === 2, 'Should filter to 2 entries for user1');
  assert(filtered.every(entry => entry.userId === 21), 'All entries should be for user1');
});

// Test Permission Report
test('Generate permission report', () => {
  const report = rbac.generatePermissionReport();
  
  assert(report.roles, 'Report should have roles');
  assert(report.matrix, 'Report should have matrix');
  assert(report.statistics, 'Report should have statistics');
  assert(report.roles.USER, 'Report should include USER role');
  assert(report.roles.ADMIN, 'Report should include ADMIN role');
});

// Test Matrix Validation
test('Permission matrix is valid', () => {
  const validation = rbac.validateMatrix();
  
  assert(validation.valid === true, 'Matrix should be valid');
  assert(validation.errors.length === 0, 'Should have no errors');
});

// Print Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`📊 Test Summary`);
console.log(`${'='.repeat(50)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total:  ${passed + failed}`);
console.log(`${'='.repeat(50)}\n`);

if (failed === 0) {
  console.log('🎉 All RBAC tests passed!');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
}
