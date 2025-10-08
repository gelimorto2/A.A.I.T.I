/**
 * Exchange Adapter Contract Interface
 * Standardized interface for all exchange integrations with comprehensive error handling
 */

/**
 * Exchange Adapter Interface
 * All exchange implementations must conform to this contract
 */
class IExchangeAdapter {
  constructor(config) {
    if (this.constructor === IExchangeAdapter) {
      throw new Error('Cannot instantiate abstract class IExchangeAdapter');
    }
    this.config = config;
    this.isConnected = false;
    this.capabilities = new Set();
  }

  // Connection Management
  async connect() {
    throw new Error('connect() must be implemented by exchange adapter');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented by exchange adapter');
  }

  async isHealthy() {
    throw new Error('isHealthy() must be implemented by exchange adapter');
  }

  // Authentication
  async authenticate() {
    throw new Error('authenticate() must be implemented by exchange adapter');
  }

  async validateCredentials() {
    throw new Error('validateCredentials() must be implemented by exchange adapter');
  }

  // Market Data
  async getMarketData(symbol) {
    throw new Error('getMarketData() must be implemented by exchange adapter');
  }

  async getOrderBook(symbol, depth = 20) {
    throw new Error('getOrderBook() must be implemented by exchange adapter');
  }

  async getTrades(symbol, limit = 100) {
    throw new Error('getTrades() must be implemented by exchange adapter');
  }

  async getCandles(symbol, timeframe, limit = 100) {
    throw new Error('getCandles() must be implemented by exchange adapter');
  }

  // Account Information
  async getBalance() {
    throw new Error('getBalance() must be implemented by exchange adapter');
  }

  async getPositions() {
    throw new Error('getPositions() must be implemented by exchange adapter');
  }

  async getAccountInfo() {
    throw new Error('getAccountInfo() must be implemented by exchange adapter');
  }

  // Order Management
  async createOrder(orderParams) {
    throw new Error('createOrder() must be implemented by exchange adapter');
  }

  async cancelOrder(orderId, symbol) {
    throw new Error('cancelOrder() must be implemented by exchange adapter');
  }

  async getOrder(orderId, symbol) {
    throw new Error('getOrder() must be implemented by exchange adapter');
  }

  async getOrders(symbol, status, limit) {
    throw new Error('getOrders() must be implemented by exchange adapter');
  }

  async getOrderHistory(symbol, limit) {
    throw new Error('getOrderHistory() must be implemented by exchange adapter');
  }

  // WebSocket Subscriptions
  async subscribeToMarketData(symbols, callback) {
    throw new Error('subscribeToMarketData() must be implemented by exchange adapter');
  }

  async subscribeToOrderUpdates(callback) {
    throw new Error('subscribeToOrderUpdates() must be implemented by exchange adapter');
  }

  async unsubscribeFromMarketData(symbols) {
    throw new Error('unsubscribeFromMarketData() must be implemented by exchange adapter');
  }

  async unsubscribeFromOrderUpdates() {
    throw new Error('unsubscribeFromOrderUpdates() must be implemented by exchange adapter');
  }

  // Exchange Information
  getExchangeName() {
    throw new Error('getExchangeName() must be implemented by exchange adapter');
  }

  getSupportedSymbols() {
    throw new Error('getSupportedSymbols() must be implemented by exchange adapter');
  }

  getCapabilities() {
    return Array.from(this.capabilities);
  }

  // Rate Limiting
  getRateLimits() {
    throw new Error('getRateLimits() must be implemented by exchange adapter');
  }

  // Error Recovery
  async handleError(error, context) {
    throw new Error('handleError() must be implemented by exchange adapter');
  }

  async retry(operation, maxAttempts = 3) {
    throw new Error('retry() must be implemented by exchange adapter');
  }
}

/**
 * Exchange Order Types
 */
const OrderType = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP: 'stop',
  STOP_LIMIT: 'stop_limit',
  TRAILING_STOP: 'trailing_stop',
  OCO: 'oco' // One-Cancels-Other
};

/**
 * Exchange Order Sides
 */
const OrderSide = {
  BUY: 'buy',
  SELL: 'sell'
};

/**
 * Exchange Order Status
 */
