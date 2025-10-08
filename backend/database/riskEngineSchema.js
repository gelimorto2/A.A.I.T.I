/**
 * Risk Engine Database Schema Functions
 * Schema definitions for real risk enforcement system
 */

/**
 * Create risk configuration table
 */
async function createRiskConfigurationTable(knex) {
  return knex.schema.createTable('risk_configuration', (table) => {
    table.string('id').primary();
    table.string('rule_name').notNullable();
    table.string('rule_type').notNullable(); // position_limit, drawdown_limit, leverage_limit, etc.
    table.text('conditions'); // JSON conditions
    table.decimal('threshold_value', 20, 8);
    table.string('action').notNullable(); // block, warn, reduce_position
    table.boolean('is_active').defaultTo(true);
    table.integer('priority').defaultTo(100);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['rule_type', 'is_active']);
    table.index('priority');
  });
}

/**
 * Create risk enforcement actions table
 */
async function createRiskEnforcementActionsTable(knex) {
  return knex.schema.createTable('risk_enforcement_actions', (table) => {
    table.string('id').primary();
    table.string('user_id');
    table.string('rule_id');
    table.string('order_id').nullable();
    table.string('action_type').notNullable(); // blocked, warned, position_reduced
    table.text('reason').notNullable();
    table.text('context'); // JSON context data
    table.decimal('original_amount', 20, 8).nullable();
    table.decimal('adjusted_amount', 20, 8).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'created_at']);
    table.index(['rule_id', 'action_type']);
    table.index('created_at');
  });
}

/**
 * Create circuit breakers table
 */
async function createCircuitBreakersTable(knex) {
  return knex.schema.createTable('circuit_breakers', (table) => {
    table.string('id').primary();
    table.string('breaker_type').notNullable(); // user, system, market
    table.string('entity_id'); // user_id, system_component, market_symbol
    table.string('trigger_reason').notNullable();
    table.timestamp('triggered_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at');
    table.boolean('is_active').defaultTo(true);
    table.text('metadata'); // JSON metadata
    
    table.index(['breaker_type', 'entity_id']);
    table.index(['is_active', 'expires_at']);
  });
}

/**
 * Create risk metrics view
 */
async function createRiskMetricsView(knex) {
  // Simple view for SQLite compatibility
  return knex.raw(`
    CREATE VIEW IF NOT EXISTS risk_metrics_view AS
    SELECT 
      user_id,
      COUNT(*) as total_actions,
      SUM(CASE WHEN action_type = 'blocked' THEN 1 ELSE 0 END) as blocked_count,
      SUM(CASE WHEN action_type = 'warned' THEN 1 ELSE 0 END) as warned_count,
      MAX(created_at) as last_action
    FROM risk_enforcement_actions
    GROUP BY user_id
  `);
}

/**
 * Insert default risk configuration
 */
async function insertDefaultRiskConfiguration(knex) {
  const defaultRules = [
    {
      id: 'max_position_size',
      rule_name: 'Maximum Position Size',
      rule_type: 'position_limit',
      conditions: JSON.stringify({ max_percentage: 25 }),
      threshold_value: 0.25,
      action: 'block',
      is_active: true,
      priority: 1
    },
    {
      id: 'max_drawdown',
      rule_name: 'Maximum Drawdown',
      rule_type: 'drawdown_limit',
      conditions: JSON.stringify({ max_percentage: 20 }),
      threshold_value: 0.20,
      action: 'block',
      is_active: true,
      priority: 2
    },
    {
      id: 'leverage_limit',
      rule_name: 'Leverage Limit',
      rule_type: 'leverage_limit',
      conditions: JSON.stringify({ max_leverage: 10 }),
      threshold_value: 10,
      action: 'reduce_position',
      is_active: true,
      priority: 3
    }
  ];

  // Use INSERT OR IGNORE for SQLite compatibility
  for (const rule of defaultRules) {
    try {
      await knex('risk_configuration').insert({
        ...rule,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    } catch (error) {
      // Ignore duplicate key errors (INSERT OR IGNORE behavior)
      if (!error.message.includes('UNIQUE constraint failed')) {
        throw error;
      }
    }
  }
  
  return Promise.resolve();
}

/**
 * Create performance indexes
 */
async function createPerformanceIndexes(knex) {
  // Indexes are already created in table definitions
  return Promise.resolve();
}

/**
 * Create triggers (SQLite doesn't support complex triggers like PostgreSQL)
 */
async function createTriggers(knex) {
  // SQLite trigger for updating updated_at timestamp
  return knex.raw(`
    CREATE TRIGGER IF NOT EXISTS update_risk_configuration_timestamp 
    AFTER UPDATE ON risk_configuration
    BEGIN
      UPDATE risk_configuration SET updated_at = datetime('now') WHERE id = NEW.id;
    END
  `);
}

module.exports = {
  createRiskConfigurationTable,
  createRiskEnforcementActionsTable,
  createCircuitBreakersTable,
  createRiskMetricsView,
  insertDefaultRiskConfiguration,
  createPerformanceIndexes,
  createTriggers
};