const { mean, standardDeviation, covariance } = require('simple-statistics');
const logger = require('./logger');

class PortfolioOptimizer {
  constructor() {
    this.riskFreeRate = 0.02; // 2% annual risk-free rate
    this.optimizationMethods = ['mean_reversion', 'momentum', 'equal_weight', 'risk_parity', 'minimum_variance'];
    
    logger.info('PortfolioOptimizer initialized', { 
      service: 'portfolio-optimizer',
      methods: this.optimizationMethods.length 
    });
  }

  /**
   * Optimize portfolio allocation using specified method
   */
  async optimizePortfolio(assets, historicalData, method = 'risk_parity', constraints = {}) {
    try {
      const startTime = Date.now();
      
      // Default constraints
      const defaultConstraints = {
        maxWeight: 0.4,      // Maximum 40% allocation per asset
        minWeight: 0.05,     // Minimum 5% allocation per asset
        maxAssets: 10,       // Maximum number of assets
        riskTolerance: 0.15, // 15% maximum portfolio volatility
        rebalanceFreq: 30    // Rebalance every 30 days
      };

      const config = { ...defaultConstraints, ...constraints };
      
      logger.info('Starting portfolio optimization', {
        method,
        assetsCount: assets.length,
        constraints: config,
        service: 'portfolio-optimizer'
      });

      // Validate inputs
      if (!assets || assets.length === 0) {
        throw new Error('No assets provided for optimization');
      }

      if (!historicalData || Object.keys(historicalData).length === 0) {
        throw new Error('No historical data provided');
      }

      // Calculate returns and statistics
      const returns = this.calculateReturns(historicalData);
      const statistics = this.calculateStatistics(returns);
      
      // Apply optimization method
      let weights;
      switch (method) {
        case 'mean_reversion':
          weights = this.meanReversionOptimization(statistics, config);
          break;
        case 'momentum':
          weights = this.momentumOptimization(statistics, config);
          break;
        case 'equal_weight':
          weights = this.equalWeightOptimization(assets, config);
          break;
        case 'risk_parity':
          weights = this.riskParityOptimization(statistics, config);
          break;
        case 'minimum_variance':
          weights = this.minimumVarianceOptimization(statistics, config);
          break;
        default:
          throw new Error(`Unknown optimization method: ${method}`);
      }

      // Normalize weights to sum to 1
      weights = this.normalizeWeights(weights, config);

      // Calculate portfolio metrics
      const portfolioMetrics = this.calculatePortfolioMetrics(weights, statistics);

      const optimization = {
        method,
        assets: assets.map((asset, i) => ({
          symbol: asset,
          weight: weights[i],
          allocation: weights[i] * 100
        })).filter(asset => asset.weight > 0.001).sort((a, b) => b.weight - a.weight),
        metrics: portfolioMetrics,
        constraints: config,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      logger.info('Portfolio optimization completed', {
        method,
        assetsAllocated: optimization.assets.length,
        expectedReturn: portfolioMetrics.expectedReturn,
        volatility: portfolioMetrics.volatility,
        sharpeRatio: portfolioMetrics.sharpeRatio,
        duration: `${optimization.duration}ms`,
        service: 'portfolio-optimizer'
      });

      return optimization;

    } catch (error) {
      logger.error('Portfolio optimization failed', {
        method,
        error: error.message,
        service: 'portfolio-optimizer'
      });
      throw error;
    }
  }

  /**
   * Calculate returns from historical price data
   */
  calculateReturns(historicalData) {
    const returns = {};
    
    for (const [symbol, prices] of Object.entries(historicalData)) {
      if (!prices || prices.length < 2) continue;
      
      returns[symbol] = [];
      for (let i = 1; i < prices.length; i++) {
        const returnRate = (prices[i] - prices[i-1]) / prices[i-1];
        returns[symbol].push(returnRate);
      }
    }
    
    return returns;
  }

  /**
   * Calculate statistical measures for returns
   */
  calculateStatistics(returns) {
    const statistics = {};
    const symbols = Object.keys(returns);
    
    // Calculate means and standard deviations
    for (const symbol of symbols) {
      if (returns[symbol].length === 0) continue;
      
      statistics[symbol] = {
        mean: mean(returns[symbol]),
        stdDev: standardDeviation(returns[symbol]),
        returns: returns[symbol]
      };
    }

    // Calculate correlation matrix
    const correlationMatrix = {};
    for (const symbol1 of symbols) {
      correlationMatrix[symbol1] = {};
      for (const symbol2 of symbols) {
        if (returns[symbol1].length === 0 || returns[symbol2].length === 0) {
          correlationMatrix[symbol1][symbol2] = 0;
          continue;
        }
        
        try {
          correlationMatrix[symbol1][symbol2] = symbol1 === symbol2 ? 1 : 
            this.calculateCorrelation(returns[symbol1], returns[symbol2]);
        } catch (error) {
          correlationMatrix[symbol1][symbol2] = 0;
        }
      }
    }

    return { individual: statistics, correlation: correlationMatrix };
  }

  /**
   * Calculate correlation between two return series
   */
  calculateCorrelation(returns1, returns2) {
    const minLength = Math.min(returns1.length, returns2.length);
    const r1 = returns1.slice(0, minLength);
    const r2 = returns2.slice(0, minLength);
    
    if (r1.length < 2) return 0;
    
    const mean1 = mean(r1);
    const mean2 = mean(r2);
    const std1 = standardDeviation(r1);
    const std2 = standardDeviation(r2);
    
    if (std1 === 0 || std2 === 0) return 0;
    
    let correlation = 0;
    for (let i = 0; i < r1.length; i++) {
      correlation += (r1[i] - mean1) * (r2[i] - mean2);
    }
    
    correlation /= (r1.length - 1) * std1 * std2;
    return Math.max(-1, Math.min(1, correlation));
  }

  /**
   * Equal weight optimization
   */
  equalWeightOptimization(assets, config) {
    const weight = 1 / Math.min(assets.length, config.maxAssets);
    return new Array(assets.length).fill(weight);
  }

  /**
   * Risk parity optimization
   */
  riskParityOptimization(statistics, config) {
    const symbols = Object.keys(statistics.individual);
    const weights = new Array(symbols.length);
    
    // Start with inverse volatility weights
    let totalInvVol = 0;
    const invVolatilities = symbols.map(symbol => {
      const invVol = 1 / (statistics.individual[symbol].stdDev || 0.01);
      totalInvVol += invVol;
      return invVol;
    });
    
    // Normalize to get risk parity weights
    for (let i = 0; i < weights.length; i++) {
      weights[i] = invVolatilities[i] / totalInvVol;
    }
    
    return weights;
  }

  /**
   * Minimum variance optimization (simplified)
   */
  minimumVarianceOptimization(statistics, config) {
    const symbols = Object.keys(statistics.individual);
    const n = symbols.length;
    const weights = new Array(n);
    
    // Simple approach: inverse variance weighting
    let totalInvVar = 0;
    const invVariances = symbols.map(symbol => {
      const variance = Math.pow(statistics.individual[symbol].stdDev || 0.01, 2);
      const invVar = 1 / variance;
      totalInvVar += invVar;
      return invVar;
    });
    
    for (let i = 0; i < n; i++) {
      weights[i] = invVariances[i] / totalInvVar;
    }
    
    return weights;
  }

  /**
   * Momentum-based optimization
   */
  momentumOptimization(statistics, config) {
    const symbols = Object.keys(statistics.individual);
    const weights = new Array(symbols.length);
    
    // Calculate momentum scores (recent returns)
    const momentumScores = symbols.map(symbol => {
      const returns = statistics.individual[symbol].returns;
      if (returns.length < 5) return 0;
      
      // Use last 5 periods for momentum
      const recentReturns = returns.slice(-5);
      return mean(recentReturns);
    });
    
    // Convert to positive weights
    const minScore = Math.min(...momentumScores);
    const adjustedScores = momentumScores.map(score => score - minScore + 0.001);
    const totalScore = adjustedScores.reduce((sum, score) => sum + score, 0);
    
    for (let i = 0; i < weights.length; i++) {
      weights[i] = adjustedScores[i] / totalScore;
    }
    
    return weights;
  }

  /**
   * Mean reversion optimization
   */
  meanReversionOptimization(statistics, config) {
    const symbols = Object.keys(statistics.individual);
    const weights = new Array(symbols.length);
    
    // Calculate mean reversion scores (inverse of recent returns)
    const meanReversionScores = symbols.map(symbol => {
      const returns = statistics.individual[symbol].returns;
      if (returns.length < 5) return 1;
      
      const recentReturns = returns.slice(-5);
      const avgReturn = mean(recentReturns);
      
      // Higher weight for assets with negative recent returns (mean reversion)
      return 1 / (1 + Math.max(0, avgReturn));
    });
    
    const totalScore = meanReversionScores.reduce((sum, score) => sum + score, 0);
    
    for (let i = 0; i < weights.length; i++) {
      weights[i] = meanReversionScores[i] / totalScore;
    }
    
    return weights;
  }

  /**
   * Apply constraints and normalize weights
   */
  normalizeWeights(weights, config) {
    // Apply min/max weight constraints
    for (let i = 0; i < weights.length; i++) {
      weights[i] = Math.max(config.minWeight, Math.min(config.maxWeight, weights[i]));
    }
    
    // Normalize to sum to 1
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight > 0) {
      for (let i = 0; i < weights.length; i++) {
        weights[i] /= totalWeight;
      }
    }
    
    return weights;
  }

