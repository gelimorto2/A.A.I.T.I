# 🏢 Multi-Tenant Support - Quick Reference

**Sprint 12 | A.A.I.T.I Trading Platform**

---

## 🚀 Quick Start

### Create an Organization

```javascript
const multiTenantService = require('./services/multiTenantService');

const organization = await multiTenantService.createOrganization({
  name: 'Acme Trading',
  description: 'Professional trading firm',
  plan: 'professional'
}, userId);

console.log(`Organization created: ${organization.slug}`);
```

### API Usage

```bash
# Create organization
curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Trading", "plan": "professional"}'

# Get user's organizations
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/organizations

# Access tenant-scoped resource
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-ID: 1" \
  http://localhost:3000/api/strategies
```

---

## 📡 API Endpoints

### Organization Management

```bash
# Create organization
POST /api/organizations

# List user's organizations
GET /api/organizations

# Get organization details
GET /api/organizations/:id

# Update organization
PUT /api/organizations/:id

# Delete organization
DELETE /api/organizations/:id
```

### Member Management

```bash
# List members
GET /api/organizations/:id/members

# Add member
POST /api/organizations/:id/members

# Remove member
DELETE /api/organizations/:id/members/:userId

# Update member role
PUT /api/organizations/:id/members/:userId/role
```

### Configuration

```bash
# Get configuration
GET /api/organizations/:id/config?keys=timezone,currency

# Update configuration
PUT /api/organizations/:id/config
```

### Quotas & Usage

```bash
# Get quotas
GET /api/organizations/:id/quotas

# Get usage statistics
GET /api/organizations/:id/usage?resource_type=api_calls

# Get activity logs
GET /api/organizations/:id/activity
```

### Permissions

```bash
# Check permissions
GET /api/organizations/:id/permissions?permission=trades:create

# Get user role
GET /api/organizations/:id/permissions
```

---

## 🔧 Service Methods

### Organization Operations

```javascript
// Create organization
await multiTenantService.createOrganization(data, ownerUserId);

// Get organization
const org = await multiTenantService.getOrganization(organizationId);

// Update organization
await multiTenantService.updateOrganization(orgId, updates, userId);

// Delete organization (soft delete)
await multiTenantService.deleteOrganization(orgId, userId);

// Get user's organizations
const orgs = await multiTenantService.getUserOrganizations(userId);
```

### Member Management

```javascript
// Add member
await multiTenantService.addMember(orgId, userId, 'trader', inviterEmail);

// Remove member
await multiTenantService.removeMember(orgId, userId, removedByUserId);

// Update role
await multiTenantService.updateMemberRole(orgId, userId, 'admin', updatedByUserId);

// Get members
const members = await multiTenantService.getMembers(orgId);
```

### Permissions

```javascript
// Check permission
const allowed = await multiTenantService.hasPermission(orgId, userId, 'trades:create');

// Available roles: owner, admin, trader, analyst, viewer
// Permission format: 'resource:action' (e.g., 'strategies:create')
```

### Configuration

```javascript
// Get configuration
const timezone = await multiTenantService.getConfig(orgId, 'timezone', 'UTC');

// Set configuration
await multiTenantService.setConfig(orgId, 'timezone', 'America/New_York', 'string');
await multiTenantService.setConfig(orgId, 'max_trades', 100, 'number');
await multiTenantService.setConfig(orgId, 'trading_enabled', true, 'boolean');
await multiTenantService.setConfig(orgId, 'settings', {foo: 'bar'}, 'json');
```

### Quotas

```javascript
// Check quota
const quota = await multiTenantService.checkQuota(orgId, 'api_calls');
if (quota.allowed) {
  console.log(`Remaining: ${quota.remaining}`);
}

// Increment usage
await multiTenantService.incrementQuotaUsage(orgId, 'api_calls', 5, { endpoint: '/api/test' });
```

---

## 🛡️ Middleware Usage

### Apply Tenant Context

```javascript
const { 
  resolveTenantContext, 
  requireTenant,
  requirePermission,
  requireAdmin,
  checkQuota,
  trackUsage
} = require('../middleware/multiTenant');

// Apply to all routes
app.use(resolveTenantContext);

// Require tenant context
router.get('/api/strategies', requireTenant, async (req, res) => {
  // req.organizationId is available
  // req.organization contains org object
  // req.userRole contains user's role
});

// Check specific permission
router.post('/api/strategies', 
  requireTenant,
  requirePermission('strategies:create'),
  async (req, res) => {
    // User has permission to create strategies
  }
);

// Require admin access
router.delete('/api/strategies/:id',
  requireTenant,
  requireAdmin,
  async (req, res) => {
    // Only admins and owners can access
  }
);

// Check and track quotas
router.post('/api/trades',
  requireTenant,
  checkQuota('trades_per_day'),
  trackUsage('trades_per_day'),
  async (req, res) => {
    // Quota checked and usage tracked automatically
  }
);
```

