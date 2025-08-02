const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

/**
 * Advanced Order Management System
 * Implements sophisticated order types and execution strategies:
 * - Advanced order types (OCO, Iceberg, TWAP, VWAP)
 * - Order routing optimization
 * - Order execution analytics
 * - Smart order fragmentation
 * - Slippage management
 */
class AdvancedOrderManagement extends EventEmitter {
  constructor() {
    super();
    
    this.orders = new Map();
    this.orderBooks = new Map();
    this.executionStrategies = new Map();
    this.orderQueues = new Map();
    
    // Configuration
    this.config = {
      maxOrderSize: 10000,      // Maximum single order size
      minOrderSize: 0.001,      // Minimum order size
      maxSlippage: 0.02,        // 2% maximum slippage
      fragmentationThreshold: 1000, // Fragment orders above this size
      twapInterval: 60000,      // 1 minute TWAP intervals
      icebergVisibleSize: 0.1,  // 10% visible size for iceberg orders
      executionTimeout: 300000, // 5 minutes order timeout
      retryAttempts: 3,
      
      // Order routing preferences
      routing: {
        prioritizePrice: 0.6,   // Price improvement weight
        prioritizeLiquidity: 0.3, // Liquidity weight  
        prioritizeSpeed: 0.1    // Execution speed weight
      }
    };
    
    // Order type implementations
    this.orderTypes = {
      MARKET: this.executeMarketOrder.bind(this),
      LIMIT: this.executeLimitOrder.bind(this),
      STOP: this.executeStopOrder.bind(this),
      STOP_LIMIT: this.executeStopLimitOrder.bind(this),
      OCO: this.executeOCOOrder.bind(this),
      ICEBERG: this.executeIcebergOrder.bind(this),
      TWAP: this.executeTWAPOrder.bind(this),
      VWAP: this.executeVWAPOrder.bind(this)
    };
    
    // Initialize execution analytics
    this.analytics = {
      totalOrders: 0,
      successfulOrders: 0,
      averageExecutionTime: 0,
      averageSlippage: 0,
      orderTypeStats: {},
      exchangeStats: {}
    };
    
    logger.info('Advanced Order Management System initialized');
  }

  /**
   * Place a new order with advanced features
   */
  async placeOrder(orderRequest) {
    const orderId = uuidv4();
    const timestamp = Date.now();
    
    // Validate order request
    const validationResult = this.validateOrder(orderRequest);
    if (!validationResult.valid) {
      throw new Error(`Order validation failed: ${validationResult.error}`);
    }
    
    // Create order object
    const order = {
      id: orderId,
      ...orderRequest,
      status: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
      executions: [],
      analytics: {
        submissionTime: timestamp,
        executionTime: null,
        averagePrice: null,
        totalSlippage: 0,
        executionRate: 0
      }
    };
    
    this.orders.set(orderId, order);
    
    logger.info('Order placed', {
      orderId,
      type: order.type,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity
    });
    
    try {
      // Route to appropriate execution strategy
      await this.routeOrder(order);
      
      this.emit('orderPlaced', order);
      
      return order;
      
    } catch (error) {
      order.status = 'FAILED';
      order.error = error.message;
      order.updatedAt = Date.now();
      
      logger.error('Order placement failed', {
        orderId,
        error: error.message
      });
      
      this.emit('orderFailed', order);
      throw error;
    }
  }

  /**
   * Validate order parameters
   */
  validateOrder(orderRequest) {
    const { symbol, side, type, quantity, price, exchange } = orderRequest;
    
    // Basic validation
    if (!symbol || !side || !type || !quantity) {
      return { valid: false, error: 'Missing required fields' };
    }
    
    if (!['BUY', 'SELL'].includes(side.toUpperCase())) {
      return { valid: false, error: 'Invalid side' };
    }
    
    if (!this.orderTypes[type.toUpperCase()]) {
      return { valid: false, error: 'Unsupported order type' };
    }
    
    if (quantity <= 0 || quantity < this.config.minOrderSize) {
      return { valid: false, error: 'Invalid quantity' };
    }
    
    if (quantity > this.config.maxOrderSize) {
      return { valid: false, error: 'Quantity exceeds maximum order size' };
    }
    
    // Price validation for limit orders
    if (['LIMIT', 'STOP_LIMIT', 'OCO'].includes(type.toUpperCase()) && (!price || price <= 0)) {
      return { valid: false, error: 'Invalid price for limit order' };
    }
    
    return { valid: true };
  }

