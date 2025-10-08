const { 
  IExchangeAdapter, 
  OrderType, 
  OrderSide, 
  OrderStatus, 
  ExchangeCapability, 
  ExchangeResponse,
  ConnectionError,
  AuthenticationError,
  RateLimitError,
  OrderError,
  InsufficientFundsError,
  InvalidSymbolError,
  OrderSpec
} = require('../interfaces/IExchangeAdapter');
const logger = require('../utils/logger');

/**
 * Mock Exchange Adapter for Testing
 * Simulates real exchange behavior for contract testing and development
 */
class MockExchangeAdapter extends IExchangeAdapter {
  constructor(config = {}) {
    super(config);
    
    this.exchangeName = 'Mock Exchange';
    this.isConnected = false;
    this.isAuthenticated = false;
    
    // Set capabilities
    this.capabilities = new Set([
      ExchangeCapability.SPOT_TRADING,
      ExchangeCapability.WEBSOCKET_MARKET_DATA,
      ExchangeCapability.WEBSOCKET_ACCOUNT_DATA,
      ExchangeCapability.ORDER_BOOK_STREAMING,
      ExchangeCapability.REAL_TIME_TRADES,
      ExchangeCapability.HISTORICAL_DATA,
      ExchangeCapability.PAPER_TRADING,
      ExchangeCapability.ADVANCED_ORDERS,
      ExchangeCapability.STOP_ORDERS
    ]);

    // Mock state
    this.mockState = {
      balance: {
        USD: { free: 10000, used: 0, total: 10000 },
        BTC: { free: 1, used: 0, total: 1 },
        ETH: { free: 10, used: 0, total: 10 }
      },
      positions: new Map(),
      orders: new Map(),
      orderHistory: [],
      marketData: new Map(),
      supportedSymbols: ['BTC/USD', 'ETH/USD', 'ETH/BTC', 'LTC/USD'],
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
        remaining: 600
      },
      latency: {
        min: 10,
        max: 100,
        current: 50
      },
      subscriptions: {
        marketData: new Set(),
        orderUpdates: false
      }
    };

    // Initialize mock market data
    this.initializeMockMarketData();
    
    // Set up periodic market data updates
    this.marketDataInterval = null;
    
    // Order execution simulation
    this.orderExecutionDelay = config.orderExecutionDelay || 100; // ms
    this.slippageRange = config.slippageRange || [0.001, 0.005]; // 0.1% to 0.5%
    
