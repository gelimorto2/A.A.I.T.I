const { Matrix } = require('ml-matrix');
const { mean, standardDeviation } = require('simple-statistics');
const logger = require('./logger');

/**
 * Enhanced Time Series Analysis Suite
 * Implements advanced time series models including:
 * - GARCH models for volatility prediction
 * - Vector Autoregression (VAR) for multi-asset analysis
 * - Change point detection algorithms
 * - Advanced trend decomposition
 */
class EnhancedTimeSeriesAnalysis {
  constructor() {
    this.models = new Map();
    this.changePointDetectors = new Map();
    
    logger.info('Enhanced Time Series Analysis Suite initialized');
  }

  /**
   * GARCH(1,1) Model for Volatility Prediction
   * Generalized Autoregressive Conditional Heteroskedasticity
   */
  async fitGARCH(returns, options = {}) {
    const {
      p = 1, // GARCH order
      q = 1, // ARCH order
      maxIterations = 1000,
      tolerance = 1e-6
    } = options;

    logger.info(`Fitting GARCH(${p},${q}) model`);

    try {
      // Calculate initial parameters
      const unconditionalVariance = this.calculateVariance(returns);
      
      // Initialize parameters: [omega, alpha, beta]
      let params = [
        0.01 * unconditionalVariance, // omega (constant)
        0.05,                        // alpha (ARCH coefficient)
        0.90                         // beta (GARCH coefficient)
      ];

      // Optimize parameters using maximum likelihood estimation
      const optimizedParams = await this.optimizeGARCHParameters(returns, params, {
        maxIterations,
        tolerance
      });

      // Calculate conditional volatilities
      const conditionalVolatilities = this.calculateConditionalVolatilities(
        returns, 
        optimizedParams
      );

      // Calculate model diagnostics
      const diagnostics = this.calculateGARCHDiagnostics(
        returns, 
        conditionalVolatilities, 
        optimizedParams
      );

      const garchModel = {
        type: 'GARCH',
        order: { p, q },
        parameters: {
          omega: optimizedParams[0],
          alpha: optimizedParams[1],
          beta: optimizedParams[2]
        },
        conditionalVolatilities,
        diagnostics,
        unconditionalVariance,
        fittedAt: new Date().toISOString()
      };

      logger.info('GARCH model fitted successfully', {
        omega: optimizedParams[0].toFixed(6),
        alpha: optimizedParams[1].toFixed(6),
        beta: optimizedParams[2].toFixed(6),
        logLikelihood: diagnostics.logLikelihood
      });

      return garchModel;

    } catch (error) {
      logger.error('Error fitting GARCH model:', error);
      throw error;
    }
  }

  /**
   * Optimize GARCH parameters using numerical methods
   */
  async optimizeGARCHParameters(returns, initialParams, options) {
    const { maxIterations, tolerance } = options;
    let params = [...initialParams];
    let bestLogLikelihood = -Infinity;
    let iteration = 0;

    while (iteration < maxIterations) {
      // Calculate log-likelihood with current parameters
      const logLikelihood = this.garchLogLikelihood(returns, params);
      
      if (logLikelihood > bestLogLikelihood) {
        bestLogLikelihood = logLikelihood;
      }

      // Gradient-based parameter update (simplified)
      const gradient = this.calculateGARCHGradient(returns, params);
      const learningRate = 0.001;
      
      const newParams = params.map((param, i) => {
        return param + learningRate * gradient[i];
      });

      // Ensure parameter constraints
      newParams[0] = Math.max(newParams[0], 1e-8); // omega > 0
      newParams[1] = Math.max(0, Math.min(1, newParams[1])); // 0 < alpha < 1
      newParams[2] = Math.max(0, Math.min(1, newParams[2])); // 0 < beta < 1
      
      // Check for stationarity constraint: alpha + beta < 1
      if (newParams[1] + newParams[2] >= 1) {
        const sum = newParams[1] + newParams[2];
        newParams[1] = newParams[1] / sum * 0.99;
        newParams[2] = newParams[2] / sum * 0.99;
      }

      // Check convergence
      const paramChange = Math.sqrt(
        newParams.reduce((sum, param, i) => sum + Math.pow(param - params[i], 2), 0)
      );

      if (paramChange < tolerance) {
        logger.info(`GARCH optimization converged after ${iteration} iterations`);
        break;
      }

      params = newParams;
      iteration++;
    }

    return params;
  }

