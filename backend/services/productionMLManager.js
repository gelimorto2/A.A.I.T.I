const ProductionTensorFlowMLService = require('../utils/productionTensorFlowMLService');
const MLModelRepository = require('../repositories/mlModelRepository');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const path = require('path');

/**
 * Production ML Manager
 * Orchestrates TensorFlow models with database persistence and lifecycle management
 */
class ProductionMLManager {
  constructor() {
    this.tfService = new ProductionTensorFlowMLService();
    this.modelRepo = new MLModelRepository();
    this.activeModels = new Map();
    this.trainingJobs = new Map();
    
    // Model configurations for different trading strategies
    this.modelConfigs = {
      // Short-term price prediction (1-4 hours)
      SHORT_TERM_LSTM: {
        architecture: 'lstm',
        sequenceLength: 60,
        features: 8,
        lstmUnits: 100,
        dropoutRate: 0.3,
        useAttention: true,
        bidirectional: true
      },
      
      // Medium-term trend prediction (1-7 days)
      MEDIUM_TERM_GRU: {
        architecture: 'gru',
        sequenceLength: 120,
        features: 12,
        gruUnits: 80,
        layers: 3,
        dropoutRate: 0.25
      },
      
      // Pattern recognition for entry/exit signals
      PATTERN_CNN: {
        architecture: 'cnn',
        inputHeight: 60,
        inputWidth: 10,
        filters1: 64,
        filters2: 128,
        kernelSize: 3,
        dropoutRate: 0.4
      },
      
      // Multi-timeframe analysis
      TRANSFORMER_MULTI: {
        architecture: 'transformer',
        sequenceLength: 100,
        features: 15,
        dModel: 128,
        numHeads: 8,
        numLayers: 6,
        dropoutRate: 0.15
      },
      
      // Ensemble for robust predictions
      ENSEMBLE_ROBUST: {
        architecture: 'ensemble',
        models: ['lstm', 'gru', 'cnn'],
        weights: [0.4, 0.35, 0.25],
        sequenceLength: 80,
        features: 10
      }
    };

    this.initialize();
  }

  /**
   * Initialize the ML manager
   */
  async initialize() {
    try {
      await this.tfService.initialize();
      logger.info('Production ML Manager initialized successfully');
      
      // Load deployed models on startup
      await this.loadDeployedModels();
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Production ML Manager:', error);
      return false;
    }
  }

  /**
   * Create a new ML model with comprehensive configuration
   */
  async createModel(config) {
    const {
      name,
      type,
      architecture,
      symbols,
      timeframe,
      description,
      userId,
      customConfig = {}
    } = config;

    try {
      // Get base configuration for architecture
      const baseConfig = this.modelConfigs[architecture.toUpperCase()] || this.modelConfigs.SHORT_TERM_LSTM;
      const modelConfig = { ...baseConfig, ...customConfig };

      // Create TensorFlow model
      let tfModel;
      switch (architecture.toLowerCase()) {
        case 'lstm':
          tfModel = this.tfService.createLSTMModel(modelConfig);
          break;
        case 'gru':
          tfModel = this.tfService.createGRUModel(modelConfig);
          break;
        case 'cnn':
          tfModel = this.tfService.createCNNModel(modelConfig);
          break;
        case 'transformer':
          tfModel = this.tfService.createTransformerModel(modelConfig);
          break;
        case 'ensemble':
          tfModel = await this.tfService.createEnsembleModel(modelConfig);
          break;
        default:
          throw new Error(`Unsupported architecture: ${architecture}`);
      }

      // Store model in database
      const modelId = await this.modelRepo.createModel({
        name,
        type,
        architecture,
        parameters: modelConfig,
        symbols,
        timeframe,
        features: this.generateFeatureList(modelConfig),
        description,
        userId
      });

      // Store TensorFlow model reference
      this.tfService.models.set(modelId, tfModel);

      await this.modelRepo.logModelActivity(modelId, 'model_created', {
        architecture,
        config: modelConfig
      });

      logger.info(`Created ML model ${modelId}: ${name} (${architecture})`);
      return {
        modelId,
        tfModel,
        config: modelConfig
      };

    } catch (error) {
      logger.error('Failed to create ML model:', error);
      throw error;
    }
  }

