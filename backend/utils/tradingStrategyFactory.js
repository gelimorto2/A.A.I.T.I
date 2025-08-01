const logger = require('./logger');
const mlService = require('./mlService');
const advancedIndicators = require('./advancedIndicators');
const { mean, standardDeviation } = require('simple-statistics');

/**
 * ML Trading Strategy Factory
 * Sophisticated framework for creating and managing ML-based trading strategies
 */
class TradingStrategyFactory {
  constructor() {
    this.strategies = new Map();
    this.activeStrategies = new Map();
    this.strategyPerformance = new Map();
    
    // Strategy types
    this.strategyTypes = {
      ML_TREND_FOLLOWING: 'ml_trend_following',
      ML_MEAN_REVERSION: 'ml_mean_reversion',
      ML_MOMENTUM: 'ml_momentum',
      ML_ARBITRAGE: 'ml_arbitrage',
      ML_PAIRS_TRADING: 'ml_pairs_trading',
      ML_VOLATILITY_BREAKOUT: 'ml_volatility_breakout',
      ML_NEWS_SENTIMENT: 'ml_news_sentiment',
      ENSEMBLE_MULTI_MODEL: 'ensemble_multi_model'
    };
    
    logger.info('TradingStrategyFactory initialized with 8 ML strategy types');
  }

  /**
   * Create a new ML trading strategy
   */
  async createStrategy(strategyConfig) {
    const {
      name,
      type,
      models,
      symbols,
      timeframes,
      parameters = {},
      riskManagement = {}
    } = strategyConfig;

    try {
      const strategyId = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info(`Creating ${type} strategy: ${name}`, { 
        strategyId, 
        models: models.length,
        symbols: symbols.length 
      });

      // Validate models exist
      const validModels = [];
      for (const modelId of models) {
        const model = mlService.getModel(modelId);
        if (model) {
          validModels.push(model);
        } else {
          logger.warn(`Model ${modelId} not found, skipping`);
        }
      }

      if (validModels.length === 0) {
        throw new Error('No valid models provided for strategy');
      }

      // Create strategy based on type
      let strategy;
      switch (type) {
        case this.strategyTypes.ML_TREND_FOLLOWING:
          strategy = this.createTrendFollowingStrategy(validModels, symbols, parameters);
          break;
        case this.strategyTypes.ML_MEAN_REVERSION:
          strategy = this.createMeanReversionStrategy(validModels, symbols, parameters);
          break;
        case this.strategyTypes.ML_MOMENTUM:
          strategy = this.createMomentumStrategy(validModels, symbols, parameters);
          break;
        case this.strategyTypes.ML_ARBITRAGE:
          strategy = this.createArbitrageStrategy(validModels, symbols, parameters);
          break;
        case this.strategyTypes.ML_PAIRS_TRADING:
          strategy = this.createPairsTradingStrategy(validModels, symbols, parameters);
          break;
        case this.strategyTypes.ML_VOLATILITY_BREAKOUT:
          strategy = this.createVolatilityBreakoutStrategy(validModels, symbols, parameters);
          break;
        case this.strategyTypes.ENSEMBLE_MULTI_MODEL:
          strategy = this.createEnsembleStrategy(validModels, symbols, parameters);
          break;
        default:
          throw new Error(`Unknown strategy type: ${type}`);
      }

      // Add common strategy properties
      strategy.id = strategyId;
      strategy.name = name;
      strategy.type = type;
      strategy.symbols = symbols;
      strategy.timeframes = timeframes;
      strategy.models = validModels.map(m => m.id);
      strategy.riskManagement = this.applyDefaultRiskManagement(riskManagement);
      strategy.createdAt = new Date().toISOString();
      strategy.status = 'inactive';

      this.strategies.set(strategyId, strategy);
      
      logger.info(`Strategy created successfully: ${name}`, { 
        strategyId,
        type,
        modelsUsed: validModels.length
      });

      return strategy;

    } catch (error) {
      logger.error('Error creating trading strategy:', error);
      throw error;
    }
  }