  /**
   * Calculate GARCH log-likelihood
   */
  garchLogLikelihood(returns, params) {
    const [omega, alpha, beta] = params;
    const n = returns.length;
    let logLikelihood = 0;
    
    // Initialize conditional variance
    let conditionalVariance = this.calculateVariance(returns);
    
    for (let t = 1; t < n; t++) {
      // GARCH(1,1) equation: σ²(t) = ω + α*ε²(t-1) + β*σ²(t-1)
      conditionalVariance = omega + 
        alpha * Math.pow(returns[t-1], 2) + 
        beta * conditionalVariance;
      
      // Ensure positive variance
      conditionalVariance = Math.max(conditionalVariance, 1e-8);
      
      // Add to log-likelihood
      logLikelihood += -0.5 * Math.log(2 * Math.PI * conditionalVariance) - 
        (Math.pow(returns[t], 2) / (2 * conditionalVariance));
    }
    
    return logLikelihood;
  }

  /**
   * Calculate GARCH gradient (simplified numerical gradient)
   */
  calculateGARCHGradient(returns, params) {
    const epsilon = 1e-8;
    const gradient = [];
    
    for (let i = 0; i < params.length; i++) {
      const paramsPlus = [...params];
      const paramsMinus = [...params];
      
      paramsPlus[i] += epsilon;
      paramsMinus[i] -= epsilon;
      
      const logLikePlus = this.garchLogLikelihood(returns, paramsPlus);
      const logLikeMinus = this.garchLogLikelihood(returns, paramsMinus);
      
      gradient[i] = (logLikePlus - logLikeMinus) / (2 * epsilon);
    }
    
    return gradient;
  }

  /**
   * Calculate conditional volatilities from GARCH model
   */
  calculateConditionalVolatilities(returns, params) {
    const [omega, alpha, beta] = params;
    const n = returns.length;
    const volatilities = new Array(n);
    
    // Initialize with unconditional variance
    let conditionalVariance = this.calculateVariance(returns);
    volatilities[0] = Math.sqrt(conditionalVariance);
    
    for (let t = 1; t < n; t++) {
      conditionalVariance = omega + 
        alpha * Math.pow(returns[t-1], 2) + 
        beta * conditionalVariance;
      
      volatilities[t] = Math.sqrt(Math.max(conditionalVariance, 1e-8));
    }
    
    return volatilities;
  }

  /**
   * Calculate GARCH model diagnostics
   */
  calculateGARCHDiagnostics(returns, volatilities, params) {
    const logLikelihood = this.garchLogLikelihood(returns, params);
    const n = returns.length;
    const k = params.length; // number of parameters
    
    // Akaike Information Criterion
    const aic = -2 * logLikelihood + 2 * k;
    
    // Bayesian Information Criterion
    const bic = -2 * logLikelihood + k * Math.log(n);
    
    // Calculate standardized residuals
    const standardizedResiduals = returns.map((ret, i) => {
      return volatilities[i] > 0 ? ret / volatilities[i] : 0;
    });
    
    // Ljung-Box test on squared standardized residuals
    const ljungBoxStat = this.ljungBoxTest(
      standardizedResiduals.map(r => r * r), 
      10
    );
    
    return {
      logLikelihood,
      aic,
      bic,
      standardizedResiduals,
      ljungBoxStat,
      persistence: params[1] + params[2], // alpha + beta
      unconditionalVolatility: Math.sqrt(params[0] / (1 - params[1] - params[2]))
    };
  }