const OrderStatus = {
  PENDING: 'pending',
  OPEN: 'open',
  PARTIALLY_FILLED: 'partially_filled',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

/**
 * Exchange Capabilities
 */
const ExchangeCapability = {
  SPOT_TRADING: 'spot_trading',
  MARGIN_TRADING: 'margin_trading',
  FUTURES_TRADING: 'futures_trading',
  OPTIONS_TRADING: 'options_trading',
  WEBSOCKET_MARKET_DATA: 'websocket_market_data',
  WEBSOCKET_ACCOUNT_DATA: 'websocket_account_data',
  ORDER_BOOK_STREAMING: 'order_book_streaming',
  REAL_TIME_TRADES: 'real_time_trades',
  HISTORICAL_DATA: 'historical_data',
  PAPER_TRADING: 'paper_trading',
  ADVANCED_ORDERS: 'advanced_orders',
  STOP_ORDERS: 'stop_orders',
  TRAILING_STOPS: 'trailing_stops',
  OCO_ORDERS: 'oco_orders'
};

/**
 * Standardized Exchange Error Types
 */
class ExchangeError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'ExchangeError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class ConnectionError extends ExchangeError {
  constructor(message, context = {}) {
    super(message, 'CONNECTION_ERROR', context);
    this.name = 'ConnectionError';
  }
}

class AuthenticationError extends ExchangeError {
  constructor(message, context = {}) {
    super(message, 'AUTHENTICATION_ERROR', context);
    this.name = 'AuthenticationError';
  }
}

