const logger = require('../utils/logger');

/**
 * Enhanced Risk Management Service for A.A.I.T.I Trading Platform
 * 
 * Provides comprehensive risk management including:
 * - Position limits per bot/symbol
 * - Portfolio-wide exposure limits
 * - Drawdown protection
 * - Volatility-based position sizing
 * - Correlation analysis
 * - Real-time risk metrics monitoring
 */
class EnhancedRiskManager {
  constructor(database, exchangeService) {
    this.db = database;
    this.exchange = exchangeService;
    
    // Risk configuration
    this.config = {
      // Position limits
      maxPositionSizeUSD: 10000,          // Max position size per trade
      maxPortfolioExposure: 0.95,         // Max 95% of portfolio exposed
      maxSymbolExposure: 0.15,            // Max 15% per symbol
      maxBotExposure: 0.25,               // Max 25% per bot
      
      // Drawdown protection
      maxDrawdownPercent: 0.10,           // Stop trading at 10% drawdown
      dailyLossLimit: 0.05,               // Stop trading at 5% daily loss
      
      // Volatility-based sizing
      volatilityLookbackDays: 14,         // Days for volatility calculation
      baseVolatilityPercent: 0.02,        // Base position size at 2% volatility
      maxVolatilityMultiplier: 5.0,       // Max multiplier for low volatility
      
      // Correlation limits
      maxCorrelatedPositions: 0.30,       // Max 30% in correlated assets
      correlationThreshold: 0.7,          // Assets with >0.7 correlation
      
      // Risk monitoring
      riskCheckIntervalMs: 30000,         // Check risks every 30 seconds
      alertThreshold: 0.8                 // Alert at 80% of limits
    };
    
    // Risk state
    this.riskState = {
      portfolioValue: 0,
      totalExposure: 0,
      currentDrawdown: 0,
      dailyPnL: 0,
      positions: new Map(),
      correlationMatrix: new Map(),
      volatilityData: new Map(),
      lastRiskCheck: Date.now()
    };
    
    // Risk metrics for monitoring
    this.riskMetrics = {
      var95: 0,                          // 95% Value at Risk
      expectedShortfall: 0,              // Expected Shortfall (CVaR)
      sharpeRatio: 0,                    // Risk-adjusted returns
      maxDrawdown: 0,                    // Historical max drawdown
      volatility: 0,                     // Portfolio volatility
      beta: 0                            // Market beta
    };
    
    this.initializeRiskManager();
  }

  async initializeRiskManager() {
    try {
      await this.loadRiskConfiguration();
      await this.calculateInitialRiskMetrics();
      this.startRiskMonitoring();
      
      logger.info('🛡️ Enhanced Risk Manager initialized', {
        maxPositionSize: this.config.maxPositionSizeUSD,
        maxDrawdown: this.config.maxDrawdownPercent,
        service: 'risk-manager'
      });
    } catch (error) {
      logger.error('Failed to initialize risk manager', {
        error: error.message,
        service: 'risk-manager'
      });
      throw error;
    }
  }