  /**
   * ML Trend Following Strategy
   */
  createTrendFollowingStrategy(models, symbols, parameters) {
    const trendThreshold = parameters.trendThreshold || 0.6;
    const confirmationPeriod = parameters.confirmationPeriod || 3;
    
    return {
      logicType: 'trend_following',
      trendThreshold,
      confirmationPeriod,
      signalLogic: async (marketData, symbol) => {
        const signals = [];
        
        for (const model of models) {
          const features = this.extractFeaturesForSymbol(marketData, symbol);
          if (features.length === 0) continue;
          
          const prediction = mlService.predict(
            mlService.deserializeModel(model.model).modelData,
            [features],
            model.algorithmType
          )[0];
          
          const confidence = Math.abs(prediction);
          
          if (confidence > trendThreshold) {
            signals.push({
              modelId: model.id,
              signal: prediction > 0 ? 'buy' : 'sell',
              strength: confidence,
              reason: `Trend prediction: ${prediction.toFixed(4)}`
            });
          }
        }
        
        return this.consolidateSignals(signals, 'trend_following');
      }
    };
  }

  /**
   * ML Mean Reversion Strategy
   */
  createMeanReversionStrategy(models, symbols, parameters) {
    const deviationThreshold = parameters.deviationThreshold || 2.0;
    const meanPeriod = parameters.meanPeriod || 20;
    
    return {
      logicType: 'mean_reversion',
      deviationThreshold,
      meanPeriod,
      signalLogic: async (marketData, symbol) => {
        const signals = [];
        const prices = this.getPricesForSymbol(marketData, symbol);
        
        if (prices.length < meanPeriod) return [];
        
        const recentPrices = prices.slice(-meanPeriod);
        const mean = mean(recentPrices);
        const stdDev = standardDeviation(recentPrices);
        const currentPrice = prices[prices.length - 1];
        const deviation = (currentPrice - mean) / stdDev;
        
        for (const model of models) {
          const features = this.extractFeaturesForSymbol(marketData, symbol);
          if (features.length === 0) continue;
          
          const prediction = mlService.predict(
            mlService.deserializeModel(model.model).modelData,
            [features],
            model.algorithmType
          )[0];
          
          // Mean reversion logic: buy when oversold, sell when overbought
          if (Math.abs(deviation) > deviationThreshold) {
            const signal = deviation > 0 ? 'sell' : 'buy'; // Opposite to deviation
            const confidence = Math.min(Math.abs(deviation) / deviationThreshold, 1);
            
            signals.push({
              modelId: model.id,
              signal,
              strength: confidence,
              reason: `Mean reversion: ${deviation.toFixed(2)} std dev, ML prediction: ${prediction.toFixed(4)}`
            });
          }
        }
        
        return this.consolidateSignals(signals, 'mean_reversion');
      }
    };
  }

  /**
   * ML Momentum Strategy
   */
  createMomentumStrategy(models, symbols, parameters) {
    const momentumPeriod = parameters.momentumPeriod || 12;
    const minimumMomentum = parameters.minimumMomentum || 0.05;
    
    return {
      logicType: 'momentum',
      momentumPeriod,
      minimumMomentum,
      signalLogic: async (marketData, symbol) => {
        const signals = [];
        const prices = this.getPricesForSymbol(marketData, symbol);
        
        if (prices.length < momentumPeriod + 1) return [];
        
        const momentum = (prices[prices.length - 1] - prices[prices.length - 1 - momentumPeriod]) 
                        / prices[prices.length - 1 - momentumPeriod];
        
        if (Math.abs(momentum) < minimumMomentum) return [];
        
        for (const model of models) {
          const features = this.extractFeaturesForSymbol(marketData, symbol);
          if (features.length === 0) continue;
          
          const prediction = mlService.predict(
            mlService.deserializeModel(model.model).modelData,
            [features],
            model.algorithmType
          )[0];
          
          // Momentum strategy: follow the momentum if ML confirms
          const momentumSignal = momentum > 0 ? 'buy' : 'sell';
          const mlSignal = prediction > 0 ? 'buy' : 'sell';
          
          if (momentumSignal === mlSignal) {
            signals.push({
              modelId: model.id,
              signal: momentumSignal,
              strength: Math.min(Math.abs(momentum) * Math.abs(prediction), 1),
              reason: `Momentum (${(momentum * 100).toFixed(2)}%) + ML confirmation`
            });
          }
        }
        
        return this.consolidateSignals(signals, 'momentum');
      }
    };
  }