  /**
   * Vector Autoregression (VAR) for multi-asset analysis
   */
  async fitVAR(multipleTimeSeries, options = {}) {
    const {
      lags = 1,
      includeConstant = true
    } = options;

    logger.info(`Fitting VAR(${lags}) model for ${multipleTimeSeries.length} time series`);

    try {
      const n = multipleTimeSeries[0].length; // time series length
      const k = multipleTimeSeries.length;    // number of variables
      
      // Prepare data matrix
      const Y = this.prepareVARData(multipleTimeSeries, lags, includeConstant);
      
      // Estimate VAR coefficients using OLS
      const coefficients = this.estimateVARCoefficients(Y, lags, k, includeConstant);
      
      // Calculate fitted values and residuals
      const fittedValues = this.calculateVARFittedValues(Y, coefficients, lags, k);
      const residuals = this.calculateVARResiduals(Y, fittedValues, lags);
      
      // Model diagnostics
      const diagnostics = this.calculateVARDiagnostics(residuals, coefficients);
      
      const varModel = {
        type: 'VAR',
        lags,
        numberOfSeries: k,
        coefficients,
        fittedValues,
        residuals,
        diagnostics,
        includeConstant,
        fittedAt: new Date().toISOString()
      };

      logger.info('VAR model fitted successfully', {
        lags,
        numberOfSeries: k,
        rSquared: diagnostics.rSquared
      });

      return varModel;

    } catch (error) {
      logger.error('Error fitting VAR model:', error);
      throw error;
    }
  }

  /**
   * Prepare data for VAR estimation
   */
  prepareVARData(timeSeries, lags, includeConstant) {
    const n = timeSeries[0].length - lags; // effective sample size
    const k = timeSeries.length;           // number of variables
    const totalRegressors = k * lags + (includeConstant ? 1 : 0);
    
    // Y matrix: dependent variables
    const Y = new Matrix(n, k);
    
    // X matrix: lagged variables (and constant)
    const X = new Matrix(n, totalRegressors);
    
    for (let t = 0; t < n; t++) {
      // Fill Y matrix with current values
      for (let i = 0; i < k; i++) {
        Y.set(t, i, timeSeries[i][t + lags]);
      }
      
      // Fill X matrix with lagged values
      let colIndex = 0;
      
      // Add constant term if requested
      if (includeConstant) {
        X.set(t, colIndex++, 1);
      }
      
      // Add lagged variables
      for (let lag = 1; lag <= lags; lag++) {
        for (let i = 0; i < k; i++) {
          X.set(t, colIndex++, timeSeries[i][t + lags - lag]);
        }
      }
    }
    
    return { Y, X };
  }

  /**
   * Estimate VAR coefficients using OLS
   */
  estimateVARCoefficients(data, lags, k, includeConstant) {
    const { Y, X } = data;
    
    // OLS estimation: β = (X'X)^(-1)X'Y
    const XTranspose = X.transpose();
    const XTX = XTranspose.mmul(X);
    const XTXInverse = XTX.inverse();
    const XTY = XTranspose.mmul(Y);
    const coefficients = XTXInverse.mmul(XTY);
    
    return coefficients;
  }

  /**
   * Calculate VAR fitted values
   */
  calculateVARFittedValues(data, coefficients, lags, k) {
    const { X } = data;
    return X.mmul(coefficients);
  }

  /**
   * Calculate VAR residuals
   */
  calculateVARResiduals(data, fittedValues, lags) {
    const { Y } = data;
    return Y.sub(fittedValues);
  }

  /**
   * Calculate VAR model diagnostics
   */
  calculateVARDiagnostics(residuals, coefficients) {
    const n = residuals.rows;
    const k = residuals.columns;
    
    // Calculate R-squared for each equation
    const rSquared = [];
    for (let i = 0; i < k; i++) {
      const residualColumn = residuals.getColumn(i);
      const tss = this.calculateVariance(residualColumn) * (n - 1);
      const rss = residualColumn.reduce((sum, r) => sum + r * r, 0);
      rSquared.push(1 - rss / tss);
    }
    
    // Calculate log-determinant of residual covariance matrix
    const residualCov = this.calculateCovarianceMatrix(residuals);
    const logDeterminant = Math.log(residualCov.det());
    
    return {
      rSquared,
      residualCovariance: residualCov,
      logDeterminant,
      degreesOfFreedom: n - coefficients.rows
    };
  }

