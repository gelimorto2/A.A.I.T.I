const logger = require('../utils/logger');
const tf = require('@tensorflow/tfjs-node');
const EventEmitter = require('events');

/**
 * Production ML Pipeline Enhancement
 * Online learning, concept drift detection, and automated retraining system
 */
class ProductionMLPipeline extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Online learning configuration
      onlineLearning: {
        enabled: config.onlineLearning?.enabled ?? true,
        batchSize: config.onlineLearning?.batchSize ?? 32,
        learningRate: config.onlineLearning?.learningRate ?? 0.001,
        updateFrequency: config.onlineLearning?.updateFrequency ?? 100, // Updates per 100 predictions
        adaptiveLearningRate: config.onlineLearning?.adaptiveLearningRate ?? true,
        momentum: config.onlineLearning?.momentum ?? 0.9
      },
      
      // Concept drift detection configuration
      driftDetection: {
        enabled: config.driftDetection?.enabled ?? true,
        methods: config.driftDetection?.methods ?? ['ddm', 'kswin', 'adwin', 'page_hinkley'],
        threshold: config.driftDetection?.threshold ?? 0.001,
        minInstances: config.driftDetection?.minInstances ?? 30,
        warningLevel: config.driftDetection?.warningLevel ?? 2.0,
        driftLevel: config.driftDetection?.driftLevel ?? 3.0,
        windowSize: config.driftDetection?.windowSize ?? 100
      },
      
      // Automated retraining configuration
      retraining: {
        enabled: config.retraining?.enabled ?? true,
        triggers: config.retraining?.triggers ?? ['drift_detected', 'performance_degradation', 'scheduled'],
        performanceThreshold: config.retraining?.performanceThreshold ?? 0.05,
        scheduleInterval: config.retraining?.scheduleInterval ?? 24 * 60 * 60 * 1000, // 24 hours
        maxRetrainingFrequency: config.retraining?.maxRetrainingFrequency ?? 4 * 60 * 60 * 1000, // 4 hours
        validationSplit: config.retraining?.validationSplit ?? 0.2,
        earlyStoppingPatience: config.retraining?.earlyStoppingPatience ?? 10
      },
      
      // Model management
      modelManagement: {
        maxModels: config.modelManagement?.maxModels ?? 5,
        ensembleSize: config.modelManagement?.ensembleSize ?? 3,
        warmupPeriod: config.modelManagement?.warmupPeriod ?? 1000,
        performanceWindow: config.modelManagement?.performanceWindow ?? 500
      }
    };

    // Pipeline state
    this.state = {
      isInitialized: false,
      currentModel: null,
      modelEnsemble: [],
      onlineLearningBuffer: [],
      driftDetectors: new Map(),
      performanceMetrics: {
        accuracy: [],
        loss: [],
        predictions: [],
        actualValues: []
      },
      lastRetraining: null,
      retrainingInProgress: false,
      totalPredictions: 0,
      totalUpdates: 0
    };

    this.initializeDriftDetectors();
    this.setupRetrainingScheduler();
  }

  /**
   * Initialize the ML pipeline
   */
  async initialize(initialModel = null) {
    try {
      logger.info('Initializing Production ML Pipeline...', {
        onlineLearning: this.config.onlineLearning.enabled,
        driftDetection: this.config.driftDetection.enabled,
        retraining: this.config.retraining.enabled
      });

      if (initialModel) {
        this.state.currentModel = initialModel;
        this.state.modelEnsemble.push({
          model: initialModel,
          performance: 0,
          age: 0,
          predictions: 0
        });
      }

      this.state.isInitialized = true;
      this.emit('pipeline:initialized');

      logger.info('Production ML Pipeline initialized successfully');
      return true;

    } catch (error) {
      logger.error('Failed to initialize ML pipeline:', error);
      throw error;
    }
  }

  /**
   * Make prediction with online learning and drift detection
   */
  async predict(features, actualValue = null) {
    try {
      if (!this.state.isInitialized || !this.state.currentModel) {
        throw new Error('Pipeline not initialized or no model available');
      }

      // Make prediction
      const prediction = await this.makePrediction(features);
      this.state.totalPredictions++;

      // Store prediction for performance tracking
      this.state.performanceMetrics.predictions.push(prediction);
      if (actualValue !== null) {
        this.state.performanceMetrics.actualValues.push(actualValue);
        
        // Update online learning buffer
        if (this.config.onlineLearning.enabled) {
          this.updateOnlineLearningBuffer(features, actualValue);
        }

        // Check for concept drift
        if (this.config.driftDetection.enabled) {
          await this.checkConceptDrift(prediction, actualValue);
        }

        // Update performance metrics
        this.updatePerformanceMetrics(prediction, actualValue);
      }

      // Trigger online learning update if needed
      if (this.shouldTriggerOnlineUpdate()) {
        await this.performOnlineUpdate();
      }

      return {
        prediction,
        confidence: this.calculateConfidence(features),
        modelAge: this.getModelAge(),
        driftWarning: this.getDriftWarningLevel(),
        ensembleSize: this.state.modelEnsemble.length
      };

    } catch (error) {
      logger.error('Error in prediction pipeline:', error);
      throw error;
    }
  }

  /**
   * Make prediction using current model or ensemble
   */
  async makePrediction(features) {
    if (this.state.modelEnsemble.length > 1) {
      // Ensemble prediction
      return await this.makeEnsemblePrediction(features);
    } else {
      // Single model prediction
      const inputTensor = tf.tensor2d([features]);
      const prediction = this.state.currentModel.predict(inputTensor);
      const result = await prediction.dataSync()[0];
      
      inputTensor.dispose();
      prediction.dispose();
      
      return result;
    }
  }

  /**
   * Make ensemble prediction
   */
  async makeEnsemblePrediction(features) {
    const predictions = [];
    const weights = [];

    for (const modelInfo of this.state.modelEnsemble) {
      const inputTensor = tf.tensor2d([features]);
      const prediction = modelInfo.model.predict(inputTensor);
      const result = await prediction.dataSync()[0];
      
      predictions.push(result);
      weights.push(this.calculateModelWeight(modelInfo));
      
      inputTensor.dispose();
      prediction.dispose();
    }

    // Weighted average prediction
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < predictions.length; i++) {
      weightedSum += predictions[i] * weights[i];
      totalWeight += weights[i];
    }

    return totalWeight > 0 ? weightedSum / totalWeight : predictions[0];
  }

  /**
   * Calculate model weight for ensemble
   */
  calculateModelWeight(modelInfo) {
    // Weight based on recent performance and age
    const performanceWeight = Math.max(0.1, modelInfo.performance);
    const ageWeight = Math.exp(-modelInfo.age / 10000); // Decay with age
    const predictionWeight = Math.min(1.0, modelInfo.predictions / 1000); // More weight for experienced models
    
    return performanceWeight * ageWeight * predictionWeight;
  }

  /**
   * Update online learning buffer
   */
  updateOnlineLearningBuffer(features, actualValue) {
    this.state.onlineLearningBuffer.push({
      features,
      target: actualValue,
      timestamp: Date.now()
    });

    // Keep buffer size manageable
    const maxBufferSize = this.config.onlineLearning.batchSize * 10;
    if (this.state.onlineLearningBuffer.length > maxBufferSize) {
      this.state.onlineLearningBuffer = this.state.onlineLearningBuffer.slice(-maxBufferSize);
    }
  }

  /**
   * Check if online update should be triggered
   */
  shouldTriggerOnlineUpdate() {
    if (!this.config.onlineLearning.enabled) return false;
    
    return (
      this.state.onlineLearningBuffer.length >= this.config.onlineLearning.batchSize &&
      this.state.totalPredictions % this.config.onlineLearning.updateFrequency === 0
    );
  }

  /**
   * Perform online learning update
   */
  async performOnlineUpdate() {
    try {
      if (this.state.onlineLearningBuffer.length < this.config.onlineLearning.batchSize) {
        return;
      }

      logger.debug('Performing online learning update', {
        bufferSize: this.state.onlineLearningBuffer.length,
        totalUpdates: this.state.totalUpdates
      });

      // Prepare batch data
      const batchSize = Math.min(this.config.onlineLearning.batchSize, this.state.onlineLearningBuffer.length);
      const batch = this.state.onlineLearningBuffer.slice(-batchSize);

      const features = batch.map(item => item.features);
      const targets = batch.map(item => item.target);

      // Create tensors
      const featureTensor = tf.tensor2d(features);
      const targetTensor = tf.tensor2d(targets.map(t => [t]));

      // Get current learning rate
      const learningRate = this.getAdaptiveLearningRate();

      // Create optimizer
      const optimizer = tf.train.adam(learningRate, this.config.onlineLearning.momentum);

      // Perform one step of training
      const loss = await this.trainStep(this.state.currentModel, featureTensor, targetTensor, optimizer);
      
      this.state.totalUpdates++;
      this.emit('pipeline:online_update', { loss, batchSize, learningRate });

      // Clean up tensors
      featureTensor.dispose();
      targetTensor.dispose();

      logger.debug('Online learning update completed', { loss, batchSize });

    } catch (error) {
      logger.error('Error in online learning update:', error);
    }
  }

  /**
   * Get adaptive learning rate
   */
  getAdaptiveLearningRate() {
    if (!this.config.onlineLearning.adaptiveLearningRate) {
      return this.config.onlineLearning.learningRate;
    }

    // Decrease learning rate over time
    const decayFactor = Math.exp(-this.state.totalUpdates / 10000);
    return this.config.onlineLearning.learningRate * decayFactor;
  }

  /**
   * Perform one training step
   */
  async trainStep(model, features, targets, optimizer) {
    const f = () => {
      const predictions = model.predict(features);
      const loss = tf.losses.meanSquaredError(targets, predictions);
      return loss;
    };

    const { value: loss } = await optimizer.minimize(f, true);
    const lossValue = await loss.dataSync()[0];
    loss.dispose();
    
    return lossValue;
  }

  /**
   * Initialize drift detectors
   */
  initializeDriftDetectors() {
    const methods = this.config.driftDetection.methods;

    if (methods.includes('ddm')) {
      this.state.driftDetectors.set('ddm', new DDMDetector(this.config.driftDetection));
    }

    if (methods.includes('kswin')) {
      this.state.driftDetectors.set('kswin', new KSWINDetector(this.config.driftDetection));
    }

    if (methods.includes('adwin')) {
      this.state.driftDetectors.set('adwin', new ADWINDetector(this.config.driftDetection));
    }

    if (methods.includes('page_hinkley')) {
      this.state.driftDetectors.set('page_hinkley', new PageHinkleyDetector(this.config.driftDetection));
    }
  }

  /**
   * Check for concept drift
   */
  async checkConceptDrift(prediction, actualValue) {
    const error = Math.abs(prediction - actualValue);
    let driftDetected = false;
    let warningDetected = false;

    for (const [name, detector] of this.state.driftDetectors) {
      try {
        const result = detector.update(error);
        
        if (result.drift) {
          driftDetected = true;
          logger.warn(`Concept drift detected by ${name}`, result);
        }
        
        if (result.warning) {
          warningDetected = true;
          logger.debug(`Drift warning from ${name}`, result);
        }
      } catch (error) {
        logger.error(`Error in drift detector ${name}:`, error);
      }
    }

    if (driftDetected) {
      this.emit('pipeline:drift_detected', { 
        prediction, 
        actualValue, 
        error,
        detectors: Array.from(this.state.driftDetectors.keys())
      });
      
      if (this.config.retraining.triggers.includes('drift_detected')) {
        await this.triggerRetraining('drift_detected');
      }
    }

    if (warningDetected) {
      this.emit('pipeline:drift_warning', { 
        prediction, 
        actualValue, 
        error 
      });
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(prediction, actualValue) {
    const error = Math.abs(prediction - actualValue);
    const accuracy = 1 - Math.min(1, error);
    
    this.state.performanceMetrics.accuracy.push(accuracy);
    this.state.performanceMetrics.loss.push(error);

    // Keep only recent metrics
    const maxMetrics = this.config.modelManagement.performanceWindow;
    if (this.state.performanceMetrics.accuracy.length > maxMetrics) {
      this.state.performanceMetrics.accuracy = this.state.performanceMetrics.accuracy.slice(-maxMetrics);
      this.state.performanceMetrics.loss = this.state.performanceMetrics.loss.slice(-maxMetrics);
      this.state.performanceMetrics.predictions = this.state.performanceMetrics.predictions.slice(-maxMetrics);
      this.state.performanceMetrics.actualValues = this.state.performanceMetrics.actualValues.slice(-maxMetrics);
    }

    // Check for performance degradation
    if (this.shouldTriggerPerformanceRetraining()) {
      this.triggerRetraining('performance_degradation');
    }
  }

  /**
   * Check if performance-based retraining should be triggered
   */
  shouldTriggerPerformanceRetraining() {
    if (!this.config.retraining.triggers.includes('performance_degradation')) {
      return false;
    }

    const recentAccuracy = this.state.performanceMetrics.accuracy.slice(-50);
    if (recentAccuracy.length < 50) return false;

    const currentPerformance = recentAccuracy.reduce((a, b) => a + b, 0) / recentAccuracy.length;
    
    // Compare with baseline performance (first 1000 predictions)
    const baselineAccuracy = this.state.performanceMetrics.accuracy.slice(0, 1000);
    if (baselineAccuracy.length < 100) return false;

    const baselinePerformance = baselineAccuracy.reduce((a, b) => a + b, 0) / baselineAccuracy.length;
    
    const performanceDrop = baselinePerformance - currentPerformance;
    
    return performanceDrop > this.config.retraining.performanceThreshold;
  }

  /**
   * Trigger automated retraining
   */
  async triggerRetraining(reason) {
    try {
      // Check retraining frequency limit
      if (this.state.lastRetraining && 
          Date.now() - this.state.lastRetraining < this.config.retraining.maxRetrainingFrequency) {
        logger.debug('Retraining skipped due to frequency limit', { reason });
        return;
      }

      if (this.state.retrainingInProgress) {
        logger.debug('Retraining already in progress', { reason });
        return;
      }

      logger.info('Triggering automated retraining', { reason });
      this.state.retrainingInProgress = true;
      this.emit('pipeline:retraining_started', { reason });

      // Perform retraining
      const newModel = await this.performRetraining();
      
      if (newModel) {
        // Add to ensemble
        this.addModelToEnsemble(newModel);
        
        // Update current model if it's better
        if (this.shouldReplaceCurrentModel(newModel)) {
          this.state.currentModel = newModel;
        }

        this.state.lastRetraining = Date.now();
        this.emit('pipeline:retraining_completed', { reason, ensembleSize: this.state.modelEnsemble.length });
        
        logger.info('Retraining completed successfully', { reason });
      }

    } catch (error) {
      logger.error('Error in automated retraining:', error);
      this.emit('pipeline:retraining_failed', { reason, error: error.message });
    } finally {
      this.state.retrainingInProgress = false;
    }
  }

  /**
   * Perform the actual retraining
   */
  async performRetraining() {
    // This is a placeholder for the actual retraining logic
    // In practice, this would involve:
    // 1. Collecting recent training data
    // 2. Preparing the dataset
    // 3. Training a new model
    // 4. Validating the model
    // 5. Returning the trained model

    logger.debug('Performing model retraining...');
    
    // Simulate retraining time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return a placeholder model (in practice, return actual trained model)
    return this.state.currentModel; // Placeholder
  }

  /**
   * Add model to ensemble
   */
  addModelToEnsemble(model) {
    this.state.modelEnsemble.push({
      model,
      performance: 0.5, // Initial neutral performance
      age: 0,
      predictions: 0
    });

    // Remove oldest models if ensemble is too large
    if (this.state.modelEnsemble.length > this.config.modelManagement.maxModels) {
      const sortedModels = this.state.modelEnsemble.sort((a, b) => {
        const scoreA = this.calculateModelWeight(a);
        const scoreB = this.calculateModelWeight(b);
        return scoreB - scoreA;
      });

      this.state.modelEnsemble = sortedModels.slice(0, this.config.modelManagement.maxModels);
    }
  }

  /**
   * Check if new model should replace current model
   */
  shouldReplaceCurrentModel(newModel) {
    // In practice, would compare model performance
    // For now, return false to keep current model
    return false;
  }

  /**
   * Setup automated retraining scheduler
   */
  setupRetrainingScheduler() {
    if (!this.config.retraining.triggers.includes('scheduled')) {
      return;
    }

    setInterval(() => {
      if (!this.state.retrainingInProgress) {
        this.triggerRetraining('scheduled');
      }
    }, this.config.retraining.scheduleInterval);
  }

  /**
   * Calculate prediction confidence
   */
  calculateConfidence(features) {
    // Simple confidence calculation based on recent performance
    const recentAccuracy = this.state.performanceMetrics.accuracy.slice(-100);
    if (recentAccuracy.length === 0) return 0.5;
    
    return recentAccuracy.reduce((a, b) => a + b, 0) / recentAccuracy.length;
  }

  /**
   * Get model age
   */
  getModelAge() {
    return this.state.totalPredictions;
  }

  /**
   * Get drift warning level
   */
  getDriftWarningLevel() {
    let maxWarningLevel = 0;
    
    for (const [name, detector] of this.state.driftDetectors) {
      if (detector.getWarningLevel && typeof detector.getWarningLevel === 'function') {
        maxWarningLevel = Math.max(maxWarningLevel, detector.getWarningLevel());
      }
    }
    
    return maxWarningLevel;
  }

  /**
   * Get pipeline statistics
   */
  getStatistics() {
    const recentAccuracy = this.state.performanceMetrics.accuracy.slice(-100);
    const recentLoss = this.state.performanceMetrics.loss.slice(-100);

    return {
      totalPredictions: this.state.totalPredictions,
      totalUpdates: this.state.totalUpdates,
      ensembleSize: this.state.modelEnsemble.length,
      currentAccuracy: recentAccuracy.length > 0 ? 
        recentAccuracy.reduce((a, b) => a + b, 0) / recentAccuracy.length : 0,
      currentLoss: recentLoss.length > 0 ? 
        recentLoss.reduce((a, b) => a + b, 0) / recentLoss.length : 0,
      lastRetraining: this.state.lastRetraining,
      retrainingInProgress: this.state.retrainingInProgress,
      driftDetectors: Array.from(this.state.driftDetectors.keys()),
      onlineLearningBufferSize: this.state.onlineLearningBuffer.length,
      configuration: this.config
    };
  }

  /**
   * Reset pipeline state
   */
  reset() {
    this.state.onlineLearningBuffer = [];
    this.state.performanceMetrics = {
      accuracy: [],
      loss: [],
      predictions: [],
      actualValues: []
    };
    this.state.totalPredictions = 0;
    this.state.totalUpdates = 0;
    
    // Reset drift detectors
    for (const [name, detector] of this.state.driftDetectors) {
      if (detector.reset && typeof detector.reset === 'function') {
        detector.reset();
      }
    }
  }
}

// Drift Detection Classes

/**
 * Drift Detection Method (DDM)
 */
class DDMDetector {
  constructor(config) {
    this.config = config;
    this.errorRate = 0;
    this.standardDeviation = 0;
    this.minInstances = config.minInstances || 30;
    this.warningLevel = config.warningLevel || 2.0;
    this.driftLevel = config.driftLevel || 3.0;
    this.instanceCount = 0;
  }

  update(error) {
    this.instanceCount++;
    
    if (this.instanceCount < this.minInstances) {
      return { warning: false, drift: false };
    }

    // Update error rate and standard deviation
    const newErrorRate = (this.errorRate * (this.instanceCount - 1) + (error > 0.5 ? 1 : 0)) / this.instanceCount;
    this.standardDeviation = Math.sqrt(newErrorRate * (1 - newErrorRate) / this.instanceCount);
    this.errorRate = newErrorRate;

    const threshold = this.errorRate + this.standardDeviation;
    
    const warning = threshold > this.errorRate + this.warningLevel * this.standardDeviation;
    const drift = threshold > this.errorRate + this.driftLevel * this.standardDeviation;

    return { warning, drift, errorRate: this.errorRate, threshold };
  }

  reset() {
    this.errorRate = 0;
    this.standardDeviation = 0;
    this.instanceCount = 0;
  }

  getWarningLevel() {
    return Math.max(0, (this.errorRate + this.standardDeviation - this.errorRate) / this.standardDeviation);
  }
}

/**
 * Kolmogorov-Smirnov Windowing (KSWIN) Detector
 */
class KSWINDetector {
  constructor(config) {
    this.config = config;
    this.windowSize = config.windowSize || 100;
    this.threshold = config.threshold || 0.001;
    this.window = [];
  }

  update(error) {
    this.window.push(error);
    
    if (this.window.length > this.windowSize * 2) {
      this.window = this.window.slice(-this.windowSize * 2);
    }

    if (this.window.length < this.windowSize * 2) {
      return { warning: false, drift: false };
    }

    // Perform KS test between first and second half of window
    const firstHalf = this.window.slice(0, this.windowSize);
    const secondHalf = this.window.slice(this.windowSize);
    
    const ksStatistic = this.kolmogorovSmirnovTest(firstHalf, secondHalf);
    
    const drift = ksStatistic > this.threshold;
    const warning = ksStatistic > this.threshold * 0.5;

    return { warning, drift, ksStatistic };
  }

  kolmogorovSmirnovTest(sample1, sample2) {
    // Simplified KS test implementation
    const combined = [...sample1, ...sample2].sort((a, b) => a - b);
    let maxDiff = 0;
    
    for (const value of combined) {
      const cdf1 = sample1.filter(x => x <= value).length / sample1.length;
      const cdf2 = sample2.filter(x => x <= value).length / sample2.length;
      maxDiff = Math.max(maxDiff, Math.abs(cdf1 - cdf2));
    }
    
    return maxDiff;
  }

  reset() {
    this.window = [];
  }

  getWarningLevel() {
    return this.window.length >= this.windowSize * 2 ? 1 : 0;
  }
}

/**
 * Adaptive Windowing (ADWIN) Detector
 */
class ADWINDetector {
  constructor(config) {
    this.config = config;
    this.threshold = config.threshold || 0.002;
    this.window = [];
    this.maxWindowSize = 1000;
  }

  update(error) {
    this.window.push(error);
    
    if (this.window.length > this.maxWindowSize) {
      this.window = this.window.slice(-this.maxWindowSize);
    }

    if (this.window.length < 10) {
      return { warning: false, drift: false };
    }

    // Check for change in distribution
    const changeDetected = this.detectChange();
    
    return { 
      warning: changeDetected && this.window.length > 50, 
      drift: changeDetected && this.window.length > 100 
    };
  }

  detectChange() {
    if (this.window.length < 20) return false;
    
    const midpoint = Math.floor(this.window.length / 2);
    const firstHalf = this.window.slice(0, midpoint);
    const secondHalf = this.window.slice(midpoint);
    
    const mean1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const mean2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const variance1 = firstHalf.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / firstHalf.length;
    const variance2 = secondHalf.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / secondHalf.length;
    
    const pooledVariance = (variance1 + variance2) / 2;
    const standardError = Math.sqrt(pooledVariance * (1/firstHalf.length + 1/secondHalf.length));
    
    return Math.abs(mean1 - mean2) > this.threshold * standardError;
  }

  reset() {
    this.window = [];
  }

  getWarningLevel() {
    return this.window.length > 50 ? 1 : 0;
  }
}

/**
 * Page-Hinkley Detector
 */
class PageHinkleyDetector {
  constructor(config) {
    this.config = config;
    this.threshold = config.threshold || 50;
    this.delta = config.delta || 0.005;
    this.lambda = config.lambda || 50;
    this.sum = 0;
    this.count = 0;
    this.mean = 0;
  }

  update(error) {
    this.count++;
    this.mean = (this.mean * (this.count - 1) + error) / this.count;
    
    this.sum += error - this.mean - this.delta;
    
    const drift = Math.abs(this.sum) > this.threshold;
    const warning = Math.abs(this.sum) > this.threshold * 0.5;
    
    if (drift) {
      this.reset();
    }
    
    return { warning, drift, sum: this.sum };
  }

  reset() {
    this.sum = 0;
    this.count = 0;
    this.mean = 0;
  }

  getWarningLevel() {
    return Math.min(1, Math.abs(this.sum) / this.threshold);
  }
}

module.exports = ProductionMLPipeline;