  /**
   * ML Pairs Trading Strategy
   */
  createPairsTradingStrategy(models, symbols, parameters) {
    const correlationThreshold = parameters.correlationThreshold || 0.8;
    const spreadThreshold = parameters.spreadThreshold || 2.0;
    
    if (symbols.length < 2) {
      throw new Error('Pairs trading requires at least 2 symbols');
    }
    
    return {
      logicType: 'pairs_trading',
      correlationThreshold,
      spreadThreshold,
      signalLogic: async (marketData, symbol) => {
        const signals = [];
        
        // Find correlated pairs
        const pairs = this.findCorrelatedPairs(marketData, symbols, correlationThreshold);
        
        for (const pair of pairs) {
          const spread = this.calculateSpread(marketData, pair.symbol1, pair.symbol2);
          
          if (Math.abs(spread.zscore) > spreadThreshold) {
            for (const model of models) {
              const features1 = this.extractFeaturesForSymbol(marketData, pair.symbol1);
              const features2 = this.extractFeaturesForSymbol(marketData, pair.symbol2);
              
              if (features1.length === 0 || features2.length === 0) continue;
              
              const prediction1 = mlService.predict(
                mlService.deserializeModel(model.model).modelData,
                [features1],
                model.algorithmType
              )[0];
              
              const prediction2 = mlService.predict(
                mlService.deserializeModel(model.model).modelData,
                [features2],
                model.algorithmType
              )[0];
              
              // Pairs trade logic
              if (spread.zscore > spreadThreshold && prediction1 < prediction2) {
                signals.push({
                  modelId: model.id,
                  signal: 'sell',
                  targetSymbol: pair.symbol1,
                  hedgeSymbol: pair.symbol2,
                  strength: Math.min(Math.abs(spread.zscore) / spreadThreshold, 1),
                  reason: `Pairs divergence: ${pair.symbol1} overvalued vs ${pair.symbol2}`
                });
              } else if (spread.zscore < -spreadThreshold && prediction1 > prediction2) {
                signals.push({
                  modelId: model.id,
                  signal: 'buy',
                  targetSymbol: pair.symbol1,
                  hedgeSymbol: pair.symbol2,
                  strength: Math.min(Math.abs(spread.zscore) / spreadThreshold, 1),
                  reason: `Pairs divergence: ${pair.symbol1} undervalued vs ${pair.symbol2}`
                });
              }
            }
          }
        }
        
        return this.consolidateSignals(signals, 'pairs_trading');
      }
    };
  }

  /**
   * ML Volatility Breakout Strategy
   */
  createVolatilityBreakoutStrategy(models, symbols, parameters) {
    const volatilityPeriod = parameters.volatilityPeriod || 20;
    const breakoutMultiplier = parameters.breakoutMultiplier || 1.5;
    
    return {
      logicType: 'volatility_breakout',
      volatilityPeriod,
      breakoutMultiplier,
      signalLogic: async (marketData, symbol) => {
        const signals = [];
        const prices = this.getPricesForSymbol(marketData, symbol);
        
        if (prices.length < volatilityPeriod + 1) return [];
        
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
          returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        const recentReturns = returns.slice(-volatilityPeriod);
        const volatility = standardDeviation(recentReturns);
        const currentReturn = returns[returns.length - 1];
        
        if (Math.abs(currentReturn) > volatility * breakoutMultiplier) {
          for (const model of models) {
            const features = this.extractFeaturesForSymbol(marketData, symbol);
            if (features.length === 0) continue;
            
            const prediction = mlService.predict(
              mlService.deserializeModel(model.model).modelData,
              [features],
              model.algorithmType
            )[0];
            
            const breakoutSignal = currentReturn > 0 ? 'buy' : 'sell';
            const mlSignal = prediction > 0 ? 'buy' : 'sell';
            
            if (breakoutSignal === mlSignal) {
              signals.push({
                modelId: model.id,
                signal: breakoutSignal,
                strength: Math.min(Math.abs(currentReturn) / (volatility * breakoutMultiplier), 1),
                reason: `Volatility breakout (${(currentReturn * 100).toFixed(2)}%) + ML confirmation`
              });
            }
          }
        }
        
        return this.consolidateSignals(signals, 'volatility_breakout');
      }
    };
  }

