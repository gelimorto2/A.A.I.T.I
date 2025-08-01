const { Matrix } = require('ml-matrix');
const MLR = require('ml-regression');
const { mean, standardDeviation, median } = require('simple-statistics');
const Bayes = require('bayes');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const advancedIndicators = require('./advancedIndicators');

class MLService {
  constructor() {
    this.models = new Map();
    this.realtimePredictions = new Map();
    this.modelPerformanceTracking = new Map();
    this.algorithms = {
      LINEAR_REGRESSION: 'linear_regression',
      POLYNOMIAL_REGRESSION: 'polynomial_regression',
      RANDOM_FOREST: 'random_forest',
      SVM: 'svm',
      NAIVE_BAYES: 'naive_bayes',
      LSTM: 'lstm',
      MOVING_AVERAGE: 'moving_average',
      TECHNICAL_INDICATORS: 'technical_indicators',
      // New sophisticated algorithms
      ENSEMBLE_GRADIENT_BOOST: 'ensemble_gradient_boost',
      DEEP_NEURAL_NETWORK: 'deep_neural_network',
      REINFORCEMENT_LEARNING: 'reinforcement_learning'
    };
    
    logger.info('Enhanced MLService initialized with advanced algorithms and real-time capabilities');
  }

  /**
   * Create and train a new ML model
   */
  async createModel(modelConfig) {
    const modelId = uuidv4();
    const {
      name,
      algorithmType,
      targetTimeframe,
      symbols,
      parameters = {},
      trainingData
    } = modelConfig;

    try {
      let model;
      const features = this.extractFeatures(trainingData);
      const targets = this.extractTargets(trainingData);

      switch (algorithmType) {
        case this.algorithms.LINEAR_REGRESSION:
          model = this.trainLinearRegression(features, targets, parameters);
          break;
        case this.algorithms.POLYNOMIAL_REGRESSION:
          model = this.trainPolynomialRegression(features, targets, parameters);
          break;
        case this.algorithms.RANDOM_FOREST:
          model = this.trainRandomForest(features, targets, parameters);
          break;
        case this.algorithms.SVM:
          model = this.trainSVM(features, targets, parameters);
          break;
        case this.algorithms.NAIVE_BAYES:
          model = this.trainNaiveBayes(features, targets, parameters);
          break;
        case this.algorithms.LSTM:
          model = this.trainLSTM(features, targets, parameters);
          break;
        case this.algorithms.MOVING_AVERAGE:
          model = this.trainMovingAverage(features, targets, parameters);
          break;
        case this.algorithms.TECHNICAL_INDICATORS:
          model = this.trainTechnicalIndicators(features, targets, parameters);
          break;
        case this.algorithms.ENSEMBLE_GRADIENT_BOOST:
          model = this.trainEnsembleGradientBoost(features, targets, parameters);
          break;
        case this.algorithms.DEEP_NEURAL_NETWORK:
          model = this.trainDeepNeuralNetwork(features, targets, parameters);
          break;
        case this.algorithms.REINFORCEMENT_LEARNING:
          model = this.trainReinforcementLearning(features, targets, parameters);
          break;
        default:
          throw new Error(`Unsupported algorithm type: ${algorithmType}`);
      }

      // Calculate performance metrics
      const predictions = this.predict(model, features, algorithmType);
      const performanceMetrics = this.calculatePerformanceMetrics(targets, predictions);

      const modelData = {
        id: modelId,
        name,
        algorithmType,
        targetTimeframe,
        symbols,
        parameters,
        model: this.serializeModel(model, algorithmType),
        performanceMetrics,
        trainingSize: trainingData.length,
        createdAt: new Date().toISOString()
      };

      this.models.set(modelId, modelData);
      logger.info(`ML Model created: ${name} (${algorithmType})`);
      
      return modelData;
    } catch (error) {
      logger.error('Error creating ML model:', error);
      throw error;
    }
  }

  /**
   * Train Linear Regression model
   */
  trainLinearRegression(features, targets, parameters = {}) {
    const X = new Matrix(features);
    const y = Matrix.columnVector(targets);
    
    const regression = new MLR.SimpleLinearRegression(X.getColumn(0), targets);
    
    if (features[0].length > 1) {
      // Multiple linear regression
      const mlr = new MLR.MultivariateLinearRegression(features, targets);
      return {
        type: 'multivariate',
        model: mlr,
        coefficients: mlr.weights,
        intercept: mlr.intercept
      };
    }
    
    return {
      type: 'simple',
      model: regression,
      slope: regression.slope,
      intercept: regression.intercept,
      r2: regression.coefficientOfDetermination(X.getColumn(0), targets)
    };
  }

