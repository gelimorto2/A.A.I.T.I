/**
 * Crypto.com Exchange Adapter
 * 
 * Implements the IExchangeAdapter interface for Crypto.com Exchange
 * Provides comprehensive trading functionality with REST API and WebSocket support
 * 
 * Features:
 * - REST API v2 integration
 * - WebSocket real-time data streaming
 * - Spot trading support
 * - Advanced order management
 * - Portfolio tracking
 * 
 * API Documentation: https://exchange-docs.crypto.com/
 * 
 * @implements {IExchangeAdapter}
 */

const crypto = require('crypto');
const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');

class CryptoComExchangeAdapter extends EventEmitter {
  constructor(apiKey, apiSecret, options = {}) {
    super();
    
    this.exchangeId = 'crypto_com';
    this.exchangeName = 'Crypto.com Exchange';
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    
    // Configuration
    this.config = {
      restBaseURL: options.sandbox 
        ? 'https://uat-api.3ona.co/v2' 
        : 'https://api.crypto.com/v2',
      wsBaseURL: options.sandbox
        ? 'wss://uat-stream.3ona.co/v2/market'
        : 'wss://stream.crypto.com/v2/market',
      wsUserURL: options.sandbox
        ? 'wss://uat-stream.3ona.co/v2/user'
        : 'wss://stream.crypto.com/v2/user',
      timeout: options.timeout || 10000,
      sandbox: options.sandbox || false,
      testMode: options.testMode || false
    };
    
    // State management
    this.connected = false;
    this.authenticated = false;
    this.requestId = 0;
    
    // Rate limiting (100 requests per second)
    this.rateLimiter = {
      requests: [],
      limit: 100,
      window: 1000 // 1 second
    };
    
    // WebSocket connections
    this.marketDataWS = null;
    this.userDataWS = null;
    this.wsHeartbeatInterval = null;
    
    // Cache
    this.instrumentsCache = new Map();
    this.tickerCache = new Map();
    this.orderBookCache = new Map();
    
    // Supported features
    this.features = {
      spot: true,
      margin: true,
      futures: false,
      options: false,
      lending: false,
      staking: true
    };
    
    // Order types
    this.supportedOrderTypes = [
      'LIMIT',
      'MARKET',
      'STOP_LOSS',
      'STOP_LIMIT',
      'TAKE_PROFIT',
      'TAKE_PROFIT_LIMIT'
    ];
  }

  /**
   * Initialize connection to Crypto.com Exchange
   */
  async initialize() {
    try {
      // Test API connectivity
      await this.testConnection();
      
      // Load instruments (markets)
      await this.loadInstruments();
      
      this.connected = true;
      this.emit('connected', { exchange: this.exchangeName });
      
      return {
        success: true,
        exchange: this.exchangeName,
        instruments: this.instruments.length,
        features: this.features
      };
    } catch (error) {
      this.emit('error', { type: 'initialization', error: error.message });
      throw new Error(`Crypto.com Exchange initialization failed: ${error.message}`);
    }
  }

  /**
   * Test connection to API
   */
  async testConnection() {
    try {
      const response = await this.publicRequest('public/get-instruments');
      return response.code === 0;
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Load available instruments (markets)
   */
  async loadInstruments() {
    try {
      const response = await this.publicRequest('public/get-instruments');
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to load instruments');
      }
      
      this.instruments = response.result.instruments.map(instrument => 
        this.parseInstrument(instrument)
      );
      
      // Cache instruments
      this.instruments.forEach(instrument => {
        this.instrumentsCache.set(instrument.symbol, instrument);
      });
      
      return this.instruments;
    } catch (error) {
      throw new Error(`Failed to load instruments: ${error.message}`);
    }
  }

  /**
   * Parse instrument data into standardized format
   */
  parseInstrument(instrument) {
    const [base, quote] = instrument.instrument_name.split('_');
    
    return {
      id: instrument.instrument_name,
      symbol: `${base}/${quote}`,
      base: base,
      quote: quote,
      active: instrument.instrument_name !== 'DISABLED',
      type: 'spot',
      spot: true,
      margin: instrument.margin_trading_enabled || false,
      precision: {
        amount: instrument.quantity_decimals || 8,
        price: instrument.price_decimals || 8
      },
      limits: {
        amount: {
          min: parseFloat(instrument.min_quantity) || 0.00001,
          max: parseFloat(instrument.max_quantity) || undefined
        },
        price: {
          min: parseFloat(instrument.min_price) || 0.00000001,
          max: parseFloat(instrument.max_price) || undefined
        },
        cost: {
          min: undefined,
          max: undefined
        }
      },
      info: instrument
    };
  }

  /**
   * Get current ticker data
   */
  async getTicker(symbol) {
    try {
      const instrument = this.convertSymbol(symbol);
      const response = await this.publicRequest('public/get-ticker', {
        instrument_name: instrument
      });
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to get ticker');
      }
      
      return this.parseTicker(response.result.data[0], symbol);
    } catch (error) {
      throw new Error(`Failed to get ticker: ${error.message}`);
    }
  }