  /**
   * Ensemble Multi-Model Strategy
   */
  createEnsembleStrategy(models, symbols, parameters) {
    const consensusThreshold = parameters.consensusThreshold || 0.7;
    const weightingMethod = parameters.weightingMethod || 'equal'; // equal, performance, confidence
    
    return {
      logicType: 'ensemble',
      consensusThreshold,
      weightingMethod,
      signalLogic: async (marketData, symbol) => {
        const modelPredictions = [];
        
        for (const model of models) {
          const features = this.extractFeaturesForSymbol(marketData, symbol);
          if (features.length === 0) continue;
          
          const prediction = mlService.predict(
            mlService.deserializeModel(model.model).modelData,
            [features],
            model.algorithmType
          )[0];
          
          modelPredictions.push({
            modelId: model.id,
            prediction,
            confidence: Math.abs(prediction),
            weight: this.getModelWeight(model.id, weightingMethod)
          });
        }
        
        if (modelPredictions.length === 0) return [];
        
        // Calculate weighted ensemble prediction
        const totalWeight = modelPredictions.reduce((sum, p) => sum + p.weight, 0);
        const ensemblePrediction = modelPredictions.reduce((sum, p) => 
          sum + (p.prediction * p.weight), 0) / totalWeight;
        
        const ensembleConfidence = modelPredictions.reduce((sum, p) => 
          sum + (p.confidence * p.weight), 0) / totalWeight;
        
        // Check consensus
        const bullishCount = modelPredictions.filter(p => p.prediction > 0).length;
        const consensus = Math.max(bullishCount, modelPredictions.length - bullishCount) / modelPredictions.length;
        
        if (consensus >= consensusThreshold && ensembleConfidence > 0.5) {
          return [{
            signal: ensemblePrediction > 0 ? 'buy' : 'sell',
            strength: ensembleConfidence,
            consensus,
            modelCount: modelPredictions.length,
            reason: `Ensemble consensus (${(consensus * 100).toFixed(1)}%) with ${modelPredictions.length} models`
          }];
        }
        
        return [];
      }
    };
  }

