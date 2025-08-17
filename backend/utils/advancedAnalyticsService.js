const logger = require('./logger');
const { mean, standardDeviation, quantile } = require('simple-statistics');
const RiskManagementSystem = require('./riskManagement');

/**
 * Advanced Analytics & Reporting Service
 * Comprehensive performance analytics, attribution analysis, and benchmarking
 */
class AdvancedAnalyticsService {
  constructor() {
    this.riskManager = new RiskManagementSystem();
    this.benchmarks = new Map();
    this.reports = new Map();
    this.attributionCache = new Map();
    
    // Performance metrics cache
    this.metricsCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    // Benchmark symbols and their properties
    this.defaultBenchmarks = {
      'SPY': { name: 'S&P 500', type: 'equity', region: 'US' },
      'QQQ': { name: 'NASDAQ 100', type: 'tech', region: 'US' },
      'BTC': { name: 'Bitcoin', type: 'crypto', region: 'Global' },
      'ETH': { name: 'Ethereum', type: 'crypto', region: 'Global' },
      'VTI': { name: 'Total Stock Market', type: 'equity', region: 'US' },
      'VWO': { name: 'Emerging Markets', type: 'equity', region: 'EM' }
    };
    
    logger.info('AdvancedAnalyticsService initialized with comprehensive analytics capabilities');
  }

