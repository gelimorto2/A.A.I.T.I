const logger = require('./logger');
const { mean, standardDeviation, variance } = require('simple-statistics');

/**
 * Advanced Risk Management System
 * Comprehensive risk monitoring, calculation, and management
 */
class RiskManagementSystem {
  constructor() {
    this.portfolios = new Map();
    this.riskMetrics = new Map();
    this.riskLimits = new Map();
    this.alerts = [];
    this.correlationMatrix = new Map();
    
    this.riskTypes = {
      MARKET_RISK: 'market_risk',
      CREDIT_RISK: 'credit_risk',
      LIQUIDITY_RISK: 'liquidity_risk',
      OPERATIONAL_RISK: 'operational_risk',
      CONCENTRATION_RISK: 'concentration_risk'
    };

    this.positionSizingMethods = {
      FIXED_PERCENTAGE: 'fixed_percentage',
      KELLY_CRITERION: 'kelly_criterion',
      VOLATILITY_BASED: 'volatility_based',
      RISK_PARITY: 'risk_parity',
      EQUAL_WEIGHT: 'equal_weight',
      MARKET_CAP_WEIGHTED: 'market_cap_weighted'
    };

    this.varMethods = {
      HISTORICAL: 'historical',
      PARAMETRIC: 'parametric',
      MONTE_CARLO: 'monte_carlo'
    };

    // Default risk limits
    this.defaultLimits = {
      maxPortfolioDrawdown: 0.20, // 20%
      maxPositionSize: 0.10, // 10% of portfolio
      maxSectorExposure: 0.30, // 30% in any sector
      maxCorrelation: 0.80, // 80% correlation limit
      minLiquidity: 1000000, // $1M daily volume
      maxVaR: 0.05, // 5% daily VaR
      maxLeverage: 2.0 // 2x leverage
    };

    logger.info('RiskManagementSystem initialized with comprehensive risk controls');
  }

  /**
   * Register portfolio for risk monitoring
   */
  registerPortfolio(portfolioId, portfolioData) {
    const portfolio = {
      id: portfolioId,
      positions: new Map(),
      totalValue: 0,
      cash: portfolioData.cash || 0,
      leverage: portfolioData.leverage || 1.0,
      riskLimits: { ...this.defaultLimits, ...portfolioData.riskLimits },
      riskMetrics: {},
      lastUpdate: new Date().toISOString(),
      ...portfolioData
    };

    this.portfolios.set(portfolioId, portfolio);
    this.riskLimits.set(portfolioId, portfolio.riskLimits);
    
    logger.info(`Portfolio registered for risk monitoring: ${portfolioId}`);
    return portfolioId;
  }

  /**
   * Update portfolio positions
   */
  updatePortfolioPositions(portfolioId, positions) {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    portfolio.positions.clear();
    let totalValue = portfolio.cash;

    positions.forEach(position => {
      portfolio.positions.set(position.symbol, {
        symbol: position.symbol,
        quantity: position.quantity,
        avgPrice: position.avgPrice,
        currentPrice: position.currentPrice,
        marketValue: position.quantity * position.currentPrice,
        unrealizedPnL: (position.currentPrice - position.avgPrice) * position.quantity,
        weight: 0, // Will be calculated after total value
        sector: position.sector || 'Unknown',
        ...position
      });

      totalValue += position.quantity * position.currentPrice;
    });

    portfolio.totalValue = totalValue;

    // Calculate position weights
    portfolio.positions.forEach(position => {
      position.weight = position.marketValue / portfolio.totalValue;
    });

    portfolio.lastUpdate = new Date().toISOString();
    
    logger.info(`Portfolio positions updated: ${portfolioId}, Total Value: $${totalValue.toFixed(2)}`);
  }

