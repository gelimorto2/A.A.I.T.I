const { EventEmitter } = require('events');
const { Matrix } = require('ml-matrix');
const { mean, standardDeviation } = require('simple-statistics');
const logger = require('./logger');

/**
 * Comprehensive Risk Management System
 * Implements sophisticated risk controls and monitoring:
 * - Position sizing algorithms
 * - Maximum drawdown protection
 * - Correlation-based risk metrics
 * - Real-time VaR calculation
 * - Dynamic risk limits
 * - Portfolio-level risk monitoring
 */
class RiskManagementSystem extends EventEmitter {
  constructor() {
    super();
    
    this.positions = new Map();
    this.riskMetrics = new Map();
    this.riskLimits = new Map();
    this.correlationMatrix = new Map();
    this.varModels = new Map();
    
    // System configuration
    this.config = {
      // Global risk limits
      maxPortfolioVaR: 0.05,        // 5% portfolio VaR limit
      maxPositionSize: 0.1,         // 10% max position size
      maxDrawdown: 0.2,             // 20% max drawdown
      maxCorrelation: 0.8,          // 80% max correlation
      maxLeverage: 3.0,             // 3x max leverage
      
      // Position sizing parameters
      defaultRiskPerTrade: 0.02,    // 2% risk per trade
      kellyFraction: 0.25,          // 25% of Kelly criterion
      volatilityLookback: 252,      // 1 year volatility lookback
      
      // VaR parameters
      varConfidenceLevel: 0.95,     // 95% confidence level
      varHorizon: 1,                // 1-day VaR
      varMethod: 'parametric',      // parametric, historical, monte_carlo
      
      // Correlation parameters
      correlationLookback: 60,      // 60-day correlation lookback
      correlationUpdateFreq: 3600000, // Update every hour
      
      // Drawdown parameters
      drawdownLookback: 90,         // 90-day lookback
      drawdownAlert: 0.1,           // Alert at 10% drawdown
      
      // Risk monitoring
      riskCheckInterval: 60000,     // Check every minute
      alertThresholds: {
            low: 0.7,    // 70% of limit
            medium: 0.85, // 85% of limit
            high: 0.95    // 95% of limit
          }
    };
    
    // Risk calculation methods
    this.positionSizingMethods = {
      FIXED_PERCENT: this.calculateFixedPercentSize.bind(this),
      VOLATILITY_ADJUSTED: this.calculateVolatilityAdjustedSize.bind(this),
      KELLY_CRITERION: this.calculateKellySize.bind(this),
      ATR_BASED: this.calculateATRBasedSize.bind(this),
      VAR_BASED: this.calculateVaRBasedSize.bind(this)
    };
    
    // Initialize risk monitoring
    this.startRiskMonitoring();
    
    logger.info('Risk Management System initialized');
  }

  /**
   * Calculate optimal position size based on risk parameters
   */
  async calculatePositionSize(symbol, direction, entryPrice, stopPrice, options = {}) {
    const {
      riskPerTrade = this.config.defaultRiskPerTrade,
      method = 'VOLATILITY_ADJUSTED',
      portfolioValue = 100000, // Default portfolio value
      maxPositionValue = portfolioValue * this.config.maxPositionSize
    } = options;

    logger.info('Calculating position size', {
      symbol,
      direction,
      entryPrice,
      stopPrice,
      method,
      riskPerTrade
    });

    try {
      // Get risk calculation method
      const calculator = this.positionSizingMethods[method];
      if (!calculator) {
        throw new Error(`Unknown position sizing method: ${method}`);
      }

      // Calculate position size
      const sizeData = await calculator({
        symbol,
        direction,
        entryPrice,
        stopPrice,
        riskPerTrade,
        portfolioValue,
        maxPositionValue
      });

      // Apply risk limits and constraints
      const constrainedSize = this.applyPositionConstraints(sizeData, symbol, portfolioValue);

      // Update position tracking
      this.updatePositionTracking(symbol, constrainedSize);

      logger.info('Position size calculated', {
        symbol,
        originalSize: sizeData.quantity,
        constrainedSize: constrainedSize.quantity,
        riskAmount: constrainedSize.riskAmount,
        method
      });

      return constrainedSize;

    } catch (error) {
      logger.error('Error calculating position size:', error);
      throw error;
    }
  }