  /**
   * Calculate portfolio metrics
   */
  calculatePortfolioMetrics(weights, statistics) {
    const symbols = Object.keys(statistics.individual);
    
    // Portfolio expected return
    let expectedReturn = 0;
    for (let i = 0; i < symbols.length; i++) {
      expectedReturn += weights[i] * statistics.individual[symbols[i]].mean;
    }
    
    // Portfolio variance
    let portfolioVariance = 0;
    for (let i = 0; i < symbols.length; i++) {
      for (let j = 0; j < symbols.length; j++) {
        const correlation = statistics.correlation[symbols[i]][symbols[j]] || 0;
        const volatility1 = statistics.individual[symbols[i]].stdDev;
        const volatility2 = statistics.individual[symbols[j]].stdDev;
        
        portfolioVariance += weights[i] * weights[j] * correlation * volatility1 * volatility2;
      }
    }
    
    const portfolioVolatility = Math.sqrt(Math.max(0, portfolioVariance));
    const sharpeRatio = portfolioVolatility > 0 ? 
      (expectedReturn * 252 - this.riskFreeRate) / (portfolioVolatility * Math.sqrt(252)) : 0;
    
    return {
      expectedReturn: expectedReturn * 252, // Annualized
      volatility: portfolioVolatility * Math.sqrt(252), // Annualized
      sharpeRatio,
      maxDrawdown: this.estimateMaxDrawdown(expectedReturn, portfolioVolatility),
      diversificationRatio: this.calculateDiversificationRatio(weights, statistics)
    };
  }