  /**
   * Train Polynomial Regression model
   */
  trainPolynomialRegression(features, targets, parameters = {}) {
    const degree = parameters.degree || 2;
    const regression = new MLR.PolynomialRegression(features.map(f => f[0]), targets, degree);
    
    return {
      type: 'polynomial',
      model: regression,
      degree,
      coefficients: regression.coefficients,
      r2: regression.coefficientOfDetermination(features.map(f => f[0]), targets)
    };
  }

  /**
   * Simple Random Forest implementation
   */
  trainRandomForest(features, targets, parameters = {}) {
    const numTrees = parameters.numTrees || 10;
    const maxDepth = parameters.maxDepth || 5;
    const trees = [];

    for (let i = 0; i < numTrees; i++) {
      // Bootstrap sampling
      const bootstrapSample = this.bootstrapSample(features, targets);
      const tree = this.buildDecisionTree(bootstrapSample.features, bootstrapSample.targets, maxDepth);
      trees.push(tree);
    }

    return {
      type: 'random_forest',
      trees,
      numTrees,
      maxDepth
    };
  }

  /**
   * Train Naive Bayes model
   */
  trainNaiveBayes(features, targets, parameters = {}) {
    const classifier = new Bayes();
    
    // Convert to classification problem
    const classes = this.convertToClasses(targets);
    
    features.forEach((feature, index) => {
      const featureText = feature.join(' ');
      classifier.learn(featureText, classes[index]);
    });

    return {
      type: 'naive_bayes',
      model: classifier,
      classes: [...new Set(classes)]
    };
  }

  /**
   * Train Moving Average model
   */
  trainMovingAverage(features, targets, parameters = {}) {
    const window = parameters.window || 20;
    const type = parameters.type || 'simple'; // simple, exponential
    
    return {
      type: 'moving_average',
      window,
      maType: type,
      parameters
    };
  }

  /**
   * Train SVM model (simplified implementation)
   */
  trainSVM(features, targets, parameters = {}) {
    const C = parameters.C || 1.0;
    const kernel = parameters.kernel || 'linear'; // linear, rbf, polynomial
    
    // Simplified SVM implementation using separating hyperplane approach
    const supportVectors = this.findSupportVectors(features, targets);
    
    return {
      type: 'svm',
      kernel,
      C,
      supportVectors,
      parameters
    };
  }

  /**
   * Train LSTM model (simplified implementation)
   */
  trainLSTM(features, targets, parameters = {}) {
    const sequenceLength = parameters.sequenceLength || 10;
    const hiddenUnits = parameters.hiddenUnits || 50;
    const epochs = parameters.epochs || 100;
    
    // Simplified LSTM implementation using time series windows
    const sequences = this.createSequences(features, targets, sequenceLength);
    const weights = this.trainSequenceModel(sequences, hiddenUnits, epochs);
    
    return {
      type: 'lstm',
      sequenceLength,
      hiddenUnits,
      epochs,
      weights,
      parameters
    };
  }

  /**
   * Train Technical Indicators model
   */
  trainTechnicalIndicators(features, targets, parameters = {}) {
    const indicators = parameters.indicators || ['sma', 'rsi', 'macd'];
    
    return {
      type: 'technical_indicators',
      indicators,
      parameters,
      weights: this.calculateIndicatorWeights(features, targets, indicators)
    };
  }

  /**
   * Train Ensemble Gradient Boost model (simplified implementation)
   */
  trainEnsembleGradientBoost(features, targets, parameters = {}) {
    const numTrees = parameters.numTrees || 50;
    const learningRate = parameters.learningRate || 0.1;
    const maxDepth = parameters.maxDepth || 6;
    
    const models = [];
    let residuals = [...targets];
    
    logger.info(`Training Gradient Boost ensemble with ${numTrees} trees`);
    
    for (let i = 0; i < numTrees; i++) {
      // Train weak learner on residuals
      const tree = this.buildDecisionTree(features, residuals, maxDepth);
      const predictions = features.map(feature => this.predictDecisionTree(tree, feature));
      
      // Update residuals
      residuals = residuals.map((target, idx) => target - learningRate * predictions[idx]);
      
      models.push({
        tree,
        weight: learningRate
      });
    }
    
    return {
      type: 'ensemble_gradient_boost',
      models,
      numTrees,
      learningRate,
      maxDepth
    };
  }