  /**
   * Performance Attribution Analysis
   * Analyzes contribution of individual positions to overall portfolio performance
   */
  async calculateAttributionAnalysis(portfolioId, startDate, endDate, options = {}) {
    const cacheKey = `attribution_${portfolioId}_${startDate}_${endDate}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    try {
      const portfolio = this.riskManager.getPortfolio(portfolioId);
      if (!portfolio) {
        throw new Error(`Portfolio ${portfolioId} not found`);
      }

      const attribution = {
        portfolioId,
        period: { startDate, endDate },
        timestamp: new Date().toISOString(),
        analysis: {}
      };

      // Asset Level Attribution
      const assetAttribution = await this.calculateAssetAttribution(portfolio, startDate, endDate);
      attribution.analysis.assetLevel = assetAttribution;

      // Sector Level Attribution
      const sectorAttribution = await this.calculateSectorAttribution(portfolio, startDate, endDate);
      attribution.analysis.sectorLevel = sectorAttribution;

      // Strategy Level Attribution (if strategies are defined)
      const strategyAttribution = await this.calculateStrategyAttribution(portfolio, startDate, endDate);
      attribution.analysis.strategyLevel = strategyAttribution;

      // Risk Factor Attribution
      const riskFactorAttribution = await this.calculateRiskFactorAttribution(portfolio, startDate, endDate);
      attribution.analysis.riskFactors = riskFactorAttribution;

      // Summary Statistics
      attribution.summary = this.calculateAttributionSummary(attribution.analysis);

      this.setCachedResult(cacheKey, attribution);
      return attribution;

    } catch (error) {
      logger.error('Error calculating attribution analysis:', error);
      throw error;
    }
  }

  /**
   * Asset-level attribution analysis
   */
  async calculateAssetAttribution(portfolio, startDate, endDate) {
    const assetContributions = [];
    
    for (const [symbol, position] of portfolio.positions) {
      // Simulate historical performance data
      const returns = this.generateHistoricalReturns(symbol, startDate, endDate);
      const weights = this.calculateHistoricalWeights(position, returns.length);
      
      let totalContribution = 0;
      let activeReturn = 0;
      
      for (let i = 0; i < returns.length; i++) {
        const contribution = weights[i] * returns[i];
        totalContribution += contribution;
      }
      
      // Calculate alpha vs benchmark (simplified)
      const benchmarkReturn = this.generateBenchmarkReturn(startDate, endDate);
      activeReturn = (totalContribution * 252) - benchmarkReturn; // Annualized
      
      assetContributions.push({
        symbol,
        sector: position.sector || 'Unknown',
        avgWeight: mean(weights),
        totalReturn: totalContribution * 252, // Annualized
        contribution: totalContribution,
        activeReturn,
        sharpeContribution: this.calculateSharpeContribution(returns, weights),
        riskContribution: this.calculateRiskContribution(position, portfolio),
        metrics: {
          volatility: standardDeviation(returns) * Math.sqrt(252),
          maxDrawdown: this.calculateMaxDrawdown(returns),
          winRate: returns.filter(r => r > 0).length / returns.length
        }
      });
    }
    
    // Sort by contribution (descending)
    assetContributions.sort((a, b) => b.contribution - a.contribution);
    
    return {
      assets: assetContributions,
      topContributors: assetContributions.slice(0, 5),
      bottomContributors: assetContributions.slice(-3),
      totalContribution: assetContributions.reduce((sum, asset) => sum + asset.contribution, 0)
    };
  }

  /**
   * Sector-level attribution analysis
   */
  async calculateSectorAttribution(portfolio, startDate, endDate) {
    const sectorMap = new Map();
    
    // Aggregate by sector
    for (const [symbol, position] of portfolio.positions) {
      const sector = position.sector || 'Unknown';
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, {
          sector,
          positions: [],
          totalWeight: 0,
          totalValue: 0
        });
      }
      
      const sectorData = sectorMap.get(sector);
      sectorData.positions.push({ symbol, position });
      sectorData.totalWeight += position.weight;
      sectorData.totalValue += position.marketValue;
    }
    
    // Calculate sector contributions
    const sectorContributions = [];
    for (const [sector, data] of sectorMap) {
      const returns = this.generateSectorReturns(sector, startDate, endDate);
      const avgWeight = data.totalWeight;
      const totalContribution = returns.reduce((sum, ret) => sum + ret * avgWeight, 0);
      
      sectorContributions.push({
        sector,
        numPositions: data.positions.length,
        avgWeight,
        totalValue: data.totalValue,
        contribution: totalContribution,
        returns: {
          total: totalContribution * 252,
          volatility: standardDeviation(returns) * Math.sqrt(252),
          sharpe: this.calculateSharpeRatio(returns, 0.02 / 252) // 2% risk-free rate
        },
        allocation: {
          current: avgWeight,
          optimal: this.calculateOptimalSectorWeight(sector, portfolio)
        }
      });
    }
    
    return {
      sectors: sectorContributions.sort((a, b) => b.contribution - a.contribution),
      diversification: this.calculateSectorDiversification(sectorContributions),
      concentration: this.calculateSectorConcentration(sectorContributions)
    };
  }

  /**
   * Strategy-level attribution analysis
   */
  async calculateStrategyAttribution(portfolio, startDate, endDate) {
    // Simulate strategy classification
    const strategies = ['Growth', 'Value', 'Momentum', 'Mean Reversion', 'Arbitrage'];
    const strategyContributions = [];
    
    strategies.forEach(strategy => {
      const positions = this.classifyPositionsByStrategy(portfolio, strategy);
      if (positions.length > 0) {
        const returns = this.generateStrategyReturns(strategy, startDate, endDate);
        const totalWeight = positions.reduce((sum, pos) => sum + pos.weight, 0);
        const contribution = returns.reduce((sum, ret) => sum + ret * totalWeight, 0);
        
        strategyContributions.push({
          strategy,
          numPositions: positions.length,
          totalWeight,
          contribution,
          performance: {
            totalReturn: contribution * 252,
            volatility: standardDeviation(returns) * Math.sqrt(252),
            sharpe: this.calculateSharpeRatio(returns, 0.02 / 252),
            maxDrawdown: this.calculateMaxDrawdown(returns)
          }
        });
      }
    });
    
    return {
      strategies: strategyContributions.sort((a, b) => b.contribution - a.contribution),
      diversification: this.calculateStrategyDiversification(strategyContributions),
      effectiveness: this.calculateStrategyEffectiveness(strategyContributions)
    };
  }

  /**
   * Risk factor attribution analysis
   */
  async calculateRiskFactorAttribution(portfolio, startDate, endDate) {
    const riskFactors = ['Market', 'Size', 'Value', 'Momentum', 'Quality', 'Volatility'];
    const factorExposures = new Map();
    
    // Calculate factor exposures for each position
    for (const [symbol, position] of portfolio.positions) {
      const exposures = this.calculateFactorExposures(symbol, position);
      factorExposures.set(symbol, exposures);
    }
    
    // Aggregate portfolio-level factor exposures
    const portfolioFactorExposures = [];
    riskFactors.forEach(factor => {
      let totalExposure = 0;
      let weightedExposure = 0;
      
      for (const [symbol, position] of portfolio.positions) {
        const exposure = factorExposures.get(symbol)[factor] || 0;
        totalExposure += exposure * position.weight;
        weightedExposure += Math.abs(exposure) * position.weight;
      }
      
      const factorReturns = this.generateFactorReturns(factor, startDate, endDate);
      const contribution = factorReturns.reduce((sum, ret) => sum + ret * totalExposure, 0);
      
      portfolioFactorExposures.push({
        factor,
        exposure: totalExposure,
        absExposure: weightedExposure,
        contribution,
        volatility: standardDeviation(factorReturns) * Math.sqrt(252),
        performance: {
          totalReturn: contribution * 252,
          sharpe: this.calculateSharpeRatio(factorReturns, 0.02 / 252)
        }
      });
    });
    
    return {
      factors: portfolioFactorExposures.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
      totalFactorContribution: portfolioFactorExposures.reduce((sum, f) => sum + f.contribution, 0),
      unexplainedReturn: 0.05, // Placeholder - would be calculated from residuals
      diversification: this.calculateFactorDiversification(portfolioFactorExposures)
    };
  }

  /**
   * Risk-Adjusted Performance Metrics
   */
  async calculateRiskAdjustedMetrics(portfolioId, benchmarkSymbol = 'SPY', options = {}) {
    const period = options.period || 252; // 1 year default
    const riskFreeRate = options.riskFreeRate || 0.02; // 2% annual
    
    try {
      const portfolio = this.riskManager.getPortfolio(portfolioId);
      if (!portfolio) {
        throw new Error(`Portfolio ${portfolioId} not found`);
      }

      // Generate portfolio returns (in real implementation, fetch from database)
      const portfolioReturns = this.generatePortfolioReturns(portfolio, period);
      const benchmarkReturns = this.generateBenchmarkReturns(benchmarkSymbol, period);
      
      const dailyRiskFreeRate = riskFreeRate / 252;
      
      const metrics = {
        portfolioId,
        benchmarkSymbol,
        period,
        timestamp: new Date().toISOString(),
        returns: {
          portfolio: {
            total: portfolioReturns.reduce((sum, ret) => sum + ret, 0) * 252,
            volatility: standardDeviation(portfolioReturns) * Math.sqrt(252),
            average: mean(portfolioReturns) * 252
          },
          benchmark: {
            total: benchmarkReturns.reduce((sum, ret) => sum + ret, 0) * 252,
            volatility: standardDeviation(benchmarkReturns) * Math.sqrt(252),
            average: mean(benchmarkReturns) * 252
          }
        },
        riskAdjustedMetrics: {}
      };
      
      // Sharpe Ratio
      const excessReturns = portfolioReturns.map(ret => ret - dailyRiskFreeRate);
      metrics.riskAdjustedMetrics.sharpeRatio = this.calculateSharpeRatio(portfolioReturns, dailyRiskFreeRate);
      
      // Sortino Ratio
      metrics.riskAdjustedMetrics.sortinoRatio = this.calculateSortinoRatio(portfolioReturns, dailyRiskFreeRate);
      
      // Calmar Ratio
      const maxDrawdown = this.calculateMaxDrawdown(portfolioReturns);
      metrics.riskAdjustedMetrics.calmarRatio = metrics.returns.portfolio.total / Math.abs(maxDrawdown);
      
      // Information Ratio
      const trackingError = this.calculateTrackingError(portfolioReturns, benchmarkReturns);
      const activeReturn = metrics.returns.portfolio.total - metrics.returns.benchmark.total;
      metrics.riskAdjustedMetrics.informationRatio = activeReturn / trackingError;
      
      // Alpha and Beta
      const { alpha, beta } = this.calculateAlphaBeta(portfolioReturns, benchmarkReturns, dailyRiskFreeRate);
      metrics.riskAdjustedMetrics.alpha = alpha;
      metrics.riskAdjustedMetrics.beta = beta;
      
      // Treynor Ratio
      metrics.riskAdjustedMetrics.treynorRatio = (metrics.returns.portfolio.average - riskFreeRate) / beta;
      
      // Jensen's Alpha
      const expectedReturn = riskFreeRate + beta * (metrics.returns.benchmark.average - riskFreeRate);
      metrics.riskAdjustedMetrics.jensensAlpha = metrics.returns.portfolio.average - expectedReturn;
      
      // Downside Risk Metrics
      metrics.riskAdjustedMetrics.maxDrawdown = maxDrawdown;
      metrics.riskAdjustedMetrics.downsideDeviation = this.calculateDownsideDeviation(portfolioReturns, dailyRiskFreeRate);
      metrics.riskAdjustedMetrics.valueatRisk95 = quantile(portfolioReturns, 0.05);
      metrics.riskAdjustedMetrics.conditionalVaR95 = this.calculateConditionalVaR(portfolioReturns, 0.05);
      
      // Additional Metrics
      metrics.riskAdjustedMetrics.trackingError = trackingError;
      metrics.riskAdjustedMetrics.correlationWithBenchmark = this.calculateCorrelation(portfolioReturns, benchmarkReturns);
      metrics.riskAdjustedMetrics.winRate = portfolioReturns.filter(ret => ret > 0).length / portfolioReturns.length;
      metrics.riskAdjustedMetrics.profitFactor = this.calculateProfitFactor(portfolioReturns);
      
      return metrics;
      
    } catch (error) {
      logger.error('Error calculating risk-adjusted metrics:', error);
      throw error;
    }
  }

  /**
   * Benchmark Comparison Tools
   */
  async compareToBenchmarks(portfolioId, benchmarkSymbols = ['SPY', 'QQQ', 'BTC'], options = {}) {
    const period = options.period || 252;
    const metrics = ['return', 'volatility', 'sharpe', 'maxDrawdown', 'beta'];
    
    try {
      const portfolio = this.riskManager.getPortfolio(portfolioId);
      const portfolioReturns = this.generatePortfolioReturns(portfolio, period);
      
      const comparison = {
        portfolioId,
        period,
        timestamp: new Date().toISOString(),
        portfolio: {},
        benchmarks: {},
        rankings: {},
        analysis: {}
      };
      
      // Calculate portfolio metrics
      comparison.portfolio = {
        symbol: 'PORTFOLIO',
        name: `Portfolio ${portfolioId}`,
        returns: portfolioReturns,
        metrics: await this.calculateBasicMetrics(portfolioReturns)
      };
      
      // Calculate benchmark metrics
      for (const symbol of benchmarkSymbols) {
        const benchmarkReturns = this.generateBenchmarkReturns(symbol, period);
        comparison.benchmarks[symbol] = {
          symbol,
          name: this.defaultBenchmarks[symbol]?.name || symbol,
          type: this.defaultBenchmarks[symbol]?.type || 'unknown',
          returns: benchmarkReturns,
          metrics: await this.calculateBasicMetrics(benchmarkReturns)
        };
      }
      
      // Create rankings
      const allEntities = [comparison.portfolio, ...Object.values(comparison.benchmarks)];
      
      metrics.forEach(metric => {
        const sorted = allEntities.sort((a, b) => {
          if (metric === 'volatility' || metric === 'maxDrawdown') {
            return a.metrics[metric] - b.metrics[metric]; // Lower is better
          }
          return b.metrics[metric] - a.metrics[metric]; // Higher is better
        });
        
        comparison.rankings[metric] = sorted.map((entity, index) => ({
          rank: index + 1,
          symbol: entity.symbol,
          name: entity.name,
          value: entity.metrics[metric]
        }));
      });
      
      // Analysis and insights
      comparison.analysis = {
        outperformance: this.analyzeOutperformance(comparison),
        riskProfile: this.analyzeRiskProfile(comparison),
        efficiency: this.analyzeEfficiency(comparison),
        correlation: await this.analyzeCorrelations(comparison)
      };
      
      return comparison;
      
    } catch (error) {
      logger.error('Error comparing to benchmarks:', error);
      throw error;
    }
  }

  /**
   * Custom Performance Reporting Engine
   */
  async generatePerformanceReport(portfolioId, reportType = 'comprehensive', options = {}) {
    const reportId = `${reportType}_${portfolioId}_${Date.now()}`;
    
    try {
      const report = {
        id: reportId,
        portfolioId,
        type: reportType,
        timestamp: new Date().toISOString(),
        period: options.period || { start: '2024-01-01', end: new Date().toISOString().split('T')[0] },
        sections: {}
      };
      
      switch (reportType) {
        case 'comprehensive':
          report.sections = await this.generateComprehensiveReport(portfolioId, options);
          break;
        case 'risk_focused':
          report.sections = await this.generateRiskFocusedReport(portfolioId, options);
          break;
        case 'attribution':
          report.sections = await this.generateAttributionReport(portfolioId, options);
          break;
        case 'benchmark':
          report.sections = await this.generateBenchmarkReport(portfolioId, options);
          break;
        case 'executive_summary':
          report.sections = await this.generateExecutiveSummary(portfolioId, options);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }
      
      // Store report
      this.reports.set(reportId, report);
      
      // Generate PDF metadata (in real implementation, would generate actual PDF)
      report.pdf = {
        generated: false,
        url: `/api/analytics/reports/${reportId}/pdf`,
        size: Math.floor(Math.random() * 1000000) + 500000, // Mock size
        pages: Math.floor(Math.random() * 20) + 10
      };
      
      logger.info(`Performance report generated: ${reportId}, type: ${reportType}`);
      return report;
      
    } catch (error) {
      logger.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Helper Methods for Calculations
   */
  calculateSharpeRatio(returns, riskFreeRate) {
    const excessReturns = returns.map(ret => ret - riskFreeRate);
    const avgExcessReturn = mean(excessReturns);
    const volatility = standardDeviation(excessReturns);
    return volatility === 0 ? 0 : (avgExcessReturn * Math.sqrt(252)) / (volatility * Math.sqrt(252));
  }

  calculateSortinoRatio(returns, targetReturn) {
    const excessReturns = returns.map(ret => ret - targetReturn);
    const avgExcessReturn = mean(excessReturns);
    const downsideReturns = excessReturns.filter(ret => ret < 0);
    const downsideDeviation = downsideReturns.length > 0 ? 
      Math.sqrt(downsideReturns.reduce((sum, ret) => sum + ret * ret, 0) / downsideReturns.length) : 0;
    return downsideDeviation === 0 ? 0 : (avgExcessReturn * Math.sqrt(252)) / (downsideDeviation * Math.sqrt(252));
  }

  calculateMaxDrawdown(returns) {
    let peak = 1;
    let maxDrawdown = 0;
    let value = 1;
    
    for (const ret of returns) {
      value *= (1 + ret);
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return -maxDrawdown; // Return as negative percentage
  }

  calculateTrackingError(portfolioReturns, benchmarkReturns) {
    const trackingDifferences = portfolioReturns.map((ret, i) => ret - benchmarkReturns[i]);
    return standardDeviation(trackingDifferences) * Math.sqrt(252);
  }

  calculateAlphaBeta(portfolioReturns, benchmarkReturns, riskFreeRate) {
    const portfolioExcess = portfolioReturns.map(ret => ret - riskFreeRate);
    const benchmarkExcess = benchmarkReturns.map(ret => ret - riskFreeRate);
    
    // Calculate beta (covariance / variance)
    const covariance = this.calculateCovariance(portfolioExcess, benchmarkExcess);
    const benchmarkVariance = this.calculateVariance(benchmarkExcess);
    const beta = benchmarkVariance === 0 ? 0 : covariance / benchmarkVariance;
    
    // Calculate alpha
    const portfolioAvg = mean(portfolioExcess) * 252;
    const benchmarkAvg = mean(benchmarkExcess) * 252;
    const alpha = portfolioAvg - beta * benchmarkAvg;
    
    return { alpha, beta };
  }

  calculateDownsideDeviation(returns, targetReturn) {
    const downsideReturns = returns.filter(ret => ret < targetReturn).map(ret => ret - targetReturn);
    return downsideReturns.length > 0 ? 
      Math.sqrt(downsideReturns.reduce((sum, ret) => sum + ret * ret, 0) / downsideReturns.length) * Math.sqrt(252) : 0;
  }

  calculateConditionalVaR(returns, percentile) {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(percentile * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, varIndex);
    return tailReturns.length > 0 ? mean(tailReturns) : sortedReturns[0] || 0;
  }

  calculateCorrelation(returns1, returns2) {
    const n = Math.min(returns1.length, returns2.length);
    if (n < 2) return 0;
    
    const covariance = this.calculateCovariance(returns1.slice(0, n), returns2.slice(0, n));
    const std1 = standardDeviation(returns1.slice(0, n));
    const std2 = standardDeviation(returns2.slice(0, n));
    
    return (std1 === 0 || std2 === 0) ? 0 : covariance / (std1 * std2);
  }

  calculateCovariance(returns1, returns2) {
    const mean1 = mean(returns1);
    const mean2 = mean(returns2);
    const n = returns1.length;
    
    let covariance = 0;
    for (let i = 0; i < n; i++) {
      covariance += (returns1[i] - mean1) * (returns2[i] - mean2);
    }
    
    return covariance / (n - 1);
  }

  calculateVariance(returns) {
    const avg = mean(returns);
    const squaredDiffs = returns.map(ret => Math.pow(ret - avg, 2));
    return mean(squaredDiffs);
  }

  calculateProfitFactor(returns) {
    const gains = returns.filter(ret => ret > 0).reduce((sum, ret) => sum + ret, 0);
    const losses = Math.abs(returns.filter(ret => ret < 0).reduce((sum, ret) => sum + ret, 0));
    return losses === 0 ? gains : gains / losses;
  }

  /**
   * Mock data generation methods (in real implementation, these would fetch from database/APIs)
   */
  generateHistoricalReturns(symbol, startDate, endDate, length = 252) {
    const returns = [];
    const volatility = 0.02 + Math.random() * 0.03; // 2-5% daily volatility
    const drift = (Math.random() - 0.5) * 0.001; // Random drift
    
    for (let i = 0; i < length; i++) {
      returns.push(drift + volatility * this.generateNormalRandom(0, 1));
    }
    
    return returns;
  }

  generatePortfolioReturns(portfolio, length = 252) {
    const returns = [];
    
    for (let i = 0; i < length; i++) {
      let dailyReturn = 0;
      
      for (const [symbol, position] of portfolio.positions) {
        const assetReturn = this.generateNormalRandom(0.0008, 0.02); // Mock daily return
        dailyReturn += position.weight * assetReturn;
      }
      
      returns.push(dailyReturn);
    }
    
    return returns;
  }

  generateBenchmarkReturns(symbol, length = 252) {
    // Different volatilities for different benchmarks
    const volatilities = {
      'SPY': 0.015,
      'QQQ': 0.020,
      'BTC': 0.050,
      'ETH': 0.055,
      'VTI': 0.014,
      'VWO': 0.025
    };
    
    const vol = volatilities[symbol] || 0.020;
    const drift = 0.0008; // 20% annual return
    
    const returns = [];
    for (let i = 0; i < length; i++) {
      returns.push(drift + vol * this.generateNormalRandom(0, 1));
    }
    
    return returns;
  }

  generateNormalRandom(mean, stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  /**
   * Cache management
   */
  getCachedResult(key) {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCachedResult(key, data) {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Additional helper methods for calculations
   */
  calculateHistoricalWeights(position, numPeriods) {
    // Simplified: assume constant weight over time
    return Array(numPeriods).fill(position.weight);
  }

  generateBenchmarkReturn(startDate, endDate) {
    // Simplified benchmark return calculation
    return 0.10; // 10% annual return
  }

  calculateSharpeContribution(returns, weights) {
    const weightedReturns = returns.map((ret, i) => ret * weights[i]);
    return this.calculateSharpeRatio(weightedReturns, 0.02 / 252);
  }

  calculateRiskContribution(position, portfolio) {
    // Simplified risk contribution calculation
    return position.weight * 0.02; // 2% base risk
  }

  generateSectorReturns(sector, startDate, endDate, length = 252) {
    // Different volatilities by sector
    const sectorVols = {
      'Technology': 0.025,
      'Healthcare': 0.020,
      'Finance': 0.030,
      'Energy': 0.035,
      'Consumer': 0.018,
      'Unknown': 0.022
    };
    
    const vol = sectorVols[sector] || 0.022;
    const returns = [];
    
    for (let i = 0; i < length; i++) {
      returns.push(this.generateNormalRandom(0.0008, vol));
    }
    
    return returns;
  }

  calculateOptimalSectorWeight(sector, portfolio) {
    // Simplified optimal weight calculation
    const currentSectors = new Set();
    for (const [symbol, position] of portfolio.positions) {
      currentSectors.add(position.sector || 'Unknown');
    }
    return 1 / currentSectors.size; // Equal weight
  }

  calculateSectorDiversification(sectorContributions) {
    const weights = sectorContributions.map(s => s.avgWeight);
    const herfindahl = weights.reduce((sum, weight) => sum + weight * weight, 0);
    return {
      herfindahlIndex: herfindahl,
      effectiveNumSectors: 1 / herfindahl,
      diversificationRatio: sectorContributions.length / (1 / herfindahl)
    };
  }

  calculateSectorConcentration(sectorContributions) {
    const sortedWeights = sectorContributions.map(s => s.avgWeight).sort((a, b) => b - a);
    return {
      top3Concentration: sortedWeights.slice(0, 3).reduce((sum, w) => sum + w, 0),
      maxSectorWeight: sortedWeights[0] || 0,
      giniCoefficient: this.calculateGiniCoefficient(sortedWeights)
    };
  }

  calculateGiniCoefficient(values) {
    const n = values.length;
    if (n <= 1) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    let sum1 = 0;
    let sum2 = 0;
    
    for (let i = 0; i < n; i++) {
      sum1 += (i + 1) * sorted[i];
      sum2 += sorted[i];
    }
    
    return (2 * sum1) / (n * sum2) - (n + 1) / n;
  }

  classifyPositionsByStrategy(portfolio, strategy) {
    // Mock strategy classification
    const positions = Array.from(portfolio.positions.values());
    const numPositions = Math.floor(positions.length / 5); // Roughly equal distribution
    return positions.slice(0, numPositions);
  }

  generateStrategyReturns(strategy, startDate, endDate, length = 252) {
    // Different risk/return profiles by strategy
    const strategyProfiles = {
      'Growth': { return: 0.0012, vol: 0.025 },
      'Value': { return: 0.0008, vol: 0.018 },
      'Momentum': { return: 0.0010, vol: 0.022 },
      'Mean Reversion': { return: 0.0006, vol: 0.015 },
      'Arbitrage': { return: 0.0004, vol: 0.008 }
    };
    
    const profile = strategyProfiles[strategy] || { return: 0.0008, vol: 0.020 };
    const returns = [];
    
    for (let i = 0; i < length; i++) {
      returns.push(this.generateNormalRandom(profile.return, profile.vol));
    }
    
    return returns;
  }

  calculateStrategyDiversification(strategyContributions) {
    const weights = strategyContributions.map(s => s.totalWeight);
    const effectiveStrategies = 1 / weights.reduce((sum, w) => sum + w * w, 0);
    return {
      effectiveNumStrategies: effectiveStrategies,
      strategyConcentration: Math.max(...weights),
      diversificationScore: effectiveStrategies / strategyContributions.length
    };
  }

  calculateStrategyEffectiveness(strategyContributions) {
    if (!strategyContributions || strategyContributions.length === 0) {
      return {
        avgSharpe: 0,
        maxSharpe: 0,
        minSharpe: 0,
        consistencyScore: 0
      };
    }
    
    const performances = strategyContributions.map(s => s.performance.sharpe);
    const avgSharpe = mean(performances);
    
    return {
      avgSharpe,
      maxSharpe: Math.max(...performances),
      minSharpe: Math.min(...performances),
      consistencyScore: avgSharpe === 0 ? 0 : 1 - (standardDeviation(performances) / Math.abs(avgSharpe))
    };
  }

  calculateFactorExposures(symbol, position) {
    // Mock factor exposures (in real implementation, would use factor models)
    return {
      'Market': 0.8 + Math.random() * 0.4, // 0.8 to 1.2
      'Size': (Math.random() - 0.5) * 1.0, // -0.5 to 0.5
      'Value': (Math.random() - 0.5) * 0.8, // -0.4 to 0.4
      'Momentum': (Math.random() - 0.5) * 0.6, // -0.3 to 0.3
      'Quality': Math.random() * 0.5, // 0 to 0.5
      'Volatility': (Math.random() - 0.5) * 0.4 // -0.2 to 0.2
    };
  }

  generateFactorReturns(factor, startDate, endDate, length = 252) {
    // Different factor return profiles
    const factorProfiles = {
      'Market': { return: 0.0008, vol: 0.015 },
      'Size': { return: 0.0002, vol: 0.012 },
      'Value': { return: 0.0004, vol: 0.010 },
      'Momentum': { return: 0.0006, vol: 0.014 },
      'Quality': { return: 0.0005, vol: 0.009 },
      'Volatility': { return: -0.0001, vol: 0.018 }
    };
    
    const profile = factorProfiles[factor] || { return: 0.0003, vol: 0.012 };
    const returns = [];
    
    for (let i = 0; i < length; i++) {
      returns.push(this.generateNormalRandom(profile.return, profile.vol));
    }
    
    return returns;
  }

  calculateFactorDiversification(factorExposures) {
    const absExposures = factorExposures.map(f => Math.abs(f.exposure));
    const totalExposure = absExposures.reduce((sum, exp) => sum + exp, 0);
    const normalizedExposures = absExposures.map(exp => exp / totalExposure);
    const herfindahl = normalizedExposures.reduce((sum, exp) => sum + exp * exp, 0);
    
    return {
      herfindahlIndex: herfindahl,
      effectiveNumFactors: 1 / herfindahl,
      concentrationRisk: Math.max(...normalizedExposures)
    };
  }

  calculateAttributionSummary(analysis) {
    return {
      totalAssetContribution: analysis.assetLevel?.totalContribution || 0,
      topAssetContributor: analysis.assetLevel?.topContributors[0]?.symbol || 'N/A',
      mostDiversifiedSector: analysis.sectorLevel?.sectors?.reduce((prev, curr) => 
        prev.numPositions > curr.numPositions ? prev : curr)?.sector || 'N/A',
      dominantStrategy: analysis.strategyLevel?.strategies[0]?.strategy || 'N/A',
      primaryRiskFactor: analysis.riskFactors?.factors[0]?.factor || 'N/A'
    };
  }

  async calculateBasicMetrics(returns) {
    const total = returns.reduce((sum, ret) => sum + ret, 0) * 252;
    const volatility = standardDeviation(returns) * Math.sqrt(252);
    const sharpe = this.calculateSharpeRatio(returns, 0.02 / 252);
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    
    return {
      return: total,
      volatility,
      sharpe,
      maxDrawdown
    };
  }

  analyzeOutperformance(comparison) {
    const portfolio = comparison.portfolio;
    const benchmarks = Object.values(comparison.benchmarks);
    
    const outperformed = benchmarks.filter(b => 
      portfolio.metrics.return > b.metrics.return
    ).length;
    
    return {
      outperformedCount: outperformed,
      totalBenchmarks: benchmarks.length,
      outperformanceRate: outperformed / benchmarks.length,
      bestOutperformance: Math.max(...benchmarks.map(b => 
        portfolio.metrics.return - b.metrics.return
      )),
      avgOutperformance: mean(benchmarks.map(b => 
        portfolio.metrics.return - b.metrics.return
      ))
    };
  }

  analyzeRiskProfile(comparison) {
    const portfolio = comparison.portfolio;
    const benchmarks = Object.values(comparison.benchmarks);
    
    const avgBenchmarkVol = mean(benchmarks.map(b => b.metrics.volatility));
    const avgBenchmarkDrawdown = mean(benchmarks.map(b => Math.abs(b.metrics.maxDrawdown)));
    
    return {
      relativeVolatility: portfolio.metrics.volatility / avgBenchmarkVol,
      relativeDrawdown: Math.abs(portfolio.metrics.maxDrawdown) / avgBenchmarkDrawdown,
      riskCategory: portfolio.metrics.volatility > avgBenchmarkVol ? 'High Risk' : 'Low Risk'
    };
  }

  analyzeEfficiency(comparison) {
    const portfolio = comparison.portfolio;
    const benchmarks = Object.values(comparison.benchmarks);
    
    const portfolioEfficiency = portfolio.metrics.return / portfolio.metrics.volatility;
    const avgBenchmarkEfficiency = mean(benchmarks.map(b => 
      b.metrics.return / b.metrics.volatility
    ));
    
    return {
      portfolioEfficiency,
      avgBenchmarkEfficiency,
      relativeEfficiency: portfolioEfficiency / avgBenchmarkEfficiency,
      efficiencyRank: benchmarks.filter(b => 
        portfolioEfficiency > (b.metrics.return / b.metrics.volatility)
      ).length + 1
    };
  }

  async analyzeCorrelations(comparison) {
    const portfolio = comparison.portfolio;
    const benchmarks = Object.values(comparison.benchmarks);
    
    const correlations = {};
    for (const benchmark of benchmarks) {
      correlations[benchmark.symbol] = this.calculateCorrelation(
        portfolio.returns, 
        benchmark.returns
      );
    }
    
    const correlationValues = Object.values(correlations);
    return {
      correlations,
      avgCorrelation: mean(correlationValues),
      maxCorrelation: Math.max(...correlationValues),
      minCorrelation: Math.min(...correlationValues),
      diversificationBenefit: 1 - mean(correlationValues.map(Math.abs))
    };
  }

  async generateComprehensiveReport(portfolioId, options) {
    const [attribution, riskMetrics, benchmarkComparison] = await Promise.all([
      this.calculateAttributionAnalysis(portfolioId, options.startDate, options.endDate),
      this.calculateRiskAdjustedMetrics(portfolioId, 'SPY', options),
      this.compareToBenchmarks(portfolioId, ['SPY', 'QQQ', 'BTC'], options)
    ]);
    
    return {
      executiveSummary: this.generateExecutiveSummarySection(attribution, riskMetrics, benchmarkComparison),
      performance: riskMetrics,
      attribution: attribution,
      benchmarkComparison: benchmarkComparison,
      riskAnalysis: await this.riskManager.generateRiskReport(portfolioId),
      recommendations: this.generateRecommendations(attribution, riskMetrics, benchmarkComparison)
    };
  }

  async generateRiskFocusedReport(portfolioId, options) {
    const riskReport = await this.riskManager.generateRiskReport(portfolioId);
    const varAnalysis = await this.riskManager.calculateVaR(portfolioId, 0.95, 1, 'monte_carlo');
    const stressTest = await this.performStressTest(portfolioId, options);
    
    return {
      riskSummary: riskReport,
      varAnalysis: varAnalysis,
      stressTest: stressTest,
      riskLimits: riskReport.riskLimits,
      riskChecks: riskReport.riskChecks,
      recommendations: riskReport.recommendations
    };
  }

  async generateAttributionReport(portfolioId, options) {
    const attribution = await this.calculateAttributionAnalysis(portfolioId, options.startDate, options.endDate);
    
    return {
      attribution: attribution,
      performanceDrivers: this.identifyPerformanceDrivers(attribution),
      inefficiencies: this.identifyInefficiencies(attribution),
      optimizationOpportunities: this.identifyOptimizationOpportunities(attribution)
    };
  }

  async generateBenchmarkReport(portfolioId, options) {
    const comparison = await this.compareToBenchmarks(portfolioId, options.benchmarks || ['SPY', 'QQQ', 'BTC'], options);
    
    return {
      comparison: comparison,
      relativePerfomance: comparison.analysis,
      recommendations: this.generateBenchmarkRecommendations(comparison)
    };
  }

  async generateExecutiveSummary(portfolioId, options) {
    const [riskMetrics, benchmarkComparison] = await Promise.all([
      this.calculateRiskAdjustedMetrics(portfolioId, 'SPY', options),
      this.compareToBenchmarks(portfolioId, ['SPY'], options)
    ]);
    
    return {
      keyMetrics: {
        totalReturn: riskMetrics.returns.portfolio.total,
        sharpeRatio: riskMetrics.riskAdjustedMetrics.sharpeRatio,
        maxDrawdown: riskMetrics.riskAdjustedMetrics.maxDrawdown,
        benchmarkOutperformance: riskMetrics.returns.portfolio.total - riskMetrics.returns.benchmark.total
      },
      riskProfile: {
        volatility: riskMetrics.returns.portfolio.volatility,
        beta: riskMetrics.riskAdjustedMetrics.beta,
        var95: riskMetrics.riskAdjustedMetrics.valueatRisk95
      },
      marketPosition: benchmarkComparison.analysis.outperformance,
      keyInsights: this.generateKeyInsights(riskMetrics, benchmarkComparison)
    };
  }

  generateExecutiveSummarySection(attribution, riskMetrics, benchmarkComparison) {
    return {
      totalReturn: riskMetrics.returns.portfolio.total,
      sharpeRatio: riskMetrics.riskAdjustedMetrics.sharpeRatio,
      maxDrawdown: riskMetrics.riskAdjustedMetrics.maxDrawdown,
      topContributor: attribution.analysis.assetLevel?.topContributors[0]?.symbol || 'N/A',
      benchmarkOutperformance: riskMetrics.returns.portfolio.total - riskMetrics.returns.benchmark.total,
      riskScore: 'Medium', // Simplified
      overallRating: riskMetrics.riskAdjustedMetrics.sharpeRatio > 1 ? 'Excellent' : 
                     riskMetrics.riskAdjustedMetrics.sharpeRatio > 0.5 ? 'Good' : 'Needs Improvement'
    };
  }

  generateRecommendations(attribution, riskMetrics, benchmarkComparison) {
    const recommendations = [];
    
    if (riskMetrics.riskAdjustedMetrics.sharpeRatio < 0.5) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'HIGH',
        title: 'Improve Risk-Adjusted Returns',
        description: 'Consider optimizing position sizes and reducing portfolio volatility'
      });
    }
    
    if (Math.abs(riskMetrics.riskAdjustedMetrics.maxDrawdown) > 0.15) {
      recommendations.push({
        type: 'RISK',
        priority: 'HIGH',
        title: 'Reduce Maximum Drawdown',
        description: 'Implement stricter stop-losses and risk management controls'
      });
    }
    
    return recommendations;
  }

  async performStressTest(portfolioId, options) {
    // Simplified stress test implementation
    const scenarios = ['Market Crash', 'Interest Rate Spike', 'Currency Crisis', 'Liquidity Crisis'];
    const results = [];
    
    for (const scenario of scenarios) {
      const impact = this.simulateScenarioImpact(scenario);
      results.push({
        scenario,
        portfolioImpact: impact.portfolioReturn,
        probability: impact.probability,
        timeframe: impact.timeframe,
        mitigationStrategies: impact.mitigation
      });
    }
    
    return {
      scenarios: results,
      worstCaseScenario: results.reduce((worst, current) => 
        current.portfolioImpact < worst.portfolioImpact ? current : worst
      ),
      averageImpact: mean(results.map(r => r.portfolioImpact)),
      recommendedHedges: this.identifyHedgingOpportunities(results)
    };
  }

  simulateScenarioImpact(scenario) {
    const impacts = {
      'Market Crash': { portfolioReturn: -0.25, probability: 0.05, timeframe: '1-3 months', mitigation: ['Hedging', 'Diversification'] },
      'Interest Rate Spike': { portfolioReturn: -0.12, probability: 0.15, timeframe: '3-6 months', mitigation: ['Duration management', 'Floating rate assets'] },
      'Currency Crisis': { portfolioReturn: -0.08, probability: 0.10, timeframe: '1-6 months', mitigation: ['Currency hedging', 'Multi-currency exposure'] },
      'Liquidity Crisis': { portfolioReturn: -0.15, probability: 0.08, timeframe: '1-12 months', mitigation: ['Liquidity reserves', 'Gradual position reduction'] }
    };
    
    return impacts[scenario] || { portfolioReturn: -0.05, probability: 0.20, timeframe: 'Unknown', mitigation: ['General risk management'] };
  }

  identifyHedgingOpportunities(stressTestResults) {
    return [
      {
        strategy: 'Protective Puts',
        costPercentage: 0.02,
        effectiveness: 0.80,
        applicableScenarios: ['Market Crash']
      },
      {
        strategy: 'Interest Rate Swaps',
        costPercentage: 0.01,
        effectiveness: 0.70,
        applicableScenarios: ['Interest Rate Spike']
      }
    ];
  }

  identifyPerformanceDrivers(attribution) {
    return {
      topAssets: attribution.analysis.assetLevel?.topContributors || [],
      topSectors: attribution.analysis.sectorLevel?.sectors?.slice(0, 3) || [],
      topStrategies: attribution.analysis.strategyLevel?.strategies?.slice(0, 3) || []
    };
  }

  identifyInefficiencies(attribution) {
    return {
      underperformingAssets: attribution.analysis.assetLevel?.bottomContributors || [],
      concentrationRisks: attribution.analysis.sectorLevel?.concentration || {},
      strategyConflicts: []
    };
  }

  identifyOptimizationOpportunities(attribution) {
    return [
      {
        type: 'REBALANCING',
        priority: 'MEDIUM',
        description: 'Consider rebalancing overweight sectors'
      },
      {
        type: 'DIVERSIFICATION',
        priority: 'LOW',
        description: 'Add exposure to underrepresented asset classes'
      }
    ];
  }

  generateBenchmarkRecommendations(comparison) {
    const recommendations = [];
    
    if (comparison.analysis.outperformance.outperformanceRate < 0.5) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'HIGH',
        title: 'Underperforming Benchmarks',
        description: 'Portfolio is underperforming most benchmarks. Consider strategy review.'
      });
    }
    
    return recommendations;
  }

  generateKeyInsights(riskMetrics, benchmarkComparison) {
    const insights = [];
    
    if (riskMetrics.riskAdjustedMetrics.sharpeRatio > 1) {
      insights.push('Excellent risk-adjusted performance with Sharpe ratio above 1.0');
    }
    
    if (riskMetrics.riskAdjustedMetrics.beta < 0.8) {
      insights.push('Portfolio demonstrates lower market sensitivity than benchmark');
    }
    
    return insights;
  }

  /**
   * Get service status and capabilities
   */
  getServiceStatus() {
    return {
      service: 'AdvancedAnalyticsService',
      version: '1.0.0',
      status: 'active',
      capabilities: {
        attributionAnalysis: true,
        riskAdjustedMetrics: true,
        benchmarkComparison: true,
        customReporting: true,
        realTimeMonitoring: true
      },
      metrics: {
        cachedResults: this.metricsCache.size,
        activePortfolios: this.riskManager.listPortfolios().length,
        availableBenchmarks: Object.keys(this.defaultBenchmarks).length,
        generatedReports: this.reports.size
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = AdvancedAnalyticsService;