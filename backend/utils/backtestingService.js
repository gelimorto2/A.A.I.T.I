const { v4: uuidv4 } = require('uuid');
const { mean } = require('simple-statistics');
const logger = require('./logger');
const mlService = require('./mlService');
const advancedIndicators = require('./advancedIndicators');

class BacktestingService {
  constructor() {
    this.activeBacktests = new Map();
    logger.info('Enhanced BacktestingService initialized with walk-forward optimization and Monte Carlo simulation');
  }

  /**
   * Run a backtest for a given model and parameters
   */
  async runBacktest(backtestConfig) {
    const backtestId = uuidv4();
    const {
      modelId,
      userId,
      symbols,
      startDate,
      endDate,
      initialCapital = 100000,
      commission = 0.001, // 0.1%
      slippage = 0.0005, // 0.05%
      positionSizing = 'fixed', // fixed, percentage, kelly
      riskPerTrade = 0.02, // 2% risk per trade
      stopLoss = 0.05, // 5%
      takeProfit = 0.10, // 10%
      maxPositions = 5
    } = backtestConfig;

    try {
      logger.info(`Starting backtest ${backtestId} for model ${modelId}`);
      
      // Get model
      const model = mlService.getModel(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      // Get historical market data
      const marketData = await this.getHistoricalData(symbols, startDate, endDate);
      if (!marketData || marketData.length === 0) {
        throw new Error('No historical data available for the specified period');
      }

      // Initialize backtest state
      const backtestState = this.initializeBacktestState(
        backtestId,
        initialCapital,
        commission,
        slippage,
        maxPositions
      );

      // Run the backtest simulation
      const trades = await this.simulateTrading(
        model,
        marketData,
        backtestState,
        {
          positionSizing,
          riskPerTrade,
          stopLoss,
          takeProfit
        }
      );

      // Calculate performance metrics
      const performanceMetrics = this.calculateBacktestPerformance(
        trades,
        backtestState,
        initialCapital
      );

      // Prepare backtest results
      const backtestResults = {
        id: backtestId,
        modelId,
        userId,
        symbols,
        startDate,
        endDate,
        initialCapital,
        finalCapital: backtestState.currentCapital,
        totalReturn: performanceMetrics.totalReturn,
        sharpeRatio: performanceMetrics.sharpeRatio,
        maxDrawdown: performanceMetrics.maxDrawdown,
        totalTrades: trades.length,
        winRate: performanceMetrics.winRate,
        avgTradeDuration: performanceMetrics.avgTradeDuration,
        profitFactor: performanceMetrics.profitFactor,
        parameters: JSON.stringify(backtestConfig),
        trades: trades,
        performanceMetrics,
        createdAt: new Date().toISOString()
      };

      this.activeBacktests.set(backtestId, backtestResults);
      logger.info(`Backtest ${backtestId} completed successfully`);
      
      return backtestResults;
    } catch (error) {
      logger.error(`Error running backtest ${backtestId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize backtest state
   */
  initializeBacktestState(backtestId, initialCapital, commission, slippage, maxPositions) {
    return {
      backtestId,
      currentCapital: initialCapital,
      initialCapital,
      positions: new Map(),
      openPositions: [],
      completedTrades: [],
      commission,
      slippage,
      maxPositions,
      equity: [initialCapital],
      equityDates: [new Date()],
      peakEquity: initialCapital,
      maxDrawdown: 0,
      dailyReturns: []
    };
  }

  /**
   * Simulate trading based on model predictions
   */
  async simulateTrading(model, marketData, backtestState, tradingParams) {
    const { positionSizing, riskPerTrade, stopLoss, takeProfit } = tradingParams;
    const trades = [];

    // Group market data by date for proper simulation
    const dataByDate = this.groupDataByDate(marketData);
    const dates = Object.keys(dataByDate).sort();

    for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
      const currentDate = dates[dateIndex];
      const currentData = dataByDate[currentDate];

      // Update existing positions (check for stops/exits)
      await this.updatePositions(backtestState, currentData, trades);

      // Generate new signals if we have enough historical data
      if (dateIndex >= 30) { // Need at least 30 days of data for features
        const signals = await this.generateSignals(model, currentData, marketData, dateIndex);
        
        // Execute new trades based on signals
        for (const signal of signals) {
          if (backtestState.openPositions.length >= backtestState.maxPositions) {
            break; // Maximum positions reached
          }

          const trade = await this.executeSignal(
            signal,
            backtestState,
            positionSizing,
            riskPerTrade,
            stopLoss,
            takeProfit
          );

          if (trade) {
            trades.push(trade);
          }
        }
      }

      // Update equity curve
      this.updateEquityCurve(backtestState, currentDate);
    }

    // Close any remaining open positions
    await this.closeAllPositions(backtestState, trades, marketData);

    return trades;
  }

  /**
   * Generate trading signals based on model predictions
   */
  async generateSignals(model, currentData, historicalData, currentIndex) {
    const signals = [];

    for (const symbolData of currentData) {
      try {
        // Extract features for prediction
        const features = this.extractFeaturesForPrediction(
          historicalData,
          symbolData.symbol,
          currentIndex
        );

        if (features.length === 0) continue;

        // Get prediction from model
        const prediction = mlService.predict(
          mlService.deserializeModel(model.model).modelData,
          [features],
          model.algorithmType
        )[0];

        // Convert prediction to signal
        const signal = this.predictionToSignal(prediction, symbolData, model.algorithmType);
        
        if (signal && signal.confidence > 0.6) { // Only trade high-confidence signals
          signals.push(signal);
        }
      } catch (error) {
        logger.warn(`Error generating signal for ${symbolData.symbol}:`, error);
      }
    }

    return signals;
  }

  /**
   * Extract features for prediction from historical data
   */
  extractFeaturesForPrediction(historicalData, symbol, currentIndex) {
    const symbolData = historicalData
      .filter(d => d.symbol === symbol)
      .slice(Math.max(0, currentIndex - 50), currentIndex)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (symbolData.length < 20) return [];

    const prices = symbolData.map(d => d.close);
    const volumes = symbolData.map(d => d.volume);
    const returns = [];
    
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }

    // Calculate technical indicators as features
    const features = [
      this.calculateSMA(prices, 5),
      this.calculateSMA(prices, 10),
      this.calculateSMA(prices, 20),
      this.calculateEMA(prices, 12),
      this.calculateEMA(prices, 26),
      this.calculateRSI(prices, 14),
      this.calculateMACD(prices),
      this.calculateBollingerBands(prices, 20).position,
      mean(returns.slice(-5)), // 5-day average return
      mean(volumes.slice(-5)) / mean(volumes), // Volume ratio
      prices[prices.length - 1] / prices[prices.length - 20] - 1, // 20-day return
      Math.sqrt(mean(returns.slice(-10).map(r => r * r))) // 10-day volatility
    ];

    return features.filter(f => !isNaN(f) && isFinite(f));
  }

  /**
   * Convert model prediction to trading signal
   */
  predictionToSignal(prediction, symbolData, algorithmType) {
    let signal = null;
    let confidence = 0;

    switch (algorithmType) {
      case 'linear_regression':
      case 'polynomial_regression':
      case 'moving_average':
        // For regression models, prediction is expected price change
        const changeThreshold = 0.02; // 2%
        if (prediction > changeThreshold) {
          signal = 'buy';
          confidence = Math.min(Math.abs(prediction) / 0.1, 1); // Scale confidence
        } else if (prediction < -changeThreshold) {
          signal = 'sell';
          confidence = Math.min(Math.abs(prediction) / 0.1, 1);
        }
        break;

      case 'naive_bayes':
      case 'random_forest':
        // For classification models, prediction is class probability
        if (prediction > 0.5) {
          signal = 'buy';
          confidence = prediction;
        } else if (prediction < -0.5) {
          signal = 'sell';
          confidence = Math.abs(prediction);
        }
        break;

      case 'technical_indicators':
        // For technical indicators, prediction is combined signal strength
        if (prediction > 0.1) {
          signal = 'buy';
          confidence = Math.min(prediction, 1);
        } else if (prediction < -0.1) {
          signal = 'sell';
          confidence = Math.min(Math.abs(prediction), 1);
        }
        break;
    }

    if (signal) {
      return {
        symbol: symbolData.symbol,
        signal,
        confidence,
        price: symbolData.close,
        timestamp: symbolData.timestamp,
        prediction
      };
    }

    return null;
  }

  /**
   * Execute a trading signal
   */
  async executeSignal(signal, backtestState, positionSizing, riskPerTrade, stopLoss, takeProfit) {
    const { symbol, signal: side, confidence, price } = signal;
    
    // Calculate position size
    const positionSize = this.calculatePositionSize(
      backtestState.currentCapital,
      price,
      riskPerTrade,
      positionSizing,
      confidence
    );

    if (positionSize <= 0) return null;

    // Apply slippage
    const executionPrice = side === 'buy' 
      ? price * (1 + backtestState.slippage)
      : price * (1 - backtestState.slippage);

    const tradeValue = positionSize * executionPrice;
    const commission = tradeValue * backtestState.commission;

    // Check if we have enough capital
    if (tradeValue + commission > backtestState.currentCapital) {
      return null; // Insufficient capital
    }

    // Create trade
    const trade = {
      id: uuidv4(),
      backtestId: backtestState.backtestId,
      symbol,
      side,
      entryDate: signal.timestamp,
      entryPrice: executionPrice,
      quantity: positionSize,
      signalConfidence: confidence,
      stopLossPrice: side === 'buy' 
        ? executionPrice * (1 - stopLoss)
        : executionPrice * (1 + stopLoss),
      takeProfitPrice: side === 'buy'
        ? executionPrice * (1 + takeProfit)
        : executionPrice * (1 - takeProfit),
      commission,
      status: 'open'
    };

    // Update backtest state
    backtestState.currentCapital -= (tradeValue + commission);
    backtestState.openPositions.push(trade);
    backtestState.positions.set(trade.id, trade);

    return trade;
  }

  /**
   * Update existing positions (check stops, exits)
   */
  async updatePositions(backtestState, currentData, trades) {
    const positionsToClose = [];

    for (const position of backtestState.openPositions) {
      const symbolData = currentData.find(d => d.symbol === position.symbol);
      if (!symbolData) continue;

      const currentPrice = symbolData.close;
      let shouldClose = false;
      let exitReason = '';

      // Check stop loss
      if ((position.side === 'buy' && currentPrice <= position.stopLossPrice) ||
          (position.side === 'sell' && currentPrice >= position.stopLossPrice)) {
        shouldClose = true;
        exitReason = 'stop_loss';
      }

      // Check take profit
      if ((position.side === 'buy' && currentPrice >= position.takeProfitPrice) ||
          (position.side === 'sell' && currentPrice <= position.takeProfitPrice)) {
        shouldClose = true;
        exitReason = 'take_profit';
      }

      if (shouldClose) {
        positionsToClose.push({ position, currentPrice, exitReason, timestamp: symbolData.timestamp });
      }
    }

    // Close positions
    for (const { position, currentPrice, exitReason, timestamp } of positionsToClose) {
      this.closePosition(position, currentPrice, exitReason, timestamp, backtestState, trades);
    }
  }

  /**
   * Close a position
   */
  closePosition(position, exitPrice, exitReason, timestamp, backtestState, trades) {
    // Apply slippage
    const executionPrice = position.side === 'buy'
      ? exitPrice * (1 - backtestState.slippage)
      : exitPrice * (1 + backtestState.slippage);

    const tradeValue = position.quantity * executionPrice;
    const commission = tradeValue * backtestState.commission;

    // Calculate P&L
    let pnl;
    if (position.side === 'buy') {
      pnl = (executionPrice - position.entryPrice) * position.quantity - position.commission - commission;
    } else {
      pnl = (position.entryPrice - executionPrice) * position.quantity - position.commission - commission;
    }

    // Update position
    position.exitDate = timestamp;
    position.exitPrice = executionPrice;
    position.pnl = pnl;
    position.exitReason = exitReason;
    position.status = 'closed';
    position.duration = new Date(timestamp) - new Date(position.entryDate);

    // Update backtest state
    backtestState.currentCapital += tradeValue - commission;
    backtestState.openPositions = backtestState.openPositions.filter(p => p.id !== position.id);
    backtestState.completedTrades.push(position);

    // Update trades array
    const tradeIndex = trades.findIndex(t => t.id === position.id);
    if (tradeIndex !== -1) {
      trades[tradeIndex] = { ...position };
    }
  }

  /**
   * Calculate position size
   */
  calculatePositionSize(capital, price, riskPerTrade, positionSizing, confidence = 1) {
    switch (positionSizing) {
      case 'fixed':
        return Math.floor((capital * 0.1) / price); // 10% of capital per trade
      
      case 'percentage':
        const percentage = Math.min(riskPerTrade * confidence, 0.2); // Max 20% per trade
        return Math.floor((capital * percentage) / price);
      
      case 'kelly':
        // Simplified Kelly Criterion (would need historical win rate and avg returns)
        const kellyFraction = Math.min(riskPerTrade * confidence * 2, 0.25); // Max 25%
        return Math.floor((capital * kellyFraction) / price);
      
      default:
        return Math.floor((capital * 0.1) / price);
    }
  }

  /**
   * Update equity curve
   */
  updateEquityCurve(backtestState, currentDate) {
    let totalEquity = backtestState.currentCapital;

    // Add unrealized P&L from open positions
    for (const position of backtestState.openPositions) {
      // This would need current market price, simplified for now
      totalEquity += position.quantity * position.entryPrice * 0.01; // Placeholder
    }

    backtestState.equity.push(totalEquity);
    backtestState.equityDates.push(new Date(currentDate));

    // Update peak equity and drawdown
    if (totalEquity > backtestState.peakEquity) {
      backtestState.peakEquity = totalEquity;
    } else {
      const drawdown = (backtestState.peakEquity - totalEquity) / backtestState.peakEquity;
      if (drawdown > backtestState.maxDrawdown) {
        backtestState.maxDrawdown = drawdown;
      }
    }

    // Calculate daily return
    if (backtestState.equity.length > 1) {
      const prevEquity = backtestState.equity[backtestState.equity.length - 2];
      const dailyReturn = (totalEquity - prevEquity) / prevEquity;
      backtestState.dailyReturns.push(dailyReturn);
    }
  }

  /**
   * Calculate backtest performance metrics
   */
  calculateBacktestPerformance(trades, backtestState, initialCapital) {
    const completedTrades = trades.filter(t => t.status === 'closed');
    
    if (completedTrades.length === 0) {
      return {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        avgTradeDuration: 0,
        profitFactor: 0
      };
    }

    // Total return
    const totalReturn = (backtestState.currentCapital - initialCapital) / initialCapital;

    // Win rate
    const winningTrades = completedTrades.filter(t => t.pnl > 0);
    const winRate = winningTrades.length / completedTrades.length;

    // Average trade duration (in days)
    const avgTradeDuration = mean(completedTrades.map(t => t.duration)) / (24 * 60 * 60 * 1000);

    // Profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(completedTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss;

    // Sharpe ratio
    const avgDailyReturn = mean(backtestState.dailyReturns);
    const stdDailyReturn = Math.sqrt(mean(backtestState.dailyReturns.map(r => Math.pow(r - avgDailyReturn, 2))));
    const sharpeRatio = stdDailyReturn === 0 ? 0 : (avgDailyReturn / stdDailyReturn) * Math.sqrt(252); // Annualized

    return {
      totalReturn,
      sharpeRatio,
      maxDrawdown: backtestState.maxDrawdown,
      winRate,
      avgTradeDuration,
      profitFactor,
      totalTrades: completedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: completedTrades.length - winningTrades.length,
      grossProfit,
      grossLoss,
      avgWin: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
      avgLoss: (completedTrades.length - winningTrades.length) > 0 ? grossLoss / (completedTrades.length - winningTrades.length) : 0
    };
  }

  /**
   * Get historical market data (mock implementation)
   */
  async getHistoricalData(symbols, startDate, endDate) {
    // In a real implementation, this would fetch data from a market data provider
    // For now, generate mock data
    const data = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (const symbol of symbols) {
      let currentDate = new Date(start);
      let price = 100 + Math.random() * 50; // Starting price between 100-150
      
      while (currentDate <= end) {
        // Generate daily OHLCV data
        const dailyChange = (Math.random() - 0.5) * 0.1; // ±5% daily change
        const open = price;
        const close = price * (1 + dailyChange);
        const high = Math.max(open, close) * (1 + Math.random() * 0.02);
        const low = Math.min(open, close) * (1 - Math.random() * 0.02);
        const volume = 1000000 + Math.random() * 500000;
        
        data.push({
          id: uuidv4(),
          symbol,
          timestamp: currentDate.toISOString(),
          open,
          high,
          low,
          close,
          volume,
          timeframe: '1d'
        });
        
        price = close;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    return data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Group market data by date
   */
  groupDataByDate(marketData) {
    return marketData.reduce((groups, data) => {
      const date = data.timestamp.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(data);
      return groups;
    }, {});
  }

  /**
   * Close all remaining positions
   */
  async closeAllPositions(backtestState, trades, marketData) {
    // Get last prices for each symbol
    const lastPrices = {};
    const lastDate = Math.max(...marketData.map(d => new Date(d.timestamp)));
    
    marketData
      .filter(d => new Date(d.timestamp).getTime() === lastDate)
      .forEach(d => {
        lastPrices[d.symbol] = d.close;
      });

    // Close all open positions
    for (const position of [...backtestState.openPositions]) {
      const lastPrice = lastPrices[position.symbol];
      if (lastPrice) {
        this.closePosition(
          position,
          lastPrice,
          'end_of_backtest',
          new Date(lastDate).toISOString(),
          backtestState,
          trades
        );
      }
    }
  }

  /**
   * Technical indicator calculations
   */
  calculateSMA(prices, period) {
    if (prices.length < period) return NaN;
    const slice = prices.slice(-period);
    return mean(slice);
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return NaN;
    const multiplier = 2 / (period + 1);
    let ema = mean(prices.slice(0, period));
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return NaN;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    
    return 100 - (100 / (1 + rs));
  }

  calculateMACD(prices) {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    return ema12 - ema26;
  }

  calculateBollingerBands(prices, period = 20) {
    const sma = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    const variance = mean(slice.map(p => Math.pow(p - sma, 2)));
    const stdDev = Math.sqrt(variance);
    
    const upperBand = sma + (2 * stdDev);
    const lowerBand = sma - (2 * stdDev);
    const currentPrice = prices[prices.length - 1];
    
    return {
      upper: upperBand,
      middle: sma,
      lower: lowerBand,
      position: (currentPrice - lowerBand) / (upperBand - lowerBand) // 0-1 position within bands
    };
  }

  /**
   * Get backtest results
   */
  getBacktestResults(backtestId) {
    return this.activeBacktests.get(backtestId);
  }

  /**
   * List all backtests
   */
  listBacktests() {
    return Array.from(this.activeBacktests.values());
  }

  /**
   * Delete backtest results
   */
  deleteBacktest(backtestId) {
    return this.activeBacktests.delete(backtestId);
  }

  /**
   * Walk-Forward Optimization
   * Optimizes model parameters over rolling time windows
   */
  async runWalkForwardOptimization(optimizationConfig) {
    const {
      modelId,
      symbols,
      startDate,
      endDate,
      trainingWindow = 252, // 1 year
      testingWindow = 63,   // 3 months
      stepSize = 21,        // 1 month
      parameterRanges = {}
    } = optimizationConfig;

    try {
      logger.info('Starting walk-forward optimization', {
        modelId,
        trainingWindow,
        testingWindow,
        stepSize
      });

      const results = [];
      const totalData = await this.getHistoricalData(symbols, startDate, endDate);
      const dataByDate = this.groupDataByDate(totalData);
      const dates = Object.keys(dataByDate).sort();

      let currentIndex = trainingWindow;
      
      while (currentIndex + testingWindow < dates.length) {
        // Define training and testing periods
        const trainStartIdx = currentIndex - trainingWindow;
        const trainEndIdx = currentIndex;
        const testStartIdx = currentIndex;
        const testEndIdx = Math.min(currentIndex + testingWindow, dates.length);

        const trainingData = this.getDataForPeriod(totalData, dates, trainStartIdx, trainEndIdx);
        const testingData = this.getDataForPeriod(totalData, dates, testStartIdx, testEndIdx);

        logger.info(`Walk-forward window: training ${dates[trainStartIdx]} to ${dates[trainEndIdx]}, testing ${dates[testStartIdx]} to ${dates[testEndIdx]}`);

        // Optimize parameters on training data
        const optimalParams = await this.optimizeParameters(
          modelId,
          trainingData,
          parameterRanges
        );

        // Test on out-of-sample data
        const backtestResult = await this.runBacktest({
          modelId,
          symbols,
          startDate: dates[testStartIdx],
          endDate: dates[testEndIdx],
          initialCapital: 100000,
          parameters: optimalParams
        });

        results.push({
          trainPeriod: {
            start: dates[trainStartIdx],
            end: dates[trainEndIdx]
          },
          testPeriod: {
            start: dates[testStartIdx],
            end: dates[testEndIdx]
          },
          optimalParams,
          performance: backtestResult.performanceMetrics,
          totalReturn: backtestResult.totalReturn,
          sharpeRatio: backtestResult.sharpeRatio,
          maxDrawdown: backtestResult.maxDrawdown
        });

        currentIndex += stepSize;
      }

      // Aggregate results
      const aggregateMetrics = this.aggregateWalkForwardResults(results);

      logger.info('Walk-forward optimization completed', {
        windows: results.length,
        avgReturn: aggregateMetrics.avgReturn,
        avgSharpe: aggregateMetrics.avgSharpe
      });

      return {
        id: uuidv4(),
        type: 'walk_forward_optimization',
        modelId,
        results,
        aggregateMetrics,
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Walk-forward optimization failed:', error);
      throw error;
    }
  }

  /**
   * Monte Carlo Simulation for backtesting
   */
  async runMonteCarloSimulation(simulationConfig) {
    const {
      backtestResults,
      numSimulations = 1000,
      confidenceLevel = 0.95,
      randomSeed = null
    } = simulationConfig;

    try {
      logger.info(`Starting Monte Carlo simulation with ${numSimulations} runs`);

      if (randomSeed) {
        Math.seedrandom(randomSeed); // Would need to implement or use library
      }

      const { trades } = backtestResults;
      if (!trades || trades.length === 0) {
        throw new Error('No trades found in backtest results');
      }

      // Extract trade returns
      const tradeReturns = trades
        .filter(t => t.status === 'closed' && t.pnl)
        .map(t => t.pnl / (t.quantity * t.entryPrice)); // Percentage return

      if (tradeReturns.length === 0) {
        throw new Error('No closed trades with P&L data');
      }

      const simulations = [];
      
      for (let sim = 0; sim < numSimulations; sim++) {
        const simulatedTrades = this.simulateRandomTrades(tradeReturns, trades.length);
        const simulatedMetrics = this.calculateSimulationMetrics(simulatedTrades, backtestResults.initialCapital);
        
        simulations.push(simulatedMetrics);
      }

      // Calculate confidence intervals
      const sortedReturns = simulations.map(s => s.totalReturn).sort((a, b) => a - b);
      const sortedSharpe = simulations.map(s => s.sharpeRatio).sort((a, b) => a - b);
      const sortedDrawdown = simulations.map(s => s.maxDrawdown).sort((a, b) => a - b);

      const alpha = 1 - confidenceLevel;
      const lowerIndex = Math.floor(alpha / 2 * numSimulations);
      const upperIndex = Math.floor((1 - alpha / 2) * numSimulations);

      const confidenceIntervals = {
        totalReturn: {
          lower: sortedReturns[lowerIndex],
          upper: sortedReturns[upperIndex],
          median: sortedReturns[Math.floor(numSimulations / 2)]
        },
        sharpeRatio: {
          lower: sortedSharpe[lowerIndex],
          upper: sortedSharpe[upperIndex],
          median: sortedSharpe[Math.floor(numSimulations / 2)]
        },
        maxDrawdown: {
          lower: sortedDrawdown[lowerIndex],
          upper: sortedDrawdown[upperIndex],
          median: sortedDrawdown[Math.floor(numSimulations / 2)]
        }
      };

      // Risk metrics
      const riskMetrics = {
        probabilityOfLoss: simulations.filter(s => s.totalReturn < 0).length / numSimulations,
        valueAtRisk: sortedReturns[Math.floor(0.05 * numSimulations)], // 5% VaR
        conditionalVaR: mean(sortedReturns.slice(0, Math.floor(0.05 * numSimulations))), // Expected shortfall
        maxDrawdownExceeded: simulations.filter(s => s.maxDrawdown > backtestResults.maxDrawdown).length / numSimulations
      };

      logger.info('Monte Carlo simulation completed', {
        simulations: numSimulations,
        probabilityOfLoss: riskMetrics.probabilityOfLoss,
        var95: riskMetrics.valueAtRisk
      });

      return {
        id: uuidv4(),
        type: 'monte_carlo_simulation',
        numSimulations,
        confidenceLevel,
        originalBacktest: {
          totalReturn: backtestResults.totalReturn,
          sharpeRatio: backtestResults.sharpeRatio,
          maxDrawdown: backtestResults.maxDrawdown
        },
        confidenceIntervals,
        riskMetrics,
        simulations: simulations.slice(0, 100), // Store first 100 for analysis
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Monte Carlo simulation failed:', error);
      throw error;
    }
  }

  /**
   * Advanced Performance Metrics
   */
  calculateAdvancedMetrics(trades, equityCurve, initialCapital) {
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i-1]) / equityCurve[i-1]);
    }

    const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== undefined);
    const profits = closedTrades.filter(t => t.pnl > 0).map(t => t.pnl);
    const losses = closedTrades.filter(t => t.pnl < 0).map(t => Math.abs(t.pnl));

    // Advanced metrics
    return {
      // Ratios
      calmarRatio: this.calculateCalmarRatio(returns, this.calculateMaxDrawdown(equityCurve)),
      sortinoRatio: this.calculateSortinoRatio(returns),
      informationRatio: this.calculateInformationRatio(returns),
      
      // Risk metrics
      valueAtRisk: this.calculateVaR(returns, 0.05),
      conditionalVaR: this.calculateCVaR(returns, 0.05),
      maximumAdverseExcursion: this.calculateMAE(closedTrades),
      maximumFavorableExcursion: this.calculateMFE(closedTrades),
      
      // Trade analysis
      profitFactor: losses.length > 0 ? profits.reduce((a, b) => a + b, 0) / losses.reduce((a, b) => a + b, 0) : Infinity,
      payoffRatio: profits.length > 0 && losses.length > 0 ? mean(profits) / mean(losses) : 0,
      winLossRatio: losses.length > 0 ? profits.length / losses.length : Infinity,
      
      // Consistency metrics
      monthlyReturns: this.calculateMonthlyReturns(equityCurve, returns),
      rollingMaxDrawdown: this.calculateRollingDrawdown(equityCurve),
      consecutiveWins: this.calculateConsecutiveWins(closedTrades),
      consecutiveLosses: this.calculateConsecutiveLosses(closedTrades)
    };
  }

  /**
   * Helper methods for advanced backtesting
   */
  async optimizeParameters(modelId, trainingData, parameterRanges) {
    // Simplified parameter optimization - grid search
    const parameters = Object.keys(parameterRanges);
    if (parameters.length === 0) return {};

    let bestParams = {};
    let bestScore = -Infinity;

    // Generate parameter combinations (simplified to 2 parameters max)
    const param1 = parameters[0];
    const param2 = parameters[1];
    
    const range1 = parameterRanges[param1] || [0.1];
    const range2 = param2 ? parameterRanges[param2] || [0.1] : [null];

    for (const val1 of range1) {
      for (const val2 of range2) {
        const testParams = { [param1]: val1 };
        if (param2 && val2 !== null) testParams[param2] = val2;

        try {
          // Quick backtest on training data
          const quickResult = await this.runQuickBacktest(modelId, trainingData, testParams);
          const score = quickResult.sharpeRatio || 0;

          if (score > bestScore) {
            bestScore = score;
            bestParams = { ...testParams };
          }
        } catch (error) {
          logger.warn('Parameter optimization iteration failed:', error);
        }
      }
    }

    return bestParams;
  }

  async runQuickBacktest(modelId, data, parameters) {
    // Simplified backtesting for parameter optimization
    const model = mlService.getModel(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    const backtestState = this.initializeBacktestState(uuidv4(), 100000, 0.001, 0.0005, 5);
    const trades = [];

    const dataByDate = this.groupDataByDate(data);
    const dates = Object.keys(dataByDate).sort();

    for (let i = 30; i < dates.length; i++) {
      const currentData = dataByDate[dates[i]];
      
      for (const symbolData of currentData) {
        const features = this.extractFeaturesForPrediction(data, symbolData.symbol, i);
        if (features.length === 0) continue;

        const prediction = mlService.predict(
          mlService.deserializeModel(model.model).modelData,
          [features],
          model.algorithmType
        )[0];

        // Simple trading logic
        if (Math.abs(prediction) > 0.6) {
          const signal = {
            symbol: symbolData.symbol,
            signal: prediction > 0 ? 'buy' : 'sell',
            confidence: Math.abs(prediction),
            price: symbolData.close,
            timestamp: symbolData.timestamp,
            prediction
          };

          const trade = await this.executeSignal(signal, backtestState, 'percentage', 0.02, 0.05, 0.10);
          if (trade) trades.push(trade);
        }
      }

      this.updateEquityCurve(backtestState, dates[i]);
    }

    const performance = this.calculateBacktestPerformance(trades, backtestState, 100000);
    return performance;
  }

  getDataForPeriod(data, dates, startIdx, endIdx) {
    const startDate = dates[startIdx];
    const endDate = dates[endIdx];
    
    return data.filter(d => d.timestamp >= startDate && d.timestamp <= endDate);
  }

  aggregateWalkForwardResults(results) {
    const returns = results.map(r => r.totalReturn);
    const sharpeRatios = results.map(r => r.sharpeRatio);
    const drawdowns = results.map(r => r.maxDrawdown);

    return {
      avgReturn: mean(returns),
      avgSharpe: mean(sharpeRatios),
      avgDrawdown: mean(drawdowns),
      winRate: results.filter(r => r.totalReturn > 0).length / results.length,
      bestPeriod: results.reduce((best, current) => 
        current.totalReturn > best.totalReturn ? current : best),
      worstPeriod: results.reduce((worst, current) => 
        current.totalReturn < worst.totalReturn ? current : worst),
      consistency: 1 - (Math.sqrt(mean(returns.map(r => Math.pow(r - mean(returns), 2)))) / Math.abs(mean(returns)))
    };
  }

  simulateRandomTrades(tradeReturns, numTrades) {
    const simulatedReturns = [];
    
    for (let i = 0; i < numTrades; i++) {
      const randomIndex = Math.floor(Math.random() * tradeReturns.length);
      simulatedReturns.push(tradeReturns[randomIndex]);
    }
    
    return simulatedReturns;
  }

  calculateSimulationMetrics(tradeReturns, initialCapital) {
    let capital = initialCapital;
    const equityCurve = [capital];
    let peakCapital = capital;
    let maxDrawdown = 0;

    for (const returnPct of tradeReturns) {
      capital *= (1 + returnPct);
      equityCurve.push(capital);
      
      if (capital > peakCapital) {
        peakCapital = capital;
      } else {
        const drawdown = (peakCapital - capital) / peakCapital;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }

    const totalReturn = (capital - initialCapital) / initialCapital;
    const avgReturn = mean(tradeReturns);
    const stdReturn = Math.sqrt(mean(tradeReturns.map(r => Math.pow(r - avgReturn, 2))));
    const sharpeRatio = stdReturn === 0 ? 0 : avgReturn / stdReturn * Math.sqrt(252);

    return {
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      finalCapital: capital
    };
  }

  // Advanced metric calculations
  calculateCalmarRatio(returns, maxDrawdown) {
    const annualReturn = mean(returns) * 252;
    return maxDrawdown === 0 ? 0 : annualReturn / maxDrawdown;
  }

  calculateSortinoRatio(returns, targetReturn = 0) {
    const excessReturns = returns.map(r => r - targetReturn);
    const downside = excessReturns.filter(r => r < 0);
    
    if (downside.length === 0) return Infinity;
    
    const downsideDeviation = Math.sqrt(mean(downside.map(r => r * r)));
    return mean(excessReturns) / downsideDeviation * Math.sqrt(252);
  }

  calculateInformationRatio(returns, benchmarkReturns = null) {
    if (!benchmarkReturns) benchmarkReturns = new Array(returns.length).fill(0);
    
    const activeReturns = returns.map((r, i) => r - (benchmarkReturns[i] || 0));
    const trackingError = Math.sqrt(mean(activeReturns.map(r => r * r)));
    
    return trackingError === 0 ? 0 : mean(activeReturns) / trackingError * Math.sqrt(252);
  }

  calculateVaR(returns, alpha = 0.05) {
    const sortedReturns = returns.slice().sort((a, b) => a - b);
    const index = Math.floor(alpha * sortedReturns.length);
    return sortedReturns[index] || 0;
  }

  calculateCVaR(returns, alpha = 0.05) {
    const valueAtRisk = this.calculateVaR(returns, alpha);
    const tailReturns = returns.filter(r => r <= valueAtRisk);
    return tailReturns.length > 0 ? mean(tailReturns) : 0;
  }

  calculateMAE(trades) {
    // Maximum Adverse Excursion - would need tick data
    return 0; // Placeholder
  }

  calculateMFE(trades) {
    // Maximum Favorable Excursion - would need tick data
    return 0; // Placeholder
  }

  calculateMonthlyReturns(equityCurve, returns) {
    // Simplified monthly returns calculation
    const monthlyReturns = [];
    const monthSize = Math.floor(returns.length / 12);
    
    for (let i = 0; i < 12; i++) {
      const start = i * monthSize;
      const end = Math.min((i + 1) * monthSize, returns.length);
      const monthReturns = returns.slice(start, end);
      
      if (monthReturns.length > 0) {
        monthlyReturns.push(mean(monthReturns));
      }
    }
    
    return monthlyReturns;
  }

  calculateRollingDrawdown(equityCurve, window = 252) {
    const drawdowns = [];
    
    for (let i = window; i < equityCurve.length; i++) {
      const windowData = equityCurve.slice(i - window, i);
      const peak = Math.max(...windowData);
      const current = windowData[windowData.length - 1];
      const drawdown = (peak - current) / peak;
      drawdowns.push(drawdown);
    }
    
    return drawdowns;
  }

  calculateConsecutiveWins(trades) {
    let maxWins = 0;
    let currentWins = 0;
    
    for (const trade of trades) {
      if (trade.pnl > 0) {
        currentWins++;
        maxWins = Math.max(maxWins, currentWins);
      } else {
        currentWins = 0;
      }
    }
    
    return maxWins;
  }

  calculateConsecutiveLosses(trades) {
    let maxLosses = 0;
    let currentLosses = 0;
    
    for (const trade of trades) {
      if (trade.pnl < 0) {
        currentLosses++;
        maxLosses = Math.max(maxLosses, currentLosses);
      } else {
        currentLosses = 0;
      }
    }
    
    return maxLosses;
  }

  calculateMaxDrawdown(equityCurve) {
    let maxDrawdown = 0;
    let peak = equityCurve[0];
    
    for (const value of equityCurve) {
      if (value > peak) {
        peak = value;
      } else {
        const drawdown = (peak - value) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }
    
    return maxDrawdown;
  }

  /**
   * Run comprehensive backtest with advanced ML integration
   */
  async runComprehensiveBacktest(config) {
    const {
      backtestId,
      modelIds,
      symbols,
      startDate,
      endDate,
      initialCapital,
      walkForwardOptimization,
      walkForwardPeriods,
      monteCarloSimulations,
      benchmarkSymbol,
      retrain_frequency,
      prediction_confidence_threshold,
      feature_importance_analysis,
      drift_detection
    } = config;

    logger.info(`Starting comprehensive backtest ${backtestId} with ${modelIds.length} models`);

    try {
      // Run individual backtests for each model
      const modelResults = await Promise.all(
        modelIds.map(async (modelId) => {
          const modelConfig = { ...config, modelId };
          return await this.runBacktest(modelConfig);
        })
      );

      // Ensemble model results
      const ensembleResults = await this.createEnsembleBacktest(modelResults, config);

      // Walk-forward optimization if requested
      let walkForwardResults = null;
      if (walkForwardOptimization) {
        walkForwardResults = await this.runWalkForwardOptimization(config, walkForwardPeriods);
      }

      // Monte Carlo simulation
      const monteCarloResults = await this.runMonteCarloSimulation(
        ensembleResults.trades,
        monteCarloSimulations
      );

      // Benchmark comparison
      const benchmarkResults = await this.compareToBenchmark(
        ensembleResults,
        benchmarkSymbol,
        startDate,
        endDate
      );

      // Feature importance analysis if requested
      let featureImportanceResults = null;
      if (feature_importance_analysis) {
        featureImportanceResults = await this.analyzeFeatureImportance(modelIds, ensembleResults.trades);
      }

      // Model drift analysis if requested
      let driftAnalysisResults = null;
      if (drift_detection) {
        driftAnalysisResults = await this.analyzeDriftOverTime(modelIds, startDate, endDate);
      }

      // Compile comprehensive results
      const comprehensiveResults = {
        backtestId,
        modelIds,
        symbols,
        period: { startDate, endDate },
        initialCapital,
        finalCapital: ensembleResults.currentCapital,
        
        // Individual model results
        modelResults: modelResults.map((result, index) => ({
          modelId: modelIds[index],
          ...result
        })),

        // Ensemble results
        trades: ensembleResults.trades,
        performance: this.calculateComprehensivePerformance(ensembleResults, initialCapital),

        // Advanced analysis
        walkForwardOptimization: walkForwardResults,
        monteCarloAnalysis: monteCarloResults,
        benchmarkComparison: benchmarkResults,
        featureImportance: featureImportanceResults,
        driftAnalysis: driftAnalysisResults,

        // Risk metrics
        riskMetrics: this.calculateAdvancedRiskMetrics(ensembleResults.trades, ensembleResults.equity),

        // Execution details
        executedAt: new Date().toISOString()
      };

      logger.info(`Comprehensive backtest ${backtestId} completed successfully`);
      return comprehensiveResults;

    } catch (error) {
      logger.error(`Error in comprehensive backtest ${backtestId}:`, error);
      throw error;
    }
  }

  /**
   * Create ensemble backtest from multiple model results
   */
  async createEnsembleBacktest(modelResults, config) {
    const { initialCapital, maxPositions } = config;
    
    // Initialize ensemble state
    const ensembleState = {
      currentCapital: initialCapital,
      positions: new Map(),
      trades: [],
      equity: [initialCapital],
      equityDates: []
    };

    // Combine signals from all models using voting or averaging
    const combinedSignals = this.combineModelSignals(modelResults);

    // Execute ensemble trading strategy
    for (const signal of combinedSignals) {
      // Check position limits
      if (ensembleState.positions.size >= maxPositions) {
        continue;
      }

      // Execute signal with ensemble logic
      const trade = await this.executeEnsembleSignal(signal, ensembleState, config);
      if (trade) {
        ensembleState.trades.push(trade);
      }
    }

    return ensembleState;
  }

  /**
   * Combine signals from multiple models
   */
  combineModelSignals(modelResults) {
    const allSignals = [];
    const signalMap = new Map();

    // Collect all signals
    for (const result of modelResults) {
      for (const trade of result.trades) {
        const key = `${trade.symbol}_${trade.entryDate}`;
        if (!signalMap.has(key)) {
          signalMap.set(key, []);
        }
        signalMap.get(key).push({
          side: trade.side,
          confidence: trade.signalConfidence || 0.5,
          modelWeight: 1.0 / modelResults.length
        });
      }
    }

    // Create ensemble signals
    for (const [key, signals] of signalMap.entries()) {
      const [symbol, date] = key.split('_');
      
      // Calculate weighted average confidence and direction
      let buyWeight = 0;
      let sellWeight = 0;
      let totalConfidence = 0;

      for (const signal of signals) {
        const weightedConfidence = signal.confidence * signal.modelWeight;
        totalConfidence += weightedConfidence;
        
        if (signal.side === 'buy') {
          buyWeight += weightedConfidence;
        } else {
          sellWeight += weightedConfidence;
        }
      }

      // Create ensemble signal if confidence threshold is met
      if (totalConfidence > 0.6) {
        allSignals.push({
          symbol,
          date: new Date(date),
          side: buyWeight > sellWeight ? 'buy' : 'sell',
          confidence: totalConfidence,
          modelCount: signals.length
        });
      }
    }

    return allSignals.sort((a, b) => a.date - b.date);
  }

  /**
   * Execute ensemble signal
   */
  async executeEnsembleSignal(signal, ensembleState, config) {
    const { commission, slippage } = config;
    
    // Skip if already have position in this symbol
    if (ensembleState.positions.has(signal.symbol)) {
      return null;
    }

    // Calculate position size based on confidence
    const baseQuantity = ensembleState.currentCapital * 0.1; // 10% base allocation
    const confidenceMultiplier = Math.min(signal.confidence * 1.5, 2.0); // Max 2x leverage
    const quantity = baseQuantity * confidenceMultiplier;

    // Simulate execution
    const executionPrice = await this.getSimulatedPrice(signal.symbol, signal.date);
    const adjustedPrice = executionPrice * (1 + (signal.side === 'buy' ? slippage : -slippage));
    const totalCost = quantity + (quantity * commission);

    if (totalCost > ensembleState.currentCapital) {
      return null; // Insufficient capital
    }

    const trade = {
      id: uuidv4(),
      symbol: signal.symbol,
      side: signal.side,
      entryDate: signal.date.toISOString(),
      entryPrice: adjustedPrice,
      quantity: quantity / adjustedPrice,
      signalConfidence: signal.confidence,
      modelCount: signal.modelCount,
      status: 'open'
    };

    // Update ensemble state
    ensembleState.currentCapital -= totalCost;
    ensembleState.positions.set(signal.symbol, trade);

    return trade;
  }

  /**
   * Run walk-forward optimization
   */
  async runWalkForwardOptimization(config, periods) {
    const { startDate, endDate } = config;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const periodLength = Math.floor((end - start) / periods);
    
    const walkForwardResults = [];

    for (let i = 0; i < periods; i++) {
      const periodStart = new Date(start.getTime() + (i * periodLength));
      const periodEnd = new Date(start.getTime() + ((i + 1) * periodLength));
      
      const periodConfig = {
        ...config,
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString()
      };

      try {
        const periodResult = await this.runBacktest(periodConfig);
        walkForwardResults.push({
          period: i + 1,
          startDate: periodStart,
          endDate: periodEnd,
          result: periodResult
        });
      } catch (error) {
        logger.warn(`Walk-forward period ${i + 1} failed:`, error);
      }
    }

    return {
      periods: walkForwardResults,
      aggregatedPerformance: this.aggregateWalkForwardResults(walkForwardResults)
    };
  }

  /**
   * Run Monte Carlo simulation
   */
  async runMonteCarloSimulation(trades, simulations) {
    const returns = trades.map(trade => trade.pnl / trade.entryPrice);
    const simulationResults = [];

    for (let i = 0; i < simulations; i++) {
      // Randomly sample returns with replacement
      const shuffledReturns = this.shuffleArray([...returns]);
      
      let capital = 100000; // Standardized starting capital
      const equityCurve = [capital];

      for (const returnValue of shuffledReturns) {
        capital *= (1 + returnValue);
        equityCurve.push(capital);
      }

      simulationResults.push({
        finalCapital: capital,
        totalReturn: (capital - 100000) / 100000,
        maxDrawdown: this.calculateMaxDrawdown(equityCurve)
      });
    }

    // Calculate statistics
    const finalCapitals = simulationResults.map(r => r.finalCapital);
    const totalReturns = simulationResults.map(r => r.totalReturn);
    const maxDrawdowns = simulationResults.map(r => r.maxDrawdown);

    return {
      simulations: simulationResults.length,
      finalCapital: {
        mean: mean(finalCapitals),
        median: this.calculatePercentile(finalCapitals, 0.5),
        percentile95: this.calculatePercentile(finalCapitals, 0.95),
        percentile5: this.calculatePercentile(finalCapitals, 0.05)
      },
      totalReturn: {
        mean: mean(totalReturns),
        median: this.calculatePercentile(totalReturns, 0.5),
        percentile95: this.calculatePercentile(totalReturns, 0.95),
        percentile5: this.calculatePercentile(totalReturns, 0.05)
      },
      maxDrawdown: {
        mean: mean(maxDrawdowns),
        median: this.calculatePercentile(maxDrawdowns, 0.5),
        percentile95: this.calculatePercentile(maxDrawdowns, 0.95),
        percentile5: this.calculatePercentile(maxDrawdowns, 0.05)
      }
    };
  }

  /**
   * Compare to benchmark
   */
  async compareToBenchmark(results, benchmarkSymbol, startDate, endDate) {
    try {
      // Get benchmark data
      const benchmarkData = await this.getHistoricalData([benchmarkSymbol], startDate, endDate);
      
      if (!benchmarkData || benchmarkData.length === 0) {
        return { error: 'Benchmark data not available' };
      }

      const benchmarkReturns = this.calculateBenchmarkReturns(benchmarkData);
      const strategyReturns = this.calculateStrategyReturns(results.trades);

      return {
        benchmark: benchmarkSymbol,
        benchmarkReturn: benchmarkReturns.totalReturn,
        strategyReturn: results.performance?.totalReturn || 0,
        alpha: (results.performance?.totalReturn || 0) - benchmarkReturns.totalReturn,
        beta: this.calculateBeta(strategyReturns, benchmarkReturns.dailyReturns),
        informationRatio: this.calculateInformationRatio(strategyReturns, benchmarkReturns.dailyReturns),
        trackingError: this.calculateTrackingError(strategyReturns, benchmarkReturns.dailyReturns)
      };
    } catch (error) {
      logger.warn('Benchmark comparison failed:', error);
      return { error: 'Benchmark comparison failed' };
    }
  }

  /**
   * Calculate detailed performance metrics
   */
  async calculateDetailedPerformance(trades, backtest) {
    const profitableTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    return {
      // Basic metrics
      totalTrades: trades.length,
      profitableTrades: profitableTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? profitableTrades.length / trades.length : 0,
      
      // Return metrics
      totalReturn: backtest.total_return,
      avgTradeReturn: trades.length > 0 ? mean(trades.map(t => t.pnl)) : 0,
      bestTrade: Math.max(...trades.map(t => t.pnl), 0),
      worstTrade: Math.min(...trades.map(t => t.pnl), 0),
      
      // Risk metrics
      sharpeRatio: backtest.sharpe_ratio,
      maxDrawdown: backtest.max_drawdown,
      profitFactor: backtest.profit_factor,
      
      // Trading metrics
      avgTradeDuration: backtest.avg_trade_duration,
      maxConsecutiveWins: this.calculateConsecutiveWins(trades),
      maxConsecutiveLosses: this.calculateConsecutiveLosses(trades),
      
      // Advanced metrics
      calmarRatio: backtest.total_return / (backtest.max_drawdown || 1),
      sortinoRatio: this.calculateSortinoRatio(trades),
      recoveryFactor: backtest.total_return / (backtest.max_drawdown || 1),
      
      // Model-specific metrics
      avgPredictionAccuracy: mean(trades.map(t => t.prediction_accuracy || 0.5)),
      avgSignalConfidence: mean(trades.map(t => t.signal_confidence || 0.5)),
      highConfidenceWinRate: this.calculateHighConfidenceWinRate(trades)
    };
  }

  /**
   * Generate comparison analysis between backtests
   */
  generateComparisonAnalysis(backtestComparisons) {
    const comparisons = backtestComparisons.map(bc => bc.performance);
    
    return {
      bestPerformer: {
        totalReturn: this.findBestPerformer(comparisons, 'totalReturn'),
        sharpeRatio: this.findBestPerformer(comparisons, 'sharpeRatio'),
        maxDrawdown: this.findBestPerformer(comparisons, 'maxDrawdown', 'min'),
        winRate: this.findBestPerformer(comparisons, 'winRate')
      },
      correlationMatrix: this.calculateCorrelationMatrix(backtestComparisons),
      riskReturnScatter: this.generateRiskReturnData(comparisons),
      statisticalSignificance: this.calculateStatisticalSignificance(comparisons)
    };
  }

  /**
   * Helper methods for comprehensive analysis
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  calculateSortinoRatio(trades) {
    const returns = trades.map(t => t.pnl);
    const avgReturn = mean(returns);
    const negativeReturns = returns.filter(r => r < 0);
    
    if (negativeReturns.length === 0) return avgReturn > 0 ? Infinity : 0;
    
    const downstideDeviation = Math.sqrt(mean(negativeReturns.map(r => r * r)));
    return avgReturn / downstideDeviation;
  }

  calculateHighConfidenceWinRate(trades) {
    const highConfidenceTrades = trades.filter(t => (t.signal_confidence || 0.5) > 0.7);
    if (highConfidenceTrades.length === 0) return 0;
    
    const winners = highConfidenceTrades.filter(t => t.pnl > 0);
    return winners.length / highConfidenceTrades.length;
  }

  findBestPerformer(comparisons, metric, mode = 'max') {
    let bestIndex = 0;
    let bestValue = comparisons[0][metric];
    
    for (let i = 1; i < comparisons.length; i++) {
      const value = comparisons[i][metric];
      if (mode === 'max' ? value > bestValue : value < bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }
    
    return { index: bestIndex, value: bestValue };
  }
}

module.exports = new BacktestingService();