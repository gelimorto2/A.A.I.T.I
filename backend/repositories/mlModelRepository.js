const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const database = require('../config/database');
const logger = require('../utils/logger');

/**
 * Professional ML Model Repository
 * Handles model persistence, versioning, metadata, and lifecycle management
 */
class MLModelRepository {
  constructor() {
    this.modelStoragePath = process.env.ML_MODEL_STORAGE_PATH || './models';
    this.artifactStoragePath = process.env.ML_ARTIFACT_STORAGE_PATH || './model_artifacts';
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.modelStoragePath, { recursive: true });
      await fs.mkdir(this.artifactStoragePath, { recursive: true });
      logger.info('ML model storage directories initialized');
    } catch (error) {
      logger.error('Failed to create model storage directories:', error);
    }
  }

  /**
   * Create new ML model record with comprehensive metadata
   */
  async createModel(modelData) {
    const {
      name,
      type,
      architecture,
      parameters,
      symbols,
      timeframe,
      features,
      description,
      userId,
      status = 'draft'
    } = modelData;

    const modelId = uuidv4();
    const createdAt = new Date().toISOString();
    const version = '1.0.0';

    // Generate reproducibility hash
    const reproducibilityHash = this.generateReproducibilityHash(parameters, features);

    try {
      await database.run(`
        INSERT INTO ml_models (
          id, name, model_type, architecture, parameters, symbols, timeframe,
          features, description, user_id, status, version, reproducibility_hash,
          training_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'untrained', ?, ?)
      `, [
        modelId, name, type, architecture, JSON.stringify(parameters),
        JSON.stringify(symbols), timeframe, JSON.stringify(features),
        description, userId, status, version, reproducibilityHash,
        createdAt, createdAt
      ]);

      logger.info(`Created ML model ${modelId}: ${name}`);
      return modelId;
    } catch (error) {
      logger.error('Failed to create ML model:', error);
      throw error;
    }
  }

  /**
   * Update model with training results and metrics
   */
  async updateModelTraining(modelId, trainingData) {
    const {
      trainingMetrics,
      validationMetrics,
      trainingHistory,
      modelArtifactPath,
      evaluationResults,
      featureImportance,
      hyperparameters
    } = trainingData;

    const updatedAt = new Date().toISOString();

    try {
      await database.run(`
        UPDATE ml_models SET
          training_status = 'trained',
          training_metrics = ?,
          validation_metrics = ?,
          training_history = ?,
          artifact_path = ?,
          evaluation_results = ?,
          feature_importance = ?,
          hyperparameters = ?,
          trained_at = ?,
          updated_at = ?
        WHERE id = ?
      `, [
        JSON.stringify(trainingMetrics),
        JSON.stringify(validationMetrics),
        JSON.stringify(trainingHistory),
        modelArtifactPath,
        JSON.stringify(evaluationResults),
        JSON.stringify(featureImportance),
        JSON.stringify(hyperparameters),
        updatedAt,
        updatedAt,
        modelId
      ]);

      logger.info(`Updated training results for model ${modelId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update model training for ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Create new model version
   */
  async createModelVersion(parentModelId, versionData) {
    const parentModel = await this.getModel(parentModelId);
    if (!parentModel) {
      throw new Error(`Parent model ${parentModelId} not found`);
    }

    const newModelId = uuidv4();
    const newVersion = this.incrementVersion(parentModel.version);
    const createdAt = new Date().toISOString();

    const newModelData = {
      ...parentModel,
      id: newModelId,
      version: newVersion,
      parent_model_id: parentModelId,
      status: 'draft',
      training_status: 'untrained',
      created_at: createdAt,
      updated_at: createdAt,
      ...versionData
    };

    try {
      await database.run(`
        INSERT INTO ml_models (
          id, name, model_type, architecture, parameters, symbols, timeframe,
          features, description, user_id, status, version, parent_model_id,
          reproducibility_hash, training_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newModelId, newModelData.name, newModelData.model_type,
        newModelData.architecture, JSON.stringify(newModelData.parameters),
        JSON.stringify(newModelData.symbols), newModelData.timeframe,
        JSON.stringify(newModelData.features), newModelData.description,
        newModelData.user_id, newModelData.status, newVersion, parentModelId,
        newModelData.reproducibility_hash, 'untrained', createdAt, createdAt
      ]);

      logger.info(`Created model version ${newVersion} for ${parentModelId}`);
      return newModelId;
    } catch (error) {
      logger.error('Failed to create model version:', error);
      throw error;
    }
  }

  /**
   * Get model by ID with full metadata
   */
  async getModel(modelId) {
    try {
      const model = await database.get(`
        SELECT 
          m.*,
          COUNT(DISTINCT bt.id) as backtest_count,
          AVG(bt.total_return) as avg_backtest_return,
          MAX(bt.created_at) as last_backtest
        FROM ml_models m
        LEFT JOIN backtesting_results bt ON m.id = bt.model_id
        WHERE m.id = ?
        GROUP BY m.id
      `, [modelId]);

      if (model) {
        // Parse JSON fields
        ['parameters', 'symbols', 'features', 'training_metrics', 
         'validation_metrics', 'training_history', 'evaluation_results',
         'feature_importance', 'hyperparameters'].forEach(field => {
          if (model[field]) {
            try {
              model[field] = JSON.parse(model[field]);
            } catch (e) {
              logger.warn(`Failed to parse ${field} for model ${modelId}`);
            }
          }
        });
      }

      return model;
    } catch (error) {
      logger.error(`Failed to get model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get models with filtering and pagination
   */
  async getModels(filters = {}, pagination = {}) {
    const {
      userId,
      status,
      trainingStatus,
      architecture,
      symbols,
      minAccuracy
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = pagination;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (userId) {
      whereClause += ' AND m.user_id = ?';
      params.push(userId);
    }
    if (status) {
      whereClause += ' AND m.status = ?';
      params.push(status);
    }
    if (trainingStatus) {
      whereClause += ' AND m.training_status = ?';
      params.push(trainingStatus);
    }
    if (architecture) {
      whereClause += ' AND m.architecture = ?';
      params.push(architecture);
    }
    if (symbols && symbols.length > 0) {
      whereClause += ' AND m.symbols LIKE ?';
      params.push(`%${symbols[0]}%`);
    }

    const offset = (page - 1) * limit;

    try {
      const models = await database.query(`
        SELECT 
          m.*,
          COUNT(DISTINCT bt.id) as backtest_count,
          AVG(bt.total_return) as avg_backtest_return,
          MAX(bt.created_at) as last_backtest
        FROM ml_models m
        LEFT JOIN backtesting_results bt ON m.id = bt.model_id
        ${whereClause}
        GROUP BY m.id
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      const totalCount = await database.get(`
        SELECT COUNT(*) as count FROM ml_models m ${whereClause}
      `, params);

      // Parse JSON fields for each model
      models.forEach(model => {
        ['parameters', 'symbols', 'features', 'training_metrics',
         'validation_metrics', 'evaluation_results'].forEach(field => {
          if (model[field]) {
            try {
              model[field] = JSON.parse(model[field]);
            } catch (e) {
              logger.warn(`Failed to parse ${field} for model ${model.id}`);
            }
          }
        });
      });

      return {
        models,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get models:', error);
      throw error;
    }
  }

  /**
   * Update model status (draft -> validate -> approve -> deploy)
   */
  async updateModelStatus(modelId, newStatus, userId) {
    const validStatuses = ['draft', 'validating', 'approved', 'deployed', 'deprecated'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const currentModel = await this.getModel(modelId);
    if (!currentModel) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (currentModel.user_id !== userId) {
      throw new Error('Unauthorized: Cannot update model status');
    }

    try {
      await database.run(`
        UPDATE ml_models 
        SET status = ?, status_updated_at = ?, updated_at = ?
        WHERE id = ?
      `, [newStatus, new Date().toISOString(), new Date().toISOString(), modelId]);

      // Log status change
      await this.logModelActivity(modelId, 'status_change', {
        fromStatus: currentModel.status,
        toStatus: newStatus,
        userId
      });

      logger.info(`Model ${modelId} status changed from ${currentModel.status} to ${newStatus}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update model status for ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Store model performance metrics
   */
  async storePerformanceMetrics(modelId, metrics) {
    const {
      accuracy,
      precision,
      recall,
      f1Score,
      sharpeRatio,
      maxDrawdown,
      totalReturn,
      volatility,
      beta,
      alpha,
      informationRatio,
      calmarRatio,
      sortinoRatio
    } = metrics;

    const metricDate = new Date().toISOString().split('T')[0];

    try {
      await database.run(`
        INSERT OR REPLACE INTO model_performance_metrics (
          id, model_id, metric_date, accuracy, precision, recall, f1_score,
          sharpe_ratio, max_drawdown, total_return, volatility, beta, alpha,
          information_ratio, calmar_ratio, sortino_ratio, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), modelId, metricDate, accuracy, precision, recall, f1Score,
        sharpeRatio, maxDrawdown, totalReturn, volatility, beta, alpha,
        informationRatio, calmarRatio, sortinoRatio, new Date().toISOString()
      ]);

      logger.info(`Stored performance metrics for model ${modelId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to store performance metrics for ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get model performance history
   */
  async getPerformanceHistory(modelId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    try {
      const metrics = await database.query(`
        SELECT * FROM model_performance_metrics
        WHERE model_id = ? AND metric_date >= ?
        ORDER BY metric_date DESC
      `, [modelId, startDateStr]);

      return metrics;
    } catch (error) {
      logger.error(`Failed to get performance history for ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Log model activity
   */
  async logModelActivity(modelId, activityType, metadata = {}) {
    try {
      await database.run(`
        INSERT INTO model_activity_log (
          id, model_id, activity_type, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        modelId,
        activityType,
        JSON.stringify(metadata),
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error(`Failed to log model activity for ${modelId}:`, error);
    }
  }

  /**
   * Delete model and associated data
   */
  async deleteModel(modelId, userId) {
    const model = await this.getModel(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (model.user_id !== userId) {
      throw new Error('Unauthorized: Cannot delete model');
    }

    if (model.status === 'deployed') {
      throw new Error('Cannot delete deployed model');
    }

    try {
      // Delete associated data
      await database.run('DELETE FROM model_performance_metrics WHERE model_id = ?', [modelId]);
      await database.run('DELETE FROM model_activity_log WHERE model_id = ?', [modelId]);
      await database.run('DELETE FROM backtesting_results WHERE model_id = ?', [modelId]);
      
      // Delete model artifacts if exist
      if (model.artifact_path) {
        try {
          await fs.rm(model.artifact_path, { recursive: true, force: true });
        } catch (e) {
          logger.warn(`Failed to delete model artifacts: ${e.message}`);
        }
      }

      // Delete model record
      await database.run('DELETE FROM ml_models WHERE id = ?', [modelId]);

      logger.info(`Deleted model ${modelId} and associated data`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Generate reproducibility hash for model parameters and data
   */
  generateReproducibilityHash(parameters, features) {
    const hashInput = JSON.stringify({
      parameters: parameters || {},
      features: features || [],
      timestamp: new Date().toISOString().split('T')[0] // Date only for daily reproducibility
    });
    
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Increment semantic version
   */
  incrementVersion(currentVersion) {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Search models by similarity
   */
  async findSimilarModels(modelId, limit = 5) {
    const targetModel = await this.getModel(modelId);
    if (!targetModel) {
      throw new Error(`Model ${modelId} not found`);
    }

    try {
      // Find models with similar architecture and symbols
      const similarModels = await database.query(`
        SELECT m.*, 
               COUNT(DISTINCT bt.id) as backtest_count,
               AVG(bt.total_return) as avg_backtest_return
        FROM ml_models m
        LEFT JOIN backtesting_results bt ON m.id = bt.model_id
        WHERE m.id != ? 
          AND m.architecture = ?
          AND m.symbols = ?
          AND m.training_status = 'trained'
        GROUP BY m.id
        ORDER BY m.created_at DESC
        LIMIT ?
      `, [modelId, targetModel.architecture, JSON.stringify(targetModel.symbols), limit]);

      return similarModels;
    } catch (error) {
      logger.error(`Failed to find similar models for ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get model lineage (parent/child relationships)
   */
  async getModelLineage(modelId) {
    try {
      // Get parent models
      const parents = await database.query(`
        WITH RECURSIVE model_lineage(id, name, version, parent_model_id, level) AS (
          SELECT id, name, version, parent_model_id, 0
          FROM ml_models
          WHERE id = ?
          UNION ALL
          SELECT m.id, m.name, m.version, m.parent_model_id, ml.level + 1
          FROM ml_models m
          INNER JOIN model_lineage ml ON m.id = ml.parent_model_id
        )
        SELECT * FROM model_lineage WHERE level > 0
      `, [modelId]);

      // Get child models
      const children = await database.query(`
        SELECT id, name, version, status, training_status, created_at
        FROM ml_models
        WHERE parent_model_id = ?
        ORDER BY created_at DESC
      `, [modelId]);

      return { parents, children };
    } catch (error) {
      logger.error(`Failed to get model lineage for ${modelId}:`, error);
      throw error;
    }
  }
}

module.exports = MLModelRepository;