  /**
   * Parse ticker data into standardized format
   */
  parseTicker(ticker, symbol) {
    const timestamp = parseInt(ticker.t);
    
    return {
      symbol: symbol,
      timestamp: timestamp,
      datetime: new Date(timestamp).toISOString(),
      high: parseFloat(ticker.h),
      low: parseFloat(ticker.l),
      bid: parseFloat(ticker.b),
      ask: parseFloat(ticker.k),
      last: parseFloat(ticker.a),
      close: parseFloat(ticker.a),
      bidVolume: parseFloat(ticker.bs || 0),
      askVolume: parseFloat(ticker.ks || 0),
      volume: parseFloat(ticker.v),
      change: parseFloat(ticker.c),
      percentage: parseFloat(ticker.c) * 100,
      info: ticker
    };
  }

  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol, depth = 50) {
    try {
      const instrument = this.convertSymbol(symbol);
      const response = await this.publicRequest('public/get-book', {
        instrument_name: instrument,
        depth: depth
      });
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to get order book');
      }
      
      return this.parseOrderBook(response.result.data[0], symbol);
    } catch (error) {
      throw new Error(`Failed to get order book: ${error.message}`);
    }
  }

  /**
   * Parse order book into standardized format
   */
  parseOrderBook(orderBook, symbol) {
    return {
      symbol: symbol,
      timestamp: parseInt(orderBook.t),
      datetime: new Date(parseInt(orderBook.t)).toISOString(),
      bids: orderBook.bids.map(bid => [parseFloat(bid[0]), parseFloat(bid[1]), parseFloat(bid[2])]),
      asks: orderBook.asks.map(ask => [parseFloat(ask[0]), parseFloat(ask[1]), parseFloat(ask[2])]),
      nonce: undefined
    };
  }

  /**
   * Get recent trades
   */
  async getTrades(symbol, limit = 100) {
    try {
      const instrument = this.convertSymbol(symbol);
      const response = await this.publicRequest('public/get-trades', {
        instrument_name: instrument,
        count: limit
      });
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to get trades');
      }
      
      return response.result.data.map(trade => this.parseTrade(trade, symbol));
    } catch (error) {
      throw new Error(`Failed to get trades: ${error.message}`);
    }
  }

  /**
   * Parse trade data
   */
  parseTrade(trade, symbol) {
    return {
      id: trade.d,
      timestamp: parseInt(trade.t),
      datetime: new Date(parseInt(trade.t)).toISOString(),
      symbol: symbol,
      side: trade.s.toLowerCase(),
      price: parseFloat(trade.p),
      amount: parseFloat(trade.q),
      cost: parseFloat(trade.p) * parseFloat(trade.q),
      info: trade
    };
  }

  /**
   * Get candlestick data
   */
  async getOHLCV(symbol, timeframe = '1m', since = undefined, limit = 100) {
    try {
      const instrument = this.convertSymbol(symbol);
      const period = this.convertTimeframe(timeframe);
      
      const params = {
        instrument_name: instrument,
        timeframe: period,
        count: limit
      };
      
      if (since) {
        params.start_ts = since;
      }
      
      const response = await this.publicRequest('public/get-candlestick', params);
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to get candlestick data');
      }
      
      return response.result.data.map(candle => this.parseOHLCV(candle));
    } catch (error) {
      throw new Error(`Failed to get OHLCV: ${error.message}`);
    }
  }

  /**
   * Parse OHLCV data
   */
  parseOHLCV(candle) {
    return [
      parseInt(candle.t),        // timestamp
      parseFloat(candle.o),      // open
      parseFloat(candle.h),      // high
      parseFloat(candle.l),      // low
      parseFloat(candle.c),      // close
      parseFloat(candle.v)       // volume
    ];
  }

  /**
   * Get account balances
   */
  async getBalance() {
    try {
      const response = await this.privateRequest('private/get-account-summary');
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to get balance');
      }
      
      return this.parseBalance(response.result.accounts);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Parse balance data
   */
  parseBalance(accounts) {
    const result = {
      info: accounts,
      timestamp: Date.now(),
      datetime: new Date().toISOString()
    };
    
    accounts.forEach(account => {
      const currency = account.currency;
      const balance = parseFloat(account.balance);
      const available = parseFloat(account.available);
      const order = parseFloat(account.order);
      const stake = parseFloat(account.stake || 0);
      
      result[currency] = {
        free: available,
        used: order + stake,
        total: balance
      };
    });
    
    return result;
  }

  /**
   * Create a new order
   */
  async createOrder(symbol, type, side, amount, price = undefined, params = {}) {
    try {
      const instrument = this.convertSymbol(symbol);
      
      const orderParams = {
        instrument_name: instrument,
        side: side.toUpperCase(),
        type: this.convertOrderType(type),
        quantity: amount.toString()
      };
      
      if (price && type !== 'MARKET') {
        orderParams.price = price.toString();
      }
      
      // Additional parameters
      if (params.client_oid) {
        orderParams.client_oid = params.client_oid;
      }
      
      if (params.time_in_force) {
        orderParams.time_in_force = params.time_in_force;
      }
      
      if (params.exec_inst) {
        orderParams.exec_inst = params.exec_inst;
      }
      
      if (params.trigger_price) {
        orderParams.trigger_price = params.trigger_price.toString();
      }
      
      const response = await this.privateRequest('private/create-order', orderParams);
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to create order');
      }
      
      return this.parseOrder(response.result);
    } catch (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Parse order data
   */
  parseOrder(order) {
    const timestamp = parseInt(order.create_time);
    const symbol = this.standardizeSymbol(order.instrument_name);
    
    return {
      id: order.order_id,
      clientOrderId: order.client_oid || undefined,
      timestamp: timestamp,
      datetime: new Date(timestamp).toISOString(),
      symbol: symbol,
      type: order.type,
      side: order.side.toLowerCase(),
      price: parseFloat(order.price || 0),
      amount: parseFloat(order.quantity),
      filled: parseFloat(order.cumulative_quantity || 0),
      remaining: parseFloat(order.quantity) - parseFloat(order.cumulative_quantity || 0),
      status: this.parseOrderStatus(order.status),
      timeInForce: order.time_in_force,
      fee: order.fee_currency ? {
        cost: parseFloat(order.cumulative_fee || 0),
        currency: order.fee_currency
      } : undefined,
      info: order
    };
  }

  /**
   * Parse order status
   */
  parseOrderStatus(status) {
    const statuses = {
      'ACTIVE': 'open',
      'FILLED': 'closed',
      'CANCELED': 'canceled',
      'REJECTED': 'rejected',
      'EXPIRED': 'expired',
      'PENDING': 'open'
    };
    
    return statuses[status] || status.toLowerCase();
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId, symbol = undefined) {
    try {
      const params = { order_id: orderId };
      
      if (symbol) {
        params.instrument_name = this.convertSymbol(symbol);
      }
      
      const response = await this.privateRequest('private/cancel-order', params);
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to cancel order');
      }
      
      return { success: true, orderId: orderId };
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(symbol = undefined) {
    try {
      const params = {};
      
      if (symbol) {
        params.instrument_name = this.convertSymbol(symbol);
      }
      
      const response = await this.privateRequest('private/cancel-all-orders', params);
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to cancel all orders');
      }
      
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to cancel all orders: ${error.message}`);
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId, symbol = undefined) {
    try {
      const params = { order_id: orderId };
      
      const response = await this.privateRequest('private/get-order-detail', params);
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to get order');
      }
      
      return this.parseOrder(response.result.order_info);
    } catch (error) {
      throw new Error(`Failed to get order: ${error.message}`);
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol = undefined, limit = 100) {
    try {
      const params = { page_size: limit };
      
      if (symbol) {
        params.instrument_name = this.convertSymbol(symbol);
      }
      
      const response = await this.privateRequest('private/get-open-orders', params);
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to get open orders');
      }
      
      return response.result.order_list.map(order => this.parseOrder(order));
    } catch (error) {
      throw new Error(`Failed to get open orders: ${error.message}`);
    }
  }

  /**
   * Get order history
   */
  async getOrderHistory(symbol = undefined, since = undefined, limit = 100) {
    try {
      const params = { page_size: limit };
      
      if (symbol) {
        params.instrument_name = this.convertSymbol(symbol);
      }
      
      if (since) {
        params.start_ts = since;
      }
      
      const response = await this.privateRequest('private/get-order-history', params);
      
      if (response.code !== 0) {
        throw new Error(response.message || 'Failed to get order history');
      }
      
      return response.result.order_list.map(order => this.parseOrder(order));
    } catch (error) {
      throw new Error(`Failed to get order history: ${error.message}`);
    }
  }

  /**
   * Subscribe to market data WebSocket
   */
  async subscribeMarketData(symbol, channels = ['ticker', 'trade', 'book']) {
    try {
      if (!this.marketDataWS || this.marketDataWS.readyState !== WebSocket.OPEN) {
        await this.connectMarketDataWS();
      }
      
      const instrument = this.convertSymbol(symbol);
      
      channels.forEach(channel => {
        const subscription = {
          id: ++this.requestId,
          method: 'subscribe',
          params: {
            channels: [`${channel}.${instrument}`]
          },
          nonce: Date.now()
        };
        
        this.marketDataWS.send(JSON.stringify(subscription));
      });
      
      return true;
    } catch (error) {
      throw new Error(`Failed to subscribe to market data: ${error.message}`);
    }
  }

  /**
   * Connect to market data WebSocket
   */
  connectMarketDataWS() {
    return new Promise((resolve, reject) => {
      this.marketDataWS = new WebSocket(this.config.wsBaseURL);
      
      this.marketDataWS.on('open', () => {
        this.emit('marketdata_connected');
        this.startHeartbeat();
        resolve();
      });
      
      this.marketDataWS.on('message', (data) => {
        const message = JSON.parse(data);
        this.handleMarketDataMessage(message);
      });
      
      this.marketDataWS.on('error', (error) => {
        this.emit('error', { type: 'websocket', error: error.message });
        reject(error);
      });
      
      this.marketDataWS.on('close', () => {
        this.emit('marketdata_disconnected');
        this.stopHeartbeat();
      });
    });
  }

  /**
   * Handle market data WebSocket messages
   */
  handleMarketDataMessage(message) {
    if (message.method === 'public/heartbeat') {
      // Respond to heartbeat
      this.marketDataWS.send(JSON.stringify({
        id: message.id,
        method: 'public/respond-heartbeat'
      }));
      return;
    }
    
    if (message.result && message.result.channel) {
      const [channel, instrument] = message.result.channel.split('.');
      const symbol = this.standardizeSymbol(instrument);
      
      this.emit('market_update', {
        channel: channel,
        symbol: symbol,
        data: message.result.data
      });
    }
  }

  /**
   * Start WebSocket heartbeat
   */
  startHeartbeat() {
    this.wsHeartbeatInterval = setInterval(() => {
      if (this.marketDataWS && this.marketDataWS.readyState === WebSocket.OPEN) {
        this.marketDataWS.send(JSON.stringify({
          id: ++this.requestId,
          method: 'public/heartbeat'
        }));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop WebSocket heartbeat
   */
  stopHeartbeat() {
    if (this.wsHeartbeatInterval) {
      clearInterval(this.wsHeartbeatInterval);
      this.wsHeartbeatInterval = null;
    }
  }

  /**
   * Make a public API request
   */
  async publicRequest(method, params = {}) {
    this.checkRateLimit();
    
    try {
      const requestData = {
        id: ++this.requestId,
        method: method,
        params: params,
        nonce: Date.now()
      };
      
      const response = await axios.post(this.config.restBaseURL, requestData, {
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      this.handleAPIError(error);
    }
  }

  /**
   * Make a private API request
   */
  async privateRequest(method, params = {}) {
    this.checkRateLimit();
    
    try {
      const nonce = Date.now();
      const id = ++this.requestId;
      
      const requestData = {
        id: id,
        method: method,
        params: params,
        nonce: nonce
      };
      
      // Create signature
      const paramString = Object.keys(params).length > 0 
        ? Object.keys(params).sort().map(key => `${key}${params[key]}`).join('')
        : '';
      
      const sigPayload = `${method}${id}${this.apiKey}${paramString}${nonce}`;
      const signature = crypto
        .createHmac('sha256', this.apiSecret)
        .update(sigPayload)
        .digest('hex');
      
      requestData.api_key = this.apiKey;
      requestData.sig = signature;
      
      const response = await axios.post(this.config.restBaseURL, requestData, {
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      this.handleAPIError(error);
    }
  }

  /**
   * Check rate limits
   */
  checkRateLimit() {
    const now = Date.now();
    const windowStart = now - this.rateLimiter.window;
    
    // Remove old requests
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      time => time > windowStart
    );
    
    if (this.rateLimiter.requests.length >= this.rateLimiter.limit) {
      throw new Error('Rate limit exceeded');
    }
    
    this.rateLimiter.requests.push(now);
  }

  /**
   * Handle API errors
   */
  handleAPIError(error) {
    if (error.response) {
      const data = error.response.data;
      
      if (data && data.code !== 0) {
        throw new Error(`API Error ${data.code}: ${data.message}`);
      }
      
      throw new Error(`HTTP Error ${error.response.status}: ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Network error: No response received from Crypto.com Exchange');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }

  /**
   * Convert standard symbol to Crypto.com format (BTC/USD -> BTC_USD)
   */
  convertSymbol(symbol) {
    return symbol.replace('/', '_');
  }

  /**
   * Convert Crypto.com symbol to standard format (BTC_USD -> BTC/USD)
   */
  standardizeSymbol(instrument) {
    return instrument.replace('_', '/');
  }

  /**
   * Convert timeframe to Crypto.com format
   */
  convertTimeframe(timeframe) {
    const timeframes = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '6h': '6h',
      '12h': '12h',
      '1d': '1D',
      '1w': '1W',
      '1M': '1M'
    };
    
    return timeframes[timeframe] || '1m';
  }

  /**
   * Convert order type to Crypto.com format
   */
  convertOrderType(type) {
    return type.toUpperCase();
  }

  /**
   * Disconnect from Crypto.com Exchange
   */
  async disconnect() {
    this.stopHeartbeat();
    
    if (this.marketDataWS) {
      this.marketDataWS.close();
      this.marketDataWS = null;
    }
    
    if (this.userDataWS) {
      this.userDataWS.close();
      this.userDataWS = null;
    }
    
    this.connected = false;
    this.emit('disconnected', { exchange: this.exchangeName });
    
    return true;
  }

  /**
   * Get exchange status
   */
  getStatus() {
    return {
      exchange: this.exchangeName,
      connected: this.connected,
      authenticated: this.authenticated,
      features: this.features,
      instruments: this.instruments ? this.instruments.length : 0,
      rateLimit: `${this.rateLimiter.requests.length}/${this.rateLimiter.limit} per second`,
      websocket: {
        marketData: this.marketDataWS ? this.marketDataWS.readyState === WebSocket.OPEN : false,
        userData: this.userDataWS ? this.userDataWS.readyState === WebSocket.OPEN : false
      }
    };
  }
}

module.exports = CryptoComExchangeAdapter;