  /**
   * Route order to optimal execution strategy
   */
  async routeOrder(order) {
    const { symbol, quantity, type } = order;
    
    // Determine if order needs fragmentation
    if (quantity >= this.config.fragmentationThreshold) {
      return await this.fragmentOrder(order);
    }
    
    // Route based on order type
    const executionFunction = this.orderTypes[type.toUpperCase()];
    if (!executionFunction) {
      throw new Error(`Unsupported order type: ${type}`);
    }
    
    return await executionFunction(order);
  }

  /**
   * Fragment large orders into smaller pieces
   */
  async fragmentOrder(order) {
    const fragments = this.calculateOrderFragments(order);
    
    logger.info('Fragmenting large order', {
      orderId: order.id,
      originalQuantity: order.quantity,
      fragmentCount: fragments.length
    });
    
    order.status = 'FRAGMENTING';
    order.fragments = fragments;
    
    // Execute fragments sequentially or in parallel based on strategy
    const executionPromises = fragments.map((fragment, index) => 
      this.executeFragment(order, fragment, index)
    );
    
    try {
      const fragmentResults = await Promise.all(executionPromises);
      
      // Consolidate results
      order.executions = fragmentResults.flat();
      order.status = 'FILLED';
      order.analytics.executionTime = Date.now() - order.analytics.submissionTime;
      
      this.calculateOrderAnalytics(order);
      this.updateSystemAnalytics(order);
      
      logger.info('Fragmented order completed', {
        orderId: order.id,
        fragmentsExecuted: fragmentResults.length,
        totalExecutions: order.executions.length
      });
      
      this.emit('orderFilled', order);
      
    } catch (error) {
      order.status = 'PARTIALLY_FILLED';
      order.error = error.message;
      
      logger.error('Fragmented order partially failed', {
        orderId: order.id,
        error: error.message
      });
      
      this.emit('orderPartiallyFilled', order);
      throw error;
    }
  }

  /**
   * Calculate optimal order fragments
   */
  calculateOrderFragments(order) {
    const { quantity, type } = order;
    const maxFragmentSize = this.config.fragmentationThreshold * 0.8;
    
    const fragmentCount = Math.ceil(quantity / maxFragmentSize);
    const baseFragmentSize = quantity / fragmentCount;
    
    const fragments = [];
    let remainingQuantity = quantity;
    
    for (let i = 0; i < fragmentCount; i++) {
      const fragmentSize = i === fragmentCount - 1 
        ? remainingQuantity 
        : Math.min(baseFragmentSize, remainingQuantity);
      
      fragments.push({
        id: `${order.id}_frag_${i + 1}`,
        quantity: fragmentSize,
        delay: this.calculateFragmentDelay(i, type),
        priority: i === 0 ? 'HIGH' : 'NORMAL'
      });
      
      remainingQuantity -= fragmentSize;
    }
    
    return fragments;
  }

  /**
   * Calculate delay between fragments
   */
  calculateFragmentDelay(index, orderType) {
    if (orderType === 'TWAP') {
      return this.config.twapInterval;
    }
    
    // Randomized delay to avoid pattern detection
    const baseDelay = 1000; // 1 second
    const randomFactor = Math.random() * 2000; // 0-2 seconds
    
    return baseDelay + randomFactor;
  }

