const logger = require('../utils/logger');
const math = require('mathjs');

/**
 * Advanced Trading Strategies Service
 * Implements professional trading strategies with real mathematical models
 */
class AdvancedTradingStrategies {
  constructor() {
    this.strategies = new Map();
    this.activeStrategies = new Map();
    this.performanceMetrics = new Map();
    
    // Initialize strategy configurations
    this.initializeStrategies();
  }

  initializeStrategies() {
    this.strategies.set('pairs_trading', {
      name: 'Pairs Trading',
      description: 'Statistical arbitrage using cointegration analysis',
      parameters: {
        lookbackPeriod: 252, // 1 year for cointegration
        entryThreshold: 2.0, // z-score entry threshold
        exitThreshold: 0.5, // z-score exit threshold
        stopLoss: 3.0, // maximum z-score before stop loss
        hedgeRatio: 1.0, // dynamic hedge ratio from regression
        maxPosition: 0.05 // 5% of portfolio per pair
      },
      riskMetrics: {
        maxDrawdown: 0.15,
        sharpeRatio: 1.5,
        volatility: 0.12
      }
    });

    this.strategies.set('mean_reversion', {
      name: 'Mean Reversion',
      description: 'Ornstein-Uhlenbeck process modeling for price reversion',
      parameters: {
        lookbackPeriod: 60,
        meanReversionSpeed: 0.1, // lambda parameter
        volatilityWindow: 20,
        entryThreshold: 1.5, // standard deviations
        exitThreshold: 0.3,
        halfLife: 10, // expected reversion time
        maxHoldingPeriod: 50
      },
      riskMetrics: {
        maxDrawdown: 0.10,
        sharpeRatio: 1.8,
        volatility: 0.08
      }
    });

    this.strategies.set('momentum', {
      name: 'Momentum with Regime Detection',
      description: 'Multi-timeframe momentum with regime switching models',
      parameters: {
        shortWindow: 12,
        longWindow: 26,
        signalWindow: 9,
        regimeLookback: 100,
        momentumThreshold: 0.02,
        regimeVolatilityThreshold: 0.15,
        positionSizing: 'kelly' // Kelly criterion
      },
      riskMetrics: {
        maxDrawdown: 0.20,
        sharpeRatio: 1.2,
        volatility: 0.16
      }
    });

    this.strategies.set('arbitrage', {
      name: 'Cross-Exchange Arbitrage',
      description: 'Multi-exchange price discrepancy exploitation',
      parameters: {
        minSpread: 0.001, // 0.1% minimum spread
        maxLatency: 100, // milliseconds
        transactionCosts: 0.001, // 0.1% per trade
        slippage: 0.0005, // 0.05% slippage assumption
        minVolume: 1000, // minimum volume for execution
        maxExposure: 0.1 // 10% of portfolio
      },
      riskMetrics: {
        maxDrawdown: 0.05,
        sharpeRatio: 2.5,
        volatility: 0.04
      }
    });

    this.strategies.set('portfolio_optimization', {
      name: 'Multi-Asset Portfolio Optimization',
      description: 'Risk parity and factor exposure optimization',
      parameters: {
        rebalanceFrequency: 'weekly',
        lookbackPeriod: 252,
        riskBudget: 0.15, // 15% annual volatility target
        maxWeight: 0.25, // 25% maximum single asset weight
        minWeight: 0.02, // 2% minimum weight
        factorExposure: ['momentum', 'value', 'quality', 'volatility'],
        optimizationMethod: 'mean_variance' // or 'risk_parity'
      },
      riskMetrics: {
        maxDrawdown: 0.12,
        sharpeRatio: 1.6,
        volatility: 0.15
      }
    });
  }

