const { mean, standardDeviation, covariance, variance } = require('simple-statistics');
const { Matrix } = require('ml-matrix');
const logger = require('./logger');

class AdvancedPortfolioOptimizer {
  constructor() {
    this.riskFreeRate = 0.02; // 2% annual risk-free rate
    this.optimizationMethods = [
      'mean_reversion', 
      'momentum', 
      'equal_weight', 
      'risk_parity', 
      'minimum_variance',
      // Advanced methods
      'black_litterman',
      'maximum_sharpe',
      'maximum_diversification',
      'hierarchical_risk_parity',
      'kelly_criterion',
      'mean_variance_optimization',
      'conditional_value_at_risk',
      'robust_optimization'
    ];
    
    logger.info('Advanced PortfolioOptimizer initialized', { 
      service: 'portfolio-optimizer',
      methods: this.optimizationMethods.length 
    });
  }

  /**
   * Optimize portfolio allocation using advanced methods
   */
  async optimizePortfolio(assets, historicalData, method = 'risk_parity', constraints = {}) {
    try {
      const startTime = Date.now();
      
      // Enhanced default constraints
      const defaultConstraints = {
        maxWeight: 0.4,      // Maximum 40% allocation per asset
        minWeight: 0.01,     // Minimum 1% allocation per asset
        maxAssets: 15,       // Maximum number of assets
        riskTolerance: 0.15, // 15% maximum portfolio volatility
        rebalanceFreq: 30,   // Rebalance every 30 days
        leverage: 1.0,       // No leverage by default
        shortSelling: false, // No short selling by default
        transactionCosts: 0.001, // 0.1% transaction cost
        confidenceLevel: 0.95,   // For VaR calculations
        lookbackPeriod: 252      // 1 year of daily data
      };

      const config = { ...defaultConstraints, ...constraints };
      
      logger.info('Starting advanced portfolio optimization', {
        method,
        assetsCount: assets.length,
        constraints: config,
        service: 'advanced-portfolio-optimizer'
      });

      // Validate inputs
      if (!assets || assets.length === 0) {
        throw new Error('No assets provided for optimization');
      }

      if (!historicalData || Object.keys(historicalData).length === 0) {
        throw new Error('No historical data provided');
      }

      // Calculate enhanced returns and statistics
      const returns = this.calculateReturns(historicalData);
      const statistics = this.calculateAdvancedStatistics(returns);
      
      // Apply optimization method
      let weights;
      switch (method) {
        case 'black_litterman':
          weights = await this.blackLittermanOptimization(statistics, config);
          break;
        case 'maximum_sharpe':
          weights = this.maximumSharpeOptimization(statistics, config);
          break;
        case 'maximum_diversification':
          weights = this.maximumDiversificationOptimization(statistics, config);
          break;
        case 'hierarchical_risk_parity':
          weights = this.hierarchicalRiskParityOptimization(statistics, config);
          break;
        case 'kelly_criterion':
          weights = this.kellyCriterionOptimization(statistics, config);
          break;
        case 'mean_variance_optimization':
          weights = this.meanVarianceOptimization(statistics, config);
          break;
        case 'conditional_value_at_risk':
          weights = this.conditionalVaROptimization(statistics, config);
          break;
        case 'robust_optimization':
          weights = this.robustOptimization(statistics, config);
          break;
        // Fall back to basic methods
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

      // Apply constraints and normalize weights
      weights = this.applyConstraints(weights, config);
      weights = this.normalizeWeights(weights, config);

      // Calculate comprehensive portfolio metrics
      const portfolioMetrics = this.calculateAdvancedPortfolioMetrics(weights, statistics, config);

      const optimization = {
        method,
        assets: assets.map((asset, i) => ({
          symbol: asset,
          weight: weights[i],
          allocation: weights[i] * 100,
          expectedReturn: statistics.expectedReturns[i],
          volatility: statistics.volatilities[i],
          sharpeRatio: (statistics.expectedReturns[i] - this.riskFreeRate) / statistics.volatilities[i]
        })).filter(asset => asset.weight > 0.001).sort((a, b) => b.weight - a.weight),
        metrics: portfolioMetrics,
        constraints: config,
        riskAnalysis: this.calculateRiskAnalysis(weights, statistics, config),
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      logger.info('Advanced portfolio optimization completed', {
        method,
        assetsAllocated: optimization.assets.length,
        expectedReturn: portfolioMetrics.expectedReturn,
        volatility: portfolioMetrics.volatility,
        sharpeRatio: portfolioMetrics.sharpeRatio,
        VaR: portfolioMetrics.valueAtRisk,
        duration: `${optimization.duration}ms`
      });

      return optimization;

    } catch (error) {
      logger.error('Portfolio optimization failed', {
        method,
        error: error.message,
        service: 'advanced-portfolio-optimizer'
      });
      throw error;
    }
  }

  /**
   * Black-Litterman Model Implementation
   */
  async blackLittermanOptimization(statistics, config) {
    logger.info('Applying Black-Litterman optimization');
    
    const { expectedReturns, covarianceMatrix } = statistics;
    const n = expectedReturns.length;
    
    // Market capitalization weights (proxy with equal weights for simplicity)
    const marketWeights = new Array(n).fill(1 / n);
    
    // Implied equilibrium returns
    const riskAversion = 3.0; // Typical risk aversion parameter
    const impliedReturns = Matrix.mul(
      Matrix.mul([riskAversion], covarianceMatrix),
      Matrix.columnVector(marketWeights)
    ).to1DArray();
    
    // Investor views (simplified - momentum-based views)
    const views = this.generateInvestorViews(statistics);
    const P = views.pickingMatrix; // Which assets the views refer to
    const Q = views.viewReturns;   // Expected returns from views
    const omega = views.uncertainty; // Uncertainty in views
    
    // Black-Litterman formula
    // μ_BL = [(τΣ)^-1 + P'Ω^-1P]^-1 [(τΣ)^-1μ + P'Ω^-1Q]
    const tau = 0.025; // Scaling factor
    const tauSigma = Matrix.mul([tau], covarianceMatrix);
    const tauSigmaInv = Matrix.inverse(tauSigma);
    
    const term1 = Matrix.add(tauSigmaInv, Matrix.mul(Matrix.transpose(P), Matrix.mul(Matrix.inverse(omega), P)));
    const term2 = Matrix.add(
      Matrix.mul(tauSigmaInv, Matrix.columnVector(impliedReturns)),
      Matrix.mul(Matrix.transpose(P), Matrix.mul(Matrix.inverse(omega), Matrix.columnVector(Q)))
    );
    
    const blReturns = Matrix.mul(Matrix.inverse(term1), term2).to1DArray();
    
    // Optimize portfolio with Black-Litterman returns
    return this.meanVarianceOptimizationWithReturns(blReturns, covarianceMatrix, config);
  }

  /**
   * Maximum Sharpe Ratio Optimization
   */
  maximumSharpeOptimization(statistics, config) {
    logger.info('Applying Maximum Sharpe ratio optimization');
    
    const { expectedReturns, covarianceMatrix } = statistics;
    const n = expectedReturns.length;
    
    // Convert to excess returns
    const excessReturns = expectedReturns.map(r => r - this.riskFreeRate);
    
    // Solve for maximum Sharpe ratio portfolio
    // w = Σ^-1 * (μ - rf) / 1'Σ^-1(μ - rf)
    const covInv = Matrix.inverse(covarianceMatrix);
    const ones = new Array(n).fill(1);
    
    const numerator = Matrix.mul(covInv, Matrix.columnVector(excessReturns)).to1DArray();
    const denominator = Matrix.mul(
      Matrix.mul([ones], covInv),
      Matrix.columnVector(excessReturns)
    ).get(0, 0);
    
    return numerator.map(w => w / denominator);
  }

  /**
   * Maximum Diversification Ratio Optimization
   */
  maximumDiversificationOptimization(statistics, config) {
    logger.info('Applying Maximum Diversification optimization');
    
    const { volatilities, correlationMatrix } = statistics;
    const n = volatilities.length;
    
    // Diversification ratio = (w'σ) / sqrt(w'Σw)
    // Maximize this by minimizing portfolio variance subject to w'σ = 1
    
    // Use inverse volatility as starting point
    const invVolWeights = volatilities.map(vol => 1 / vol);
    const sumInvVol = invVolWeights.reduce((sum, w) => sum + w, 0);
    
    return invVolWeights.map(w => w / sumInvVol);
  }

  /**
   * Hierarchical Risk Parity (HRP) Optimization
   */
  hierarchicalRiskParityOptimization(statistics, config) {
    logger.info('Applying Hierarchical Risk Parity optimization');
    
    const { correlationMatrix, volatilities } = statistics;
    const n = correlationMatrix.rows;
    
    // Step 1: Build distance matrix
    const distanceMatrix = this.buildDistanceMatrix(correlationMatrix);
    
    // Step 2: Perform hierarchical clustering
    const clusters = this.hierarchicalClustering(distanceMatrix);
    
    // Step 3: Allocate weights using risk parity within clusters
    const weights = new Array(n).fill(0);
    this.allocateHRPWeights(clusters, volatilities, weights, 1.0);
    
    return weights;
  }

  /**
   * Kelly Criterion Optimization
   */
  kellyCriterionOptimization(statistics, config) {
    logger.info('Applying Kelly Criterion optimization');
    
    const { expectedReturns, volatilities } = statistics;
    
    // Kelly formula: f = (bp - q) / b
    // where b = odds, p = win probability, q = loss probability
    
    const kellyWeights = expectedReturns.map((expectedReturn, i) => {
      const variance = volatilities[i] * volatilities[i];
      
      // Simplified Kelly: f = μ / σ²
      const kellyFraction = expectedReturn / variance;
      
      // Cap at maximum position size for risk management
      return Math.max(0, Math.min(kellyFraction, config.maxWeight));
    });
    
    return kellyWeights;
  }

  /**
   * Mean-Variance Optimization (Markowitz)
   */
  meanVarianceOptimization(statistics, config) {
    logger.info('Applying Mean-Variance optimization');
    
    const { expectedReturns, covarianceMatrix } = statistics;
    return this.meanVarianceOptimizationWithReturns(expectedReturns, covarianceMatrix, config);
  }

  /**
   * Conditional Value at Risk (CVaR) Optimization
   */
  conditionalVaROptimization(statistics, config) {
    logger.info('Applying Conditional VaR optimization');
    
    const { returns, expectedReturns } = statistics;
    const alpha = 1 - config.confidenceLevel; // e.g., 0.05 for 95% confidence
    
    // Minimize CVaR subject to constraints
    // This is a simplified implementation
    const weights = new Array(expectedReturns.length).fill(0);
    
    // Use minimum variance as base, then adjust for CVaR
    const minVarWeights = this.minimumVarianceOptimization(statistics, config);
    
    // Calculate CVaR for different weight combinations
    let bestWeights = minVarWeights;
    let bestCVaR = this.calculateCVaR(minVarWeights, returns, alpha);
    
    // Simple grid search around minimum variance solution
    for (let iter = 0; iter < 10; iter++) {
      const testWeights = minVarWeights.map(w => w + (Math.random() - 0.5) * 0.1);
      const normalizedWeights = this.normalizeWeights(testWeights, config);
      const cvar = this.calculateCVaR(normalizedWeights, returns, alpha);
      
      if (cvar < bestCVaR) {
        bestCVaR = cvar;
        bestWeights = normalizedWeights;
      }
    }
    
    return bestWeights;
  }

  /**
   * Robust Optimization
   */
  robustOptimization(statistics, config) {
    logger.info('Applying Robust optimization');
    
    const { expectedReturns, covarianceMatrix } = statistics;
    const n = expectedReturns.length;
    
    // Robust optimization considers uncertainty in expected returns
    // Use uncertainty ellipsoid approach
    const uncertainty = 0.1; // 10% uncertainty in expected returns
    
    // Conservative approach: reduce expected returns by uncertainty
    const robustReturns = expectedReturns.map(r => r * (1 - uncertainty));
    
    // Inflate covariance matrix to account for model uncertainty
    const robustCovariance = Matrix.mul([1 + uncertainty], covarianceMatrix);
    
    return this.meanVarianceOptimizationWithReturns(robustReturns, robustCovariance, config);
  }

  /**
   * Calculate advanced statistics including higher moments
   */
  calculateAdvancedStatistics(returns) {
    const assets = Object.keys(returns);
    const n = assets.length;
    
    const expectedReturns = assets.map(asset => mean(returns[asset]));
    const volatilities = assets.map(asset => standardDeviation(returns[asset]));
    
    // Covariance matrix
    const covarianceMatrix = new Matrix(n, n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cov = covariance(returns[assets[i]], returns[assets[j]]);
        covarianceMatrix.set(i, j, cov);
      }
    }
    
    // Correlation matrix
    const correlationMatrix = new Matrix(n, n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const corr = covarianceMatrix.get(i, j) / (volatilities[i] * volatilities[j]);
        correlationMatrix.set(i, j, corr);
      }
    }
    
    // Higher moments
    const skewness = assets.map(asset => this.calculateSkewness(returns[asset]));
    const kurtosis = assets.map(asset => this.calculateKurtosis(returns[asset]));
    
    return {
      assets,
      returns,
      expectedReturns,
      volatilities,
      covarianceMatrix,
      correlationMatrix,
      skewness,
      kurtosis
    };
  }

