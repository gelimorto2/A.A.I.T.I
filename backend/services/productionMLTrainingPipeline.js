/**
 * Production ML Training Pipeline - Sprint 3
 * Real TensorFlow.js implementation with proper train/validation/test splits,
 * feature engineering, model evaluation, and artifact storage
 */

const tf = require('@tensorflow/tfjs-node');
const logger = require('../utils/logger');
const mlModelRepository = require('../repositories/mlModelRepository');
const { calculateTechnicalIndicators } = require('../utils/technicalIndicators');

class ProductionMLTrainingPipeline {
  constructor() {
    this.minTrainingSamples = 100;
    this.validationSplit = 0.2;
    this.testSplit = 0.1;
    this.randomSeed = 42;
  }

  /**
   * Main training pipeline orchestrator
   * @param {Object} config - Training configuration
   * @returns {Object} - Trained model with metadata
   */
  async trainModel(config) {
    try {
      logger.info(`Starting ML training pipeline: ${config.name} v${config.version}`);
      
      // 1. Validate configuration
      this.validateConfig(config);
      
      // 2. Prepare and engineer features
      const dataset = await this.prepareDataset(config);
      
      // 3. Split data properly
      const splits = this.splitDataset(dataset);
      
      // 4. Build model architecture
      const model = await this.buildModel(config.architecture, dataset.featureCount);
      
      // 5. Train model
      const trainingResult = await this.train(model, splits, config.trainingParams);
      
      // 6. Evaluate on test set
      const evaluation = await this.evaluate(model, splits.test);
      
      // 7. Calculate feature importance
      const featureImportance = await this.calculateFeatureImportance(
        model, 
        splits.test, 
        dataset.featureNames
      );
      
      // 8. Save model and metadata
      const savedModel = await this.saveModel(
        model,
        config,
        trainingResult,
        evaluation,
        featureImportance,
        splits.stats
      );
      
      logger.info(`Training completed successfully: Model ID ${savedModel.id}`);
      
      return savedModel;
      
    } catch (error) {
      logger.error('ML training pipeline failed:', error);
      throw error;
    }
  }

