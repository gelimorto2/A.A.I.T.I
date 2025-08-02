const { EventEmitter } = require('events');
const axios = require('axios');
const logger = require('./logger');

/**
 * Multi-Exchange Support System
 * Implements unified exchange abstraction layer with:
 * - Binance API integration
 * - Coinbase Pro connectivity  
 * - Cross-exchange arbitrage detection
 * - Unified order management across exchanges
 * - Real-time market data aggregation
 */
class MultiExchangeSupport extends EventEmitter {
  constructor() {
    super();
    
    this.exchanges = new Map();
    this.connections = new Map();
    this.marketData = new Map();  // symbol -> exchange data
    this.orderBooks = new Map();  // symbol -> consolidated order book
    this.arbitrageOpportunities = [];
    
    // Configuration
    this.config = {
      enabledExchanges: ['binance', 'coinbase'],
      arbitrageThreshold: 0.005, // 0.5% minimum arbitrage
      orderBookDepth: 10,
      reconnectInterval: 5000,
      rateLimits: {
        binance: { requests: 1200, window: 60000 }, // 1200 per minute
        coinbase: { requests: 10, window: 1000 }    // 10 per second
      }
    };
    
    // Rate limiting
    this.rateLimiters = new Map();
    
    logger.info('Multi-Exchange Support System initialized');
  }

  /**
   * Initialize all enabled exchanges
   */
  async initialize() {
    logger.info('Initializing multi-exchange support');
    
    try {
      for (const exchangeName of this.config.enabledExchanges) {
        await this.initializeExchange(exchangeName);
      }
      
      // Start arbitrage monitoring
      this.startArbitrageMonitoring();
      
      // Start market data aggregation
      this.startMarketDataAggregation();
      
      logger.info('Multi-exchange support initialized successfully', {
        enabledExchanges: this.config.enabledExchanges
      });
      
      this.emit('initialized', { exchanges: this.config.enabledExchanges });
      
    } catch (error) {
      logger.error('Error initializing multi-exchange support:', error);
      throw error;
    }
  }

  /**
   * Initialize a specific exchange
   */
  async initializeExchange(exchangeName) {
    logger.info(`Initializing ${exchangeName} exchange`);
    
    try {
      let exchange;
      
      switch (exchangeName.toLowerCase()) {
        case 'binance':
          exchange = await this.initializeBinance();
          break;
        case 'coinbase':
          exchange = await this.initializeCoinbase();
          break;
        default:
          throw new Error(`Unsupported exchange: ${exchangeName}`);
      }
      
      this.exchanges.set(exchangeName, exchange);
      this.initializeRateLimiter(exchangeName);
      
      logger.info(`${exchangeName} exchange initialized successfully`);
      
    } catch (error) {
      logger.error(`Error initializing ${exchangeName} exchange:`, error);
      throw error;
    }
  }

  /**
   * Initialize Binance exchange connection
   */
  async initializeBinance() {
    const binanceConfig = {
      name: 'binance',
      apiUrl: 'https://api.binance.com',
      wsUrl: 'wss://stream.binance.com:9443/ws',
      endpoints: {
        exchangeInfo: '/api/v3/exchangeInfo',
        ticker24hr: '/api/v3/ticker/24hr',
        depth: '/api/v3/depth',
        trades: '/api/v3/trades',
        klines: '/api/v3/klines'
      },
      symbols: [],
      status: 'initializing'
    };

    // Get exchange info and available symbols
    try {
      const response = await axios.get(`${binanceConfig.apiUrl}${binanceConfig.endpoints.exchangeInfo}`);
      binanceConfig.symbols = response.data.symbols
        .filter(symbol => symbol.status === 'TRADING')
        .map(symbol => ({
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          minQty: parseFloat(symbol.filters.find(f => f.filterType === 'LOT_SIZE')?.minQty || '0'),
          tickSize: parseFloat(symbol.filters.find(f => f.filterType === 'PRICE_FILTER')?.tickSize || '0')
        }));
      
      binanceConfig.status = 'connected';
      
      logger.info('Binance exchange info loaded', {
        symbolCount: binanceConfig.symbols.length
      });
      
      return binanceConfig;
      
    } catch (error) {
      logger.error('Error initializing Binance:', error);
      throw error;
    }
  }

