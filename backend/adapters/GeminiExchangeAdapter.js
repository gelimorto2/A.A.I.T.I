/**
 * Gemini Exchange Adapter
 * 
 * Implements the IExchangeAdapter interface for Gemini exchange
 * Provides real-time market data, order management, and account operations
 * 
 * Features:
 * - REST API and WebSocket support
 * - Real-time market data streaming
 * - Advanced order types (limit, market, stop-limit)
 * - Portfolio balance tracking
 * - Historical data retrieval
 * 
 * @implements {IExchangeAdapter}
 */

const crypto = require('crypto');
const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');

class GeminiExchangeAdapter extends EventEmitter {
  constructor(apiKey, apiSecret, options = {}) {
    super();
    
    this.exchangeId = 'gemini';
    this.exchangeName = 'Gemini';
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    
    // Configuration
    this.config = {
      restBaseURL: options.sandbox ? 'https://api.sandbox.gemini.com' : 'https://api.gemini.com',
      wsBaseURL: options.sandbox ? 'wss://api.sandbox.gemini.com' : 'wss://api.gemini.com',
      timeout: options.timeout || 10000,
      sandbox: options.sandbox || false,
      testMode: options.testMode || false
    };
    
    // State management
    this.connected = false;
    this.authenticated = false;
    this.rateLimiter = {
      publicRequests: [],
      privateRequests: [],
      publicLimit: 120, // 120 requests per minute
      privateLimit: 600 // 600 requests per minute
    };
    
    // WebSocket connections
    this.marketDataWS = null;
    this.orderUpdatesWS = null;
    
    // Cache
    this.orderBookCache = new Map();
    this.tickerCache = new Map();
    
    // Supported features
    this.features = {
      spot: true,
      margin: false,
      futures: false,
      options: false,
      lending: false,
      staking: false
    };
    
    // Order types
    this.supportedOrderTypes = [
      'market',
      'limit',
      'stop-limit',
      'immediate-or-cancel',
      'fill-or-kill',
      'maker-or-cancel'
    ];
  }

  /**
   * Initialize connection to Gemini
   */
  async initialize() {
    try {
      // Test API connectivity
      await this.testConnection();
      
      // Load markets
      await this.loadMarkets();
      
      this.connected = true;
      this.emit('connected', { exchange: this.exchangeName });
      
      return {
        success: true,
        exchange: this.exchangeName,
        markets: this.markets.length,
        features: this.features
      };
    } catch (error) {
      this.emit('error', { type: 'initialization', error: error.message });
      throw new Error(`Gemini initialization failed: ${error.message}`);
    }
  }

  /**
   * Test connection to Gemini API
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.config.restBaseURL}/v1/symbols`, {
        timeout: this.config.timeout
      });
      
      return response.status === 200;
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Load available markets from Gemini
   */
  async loadMarkets() {
    try {
      const [symbols, details] = await Promise.all([
        this.publicRequest('/v1/symbols'),
        this.publicRequest('/v1/symbols/details/all')
      ]);
      
      this.markets = symbols.map(symbol => {
        const detail = details.find(d => d.symbol === symbol.toLowerCase());
        return this.parseMarket(symbol, detail);
      });
      
      return this.markets;
    } catch (error) {
      throw new Error(`Failed to load markets: ${error.message}`);
    }
  }

  /**
   * Parse market data into standardized format
   */
  parseMarket(symbol, detail = {}) {
    const [base, quote] = this.parseSymbol(symbol);
    
    return {
      id: symbol.toLowerCase(),
      symbol: `${base}/${quote}`,
      base: base,
      quote: quote,
      active: detail.status === 'open',
      type: 'spot',
      spot: true,
      margin: false,
      future: false,
      option: false,
      contract: false,
      precision: {
        amount: detail.tick_size || 8,
        price: detail.quote_increment || 8
      },
      limits: {
        amount: {
          min: parseFloat(detail.min_order_size) || 0.00001,
          max: parseFloat(detail.max_order_size) || undefined
        },
        price: {
          min: parseFloat(detail.quote_increment) || 0.00000001,
          max: undefined
        },
        cost: {
          min: undefined,
          max: undefined
        }
      },
      info: detail
    };
  }

