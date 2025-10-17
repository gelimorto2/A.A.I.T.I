# RBAC System Quick Reference

## 🎯 Role Hierarchy

```javascript
GUEST (0)       → Read-only public access
USER (10)       → Basic authenticated user
TRADER (20)     → Create/execute trades
ANALYST (30)    → Approve strategies/models
MANAGER (40)    → Deploy to production
ADMIN (50)      → System administration
SUPERADMIN (100)→ Full unrestricted access
```

## 📦 Import

```javascript
// RBAC System
const { getInstance, ROLES, RESOURCES, ACTIONS } = require('./services/rbacSystem');
const rbac = getInstance();

// Middleware
const { 
  requirePermission, 
  requireRole, 
  requireOwnership,
  attachPermissions 
} = require('./middleware/rbac');
```

## 🔑 Check Permissions

```javascript
// Basic permission check
const canTrade = rbac.hasPermission(user, RESOURCES.TRADING, ACTIONS.CREATE);

// With ownership check
const canEdit = rbac.hasPermission(user, RESOURCES.STRATEGIES, ACTIONS.UPDATE, strategyOwnerId);

// Check role level
const roleLevel = rbac.getRoleLevel('trader'); // Returns 20

// Can manage role
const canManage = rbac.canManageRole('manager', 'trader'); // Returns true
```

## 🛡️ Protect Routes

### Basic Protection
```javascript
app.post('/api/trades', 
  requirePermission(RESOURCES.TRADING, ACTIONS.CREATE),
  tradeController
);
```

### With Ownership
```javascript
app.put('/api/users/:id',
  requirePermission(
    RESOURCES.USERS, 
    ACTIONS.UPDATE, 
    (req) => parseInt(req.params.id)
  ),
  updateUserController
);
```

### Role-Based
```javascript
app.get('/api/admin/stats', 
  requireRole('admin', 'superadmin'), 
  statsController
);
```

### Using Shortcuts
```javascript
const { executeTrade, deployStrategy, manageUsers } = require('./middleware/rbac');

app.post('/api/trades/execute', executeTrade, executeController);
app.post('/api/strategies/:id/deploy', deployStrategy, deployController);
app.delete('/api/users/:id', manageUsers, deleteController);
```

## 📋 Common Shortcuts

### User Management (admin+)
- `readUsers` - View users
- `createUsers` - Create users
- `updateUsers` - Modify users
- `deleteUsers` - Remove users
- `manageUsers` - Full management

### Trading (trader+)
- `readTrading` - View trades
- `createTrade` - Place orders
- `executeTrade` - Execute trades
- `updateTrade` - Modify orders

### Strategies (trader+ create, analyst+ approve, manager+ deploy)
- `readStrategies` - View strategies
- `createStrategy` - Create strategies
- `approveStrategy` - Approve for production
- `deployStrategy` - Deploy to production

### ML Models (analyst+ create, manager+ deploy)
- `readModels` - View models
- `createModel` - Create models
- `approveModel` - Approve for production
- `deployModel` - Deploy to production

## 📊 Audit & Reports

```javascript
// Get audit log
const allLogs = rbac.getAuditLog();

// Filter by user
const userLogs = rbac.getAuditLog({ userId: 123 });

// Filter by resource
const tradingLogs = rbac.getAuditLog({ resource: RESOURCES.TRADING });

// Filter by status
const deniedLogs = rbac.getAuditLog({ granted: false });

// Generate permission report
const report = rbac.generatePermissionReport();
console.log(report.statistics);

// Validate matrix
const validation = rbac.validateMatrix();
if (!validation.valid) {
  console.error(validation.errors);
}
```

## 🔍 Get Role Permissions

```javascript
// Get all permissions for a role
const traderPerms = rbac.getRolePermissions('trader');

// Check specific permission
if (traderPerms[RESOURCES.TRADING][ACTIONS.CREATE]) {
  console.log('Trader can create trades');
}
```

## ⚙️ Configuration

### Add Custom Role
```javascript
// In rbacSystem.js
const ROLES = {
  // ... existing roles
  CUSTOM: { id: 'custom', name: 'Custom Role', level: 35 }
};
```

### Add Custom Resource
```javascript
// In rbacSystem.js
const RESOURCES = {
  // ... existing resources
  CUSTOM_RESOURCE: 'custom_resource'
};
```

### Update Permission Matrix
```javascript
// In rbacSystem.js
const PERMISSION_MATRIX = {
  // ... existing permissions
  [RESOURCES.CUSTOM_RESOURCE]: {
    [ACTIONS.READ]: ROLES.USER.level,
    [ACTIONS.CREATE]: ROLES.TRADER.level,
    [ACTIONS.MANAGE]: ROLES.ADMIN.level
  }
};
```

