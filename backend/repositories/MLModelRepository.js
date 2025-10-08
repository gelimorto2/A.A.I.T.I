/**
 * Sprint 3: ML Model Repository Service
 * Enhanced ML model management with versioning, metadata persistence, and lifecycle management
 */

const crypto = require('crypto');
const BaseRepository = require('./BaseRepository');

class MLModelRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.tableName = 'ml_models_expanded';
  }

  /**
   * Create new ML model with comprehensive metadata
   */
  async createModel(modelData) {
    const {
      name,
      type,
      params,
      algorithmType,
      targetTimeframe,
      symbols,
      userId,
      trainingDataPoints = 0
    } = modelData;

    // Generate reproducibility hash
    const reproducibilityHash = this.generateReproducibilityHash(params, symbols, trainingDataPoints);

    const model = {
      name,
      type,
      params: JSON.stringify(params),
      algorithm_type: algorithmType,
      target_timeframe: targetTimeframe,
      symbols: JSON.stringify(symbols),
      user_id: userId,
      training_data_points: trainingDataPoints,
      reproducibility_hash: reproducibilityHash,
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date()
    };

    const [createdModel] = await this.db(this.tableName).insert(model).returning('*');
    
    // Log model creation activity
    await this.logModelActivity(createdModel.id, userId, 'created', null, 'draft', 'Model created');
    
    return this.formatModel(createdModel);
  }

  /**
   * Update model training metadata after training completion
   */
  async updateTrainingMetadata(modelId, metadata) {
    const {
      metrics,
      artifactRef,
      trainingDataPoints,
      lastTrained = new Date()
    } = metadata;

    const updatedModel = await this.db(this.tableName)
      .where('id', modelId)
      .update({
        metrics: JSON.stringify(metrics),
        artifact_ref: artifactRef,
        training_data_points: trainingDataPoints,
        last_trained: lastTrained,
        updated_at: new Date()
      })
      .returning('*');

    if (updatedModel.length === 0) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Log training completion
    await this.logModelActivity(modelId, null, 'trained', null, null, 'Model training completed', {
      metrics,
      training_data_points: trainingDataPoints
    });

    return this.formatModel(updatedModel[0]);
  }

  /**
   * Store model evaluation metrics
   */
  async storeEvaluationMetrics(modelId, metrics) {
    const {
      accuracy,
      rSquared,
      mae,
      mse,
      sharpeRatio,
      calmarRatio,
      informationRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      directionalAccuracy,
      totalPredictions = 0,
      correctPredictions = 0,
      detailedMetrics = {}
    } = metrics;

    const performance = {
      model_id: modelId,
      evaluation_date: new Date(),
      accuracy,
      r_squared: rSquared,
      mae,
      mse,
      sharpe_ratio: sharpeRatio,
      calmar_ratio: calmarRatio,
      information_ratio: informationRatio,
      max_drawdown: maxDrawdown,
      win_rate: winRate,
      profit_factor: profitFactor,
      directional_accuracy: directionalAccuracy,
      total_predictions: totalPredictions,
      correct_predictions: correctPredictions,
      additional_metrics: JSON.stringify(detailedMetrics)
    };

    const [storedMetrics] = await this.db('model_performance').insert(performance).returning('*');
    
    // Update model metrics summary
    await this.db(this.tableName)
      .where('id', modelId)
      .update({
        metrics: JSON.stringify({
          latest_accuracy: accuracy,
          latest_sharpe: sharpeRatio,
          latest_mae: mae,
          last_evaluation: new Date()
        }),
        updated_at: new Date()
      });

    return storedMetrics;
  }

  /**
   * Update model lifecycle status
   */
  async updateModelStatus(modelId, newStatus, userId, notes = '') {
    const currentModel = await this.findById(modelId);
    if (!currentModel) {
      throw new Error(`Model ${modelId} not found`);
    }

    const validStatuses = ['draft', 'validated', 'approved', 'deployed', 'deprecated'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Update model status
    const [updatedModel] = await this.db(this.tableName)
      .where('id', modelId)
      .update({
        status: newStatus,
        updated_at: new Date()
      })
      .returning('*');

    // Log status change
    await this.logModelActivity(
      modelId, 
      userId, 
      'status_changed', 
      currentModel.status, 
      newStatus, 
      notes
    );

    return this.formatModel(updatedModel);
  }

  /**
   * Get model performance history
   */
  async getModelPerformanceHistory(modelId, limit = 30) {
    return await this.db('model_performance')
      .where('model_id', modelId)
      .orderBy('evaluation_date', 'desc')
      .limit(limit);
  }

  /**
   * Get model activity log
   */
  async getModelActivityLog(modelId, limit = 50) {
    return await this.db('model_activity_log as mal')
      .leftJoin('users as u', 'mal.user_id', 'u.id')
      .where('mal.model_id', modelId)
      .select([
        'mal.*',
        'u.username',
        'u.email'
      ])
      .orderBy('mal.created_at', 'desc')
      .limit(limit);
  }

  /**
   * Search models by criteria
   */
  async searchModels(criteria = {}) {
    let query = this.db(this.tableName);

    if (criteria.userId) {
      query = query.where('user_id', criteria.userId);
    }

    if (criteria.type) {
      query = query.where('type', criteria.type);
    }

    if (criteria.status) {
      query = query.where('status', criteria.status);
    }

    if (criteria.algorithmType) {
      query = query.where('algorithm_type', criteria.algorithmType);
    }

    if (criteria.symbols && criteria.symbols.length > 0) {
      query = query.whereRaw('symbols @> ?', [JSON.stringify(criteria.symbols)]);
    }

    const models = await query.orderBy('created_at', 'desc');
    return models.map(model => this.formatModel(model));
  }

  /**
   * Get models by reproducibility hash (for duplicate detection)
   */
  async findByReproducibilityHash(hash) {
    const models = await this.db(this.tableName)
      .where('reproducibility_hash', hash);
    return models.map(model => this.formatModel(model));
  }

  /**
   * Generate reproducibility hash for model parameters and data
   */
  generateReproducibilityHash(params, symbols, trainingDataPoints) {
    const hashInput = JSON.stringify({
      params,
      symbols: symbols.sort(), // Sort symbols for consistency
      training_data_points: trainingDataPoints,
      timestamp: new Date().toISOString().split('T')[0] // Date only for daily reproducibility
    });
    
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Log model activity for audit trail
   */
  async logModelActivity(modelId, userId, action, statusFrom, statusTo, notes, metadata = {}) {
    const activity = {
      model_id: modelId,
      user_id: userId,
      action,
      status_from: statusFrom,
      status_to: statusTo,
      notes,
      metadata: JSON.stringify(metadata),
      created_at: new Date()
    };

    return await this.db('model_activity_log').insert(activity);
  }

  /**
   * Format model data for API response
   */
  formatModel(model) {
    return {
      ...model,
      params: typeof model.params === 'string' ? JSON.parse(model.params) : model.params,
      metrics: typeof model.metrics === 'string' ? JSON.parse(model.metrics) : model.metrics,
      symbols: typeof model.symbols === 'string' ? JSON.parse(model.symbols) : model.symbols
    };
  }

  /**
   * Get model statistics for dashboard
   */
  async getModelStatistics(userId = null) {
    let baseQuery = this.db(this.tableName);
    
    if (userId) {
      baseQuery = baseQuery.where('user_id', userId);
    }

    const [totalModels] = await baseQuery.clone().count('id as count');
    const [draftModels] = await baseQuery.clone().where('status', 'draft').count('id as count');
    const [deployedModels] = await baseQuery.clone().where('status', 'deployed').count('id as count');
    const [approvedModels] = await baseQuery.clone().where('status', 'approved').count('id as count');

    // Get performance averages for deployed models
    const performanceStats = await this.db('model_performance as mp')
      .join('ml_models_expanded as mme', 'mp.model_id', 'mme.id')
      .where('mme.status', 'deployed')
      .whereRaw('mp.evaluation_date >= CURRENT_DATE - INTERVAL \'30 days\'')
      .select([
        this.db.raw('AVG(mp.accuracy) as avg_accuracy'),
        this.db.raw('AVG(mp.sharpe_ratio) as avg_sharpe'),
        this.db.raw('AVG(mp.max_drawdown) as avg_drawdown')
      ])
      .first();

    return {
      total_models: parseInt(totalModels.count),
      draft_models: parseInt(draftModels.count),
      deployed_models: parseInt(deployedModels.count),
      approved_models: parseInt(approvedModels.count),
      performance_stats: performanceStats || {
        avg_accuracy: 0,
        avg_sharpe: 0,
        avg_drawdown: 0
      }
    };
  }

  /**
   * Get models by status
   */
  async getModelsByStatus(status) {
    const models = await this.db(this.tableName)
      .where('status', status)
      .orderBy('created_at', 'desc');
    return models.map(model => this.formatModel(model));
  }
}

module.exports = MLModelRepository;