  /**
   * Evaluate trade risk before execution
   */
  async evaluateTradeRisk(botId, symbol, side, quantity, price, metadata = {}) {
    try {
      const riskAssessment = {
        approved: false,
        adjustedQuantity: quantity,
        riskScore: 0,
        warnings: [],
        blockers: [],
        recommendations: []
      };

      // Update current portfolio state
      await this.updatePortfolioState();

      // 1. Position size limits
      const positionRisk = await this.checkPositionLimits(botId, symbol, side, quantity, price);
      this.mergeRiskAssessment(riskAssessment, positionRisk);

      // 2. Portfolio exposure limits
      const exposureRisk = await this.checkExposureLimits(symbol, quantity, price);
      this.mergeRiskAssessment(riskAssessment, exposureRisk);

      // 3. Drawdown protection
      const drawdownRisk = await this.checkDrawdownProtection();
      this.mergeRiskAssessment(riskAssessment, drawdownRisk);

      // 4. Volatility-based sizing
      const volatilityRisk = await this.checkVolatilityBasedSizing(symbol, quantity, price);
      this.mergeRiskAssessment(riskAssessment, volatilityRisk);

      // 5. Correlation limits
      const correlationRisk = await this.checkCorrelationLimits(symbol, quantity, price);
      this.mergeRiskAssessment(riskAssessment, correlationRisk);

      // 6. Market conditions
      const marketRisk = await this.checkMarketConditions(symbol, metadata);
      this.mergeRiskAssessment(riskAssessment, marketRisk);

      // Final risk score calculation
      riskAssessment.riskScore = this.calculateOverallRiskScore(riskAssessment);
      riskAssessment.approved = riskAssessment.blockers.length === 0 && riskAssessment.riskScore <= 0.8;

      // Log risk assessment
      logger.info('🔍 Trade risk assessment completed', {
        botId,
        symbol,
        side,
        quantity: quantity.toString(),
        price: price.toString(),
        approved: riskAssessment.approved,
        riskScore: riskAssessment.riskScore,
        adjustedQuantity: riskAssessment.adjustedQuantity.toString(),
        warnings: riskAssessment.warnings.length,
        blockers: riskAssessment.blockers.length,
        service: 'risk-manager'
      });

      return riskAssessment;
    } catch (error) {
      logger.error('Risk evaluation failed', {
        error: error.message,
        botId,
        symbol,
        service: 'risk-manager'
      });
      
      return {
        approved: false,
        adjustedQuantity: 0,
        riskScore: 1.0,
        warnings: [],
        blockers: ['Risk evaluation system error'],
        recommendations: ['Manual review required']
      };
    }
  }

  /**
   * Check position size limits
   */
  async checkPositionLimits(botId, symbol, side, quantity, price) {
    const risk = { warnings: [], blockers: [], recommendations: [], adjustments: {} };
    
    const positionValue = quantity * price;
    const currentPosition = this.riskState.positions.get(`${botId}:${symbol}`) || { quantity: 0, value: 0 };
    const newPositionValue = Math.abs(currentPosition.value + (side === 'buy' ? positionValue : -positionValue));

    // Check maximum position size
    if (positionValue > this.config.maxPositionSizeUSD) {
      const maxQuantity = this.config.maxPositionSizeUSD / price;
      risk.adjustments.quantity = maxQuantity;
      risk.warnings.push(`Position size reduced from ${quantity} to ${maxQuantity} to meet USD limit`);
    }

    // Check symbol exposure
    const symbolExposure = newPositionValue / this.riskState.portfolioValue;
    if (symbolExposure > this.config.maxSymbolExposure) {
      const maxValue = this.riskState.portfolioValue * this.config.maxSymbolExposure;
      const maxQuantity = (maxValue - Math.abs(currentPosition.value)) / price;
      if (maxQuantity <= 0) {
        risk.blockers.push(`Maximum symbol exposure (${this.config.maxSymbolExposure * 100}%) reached for ${symbol}`);
      } else {
        risk.adjustments.quantity = Math.min(risk.adjustments.quantity || quantity, maxQuantity);
        risk.warnings.push(`Position size reduced to maintain symbol exposure limit`);
      }
    }

    // Check bot exposure
    const botPositions = Array.from(this.riskState.positions.entries())
      .filter(([key]) => key.startsWith(`${botId}:`))
      .reduce((sum, [, pos]) => sum + Math.abs(pos.value), 0);
    
    const botExposure = (botPositions + positionValue) / this.riskState.portfolioValue;
    if (botExposure > this.config.maxBotExposure) {
      const maxBotValue = this.riskState.portfolioValue * this.config.maxBotExposure;
      const maxQuantity = (maxBotValue - botPositions) / price;
      if (maxQuantity <= 0) {
        risk.blockers.push(`Maximum bot exposure (${this.config.maxBotExposure * 100}%) reached`);
      } else {
        risk.adjustments.quantity = Math.min(risk.adjustments.quantity || quantity, maxQuantity);
        risk.warnings.push(`Position size reduced to maintain bot exposure limit`);
      }
    }

    return risk;
  }

