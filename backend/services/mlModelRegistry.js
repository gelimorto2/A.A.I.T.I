/**
 * Sprint 3: ML Model Registry Service
 * Persistent model storage with versioning and reproducibility
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

class MLModelRegistry {
  constructor(db) {
    this.db = db;
    this.artifactDir = path.join(__dirname, '../../ml_artifacts');
  }

  /**
   * Initialize artifact storage directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.artifactDir, { recursive: true });
      console.log('✅ ML Model Registry initialized');
    } catch (error) {
      console.error('❌ Failed to initialize ML Model Registry:', error);
      throw error;
    }
  }

  /**
   * Generate reproducibility hash from params and data slice
   */
  generateReproHash(params, dataSliceChecksum) {
    const hashInput = JSON.stringify({
      params: params,
      dataChecksum: dataSliceChecksum,
      timestamp: new Date().toISOString()
    });
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Register a new ML model with versioning
   */
  async registerModel(modelData) {
    const {
      name,
      type,
      description,
      params,
      metrics,
      version,
      dataChecksum,
      isSimulated = false,
      trainingSamples,
      validationSamples
    } = modelData;

    // Generate reproducibility hash
    const reproHash = this.generateReproHash(params, dataChecksum);

    // Check for duplicate hash
    const existing = await this.db('ml_models')
      .where({ repro_hash: reproHash })
      .first();

    if (existing) {
      throw new Error(`Model with identical configuration already exists: ${existing.name} v${existing.version}`);
    }

    // Insert model record
    const [modelId] = await this.db('ml_models').insert({
      name,
      type,
      description,
      params: JSON.stringify(params),
      metrics: JSON.stringify(metrics),
      version,
      repro_hash: reproHash,
      status: 'draft',
      is_simulated: isSimulated,
      training_samples: trainingSamples,
      validation_samples: validationSamples,
      training_started_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');

    return { modelId, reproHash };
  }

  /**
   * Save model artifact to disk
   */
  async saveArtifact(modelId, artifactData) {
    const artifactPath = path.join(this.artifactDir, `model_${modelId}.json`);
    await fs.writeFile(artifactPath, JSON.stringify(artifactData, null, 2));

    // Update artifact URI in database
    await this.db('ml_models')
      .where({ id: modelId })
      .update({
        artifact_uri: artifactPath,
        updated_at: new Date()
      });

    return artifactPath;
  }

  /**
   * Load model artifact from disk
   */
  async loadArtifact(modelId) {
    const model = await this.db('ml_models')
      .where({ id: modelId })
      .first();

    if (!model || !model.artifact_uri) {
      throw new Error(`Model artifact not found for ID: ${modelId}`);
    }

    const artifactData = await fs.readFile(model.artifact_uri, 'utf8');
    return JSON.parse(artifactData);
  }

  /**
   * Update model status (draft -> training -> active -> deprecated)
   */
  async updateModelStatus(modelId, status, additionalData = {}) {
    const validStatuses = ['draft', 'training', 'active', 'deprecated'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const updateData = {
      status,
      updated_at: new Date(),
      ...additionalData
    };

    if (status === 'active') {
      updateData.training_completed_at = new Date();
    }

    await this.db('ml_models')
      .where({ id: modelId })
      .update(updateData);
  }

  /**
   * Record model performance metrics
   */
  async recordMetric(modelId, metricType, value, metadata = {}) {
    await this.db('model_metrics').insert({
      model_id: modelId,
      metric_type: metricType,
      value: value,
      metadata: JSON.stringify(metadata),
      evaluated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  /**
   * Store model evaluation results
   */
  async storeEvaluation(modelId, evaluationData) {
    const {
      evaluationType,
      startDate,
      endDate,
      results,
      config,
      sharpeRatio,
      maxDrawdown,
      winRate,
      profitFactor
    } = evaluationData;

    const [evalId] = await this.db('model_evaluations').insert({
      model_id: modelId,
      evaluation_type: evaluationType,
      start_date: startDate,
      end_date: endDate,
      results: JSON.stringify(results),
      config: JSON.stringify(config),
      sharpe_ratio: sharpeRatio,
      max_drawdown: maxDrawdown,
      win_rate: winRate,
      profit_factor: profitFactor,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');

    return evalId;
  }

  /**
   * Get model with full history
   */
  async getModelWithHistory(modelId) {
    const model = await this.db('ml_models')
      .where({ id: modelId })
      .first();

    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Get metrics history
    const metrics = await this.db('model_metrics')
      .where({ model_id: modelId })
      .orderBy('evaluated_at', 'desc');

    // Get evaluation history
    const evaluations = await this.db('model_evaluations')
      .where({ model_id: modelId })
      .orderBy('created_at', 'desc');

    return {
      ...model,
      params: JSON.parse(model.params),
      metrics: JSON.parse(model.metrics),
      metricsHistory: metrics,
      evaluationHistory: evaluations
    };
  }

  /**
   * List all models with optional filters
   */
  async listModels(filters = {}) {
    let query = this.db('ml_models');

    if (filters.status) {
      query = query.where({ status: filters.status });
    }

    if (filters.type) {
      query = query.where({ type: filters.type });
    }

    if (filters.isSimulated !== undefined) {
      query = query.where({ is_simulated: filters.isSimulated });
    }

    const models = await query.orderBy('created_at', 'desc');

    return models.map(model => ({
      ...model,
      params: JSON.parse(model.params),
      metrics: JSON.parse(model.metrics)
    }));
  }

  /**
   * Get model metrics over time
   */
  async getMetricsTimeSeries(modelId, metricType, limit = 100) {
    return await this.db('model_metrics')
      .where({ model_id: modelId, metric_type: metricType })
      .orderBy('evaluated_at', 'desc')
      .limit(limit);
  }

  /**
   * Compare models by performance
   */
  async compareModels(modelIds, metricType = 'sharpe_ratio') {
    const evaluations = await this.db('model_evaluations')
      .whereIn('model_id', modelIds)
      .select('model_id', metricType, 'evaluation_type', 'created_at')
      .orderBy('created_at', 'desc');

    const models = await this.db('ml_models')
      .whereIn('id', modelIds)
      .select('id', 'name', 'version', 'type');

    return {
      models,
      evaluations: evaluations.reduce((acc, eval_) => {
        if (!acc[eval_.model_id]) acc[eval_.model_id] = [];
        acc[eval_.model_id].push(eval_);
        return acc;
      }, {})
    };
  }

  /**
   * Delete model and cleanup artifacts
   */
  async deleteModel(modelId) {
    const model = await this.db('ml_models')
      .where({ id: modelId })
      .first();

    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Delete artifact file if exists
    if (model.artifact_uri) {
      try {
        await fs.unlink(model.artifact_uri);
      } catch (error) {
        console.warn(`Warning: Could not delete artifact file: ${error.message}`);
      }
    }

    // Delete from database (CASCADE will handle related records)
    await this.db('ml_models')
      .where({ id: modelId })
      .delete();
  }
}

module.exports = MLModelRegistry;