  /**
   * Estimate maximum drawdown
   */
  estimateMaxDrawdown(expectedReturn, volatility) {
    // Simple estimation based on volatility
    return -2 * volatility * Math.sqrt(252);
  }

  /**
   * Calculate diversification ratio
   */
  calculateDiversificationRatio(weights, statistics) {
    const symbols = Object.keys(statistics.individual);
    
    // Weighted average volatility
    let weightedAvgVol = 0;
    for (let i = 0; i < symbols.length; i++) {
      weightedAvgVol += weights[i] * statistics.individual[symbols[i]].stdDev;
    }
    
    // Portfolio volatility (calculated in metrics)
    let portfolioVol = 0;
    for (let i = 0; i < symbols.length; i++) {
      for (let j = 0; j < symbols.length; j++) {
        const correlation = statistics.correlation[symbols[i]][symbols[j]] || 0;
        const vol1 = statistics.individual[symbols[i]].stdDev;
        const vol2 = statistics.individual[symbols[j]].stdDev;
        
        portfolioVol += weights[i] * weights[j] * correlation * vol1 * vol2;
      }
    }
    portfolioVol = Math.sqrt(Math.max(0, portfolioVol));
    
    return portfolioVol > 0 ? weightedAvgVol / portfolioVol : 1;
  }

  /**
   * Get available optimization methods
   */
  getMethods() {
    return this.optimizationMethods.map(method => ({
      name: method,
      description: this.getMethodDescription(method)
    }));
  }

  /**
   * Get method description
   */
  getMethodDescription(method) {
    const descriptions = {
      'equal_weight': 'Equal allocation across all assets',
      'risk_parity': 'Allocate based on inverse volatility (risk parity)',
      'minimum_variance': 'Minimize portfolio volatility',
      'momentum': 'Higher allocation to assets with positive momentum',
      'mean_reversion': 'Higher allocation to assets with negative recent returns'
    };
    
    return descriptions[method] || 'Custom optimization method';
  }
}

module.exports = new PortfolioOptimizer();