  /**
   * Change Point Detection using CUSUM algorithm
   */
  detectChangePoints(timeSeries, options = {}) {
    const {
      threshold = 5,
      windowSize = 20,
      minSegmentLength = 10
    } = options;

    logger.info('Detecting change points using CUSUM algorithm');

    try {
      const n = timeSeries.length;
      const changePoints = [];
      
      // Calculate cumulative sum of deviations
      const mean = this.calculateMean(timeSeries);
      let cusum = 0;
      const cusumSeries = [];
      const cusumRange = [];
      
      for (let i = 0; i < n; i++) {
        cusum += (timeSeries[i] - mean);
        cusumSeries.push(cusum);
        
        if (i >= windowSize) {
          const windowCusum = cusumSeries.slice(i - windowSize, i);
          const cusumMin = Math.min(...windowCusum);
          const cusumMax = Math.max(...windowCusum);
          cusumRange.push(cusumMax - cusumMin);
          
          // Check if range exceeds threshold
          if (cusumMax - cusumMin > threshold && 
              (changePoints.length === 0 || i - changePoints[changePoints.length - 1] > minSegmentLength)) {
            changePoints.push(i);
          }
        } else {
          cusumRange.push(0);
        }
      }
      
      // Refine change points using more sophisticated detection
      const refinedChangePoints = this.refineChangePoints(timeSeries, changePoints, minSegmentLength);
      
      const result = {
        changePoints: refinedChangePoints,
        cusumSeries,
        cusumRange,
        threshold,
        detectedAt: new Date().toISOString(),
        statistics: {
          totalChangePoints: refinedChangePoints.length,
          averageSegmentLength: n / (refinedChangePoints.length + 1),
          maxCusumRange: Math.max(...cusumRange)
        }
      };

      logger.info(`Detected ${refinedChangePoints.length} change points`);
      
      return result;

    } catch (error) {
      logger.error('Error detecting change points:', error);
      throw error;
    }
  }

  /**
   * Refine change points using statistical tests
   */
  refineChangePoints(timeSeries, candidatePoints, minSegmentLength) {
    const refinedPoints = [];
    
    for (const point of candidatePoints) {
      // Test statistical significance of change point
      const beforeSegment = timeSeries.slice(
        Math.max(0, point - minSegmentLength), 
        point
      );
      const afterSegment = timeSeries.slice(
        point, 
        Math.min(timeSeries.length, point + minSegmentLength)
      );
      
      if (beforeSegment.length >= minSegmentLength && 
          afterSegment.length >= minSegmentLength) {
        
        // Perform t-test for mean difference
        const tStatistic = this.tTest(beforeSegment, afterSegment);
        
        // Use threshold of 2.0 for statistical significance
        if (Math.abs(tStatistic) > 2.0) {
          refinedPoints.push(point);
        }
      }
    }
    
    return refinedPoints;
  }

  /**
   * Advanced Trend Decomposition
   */
  decomposeTimeSeries(timeSeries, options = {}) {
    const {
      seasonalPeriod = 12,
      trendMethod = 'loess',
      seasonalMethod = 'additive'
    } = options;

    logger.info('Decomposing time series into trend, seasonal, and residual components');

    try {
      const n = timeSeries.length;
      
      // Extract trend component
      const trend = this.extractTrend(timeSeries, trendMethod);
      
      // Extract seasonal component
      const seasonal = this.extractSeasonal(
        timeSeries, 
        trend, 
        seasonalPeriod, 
        seasonalMethod
      );
      
      // Calculate residual component
      const residual = timeSeries.map((value, i) => {
        if (seasonalMethod === 'additive') {
          return value - trend[i] - seasonal[i];
        } else {
          return value / (trend[i] * seasonal[i]);
        }
      });
      
      // Calculate decomposition statistics
      const statistics = this.calculateDecompositionStatistics(
        timeSeries, 
        trend, 
        seasonal, 
        residual
      );
      
      const decomposition = {
        original: timeSeries,
        trend,
        seasonal,
        residual,
        seasonalPeriod,
        method: {
          trend: trendMethod,
          seasonal: seasonalMethod
        },
        statistics,
        decomposedAt: new Date().toISOString()
      };

      logger.info('Time series decomposition completed', {
        trendStrength: statistics.trendStrength,
        seasonalStrength: statistics.seasonalStrength
      });

      return decomposition;

    } catch (error) {
      logger.error('Error decomposing time series:', error);
      throw error;
    }
  }

  /**
   * Extract trend using LOESS smoothing
   */
  extractTrend(timeSeries, method) {
    if (method === 'loess') {
      return this.loessSmoothing(timeSeries, 0.6); // 60% of data points
    } else if (method === 'moving_average') {
      return this.movingAverage(timeSeries, 12);
    } else {
      // Simple linear trend
      return this.linearTrend(timeSeries);
    }
  }