### Tenant Resolution Order

1. **X-Organization-ID header** - Explicit organization selection
2. **Subdomain** - `acme.trading.com` → organization with slug `acme`
3. **Custom domain** - `trading.acme.com` → organization with that domain
4. **JWT claims** - `organization_id` in token
5. **User default** - User's `default_organization_id`

---

## 👥 Roles & Permissions

### Built-in Roles

| Role | Permissions |
|------|-------------|
| **owner** | All permissions (*) |
| **admin** | Organization management, member management, all trading operations |
| **trader** | Create/update strategies, execute trades, view analytics |
| **analyst** | View strategies, full analytics access, view trades |
| **viewer** | Read-only access to organization data |

### Permission Format

```
resource:action

Examples:
- organization:read
- organization:update
- members:invite
- strategies:create
- strategies:read
- strategies:update
- strategies:delete
- trades:create
- trades:read
- analytics:read
- api_keys:create
```

### Permission Checking

```javascript
// In route handler
const hasPermission = await multiTenantService.hasPermission(
  req.organizationId,
  req.user.id,
  'strategies:create'
);

if (!hasPermission) {
  return res.status(403).json({ error: 'Permission denied' });
}

// Or use middleware
router.post('/api/strategies',
  requirePermission('strategies:create'),
  handler
);
```

---

## 💾 Database Schema

### Key Tables

**organizations**
- id, name, slug, domain
- status, plan
- owner_user_id
- max_users, max_api_keys, max_strategies
- trial_ends_at, subscription_ends_at

**organization_members**
- id, organization_id, user_id
- role (owner/admin/trader/analyst/viewer)
- status (active/inactive/invited/suspended)
- permissions (JSON for custom permissions)

**tenant_configurations**
- id, organization_id
- config_key, config_value, config_type
- is_public

**resource_quotas**
- id, organization_id, resource_type
- quota_limit, quota_used
- period (hourly/daily/monthly/yearly)
- enforce_limit, alert_enabled

**organization_activity_logs**
- id, organization_id, user_id
- action, resource_type, resource_id
- changes (JSON)

---

## 📊 Subscription Plans

### Default Quotas

```javascript
{
  free: {
    api_calls: 1000/month,
    strategies: 5,
    trades_per_day: 50,
    max_users: 3,
    max_api_keys: 2
  },
  starter: {
    api_calls: 10000/month,
    strategies: 25,
    trades_per_day: 500,
    max_users: 10,
    max_api_keys: 5
  },
  professional: {
    api_calls: 100000/month,
    strategies: 100,
    trades_per_day: 5000,
    max_users: 50,
    max_api_keys: 20
  },
  enterprise: {
    api_calls: unlimited,
    strategies: unlimited,
    trades_per_day: unlimited,
    max_users: unlimited,
    max_api_keys: unlimited
  }
}
```

---

## 🎯 Common Use Cases

### 1. Multi-User Trading Firm

```javascript
// Owner creates organization
const org = await multiTenantService.createOrganization({
  name: 'Acme Trading',
  plan: 'professional'
}, ownerId);

// Add traders
await multiTenantService.addMember(org.id, trader1Id, 'trader', owner.email);
await multiTenantService.addMember(org.id, trader2Id, 'trader', owner.email);

// Add analyst (read-only)
await multiTenantService.addMember(org.id, analystId, 'analyst', owner.email);

// Set organization preferences
await multiTenantService.setConfig(org.id, 'risk_level', 'conservative');
await multiTenantService.setConfig(org.id, 'max_position_size', 0.1, 'number');
```

### 2. White-Label Deployment

```javascript
// Create org with custom domain
const org = await multiTenantService.createOrganization({
  name: 'Acme Trading Platform',
  domain: 'trading.acme.com',
  plan: 'enterprise'
}, ownerId);

// Configure branding
await multiTenantService.setConfig(org.id, 'brand_logo', '/assets/acme-logo.png');
await multiTenantService.setConfig(org.id, 'primary_color', '#FF6600');
await multiTenantService.setConfig(org.id, 'company_name', 'Acme Corp');

// Access via custom domain
// https://trading.acme.com (automatically resolves to org)
```

