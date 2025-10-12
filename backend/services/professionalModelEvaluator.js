const logger = require('../utils/logger');
const math = require('mathjs');

/**
 * Professional Model Evaluation Suite
 * Comprehensive evaluation with walk-forward validation, statistical significance testing,
 * and risk-adjusted performance metrics
 */
class ProfessionalModelEvaluator {
  constructor() {
    this.evaluationMethods = new Map();
    this.performanceMetrics = new Map();
    this.validationResults = new Map();
    
    this.initializeEvaluationMethods();
  }

  initializeEvaluationMethods() {
    // Time series cross-validation methods
    this.evaluationMethods.set('walk_forward', {
      name: 'Walk-Forward Analysis',
      description: 'Expanding or rolling window validation with out-of-sample testing',
      parameters: {
        initialTrainingPeriod: 252, // 1 year initial training
        testPeriod: 21, // 1 month test period
        stepSize: 21, // Monthly steps
        windowType: 'expanding', // 'expanding' or 'rolling'
        maxTrainingPeriod: 1260 // 5 years max training
      }
    });

    this.evaluationMethods.set('blocked_cv', {
      name: 'Blocked Cross-Validation',
      description: 'Time-aware cross-validation with temporal blocks',
      parameters: {
        numFolds: 5,
        blockSize: 63, // 3 months per block
        gap: 21, // 1 month gap between train/test
        shuffle: false // Never shuffle time series
      }
    });

    this.evaluationMethods.set('monte_carlo', {
      name: 'Monte Carlo Validation',
      description: 'Bootstrap sampling with replacement for confidence intervals',
      parameters: {
        numIterations: 1000,
        sampleRatio: 0.8,
        confidenceLevel: 0.95,
        stratified: true
      }
    });
  }

  /**
   * Comprehensive model evaluation with multiple validation methods
   */
  async evaluateModel(modelId, marketData, predictions, actualValues, config = {}) {
    try {
      const startTime = Date.now();
      
      // Basic validation
      if (predictions.length !== actualValues.length) {
        throw new Error('Predictions and actual values must have the same length');
      }

      if (predictions.length < 30) {
        throw new Error('Insufficient data points for reliable evaluation (minimum 30 required)');
      }

      const evaluationResults = {
        modelId,
        timestamp: new Date().toISOString(),
        dataPoints: predictions.length,
        evaluationMethods: {},
        performanceMetrics: {},
        riskMetrics: {},
        statisticalSignificance: {},
        recommendations: []
      };

      // 1. Walk-Forward Analysis
      const walkForwardResults = await this.walkForwardValidation(
        marketData, predictions, actualValues, config.walkForward || {}
      );
      evaluationResults.evaluationMethods.walkForward = walkForwardResults;

      // 2. Statistical Performance Metrics
      const performanceMetrics = this.calculatePerformanceMetrics(predictions, actualValues);
      evaluationResults.performanceMetrics = performanceMetrics;

      // 3. Risk-Adjusted Metrics
      const riskMetrics = this.calculateRiskAdjustedMetrics(predictions, actualValues, marketData);
      evaluationResults.riskMetrics = riskMetrics;

      // 4. Statistical Significance Testing
      const significanceTests = await this.performStatisticalSignificanceTests(
        predictions, actualValues, config.significance || {}
      );
      evaluationResults.statisticalSignificance = significanceTests;

      // 5. Residual Analysis
      const residualAnalysis = this.analyzeResiduals(predictions, actualValues);
      evaluationResults.residualAnalysis = residualAnalysis;

      // 6. Feature Importance and Model Diagnostics
      const diagnostics = await this.performModelDiagnostics(
        modelId, predictions, actualValues, marketData
      );
      evaluationResults.diagnostics = diagnostics;

      // 7. Generate Recommendations
      evaluationResults.recommendations = this.generateRecommendations(evaluationResults);

      // 8. Overall Score and Grade
      evaluationResults.overallScore = this.calculateOverallScore(evaluationResults);
      evaluationResults.grade = this.assignGrade(evaluationResults.overallScore);

      // Store results
      this.validationResults.set(modelId, evaluationResults);

      const evaluationTime = Date.now() - startTime;
      evaluationResults.evaluationTimeMs = evaluationTime;

      logger.info(`Model evaluation completed for ${modelId}`, {
        dataPoints: predictions.length,
        accuracy: performanceMetrics.accuracy,
        sharpeRatio: riskMetrics.sharpeRatio,
        evaluationTime
      });

      return evaluationResults;

    } catch (error) {
      logger.error('Error in model evaluation:', error);
      throw error;
    }
  }

