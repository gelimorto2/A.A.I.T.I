const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../middleware/enhancedAuth');
const database = require('../config/database');
const ProductionMLManager = require('../services/productionMLManager');
const MLModelRepository = require('../repositories/mlModelRepository');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Initialize production ML services
const mlManager = new ProductionMLManager();
const modelRepo = new MLModelRepository();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * Get available model architectures and configurations
 */
router.get('/architectures', authenticateToken, (req, res) => {
  try {
    const architectures = {
      LSTM: {
        name: 'Long Short-Term Memory',
        description: 'Recurrent neural network ideal for time series prediction',
        useCase: 'Short to medium-term price forecasting',
        parameters: {
          sequenceLength: { min: 20, max: 200, default: 60 },
          lstmUnits: { min: 16, max: 512, default: 100 },
          dropoutRate: { min: 0.1, max: 0.5, default: 0.3 },
          useAttention: { type: 'boolean', default: true },
          bidirectional: { type: 'boolean', default: true }
        }
      },
      GRU: {
        name: 'Gated Recurrent Unit',
        description: 'Simplified RNN with faster training than LSTM',
        useCase: 'Medium-term trend analysis',
        parameters: {
          sequenceLength: { min: 30, max: 300, default: 120 },
          gruUnits: { min: 16, max: 256, default: 80 },
          layers: { min: 1, max: 5, default: 3 },
          dropoutRate: { min: 0.1, max: 0.4, default: 0.25 }
        }
      },
      CNN: {
        name: 'Convolutional Neural Network',
        description: 'Pattern recognition in price charts and technical indicators',
        useCase: 'Chart pattern recognition and signal detection',
        parameters: {
          filters1: { min: 16, max: 128, default: 64 },
          filters2: { min: 32, max: 256, default: 128 },
          kernelSize: { min: 2, max: 5, default: 3 },
          dropoutRate: { min: 0.2, max: 0.5, default: 0.4 }
        }
      },
      TRANSFORMER: {
        name: 'Transformer Network',
        description: 'Attention-based model for multi-timeframe analysis',
        useCase: 'Complex multi-asset and multi-timeframe predictions',
        parameters: {
          dModel: { min: 32, max: 256, default: 128 },
          numHeads: { min: 4, max: 16, default: 8 },
          numLayers: { min: 2, max: 12, default: 6 },
          dropoutRate: { min: 0.05, max: 0.3, default: 0.15 }
        }
      },
      ENSEMBLE: {
        name: 'Ensemble Model',
        description: 'Combines multiple architectures for robust predictions',
        useCase: 'Production-ready robust predictions with uncertainty quantification',
        parameters: {
          models: { type: 'array', default: ['lstm', 'gru', 'cnn'] },
          weights: { type: 'array', default: [0.4, 0.35, 0.25] }
        }
      }
    };

    res.json({
      architectures,
      totalArchitectures: Object.keys(architectures).length,
      note: 'All architectures implemented with TensorFlow.js for production use'
    });
  } catch (error) {
    logger.error('Error fetching ML architectures:', error);
    res.status(500).json({
      error: 'Failed to fetch ML architectures',
      message: error.message
    });
  }
});

/**
 * Create new ML model
 */
router.post('/models', authenticateToken, auditLog('create_ml_model'), async (req, res) => {
  try {
    const {
      name,
      type = 'regression',
      architecture,
      symbols,
      timeframe,
      description,
      customConfig = {}
    } = req.body;

    // Validation
    if (!name || !architecture || !symbols || !timeframe) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'architecture', 'symbols', 'timeframe']
      });
    }

    const result = await mlManager.createModel({
      name,
      type,
      architecture,
      symbols,
      timeframe,
      description,
      userId: req.user.id,
      customConfig
    });

    res.status(201).json({
      success: true,
      modelId: result.modelId,
      message: 'ML model created successfully',
      config: result.config
    });

  } catch (error) {
    logger.error('Error creating ML model:', error);
    res.status(500).json({
      error: 'Failed to create ML model',
      message: error.message
    });
  }
});

/**
 * Get user's ML models with filtering and pagination
 */