  /**
   * Pairs Trading Strategy Implementation
   * Uses cointegration analysis and z-score mean reversion
   */
  async executePairsTrading(symbol1, symbol2, marketData, config = {}) {
    try {
      const params = { ...this.strategies.get('pairs_trading').parameters, ...config };
      
      // Get price data for both symbols
      const prices1 = marketData[symbol1]?.map(d => d.close) || [];
      const prices2 = marketData[symbol2]?.map(d => d.close) || [];
      
      if (prices1.length < params.lookbackPeriod || prices2.length < params.lookbackPeriod) {
        throw new Error('Insufficient data for pairs trading analysis');
      }

      // Calculate log prices for cointegration analysis
      const logPrices1 = prices1.map(p => Math.log(p));
      const logPrices2 = prices2.map(p => Math.log(p));

      // Perform cointegration test using Engle-Granger method
      const cointegrationResult = this.engleGrangerCointegration(
        logPrices1.slice(-params.lookbackPeriod),
        logPrices2.slice(-params.lookbackPeriod)
      );

      if (!cointegrationResult.isCointegrated) {
        return {
          signal: 'NO_TRADE',
          reason: 'No cointegration detected',
          confidence: 0,
          metrics: cointegrationResult
        };
      }

      // Calculate current spread and z-score
      const hedgeRatio = cointegrationResult.hedgeRatio;
      const spread = logPrices1.map((p1, i) => p1 - hedgeRatio * logPrices2[i]);
      const currentSpread = spread[spread.length - 1];
      
      // Calculate rolling statistics for z-score
      const spreadWindow = spread.slice(-60); // 60-period window
      const spreadMean = this.calculateMean(spreadWindow);
      const spreadStd = this.calculateStandardDeviation(spreadWindow);
      const zScore = (currentSpread - spreadMean) / spreadStd;

      // Generate trading signals
      let signal = 'HOLD';
      let confidence = Math.abs(zScore) / params.entryThreshold;

      if (zScore > params.entryThreshold) {
        signal = 'SHORT_SPREAD'; // Short symbol1, Long symbol2
      } else if (zScore < -params.entryThreshold) {
        signal = 'LONG_SPREAD'; // Long symbol1, Short symbol2
      } else if (Math.abs(zScore) < params.exitThreshold) {
        signal = 'CLOSE_SPREAD';
      }

      // Calculate position sizes using hedge ratio
      const portfolioValue = 100000; // Assume $100k portfolio
      const maxPositionValue = portfolioValue * params.maxPosition;
      const symbol1Price = prices1[prices1.length - 1];
      const symbol2Price = prices2[prices2.length - 1];
      
      const symbol1Quantity = Math.floor(maxPositionValue / symbol1Price);
      const symbol2Quantity = Math.floor((maxPositionValue * hedgeRatio) / symbol2Price);

      return {
        signal,
        confidence: Math.min(confidence, 1.0),
        hedgeRatio,
        zScore,
        spread: currentSpread,
        positions: {
          [symbol1]: signal.includes('LONG_SPREAD') ? symbol1Quantity : 
                    signal.includes('SHORT_SPREAD') ? -symbol1Quantity : 0,
          [symbol2]: signal.includes('LONG_SPREAD') ? -symbol2Quantity : 
                    signal.includes('SHORT_SPREAD') ? symbol2Quantity : 0
        },
        metrics: {
          cointegrationScore: cointegrationResult.pValue,
          halfLife: cointegrationResult.halfLife,
          spreadVolatility: spreadStd,
          currentZScore: zScore
        }
      };

    } catch (error) {
      logger.error('Error in pairs trading strategy:', error);
      throw error;
    }
  }

