/**
 * Migration: Sprint 3 ML & Strategy Legitimacy
 * Create ml_models expanded schema with proper persistence, metrics, and strategy lifecycle
 */

const { 
  createMLModelsTable, 
  createModelMetricsTable, 
  createModelPredictionsTable, 
  createModelActivitiesTable,
  createStrategiesTable 
} = require('../database/mlModelsSchema');

/**
 * Create ML models and strategy management tables
 */
exports.up = function(knex) {
  return Promise.all([
    // Core ML models table
    createMLModelsTable(knex),
    
    // Model performance metrics
    createModelMetricsTable(knex),
    
    // Prediction tracking and validation
    createModelPredictionsTable(knex),
    
    // Model activity audit trail
    createModelActivitiesTable(knex),
    
    // Strategy lifecycle management
    createStrategiesTable(knex)
  ]);
};

/**
 * Drop all Sprint 3 tables
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('model_activities'),
    knex.schema.dropTableIfExists('model_predictions'),
    knex.schema.dropTableIfExists('model_metrics'),
    knex.schema.dropTableIfExists('strategies'),
    knex.schema.dropTableIfExists('ml_models')
  ]);
};