  /**
   * Calculate advanced portfolio metrics
   */
  calculateAdvancedPortfolioMetrics(weights, statistics, config) {
    const { expectedReturns, covarianceMatrix, returns } = statistics;
    
    // Basic metrics
    const expectedReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
    const variance = this.calculatePortfolioVariance(weights, covarianceMatrix);
    const volatility = Math.sqrt(variance);
    const sharpeRatio = (expectedReturn - this.riskFreeRate) / volatility;
    
    // Advanced metrics
    const valueAtRisk = this.calculateVaR(weights, returns, config.confidenceLevel);
    const conditionalVaR = this.calculateCVaR(weights, returns, 1 - config.confidenceLevel);
    const maxDrawdown = this.calculateMaxDrawdown(weights, returns);
    const informationRatio = this.calculateInformationRatio(weights, returns);
    const calmarRatio = expectedReturn / Math.abs(maxDrawdown);
    const sortinoRatio = this.calculateSortinoRatio(weights, returns);
    
    return {
      expectedReturn: expectedReturn * 252, // Annualized
      volatility: volatility * Math.sqrt(252), // Annualized
      sharpeRatio,
      valueAtRisk,
      conditionalVaR,
      maxDrawdown,
      informationRatio,
      calmarRatio,
      sortinoRatio,
      diversificationRatio: this.calculateDiversificationRatio(weights, statistics)
    };
  }