  /**
   * Train model with comprehensive data preparation and validation
   */
  async trainModel(modelId, trainingData, config = {}) {
    const {
      validationSplit = 0.2,
      epochs = 100,
      batchSize = 32,
      earlyStopping = true,
      patience = 15,
      monitorValidation = true
    } = config;

    try {
      const model = await this.modelRepo.getModel(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      logger.info(`Starting training for model ${modelId}: ${model.name}`);
      
      // Update model status
      await this.modelRepo.updateModelStatus(modelId, 'training', model.user_id);

      // Store training job reference
      const jobId = uuidv4();
      this.trainingJobs.set(jobId, {
        modelId,
        startTime: Date.now(),
        status: 'running'
      });

      // Prepare training data with feature engineering
      const preparedData = await this.tfService.prepareTrainingData(trainingData, {
        sequenceLength: model.parameters.sequenceLength,
        features: model.features.length,
        technicalIndicators: true,
        normalize: true
      });

      // Train the model
      const trainingConfig = {
        epochs,
        batchSize,
        validationSplit,
        earlyStopping,
        patience
      };

      const history = await this.tfService.trainModel(modelId, preparedData, trainingConfig);

      // Evaluate model performance
      const evaluation = await this.tfService.evaluateModel(modelId, {
        sequences: preparedData.sequences,
        targets: preparedData.targets
      });

      // Save model artifacts
      const artifactPath = path.join('models', modelId);
      await this.tfService.saveModel(modelId, artifactPath);

      // Update model with training results
      await this.modelRepo.updateModelTraining(modelId, {
        trainingMetrics: {
          finalLoss: history.history.loss[history.history.loss.length - 1],
          finalValLoss: history.history.val_loss[history.history.val_loss.length - 1],
          epochs: history.history.loss.length
        },
        validationMetrics: evaluation,
        trainingHistory: history.history,
        modelArtifactPath: artifactPath,
        evaluationResults: evaluation,
        featureImportance: await this.calculateFeatureImportance(modelId, preparedData),
        hyperparameters: trainingConfig
      });

      // Store performance metrics
      await this.modelRepo.storePerformanceMetrics(modelId, {
        accuracy: evaluation.r2,
        sharpeRatio: evaluation.sharpe,
        totalReturn: 0, // Will be calculated during backtesting
        maxDrawdown: 0,
        volatility: 0,
        beta: 0,
        alpha: 0,
        informationRatio: 0,
        calmarRatio: 0,
        sortinoRatio: 0
      });

      // Update training job status
      this.trainingJobs.set(jobId, {
        modelId,
        startTime: this.trainingJobs.get(jobId).startTime,
        endTime: Date.now(),
        status: 'completed'
      });

      await this.modelRepo.logModelActivity(modelId, 'training_completed', {
        trainingTime: Date.now() - this.trainingJobs.get(jobId).startTime,
        epochs: history.history.loss.length,
        finalAccuracy: evaluation.r2
      });

      logger.info(`Model ${modelId} training completed successfully`);
      return {
        success: true,
        evaluation,
        history: history.history,
        artifactPath
      };

    } catch (error) {
      logger.error(`Training failed for model ${modelId}:`, error);
      
      // Update training job status
      const job = Array.from(this.trainingJobs.entries())
        .find(([_, job]) => job.modelId === modelId && job.status === 'running');
      
      if (job) {
        this.trainingJobs.set(job[0], {
          ...job[1],
          status: 'failed',
          error: error.message
        });
      }

      await this.modelRepo.logModelActivity(modelId, 'training_failed', {
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Make predictions with model ensemble and confidence scoring
   */
  async predict(modelId, inputData, config = {}) {
    const {
      includeConfidence = true,
      ensembleVoting = 'weighted',
      returnTopN = 1
    } = config;

    try {
      const model = await this.modelRepo.getModel(modelId);
      if (!model || model.training_status !== 'trained') {
        throw new Error(`Trained model ${modelId} not found`);
      }

      // Load model if not in memory
      if (!this.tfService.trainedModels.has(modelId)) {
        await this.loadModel(modelId);
      }

      const prediction = await this.tfService.predict(modelId, inputData);

      // Calculate additional metrics
      const confidence = includeConfidence ? 
        await this.calculatePredictionConfidence(modelId, inputData, prediction) : 
        prediction.confidence;

      // Log prediction for monitoring
      await this.logPrediction(modelId, {
        prediction: prediction.prediction,
        confidence,
        inputFeatures: inputData.shape || 'unknown',
        timestamp: prediction.timestamp
      });

      return {
        modelId,
        prediction: prediction.prediction,
        confidence,
        timestamp: prediction.timestamp,
        metadata: {
          modelName: model.name,
          architecture: model.architecture,
          version: model.version
        }
      };

    } catch (error) {
      logger.error(`Prediction failed for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Deploy model to production
   */
  async deployModel(modelId, userId) {
    try {
      const model = await this.modelRepo.getModel(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      if (model.user_id !== userId) {
        throw new Error('Unauthorized: Cannot deploy model');
      }

      if (model.training_status !== 'trained') {
        throw new Error('Model must be trained before deployment');
      }

      // Load model into active memory
      await this.loadModel(modelId);

      // Update model status
      await this.modelRepo.updateModelStatus(modelId, 'deployed', userId);

      // Add to active models
      this.activeModels.set(modelId, {
        model,
        loadedAt: new Date(),
        predictionCount: 0,
        lastPrediction: null
      });

      await this.modelRepo.logModelActivity(modelId, 'model_deployed', {
        deployedBy: userId
      });

      logger.info(`Model ${modelId} deployed to production`);
      return true;

    } catch (error) {
      logger.error(`Failed to deploy model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Load deployed models on startup
   */
  async loadDeployedModels() {
    try {
      const { models } = await this.modelRepo.getModels({
        status: 'deployed'
      });

      for (const model of models) {
        await this.loadModel(model.id);
        this.activeModels.set(model.id, {
          model,
          loadedAt: new Date(),
          predictionCount: 0,
          lastPrediction: null
        });
      }

      logger.info(`Loaded ${models.length} deployed models`);
    } catch (error) {
      logger.error('Failed to load deployed models:', error);
    }
  }

  /**
   * Load model from disk
   */
  async loadModel(modelId) {
    try {
      const model = await this.modelRepo.getModel(modelId);
      if (!model || !model.artifact_path) {
        throw new Error(`Model artifacts not found for ${modelId}`);
      }

      await this.tfService.loadModel(model.artifact_path, modelId);
      logger.info(`Loaded model ${modelId} from ${model.artifact_path}`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to load model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate feature importance using permutation method
   */
  async calculateFeatureImportance(modelId, trainingData) {
    try {
      const model = await this.modelRepo.getModel(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      const featureNames = model.features || ['open', 'high', 'low', 'close', 'volume', 'sma_20', 'rsi', 'macd'];
      const importance = {};

      // Baseline prediction accuracy
      const baselinePredictions = await this.tfService.predict(modelId, trainingData.sequences);
      const baselineScore = this.calculateR2Score(trainingData.targets, baselinePredictions.predictions);

      // Permutation importance calculation
      for (let i = 0; i < featureNames.length; i++) {
        const featureName = featureNames[i];
        
        // Create permuted data by shuffling feature i
        const permutedData = this.permuteFeature(trainingData.sequences, i);
        const permutedPredictions = await this.tfService.predict(modelId, permutedData);
        const permutedScore = this.calculateR2Score(trainingData.targets, permutedPredictions.predictions);
        
        // Feature importance = baseline - permuted (higher = more important)
        importance[featureName] = Math.max(0, baselineScore - permutedScore);
      }

      // Normalize importance scores to sum to 1
      const totalImportance = Object.values(importance).reduce((sum, val) => sum + val, 0);
      if (totalImportance > 0) {
        Object.keys(importance).forEach(key => {
          importance[key] = importance[key] / totalImportance;
        });
      }

      logger.info(`Calculated feature importance for model ${modelId}: ${JSON.stringify(importance)}`);
      return importance;

    } catch (error) {
      logger.error(`Failed to calculate feature importance for model ${modelId}:`, error);
      
      // Fallback to uniform importance if calculation fails
      const featureNames = ['open', 'high', 'low', 'close', 'volume', 'sma_20', 'rsi', 'macd'];
      const uniformImportance = {};
      const equalWeight = 1 / featureNames.length;
      
      featureNames.forEach(name => {
        uniformImportance[name] = equalWeight;
      });
      
      return uniformImportance;
    }
  }

  /**
   * Helper method to permute a specific feature in training data
   */
  permuteFeature(sequences, featureIndex) {
    const permuted = sequences.map(sequence => {
      const newSequence = [...sequence];
      const featureValues = newSequence.map(timestep => timestep[featureIndex]);
      
      // Fisher-Yates shuffle
      for (let i = featureValues.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [featureValues[i], featureValues[j]] = [featureValues[j], featureValues[i]];
      }
      
      // Replace permuted values
      newSequence.forEach((timestep, idx) => {
        timestep[featureIndex] = featureValues[idx];
      });
      
      return newSequence;
    });
    
    return permuted;
  }

  /**
   * Calculate R² score for model evaluation
   */
  calculateR2Score(actual, predicted) {
    if (actual.length !== predicted.length) {
      throw new Error('Actual and predicted arrays must have same length');
    }

    const actualMean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
    const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
    
    return 1 - (residualSumSquares / totalSumSquares);
  }

  /**
   * Calculate advanced prediction confidence
   */
  async calculatePredictionConfidence(modelId, inputData, prediction) {
    const model = await this.modelRepo.getModel(modelId);
    const recentMetrics = await this.modelRepo.getPerformanceHistory(modelId, 7);
    
    if (recentMetrics.length === 0) {
      return 0.5; // Default confidence
    }

    // Calculate confidence based on recent model performance
    const avgAccuracy = recentMetrics.reduce((sum, m) => sum + (m.accuracy || 0), 0) / recentMetrics.length;
    const volatility = this.calculateVolatility(recentMetrics.map(m => m.accuracy || 0));
    
    // Adjust confidence based on performance stability
    const baseConfidence = Math.max(0.1, Math.min(0.95, avgAccuracy));
    const stabilityAdjustment = Math.max(0.8, 1 - volatility);
    
    return baseConfidence * stabilityAdjustment;
  }

  /**
   * Calculate volatility of performance metrics
   */
  calculateVolatility(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Log prediction for monitoring and drift detection
   */
  async logPrediction(modelId, predictionData) {
    try {
      // Update active model stats
      if (this.activeModels.has(modelId)) {
        const activeModel = this.activeModels.get(modelId);
        activeModel.predictionCount++;
        activeModel.lastPrediction = new Date();
        this.activeModels.set(modelId, activeModel);
      }

      // Store prediction in database for analysis
      // This would typically go to a time-series database in production
      logger.debug(`Prediction logged for model ${modelId}:`, predictionData);
      
    } catch (error) {
      logger.error(`Failed to log prediction for model ${modelId}:`, error);
    }
  }

  /**
   * Generate feature list based on model configuration
   */
  generateFeatureList(config) {
    const baseFeatures = ['open', 'high', 'low', 'close', 'volume'];
    const technicalIndicators = ['sma_20', 'rsi', 'macd'];
    const microstructure = ['bid_ask_spread', 'order_imbalance'];
    
    let features = [...baseFeatures];
    
    if (config.features > 5) {
      features = features.concat(technicalIndicators);
    }
    
    if (config.features > 8) {
      features = features.concat(microstructure);
    }
    
    return features.slice(0, config.features || 5);
  }

  /**
   * Get training job status
   */
  getTrainingJobStatus(jobId) {
    return this.trainingJobs.get(jobId);
  }

  /**
   * Get active models statistics
   */
  getActiveModelsStats() {
    const stats = {
      totalActive: this.activeModels.size,
      models: []
    };

    for (const [modelId, data] of this.activeModels.entries()) {
      stats.models.push({
        modelId,
        name: data.model.name,
        architecture: data.model.architecture,
        loadedAt: data.loadedAt,
        predictionCount: data.predictionCount,
        lastPrediction: data.lastPrediction
      });
    }

    return stats;
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.tfService.dispose();
    this.activeModels.clear();
    this.trainingJobs.clear();
    logger.info('Production ML Manager disposed');
  }
}

module.exports = ProductionMLManager;