  /**
   * Train Deep Neural Network (simplified multi-layer implementation)
   */
  trainDeepNeuralNetwork(features, targets, parameters = {}) {
    const hiddenLayers = parameters.hiddenLayers || [32, 16, 8];
    const epochs = parameters.epochs || 100;
    const learningRate = parameters.learningRate || 0.001;
    const activationFunction = parameters.activation || 'relu';
    
    logger.info(`Training Deep Neural Network with layers: [${features[0].length}, ${hiddenLayers.join(', ')}, 1]`);
    
    // Initialize network weights
    const network = this.initializeNeuralNetwork(features[0].length, hiddenLayers, 1);
    
    // Training loop
    const trainingHistory = [];
    for (let epoch = 0; epoch < Math.min(epochs, 50); epoch++) { // Limit to prevent long training
      let totalLoss = 0;
      
      for (let i = 0; i < features.length; i++) {
        const prediction = this.forwardPassDNN(features[i], network, activationFunction);
        const loss = Math.pow(targets[i] - prediction, 2);
        totalLoss += loss;
        
        // Simplified backpropagation
        this.backwardPassDNN(features[i], targets[i], prediction, network, learningRate);
      }
      
      const avgLoss = totalLoss / features.length;
      trainingHistory.push(avgLoss);
      
      if (epoch % 10 === 0) {
        logger.debug(`DNN Epoch ${epoch}, Loss: ${avgLoss.toFixed(6)}`);
      }
    }
    
    return {
      type: 'deep_neural_network',
      network,
      hiddenLayers,
      activationFunction,
      trainingHistory,
      epochs: Math.min(epochs, 50)
    };
  }

  /**
   * Train Reinforcement Learning model (Q-Learning for trading)
   */
  trainReinforcementLearning(features, targets, parameters = {}) {
    const actions = parameters.actions || ['buy', 'sell', 'hold'];
    const learningRate = parameters.learningRate || 0.1;
    const discountFactor = parameters.discountFactor || 0.95;
    const epsilon = parameters.epsilon || 0.1;
    const episodes = parameters.episodes || 100;
    
    logger.info(`Training RL model with ${actions.length} actions for ${episodes} episodes`);
    
    // Initialize Q-table (simplified state representation)
    const qTable = new Map();
    const stateSize = Math.min(features[0].length, 10); // Limit state complexity
    
    // Training episodes
    const rewards = [];
    for (let episode = 0; episode < Math.min(episodes, 20); episode++) { // Limit episodes
      let totalReward = 0;
      
      for (let i = 1; i < features.length - 1; i++) {
        const state = this.discretizeState(features[i], stateSize);
        const stateKey = state.join(',');
        
        if (!qTable.has(stateKey)) {
          qTable.set(stateKey, new Array(actions.length).fill(0));
        }
        
        // Epsilon-greedy action selection
        let action;
        if (Math.random() < epsilon) {
          action = Math.floor(Math.random() * actions.length);
        } else {
          const qValues = qTable.get(stateKey);
          action = qValues.indexOf(Math.max(...qValues));
        }
        
        // Calculate reward based on next price movement
        const currentReturn = targets[i];
        let reward = 0;
        if (actions[action] === 'buy' && currentReturn > 0) reward = currentReturn;
        else if (actions[action] === 'sell' && currentReturn < 0) reward = -currentReturn;
        else if (actions[action] === 'hold') reward = 0;
        
        totalReward += reward;
        
        // Update Q-value
        const nextState = this.discretizeState(features[i + 1], stateSize);
        const nextStateKey = nextState.join(',');
        if (!qTable.has(nextStateKey)) {
          qTable.set(nextStateKey, new Array(actions.length).fill(0));
        }
        
        const maxNextQ = Math.max(...qTable.get(nextStateKey));
        const currentQ = qTable.get(stateKey);
        currentQ[action] += learningRate * (reward + discountFactor * maxNextQ - currentQ[action]);
      }
      
      rewards.push(totalReward);
    }
    
    return {
      type: 'reinforcement_learning',
      qTable: Array.from(qTable.entries()),
      actions,
      learningRate,
      discountFactor,
      stateSize,
      trainingRewards: rewards
    };
  }

  /**
   * Make predictions using a trained model
   */
  predict(model, features, algorithmType) {
    switch (algorithmType) {
      case this.algorithms.LINEAR_REGRESSION:
        return this.predictLinearRegression(model, features);
      case this.algorithms.POLYNOMIAL_REGRESSION:
        return this.predictPolynomialRegression(model, features);
      case this.algorithms.RANDOM_FOREST:
        return this.predictRandomForest(model, features);
      case this.algorithms.SVM:
        return this.predictSVM(model, features);
      case this.algorithms.NAIVE_BAYES:
        return this.predictNaiveBayes(model, features);
      case this.algorithms.LSTM:
        return this.predictLSTM(model, features);
      case this.algorithms.MOVING_AVERAGE:
        return this.predictMovingAverage(model, features);
      case this.algorithms.TECHNICAL_INDICATORS:
        return this.predictTechnicalIndicators(model, features);
      case this.algorithms.ENSEMBLE_GRADIENT_BOOST:
        return this.predictEnsembleGradientBoost(model, features);
      case this.algorithms.DEEP_NEURAL_NETWORK:
        return this.predictDeepNeuralNetwork(model, features);
      case this.algorithms.REINFORCEMENT_LEARNING:
        return this.predictReinforcementLearning(model, features);
      default:
        throw new Error(`Prediction not implemented for: ${algorithmType}`);
    }
  }