  /**
   * Calculate optimal position size
   */
  calculatePositionSize(portfolioId, symbol, method = 'fixed_percentage', parameters = {}) {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    switch (method) {
      case this.positionSizingMethods.FIXED_PERCENTAGE:
        return this.calculateFixedPercentageSize(portfolio, symbol, parameters);
      
      case this.positionSizingMethods.KELLY_CRITERION:
        return this.calculateKellySize(portfolio, symbol, parameters);
      
      case this.positionSizingMethods.VOLATILITY_BASED:
        return this.calculateVolatilityBasedSize(portfolio, symbol, parameters);
      
      case this.positionSizingMethods.RISK_PARITY:
        return this.calculateRiskParitySize(portfolio, symbol, parameters);
      
      case this.positionSizingMethods.EQUAL_WEIGHT:
        return this.calculateEqualWeightSize(portfolio, symbol, parameters);
      
      default:
        throw new Error(`Unknown position sizing method: ${method}`);
    }
  }

  /**
   * Fixed percentage position sizing
   */
  calculateFixedPercentageSize(portfolio, symbol, parameters) {
    const riskPerTrade = parameters.riskPerTrade || 0.02; // 2%
    const maxPositionSize = parameters.maxPositionSize || portfolio.riskLimits.maxPositionSize;
    
    const availableCapital = portfolio.totalValue;
    const targetValue = availableCapital * riskPerTrade;
    const maxValue = availableCapital * maxPositionSize;
    
    const recommendedValue = Math.min(targetValue, maxValue);
    
    return {
      method: 'fixed_percentage',
      recommendedValue,
      maxValue,
      riskPerTrade,
      reason: `${(riskPerTrade * 100).toFixed(1)}% of portfolio, capped at ${(maxPositionSize * 100).toFixed(1)}%`
    };
  }

  /**
   * Kelly Criterion position sizing
   */
  calculateKellySize(portfolio, symbol, parameters) {
    const winRate = parameters.winRate || 0.55;
    const avgWin = parameters.avgWin || 0.08;
    const avgLoss = parameters.avgLoss || 0.05;
    const maxKelly = parameters.maxKelly || 0.25; // Cap at 25%
    
    // Kelly formula: f = (bp - q) / b
    // where b = avg win/avg loss, p = win rate, q = 1 - p
    const b = avgWin / avgLoss;
    const p = winRate;
    const q = 1 - p;
    
    const kellyFraction = (b * p - q) / b;
    const cappedKelly = Math.max(0, Math.min(kellyFraction, maxKelly));
    
    const recommendedValue = portfolio.totalValue * cappedKelly;
    
    return {
      method: 'kelly_criterion',
      recommendedValue,
      kellyFraction: kellyFraction.toFixed(4),
      cappedFraction: cappedKelly.toFixed(4),
      winRate,
      avgWin,
      avgLoss,
      reason: `Kelly: ${(kellyFraction * 100).toFixed(1)}%, capped at ${(maxKelly * 100).toFixed(1)}%`
    };
  }

  /**
   * Volatility-based position sizing
   */
  calculateVolatilityBasedSize(portfolio, symbol, parameters) {
    const targetVolatility = parameters.targetVolatility || 0.02; // 2% daily
    const lookbackPeriod = parameters.lookbackPeriod || 30;
    const assetVolatility = parameters.assetVolatility || 0.05; // 5% daily, should be calculated from historical data
    
    // Position size = (Target Portfolio Volatility) / (Asset Volatility)
    const positionFraction = targetVolatility / assetVolatility;
    const maxFraction = portfolio.riskLimits.maxPositionSize;
    
    const cappedFraction = Math.min(positionFraction, maxFraction);
    const recommendedValue = portfolio.totalValue * cappedFraction;
    
    return {
      method: 'volatility_based',
      recommendedValue,
      targetVolatility,
      assetVolatility,
      positionFraction: positionFraction.toFixed(4),
      cappedFraction: cappedFraction.toFixed(4),
      reason: `Target vol ${(targetVolatility * 100).toFixed(1)}% / Asset vol ${(assetVolatility * 100).toFixed(1)}%`
    };
  }