  /**
   * LOESS (Local Regression) smoothing
   */
  loessSmoothing(timeSeries, bandwidth) {
    const n = timeSeries.length;
    const h = Math.ceil(bandwidth * n);
    const smoothed = new Array(n);
    
    for (let i = 0; i < n; i++) {
      // Define local neighborhood
      const start = Math.max(0, i - Math.floor(h / 2));
      const end = Math.min(n, start + h);
      
      // Extract local data
      const localX = [];
      const localY = [];
      const weights = [];
      
      for (let j = start; j < end; j++) {
        localX.push(j);
        localY.push(timeSeries[j]);
        
        // Tricube weight function
        const distance = Math.abs(j - i) / (h / 2);
        const weight = distance <= 1 ? Math.pow(1 - Math.pow(distance, 3), 3) : 0;
        weights.push(weight);
      }
      
      // Weighted least squares regression
      smoothed[i] = this.weightedLinearRegression(localX, localY, weights, i);
    }
    
    return smoothed;
  }

  /**
   * Weighted linear regression for LOESS
   */
  weightedLinearRegression(x, y, weights, targetX) {
    const n = x.length;
    let sumW = 0, sumWX = 0, sumWY = 0, sumWX2 = 0, sumWXY = 0;
    
    for (let i = 0; i < n; i++) {
      const w = weights[i];
      sumW += w;
      sumWX += w * x[i];
      sumWY += w * y[i];
      sumWX2 += w * x[i] * x[i];
      sumWXY += w * x[i] * y[i];
    }
    
    const slope = (sumW * sumWXY - sumWX * sumWY) / (sumW * sumWX2 - sumWX * sumWX);
    const intercept = (sumWY - slope * sumWX) / sumW;
    
    return slope * targetX + intercept;
  }

  /**
   * Extract seasonal component
   */
  extractSeasonal(timeSeries, trend, period, method) {
    const n = timeSeries.length;
    const seasonal = new Array(n);
    
    // Calculate detrended series
    const detrended = timeSeries.map((value, i) => {
      if (method === 'additive') {
        return value - trend[i];
      } else {
        return trend[i] !== 0 ? value / trend[i] : 1;
      }
    });
    
    // Calculate seasonal pattern
    const seasonalPattern = new Array(period).fill(0);
    const counts = new Array(period).fill(0);
    
    for (let i = 0; i < n; i++) {
      const seasonIndex = i % period;
      seasonalPattern[seasonIndex] += detrended[i];
      counts[seasonIndex]++;
    }
    
    // Average seasonal components
    for (let i = 0; i < period; i++) {
      seasonalPattern[i] = counts[i] > 0 ? seasonalPattern[i] / counts[i] : 0;
    }
    
    // Adjust seasonal pattern to sum to zero (additive) or product to 1 (multiplicative)
    if (method === 'additive') {
      const seasonalMean = seasonalPattern.reduce((sum, val) => sum + val, 0) / period;
      for (let i = 0; i < period; i++) {
        seasonalPattern[i] -= seasonalMean;
      }
    } else {
      const seasonalProduct = seasonalPattern.reduce((prod, val) => prod * val, 1);
      const adjustment = Math.pow(seasonalProduct, -1 / period);
      for (let i = 0; i < period; i++) {
        seasonalPattern[i] *= adjustment;
      }
    }
    
    // Replicate pattern across full time series
    for (let i = 0; i < n; i++) {
      seasonal[i] = seasonalPattern[i % period];
    }
    
    return seasonal;
  }

