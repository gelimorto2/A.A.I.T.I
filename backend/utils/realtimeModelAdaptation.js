const { EventEmitter } = require('events');
const logger = require('./logger');
const mlService = require('./mlService');
const marketDataService = require('./marketData');

/**
 * Real-time Model Adaptation System
 * Implements dynamic model retraining based on market conditions
 * Features:
 * - Model performance degradation detection
 * - Automatic model selection based on market volatility
 * - Dynamic retraining triggers
 * - Performance monitoring and alerting
 */
class RealtimeModelAdaptation extends EventEmitter {
  constructor() {
    super();
    
    this.adaptationConfig = {
      // Performance thresholds for triggering adaptation
      performanceDegradationThreshold: 0.15, // 15% accuracy drop
      minAccuracyThreshold: 0.6, // 60% minimum accuracy
      maxVolatilityThreshold: 0.08, // 8% volatility threshold
      
      // Adaptation intervals
      performanceCheckInterval: 300000, // 5 minutes
      retrainingCooldown: 1800000, // 30 minutes between retrainings
      
      // Model selection criteria
      volatilityBasedSelection: true,
      performanceBasedSelection: true,
      ensembleThreshold: 0.85 // Use ensemble when individual model accuracy < 85%
    };
    
    this.modelPerformanceTracker = new Map();
    this.marketVolatilityTracker = new Map();
    this.retrainingQueue = new Set();
    this.lastRetrainingTime = new Map();
    
    this.isAdaptationActive = false;
    this.performanceCheckTimer = null;
    
    logger.info('Real-time Model Adaptation System initialized');
  }

  /**
   * Start the real-time adaptation system
   */
  start() {
    if (this.isAdaptationActive) {
      logger.warn('Model adaptation system is already active');
      return;
    }

    this.isAdaptationActive = true;
    
    // Start performance monitoring
    this.performanceCheckTimer = setInterval(() => {
      this.checkModelPerformance();
    }, this.adaptationConfig.performanceCheckInterval);
    
    // Subscribe to market data updates for volatility tracking
    marketDataService.on('priceUpdate', (data) => {
      this.updateVolatilityMetrics(data);
    });
    
    logger.info('Real-time Model Adaptation System started');
    this.emit('adaptationStarted');
  }

  /**
   * Stop the real-time adaptation system
   */
  stop() {
    if (!this.isAdaptationActive) {
      return;
    }

    this.isAdaptationActive = false;
    
    if (this.performanceCheckTimer) {
      clearInterval(this.performanceCheckTimer);
      this.performanceCheckTimer = null;
    }
    
    marketDataService.removeListener('priceUpdate', this.updateVolatilityMetrics);
    
    logger.info('Real-time Model Adaptation System stopped');
    this.emit('adaptationStopped');
  }

  /**
   * Register a model for real-time adaptation monitoring
   */
  registerModel(modelId, modelConfig) {
    this.modelPerformanceTracker.set(modelId, {
      id: modelId,
      name: modelConfig.name,
      algorithmType: modelConfig.algorithmType,
      symbols: modelConfig.symbols,
      baselineAccuracy: modelConfig.performanceMetrics?.accuracy || 0,
      currentAccuracy: modelConfig.performanceMetrics?.accuracy || 0,
      recentPredictions: [],
      recentActuals: [],
      degradationCount: 0,
      lastUpdateTime: Date.now(),
      adaptationHistory: []
    });
    
    logger.info(`Model registered for adaptation: ${modelConfig.name} (${modelId})`);
    this.emit('modelRegistered', { modelId, config: modelConfig });
  }

  /**
   * Unregister a model from adaptation monitoring
   */
  unregisterModel(modelId) {
    this.modelPerformanceTracker.delete(modelId);
    this.marketVolatilityTracker.delete(modelId);
    this.retrainingQueue.delete(modelId);
    this.lastRetrainingTime.delete(modelId);
    
    logger.info(`Model unregistered from adaptation: ${modelId}`);
    this.emit('modelUnregistered', { modelId });
  }

