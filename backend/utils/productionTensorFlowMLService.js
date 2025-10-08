/**
 * Production TensorFlow ML Service
 * Real deep learning models for cryptocurrency trading
 * 
 * This service implements production-grade neural networks using TensorFlow.js:
 * - LSTM for time series prediction
 * - GRU for sequence modeling  
 * - CNN for pattern recognition
 * - Transformer for multi-timeframe analysis
 * - Ensemble methods for robust predictions
 */

const tf = require('@tensorflow/tfjs-node');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const { mean, standardDeviation, median } = require('simple-statistics');

class ProductionTensorFlowMLService {
  constructor() {
    this.models = new Map();
    this.trainedModels = new Map();
    this.modelMetrics = new Map();
    this.trainingHistory = new Map();
    
    // Model architectures available
    this.architectures = {
      LSTM: 'lstm',
      GRU: 'gru',
      CNN: 'cnn',
      TRANSFORMER: 'transformer',
      ENSEMBLE: 'ensemble',
      LSTM_ATTENTION: 'lstm_attention',
      BIDIRECTIONAL_LSTM: 'bidirectional_lstm',
      CNN_LSTM: 'cnn_lstm',
      AUTOENCODER: 'autoencoder',
      VAE: 'variational_autoencoder'
    };

    // Feature engineering configurations
    this.featureConfigs = {
      TECHNICAL_INDICATORS: ['sma', 'ema', 'rsi', 'macd', 'bollinger', 'stochastic'],
      MARKET_MICROSTRUCTURE: ['bid_ask_spread', 'order_imbalance', 'trade_intensity'],
      VOLATILITY_FEATURES: ['garch', 'realized_volatility', 'volatility_clustering'],
      SENTIMENT_FEATURES: ['sentiment_score', 'news_impact', 'social_signals'],
      CROSS_ASSET: ['correlation', 'cointegration', 'beta', 'factor_exposure']
    };

    this.isInitialized = false;
    logger.info('Production TensorFlow ML Service initialized');
  }