  /**
   * Validate training configuration
   */
  validateConfig(config) {
    const required = ['name', 'version', 'type', 'dataSource', 'architecture', 'trainingParams'];
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required config field: ${field}`);
      }
    }

    if (!config.trainingParams.epochs || config.trainingParams.epochs < 1) {
      throw new Error('Invalid epochs count');
    }

    if (!config.trainingParams.batchSize || config.trainingParams.batchSize < 1) {
      throw new Error('Invalid batch size');
    }
  }

  /**
   * Prepare dataset with feature engineering
   */
  async prepareDataset(config) {
    logger.info('Preparing dataset and engineering features...');
    
    // Fetch raw market data
    const rawData = await this.fetchMarketData(config.dataSource);
    
    if (rawData.length < this.minTrainingSamples) {
      throw new Error(`Insufficient data: ${rawData.length} samples (min: ${this.minTrainingSamples})`);
    }

    // Engineer features
    const features = await this.engineerFeatures(rawData, config.featureConfig);
    
    // Generate labels (next period returns)
    const labels = this.generateLabels(rawData, config.predictionHorizon || 1);
    
    // Normalize features
    const normalized = this.normalizeFeatures(features);
    
    return {
      features: normalized.features,
      labels,
      featureNames: Object.keys(features[0] || {}),
      featureCount: Object.keys(features[0] || {}).length,
      scaler: normalized.scaler,
      rawData,
      totalSamples: features.length
    };
  }

  /**
   * Engineer features from raw market data
   */
  async engineerFeatures(rawData, config = {}) {
    const features = [];
    
    for (let i = 20; i < rawData.length; i++) {
      const window = rawData.slice(Math.max(0, i - 100), i);
      const currentBar = rawData[i];
      
      // Technical indicators
      const indicators = calculateTechnicalIndicators(window);
      
      // Price-based features
      const priceFeatures = {
        close: currentBar.close,
        open: currentBar.open,
        high: currentBar.high,
        low: currentBar.low,
        volume: currentBar.volume || 0,
        
        // Price changes
        price_change_1: i > 0 ? (currentBar.close - rawData[i-1].close) / rawData[i-1].close : 0,
        price_change_5: i > 5 ? (currentBar.close - rawData[i-5].close) / rawData[i-5].close : 0,
        price_change_20: i > 20 ? (currentBar.close - rawData[i-20].close) / rawData[i-20].close : 0,
        
        // Volatility
        high_low_range: (currentBar.high - currentBar.low) / currentBar.close,
        open_close_range: Math.abs(currentBar.open - currentBar.close) / currentBar.close
      };
      
      // Time-based features
      const timeFeatures = {
        hour_of_day: new Date(currentBar.timestamp).getHours(),
        day_of_week: new Date(currentBar.timestamp).getDay(),
        day_of_month: new Date(currentBar.timestamp).getDate()
      };
      
      // Combine all features
      features.push({
        ...priceFeatures,
        ...indicators,
        ...timeFeatures
      });
    }
    
    return features;
  }

  /**
   * Generate labels (classification or regression)
   */
  generateLabels(rawData, horizon = 1) {
    const labels = [];
    
    for (let i = 20; i < rawData.length - horizon; i++) {
      const currentPrice = rawData[i].close;
      const futurePrice = rawData[i + horizon].close;
      const priceChange = (futurePrice - currentPrice) / currentPrice;
      
      // Binary classification: up (1) or down (0)
      labels.push(priceChange > 0 ? 1 : 0);
      
      // For regression, use: labels.push(priceChange);
    }
    
    // Pad last samples
    while (labels.length < rawData.length - 20) {
      labels.push(labels[labels.length - 1]);
    }
    
    return labels;
  }

  /**
   * Normalize features using min-max scaling
   */
  normalizeFeatures(features) {
    if (features.length === 0) {
      return { features: [], scaler: {} };
    }

    const featureNames = Object.keys(features[0]);
    const scaler = {};
    
    // Calculate min/max for each feature
    featureNames.forEach(name => {
      const values = features.map(f => f[name]).filter(v => v !== null && !isNaN(v));
      scaler[name] = {
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((a, b) => a + b, 0) / values.length
      };
    });
    
    // Normalize features
    const normalized = features.map(feature => {
      const norm = {};
      featureNames.forEach(name => {
        const value = feature[name];
        const { min, max, mean } = scaler[name];
        
        if (max === min) {
          norm[name] = 0;
        } else {
          norm[name] = (value - min) / (max - min);
        }
      });
      return norm;
    });
    
    return { features: normalized, scaler };
  }

  /**
   * Split dataset into train/validation/test sets
   */
  splitDataset(dataset) {
    const { features, labels } = dataset;
    const n = features.length;
    
    // Time-series split (no shuffling to preserve temporal order)
    const testSize = Math.floor(n * this.testSplit);
    const validationSize = Math.floor(n * this.validationSplit);
    const trainSize = n - testSize - validationSize;
    
    const trainFeatures = features.slice(0, trainSize);
    const trainLabels = labels.slice(0, trainSize);
    
    const valFeatures = features.slice(trainSize, trainSize + validationSize);
    const valLabels = labels.slice(trainSize, trainSize + validationSize);
    
    const testFeatures = features.slice(trainSize + validationSize);
    const testLabels = labels.slice(trainSize + validationSize);
    
    logger.info(`Dataset split - Train: ${trainSize}, Val: ${validationSize}, Test: ${testSize}`);
    
    return {
      train: { features: trainFeatures, labels: trainLabels },
      validation: { features: valFeatures, labels: valLabels },
      test: { features: testFeatures, labels: testLabels },
      stats: {
        total: n,
        train: trainSize,
        validation: validationSize,
        test: testSize
      }
    };
  }

  /**
   * Build TensorFlow.js model architecture
   */
  async buildModel(architecture, featureCount) {
    const model = tf.sequential();
    
    switch (architecture.type) {
      case 'lstm':
        // LSTM for time-series
        model.add(tf.layers.lstm({
          units: architecture.units || 64,
          returnSequences: false,
          inputShape: [1, featureCount]
        }));
        model.add(tf.layers.dropout({ rate: 0.2 }));
        model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
        break;
        
      case 'dense':
        // Dense neural network
        model.add(tf.layers.dense({
          units: architecture.layers?.[0] || 128,
          activation: 'relu',
          inputShape: [featureCount]
        }));
        model.add(tf.layers.dropout({ rate: 0.3 }));
        
        model.add(tf.layers.dense({
          units: architecture.layers?.[1] || 64,
          activation: 'relu'
        }));
        model.add(tf.layers.dropout({ rate: 0.2 }));
        
        model.add(tf.layers.dense({
          units: architecture.layers?.[2] || 32,
          activation: 'relu'
        }));
        
        model.add(tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        }));
        break;
        
      default:
        throw new Error(`Unknown architecture type: ${architecture.type}`);
    }
    
    // Compile model
    model.compile({
      optimizer: tf.train.adam(architecture.learningRate || 0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    logger.info(`Model built: ${architecture.type} architecture`);
    model.summary();
    
    return model;
  }

  /**
   * Train the model
   */
  async train(model, splits, params) {
    const { train, validation } = splits;
    
    // Convert to tensors
    const xTrain = this.featuresToTensor(train.features);
    const yTrain = tf.tensor2d(train.labels.map(l => [l]));
    
    const xVal = this.featuresToTensor(validation.features);
    const yVal = tf.tensor2d(validation.labels.map(l => [l]));
    
    logger.info(`Starting training: ${params.epochs} epochs, batch size ${params.batchSize}`);
    
    const startTime = Date.now();
    
    // Train
    const history = await model.fit(xTrain, yTrain, {
      epochs: params.epochs,
      batchSize: params.batchSize,
      validationData: [xVal, yVal],
      shuffle: false, // Don't shuffle time-series data
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            logger.info(`Epoch ${epoch}: loss=${logs.loss.toFixed(4)}, acc=${logs.acc.toFixed(4)}, ` +
                       `val_loss=${logs.val_loss.toFixed(4)}, val_acc=${logs.val_acc.toFixed(4)}`);
          }
        }
      }
    });
    
    const trainingTime = (Date.now() - startTime) / 1000;
    
    // Cleanup
    xTrain.dispose();
    yTrain.dispose();
    xVal.dispose();
    yVal.dispose();
    
    logger.info(`Training completed in ${trainingTime}s`);
    
    return {
      history: history.history,
      epochs: params.epochs,
      trainingTime,
      finalLoss: history.history.loss[history.history.loss.length - 1],
      finalAccuracy: history.history.acc[history.history.acc.length - 1],
      finalValLoss: history.history.val_loss[history.history.val_loss.length - 1],
      finalValAccuracy: history.history.val_acc[history.history.val_acc.length - 1]
    };
  }

  /**
   * Evaluate model on test set
   */
  async evaluate(model, testSet) {
    const xTest = this.featuresToTensor(testSet.features);
    const yTest = tf.tensor2d(testSet.labels.map(l => [l]));
    
    const evaluation = model.evaluate(xTest, yTest);
    const testLoss = await evaluation[0].data();
    const testAccuracy = await evaluation[1].data();
    
    // Get predictions
    const predictions = model.predict(xTest);
    const predArray = await predictions.data();
    const predLabels = Array.from(predArray).map(p => p > 0.5 ? 1 : 0);
    
    // Calculate additional metrics
    const metrics = this.calculateMetrics(testSet.labels, predLabels);
    
    // Cleanup
    xTest.dispose();
    yTest.dispose();
    evaluation.forEach(t => t.dispose());
    predictions.dispose();
    
    logger.info(`Test evaluation - Loss: ${testLoss[0].toFixed(4)}, Accuracy: ${testAccuracy[0].toFixed(4)}`);
    
    return {
      testLoss: testLoss[0],
      testAccuracy: testAccuracy[0],
      ...metrics
    };
  }

  /**
   * Calculate comprehensive metrics
   */
  calculateMetrics(actual, predicted) {
    let tp = 0, tn = 0, fp = 0, fn = 0;
    
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] === 1 && predicted[i] === 1) tp++;
      else if (actual[i] === 0 && predicted[i] === 0) tn++;
      else if (actual[i] === 0 && predicted[i] === 1) fp++;
      else if (actual[i] === 1 && predicted[i] === 0) fn++;
    }
    
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const accuracy = (tp + tn) / (tp + tn + fp + fn) || 0;
    
    return {
      precision,
      recall,
      f1Score,
      accuracy,
      truePositives: tp,
      trueNegatives: tn,
      falsePositives: fp,
      falseNegatives: fn
    };
  }

  /**
   * Calculate feature importance using permutation
   */
  async calculateFeatureImportance(model, testSet, featureNames) {
    const importance = [];
    const xTest = this.featuresToTensor(testSet.features);
    const yTest = tf.tensor2d(testSet.labels.map(l => [l]));
    
    // Baseline accuracy
    const baseEval = model.evaluate(xTest, yTest);
    const baseAccuracy = await baseEval[1].data();
    
    // Permute each feature
    for (let i = 0; i < featureNames.length; i++) {
      const permutedFeatures = testSet.features.map(f => {
        const copy = { ...f };
        copy[featureNames[i]] = Math.random(); // Permute this feature
        return copy;
      });
      
      const xPermuted = this.featuresToTensor(permutedFeatures);
      const permEval = model.evaluate(xPermuted, yTest);
      const permAccuracy = await permEval[1].data();
      
      const importanceScore = baseAccuracy[0] - permAccuracy[0];
      
      importance.push({
        name: featureNames[i],
        importance: Math.max(0, importanceScore),
        type: 'technical'
      });
      
      xPermuted.dispose();
      permEval.forEach(t => t.dispose());
    }
    
    // Cleanup
    xTest.dispose();
    yTest.dispose();
    baseEval.forEach(t => t.dispose());
    
    // Sort by importance
    importance.sort((a, b) => b.importance - a.importance);
    
    logger.info(`Feature importance calculated for ${importance.length} features`);
    
    return importance;
  }

  /**
   * Save model and metadata to repository
   */
  async saveModel(model, config, trainingResult, evaluation, featureImportance, splitStats) {
    // Save TensorFlow model to disk
    const modelPath = `file://./data/ml_models/${config.name}_v${config.version}`;
    await model.save(modelPath);
    
    // Prepare model metadata
    const modelData = {
      name: config.name,
      type: config.type,
      version: config.version,
      params: config.architecture,
      training_config: config.trainingParams,
      feature_config: config.featureConfig || {},
      metrics: {
        train_loss: trainingResult.finalLoss,
        train_accuracy: trainingResult.finalAccuracy,
        val_loss: trainingResult.finalValLoss,
        val_accuracy: trainingResult.finalValAccuracy
      },
      validation_metrics: evaluation,
      training_metadata: {
        training_samples: splitStats.train,
        validation_samples: splitStats.validation,
        test_samples: splitStats.test,
        num_features: featureImportance.length,
        num_epochs_trained: trainingResult.epochs,
        training_duration_seconds: Math.round(trainingResult.trainingTime),
        training_started_at: new Date(),
        training_completed_at: new Date()
      },
      artifact_data: {
        path: modelPath,
        format: 'tensorflowjs'
      }
    };
    
    // Save to repository
    const savedModel = await mlModelRepository.createModel(modelData, config.userId);
    
    // Save feature importance
    if (featureImportance.length > 0) {
      await mlModelRepository.saveFeatureImportance(savedModel.id, featureImportance);
    }
    
    return savedModel;
  }

  /**
   * Convert features array to tensor
   */
  featuresToTensor(features) {
    const featureArray = features.map(f => Object.values(f));
    return tf.tensor2d(featureArray);
  }

  /**
   * Fetch market data from database
   */
  async fetchMarketData(dataSource) {
    // TODO: Implement actual data fetching from your data source
    // This is a placeholder
    logger.warn('Using mock market data - implement real data fetching');
    
    const mockData = [];
    let price = 100;
    
    for (let i = 0; i < 1000; i++) {
      const change = (Math.random() - 0.5) * 2;
      price += change;
      
      mockData.push({
        timestamp: new Date(Date.now() - (1000 - i) * 3600000).toISOString(),
        open: price,
        high: price + Math.random() * 2,
        low: price - Math.random() * 2,
        close: price,
        volume: Math.random() * 1000000
      });
    }
    
    return mockData;
  }
}

module.exports = new ProductionMLTrainingPipeline();
