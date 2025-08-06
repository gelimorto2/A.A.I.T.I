const { Matrix } = require('ml-matrix');
const MLR = require('ml-regression');
const { mean, standardDeviation } = require('simple-statistics');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const axios = require('axios');

/**
 * Real ML Service Implementation
 * 
 * This service provides legitimate machine learning implementations
 * that actually work, rather than mock/fake implementations.
 * 
 * Currently implements:
 * - Linear Regression (real implementation)
 * - Polynomial Regression (real implementation) 
 * - Simple Moving Average (real implementation)
 * - RSI (real implementation)
 * - Real market data integration
 * 
 * Future implementations (require additional libraries):
 * - LSTM (needs TensorFlow.js)
 * - Random Forest (needs proper implementation)
 * - ARIMA (needs statistical libraries)
 */
class RealMLService {
  constructor() {
    this.models = new Map();
    this.supportedAlgorithms = {
      LINEAR_REGRESSION: 'linear_regression',
      POLYNOMIAL_REGRESSION: 'polynomial_regression',
      MOVING_AVERAGE: 'moving_average',
      RSI_STRATEGY: 'rsi_strategy'
    };
    this.marketDataCache = new Map();
    
    logger.info('Real ML Service initialized with legitimate algorithms');
  }

  /**
   * Get supported algorithms (only those that are actually implemented)
   */
  getSupportedAlgorithms() {
    return Object.values(this.supportedAlgorithms);
  }