  /**
   * Linear Regression predictions
   */
  predictLinearRegression(model, features) {
    if (model.type === 'simple') {
      return features.map(f => model.model.predict(f[0]));
    } else {
      return features.map(f => model.model.predict(f));
    }
  }

  /**
   * Polynomial Regression predictions
   */
  predictPolynomialRegression(model, features) {
    return features.map(f => model.model.predict(f[0]));
  }

  /**
   * Random Forest predictions
   */
  predictRandomForest(model, features) {
    return features.map(feature => {
      const predictions = model.trees.map(tree => this.predictDecisionTree(tree, feature));
      return mean(predictions);
    });
  }

  /**
   * Naive Bayes predictions
   */
  predictNaiveBayes(model, features) {
    return features.map(feature => {
      const featureText = feature.join(' ');
      const prediction = model.model.categorize(featureText);
      return this.classToValue(prediction);
    });
  }

  /**
   * SVM predictions
   */
  predictSVM(model, features) {
    return features.map(feature => {
      if (model.kernel === 'linear') {
        return this.linearKernelPredict(feature, model.supportVectors);
      } else if (model.kernel === 'rbf') {
        return this.rbfKernelPredict(feature, model.supportVectors);
      } else {
        return this.linearKernelPredict(feature, model.supportVectors);
      }
    });
  }

  /**
   * LSTM predictions
   */
  predictLSTM(model, features) {
    const sequenceLength = model.sequenceLength;
    const predictions = [];
    
    for (let i = sequenceLength; i < features.length; i++) {
      const sequence = features.slice(i - sequenceLength, i);
      const prediction = this.predictSequence(sequence, model.weights);
      predictions.push(prediction);
    }
    
    return predictions;
  }

  /**
   * Moving Average predictions
   */
  predictMovingAverage(model, prices) {
    const window = model.window;
    const predictions = [];
    
    for (let i = window; i < prices.length; i++) {
      const windowPrices = prices.slice(i - window, i).map(p => p[0]);
      let prediction;
      
      if (model.maType === 'simple') {
        prediction = mean(windowPrices);
      } else if (model.maType === 'exponential') {
        prediction = this.calculateEMA(windowPrices);
      }
      
      predictions.push(prediction);
    }
    
    return predictions;
  }

  /**
   * Technical Indicators predictions
   */
  predictTechnicalIndicators(model, features) {
    return features.map(feature => {
      let prediction = 0;
      model.indicators.forEach((indicator, index) => {
        const weight = model.weights[index] || 1;
        prediction += feature[index] * weight;
      });
      return prediction / model.indicators.length;
    });
  }

  /**
   * Ensemble Gradient Boost predictions
   */
  predictEnsembleGradientBoost(model, features) {
    return features.map(feature => {
      let prediction = 0;
      model.models.forEach(weakLearner => {
        const treePrediction = this.predictDecisionTree(weakLearner.tree, feature);
        prediction += weakLearner.weight * treePrediction;
      });
      return prediction;
    });
  }

  /**
   * Deep Neural Network predictions
   */
  predictDeepNeuralNetwork(model, features) {
    return features.map(feature => {
      return this.forwardPassDNN(feature, model.network, model.activationFunction);
    });
  }

  /**
   * Reinforcement Learning predictions
   */
  predictReinforcementLearning(model, features) {
    const qTable = new Map(model.qTable);
    
    return features.map(feature => {
      const state = this.discretizeState(feature, model.stateSize);
      const stateKey = state.join(',');
      
      if (qTable.has(stateKey)) {
        const qValues = qTable.get(stateKey);
        const bestAction = qValues.indexOf(Math.max(...qValues));
        
        // Convert action to prediction value
        const actionMap = { 0: 1, 1: -1, 2: 0 }; // buy: 1, sell: -1, hold: 0
        return actionMap[bestAction] || 0;
      }
      return 0; // Default to hold
    });
  }

  /**
   * Extract features from training data with advanced indicators
   */
  extractFeatures(trainingData) {
    return trainingData.map(sample => {
      const features = JSON.parse(sample.features);
      
      // If features is OHLCV data, generate advanced features
      if (features.ohlcv) {
        const advancedFeatures = advancedIndicators.generateMLFeatures(features.ohlcv);
        return advancedFeatures.length > 0 ? advancedFeatures : [features];
      }
      
      return Array.isArray(features) ? features : [features];
    });
  }