  /**
   * Initialize Coinbase Pro exchange connection
   */
  async initializeCoinbase() {
    const coinbaseConfig = {
      name: 'coinbase',
      apiUrl: 'https://api.exchange.coinbase.com',
      wsUrl: 'wss://ws-feed.exchange.coinbase.com',
      endpoints: {
        products: '/products',
        ticker: '/products/{symbol}/ticker',
        orderBook: '/products/{symbol}/book',
        trades: '/products/{symbol}/trades',
        candles: '/products/{symbol}/candles'
      },
      symbols: [],
      status: 'initializing'
    };

    // Get available products/symbols
    try {
      const response = await axios.get(`${coinbaseConfig.apiUrl}${coinbaseConfig.endpoints.products}`);
      coinbaseConfig.symbols = response.data
        .filter(product => product.status === 'online')
        .map(product => ({
          symbol: product.id,
          baseAsset: product.base_currency,
          quoteAsset: product.quote_currency,
          minQty: parseFloat(product.min_market_funds || '0'),
          tickSize: parseFloat(product.quote_increment || '0')
        }));
      
      coinbaseConfig.status = 'connected';
      
      logger.info('Coinbase Pro exchange info loaded', {
        symbolCount: coinbaseConfig.symbols.length
      });
      
      return coinbaseConfig;
      
    } catch (error) {
      logger.error('Error initializing Coinbase Pro:', error);
      throw error;
    }
  }

  /**
   * Initialize rate limiter for an exchange
   */
  initializeRateLimiter(exchangeName) {
    const limits = this.config.rateLimits[exchangeName];
    if (!limits) return;
    
    const rateLimiter = {
      requests: [],
      maxRequests: limits.requests,
      windowMs: limits.window,
      
      canMakeRequest() {
        const now = Date.now();
        // Remove old requests outside the window
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        return this.requests.length < this.maxRequests;
      },
      
      recordRequest() {
        this.requests.push(Date.now());
      }
    };
    
    this.rateLimiters.set(exchangeName, rateLimiter);
  }

