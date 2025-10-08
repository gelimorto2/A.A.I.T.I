/**
 * Sprint 3 ML & Strategy Legitimacy Schema Migration (Fixed for SQLite)
 * 
 * Features:
 * - Expanded ML models schema with artifact storage, versioning, and lineage tracking
 * - Model performance tracking and validation
 * - Model reproducibility hash (params + data slice checksum)
 * - Strategy lifecycle endpoints: draft → validate → approve → deploy (status field)
 * - Comprehensive model evaluation metrics storage
 */

exports.up = async function(knex) {
  // Check if we're using PostgreSQL or SQLite
  const isPostgreSQL = knex.client.config.client === 'pg';
  
  // Expanded ML models table with comprehensive metadata
  await knex.schema.createTable('ml_models_expanded', (table) => {
    if (isPostgreSQL) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    } else {
      table.string('id').primary();
    }
    table.string('name').notNullable();
    table.string('type').notNullable(); // lstm, linear_regression, random_forest, etc.
    table.text('params').notNullable(); // JSON parameters used for training
    table.text('metrics').defaultTo('{}'); // Performance metrics (R², MAE, Sharpe, etc.)
    table.string('artifact_ref'); // Reference to stored model artifacts
    table.string('version').defaultTo('1.0.0');
    table.string('reproducibility_hash'); // Hash of params + data slice checksum
    table.string('user_id'); // FK to users
    table.string('status').defaultTo('draft'); // draft, validated, approved, deployed, deprecated
    table.string('algorithm_type').notNullable();
    table.string('target_timeframe').notNullable();
    table.text('symbols').notNullable(); // JSON array as TEXT for SQLite
    table.integer('training_data_points').defaultTo(0);
    table.timestamp('last_trained');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['user_id', 'status']);
    table.index(['type', 'status']);
    table.index('reproducibility_hash');
    table.index('created_at');
  });

  // Model performance tracking over time
  await knex.schema.createTable('model_performance', (table) => {
    if (isPostgreSQL) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    } else {
      table.string('id').primary();
    }
    table.string('model_id'); // FK to ml_models_expanded
    table.date('evaluation_date').notNullable();
    table.decimal('accuracy', 8, 6);
    table.decimal('r_squared', 8, 6);
    table.decimal('mae', 12, 8);
    table.decimal('mse', 12, 8);
    table.decimal('sharpe_ratio', 8, 4);
    table.decimal('calmar_ratio', 8, 4);
    table.decimal('information_ratio', 8, 4);
    table.decimal('max_drawdown', 8, 4);
    table.decimal('win_rate', 8, 4);
    table.decimal('profit_factor', 8, 4);
    table.decimal('directional_accuracy', 8, 4);
    table.integer('total_predictions').defaultTo(0);
    table.integer('correct_predictions').defaultTo(0);
    table.text('additional_metrics'); // JSON for custom metrics
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['model_id', 'evaluation_date']);
    table.index('evaluation_date');
  });

  // Model activity log for audit trails
  await knex.schema.createTable('model_activity_log', (table) => {
    if (isPostgreSQL) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    } else {
      table.string('id').primary();
    }
    table.string('model_id'); // FK to ml_models_expanded
    table.string('user_id'); // FK to users
    table.string('action').notNullable(); // trained, validated, approved, deployed, deprecated
    table.string('status_from'); // Previous status
    table.string('status_to'); // New status
    table.text('notes'); // Optional notes about the action
    table.text('metadata').defaultTo('{}'); // JSON metadata
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['model_id', 'created_at']);
    table.index(['user_id', 'created_at']);
    table.index('action');
  });

  // Strategy lifecycle management table (draft → validate → approve → deploy)
  await knex.schema.createTable('strategy_lifecycle', (table) => {
    if (isPostgreSQL) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    } else {
      table.string('id').primary();
    }
    table.string('strategy_name').notNullable();
    table.string('model_id'); // FK to ml_models_expanded
    table.string('status').defaultTo('draft'); // draft, validating, approved, deployed, deprecated
    table.string('approver_id'); // FK to users who approved
    table.timestamp('drafted_at').defaultTo(knex.fn.now());
    table.timestamp('validated_at');
    table.timestamp('approved_at');
    table.timestamp('deployed_at');
    table.timestamp('deprecated_at');
    table.text('validation_results'); // JSON validation test results
    table.text('deployment_config'); // JSON deployment configuration
    table.text('notes'); // Strategy description and notes
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['model_id', 'status']);
    table.index(['status', 'created_at']);
    table.index('approver_id');
  });

  // Deterministic backtest fixtures table for reproducible testing
  await knex.schema.createTable('backtest_fixtures', (table) => {
    if (isPostgreSQL) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    } else {
      table.string('id').primary();
    }
    table.string('name').notNullable(); // Fixture name (e.g., "BTC_2021_Bull_Run")
    table.string('symbol').notNullable(); // Trading symbol
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.text('data_points'); // JSON array of OHLCV data
    table.text('market_conditions'); // JSON description of market conditions
    table.string('checksum'); // Data integrity checksum
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['symbol', 'start_date', 'end_date']);
    table.index('name');
    table.index('is_active');
  });

  // Model artifacts storage metadata
  await knex.schema.createTable('model_artifacts', (table) => {
    if (isPostgreSQL) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    } else {
      table.string('id').primary();
    }
    table.string('model_id'); // FK to ml_models_expanded
    table.string('artifact_type').notNullable(); // weights, scaler, preprocessor, full_model
    table.string('file_path'); // Local file path or cloud storage URL
    table.string('storage_type').defaultTo('local'); // local, s3, gcs, azure
    table.integer('file_size'); // Size in bytes
    table.string('checksum'); // File integrity checksum
    table.text('metadata'); // JSON metadata about the artifact
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['model_id', 'artifact_type']);
    table.index('storage_type');
  });

  // Comprehensive model evaluation metrics storage
  await knex.schema.createTable('model_evaluation_metrics', (table) => {
    if (isPostgreSQL) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    } else {
      table.string('id').primary();
    }
    table.string('model_id'); // FK to ml_models_expanded
    table.string('metric_name').notNullable(); // accuracy, precision, recall, f1_score, etc.
    table.decimal('metric_value', 12, 8).notNullable();
    table.string('metric_type').notNullable(); // classification, regression, trading, risk
    table.string('evaluation_set').notNullable(); // train, validation, test, live
    table.date('evaluation_date').notNullable();
    table.text('context'); // JSON context about the evaluation
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['model_id', 'metric_name', 'evaluation_date']);
    table.index(['metric_type', 'evaluation_set']);
    table.index('evaluation_date');
  });

  // Training metadata and lineage tracking
  await knex.schema.createTable('training_metadata', (table) => {
    if (isPostgreSQL) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    } else {
      table.string('id').primary();
    }
    table.string('model_id'); // FK to ml_models_expanded
    table.timestamp('training_started').notNullable();
    table.timestamp('training_completed');
    table.integer('training_duration_seconds');
    table.text('hyperparameters'); // JSON hyperparameters used
    table.text('data_sources'); // JSON array of data sources used
    table.integer('training_samples');
    table.integer('validation_samples');
    table.integer('test_samples');
    table.string('training_environment'); // local, cloud, docker
    table.text('dependencies'); // JSON package versions and dependencies
    table.text('hardware_info'); // JSON hardware specifications
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['model_id', 'training_started']);
    table.index('training_started');
  });

  // Model reproducibility tracking with parameter and data checksums
  await knex.schema.createTable('model_reproducibility', (table) => {
    if (isPostgreSQL) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    } else {
      table.string('id').primary();
    }
    table.string('model_id'); // FK to ml_models_expanded
    table.string('params_hash').notNullable(); // Hash of model parameters
    table.string('data_hash').notNullable(); // Hash of training data slice
    table.string('code_hash'); // Hash of training code/pipeline
    table.string('environment_hash'); // Hash of environment/dependencies
    table.string('combined_hash').notNullable(); // Combined reproducibility hash
    table.text('reproduction_instructions'); // JSON instructions for reproduction
    table.boolean('is_reproducible').defaultTo(false);
    table.timestamp('verified_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['model_id', 'combined_hash']);
    table.index('combined_hash');
    table.index('is_reproducible');
  });

  // Strategy validation test results
  await knex.schema.createTable('strategy_validation_tests', (table) => {
    if (isPostgreSQL) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    } else {
      table.string('id').primary();
    }
    table.string('strategy_id'); // FK to strategy_lifecycle
    table.string('test_type').notNullable(); // backtest, forward_test, stress_test, monte_carlo
    table.string('test_status').defaultTo('pending'); // pending, running, passed, failed
    table.text('test_config'); // JSON test configuration
    table.text('test_results'); // JSON test results
    table.decimal('validation_score', 8, 4); // Overall validation score
    table.timestamp('test_started');
    table.timestamp('test_completed');
    table.integer('test_duration_seconds');
    table.text('error_message'); // If test failed
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['strategy_id', 'test_type']);
    table.index(['test_status', 'created_at']);
    table.index('validation_score');
  });

  console.log('✅ Sprint 3 ML & Strategy Legitimacy schema created successfully');
};

exports.down = async function(knex) {
  // Drop tables in reverse order to handle foreign key constraints
  await knex.schema.dropTableIfExists('strategy_validation_tests');
  await knex.schema.dropTableIfExists('model_reproducibility');
  await knex.schema.dropTableIfExists('training_metadata');
  await knex.schema.dropTableIfExists('model_evaluation_metrics');
  await knex.schema.dropTableIfExists('model_artifacts');
  await knex.schema.dropTableIfExists('backtest_fixtures');
  await knex.schema.dropTableIfExists('strategy_lifecycle');
  await knex.schema.dropTableIfExists('model_activity_log');
  await knex.schema.dropTableIfExists('model_performance');
  await knex.schema.dropTableIfExists('ml_models_expanded');
  
  console.log('✅ Sprint 3 ML & Strategy Legitimacy schema dropped successfully');
};