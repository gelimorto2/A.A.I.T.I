const axios = require('axios');
const logger = require('./logger');
const { getCredentials } = require('./credentials');

class MarketDataService {
  constructor() {
    this.credentials = getCredentials('trading');
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
    this.symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'BTC-USD', 'ETH-USD'];
  }

  /**
   * Get Alpha Vantage API key
   */
  getApiKey() {
    const apiKey = this.credentials?.alphaVantage?.apiKey || process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    
    // If using demo key, we'll fall back to mock data
    if (apiKey === 'demo') {
      logger.warn('Using demo API key - falling back to mock data. Get a free API key from https://www.alphavantage.co/support/#api-key');
    }
    
    return apiKey;
  }

  /**
   * Fetch real-time quote data
   */
  async getQuote(symbol) {
    try {
      const cacheKey = `quote_${symbol}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.data;
      }

      const apiKey = this.getApiKey();
      
      // If using demo key, return mock data immediately
      if (apiKey === 'demo') {
        return this.getMockQuote(symbol);
      }
      
      // Alpha Vantage Global Quote endpoint
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: apiKey
        },
        timeout: 10000
      });

      const data = response.data['Global Quote'];
      
      if (!data || Object.keys(data).length === 0) {
        throw new Error(`No data available for symbol: ${symbol}`);
      }

      const quote = {
        symbol: data['01. symbol'],
        price: parseFloat(data['05. price']),
        change: parseFloat(data['09. change']),
        changePercent: data['10. change percent'].replace('%', ''),
        volume: parseInt(data['06. volume']),
        high: parseFloat(data['03. high']),
        low: parseFloat(data['04. low']),
        open: parseFloat(data['02. open']),
        previousClose: parseFloat(data['08. previous close']),
        timestamp: data['07. latest trading day'],
        lastRefreshed: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: quote,
        timestamp: Date.now()
      });

      return quote;
    } catch (error) {
      logger.error(`Error fetching quote for ${symbol}:`, error.message);
      
      // Return mock data as fallback
      return this.getMockQuote(symbol);
    }
  }

  /**
   * Fetch historical data
   */
  async getHistoricalData(symbol, interval = 'daily', outputSize = 'compact') {
    try {
      const cacheKey = `history_${symbol}_${interval}_${outputSize}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout * 5) { // 5 min cache for historical
        return cached.data;
      }

      const apiKey = this.getApiKey();
      
      // If using demo key, return mock data immediately
      if (apiKey === 'demo') {
        return this.getMockHistoricalData(symbol, interval);
      }
      
      let functionName;
      
      switch (interval) {
        case '1min':
          functionName = 'TIME_SERIES_INTRADAY';
          break;
        case 'daily':
          functionName = 'TIME_SERIES_DAILY';
          break;
        case 'weekly':
          functionName = 'TIME_SERIES_WEEKLY';
          break;
        case 'monthly':
          functionName = 'TIME_SERIES_MONTHLY';
          break;
        default:
          functionName = 'TIME_SERIES_DAILY';
      }

      const params = {
        function: functionName,
        symbol: symbol,
        apikey: apiKey,
        outputsize: outputSize
      };

      if (interval === '1min') {
        params.interval = '1min';
      }

      const response = await axios.get('https://www.alphavantage.co/query', {
        params,
        timeout: 15000
      });

      const data = response.data;
      const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
      
      if (!timeSeriesKey || !data[timeSeriesKey]) {
        throw new Error(`No historical data available for symbol: ${symbol}`);
      }

      const timeSeries = data[timeSeriesKey];
      const historicalData = Object.entries(timeSeries)
        .slice(0, 100) // Limit to 100 data points
        .map(([date, values]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        }))
        .reverse(); // Most recent first

      const result = {
        symbol,
        interval,
        data: historicalData,
        lastRefreshed: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      logger.error(`Error fetching historical data for ${symbol}:`, error.message);
      
      // Return mock historical data as fallback
      return this.getMockHistoricalData(symbol, interval);
    }
  }

  /**
   * Get multiple quotes at once
   */
  async getMultipleQuotes(symbols) {
    const promises = symbols.map(symbol => this.getQuote(symbol));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => ({
      symbol: symbols[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  }

  /**
   * Search for symbols
   */
  async searchSymbols(keywords) {
    try {
      const apiKey = this.getApiKey();
      
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: keywords,
          apikey: apiKey
        },
        timeout: 10000
      });

      const matches = response.data.bestMatches || [];
      
      return matches.slice(0, 10).map(match => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        type: match['3. type'],
        region: match['4. region'],
        marketOpen: match['5. marketOpen'],
        marketClose: match['6. marketClose'],
        timezone: match['7. timezone'],
        currency: match['8. currency'],
        matchScore: parseFloat(match['9. matchScore'])
      }));
    } catch (error) {
      logger.error(`Error searching symbols for "${keywords}":`, error.message);
      return [];
    }
  }

  /**
   * Mock quote data for fallback
   */
  getMockQuote(symbol) {
    const basePrice = 100 + Math.random() * 500;
    const change = (Math.random() - 0.5) * 10;
    
    return {
      symbol,
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
      isMock: true
    };
  }

  /**
   * Mock historical data for fallback
   */
  getMockHistoricalData(symbol, interval) {
    const data = [];
    const basePrice = 100 + Math.random() * 500;
    
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
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(Math.random() * 1000000)
      });
    }
    
    return {
      symbol,
      interval,
      data,
      lastRefreshed: new Date().toISOString(),
      isMock: true
    };
  }

  /**
   * Get popular trading symbols
   */
  getPopularSymbols() {
    return this.symbols;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Market data cache cleared');
  }
}

module.exports = new MarketDataService();