  /**
   * Calculate comprehensive risk analysis
   */
  calculateRiskAnalysis(weights, statistics, config) {
    const { returns, expectedReturns, volatilities } = statistics;
    
    return {
      concentrationRisk: this.calculateConcentrationRisk(weights),
      correlationRisk: this.calculateCorrelationRisk(weights, statistics),
      liquidityRisk: this.calculateLiquidityRisk(weights),
      drawdownAnalysis: this.calculateDrawdownAnalysis(weights, returns),
      stressTestResults: this.performStressTests(weights, statistics)
    };
  }

  // Utility methods for advanced calculations

  meanVarianceOptimizationWithReturns(expectedReturns, covarianceMatrix, config) {
    const n = expectedReturns.length;
    const ones = new Array(n).fill(1);
    
    try {
      const covInv = Matrix.inverse(covarianceMatrix);
      
      // Efficient frontier calculation
      const A = Matrix.mul(Matrix.mul([expectedReturns], covInv), Matrix.columnVector(expectedReturns)).get(0, 0);
      const B = Matrix.mul(Matrix.mul([expectedReturns], covInv), Matrix.columnVector(ones)).get(0, 0);
      const C = Matrix.mul(Matrix.mul([ones], covInv), Matrix.columnVector(ones)).get(0, 0);
      
      const discriminant = A * C - B * B;
      
      if (discriminant <= 0) {
        // Fall back to equal weights if optimization fails
        return new Array(n).fill(1 / n);
      }
      
      // Target return (use mean of expected returns)
      const targetReturn = mean(expectedReturns);
      
      // Optimal weights
      const lambda1 = (C * targetReturn - B) / discriminant;
      const lambda2 = (A - B * targetReturn) / discriminant;
      
      const term1 = Matrix.mul(covInv, Matrix.columnVector(expectedReturns)).to1DArray();
      const term2 = Matrix.mul(covInv, Matrix.columnVector(ones)).to1DArray();
      
      return term1.map((t1, i) => lambda1 * t1 + lambda2 * term2[i]);
      
    } catch (error) {
      logger.warn('Mean-variance optimization failed, using equal weights');
      return new Array(n).fill(1 / n);
    }
  }