  /**
   * Execute individual fragment
   */
  async executeFragment(parentOrder, fragment, index) {
    const fragmentOrder = {
      ...parentOrder,
      id: fragment.id,
      quantity: fragment.quantity,
      parentOrderId: parentOrder.id,
      fragmentIndex: index
    };
    
    // Add delay if specified
    if (fragment.delay > 0 && index > 0) {
      await new Promise(resolve => setTimeout(resolve, fragment.delay));
    }
    
    // Execute the fragment
    const executionFunction = this.orderTypes[parentOrder.type.toUpperCase()];
    return await executionFunction(fragmentOrder);
  }

  /**
   * Execute Market Order
   */
  async executeMarketOrder(order) {
    logger.info('Executing market order', { orderId: order.id });
    
    order.status = 'EXECUTING';
    
    try {
      // Get current market price
      const marketPrice = await this.getCurrentMarketPrice(order.symbol, order.side);
      
      // Check slippage
      const slippage = this.calculateSlippage(order.expectedPrice, marketPrice);
      if (slippage > this.config.maxSlippage) {
        throw new Error(`Slippage ${(slippage * 100).toFixed(2)}% exceeds maximum ${(this.config.maxSlippage * 100).toFixed(2)}%`);
      }
      
      // Simulate execution (in real implementation, this would call exchange API)
      const execution = await this.simulateExecution(order, marketPrice);
      
      order.executions.push(execution);
      order.status = 'FILLED';
      order.analytics.executionTime = Date.now() - order.analytics.submissionTime;
      
      this.calculateOrderAnalytics(order);
      
      logger.info('Market order executed successfully', {
        orderId: order.id,
        executionPrice: execution.price,
        slippage: slippage * 100
      });
      
      this.emit('orderExecuted', order);
      
      return [execution];
      
    } catch (error) {
      order.status = 'FAILED';
      order.error = error.message;
      
      logger.error('Market order execution failed', {
        orderId: order.id,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Execute Limit Order
   */
  async executeLimitOrder(order) {
    logger.info('Executing limit order', { orderId: order.id, price: order.price });
    
    order.status = 'PENDING';
    
    // Monitor market for execution opportunity
    const executionPromise = new Promise((resolve, reject) => {
      const checkExecution = async () => {
        try {
          const marketPrice = await this.getCurrentMarketPrice(order.symbol, order.side);
          
          // Check if limit price is executable
          const canExecute = order.side.toUpperCase() === 'BUY' 
            ? marketPrice <= order.price
            : marketPrice >= order.price;
          
          if (canExecute) {
            const execution = await this.simulateExecution(order, order.price);
            order.executions.push(execution);
            order.status = 'FILLED';
            order.analytics.executionTime = Date.now() - order.analytics.submissionTime;
            
            this.calculateOrderAnalytics(order);
            
            logger.info('Limit order executed', {
              orderId: order.id,
              executionPrice: execution.price
            });
            
            this.emit('orderExecuted', order);
            resolve([execution]);
          } else {
            // Continue monitoring
            setTimeout(checkExecution, 1000);
          }
          
        } catch (error) {
          order.status = 'FAILED';
          order.error = error.message;
          reject(error);
        }
      };
      
      checkExecution();
      
      // Set timeout
      setTimeout(() => {
        if (order.status === 'PENDING') {
          order.status = 'EXPIRED';
          order.error = 'Order execution timeout';
          logger.warn('Limit order expired', { orderId: order.id });
          reject(new Error('Order execution timeout'));
        }
      }, this.config.executionTimeout);
    });
    
    return await executionPromise;
  }

  /**
   * Execute Stop Order
   */
  async executeStopOrder(order) {
    logger.info('Executing stop order', { orderId: order.id, stopPrice: order.stopPrice });
    
    order.status = 'PENDING';
    
    // Monitor for stop trigger
    const executionPromise = new Promise((resolve, reject) => {
      const checkTrigger = async () => {
        try {
          const marketPrice = await this.getCurrentMarketPrice(order.symbol, order.side);
          
          // Check if stop price is triggered
          const isTriggered = order.side.toUpperCase() === 'BUY'
            ? marketPrice >= order.stopPrice
            : marketPrice <= order.stopPrice;
          
          if (isTriggered) {
            logger.info('Stop order triggered', { orderId: order.id, triggerPrice: marketPrice });
            
            // Convert to market order
            const execution = await this.simulateExecution(order, marketPrice);
            order.executions.push(execution);
            order.status = 'FILLED';
            order.analytics.executionTime = Date.now() - order.analytics.submissionTime;
            
            this.calculateOrderAnalytics(order);
            this.emit('orderExecuted', order);
            resolve([execution]);
          } else {
            setTimeout(checkTrigger, 1000);
          }
          
        } catch (error) {
          order.status = 'FAILED';
          order.error = error.message;
          reject(error);
        }
      };
      
      checkTrigger();
      
      // Set timeout
      setTimeout(() => {
        if (order.status === 'PENDING') {
          order.status = 'EXPIRED';
          order.error = 'Stop order timeout';
          reject(new Error('Stop order timeout'));
        }
      }, this.config.executionTimeout);
    });
    
    return await executionPromise;
  }

  /**
   * Execute Stop-Limit Order
   */
  async executeStopLimitOrder(order) {
    logger.info('Executing stop-limit order', { 
      orderId: order.id, 
      stopPrice: order.stopPrice, 
      limitPrice: order.price 
    });
    
    // First wait for stop trigger
    await new Promise((resolve, reject) => {
      const checkTrigger = async () => {
        try {
          const marketPrice = await this.getCurrentMarketPrice(order.symbol, order.side);
          
          const isTriggered = order.side.toUpperCase() === 'BUY'
            ? marketPrice >= order.stopPrice
            : marketPrice <= order.stopPrice;
          
          if (isTriggered) {
            logger.info('Stop-limit order triggered', { orderId: order.id });
            resolve();
          } else {
            setTimeout(checkTrigger, 1000);
          }
          
        } catch (error) {
          reject(error);
        }
      };
      
      checkTrigger();
    });
    
    // Convert to limit order after trigger
    return await this.executeLimitOrder({
      ...order,
      type: 'LIMIT'
    });
  }

  /**
   * Execute OCO (One-Cancels-Other) Order
   */
  async executeOCOOrder(order) {
    logger.info('Executing OCO order', { orderId: order.id });
    
    const { stopPrice, limitPrice } = order;
    
    // Create two child orders
    const stopOrder = {
      ...order,
      id: `${order.id}_stop`,
      type: 'STOP',
      stopPrice,
      parentOrderId: order.id
    };
    
    const limitOrder = {
      ...order,
      id: `${order.id}_limit`,
      type: 'LIMIT',
      price: limitPrice,
      parentOrderId: order.id
    };
    
    order.status = 'PENDING';
    order.childOrders = [stopOrder.id, limitOrder.id];
    
    // Execute both orders in parallel
    const promises = [
      this.executeStopOrder(stopOrder).catch(err => ({ error: err })),
      this.executeLimitOrder(limitOrder).catch(err => ({ error: err }))
    ];
    
    try {
      const results = await Promise.race(promises);
      
      // One order filled, cancel the other
      const filledOrder = results.error ? null : results;
      
      if (filledOrder) {
        order.status = 'FILLED';
        order.executions = filledOrder;
        order.analytics.executionTime = Date.now() - order.analytics.submissionTime;
        
        this.calculateOrderAnalytics(order);
        
        logger.info('OCO order completed', { orderId: order.id });
        this.emit('orderExecuted', order);
        
        return filledOrder;
      } else {
        throw new Error('Both OCO legs failed');
      }
      
    } catch (error) {
      order.status = 'FAILED';
      order.error = error.message;
      throw error;
    }
  }

  /**
   * Execute Iceberg Order
   */
  async executeIcebergOrder(order) {
    logger.info('Executing iceberg order', { 
      orderId: order.id, 
      totalQuantity: order.quantity,
      visibleSize: order.visibleSize || this.config.icebergVisibleSize
    });
    
    const visibleSize = order.visibleSize || this.config.icebergVisibleSize;
    const visibleQuantity = order.quantity * visibleSize;
    const executions = [];
    
    let remainingQuantity = order.quantity;
    order.status = 'EXECUTING';
    
    while (remainingQuantity > 0) {
      const sliceQuantity = Math.min(visibleQuantity, remainingQuantity);
      
      // Create slice order
      const sliceOrder = {
        ...order,
        id: `${order.id}_slice_${Date.now()}`,
        quantity: sliceQuantity,
        type: 'LIMIT'
      };
      
      try {
        const sliceExecutions = await this.executeLimitOrder(sliceOrder);
        executions.push(...sliceExecutions);
        remainingQuantity -= sliceQuantity;
        
        logger.info('Iceberg slice executed', {
          orderId: order.id,
          sliceQuantity,
          remainingQuantity
        });
        
        // Small delay between slices to avoid detection
        if (remainingQuantity > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        }
        
      } catch (error) {
        logger.error('Iceberg slice failed', {
          orderId: order.id,
          sliceQuantity,
          error: error.message
        });
        
        if (executions.length === 0) {
          throw error; // No executions, fail completely
        }
        
        // Partial execution
        order.status = 'PARTIALLY_FILLED';
        break;
      }
    }
    
    order.executions = executions;
    if (remainingQuantity === 0) {
      order.status = 'FILLED';
    }
    
    order.analytics.executionTime = Date.now() - order.analytics.submissionTime;
    this.calculateOrderAnalytics(order);
    
    logger.info('Iceberg order completed', {
      orderId: order.id,
      totalExecutions: executions.length,
      status: order.status
    });
    
    this.emit('orderExecuted', order);
    
    return executions;
  }

  /**
   * Execute TWAP (Time-Weighted Average Price) Order
   */
  async executeTWAPOrder(order) {
    logger.info('Executing TWAP order', { 
      orderId: order.id,
      duration: order.duration || this.config.twapInterval * 10,
      interval: order.interval || this.config.twapInterval
    });
    
    const duration = order.duration || this.config.twapInterval * 10; // 10 minutes default
    const interval = order.interval || this.config.twapInterval; // 1 minute default
    const sliceCount = Math.ceil(duration / interval);
    const sliceQuantity = order.quantity / sliceCount;
    
    const executions = [];
    order.status = 'EXECUTING';
    
    for (let i = 0; i < sliceCount; i++) {
      try {
        // Create time slice order
        const sliceOrder = {
          ...order,
          id: `${order.id}_twap_${i + 1}`,
          quantity: i === sliceCount - 1 ? 
            order.quantity - (i * sliceQuantity) : // Last slice gets remainder
            sliceQuantity,
          type: 'MARKET' // TWAP typically uses market orders
        };
        
        const sliceExecutions = await this.executeMarketOrder(sliceOrder);
        executions.push(...sliceExecutions);
        
        logger.info('TWAP slice executed', {
          orderId: order.id,
          slice: i + 1,
          totalSlices: sliceCount,
          sliceQuantity: sliceOrder.quantity
        });
        
        // Wait for next interval
        if (i < sliceCount - 1) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
        
      } catch (error) {
        logger.error('TWAP slice failed', {
          orderId: order.id,
          slice: i + 1,
          error: error.message
        });
        
        // Continue with remaining slices
        continue;
      }
    }
    
    order.executions = executions;
    order.status = executions.length > 0 ? 'FILLED' : 'FAILED';
    order.analytics.executionTime = Date.now() - order.analytics.submissionTime;
    
    this.calculateOrderAnalytics(order);
    
    logger.info('TWAP order completed', {
      orderId: order.id,
      totalExecutions: executions.length,
      averagePrice: order.analytics.averagePrice
    });
    
    this.emit('orderExecuted', order);
    
    return executions;
  }

  /**
   * Execute VWAP (Volume-Weighted Average Price) Order
   */
  async executeVWAPOrder(order) {
    logger.info('Executing VWAP order', { orderId: order.id });
    
    // Get historical volume data for VWAP calculation
    const volumeProfile = await this.getVolumeProfile(order.symbol);
    const vwapSlices = this.calculateVWAPSlices(order.quantity, volumeProfile);
    
    const executions = [];
    order.status = 'EXECUTING';
    
    for (let i = 0; i < vwapSlices.length; i++) {
      const slice = vwapSlices[i];
      
      try {
        const sliceOrder = {
          ...order,
          id: `${order.id}_vwap_${i + 1}`,
          quantity: slice.quantity,
          type: 'MARKET'
        };
        
        const sliceExecutions = await this.executeMarketOrder(sliceOrder);
        executions.push(...sliceExecutions);
        
        logger.info('VWAP slice executed', {
          orderId: order.id,
          slice: i + 1,
          sliceQuantity: slice.quantity,
          targetTime: slice.time
        });
        
        // Wait until target time for this slice
        const waitTime = slice.time - Date.now();
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
      } catch (error) {
        logger.error('VWAP slice failed', {
          orderId: order.id,
          slice: i + 1,
          error: error.message
        });
        continue;
      }
    }
    
    order.executions = executions;
    order.status = executions.length > 0 ? 'FILLED' : 'FAILED';
    order.analytics.executionTime = Date.now() - order.analytics.submissionTime;
    
    this.calculateOrderAnalytics(order);
    
    logger.info('VWAP order completed', {
      orderId: order.id,
      totalExecutions: executions.length
    });
    
    this.emit('orderExecuted', order);
    
    return executions;
  }

  /**
   * Simulate order execution (replace with real exchange API calls)
   */
  async simulateExecution(order, executionPrice) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200));
    
    // Add realistic price variation
    const priceVariation = executionPrice * (Math.random() - 0.5) * 0.001; // 0.1% max variation
    const finalPrice = executionPrice + priceVariation;
    
    return {
      id: uuidv4(),
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      price: finalPrice,
      timestamp: Date.now(),
      exchange: order.exchange || 'simulated',
      fees: order.quantity * finalPrice * 0.001 // 0.1% fee
    };
  }

  /**
   * Get current market price (mock implementation)
   */
  async getCurrentMarketPrice(symbol, side) {
    // Mock implementation - replace with real market data
    const basePrice = 50000; // Mock BTC price
    const spread = basePrice * 0.0001; // 0.01% spread
    
    return side.toUpperCase() === 'BUY' 
      ? basePrice + spread/2 + (Math.random() - 0.5) * basePrice * 0.01
      : basePrice - spread/2 + (Math.random() - 0.5) * basePrice * 0.01;
  }

  /**
   * Calculate slippage
   */
  calculateSlippage(expectedPrice, actualPrice) {
    if (!expectedPrice || expectedPrice === 0) return 0;
    return Math.abs(actualPrice - expectedPrice) / expectedPrice;
  }

  /**
   * Get volume profile for VWAP calculation (mock implementation)
   */
  async getVolumeProfile(symbol) {
    // Mock volume profile - typically 24 hours divided into periods
    const periods = 24; // Hourly periods
    const profile = [];
    
    for (let i = 0; i < periods; i++) {
      profile.push({
        hour: i,
        volume: 1000 + Math.random() * 2000, // Mock volume
        time: Date.now() + i * 60 * 60 * 1000 // Hour intervals
      });
    }
    
    return profile;
  }

  /**
   * Calculate VWAP slices based on volume profile
   */
  calculateVWAPSlices(totalQuantity, volumeProfile) {
    const totalVolume = volumeProfile.reduce((sum, period) => sum + period.volume, 0);
    const slices = [];
    
    for (const period of volumeProfile) {
      const volumeRatio = period.volume / totalVolume;
      const sliceQuantity = totalQuantity * volumeRatio;
      
      if (sliceQuantity > 0.001) { // Minimum slice size
        slices.push({
          quantity: sliceQuantity,
          time: period.time,
          volumeRatio
        });
      }
    }
    
    return slices;
  }

  /**
   * Calculate order analytics
   */
  calculateOrderAnalytics(order) {
    if (order.executions.length === 0) return;
    
    const totalQuantity = order.executions.reduce((sum, exec) => sum + exec.quantity, 0);
    const totalValue = order.executions.reduce((sum, exec) => sum + exec.quantity * exec.price, 0);
    
    order.analytics.averagePrice = totalValue / totalQuantity;
    order.analytics.executionRate = totalQuantity / order.quantity;
    
    if (order.price) {
      order.analytics.totalSlippage = this.calculateSlippage(order.price, order.analytics.averagePrice);
    }
  }

  /**
   * Update system-wide analytics
   */
  updateSystemAnalytics(order) {
    this.analytics.totalOrders++;
    
    if (order.status === 'FILLED') {
      this.analytics.successfulOrders++;
    }
    
    if (order.analytics.executionTime) {
      const currentAvg = this.analytics.averageExecutionTime;
      const totalSuccessful = this.analytics.successfulOrders;
      
      this.analytics.averageExecutionTime = 
        (currentAvg * (totalSuccessful - 1) + order.analytics.executionTime) / totalSuccessful;
    }
    
    if (order.analytics.totalSlippage) {
      const currentAvg = this.analytics.averageSlippage;
      const totalSuccessful = this.analytics.successfulOrders;
      
      this.analytics.averageSlippage = 
        (currentAvg * (totalSuccessful - 1) + order.analytics.totalSlippage) / totalSuccessful;
    }
    
    // Update order type statistics
    const orderType = order.type.toUpperCase();
    if (!this.analytics.orderTypeStats[orderType]) {
      this.analytics.orderTypeStats[orderType] = { count: 0, successful: 0 };
    }
    
    this.analytics.orderTypeStats[orderType].count++;
    if (order.status === 'FILLED') {
      this.analytics.orderTypeStats[orderType].successful++;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId) {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (['FILLED', 'CANCELLED', 'FAILED'].includes(order.status)) {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }
    
    order.status = 'CANCELLED';
    order.updatedAt = Date.now();
    
    logger.info('Order cancelled', { orderId });
    
    this.emit('orderCancelled', order);
    
    return order;
  }

  /**
   * Get order by ID
   */
  getOrder(orderId) {
    return this.orders.get(orderId);
  }

  /**
   * Get orders by criteria
   */
  getOrders(criteria = {}) {
    const orders = Array.from(this.orders.values());
    
    let filteredOrders = orders;
    
    if (criteria.status) {
      filteredOrders = filteredOrders.filter(order => order.status === criteria.status);
    }
    
    if (criteria.symbol) {
      filteredOrders = filteredOrders.filter(order => order.symbol === criteria.symbol);
    }
    
    if (criteria.type) {
      filteredOrders = filteredOrders.filter(order => order.type.toUpperCase() === criteria.type.toUpperCase());
    }
    
    if (criteria.startDate) {
      filteredOrders = filteredOrders.filter(order => order.createdAt >= criteria.startDate);
    }
    
    if (criteria.endDate) {
      filteredOrders = filteredOrders.filter(order => order.createdAt <= criteria.endDate);
    }
    
    // Sort by creation time (newest first)
    filteredOrders.sort((a, b) => b.createdAt - a.createdAt);
    
    return filteredOrders;
  }

  /**
   * Get system analytics
   */
  getAnalytics() {
    return {
      ...this.analytics,
      successRate: this.analytics.totalOrders > 0 
        ? this.analytics.successfulOrders / this.analytics.totalOrders 
        : 0,
      orderTypeSuccessRates: Object.fromEntries(
        Object.entries(this.analytics.orderTypeStats).map(([type, stats]) => [
          type,
          stats.count > 0 ? stats.successful / stats.count : 0
        ])
      )
    };
  }

  /**
   * Get system status
   */
  getStatus() {
    const activeOrders = this.getOrders({ status: 'PENDING' }).length + 
                        this.getOrders({ status: 'EXECUTING' }).length;
    
    return {
      totalOrders: this.orders.size,
      activeOrders,
      supportedOrderTypes: Object.keys(this.orderTypes),
      analytics: this.getAnalytics()
    };
  }
}

module.exports = new AdvancedOrderManagement();