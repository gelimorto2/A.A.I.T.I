const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const marketData = require('./marketData');

/**
 * Paper Trading Service
 * 
 * Provides real-time paper trading functionality with:
 * - Virtual portfolio management
 * - Order execution simulation
 * - P&L tracking
 * - Risk management
 * - Performance analytics
 */
class PaperTradingService {
  constructor() {
    this.portfolios = new Map();
    this.orders = new Map();
    this.trades = new Map();
    this.marketDataCache = new Map();
    this.riskLimits = {
      maxPositionSize: 0.1, // 10% of portfolio
      maxLeverage: 1.0,     // No leverage by default
      stopLossThreshold: 0.05, // 5% stop loss
      maxDrawdown: 0.20     // 20% max drawdown
    };
    
    logger.info('Paper Trading Service initialized');
  }

  /**
   * Create a new paper trading portfolio
   */
  async createPortfolio(config) {
    const portfolioId = uuidv4();
    const {
      name,
      initialBalance = 100000,
      currency = 'USD',
      riskProfile = 'moderate',
      tradingStrategy = null
    } = config;

    const portfolio = {
      id: portfolioId,
      name,
      initialBalance,
      currentBalance: initialBalance,
      currency,
      riskProfile,
      tradingStrategy,
      positions: new Map(),
      orders: [],
      trades: [],
      performance: {
        totalReturn: 0,
        totalReturnPercent: 0,
        dayReturn: 0,
        dayReturnPercent: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        winRate: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        avgWin: 0,
        avgLoss: 0
      },
      createdAt: new Date(),
      lastUpdated: new Date(),
      status: 'active'
    };

    this.portfolios.set(portfolioId, portfolio);
    
    logger.info(`Paper trading portfolio created`, {
      portfolioId,
      name,
      initialBalance,
      currency
    });

    return portfolio;
  }

