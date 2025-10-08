/**
 * A.A.I.T.I PostgreSQL Production Migration
 * Comprehensive schema for enterprise trading platform
 * 
 * Features:
 * - Optimized schemas for trading, ML, and risk management
 * - Time-series optimized tables for market data
 * - Advanced indexing for high-frequency queries
 * - Audit trails and compliance tracking
 * - Performance monitoring tables
 */

exports.up = function(knex) {
  return knex.schema.raw(`
    -- Enable required extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "btree_gin";
    CREATE EXTENSION IF NOT EXISTS "btree_gist";
    
    -- Create trading schemas
    CREATE SCHEMA IF NOT EXISTS trading;
    CREATE SCHEMA IF NOT EXISTS ml_models;
    CREATE SCHEMA IF NOT EXISTS analytics;
    CREATE SCHEMA IF NOT EXISTS risk_management;
    CREATE SCHEMA IF NOT EXISTS audit;
  `)
  .then(() => {
    // Users and authentication
    return knex.schema.createTable('users', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('first_name');
      table.string('last_name');
      table.enum('role', ['admin', 'trader', 'analyst', 'viewer']).defaultTo('trader');
      table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
      table.jsonb('preferences').defaultTo('{}');
      table.jsonb('permissions').defaultTo('{}');
      table.timestamp('last_login');
      table.timestamps(true, true);
      table.timestamp('deleted_at');
      
      // Indexes
      table.index(['email', 'status']);
      table.index(['role', 'status']);
      table.index('created_at');
    });
  })
  .then(() => {
    // API Keys management
    return knex.schema.createTable('api_keys', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('key_hash').notNullable();
      table.jsonb('permissions').defaultTo('{}');
      table.timestamp('expires_at');
      table.timestamp('last_used');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['user_id', 'is_active']);
      table.index('expires_at');
    });
  })
  .then(() => {
    // Exchange connections
    return knex.schema.withSchema('trading').createTable('exchange_accounts', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('public.users').onDelete('CASCADE');
      table.string('exchange').notNullable(); // binance, coinbase, etc.
      table.string('account_name');
      table.text('api_key_encrypted').notNullable();
      table.text('api_secret_encrypted').notNullable();
      table.text('passphrase_encrypted'); // for some exchanges
      table.boolean('is_sandbox').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.jsonb('permissions').defaultTo('{}');
      table.timestamp('last_sync');
      table.timestamps(true, true);
      
      table.index(['user_id', 'exchange', 'is_active']);
      table.index(['exchange', 'is_active']);
    });
  })
  .then(() => {
    // Market data - optimized for time-series
    return knex.schema.withSchema('trading').createTable('market_data', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('symbol').notNullable();
      table.string('exchange').notNullable();
      table.timestamp('timestamp').notNullable();
      table.string('timeframe').notNullable(); // 1m, 5m, 1h, 1d
      table.decimal('open', 20, 8).notNullable();
      table.decimal('high', 20, 8).notNullable();
      table.decimal('low', 20, 8).notNullable();
      table.decimal('close', 20, 8).notNullable();
      table.decimal('volume', 20, 8).notNullable();
      table.decimal('quote_volume', 20, 8);
      table.integer('trades_count');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Unique constraint to prevent duplicates
      table.unique(['symbol', 'exchange', 'timestamp', 'timeframe']);
      
      // Optimized indexes for time-series queries
      table.index(['symbol', 'timeframe', 'timestamp']);
      table.index(['timestamp', 'symbol']);
      table.index(['exchange', 'symbol', 'timestamp']);
    });
  })
  .then(() => {
    // Trading orders
    return knex.schema.withSchema('trading').createTable('orders', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('public.users').onDelete('CASCADE');
      table.uuid('exchange_account_id').references('id').inTable('trading.exchange_accounts').onDelete('CASCADE');
      table.string('external_order_id'); // Exchange's order ID
      table.string('symbol').notNullable();
      table.enum('side', ['BUY', 'SELL']).notNullable();
      table.enum('type', ['MARKET', 'LIMIT', 'STOP_LOSS', 'TAKE_PROFIT', 'OCO']).notNullable();
      table.decimal('quantity', 20, 8).notNullable();
      table.decimal('price', 20, 8);
      table.decimal('stop_price', 20, 8);
      table.decimal('filled_quantity', 20, 8).defaultTo(0);
      table.decimal('avg_fill_price', 20, 8);
      table.enum('status', ['PENDING', 'OPEN', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED']).defaultTo('PENDING');
      table.enum('time_in_force', ['GTC', 'IOC', 'FOK']).defaultTo('GTC');
      table.jsonb('metadata').defaultTo('{}');
      table.timestamp('placed_at').notNullable();
      table.timestamp('filled_at');
      table.timestamp('cancelled_at');
      table.timestamps(true, true);
      
      table.index(['user_id', 'status', 'placed_at']);
      table.index(['symbol', 'status', 'placed_at']);
      table.index(['exchange_account_id', 'status']);
      table.index('external_order_id');
    });
  })
  .then(() => {
    // Trade executions
    return knex.schema.withSchema('trading').createTable('trades', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('order_id').references('id').inTable('trading.orders').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('public.users').onDelete('CASCADE');
      table.string('external_trade_id'); // Exchange's trade ID
      table.string('symbol').notNullable();
      table.enum('side', ['BUY', 'SELL']).notNullable();
      table.decimal('quantity', 20, 8).notNullable();
      table.decimal('price', 20, 8).notNullable();
      table.decimal('fee', 20, 8).defaultTo(0);
      table.string('fee_currency');
      table.decimal('quote_quantity', 20, 8).notNullable(); // quantity * price
      table.timestamp('executed_at').notNullable();
      table.jsonb('metadata').defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['user_id', 'symbol', 'executed_at']);
      table.index(['order_id', 'executed_at']);
      table.index(['symbol', 'executed_at']);
      table.index('external_trade_id');
    });
  })
  .then(() => {
    // Portfolio positions
    return knex.schema.withSchema('trading').createTable('positions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('public.users').onDelete('CASCADE');
      table.uuid('exchange_account_id').references('id').inTable('trading.exchange_accounts').onDelete('CASCADE');
      table.string('symbol').notNullable();
      table.decimal('quantity', 20, 8).notNullable();
      table.decimal('avg_price', 20, 8).notNullable();
      table.decimal('unrealized_pnl', 20, 8).defaultTo(0);
      table.decimal('realized_pnl', 20, 8).defaultTo(0);
      table.timestamp('opened_at').notNullable();
      table.timestamp('last_updated').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.unique(['user_id', 'exchange_account_id', 'symbol']);
      table.index(['user_id', 'symbol']);
      table.index('last_updated');
    });
  })
  .then(() => {
    // ML Models
    return knex.schema.withSchema('ml_models').createTable('models', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('public.users').onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('type').notNullable(); // lstm, ensemble, random_forest, etc.
      table.string('symbol');
      table.string('timeframe');
      table.jsonb('parameters').defaultTo('{}');
      table.jsonb('features').defaultTo('[]');
      table.enum('status', ['training', 'active', 'inactive', 'error']).defaultTo('training');
      table.decimal('accuracy', 5, 4);
      table.decimal('precision', 5, 4);
      table.decimal('recall', 5, 4);
      table.decimal('f1_score', 5, 4);
      table.integer('training_samples');
      table.timestamp('last_trained');
      table.timestamp('last_prediction');
      table.timestamps(true, true);
      
      table.index(['user_id', 'status']);
      table.index(['symbol', 'status']);
      table.index(['type', 'status']);
    });
  })
  .then(() => {
    // ML Predictions
    return knex.schema.withSchema('ml_models').createTable('predictions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('model_id').references('id').inTable('ml_models.models').onDelete('CASCADE');
      table.string('symbol').notNullable();
      table.timestamp('timestamp').notNullable();
      table.string('timeframe').notNullable();
      table.enum('prediction', ['BUY', 'SELL', 'HOLD']).notNullable();
      table.decimal('confidence', 5, 4).notNullable();
      table.decimal('predicted_price', 20, 8);
      table.decimal('current_price', 20, 8).notNullable();
      table.decimal('actual_price', 20, 8); // Filled later for accuracy calculation
      table.enum('actual_result', ['BUY', 'SELL', 'HOLD']); // Filled later
      table.boolean('is_correct'); // Calculated field
      table.jsonb('features_used').defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['model_id', 'timestamp']);
      table.index(['symbol', 'timestamp']);
      table.index(['timestamp', 'symbol']);
      table.index(['model_id', 'symbol', 'timestamp']);
    });
  })
  .then(() => {
    // Risk management - Portfolio snapshots
    return knex.schema.withSchema('risk_management').createTable('portfolio_snapshots', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('public.users').onDelete('CASCADE');
      table.timestamp('timestamp').notNullable();
      table.decimal('total_value', 20, 8).notNullable();
      table.decimal('total_pnl', 20, 8).notNullable();
      table.decimal('daily_pnl', 20, 8);
      table.decimal('unrealized_pnl', 20, 8);
      table.decimal('realized_pnl', 20, 8);
      table.decimal('var_95', 20, 8); // Value at Risk 95%
      table.decimal('max_drawdown', 20, 8);
      table.decimal('sharpe_ratio', 10, 6);
      table.integer('open_positions');
      table.jsonb('positions_detail').defaultTo('{}');
      table.jsonb('risk_metrics').defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['user_id', 'timestamp']);
      table.index('timestamp');
    });
  })
  .then(() => {
    // Analytics - Performance metrics
    return knex.schema.withSchema('analytics').createTable('performance_metrics', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('public.users').onDelete('CASCADE');
      table.string('metric_type').notNullable(); // daily, weekly, monthly, yearly
      table.date('period_start').notNullable();
      table.date('period_end').notNullable();
      table.decimal('total_return', 10, 6);
      table.decimal('annualized_return', 10, 6);
      table.decimal('volatility', 10, 6);
      table.decimal('sharpe_ratio', 10, 6);
      table.decimal('max_drawdown', 10, 6);
      table.decimal('win_rate', 5, 4);
      table.integer('total_trades');
      table.integer('winning_trades');
      table.integer('losing_trades');
      table.decimal('avg_win', 20, 8);
      table.decimal('avg_loss', 20, 8);
      table.decimal('profit_factor', 10, 6);
      table.jsonb('detailed_metrics').defaultTo('{}');
      table.timestamp('calculated_at').defaultTo(knex.fn.now());
      
      table.unique(['user_id', 'metric_type', 'period_start', 'period_end']);
      table.index(['user_id', 'metric_type', 'period_start']);
    });
  })
  .then(() => {
    // Audit trail
    return knex.schema.withSchema('audit').createTable('activity_log', table => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('public.users').onDelete('SET NULL');
      table.string('action').notNullable();
      table.string('resource_type');
      table.uuid('resource_id');
      table.jsonb('old_values').defaultTo('{}');
      table.jsonb('new_values').defaultTo('{}');
      table.string('ip_address');
      table.string('user_agent');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['user_id', 'created_at']);
      table.index(['action', 'created_at']);
      table.index(['resource_type', 'resource_id']);
      table.index('created_at');
    });
  })
  .then(() => {
    // System configurations
    return knex.schema.createTable('system_config', table => {
      table.string('key').primary();
      table.jsonb('value').notNullable();
      table.string('description');
      table.enum('type', ['string', 'number', 'boolean', 'json']).defaultTo('string');
      table.boolean('is_sensitive').defaultTo(false);
      table.timestamps(true, true);
    });
  })
  .then(() => {
    // Insert default system configurations
    return knex('system_config').insert([
      {
        key: 'trading.max_position_size',
        value: JSON.stringify(0.1),
        description: 'Maximum position size as percentage of portfolio',
        type: 'number'
      },
      {
        key: 'trading.default_stop_loss',
        value: JSON.stringify(0.02),
        description: 'Default stop loss percentage',
        type: 'number'
      },
      {
        key: 'trading.default_take_profit',
        value: JSON.stringify(0.05),
        description: 'Default take profit percentage',
        type: 'number'
      },
      {
        key: 'ml.min_confidence_threshold',
        value: JSON.stringify(0.65),
        description: 'Minimum confidence for ML predictions to trigger trades',
        type: 'number'
      },
      {
        key: 'risk.max_daily_loss',
        value: JSON.stringify(0.05),
        description: 'Maximum daily loss percentage before trading halt',
        type: 'number'
      }
    ]);
  });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('system_config')
    .withSchema('audit').dropTableIfExists('activity_log')
    .withSchema('analytics').dropTableIfExists('performance_metrics')
    .withSchema('risk_management').dropTableIfExists('portfolio_snapshots')
    .withSchema('ml_models').dropTableIfExists('predictions')
    .withSchema('ml_models').dropTableIfExists('models')
    .withSchema('trading').dropTableIfExists('positions')
    .withSchema('trading').dropTableIfExists('trades')
    .withSchema('trading').dropTableIfExists('orders')
    .withSchema('trading').dropTableIfExists('market_data')
    .withSchema('trading').dropTableIfExists('exchange_accounts')
    .dropTableIfExists('api_keys')
    .dropTableIfExists('users')
    .then(() => {
      return knex.schema.raw(`
        DROP SCHEMA IF EXISTS audit CASCADE;
        DROP SCHEMA IF EXISTS analytics CASCADE;
        DROP SCHEMA IF EXISTS risk_management CASCADE;
        DROP SCHEMA IF EXISTS ml_models CASCADE;
        DROP SCHEMA IF EXISTS trading CASCADE;
      `);
    });
};