router.get('/models', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      trainingStatus,
      architecture,
      symbols,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const filters = {
      userId: req.user.id,
      status,
      trainingStatus,
      architecture,
      symbols: symbols ? symbols.split(',') : undefined
    };

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    const result = await modelRepo.getModels(filters, pagination);

    res.json({
      success: true,
      models: result.models,
      pagination: result.pagination,
      summary: {
        total: result.pagination.total,
        trained: result.models.filter(m => m.training_status === 'trained').length,
        deployed: result.models.filter(m => m.status === 'deployed').length
      }
    });

  } catch (error) {
    logger.error('Error fetching ML models:', error);
    res.status(500).json({
      error: 'Failed to fetch ML models',
      message: error.message
    });
  }
});

/**
 * Get specific ML model details
 */
router.get('/models/:id', authenticateToken, async (req, res) => {
  try {
    const model = await modelRepo.getModel(req.params.id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    if (model.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get additional information
    const [performanceHistory, lineage, similarModels] = await Promise.all([
      modelRepo.getPerformanceHistory(req.params.id, 30),
      modelRepo.getModelLineage(req.params.id),
      modelRepo.findSimilarModels(req.params.id, 3)
    ]);

    res.json({
      success: true,
      model,
      performanceHistory,
      lineage,
      similarModels
    });

  } catch (error) {
    logger.error('Error fetching ML model:', error);
    res.status(500).json({
      error: 'Failed to fetch ML model',
      message: error.message
    });
  }
});

/**
 * Train ML model with training data
 */
router.post('/models/:id/train', authenticateToken, auditLog('train_ml_model'), upload.single('trainingData'), async (req, res) => {
  try {
    const modelId = req.params.id;
    const {
      epochs = 100,
      batchSize = 32,
      validationSplit = 0.2,
      earlyStopping = true,
      patience = 15
    } = req.body;

    // Verify model ownership
    const model = await modelRepo.getModel(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    if (model.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Parse training data (would typically come from file upload or market data service)
    let trainingData;
    if (req.file) {
      // Handle uploaded training data file
      const fs = require('fs').promises;
      const fileContent = await fs.readFile(req.file.path, 'utf8');
      trainingData = JSON.parse(fileContent);
    } else {
      // Generate sample training data for demonstration
      trainingData = generateSampleTrainingData();
    }

    const trainingConfig = {
      epochs: parseInt(epochs),
      batchSize: parseInt(batchSize),
      validationSplit: parseFloat(validationSplit),
      earlyStopping: earlyStopping === 'true',
      patience: parseInt(patience)
    };

    // Start training (this is async)
    const trainingPromise = mlManager.trainModel(modelId, trainingData, trainingConfig);

    res.json({
      success: true,
      message: 'Training started',
      modelId,
      trainingConfig,
      estimatedTime: `${epochs * 2} seconds`,
      note: 'Training is running in the background. Check training status endpoint for updates.'
    });

    // Handle training completion in background
    trainingPromise.then(result => {
      logger.info(`Training completed for model ${modelId}:`, result);
    }).catch(error => {
      logger.error(`Training failed for model ${modelId}:`, error);
    });

  } catch (error) {
    logger.error('Error starting model training:', error);
    res.status(500).json({
      error: 'Failed to start model training',
      message: error.message
    });
  }
});

/**
 * Get training status
 */
router.get('/models/:id/training-status', authenticateToken, async (req, res) => {
  try {
    const model = await modelRepo.getModel(req.params.id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    if (model.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get training job status if available
    const activeJob = Array.from(mlManager.trainingJobs.entries())
      .find(([_, job]) => job.modelId === req.params.id);

    res.json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        trainingStatus: model.training_status,
        trainedAt: model.trained_at
      },
      activeJob: activeJob ? {
        jobId: activeJob[0],
        status: activeJob[1].status,
        startTime: activeJob[1].startTime,
        endTime: activeJob[1].endTime,
        error: activeJob[1].error
      } : null,
      metrics: model.training_metrics ? JSON.parse(model.training_metrics) : null
    });

  } catch (error) {
    logger.error('Error fetching training status:', error);
    res.status(500).json({
      error: 'Failed to fetch training status',
      message: error.message
    });
  }
});

/**
 * Make predictions with trained model
 */
router.post('/models/:id/predict', authenticateToken, auditLog('ml_model_predict'), async (req, res) => {
  try {
    const modelId = req.params.id;
    const { inputData, includeConfidence = true } = req.body;

    if (!inputData) {
      return res.status(400).json({
        error: 'Input data is required',
        expected: 'Array of feature values matching model input shape'
      });
    }

    // Verify model access
    const model = await modelRepo.getModel(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    if (model.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (model.training_status !== 'trained') {
      return res.status(400).json({ error: 'Model is not trained' });
    }

    const prediction = await mlManager.predict(modelId, inputData, {
      includeConfidence
    });

    res.json({
      success: true,
      prediction,
      model: {
        id: model.id,
        name: model.name,
        architecture: model.architecture,
        version: model.version
      }
    });

  } catch (error) {
    logger.error('Error making prediction:', error);
    res.status(500).json({
      error: 'Failed to make prediction',
      message: error.message
    });
  }
});

/**
 * Deploy model to production
 */
router.post('/models/:id/deploy', authenticateToken, auditLog('deploy_ml_model'), async (req, res) => {
  try {
    const modelId = req.params.id;
    
    const success = await mlManager.deployModel(modelId, req.user.id);
    
    res.json({
      success,
      message: 'Model deployed to production',
      modelId,
      deployedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error deploying model:', error);
    res.status(500).json({
      error: 'Failed to deploy model',
      message: error.message
    });
  }
});

/**
 * Update model status
 */
router.patch('/models/:id/status', authenticateToken, auditLog('update_model_status'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await modelRepo.updateModelStatus(req.params.id, status, req.user.id);

    res.json({
      success: true,
      message: 'Model status updated',
      modelId: req.params.id,
      newStatus: status
    });

  } catch (error) {
    logger.error('Error updating model status:', error);
    res.status(500).json({
      error: 'Failed to update model status',
      message: error.message
    });
  }
});

/**
 * Get model performance metrics
 */
router.get('/models/:id/performance', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const [model, performanceHistory] = await Promise.all([
      modelRepo.getModel(req.params.id),
      modelRepo.getPerformanceHistory(req.params.id, parseInt(days))
    ]);

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    if (model.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        architecture: model.architecture
      },
      performanceHistory,
      summary: {
        dataPoints: performanceHistory.length,
        avgAccuracy: performanceHistory.length > 0 ? 
          performanceHistory.reduce((sum, p) => sum + (p.accuracy || 0), 0) / performanceHistory.length : 0,
        bestAccuracy: Math.max(...performanceHistory.map(p => p.accuracy || 0)),
        latestAccuracy: performanceHistory.length > 0 ? performanceHistory[0].accuracy : null
      }
    });

  } catch (error) {
    logger.error('Error fetching model performance:', error);
    res.status(500).json({
      error: 'Failed to fetch model performance',
      message: error.message
    });
  }
});

/**
 * Delete ML model
 */
router.delete('/models/:id', authenticateToken, auditLog('delete_ml_model'), async (req, res) => {
  try {
    await modelRepo.deleteModel(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Model deleted successfully',
      modelId: req.params.id
    });

  } catch (error) {
    logger.error('Error deleting model:', error);
    res.status(500).json({
      error: 'Failed to delete model',
      message: error.message
    });
  }
});

/**
 * Get active models statistics
 */
router.get('/active-models', authenticateToken, async (req, res) => {
  try {
    const stats = mlManager.getActiveModelsStats();
    
    // Filter to user's models only
    const userModels = stats.models.filter(async (model) => {
      const modelData = await modelRepo.getModel(model.modelId);
      return modelData && modelData.user_id === req.user.id;
    });

    res.json({
      success: true,
      totalActive: userModels.length,
      models: userModels,
      systemStats: {
        totalSystemModels: stats.totalActive,
        memoryUsage: process.memoryUsage()
      }
    });

  } catch (error) {
    logger.error('Error fetching active models:', error);
    res.status(500).json({
      error: 'Failed to fetch active models',
      message: error.message
    });
  }
});

/**
 * Generate sample training data for demonstration
 */
function generateSampleTrainingData() {
  const data = [];
  const startPrice = 50000;
  
  for (let i = 0; i < 1000; i++) {
    const price = startPrice + Math.sin(i * 0.1) * 5000 + Math.random() * 1000 - 500;
    const volume = 100 + Math.random() * 50;
    
    data.push({
      timestamp: new Date(Date.now() - (1000 - i) * 60000).toISOString(),
      open: price + Math.random() * 100 - 50,
      high: price + Math.random() * 200,
      low: price - Math.random() * 200,
      close: price,
      volume: volume
    });
  }
  
  return data;
}

module.exports = router;