  /**
   * Risk parity position sizing
   */
  calculateRiskParitySize(portfolio, symbol, parameters) {
    const numAssets = parameters.numAssets || portfolio.positions.size + 1;
    const assetVolatility = parameters.assetVolatility || 0.05;
    const portfolioVolatility = parameters.portfolioVolatility || 0.03;
    
    // In risk parity, each asset contributes equally to portfolio risk
    const targetRiskContribution = 1 / numAssets;
    
    // Simplified calculation: weight inversely proportional to volatility
    const targetWeight = targetRiskContribution / assetVolatility;
    const recommendedValue = portfolio.totalValue * targetWeight;
    
    return {
      method: 'risk_parity',
      recommendedValue,
      targetWeight: targetWeight.toFixed(4),
      targetRiskContribution: targetRiskContribution.toFixed(4),
      assetVolatility,
      reason: `Equal risk contribution (${(targetRiskContribution * 100).toFixed(1)}% of portfolio risk)`
    };
  }

  /**
   * Equal weight position sizing
   */
  calculateEqualWeightSize(portfolio, symbol, parameters) {
    const numPositions = parameters.numPositions || 10; // Target number of positions
    const targetWeight = 1 / numPositions;
    const maxWeight = portfolio.riskLimits.maxPositionSize;
    
    const finalWeight = Math.min(targetWeight, maxWeight);
    const recommendedValue = portfolio.totalValue * finalWeight;
    
    return {
      method: 'equal_weight',
      recommendedValue,
      targetWeight: targetWeight.toFixed(4),
      finalWeight: finalWeight.toFixed(4),
      numPositions,
      reason: `Equal weight across ${numPositions} positions`
    };
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  async calculateVaR(portfolioId, confidence = 0.95, horizon = 1, method = 'historical') {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    switch (method) {
      case this.varMethods.HISTORICAL:
        return await this.calculateHistoricalVaR(portfolio, confidence, horizon);
      
      case this.varMethods.PARAMETRIC:
        return await this.calculateParametricVaR(portfolio, confidence, horizon);
      
      case this.varMethods.MONTE_CARLO:
        return await this.calculateMonteCarloVaR(portfolio, confidence, horizon);
      
      default:
        throw new Error(`Unknown VaR method: ${method}`);
    }
  }

  /**
   * Historical VaR calculation
   */
  async calculateHistoricalVaR(portfolio, confidence, horizon) {
    // In a real implementation, this would fetch historical returns
    // For now, we'll simulate with random data
    const returns = this.generateSimulatedReturns(250); // 1 year of daily returns
    
    returns.sort((a, b) => a - b);
    const percentileIndex = Math.floor((1 - confidence) * returns.length);
    const varReturn = returns[percentileIndex];
    
    const portfolioValue = portfolio.totalValue;
    const varAmount = Math.abs(varReturn * portfolioValue * Math.sqrt(horizon));
    const varPercent = Math.abs(varReturn * Math.sqrt(horizon));
    
    return {
      method: 'historical',
      confidence,
      horizon,
      varAmount,
      varPercent,
      portfolioValue,
      worstReturn: Math.min(...returns),
      bestReturn: Math.max(...returns),
      avgReturn: mean(returns),
      volatility: standardDeviation(returns),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Parametric VaR calculation
   */
  async calculateParametricVaR(portfolio, confidence, horizon) {
    // Simulate portfolio statistics
    const avgReturn = 0.0008; // 0.08% daily return
    const volatility = 0.02; // 2% daily volatility
    
    // Z-score for given confidence level
    const zScores = {
      0.90: 1.282,
      0.95: 1.645,
      0.975: 1.960,
      0.99: 2.326,
      0.999: 3.090
    };
    
    const zScore = zScores[confidence] || 1.645;
    
    // VaR = (μ - z * σ) * √horizon * Portfolio Value
    const expectedReturn = avgReturn * horizon;
    const portfolioVolatility = volatility * Math.sqrt(horizon);
    const varReturn = expectedReturn - (zScore * portfolioVolatility);
    
    const portfolioValue = portfolio.totalValue;
    const varAmount = Math.abs(varReturn * portfolioValue);
    const varPercent = Math.abs(varReturn);
    
    return {
      method: 'parametric',
      confidence,
      horizon,
      varAmount,
      varPercent,
      portfolioValue,
      expectedReturn,
      volatility: portfolioVolatility,
      zScore,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Monte Carlo VaR calculation
   */
  async calculateMonteCarloVaR(portfolio, confidence, horizon, simulations = 10000) {
    const simulatedReturns = [];
    
    // Simulate portfolio returns
    const avgReturn = 0.0008; // 0.08% daily return
    const volatility = 0.02; // 2% daily volatility
    
    for (let i = 0; i < simulations; i++) {
      let totalReturn = 0;
      
      for (let day = 0; day < horizon; day++) {
        // Generate random return using normal distribution approximation
        const randomReturn = this.generateNormalRandom(avgReturn, volatility);
        totalReturn += randomReturn;
      }
      
      simulatedReturns.push(totalReturn);
    }
    
    simulatedReturns.sort((a, b) => a - b);
    const percentileIndex = Math.floor((1 - confidence) * simulations);
    const varReturn = simulatedReturns[percentileIndex];
    
    const portfolioValue = portfolio.totalValue;
    const varAmount = Math.abs(varReturn * portfolioValue);
    const varPercent = Math.abs(varReturn);
    
    return {
      method: 'monte_carlo',
      confidence,
      horizon,
      simulations,
      varAmount,
      varPercent,
      portfolioValue,
      worstCase: Math.min(...simulatedReturns),
      bestCase: Math.max(...simulatedReturns),
      avgReturn: mean(simulatedReturns),
      volatility: standardDeviation(simulatedReturns),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate Expected Shortfall (Conditional VaR)
   */
  async calculateExpectedShortfall(portfolioId, confidence = 0.95, horizon = 1) {
    const varResult = await this.calculateVaR(portfolioId, confidence, horizon, 'historical');
    
    // For simplicity, ES is approximately 1.3 times VaR for normal distribution
    const expectedShortfall = varResult.varAmount * 1.3;
    const esPercent = varResult.varPercent * 1.3;
    
    return {
      ...varResult,
      expectedShortfall,
      esPercent,
      ratio: expectedShortfall / varResult.varAmount,
      description: `Expected loss given that loss exceeds ${(confidence * 100)}% VaR`
    };
  }

  /**
   * Calculate maximum drawdown protection
   */
  calculateMaxDrawdownProtection(portfolioId, maxDrawdown = null) {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const maxAllowedDrawdown = maxDrawdown || portfolio.riskLimits.maxPortfolioDrawdown;
    const currentValue = portfolio.totalValue;
    
    // Simulate peak value (in real implementation, this would be tracked)
    const peakValue = currentValue * 1.1; // Assume 10% higher peak
    const currentDrawdown = (peakValue - currentValue) / peakValue;
    
    const remainingDrawdownCapacity = maxAllowedDrawdown - currentDrawdown;
    const stopLossLevel = currentValue * (1 - remainingDrawdownCapacity);
    
    return {
      currentValue,
      peakValue,
      currentDrawdown: currentDrawdown.toFixed(4),
      currentDrawdownPercent: (currentDrawdown * 100).toFixed(2),
      maxAllowedDrawdown: maxAllowedDrawdown.toFixed(4),
      remainingCapacity: remainingDrawdownCapacity.toFixed(4),
      stopLossLevel: stopLossLevel.toFixed(2),
      riskStatus: currentDrawdown > maxAllowedDrawdown * 0.8 ? 'WARNING' : 'OK',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate correlation-based risk metrics
   */
  async calculateCorrelationRisk(portfolioId, newSymbol = null) {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const symbols = Array.from(portfolio.positions.keys());
    if (newSymbol) {
      symbols.push(newSymbol);
    }

    if (symbols.length < 2) {
      // Handle case with fewer than 2 symbols
      return {
        symbols,
        correlationMatrix: [],
        avgCorrelation: '0.0000',
        maxCorrelation: '0.0000',
        portfolioConcentration: (1.0).toFixed(4),
        diversificationRatio: (1.0).toFixed(4),
        riskAssessment: {
          correlation: 'OK',
          concentration: symbols.length === 1 ? 'HIGH' : 'OK',
          diversification: 'LOW'
        },
        recommendations: symbols.length === 1 ? [{
          type: 'DIVERSIFY',
          priority: 'HIGH',
          message: 'Portfolio has only one position, consider adding more diverse assets'
        }] : [],
        timestamp: new Date().toISOString()
      };
    }

    // Generate correlation matrix (in real implementation, use historical data)
    const correlationMatrix = this.generateCorrelationMatrix(symbols);
    
    // Calculate portfolio concentration risk
    const weights = [];
    const correlations = [];
    
    symbols.forEach((symbol, i) => {
      const position = portfolio.positions.get(symbol);
      const weight = position ? position.weight : 0.05; // Default weight for new symbol
      weights.push(weight);
      
      symbols.forEach((otherSymbol, j) => {
        if (i !== j) {
          correlations.push(correlationMatrix[i][j]);
        }
      });
    });

    const avgCorrelation = correlations.length > 0 ? mean(correlations) : 0;
    const maxCorrelation = correlations.length > 0 ? Math.max(...correlations) : 0;
    const portfolioConcentration = this.calculateHerfindahlIndex(weights);
    
    // Diversification ratio
    const weightedAvgVol = 0.02; // Simplified assumption
    const portfolioVol = 0.015; // Simplified assumption
    const diversificationRatio = weightedAvgVol / portfolioVol;

    return {
      symbols,
      correlationMatrix,
      avgCorrelation: avgCorrelation.toFixed(4),
      maxCorrelation: maxCorrelation.toFixed(4),
      portfolioConcentration: portfolioConcentration.toFixed(4),
      diversificationRatio: diversificationRatio.toFixed(4),
      riskAssessment: {
        correlation: maxCorrelation > portfolio.riskLimits.maxCorrelation ? 'HIGH' : 'OK',
        concentration: portfolioConcentration > 0.25 ? 'HIGH' : 'OK',
        diversification: diversificationRatio < 1.2 ? 'LOW' : 'OK'
      },
      recommendations: this.generateCorrelationRecommendations(
        avgCorrelation,
        maxCorrelation,
        portfolioConcentration,
        portfolio.riskLimits
      ),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Real-time risk monitoring
   */
  async performRealTimeRiskCheck(portfolioId) {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const riskChecks = {
      timestamp: new Date().toISOString(),
      portfolioId,
      checks: []
    };

    try {
      // Position size checks
      portfolio.positions.forEach(position => {
        if (position.weight > portfolio.riskLimits.maxPositionSize) {
          riskChecks.checks.push({
            type: 'POSITION_SIZE',
            severity: 'HIGH',
            symbol: position.symbol,
            current: position.weight.toFixed(4),
            limit: portfolio.riskLimits.maxPositionSize.toFixed(4),
            message: `Position size exceeds limit: ${(position.weight * 100).toFixed(2)}% > ${(portfolio.riskLimits.maxPositionSize * 100).toFixed(2)}%`
          });
        }
      });

      // VaR check
      const varResult = await this.calculateVaR(portfolioId, 0.95, 1, 'parametric');
      if (varResult.varPercent > portfolio.riskLimits.maxVaR) {
        riskChecks.checks.push({
          type: 'VAR_BREACH',
          severity: 'HIGH',
          current: varResult.varPercent.toFixed(4),
          limit: portfolio.riskLimits.maxVaR.toFixed(4),
          message: `VaR exceeds limit: ${(varResult.varPercent * 100).toFixed(2)}% > ${(portfolio.riskLimits.maxVaR * 100).toFixed(2)}%`
        });
      }

      // Drawdown check
      const drawdownResult = this.calculateMaxDrawdownProtection(portfolioId);
      if (parseFloat(drawdownResult.currentDrawdown) > portfolio.riskLimits.maxPortfolioDrawdown * 0.8) {
        riskChecks.checks.push({
          type: 'DRAWDOWN_WARNING',
          severity: parseFloat(drawdownResult.currentDrawdown) > portfolio.riskLimits.maxPortfolioDrawdown ? 'HIGH' : 'MEDIUM',
          current: drawdownResult.currentDrawdown,
          limit: portfolio.riskLimits.maxPortfolioDrawdown.toFixed(4),
          message: `Drawdown approaching limit: ${drawdownResult.currentDrawdownPercent}%`
        });
      }

      // Leverage check
      if (portfolio.leverage > portfolio.riskLimits.maxLeverage) {
        riskChecks.checks.push({
          type: 'LEVERAGE',
          severity: 'HIGH',
          current: portfolio.leverage.toFixed(2),
          limit: portfolio.riskLimits.maxLeverage.toFixed(2),
          message: `Leverage exceeds limit: ${portfolio.leverage.toFixed(2)}x > ${portfolio.riskLimits.maxLeverage.toFixed(2)}x`
        });
      }

      // Correlation check
      const correlationResult = await this.calculateCorrelationRisk(portfolioId);
      if (parseFloat(correlationResult.maxCorrelation) > portfolio.riskLimits.maxCorrelation) {
        riskChecks.checks.push({
          type: 'CORRELATION',
          severity: 'MEDIUM',
          current: correlationResult.maxCorrelation,
          limit: portfolio.riskLimits.maxCorrelation.toFixed(4),
          message: `High correlation detected: ${(parseFloat(correlationResult.maxCorrelation) * 100).toFixed(1)}%`
        });
      }

    } catch (error) {
      logger.error(`Error performing risk check for portfolio ${portfolioId}:`, error);
      riskChecks.error = error.message;
    }

    // Store alerts for high severity issues
    const highSeverityAlerts = riskChecks.checks.filter(check => check.severity === 'HIGH');
    if (highSeverityAlerts.length > 0) {
      this.alerts.push({
        portfolioId,
        timestamp: riskChecks.timestamp,
        alerts: highSeverityAlerts
      });
    }

    return riskChecks;
  }

  /**
   * Generate risk report
   */
  async generateRiskReport(portfolioId) {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const [varResult, correlationResult, drawdownResult] = await Promise.all([
      this.calculateVaR(portfolioId, 0.95, 1, 'parametric'),
      this.calculateCorrelationRisk(portfolioId),
      this.calculateMaxDrawdownProtection(portfolioId)
    ]);

    const expectedShortfall = await this.calculateExpectedShortfall(portfolioId, 0.95, 1);
    const riskChecks = await this.performRealTimeRiskCheck(portfolioId);

    return {
      portfolioId,
      timestamp: new Date().toISOString(),
      portfolioSummary: {
        totalValue: portfolio.totalValue,
        numPositions: portfolio.positions.size,
        leverage: portfolio.leverage,
        cash: portfolio.cash
      },
      riskMetrics: {
        var95: varResult,
        expectedShortfall,
        maxDrawdown: drawdownResult,
        correlation: correlationResult
      },
      riskLimits: portfolio.riskLimits,
      riskChecks,
      overallRiskScore: this.calculateOverallRiskScore(varResult, correlationResult, drawdownResult),
      recommendations: this.generateRiskRecommendations(riskChecks, varResult, correlationResult)
    };
  }

  /**
   * Helper methods
   */
  generateSimulatedReturns(numDays) {
    const returns = [];
    for (let i = 0; i < numDays; i++) {
      returns.push(this.generateNormalRandom(0.0008, 0.02));
    }
    return returns;
  }

  generateNormalRandom(mean, stdDev) {
    // Box-Muller transformation for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  generateCorrelationMatrix(symbols) {
    const n = symbols.length;
    const matrix = [];
    
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          // Generate realistic correlations (0.1 to 0.8)
          matrix[i][j] = 0.1 + Math.random() * 0.7;
          matrix[j][i] = matrix[i][j]; // Symmetric matrix
        }
      }
    }
    
    return matrix;
  }

  calculateHerfindahlIndex(weights) {
    return weights.reduce((sum, weight) => sum + weight * weight, 0);
  }

  generateCorrelationRecommendations(avgCorr, maxCorr, concentration, limits) {
    const recommendations = [];
    
    if (maxCorr > limits.maxCorrelation) {
      recommendations.push({
        type: 'REDUCE_CORRELATION',
        priority: 'HIGH',
        message: 'Consider reducing exposure to highly correlated assets'
      });
    }
    
    if (concentration > 0.25) {
      recommendations.push({
        type: 'DIVERSIFY',
        priority: 'MEDIUM',
        message: 'Portfolio is concentrated, consider adding more diverse assets'
      });
    }
    
    if (avgCorr > 0.6) {
      recommendations.push({
        type: 'ALTERNATIVE_ASSETS',
        priority: 'LOW',
        message: 'Consider adding alternative assets to reduce overall correlation'
      });
    }
    
    return recommendations;
  }

  calculateOverallRiskScore(varResult, correlationResult, drawdownResult) {
    let score = 0;
    
    // VaR component (0-40 points)
    const varScore = Math.min(40, (varResult.varPercent / 0.05) * 40);
    score += varScore;
    
    // Correlation component (0-30 points)
    const corrScore = Math.min(30, (parseFloat(correlationResult.maxCorrelation) / 0.8) * 30);
    score += corrScore;
    
    // Drawdown component (0-30 points)
    const drawdownScore = Math.min(30, (parseFloat(drawdownResult.currentDrawdown) / 0.2) * 30);
    score += drawdownScore;
    
    return {
      total: Math.round(score),
      components: {
        var: Math.round(varScore),
        correlation: Math.round(corrScore),
        drawdown: Math.round(drawdownScore)
      },
      rating: score < 30 ? 'LOW' : score < 60 ? 'MEDIUM' : 'HIGH'
    };
  }

  generateRiskRecommendations(riskChecks, varResult, correlationResult) {
    const recommendations = [];
    
    riskChecks.checks.forEach(check => {
      switch (check.type) {
        case 'POSITION_SIZE':
          recommendations.push({
            action: 'REDUCE_POSITION',
            symbol: check.symbol,
            priority: 'HIGH',
            message: `Reduce ${check.symbol} position from ${(parseFloat(check.current) * 100).toFixed(2)}% to below ${(parseFloat(check.limit) * 100).toFixed(2)}%`
          });
          break;
        case 'VAR_BREACH':
          recommendations.push({
            action: 'REDUCE_RISK',
            priority: 'HIGH',
            message: 'Reduce overall portfolio risk by decreasing position sizes or hedging'
          });
          break;
        case 'DRAWDOWN_WARNING':
          recommendations.push({
            action: 'RISK_MANAGEMENT',
            priority: 'HIGH',
            message: 'Implement stricter stop losses and consider defensive positioning'
          });
          break;
      }
    });
    
    return recommendations;
  }

  /**
   * Public interface methods
   */
  getPortfolio(portfolioId) {
    return this.portfolios.get(portfolioId);
  }

  listPortfolios() {
    return Array.from(this.portfolios.keys());
  }

  getRecentAlerts(portfolioId = null, limit = 10) {
    let alerts = this.alerts;
    
    if (portfolioId) {
      alerts = alerts.filter(alert => alert.portfolioId === portfolioId);
    }
    
    return alerts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  getPositionSizingMethods() {
    return Object.entries(this.positionSizingMethods).map(([key, value]) => ({
      id: value,
      name: key.replace(/_/g, ' '),
      description: this.getPositionSizingDescription(value)
    }));
  }

  getPositionSizingDescription(method) {
    const descriptions = {
      fixed_percentage: 'Allocate fixed percentage of portfolio to each position',
      kelly_criterion: 'Optimal fraction based on win rate and average win/loss',
      volatility_based: 'Size inversely proportional to asset volatility',
      risk_parity: 'Equal risk contribution from each asset',
      equal_weight: 'Equal dollar amount in each position',
      market_cap_weighted: 'Weight by market capitalization'
    };
    
    return descriptions[method] || 'Unknown method';
  }
}

module.exports = RiskManagementSystem;