const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Advanced Order Management System
 * Handles sophisticated order types and execution strategies
 */
class AdvancedOrderManager {
  constructor(exchangeAbstraction) {
    this.exchangeAbstraction = exchangeAbstraction;
    this.activeOrders = new Map();
    this.orderHistory = new Map();
    this.executionStrategies = new Map();
    
    this.orderTypes = {
      MARKET: 'market',
      LIMIT: 'limit',
      STOP_LOSS: 'stop_loss',
      TAKE_PROFIT: 'take_profit',
      OCO: 'oco', // One-Cancels-Other
      ICEBERG: 'iceberg',
      TWAP: 'twap', // Time-Weighted Average Price
      VWAP: 'vwap', // Volume-Weighted Average Price
      BRACKET: 'bracket' // Bracket order (entry + stop loss + take profit)
    };

    this.executionStatus = {
      PENDING: 'pending',
      EXECUTING: 'executing',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled',
      FAILED: 'failed',
      PARTIALLY_FILLED: 'partially_filled'
    };

    // Initialize execution strategies
    this.initializeExecutionStrategies();
    
    logger.info('AdvancedOrderManager initialized with sophisticated order types');
  }

  /**
   * Initialize execution strategies
   */
  initializeExecutionStrategies() {
    this.executionStrategies.set('best_execution', {
      name: 'Best Execution',
      description: 'Route to exchange with best price',
      handler: this.bestExecutionStrategy.bind(this)
    });

    this.executionStrategies.set('cost_minimization', {
      name: 'Cost Minimization',
      description: 'Minimize total execution cost including fees',
      handler: this.costMinimizationStrategy.bind(this)
    });

    this.executionStrategies.set('liquidity_seeking', {
      name: 'Liquidity Seeking',
      description: 'Route to exchange with highest liquidity',
      handler: this.liquiditySeekingStrategy.bind(this)
    });

    this.executionStrategies.set('impact_minimization', {
      name: 'Impact Minimization',
      description: 'Minimize market impact through fragmentation',
      handler: this.impactMinimizationStrategy.bind(this)
    });
  }

  /**
   * Place advanced order
   */
  async placeAdvancedOrder(orderParams) {
    const orderId = uuidv4();
    const order = {
      id: orderId,
      ...orderParams,
      status: this.executionStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executions: [],
      totalExecuted: 0,
      averagePrice: 0,
      metadata: {}
    };

    this.activeOrders.set(orderId, order);

    try {
      switch (order.type) {
        case this.orderTypes.OCO:
          return await this.executeOCOOrder(order);
        case this.orderTypes.ICEBERG:
          return await this.executeIcebergOrder(order);
        case this.orderTypes.TWAP:
          return await this.executeTWAPOrder(order);
        case this.orderTypes.VWAP:
          return await this.executeVWAPOrder(order);
        case this.orderTypes.BRACKET:
          return await this.executeBracketOrder(order);
        default:
          return await this.executeStandardOrder(order);
      }
    } catch (error) {
      order.status = this.executionStatus.FAILED;
      order.error = error.message;
      this.updateOrder(order);
      throw error;
    }
  }

  /**
   * Execute One-Cancels-Other (OCO) Order
   * Places two orders simultaneously, cancels one when the other fills
   */
  async executeOCOOrder(order) {
    logger.info(`Executing OCO order: ${order.id}`);
    
    const { symbol, side, quantity, stopPrice, limitPrice, exchangeId } = order;
    
    if (!stopPrice || !limitPrice) {
      throw new Error('OCO orders require both stopPrice and limitPrice');
    }

    order.status = this.executionStatus.EXECUTING;
    this.updateOrder(order);

    try {
      // Place stop loss order
      const stopOrder = await this.exchangeAbstraction.placeOrder(exchangeId, {
        symbol,
        side,
        type: 'stop_loss',
        quantity: quantity / 2, // Split quantity
        stopPrice,
        clientOrderId: `${order.id}_stop`
      });

      // Place limit order
      const limitOrder = await this.exchangeAbstraction.placeOrder(exchangeId, {
        symbol,
        side,
        type: 'limit',
        quantity: quantity / 2,
        price: limitPrice,
        clientOrderId: `${order.id}_limit`
      });

      order.metadata.stopOrderId = stopOrder.orderId;
      order.metadata.limitOrderId = limitOrder.orderId;
      
      // Start monitoring both orders
      this.monitorOCOOrder(order);

      logger.info(`OCO order placed: stop=${stopOrder.orderId}, limit=${limitOrder.orderId}`);
      
      return {
        orderId: order.id,
        stopOrderId: stopOrder.orderId,
        limitOrderId: limitOrder.orderId,
        status: order.status
      };

    } catch (error) {
      order.status = this.executionStatus.FAILED;
      order.error = error.message;
      this.updateOrder(order);
      throw error;
    }
  }

