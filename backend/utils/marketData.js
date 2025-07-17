const axios = require('axios');
const logger = require('./logger');
const { getCredentials } = require('./credentials');

class MarketDataService {
  constructor() {
    this.credentials = getCredentials('trading');
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
    this.symbols = ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 'polkadot', 'dogecoin', 'chainlink', 'polygon'];
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    logger.info('MarketDataService initialized with CoinGecko API', { 
      service: 'market-data',
      cacheTimeout: this.cacheTimeout,
      supportedSymbols: this.symbols.length 
    });
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
   * Fetch real-time quote data from CoinGecko
   */
  async getQuote(symbol) {
    try {
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
        logger.debug('Returning cached quote data', { 
          symbol: convertedSymbol, 
          cacheAge: Date.now() - cached.timestamp,
          service: 'market-data'
        });
        return cached.data;
      }

      // CoinGecko simple price endpoint (no API key required)
      const response = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: convertedSymbol,
          vs_currencies: 'usd',
          include_24hr_change: 'true',
          include_24hr_vol: 'true',
          include_last_updated_at: 'true'
        },
        timeout: 10000
      });

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
        lastUpdated: new Date(data.last_updated_at * 1000).toISOString(),
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
      logger.info('Successfully fetched quote data', { 
        symbol: convertedSymbol, 
        price: quote.price,
        change: quote.change,
        responseTime: `${responseTime}ms`,
        service: 'market-data'
      });

      return quote;
    } catch (error) {
      logger.error('Error fetching quote data', { 
        symbol, 
        error: error.message,
        stack: error.stack,
        service: 'market-data'
      });
      
      // Return mock data as fallback
      logger.info('Falling back to mock data', { symbol, service: 'market-data' });
      return this.getMockQuote(symbol);
    }
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
    logger.info('Fetching multiple quotes', { 
      symbolCount: symbols.length, 
      symbols,
      service: 'market-data'
    });
    
    const promises = symbols.map(symbol => this.getQuote(symbol));
    const results = await Promise.allSettled(promises);
    
    const processedResults = results.map((result, index) => ({
      symbol: symbols[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));

    const successCount = processedResults.filter(r => r.success).length;
    const responseTime = Date.now() - startTime;
    
    logger.info('Completed multiple quotes fetch', { 
      totalSymbols: symbols.length,
      successCount,
      failureCount: symbols.length - successCount,
      responseTime: `${responseTime}ms`,
      service: 'market-data'
    });
    
    return processedResults;
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