  /**
   * Check portfolio exposure limits
   */
  async checkExposureLimits(symbol, quantity, price) {
    const risk = { warnings: [], blockers: [], recommendations: [] };
    
    const positionValue = quantity * price;
    const newTotalExposure = (this.riskState.totalExposure + positionValue) / this.riskState.portfolioValue;

    if (newTotalExposure > this.config.maxPortfolioExposure) {
      const maxAdditionalExposure = this.riskState.portfolioValue * this.config.maxPortfolioExposure - this.riskState.totalExposure;
      if (maxAdditionalExposure <= 0) {
        risk.blockers.push(`Maximum portfolio exposure (${this.config.maxPortfolioExposure * 100}%) reached`);
      } else {
        const maxQuantity = maxAdditionalExposure / price;
        risk.adjustments.quantity = maxQuantity;
        risk.warnings.push(`Position size reduced to maintain portfolio exposure limit`);
      }
    }

    // Check if approaching exposure limit
    if (newTotalExposure > this.config.maxPortfolioExposure * this.config.alertThreshold) {
      risk.warnings.push(`Approaching maximum portfolio exposure (${(newTotalExposure * 100).toFixed(1)}%)`);
    }

    return risk;
  }

  /**
   * Check drawdown protection
   */
  async checkDrawdownProtection() {
    const risk = { warnings: [], blockers: [], recommendations: [] };

    // Check maximum drawdown
    if (this.riskState.currentDrawdown > this.config.maxDrawdownPercent) {
      risk.blockers.push(`Maximum drawdown exceeded (${(this.riskState.currentDrawdown * 100).toFixed(2)}%)`);
      risk.recommendations.push('Consider reducing position sizes or stopping trading temporarily');
    }

    // Check daily loss limit
    if (this.riskState.dailyPnL < -this.config.dailyLossLimit * this.riskState.portfolioValue) {
      risk.blockers.push(`Daily loss limit exceeded (${(Math.abs(this.riskState.dailyPnL) / this.riskState.portfolioValue * 100).toFixed(2)}%)`);
      risk.recommendations.push('Trading halted for the day due to daily loss limit');
    }

    // Warning thresholds
    if (this.riskState.currentDrawdown > this.config.maxDrawdownPercent * this.config.alertThreshold) {
      risk.warnings.push(`Approaching maximum drawdown limit (${(this.riskState.currentDrawdown * 100).toFixed(2)}%)`);
    }

    return risk;
  }

  /**
   * Check volatility-based position sizing
   */
  async checkVolatilityBasedSizing(symbol, quantity, price) {
    const risk = { warnings: [], blockers: [], recommendations: [] };

    try {
      const volatility = await this.calculateSymbolVolatility(symbol);
      
      if (volatility > 0) {
        // Calculate optimal position size based on volatility
        const volatilityMultiplier = Math.min(
          this.config.baseVolatilityPercent / volatility,
          this.config.maxVolatilityMultiplier
        );
        
        const basePositionValue = this.riskState.portfolioValue * this.config.baseVolatilityPercent;
        const optimalPositionValue = basePositionValue * volatilityMultiplier;
        const optimalQuantity = optimalPositionValue / price;

        if (quantity > optimalQuantity * 1.5) {
          risk.adjustments.quantity = optimalQuantity;
          risk.warnings.push(`Position size adjusted based on volatility (${(volatility * 100).toFixed(2)}%)`);
          risk.recommendations.push(`Consider ${optimalQuantity.toFixed(6)} ${symbol.replace('USDT', '')} based on current volatility`);
        }

        // High volatility warning
        if (volatility > 0.05) {
          risk.warnings.push(`High volatility detected for ${symbol} (${(volatility * 100).toFixed(2)}%)`);
        }
      }
    } catch (error) {
      logger.warn('Volatility calculation failed', {
        error: error.message,
        symbol,
        service: 'risk-manager'
      });
    }

    return risk;
  }

  /**
   * Check correlation limits
   */
  async checkCorrelationLimits(symbol, quantity, price) {
    const risk = { warnings: [], blockers: [], recommendations: [] };

    try {
      const correlatedPositions = await this.getCorrelatedPositions(symbol);
      const correlatedValue = correlatedPositions.reduce((sum, pos) => sum + Math.abs(pos.value), 0);
      const positionValue = quantity * price;
      const totalCorrelatedValue = correlatedValue + positionValue;
      const correlatedExposure = totalCorrelatedValue / this.riskState.portfolioValue;

      if (correlatedExposure > this.config.maxCorrelatedPositions) {
        const maxCorrelatedValue = this.riskState.portfolioValue * this.config.maxCorrelatedPositions;
        const maxQuantity = (maxCorrelatedValue - correlatedValue) / price;
        
        if (maxQuantity <= 0) {
          risk.blockers.push(`Maximum correlated positions exposure (${this.config.maxCorrelatedPositions * 100}%) reached`);
        } else {
          risk.adjustments.quantity = maxQuantity;
          risk.warnings.push(`Position size reduced due to correlation limits`);
        }
        
        risk.recommendations.push(`Consider diversifying into uncorrelated assets`);
      }

      // List correlated symbols
      if (correlatedPositions.length > 0) {
        const correlatedSymbols = correlatedPositions.map(pos => pos.symbol).join(', ');
        risk.warnings.push(`Correlated positions detected: ${correlatedSymbols}`);
      }
    } catch (error) {
      logger.warn('Correlation analysis failed', {
        error: error.message,
        symbol,
        service: 'risk-manager'
      });
    }

    return risk;
  }

