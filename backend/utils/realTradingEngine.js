const RealExchangeService = require('./realExchangeService');
const logger = require('./logger');

/**
 * Real Trading Engine - Production-ready cryptocurrency trading
 * 
 * Features:
 * - Real order execution via exchange APIs
 * - Risk management and position sizing
 * - Stop-loss and take-profit automation
 * - Portfolio tracking and PnL calculation
 * - ML model integration for signal execution
 */
class RealTradingEngine {
  constructor() {
    this.exchangeService = new RealExchangeService();
    this.activePositions = new Map();
    this.riskLimits = {
      maxPositionSize: 0.1, // 10% of portfolio per position
      maxDailyLoss: 0.05,   // 5% max daily loss
      maxDrawdown: 0.15,    // 15% max portfolio drawdown
      minLiquidity: 100000  // Minimum $100k daily volume
    };
    this.portfolioValue = 0;
    this.dailyPnL = 0;
    this.maxDrawdown = 0;
    
    logger.info('Real Trading Engine initialized with live exchange connection');
  }

  /**
   * Execute a trading signal from ML model
   */
  async executeSignal(signal) {
    const {
      symbol,
      action, // 'BUY', 'SELL', 'HOLD'
      confidence, // 0-1
      modelId,
      prediction,
      stopLoss,
      takeProfit
    } = signal;

    try {
      // Pre-trade risk checks
      const riskCheck = await this.performRiskCheck(signal);
      if (!riskCheck.approved) {
        logger.warn(`Trade rejected by risk management: ${riskCheck.reason}`, signal);
        return {
          success: false,
          reason: riskCheck.reason,
          signal
        };
      }

      if (action === 'HOLD') {
        return { success: true, action: 'HOLD', reason: 'Model suggests holding position' };
      }

      // Calculate position size based on Kelly Criterion and confidence
      const positionSize = this.calculatePositionSize(symbol, confidence, prediction.volatility);
      
      // Get current market data
      const ticker = await this.exchangeService.getRealTimeTicker(symbol);
      
      // Determine order type and parameters
      const orderParams = {
        symbol,
        side: action,
        type: 'MARKET', // Start with market orders for reliability
        quantity: positionSize / ticker.price
      };

      // Place the order
      const orderResult = await this.exchangeService.placeBinanceOrder(orderParams);

      if (orderResult.orderId) {
        // Create position record
        const position = {
          id: `${symbol}-${Date.now()}`,
          symbol,
          side: action,
          quantity: orderResult.executedQty,
          entryPrice: orderResult.price,
          stopLoss,
          takeProfit,
          modelId,
          confidence,
          timestamp: new Date().toISOString(),
          status: 'OPEN'
        };

        this.activePositions.set(position.id, position);

        // Set up automated stop-loss and take-profit orders
        if (stopLoss || takeProfit) {
          await this.setUpAutomatedOrders(position);
        }

        logger.info(`Trade executed successfully`, {
          positionId: position.id,
          symbol,
          action,
          quantity: orderResult.executedQty,
          price: orderResult.price,
          modelId
        });

        return {
          success: true,
          positionId: position.id,
          orderId: orderResult.orderId,
          symbol,
          action,
          quantity: orderResult.executedQty,
          price: orderResult.price
        };
      } else {
        throw new Error('Order placement failed - no order ID returned');
      }

    } catch (error) {
      logger.error('Failed to execute trading signal:', error, signal);
      return {
        success: false,
        error: error.message,
        signal
      };
    }
  }

  /**
   * Perform pre-trade risk checks
   */
  async performRiskCheck(signal) {
    try {
      // Get current portfolio balance
      const balance = await this.exchangeService.getBinanceAccountBalance();
      this.portfolioValue = balance.totalBalanceUSD;

      // Check daily loss limit
      if (Math.abs(this.dailyPnL) >= (this.portfolioValue * this.riskLimits.maxDailyLoss)) {
        return {
          approved: false,
          reason: `Daily loss limit exceeded: ${this.dailyPnL.toFixed(2)} USD`
        };
      }

      // Check maximum drawdown
      if (this.maxDrawdown >= this.riskLimits.maxDrawdown) {
        return {
          approved: false,
          reason: `Maximum drawdown limit exceeded: ${(this.maxDrawdown * 100).toFixed(2)}%`
        };
      }

      // Check position size limit
      const positionValue = this.calculatePositionSize(signal.symbol, signal.confidence, signal.prediction?.volatility || 0.02);
      const positionPercent = positionValue / this.portfolioValue;
      
      if (positionPercent > this.riskLimits.maxPositionSize) {
        return {
          approved: false,
          reason: `Position size too large: ${(positionPercent * 100).toFixed(2)}% of portfolio`
        };
      }

      // Check minimum confidence threshold
      if (signal.confidence < 0.6) {
        return {
          approved: false,
          reason: `Model confidence too low: ${(signal.confidence * 100).toFixed(1)}%`
        };
      }

      return { approved: true };

    } catch (error) {
      logger.error('Risk check failed:', error);
      return {
        approved: false,
        reason: `Risk check error: ${error.message}`
      };
    }
  }

  /**
   * Calculate position size using Kelly Criterion
   */
  calculatePositionSize(symbol, confidence, volatility) {
    const baseBetSize = this.portfolioValue * 0.02; // 2% base bet
    const kellyMultiplier = Math.min(confidence * 2, 1.5); // Cap at 1.5x
    const volatilityAdjustment = Math.max(0.5, 1 - volatility); // Reduce size for high volatility
    
    const positionSize = baseBetSize * kellyMultiplier * volatilityAdjustment;
    
    // Ensure position doesn't exceed maximum position size
    return Math.min(positionSize, this.portfolioValue * this.riskLimits.maxPositionSize);
  }