  /**
   * Extract targets from training data
   */
  extractTargets(trainingData) {
    return trainingData.map(sample => sample.target);
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(actual, predicted) {
    const n = actual.length;
    
    // Mean Absolute Error
    const mae = mean(actual.map((a, i) => Math.abs(a - predicted[i])));
    
    // Root Mean Square Error
    const rmse = Math.sqrt(mean(actual.map((a, i) => Math.pow(a - predicted[i], 2))));
    
    // R-squared
    const meanActual = mean(actual);
    const totalSumSquares = actual.reduce((sum, a) => sum + Math.pow(a - meanActual, 2), 0);
    const residualSumSquares = actual.reduce((sum, a, i) => sum + Math.pow(a - predicted[i], 2), 0);
    const r2 = 1 - (residualSumSquares / totalSumSquares);
    
    // Directional Accuracy
    let correctDirections = 0;
    for (let i = 1; i < actual.length; i++) {
      const actualDirection = actual[i] > actual[i-1];
      const predictedDirection = predicted[i] > predicted[i-1];
      if (actualDirection === predictedDirection) correctDirections++;
    }
    const directionalAccuracy = correctDirections / (actual.length - 1);
    
    // Classification metrics for direction prediction
    const classificationMetrics = this.calculateClassificationMetrics(actual, predicted);
    
    return {
      mae,
      rmse,
      r2,
      directionalAccuracy,
      precision: classificationMetrics.precision,
      recall: classificationMetrics.recall,
      f1Score: classificationMetrics.f1Score,
      sampleSize: n
    };
  }

  /**
   * Calculate classification metrics (precision, recall, f1-score)
   */
  calculateClassificationMetrics(actual, predicted) {
    // Convert to direction classes for classification metrics
    const actualClasses = [];
    const predictedClasses = [];
    
    for (let i = 1; i < actual.length; i++) {
      actualClasses.push(actual[i] > actual[i-1] ? 1 : 0); // 1 for up, 0 for down
      predictedClasses.push(predicted[i] > predicted[i-1] ? 1 : 0);
    }
    
    if (actualClasses.length === 0) {
      return { precision: 0, recall: 0, f1Score: 0 };
    }
    
    // Calculate confusion matrix elements
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let trueNegatives = 0;
    
    for (let i = 0; i < actualClasses.length; i++) {
      if (actualClasses[i] === 1 && predictedClasses[i] === 1) {
        truePositives++;
      } else if (actualClasses[i] === 0 && predictedClasses[i] === 1) {
        falsePositives++;
      } else if (actualClasses[i] === 1 && predictedClasses[i] === 0) {
        falseNegatives++;
      } else {
        trueNegatives++;
      }
    }
    
    // Calculate precision, recall, and f1-score
    const precision = (truePositives + falsePositives) > 0 ? 
      truePositives / (truePositives + falsePositives) : 0;
    const recall = (truePositives + falseNegatives) > 0 ? 
      truePositives / (truePositives + falseNegatives) : 0;
    const f1Score = (precision + recall) > 0 ? 
      2 * (precision * recall) / (precision + recall) : 0;
    
    return { precision, recall, f1Score };
  }

  /**
   * Utility functions
   */
  bootstrapSample(features, targets) {
    const sampleSize = features.length;
    const bootstrapFeatures = [];
    const bootstrapTargets = [];
    
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = Math.floor(Math.random() * sampleSize);
      bootstrapFeatures.push(features[randomIndex]);
      bootstrapTargets.push(targets[randomIndex]);
    }
    
    return { features: bootstrapFeatures, targets: bootstrapTargets };
  }

  buildDecisionTree(features, targets, maxDepth, depth = 0) {
    if (depth >= maxDepth || targets.length <= 1) {
      return { value: mean(targets), isLeaf: true };
    }
    
    // Simple decision tree implementation
    const bestSplit = this.findBestSplit(features, targets);
    if (!bestSplit) {
      return { value: mean(targets), isLeaf: true };
    }
    
    const leftIndices = features.map((f, i) => f[bestSplit.featureIndex] <= bestSplit.threshold ? i : -1).filter(i => i !== -1);
    const rightIndices = features.map((f, i) => f[bestSplit.featureIndex] > bestSplit.threshold ? i : -1).filter(i => i !== -1);
    
    return {
      featureIndex: bestSplit.featureIndex,
      threshold: bestSplit.threshold,
      left: this.buildDecisionTree(
        leftIndices.map(i => features[i]),
        leftIndices.map(i => targets[i]),
        maxDepth,
        depth + 1
      ),
      right: this.buildDecisionTree(
        rightIndices.map(i => features[i]),
        rightIndices.map(i => targets[i]),
        maxDepth,
        depth + 1
      )
    };
  }