  /**
   * Create and train a real ML model
   */
  async createModel(modelConfig) {
    const modelId = uuidv4();
    const {
      name,
      algorithmType,
      targetTimeframe,
      symbols,
      parameters = {},
      trainingPeriodDays = 365
    } = modelConfig;

    try {
      // Validate algorithm is supported
      if (!Object.values(this.supportedAlgorithms).includes(algorithmType)) {
        throw new Error(`Algorithm '${algorithmType}' is not implemented. Supported algorithms: ${this.getSupportedAlgorithms().join(', ')}`);
      }

      // Get real market data
      logger.info(`Fetching real market data for ${symbols.join(', ')}`);
      const trainingData = await this.getRealMarketData(symbols, trainingPeriodDays);
      
      if (!trainingData || trainingData.length < 30) {
        throw new Error('Insufficient real market data. Need at least 30 data points.');
      }

      let model;
      const features = this.extractRealFeatures(trainingData);
      const targets = this.extractTargets(trainingData);

      switch (algorithmType) {
        case this.supportedAlgorithms.LINEAR_REGRESSION:
          model = this.trainRealLinearRegression(features, targets, parameters);
          break;
        case this.supportedAlgorithms.POLYNOMIAL_REGRESSION:
          model = this.trainRealPolynomialRegression(features, targets, parameters);
          break;
        case this.supportedAlgorithms.MOVING_AVERAGE:
          model = this.trainRealMovingAverage(trainingData, parameters);
          break;
        case this.supportedAlgorithms.RSI_STRATEGY:
          model = this.trainRealRSIStrategy(trainingData, parameters);
          break;
        default:
          throw new Error(`Algorithm ${algorithmType} not implemented`);
      }

      // Calculate real performance metrics
      const predictions = this.predict(model, features, algorithmType);
      const performanceMetrics = this.calculateRealPerformanceMetrics(targets, predictions);

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
        createdAt: new Date().toISOString(),
        dataSource: 'real_market_data'
      };

      this.models.set(modelId, modelData);
      logger.info(`Real ML Model created: ${name} (${algorithmType}) with ${trainingData.length} real data points`);
      
      return modelData;
    } catch (error) {
      logger.error('Error creating real ML model:', error);
      throw error;
    }
  }

  /**
   * Fetch real market data from CoinGecko API (free tier)
   */
  async getRealMarketData(symbols, days = 365) {
    const allData = [];
    
    for (const symbol of symbols) {
      try {
        // CoinGecko API - free tier
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart`, {
          params: {
            vs_currency: 'usd',
            days: Math.min(days, 365), // Free tier limit
            interval: days > 90 ? 'daily' : 'hourly'
          },
          timeout: 10000
        });

        const { prices, total_volumes } = response.data;
        
        for (let i = 1; i < prices.length; i++) {
          const currentPrice = prices[i][1];
          const previousPrice = prices[i-1][1];
          const volume = total_volumes[i] ? total_volumes[i][1] : 0;
          
          allData.push({
            timestamp: new Date(prices[i][0]).toISOString(),
            symbol: symbol.toUpperCase(),
            price: currentPrice,
            previousPrice: previousPrice,
            volume: volume,
            return: (currentPrice - previousPrice) / previousPrice
          });
        }

        // Cache the data
        this.marketDataCache.set(symbol, {
          data: allData.filter(d => d.symbol === symbol.toUpperCase()),
          timestamp: Date.now()
        });

        logger.info(`Fetched ${prices.length} real data points for ${symbol}`);
        
        // Rate limiting for free API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.error(`Error fetching data for ${symbol}:`, error.message);
        
        // Fallback to cached data or synthetic data as last resort
        const cachedData = this.marketDataCache.get(symbol);
        if (cachedData && Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000) {
          logger.info(`Using cached data for ${symbol}`);
          allData.push(...cachedData.data);
        } else {
          logger.warn(`No real data available for ${symbol}, skipping`);
        }
      }
    }

    return allData;
  }

  /**
   * Extract real features from market data
   */
  extractRealFeatures(marketData) {
    const features = [];
    
    // Sort by timestamp
    marketData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    for (let i = 20; i < marketData.length; i++) {
      const currentData = marketData.slice(i - 20, i);
      const prices = currentData.map(d => d.price);
      const volumes = currentData.map(d => d.volume);
      
      if (prices.length >= 20) {
        const sma5 = this.calculateSMA(prices.slice(-5));
        const sma10 = this.calculateSMA(prices.slice(-10));
        const sma20 = this.calculateSMA(prices);
        const rsi = this.calculateRSI(prices);
        const volumeAvg = mean(volumes);
        const priceChange = (prices[prices.length - 1] - prices[0]) / prices[0];
        
        features.push([sma5, sma10, sma20, rsi, volumeAvg, priceChange]);
      }
    }
    
    return features;
  }

  /**
   * Extract target values (future returns)
   */
  extractTargets(marketData) {
    const targets = [];
    
    marketData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    for (let i = 20; i < marketData.length - 1; i++) {
      const currentPrice = marketData[i].price;
      const nextPrice = marketData[i + 1].price;
      const target = (nextPrice - currentPrice) / currentPrice;
      targets.push(target);
    }
    
    return targets;
  }

  /**
   * Real Linear Regression implementation
   */
  trainRealLinearRegression(features, targets, parameters = {}) {
    if (features.length === 0 || targets.length === 0) {
      throw new Error('No training data available');
    }

    // Simple linear regression for single feature
    if (features[0].length === 1) {
      const x = features.map(f => f[0]);
      const regression = new MLR.SimpleLinearRegression(x, targets);
      
      return {
        type: 'simple_linear',
        slope: regression.slope,
        intercept: regression.intercept,
        r2: regression.coefficientOfDetermination(x, targets),
        model: regression
      };
    }
    
    // Multiple linear regression
    try {
      const mlr = new MLR.MultivariateLinearRegression(features, targets);
      
      return {
        type: 'multivariate_linear',
        weights: mlr.weights,
        intercept: mlr.intercept,
        model: mlr
      };
    } catch (error) {
      logger.error('MLR training failed:', error);
      throw new Error('Failed to train linear regression model: ' + error.message);
    }
  }

  /**
   * Real Polynomial Regression implementation
   */
  trainRealPolynomialRegression(features, targets, parameters = {}) {
    const degree = parameters.degree || 2;
    
    if (features.length === 0 || targets.length === 0) {
      throw new Error('No training data available');
    }

    // Use first feature for polynomial regression
    const x = features.map(f => f[0]);
    
    try {
      const regression = new MLR.PolynomialRegression(x, targets, degree);
      
      return {
        type: 'polynomial',
        degree: degree,
        coefficients: regression.coefficients,
        r2: regression.coefficientOfDetermination(x, targets),
        model: regression
      };
    } catch (error) {
      logger.error('Polynomial regression training failed:', error);
      throw new Error('Failed to train polynomial regression model: ' + error.message);
    }
  }

  /**
   * Real Moving Average strategy
   */
  trainRealMovingAverage(marketData, parameters = {}) {
    const shortPeriod = parameters.shortPeriod || 5;
    const longPeriod = parameters.longPeriod || 20;
    
    if (marketData.length < longPeriod) {
      throw new Error(`Insufficient data for moving average strategy. Need at least ${longPeriod} periods.`);
    }

    // Calculate moving averages
    const signals = [];
    const prices = marketData.map(d => d.price);
    
    for (let i = longPeriod; i < prices.length; i++) {
      const shortMA = this.calculateSMA(prices.slice(i - shortPeriod, i));
      const longMA = this.calculateSMA(prices.slice(i - longPeriod, i));
      
      // Signal: 1 for buy (short > long), -1 for sell (short < long), 0 for hold
      let signal = 0;
      if (shortMA > longMA * 1.01) signal = 1; // 1% threshold to avoid noise
      else if (shortMA < longMA * 0.99) signal = -1;
      
      signals.push({
        timestamp: marketData[i].timestamp,
        shortMA,
        longMA,
        signal,
        price: prices[i]
      });
    }

    return {
      type: 'moving_average',
      shortPeriod,
      longPeriod,
      signals,
      accuracy: this.calculateMAAccuracy(signals, marketData)
    };
  }

  /**
   * Real RSI strategy
   */
  trainRealRSIStrategy(marketData, parameters = {}) {
    const period = parameters.period || 14;
    const oversold = parameters.oversold || 30;
    const overbought = parameters.overbought || 70;
    
    if (marketData.length < period + 10) {
      throw new Error(`Insufficient data for RSI strategy. Need at least ${period + 10} periods.`);
    }

    const prices = marketData.map(d => d.price);
    const signals = [];
    
    for (let i = period; i < prices.length; i++) {
      const rsi = this.calculateRSI(prices.slice(i - period, i));
      
      let signal = 0;
      if (rsi < oversold) signal = 1; // Buy signal
      else if (rsi > overbought) signal = -1; // Sell signal
      
      signals.push({
        timestamp: marketData[i].timestamp,
        rsi,
        signal,
        price: prices[i]
      });
    }

    return {
      type: 'rsi_strategy',
      period,
      oversold,
      overbought,
      signals,
      accuracy: this.calculateRSIAccuracy(signals, marketData)
    };
  }

  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(prices) {
    if (!prices || prices.length === 0) return 0;
    return mean(prices);
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50; // Neutral RSI
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate real performance metrics
   */
  calculateRealPerformanceMetrics(actual, predicted) {
    if (!actual || !predicted || actual.length === 0 || predicted.length === 0) {
      return {
        mae: 0,
        rmse: 0,
        r2: 0,
        directionalAccuracy: 0,
        sampleSize: 0
      };
    }

    const n = Math.min(actual.length, predicted.length);
    
    // Mean Absolute Error
    const mae = mean(actual.slice(0, n).map((a, i) => Math.abs(a - predicted[i])));
    
    // Root Mean Square Error
    const rmse = Math.sqrt(mean(actual.slice(0, n).map((a, i) => Math.pow(a - predicted[i], 2))));
    
    // R-squared
    const meanActual = mean(actual.slice(0, n));
    const totalSumSquares = actual.slice(0, n).reduce((sum, a) => sum + Math.pow(a - meanActual, 2), 0);
    const residualSumSquares = actual.slice(0, n).reduce((sum, a, i) => sum + Math.pow(a - predicted[i], 2), 0);
    const r2 = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
    
    // Directional Accuracy
    let correctDirections = 0;
    for (let i = 1; i < n; i++) {
      const actualDirection = actual[i] > actual[i-1];
      const predictedDirection = predicted[i] > predicted[i-1];
      if (actualDirection === predictedDirection) correctDirections++;
    }
    const directionalAccuracy = n > 1 ? correctDirections / (n - 1) : 0;
    
    return {
      mae: isNaN(mae) ? 0 : mae,
      rmse: isNaN(rmse) ? 0 : rmse,
      r2: isNaN(r2) ? 0 : r2,
      directionalAccuracy: isNaN(directionalAccuracy) ? 0 : directionalAccuracy,
      sampleSize: n
    };
  }

  /**
   * Make predictions using trained model
   */
  predict(model, features, algorithmType) {
    try {
      switch (algorithmType) {
        case this.supportedAlgorithms.LINEAR_REGRESSION:
          if (model.type === 'simple_linear') {
            return features.map(f => model.model.predict(f[0]));
          } else {
            return features.map(f => model.model.predict(f));
          }
          
        case this.supportedAlgorithms.POLYNOMIAL_REGRESSION:
          return features.map(f => model.model.predict(f[0]));
          
        case this.supportedAlgorithms.MOVING_AVERAGE:
          // Return last signals
          return model.signals.slice(-features.length).map(s => s.signal);
          
        case this.supportedAlgorithms.RSI_STRATEGY:
          // Return last signals
          return model.signals.slice(-features.length).map(s => s.signal);
          
        default:
          throw new Error(`Prediction not implemented for ${algorithmType}`);
      }
    } catch (error) {
      logger.error('Prediction error:', error);
      return [];
    }
  }

  /**
   * Calculate Moving Average strategy accuracy
   */
  calculateMAAccuracy(signals, marketData) {
    if (signals.length < 2) return 0;
    
    let correct = 0;
    let total = 0;
    
    for (let i = 0; i < signals.length - 1; i++) {
      const signal = signals[i].signal;
      const currentPrice = signals[i].price;
      const nextPrice = signals[i + 1].price;
      const actualReturn = (nextPrice - currentPrice) / currentPrice;
      
      if (signal !== 0) {
        total++;
        // Check if signal direction matches actual price movement
        if ((signal > 0 && actualReturn > 0) || (signal < 0 && actualReturn < 0)) {
          correct++;
        }
      }
    }
    
    return total > 0 ? correct / total : 0;
  }

  /**
   * Calculate RSI strategy accuracy
   */
  calculateRSIAccuracy(signals, marketData) {
    if (signals.length < 2) return 0;
    
    let correct = 0;
    let total = 0;
    
    for (let i = 0; i < signals.length - 1; i++) {
      const signal = signals[i].signal;
      const currentPrice = signals[i].price;
      const nextPrice = signals[i + 1].price;
      const actualReturn = (nextPrice - currentPrice) / currentPrice;
      
      if (signal !== 0) {
        total++;
        if ((signal > 0 && actualReturn > 0) || (signal < 0 && actualReturn < 0)) {
          correct++;
        }
      }
    }
    
    return total > 0 ? correct / total : 0;
  }

  /**
   * Serialize model for storage
   */
  serializeModel(model, algorithmType) {
    return JSON.stringify({
      algorithmType,
      modelData: model,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }

  /**
   * Deserialize model from storage
   */
  deserializeModel(serializedModel) {
    try {
      return JSON.parse(serializedModel);
    } catch (error) {
      logger.error('Error deserializing model:', error);
      return null;
    }
  }

  /**
   * Get model by ID
   */
  getModel(modelId) {
    return this.models.get(modelId);
  }

  /**
   * Delete model
   */
  deleteModel(modelId) {
    return this.models.delete(modelId);
  }

  /**
   * List all models
   */
  listModels() {
    return Array.from(this.models.values());
  }

  /**
   * Check if algorithm is supported
   */
  isAlgorithmSupported(algorithmType) {
    return Object.values(this.supportedAlgorithms).includes(algorithmType);
  }

  /**
   * Get algorithm info
   */
  getAlgorithmInfo(algorithmType) {
    const info = {
      [this.supportedAlgorithms.LINEAR_REGRESSION]: {
        name: 'Linear Regression',
        description: 'Real linear regression using ml-regression library',
        params: ['regularization'],
        useCase: 'Basic trend prediction'
      },
      [this.supportedAlgorithms.POLYNOMIAL_REGRESSION]: {
        name: 'Polynomial Regression',
        description: 'Real polynomial regression for non-linear patterns',
        params: ['degree'],
        useCase: 'Non-linear trend prediction'
      },
      [this.supportedAlgorithms.MOVING_AVERAGE]: {
        name: 'Moving Average Strategy',
        description: 'Real moving average crossover strategy',
        params: ['shortPeriod', 'longPeriod'],
        useCase: 'Trend following strategy'
      },
      [this.supportedAlgorithms.RSI_STRATEGY]: {
        name: 'RSI Strategy',
        description: 'Real RSI-based trading strategy',
        params: ['period', 'oversold', 'overbought'],
        useCase: 'Mean reversion strategy'
      }
    };

    return info[algorithmType] || null;
  }
}

module.exports = new RealMLService();