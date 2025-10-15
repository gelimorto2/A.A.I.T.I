const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const database = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { validate } = require('../utils/validation');
const { z } = require('zod');
const ProductionMLManager = require('../services/productionMLManager');

/**
 * Sprint 3: ML Models Management API
 * Complete ML model lifecycle with persistence, metrics, and reproducibility
 */

// Initialize ML Manager
let mlManager;
try {
  mlManager = new ProductionMLManager();
  mlManager.initialize().catch(error => {
    logger.error('Failed to initialize ML Manager:', error);
  });
} catch (error) {
  logger.error('Failed to create ML Manager:', error);
}

// Validation schemas
const createModelSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['prediction', 'classification', 'anomaly_detection', 'sentiment', 'risk_assessment']),
  architecture: z.enum(['lstm', 'gru', 'cnn', 'transformer', 'ensemble', 'lstm_attention', 'bidirectional_lstm', 'cnn_lstm', 'autoencoder', 'vae']),
  symbols: z.array(z.string()).optional(),
  timeframe: z.string().optional(),
  description: z.string().optional(),
  parameters: z.object({}).passthrough(),
  features: z.array(z.string()).optional()
});

const trainModelSchema = z.object({
  training_data: z.object({
    sequences: z.array(z.array(z.number())),
    targets: z.array(z.number())
  }),
  config: z.object({
    epochs: z.number().int().min(1).max(1000).optional(),
    batch_size: z.number().int().min(1).max(512).optional(),
    validation_split: z.number().min(0).max(1).optional(),
    early_stopping: z.boolean().optional(),
    patience: z.number().int().min(1).optional()
  }).optional()
});

/**
 * Get all ML models with filtering and pagination
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      type,
      architecture,
      training_status,
      user_id,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const knex = database.getConnection();
    let query = knex('ml_models').select('*');

    // Apply filters
    if (type) query = query.where('type', type);
    if (architecture) query = query.where('architecture', architecture);
    if (training_status) query = query.where('training_status', training_status);
    if (user_id) query = query.where('user_id', user_id);

    // Apply sorting and pagination
    query = query.orderBy(sort_by, sort_order);
    const offset = (page - 1) * limit;
    
    const [models, countResult] = await Promise.all([
      query.clone().limit(limit).offset(offset),
      query.clone().count('* as total')
    ]);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Parse JSON fields
    const parsedModels = models.map(model => ({
      ...model,
      parameters: typeof model.parameters === 'string' ? JSON.parse(model.parameters) : model.parameters,
      metrics: model.metrics ? (typeof model.metrics === 'string' ? JSON.parse(model.metrics) : model.metrics) : null,
      symbols: model.symbols ? (typeof model.symbols === 'string' ? JSON.parse(model.symbols) : model.symbols) : null,
      features: model.features ? (typeof model.features === 'string' ? JSON.parse(model.features) : model.features) : null,
      feature_importance: model.feature_importance ? (typeof model.feature_importance === 'string' ? JSON.parse(model.feature_importance) : model.feature_importance) : null
    }));

    res.json({
      success: true,
      data: {
        models: parsedModels,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get ML models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve ML models'
    });
  }
});

/**
 * Get specific ML model by ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const knex = database.getConnection();

    const model = await knex('ml_models').where('id', id).first();
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'ML model not found'
      });
    }

    // Get model metrics
    const metrics = await knex('model_metrics')
      .where('model_id', id)
      .orderBy('measured_at', 'desc');

    // Get recent predictions
    const predictions = await knex('model_predictions')
      .where('model_id', id)
      .orderBy('predicted_at', 'desc')
      .limit(10);

    // Parse JSON fields
    const parsedModel = {
      ...model,
      parameters: typeof model.parameters === 'string' ? JSON.parse(model.parameters) : model.parameters,
      metrics: model.metrics ? (typeof model.metrics === 'string' ? JSON.parse(model.metrics) : model.metrics) : null,
      symbols: model.symbols ? (typeof model.symbols === 'string' ? JSON.parse(model.symbols) : model.symbols) : null,
      features: model.features ? (typeof model.features === 'string' ? JSON.parse(model.features) : model.features) : null,
      feature_importance: model.feature_importance ? (typeof model.feature_importance === 'string' ? JSON.parse(model.feature_importance) : model.feature_importance) : null
    };

    res.json({
      success: true,
      data: {
        model: parsedModel,
        performance_metrics: metrics,
        recent_predictions: predictions
      }
    });

  } catch (error) {
    logger.error('Failed to get ML model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve ML model'
    });
  }
});

/**
 * Create new ML model
 */