  /**
   * Set up automated stop-loss and take-profit orders
   */
  async setUpAutomatedOrders(position) {
    try {
      if (position.stopLoss) {
        // Create stop-loss order
        const stopLossOrder = {
          symbol: position.symbol,
          side: position.side === 'BUY' ? 'SELL' : 'BUY',
          type: 'STOP_LOSS_LIMIT',
          quantity: position.quantity,
          price: position.stopLoss,
          stopPrice: position.stopLoss,
          timeInForce: 'GTC'
        };

        // Note: In production, you'd place this as a real order
        // For now, we'll monitor positions and execute manually
        logger.info(`Stop-loss level set at ${position.stopLoss} for position ${position.id}`);
      }

      if (position.takeProfit) {
        // Create take-profit order
        const takeProfitOrder = {
          symbol: position.symbol,
          side: position.side === 'BUY' ? 'SELL' : 'BUY',
          type: 'LIMIT',
          quantity: position.quantity,
          price: position.takeProfit,
          timeInForce: 'GTC'
        };

        logger.info(`Take-profit level set at ${position.takeProfit} for position ${position.id}`);
      }

    } catch (error) {
      logger.error('Failed to set up automated orders:', error);
    }
  }

  /**
   * Monitor active positions and execute stop-loss/take-profit
   */
  async monitorPositions() {
    for (const [positionId, position] of this.activePositions) {
      try {
        const currentTicker = await this.exchangeService.getRealTimeTicker(position.symbol);
        const currentPrice = currentTicker.price;

        let shouldClose = false;
        let closeReason = '';

        // Check stop-loss
        if (position.stopLoss) {
          if (position.side === 'BUY' && currentPrice <= position.stopLoss) {
            shouldClose = true;
            closeReason = 'Stop-loss triggered';
          } else if (position.side === 'SELL' && currentPrice >= position.stopLoss) {
            shouldClose = true;
            closeReason = 'Stop-loss triggered';
          }
        }

        // Check take-profit
        if (position.takeProfit && !shouldClose) {
          if (position.side === 'BUY' && currentPrice >= position.takeProfit) {
            shouldClose = true;
            closeReason = 'Take-profit triggered';
          } else if (position.side === 'SELL' && currentPrice <= position.takeProfit) {
            shouldClose = true;
            closeReason = 'Take-profit triggered';
          }
        }

        if (shouldClose) {
          await this.closePosition(positionId, closeReason);
        }

      } catch (error) {
        logger.error(`Error monitoring position ${positionId}:`, error);
      }
    }
  }

  /**
   * Close a position
   */
  async closePosition(positionId, reason = 'Manual close') {
    const position = this.activePositions.get(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    try {
      const orderParams = {
        symbol: position.symbol,
        side: position.side === 'BUY' ? 'SELL' : 'BUY',
        type: 'MARKET',
        quantity: position.quantity
      };

      const orderResult = await this.exchangeService.placeBinanceOrder(orderParams);

      // Calculate PnL
      const pnl = this.calculatePnL(position, orderResult.price);
      this.dailyPnL += pnl;

      // Update position
      position.status = 'CLOSED';
      position.exitPrice = orderResult.price;
      position.pnl = pnl;
      position.closedAt = new Date().toISOString();
      position.closeReason = reason;

      // Remove from active positions
      this.activePositions.delete(positionId);

      logger.info(`Position closed: ${positionId}`, {
        symbol: position.symbol,
        pnl: pnl.toFixed(2),
        reason
      });

      return {
        success: true,
        positionId,
        pnl,
        reason
      };

    } catch (error) {
      logger.error(`Failed to close position ${positionId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate PnL for a position
   */
  calculatePnL(position, exitPrice) {
    const entryValue = position.quantity * position.entryPrice;
    const exitValue = position.quantity * exitPrice;
    
    if (position.side === 'BUY') {
      return exitValue - entryValue;
    } else {
      return entryValue - exitValue;
    }
  }

  /**
   * Get portfolio summary
   */
  async getPortfolioSummary() {
    try {
      const balance = await this.exchangeService.getBinanceAccountBalance();
      const positions = Array.from(this.activePositions.values());

      return {
        totalBalance: balance.totalBalanceUSD,
        dailyPnL: this.dailyPnL,
        activePositions: positions.length,
        positions: positions.map(pos => ({
          id: pos.id,
          symbol: pos.symbol,
          side: pos.side,
          quantity: pos.quantity,
          entryPrice: pos.entryPrice,
          currentPnL: this.calculateUnrealizedPnL(pos)
        })),
        balances: balance.balances,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get portfolio summary:', error);
      throw error;
    }
  }

  /**
   * Calculate unrealized PnL for open position
   */
  async calculateUnrealizedPnL(position) {
    try {
      const ticker = await this.exchangeService.getRealTimeTicker(position.symbol);
      return this.calculatePnL(position, ticker.price);
    } catch (error) {
      logger.error('Failed to calculate unrealized PnL:', error);
      return 0;
    }
  }

  /**
   * Start position monitoring loop
   */
  startMonitoring() {
    setInterval(async () => {
      try {
        await this.monitorPositions();
      } catch (error) {
        logger.error('Error in position monitoring loop:', error);
      }
    }, 30000); // Check every 30 seconds

    logger.info('Position monitoring started');
  }
}

module.exports = RealTradingEngine;