class RateLimitError extends ExchangeError {
  constructor(message, retryAfter, context = {}) {
    super(message, 'RATE_LIMIT_ERROR', context);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

class OrderError extends ExchangeError {
  constructor(message, orderId, context = {}) {
    super(message, 'ORDER_ERROR', context);
    this.name = 'OrderError';
    this.orderId = orderId;
  }
}

class InsufficientFundsError extends ExchangeError {
  constructor(message, requiredAmount, availableAmount, context = {}) {
    super(message, 'INSUFFICIENT_FUNDS', context);
    this.name = 'InsufficientFundsError';
    this.requiredAmount = requiredAmount;
    this.availableAmount = availableAmount;
  }
}

class MarketClosedError extends ExchangeError {
  constructor(message, symbol, context = {}) {
    super(message, 'MARKET_CLOSED', context);
    this.name = 'MarketClosedError';
    this.symbol = symbol;
  }
}

class InvalidSymbolError extends ExchangeError {
  constructor(message, symbol, context = {}) {
    super(message, 'INVALID_SYMBOL', context);
    this.name = 'InvalidSymbolError';
    this.symbol = symbol;
  }
}

/**
 * Exchange Order Specification
 */
class OrderSpec {
  constructor(params) {
    this.validateOrderParams(params);
    
    this.symbol = params.symbol;
    this.side = params.side;
    this.type = params.type;
    this.quantity = params.quantity;
    this.price = params.price;
    this.stopPrice = params.stopPrice;
    this.timeInForce = params.timeInForce || 'GTC';
    this.clientOrderId = params.clientOrderId;
    this.metadata = params.metadata || {};
    
    // Validation flags
    this.isValid = true;
    this.validationErrors = [];
  }

  validateOrderParams(params) {
    const errors = [];

    if (!params.symbol) errors.push('Symbol is required');
    if (!params.side) errors.push('Side is required');
    if (!params.type) errors.push('Type is required');
    if (!params.quantity || params.quantity <= 0) errors.push('Quantity must be positive');
    
    if (params.type === OrderType.LIMIT && !params.price) {
      errors.push('Price is required for limit orders');
    }
    
    if (params.type === OrderType.STOP && !params.stopPrice) {
      errors.push('Stop price is required for stop orders');
    }
    
    if (!Object.values(OrderSide).includes(params.side)) {
      errors.push('Invalid order side');
    }
    
    if (!Object.values(OrderType).includes(params.type)) {
      errors.push('Invalid order type');
    }

    if (errors.length > 0) {
      throw new Error(`Order validation failed: ${errors.join(', ')}`);
    }
  }

  toJSON() {
    return {
      symbol: this.symbol,
      side: this.side,
      type: this.type,
      quantity: this.quantity,
      price: this.price,
      stopPrice: this.stopPrice,
      timeInForce: this.timeInForce,
      clientOrderId: this.clientOrderId,
      metadata: this.metadata
    };
  }
}

/**
 * Exchange Response Wrapper
 */
class ExchangeResponse {
  constructor(data, metadata = {}) {
    this.success = true;
    this.data = data;
    this.metadata = {
      timestamp: new Date().toISOString(),
      exchange: metadata.exchange || 'unknown',
      requestId: metadata.requestId || this.generateRequestId(),
      latency: metadata.latency || 0,
      rateLimitRemaining: metadata.rateLimitRemaining,
      ...metadata
    };
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static error(error, metadata = {}) {
    const response = new ExchangeResponse(null, metadata);
    response.success = false;
    response.error = {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      name: error.name || 'Error',
      context: error.context || {},
      stack: error.stack
    };
    return response;
  }
}

/**
 * Exchange Contract Validator
 * Validates that an exchange adapter implements the required interface
 */
class ExchangeContractValidator {
  constructor(adapter) {
    this.adapter = adapter;
    this.results = {
      passed: [],
      failed: [],
      score: 0
    };
  }

  async validate() {
    const requiredMethods = [
      'connect', 'disconnect', 'isHealthy', 'authenticate', 'validateCredentials',
      'getMarketData', 'getOrderBook', 'getTrades', 'getCandles',
      'getBalance', 'getPositions', 'getAccountInfo',
      'createOrder', 'cancelOrder', 'getOrder', 'getOrders', 'getOrderHistory',
      'subscribeToMarketData', 'subscribeToOrderUpdates',
      'unsubscribeFromMarketData', 'unsubscribeFromOrderUpdates',
      'getExchangeName', 'getSupportedSymbols', 'getCapabilities',
      'getRateLimits', 'handleError', 'retry'
    ];

    for (const method of requiredMethods) {
      try {
        if (typeof this.adapter[method] !== 'function') {
          this.results.failed.push({
            test: `Method ${method} exists`,
            error: `Method ${method} is not implemented`
          });
        } else {
          this.results.passed.push(`Method ${method} exists`);
        }
      } catch (error) {
        this.results.failed.push({
          test: `Method ${method} validation`,
          error: error.message
        });
      }
    }

    // Test basic properties
    try {
      if (this.adapter.config === undefined) {
        this.results.failed.push({
          test: 'Config property exists',
          error: 'Config property is undefined'
        });
      } else {
        this.results.passed.push('Config property exists');
      }

      if (typeof this.adapter.isConnected !== 'boolean') {
        this.results.failed.push({
          test: 'isConnected property is boolean',
          error: 'isConnected property is not boolean'
        });
      } else {
        this.results.passed.push('isConnected property is boolean');
      }

      if (!(this.adapter.capabilities instanceof Set)) {
        this.results.failed.push({
          test: 'capabilities property is Set',
          error: 'capabilities property is not a Set'
        });
      } else {
        this.results.passed.push('capabilities property is Set');
      }
    } catch (error) {
      this.results.failed.push({
        test: 'Property validation',
        error: error.message
      });
    }

    this.results.score = this.results.passed.length / 
      (this.results.passed.length + this.results.failed.length) * 100;

    return this.results;
  }

  generateReport() {
    const report = {
      adapter: this.adapter.constructor.name,
      timestamp: new Date().toISOString(),
      score: this.results.score,
      status: this.results.score >= 90 ? 'PASS' : 'FAIL',
      summary: {
        totalTests: this.results.passed.length + this.results.failed.length,
        passed: this.results.passed.length,
        failed: this.results.failed.length
      },
      details: {
        passed: this.results.passed,
        failed: this.results.failed
      }
    };

    return report;
  }
}

module.exports = {
  IExchangeAdapter,
  OrderType,
  OrderSide,
  OrderStatus,
  ExchangeCapability,
  ExchangeError,
  ConnectionError,
  AuthenticationError,
  RateLimitError,
  OrderError,
  InsufficientFundsError,
  MarketClosedError,
  InvalidSymbolError,
  OrderSpec,
  ExchangeResponse,
  ExchangeContractValidator
};