const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const realMLService = require('../utils/realMLService');
const AdvancedMLService = require('../utils/advancedMLService');
const backtestingService = require('../utils/backtestingService');
const tradingStrategyFactory = require('../utils/tradingStrategyFactory');
const advancedIndicators = require('../utils/advancedIndicators');
const MLPerformanceTracker = require('./mlPerformanceTracker');
const logger = require('../utils/logger');

/**
 * ML Service - Centralized machine learning operations
 * Extracted from routes/ml.js to improve maintainability
 */
class MLService {
  constructor() {
    this.advancedMLService = new AdvancedMLService();
    this.realMLService = realMLService;
    this.performanceTracker = new MLPerformanceTracker();
  }

  /**
   * Get all supported algorithms
   */
  async getSupportedAlgorithms() {
    try {
      const basicAlgorithms = this.realMLService.getSupportedAlgorithms().map(alg => {
        const info = this.realMLService.getAlgorithmInfo(alg);
        return {
          id: alg,
          ...info,
          implemented: true,
          realImplementation: true,
          category: 'basic'
        };
      });

      const advancedAlgorithms = Object.values(this.advancedMLService.supportedAlgorithms)
        .filter(alg => !basicAlgorithms.find(basic => basic.id === alg))
        .map(alg => ({
          id: alg,
          name: this._formatAlgorithmName(alg),
          description: this._getAlgorithmDescription(alg),
          implemented: true,
          realImplementation: true,
          category: 'advanced'
        }));

      const allAlgorithms = [...basicAlgorithms, ...advancedAlgorithms];

      return {
        algorithms: allAlgorithms,
        basicCount: basicAlgorithms.length,
        advancedCount: advancedAlgorithms.length,
        totalImplemented: allAlgorithms.length,
        note: 'Real implementations including LSTM, Random Forest, SVM, ARIMA, SARIMA, and advanced portfolio optimization'
      };
    } catch (error) {
      logger.error('Error fetching algorithms:', error);
      throw error;
    }
  }