  /**
   * Execute strategy signals
   */
  async executeStrategy(strategyId, marketData) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    try {
      const allSignals = [];
      
      for (const symbol of strategy.symbols) {
        const signals = await strategy.signalLogic(marketData, symbol);
        
        for (const signal of signals) {
          signal.symbol = symbol;
          signal.strategyId = strategyId;
          signal.timestamp = new Date().toISOString();
          
          // Apply risk management
          const riskAdjustedSignal = this.applyRiskManagement(signal, strategy.riskManagement, marketData);
          if (riskAdjustedSignal) {
            allSignals.push(riskAdjustedSignal);
          }
        }
      }
      
      if (allSignals.length > 0) {
        logger.info(`Strategy ${strategy.name} generated ${allSignals.length} signals`);
      }
      
      return allSignals;

    } catch (error) {
      logger.error(`Error executing strategy ${strategyId}:`, error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  extractFeaturesForSymbol(marketData, symbol) {
    const symbolData = marketData.filter(d => d.symbol === symbol).slice(-50);
    if (symbolData.length < 20) return [];

    const ohlcv = {
      highs: symbolData.map(d => d.high || d.close),
      lows: symbolData.map(d => d.low || d.close),
      opens: symbolData.map(d => d.open || d.close),
      closes: symbolData.map(d => d.close),
      volumes: symbolData.map(d => d.volume || 1000000)
    };

    return advancedIndicators.generateMLFeatures(ohlcv);
  }

  getPricesForSymbol(marketData, symbol) {
    return marketData
      .filter(d => d.symbol === symbol)
      .map(d => d.close)
      .slice(-100); // Last 100 prices
  }

  consolidateSignals(signals, strategyType) {
    if (signals.length === 0) return [];
    
    // Group signals by direction
    const buySignals = signals.filter(s => s.signal === 'buy');
    const sellSignals = signals.filter(s => s.signal === 'sell');
    
    const result = [];
    
    if (buySignals.length > 0) {
      const avgStrength = mean(buySignals.map(s => s.strength));
      result.push({
        signal: 'buy',
        strength: avgStrength,
        modelCount: buySignals.length,
        strategyType,
        reason: `${buySignals.length} models suggest BUY`
      });
    }
    
    if (sellSignals.length > 0) {
      const avgStrength = mean(sellSignals.map(s => s.strength));
      result.push({
        signal: 'sell',
        strength: avgStrength,
        modelCount: sellSignals.length,
        strategyType,
        reason: `${sellSignals.length} models suggest SELL`
      });
    }
    
    return result;
  }

  applyDefaultRiskManagement(userSettings) {
    return {
      maxPositionSize: userSettings.maxPositionSize || 0.1, // 10% of portfolio
      stopLossPercent: userSettings.stopLossPercent || 0.05, // 5%
      takeProfitPercent: userSettings.takeProfitPercent || 0.15, // 15%
      maxDrawdown: userSettings.maxDrawdown || 0.2, // 20%
      minConfidence: userSettings.minConfidence || 0.6, // 60%
      ...userSettings
    };
  }

  applyRiskManagement(signal, riskManagement, marketData) {
    // Filter by minimum confidence
    if (signal.strength < riskManagement.minConfidence) {
      return null;
    }
    
    // Add risk management parameters to signal
    signal.positionSize = Math.min(signal.strength * riskManagement.maxPositionSize, riskManagement.maxPositionSize);
    signal.stopLoss = riskManagement.stopLossPercent;
    signal.takeProfit = riskManagement.takeProfitPercent;
    
    return signal;
  }

  getModelWeight(modelId, weightingMethod) {
    switch (weightingMethod) {
      case 'performance':
        const performance = mlService.getModelPerformanceHistory(modelId);
        if (performance.length > 0) {
          const recentPerf = performance.slice(-5);
          return mean(recentPerf.map(p => p.directionalAccuracy || 0.5));
        }
        return 0.5;
      
      case 'confidence':
        // Would need to track confidence over time
        return 1.0;
      
      case 'equal':
      default:
        return 1.0;
    }
  }

  findCorrelatedPairs(marketData, symbols, threshold) {
    const pairs = [];
    
    for (let i = 0; i < symbols.length - 1; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const prices1 = this.getPricesForSymbol(marketData, symbols[i]);
        const prices2 = this.getPricesForSymbol(marketData, symbols[j]);
        
        const correlation = this.calculateCorrelation(prices1, prices2);
        
        if (Math.abs(correlation) > threshold) {
          pairs.push({
            symbol1: symbols[i],
            symbol2: symbols[j],
            correlation
          });
        }
      }
    }
    
    return pairs;
  }

  calculateCorrelation(series1, series2) {
    const minLength = Math.min(series1.length, series2.length);
    if (minLength < 2) return 0;
    
    const s1 = series1.slice(-minLength);
    const s2 = series2.slice(-minLength);
    
    const mean1 = mean(s1);
    const mean2 = mean(s2);
    
    let numerator = 0;
    let sum1 = 0;
    let sum2 = 0;
    
    for (let i = 0; i < minLength; i++) {
      const diff1 = s1[i] - mean1;
      const diff2 = s2[i] - mean2;
      numerator += diff1 * diff2;
      sum1 += diff1 * diff1;
      sum2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sum1 * sum2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  calculateSpread(marketData, symbol1, symbol2) {
    const prices1 = this.getPricesForSymbol(marketData, symbol1);
    const prices2 = this.getPricesForSymbol(marketData, symbol2);
    
    const minLength = Math.min(prices1.length, prices2.length);
    const spreads = [];
    
    for (let i = 0; i < minLength; i++) {
      spreads.push(prices1[i] - prices2[i]);
    }
    
    const spreadMean = mean(spreads);
    const spreadStd = standardDeviation(spreads);
    const currentSpread = spreads[spreads.length - 1];
    
    return {
      current: currentSpread,
      mean: spreadMean,
      std: spreadStd,
      zscore: spreadStd === 0 ? 0 : (currentSpread - spreadMean) / spreadStd
    };
  }

  /**
   * Strategy management methods
   */
  getStrategy(strategyId) {
    return this.strategies.get(strategyId);
  }

  listStrategies() {
    return Array.from(this.strategies.values());
  }

  deleteStrategy(strategyId) {
    return this.strategies.delete(strategyId);
  }

  activateStrategy(strategyId) {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.status = 'active';
      this.activeStrategies.set(strategyId, strategy);
      logger.info(`Strategy activated: ${strategy.name}`);
      return true;
    }
    return false;
  }

  deactivateStrategy(strategyId) {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.status = 'inactive';
      this.activeStrategies.delete(strategyId);
      logger.info(`Strategy deactivated: ${strategy.name}`);
      return true;
    }
    return false;
  }

  getActiveStrategies() {
    return Array.from(this.activeStrategies.values());
  }
}

module.exports = new TradingStrategyFactory();