router.post('/', authMiddleware, validate(createModelSchema), async (req, res) => {
  try {
    const modelData = req.body;
    const userId = req.user.id;

    if (!mlManager) {
      return res.status(503).json({
        success: false,
        error: 'ML Manager not initialized'
      });
    }

    // Create model using ML Manager
    const result = await mlManager.createModel({
      ...modelData,
      userId
    });

    logger.info(`ML model created: ${result.modelId} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        model_id: result.modelId,
        message: 'ML model created successfully'
      }
    });

  } catch (error) {
    logger.error('Failed to create ML model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ML model: ' + error.message
    });
  }
});

/**
 * Train ML model
 */
router.post('/:id/train', authMiddleware, validate(trainModelSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { training_data, config = {} } = req.body;
    const userId = req.user.id;

    if (!mlManager) {
      return res.status(503).json({
        success: false,
        error: 'ML Manager not initialized'
      });
    }

    // Check if user owns the model
    const knex = database.getConnection();
    const model = await knex('ml_models')
      .where('id', id)
      .where('user_id', userId)
      .first();

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'ML model not found or unauthorized'
      });
    }

    if (model.training_status === 'training') {
      return res.status(400).json({
        success: false,
        error: 'Model is already being trained'
      });
    }

    // Start training (async)
    mlManager.trainModel(id, training_data, config)
      .then(result => {
        logger.info(`Model ${id} training completed successfully`);
      })
      .catch(error => {
        logger.error(`Model ${id} training failed:`, error);
      });

    res.json({
      success: true,
      data: {
        message: 'Model training started',
        model_id: id,
        status: 'training'
      }
    });

  } catch (error) {
    logger.error('Failed to start model training:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start model training: ' + error.message
    });
  }
});

/**
 * Make prediction with ML model
 */
router.post('/:id/predict', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { input_data, config = {} } = req.body;

    if (!mlManager) {
      return res.status(503).json({
        success: false,
        error: 'ML Manager not initialized'
      });
    }

    if (!input_data) {
      return res.status(400).json({
        success: false,
        error: 'Input data is required'
      });
    }

    const prediction = await mlManager.predict(id, input_data, config);

    res.json({
      success: true,
      data: prediction
    });

  } catch (error) {
    logger.error('Failed to make prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to make prediction: ' + error.message
    });
  }
});

/**
 * Deploy ML model to production
 */
router.post('/:id/deploy', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mlManager) {
      return res.status(503).json({
        success: false,
        error: 'ML Manager not initialized'
      });
    }

    const success = await mlManager.deployModel(id, userId);
    
    if (success) {
      res.json({
        success: true,
        data: {
          message: 'Model deployed successfully',
          model_id: id,
          status: 'deployed'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to deploy model'
      });
    }

  } catch (error) {
    logger.error('Failed to deploy model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deploy model: ' + error.message
    });
  }
});

/**
 * Get model performance metrics
 */
router.get('/:id/metrics', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      metric_type,
      start_date,
      end_date,
      limit = 100 
    } = req.query;

    const knex = database.getConnection();
    let query = knex('model_metrics').where('model_id', id);

    if (metric_type) {
      query = query.where('metric_type', metric_type);
    }

    if (start_date) {
      query = query.where('measured_at', '>=', start_date);
    }

    if (end_date) {
      query = query.where('measured_at', '<=', end_date);
    }

    const metrics = await query.orderBy('measured_at', 'desc').limit(limit);

    res.json({
      success: true,
      data: {
        model_id: id,
        metrics: metrics
      }
    });

  } catch (error) {
    logger.error('Failed to get model metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve model metrics'
    });
  }
});

/**
 * Get model feature importance
 */
router.get('/:id/feature-importance', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const knex = database.getConnection();

    const model = await knex('ml_models')
      .select('feature_importance', 'features')
      .where('id', id)
      .first();

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'ML model not found'
      });
    }

    const featureImportance = model.feature_importance ? 
      (typeof model.feature_importance === 'string' ? JSON.parse(model.feature_importance) : model.feature_importance) : 
      null;

    const features = model.features ? 
      (typeof model.features === 'string' ? JSON.parse(model.features) : model.features) : 
      null;

    res.json({
      success: true,
      data: {
        model_id: id,
        feature_importance: featureImportance,
        features: features
      }
    });

  } catch (error) {
    logger.error('Failed to get feature importance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve feature importance'
    });
  }
});

/**
 * Get model reproducibility information
 */
router.get('/:id/reproducibility', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const knex = database.getConnection();

    const model = await knex('ml_models')
      .select('reproducibility_hash', 'parameters', 'hyperparameters', 'version')
      .where('id', id)
      .first();

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'ML model not found'
      });
    }

    res.json({
      success: true,
      data: {
        model_id: id,
        reproducibility_hash: model.reproducibility_hash,
        version: model.version,
        parameters: typeof model.parameters === 'string' ? JSON.parse(model.parameters) : model.parameters,
        hyperparameters: model.hyperparameters ? 
          (typeof model.hyperparameters === 'string' ? JSON.parse(model.hyperparameters) : model.hyperparameters) : 
          null
      }
    });

  } catch (error) {
    logger.error('Failed to get model reproducibility info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve model reproducibility information'
    });
  }
});

/**
 * Get ML system status and disclaimers
 */
router.get('/system/status', (req, res) => {
  try {
    const status = {
      ml_manager_initialized: !!mlManager,
      tensorflow_available: !global.ML_SIMULATION_MODE,
      simulation_mode: global.ML_SIMULATION_MODE || false,
      disclaimers: global.ML_DISCLAIMERS || [],
      capabilities: {
        model_creation: true,
        model_training: !!mlManager,
        model_deployment: !!mlManager,
        prediction_serving: !!mlManager,
        feature_importance: true,
        reproducibility_tracking: true
      }
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get ML system status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve ML system status'
    });
  }
});

module.exports = router;