  /**
   * Update model performance with new prediction results
   */
  updateModelPerformance(modelId, prediction, actual) {
    const modelData = this.modelPerformanceTracker.get(modelId);
    if (!modelData) {
      logger.warn(`Attempted to update performance for unregistered model: ${modelId}`);
      return;
    }

    // Add to recent predictions (keep last 100)
    modelData.recentPredictions.push(prediction);
    modelData.recentActuals.push(actual);
    
    if (modelData.recentPredictions.length > 100) {
      modelData.recentPredictions.shift();
      modelData.recentActuals.shift();
    }

    // Calculate current accuracy
    const accuracy = this.calculateAccuracy(modelData.recentPredictions, modelData.recentActuals);
    modelData.currentAccuracy = accuracy;
    modelData.lastUpdateTime = Date.now();

    // Check for performance degradation
    const degradationRatio = (modelData.baselineAccuracy - accuracy) / modelData.baselineAccuracy;
    if (degradationRatio > this.adaptationConfig.performanceDegradationThreshold) {
      modelData.degradationCount++;
      
      if (modelData.degradationCount >= 3) { // 3 consecutive degradations
        this.triggerModelAdaptation(modelId, 'performance_degradation', {
          baselineAccuracy: modelData.baselineAccuracy,
          currentAccuracy: accuracy,
          degradationRatio
        });
      }
    } else {
      modelData.degradationCount = 0; // Reset degradation count
    }

    this.emit('performanceUpdated', { modelId, accuracy, degradationRatio });
  }

  /**
   * Update volatility metrics for market-based adaptation
   */
  updateVolatilityMetrics(marketData) {
    const { symbol, price, timestamp } = marketData;
    
    // Track volatility for each symbol
    if (!this.marketVolatilityTracker.has(symbol)) {
      this.marketVolatilityTracker.set(symbol, {
        recentPrices: [],
        currentVolatility: 0,
        volatilityHistory: [],
        lastUpdateTime: timestamp
      });
    }

    const volatilityData = this.marketVolatilityTracker.get(symbol);
    volatilityData.recentPrices.push({ price, timestamp });
    
    // Keep last 50 prices for volatility calculation
    if (volatilityData.recentPrices.length > 50) {
      volatilityData.recentPrices.shift();
    }

    // Calculate current volatility (standard deviation of returns)
    if (volatilityData.recentPrices.length >= 2) {
      const returns = [];
      for (let i = 1; i < volatilityData.recentPrices.length; i++) {
        const currentPrice = volatilityData.recentPrices[i].price;
        const previousPrice = volatilityData.recentPrices[i - 1].price;
        const returnValue = (currentPrice - previousPrice) / previousPrice;
        returns.push(returnValue);
      }
      
      const volatility = this.calculateStandardDeviation(returns);
      volatilityData.currentVolatility = volatility;
      volatilityData.lastUpdateTime = timestamp;
      
      // Check if volatility exceeds threshold for any models using this symbol
      if (volatility > this.adaptationConfig.maxVolatilityThreshold) {
        this.checkVolatilityBasedAdaptation(symbol, volatility);
      }
    }
  }

  /**
   * Check for models that need volatility-based adaptation
   */
  checkVolatilityBasedAdaptation(symbol, volatility) {
    for (const [modelId, modelData] of this.modelPerformanceTracker.entries()) {
      if (modelData.symbols.includes(symbol)) {
        this.triggerModelAdaptation(modelId, 'high_volatility', {
          symbol,
          volatility,
          threshold: this.adaptationConfig.maxVolatilityThreshold
        });
      }
    }
  }

  /**
   * Trigger model adaptation with specified reason
   */
  async triggerModelAdaptation(modelId, reason, context = {}) {
    const modelData = this.modelPerformanceTracker.get(modelId);
    if (!modelData) {
      logger.warn(`Cannot trigger adaptation for unregistered model: ${modelId}`);
      return;
    }

    // Check retraining cooldown
    const lastRetraining = this.lastRetrainingTime.get(modelId) || 0;
    const timeSinceRetraining = Date.now() - lastRetraining;
    
    if (timeSinceRetraining < this.adaptationConfig.retrainingCooldown) {
      logger.info(`Model ${modelId} is in retraining cooldown, skipping adaptation`);
      return;
    }

    // Add to retraining queue
    this.retrainingQueue.add(modelId);
    
    logger.info(`Triggering model adaptation for ${modelId}, reason: ${reason}`, {
      modelName: modelData.name,
      reason,
      context
    });

    try {
      const adaptationResult = await this.performModelAdaptation(modelId, reason, context);
      
      // Update model data with adaptation results
      modelData.adaptationHistory.push({
        timestamp: Date.now(),
        reason,
        context,
        result: adaptationResult,
        success: adaptationResult.success
      });

      if (adaptationResult.success) {
        modelData.baselineAccuracy = adaptationResult.newAccuracy;
        modelData.degradationCount = 0;
        this.lastRetrainingTime.set(modelId, Date.now());
      }

      this.emit('adaptationCompleted', {
        modelId,
        reason,
        result: adaptationResult
      });

    } catch (error) {
      logger.error(`Model adaptation failed for ${modelId}:`, error);
      this.emit('adaptationFailed', {
        modelId,
        reason,
        error: error.message
      });
    } finally {
      this.retrainingQueue.delete(modelId);
    }
  }