  /**
   * Check market conditions
   */
  async checkMarketConditions(symbol, metadata) {
    const risk = { warnings: [], blockers: [], recommendations: [] };

    try {
      // Check market hours and liquidity
      const marketData = await this.exchange.getMarketData(symbol);
      
      if (marketData.volume24h < 1000000) { // Low volume threshold
        risk.warnings.push(`Low 24h volume for ${symbol}: $${marketData.volume24h.toLocaleString()}`);
        risk.recommendations.push('Consider reducing position size due to low liquidity');
      }

      // Check spread
      if (marketData.spread && marketData.spread > 0.002) { // 0.2% spread threshold
        risk.warnings.push(`Wide spread detected for ${symbol}: ${(marketData.spread * 100).toFixed(3)}%`);
      }

      // Check for unusual price movements
      if (marketData.priceChange24h && Math.abs(marketData.priceChange24h) > 0.1) {
        risk.warnings.push(`High price volatility: ${(marketData.priceChange24h * 100).toFixed(2)}% in 24h`);
        risk.recommendations.push('Consider waiting for market stabilization');
      }

      // ML model confidence check
      if (metadata.modelConfidence && metadata.modelConfidence < 0.7) {
        risk.warnings.push(`Low ML model confidence: ${(metadata.modelConfidence * 100).toFixed(1)}%`);
        risk.recommendations.push('Consider reducing position size due to low model confidence');
      }
    } catch (error) {
      logger.warn('Market conditions check failed', {
        error: error.message,
        symbol,
        service: 'risk-manager'
      });
    }

    return risk;
  }

  /**
   * Calculate symbol volatility
   */
  async calculateSymbolVolatility(symbol) {
    try {
      // Get historical price data
      const priceHistory = await this.exchange.getHistoricalPrices(symbol, '1d', this.config.volatilityLookbackDays);
      
      if (priceHistory.length < 2) {
        return 0.02; // Default volatility if insufficient data
      }

      // Calculate daily returns
      const returns = [];
      for (let i = 1; i < priceHistory.length; i++) {
        const returnValue = (priceHistory[i].close - priceHistory[i - 1].close) / priceHistory[i - 1].close;
        returns.push(returnValue);
      }

      // Calculate standard deviation (volatility)
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
      const volatility = Math.sqrt(variance);

      // Cache volatility data
      this.riskState.volatilityData.set(symbol, {
        volatility,
        calculatedAt: Date.now(),
        sampleSize: returns.length
      });

      return volatility;
    } catch (error) {
      logger.warn('Volatility calculation failed', {
        error: error.message,
        symbol,
        service: 'risk-manager'
      });
      return 0.02; // Default volatility
    }
  }

  /**
   * Get positions correlated with the given symbol
   */
  async getCorrelatedPositions(symbol) {
    const correlatedPositions = [];
    
    try {
      for (const [positionKey, position] of this.riskState.positions) {
        const [, posSymbol] = positionKey.split(':');
        if (posSymbol !== symbol && position.value !== 0) {
          const correlation = await this.getSymbolCorrelation(symbol, posSymbol);
          if (Math.abs(correlation) > this.config.correlationThreshold) {
            correlatedPositions.push({
              ...position,
              symbol: posSymbol,
              correlation
            });
          }
        }
      }
    } catch (error) {
      logger.warn('Correlation lookup failed', {
        error: error.message,
        symbol,
        service: 'risk-manager'
      });
    }

    return correlatedPositions;
  }