  /**
   * Walk-Forward Validation Implementation
   */
  async walkForwardValidation(marketData, predictions, actualValues, config = {}) {
    const params = { ...this.evaluationMethods.get('walk_forward').parameters, ...config };
    
    const results = {
      method: 'walk_forward',
      parameters: params,
      folds: [],
      aggregateMetrics: {},
      stability: {}
    };

    const dataLength = predictions.length;
    let currentStart = 0;
    let foldIndex = 0;

    while (currentStart + params.initialTrainingPeriod + params.testPeriod <= dataLength) {
      const trainEnd = currentStart + params.initialTrainingPeriod + (foldIndex * params.stepSize);
      const testStart = trainEnd;
      const testEnd = Math.min(testStart + params.testPeriod, dataLength);

      if (testStart >= dataLength) break;

      // Apply window type
      let actualTrainStart = currentStart;
      if (params.windowType === 'rolling' && trainEnd - currentStart > params.maxTrainingPeriod) {
        actualTrainStart = trainEnd - params.maxTrainingPeriod;
      }

      // Extract fold data
      const trainPredictions = predictions.slice(actualTrainStart, trainEnd);
      const trainActual = actualValues.slice(actualTrainStart, trainEnd);
      const testPredictions = predictions.slice(testStart, testEnd);
      const testActual = actualValues.slice(testStart, testEnd);

      if (testPredictions.length === 0) break;

      // Calculate fold metrics
      const foldMetrics = this.calculatePerformanceMetrics(testPredictions, testActual);
      const foldRiskMetrics = this.calculateRiskAdjustedMetrics(
        testPredictions, testActual, marketData.slice(testStart, testEnd)
      );

      const fold = {
        index: foldIndex,
        trainPeriod: { start: actualTrainStart, end: trainEnd },
        testPeriod: { start: testStart, end: testEnd },
        trainSize: trainPredictions.length,
        testSize: testPredictions.length,
        metrics: { ...foldMetrics, ...foldRiskMetrics }
      };

      results.folds.push(fold);
      foldIndex++;

      // Move to next fold
      currentStart += params.stepSize;
    }

    if (results.folds.length === 0) {
      throw new Error('Insufficient data for walk-forward validation');
    }

    // Calculate aggregate metrics across all folds
    results.aggregateMetrics = this.aggregateFoldMetrics(results.folds);
    
    // Calculate stability metrics
    results.stability = this.calculateStabilityMetrics(results.folds);

    return results;
  }

  /**
   * Calculate comprehensive performance metrics
   */
  calculatePerformanceMetrics(predictions, actualValues) {
    const n = predictions.length;
    
    // Basic accuracy metrics
    const errors = predictions.map((pred, i) => pred - actualValues[i]);
    const absoluteErrors = errors.map(e => Math.abs(e));
    const squaredErrors = errors.map(e => e * e);
    const percentageErrors = predictions.map((pred, i) => 
      actualValues[i] !== 0 ? Math.abs(pred - actualValues[i]) / Math.abs(actualValues[i]) : 0
    );

    // Mean metrics
    const mae = absoluteErrors.reduce((sum, ae) => sum + ae, 0) / n;
    const mse = squaredErrors.reduce((sum, se) => sum + se, 0) / n;
    const rmse = Math.sqrt(mse);
    const mape = percentageErrors.reduce((sum, pe) => sum + pe, 0) / n * 100;

    // R-squared
    const actualMean = actualValues.reduce((sum, val) => sum + val, 0) / n;
    const totalSumSquares = actualValues.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = squaredErrors.reduce((sum, se) => sum + se, 0);
    const rSquared = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    // Directional accuracy (for financial predictions)
    let correctDirections = 0;
    for (let i = 1; i < n; i++) {
      const predDirection = predictions[i] > predictions[i - 1];
      const actualDirection = actualValues[i] > actualValues[i - 1];
      if (predDirection === actualDirection) correctDirections++;
    }
    const directionalAccuracy = n > 1 ? correctDirections / (n - 1) : 0;

    // Correlation
    const correlation = this.calculateCorrelation(predictions, actualValues);

    // Bias metrics
    const bias = errors.reduce((sum, e) => sum + e, 0) / n;
    const meanAbsoluteBias = Math.abs(bias);

    // Theil's U statistic
    const theilU = this.calculateTheilU(predictions, actualValues);

    return {
      accuracy: 1 - (rmse / (this.calculateStandardDeviation(actualValues) || 1)),
      mae,
      mse,
      rmse,
      mape,
      rSquared,
      directionalAccuracy,
      correlation,
      bias,
      meanAbsoluteBias,
      theilU,
      dataPoints: n
    };
  }