  /**
   * Predict volatility using GARCH model
   */
  predictVolatility(garchModel, steps = 1) {
    const { parameters, conditionalVolatilities } = garchModel;
    const { omega, alpha, beta } = parameters;
    
    const predictions = [];
    let lastVolatility = conditionalVolatilities[conditionalVolatilities.length - 1];
    let lastReturn = 0; // Assume last return is 0 for simplicity
    
    for (let i = 0; i < steps; i++) {
      // GARCH(1,1) forecast: σ²(t+h) = ω + (α + β)^(h-1) * (α*ε²(t) + β*σ²(t) - ω) + ω
      let forecastVariance;
      
      if (i === 0) {
        forecastVariance = omega + alpha * Math.pow(lastReturn, 2) + beta * Math.pow(lastVolatility, 2);
      } else {
        // For multi-step ahead, variance converges to unconditional variance
        const persistence = alpha + beta;
        const unconditionalVar = omega / (1 - persistence);
        const deviation = Math.pow(lastVolatility, 2) - unconditionalVar;
        forecastVariance = unconditionalVar + Math.pow(persistence, i) * deviation;
      }
      
      const forecastVolatility = Math.sqrt(Math.max(forecastVariance, 1e-8));
      predictions.push(forecastVolatility);
      
      lastVolatility = forecastVolatility;
    }
    
    return predictions;
  }

  /**
   * Utility functions
   */
  calculateVariance(values) {
    const meanVal = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - meanVal, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length - 1);
  }

  calculateMean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateCovarianceMatrix(matrix) {
    const n = matrix.rows;
    const k = matrix.columns;
    const means = [];
    
    // Calculate column means
    for (let j = 0; j < k; j++) {
      const column = matrix.getColumn(j);
      means.push(this.calculateMean(column));
    }
    
    // Calculate covariance matrix
    const covMatrix = new Matrix(k, k);
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        let covariance = 0;
        for (let t = 0; t < n; t++) {
          covariance += (matrix.get(t, i) - means[i]) * (matrix.get(t, j) - means[j]);
        }
        covMatrix.set(i, j, covariance / (n - 1));
      }
    }
    
    return covMatrix;
  }

  ljungBoxTest(residuals, lags) {
    const n = residuals.length;
    const autocorrelations = this.calculateAutocorrelations(residuals, lags);
    
    let ljungBoxStat = 0;
    for (let k = 1; k <= lags; k++) {
      ljungBoxStat += (autocorrelations[k - 1] * autocorrelations[k - 1]) / (n - k);
    }
    
    ljungBoxStat *= n * (n + 2);
    
    return {
      statistic: ljungBoxStat,
      degreesOfFreedom: lags,
      criticalValue: 18.31 // Chi-square critical value for α=0.05, df=10
    };
  }

  calculateAutocorrelations(series, lags) {
    const n = series.length;
    const mean = this.calculateMean(series);
    const autocorrelations = [];
    
    // Calculate variance
    const variance = series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    
    for (let lag = 1; lag <= lags; lag++) {
      let covariance = 0;
      for (let t = lag; t < n; t++) {
        covariance += (series[t] - mean) * (series[t - lag] - mean);
      }
      covariance /= n;
      
      autocorrelations.push(covariance / variance);
    }
    
    return autocorrelations;
  }

  tTest(sample1, sample2) {
    const mean1 = this.calculateMean(sample1);
    const mean2 = this.calculateMean(sample2);
    const var1 = this.calculateVariance(sample1);
    const var2 = this.calculateVariance(sample2);
    const n1 = sample1.length;
    const n2 = sample2.length;
    
    // Pooled standard error
    const pooledSE = Math.sqrt(var1 / n1 + var2 / n2);
    
    return (mean1 - mean2) / pooledSE;
  }

  movingAverage(timeSeries, window) {
    const result = [];
    for (let i = 0; i < timeSeries.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(timeSeries.length, start + window);
      const slice = timeSeries.slice(start, end);
      result.push(this.calculateMean(slice));
    }
    return result;
  }

  linearTrend(timeSeries) {
    const n = timeSeries.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    // Simple linear regression
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = timeSeries.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * timeSeries[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return x.map(xi => slope * xi + intercept);
  }

  calculateDecompositionStatistics(original, trend, seasonal, residual) {
    const originalVar = this.calculateVariance(original);
    const trendVar = this.calculateVariance(trend);
    const seasonalVar = this.calculateVariance(seasonal);
    const residualVar = this.calculateVariance(residual);
    
    return {
      trendStrength: trendVar / originalVar,
      seasonalStrength: seasonalVar / originalVar,
      residualStrength: residualVar / originalVar,
      totalVarianceExplained: (trendVar + seasonalVar) / originalVar
    };
  }
}

module.exports = new EnhancedTimeSeriesAnalysis();