  /**
   * Mean Reversion Strategy using Ornstein-Uhlenbeck Process
   */
  async executeMeanReversion(symbol, marketData, config = {}) {
    try {
      const params = { ...this.strategies.get('mean_reversion').parameters, ...config };
      const prices = marketData[symbol]?.map(d => d.close) || [];
      
      if (prices.length < params.lookbackPeriod) {
        throw new Error('Insufficient data for mean reversion analysis');
      }

      // Calculate log returns
      const logPrices = prices.map(p => Math.log(p));
      const returns = [];
      for (let i = 1; i < logPrices.length; i++) {
        returns.push(logPrices[i] - logPrices[i - 1]);
      }

      // Estimate Ornstein-Uhlenbeck parameters
      const ouParams = this.estimateOUParameters(logPrices.slice(-params.lookbackPeriod));
      
      // Calculate current price deviation from long-term mean
      const currentLogPrice = logPrices[logPrices.length - 1];
      const longTermMean = ouParams.theta;
      const meanReversionSpeed = ouParams.kappa;
      const volatility = ouParams.sigma;

      // Calculate z-score for mean reversion
      const deviation = currentLogPrice - longTermMean;
      const zScore = deviation / volatility;
      
      // Calculate half-life of mean reversion
      const halfLife = Math.log(2) / meanReversionSpeed;

      // Generate trading signals
      let signal = 'HOLD';
      let confidence = Math.abs(zScore) / params.entryThreshold;

      if (zScore > params.entryThreshold) {
        signal = 'SHORT'; // Price above mean, expect reversion down
      } else if (zScore < -params.entryThreshold) {
        signal = 'LONG'; // Price below mean, expect reversion up
      } else if (Math.abs(zScore) < params.exitThreshold) {
        signal = 'CLOSE';
      }

      // Calculate Kelly optimal position size
      const expectedReturn = -meanReversionSpeed * deviation;
      const variance = volatility * volatility;
      const kellyFraction = expectedReturn / variance;
      const positionSize = Math.max(0, Math.min(kellyFraction, 0.1)); // Cap at 10%

      return {
        signal,
        confidence: Math.min(confidence, 1.0),
        zScore,
        deviation,
        positionSize,
        halfLife,
        metrics: {
          meanReversionSpeed,
          longTermMean,
          volatility,
          expectedReturn,
          kellyFraction
        }
      };

    } catch (error) {
      logger.error('Error in mean reversion strategy:', error);
      throw error;
    }
  }

  /**
   * Momentum Strategy with Regime Detection
   */
  async executeMomentumStrategy(symbol, marketData, config = {}) {
    try {
      const params = { ...this.strategies.get('momentum').parameters, ...config };
      const data = marketData[symbol] || [];
      
      if (data.length < params.regimeLookback) {
        throw new Error('Insufficient data for momentum strategy');
      }

      const prices = data.map(d => d.close);
      const volumes = data.map(d => d.volume);

      // Calculate MACD for momentum
      const macd = this.calculateMACD(prices, params.shortWindow, params.longWindow, params.signalWindow);
      
      // Detect market regime (trending vs ranging)
      const regime = this.detectMarketRegime(prices.slice(-params.regimeLookback));
      
      // Calculate momentum indicators
      const rsi = this.calculateRSI(prices, 14);
      const atr = this.calculateATR(data.slice(-20));
      
      // Volume-weighted momentum
      const vwap = this.calculateVWAP(data.slice(-20));
      const currentPrice = prices[prices.length - 1];
      const volumeRatio = volumes[volumes.length - 1] / this.calculateMean(volumes.slice(-20));

      // Generate signals based on regime
      let signal = 'HOLD';
      let confidence = 0;

      if (regime.trend === 'TRENDING') {
        // In trending regime, follow momentum
        if (macd.histogram > params.momentumThreshold && rsi < 70 && currentPrice > vwap) {
          signal = 'LONG';
          confidence = Math.min((macd.histogram / params.momentumThreshold) * 0.7 + volumeRatio * 0.3, 1.0);
        } else if (macd.histogram < -params.momentumThreshold && rsi > 30 && currentPrice < vwap) {
          signal = 'SHORT';
          confidence = Math.min((-macd.histogram / params.momentumThreshold) * 0.7 + volumeRatio * 0.3, 1.0);
        }
      } else {
        // In ranging regime, use mean reversion
        if (rsi > 80) {
          signal = 'SHORT';
          confidence = (rsi - 80) / 20;
        } else if (rsi < 20) {
          signal = 'LONG';
          confidence = (20 - rsi) / 20;
        }
      }

      // Calculate position size using Kelly criterion
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
      
      const kellyFraction = this.calculateKellyFraction(returns.slice(-60));
      const positionSize = Math.max(0, Math.min(kellyFraction * confidence, 0.15));

      return {
        signal,
        confidence,
        positionSize,
        regime: regime.trend,
        metrics: {
          macd: macd.histogram,
          rsi: rsi[rsi.length - 1],
          atr: atr[atr.length - 1],
          vwap,
          volumeRatio,
          regimeConfidence: regime.confidence,
          kellyFraction
        }
      };

    } catch (error) {
      logger.error('Error in momentum strategy:', error);
      throw error;
    }
  }