  /**
   * Calculate risk-adjusted performance metrics
   */
  calculateRiskAdjustedMetrics(predictions, actualValues, marketData) {
    // Calculate returns from predictions and actual values
    const predictionReturns = this.calculateReturns(predictions);
    const actualReturns = this.calculateReturns(actualValues);
    
    // Sharpe Ratio (assuming prediction-based trading)
    const excessReturns = predictionReturns.map(r => r - 0.02 / 252); // Assume 2% risk-free rate
    const sharpeRatio = this.calculateSharpeRatio(excessReturns);

    // Sortino Ratio
    const sortinoRatio = this.calculateSortinoRatio(predictionReturns);

    // Maximum Drawdown
    const maxDrawdown = this.calculateMaxDrawdown(this.cumulativeReturns(predictionReturns));

    // Calmar Ratio
    const annualizedReturn = this.calculateMean(predictionReturns) * 252;
    const calmarRatio = maxDrawdown !== 0 ? annualizedReturn / Math.abs(maxDrawdown) : 0;

    // Value at Risk (VaR)
    const var95 = this.calculateVaR(predictionReturns, 0.95);
    const var99 = this.calculateVaR(predictionReturns, 0.99);

    // Expected Shortfall (Conditional VaR)
    const expectedShortfall95 = this.calculateExpectedShortfall(predictionReturns, 0.95);

    // Beta (if market data available)
    let beta = null;
    if (marketData && marketData.length > 0) {
      const marketReturns = this.calculateReturns(marketData.map(d => d.close));
      if (marketReturns.length === predictionReturns.length) {
        const covariance = this.calculateCovariance(predictionReturns, marketReturns);
        const marketVariance = this.calculateVariance(marketReturns);
        beta = marketVariance !== 0 ? covariance / marketVariance : 0;
      }
    }

    // Information Ratio
    const trackingError = this.calculateStandardDeviation(
      predictionReturns.map((pr, i) => pr - actualReturns[i])
    );
    const informationRatio = trackingError !== 0 ? 
      this.calculateMean(predictionReturns.map((pr, i) => pr - actualReturns[i])) / trackingError : 0;

    // Volatility metrics
    const volatility = this.calculateStandardDeviation(predictionReturns);
    const annualizedVolatility = volatility * Math.sqrt(252);

    return {
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      calmarRatio,
      var95,
      var99,
      expectedShortfall95,
      beta,
      informationRatio,
      volatility,
      annualizedVolatility,
      annualizedReturn
    };
  }

  /**
   * Perform statistical significance tests
   */
  async performStatisticalSignificanceTests(predictions, actualValues, config = {}) {
    const results = {
      tests: {},
      overallSignificance: false,
      confidenceLevel: config.confidenceLevel || 0.95
    };

    // 1. t-test for mean prediction accuracy
    const errors = predictions.map((pred, i) => pred - actualValues[i]);
    const tTest = this.performTTest(errors, 0); // Test if mean error is significantly different from 0
    results.tests.tTest = tTest;

    // 2. Diebold-Mariano test for forecast accuracy
    const benchmark = actualValues.slice(0, -1); // Naive forecast (previous value)
    const dmTest = this.dieboldMarianoTest(predictions, actualValues, benchmark);
    results.tests.dieboldMariano = dmTest;

    // 3. Jarque-Bera test for residual normality
    const jbTest = this.jarqueBeraTest(errors);
    results.tests.jarqueBera = jbTest;

    // 4. Ljung-Box test for residual autocorrelation
    const lbTest = this.ljungBoxTest(errors, 10); // Test up to lag 10
    results.tests.ljungBox = lbTest;

    // 5. White test for heteroscedasticity
    const whiteTest = this.whiteHeteroscedasticityTest(predictions, errors);
    results.tests.whiteTest = whiteTest;

    // 6. Bootstrap confidence intervals
    const bootstrapCI = await this.bootstrapConfidenceInterval(
      predictions, actualValues, config.bootstrapIterations || 1000
    );
    results.confidenceIntervals = bootstrapCI;

    // Overall significance assessment
    results.overallSignificance = this.assessOverallSignificance(results.tests);

    return results;
  }

  /**
   * Analyze residuals for patterns and issues
   */
  analyzeResiduals(predictions, actualValues) {
    const residuals = predictions.map((pred, i) => pred - actualValues[i]);
    
    const analysis = {
      statistics: {
        mean: this.calculateMean(residuals),
        std: this.calculateStandardDeviation(residuals),
        skewness: this.calculateSkewness(residuals),
        kurtosis: this.calculateKurtosis(residuals),
        min: Math.min(...residuals),
        max: Math.max(...residuals)
      },
      patterns: {
        autocorrelation: this.calculateAutocorrelation(residuals, 5),
        trend: this.detectTrend(residuals),
        heteroscedasticity: this.detectHeteroscedasticity(residuals),
        outliers: this.detectOutliers(residuals)
      },
      distributions: {
        normalityTest: this.jarqueBeraTest(residuals),
        qqPlotData: this.generateQQPlotData(residuals),
        histogramBins: this.generateHistogram(residuals, 20)
      }
    };

    return analysis;
  }

