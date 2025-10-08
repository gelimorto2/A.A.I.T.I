/**
 * Sprint 3: ML Models Schema Enhancement
 * Comprehensive model versioning, artifact storage, and lineage tracking
 */

exports.up = function(knex) {
  return knex.schema
    // Enhanced ml_models table with versioning and artifact storage
    .createTable('ml_models', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.string('type', 100).notNullable(); // LSTM, GRU, CNN, Transformer, etc.
      table.text('description');
      table.jsonb('params').notNullable(); // Training parameters, hyperparameters
      table.jsonb('metrics').notNullable(); // R², MAE, Sharpe, etc.
      table.string('artifact_uri', 500); // Path/URL to serialized model
      table.string('version', 50).notNullable(); // Semantic versioning
      table.string('repro_hash', 64).notNullable().unique(); // SHA256 of params + data slice
      table.string('status', 50).defaultTo('draft'); // draft, training, active, deprecated
      table.boolean('is_simulated').defaultTo(false); // Flag for mock/simulated models
      table.integer('training_samples');
      table.integer('validation_samples');
      table.timestamp('training_started_at');
      table.timestamp('training_completed_at');
      table.timestamps(true, true);
      
      // Indexes
      table.index('type');
      table.index('status');
      table.index('version');
      table.index('repro_hash');
      table.index(['name', 'version']);
    })
    
    // Model performance metrics tracking over time
    .createTable('model_metrics', function(table) {
      table.increments('id').primary();
      table.integer('model_id').unsigned().notNullable()
        .references('id').inTable('ml_models').onDelete('CASCADE');
      table.string('metric_type', 100).notNullable(); // accuracy, mae, mse, sharpe, etc.
      table.decimal('value', 15, 6).notNullable();
      table.jsonb('metadata'); // Additional context
      table.timestamp('evaluated_at').notNullable();
      table.timestamps(true, true);
      
      // Indexes
      table.index('model_id');
      table.index('metric_type');
      table.index('evaluated_at');
      table.index(['model_id', 'metric_type', 'evaluated_at']);
    })
    
    // Model evaluation results for reproducibility
    .createTable('model_evaluations', function(table) {
      table.increments('id').primary();
      table.integer('model_id').unsigned().notNullable()
        .references('id').inTable('ml_models').onDelete('CASCADE');
      table.string('evaluation_type', 100).notNullable(); // backtest, walk_forward, live
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.jsonb('results').notNullable(); // Full evaluation results
      table.jsonb('config'); // Evaluation configuration
      table.decimal('sharpe_ratio', 10, 4);
      table.decimal('max_drawdown', 10, 4);
      table.decimal('win_rate', 10, 4);
      table.decimal('profit_factor', 10, 4);
      table.timestamps(true, true);
      
      // Indexes
      table.index('model_id');
      table.index('evaluation_type');
      table.index(['model_id', 'evaluation_type']);
    })
    
    // Strategy lifecycle management
    .createTable('strategies', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.text('description');
      table.string('type', 100).notNullable(); // momentum, mean_reversion, arbitrage, etc.
      table.jsonb('config').notNullable(); // Strategy parameters
      table.integer('model_id').unsigned()
        .references('id').inTable('ml_models').onDelete('SET NULL');
      table.string('status', 50).defaultTo('draft'); // draft, validate, approve, deploy, deprecated
      table.string('lifecycle_state', 50).defaultTo('created'); // State machine tracking
      table.integer('created_by').unsigned()
        .references('id').inTable('users').onDelete('SET NULL');
      table.integer('approved_by').unsigned()
        .references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('approved_at');
      table.timestamp('deployed_at');
      table.timestamps(true, true);
      
      // Indexes
      table.index('status');
      table.index('lifecycle_state');
      table.index('model_id');
      table.index('created_by');
    })
    
    // Strategy validation results
    .createTable('strategy_validations', function(table) {
      table.increments('id').primary();
      table.integer('strategy_id').unsigned().notNullable()
        .references('id').inTable('strategies').onDelete('CASCADE');
      table.string('validation_type', 100).notNullable(); // backtest, risk_check, compliance
      table.boolean('passed').notNullable();
      table.jsonb('results').notNullable();
      table.text('notes');
      table.integer('validated_by').unsigned()
        .references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
      
      // Indexes
      table.index('strategy_id');
      table.index('validation_type');
      table.index(['strategy_id', 'validation_type']);
    })
    
    // Backtest fixtures for deterministic testing
    .createTable('backtest_fixtures', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.string('symbol', 50).notNullable();
      table.string('timeframe', 50).notNullable();
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.jsonb('data').notNullable(); // OHLCV data
      table.string('checksum', 64).notNullable(); // Data integrity hash
      table.timestamps(true, true);
      
      // Indexes
      table.index('symbol');
      table.index(['symbol', 'timeframe']);
      table.unique(['name', 'symbol', 'timeframe']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('backtest_fixtures')
    .dropTableIfExists('strategy_validations')
    .dropTableIfExists('strategies')
    .dropTableIfExists('model_evaluations')
    .dropTableIfExists('model_metrics')
    .dropTableIfExists('ml_models');
};