  /**
   * Cross-Exchange Arbitrage Strategy
   */
  async executeArbitrageStrategy(symbol, exchangeData, config = {}) {
    try {
      const params = { ...this.strategies.get('arbitrage').parameters, ...config };
      
      // Get prices from multiple exchanges
      const exchanges = Object.keys(exchangeData);
      if (exchanges.length < 2) {
        throw new Error('Need at least 2 exchanges for arbitrage');
      }

      const opportunities = [];
      
      // Compare all exchange pairs
      for (let i = 0; i < exchanges.length; i++) {
        for (let j = i + 1; j < exchanges.length; j++) {
          const exchange1 = exchanges[i];
          const exchange2 = exchanges[j];
          
          const price1 = exchangeData[exchange1]?.bid || 0;
          const price2 = exchangeData[exchange2]?.ask || 0;
          const volume1 = exchangeData[exchange1]?.volume || 0;
          const volume2 = exchangeData[exchange2]?.volume || 0;
          
          if (price1 > 0 && price2 > 0) {
            const spread = (price1 - price2) / price2;
            const netSpread = spread - (params.transactionCosts * 2) - (params.slippage * 2);
            
            if (netSpread > params.minSpread) {
              const maxVolume = Math.min(volume1, volume2, params.minVolume);
              
              opportunities.push({
                buyExchange: exchange2,
                sellExchange: exchange1,
                buyPrice: price2,
                sellPrice: price1,
                spread,
                netSpread,
                maxVolume,
                profit: netSpread * maxVolume * price2
              });
            }
          }
        }
      }

      // Sort opportunities by profit potential
      opportunities.sort((a, b) => b.profit - a.profit);

      if (opportunities.length === 0) {
        return {
          signal: 'NO_ARBITRAGE',
          opportunities: [],
          metrics: {
            exchangeCount: exchanges.length,
            minSpreadRequired: params.minSpread
          }
        };
      }

      const bestOpportunity = opportunities[0];
      
      return {
        signal: 'ARBITRAGE',
        opportunity: bestOpportunity,
        confidence: Math.min(bestOpportunity.netSpread / params.minSpread, 1.0),
        estimatedProfit: bestOpportunity.profit,
        executionPlan: {
          step1: `Buy ${bestOpportunity.maxVolume} ${symbol} on ${bestOpportunity.buyExchange} at ${bestOpportunity.buyPrice}`,
          step2: `Sell ${bestOpportunity.maxVolume} ${symbol} on ${bestOpportunity.sellExchange} at ${bestOpportunity.sellPrice}`,
          timing: 'Simultaneous execution required'
        },
        metrics: {
          totalOpportunities: opportunities.length,
          averageSpread: opportunities.reduce((sum, op) => sum + op.spread, 0) / opportunities.length,
          maxProfit: bestOpportunity.profit
        }
      };

    } catch (error) {
      logger.error('Error in arbitrage strategy:', error);
      throw error;
    }
  }