  generateInvestorViews(statistics) {
    const { expectedReturns, assets } = statistics;
    const n = expectedReturns.length;
    
    // Simple momentum-based views
    const P = Matrix.eye(n); // Identity matrix - absolute views
    const Q = expectedReturns.map(r => r * 1.1); // 10% more optimistic
    const omega = Matrix.eye(n).mul(0.01); // 1% uncertainty
    
    return { pickingMatrix: P, viewReturns: Q, uncertainty: omega };
  }

  buildDistanceMatrix(correlationMatrix) {
    const n = correlationMatrix.rows;
    const distanceMatrix = new Matrix(n, n);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // Distance = sqrt((1 - correlation) / 2)
        const correlation = correlationMatrix.get(i, j);
        const distance = Math.sqrt((1 - correlation) / 2);
        distanceMatrix.set(i, j, distance);
      }
    }
    
    return distanceMatrix;
  }

  hierarchicalClustering(distanceMatrix) {
    // Simplified hierarchical clustering - in practice use a proper algorithm
    const n = distanceMatrix.rows;
    const clusters = [];
    
    for (let i = 0; i < n; i++) {
      clusters.push([i]);
    }
    
    return clusters;
  }

  allocateHRPWeights(clusters, volatilities, weights, totalWeight) {
    // Simplified HRP allocation
    const n = weights.length;
    const clusterWeight = totalWeight / clusters.length;
    
    clusters.forEach(cluster => {
      cluster.forEach(assetIndex => {
        weights[assetIndex] = clusterWeight / cluster.length;
      });
    });
  }

  calculateSkewness(data) {
    const meanVal = mean(data);
    const stdDev = standardDeviation(data);
    const n = data.length;
    
    const skew = data.reduce((sum, x) => sum + Math.pow((x - meanVal) / stdDev, 3), 0) / n;
    return skew;
  }

  calculateKurtosis(data) {
    const meanVal = mean(data);
    const stdDev = standardDeviation(data);
    const n = data.length;
    
    const kurt = data.reduce((sum, x) => sum + Math.pow((x - meanVal) / stdDev, 4), 0) / n;
    return kurt - 3; // Excess kurtosis
  }

  calculatePortfolioVariance(weights, covarianceMatrix) {
    const weightMatrix = Matrix.columnVector(weights);
    return Matrix.mul(Matrix.mul(Matrix.transpose(weightMatrix), covarianceMatrix), weightMatrix).get(0, 0);
  }

  calculateVaR(weights, returns, confidenceLevel) {
    // Historical simulation VaR
    const portfolioReturns = this.calculatePortfolioReturns(weights, returns);
    portfolioReturns.sort((a, b) => a - b);
    
    const index = Math.floor((1 - confidenceLevel) * portfolioReturns.length);
    return portfolioReturns[index];
  }

  calculateCVaR(weights, returns, alpha) {
    const portfolioReturns = this.calculatePortfolioReturns(weights, returns);
    portfolioReturns.sort((a, b) => a - b);
    
    const cutoff = Math.floor(alpha * portfolioReturns.length);
    const tail = portfolioReturns.slice(0, cutoff);
    
    return tail.length > 0 ? mean(tail) : 0;
  }

  calculatePortfolioReturns(weights, returns) {
    const assets = Object.keys(returns);
    const periods = returns[assets[0]].length;
    const portfolioReturns = [];
    
    for (let t = 0; t < periods; t++) {
      let portfolioReturn = 0;
      for (let i = 0; i < assets.length; i++) {
        portfolioReturn += weights[i] * returns[assets[i]][t];
      }
      portfolioReturns.push(portfolioReturn);
    }
    
    return portfolioReturns;
  }

  calculateMaxDrawdown(weights, returns) {
    const portfolioReturns = this.calculatePortfolioReturns(weights, returns);
    let peak = 1;
    let maxDrawdown = 0;
    let current = 1;
    
    for (const ret of portfolioReturns) {
      current *= (1 + ret);
      if (current > peak) peak = current;
      const drawdown = (peak - current) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    return maxDrawdown;
  }

  calculateInformationRatio(weights, returns) {
    // Simplified - would need benchmark returns in practice
    const portfolioReturns = this.calculatePortfolioReturns(weights, returns);
    const excessReturns = portfolioReturns.map(r => r - this.riskFreeRate / 252);
    
    return mean(excessReturns) / standardDeviation(excessReturns);
  }

  calculateSortinoRatio(weights, returns) {
    const portfolioReturns = this.calculatePortfolioReturns(weights, returns);
    const excessReturns = portfolioReturns.map(r => r - this.riskFreeRate / 252);
    const downside = excessReturns.filter(r => r < 0);
    
    const downsideDeviation = downside.length > 0 ? Math.sqrt(mean(downside.map(r => r * r))) : 1;
    return mean(excessReturns) / downsideDeviation;
  }

  calculateDiversificationRatio(weights, statistics) {
    const { volatilities } = statistics;
    const weightedVolatility = weights.reduce((sum, w, i) => sum + w * volatilities[i], 0);
    const portfolioVolatility = Math.sqrt(this.calculatePortfolioVariance(weights, statistics.covarianceMatrix));
    
    return weightedVolatility / portfolioVolatility;
  }

  calculateConcentrationRisk(weights) {
    // Herfindahl-Hirschman Index
    return weights.reduce((sum, w) => sum + w * w, 0);
  }

  calculateCorrelationRisk(weights, statistics) {
    const { correlationMatrix } = statistics;
    let avgCorrelation = 0;
    let count = 0;
    
    for (let i = 0; i < weights.length; i++) {
      for (let j = i + 1; j < weights.length; j++) {
        avgCorrelation += weights[i] * weights[j] * correlationMatrix.get(i, j);
        count++;
      }
    }
    
    return count > 0 ? avgCorrelation / count : 0;
  }

  calculateLiquidityRisk(weights) {
    // Simplified - assumes higher weights = higher liquidity risk
    return Math.max(...weights);
  }

  calculateDrawdownAnalysis(weights, returns) {
    const portfolioReturns = this.calculatePortfolioReturns(weights, returns);
    const drawdowns = [];
    let peak = 1;
    let current = 1;
    
    for (const ret of portfolioReturns) {
      current *= (1 + ret);
      if (current > peak) peak = current;
      drawdowns.push((peak - current) / peak);
    }
    
    return {
      maxDrawdown: Math.max(...drawdowns),
      avgDrawdown: mean(drawdowns),
      drawdownPeriods: drawdowns.filter(dd => dd > 0).length
    };
  }

  performStressTests(weights, statistics) {
    // Simplified stress testing
    const scenarios = [
      { name: 'Market Crash', returnShock: -0.3, volShock: 2.0 },
      { name: 'High Inflation', returnShock: -0.1, volShock: 1.5 },
      { name: 'Interest Rate Shock', returnShock: -0.15, volShock: 1.3 }
    ];
    
    return scenarios.map(scenario => {
      const stressedReturns = statistics.expectedReturns.map(r => r + scenario.returnShock);
      const stressedCovariance = Matrix.mul([scenario.volShock * scenario.volShock], statistics.covarianceMatrix);
      
      const stressedReturn = weights.reduce((sum, w, i) => sum + w * stressedReturns[i], 0);
      const stressedVariance = this.calculatePortfolioVariance(weights, stressedCovariance);
      
      return {
        name: scenario.name,
        expectedReturn: stressedReturn,
        volatility: Math.sqrt(stressedVariance),
        loss: stressedReturn < 0 ? stressedReturn : 0
      };
    });
  }

  // Existing methods from the original class (mean_reversion, momentum, etc.)
  // [Include all the original methods here for backwards compatibility]

  calculateReturns(historicalData) {
    const returns = {};
    
    for (const [asset, prices] of Object.entries(historicalData)) {
      returns[asset] = [];
      for (let i = 1; i < prices.length; i++) {
        const returnValue = (prices[i] - prices[i - 1]) / prices[i - 1];
        returns[asset].push(returnValue);
      }
    }
    
    return returns;
  }

  equalWeightOptimization(assets, config) {
    const n = Math.min(assets.length, config.maxAssets);
    return new Array(assets.length).fill(0).map((_, i) => i < n ? 1 / n : 0);
  }

  riskParityOptimization(statistics, config) {
    const { volatilities } = statistics;
    const invVolWeights = volatilities.map(vol => 1 / vol);
    const sumInvVol = invVolWeights.reduce((sum, w) => sum + w, 0);
    return invVolWeights.map(w => w / sumInvVol);
  }

  minimumVarianceOptimization(statistics, config) {
    const { covarianceMatrix } = statistics;
    const n = covarianceMatrix.rows;
    const ones = new Array(n).fill(1);
    
    try {
      const covInv = Matrix.inverse(covarianceMatrix);
      const numerator = Matrix.mul(covInv, Matrix.columnVector(ones)).to1DArray();
      const denominator = Matrix.mul(Matrix.mul([ones], covInv), Matrix.columnVector(ones)).get(0, 0);
      
      return numerator.map(w => w / denominator);
    } catch (error) {
      return new Array(n).fill(1 / n);
    }
  }

  meanReversionOptimization(statistics, config) {
    const { expectedReturns } = statistics;
    const meanReturn = mean(expectedReturns);
    const weights = expectedReturns.map(ret => meanReturn - ret);
    const sumWeights = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
    return weights.map(w => Math.max(0, w) / sumWeights);
  }

  momentumOptimization(statistics, config) {
    const { expectedReturns } = statistics;
    const positiveReturns = expectedReturns.map(ret => Math.max(0, ret));
    const sumPositive = positiveReturns.reduce((sum, w) => sum + w, 0);
    return positiveReturns.map(w => w / sumPositive);
  }

  applyConstraints(weights, config) {
    // Apply min/max weight constraints
    return weights.map(w => Math.max(config.minWeight, Math.min(config.maxWeight, w)));
  }

  normalizeWeights(weights, config) {
    const sum = weights.reduce((s, w) => s + w, 0);
    return sum > 0 ? weights.map(w => w / sum) : weights;
  }
}
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
    
module.exports = AdvancedPortfolioOptimizer;
        
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