  /**
   * Place a paper trading order
   */
  async placeOrder(portfolioId, orderConfig) {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    const orderId = uuidv4();
    const {
      symbol,
      side, // 'buy' or 'sell'
      type, // 'market', 'limit', 'stop', 'stop_limit'
      quantity,
      price = null,
      stopPrice = null,
      timeInForce = 'GTC' // Good Till Canceled
    } = orderConfig;

    // Get current market price
    const currentPrice = await this.getCurrentPrice(symbol);
    
    // Validate order
    this.validateOrder(portfolio, orderConfig, currentPrice);

    const order = {
      id: orderId,
      portfolioId,
      symbol,
      side,
      type,
      quantity,
      price,
      stopPrice,
      timeInForce,
      status: 'pending',
      filledQuantity: 0,
      avgFillPrice: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Execute order based on type
    if (type === 'market') {
      await this.executeMarketOrder(portfolio, order, currentPrice);
    } else {
      // Add to pending orders for limit/stop orders
      portfolio.orders.push(order);
      this.orders.set(orderId, order);
    }

    portfolio.lastUpdated = new Date();
    
    logger.info(`Order placed`, {
      portfolioId,
      orderId,
      symbol,
      side,
      type,
      quantity,
      currentPrice
    });

    return order;
  }

  /**
   * Execute market order immediately
   */
  async executeMarketOrder(portfolio, order, currentPrice) {
    const { symbol, side, quantity } = order;
    
    // Calculate order value
    const orderValue = quantity * currentPrice;
    const commission = this.calculateCommission(orderValue);
    
    if (side === 'buy') {
      // Check if sufficient balance
      if (portfolio.currentBalance < orderValue + commission) {
        order.status = 'rejected';
        order.rejectionReason = 'Insufficient balance';
        return;
      }
      
      // Update portfolio
      portfolio.currentBalance -= (orderValue + commission);
      
      // Update position
      const position = portfolio.positions.get(symbol) || {
        symbol,
        quantity: 0,
        avgPrice: 0,
        totalCost: 0,
        unrealizedPnL: 0,
        realizedPnL: 0
      };
      
      const newTotalCost = position.totalCost + orderValue;
      const newQuantity = position.quantity + quantity;
      position.avgPrice = newTotalCost / newQuantity;
      position.quantity = newQuantity;
      position.totalCost = newTotalCost;
      
      portfolio.positions.set(symbol, position);
      
    } else if (side === 'sell') {
      const position = portfolio.positions.get(symbol);
      if (!position || position.quantity < quantity) {
        order.status = 'rejected';
        order.rejectionReason = 'Insufficient position';
        return;
      }
      
      // Calculate P&L
      const saleValue = quantity * currentPrice - commission;
      const costBasis = quantity * position.avgPrice;
      const realizedPnL = saleValue - costBasis;
      
      // Update portfolio
      portfolio.currentBalance += saleValue;
      
      // Update position
      position.quantity -= quantity;
      position.realizedPnL += realizedPnL;
      
      if (position.quantity === 0) {
        portfolio.positions.delete(symbol);
      }
      
      // Record trade
      const trade = {
        id: uuidv4(),
        portfolioId: portfolio.id,
        symbol,
        side,
        quantity,
        price: currentPrice,
        commission,
        realizedPnL,
        timestamp: new Date()
      };
      
      portfolio.trades.push(trade);
      this.trades.set(trade.id, trade);
    }
    
    // Update order status
    order.status = 'filled';
    order.filledQuantity = quantity;
    order.avgFillPrice = currentPrice;
    order.updatedAt = new Date();
    
    // Update portfolio performance
    this.updatePortfolioPerformance(portfolio);
  }

  /**
   * Process pending orders (limit, stop orders)
   */
  async processPendingOrders() {
    for (const [portfolioId, portfolio] of this.portfolios) {
      for (let i = portfolio.orders.length - 1; i >= 0; i--) {
        const order = portfolio.orders[i];
        
        if (order.status !== 'pending') continue;
        
        try {
          const currentPrice = await this.getCurrentPrice(order.symbol);
          let shouldExecute = false;
          
          switch (order.type) {
            case 'limit':
              if ((order.side === 'buy' && currentPrice <= order.price) ||
                  (order.side === 'sell' && currentPrice >= order.price)) {
                shouldExecute = true;
              }
              break;
              
            case 'stop':
              if ((order.side === 'buy' && currentPrice >= order.stopPrice) ||
                  (order.side === 'sell' && currentPrice <= order.stopPrice)) {
                shouldExecute = true;
              }
              break;
              
            case 'stop_limit':
              if ((order.side === 'buy' && currentPrice >= order.stopPrice) ||
                  (order.side === 'sell' && currentPrice <= order.stopPrice)) {
                // Convert to limit order
                order.type = 'limit';
              }
              break;
          }
          
          if (shouldExecute) {
            await this.executeMarketOrder(portfolio, order, currentPrice);
            portfolio.orders.splice(i, 1);
          }
          
        } catch (error) {
          logger.error(`Error processing order ${order.id}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Update portfolio performance metrics
   */
  updatePortfolioPerformance(portfolio) {
    const performance = portfolio.performance;
    
    // Calculate current portfolio value
    let positionsValue = 0;
    for (const [symbol, position] of portfolio.positions) {
      // Would need current price - simplified here
      positionsValue += position.quantity * position.avgPrice;
    }
    
    const totalValue = portfolio.currentBalance + positionsValue;
    
    // Calculate returns
    performance.totalReturn = totalValue - portfolio.initialBalance;
    performance.totalReturnPercent = (performance.totalReturn / portfolio.initialBalance) * 100;
    
    // Calculate trade statistics
    const trades = portfolio.trades;
    performance.totalTrades = trades.length;
    
    if (trades.length > 0) {
      const winningTrades = trades.filter(t => t.realizedPnL > 0);
      const losingTrades = trades.filter(t => t.realizedPnL < 0);
      
      performance.winningTrades = winningTrades.length;
      performance.losingTrades = losingTrades.length;
      performance.winRate = (winningTrades.length / trades.length) * 100;
      
      if (winningTrades.length > 0) {
        performance.avgWin = winningTrades.reduce((sum, t) => sum + t.realizedPnL, 0) / winningTrades.length;
      }
      
      if (losingTrades.length > 0) {
        performance.avgLoss = losingTrades.reduce((sum, t) => sum + t.realizedPnL, 0) / losingTrades.length;
      }
      
      // Calculate Sharpe ratio (simplified)
      const returns = trades.map(t => t.realizedPnL / portfolio.initialBalance);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const returnStdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
      performance.sharpeRatio = returnStdDev > 0 ? (avgReturn * 252) / (returnStdDev * Math.sqrt(252)) : 0; // Annualized
    }
    
    portfolio.lastUpdated = new Date();
  }

  /**
   * Get current market price for a symbol
   */
  async getCurrentPrice(symbol) {
    try {
      // Check cache first
      const cached = this.marketDataCache.get(symbol);
      if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
        return cached.price;
      }
      
      // Get fresh data
      const marketDataService = new marketData.MarketDataService();
      const data = await marketDataService.getRealTimePrice(symbol);
      
      this.marketDataCache.set(symbol, {
        price: data.price,
        timestamp: Date.now()
      });
      
      return data.price;
    } catch (error) {
      logger.error(`Error getting price for ${symbol}: ${error.message}`);
      // Return cached price if available, otherwise throw
      const cached = this.marketDataCache.get(symbol);
      if (cached) return cached.price;
      throw error;
    }
  }

  /**
   * Validate order before execution
   */
  validateOrder(portfolio, orderConfig, currentPrice) {
    const { symbol, side, quantity, type, price } = orderConfig;
    
    // Check minimum order size
    const orderValue = quantity * (price || currentPrice);
    if (orderValue < 1) {
      throw new Error('Order value too small');
    }
    
    // Check position size limits
    const maxPositionValue = portfolio.currentBalance * this.riskLimits.maxPositionSize;
    if (side === 'buy' && orderValue > maxPositionValue) {
      throw new Error('Order exceeds maximum position size');
    }
    
    // Check balance for buy orders
    if (side === 'buy') {
      const commission = this.calculateCommission(orderValue);
      if (portfolio.currentBalance < orderValue + commission) {
        throw new Error('Insufficient balance');
      }
    }
    
    // Check position for sell orders
    if (side === 'sell') {
      const position = portfolio.positions.get(symbol);
      if (!position || position.quantity < quantity) {
        throw new Error('Insufficient position to sell');
      }
    }
  }

  /**
   * Calculate commission for order
   */
  calculateCommission(orderValue) {
    // Simple commission structure: 0.1% of order value, minimum $1
    return Math.max(orderValue * 0.001, 1);
  }

  /**
   * Get portfolio details
   */
  getPortfolio(portfolioId) {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }
    
    return {
      ...portfolio,
      positions: Array.from(portfolio.positions.values()),
      orders: portfolio.orders,
      trades: portfolio.trades
    };
  }

  /**
   * Get all portfolios for a user
   */
  getPortfolios(userId = null) {
    const portfolios = Array.from(this.portfolios.values());
    
    return portfolios.map(portfolio => ({
      id: portfolio.id,
      name: portfolio.name,
      currentBalance: portfolio.currentBalance,
      initialBalance: portfolio.initialBalance,
      currency: portfolio.currency,
      performance: portfolio.performance,
      createdAt: portfolio.createdAt,
      lastUpdated: portfolio.lastUpdated,
      status: portfolio.status
    }));
  }

  /**
   * Cancel pending order
   */
  cancelOrder(portfolioId, orderId) {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }
    
    const orderIndex = portfolio.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }
    
    const order = portfolio.orders[orderIndex];
    if (order.status !== 'pending') {
      throw new Error('Order cannot be cancelled');
    }
    
    order.status = 'cancelled';
    order.updatedAt = new Date();
    
    portfolio.orders.splice(orderIndex, 1);
    portfolio.lastUpdated = new Date();
    
    logger.info(`Order cancelled`, { portfolioId, orderId });
    
    return order;
  }

  /**
   * Apply stop-loss and take-profit rules
   */
  async applyRiskManagement() {
    for (const [portfolioId, portfolio] of this.portfolios) {
      for (const [symbol, position] of portfolio.positions) {
        try {
          const currentPrice = await this.getCurrentPrice(symbol);
          const unrealizedPnL = (currentPrice - position.avgPrice) * position.quantity;
          const unrealizedPnLPercent = (unrealizedPnL / (position.avgPrice * position.quantity)) * 100;
          
          // Check stop-loss
          if (unrealizedPnLPercent <= -this.riskLimits.stopLossThreshold * 100) {
            logger.info(`Stop-loss triggered for ${symbol} in portfolio ${portfolioId}`);
            
            await this.placeOrder(portfolioId, {
              symbol,
              side: 'sell',
              type: 'market',
              quantity: position.quantity
            });
          }
          
        } catch (error) {
          logger.error(`Error applying risk management for ${symbol}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Start real-time processing
   */
  startRealTimeProcessing(intervalMs = 5000) {
    logger.info(`Starting real-time paper trading processing with ${intervalMs}ms interval`);
    
    setInterval(async () => {
      try {
        await this.processPendingOrders();
        await this.applyRiskManagement();
        
        // Update all portfolio performances
        for (const portfolio of this.portfolios.values()) {
          this.updatePortfolioPerformance(portfolio);
        }
        
      } catch (error) {
        logger.error(`Error in real-time processing: ${error.message}`);
      }
    }, intervalMs);
  }

  /**
   * Get trading statistics
   */
  getTradingStats(portfolioId, period = '1M') {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }
    
    const now = new Date();
    const periodStart = new Date();
    
    switch (period) {
      case '1D':
        periodStart.setDate(now.getDate() - 1);
        break;
      case '1W':
        periodStart.setDate(now.getDate() - 7);
        break;
      case '1M':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        periodStart.setMonth(now.getMonth() - 3);
        break;
      case '1Y':
        periodStart.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    const periodTrades = portfolio.trades.filter(trade => 
      new Date(trade.timestamp) >= periodStart
    );
    
    const totalPnL = periodTrades.reduce((sum, trade) => sum + trade.realizedPnL, 0);
    const winningTrades = periodTrades.filter(trade => trade.realizedPnL > 0);
    const losingTrades = periodTrades.filter(trade => trade.realizedPnL < 0);
    
    return {
      period,
      totalTrades: periodTrades.length,
      totalPnL,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: periodTrades.length > 0 ? (winningTrades.length / periodTrades.length) * 100 : 0,
      avgWin: winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.realizedPnL, 0) / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.realizedPnL, 0) / losingTrades.length : 0,
      profitFactor: losingTrades.length > 0 ? Math.abs(winningTrades.reduce((sum, t) => sum + t.realizedPnL, 0) / losingTrades.reduce((sum, t) => sum + t.realizedPnL, 0)) : 0
    };
  }
}

module.exports = PaperTradingService;