  /**
   * Parse Gemini symbol format (e.g., 'btcusd' -> ['BTC', 'USD'])
   */
  parseSymbol(symbol) {
    const upper = symbol.toUpperCase();
    
    // Common quote currencies
    const quotes = ['USD', 'USDT', 'USDC', 'DAI', 'GUSD', 'BTC', 'ETH'];
    
    for (const quote of quotes) {
      if (upper.endsWith(quote)) {
        const base = upper.slice(0, -quote.length);
        return [base, quote];
      }
    }
    
    // Default fallback
    return [upper.slice(0, 3), upper.slice(3)];
  }

  /**
   * Get current ticker data
   */
  async getTicker(symbol) {
    try {
      const geminiSymbol = this.convertSymbol(symbol);
      const ticker = await this.publicRequest(`/v1/pubticker/${geminiSymbol}`);
      
      return this.parseTicker(ticker, geminiSymbol);
    } catch (error) {
      throw new Error(`Failed to get ticker: ${error.message}`);
    }
  }

  /**
   * Parse ticker data into standardized format
   */
  parseTicker(ticker, symbol) {
    const timestamp = parseInt(ticker.volume.timestamp);
    
    return {
      symbol: this.standardizeSymbol(symbol),
      timestamp: timestamp,
      datetime: new Date(timestamp).toISOString(),
      high: parseFloat(ticker.high),
      low: parseFloat(ticker.low),
      bid: parseFloat(ticker.bid),
      ask: parseFloat(ticker.ask),
      last: parseFloat(ticker.last),
      close: parseFloat(ticker.last),
      volume: parseFloat(ticker.volume[symbol.substring(3)]), // Volume in quote currency
      info: ticker
    };
  }

  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol, limit = 100) {
    try {
      const geminiSymbol = this.convertSymbol(symbol);
      const params = limit ? `?limit_bids=${limit}&limit_asks=${limit}` : '';
      const orderBook = await this.publicRequest(`/v1/book/${geminiSymbol}${params}`);
      
      return this.parseOrderBook(orderBook, symbol);
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
      timestamp: Date.now(),
      datetime: new Date().toISOString(),
      bids: orderBook.bids.map(bid => [parseFloat(bid.price), parseFloat(bid.amount)]),
      asks: orderBook.asks.map(ask => [parseFloat(ask.price), parseFloat(ask.amount)]),
      nonce: undefined
    };
  }

  /**
   * Get OHLCV candlestick data
   */
  async getOHLCV(symbol, timeframe = '1m', since = undefined, limit = 100) {
    try {
      const geminiSymbol = this.convertSymbol(symbol);
      const interval = this.convertTimeframe(timeframe);
      
      // Gemini returns candles in reverse chronological order
      const candles = await this.publicRequest(`/v2/candles/${geminiSymbol}/${interval}`);
      
      return this.parseOHLCV(candles.slice(0, limit));
    } catch (error) {
      throw new Error(`Failed to get OHLCV: ${error.message}`);
    }
  }

  /**
   * Parse OHLCV data into standardized format
   */
  parseOHLCV(candles) {
    return candles.map(candle => [
      candle[0], // timestamp
      parseFloat(candle[1]), // open
      parseFloat(candle[2]), // high
      parseFloat(candle[3]), // low
      parseFloat(candle[4]), // close
      parseFloat(candle[5])  // volume
    ]);
  }

  /**
   * Get account balances
   */
  async getBalance() {
    try {
      const balances = await this.privateRequest('/v1/balances', 'POST');
      
      return this.parseBalance(balances);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Parse balance data into standardized format
   */
  parseBalance(balances) {
    const result = {
      info: balances,
      timestamp: Date.now(),
      datetime: new Date().toISOString()
    };
    
    balances.forEach(balance => {
      const currency = balance.currency.toUpperCase();
      const available = parseFloat(balance.available);
      const total = parseFloat(balance.amount);
      const held = total - available;
      
      result[currency] = {
        free: available,
        used: held,
        total: total
      };
    });
    
    return result;
  }

  /**
   * Create a new order
   */
  async createOrder(symbol, type, side, amount, price = undefined, params = {}) {
    try {
      const geminiSymbol = this.convertSymbol(symbol);
      
      const orderParams = {
        symbol: geminiSymbol,
        amount: amount.toString(),
        side: side.toLowerCase(),
        type: this.convertOrderType(type),
        options: params.options || []
      };
      
      if (price) {
        orderParams.price = price.toString();
      }
      
      // Add additional parameters
      if (params.clientOrderId) {
        orderParams.client_order_id = params.clientOrderId;
      }
      
      if (params.stopPrice) {
        orderParams.stop_price = params.stopPrice.toString();
      }
      
      const order = await this.privateRequest('/v1/order/new', 'POST', orderParams);
      
      return this.parseOrder(order);
    } catch (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Parse order data into standardized format
   */
  parseOrder(order) {
    const timestamp = parseInt(order.timestampms);
    
    return {
      id: order.order_id,
      clientOrderId: order.client_order_id || undefined,
      timestamp: timestamp,
      datetime: new Date(timestamp).toISOString(),
      symbol: this.standardizeSymbol(order.symbol),
      type: order.type,
      side: order.side,
      price: parseFloat(order.price),
      amount: parseFloat(order.original_amount),
      filled: parseFloat(order.executed_amount),
      remaining: parseFloat(order.remaining_amount),
      status: this.parseOrderStatus(order),
      fee: {
        cost: parseFloat(order.fee_amount || 0),
        currency: order.fee_currency
      },
      trades: order.trades || [],
      info: order
    };
  }

  /**
   * Parse order status
   */
  parseOrderStatus(order) {
    if (order.is_cancelled) return 'canceled';
    if (parseFloat(order.remaining_amount) === 0) return 'closed';
    if (parseFloat(order.executed_amount) > 0) return 'partially_filled';
    return 'open';
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId, symbol = undefined) {
    try {
      const params = { order_id: parseInt(orderId) };
      const result = await this.privateRequest('/v1/order/cancel', 'POST', params);
      
      return this.parseOrder(result);
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  /**
   * Get order status
   */
  async getOrder(orderId, symbol = undefined) {
    try {
      const params = { order_id: parseInt(orderId) };
      const order = await this.privateRequest('/v1/order/status', 'POST', params);
      
      return this.parseOrder(order);
    } catch (error) {
      throw new Error(`Failed to get order: ${error.message}`);
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol = undefined) {
    try {
      const orders = await this.privateRequest('/v1/orders', 'POST');
      
      let filtered = orders;
      if (symbol) {
        const geminiSymbol = this.convertSymbol(symbol);
        filtered = orders.filter(order => order.symbol === geminiSymbol);
      }
      
      return filtered.map(order => this.parseOrder(order));
    } catch (error) {
      throw new Error(`Failed to get open orders: ${error.message}`);
    }
  }

  /**
   * Get order history
   */
  async getOrderHistory(symbol = undefined, since = undefined, limit = 100) {
    try {
      const params = {};
      if (limit) params.limit_trades = limit;
      if (symbol) params.symbol = this.convertSymbol(symbol);
      
      const orders = await this.privateRequest('/v1/mytrades', 'POST', params);
      
      return orders.map(order => this.parseOrder(order));
    } catch (error) {
      throw new Error(`Failed to get order history: ${error.message}`);
    }
  }

  /**
   * Subscribe to market data WebSocket
   */
  async subscribeMarketData(symbol, callback) {
    try {
      const geminiSymbol = this.convertSymbol(symbol);
      const wsURL = `${this.config.wsBaseURL}/v1/marketdata/${geminiSymbol}`;
      
      this.marketDataWS = new WebSocket(wsURL);
      
      this.marketDataWS.on('open', () => {
        this.emit('marketdata_connected', { symbol: geminiSymbol });
      });
      
      this.marketDataWS.on('message', (data) => {
        const message = JSON.parse(data);
        callback(this.parseMarketDataUpdate(message, symbol));
      });
      
      this.marketDataWS.on('error', (error) => {
        this.emit('error', { type: 'websocket', error: error.message });
      });
      
      this.marketDataWS.on('close', () => {
        this.emit('marketdata_disconnected', { symbol: geminiSymbol });
      });
      
      return true;
    } catch (error) {
      throw new Error(`Failed to subscribe to market data: ${error.message}`);
    }
  }

  /**
   * Parse market data update
   */
  parseMarketDataUpdate(message, symbol) {
    if (message.type === 'trade') {
      return {
        type: 'trade',
        symbol: symbol,
        price: parseFloat(message.price),
        amount: parseFloat(message.amount),
        side: message.makerSide === 'bid' ? 'sell' : 'buy',
        timestamp: message.timestampms
      };
    } else if (message.type === 'change') {
      return {
        type: 'orderbook',
        symbol: symbol,
        side: message.side,
        price: parseFloat(message.price),
        amount: parseFloat(message.remaining),
        timestamp: message.timestampms
      };
    }
    
    return message;
  }

  /**
   * Make a public API request
   */
  async publicRequest(endpoint, params = {}) {
    this.checkRateLimit('public');
    
    try {
      const url = `${this.config.restBaseURL}${endpoint}`;
      const response = await axios.get(url, {
        params: params,
        timeout: this.config.timeout
      });
      
      return response.data;
    } catch (error) {
      this.handleAPIError(error);
    }
  }

  /**
   * Make a private API request
   */
  async privateRequest(endpoint, method = 'POST', params = {}) {
    this.checkRateLimit('private');
    
    try {
      const nonce = Date.now();
      const payload = {
        request: endpoint,
        nonce: nonce,
        ...params
      };
      
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const signature = crypto
        .createHmac('sha384', this.apiSecret)
        .update(encodedPayload)
        .digest('hex');
      
      const url = `${this.config.restBaseURL}${endpoint}`;
      const response = await axios({
        method: method,
        url: url,
        headers: {
          'Content-Type': 'text/plain',
          'X-GEMINI-APIKEY': this.apiKey,
          'X-GEMINI-PAYLOAD': encodedPayload,
          'X-GEMINI-SIGNATURE': signature,
          'Cache-Control': 'no-cache'
        },
        timeout: this.config.timeout
      });
      
      return response.data;
    } catch (error) {
      this.handleAPIError(error);
    }
  }

  /**
   * Check rate limits
   */
  checkRateLimit(type) {
    const now = Date.now();
    const requests = type === 'public' ? this.rateLimiter.publicRequests : this.rateLimiter.privateRequests;
    const limit = type === 'public' ? this.rateLimiter.publicLimit : this.rateLimiter.privateLimit;
    
    // Remove requests older than 1 minute
    const oneMinuteAgo = now - 60000;
    const recentRequests = requests.filter(time => time > oneMinuteAgo);
    
    if (recentRequests.length >= limit) {
      throw new Error(`Rate limit exceeded for ${type} requests`);
    }
    
    recentRequests.push(now);
    
    if (type === 'public') {
      this.rateLimiter.publicRequests = recentRequests;
    } else {
      this.rateLimiter.privateRequests = recentRequests;
    }
  }

  /**
   * Handle API errors
   */
  handleAPIError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 400) {
        throw new Error(`Bad Request: ${data.message || 'Invalid parameters'}`);
      } else if (status === 401) {
        throw new Error('Authentication failed: Invalid API key or signature');
      } else if (status === 403) {
        throw new Error('Forbidden: Insufficient permissions');
      } else if (status === 404) {
        throw new Error('Not Found: Endpoint or resource does not exist');
      } else if (status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (status === 500) {
        throw new Error('Internal Server Error: Gemini service issue');
      } else if (status === 502 || status === 503) {
        throw new Error('Service temporarily unavailable');
      }
      
      throw new Error(`API Error ${status}: ${data.message || 'Unknown error'}`);
    } else if (error.request) {
      throw new Error('Network error: No response received from Gemini');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }

  /**
   * Convert standard symbol to Gemini format (BTC/USD -> btcusd)
   */
  convertSymbol(symbol) {
    return symbol.replace('/', '').toLowerCase();
  }

  /**
   * Convert Gemini symbol to standard format (btcusd -> BTC/USD)
   */
  standardizeSymbol(geminiSymbol) {
    const [base, quote] = this.parseSymbol(geminiSymbol);
    return `${base}/${quote}`;
  }

  /**
   * Convert timeframe to Gemini format
   */
  convertTimeframe(timeframe) {
    const timeframes = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1hr',
      '6h': '6hr',
      '1d': '1day'
    };
    
    return timeframes[timeframe] || '1m';
  }

  /**
   * Convert order type to Gemini format
   */
  convertOrderType(type) {
    const types = {
      'market': 'exchange market',
      'limit': 'exchange limit',
      'stop-limit': 'exchange stop limit'
    };
    
    return types[type] || 'exchange limit';
  }

  /**
   * Disconnect from Gemini
   */
  async disconnect() {
    if (this.marketDataWS) {
      this.marketDataWS.close();
      this.marketDataWS = null;
    }
    
    if (this.orderUpdatesWS) {
      this.orderUpdatesWS.close();
      this.orderUpdatesWS = null;
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
      markets: this.markets ? this.markets.length : 0,
      rateLimit: {
        public: `${this.rateLimiter.publicRequests.length}/${this.rateLimiter.publicLimit}`,
        private: `${this.rateLimiter.privateRequests.length}/${this.rateLimiter.privateLimit}`
      }
    };
  }
}

module.exports = GeminiExchangeAdapter;
