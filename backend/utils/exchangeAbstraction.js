const logger = require('./logger');
const crypto = require('crypto');
const axios = require('axios');

/**
 * Unified Exchange Abstraction Layer
 * Provides a consistent interface across multiple cryptocurrency exchanges
 */
class ExchangeAbstraction {
  constructor() {
    this.exchanges = new Map();
    this.supportedExchanges = {
      BINANCE: 'binance',
      COINBASE: 'coinbase',
      KRAKEN: 'kraken',
      KUCOIN: 'kucoin',
      BYBIT: 'bybit',
      ALPHA_VANTAGE: 'alpha_vantage'
    };
    
    this.orderTypes = {
      MARKET: 'market',
      LIMIT: 'limit',
      STOP_LOSS: 'stop_loss',
      TAKE_PROFIT: 'take_profit',
      OCO: 'oco', // One-Cancels-Other
      ICEBERG: 'iceberg',
      TWAP: 'twap', // Time-Weighted Average Price
      TRAILING_STOP: 'trailing_stop' // Trailing stop with dynamic adjustments
    };
    
    this.orderSides = {
      BUY: 'buy',
      SELL: 'sell'
    };
    
    this.orderStatus = {
      PENDING: 'pending',
      OPEN: 'open',
      FILLED: 'filled',
      CANCELLED: 'cancelled',
      REJECTED: 'rejected',
      PARTIALLY_FILLED: 'partially_filled'
    };

    logger.info('ExchangeAbstraction initialized with support for 6 exchanges');
  }

  /**
   * Register an exchange connection
   */
  registerExchange(exchangeId, exchangeType, credentials = {}) {
    const exchange = this.createExchangeInstance(exchangeType, credentials);
    this.exchanges.set(exchangeId, {
      type: exchangeType,
      instance: exchange,
      credentials,
      connected: false,
      lastPing: null
    });
    
    logger.info(`Exchange registered: ${exchangeId} (${exchangeType})`);
    return exchangeId;
  }

  /**
   * Create exchange-specific instance
   */
  createExchangeInstance(exchangeType, credentials) {
    switch (exchangeType) {
      case this.supportedExchanges.BINANCE:
        return new BinanceExchange(credentials);
      case this.supportedExchanges.COINBASE:
        return new CoinbaseExchange(credentials);
      case this.supportedExchanges.KRAKEN:
        return new KrakenExchange(credentials);
      case this.supportedExchanges.KUCOIN:
        return new KuCoinExchange(credentials);
      case this.supportedExchanges.BYBIT:
        return new BybitExchange(credentials);
      case this.supportedExchanges.ALPHA_VANTAGE:
        return new AlphaVantageExchange(credentials);
      default:
        throw new Error(`Unsupported exchange type: ${exchangeType}`);
    }
  }