  /**
   * Make rate-limited API request
   */
  async makeRateLimitedRequest(exchangeName, url, options = {}) {
    const rateLimiter = this.rateLimiters.get(exchangeName);
    
    if (rateLimiter && !rateLimiter.canMakeRequest()) {
      const waitTime = rateLimiter.windowMs / rateLimiter.maxRequests;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    try {
      const response = await axios.get(url, options);
      
      if (rateLimiter) {
        rateLimiter.recordRequest();
      }
      
      return response;
      
    } catch (error) {
      logger.error(`Rate-limited request failed for ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Get consolidated market data across all exchanges
   */
  async getConsolidatedMarketData(symbol) {
    const marketData = {};
    
    for (const [exchangeName, exchange] of this.exchanges.entries()) {
      try {
        const data = await this.getExchangeMarketData(exchangeName, symbol);
        if (data) {
          marketData[exchangeName] = data;
        }
      } catch (error) {
        logger.warn(`Failed to get market data from ${exchangeName}:`, error);
      }
    }
    
    return marketData;
  }

  /**
   * Get market data from a specific exchange
   */
  async getExchangeMarketData(exchangeName, symbol) {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} not initialized`);
    }

    try {
      switch (exchangeName.toLowerCase()) {
        case 'binance':
          return await this.getBinanceMarketData(symbol);
        case 'coinbase':
          return await this.getCoinbaseMarketData(symbol);
        default:
          throw new Error(`Market data not implemented for ${exchangeName}`);
      }
    } catch (error) {
      logger.error(`Error getting market data from ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Get Binance market data
   */
  async getBinanceMarketData(symbol) {
    const exchange = this.exchanges.get('binance');
    const binanceSymbol = this.normalizeSymbolForBinance(symbol);
    
    // Get ticker data
    const tickerUrl = `${exchange.apiUrl}/api/v3/ticker/24hr?symbol=${binanceSymbol}`;
    const tickerResponse = await this.makeRateLimitedRequest('binance', tickerUrl);
    
    // Get order book
    const depthUrl = `${exchange.apiUrl}/api/v3/depth?symbol=${binanceSymbol}&limit=${this.config.orderBookDepth}`;
    const depthResponse = await this.makeRateLimitedRequest('binance', depthUrl);
    
    return {
      symbol: binanceSymbol,
      exchange: 'binance',
      price: parseFloat(tickerResponse.data.lastPrice),
      bid: parseFloat(depthResponse.data.bids[0][0]),
      ask: parseFloat(depthResponse.data.asks[0][0]),
      volume: parseFloat(tickerResponse.data.volume),
      change24h: parseFloat(tickerResponse.data.priceChangePercent),
      timestamp: Date.now(),
      orderBook: {
        bids: depthResponse.data.bids.slice(0, this.config.orderBookDepth).map(([price, qty]) => ({
          price: parseFloat(price),
          quantity: parseFloat(qty)
        })),
        asks: depthResponse.data.asks.slice(0, this.config.orderBookDepth).map(([price, qty]) => ({
          price: parseFloat(price),
          quantity: parseFloat(qty)
        }))
      }
    };
  }

  /**
   * Get Coinbase market data
   */
  async getCoinbaseMarketData(symbol) {
    const exchange = this.exchanges.get('coinbase');
    const coinbaseSymbol = this.normalizeSymbolForCoinbase(symbol);
    
    // Get ticker data
    const tickerUrl = `${exchange.apiUrl}/products/${coinbaseSymbol}/ticker`;
    const tickerResponse = await this.makeRateLimitedRequest('coinbase', tickerUrl);
    
    // Get order book
    const bookUrl = `${exchange.apiUrl}/products/${coinbaseSymbol}/book?level=2`;
    const bookResponse = await this.makeRateLimitedRequest('coinbase', bookUrl);
    
    return {
      symbol: coinbaseSymbol,
      exchange: 'coinbase',
      price: parseFloat(tickerResponse.data.price),
      bid: parseFloat(tickerResponse.data.bid),
      ask: parseFloat(tickerResponse.data.ask),
      volume: parseFloat(tickerResponse.data.volume),
      change24h: 0, // Coinbase doesn't provide 24h change in ticker
      timestamp: Date.now(),
      orderBook: {
        bids: bookResponse.data.bids.slice(0, this.config.orderBookDepth).map(([price, qty]) => ({
          price: parseFloat(price),
          quantity: parseFloat(qty)
        })),
        asks: bookResponse.data.asks.slice(0, this.config.orderBookDepth).map(([price, qty]) => ({
          price: parseFloat(price),
          quantity: parseFloat(qty)
        }))
      }
    };
  }

  /**
   * Detect arbitrage opportunities across exchanges
   */
  async detectArbitrageOpportunities(symbols) {
    const opportunities = [];
    
    for (const symbol of symbols) {
      try {
        const marketData = await this.getConsolidatedMarketData(symbol);
        const exchanges = Object.keys(marketData);
        
        // Compare all exchange pairs
        for (let i = 0; i < exchanges.length; i++) {
          for (let j = i + 1; j < exchanges.length; j++) {
            const exchange1 = exchanges[i];
            const exchange2 = exchanges[j];
            
            const data1 = marketData[exchange1];
            const data2 = marketData[exchange2];
            
            // Calculate arbitrage opportunities
            const opportunity1 = this.calculateArbitrage(data1, data2, exchange1, exchange2);
            const opportunity2 = this.calculateArbitrage(data2, data1, exchange2, exchange1);
            
            if (opportunity1.profitPercent >= this.config.arbitrageThreshold) {
              opportunities.push(opportunity1);
            }
            
            if (opportunity2.profitPercent >= this.config.arbitrageThreshold) {
              opportunities.push(opportunity2);
            }
          }
        }
        
      } catch (error) {
        logger.warn(`Error detecting arbitrage for ${symbol}:`, error);
      }
    }
    
    // Sort by profit percentage
    opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
    
    return opportunities;
  }

  /**
   * Calculate arbitrage between two exchanges
   */
  calculateArbitrage(buyData, sellData, buyExchange, sellExchange) {
    const buyPrice = buyData.ask; // Price to buy at
    const sellPrice = sellData.bid; // Price to sell at
    
    const profitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
    const maxQuantity = Math.min(
      buyData.orderBook.asks[0].quantity,
      sellData.orderBook.bids[0].quantity
    );
    
    return {
      symbol: buyData.symbol,
      buyExchange,
      sellExchange,
      buyPrice,
      sellPrice,
      profitPercent,
      maxQuantity,
      potentialProfit: (sellPrice - buyPrice) * maxQuantity,
      timestamp: Date.now()
    };
  }

  /**
   * Start arbitrage monitoring
   */
  startArbitrageMonitoring() {
    const monitoringInterval = 10000; // 10 seconds
    
    setInterval(async () => {
      try {
        // Get common symbols across exchanges
        const commonSymbols = this.getCommonSymbols();
        const topSymbols = commonSymbols.slice(0, 10); // Monitor top 10 symbols
        
        const opportunities = await this.detectArbitrageOpportunities(topSymbols);
        
        if (opportunities.length > 0) {
          this.arbitrageOpportunities = opportunities;
          
          logger.info('Arbitrage opportunities detected', {
            count: opportunities.length,
            topOpportunity: opportunities[0]
          });
          
          this.emit('arbitrageOpportunities', opportunities);
        }
        
      } catch (error) {
        logger.error('Error in arbitrage monitoring:', error);
      }
    }, monitoringInterval);
  }

  /**
   * Start market data aggregation
   */
  startMarketDataAggregation() {
    const aggregationInterval = 5000; // 5 seconds
    
    setInterval(async () => {
      try {
        const commonSymbols = this.getCommonSymbols().slice(0, 20); // Top 20 symbols
        
        for (const symbol of commonSymbols) {
          const consolidatedData = await this.getConsolidatedMarketData(symbol);
          
          if (Object.keys(consolidatedData).length > 0) {
            this.marketData.set(symbol, {
              ...consolidatedData,
              aggregatedAt: Date.now()
            });
            
            this.emit('marketDataUpdate', {
              symbol,
              data: consolidatedData
            });
          }
        }
        
      } catch (error) {
        logger.error('Error in market data aggregation:', error);
      }
    }, aggregationInterval);
  }

  /**
   * Get symbols common across all exchanges
   */
  getCommonSymbols() {
    if (this.exchanges.size === 0) return [];
    
    const exchangeSymbols = Array.from(this.exchanges.values())
      .map(exchange => new Set(exchange.symbols.map(s => this.normalizeSymbol(s.symbol))));
    
    // Find intersection of all symbol sets
    let commonSymbols = exchangeSymbols[0];
    for (let i = 1; i < exchangeSymbols.length; i++) {
      commonSymbols = new Set([...commonSymbols].filter(symbol => exchangeSymbols[i].has(symbol)));
    }
    
    return Array.from(commonSymbols);
  }

  /**
   * Unified order placement across exchanges
   */
  async placeOrder(exchangeName, orderRequest) {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} not initialized`);
    }

    logger.info('Placing order on exchange', {
      exchange: exchangeName,
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      quantity: orderRequest.quantity,
      price: orderRequest.price
    });

    try {
      switch (exchangeName.toLowerCase()) {
        case 'binance':
          return await this.placeBinanceOrder(orderRequest);
        case 'coinbase':
          return await this.placeCoinbaseOrder(orderRequest);
        default:
          throw new Error(`Order placement not implemented for ${exchangeName}`);
      }
    } catch (error) {
      logger.error(`Error placing order on ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Place order on Binance (mock implementation for demo)
   */
  async placeBinanceOrder(orderRequest) {
    // In a real implementation, this would use authenticated API calls
    // For demo purposes, we'll return a mock response
    
    const orderId = `binance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      orderId,
      exchange: 'binance',
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      type: orderRequest.type || 'LIMIT',
      quantity: orderRequest.quantity,
      price: orderRequest.price,
      status: 'NEW',
      timestamp: Date.now(),
      mock: true // Indicates this is a mock order
    };
  }

  /**
   * Place order on Coinbase (mock implementation for demo)
   */
  async placeCoinbaseOrder(orderRequest) {
    // In a real implementation, this would use authenticated API calls
    // For demo purposes, we'll return a mock response
    
    const orderId = `coinbase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      orderId,
      exchange: 'coinbase',
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      type: orderRequest.type || 'limit',
      quantity: orderRequest.quantity,
      price: orderRequest.price,
      status: 'pending',
      timestamp: Date.now(),
      mock: true // Indicates this is a mock order
    };
  }

  /**
   * Execute arbitrage trade
   */
  async executeArbitrageTrade(opportunity) {
    logger.info('Executing arbitrage trade', opportunity);
    
    try {
      const quantity = Math.min(opportunity.maxQuantity, 1.0); // Limit quantity for safety
      
      // Place buy order on cheaper exchange
      const buyOrder = await this.placeOrder(opportunity.buyExchange, {
        symbol: opportunity.symbol,
        side: 'BUY',
        type: 'MARKET',
        quantity
      });
      
      // Place sell order on more expensive exchange
      const sellOrder = await this.placeOrder(opportunity.sellExchange, {
        symbol: opportunity.symbol,
        side: 'SELL',
        type: 'MARKET',
        quantity
      });
      
      const arbitrageTrade = {
        id: `arbitrage_${Date.now()}`,
        opportunity,
        buyOrder,
        sellOrder,
        quantity,
        expectedProfit: opportunity.potentialProfit,
        status: 'EXECUTED',
        timestamp: Date.now()
      };
      
      logger.info('Arbitrage trade executed successfully', arbitrageTrade);
      
      this.emit('arbitrageTradeExecuted', arbitrageTrade);
      
      return arbitrageTrade;
      
    } catch (error) {
      logger.error('Error executing arbitrage trade:', error);
      throw error;
    }
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    const exchangeStatuses = {};
    for (const [name, exchange] of this.exchanges.entries()) {
      exchangeStatuses[name] = {
        status: exchange.status,
        symbolCount: exchange.symbols.length,
        lastUpdate: exchange.lastUpdate || null
      };
    }
    
    return {
      exchanges: exchangeStatuses,
      arbitrageOpportunities: this.arbitrageOpportunities.length,
      marketDataSymbols: this.marketData.size,
      commonSymbols: this.getCommonSymbols().length,
      rateLimiters: Object.fromEntries(
        Array.from(this.rateLimiters.entries()).map(([name, limiter]) => [
          name,
          {
            requestsInWindow: limiter.requests.length,
            maxRequests: limiter.maxRequests
          }
        ])
      )
    };
  }

  /**
   * Symbol normalization utilities
   */
  normalizeSymbol(symbol) {
    // Convert to standard format (e.g., BTCUSDT)
    return symbol.replace(/[-_/]/g, '').toUpperCase();
  }

  normalizeSymbolForBinance(symbol) {
    return this.normalizeSymbol(symbol);
  }

  normalizeSymbolForCoinbase(symbol) {
    // Coinbase uses dash format (e.g., BTC-USD)
    const normalized = this.normalizeSymbol(symbol);
    if (normalized.endsWith('USDT')) {
      return normalized.replace('USDT', 'USD').replace(/(.+)USD$/, '$1-USD');
    }
    if (normalized.endsWith('USD')) {
      return normalized.replace(/(.+)USD$/, '$1-USD');
    }
    return normalized.replace(/(.{3,4})(.+)$/, '$1-$2');
  }

  /**
   * Shutdown the system
   */
  async shutdown() {
    logger.info('Shutting down multi-exchange support');
    
    // Close all connections
    for (const [name, connection] of this.connections.entries()) {
      if (connection && connection.close) {
        connection.close();
      }
    }
    
    this.exchanges.clear();
    this.connections.clear();
    this.marketData.clear();
    this.arbitrageOpportunities = [];
    
    this.emit('shutdown');
    
    logger.info('Multi-exchange support shutdown complete');
  }
}

module.exports = new MultiExchangeSupport();