  /**
   * Get correlation between two symbols
   */
  async getSymbolCorrelation(symbol1, symbol2) {
    const cacheKey = `${symbol1}:${symbol2}`;
    const cached = this.riskState.correlationMatrix.get(cacheKey);
    
    if (cached && Date.now() - cached.calculatedAt < 24 * 60 * 60 * 1000) {
      return cached.correlation;
    }

    try {
      // Get historical data for both symbols
      const [history1, history2] = await Promise.all([
        this.exchange.getHistoricalPrices(symbol1, '1d', 30),
        this.exchange.getHistoricalPrices(symbol2, '1d', 30)
      ]);

      if (history1.length < 10 || history2.length < 10) {
        return 0; // Insufficient data
      }

      // Calculate returns
      const returns1 = this.calculateReturns(history1);
      const returns2 = this.calculateReturns(history2);

      // Align data (use minimum length)
      const minLength = Math.min(returns1.length, returns2.length);
      const alignedReturns1 = returns1.slice(0, minLength);
      const alignedReturns2 = returns2.slice(0, minLength);

      // Calculate correlation
      const correlation = this.calculateCorrelation(alignedReturns1, alignedReturns2);

      // Cache result
      this.riskState.correlationMatrix.set(cacheKey, {
        correlation,
        calculatedAt: Date.now()
      });

      return correlation;
    } catch (error) {
      logger.warn('Correlation calculation failed', {
        error: error.message,
        symbol1,
        symbol2,
        service: 'risk-manager'
      });
      return 0;
    }
  }

  /**
   * Calculate returns from price history
   */
  calculateReturns(priceHistory) {
    const returns = [];
    for (let i = 1; i < priceHistory.length; i++) {
      const returnValue = (priceHistory[i].close - priceHistory[i - 1].close) / priceHistory[i - 1].close;
      returns.push(returnValue);
    }
    return returns;
  }