  /**
   * Fixed percentage position sizing
   */
  async calculateFixedPercentSize({ symbol, entryPrice, stopPrice, riskPerTrade, portfolioValue }) {
    const riskAmount = portfolioValue * riskPerTrade;
    const priceRisk = Math.abs(entryPrice - stopPrice);
    const quantity = priceRisk > 0 ? riskAmount / priceRisk : 0;

    return {
      quantity,
      riskAmount,
      method: 'FIXED_PERCENT',
      entryPrice,
      stopPrice,
      priceRisk
    };
  }

  /**
   * Volatility-adjusted position sizing
   */
  async calculateVolatilityAdjustedSize({ symbol, entryPrice, stopPrice, riskPerTrade, portfolioValue }) {
    // Get historical volatility
    const volatility = await this.getHistoricalVolatility(symbol);
    
    // Adjust risk based on volatility
    const baseRisk = portfolioValue * riskPerTrade;
    const volatilityAdjustment = 0.15 / Math.max(volatility, 0.05); // Target 15% volatility
    const adjustedRisk = baseRisk * volatilityAdjustment;
    
    const priceRisk = Math.abs(entryPrice - stopPrice);
    const quantity = priceRisk > 0 ? adjustedRisk / priceRisk : 0;

    return {
      quantity,
      riskAmount: adjustedRisk,
      method: 'VOLATILITY_ADJUSTED',
      entryPrice,
      stopPrice,
      priceRisk,
      volatility,
      volatilityAdjustment
    };
  }

  /**
   * Kelly Criterion position sizing
   */
  async calculateKellySize({ symbol, entryPrice, stopPrice, riskPerTrade, portfolioValue }) {
    // Get win rate and average win/loss from historical data
    const tradingStats = await this.getTradingStatistics(symbol);
    
    const winRate = tradingStats.winRate || 0.5;
    const avgWin = tradingStats.avgWin || 1.0;
    const avgLoss = tradingStats.avgLoss || 1.0;
    
    // Kelly formula: f = (bp - q) / b
    // where b = odds received on the wager, p = probability of winning, q = probability of losing
    const b = avgWin / avgLoss;
    const p = winRate;
    const q = 1 - winRate;
    
    const kellyFraction = (b * p - q) / b;
    const conservativeKelly = Math.max(0, kellyFraction * this.config.kellyFraction);
    
    const riskAmount = portfolioValue * conservativeKelly;
    const priceRisk = Math.abs(entryPrice - stopPrice);
    const quantity = priceRisk > 0 ? riskAmount / priceRisk : 0;

    return {
      quantity,
      riskAmount,
      method: 'KELLY_CRITERION',
      entryPrice,
      stopPrice,
      priceRisk,
      kellyFraction: conservativeKelly,
      winRate,
      avgWin,
      avgLoss
    };
  }

  /**
   * ATR-based position sizing
   */
  async calculateATRBasedSize({ symbol, entryPrice, stopPrice, riskPerTrade, portfolioValue }) {
    const atr = await this.getATR(symbol, 14); // 14-period ATR
    
    // Use ATR as stop distance if no stop price provided
    const stopDistance = stopPrice ? Math.abs(entryPrice - stopPrice) : atr * 2;
    
    const riskAmount = portfolioValue * riskPerTrade;
    const quantity = stopDistance > 0 ? riskAmount / stopDistance : 0;

    return {
      quantity,
      riskAmount,
      method: 'ATR_BASED',
      entryPrice,
      stopPrice: stopPrice || (entryPrice - stopDistance),
      priceRisk: stopDistance,
      atr
    };
  }