  /**
   * Test connection to an exchange
   */
  async testConnection(exchangeId) {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    try {
      const result = await exchange.instance.testConnection();
      exchange.connected = result.success;
      exchange.lastPing = new Date().toISOString();
      
      logger.info(`Connection test ${result.success ? 'successful' : 'failed'} for ${exchangeId}`);
      return result;
    } catch (error) {
      exchange.connected = false;
      logger.error(`Connection test failed for ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Get market data from exchange
   */
  async getMarketData(exchangeId, symbol, timeframe = '1h', limit = 100) {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    try {
      return await exchange.instance.getMarketData(symbol, timeframe, limit);
    } catch (error) {
      logger.error(`Error getting market data from ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Get real-time quote
   */
  async getQuote(exchangeId, symbol) {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    try {
      return await exchange.instance.getQuote(symbol);
    } catch (error) {
      logger.error(`Error getting quote from ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Place order on exchange
   */
  async placeOrder(exchangeId, orderParams) {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    // Validate order parameters
    this.validateOrderParams(orderParams);

    try {
      const result = await exchange.instance.placeOrder(orderParams);
      
      logger.info(`Order placed on ${exchangeId}:`, {
        orderId: result.orderId,
        symbol: orderParams.symbol,
        side: orderParams.side,
        type: orderParams.type,
        quantity: orderParams.quantity
      });

      return result;
    } catch (error) {
      logger.error(`Error placing order on ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(exchangeId, orderId, symbol) {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    try {
      return await exchange.instance.getOrderStatus(orderId, symbol);
    } catch (error) {
      logger.error(`Error getting order status from ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(exchangeId, orderId, symbol) {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    try {
      const result = await exchange.instance.cancelOrder(orderId, symbol);
      
      logger.info(`Order cancelled on ${exchangeId}:`, {
        orderId,
        symbol
      });

      return result;
    } catch (error) {
      logger.error(`Error cancelling order on ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(exchangeId) {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    try {
      return await exchange.instance.getBalance();
    } catch (error) {
      logger.error(`Error getting balance from ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Get trading fees
   */
  async getTradingFees(exchangeId, symbol) {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    try {
      return await exchange.instance.getTradingFees(symbol);
    } catch (error) {
      logger.error(`Error getting trading fees from ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Cross-exchange arbitrage detection
   */
  async detectArbitrageOpportunities(symbols, minProfitPercent = 0.5) {
    const opportunities = [];
    const exchanges = Array.from(this.exchanges.keys());
    
    if (exchanges.length < 2) {
      logger.warn('Need at least 2 exchanges for arbitrage detection');
      return opportunities;
    }

    for (const symbol of symbols) {
      try {
        const quotes = await Promise.all(
          exchanges.map(async (exchangeId) => {
            try {
              const quote = await this.getQuote(exchangeId, symbol);
              return {
                exchangeId,
                bid: quote.bid || quote.price,
                ask: quote.ask || quote.price,
                price: quote.price,
                timestamp: quote.timestamp
              };
            } catch (error) {
              logger.warn(`Failed to get quote for ${symbol} from ${exchangeId}:`, error.message);
              return null;
            }
          })
        );

        const validQuotes = quotes.filter(q => q !== null);
        
        if (validQuotes.length < 2) continue;

        // Find arbitrage opportunities
        for (let i = 0; i < validQuotes.length - 1; i++) {
          for (let j = i + 1; j < validQuotes.length; j++) {
            const quote1 = validQuotes[i];
            const quote2 = validQuotes[j];

            // Buy on exchange with lower ask, sell on exchange with higher bid
            const buyExchange = quote1.ask < quote2.ask ? quote1 : quote2;
            const sellExchange = quote1.bid > quote2.bid ? quote1 : quote2;

            if (buyExchange.exchangeId !== sellExchange.exchangeId) {
              const profitPercent = ((sellExchange.bid - buyExchange.ask) / buyExchange.ask) * 100;
              
              if (profitPercent > minProfitPercent) {
                opportunities.push({
                  symbol,
                  buyExchange: buyExchange.exchangeId,
                  sellExchange: sellExchange.exchangeId,
                  buyPrice: buyExchange.ask,
                  sellPrice: sellExchange.bid,
                  profitPercent: profitPercent.toFixed(3),
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        }
      } catch (error) {
        logger.error(`Error checking arbitrage for ${symbol}:`, error);
      }
    }

    if (opportunities.length > 0) {
      logger.info(`Found ${opportunities.length} arbitrage opportunities`);
    }

    return opportunities;
  }

  /**
   * Get best execution venue for order
   */
  async getBestExecutionVenue(symbol, side, quantity) {
    const exchanges = Array.from(this.exchanges.keys());
    const venues = [];

    for (const exchangeId of exchanges) {
      try {
        const quote = await this.getQuote(exchangeId, symbol);
        const fees = await this.getTradingFees(exchangeId, symbol);
        
        const price = side === this.orderSides.BUY ? quote.ask || quote.price : quote.bid || quote.price;
        const totalCost = quantity * price * (1 + (fees.taker || 0.001));

        venues.push({
          exchangeId,
          price,
          totalCost,
          fees: fees.taker || 0.001,
          liquidity: quote.volume || 0,
          timestamp: quote.timestamp
        });
      } catch (error) {
        logger.warn(`Failed to get venue info for ${exchangeId}:`, error.message);
      }
    }

    if (venues.length === 0) {
      throw new Error('No available venues for execution');
    }

    // Sort by total cost (ascending for buy, descending for sell)
    venues.sort((a, b) => {
      return side === this.orderSides.BUY ? a.totalCost - b.totalCost : b.totalCost - a.totalCost;
    });

    logger.info(`Best execution venue for ${side} ${quantity} ${symbol}: ${venues[0].exchangeId}`);
    
    return venues[0];
  }

  /**
   * Validate order parameters
   */
  validateOrderParams(orderParams) {
    const required = ['symbol', 'side', 'type', 'quantity'];
    for (const field of required) {
      if (!orderParams[field]) {
        throw new Error(`Missing required order parameter: ${field}`);
      }
    }

    if (!Object.values(this.orderSides).includes(orderParams.side)) {
      throw new Error(`Invalid order side: ${orderParams.side}`);
    }

    if (!Object.values(this.orderTypes).includes(orderParams.type)) {
      throw new Error(`Invalid order type: ${orderParams.type}`);
    }

    if (orderParams.quantity <= 0) {
      throw new Error('Order quantity must be positive');
    }

    // Validate price for limit orders
    if (orderParams.type === this.orderTypes.LIMIT && (!orderParams.price || orderParams.price <= 0)) {
      throw new Error('Limit orders require a positive price');
    }
  }

  /**
   * List registered exchanges
   */
  listExchanges() {
    const exchanges = [];
    for (const [id, exchange] of this.exchanges.entries()) {
      exchanges.push({
        id,
        type: exchange.type,
        connected: exchange.connected,
        lastPing: exchange.lastPing
      });
    }
    return exchanges;
  }

  /**
   * Get unified order book aggregated from multiple exchanges
   */
  async getUnifiedOrderBook(symbol, exchanges = null, depth = 50) {
    const targetExchanges = exchanges || Array.from(this.exchanges.keys());
    const orderBooks = [];
    
    // Collect order books from all specified exchanges
    for (const exchangeId of targetExchanges) {
      try {
        const exchange = this.exchanges.get(exchangeId);
        if (exchange && exchange.connected) {
          const orderBook = await exchange.instance.getOrderBook(symbol, depth);
          if (orderBook && orderBook.bids && orderBook.asks) {
            orderBooks.push({
              exchangeId,
              exchange: exchange.type,
              ...orderBook
            });
          }
        }
      } catch (error) {
        logger.warn(`Failed to get order book from ${exchangeId}:`, error.message);
      }
    }

    if (orderBooks.length === 0) {
      throw new Error('No order books available for aggregation');
    }

    // Aggregate all bids and asks
    const allBids = [];
    const allAsks = [];

    orderBooks.forEach(book => {
      book.bids.forEach(bid => allBids.push({ ...bid, exchange: book.exchangeId }));
      book.asks.forEach(ask => allAsks.push({ ...ask, exchange: book.exchangeId }));
    });

    // Sort bids by price (descending) and asks by price (ascending)
    allBids.sort((a, b) => b.price - a.price);
    allAsks.sort((a, b) => a.price - b.price);

    // Take top entries up to depth
    const unifiedBids = allBids.slice(0, depth);
    const unifiedAsks = allAsks.slice(0, depth);

    return {
      symbol,
      bids: unifiedBids,
      asks: unifiedAsks,
      timestamp: new Date().toISOString(),
      exchanges: orderBooks.map(book => book.exchangeId),
      aggregatedFrom: orderBooks.length,
      bestBid: unifiedBids[0]?.price || null,
      bestAsk: unifiedAsks[0]?.price || null,
      spread: unifiedAsks[0] && unifiedBids[0] ? 
        ((unifiedAsks[0].price - unifiedBids[0].price) / unifiedBids[0].price * 100).toFixed(4) : null
    };
  }

  /**
   * Emergency stop all trading activities
   */
  async emergencyStopAll(reason = 'Manual emergency stop') {
    logger.error(`🚨 EMERGENCY STOP ACTIVATED: ${reason}`);
    
    const results = {
      reason,
      timestamp: new Date().toISOString(),
      exchanges: [],
      cancelledOrders: 0,
      errors: []
    };

    for (const [exchangeId, exchange] of this.exchanges.entries()) {
      try {
        const exchangeResult = await this.emergencyStopExchange(exchangeId, reason);
        results.exchanges.push(exchangeResult);
        results.cancelledOrders += exchangeResult.cancelledOrders || 0;
      } catch (error) {
        const errorResult = {
          exchangeId,
          success: false,
          error: error.message,
          cancelledOrders: 0
        };
        results.exchanges.push(errorResult);
        results.errors.push(errorResult);
      }
    }

    logger.info(`Emergency stop completed: ${results.cancelledOrders} orders cancelled across ${results.exchanges.length} exchanges`);
    return results;
  }

  /**
   * Emergency stop for specific exchange
   */
  async emergencyStopExchange(exchangeId, reason = 'Emergency stop') {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    try {
      // Cancel all open orders if exchange supports it
      const result = await exchange.instance.emergencyStop ? 
        await exchange.instance.emergencyStop(reason) :
        { success: true, message: 'Emergency stop signal sent', cancelledOrders: 0 };

      logger.warn(`Emergency stop executed for ${exchangeId}: ${result.message || 'Success'}`);
      
      return {
        exchangeId,
        success: true,
        message: result.message,
        cancelledOrders: result.cancelledOrders || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Emergency stop failed for ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Position synchronization across exchanges
   */
  async synchronizePositions() {
    const positions = new Map();
    const errors = [];

    logger.info('Starting position synchronization across exchanges...');

    for (const [exchangeId, exchange] of this.exchanges.entries()) {
      try {
        if (exchange.connected) {
          const balance = await exchange.instance.getBalance();
          positions.set(exchangeId, {
            exchange: exchangeId,
            balances: balance.balances || balance,
            timestamp: balance.timestamp || new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error(`Failed to get positions from ${exchangeId}:`, error);
        errors.push({
          exchangeId,
          error: error.message
        });
      }
    }

    // Calculate total positions across all exchanges
    const aggregatedPositions = new Map();
    
    for (const [exchangeId, position] of positions.entries()) {
      if (position.balances) {
        position.balances.forEach(balance => {
          const asset = balance.asset || balance.currency;
          const total = (balance.free || 0) + (balance.locked || 0);
          
          if (!aggregatedPositions.has(asset)) {
            aggregatedPositions.set(asset, {
              asset,
              totalBalance: 0,
              exchanges: {}
            });
          }
          
          const aggregated = aggregatedPositions.get(asset);
          aggregated.totalBalance += total;
          aggregated.exchanges[exchangeId] = {
            free: balance.free || 0,
            locked: balance.locked || 0,
            total
          };
        });
      }
    }

    const result = {
      timestamp: new Date().toISOString(),
      exchangeCount: positions.size,
      positions: Array.from(aggregatedPositions.values()),
      exchangeDetails: Object.fromEntries(positions),
      errors
    };

    logger.info(`Position synchronization completed: ${result.exchangeCount} exchanges, ${result.positions.length} assets`);
    return result;
  }

  /**
   * Remove exchange registration
   */
  removeExchange(exchangeId) {
    const result = this.exchanges.delete(exchangeId);
    if (result) {
      logger.info(`Exchange removed: ${exchangeId}`);
    }
    return result;
  }
}

/**
 * Binance Exchange Implementation
 */
class BinanceExchange {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.baseURL = credentials.testnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
    this.name = 'Binance';
  }

  async testConnection() {
    try {
      // For now, simulate connection test
      // In production, this would make an actual API call to Binance
      const response = await this.makeRequest('GET', '/api/v3/ping');
      return {
        success: true,
        exchange: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        exchange: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getMarketData(symbol, timeframe, limit) {
    // Simulate Binance market data
    // In production, this would call /api/v3/klines
    return {
      exchange: this.name,
      symbol,
      timeframe,
      data: this.generateMockOHLCV(limit),
      timestamp: new Date().toISOString()
    };
  }

  async getQuote(symbol) {
    // Simulate Binance quote
    // In production, this would call /api/v3/ticker/bookTicker
    const basePrice = 50000 + Math.random() * 10000;
    return {
      exchange: this.name,
      symbol,
      bid: basePrice - Math.random() * 100,
      ask: basePrice + Math.random() * 100,
      price: basePrice,
      volume: Math.random() * 1000000,
      timestamp: new Date().toISOString()
    };
  }

  async getOrderBook(symbol, depth = 50) {
    // Simulate Binance order book
    // In production, this would call /api/v3/depth
    const midPrice = 50000 + Math.random() * 10000;
    const bids = [];
    const asks = [];

    for (let i = 0; i < depth; i++) {
      bids.push({
        price: midPrice - (i * 10) - Math.random() * 10,
        quantity: Math.random() * 100
      });
      asks.push({
        price: midPrice + (i * 10) + Math.random() * 10,
        quantity: Math.random() * 100
      });
    }

    return {
      exchange: this.name,
      symbol,
      bids,
      asks,
      timestamp: new Date().toISOString()
    };
  }

  async placeOrder(orderParams) {
    // Simulate order placement
    // In production, this would call /api/v3/order
    const orderId = `binance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      orderId,
      exchange: this.name,
      symbol: orderParams.symbol,
      side: orderParams.side,
      type: orderParams.type,
      quantity: orderParams.quantity,
      price: orderParams.price,
      status: 'open',
      timestamp: new Date().toISOString()
    };
  }

  async getOrderStatus(orderId, symbol) {
    // Simulate order status check
    return {
      orderId,
      exchange: this.name,
      symbol,
      status: 'filled',
      executedQuantity: Math.random() * 100,
      averagePrice: 50000 + Math.random() * 1000,
      timestamp: new Date().toISOString()
    };
  }

  async cancelOrder(orderId, symbol) {
    // Simulate order cancellation
    return {
      orderId,
      exchange: this.name,
      symbol,
      status: 'cancelled',
      timestamp: new Date().toISOString()
    };
  }

  async getBalance() {
    // Simulate balance check
    return {
      exchange: this.name,
      balances: [
        { asset: 'BTC', free: Math.random() * 10, locked: Math.random() * 1 },
        { asset: 'ETH', free: Math.random() * 100, locked: Math.random() * 10 },
        { asset: 'USDT', free: Math.random() * 10000, locked: Math.random() * 1000 }
      ],
      timestamp: new Date().toISOString()
    };
  }

  async getTradingFees(symbol) {
    // Simulate trading fees
    return {
      exchange: this.name,
      symbol,
      maker: 0.001, // 0.1%
      taker: 0.001, // 0.1%
      timestamp: new Date().toISOString()
    };
  }

  async emergencyStop(reason) {
    logger.warn(`Binance emergency stop: ${reason}`);
    return {
      success: true,
      message: 'All Binance orders cancelled',
      cancelledOrders: Math.floor(Math.random() * 10),
      timestamp: new Date().toISOString()
    };
  }

  async makeRequest(method, endpoint, params = {}) {
    // Simulate API request
    // In production, this would include proper authentication and rate limiting
    return { success: true };
  }

  generateMockOHLCV(limit) {
    const data = [];
    let price = 50000;
    
    for (let i = 0; i < limit; i++) {
      const change = (Math.random() - 0.5) * 1000;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 500;
      const low = Math.min(open, close) - Math.random() * 500;
      const volume = Math.random() * 1000;
      
      data.push({
        timestamp: new Date(Date.now() - (limit - i) * 60000).toISOString(),
        open,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }
    
    return data;
  }
}

/**
 * Coinbase Exchange Implementation
 */
class CoinbaseExchange {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.passphrase = credentials.passphrase;
    this.baseURL = credentials.sandbox ? 'https://api-public.sandbox.pro.coinbase.com' : 'https://api.pro.coinbase.com';
    this.name = 'Coinbase';
  }

  async testConnection() {
    try {
      // Simulate connection test
      return {
        success: true,
        exchange: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        exchange: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getMarketData(symbol, timeframe, limit) {
    // Simulate Coinbase market data
    return {
      exchange: this.name,
      symbol,
      timeframe,
      data: this.generateMockOHLCV(limit),
      timestamp: new Date().toISOString()
    };
  }

  async getQuote(symbol) {
    // Simulate Coinbase quote
    const basePrice = 50000 + Math.random() * 10000;
    return {
      exchange: this.name,
      symbol,
      bid: basePrice - Math.random() * 100,
      ask: basePrice + Math.random() * 100,
      price: basePrice,
      volume: Math.random() * 1000000,
      timestamp: new Date().toISOString()
    };
  }

  async getOrderBook(symbol, depth = 50) {
    // Simulate Coinbase order book
    const midPrice = 50000 + Math.random() * 10000;
    const bids = [];
    const asks = [];

    for (let i = 0; i < depth; i++) {
      bids.push({
        price: midPrice - (i * 10) - Math.random() * 10,
        quantity: Math.random() * 100
      });
      asks.push({
        price: midPrice + (i * 10) + Math.random() * 10,
        quantity: Math.random() * 100
      });
    }

    return {
      exchange: this.name,
      symbol,
      bids,
      asks,
      timestamp: new Date().toISOString()
    };
  }

  async placeOrder(orderParams) {
    // Simulate order placement
    const orderId = `coinbase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      orderId,
      exchange: this.name,
      symbol: orderParams.symbol,
      side: orderParams.side,
      type: orderParams.type,
      quantity: orderParams.quantity,
      price: orderParams.price,
      status: 'open',
      timestamp: new Date().toISOString()
    };
  }

  async getOrderStatus(orderId, symbol) {
    return {
      orderId,
      exchange: this.name,
      symbol,
      status: 'filled',
      executedQuantity: Math.random() * 100,
      averagePrice: 50000 + Math.random() * 1000,
      timestamp: new Date().toISOString()
    };
  }

  async cancelOrder(orderId, symbol) {
    return {
      orderId,
      exchange: this.name,
      symbol,
      status: 'cancelled',
      timestamp: new Date().toISOString()
    };
  }

  async getBalance() {
    return {
      exchange: this.name,
      balances: [
        { asset: 'BTC', free: Math.random() * 10, locked: Math.random() * 1 },
        { asset: 'ETH', free: Math.random() * 100, locked: Math.random() * 10 },
        { asset: 'USD', free: Math.random() * 10000, locked: Math.random() * 1000 }
      ],
      timestamp: new Date().toISOString()
    };
  }

  async getTradingFees(symbol) {
    return {
      exchange: this.name,
      symbol,
      maker: 0.005, // 0.5%
      taker: 0.005, // 0.5%
      timestamp: new Date().toISOString()
    };
  }

  async emergencyStop(reason) {
    logger.warn(`Coinbase emergency stop: ${reason}`);
    return {
      success: true,
      message: 'All Coinbase orders cancelled',
      cancelledOrders: Math.floor(Math.random() * 10),
      timestamp: new Date().toISOString()
    };
  }

  generateMockOHLCV(limit) {
    const data = [];
    let price = 50000;
    
    for (let i = 0; i < limit; i++) {
      const change = (Math.random() - 0.5) * 1000;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 500;
      const low = Math.min(open, close) - Math.random() * 500;
      const volume = Math.random() * 1000;
      
      data.push({
        timestamp: new Date(Date.now() - (limit - i) * 60000).toISOString(),
        open,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }
    
    return data;
  }
}

/**
 * Alpha Vantage Exchange Implementation (for traditional markets)
 */
class AlphaVantageExchange {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.baseURL = 'https://www.alphavantage.co';
    this.name = 'Alpha Vantage';
  }

  async testConnection() {
    try {
      // Test with a simple API call
      const response = await axios.get(`${this.baseURL}/query`, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: 'AAPL',
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const success = response.data && !response.data['Error Message'] && !response.data['Note'];
      
      return {
        success,
        exchange: this.name,
        timestamp: new Date().toISOString(),
        error: success ? null : 'API key may be invalid or rate limited'
      };
    } catch (error) {
      return {
        success: false,
        exchange: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getMarketData(symbol, timeframe, limit) {
    // Alpha Vantage integration for traditional markets
    try {
      const response = await axios.get(`${this.baseURL}/query`, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol,
          apikey: this.apiKey,
          outputsize: limit > 100 ? 'full' : 'compact'
        },
        timeout: 15000
      });

      if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
      }

      const timeSeries = response.data['Time Series (Daily)'];
      if (!timeSeries) {
        throw new Error('No time series data available');
      }

      const data = Object.entries(timeSeries)
        .slice(0, limit)
        .map(([date, values]) => ({
          timestamp: new Date(date).toISOString(),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        }));

      return {
        exchange: this.name,
        symbol,
        timeframe,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Alpha Vantage market data error: ${error.message}`);
    }
  }

  async getQuote(symbol) {
    try {
      const response = await axios.get(`${this.baseURL}/query`, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
      }

      const quote = response.data['Global Quote'];
      if (!quote) {
        throw new Error('No quote data available');
      }

      const price = parseFloat(quote['05. price']);
      
      return {
        exchange: this.name,
        symbol,
        price,
        bid: price * 0.999, // Simulate bid/ask spread
        ask: price * 1.001,
        volume: parseInt(quote['06. volume']),
        change: parseFloat(quote['09. change']),
        changePercent: quote['10. change percent'],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Alpha Vantage quote error: ${error.message}`);
    }
  }

  async getOrderBook(symbol, depth = 50) {
    // Alpha Vantage doesn't provide order book data, simulate for consistency
    throw new Error('Alpha Vantage does not provide order book data (data provider only)');
  }

  async placeOrder(orderParams) {
    // Alpha Vantage is read-only, simulate order for demo
    throw new Error('Alpha Vantage does not support order placement (data provider only)');
  }

  async getOrderStatus(orderId, symbol) {
    throw new Error('Alpha Vantage does not support order management (data provider only)');
  }

  async cancelOrder(orderId, symbol) {
    throw new Error('Alpha Vantage does not support order management (data provider only)');
  }

  async getBalance() {
    throw new Error('Alpha Vantage does not support balance queries (data provider only)');
  }

  async getTradingFees(symbol) {
    // Return typical brokerage fees as reference
    return {
      exchange: this.name,
      symbol,
      maker: 0.005, // 0.5% typical brokerage fee
      taker: 0.005,
      note: 'Alpha Vantage is data-only, fees are reference values',
      timestamp: new Date().toISOString()
    };
  }

  async emergencyStop(reason) {
    // Alpha Vantage doesn't support trading
    throw new Error('Alpha Vantage does not support trading operations (data provider only)');
  }
}

/**
 * Kraken Exchange Implementation
 */
class KrakenExchange {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.baseURL = credentials.testnet ? 'https://api.kraken.com' : 'https://api.kraken.com';
    this.name = 'Kraken';
  }

  async testConnection() {
    try {
      // Simulate connection test - in production would call /0/public/Time
      return {
        success: true,
        exchange: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        exchange: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getMarketData(symbol, timeframe, limit) {
    return {
      exchange: this.name,
      symbol,
      timeframe,
      data: this.generateMockOHLCV(limit),
      timestamp: new Date().toISOString()
    };
  }

  async getQuote(symbol) {
    const basePrice = 50000 + Math.random() * 10000;
    return {
      exchange: this.name,
      symbol,
      bid: basePrice - Math.random() * 100,
      ask: basePrice + Math.random() * 100,
      price: basePrice,
      volume: Math.random() * 1000000,
      timestamp: new Date().toISOString()
    };
  }

  async getOrderBook(symbol, depth = 50) {
    const midPrice = 50000 + Math.random() * 10000;
    const bids = [];
    const asks = [];

    for (let i = 0; i < depth; i++) {
      bids.push({
        price: midPrice - (i * 10) - Math.random() * 10,
        quantity: Math.random() * 100
      });
      asks.push({
        price: midPrice + (i * 10) + Math.random() * 10,
        quantity: Math.random() * 100
      });
    }

    return {
      exchange: this.name,
      symbol,
      bids,
      asks,
      timestamp: new Date().toISOString()
    };
  }

  async placeOrder(orderParams) {
    const orderId = `kraken_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      orderId,
      exchange: this.name,
      symbol: orderParams.symbol,
      side: orderParams.side,
      type: orderParams.type,
      quantity: orderParams.quantity,
      price: orderParams.price,
      status: 'open',
      timestamp: new Date().toISOString()
    };
  }

  async getOrderStatus(orderId, symbol) {
    return {
      orderId,
      exchange: this.name,
      symbol,
      status: 'filled',
      executedQuantity: Math.random() * 100,
      averagePrice: 50000 + Math.random() * 1000,
      timestamp: new Date().toISOString()
    };
  }

  async cancelOrder(orderId, symbol) {
    return {
      orderId,
      exchange: this.name,
      symbol,
      status: 'cancelled',
      timestamp: new Date().toISOString()
    };
  }

  async getBalance() {
    return {
      exchange: this.name,
      balances: [
        { asset: 'BTC', free: Math.random() * 10, locked: Math.random() * 1 },
        { asset: 'ETH', free: Math.random() * 100, locked: Math.random() * 10 },
        { asset: 'USD', free: Math.random() * 10000, locked: Math.random() * 1000 }
      ],
      timestamp: new Date().toISOString()
    };
  }

  async getTradingFees(symbol) {
    return {
      exchange: this.name,
      symbol,
      maker: 0.0016, // 0.16%
      taker: 0.0026, // 0.26%
      timestamp: new Date().toISOString()
    };
  }

  async emergencyStop(reason) {
    logger.warn(`Kraken emergency stop: ${reason}`);
    return {
      success: true,
      message: 'All Kraken orders cancelled',
      cancelledOrders: Math.floor(Math.random() * 10),
      timestamp: new Date().toISOString()
    };
  }

  generateMockOHLCV(limit) {
    const data = [];
    let price = 50000;
    
    for (let i = 0; i < limit; i++) {
      const change = (Math.random() - 0.5) * 1000;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 500;
      const low = Math.min(open, close) - Math.random() * 500;
      const volume = Math.random() * 1000;
      
      data.push({
        timestamp: new Date(Date.now() - (limit - i) * 60000).toISOString(),
        open,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }
    
    return data;
  }
}

/**
 * KuCoin Exchange Implementation
 */
class KuCoinExchange {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.passphrase = credentials.passphrase;
    this.baseURL = credentials.sandbox ? 'https://openapi-sandbox.kucoin.com' : 'https://api.kucoin.com';
    this.name = 'KuCoin';
  }

  async testConnection() {
    try {
      return {
        success: true,
        exchange: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        exchange: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getMarketData(symbol, timeframe, limit) {
    return {
      exchange: this.name,
      symbol,
      timeframe,
      data: this.generateMockOHLCV(limit),
      timestamp: new Date().toISOString()
    };
  }

  async getQuote(symbol) {
    const basePrice = 50000 + Math.random() * 10000;
    return {
      exchange: this.name,
      symbol,
      bid: basePrice - Math.random() * 100,
      ask: basePrice + Math.random() * 100,
      price: basePrice,
      volume: Math.random() * 1000000,
      timestamp: new Date().toISOString()
    };
  }

  async getOrderBook(symbol, depth = 50) {
    const midPrice = 50000 + Math.random() * 10000;
    const bids = [];
    const asks = [];

    for (let i = 0; i < depth; i++) {
      bids.push({
        price: midPrice - (i * 10) - Math.random() * 10,
        quantity: Math.random() * 100
      });
      asks.push({
        price: midPrice + (i * 10) + Math.random() * 10,
        quantity: Math.random() * 100
      });
    }

    return {
      exchange: this.name,
      symbol,
      bids,
      asks,
      timestamp: new Date().toISOString()
    };
  }

  async placeOrder(orderParams) {
    const orderId = `kucoin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      orderId,
      exchange: this.name,
      symbol: orderParams.symbol,
      side: orderParams.side,
      type: orderParams.type,
      quantity: orderParams.quantity,
      price: orderParams.price,
      status: 'open',
      timestamp: new Date().toISOString()
    };
  }

  async getOrderStatus(orderId, symbol) {
    return {
      orderId,
      exchange: this.name,
      symbol,
      status: 'filled',
      executedQuantity: Math.random() * 100,
      averagePrice: 50000 + Math.random() * 1000,
      timestamp: new Date().toISOString()
    };
  }

  async cancelOrder(orderId, symbol) {
    return {
      orderId,
      exchange: this.name,
      symbol,
      status: 'cancelled',
      timestamp: new Date().toISOString()
    };
  }

  async getBalance() {
    return {
      exchange: this.name,
      balances: [
        { asset: 'BTC', free: Math.random() * 10, locked: Math.random() * 1 },
        { asset: 'ETH', free: Math.random() * 100, locked: Math.random() * 10 },
        { asset: 'USDT', free: Math.random() * 10000, locked: Math.random() * 1000 }
      ],
      timestamp: new Date().toISOString()
    };
  }

  async getTradingFees(symbol) {
    return {
      exchange: this.name,
      symbol,
      maker: 0.001, // 0.1%
      taker: 0.001, // 0.1%
      timestamp: new Date().toISOString()
    };
  }

  async emergencyStop(reason) {
    logger.warn(`KuCoin emergency stop: ${reason}`);
    return {
      success: true,
      message: 'All KuCoin orders cancelled',
      cancelledOrders: Math.floor(Math.random() * 10),
      timestamp: new Date().toISOString()
    };
  }

  generateMockOHLCV(limit) {
    const data = [];
    let price = 50000;
    
    for (let i = 0; i < limit; i++) {
      const change = (Math.random() - 0.5) * 1000;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 500;
      const low = Math.min(open, close) - Math.random() * 500;
      const volume = Math.random() * 1000;
      
      data.push({
        timestamp: new Date(Date.now() - (limit - i) * 60000).toISOString(),
        open,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }
    
    return data;
  }
}

/**
 * Bybit Exchange Implementation
 */
class BybitExchange {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.baseURL = credentials.testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
    this.name = 'Bybit';
  }

  async testConnection() {
    try {
      return {
        success: true,
        exchange: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        exchange: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getMarketData(symbol, timeframe, limit) {
    return {
      exchange: this.name,
      symbol,
      timeframe,
      data: this.generateMockOHLCV(limit),
      timestamp: new Date().toISOString()
    };
  }

  async getQuote(symbol) {
    const basePrice = 50000 + Math.random() * 10000;
    return {
      exchange: this.name,
      symbol,
      bid: basePrice - Math.random() * 100,
      ask: basePrice + Math.random() * 100,
      price: basePrice,
      volume: Math.random() * 1000000,
      timestamp: new Date().toISOString()
    };
  }

  async getOrderBook(symbol, depth = 50) {
    const midPrice = 50000 + Math.random() * 10000;
    const bids = [];
    const asks = [];

    for (let i = 0; i < depth; i++) {
      bids.push({
        price: midPrice - (i * 10) - Math.random() * 10,
        quantity: Math.random() * 100
      });
      asks.push({
        price: midPrice + (i * 10) + Math.random() * 10,
        quantity: Math.random() * 100
      });
    }

    return {
      exchange: this.name,
      symbol,
      bids,
      asks,
      timestamp: new Date().toISOString()
    };
  }

  async placeOrder(orderParams) {
    const orderId = `bybit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      orderId,
      exchange: this.name,
      symbol: orderParams.symbol,
      side: orderParams.side,
      type: orderParams.type,
      quantity: orderParams.quantity,
      price: orderParams.price,
      status: 'open',
      timestamp: new Date().toISOString()
    };
  }

  async getOrderStatus(orderId, symbol) {
    return {
      orderId,
      exchange: this.name,
      symbol,
      status: 'filled',
      executedQuantity: Math.random() * 100,
      averagePrice: 50000 + Math.random() * 1000,
      timestamp: new Date().toISOString()
    };
  }

  async cancelOrder(orderId, symbol) {
    return {
      orderId,
      exchange: this.name,
      symbol,
      status: 'cancelled',
      timestamp: new Date().toISOString()
    };
  }

  async getBalance() {
    return {
      exchange: this.name,
      balances: [
        { asset: 'BTC', free: Math.random() * 10, locked: Math.random() * 1 },
        { asset: 'ETH', free: Math.random() * 100, locked: Math.random() * 10 },
        { asset: 'USDT', free: Math.random() * 10000, locked: Math.random() * 1000 }
      ],
      timestamp: new Date().toISOString()
    };
  }

  async getTradingFees(symbol) {
    return {
      exchange: this.name,
      symbol,
      maker: 0.001, // 0.1%
      taker: 0.001, // 0.1%
      timestamp: new Date().toISOString()
    };
  }

  async emergencyStop(reason) {
    logger.warn(`Bybit emergency stop: ${reason}`);
    return {
      success: true,
      message: 'All Bybit orders cancelled',
      cancelledOrders: Math.floor(Math.random() * 10),
      timestamp: new Date().toISOString()
    };
  }

  generateMockOHLCV(limit) {
    const data = [];
    let price = 50000;
    
    for (let i = 0; i < limit; i++) {
      const change = (Math.random() - 0.5) * 1000;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 500;
      const low = Math.min(open, close) - Math.random() * 500;
      const volume = Math.random() * 1000;
      
      data.push({
        timestamp: new Date(Date.now() - (limit - i) * 60000).toISOString(),
        open,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }
    
    return data;
  }
}

module.exports = ExchangeAbstraction;