  /**
   * Create advanced ML model
   */
  async createAdvancedModel(modelData, userId) {
    const {
      name,
      algorithmType,
      targetTimeframe = '1d',
      symbols = ['bitcoin'],
      parameters = {},
      trainingPeriodDays = 365,
      validationSplit = 0.2
    } = modelData;

    // Validate required fields
    if (!name || !algorithmType) {
      throw new Error('Missing required fields: name and algorithmType');
    }

    // Check if algorithm is supported
    const supportedAlgorithms = Object.values(this.advancedMLService.supportedAlgorithms);
    if (!supportedAlgorithms.includes(algorithmType)) {
      throw new Error(`Unsupported algorithm: ${algorithmType}. Supported: ${supportedAlgorithms.join(', ')}`);
    }

    logger.info(`Creating advanced ML model: ${name} with ${algorithmType}`);

    // Create model using advanced ML service
    const result = await this.advancedMLService.createAdvancedModel({
      name,
      algorithmType,
      targetTimeframe,
      symbols,
      parameters,
      trainingPeriodDays,
      validationSplit
    });

    // Store in database
    const modelId = uuidv4();
    const query = `
      INSERT INTO ml_models (
        id, user_id, name, algorithm_type, 
        target_timeframe, symbols, parameters,
        training_period_days, validation_split,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.run(query, [
      modelId,
      userId,
      name,
      algorithmType,
      targetTimeframe,
      JSON.stringify(symbols),
      JSON.stringify(parameters),
      trainingPeriodDays,
      validationSplit,
      'created',
      new Date().toISOString()
    ]);

    return {
      modelId,
      ...result,
      status: 'created',
      message: `Advanced ML model '${name}' created successfully with ${algorithmType} algorithm`
    };
  }

  /**
   * Train ML model
   */
  async trainModel(modelId, userId) {
    try {
      // Get model from database
      const model = await this._getModelById(modelId, userId);
      if (!model) {
        throw new Error('Model not found');
      }

      logger.info(`Training model: ${model.name} (${model.algorithm_type})`);

      // Train using appropriate service
      let trainingResult;
      if (model.algorithm_type in this.advancedMLService.supportedAlgorithms) {
        trainingResult = await this.advancedMLService.trainModel(model);
      } else {
        trainingResult = await this.realMLService.trainModel(model.algorithm_type, {
          symbols: JSON.parse(model.symbols),
          parameters: JSON.parse(model.parameters)
        });
      }

      // Update model status in database
      await this._updateModelStatus(modelId, 'trained', trainingResult);

      return {
        modelId,
        status: 'trained',
        trainingResult,
        message: `Model '${model.name}' trained successfully`
      };
    } catch (error) {
      await this._updateModelStatus(modelId, 'error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get model predictions
   */
  async getModelPredictions(modelId, userId, options = {}) {
    try {
      const model = await this._getModelById(modelId, userId);
      if (!model) {
        throw new Error('Model not found');
      }

      if (model.status !== 'trained') {
        throw new Error(`Model is not trained. Current status: ${model.status}`);
      }

      // Get predictions using appropriate service
      let predictions;
      if (model.algorithm_type in this.advancedMLService.supportedAlgorithms) {
        predictions = await this.advancedMLService.predict(model, options);
      } else {
        predictions = await this.realMLService.predict(model.algorithm_type, {
          ...options,
          modelData: JSON.parse(model.parameters)
        });
      }

      // Track predictions in performance tracker
      if (predictions && Array.isArray(predictions.predictions)) {
        for (const prediction of predictions.predictions.slice(0, 10)) { // Limit to avoid overwhelming tracker
          try {
            await this.performanceTracker.recordPrediction(modelId, {
              input: prediction.input || options,
              prediction: prediction.value || prediction.price || prediction.signal,
              confidence: prediction.confidence || 0.75,
              features: prediction.features || {},
              metadata: {
                symbol: options.symbol,
                timeframe: model.target_timeframe,
                algorithm: model.algorithm_type,
                userId: userId
              }
            });
          } catch (trackingError) {
            logger.warn('Failed to track prediction:', trackingError);
          }
        }
      }

      return {
        modelId,
        modelName: model.name,
        algorithm: model.algorithm_type,
        predictions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error getting predictions for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's ML models
   */
  async getUserModels(userId) {
    try {
      const query = `
        SELECT id, name, algorithm_type, target_timeframe, 
               symbols, status, created_at, updated_at
        FROM ml_models 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `;
      
      const models = await db.all(query, [userId]);
      
      return models.map(model => ({
        ...model,
        symbols: JSON.parse(model.symbols),
        createdAt: model.created_at,
        updatedAt: model.updated_at
      }));
    } catch (error) {
      logger.error(`Error fetching models for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete ML model
   */
  async deleteModel(modelId, userId) {
    try {
      const model = await this._getModelById(modelId, userId);
      if (!model) {
        throw new Error('Model not found');
      }

      await db.run('DELETE FROM ml_models WHERE id = ? AND user_id = ?', [modelId, userId]);
      
      logger.info(`Model ${modelId} deleted by user ${userId}`);
      
      return {
        success: true,
        message: `Model '${model.name}' deleted successfully`
      };
    } catch (error) {
      logger.error(`Error deleting model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(modelId, userId) {
    try {
      const model = await this._getModelById(modelId, userId);
      if (!model) {
        throw new Error('Model not found');
      }

      // Get performance metrics
      let metrics;
      if (model.algorithm_type in this.advancedMLService.supportedAlgorithms) {
        metrics = await this.advancedMLService.getModelMetrics(model);
      } else {
        metrics = await this.realMLService.getModelMetrics(model.algorithm_type);
      }

      return {
        modelId,
        modelName: model.name,
        algorithm: model.algorithm_type,
        metrics,
        lastUpdated: model.updated_at
      };
    } catch (error) {
      logger.error(`Error getting metrics for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Update prediction outcome for performance tracking
   */
  async updatePredictionOutcome(predictionId, actualOutcome, metadata = {}) {
    try {
      const result = await this.performanceTracker.updatePredictionOutcome(
        predictionId,
        actualOutcome,
        metadata
      );

      logger.debug('Prediction outcome updated', {
        predictionId,
        actualOutcome,
        accuracy: result.accuracy,
        service: 'ml-service'
      });

      return result;
    } catch (error) {
      logger.error('Failed to update prediction outcome:', error);
      throw error;
    }
  }

  /**
   * Get model performance report
   */
  async getModelPerformanceReport(modelId, userId) {
    try {
      // Verify user has access to model
      const model = await this._getModelById(modelId, userId);
      if (!model) {
        throw new Error('Model not found');
      }

      const report = this.performanceTracker.getModelPerformanceReport(modelId);
      
      if (!report) {
        return {
          modelId,
          modelName: model.name,
          algorithm: model.algorithm_type,
          message: 'No performance data available yet',
          performance: {
            totalPredictions: 0,
            accuratePredictions: 0,
            currentAccuracy: 0,
            recentAccuracy: 0
          }
        };
      }

      return {
        modelId,
        modelName: model.name,
        algorithm: model.algorithm_type,
        ...report
      };
    } catch (error) {
      logger.error(`Error getting performance report for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get performance tracker instance for direct access
   */
  getPerformanceTracker() {
    return this.performanceTracker;
  }

  // Private helper methods
  async _getModelById(modelId, userId) {
    const query = `
      SELECT * FROM ml_models 
      WHERE id = ? AND user_id = ?
    `;
    return await db.get(query, [modelId, userId]);
  }

  async _updateModelStatus(modelId, status, result = {}) {
    const query = `
      UPDATE ml_models 
      SET status = ?, training_result = ?, updated_at = ?
      WHERE id = ?
    `;
    await db.run(query, [
      status,
      JSON.stringify(result),
      new Date().toISOString(),
      modelId
    ]);
  }

  _formatAlgorithmName(algorithm) {
    return algorithm
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  _getAlgorithmDescription(algorithm) {
    const descriptions = {
      lstm: 'Long Short-Term Memory neural network for time series prediction',
      randomForest: 'Ensemble learning method using multiple decision trees',
      svm: 'Support Vector Machine for classification and regression',
      arima: 'AutoRegressive Integrated Moving Average for time series',
      sarima: 'Seasonal ARIMA for time series with seasonal patterns'
    };
    return descriptions[algorithm] || `${this._formatAlgorithmName(algorithm)} algorithm`;
  }
}

module.exports = new MLService();