  /**
   * VaR-based position sizing
   */
  async calculateVaRBasedSize({ symbol, entryPrice, stopPrice, riskPerTrade, portfolioValue }) {
    const var1Day = await this.calculateVaR(symbol, 1, this.config.varConfidenceLevel);
    
    // Size position so that 1-day VaR equals risk per trade
    const targetVaR = portfolioValue * riskPerTrade;
    const quantity = var1Day > 0 ? targetVaR / (var1Day * entryPrice) : 0;
    
    const priceRisk = Math.abs(entryPrice - stopPrice);

    return {
      quantity,
      riskAmount: targetVaR,
      method: 'VAR_BASED',
      entryPrice,
      stopPrice,
      priceRisk,
      var1Day
    };
  }

  /**
   * Apply position constraints and risk limits
   */
  applyPositionConstraints(sizeData, symbol, portfolioValue) {
    let { quantity } = sizeData;
    
    // Maximum position size constraint
    const maxPositionValue = portfolioValue * this.config.maxPositionSize;
    const positionValue = quantity * sizeData.entryPrice;
    
    if (positionValue > maxPositionValue) {
      quantity = maxPositionValue / sizeData.entryPrice;
      logger.warn('Position size reduced due to max position limit', {
        symbol,
        originalValue: positionValue,
        maxValue: maxPositionValue,
        newQuantity: quantity
      });
    }
    
    // Check portfolio concentration
    const portfolioRisk = this.calculatePortfolioRisk();
    if (portfolioRisk.concentration > 0.8) {
      quantity *= 0.5; // Reduce size by 50% if portfolio is concentrated
      logger.warn('Position size reduced due to portfolio concentration', {
        symbol,
        concentration: portfolioRisk.concentration
      });
    }
    
    // Check correlation with existing positions
    const correlationRisk = await this.checkCorrelationRisk(symbol);
    if (correlationRisk > this.config.maxCorrelation) {
      quantity *= (1 - correlationRisk); // Reduce size based on correlation
      logger.warn('Position size reduced due to correlation risk', {
        symbol,
        correlationRisk
      });
    }

    return {
      ...sizeData,
      quantity,
      positionValue: quantity * sizeData.entryPrice,
      constraintsApplied: true
    };
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  async calculateVaR(symbol, horizon = 1, confidenceLevel = 0.95) {
    const method = this.config.varMethod;
    
    try {
      switch (method) {
        case 'parametric':
          return await this.calculateParametricVaR(symbol, horizon, confidenceLevel);
        case 'historical':
          return await this.calculateHistoricalVaR(symbol, horizon, confidenceLevel);
        case 'monte_carlo':
          return await this.calculateMonteCarloVaR(symbol, horizon, confidenceLevel);
        default:
          throw new Error(`Unknown VaR method: ${method}`);
      }
    } catch (error) {
      logger.error('Error calculating VaR:', error);
      throw error;
    }
  }

  /**
   * Parametric VaR calculation
   */
  async calculateParametricVaR(symbol, horizon, confidenceLevel) {
    const returns = await this.getHistoricalReturns(symbol, 252); // 1 year of data
    
    if (returns.length === 0) {
      return 0;
    }
    
    const meanReturn = mean(returns);
    const volatility = standardDeviation(returns);
    
    // Z-score for confidence level
    const zScore = this.getZScore(confidenceLevel);
    
    // VaR calculation: VaR = μ - z*σ*√t
    const varValue = meanReturn - zScore * volatility * Math.sqrt(horizon);
    
    return Math.abs(varValue); // Return positive VaR
  }

  /**
   * Historical VaR calculation
   */
  async calculateHistoricalVaR(symbol, horizon, confidenceLevel) {
    const returns = await this.getHistoricalReturns(symbol, 252);
    
    if (returns.length === 0) {
      return 0;
    }
    
    // Sort returns in ascending order
    const sortedReturns = returns.sort((a, b) => a - b);
    
    // Find percentile
    const percentile = 1 - confidenceLevel;
    const index = Math.floor(percentile * sortedReturns.length);
    
    const varValue = sortedReturns[index];
    
    return Math.abs(varValue) * Math.sqrt(horizon);
  }

  /**
   * Monte Carlo VaR calculation
   */
  async calculateMonteCarloVaR(symbol, horizon, confidenceLevel) {
    const returns = await this.getHistoricalReturns(symbol, 252);
    
    if (returns.length === 0) {
      return 0;
    }
    
    const meanReturn = mean(returns);
    const volatility = standardDeviation(returns);
    
    // Generate Monte Carlo scenarios
    const numSimulations = 10000;
    const simulatedReturns = [];
    
    for (let i = 0; i < numSimulations; i++) {
      let cumulativeReturn = 0;
      
      for (let day = 0; day < horizon; day++) {
        const randomReturn = this.generateNormalRandom(meanReturn, volatility);
        cumulativeReturn += randomReturn;
      }
      
      simulatedReturns.push(cumulativeReturn);
    }
    
    // Sort and find VaR
    simulatedReturns.sort((a, b) => a - b);
    const percentile = 1 - confidenceLevel;
    const index = Math.floor(percentile * simulatedReturns.length);
    
    return Math.abs(simulatedReturns[index]);
  }

  /**
   * Calculate maximum drawdown protection
   */
  async calculateDrawdownRisk(portfolioValue, historicalValues) {
    if (historicalValues.length < 2) {
      return {
        currentDrawdown: 0,
        maxDrawdown: 0,
        drawdownAlert: false,
        timeSinceHigh: 0
      };
    }
    
    let peak = historicalValues[0];
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let peakIndex = 0;
    
    for (let i = 1; i < historicalValues.length; i++) {
      if (historicalValues[i] > peak) {
        peak = historicalValues[i];
        peakIndex = i;
      }
      
      const drawdown = (peak - historicalValues[i]) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
      
      if (i === historicalValues.length - 1) {
        currentDrawdown = drawdown;
      }
    }
    
    const drawdownAlert = currentDrawdown > this.config.drawdownAlert;
    const timeSinceHigh = (historicalValues.length - 1 - peakIndex);
    
    return {
      currentDrawdown,
      maxDrawdown,
      drawdownAlert,
      timeSinceHigh,
      peak
    };
  }

  /**
   * Calculate correlation-based risk metrics
   */
  async calculateCorrelationRisk() {
    const symbols = Array.from(this.positions.keys());
    
    if (symbols.length < 2) {
      return {
        avgCorrelation: 0,
        maxCorrelation: 0,
        correlationMatrix: {},
        concentrationRisk: 0
      };
    }
    
    // Get correlation matrix
    const correlationMatrix = await this.getCorrelationMatrix(symbols);
    
    // Calculate average correlation
    let totalCorrelations = 0;
    let correlationCount = 0;
    let maxCorrelation = 0;
    
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const correlation = correlationMatrix[symbols[i]]?.[symbols[j]] || 0;
        totalCorrelations += Math.abs(correlation);
        maxCorrelation = Math.max(maxCorrelation, Math.abs(correlation));
        correlationCount++;
      }
    }
    