  /**
   * Execute Iceberg Order
   * Breaks large order into smaller visible portions
   */
  async executeIcebergOrder(order) {
    logger.info(`Executing Iceberg order: ${order.id}`);
    
    const { symbol, side, quantity, price, exchangeId, icebergQuantity } = order;
    const visibleQuantity = icebergQuantity || Math.min(quantity * 0.1, 100); // Default 10% or 100 units
    
    order.status = this.executionStatus.EXECUTING;
    order.metadata.remainingQuantity = quantity;
    order.metadata.visibleQuantity = visibleQuantity;
    order.metadata.childOrders = [];
    this.updateOrder(order);

    try {
      await this.executeIcebergSlice(order);
      return {
        orderId: order.id,
        status: order.status,
        visibleQuantity,
        totalQuantity: quantity
      };
    } catch (error) {
      order.status = this.executionStatus.FAILED;
      order.error = error.message;
      this.updateOrder(order);
      throw error;
    }
  }

  /**
   * Execute TWAP (Time-Weighted Average Price) Order
   * Executes order in small slices over specified time period
   */
  async executeTWAPOrder(order) {
    logger.info(`Executing TWAP order: ${order.id}`);
    
    const { symbol, side, quantity, exchangeId, duration, slices } = order;
    const durationMs = (duration || 3600) * 1000; // Default 1 hour
    const numSlices = slices || 10; // Default 10 slices
    const sliceQuantity = quantity / numSlices;
    const sliceInterval = durationMs / numSlices;

    order.status = this.executionStatus.EXECUTING;
    order.metadata.slices = [];
    order.metadata.currentSlice = 0;
    order.metadata.sliceQuantity = sliceQuantity;
    order.metadata.sliceInterval = sliceInterval;
    this.updateOrder(order);

    try {
      await this.executeTWAPSlice(order);
      return {
        orderId: order.id,
        status: order.status,
        slices: numSlices,
        sliceQuantity,
        intervalMs: sliceInterval
      };
    } catch (error) {
      order.status = this.executionStatus.FAILED;
      order.error = error.message;
      this.updateOrder(order);
      throw error;
    }
  }

  /**
   * Execute VWAP (Volume-Weighted Average Price) Order
   * Matches trading volume to historical volume patterns
   */
  async executeVWAPOrder(order) {
    logger.info(`Executing VWAP order: ${order.id}`);
    
    const { symbol, side, quantity, exchangeId, duration } = order;
    const durationMs = (duration || 3600) * 1000; // Default 1 hour

    order.status = this.executionStatus.EXECUTING;
    order.metadata.vwapSlices = [];
    order.metadata.startTime = Date.now();
    order.metadata.endTime = Date.now() + durationMs;
    this.updateOrder(order);

    try {
      // Get historical volume pattern
      const volumeProfile = await this.getVolumeProfile(symbol, exchangeId);
      order.metadata.volumeProfile = volumeProfile;

      await this.executeVWAPSlice(order);
      return {
        orderId: order.id,
        status: order.status,
        duration: durationMs,
        volumeProfile: volumeProfile.length
      };
    } catch (error) {
      order.status = this.executionStatus.FAILED;
      order.error = error.message;
      this.updateOrder(order);
      throw error;
    }
  }

