const axios = require('axios');
const logger = require('./logger');
const { getCredentials } = require('./credentials');
const { getPerformanceMonitor } = require('./performanceMonitor');

class MarketDataService {
  constructor() {
    this.credentials = getCredentials('trading');
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
    this.rateLimitDelay = 1200; // 1.2 seconds between requests (CoinGecko free tier allows 50/min)
    this.lastRequestTime = 0;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.maxRetries = 3;
    this.symbols = ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 'polkadot', 'dogecoin', 'chainlink', 'polygon'];
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    
    // Performance monitoring
    this.performanceMonitor = getPerformanceMonitor();
    this.requestStats = {
      total: 0,
      cached: 0,
      failed: 0,
      avgResponseTime: 0
    };
    
    logger.info('MarketDataService initialized with enhanced rate limiting and performance monitoring', { 
      service: 'market-data',
      cacheTimeout: this.cacheTimeout,
      rateLimitDelay: this.rateLimitDelay,
      supportedSymbols: this.symbols.length,
      performanceMonitoring: true
    });
  }

  /**
   * Rate-limited request wrapper
   */
  async makeRateLimitedRequest(requestFunction) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFunction, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process request queue with rate limiting
   */
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const { requestFunction, resolve, reject } = this.requestQueue.shift();
      
      try {
        // Ensure rate limit compliance
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.rateLimitDelay) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
        }

        this.lastRequestTime = Date.now();
        const result = await requestFunction();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
  }

  /**
   * Enhanced retry mechanism with exponential backoff
   */
  async retryRequest(requestFunction, retries = 0) {
    try {
      return await requestFunction();
    } catch (error) {
      if (retries < this.maxRetries && (error.response?.status === 429 || error.code === 'ECONNRESET')) {
        const delay = Math.pow(2, retries) * 1000; // Exponential backoff
        logger.warn(`Request failed, retrying in ${delay}ms`, { 
          retries, 
          error: error.message,
          service: 'market-data'
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(requestFunction, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Validate symbol format and convert to CoinGecko format
   */
  validateAndConvertSymbol(symbol) {
    // Convert common symbols to CoinGecko IDs
    const symbolMap = {
      'BTC': 'bitcoin',
      'BTC-USD': 'bitcoin',
      'ETH': 'ethereum', 
      'ETH-USD': 'ethereum',
      'BNB': 'binancecoin',
      'ADA': 'cardano',
      'SOL': 'solana',
      'DOT': 'polkadot',
      'DOGE': 'dogecoin',
      'LINK': 'chainlink',
      'MATIC': 'polygon'
    };

    const convertedSymbol = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
    logger.debug('Symbol conversion', { 
      original: symbol, 
      converted: convertedSymbol,
      service: 'market-data'
    });
    
    return convertedSymbol;
  }

  /**
   * Fetch real-time quote data from CoinGecko with rate limiting and performance monitoring
   */
  async getQuote(symbol) {
    const scriptName = `marketData.getQuote[${symbol}]`;
    
    return await this.performanceMonitor.monitorScript(scriptName, async () => {
      try {
        this.requestStats.total++;
        const startTime = Date.now();
        const convertedSymbol = this.validateAndConvertSymbol(symbol);
        const cacheKey = `quote_${convertedSymbol}`;
        
        logger.debug('Fetching quote data', { 
          symbol: convertedSymbol, 
          originalSymbol: symbol,
          cacheKey,
          service: 'market-data'
        });
        
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
          this.requestStats.cached++;
          logger.debug('Returning cached quote data', { 
            symbol: convertedSymbol, 
            cacheAge: Date.now() - cached.timestamp,
            service: 'market-data'
          });
          return cached.data;
        }

        // Make rate-limited request with performance monitoring
        const response = await this.performanceMonitor.monitorAPICall(
          `coingecko.simple.price[${convertedSymbol}]`,
          async () => {
            return this.makeRateLimitedRequest(async () => {
              return this.retryRequest(async () => {
                return axios.get(`${this.baseUrl}/simple/price`, {
                  params: {
                    ids: convertedSymbol,
                    vs_currencies: 'usd',
                    include_24hr_change: 'true',
                    include_24hr_vol: 'true',
                    include_last_updated_at: 'true'
                  },
                  timeout: 15000,
                  headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'AAITI-Trading-Bot/1.1.0'
                  }
                });
              });
            });
          }
        );

        const data = response.data[convertedSymbol];
      
        if (!data) {
          logger.warn('No data available for symbol', { 
            symbol: convertedSymbol, 
            originalSymbol: symbol,
            service: 'market-data'
          });
          throw new Error(`No data available for symbol: ${symbol}`);
        }

        const quote = {
          symbol: convertedSymbol,
          originalSymbol: symbol,
          price: data.usd,
          change: data.usd_24h_change || 0,
          changePercent: data.usd_24h_change || 0,
          volume: data.usd_24h_vol || 0,
          lastUpdated: new Date(data.last_updated_at ? data.last_updated_at * 1000 : Date.now()).toISOString(),
          lastRefreshed: new Date().toISOString(),
          provider: 'CoinGecko',
          isReal: true
        };

        // Cache the result
        this.cache.set(cacheKey, {
          data: quote,
          timestamp: Date.now()
        });

        const responseTime = Date.now() - startTime;
        this.updateRequestStats(responseTime);
        
        logger.info('Successfully fetched quote data', { 
          symbol: convertedSymbol, 
          price: quote.price,
          change: quote.change,
          responseTime: `${responseTime}ms`,
          service: 'market-data'
        });

        return quote;
      } catch (error) {
        this.requestStats.failed++;
        logger.error('Error fetching quote data', { 
        symbol, 
        error: error.message,
        status: error.response?.status,
        stack: error.stack,
        service: 'market-data'
      });
      
      // Return mock data as fallback
      logger.info('Falling back to mock data', { symbol, service: 'market-data' });
      return this.getMockQuote(symbol);
      }
    });
  }

  /**
   * Update request statistics for performance monitoring
   */
  updateRequestStats(responseTime) {
    this.requestStats.avgResponseTime = 
      (this.requestStats.avgResponseTime + responseTime) / 2;
  }

  /**
   * Get request statistics
   */
  getRequestStats() {
    return {
      ...this.requestStats,
      successRate: this.requestStats.total > 0 
        ? ((this.requestStats.total - this.requestStats.failed) / this.requestStats.total) * 100
        : 100,
      cacheHitRate: this.requestStats.total > 0
        ? (this.requestStats.cached / this.requestStats.total) * 100
        : 0
    };
  }

  /**
   * Fetch historical data from CoinGecko
   */
  async getHistoricalData(symbol, interval = 'daily', outputSize = 'compact') {
    try {
      const startTime = Date.now();
      const convertedSymbol = this.validateAndConvertSymbol(symbol);
      const cacheKey = `history_${convertedSymbol}_${interval}_${outputSize}`;
      
      logger.debug('Fetching historical data', { 
        symbol: convertedSymbol, 
        originalSymbol: symbol,
        interval,
        outputSize,
        cacheKey,
        service: 'market-data'
      });
      
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout * 5) { // 5 min cache for historical
        logger.debug('Returning cached historical data', { 
          symbol: convertedSymbol, 
          cacheAge: Date.now() - cached.timestamp,
          service: 'market-data'
        });
        return cached.data;
      }

      // Determine days parameter based on interval
      let days = 30;
      switch (interval) {
        case '1min':
        case 'hourly':
          days = 1;
          break;
        case 'daily':
          days = outputSize === 'full' ? 365 : 30;
          break;
        case 'weekly':
          days = 90;
          break;
        case 'monthly':
          days = 365;
          break;
      }

      // CoinGecko market chart endpoint
      const response = await axios.get(`${this.baseUrl}/coins/${convertedSymbol}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: interval === '1min' ? 'minutely' : 'daily'
        },
        timeout: 15000
      });

      const prices = response.data.prices || [];
      const volumes = response.data.total_volumes || [];
      
      if (prices.length === 0) {
        logger.warn('No historical data available', { 
          symbol: convertedSymbol, 
          originalSymbol: symbol,
          service: 'market-data'
        });
        throw new Error(`No historical data available for symbol: ${symbol}`);
      }

      const historicalData = prices.slice(0, 100).map((pricePoint, index) => {
        const [timestamp, price] = pricePoint;
        const volume = volumes[index] ? volumes[index][1] : 0;
        const date = new Date(timestamp);
        
        return {
          date: date.toISOString().split('T')[0],
          timestamp: timestamp,
          close: Number(price.toFixed(8)),
          volume: Number(volume.toFixed(0)),
          open: Number(price.toFixed(8)), // CoinGecko doesn't provide OHLC, using close as approximation
          high: Number(price.toFixed(8)),
          low: Number(price.toFixed(8))
        };
      }).reverse(); // Most recent first

      const result = {
        symbol: convertedSymbol,
        originalSymbol: symbol,
        interval,
        data: historicalData,
        lastRefreshed: new Date().toISOString(),
        provider: 'CoinGecko',
        dataPoints: historicalData.length
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      const responseTime = Date.now() - startTime;
      logger.info('Successfully fetched historical data', { 
        symbol: convertedSymbol, 
        dataPoints: historicalData.length,
        interval,
        responseTime: `${responseTime}ms`,
        service: 'market-data'
      });

      return result;
    } catch (error) {
      logger.error('Error fetching historical data', { 
        symbol, 
        interval,
        error: error.message,
        stack: error.stack,
        service: 'market-data'
      });
      
      // Return mock historical data as fallback
      logger.info('Falling back to mock historical data', { symbol, interval, service: 'market-data' });
      return this.getMockHistoricalData(symbol, interval);
    }
  }

  /**
   * Get multiple quotes at once
   */
  async getMultipleQuotes(symbols) {
    const startTime = Date.now();
    logger.info('Fetching multiple quotes (batched)', {
      symbolCount: symbols.length,
      symbols,
      service: 'market-data'
    });

    // Normalize & convert symbols first
    const convertedSymbols = symbols.map(s => this.validateAndConvertSymbol(s));
    const unique = Array.from(new Set(convertedSymbols));
    const cacheHits = [];
    const toFetch = [];
    const now = Date.now();

    unique.forEach(sym => {
      const cacheKey = `quote_${sym}`;
      const cached = this.cache.get(cacheKey);
      if (cached && (now - cached.timestamp) < this.cacheTimeout) {
        cacheHits.push({ sym, data: cached.data });
      } else {
        toFetch.push(sym);
      }
    });

    let fetchedMap = {};
    if (toFetch.length > 0) {
      try {
        // Respect rate limiting by using existing queue & retry wrappers
        const response = await this.performanceMonitor.monitorAPICall(
          `coingecko.simple.price[batch:${toFetch.length}]`,
          async () => {
            return this.makeRateLimitedRequest(async () => {
              return this.retryRequest(async () => {
                return axios.get(`${this.baseUrl}/simple/price`, {
                  params: {
                    ids: toFetch.join(','),
                    vs_currencies: 'usd',
                    include_24hr_change: 'true',
                    include_24hr_vol: 'true',
                    include_last_updated_at: 'true'
                  },
                  timeout: 15000,
                  headers: { 'Accept': 'application/json', 'User-Agent': 'AAITI-Trading-Bot/1.1.0' }
                });
              });
            });
          }
        );
        fetchedMap = response.data || {};
        // Cache fetched results
        Object.entries(fetchedMap).forEach(([sym, data]) => {
          const quote = {
            symbol: sym,
            originalSymbol: sym,
            price: data.usd,
            change: data.usd_24h_change || 0,
            changePercent: data.usd_24h_change || 0,
            volume: data.usd_24h_vol || 0,
            lastUpdated: new Date(data.last_updated_at ? data.last_updated_at * 1000 : Date.now()).toISOString(),
            lastRefreshed: new Date().toISOString(),
            provider: 'CoinGecko',
            isReal: true
          };
          this.cache.set(`quote_${sym}`, { data: quote, timestamp: Date.now() });
        });
      } catch (error) {
        logger.error('Batched quote fetch failed, falling back to individual + mock', {
          error: error.message,
          toFetchCount: toFetch.length,
          service: 'market-data'
        });
        // Fallback: individual (still rate limited) or mock
        for (const sym of toFetch) {
          try {
            const q = await this.getQuote(sym); // will use existing logic
            fetchedMap[sym] = { usd: q.price, usd_24h_change: q.change, usd_24h_vol: q.volume, last_updated_at: Date.now()/1000 };
          } catch (e) {
            const mq = this.getMockQuote(sym);
            fetchedMap[sym] = { usd: mq.price, usd_24h_change: mq.change, usd_24h_vol: mq.volume, last_updated_at: Date.now()/1000 };
          }
        }
      }
    }

    const results = symbols.map(original => {
      const conv = this.validateAndConvertSymbol(original);
      const cacheEntry = this.cache.get(`quote_${conv}`);
      return {
        symbol: original,
        success: Boolean(cacheEntry),
        data: cacheEntry ? cacheEntry.data : null,
        error: cacheEntry ? null : 'No data'
      };
    });

    const successCount = results.filter(r => r.success).length;
    const responseTime = Date.now() - startTime;
    logger.info('Completed batched multiple quotes fetch', {
      totalSymbols: symbols.length,
      batchedFetched: toFetch.length,
      cacheHits: cacheHits.length,
      successCount,
      failureCount: symbols.length - successCount,
      responseTime: `${responseTime}ms`,
      service: 'market-data'
    });
    return results;
  }

  /**
   * Search for crypto symbols using CoinGecko
   */
  async searchSymbols(keywords) {
    try {
      const startTime = Date.now();
      logger.debug('Searching for symbols', { keywords, service: 'market-data' });
      
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          query: keywords
        },
        timeout: 10000
      });

      const coins = response.data.coins || [];
      
      const results = coins.slice(0, 10).map(coin => ({
        symbol: coin.id,
        name: coin.name,
        ticker: coin.symbol?.toUpperCase(),
        marketCapRank: coin.market_cap_rank,
        thumb: coin.thumb,
        large: coin.large
      }));

      const responseTime = Date.now() - startTime;
      logger.info('Symbol search completed', { 
        keywords, 
        resultsCount: results.length,
        responseTime: `${responseTime}ms`,
        service: 'market-data'
      });

      return results;
    } catch (error) {
      logger.error('Error searching symbols', { 
        keywords, 
        error: error.message,
        service: 'market-data'
      });
      return [];
    }
  }

  /**
   * Mock quote data for fallback
   */
  getMockQuote(symbol) {
    const convertedSymbol = this.validateAndConvertSymbol(symbol);
    const basePrice = 100 + Math.random() * 500;
    const change = (Math.random() - 0.5) * 10;
    
    logger.debug('Generating mock quote data', { 
      symbol: convertedSymbol, 
      originalSymbol: symbol,
      service: 'market-data'
    });
    
    return {
      symbol: convertedSymbol,
      originalSymbol: symbol,
      price: Number((basePrice + change).toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(((change / basePrice) * 100).toFixed(2)),
      volume: Math.floor(Math.random() * 10000000),
      high: Number((basePrice + Math.abs(change) + Math.random() * 5).toFixed(2)),
      low: Number((basePrice - Math.abs(change) - Math.random() * 5).toFixed(2)),
      open: Number((basePrice + (Math.random() - 0.5) * 5).toFixed(2)),
      previousClose: Number(basePrice.toFixed(2)),
      timestamp: new Date().toISOString().split('T')[0],
      lastRefreshed: new Date().toISOString(),
      isMock: true,
      provider: 'Mock'
    };
  }

  /**
   * Mock historical data for fallback
   */
  getMockHistoricalData(symbol, interval) {
    const convertedSymbol = this.validateAndConvertSymbol(symbol);
    const data = [];
    const basePrice = 100 + Math.random() * 500;
    
    logger.debug('Generating mock historical data', { 
      symbol: convertedSymbol, 
      originalSymbol: symbol,
      interval,
      service: 'market-data'
    });
    
    for (let i = 99; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const volatility = Math.random() * 10;
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;
      
      data.push({
        date: date.toISOString().split('T')[0],
        timestamp: date.getTime(),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(Math.random() * 1000000)
      });
    }
    
    return {
      symbol: convertedSymbol,
      originalSymbol: symbol,
      interval,
      data,
      lastRefreshed: new Date().toISOString(),
      isMock: true,
      provider: 'Mock',
      dataPoints: data.length
    };
  }

  /**
   * Get popular trading symbols
   */
  getPopularSymbols() {
    logger.debug('Returning popular crypto symbols', { 
      symbolCount: this.symbols.length,
      service: 'market-data'
    });
    return this.symbols;
  }

  /**
   * Clear cache
   */
  clearCache() {
    const cacheSize = this.cache.size;
    this.cache.clear();
    logger.info('Market data cache cleared', { 
      previousCacheSize: cacheSize,
      service: 'market-data'
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      entries: []
    };

    for (const [key, value] of this.cache.entries()) {
      stats.entries.push({
        key,
        age: Date.now() - value.timestamp,
        expired: (Date.now() - value.timestamp) > this.cacheTimeout
      });
    }

    logger.debug('Cache statistics', { stats, service: 'market-data' });
    return stats;
  }
}

module.exports = new MarketDataService();