const { Matrix } = require('ml-matrix');
const MLR = require('ml-regression');
const { mean, standardDeviation, median } = require('simple-statistics');
const Bayes = require('bayes');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

class MLService {
  constructor() {
    this.models = new Map();
    this.algorithms = {
      LINEAR_REGRESSION: 'linear_regression',
      POLYNOMIAL_REGRESSION: 'polynomial_regression',
      RANDOM_FOREST: 'random_forest',
      SVM: 'svm',
      NAIVE_BAYES: 'naive_bayes',
      LSTM: 'lstm',
      MOVING_AVERAGE: 'moving_average',
      TECHNICAL_INDICATORS: 'technical_indicators'
    };
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
        case this.algorithms.NAIVE_BAYES:
          model = this.trainNaiveBayes(features, targets, parameters);
          break;
        case this.algorithms.MOVING_AVERAGE:
          model = this.trainMovingAverage(features, targets, parameters);
          break;
        case this.algorithms.TECHNICAL_INDICATORS:
          model = this.trainTechnicalIndicators(features, targets, parameters);
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
      case this.algorithms.NAIVE_BAYES:
        return this.predictNaiveBayes(model, features);
      case this.algorithms.MOVING_AVERAGE:
        return this.predictMovingAverage(model, features);
      case this.algorithms.TECHNICAL_INDICATORS:
        return this.predictTechnicalIndicators(model, features);
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
   * Extract features from training data
   */
  extractFeatures(trainingData) {
    return trainingData.map(sample => {
      const features = JSON.parse(sample.features);
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
    
    return {
      mae,
      rmse,
      r2,
      directionalAccuracy,
      sampleSize: n
    };
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
}

module.exports = new MLService();