  /**
   * Execute Bracket Order
   * Entry order with automatic stop loss and take profit
   */
  async executeBracketOrder(order) {
    logger.info(`Executing Bracket order: ${order.id}`);
    
    const { symbol, side, quantity, price, stopLoss, takeProfit, exchangeId } = order;
    
    if (!stopLoss || !takeProfit) {
      throw new Error('Bracket orders require both stopLoss and takeProfit prices');
    }

    order.status = this.executionStatus.EXECUTING;
    this.updateOrder(order);

    try {
      // Place entry order
      const entryOrder = await this.exchangeAbstraction.placeOrder(exchangeId, {
        symbol,
        side,
        type: order.entryType || 'limit',
        quantity,
        price,
        clientOrderId: `${order.id}_entry`
      });

      order.metadata.entryOrderId = entryOrder.orderId;
      
      // Monitor entry order for execution
      this.monitorBracketOrder(order);

      logger.info(`Bracket order entry placed: ${entryOrder.orderId}`);
      
      return {
        orderId: order.id,
        entryOrderId: entryOrder.orderId,
        status: order.status
      };

    } catch (error) {
      order.status = this.executionStatus.FAILED;
      order.error = error.message;
      this.updateOrder(order);
      throw error;
    }
  }

  /**
   * Execute Standard Order with routing optimization
   */
  async executeStandardOrder(order) {
    logger.info(`Executing standard order: ${order.id}`);
    
    order.status = this.executionStatus.EXECUTING;
    this.updateOrder(order);

    try {
      let exchangeId = order.exchangeId;
      
      // If no exchange specified, find best execution venue
      if (!exchangeId) {
        const strategy = order.routingStrategy || 'best_execution';
        const venue = await this.executeRoutingStrategy(strategy, order);
        exchangeId = venue.exchangeId;
        order.metadata.selectedVenue = venue;
      }

      const result = await this.exchangeAbstraction.placeOrder(exchangeId, {
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        price: order.price,
        clientOrderId: order.id
      });

      order.executions.push({
        orderId: result.orderId,
        exchangeId,
        quantity: order.quantity,
        price: result.price || order.price,
        timestamp: new Date().toISOString()
      });

      order.totalExecuted = order.quantity;
      order.averagePrice = result.price || order.price;
      order.status = this.executionStatus.COMPLETED;
      this.updateOrder(order);

      logger.info(`Standard order executed: ${result.orderId}`);
      
      return {
        orderId: order.id,
        exchangeOrderId: result.orderId,
        exchangeId,
        status: order.status
      };

    } catch (error) {
      order.status = this.executionStatus.FAILED;
      order.error = error.message;
      this.updateOrder(order);
      throw error;
    }
  }