    // Failure simulation options
    this.failureRates = {
      connection: config.connectionFailureRate || 0,
      authentication: config.authFailureRate || 0,
      orderPlacement: config.orderFailureRate || 0,
      rateLimitHit: config.rateLimitFailureRate || 0
    };
  }

  initializeMockMarketData() {
    const symbols = this.mockState.supportedSymbols;
    const basePrice = 50000; // Base price for BTC
    
    symbols.forEach(symbol => {
      let price = basePrice;
      if (symbol.includes('ETH')) price = 3000;
      if (symbol.includes('LTC')) price = 150;
      
      this.mockState.marketData.set(symbol, {
        symbol,
        price: price + (Math.random() - 0.5) * price * 0.05, // ±5% variation
        bid: price * 0.999,
        ask: price * 1.001,
        volume: Math.random() * 1000000,
        change24h: (Math.random() - 0.5) * 0.1, // ±10%
        timestamp: Date.now(),
        orderBook: {
          bids: this.generateOrderBookSide(price * 0.999, 'desc', 20),
          asks: this.generateOrderBookSide(price * 1.001, 'asc', 20)
        },
        trades: this.generateRecentTrades(symbol, price, 100)
      });
    });
  }

  generateOrderBookSide(basePrice, direction, depth) {
    const orders = [];
    const increment = basePrice * 0.001; // 0.1% price steps
    
    for (let i = 0; i < depth; i++) {
      const price = direction === 'desc' ? 
        basePrice - (increment * i) : 
        basePrice + (increment * i);
      const quantity = Math.random() * 10 + 0.1;
      
      orders.push([price, quantity]);
    }
    
    return orders;
  }

  generateRecentTrades(symbol, basePrice, count) {
    const trades = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      trades.push({
        id: `trade_${now}_${i}`,
        symbol,
        price: basePrice + (Math.random() - 0.5) * basePrice * 0.02,
        quantity: Math.random() * 5 + 0.01,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        timestamp: now - (i * 1000) // 1 second intervals
      });
    }
    
    return trades.reverse(); // Most recent first
  }

  // Connection Management
  async connect() {
    await this.simulateLatency();
    
    if (this.shouldSimulateFailure('connection')) {
      throw new ConnectionError('Mock connection failure', { exchange: this.exchangeName });
    }
    
    this.isConnected = true;
    this.startMarketDataUpdates();
    
    logger.info('Mock exchange connected', { exchange: this.exchangeName });
    return new ExchangeResponse({ connected: true }, { exchange: this.exchangeName });
  }

  async disconnect() {
    await this.simulateLatency();
    
    this.isConnected = false;
    this.isAuthenticated = false;
    this.stopMarketDataUpdates();
    
    logger.info('Mock exchange disconnected', { exchange: this.exchangeName });
    return new ExchangeResponse({ disconnected: true }, { exchange: this.exchangeName });
  }

  async isHealthy() {
    await this.simulateLatency();
    
    const health = {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      latency: this.mockState.latency.current,
      rateLimitRemaining: this.mockState.rateLimits.remaining,
      timestamp: Date.now()
    };
    
    return new ExchangeResponse(health, { exchange: this.exchangeName });
  }

  // Authentication
  async authenticate() {
    if (!this.isConnected) {
      throw new ConnectionError('Not connected to exchange', { exchange: this.exchangeName });
    }
    
    await this.simulateLatency();
    
    if (this.shouldSimulateFailure('authentication')) {
      throw new AuthenticationError('Mock authentication failure', { exchange: this.exchangeName });
    }
    
    this.isAuthenticated = true;
    
    logger.info('Mock exchange authenticated');
    return new ExchangeResponse({ authenticated: true }, { exchange: this.exchangeName });
  }

  async validateCredentials() {
    await this.simulateLatency();
    
    const isValid = this.config.apiKey && this.config.secretKey;
    return new ExchangeResponse({ valid: isValid }, { exchange: this.exchangeName });
  }

  // Market Data
  async getMarketData(symbol) {
    await this.simulateLatency();
    this.consumeRateLimit();
    
    if (!this.mockState.supportedSymbols.includes(symbol)) {
      throw new InvalidSymbolError(`Symbol ${symbol} not supported`, symbol);
    }
    
    const data = this.mockState.marketData.get(symbol);
    if (!data) {
      throw new Error(`No market data available for ${symbol}`);
    }
    
    return new ExchangeResponse(data, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  async getOrderBook(symbol, depth = 20) {
    await this.simulateLatency();
    this.consumeRateLimit();
    
    if (!this.mockState.supportedSymbols.includes(symbol)) {
      throw new InvalidSymbolError(`Symbol ${symbol} not supported`, symbol);
    }
    
    const marketData = this.mockState.marketData.get(symbol);
    const orderBook = {
      symbol,
      bids: marketData.orderBook.bids.slice(0, depth),
      asks: marketData.orderBook.asks.slice(0, depth),
      timestamp: Date.now()
    };
    
    return new ExchangeResponse(orderBook, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  async getTrades(symbol, limit = 100) {
    await this.simulateLatency();
    this.consumeRateLimit();
    
    if (!this.mockState.supportedSymbols.includes(symbol)) {
      throw new InvalidSymbolError(`Symbol ${symbol} not supported`, symbol);
    }
    
    const marketData = this.mockState.marketData.get(symbol);
    const trades = marketData.trades.slice(0, limit);
    
    return new ExchangeResponse(trades, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  async getCandles(symbol, timeframe, limit = 100) {
    await this.simulateLatency();
    this.consumeRateLimit();
    
    if (!this.mockState.supportedSymbols.includes(symbol)) {
      throw new InvalidSymbolError(`Symbol ${symbol} not supported`, symbol);
    }
    
    const marketData = this.mockState.marketData.get(symbol);
    const basePrice = marketData.price;
    const candles = [];
    const now = Date.now();
    const timeframeMs = this.parseTimeframe(timeframe);
    
    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * timeframeMs);
      const variation = (Math.random() - 0.5) * 0.05; // ±5%
      const open = basePrice * (1 + variation);
      const close = open * (1 + (Math.random() - 0.5) * 0.02); // ±2% from open
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 1000;
      
      candles.push([timestamp, open, high, low, close, volume]);
    }
    
    return new ExchangeResponse(candles, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  // Account Information
  async getBalance() {
    if (!this.isAuthenticated) {
      throw new AuthenticationError('Not authenticated');
    }
    
    await this.simulateLatency();
    this.consumeRateLimit();
    
    return new ExchangeResponse(this.mockState.balance, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  async getPositions() {
    if (!this.isAuthenticated) {
      throw new AuthenticationError('Not authenticated');
    }
    
    await this.simulateLatency();
    this.consumeRateLimit();
    
    const positions = Array.from(this.mockState.positions.values());
    return new ExchangeResponse(positions, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  async getAccountInfo() {
    if (!this.isAuthenticated) {
      throw new AuthenticationError('Not authenticated');
    }
    
    await this.simulateLatency();
    this.consumeRateLimit();
    
    const accountInfo = {
      accountId: 'mock_account_123',
      accountType: 'spot',
      balance: this.mockState.balance,
      positions: Array.from(this.mockState.positions.values()),
      tradingEnabled: true,
      withdrawalEnabled: true,
      permissions: ['spot', 'margin'],
      timestamp: Date.now()
    };
    
    return new ExchangeResponse(accountInfo, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  // Order Management
  async createOrder(orderParams) {
    if (!this.isAuthenticated) {
      throw new AuthenticationError('Not authenticated');
    }
    
    await this.simulateLatency();
    this.consumeRateLimit();
    
    if (this.shouldSimulateFailure('orderPlacement')) {
      throw new OrderError('Mock order placement failure', null);
    }
    
    // Validate order parameters
    const orderSpec = new OrderSpec(orderParams);
    
    // Check symbol support
    if (!this.mockState.supportedSymbols.includes(orderParams.symbol)) {
      throw new InvalidSymbolError(`Symbol ${orderParams.symbol} not supported`, orderParams.symbol);
    }
    
    // Check balance for buy orders
    if (orderParams.side === OrderSide.BUY) {
      const [base, quote] = orderParams.symbol.split('/');
      const requiredAmount = orderParams.quantity * (orderParams.price || this.mockState.marketData.get(orderParams.symbol).price);
      const available = this.mockState.balance[quote]?.free || 0;
      
      if (requiredAmount > available) {
        throw new InsufficientFundsError(
          `Insufficient ${quote} balance`, 
          requiredAmount, 
          available
        );
      }
    }
    
    // Create order
    const orderId = this.generateOrderId();
    const order = {
      id: orderId,
      clientOrderId: orderParams.clientOrderId || orderId,
      symbol: orderParams.symbol,
      side: orderParams.side,
      type: orderParams.type,
      quantity: orderParams.quantity,
      price: orderParams.price,
      stopPrice: orderParams.stopPrice,
      timeInForce: orderParams.timeInForce || 'GTC',
      status: OrderStatus.PENDING,
      filledQuantity: 0,
      remainingQuantity: orderParams.quantity,
      averageFillPrice: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: orderParams.metadata || {}
    };
    
    this.mockState.orders.set(orderId, order);
    
    // Simulate order execution for market orders
    if (orderParams.type === OrderType.MARKET) {
      setTimeout(() => this.simulateOrderExecution(orderId), this.orderExecutionDelay);
    } else if (orderParams.type === OrderType.LIMIT) {
      // Simulate partial execution for limit orders
      setTimeout(() => this.simulatePartialOrderExecution(orderId), this.orderExecutionDelay * 2);
    }
    
    logger.info('Mock order created', { orderId, symbol: order.symbol, side: order.side });
    
    return new ExchangeResponse(order, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  async cancelOrder(orderId, symbol) {
    if (!this.isAuthenticated) {
      throw new AuthenticationError('Not authenticated');
    }
    
    await this.simulateLatency();
    this.consumeRateLimit();
    
    const order = this.mockState.orders.get(orderId);
    if (!order) {
      throw new OrderError(`Order ${orderId} not found`, orderId);
    }
    
    if (order.status === OrderStatus.FILLED) {
      throw new OrderError(`Order ${orderId} already filled`, orderId);
    }
    
    if (order.status === OrderStatus.CANCELLED) {
      throw new OrderError(`Order ${orderId} already cancelled`, orderId);
    }
    
    order.status = OrderStatus.CANCELLED;
    order.updatedAt = Date.now();
    
    logger.info('Mock order cancelled', { orderId });
    
    return new ExchangeResponse(order, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  async getOrder(orderId, symbol) {
    if (!this.isAuthenticated) {
      throw new AuthenticationError('Not authenticated');
    }
    
    await this.simulateLatency();
    this.consumeRateLimit();
    
    const order = this.mockState.orders.get(orderId);
    if (!order) {
      throw new OrderError(`Order ${orderId} not found`, orderId);
    }
    
    return new ExchangeResponse(order, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  async getOrders(symbol, status, limit = 100) {
    if (!this.isAuthenticated) {
      throw new AuthenticationError('Not authenticated');
    }
    
    await this.simulateLatency();
    this.consumeRateLimit();
    
    let orders = Array.from(this.mockState.orders.values());
    
    if (symbol) {
      orders = orders.filter(order => order.symbol === symbol);
    }
    
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    
    orders = orders.slice(0, limit);
    
    return new ExchangeResponse(orders, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  async getOrderHistory(symbol, limit = 100) {
    if (!this.isAuthenticated) {
      throw new AuthenticationError('Not authenticated');
    }
    
    await this.simulateLatency();
    this.consumeRateLimit();
    
    let history = [...this.mockState.orderHistory];
    
    if (symbol) {
      history = history.filter(order => order.symbol === symbol);
    }
    
    history = history.slice(0, limit);
    
    return new ExchangeResponse(history, { 
      exchange: this.exchangeName,
      rateLimitRemaining: this.mockState.rateLimits.remaining
    });
  }

  // WebSocket Subscriptions (simulated)
  async subscribeToMarketData(symbols, callback) {
    await this.simulateLatency();
    
    if (!Array.isArray(symbols)) {
      symbols = [symbols];
    }
    
    symbols.forEach(symbol => {
      this.mockState.subscriptions.marketData.add(symbol);
    });
    
    // Store callback for market data updates
    this.marketDataCallback = callback;
    
    logger.info('Subscribed to market data', { symbols });
    
    return new ExchangeResponse({ subscribed: symbols }, { 
      exchange: this.exchangeName 
    });
  }

  async subscribeToOrderUpdates(callback) {
    await this.simulateLatency();
    
    this.mockState.subscriptions.orderUpdates = true;
    this.orderUpdateCallback = callback;
    
    logger.info('Subscribed to order updates');
    
    return new ExchangeResponse({ subscribed: 'order_updates' }, { 
      exchange: this.exchangeName 
    });
  }

  async unsubscribeFromMarketData(symbols) {
    await this.simulateLatency();
    
    if (!Array.isArray(symbols)) {
      symbols = [symbols];
    }
    
    symbols.forEach(symbol => {
      this.mockState.subscriptions.marketData.delete(symbol);
    });
    
    logger.info('Unsubscribed from market data', { symbols });
    
    return new ExchangeResponse({ unsubscribed: symbols }, { 
      exchange: this.exchangeName 
    });
  }

  async unsubscribeFromOrderUpdates() {
    await this.simulateLatency();
    
    this.mockState.subscriptions.orderUpdates = false;
    this.orderUpdateCallback = null;
    
    logger.info('Unsubscribed from order updates');
    
    return new ExchangeResponse({ unsubscribed: 'order_updates' }, { 
      exchange: this.exchangeName 
    });
  }

  // Exchange Information
  getExchangeName() {
    return this.exchangeName;
  }

  getSupportedSymbols() {
    return [...this.mockState.supportedSymbols];
  }

  getRateLimits() {
    return { ...this.mockState.rateLimits };
  }

  // Error Recovery
  async handleError(error, context) {
    logger.error('Mock exchange error', { error: error.message, context });
    
    // Simulate recovery logic
    if (error instanceof ConnectionError) {
      this.isConnected = false;
      this.isAuthenticated = false;
    } else if (error instanceof AuthenticationError) {
      this.isAuthenticated = false;
    }
    
    return new ExchangeResponse({ handled: true, error: error.message }, { 
      exchange: this.exchangeName 
    });
  }

  async retry(operation, maxAttempts = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.debug(`Mock exchange retry attempt ${attempt}/${maxAttempts}`);
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          await this.simulateLatency(attempt * 1000); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  // Helper Methods
  async simulateLatency(customDelay = null) {
    const delay = customDelay || (
      this.mockState.latency.min + 
      Math.random() * (this.mockState.latency.max - this.mockState.latency.min)
    );
    
    this.mockState.latency.current = delay;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  shouldSimulateFailure(type) {
    return Math.random() < (this.failureRates[type] || 0);
  }

  consumeRateLimit() {
    this.mockState.rateLimits.remaining = Math.max(0, this.mockState.rateLimits.remaining - 1);
    
    if (this.mockState.rateLimits.remaining === 0 && this.shouldSimulateFailure('rateLimitHit')) {
      throw new RateLimitError('Rate limit exceeded', 60); // 60 seconds retry after
    }
  }

  generateOrderId() {
    return `mock_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  parseTimeframe(timeframe) {
    const timeframes = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    
    return timeframes[timeframe] || timeframes['1h'];
  }

  simulateOrderExecution(orderId) {
    const order = this.mockState.orders.get(orderId);
    if (!order || order.status !== OrderStatus.PENDING) {
      return;
    }
    
    const marketData = this.mockState.marketData.get(order.symbol);
    const slippage = this.slippageRange[0] + Math.random() * (this.slippageRange[1] - this.slippageRange[0]);
    
    let fillPrice = marketData.price;
    if (order.side === OrderSide.BUY) {
      fillPrice *= (1 + slippage);
    } else {
      fillPrice *= (1 - slippage);
    }
    
    order.status = OrderStatus.FILLED;
    order.filledQuantity = order.quantity;
    order.remainingQuantity = 0;
    order.averageFillPrice = fillPrice;
    order.updatedAt = Date.now();
    
    // Update balance
    this.updateBalanceAfterFill(order);
    
    // Add to history
    this.mockState.orderHistory.push({ ...order });
    
    // Notify via callback if subscribed
    if (this.orderUpdateCallback) {
      this.orderUpdateCallback({
        type: 'order_update',
        data: order
      });
    }
    
    logger.info('Mock order executed', { 
      orderId, 
      fillPrice, 
      quantity: order.filledQuantity 
    });
  }

  simulatePartialOrderExecution(orderId) {
    const order = this.mockState.orders.get(orderId);
    if (!order || order.status !== OrderStatus.PENDING) {
      return;
    }
    
    // Simulate partial fill (30-70% of original quantity)
    const fillRatio = 0.3 + Math.random() * 0.4;
    const fillQuantity = order.quantity * fillRatio;
    
    order.status = OrderStatus.PARTIALLY_FILLED;
    order.filledQuantity = fillQuantity;
    order.remainingQuantity = order.quantity - fillQuantity;
    order.averageFillPrice = order.price;
    order.updatedAt = Date.now();
    
    // Update balance
    this.updateBalanceAfterFill({ ...order, quantity: fillQuantity });
    
    // Notify via callback if subscribed
    if (this.orderUpdateCallback) {
      this.orderUpdateCallback({
        type: 'order_update',
        data: order
      });
    }
    
    logger.info('Mock order partially executed', { 
      orderId, 
      fillQuantity, 
      remaining: order.remainingQuantity 
    });
  }

  updateBalanceAfterFill(order) {
    const [base, quote] = order.symbol.split('/');
    
    if (order.side === OrderSide.BUY) {
      // Deduct quote currency, add base currency
      const cost = order.filledQuantity * order.averageFillPrice;
      if (this.mockState.balance[quote]) {
        this.mockState.balance[quote].free -= cost;
        this.mockState.balance[quote].used += cost;
      }
      if (!this.mockState.balance[base]) {
        this.mockState.balance[base] = { free: 0, used: 0, total: 0 };
      }
      this.mockState.balance[base].free += order.filledQuantity;
      this.mockState.balance[base].total += order.filledQuantity;
    } else {
      // Deduct base currency, add quote currency
      const proceeds = order.filledQuantity * order.averageFillPrice;
      if (this.mockState.balance[base]) {
        this.mockState.balance[base].free -= order.filledQuantity;
        this.mockState.balance[base].used += order.filledQuantity;
      }
      if (!this.mockState.balance[quote]) {
        this.mockState.balance[quote] = { free: 0, used: 0, total: 0 };
      }
      this.mockState.balance[quote].free += proceeds;
      this.mockState.balance[quote].total += proceeds;
    }
  }

  startMarketDataUpdates() {
    if (this.marketDataInterval) {
      clearInterval(this.marketDataInterval);
    }
    
    this.marketDataInterval = setInterval(() => {
      this.updateMarketData();
    }, 1000); // Update every second
  }

  stopMarketDataUpdates() {
    if (this.marketDataInterval) {
      clearInterval(this.marketDataInterval);
      this.marketDataInterval = null;
    }
  }

  updateMarketData() {
    for (const [symbol, data] of this.mockState.marketData) {
      // Simulate price movement
      const change = (Math.random() - 0.5) * 0.01; // ±1%
      data.price *= (1 + change);
      data.bid = data.price * 0.999;
      data.ask = data.price * 1.001;
      data.timestamp = Date.now();
      
      // Update order book
      data.orderBook.bids = this.generateOrderBookSide(data.bid, 'desc', 20);
      data.orderBook.asks = this.generateOrderBookSide(data.ask, 'asc', 20);
      
      // Add new trade
      data.trades.unshift({
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        price: data.price,
        quantity: Math.random() * 5 + 0.01,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        timestamp: Date.now()
      });
      
      // Keep only recent trades
      if (data.trades.length > 100) {
        data.trades = data.trades.slice(0, 100);
      }
      
      // Notify subscribers
      if (this.mockState.subscriptions.marketData.has(symbol) && this.marketDataCallback) {
        this.marketDataCallback({
          type: 'market_data_update',
          data: {
            symbol,
            price: data.price,
            bid: data.bid,
            ask: data.ask,
            timestamp: data.timestamp
          }
        });
      }
    }
  }
}

module.exports = MockExchangeAdapter;