### 3. Resource Quota Management

```javascript
// Check quota before operation
const quota = await multiTenantService.checkQuota(orgId, 'api_calls');

if (!quota.allowed) {
  throw new Error(`API quota exceeded. Limit: ${quota.limit}, Used: ${quota.used}`);
}

// Perform operation
const result = await performApiCall();

// Track usage
await multiTenantService.incrementQuotaUsage(orgId, 'api_calls', 1, {
  endpoint: '/api/market-data',
  user_id: userId
});
```

### 4. Audit Trail

```javascript
// Activity is automatically logged
await multiTenantService.updateOrganization(orgId, { name: 'New Name' }, userId);

// Retrieve activity logs
const db = require('../config/database');
const logs = await db('organization_activity_logs')
  .where({ organization_id: orgId })
  .orderBy('created_at', 'desc')
  .limit(50);

logs.forEach(log => {
  console.log(`${log.user_email} ${log.action} ${log.resource_type}`);
});
```

---

## ⚙️ Configuration Examples

### Environment Variables

```bash
# No additional env vars required
# Multi-tenant uses existing database connection
```

### Initialize Organization on User Signup

```javascript
// After user registration
const user = await registerUser(userData);

// Auto-create personal organization
const org = await multiTenantService.createOrganization({
  name: `${user.username}'s Organization`,
  plan: 'free'
}, user.id);

// Set as default
await db('users').where({ id: user.id }).update({
  default_organization_id: org.id
});
```

---

## 🔧 Troubleshooting

### Issue: Tenant context not resolved

**Check:**
```javascript
// Middleware applied?
app.use(resolveTenantContext);

// Header present?
console.log(req.headers['x-organization-id']);

// User authenticated?
console.log(req.user);
```

**Solution:**
```bash
# Always include header in requests
curl -H "X-Organization-ID: 1" -H "Authorization: Bearer TOKEN" http://api.example.com
```

### Issue: Permission denied

**Check:**
```javascript
// User is member?
const members = await multiTenantService.getMembers(orgId);
const member = members.find(m => m.user_id === userId);
console.log('Member role:', member?.role);

// Check permissions
const hasPermission = await multiTenantService.hasPermission(
  orgId, userId, 'strategies:create'
);
console.log('Has permission:', hasPermission);
```

**Solution:**
```javascript
// Update user role
await multiTenantService.updateMemberRole(orgId, userId, 'admin', ownerId);

// Or add custom permission
await db('organization_members')
  .where({ organization_id: orgId, user_id: userId })
  .update({
    permissions: JSON.stringify(['special:permission'])
  });
```

### Issue: Quota exceeded

**Check:**
```javascript
const quota = await multiTenantService.checkQuota(orgId, 'api_calls');
console.log('Quota:', quota);
```

**Solution:**
```javascript
// Upgrade plan
await multiTenantService.updateOrganization(orgId, {
  plan: 'professional'
}, ownerId);

// Or disable enforcement temporarily
await db('resource_quotas')
  .where({ organization_id: orgId, resource_type: 'api_calls' })
  .update({ enforce_limit: false });
```

---

## 📚 Additional Resources

- **Migration**: `backend/migrations/20250117000000_create_multi_tenant_tables.js`
- **Service**: `backend/services/multiTenantService.js`
- **Middleware**: `backend/middleware/multiTenant.js`
- **Routes**: `backend/routes/multiTenant.js`
- **Tests**: `backend/tests/sprint12-multi-tenant-tests.js`

---

## 🎯 Quick Commands

```bash
# Run migration
npx knex migrate:latest

# Test multi-tenant
npm test -- tests/sprint12-multi-tenant-tests.js

# Create organization via API
curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Org", "plan": "professional"}'

# List organizations
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/organizations

# Add member
curl -X POST http://localhost:3000/api/organizations/1/members \
  -H "Authorization: Bearer TOKEN" \
  -H "X-Organization-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 2, "role": "trader"}'

# Check quotas
curl -H "Authorization: Bearer TOKEN" \
  -H "X-Organization-ID: 1" \
  http://localhost:3000/api/organizations/1/quotas
```

---

**Version**: Sprint 12  
**Status**: Production Ready ✅  
**Coverage**: 70+ Tests  
**Last Updated**: January 2025

