/**
 * ML Models Database Schema
 * Enhanced schema for production ML model management
 */

/**
 * Create ml_models table for storing ML model metadata
 */
exports.createMLModelsTable = function(knex) {
  return knex.schema.createTable('ml_models', table => {
    table.string('id', 36).primary(); // UUID
    table.string('name', 255).notNullable();
    table.enum('type', ['prediction', 'classification', 'anomaly_detection', 'sentiment', 'risk_assessment']).notNullable();
    table.enum('architecture', ['lstm', 'gru', 'cnn', 'transformer', 'ensemble', 'lstm_attention', 'bidirectional_lstm', 'cnn_lstm', 'autoencoder', 'vae']).notNullable();
    table.json('parameters').notNullable(); // Model configuration
    table.json('metrics').nullable(); // Training metrics (R², MAE, Sharpe, etc.)
    table.string('artifact_ref', 500).nullable(); // Path to model artifacts
    table.string('version', 50).notNullable().defaultTo('1.0.0');
    table.json('symbols').nullable(); // Trading symbols for the model
    table.string('timeframe', 50).nullable(); // Timeframe (1m, 5m, 1h, 1d)
    table.json('features').nullable(); // Feature list used by model
    table.text('description').nullable();
    table.enum('training_status', ['draft', 'training', 'trained', 'deployed', 'archived', 'failed']).defaultTo('draft');
    table.string('user_id', 36).nullable(); // User who created the model
    table.json('feature_importance').nullable(); // Feature importance scores
    table.json('training_history').nullable(); // Training loss/accuracy history
    table.json('hyperparameters').nullable(); // Training hyperparameters
    table.string('reproducibility_hash', 64).nullable(); // Hash for reproducibility
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('trained_at').nullable();
    table.timestamp('deployed_at').nullable();
    
    // Indexes
    table.index(['user_id']);
    table.index(['training_status']);
    table.index(['type', 'architecture']);
    table.index(['created_at']);
    table.index(['symbols']);
  });
};

/**
 * Create model_metrics table for storing performance metrics
 */
exports.createModelMetricsTable = function(knex) {
  return knex.schema.createTable('model_metrics', table => {
    table.increments('id').primary();
    table.string('model_id', 36).notNullable();
    table.enum('metric_type', ['training', 'validation', 'production', 'backtest']).notNullable();
    table.string('metric_name', 100).notNullable(); // R2, MAE, Sharpe, etc.
    table.decimal('metric_value', 15, 8).notNullable();
    table.json('metadata').nullable(); // Additional metric context
    table.timestamp('measured_at').defaultTo(knex.fn.now());
    table.string('measurement_period', 50).nullable(); // daily, weekly, monthly
    
    table.foreign('model_id').references('id').inTable('ml_models').onDelete('CASCADE');
    table.index(['model_id', 'metric_type']);
    table.index(['metric_name', 'measured_at']);
  });
};

/**
 * Create model_predictions table for tracking prediction logs
 */
exports.createModelPredictionsTable = function(knex) {
  return knex.schema.createTable('model_predictions', table => {
    table.increments('id').primary();
    table.string('model_id', 36).notNullable();
    table.json('input_features').notNullable(); // Input data used for prediction
    table.json('prediction_output').notNullable(); // Model prediction results
    table.decimal('confidence_score', 5, 4).nullable(); // Prediction confidence (0-1)
    table.string('symbol', 20).nullable(); // Trading symbol
    table.string('timeframe', 20).nullable(); // Prediction timeframe
    table.timestamp('predicted_at').defaultTo(knex.fn.now());
    table.timestamp('target_time').nullable(); // When prediction is for
    table.json('market_context').nullable(); // Market conditions at prediction time
    table.decimal('actual_outcome', 15, 8).nullable(); // Actual result (filled later)
    table.timestamp('outcome_recorded_at').nullable();
    
    table.foreign('model_id').references('id').inTable('ml_models').onDelete('CASCADE');
    table.index(['model_id', 'predicted_at']);
    table.index(['symbol', 'timeframe', 'predicted_at']);
  });
};

/**
 * Create model_activities table for audit trail
 */
exports.createModelActivitiesTable = function(knex) {
  return knex.schema.createTable('model_activities', table => {
    table.increments('id').primary();
    table.string('model_id', 36).notNullable();
    table.enum('activity_type', [
      'model_created', 'training_started', 'training_completed', 'training_failed',
      'model_deployed', 'model_archived', 'prediction_made', 'metrics_updated',
      'parameters_changed', 'version_updated'
    ]).notNullable();
    table.string('user_id', 36).nullable(); // User who performed the action
    table.json('activity_data').nullable(); // Additional activity context
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.foreign('model_id').references('id').inTable('ml_models').onDelete('CASCADE');
    table.index(['model_id', 'activity_type']);
    table.index(['created_at']);
  });
};

/**
 * Create strategies table for strategy lifecycle management
 */
exports.createStrategiesTable = function(knex) {
  return knex.schema.createTable('strategies', table => {
    table.string('id', 36).primary(); // UUID
    table.string('name', 255).notNullable();
    table.enum('type', ['algorithmic', 'ml_based', 'hybrid', 'arbitrage', 'market_making']).notNullable();
    table.text('description').nullable();
    table.json('configuration').notNullable(); // Strategy parameters
    table.json('model_ids').nullable(); // Associated ML models
    table.json('symbols').nullable(); // Trading symbols
    table.string('timeframe', 50).nullable();
    table.enum('status', ['draft', 'validate', 'approved', 'deployed', 'paused', 'archived']).defaultTo('draft');
    table.string('user_id', 36).notNullable(); // Strategy owner
    table.string('approved_by', 36).nullable(); // User who approved
    table.timestamp('approved_at').nullable();
    table.timestamp('deployed_at').nullable();
    table.json('risk_parameters').nullable(); // Risk limits and controls
    table.json('performance_metrics').nullable(); // Strategy performance
    table.json('backtest_results').nullable(); // Historical backtest data
    table.decimal('allocated_capital', 15, 2).nullable(); // Capital allocation
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['user_id']);
    table.index(['status']);
    table.index(['type']);
    table.index(['created_at']);
  });
};