  findBestSplit(features, targets) {
    let bestGain = -1;
    let bestSplit = null;
    
    for (let featureIndex = 0; featureIndex < features[0].length; featureIndex++) {
      const values = features.map(f => f[featureIndex]);
      const uniqueValues = [...new Set(values)].sort();
      
      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const gain = this.calculateInformationGain(features, targets, featureIndex, threshold);
        
        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = { featureIndex, threshold };
        }
      }
    }
    
    return bestSplit;
  }

  calculateInformationGain(features, targets, featureIndex, threshold) {
    const totalVariance = this.calculateVariance(targets);
    
    const leftIndices = features.map((f, i) => f[featureIndex] <= threshold ? i : -1).filter(i => i !== -1);
    const rightIndices = features.map((f, i) => f[featureIndex] > threshold ? i : -1).filter(i => i !== -1);
    
    if (leftIndices.length === 0 || rightIndices.length === 0) return 0;
    
    const leftTargets = leftIndices.map(i => targets[i]);
    const rightTargets = rightIndices.map(i => targets[i]);
    
    const leftVariance = this.calculateVariance(leftTargets);
    const rightVariance = this.calculateVariance(rightTargets);
    
    const weightedVariance = (leftTargets.length / targets.length) * leftVariance +
                            (rightTargets.length / targets.length) * rightVariance;
    
    return totalVariance - weightedVariance;
  }

  calculateVariance(values) {
    if (values.length <= 1) return 0;
    const m = mean(values);
    return mean(values.map(v => Math.pow(v - m, 2)));
  }

  predictDecisionTree(tree, feature) {
    if (tree.isLeaf) return tree.value;
    
    if (feature[tree.featureIndex] <= tree.threshold) {
      return this.predictDecisionTree(tree.left, feature);
    } else {
      return this.predictDecisionTree(tree.right, feature);
    }
  }

  convertToClasses(targets) {
    // Convert continuous targets to classes (up/down/neutral)
    return targets.map((target, i) => {
      if (i === 0) return 'neutral';
      const prev = targets[i - 1];
      const change = (target - prev) / prev;
      if (change > 0.01) return 'up';
      if (change < -0.01) return 'down';
      return 'neutral';
    });
  }

  classToValue(className) {
    const classMap = { up: 1, down: -1, neutral: 0 };
    return classMap[className] || 0;
  }

  calculateEMA(prices, alpha = 0.1) {
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = alpha * prices[i] + (1 - alpha) * ema;
    }
    return ema;
  }

  calculateIndicatorWeights(features, targets, indicators) {
    // Simple correlation-based weighting
    const weights = [];
    for (let i = 0; i < indicators.length; i++) {
      const indicatorValues = features.map(f => f[i]);
      const correlation = this.calculateCorrelation(indicatorValues, targets);
      weights.push(Math.abs(correlation));
    }
    return weights;
  }

  calculateCorrelation(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  serializeModel(model, algorithmType) {
    // Convert model to serializable format
    return JSON.stringify({
      algorithmType,
      modelData: model,
      timestamp: new Date().toISOString()
    });
  }

  deserializeModel(serializedModel) {
    return JSON.parse(serializedModel);
  }

  getModel(modelId) {
    return this.models.get(modelId);
  }

  deleteModel(modelId) {
    return this.models.delete(modelId);
  }

  listModels() {
    return Array.from(this.models.values());
  }

  /**
   * SVM helper methods
   */
  findSupportVectors(features, targets) {
    // Simplified support vector identification
    const supportVectors = [];
    const margin = this.calculateMargin(features, targets);
    
    features.forEach((feature, index) => {
      const distance = this.calculateDistance(feature, targets[index]);
      if (distance <= margin * 1.1) { // Points close to the margin
        supportVectors.push({
          feature,
          target: targets[index],
          weight: 1.0
        });
      }
    });
    
    return supportVectors.length > 0 ? supportVectors : [
      { feature: features[0], target: targets[0], weight: 1.0 }
    ];
  }

  calculateMargin(features, targets) {
    // Simple margin calculation
    const positiveFeatures = features.filter((_, i) => targets[i] > 0);
    const negativeFeatures = features.filter((_, i) => targets[i] <= 0);
    
    if (positiveFeatures.length === 0 || negativeFeatures.length === 0) {
      return 1.0;
    }
    
    const positiveMean = positiveFeatures.reduce((sum, f) => sum + mean(f), 0) / positiveFeatures.length;
    const negativeMean = negativeFeatures.reduce((sum, f) => sum + mean(f), 0) / negativeFeatures.length;
    
    return Math.abs(positiveMean - negativeMean) / 2;
  }

  calculateDistance(feature, target) {
    return Math.sqrt(feature.reduce((sum, f) => sum + f * f, 0));
  }

  linearKernelPredict(feature, supportVectors) {
    let prediction = 0;
    supportVectors.forEach(sv => {
      const dotProduct = feature.reduce((sum, f, i) => sum + f * (sv.feature[i] || 0), 0);
      prediction += sv.weight * sv.target * dotProduct;
    });
    return prediction;
  }

  rbfKernelPredict(feature, supportVectors, gamma = 0.1) {
    let prediction = 0;
    supportVectors.forEach(sv => {
      const distance = Math.sqrt(feature.reduce((sum, f, i) => 
        sum + Math.pow(f - (sv.feature[i] || 0), 2), 0));
      const rbf = Math.exp(-gamma * distance * distance);
      prediction += sv.weight * sv.target * rbf;
    });
    return prediction;
  }

  /**
   * LSTM helper methods
   */
  createSequences(features, targets, sequenceLength) {
    const sequences = [];
    for (let i = sequenceLength; i < features.length; i++) {
      const sequence = features.slice(i - sequenceLength, i);
      const target = targets[i];
      sequences.push({ sequence, target });
    }
    return sequences;
  }

  trainSequenceModel(sequences, hiddenUnits, epochs) {
    // Simplified sequence model training
    const inputSize = sequences[0].sequence[0].length;
    const weights = {
      input: this.initializeWeights(inputSize, hiddenUnits),
      hidden: this.initializeWeights(hiddenUnits, hiddenUnits),
      output: this.initializeWeights(hiddenUnits, 1)
    };
    
    // Simple training loop (placeholder for actual LSTM training)
    for (let epoch = 0; epoch < Math.min(epochs, 10); epoch++) {
      sequences.forEach(seq => {
        // Simplified weight update
        this.updateWeights(weights, seq);
      });
    }
    
    return weights;
  }

  initializeWeights(inputSize, outputSize) {
    const weights = [];
    for (let i = 0; i < inputSize; i++) {
      const row = [];
      for (let j = 0; j < outputSize; j++) {
        row.push((Math.random() - 0.5) * 0.1);
      }
      weights.push(row);
    }
    return weights;
  }

  updateWeights(weights, sequence) {
    // Simplified weight update (placeholder for actual backpropagation)
    const learningRate = 0.001;
    const prediction = this.predictSequence(sequence.sequence, weights);
    const error = sequence.target - prediction;
    
    // Simple weight adjustment
    weights.output.forEach(row => {
      row.forEach((_, j) => {
        row[j] += learningRate * error * 0.01;
      });
    });
  }

  predictSequence(sequence, weights) {
    // Simplified sequence prediction
    let output = 0;
    sequence.forEach(step => {
      const hiddenState = this.forwardPass(step, weights.input);
      output += this.forwardPass(hiddenState, weights.output)[0] || 0;
    });
    return output / sequence.length;
  }

  forwardPass(input, weights) {
    const output = [];
    for (let i = 0; i < weights[0].length; i++) {
      let sum = 0;
      for (let j = 0; j < input.length && j < weights.length; j++) {
        sum += input[j] * weights[j][i];
      }
      output.push(Math.tanh(sum)); // Activation function
    }
    return output;
  }

  /**
   * Deep Neural Network helper methods
   */
  initializeNeuralNetwork(inputSize, hiddenLayers, outputSize) {
    const layers = [inputSize, ...hiddenLayers, outputSize];
    const network = [];
    
    for (let i = 1; i < layers.length; i++) {
      const layer = {
        weights: this.initializeWeights(layers[i - 1], layers[i]),
        biases: new Array(layers[i]).fill(0).map(() => (Math.random() - 0.5) * 0.1)
      };
      network.push(layer);
    }
    
    return network;
  }

  forwardPassDNN(input, network, activationFunction = 'relu') {
    let activation = [...input];
    
    for (let i = 0; i < network.length; i++) {
      const layer = network[i];
      const newActivation = [];
      
      for (let j = 0; j < layer.weights[0].length; j++) {
        let sum = layer.biases[j];
        for (let k = 0; k < activation.length && k < layer.weights.length; k++) {
          sum += activation[k] * layer.weights[k][j];
        }
        
        // Apply activation function
        if (activationFunction === 'relu' && i < network.length - 1) {
          newActivation.push(Math.max(0, sum));
        } else if (activationFunction === 'tanh' && i < network.length - 1) {
          newActivation.push(Math.tanh(sum));
        } else {
          newActivation.push(sum); // Linear for output layer
        }
      }
      
      activation = newActivation;
    }
    
    return activation[0] || 0;
  }

  backwardPassDNN(input, target, prediction, network, learningRate) {
    // Simplified backpropagation - just adjust output layer
    const outputLayer = network[network.length - 1];
    const error = target - prediction;
    
    // Update output layer weights and biases
    for (let i = 0; i < outputLayer.weights.length; i++) {
      for (let j = 0; j < outputLayer.weights[i].length; j++) {
        outputLayer.weights[i][j] += learningRate * error * (input[i] || 0);
      }
    }
    
    for (let j = 0; j < outputLayer.biases.length; j++) {
      outputLayer.biases[j] += learningRate * error;
    }
  }

  /**
   * Reinforcement Learning helper methods
   */
  discretizeState(features, stateSize) {
    // Discretize continuous features into bins
    const discretized = [];
    const numBins = 5; // 5 bins per feature
    
    for (let i = 0; i < Math.min(features.length, stateSize); i++) {
      const feature = features[i];
      const bin = Math.max(0, Math.min(numBins - 1, Math.floor((feature + 1) * numBins / 2)));
      discretized.push(bin);
    }
    
    return discretized;
  }

  /**
   * Real-time prediction methods
   */
  async startRealtimePredictions(modelId, symbols, callback) {
    logger.info(`Starting real-time predictions for model ${modelId}`, { symbols });
    
    const model = this.getModel(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    
    const predictionInterval = setInterval(async () => {
      try {
        const predictions = [];
        
        for (const symbol of symbols) {
          // In real implementation, this would fetch live market data
          const liveFeatures = await this.generateLiveFeatures(symbol);
          
          if (liveFeatures && liveFeatures.length > 0) {
            const prediction = this.predict(
              this.deserializeModel(model.model).modelData,
              [liveFeatures],
              model.algorithmType
            )[0];
            
            predictions.push({
              symbol,
              prediction,
              confidence: Math.min(Math.abs(prediction), 1),
              timestamp: new Date().toISOString()
            });
          }
        }
        
        if (predictions.length > 0) {
          this.realtimePredictions.set(modelId, predictions);
          callback(predictions);
        }
      } catch (error) {
        logger.error('Error in real-time prediction:', error);
      }
    }, 30000); // 30 second intervals
    
    return predictionInterval;
  }

  stopRealtimePredictions(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
      logger.info('Stopped real-time predictions');
    }
  }

  async generateLiveFeatures(symbol) {
    // Mock implementation - in reality would fetch live market data
    const mockOHLCV = {
      highs: Array.from({ length: 50 }, () => 100 + Math.random() * 20),
      lows: Array.from({ length: 50 }, () => 90 + Math.random() * 20),
      opens: Array.from({ length: 50 }, () => 95 + Math.random() * 20),
      closes: Array.from({ length: 50 }, () => 95 + Math.random() * 20),
      volumes: Array.from({ length: 50 }, () => 1000000 + Math.random() * 500000)
    };
    
    return advancedIndicators.generateMLFeatures(mockOHLCV);
  }

  /**
   * Model performance tracking and drift detection
   */
  trackModelPerformance(modelId, actualValues, predictedValues) {
    const performance = this.calculatePerformanceMetrics(actualValues, predictedValues);
    
    if (!this.modelPerformanceTracking.has(modelId)) {
      this.modelPerformanceTracking.set(modelId, []);
    }
    
    const history = this.modelPerformanceTracking.get(modelId);
    history.push({
      timestamp: new Date().toISOString(),
      ...performance
    });
    
    // Keep only last 100 performance records
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    // Check for model drift
    const isDrifting = this.detectModelDrift(history);
    if (isDrifting) {
      logger.warn(`Model drift detected for ${modelId}`, { 
        recentPerformance: performance,
        driftIndicators: this.getDriftIndicators(history)
      });
    }
    
    return { performance, isDrifting };
  }

  detectModelDrift(performanceHistory) {
    if (performanceHistory.length < 20) return false;
    
    const recent = performanceHistory.slice(-10);
    const older = performanceHistory.slice(-20, -10);
    
    const recentAvgAccuracy = mean(recent.map(p => p.directionalAccuracy));
    const olderAvgAccuracy = mean(older.map(p => p.directionalAccuracy));
    
    // Drift detected if recent accuracy dropped by more than 10%
    return (olderAvgAccuracy - recentAvgAccuracy) > 0.1;
  }

  getDriftIndicators(performanceHistory) {
    const recent = performanceHistory.slice(-10);
    return {
      avgAccuracy: mean(recent.map(p => p.directionalAccuracy)),
      avgMAE: mean(recent.map(p => p.mae)),
      trend: recent.length > 5 ? 
        (recent[recent.length - 1].directionalAccuracy - recent[0].directionalAccuracy) : 0
    };
  }

  getModelPerformanceHistory(modelId) {
    return this.modelPerformanceTracking.get(modelId) || [];
  }
}

module.exports = new MLService();