    const avgCorrelation = correlationCount > 0 ? totalCorrelations / correlationCount : 0;
    
    // Calculate concentration risk
    const portfolioWeights = this.calculatePortfolioWeights();
    const concentrationRisk = this.calculateHerfindahlIndex(portfolioWeights);
    
    return {
      avgCorrelation,
      maxCorrelation,
      correlationMatrix,
      concentrationRisk,
      portfolioWeights
    };
  }

  /**
   * Real-time portfolio risk monitoring
   */
  async monitorPortfolioRisk() {
    try {
      const portfolioValue = this.calculatePortfolioValue();
      const positions = Array.from(this.positions.values());
      
      // Calculate portfolio VaR
      const portfolioVaR = await this.calculatePortfolioVaR();
      
      // Calculate drawdown risk
      const historicalValues = await this.getPortfolioHistory();
      const drawdownRisk = await this.calculateDrawdownRisk(portfolioValue, historicalValues);
      
      // Calculate correlation risk
      const correlationRisk = await this.calculateCorrelationRisk();
      
      // Check leverage
      const leverage = this.calculateLeverage();
      
      const riskMetrics = {
        timestamp: Date.now(),
        portfolioValue,
        portfolioVaR,
        drawdownRisk,
        correlationRisk,
        leverage,
        positionCount: positions.length,
        riskLimitBreaches: this.checkRiskLimitBreaches({
          portfolioVaR,
          drawdownRisk,
          correlationRisk,
          leverage
        })
      };
      
      // Store metrics
      this.riskMetrics.set(Date.now(), riskMetrics);
      
      // Clean old metrics (keep last 1000)
      const metricsKeys = Array.from(this.riskMetrics.keys()).sort((a, b) => b - a);
      if (metricsKeys.length > 1000) {
        metricsKeys.slice(1000).forEach(key => this.riskMetrics.delete(key));
      }
      
      // Generate alerts
      this.generateRiskAlerts(riskMetrics);
      
      // Emit risk update
      this.emit('riskUpdate', riskMetrics);
      
      return riskMetrics;
      
    } catch (error) {
      logger.error('Error monitoring portfolio risk:', error);
      throw error;
    }
  }

  /**
   * Check for risk limit breaches
   */
  checkRiskLimitBreaches(metrics) {
    const breaches = [];
    
    if (metrics.portfolioVaR > this.config.maxPortfolioVaR) {
      breaches.push({
        type: 'PORTFOLIO_VAR',
        current: metrics.portfolioVaR,
        limit: this.config.maxPortfolioVaR,
        severity: 'HIGH'
      });
    }
    
    if (metrics.drawdownRisk.currentDrawdown > this.config.maxDrawdown) {
      breaches.push({
        type: 'MAX_DRAWDOWN',
        current: metrics.drawdownRisk.currentDrawdown,
        limit: this.config.maxDrawdown,
        severity: 'HIGH'
      });
    }
    
    if (metrics.correlationRisk.maxCorrelation > this.config.maxCorrelation) {
      breaches.push({
        type: 'CORRELATION',
        current: metrics.correlationRisk.maxCorrelation,
        limit: this.config.maxCorrelation,
        severity: 'MEDIUM'
      });
    }
    
    if (metrics.leverage > this.config.maxLeverage) {
      breaches.push({
        type: 'LEVERAGE',
        current: metrics.leverage,
        limit: this.config.maxLeverage,
        severity: 'HIGH'
      });
    }
    
    return breaches;
  }

  /**
   * Generate risk alerts
   */
  generateRiskAlerts(metrics) {
    for (const breach of metrics.riskLimitBreaches) {
      logger.warn('Risk limit breach detected', breach);
      
      this.emit('riskAlert', {
        type: 'LIMIT_BREACH',
        breach,
        timestamp: Date.now(),
        portfolioMetrics: metrics
      });
    }
    
    // Drawdown alert
    if (metrics.drawdownRisk.drawdownAlert) {
      this.emit('riskAlert', {
        type: 'DRAWDOWN_ALERT',
        currentDrawdown: metrics.drawdownRisk.currentDrawdown,
        threshold: this.config.drawdownAlert,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Start automated risk monitoring
   */
  startRiskMonitoring() {
    setInterval(async () => {
      try {
        await this.monitorPortfolioRisk();
      } catch (error) {
        logger.error('Error in risk monitoring cycle:', error);
      }
    }, this.config.riskCheckInterval);
    
    logger.info('Risk monitoring started', {
      interval: this.config.riskCheckInterval
    });
  }

  /**
   * Utility methods for risk calculations
   */
  
  async getHistoricalVolatility(symbol, periods = 252) {
    const returns = await this.getHistoricalReturns(symbol, periods);
    return returns.length > 0 ? standardDeviation(returns) * Math.sqrt(252) : 0.15; // Default 15% if no data
  }

  async getHistoricalReturns(symbol, periods = 252) {
    // Mock implementation - replace with real historical data
    const returns = [];
    for (let i = 0; i < periods; i++) {
      returns.push((Math.random() - 0.5) * 0.02); // Random returns between -1% and 1%
    }
    return returns;
  }

  async getTradingStatistics(symbol) {
    // Mock implementation - replace with real trading statistics
    return {
      winRate: 0.55,
      avgWin: 1.5,
      avgLoss: 1.0,
      totalTrades: 100
    };
  }

  async getATR(symbol, periods = 14) {
    // Mock implementation - replace with real ATR calculation
    return 0.02; // 2% ATR
  }

  async getCorrelationMatrix(symbols) {
    const matrix = {};
    
    for (const symbol1 of symbols) {
      matrix[symbol1] = {};
      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          matrix[symbol1][symbol2] = 1.0;
        } else {
          // Mock correlation - replace with real calculation
          matrix[symbol1][symbol2] = Math.random() * 0.8; // Random correlation
        }
      }
    }
    
    return matrix;
  }

  calculatePortfolioValue() {
    let totalValue = 0;
    for (const position of this.positions.values()) {
      totalValue += position.marketValue || 0;
    }
    return totalValue;
  }

  calculatePortfolioWeights() {
    const totalValue = this.calculatePortfolioValue();
    const weights = {};
    
    for (const [symbol, position] of this.positions.entries()) {
      weights[symbol] = totalValue > 0 ? (position.marketValue || 0) / totalValue : 0;
    }
    
    return weights;
  }

  calculateHerfindahlIndex(weights) {
    return Object.values(weights).reduce((sum, weight) => sum + weight * weight, 0);
  }

  calculateLeverage() {
    let grossExposure = 0;
    let netValue = 0;
    
    for (const position of this.positions.values()) {
      grossExposure += Math.abs(position.marketValue || 0);
      netValue += position.marketValue || 0;
    }
    
    return netValue > 0 ? grossExposure / netValue : 1;
  }

  async calculatePortfolioVaR() {
    // Simplified portfolio VaR calculation
    const symbols = Array.from(this.positions.keys());
    let portfolioVar = 0;
    
    for (const symbol of symbols) {
      const position = this.positions.get(symbol);
      const positionVar = await this.calculateVaR(symbol, 1, 0.95);
      const positionValue = position.marketValue || 0;
      
      portfolioVar += (positionValue * positionVar) ** 2;
    }
    
    return Math.sqrt(portfolioVar);
  }

  async getPortfolioHistory(days = 90) {
    // Mock implementation - replace with real portfolio history
    const history = [];
    let value = 100000;
    
    for (let i = 0; i < days; i++) {
      value *= (1 + (Math.random() - 0.5) * 0.02); // Random daily changes
      history.push(value);
    }
    
    return history;
  }

  calculatePortfolioRisk() {
    const weights = this.calculatePortfolioWeights();
    const concentration = this.calculateHerfindahlIndex(weights);
    
    return {
      concentration,
      numberOfPositions: Object.keys(weights).length,
      largestPosition: Math.max(...Object.values(weights))
    };
  }

  async checkCorrelationRisk(symbol) {
    const correlationMatrix = await this.getCorrelationMatrix([symbol, ...this.positions.keys()]);
    const correlations = correlationMatrix[symbol];
    
    if (!correlations) return 0;
    
    const maxCorrelation = Math.max(...Object.values(correlations).slice(1)); // Exclude self-correlation
    return maxCorrelation;
  }

  updatePositionTracking(symbol, positionData) {
    this.positions.set(symbol, {
      ...positionData,
      lastUpdated: Date.now()
    });
  }

  getZScore(confidenceLevel) {
    // Z-scores for common confidence levels
    const zScores = {
      0.90: 1.282,
      0.95: 1.645,
      0.99: 2.326
    };
    
    return zScores[confidenceLevel] || 1.645;
  }

  generateNormalRandom(mean = 0, stdDev = 1) {
    // Box-Muller transformation
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Public API methods
   */
  
  getRiskMetrics() {
    const latest = Array.from(this.riskMetrics.values()).pop();
    return latest || null;
  }

  getPositions() {
    return Array.from(this.positions.entries()).map(([symbol, position]) => ({
      symbol,
      ...position
    }));
  }

  updateRiskLimits(newLimits) {
    this.config = { ...this.config, ...newLimits };
    logger.info('Risk limits updated', newLimits);
    this.emit('riskLimitsUpdated', this.config);
  }

  getSystemStatus() {
    return {
      config: this.config,
      positions: this.positions.size,
      riskMetrics: this.riskMetrics.size,
      latestRisk: this.getRiskMetrics(),
      monitoring: true
    };
  }
}

module.exports = new RiskManagementSystem();