  /**
   * Multi-Asset Portfolio Optimization
   */
  async executePortfolioOptimization(assets, marketData, config = {}) {
    try {
      const params = { ...this.strategies.get('portfolio_optimization').parameters, ...config };
      
      // Calculate returns matrix
      const returnsMatrix = this.calculateReturnsMatrix(assets, marketData, params.lookbackPeriod);
      
      // Calculate covariance matrix
      const covarianceMatrix = this.calculateCovarianceMatrix(returnsMatrix);
      
      // Calculate expected returns (using historical mean or factor model)
      const expectedReturns = this.calculateExpectedReturns(returnsMatrix, params.factorExposure);
      
      // Optimize portfolio based on method
      let weights;
      if (params.optimizationMethod === 'mean_variance') {
        weights = this.meanVarianceOptimization(expectedReturns, covarianceMatrix, params.riskBudget);
      } else if (params.optimizationMethod === 'risk_parity') {
        weights = this.riskParityOptimization(covarianceMatrix);
      } else {
        throw new Error(`Unknown optimization method: ${params.optimizationMethod}`);
      }

      // Apply weight constraints
      weights = this.applyWeightConstraints(weights, params.minWeight, params.maxWeight);

      // Calculate portfolio metrics
      const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns);
      const portfolioVolatility = this.calculatePortfolioVolatility(weights, covarianceMatrix);
      const sharpeRatio = portfolioReturn / portfolioVolatility;

      // Generate rebalancing signals
      const currentWeights = this.getCurrentPortfolioWeights(assets); // Assume method exists
      const rebalanceSignals = this.generateRebalanceSignals(currentWeights, weights, 0.05); // 5% threshold

      return {
        signal: 'REBALANCE',
        targetWeights: weights,
        currentWeights,
        rebalanceSignals,
        metrics: {
          expectedReturn: portfolioReturn,
          expectedVolatility: portfolioVolatility,
          sharpeRatio,
          diversificationRatio: this.calculateDiversificationRatio(weights, covarianceMatrix),
          maxWeight: Math.max(...Object.values(weights)),
          minWeight: Math.min(...Object.values(weights))
        }
      };

    } catch (error) {
      logger.error('Error in portfolio optimization:', error);
      throw error;
    }
  }

  // Mathematical utility functions

  /**
   * Engle-Granger Cointegration Test
   */
  engleGrangerCointegration(series1, series2) {
    // Step 1: Run regression of series1 on series2
    const { slope, intercept, residuals } = this.linearRegression(series1, series2);
    
    // Step 2: Test residuals for unit root (ADF test)
    const adfStatistic = this.augmentedDickeyFullerTest(residuals);
    
    // Critical values for ADF test (approximate)
    const criticalValues = { '1%': -3.90, '5%': -3.34, '10%': -3.04 };
    const isCointegrated = adfStatistic < criticalValues['5%'];
    
    // Calculate half-life of mean reversion
    const halfLife = this.calculateHalfLife(residuals);
    
    return {
      isCointegrated,
      hedgeRatio: slope,
      intercept,
      adfStatistic,
      pValue: this.adfToPValue(adfStatistic),
      halfLife,
      residuals
    };
  }

  /**
   * Estimate Ornstein-Uhlenbeck Process Parameters
   */
  estimateOUParameters(timeSeries) {
    const n = timeSeries.length;
    const dt = 1; // Assuming unit time steps
    
    // Calculate differences
    const dx = [];
    const x = [];
    for (let i = 1; i < n; i++) {
      dx.push(timeSeries[i] - timeSeries[i - 1]);
      x.push(timeSeries[i - 1]);
    }
    
    // Estimate parameters using linear regression
    const xMean = this.calculateMean(x);
    const centeredX = x.map(val => val - xMean);
    
    const { slope } = this.linearRegression(dx, centeredX);
    const kappa = -slope / dt; // Mean reversion speed
    const theta = xMean; // Long-term mean
    
    // Estimate volatility from residuals
    const predicted = centeredX.map(cx => slope * cx);
    const residuals = dx.map((d, i) => d - predicted[i]);
    const sigma = this.calculateStandardDeviation(residuals) / Math.sqrt(dt);
    
    return { kappa, theta, sigma };
  }

  /**
   * Detect Market Regime (Trending vs Ranging)
   */
  detectMarketRegime(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    // Calculate trend strength indicators
    const volatility = this.calculateStandardDeviation(returns);
    const trendStrength = this.calculateTrendStrength(prices);
    const hurst = this.calculateHurstExponent(prices);
    
    // Regime classification
    let trend = 'RANGING';
    let confidence = 0.5;
    
    if (hurst > 0.55 && trendStrength > 0.3) {
      trend = 'TRENDING';
      confidence = Math.min((hurst - 0.5) * 2 + trendStrength, 1.0);
    } else if (hurst < 0.45 && volatility > 0.02) {
      trend = 'MEAN_REVERTING';
      confidence = Math.min((0.5 - hurst) * 2 + volatility * 25, 1.0);
    }
    
    return { trend, confidence, hurst, volatility, trendStrength };
  }

  /**
   * Calculate MACD
   */
  calculateMACD(prices, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
    const emaShort = this.calculateEMA(prices, shortPeriod);
    const emaLong = this.calculateEMA(prices, longPeriod);
    
    const macdLine = emaShort.map((short, i) => short - emaLong[i]);
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
    
    return {
      macd: macdLine[macdLine.length - 1],
      signal: signalLine[signalLine.length - 1],
      histogram: histogram[histogram.length - 1]
    };
  }

  /**
   * Calculate RSI
   */
  calculateRSI(prices, period = 14) {
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }
    
    const rsi = [];
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = this.calculateMean(gains.slice(i - period + 1, i + 1));
      const avgLoss = this.calculateMean(losses.slice(i - period + 1, i + 1));
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    
    return rsi;
  }

  /**
   * Calculate Average True Range (ATR)
   */
  calculateATR(ohlcData, period = 14) {
    const trueRanges = [];
    
    for (let i = 1; i < ohlcData.length; i++) {
      const high = ohlcData[i].high;
      const low = ohlcData[i].low;
      const prevClose = ohlcData[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    return this.calculateSMA(trueRanges, period);
  }

  /**
   * Calculate Volume Weighted Average Price (VWAP)
   */
  calculateVWAP(ohlcvData) {
    let totalVolume = 0;
    let totalVolumePrice = 0;
    
    ohlcvData.forEach(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      totalVolumePrice += typicalPrice * candle.volume;
      totalVolume += candle.volume;
    });
    
    return totalVolume > 0 ? totalVolumePrice / totalVolume : 0;
  }

  /**
   * Calculate Kelly Fraction for position sizing
   */
  calculateKellyFraction(returns) {
    if (returns.length === 0) return 0;
    
    const mean = this.calculateMean(returns);
    const variance = this.calculateVariance(returns);
    
    if (variance === 0) return 0;
    
    return mean / variance;
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

  calculateEMA(values, period) {
    const multiplier = 2 / (period + 1);
    const ema = [values[0]];
    
    for (let i = 1; i < values.length; i++) {
      ema.push((values[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
    }
    
    return ema;
  }

  calculateSMA(values, period) {
    const sma = [];
    for (let i = period - 1; i < values.length; i++) {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  linearRegression(y, x) {
    const n = y.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const residuals = y.map((yi, i) => yi - (slope * x[i] + intercept));
    
    return { slope, intercept, residuals };
  }

  // Additional helper methods would be implemented here...
  // Including ADF test, Hurst exponent, portfolio optimization methods, etc.

  augmentedDickeyFullerTest(series) {
    // Simplified ADF test implementation
    const n = series.length;
    const laggedSeries = series.slice(0, -1);
    const differences = series.slice(1).map((val, i) => val - laggedSeries[i]);
    
    const { slope } = this.linearRegression(differences, laggedSeries);
    const residuals = differences.map((diff, i) => diff - slope * laggedSeries[i]);
    const residualStd = this.calculateStandardDeviation(residuals);
    
    return slope / (residualStd / Math.sqrt(n));
  }

  adfToPValue(adfStatistic) {
    // Simplified p-value calculation
    if (adfStatistic < -3.90) return 0.01;
    if (adfStatistic < -3.34) return 0.05;
    if (adfStatistic < -3.04) return 0.10;
    return 0.15;
  }

  calculateHalfLife(residuals) {
    const { slope } = this.linearRegression(
      residuals.slice(1),
      residuals.slice(0, -1)
    );
    return -Math.log(2) / Math.log(Math.abs(slope));
  }

  calculateTrendStrength(prices) {
    const n = prices.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const { slope } = this.linearRegression(prices, x);
    
    const predicted = x.map(xi => slope * xi + prices[0]);
    const residuals = prices.map((p, i) => p - predicted[i]);
    const residualStd = this.calculateStandardDeviation(residuals);
    
    return Math.abs(slope) / residualStd;
  }

  calculateHurstExponent(prices) {
    // Simplified Hurst exponent calculation using R/S analysis
    const n = prices.length;
    const logReturns = [];
    
    for (let i = 1; i < n; i++) {
      logReturns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    const mean = this.calculateMean(logReturns);
    const std = this.calculateStandardDeviation(logReturns);
    
    if (std === 0) return 0.5;
    
    // Calculate R/S for different time lags
    const lags = [10, 20, 50, 100];
    const rsValues = [];
    
    lags.forEach(lag => {
      if (lag < logReturns.length) {
        let maxR = 0;
        for (let i = 0; i <= logReturns.length - lag; i++) {
          const subset = logReturns.slice(i, i + lag);
          const subsetMean = this.calculateMean(subset);
          
          let cumulative = 0;
          let maxCum = 0;
          let minCum = 0;
          
          subset.forEach(ret => {
            cumulative += ret - subsetMean;
            maxCum = Math.max(maxCum, cumulative);
            minCum = Math.min(minCum, cumulative);
          });
          
          const range = maxCum - minCum;
          maxR = Math.max(maxR, range);
        }
        
        const avgStd = this.calculateStandardDeviation(logReturns.slice(0, lag));
        if (avgStd > 0) {
          rsValues.push(maxR / avgStd);
        }
      }
    });
    
    if (rsValues.length < 2) return 0.5;
    
    // Fit log(R/S) vs log(lag) to get Hurst exponent
    const logRS = rsValues.map(rs => Math.log(rs));
    const logLags = lags.slice(0, rsValues.length).map(lag => Math.log(lag));
    
    const { slope } = this.linearRegression(logRS, logLags);
    return Math.max(0, Math.min(1, slope)); // Clamp between 0 and 1
  }

  // Portfolio optimization methods
  meanVarianceOptimization(expectedReturns, covarianceMatrix, targetVolatility) {
    // Simplified mean-variance optimization
    // In practice, this would use quadratic programming
    const n = expectedReturns.length;
    const weights = {};
    
    // Equal risk contribution as starting point
    const assets = Object.keys(expectedReturns);
    const equalWeight = 1 / n;
    
    assets.forEach(asset => {
      weights[asset] = equalWeight;
    });
    
    return weights;
  }

  riskParityOptimization(covarianceMatrix) {
    // Risk parity portfolio (equal risk contribution)
    const assets = Object.keys(covarianceMatrix);
    const n = assets.length;
    const weights = {};
    
    // Calculate inverse volatility weights as approximation
    const volatilities = {};
    assets.forEach(asset => {
      volatilities[asset] = Math.sqrt(covarianceMatrix[asset][asset]);
    });
    
    const invVolSum = assets.reduce((sum, asset) => sum + (1 / volatilities[asset]), 0);
    
    assets.forEach(asset => {
      weights[asset] = (1 / volatilities[asset]) / invVolSum;
    });
    
    return weights;
  }

  calculateReturnsMatrix(assets, marketData, lookbackPeriod) {
    const returns = {};
    
    assets.forEach(asset => {
      const prices = marketData[asset]?.map(d => d.close) || [];
      const assetReturns = [];
      
      for (let i = 1; i < Math.min(prices.length, lookbackPeriod + 1); i++) {
        assetReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
      
      returns[asset] = assetReturns;
    });
    
    return returns;
  }

  calculateCovarianceMatrix(returnsMatrix) {
    const assets = Object.keys(returnsMatrix);
    const covariance = {};
    
    assets.forEach(asset1 => {
      covariance[asset1] = {};
      assets.forEach(asset2 => {
        covariance[asset1][asset2] = this.calculateCovariance(
          returnsMatrix[asset1],
          returnsMatrix[asset2]
        );
      });
    });
    
    return covariance;
  }

  calculateCovariance(series1, series2) {
    if (series1.length !== series2.length) return 0;
    
    const mean1 = this.calculateMean(series1);
    const mean2 = this.calculateMean(series2);
    
    const covariance = series1.reduce((sum, val1, i) => {
      return sum + (val1 - mean1) * (series2[i] - mean2);
    }, 0) / (series1.length - 1);
    
    return covariance;
  }

  calculateExpectedReturns(returnsMatrix, factorExposure) {
    const expectedReturns = {};
    
    Object.keys(returnsMatrix).forEach(asset => {
      expectedReturns[asset] = this.calculateMean(returnsMatrix[asset]);
    });
    
    return expectedReturns;
  }

  calculatePortfolioReturn(weights, expectedReturns) {
    return Object.keys(weights).reduce((sum, asset) => {
      return sum + weights[asset] * expectedReturns[asset];
    }, 0);
  }

  calculatePortfolioVolatility(weights, covarianceMatrix) {
    const assets = Object.keys(weights);
    let variance = 0;
    
    assets.forEach(asset1 => {
      assets.forEach(asset2 => {
        variance += weights[asset1] * weights[asset2] * covarianceMatrix[asset1][asset2];
      });
    });
    
    return Math.sqrt(variance);
  }

  applyWeightConstraints(weights, minWeight, maxWeight) {
    const constrainedWeights = {};
    let totalWeight = 0;
    
    // Apply min/max constraints
    Object.keys(weights).forEach(asset => {
      constrainedWeights[asset] = Math.max(minWeight, Math.min(maxWeight, weights[asset]));
      totalWeight += constrainedWeights[asset];
    });
    
    // Normalize to sum to 1
    Object.keys(constrainedWeights).forEach(asset => {
      constrainedWeights[asset] /= totalWeight;
    });
    
    return constrainedWeights;
  }

  getCurrentPortfolioWeights(assets) {
    // Placeholder - would get actual portfolio weights from database
    const weights = {};
    assets.forEach(asset => {
      weights[asset] = 1 / assets.length; // Equal weights as default
    });
    return weights;
  }

  generateRebalanceSignals(currentWeights, targetWeights, threshold) {
    const signals = {};
    
    Object.keys(targetWeights).forEach(asset => {
      const currentWeight = currentWeights[asset] || 0;
      const targetWeight = targetWeights[asset];
      const difference = Math.abs(targetWeight - currentWeight);
      
      if (difference > threshold) {
        signals[asset] = {
          action: targetWeight > currentWeight ? 'BUY' : 'SELL',
          currentWeight,
          targetWeight,
          difference
        };
      }
    });
    
    return signals;
  }

  calculateDiversificationRatio(weights, covarianceMatrix) {
    // Diversification ratio = weighted average volatility / portfolio volatility
    const assets = Object.keys(weights);
    const weightedAvgVol = assets.reduce((sum, asset) => {
      return sum + weights[asset] * Math.sqrt(covarianceMatrix[asset][asset]);
    }, 0);
    
    const portfolioVol = this.calculatePortfolioVolatility(weights, covarianceMatrix);
    
    return portfolioVol > 0 ? weightedAvgVol / portfolioVol : 1;
  }

  /**
   * Get strategy performance metrics
   */
  getStrategyMetrics(strategyId) {
    return this.performanceMetrics.get(strategyId) || {};
  }

  /**
   * Update strategy performance
   */
  updateStrategyPerformance(strategyId, metrics) {
    this.performanceMetrics.set(strategyId, {
      ...this.performanceMetrics.get(strategyId),
      ...metrics,
      lastUpdated: new Date()
    });
  }

  /**
   * Get all available strategies
   */
  getAvailableStrategies() {
    return Array.from(this.strategies.entries()).map(([id, config]) => ({
      id,
      ...config
    }));
  }
}

module.exports = AdvancedTradingStrategies;