  /**
   * Execute routing strategy
   */
  async executeRoutingStrategy(strategyName, order) {
    const strategy = this.executionStrategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown routing strategy: ${strategyName}`);
    }

    return await strategy.handler(order);
  }

  /**
   * Best execution strategy
   */
  async bestExecutionStrategy(order) {
    return await this.exchangeAbstraction.getBestExecutionVenue(
      order.symbol,
      order.side,
      order.quantity
    );
  }

  /**
   * Cost minimization strategy
   */
  async costMinimizationStrategy(order) {
    const venues = await this.getAllVenues(order);
    
    // Calculate total cost including fees for each venue
    const venuesWithCost = venues.map(venue => {
      const price = order.side === 'buy' ? venue.ask : venue.bid;
      const totalCost = order.quantity * price * (1 + venue.fees);
      return { ...venue, totalCost };
    });

    // Sort by total cost
    venuesWithCost.sort((a, b) => a.totalCost - b.totalCost);
    
    return venuesWithCost[0];
  }

  /**
   * Liquidity seeking strategy
   */
  async liquiditySeekingStrategy(order) {
    const venues = await this.getAllVenues(order);
    
    // Sort by liquidity (volume)
    venues.sort((a, b) => b.liquidity - a.liquidity);
    
    return venues[0];
  }

  /**
   * Impact minimization strategy
   */
  async impactMinimizationStrategy(order) {
    const venues = await this.getAllVenues(order);
    
    // For large orders, split across multiple venues
    if (order.quantity > 100) { // Threshold for large orders
      const selectedVenues = venues.slice(0, Math.min(3, venues.length));
      return {
        exchangeId: 'multi_venue',
        venues: selectedVenues,
        strategy: 'fragmented'
      };
    }
    
    return venues[0];
  }

  /**
   * Get all available venues for an order
   */
  async getAllVenues(order) {
    const exchanges = this.exchangeAbstraction.listExchanges()
      .filter(ex => ex.connected);
    
    const venues = [];
    
    for (const exchange of exchanges) {
      try {
        const quote = await this.exchangeAbstraction.getQuote(exchange.id, order.symbol);
        const fees = await this.exchangeAbstraction.getTradingFees(exchange.id, order.symbol);
        
        venues.push({
          exchangeId: exchange.id,
          bid: quote.bid || quote.price,
          ask: quote.ask || quote.price,
          liquidity: quote.volume || 0,
          fees: fees.taker || 0.001
        });
      } catch (error) {
        logger.warn(`Failed to get venue data for ${exchange.id}:`, error.message);
      }
    }
    
    return venues;
  }

  /**
   * Monitor OCO order execution
   */
  async monitorOCOOrder(order) {
    const checkInterval = 5000; // Check every 5 seconds
    
    const monitor = setInterval(async () => {
      try {
        const stopStatus = await this.exchangeAbstraction.getOrderStatus(
          order.exchangeId,
          order.metadata.stopOrderId,
          order.symbol
        );
        
        const limitStatus = await this.exchangeAbstraction.getOrderStatus(
          order.exchangeId,
          order.metadata.limitOrderId,
          order.symbol
        );

        // If either order is filled, cancel the other
        if (stopStatus.status === 'filled') {
          await this.exchangeAbstraction.cancelOrder(
            order.exchangeId,
            order.metadata.limitOrderId,
            order.symbol
          );
          order.status = this.executionStatus.COMPLETED;
          order.metadata.filledOrderId = order.metadata.stopOrderId;
          this.updateOrder(order);
          clearInterval(monitor);
        } else if (limitStatus.status === 'filled') {
          await this.exchangeAbstraction.cancelOrder(
            order.exchangeId,
            order.metadata.stopOrderId,
            order.symbol
          );
          order.status = this.executionStatus.COMPLETED;
          order.metadata.filledOrderId = order.metadata.limitOrderId;
          this.updateOrder(order);
          clearInterval(monitor);
        }
      } catch (error) {
        logger.error(`Error monitoring OCO order ${order.id}:`, error);
      }
    }, checkInterval);

    // Set timeout to stop monitoring after 24 hours
    setTimeout(() => {
      clearInterval(monitor);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Execute iceberg slice
   */
  async executeIcebergSlice(order) {
    const { symbol, side, price, exchangeId } = order;
    const sliceQuantity = Math.min(
      order.metadata.visibleQuantity,
      order.metadata.remainingQuantity
    );

    if (sliceQuantity <= 0) {
      order.status = this.executionStatus.COMPLETED;
      this.updateOrder(order);
      return;
    }

    try {
      const sliceOrder = await this.exchangeAbstraction.placeOrder(exchangeId, {
        symbol,
        side,
        type: 'limit',
        quantity: sliceQuantity,
        price,
        clientOrderId: `${order.id}_slice_${order.metadata.childOrders.length}`
      });

      order.metadata.childOrders.push(sliceOrder.orderId);
      
      // Monitor slice execution
      setTimeout(async () => {
        try {
          const status = await this.exchangeAbstraction.getOrderStatus(
            exchangeId,
            sliceOrder.orderId,
            symbol
          );

          if (status.status === 'filled') {
            order.totalExecuted += sliceQuantity;
            order.metadata.remainingQuantity -= sliceQuantity;
            
            // Calculate new average price
            const newTotal = order.averagePrice * (order.totalExecuted - sliceQuantity) + 
                           status.averagePrice * sliceQuantity;
            order.averagePrice = newTotal / order.totalExecuted;

            this.updateOrder(order);

            // Execute next slice if remaining quantity
            if (order.metadata.remainingQuantity > 0) {
              await this.executeIcebergSlice(order);
            } else {
              order.status = this.executionStatus.COMPLETED;
              this.updateOrder(order);
            }
          }
        } catch (error) {
          logger.error(`Error checking iceberg slice ${sliceOrder.orderId}:`, error);
        }
      }, 10000); // Check after 10 seconds

    } catch (error) {
      logger.error(`Error executing iceberg slice for order ${order.id}:`, error);
      throw error;
    }
  }

  /**
   * Execute TWAP slice
   */
  async executeTWAPSlice(order) {
    if (order.metadata.currentSlice >= order.metadata.slices) {
      order.status = this.executionStatus.COMPLETED;
      this.updateOrder(order);
      return;
    }

    const { symbol, side, exchangeId } = order;
    
    try {
      // Get current market price for market order
      const quote = await this.exchangeAbstraction.getQuote(exchangeId, symbol);
      const price = side === 'buy' ? quote.ask : quote.bid;

      const sliceOrder = await this.exchangeAbstraction.placeOrder(exchangeId, {
        symbol,
        side,
        type: 'market',
        quantity: order.metadata.sliceQuantity,
        clientOrderId: `${order.id}_twap_${order.metadata.currentSlice}`
      });

      order.metadata.slices.push({
        orderId: sliceOrder.orderId,
        quantity: order.metadata.sliceQuantity,
        price: price,
        timestamp: new Date().toISOString()
      });

      order.totalExecuted += order.metadata.sliceQuantity;
      order.metadata.currentSlice++;

      // Calculate TWAP
      const totalValue = order.metadata.slices.reduce((sum, slice) => 
        sum + (slice.quantity * slice.price), 0
      );
      order.averagePrice = totalValue / order.totalExecuted;

      this.updateOrder(order);

      // Schedule next slice
      if (order.metadata.currentSlice < order.metadata.slices) {
        setTimeout(() => {
          this.executeTWAPSlice(order);
        }, order.metadata.sliceInterval);
      } else {
        order.status = this.executionStatus.COMPLETED;
        this.updateOrder(order);
      }

    } catch (error) {
      logger.error(`Error executing TWAP slice for order ${order.id}:`, error);
      throw error;
    }
  }

  /**
   * Execute VWAP slice
   */
  async executeVWAPSlice(order) {
    const now = Date.now();
    if (now >= order.metadata.endTime) {
      order.status = this.executionStatus.COMPLETED;
      this.updateOrder(order);
      return;
    }

    try {
      // Calculate quantity based on volume profile
      const timeProgress = (now - order.metadata.startTime) / 
                          (order.metadata.endTime - order.metadata.startTime);
      const targetQuantity = order.quantity * timeProgress;
      const sliceQuantity = Math.min(
        targetQuantity - order.totalExecuted,
        order.quantity * 0.1 // Max 10% per slice
      );

      if (sliceQuantity > 0) {
        const { symbol, side, exchangeId } = order;
        const quote = await this.exchangeAbstraction.getQuote(exchangeId, symbol);
        const price = side === 'buy' ? quote.ask : quote.bid;

        const sliceOrder = await this.exchangeAbstraction.placeOrder(exchangeId, {
          symbol,
          side,
          type: 'market',
          quantity: sliceQuantity,
          clientOrderId: `${order.id}_vwap_${Date.now()}`
        });

        order.metadata.vwapSlices.push({
          orderId: sliceOrder.orderId,
          quantity: sliceQuantity,
          price: price,
          timestamp: new Date().toISOString()
        });

        order.totalExecuted += sliceQuantity;

        // Calculate VWAP
        const totalValue = order.metadata.vwapSlices.reduce((sum, slice) => 
          sum + (slice.quantity * slice.price), 0
        );
        order.averagePrice = totalValue / order.totalExecuted;

        this.updateOrder(order);
      }

      // Schedule next slice
      setTimeout(() => {
        this.executeVWAPSlice(order);
      }, 30000); // Check every 30 seconds

    } catch (error) {
      logger.error(`Error executing VWAP slice for order ${order.id}:`, error);
    }
  }

  /**
   * Monitor bracket order
   */
  async monitorBracketOrder(order) {
    const checkInterval = 5000; // Check every 5 seconds
    
    const monitor = setInterval(async () => {
      try {
        const entryStatus = await this.exchangeAbstraction.getOrderStatus(
          order.exchangeId,
          order.metadata.entryOrderId,
          order.symbol
        );

        if (entryStatus.status === 'filled') {
          // Entry order filled, place stop loss and take profit
          const { symbol, side, quantity, stopLoss, takeProfit, exchangeId } = order;
          const exitSide = side === 'buy' ? 'sell' : 'buy';

          const stopOrder = await this.exchangeAbstraction.placeOrder(exchangeId, {
            symbol,
            side: exitSide,
            type: 'stop_loss',
            quantity,
            stopPrice: stopLoss,
            clientOrderId: `${order.id}_stop`
          });

          const profitOrder = await this.exchangeAbstraction.placeOrder(exchangeId, {
            symbol,
            side: exitSide,
            type: 'limit',
            quantity,
            price: takeProfit,
            clientOrderId: `${order.id}_profit`
          });

          order.metadata.stopOrderId = stopOrder.orderId;
          order.metadata.profitOrderId = profitOrder.orderId;
          order.status = this.executionStatus.COMPLETED;
          this.updateOrder(order);
          
          clearInterval(monitor);
          
          // Start monitoring exit orders (OCO style)
          this.monitorBracketExit(order);
        }
      } catch (error) {
        logger.error(`Error monitoring bracket order ${order.id}:`, error);
      }
    }, checkInterval);

    // Set timeout to stop monitoring after 24 hours
    setTimeout(() => {
      clearInterval(monitor);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Monitor bracket exit orders
   */
  async monitorBracketExit(order) {
    const checkInterval = 5000;
    
    const monitor = setInterval(async () => {
      try {
        const stopStatus = await this.exchangeAbstraction.getOrderStatus(
          order.exchangeId,
          order.metadata.stopOrderId,
          order.symbol
        );
        
        const profitStatus = await this.exchangeAbstraction.getOrderStatus(
          order.exchangeId,
          order.metadata.profitOrderId,
          order.symbol
        );

        // If either exit order is filled, cancel the other
        if (stopStatus.status === 'filled') {
          await this.exchangeAbstraction.cancelOrder(
            order.exchangeId,
            order.metadata.profitOrderId,
            order.symbol
          );
          order.metadata.exitType = 'stop_loss';
          this.updateOrder(order);
          clearInterval(monitor);
        } else if (profitStatus.status === 'filled') {
          await this.exchangeAbstraction.cancelOrder(
            order.exchangeId,
            order.metadata.stopOrderId,
            order.symbol
          );
          order.metadata.exitType = 'take_profit';
          this.updateOrder(order);
          clearInterval(monitor);
        }
      } catch (error) {
        logger.error(`Error monitoring bracket exit for order ${order.id}:`, error);
      }
    }, checkInterval);

    // Set timeout
    setTimeout(() => {
      clearInterval(monitor);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Get volume profile for VWAP calculation
   */
  async getVolumeProfile(symbol, exchangeId) {
    try {
      const marketData = await this.exchangeAbstraction.getMarketData(
        exchangeId,
        symbol,
        '1h',
        24 // Last 24 hours
      );

      return marketData.data.map(candle => ({
        timestamp: candle.timestamp,
        volume: candle.volume,
        price: candle.close
      }));
    } catch (error) {
      logger.warn(`Failed to get volume profile for ${symbol}:`, error.message);
      // Return default uniform distribution
      return Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (24 - i) * 60 * 60 * 1000).toISOString(),
        volume: 1000000, // Default volume
        price: 50000 // Default price
      }));
    }
  }

  /**
   * Update order information
   */
  updateOrder(order) {
    order.updatedAt = new Date().toISOString();
    this.activeOrders.set(order.id, order);
    
    if (order.status === this.executionStatus.COMPLETED || 
        order.status === this.executionStatus.FAILED ||
        order.status === this.executionStatus.CANCELLED) {
      this.orderHistory.set(order.id, order);
      this.activeOrders.delete(order.id);
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId) {
    const order = this.activeOrders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    try {
      // Cancel all child orders based on order type
      if (order.type === this.orderTypes.OCO) {
        if (order.metadata.stopOrderId) {
          await this.exchangeAbstraction.cancelOrder(
            order.exchangeId,
            order.metadata.stopOrderId,
            order.symbol
          );
        }
        if (order.metadata.limitOrderId) {
          await this.exchangeAbstraction.cancelOrder(
            order.exchangeId,
            order.metadata.limitOrderId,
            order.symbol
          );
        }
      } else if (order.type === this.orderTypes.ICEBERG) {
        for (const childOrderId of order.metadata.childOrders || []) {
          try {
            await this.exchangeAbstraction.cancelOrder(
              order.exchangeId,
              childOrderId,
              order.symbol
            );
          } catch (error) {
            logger.warn(`Failed to cancel child order ${childOrderId}:`, error.message);
          }
        }
      }

      order.status = this.executionStatus.CANCELLED;
      this.updateOrder(order);

      logger.info(`Order cancelled: ${orderId}`);
      return { orderId, status: order.status };

    } catch (error) {
      logger.error(`Error cancelling order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get order status
   */
  getOrder(orderId) {
    return this.activeOrders.get(orderId) || this.orderHistory.get(orderId);
  }

  /**
   * List active orders
   */
  listActiveOrders(filters = {}) {
    let orders = Array.from(this.activeOrders.values());
    
    if (filters.symbol) {
      orders = orders.filter(order => order.symbol === filters.symbol);
    }
    
    if (filters.type) {
      orders = orders.filter(order => order.type === filters.type);
    }
    
    if (filters.exchangeId) {
      orders = orders.filter(order => order.exchangeId === filters.exchangeId);
    }
    
    return orders;
  }

  /**
   * Get order execution analytics
   */
  getExecutionAnalytics(timeframe = '24h') {
    const now = Date.now();
    const timeframeMs = this.parseTimeframe(timeframe);
    const cutoff = now - timeframeMs;

    const relevantOrders = Array.from(this.orderHistory.values())
      .filter(order => new Date(order.createdAt).getTime() > cutoff);

    const analytics = {
      totalOrders: relevantOrders.length,
      completedOrders: relevantOrders.filter(o => o.status === this.executionStatus.COMPLETED).length,
      failedOrders: relevantOrders.filter(o => o.status === this.executionStatus.FAILED).length,
      cancelledOrders: relevantOrders.filter(o => o.status === this.executionStatus.CANCELLED).length,
      averageExecutionTime: 0,
      totalVolume: 0,
      orderTypeBreakdown: {},
      exchangeBreakdown: {},
      successRate: 0
    };

    if (relevantOrders.length > 0) {
      // Calculate average execution time
      const executionTimes = relevantOrders
        .filter(o => o.status === this.executionStatus.COMPLETED)
        .map(o => new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime());
      
      analytics.averageExecutionTime = executionTimes.length > 0 
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
        : 0;

      // Calculate total volume
      analytics.totalVolume = relevantOrders
        .filter(o => o.status === this.executionStatus.COMPLETED)
        .reduce((sum, o) => sum + o.totalExecuted, 0);

      // Order type breakdown
      relevantOrders.forEach(order => {
        analytics.orderTypeBreakdown[order.type] = 
          (analytics.orderTypeBreakdown[order.type] || 0) + 1;
      });

      // Exchange breakdown
      relevantOrders.forEach(order => {
        analytics.exchangeBreakdown[order.exchangeId] = 
          (analytics.exchangeBreakdown[order.exchangeId] || 0) + 1;
      });

      // Success rate
      analytics.successRate = (analytics.completedOrders / analytics.totalOrders) * 100;
    }

    return analytics;
  }

  /**
   * Parse timeframe string to milliseconds
   */
  parseTimeframe(timeframe) {
    const match = timeframe.match(/^(\d+)([hdw])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 24h

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Get available order types
   */
  getOrderTypes() {
    return Object.entries(this.orderTypes).map(([key, value]) => ({
      id: value,
      name: key.replace(/_/g, ' '),
      description: this.getOrderTypeDescription(value)
    }));
  }

  /**
   * Get order type description
   */
  getOrderTypeDescription(type) {
    const descriptions = {
      market: 'Execute immediately at current market price',
      limit: 'Execute only at specified price or better',
      stop_loss: 'Trigger market order when price reaches stop level',
      take_profit: 'Trigger limit order when profit target is reached',
      oco: 'Place two orders, cancel one when the other executes',
      iceberg: 'Break large order into smaller visible portions',
      twap: 'Execute order in equal slices over specified time period',
      vwap: 'Execute order following historical volume patterns',
      bracket: 'Entry order with automatic stop loss and take profit'
    };
    
    return descriptions[type] || 'Unknown order type';
  }

  /**
   * Get execution strategies
   */
  getExecutionStrategies() {
    return Array.from(this.executionStrategies.values());
  }
}

module.exports = AdvancedOrderManager;