/**
 * Migration: Create Multi-Tenant Tables
 * 
 * Creates the database schema for multi-tenant support including:
 * - Organizations (top-level tenants)
 * - Tenant configurations
 * - Sub-accounts with role inheritance
 * - Resource quotas and usage tracking
 * - Tenant-specific settings
 * 
 * @module migrations/create_multi_tenant_tables
 */

exports.up = async function(knex) {
  // 1. Organizations table (top-level tenants)
  await knex.schema.createTable('organizations', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.string('domain', 255).nullable(); // Custom domain for white-label
    table.enum('status', ['active', 'suspended', 'trial', 'cancelled']).defaultTo('active');
    table.enum('plan', ['free', 'starter', 'professional', 'enterprise']).defaultTo('free');
    table.integer('owner_user_id').unsigned().notNullable();
    table.text('description').nullable();
    table.string('industry', 100).nullable();
    table.integer('max_users').defaultTo(5);
    table.integer('max_api_keys').defaultTo(10);
    table.integer('max_strategies').defaultTo(50);
    table.timestamp('trial_ends_at').nullable();
    table.timestamp('subscription_ends_at').nullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index('slug');
    table.index('domain');
    table.index('owner_user_id');
    table.index('status');
    table.index(['status', 'plan']);
    
    // Foreign key
    table.foreign('owner_user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // 2. Tenant configurations table
  await knex.schema.createTable('tenant_configurations', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').unsigned().notNullable();
    table.string('config_key', 100).notNullable();
    table.text('config_value').notNullable();
    table.enum('config_type', ['string', 'number', 'boolean', 'json', 'encrypted']).defaultTo('string');
    table.text('description').nullable();
    table.boolean('is_public').defaultTo(false); // Can be exposed to API
    table.timestamps(true, true);
    
    // Unique constraint per organization
    table.unique(['organization_id', 'config_key']);
    table.index('organization_id');
    table.index('config_key');
    
    // Foreign key
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });

  // 3. Organization members (sub-accounts)
  await knex.schema.createTable('organization_members', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('user_id').unsigned().notNullable();
    table.enum('role', ['owner', 'admin', 'trader', 'analyst', 'viewer']).defaultTo('viewer');
    table.enum('status', ['active', 'inactive', 'invited', 'suspended']).defaultTo('invited');
    table.json('permissions').nullable(); // Custom permissions JSON
    table.string('invited_by_email', 255).nullable();
    table.timestamp('invited_at').nullable();
    table.timestamp('joined_at').nullable();
    table.timestamp('last_active_at').nullable();
    table.timestamps(true, true);
    
    // Unique constraint - one user per organization
    table.unique(['organization_id', 'user_id']);
    table.index('organization_id');
    table.index('user_id');
    table.index(['organization_id', 'status']);
    table.index('role');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // 4. Resource quotas table
  await knex.schema.createTable('resource_quotas', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').unsigned().notNullable();
    table.string('resource_type', 100).notNullable(); // api_calls, strategies, trades, etc.
    table.bigInteger('quota_limit').notNullable(); // Maximum allowed
    table.bigInteger('quota_used').defaultTo(0); // Current usage
    table.enum('period', ['hourly', 'daily', 'monthly', 'yearly', 'lifetime']).defaultTo('monthly');
    table.timestamp('period_start').notNullable();
    table.timestamp('period_end').notNullable();
    table.boolean('enforce_limit').defaultTo(true);
    table.boolean('alert_enabled').defaultTo(true);
    table.integer('alert_threshold_percent').defaultTo(80); // Alert at 80% usage
    table.timestamp('last_alerted_at').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index('organization_id');
    table.index(['organization_id', 'resource_type']);
    table.index(['period_start', 'period_end']);
    
    // Foreign key
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });

  // 5. Resource usage logs (for detailed tracking)
  await knex.schema.createTable('resource_usage_logs', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('user_id').unsigned().nullable();
    table.string('resource_type', 100).notNullable();
    table.integer('quantity').defaultTo(1);
    table.json('metadata').nullable(); // Additional context
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('organization_id');
    table.index('user_id');
    table.index(['organization_id', 'resource_type']);
    table.index('created_at');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
  });

  // 6. Organization invitations
  await knex.schema.createTable('organization_invitations', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').unsigned().notNullable();
    table.string('email', 255).notNullable();
    table.enum('role', ['admin', 'trader', 'analyst', 'viewer']).defaultTo('viewer');
    table.string('token', 100).notNullable().unique();
    table.integer('invited_by_user_id').unsigned().notNullable();
    table.enum('status', ['pending', 'accepted', 'declined', 'expired']).defaultTo('pending');
    table.timestamp('expires_at').notNullable();
    table.timestamp('accepted_at').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index('organization_id');
    table.index('email');
    table.index('token');
    table.index(['organization_id', 'email']);
    table.index('status');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('invited_by_user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // 7. Organization API keys (tenant-specific API keys)
  await knex.schema.createTable('organization_api_keys', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('created_by_user_id').unsigned().notNullable();
    table.string('name', 255).notNullable();
    table.string('key_hash', 255).notNullable().unique(); // Hashed API key
    table.string('key_prefix', 20).notNullable(); // First few chars for identification
    table.json('scopes').nullable(); // Permissions: ['trading', 'analytics', 'read_only']
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_used_at').nullable();
    table.timestamp('expires_at').nullable();
    table.integer('rate_limit').defaultTo(1000); // Requests per hour
    table.string('ip_whitelist', 1000).nullable(); // Comma-separated IPs
    table.timestamps(true, true);
    
    // Indexes
    table.index('organization_id');
    table.index('key_hash');
    table.index('key_prefix');
    table.index(['organization_id', 'is_active']);
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('created_by_user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // 8. Organization activity logs
  await knex.schema.createTable('organization_activity_logs', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('user_id').unsigned().nullable();
    table.string('action', 100).notNullable(); // created, updated, deleted, etc.
    table.string('resource_type', 100).notNullable(); // user, strategy, api_key, etc.
    table.integer('resource_id').nullable();
    table.json('changes').nullable(); // Before/after values
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('organization_id');
    table.index('user_id');
    table.index(['organization_id', 'action']);
    table.index(['organization_id', 'resource_type']);
    table.index('created_at');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
  });

  // 9. Add organization_id to existing tables for data isolation
  
  // Add to users table
  await knex.schema.table('users', (table) => {
    table.integer('default_organization_id').unsigned().nullable();
    table.index('default_organization_id');
  });

  // Add to strategies table (if exists)
  const hasStrategiesTable = await knex.schema.hasTable('strategies');
  if (hasStrategiesTable) {
    await knex.schema.table('strategies', (table) => {
      table.integer('organization_id').unsigned().nullable();
      table.index('organization_id');
      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    });
  }

  // Add to api_keys table (if exists)
  const hasApiKeysTable = await knex.schema.hasTable('api_keys');
  if (hasApiKeysTable) {
    await knex.schema.table('api_keys', (table) => {
      table.integer('organization_id').unsigned().nullable();
      table.index('organization_id');
      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    });
  }

  // Add to ml_models table (if exists)
  const hasMLModelsTable = await knex.schema.hasTable('ml_models');
  if (hasMLModelsTable) {
    await knex.schema.table('ml_models', (table) => {
      table.integer('organization_id').unsigned().nullable();
      table.index('organization_id');
      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    });
  }
};

exports.down = async function(knex) {
  // Remove organization_id from existing tables
  const hasMLModelsTable = await knex.schema.hasTable('ml_models');
  if (hasMLModelsTable) {
    await knex.schema.table('ml_models', (table) => {
      table.dropColumn('organization_id');
    });
  }

  const hasApiKeysTable = await knex.schema.hasTable('api_keys');
  if (hasApiKeysTable) {
    await knex.schema.table('api_keys', (table) => {
      table.dropColumn('organization_id');
    });
  }

  const hasStrategiesTable = await knex.schema.hasTable('strategies');
  if (hasStrategiesTable) {
    await knex.schema.table('strategies', (table) => {
      table.dropColumn('organization_id');
    });
  }

  await knex.schema.table('users', (table) => {
    table.dropColumn('default_organization_id');
  });

  // Drop multi-tenant tables in reverse order
  await knex.schema.dropTableIfExists('organization_activity_logs');
  await knex.schema.dropTableIfExists('organization_api_keys');
  await knex.schema.dropTableIfExists('organization_invitations');
  await knex.schema.dropTableIfExists('resource_usage_logs');
  await knex.schema.dropTableIfExists('resource_quotas');
  await knex.schema.dropTableIfExists('organization_members');
  await knex.schema.dropTableIfExists('tenant_configurations');
  await knex.schema.dropTableIfExists('organizations');
};

/**
 * Migration Summary:
 * 
 * Tables Created:
 * 1. organizations - Top-level tenant entities
 * 2. tenant_configurations - Key-value config storage per tenant
 * 3. organization_members - User memberships with roles
 * 4. resource_quotas - Usage limits per resource type
 * 5. resource_usage_logs - Detailed usage tracking
 * 6. organization_invitations - Member invitation system
 * 7. organization_api_keys - Tenant-specific API keys
 * 8. organization_activity_logs - Audit trail per organization
 * 
 * Modified Tables:
 * - users: Added default_organization_id
 * - strategies: Added organization_id (if exists)
 * - api_keys: Added organization_id (if exists)
 * - ml_models: Added organization_id (if exists)
 * 
 * Features Enabled:
 * ✓ Complete data isolation per tenant
 * ✓ Role-based access control (RBAC)
 * ✓ Resource quota management
 * ✓ Usage tracking and billing support
 * ✓ Invitation system for team management
 * ✓ Audit logging per organization
 * ✓ Custom domain support (white-label ready)
 * ✓ Flexible configuration per tenant
 */
