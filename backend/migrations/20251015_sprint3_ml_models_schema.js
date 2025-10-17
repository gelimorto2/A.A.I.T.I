/**
 * Sprint 3 Migration: Expanded ML Models Schema
 * Creates comprehensive ML model tracking with versioning, artifacts, and lineage
 */

exports.up = async function(knex) {
  // Drop existing ml_models table if it exists (for clean migration)
  await knex.schema.dropTableIfExists('ml_model_artifacts');
  await knex.schema.dropTableIfExists('ml_model_lineage');
  await knex.schema.dropTableIfExists('ml_model_performance_history');
  await knex.schema.dropTableIfExists('ml_model_features');
  await knex.schema.dropTableIfExists('ml_models');
  
  // Create comprehensive ml_models table
  await knex.schema.createTable('ml_models', table => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('type', 100).notNullable(); // lstm, transformer, ensemble, etc.
    table.string('version', 50).notNullable();
    table.string('status', 50).notNullable().defaultTo('training'); // training, active, archived, failed
    
    // Model configuration
    table.json('params').notNullable().defaultTo('{}'); // Hyperparameters, architecture config
    table.json('training_config').notNullable().defaultTo('{}'); // Learning rate, epochs, batch size
    table.json('feature_config').notNullable().defaultTo('{}'); // Feature engineering settings
    
    // Performance metrics
    table.json('metrics').notNullable().defaultTo('{}'); // Accuracy, precision, recall, etc.
    table.json('validation_metrics').notNullable().defaultTo('{}'); // Out-of-sample performance
    table.decimal('train_accuracy', 10, 6);
    table.decimal('validation_accuracy', 10, 6);
    table.decimal('test_accuracy', 10, 6);
    table.decimal('sharpe_ratio', 10, 6);
    table.decimal('max_drawdown', 10, 6);
    
    // Artifact storage
    table.string('artifact_ref', 500); // S3/local path to model weights
    table.string('artifact_type', 50).defaultTo('tensorflowjs'); // tensorflowjs, onnx, pickle
    table.bigInteger('artifact_size_bytes');
    table.string('artifact_checksum', 64); // SHA-256 for integrity
    
    // Training metadata
    table.integer('training_samples');
    table.integer('validation_samples');
    table.integer('test_samples');
    table.integer('num_features');
    table.integer('num_epochs_trained');
    table.timestamp('training_started_at');
    table.timestamp('training_completed_at');
    table.integer('training_duration_seconds');
    
    // Deployment metadata
    table.timestamp('deployed_at');
    table.string('deployed_by', 100);
    table.json('deployment_config').defaultTo('{}');
    table.integer('prediction_count').defaultTo(0);
    table.timestamp('last_prediction_at');
    
    // Versioning and lineage
    table.integer('parent_model_id').unsigned();
    table.foreign('parent_model_id').references('ml_models.id').onDelete('SET NULL');
    table.string('lineage_type', 50); // retrained, tuned, ensemble_member, a_b_test
    table.json('lineage_metadata').defaultTo('{}');
    
    // Drift detection
    table.boolean('drift_detected').defaultTo(false);
    table.timestamp('drift_detected_at');
    table.json('drift_metrics').defaultTo('{}');
    table.boolean('auto_retrain_enabled').defaultTo(false);
    
    // Audit fields
    table.integer('created_by').unsigned();
    table.foreign('created_by').references('users.id').onDelete('SET NULL');
    table.timestamps(true, true); // created_at, updated_at
    table.timestamp('deleted_at'); // Soft delete
    
    // Indexes for performance
    table.index(['type', 'status']);
    table.index(['name', 'version']);
    table.index('status');
    table.index('deployed_at');
    table.index('created_at');
  });
  
  // Model performance history (time-series tracking)
  await knex.schema.createTable('ml_model_performance_history', table => {
    table.increments('id').primary();
    table.integer('model_id').unsigned().notNullable();
    table.foreign('model_id').references('ml_models.id').onDelete('CASCADE');
    
    table.timestamp('measured_at').notNullable();
    table.integer('window_size').notNullable(); // Number of predictions evaluated
    
    // Performance metrics
    table.decimal('accuracy', 10, 6);
    table.decimal('precision', 10, 6);
    table.decimal('recall', 10, 6);
    table.decimal('f1_score', 10, 6);
    table.decimal('auc_roc', 10, 6);
    
    // Trading-specific metrics
    table.decimal('sharpe_ratio', 10, 6);
    table.decimal('sortino_ratio', 10, 6);
    table.decimal('max_drawdown', 10, 6);
    table.decimal('win_rate', 10, 6);
    table.decimal('profit_factor', 10, 6);
    
    // Drift indicators
    table.decimal('prediction_drift_score', 10, 6);
    table.decimal('feature_drift_score', 10, 6);
    table.boolean('degradation_alert').defaultTo(false);
    
    table.json('detailed_metrics').defaultTo('{}');
    
    table.index(['model_id', 'measured_at']);
    table.index('measured_at');
  });
  
  // Feature importance tracking
  await knex.schema.createTable('ml_model_features', table => {
    table.increments('id').primary();
    table.integer('model_id').unsigned().notNullable();
    table.foreign('model_id').references('ml_models.id').onDelete('CASCADE');
    
    table.string('feature_name', 255).notNullable();
    table.string('feature_type', 50); // technical, fundamental, sentiment
    table.integer('feature_index');
    
    // Importance scores
    table.decimal('importance_score', 10, 6);
    table.decimal('shap_value_mean', 10, 6);
    table.decimal('shap_value_abs_mean', 10, 6);
    table.decimal('permutation_importance', 10, 6);
    
    // Feature statistics
    table.decimal('mean_value', 20, 10);
    table.decimal('std_value', 20, 10);
    table.decimal('min_value', 20, 10);
    table.decimal('max_value', 20, 10);
    table.integer('null_count').defaultTo(0);
    
    table.timestamp('calculated_at').notNullable();
    table.json('additional_stats').defaultTo('{}');
    
    table.index(['model_id', 'importance_score']);
    table.index('feature_name');
  });
  
  // Model lineage and relationships
  await knex.schema.createTable('ml_model_lineage', table => {
    table.increments('id').primary();
    table.integer('model_id').unsigned().notNullable();
    table.foreign('model_id').references('ml_models.id').onDelete('CASCADE');
    table.integer('ancestor_id').unsigned().notNullable();
    table.foreign('ancestor_id').references('ml_models.id').onDelete('CASCADE');
    
    table.string('relationship_type', 50); // parent, sibling, ensemble_component
    table.integer('generation').defaultTo(1); // How many steps removed
    table.json('lineage_metadata').defaultTo('{}');
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['model_id', 'relationship_type']);
    table.index('ancestor_id');
  });
  
  // Model artifacts storage metadata
  await knex.schema.createTable('ml_model_artifacts', table => {
    table.increments('id').primary();
    table.integer('model_id').unsigned().notNullable();
    table.foreign('model_id').references('ml_models.id').onDelete('CASCADE');
    
    table.string('artifact_type', 50).notNullable(); // weights, architecture, preprocessor, scaler
    table.string('artifact_path', 500).notNullable();
    table.string('storage_backend', 50).notNullable(); // local, s3, gcs, azure
    table.bigInteger('size_bytes');
    table.string('checksum', 64); // SHA-256
    table.string('compression', 20); // none, gzip, brotli
    
    table.json('metadata').defaultTo('{}');
    table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    table.timestamp('last_accessed_at');
    table.integer('access_count').defaultTo(0);
    
    table.index(['model_id', 'artifact_type']);
  });
  
  // Create views for common queries
  await knex.raw(`
    CREATE OR REPLACE VIEW ml_models_summary AS
    SELECT 
      m.id,
      m.name,
      m.type,
      m.version,
      m.status,
      m.train_accuracy,
      m.validation_accuracy,
      m.test_accuracy,
      m.sharpe_ratio,
      m.prediction_count,
      m.deployed_at,
      m.created_at,
      COUNT(DISTINCT mph.id) as performance_records,
      COUNT(DISTINCT mf.id) as feature_count,
      MAX(mph.measured_at) as last_performance_check,
      AVG(mph.accuracy) as avg_recent_accuracy
    FROM ml_models m
    LEFT JOIN ml_model_performance_history mph ON m.id = mph.model_id 
      AND mph.measured_at > NOW() - INTERVAL '7 days'
    LEFT JOIN ml_model_features mf ON m.id = mf.model_id
    WHERE m.deleted_at IS NULL
    GROUP BY m.id
  `);
  
  console.log('✅ ML Models schema migration completed');
};

exports.down = async function(knex) {
  // Drop views
  await knex.raw('DROP VIEW IF EXISTS ml_models_summary');
  
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('ml_model_artifacts');
  await knex.schema.dropTableIfExists('ml_model_lineage');
  await knex.schema.dropTableIfExists('ml_model_features');
  await knex.schema.dropTableIfExists('ml_model_performance_history');
  await knex.schema.dropTableIfExists('ml_models');
  
  console.log('✅ ML Models schema migration rolled back');
};