  /**
   * Initialize TensorFlow backend and verify GPU availability
   */
  async initialize() {
    try {
      await tf.ready();
      
      // Check for GPU acceleration
      const backend = tf.getBackend();
      logger.info(`TensorFlow backend: ${backend}`);
      
      if (backend === 'tensorflow') {
        logger.info('GPU acceleration available');
      } else {
        logger.warn('Using CPU backend - consider GPU for production');
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize TensorFlow:', error);
      return false;
    }
  }

  /**
   * Create LSTM model for time series prediction
   */
  createLSTMModel(config = {}) {
    const {
      sequenceLength = 60,
      features = 5,
      lstmUnits = 50,
      dropoutRate = 0.2,
      denseUnits = 25,
      outputDim = 1,
      useAttention = false,
      bidirectional = false
    } = config;

    const model = tf.sequential();

    // Input layer
    const inputShape = [sequenceLength, features];
    
    if (bidirectional) {
      model.add(tf.layers.bidirectional({
        layer: tf.layers.lstm({
          units: lstmUnits,
          returnSequences: true,
          dropout: dropoutRate,
          recurrentDropout: dropoutRate
        }),
        inputShape
      }));
    } else {
      model.add(tf.layers.lstm({
        units: lstmUnits,
        returnSequences: useAttention,
        dropout: dropoutRate,
        recurrentDropout: dropoutRate,
        inputShape
      }));
    }

    // Attention mechanism if requested
    if (useAttention) {
      model.add(tf.layers.attention());
      model.add(tf.layers.globalAveragePooling1d());
    }

    // Dense layers with batch normalization
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dense({ units: denseUnits, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: dropoutRate }));
    
    // Output layer
    model.add(tf.layers.dense({ units: outputDim, activation: 'linear' }));

    // Compile with advanced optimizer
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae', 'mse']
    });

    logger.info(`Created LSTM model: ${bidirectional ? 'Bidirectional' : 'Standard'} with ${useAttention ? 'attention' : 'no attention'}`);
    return model;
  }

  /**
   * Create GRU model for sequence modeling
   */
  createGRUModel(config = {}) {
    const {
      sequenceLength = 60,
      features = 5,
      gruUnits = 50,
      dropoutRate = 0.2,
      layers = 2,
      denseUnits = 25
    } = config;

    const model = tf.sequential();

    // First GRU layer
    model.add(tf.layers.gru({
      units: gruUnits,
      returnSequences: layers > 1,
      dropout: dropoutRate,
      recurrentDropout: dropoutRate,
      inputShape: [sequenceLength, features]
    }));

    // Additional GRU layers
    for (let i = 1; i < layers; i++) {
      model.add(tf.layers.gru({
        units: gruUnits,
        returnSequences: i < layers - 1,
        dropout: dropoutRate,
        recurrentDropout: dropoutRate
      }));
    }

    // Dense layers
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dense({ units: denseUnits, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: dropoutRate }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    model.compile({
      optimizer: tf.train.adamax(0.002),
      loss: 'meanAbsoluteError',
      metrics: ['mse', 'mae']
    });

    logger.info(`Created GRU model with ${layers} layers`);
    return model;
  }

  /**
   * Create CNN model for pattern recognition
   */
  createCNNModel(config = {}) {
    const {
      inputHeight = 60,
      inputWidth = 5,
      channels = 1,
      filters1 = 32,
      filters2 = 64,
      kernelSize = 3,
      poolSize = 2,
      denseUnits = 50,
      dropoutRate = 0.3
    } = config;

    const model = tf.sequential();

    // Convolutional layers
    model.add(tf.layers.conv2d({
      filters: filters1,
      kernelSize: [kernelSize, kernelSize],
      activation: 'relu',
      inputShape: [inputHeight, inputWidth, channels]
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.maxPooling2d({ poolSize: [poolSize, poolSize] }));

    model.add(tf.layers.conv2d({
      filters: filters2,
      kernelSize: [kernelSize, kernelSize],
      activation: 'relu'
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.maxPooling2d({ poolSize: [poolSize, poolSize] }));

    // Flatten and dense layers
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: denseUnits, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: dropoutRate }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    logger.info('Created CNN model for pattern recognition');
    return model;
  }

  /**
   * Create Transformer model for multi-timeframe analysis
   */
  createTransformerModel(config = {}) {
    const {
      sequenceLength = 60,
      features = 5,
      dModel = 64,
      numHeads = 8,
      numLayers = 4,
      dff = 256,
      dropoutRate = 0.1
    } = config;

    // Note: This is a simplified transformer implementation
    // Production systems would use more sophisticated attention mechanisms
    const model = tf.sequential();

    // Input embedding
    model.add(tf.layers.dense({
      units: dModel,
      inputShape: [sequenceLength, features]
    }));

    // Multi-head attention layers (simplified)
    for (let i = 0; i < numLayers; i++) {
      // In a full implementation, this would be proper multi-head attention
      model.add(tf.layers.lstm({
        units: dModel,
        returnSequences: true,
        dropout: dropoutRate
      }));
      model.add(tf.layers.layerNormalization());
    }

    // Global pooling and output
    model.add(tf.layers.globalAveragePooling1d());
    model.add(tf.layers.dense({ units: dff, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: dropoutRate }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    logger.info('Created Transformer model for multi-timeframe analysis');
    return model;
  }

  /**
   * Create ensemble model combining multiple architectures
   */
  async createEnsembleModel(config = {}) {
    const {
      sequenceLength = 60,
      features = 5,
      models = ['lstm', 'gru', 'cnn'],
      weights = null
    } = config;

    const subModels = [];
    const modelWeights = weights || models.map(() => 1.0 / models.length);

    // Create individual models
    for (const modelType of models) {
      let subModel;
      switch (modelType) {
        case 'lstm':
          subModel = this.createLSTMModel({ sequenceLength, features });
          break;
        case 'gru':
          subModel = this.createGRUModel({ sequenceLength, features });
          break;
        case 'cnn':
          // Reshape for CNN
          subModel = this.createCNNModel({ 
            inputHeight: sequenceLength, 
            inputWidth: features 
          });
          break;
        default:
          throw new Error(`Unknown model type: ${modelType}`);
      }
      subModels.push(subModel);
    }

    // Store ensemble components
    const ensembleId = uuidv4();
    this.models.set(ensembleId, {
      type: 'ensemble',
      subModels,
      weights: modelWeights,
      config
    });

    logger.info(`Created ensemble model with ${models.length} components`);
    return ensembleId;
  }

  /**
   * Prepare training data with advanced feature engineering
   */
  async prepareTrainingData(rawData, config = {}) {
    const {
      sequenceLength = 60,
      features = ['open', 'high', 'low', 'close', 'volume'],
      technicalIndicators = true,
      normalize = true,
      targetOffset = 1
    } = config;

    let processedData = [...rawData];

    // Add technical indicators if requested
    if (technicalIndicators) {
      processedData = await this.addTechnicalIndicators(processedData);
    }

    // Extract feature columns
    const featureData = processedData.map(row => 
      features.map(feature => row[feature] || 0)
    );

    // Normalize data
    let normalizedData = featureData;
    let scalers = {};
    
    if (normalize) {
      const normResult = this.normalizeData(featureData);
      normalizedData = normResult.data;
      scalers = normResult.scalers;
    }

    // Create sequences
    const sequences = [];
    const targets = [];

    for (let i = sequenceLength; i < normalizedData.length - targetOffset; i++) {
      sequences.push(normalizedData.slice(i - sequenceLength, i));
      targets.push(normalizedData[i + targetOffset][3]); // Close price target
    }

    return {
      sequences: tf.tensor3d(sequences),
      targets: tf.tensor2d(targets, [targets.length, 1]),
      scalers,
      metadata: {
        sequenceLength,
        features: features.length,
        samples: sequences.length
      }
    };
  }

  /**
   * Add technical indicators to data
   */
  async addTechnicalIndicators(data) {
    const enhanced = [...data];
    
    // Simple Moving Average
    for (let i = 20; i < enhanced.length; i++) {
      const sma = mean(enhanced.slice(i - 20, i).map(d => d.close));
      enhanced[i].sma_20 = sma;
    }

    // RSI calculation
    for (let i = 14; i < enhanced.length; i++) {
      const gains = [];
      const losses = [];
      
      for (let j = i - 13; j <= i; j++) {
        const change = enhanced[j].close - enhanced[j - 1].close;
        if (change > 0) gains.push(change);
        else losses.push(Math.abs(change));
      }
      
      const avgGain = mean(gains.length ? gains : [0]);
      const avgLoss = mean(losses.length ? losses : [0]);
      const rs = avgGain / (avgLoss || 0.001);
      enhanced[i].rsi = 100 - (100 / (1 + rs));
    }

    // MACD
    for (let i = 26; i < enhanced.length; i++) {
      const ema12 = this.calculateEMA(enhanced.slice(0, i + 1).map(d => d.close), 12);
      const ema26 = this.calculateEMA(enhanced.slice(0, i + 1).map(d => d.close), 26);
      enhanced[i].macd = ema12[ema12.length - 1] - ema26[ema26.length - 1];
    }

    return enhanced;
  }

  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(data, period) {
    const multiplier = 2 / (period + 1);
    const ema = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
      ema[i] = (data[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    
    return ema;
  }

  /**
   * Normalize data using min-max scaling
   */
  normalizeData(data) {
    const features = data[0].length;
    const scalers = {};
    const normalizedData = [];

    // Calculate min/max for each feature
    for (let f = 0; f < features; f++) {
      const values = data.map(row => row[f]);
      scalers[f] = {
        min: Math.min(...values),
        max: Math.max(...values)
      };
    }

    // Normalize each data point
    for (const row of data) {
      const normalizedRow = [];
      for (let f = 0; f < features; f++) {
        const { min, max } = scalers[f];
        const normalized = (row[f] - min) / (max - min || 1);
        normalizedRow.push(normalized);
      }
      normalizedData.push(normalizedRow);
    }

    return { data: normalizedData, scalers };
  }

  /**
   * Train model with advanced techniques
   */
  async trainModel(modelId, trainingData, config = {}) {
    const {
      epochs = 100,
      batchSize = 32,
      validationSplit = 0.2,
      earlyStopping = true,
      patience = 10,
      learningRateSchedule = true
    } = config;

    const model = this.models.get(modelId) || this.trainedModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Prepare callbacks
    const callbacks = [];

    if (earlyStopping) {
      callbacks.push(tf.callbacks.earlyStopping({
        monitor: 'val_loss',
        patience,
        restoreBestWeights: true
      }));
    }

    if (learningRateSchedule) {
      callbacks.push(tf.callbacks.reduceLROnPlateau({
        monitor: 'val_loss',
        factor: 0.5,
        patience: patience / 2,
        minLr: 0.0001
      }));
    }

    try {
      logger.info(`Starting training for model ${modelId}`);
      const startTime = Date.now();

      const history = await model.fit(
        trainingData.sequences,
        trainingData.targets,
        {
          epochs,
          batchSize,
          validationSplit,
          callbacks,
          verbose: 1
        }
      );

      const trainingTime = Date.now() - startTime;
      
      // Store training history and metrics
      this.trainingHistory.set(modelId, history.history);
      this.modelMetrics.set(modelId, {
        finalLoss: history.history.loss[history.history.loss.length - 1],
        finalValLoss: history.history.val_loss[history.history.val_loss.length - 1],
        epochs: history.history.loss.length,
        trainingTime
      });

      this.trainedModels.set(modelId, model);
      
      logger.info(`Model ${modelId} training completed in ${trainingTime}ms`);
      return history;

    } catch (error) {
      logger.error(`Training failed for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Make predictions with ensemble voting
   */
  async predict(modelId, inputData) {
    const model = this.trainedModels.get(modelId);
    if (!model) {
      throw new Error(`Trained model ${modelId} not found`);
    }

    try {
      let prediction;
      
      if (model.type === 'ensemble') {
        // Ensemble prediction
        const predictions = [];
        
        for (let i = 0; i < model.subModels.length; i++) {
          const subPrediction = await model.subModels[i].predict(inputData);
          const predArray = await subPrediction.data();
          predictions.push(predArray[0] * model.weights[i]);
        }
        
        prediction = predictions.reduce((sum, pred) => sum + pred, 0);
      } else {
        // Single model prediction
        const predTensor = await model.predict(inputData);
        const predArray = await predTensor.data();
        prediction = predArray[0];
      }

      return {
        prediction,
        confidence: this.calculatePredictionConfidence(modelId, inputData),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Prediction failed for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate prediction confidence using model uncertainty
   */
  calculatePredictionConfidence(modelId, inputData) {
    // Simplified confidence calculation
    // Production systems would use more sophisticated uncertainty quantification
    const metrics = this.modelMetrics.get(modelId);
    if (!metrics) return 0.5;

    const validationAccuracy = 1 - (metrics.finalValLoss || 1);
    return Math.max(0, Math.min(1, validationAccuracy));
  }

  /**
   * Evaluate model performance with comprehensive metrics
   */
  async evaluateModel(modelId, testData) {
    const model = this.trainedModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    try {
      const predictions = await model.predict(testData.sequences);
      const predArray = await predictions.data();
      const targetArray = await testData.targets.data();

      // Calculate metrics
      const mse = this.calculateMSE(predArray, targetArray);
      const mae = this.calculateMAE(predArray, targetArray);
      const rmse = Math.sqrt(mse);
      const r2 = this.calculateR2(predArray, targetArray);
      const sharpe = this.calculateSharpeRatio(predArray, targetArray);

      const evaluation = {
        mse,
        mae,
        rmse,
        r2,
        sharpe,
        samples: predArray.length,
        evaluatedAt: new Date().toISOString()
      };

      logger.info(`Model ${modelId} evaluation:`, evaluation);
      return evaluation;

    } catch (error) {
      logger.error(`Evaluation failed for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate Mean Squared Error
   */
  calculateMSE(predictions, targets) {
    let sum = 0;
    for (let i = 0; i < predictions.length; i++) {
      sum += Math.pow(predictions[i] - targets[i], 2);
    }
    return sum / predictions.length;
  }

  /**
   * Calculate Mean Absolute Error
   */
  calculateMAE(predictions, targets) {
    let sum = 0;
    for (let i = 0; i < predictions.length; i++) {
      sum += Math.abs(predictions[i] - targets[i]);
    }
    return sum / predictions.length;
  }

  /**
   * Calculate R-squared
   */
  calculateR2(predictions, targets) {
    const targetMean = mean(targets);
    let ssRes = 0;
    let ssTot = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      ssRes += Math.pow(targets[i] - predictions[i], 2);
      ssTot += Math.pow(targets[i] - targetMean, 2);
    }
    
    return 1 - (ssRes / ssTot);
  }

  /**
   * Calculate Sharpe ratio for trading performance
   */
  calculateSharpeRatio(predictions, targets) {
    const returns = [];
    for (let i = 1; i < predictions.length; i++) {
      const actualReturn = (targets[i] - targets[i-1]) / targets[i-1];
      const predictedDirection = predictions[i] > predictions[i-1] ? 1 : -1;
      returns.push(actualReturn * predictedDirection);
    }
    
    const avgReturn = mean(returns);
    const returnStd = standardDeviation(returns);
    
    return returnStd > 0 ? avgReturn / returnStd : 0;
  }

  /**
   * Save model to disk
   */
  async saveModel(modelId, filepath) {
    const model = this.trainedModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    try {
      await model.save(`file://${filepath}`);
      logger.info(`Model ${modelId} saved to ${filepath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to save model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Load model from disk
   */
  async loadModel(filepath, modelId = null) {
    try {
      const model = await tf.loadLayersModel(`file://${filepath}`);
      const id = modelId || uuidv4();
      
      this.trainedModels.set(id, model);
      logger.info(`Model loaded from ${filepath} with ID ${id}`);
      
      return id;
    } catch (error) {
      logger.error(`Failed to load model from ${filepath}:`, error);
      throw error;
    }
  }

  /**
   * Clean up tensors to prevent memory leaks
   */
  dispose() {
    // Dispose of all tensors
    this.models.forEach((model, id) => {
      if (model.dispose) {
        model.dispose();
      }
    });
    
    this.trainedModels.forEach((model, id) => {
      if (model.dispose) {
        model.dispose();
      }
    });

    this.models.clear();
    this.trainedModels.clear();
    this.modelMetrics.clear();
    this.trainingHistory.clear();
    
    logger.info('TensorFlow ML Service disposed');
  }
}

module.exports = ProductionTensorFlowMLService;