  /**
   * Calculate correlation coefficient between two return series
   */
  calculateCorrelation(returns1, returns2) {
    if (returns1.length !== returns2.length || returns1.length === 0) {
      return 0;
    }

    const n = returns1.length;
    const mean1 = returns1.reduce((sum, r) => sum + r, 0) / n;
    const mean2 = returns2.reduce((sum, r) => sum + r, 0) / n;

    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Update portfolio state
   */
  async updatePortfolioState() {
    try {
      // Get current portfolio value and positions
      const portfolio = await this.getPortfolioSnapshot();
      
      this.riskState.portfolioValue = portfolio.totalValue;
      this.riskState.totalExposure = portfolio.totalExposure;
      this.riskState.currentDrawdown = portfolio.drawdown;
      this.riskState.dailyPnL = portfolio.dailyPnL;
      
      // Update positions map
      this.riskState.positions.clear();
      portfolio.positions.forEach(position => {
        const key = `${position.botId}:${position.symbol}`;
        this.riskState.positions.set(key, {
          quantity: position.quantity,
          value: position.value,
          unrealizedPnL: position.unrealizedPnL
        });
      });

      this.riskState.lastRiskCheck = Date.now();
    } catch (error) {
      logger.error('Failed to update portfolio state', {
        error: error.message,
        service: 'risk-manager'
      });
    }
  }

  /**
   * Get current portfolio snapshot
   */
  async getPortfolioSnapshot() {
    // This would typically query the database for current positions
    // For now, return a mock portfolio
    return {
      totalValue: 100000,
      totalExposure: 45000,
      drawdown: 0.02,
      dailyPnL: -500,
      positions: []
    };
  }

  /**
   * Merge risk assessment results
   */
  mergeRiskAssessment(target, source) {
    target.warnings.push(...source.warnings);
    target.blockers.push(...source.blockers);
    target.recommendations.push(...source.recommendations);
    
    if (source.adjustments && source.adjustments.quantity !== undefined) {
      target.adjustedQuantity = Math.min(
        target.adjustedQuantity,
        source.adjustments.quantity
      );
    }
  }

  /**
   * Calculate overall risk score
   */
  calculateOverallRiskScore(assessment) {
    let score = 0;
    
    // Blockers = maximum risk
    if (assessment.blockers.length > 0) {
      return 1.0;
    }
    
    // Warnings increase risk score
    score += assessment.warnings.length * 0.1;
    
    // Position size adjustments indicate risk
    if (assessment.adjustedQuantity < assessment.originalQuantity) {
      const reduction = 1 - (assessment.adjustedQuantity / assessment.originalQuantity);
      score += reduction * 0.3;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Start risk monitoring
   */
  startRiskMonitoring() {
    setInterval(async () => {
      try {
        await this.performRiskMonitoring();
      } catch (error) {
        logger.error('Risk monitoring failed', {
          error: error.message,
          service: 'risk-manager'
        });
      }
    }, this.config.riskCheckIntervalMs);

    logger.info('🔄 Risk monitoring started', {
      interval: this.config.riskCheckIntervalMs,
      service: 'risk-manager'
    });
  }

  /**
   * Perform periodic risk monitoring
   */
  async performRiskMonitoring() {
    await this.updatePortfolioState();
    await this.calculateRiskMetrics();
    await this.checkRiskAlerts();
    
    // Log risk status
    logger.debug('📊 Risk monitoring update', {
      portfolioValue: this.riskState.portfolioValue,
      totalExposure: this.riskState.totalExposure,
      currentDrawdown: this.riskState.currentDrawdown,
      dailyPnL: this.riskState.dailyPnL,
      positionsCount: this.riskState.positions.size,
      service: 'risk-manager'
    });
  }

  /**
   * Calculate advanced risk metrics
   */
  async calculateRiskMetrics() {
    // Implementation for VaR, Expected Shortfall, Sharpe Ratio, etc.
    // This is a placeholder for the actual calculations
    this.riskMetrics = {
      var95: this.riskState.portfolioValue * 0.05,
      expectedShortfall: this.riskState.portfolioValue * 0.08,
      sharpeRatio: 1.2,
      maxDrawdown: 0.03,
      volatility: 0.15,
      beta: 1.1
    };
  }

  /**
   * Check for risk alerts
   */
  async checkRiskAlerts() {
    const alerts = [];

    // Drawdown alerts
    if (this.riskState.currentDrawdown > this.config.maxDrawdownPercent * this.config.alertThreshold) {
      alerts.push({
        type: 'drawdown',
        severity: 'high',
        message: `Approaching maximum drawdown: ${(this.riskState.currentDrawdown * 100).toFixed(2)}%`
      });
    }

    // Exposure alerts
    const exposureRatio = this.riskState.totalExposure / this.riskState.portfolioValue;
    if (exposureRatio > this.config.maxPortfolioExposure * this.config.alertThreshold) {
      alerts.push({
        type: 'exposure',
        severity: 'medium',
        message: `High portfolio exposure: ${(exposureRatio * 100).toFixed(1)}%`
      });
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendRiskAlerts(alerts);
    }
  }

  /**
   * Send risk alerts
   */
  async sendRiskAlerts(alerts) {
    alerts.forEach(alert => {
      logger.warn(`🚨 Risk Alert: ${alert.message}`, {
        type: alert.type,
        severity: alert.severity,
        service: 'risk-manager'
      });
    });

    // Here you would implement actual alerting (email, Slack, etc.)
  }

  /**
   * Load risk configuration from database
   */
  async loadRiskConfiguration() {
    try {
      // Load configuration from database if available
      // For now, use default configuration
      logger.debug('Risk configuration loaded', {
        maxPositionSize: this.config.maxPositionSizeUSD,
        maxDrawdown: this.config.maxDrawdownPercent,
        service: 'risk-manager'
      });
    } catch (error) {
      logger.warn('Using default risk configuration', {
        error: error.message,
        service: 'risk-manager'
      });
    }
  }

  /**
   * Calculate initial risk metrics
   */
  async calculateInitialRiskMetrics() {
    await this.updatePortfolioState();
    await this.calculateRiskMetrics();
    
    logger.info('📈 Initial risk metrics calculated', {
      portfolioValue: this.riskState.portfolioValue,
      var95: this.riskMetrics.var95,
      sharpeRatio: this.riskMetrics.sharpeRatio,
      service: 'risk-manager'
    });
  }

  /**
   * Get current risk status
   */
  getRiskStatus() {
    return {
      portfolioState: this.riskState,
      riskMetrics: this.riskMetrics,
      configuration: this.config,
      lastUpdate: this.riskState.lastRiskCheck
    };
  }

  /**
   * Update risk configuration
   */
  updateRiskConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Risk configuration updated', {
      updatedFields: Object.keys(newConfig),
      service: 'risk-manager'
    });
  }
}

module.exports = EnhancedRiskManager;