  /**
   * Perform the actual model adaptation
   */
  async performModelAdaptation(modelId, reason, context) {
    const modelData = this.modelPerformanceTracker.get(modelId);
    
    logger.info(`Starting model adaptation for ${modelId}`);
    
    try {
      // Select optimal algorithm based on current market conditions
      const optimalAlgorithm = await this.selectOptimalAlgorithm(modelData, reason, context);
      
      // Get fresh training data based on current market conditions
      const trainingData = await this.getAdaptiveTrainingData(modelData);
      
      // Retrain the model with new algorithm/parameters if needed
      const retrainedModel = await this.retrainModel(modelData, optimalAlgorithm, trainingData);
      
      // Validate the retrained model
      const validationResults = await this.validateRetrainedModel(retrainedModel, trainingData);
      
      return {
        success: true,
        originalAccuracy: modelData.currentAccuracy,
        newAccuracy: validationResults.accuracy,
        algorithmUsed: optimalAlgorithm,
        trainingDataSize: trainingData.length,
        validationMetrics: validationResults,
        adaptationTime: Date.now()
      };
      
    } catch (error) {
      logger.error(`Model adaptation failed for ${modelId}:`, error);
      return {
        success: false,
        error: error.message,
        originalAccuracy: modelData.currentAccuracy
      };
    }
  }

  /**
   * Select optimal algorithm based on market conditions
   */
  async selectOptimalAlgorithm(modelData, reason, context) {
    const currentSymbols = modelData.symbols;
    const avgVolatility = this.getAverageVolatility(currentSymbols);
    
    // Algorithm selection logic based on market conditions
    if (reason === 'high_volatility' && avgVolatility > 0.06) {
      // High volatility markets: use more adaptive algorithms
      return ['lstm', 'reinforcement_learning', 'ensemble_gradient_boost'][
        Math.floor(Math.random() * 3)
      ];
    } else if (reason === 'performance_degradation') {
      // Performance issues: try different algorithm class
      const currentType = modelData.algorithmType;
      if (currentType.includes('regression')) {
        return 'random_forest';
      } else if (currentType === 'random_forest') {
        return 'lstm';
      } else {
        return 'ensemble_gradient_boost';
      }
    } else {
      // Default: stick with current algorithm but tune parameters
      return modelData.algorithmType;
    }
  }

  /**
   * Get adaptive training data based on current conditions
   */
  async getAdaptiveTrainingData(modelData) {
    // This would fetch fresh market data based on current conditions
    // For now, return a simulated dataset
    const trainingSize = 500; // Adaptive size based on volatility
    const mockData = [];
    
    for (let i = 0; i < trainingSize; i++) {
      mockData.push({
        timestamp: Date.now() - (i * 60000), // 1 minute intervals
        features: [Math.random(), Math.random(), Math.random()],
        target: Math.random() > 0.5 ? 1 : 0
      });
    }
    
    return mockData;
  }

  /**
   * Retrain model with new parameters
   */
  async retrainModel(modelData, algorithm, trainingData) {
    // Use mlService to retrain with adaptive parameters
    const adaptiveParameters = this.getAdaptiveParameters(algorithm, modelData);
    
    const retrainedModel = await mlService.createModel({
      name: `${modelData.name}_adapted_${Date.now()}`,
      algorithmType: algorithm,
      targetTimeframe: '1h', // Adaptive timeframe
      symbols: modelData.symbols,
      parameters: adaptiveParameters,
      trainingData
    });
    
    return retrainedModel;
  }