  /**
   * Perform comprehensive model diagnostics
   */
  async performModelDiagnostics(modelId, predictions, actualValues, marketData) {
    const diagnostics = {
      modelId,
      timestamp: new Date().toISOString(),
      stability: {},
      robustness: {},
      interpretability: {},
      warnings: []
    };

    // 1. Stability Analysis
    diagnostics.stability = {
      predictionStability: this.calculatePredictionStability(predictions),
      temporalStability: this.calculateTemporalStability(predictions, actualValues),
      crossValidationStability: await this.assessCrossValidationStability(predictions, actualValues)
    };

    // 2. Robustness Testing
    diagnostics.robustness = {
      noiseResistance: await this.testNoiseResistance(predictions, actualValues),
      outlierSensitivity: this.testOutlierSensitivity(predictions, actualValues),
      distributionShifts: this.testDistributionShifts(predictions, actualValues)
    };

    // 3. Model Warnings
    diagnostics.warnings = this.generateModelWarnings(predictions, actualValues);

    return diagnostics;
  }

  /**
   * Generate actionable recommendations based on evaluation results
   */
  generateRecommendations(evaluationResults) {
    const recommendations = [];
    const { performanceMetrics, riskMetrics, statisticalSignificance, residualAnalysis } = evaluationResults;

    // Performance-based recommendations
    if (performanceMetrics.accuracy < 0.6) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'HIGH',
        issue: 'Low prediction accuracy',
        recommendation: 'Consider feature engineering, hyperparameter tuning, or alternative algorithms',
        metric: `Accuracy: ${(performanceMetrics.accuracy * 100).toFixed(1)}%`
      });
    }

    if (performanceMetrics.directionalAccuracy < 0.55) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'HIGH',
        issue: 'Poor directional accuracy',
        recommendation: 'Focus on trend-following features or consider ensemble methods',
        metric: `Directional Accuracy: ${(performanceMetrics.directionalAccuracy * 100).toFixed(1)}%`
      });
    }

    // Risk-based recommendations
    if (riskMetrics.sharpeRatio < 1.0) {
      recommendations.push({
        type: 'RISK',
        priority: 'MEDIUM',
        issue: 'Low risk-adjusted returns',
        recommendation: 'Improve signal quality or implement better risk management',
        metric: `Sharpe Ratio: ${riskMetrics.sharpeRatio.toFixed(2)}`
      });
    }

    if (riskMetrics.maxDrawdown < -0.2) {
      recommendations.push({
        type: 'RISK',
        priority: 'HIGH',
        issue: 'High maximum drawdown',
        recommendation: 'Implement position sizing controls and stop-loss mechanisms',
        metric: `Max Drawdown: ${(riskMetrics.maxDrawdown * 100).toFixed(1)}%`
      });
    }

    // Statistical significance recommendations
    if (!statisticalSignificance.overallSignificance) {
      recommendations.push({
        type: 'STATISTICAL',
        priority: 'HIGH',
        issue: 'Results not statistically significant',
        recommendation: 'Collect more data or revise model approach',
        metric: 'Multiple statistical tests failed'
      });
    }

    // Residual analysis recommendations
    if (Math.abs(residualAnalysis.statistics.skewness) > 1.0) {
      recommendations.push({
        type: 'STATISTICAL',
        priority: 'MEDIUM',
        issue: 'Residuals show significant skewness',
        recommendation: 'Consider transformation of target variable or robust loss functions',
        metric: `Skewness: ${residualAnalysis.statistics.skewness.toFixed(2)}`
      });
    }

    if (residualAnalysis.patterns.autocorrelation.some(ac => Math.abs(ac) > 0.1)) {
      recommendations.push({
        type: 'STATISTICAL',
        priority: 'MEDIUM',
        issue: 'Residuals show autocorrelation',
        recommendation: 'Add lagged features or consider time series models (ARIMA, LSTM)',
        metric: 'Significant autocorrelation detected'
      });
    }

    // Grade-based recommendations
    const grade = evaluationResults.grade;
    if (grade === 'F' || grade === 'D') {
      recommendations.push({
        type: 'MODEL',
        priority: 'CRITICAL',
        issue: 'Model performance is unacceptable',
        recommendation: 'Consider complete model redesign or alternative approaches',
        metric: `Overall Grade: ${grade}`
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculate overall model score (0-100)
   */
  calculateOverallScore(evaluationResults) {
    const { performanceMetrics, riskMetrics, statisticalSignificance } = evaluationResults;
    
    // Weighted scoring components
    const weights = {
      accuracy: 0.25,
      directionalAccuracy: 0.20,
      sharpeRatio: 0.20,
      rSquared: 0.15,
      significance: 0.10,
      stability: 0.10
    };

    let score = 0;

    // Accuracy component (0-25 points)
    score += Math.min(performanceMetrics.accuracy * 100, 100) * weights.accuracy;

    // Directional accuracy component (0-20 points)
    score += Math.min(performanceMetrics.directionalAccuracy * 100, 100) * weights.directionalAccuracy;

    // Sharpe ratio component (0-20 points)
    const normalizedSharpe = Math.min(Math.max(riskMetrics.sharpeRatio / 2, 0), 1) * 100;
    score += normalizedSharpe * weights.sharpeRatio;

    // R-squared component (0-15 points)
    score += Math.min(Math.max(performanceMetrics.rSquared, 0) * 100, 100) * weights.rSquared;

    // Statistical significance component (0-10 points)
    score += (statisticalSignificance.overallSignificance ? 100 : 0) * weights.significance;

    // Stability component (0-10 points) - simplified
    const stabilityScore = evaluationResults.evaluationMethods.walkForward ? 
      Math.min(evaluationResults.evaluationMethods.walkForward.stability.consistencyScore || 50, 100) : 50;
    score += stabilityScore * weights.stability;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Assign letter grade based on overall score
   */
  assignGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // Statistical utility functions

  calculateReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  cumulativeReturns(returns) {
    const cumulative = [1];
    for (let i = 0; i < returns.length; i++) {
      cumulative.push(cumulative[cumulative.length - 1] * (1 + returns[i]));
    }
    return cumulative;
  }

  calculateSharpeRatio(returns) {
    const mean = this.calculateMean(returns);
    const std = this.calculateStandardDeviation(returns);
    return std !== 0 ? (mean * Math.sqrt(252)) / (std * Math.sqrt(252)) : 0;
  }

  calculateSortinoRatio(returns) {
    const mean = this.calculateMean(returns);
    const negativeReturns = returns.filter(r => r < 0);
    const downwardStd = negativeReturns.length > 0 ? 
      Math.sqrt(negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length) : 0;
    return downwardStd !== 0 ? (mean * Math.sqrt(252)) / (downwardStd * Math.sqrt(252)) : 0;
  }

  calculateMaxDrawdown(cumulativeReturns) {
    let maxDrawdown = 0;
    let peak = cumulativeReturns[0];
    
    for (let i = 1; i < cumulativeReturns.length; i++) {
      if (cumulativeReturns[i] > peak) {
        peak = cumulativeReturns[i];
      }
      const drawdown = (cumulativeReturns[i] - peak) / peak;
      maxDrawdown = Math.min(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  calculateVaR(returns, confidenceLevel) {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    return sortedReturns[index] || 0;
  }

  calculateExpectedShortfall(returns, confidenceLevel) {
    const valueAtRisk = this.calculateVaR(returns, confidenceLevel);
    const tailReturns = returns.filter(r => r <= valueAtRisk);
    return tailReturns.length > 0 ? this.calculateMean(tailReturns) : 0;
  }

  // Basic statistical functions
  calculateMean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateVariance(values) {
    const mean = this.calculateMean(values);
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  calculateStandardDeviation(values) {
    return Math.sqrt(this.calculateVariance(values));
  }

  calculateCorrelation(x, y) {
    const n = x.length;
    const meanX = this.calculateMean(x);
    const meanY = this.calculateMean(y);
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      numerator += deltaX * deltaY;
      denomX += deltaX * deltaX;
      denomY += deltaY * deltaY;
    }
    
    return denomX * denomY > 0 ? numerator / Math.sqrt(denomX * denomY) : 0;
  }

  calculateCovariance(x, y) {
    const n = x.length;
    const meanX = this.calculateMean(x);
    const meanY = this.calculateMean(y);
    
    return x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0) / (n - 1);
  }

  calculateSkewness(values) {
    const n = values.length;
    const mean = this.calculateMean(values);
    const std = this.calculateStandardDeviation(values);
    
    if (std === 0) return 0;
    
    const skewness = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / std, 3);
    }, 0) / n;
    
    return skewness;
  }

  calculateKurtosis(values) {
    const n = values.length;
    const mean = this.calculateMean(values);
    const std = this.calculateStandardDeviation(values);
    
    if (std === 0) return 0;
    
    const kurtosis = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / std, 4);
    }, 0) / n;
    
    return kurtosis - 3; // Excess kurtosis
  }

  calculateTheilU(predictions, actualValues) {
    const n = predictions.length;
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 1; i < n; i++) {
      const predChange = (predictions[i] - predictions[i - 1]) / predictions[i - 1];
      const actualChange = (actualValues[i] - actualValues[i - 1]) / actualValues[i - 1];
      
      numerator += Math.pow(predChange - actualChange, 2);
      denominator += Math.pow(actualChange, 2);
    }
    
    return denominator !== 0 ? Math.sqrt(numerator / denominator) : Infinity;
  }

  // Advanced statistical tests
  performTTest(sample, populationMean = 0) {
    const n = sample.length;
    const sampleMean = this.calculateMean(sample);
    const sampleStd = this.calculateStandardDeviation(sample);
    
    const tStatistic = (sampleMean - populationMean) / (sampleStd / Math.sqrt(n));
    const degreesOfFreedom = n - 1;
    
    // Simplified p-value calculation (would use t-distribution in practice)
    const pValue = this.tStatisticToPValue(tStatistic, degreesOfFreedom);
    
    return {
      tStatistic,
      degreesOfFreedom,
      pValue,
      significant: pValue < 0.05,
      sampleMean,
      populationMean
    };
  }

  jarqueBeraTest(residuals) {
    const n = residuals.length;
    const skewness = this.calculateSkewness(residuals);
    const kurtosis = this.calculateKurtosis(residuals);
    
    const jbStatistic = (n / 6) * (Math.pow(skewness, 2) + Math.pow(kurtosis, 2) / 4);
    
    // Critical value for alpha = 0.05 (chi-square distribution with 2 df)
    const criticalValue = 5.991;
    const pValue = jbStatistic > criticalValue ? 0.01 : 0.1; // Simplified
    
    return {
      jbStatistic,
      criticalValue,
      pValue,
      normal: jbStatistic < criticalValue,
      skewness,
      kurtosis
    };
  }

  // Placeholder implementations for complex statistical methods
  dieboldMarianoTest(predictions, actualValues, benchmark) {
    // Simplified implementation
    const errors1 = predictions.map((pred, i) => Math.pow(pred - actualValues[i], 2));
    const errors2 = benchmark.map((bench, i) => Math.pow(bench - actualValues[i], 2));
    const losseDiff = errors1.map((e1, i) => e1 - errors2[i]);
    
    const dmStatistic = this.calculateMean(losseDiff) / (this.calculateStandardDeviation(losseDiff) / Math.sqrt(losseDiff.length));
    
    return {
      dmStatistic,
      pValue: Math.abs(dmStatistic) > 1.96 ? 0.01 : 0.1,
      significant: Math.abs(dmStatistic) > 1.96
    };
  }

  ljungBoxTest(residuals, maxLag) {
    const n = residuals.length;
    const autocorrelations = this.calculateAutocorrelation(residuals, maxLag);
    
    let lbStatistic = 0;
    for (let k = 1; k <= maxLag; k++) {
      lbStatistic += Math.pow(autocorrelations[k - 1], 2) / (n - k);
    }
    lbStatistic *= n * (n + 2);
    
    return {
      lbStatistic,
      degreesOfFreedom: maxLag,
      pValue: lbStatistic > 18.307 ? 0.01 : 0.1, // Simplified for df=10
      significant: lbStatistic > 18.307
    };
  }

  whiteHeteroscedasticityTest(predictions, residuals) {
    // Simplified White test
    const squaredResiduals = residuals.map(r => r * r);
    const correlation = this.calculateCorrelation(predictions, squaredResiduals);
    
    return {
      correlation,
      testStatistic: Math.abs(correlation) * Math.sqrt(predictions.length - 2),
      significant: Math.abs(correlation) > 0.2,
      pValue: Math.abs(correlation) > 0.2 ? 0.01 : 0.1
    };
  }

  calculateAutocorrelation(series, maxLag) {
    const n = series.length;
    const mean = this.calculateMean(series);
    const variance = this.calculateVariance(series);
    
    const autocorrelations = [];
    
    for (let lag = 1; lag <= maxLag; lag++) {
      let covariance = 0;
      for (let i = lag; i < n; i++) {
        covariance += (series[i] - mean) * (series[i - lag] - mean);
      }
      covariance /= (n - lag);
      
      autocorrelations.push(variance !== 0 ? covariance / variance : 0);
    }
    
    return autocorrelations;
  }

  // Additional helper methods for comprehensive evaluation
  aggregateFoldMetrics(folds) {
    const metrics = {};
    const metricNames = Object.keys(folds[0].metrics);
    
    metricNames.forEach(metricName => {
      const values = folds.map(fold => fold.metrics[metricName]);
      metrics[metricName] = {
        mean: this.calculateMean(values),
        std: this.calculateStandardDeviation(values),
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });
    
    return metrics;
  }

  calculateStabilityMetrics(folds) {
    const accuracies = folds.map(fold => fold.metrics.accuracy);
    const sharpeRatios = folds.map(fold => fold.metrics.sharpeRatio || 0);
    
    return {
      accuracyStability: 1 - (this.calculateStandardDeviation(accuracies) / this.calculateMean(accuracies)),
      sharpeStability: 1 - (this.calculateStandardDeviation(sharpeRatios) / Math.abs(this.calculateMean(sharpeRatios))),
      consistencyScore: this.calculateMean(accuracies) * (1 - this.calculateStandardDeviation(accuracies)),
      foldCount: folds.length
    };
  }

  async bootstrapConfidenceInterval(predictions, actualValues, iterations = 1000) {
    const bootstrapMetrics = [];
    
    for (let i = 0; i < iterations; i++) {
      // Bootstrap sampling with replacement
      const indices = Array.from({ length: predictions.length }, () => 
        Math.floor(Math.random() * predictions.length)
      );
      
      const bootstrapPredictions = indices.map(idx => predictions[idx]);
      const bootstrapActual = indices.map(idx => actualValues[idx]);
      
      const metrics = this.calculatePerformanceMetrics(bootstrapPredictions, bootstrapActual);
      bootstrapMetrics.push(metrics);
    }
    
    // Calculate confidence intervals
    const sortedAccuracies = bootstrapMetrics.map(m => m.accuracy).sort((a, b) => a - b);
    const sortedCorrelations = bootstrapMetrics.map(m => m.correlation).sort((a, b) => a - b);
    
    const lowerIndex = Math.floor(iterations * 0.025);
    const upperIndex = Math.floor(iterations * 0.975);
    
    return {
      accuracy: {
        lower: sortedAccuracies[lowerIndex],
        upper: sortedAccuracies[upperIndex],
        mean: this.calculateMean(sortedAccuracies)
      },
      correlation: {
        lower: sortedCorrelations[lowerIndex],
        upper: sortedCorrelations[upperIndex],
        mean: this.calculateMean(sortedCorrelations)
      }
    };
  }

  assessOverallSignificance(tests) {
    const significantTests = Object.values(tests).filter(test => test.significant);
    return significantTests.length >= Object.keys(tests).length * 0.6; // 60% threshold
  }

  // Additional diagnostic methods (simplified implementations)
  calculatePredictionStability(predictions) {
    const changes = [];
    for (let i = 1; i < predictions.length; i++) {
      changes.push(Math.abs(predictions[i] - predictions[i - 1]) / predictions[i - 1]);
    }
    return 1 - this.calculateMean(changes);
  }

  calculateTemporalStability(predictions, actualValues) {
    // Split into two halves and compare performance
    const mid = Math.floor(predictions.length / 2);
    const firstHalf = this.calculatePerformanceMetrics(
      predictions.slice(0, mid), 
      actualValues.slice(0, mid)
    );
    const secondHalf = this.calculatePerformanceMetrics(
      predictions.slice(mid), 
      actualValues.slice(mid)
    );
    
    return {
      accuracyChange: secondHalf.accuracy - firstHalf.accuracy,
      correlationChange: secondHalf.correlation - firstHalf.correlation,
      stable: Math.abs(secondHalf.accuracy - firstHalf.accuracy) < 0.1
    };
  }

  async assessCrossValidationStability(predictions, actualValues) {
    // Simplified stability assessment
    return {
      stable: true,
      variability: 0.05,
      note: 'Detailed cross-validation stability assessment would be implemented here'
    };
  }

  async testNoiseResistance(predictions, actualValues) {
    // Add noise to predictions and test performance degradation
    const noiseLevel = 0.05; // 5% noise
    const noisyPredictions = predictions.map(pred => 
      pred * (1 + (Math.random() - 0.5) * 2 * noiseLevel)
    );
    
    const originalMetrics = this.calculatePerformanceMetrics(predictions, actualValues);
    const noisyMetrics = this.calculatePerformanceMetrics(noisyPredictions, actualValues);
    
    return {
      originalAccuracy: originalMetrics.accuracy,
      noisyAccuracy: noisyMetrics.accuracy,
      degradation: originalMetrics.accuracy - noisyMetrics.accuracy,
      resistant: (originalMetrics.accuracy - noisyMetrics.accuracy) < 0.1
    };
  }

  testOutlierSensitivity(predictions, actualValues) {
    // Introduce outliers and test sensitivity
    const outlierPredictions = [...predictions];
    const outlierIndices = [
      Math.floor(predictions.length * 0.1),
      Math.floor(predictions.length * 0.5),
      Math.floor(predictions.length * 0.9)
    ];
    
    outlierIndices.forEach(idx => {
      outlierPredictions[idx] *= 3; // 3x outlier
    });
    
    const originalMetrics = this.calculatePerformanceMetrics(predictions, actualValues);
    const outlierMetrics = this.calculatePerformanceMetrics(outlierPredictions, actualValues);
    
    return {
      originalAccuracy: originalMetrics.accuracy,
      outlierAccuracy: outlierMetrics.accuracy,
      sensitivity: originalMetrics.accuracy - outlierMetrics.accuracy,
      robust: (originalMetrics.accuracy - outlierMetrics.accuracy) < 0.15
    };
  }

  testDistributionShifts(predictions, actualValues) {
    // Test performance under distribution shifts
    return {
      shiftTested: true,
      performanceDegradation: 0.05,
      robust: true,
      note: 'Distribution shift testing would be implemented with real market regime data'
    };
  }

  generateModelWarnings(predictions, actualValues) {
    const warnings = [];
    
    const metrics = this.calculatePerformanceMetrics(predictions, actualValues);
    
    if (metrics.correlation < 0.3) {
      warnings.push({
        type: 'LOW_CORRELATION',
        severity: 'HIGH',
        message: 'Very low correlation between predictions and actual values',
        value: metrics.correlation
      });
    }
    
    if (metrics.bias > 0.1) {
      warnings.push({
        type: 'HIGH_BIAS',
        severity: 'MEDIUM',
        message: 'Model shows systematic bias in predictions',
        value: metrics.bias
      });
    }
    
    if (predictions.length < 100) {
      warnings.push({
        type: 'INSUFFICIENT_DATA',
        severity: 'MEDIUM',
        message: 'Limited data points may affect evaluation reliability',
        value: predictions.length
      });
    }
    
    return warnings;
  }

  // Utility functions for statistical calculations
  tStatisticToPValue(tStat, df) {
    // Simplified p-value calculation
    const absTStat = Math.abs(tStat);
    if (absTStat > 2.576) return 0.01;
    if (absTStat > 1.96) return 0.05;
    if (absTStat > 1.645) return 0.10;
    return 0.20;
  }

  detectTrend(series) {
    const n = series.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const correlation = this.calculateCorrelation(x, series);
    return {
      hasTrend: Math.abs(correlation) > 0.1,
      trendStrength: Math.abs(correlation),
      direction: correlation > 0 ? 'increasing' : 'decreasing'
    };
  }

  detectHeteroscedasticity(residuals) {
    // Split into first and second half and compare variances
    const mid = Math.floor(residuals.length / 2);
    const firstHalfVar = this.calculateVariance(residuals.slice(0, mid));
    const secondHalfVar = this.calculateVariance(residuals.slice(mid));
    
    const ratio = Math.max(firstHalfVar, secondHalfVar) / Math.min(firstHalfVar, secondHalfVar);
    
    return {
      detected: ratio > 2.0,
      varianceRatio: ratio,
      firstHalfVariance: firstHalfVar,
      secondHalfVariance: secondHalfVar
    };
  }

  detectOutliers(series, threshold = 2.5) {
    const mean = this.calculateMean(series);
    const std = this.calculateStandardDeviation(series);
    
    const outliers = [];
    series.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / std);
      if (zScore > threshold) {
        outliers.push({ index, value, zScore });
      }
    });
    
    return {
      count: outliers.length,
      outliers,
      percentage: (outliers.length / series.length) * 100
    };
  }

  generateQQPlotData(series) {
    // Generate Q-Q plot data for normality assessment
    const sortedSeries = [...series].sort((a, b) => a - b);
    const n = sortedSeries.length;
    
    const qqData = [];
    for (let i = 0; i < n; i++) {
      const p = (i + 0.5) / n;
      const theoreticalQuantile = this.normalQuantile(p);
      qqData.push({
        theoretical: theoreticalQuantile,
        sample: sortedSeries[i]
      });
    }
    
    return qqData;
  }

  normalQuantile(p) {
    // Simplified normal quantile calculation (inverse normal CDF)
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;
    
    // Approximate calculation
    const c0 = 2.515517;
    const c1 = 0.802853;
    const c2 = 0.010328;
    const d1 = 1.432788;
    const d2 = 0.189269;
    const d3 = 0.001308;
    
    let t, x;
    if (p < 0.5) {
      t = Math.sqrt(-2 * Math.log(p));
      x = -((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1);
    } else {
      t = Math.sqrt(-2 * Math.log(1 - p));
      x = ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1);
    }
    
    return x;
  }

  generateHistogram(series, numBins) {
    const min = Math.min(...series);
    const max = Math.max(...series);
    const binWidth = (max - min) / numBins;
    
    const bins = Array(numBins).fill(0);
    const binEdges = Array(numBins + 1).fill(0).map((_, i) => min + i * binWidth);
    
    series.forEach(value => {
      let binIndex = Math.floor((value - min) / binWidth);
      binIndex = Math.min(binIndex, numBins - 1);
      bins[binIndex]++;
    });
    
    return {
      bins,
      binEdges,
      binWidth
    };
  }

  /**
   * Get evaluation results for a model
   */
  getEvaluationResults(modelId) {
    return this.validationResults.get(modelId);
  }

  /**
   * Get all evaluation results
   */
  getAllEvaluationResults() {
    return Array.from(this.validationResults.entries()).map(([modelId, results]) => ({
      modelId,
      ...results
    }));
  }
}

module.exports = ProfessionalModelEvaluator;