## 🚨 Error Handling

### Middleware Errors
```javascript
// 401 Unauthorized
{
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}

// 403 Forbidden
{
  "error": "Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": {
    "resource": "TRADING",
    "action": "EXECUTE"
  }
}

// 500 Internal Server Error
{
  "error": "Authorization check failed",
  "code": "AUTH_ERROR"
}
```

### Manual Error Handling
```javascript
app.post('/api/custom', async (req, res) => {
  if (!rbac.hasPermission(req.user, RESOURCES.CUSTOM, ACTIONS.CREATE)) {
    return res.status(403).json({
      error: 'Cannot create custom resource',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  
  // Process request
});
```

## 📝 Complete Example

```javascript
const express = require('express');
const { 
  requirePermission, 
  requireRole,
  executeTrade,
  deployStrategy,
  RESOURCES, 
  ACTIONS 
} = require('./middleware/rbac');

const app = express();

// Public endpoint (no auth)
app.get('/api/public/status', (req, res) => {
  res.json({ status: 'OK' });
});

// Authenticated endpoint (any role)
app.get('/api/portfolio', 
  authenticateUser, // Your auth middleware
  requirePermission(RESOURCES.PORTFOLIO, ACTIONS.READ),
  getPortfolioController
);

// User can only view own profile
app.get('/api/users/:id',
  authenticateUser,
  requirePermission(RESOURCES.USERS, ACTIONS.READ, (req) => parseInt(req.params.id)),
  getUserController
);

// Only traders can execute trades
app.post('/api/trades/execute',
  authenticateUser,
  executeTrade,
  executeTradeController
);

// Only managers can deploy strategies
app.post('/api/strategies/:id/deploy',
  authenticateUser,
  deployStrategy,
  deployStrategyController
);

// Only admins can access
app.get('/api/admin/users',
  authenticateUser,
  requireRole('admin'),
  listUsersController
);

// Programmatic check in controller
async function customController(req, res) {
  const rbac = getInstance();
  
  // Check permission
  if (!rbac.hasPermission(req.user, RESOURCES.STRATEGIES, ACTIONS.APPROVE)) {
    return res.status(403).json({ error: 'Cannot approve strategies' });
  }
  
  // Process request
  const strategy = await approveStrategy(req.params.id);
  res.json(strategy);
}
```

## 🧪 Testing

```javascript
const { expect } = require('chai');
const { getInstance, ROLES, RESOURCES, ACTIONS } = require('./services/rbacSystem');

describe('RBAC Tests', () => {
  let rbac;
  
  beforeEach(() => {
    rbac = getInstance();
  });
  
  it('should allow trader to create trades', () => {
    const trader = { id: 1, role: 'trader' };
    expect(rbac.hasPermission(trader, RESOURCES.TRADING, ACTIONS.CREATE)).to.be.true;
  });
  
  it('should deny user to create trades', () => {
    const user = { id: 2, role: 'user' };
    expect(rbac.hasPermission(user, RESOURCES.TRADING, ACTIONS.CREATE)).to.be.false;
  });
  
  it('should allow user to update own profile', () => {
    const user = { id: 3, role: 'user' };
    expect(rbac.hasPermission(user, RESOURCES.USERS, ACTIONS.UPDATE, 3)).to.be.true;
  });
});
```

## 📈 Performance Tips

1. **Cache role permissions**: Call `getRolePermissions()` once per request
2. **Use shortcuts**: Pre-configured shortcuts are optimized
3. **Limit audit log**: Automatically maintains last 1000 entries
4. **Singleton pattern**: RBAC system is singleton for efficiency

## 🔒 Security Best Practices

1. **Always authenticate first**: Check `req.user` exists before RBAC
2. **Use ownership checks**: Pass owner ID for user-owned resources
3. **Fail closed**: Default deny if permission check fails
4. **Log denied access**: Review audit logs for suspicious activity
5. **Regular reviews**: Use `generatePermissionReport()` to audit matrix

## 📚 Resources

- Full documentation: `docs/SPRINT_4_RBAC_COMPLETION_REPORT.md`
- Visual guide: `docs/SPRINT_4_RBAC_VISUALIZATION.txt`
- System code: `backend/services/rbacSystem.js`
- Middleware code: `backend/middleware/rbac.js`
- Tests: `backend/tests/rbac*.test.js`

---

*Generated: January 15, 2025*  
*Version: 1.0.0*
