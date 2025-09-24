const mlService = require('../services/mlService');
const logger = require('../utils/logger');

/**
 * ML Controller - Handle HTTP requests for ML operations
 * Thin controller layer that delegates to MLService
 */
class MLController {
  
  /**
   * GET /api/ml/algorithms
   */
  async getAlgorithms(req, res) {
    try {
      const result = await mlService.getSupportedAlgorithms();
      res.json(result);
    } catch (error) {
      logger.error('Error in getAlgorithms:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/ml/models/advanced
   */
  async createAdvancedModel(req, res) {
    try {
      const userId = req.user.id;
      const result = await mlService.createAdvancedModel(req.body, userId);
      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createAdvancedModel:', error);
      const statusCode = error.message.includes('Missing required fields') || 
                        error.message.includes('Unsupported algorithm') ? 400 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  }

  /**
   * POST /api/ml/models/:modelId/train
   */
  async trainModel(req, res) {
    try {
      const { modelId } = req.params;
      const userId = req.user.id;
      const result = await mlService.trainModel(modelId, userId);
      res.json(result);
    } catch (error) {
      logger.error('Error in trainModel:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  }

  /**
   * GET /api/ml/models/:modelId/predictions
   */
  async getModelPredictions(req, res) {
    try {
      const { modelId } = req.params;
      const userId = req.user.id;
      const options = {
        timeframe: req.query.timeframe,
        periods: parseInt(req.query.periods) || 10,
        symbols: req.query.symbols ? req.query.symbols.split(',') : undefined
      };
      
      const result = await mlService.getModelPredictions(modelId, userId, options);
      res.json(result);
    } catch (error) {
      logger.error('Error in getModelPredictions:', error);
      const statusCode = error.message.includes('not found') || 
                        error.message.includes('not trained') ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  }

  /**
   * GET /api/ml/models
   */
  async getUserModels(req, res) {
    try {
      const userId = req.user.id;
      const models = await mlService.getUserModels(userId);
      res.json({ models });
    } catch (error) {
      logger.error('Error in getUserModels:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/ml/models/:modelId
   */
  async deleteModel(req, res) {
    try {
      const { modelId } = req.params;
      const userId = req.user.id;
      const result = await mlService.deleteModel(modelId, userId);
      res.json(result);
    } catch (error) {
      logger.error('Error in deleteModel:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  }

  /**
   * GET /api/ml/models/:modelId/metrics
   */
  async getModelMetrics(req, res) {
    try {
      const { modelId } = req.params;
      const userId = req.user.id;
      const metrics = await mlService.getModelMetrics(modelId, userId);
      res.json(metrics);
    } catch (error) {
      logger.error('Error in getModelMetrics:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  }

  /**
   * GET /api/ml/models/:modelId
   */
  async getModelById(req, res) {
    try {
      const { modelId } = req.params;
      const userId = req.user.id;
      const models = await mlService.getUserModels(userId);
      const model = models.find(m => m.id === modelId);
      
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }
      
      res.json(model);
    } catch (error) {
      logger.error('Error in getModelById:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new MLController();