  /**
   * Validate retrained model performance
   */
  async validateRetrainedModel(model, validationData) {
    // Simple validation using part of training data
    const validationSize = Math.min(100, Math.floor(validationData.length * 0.2));
    const validationSet = validationData.slice(-validationSize);
    
    let correctPredictions = 0;
    for (const dataPoint of validationSet) {
      const prediction = await mlService.makePrediction(model.id, dataPoint.features);
      if (Math.abs(prediction - dataPoint.target) < 0.5) {
        correctPredictions++;
      }
    }
    
    const accuracy = correctPredictions / validationSize;
    
    return {
      accuracy,
      validationSize,
      correctPredictions,
      timestamp: Date.now()
    };
  }

  /**
   * Get adaptive parameters based on algorithm and conditions
   */
  getAdaptiveParameters(algorithm, modelData) {
    const baseParams = {};
    const avgVolatility = this.getAverageVolatility(modelData.symbols);
    
    switch (algorithm) {
      case 'lstm':
        baseParams.epochs = avgVolatility > 0.05 ? 50 : 30;
        baseParams.batchSize = 32;
        baseParams.learningRate = avgVolatility > 0.05 ? 0.01 : 0.001;
        break;
      case 'random_forest':
        baseParams.numTrees = avgVolatility > 0.05 ? 20 : 10;
        baseParams.maxDepth = avgVolatility > 0.05 ? 8 : 5;
        break;
      case 'ensemble_gradient_boost':
        baseParams.numEstimators = 100;
        baseParams.learningRate = avgVolatility > 0.05 ? 0.1 : 0.05;
        break;
      default:
        break;
    }
    
    return baseParams;
  }

  /**
   * Check model performance across all registered models
   */
  checkModelPerformance() {
    if (!this.isAdaptationActive) return;
    
    for (const [modelId, modelData] of this.modelPerformanceTracker.entries()) {
      // Check if model hasn't been updated recently
      const timeSinceUpdate = Date.now() - modelData.lastUpdateTime;
      if (timeSinceUpdate > 600000) { // 10 minutes
        logger.warn(`Model ${modelId} hasn't been updated recently`);
        continue;
      }
      
      // Check if accuracy is below minimum threshold
      if (modelData.currentAccuracy < this.adaptationConfig.minAccuracyThreshold) {
        this.triggerModelAdaptation(modelId, 'low_accuracy', {
          currentAccuracy: modelData.currentAccuracy,
          minThreshold: this.adaptationConfig.minAccuracyThreshold
        });
      }
    }
  }

  /**
   * Get average volatility for a set of symbols
   */
  getAverageVolatility(symbols) {
    let totalVolatility = 0;
    let count = 0;
    
    for (const symbol of symbols) {
      const volatilityData = this.marketVolatilityTracker.get(symbol);
      if (volatilityData) {
        totalVolatility += volatilityData.currentVolatility;
        count++;
      }
    }
    
    return count > 0 ? totalVolatility / count : 0;
  }

  /**
   * Calculate accuracy from predictions and actuals
   */
  calculateAccuracy(predictions, actuals) {
    if (predictions.length !== actuals.length || predictions.length === 0) {
      return 0;
    }
    
    let correct = 0;
    for (let i = 0; i < predictions.length; i++) {
      if (Math.abs(predictions[i] - actuals[i]) < 0.5) {
        correct++;
      }
    }
    
    return correct / predictions.length;
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Get adaptation system status
   */
  getAdaptationStatus() {
    return {
      isActive: this.isAdaptationActive,
      registeredModels: this.modelPerformanceTracker.size,
      queuedRetrainings: this.retrainingQueue.size,
      configuration: this.adaptationConfig,
      performance: Array.from(this.modelPerformanceTracker.entries()).map(([id, data]) => ({
        modelId: id,
        name: data.name,
        currentAccuracy: data.currentAccuracy,
        degradationCount: data.degradationCount,
        lastUpdateTime: data.lastUpdateTime
      }))
    };
  }

  /**
   * Update adaptation configuration
   */
  updateConfiguration(newConfig) {
    this.adaptationConfig = { ...this.adaptationConfig, ...newConfig };
    logger.info('Adaptation configuration updated', newConfig);
    this.emit('configurationUpdated', this.adaptationConfig);
  }
}

module.exports = new RealtimeModelAdaptation();