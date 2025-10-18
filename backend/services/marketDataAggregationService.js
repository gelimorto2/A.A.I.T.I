/**
 * Market Data Aggregation Service
 * 
 * Provides unified access to multiple market data providers:
 * - CoinGecko - Comprehensive crypto market data
 * - CoinMarketCap - Market rankings and statistics
 * - CryptoCompare - Historical data and analytics
 * - Alternative.me - Fear & Greed Index
 * 
 * Features:
 * - Multi-source data aggregation
 * - Intelligent caching with TTL
 * - Automatic failover between providers
 * - Rate limit management
 * - Data normalization
 * - Real-time and historical data
 * 
 * @module services/marketDataAggregationService
 */

const axios = require('axios');
const EventEmitter = require('events');
const NodeCache = require('node-cache');

class MarketDataAggregationService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Configuration
    this.config = {
      // API Keys (optional for public endpoints)
      coinGeckoApiKey: config.coinGeckoApiKey || null,
      coinMarketCapApiKey: config.coinMarketCapApiKey || null,
      cryptoCompareApiKey: config.cryptoCompareApiKey || null,
      
      // Cache settings
      cacheTTL: config.cacheTTL || 60, // 60 seconds default
      cacheCheckPeriod: config.cacheCheckPeriod || 120,
      
      // Rate limiting
      rateLimitWindow: config.rateLimitWindow || 60000, // 1 minute
      maxRequestsPerWindow: config.maxRequestsPerWindow || 50,
      
      // Request timeout
      timeout: config.timeout || 10000,
      
      // Retry settings
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000
    };
    
    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: this.config.cacheTTL,
      checkperiod: this.config.cacheCheckPeriod
    });
    
    // Rate limiters for each provider
    this.rateLimiters = {
      coinGecko: { requests: [], limit: 50 },
      coinMarketCap: { requests: [], limit: 30 },
      cryptoCompare: { requests: [], limit: 100 },
      alternative: { requests: [], limit: 60 }
    };
    
    // Provider base URLs
    this.providers = {
      coinGecko: {
        baseURL: 'https://api.coingecko.com/api/v3',
        proBaseURL: 'https://pro-api.coingecko.com/api/v3',
        enabled: true,
        priority: 1
      },
      coinMarketCap: {
        baseURL: 'https://pro-api.coinmarketcap.com/v1',
        sandboxURL: 'https://sandbox-api.coinmarketcap.com/v1',
        enabled: !!config.coinMarketCapApiKey,
        priority: 2
      },
      cryptoCompare: {
        baseURL: 'https://min-api.cryptocompare.com/data',
        enabled: true,
        priority: 3
      },
      alternative: {
        baseURL: 'https://api.alternative.me',
        enabled: true,
        priority: 4
      }
    };
    
    // Statistics
    this.stats = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      providerStats: {
        coinGecko: { requests: 0, errors: 0, avgResponseTime: 0 },
        coinMarketCap: { requests: 0, errors: 0, avgResponseTime: 0 },
        cryptoCompare: { requests: 0, errors: 0, avgResponseTime: 0 },
        alternative: { requests: 0, errors: 0, avgResponseTime: 0 }
      }
    };
    
    // Initialize
    this.initialized = false;
    this.initialize();
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Test provider connectivity
      await this.testProviders();
      
      this.initialized = true;
      this.emit('initialized', { providers: this.getEnabledProviders() });
      
      return { success: true, providers: this.getEnabledProviders() };
    } catch (error) {
      this.emit('error', { type: 'initialization', error: error.message });
      throw error;
    }
  }

  /**
   * Test connectivity to all providers
   */
  async testProviders() {
    const tests = [];
    
    if (this.providers.coinGecko.enabled) {
      tests.push(this.testCoinGecko());
    }
    
    if (this.providers.coinMarketCap.enabled) {
      tests.push(this.testCoinMarketCap());
    }
    
    if (this.providers.cryptoCompare.enabled) {
      tests.push(this.testCryptoCompare());
    }
    
    if (this.providers.alternative.enabled) {
      tests.push(this.testAlternative());
    }
    
    const results = await Promise.allSettled(tests);
    
    return results.map((result, index) => ({
      provider: Object.keys(this.providers)[index],
      status: result.status,
      error: result.reason?.message
    }));
  }

  /**
   * Get list of enabled providers
   */
  getEnabledProviders() {
    return Object.entries(this.providers)
      .filter(([_, config]) => config.enabled)
      .map(([name, config]) => ({ name, priority: config.priority }))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get current price for a cryptocurrency
   * @param {string} symbol - Cryptocurrency symbol (e.g., 'BTC', 'ETH')
   * @param {string} currency - Fiat currency (default: 'USD')
   * @param {boolean} useCache - Use cached data if available
   */
  async getCurrentPrice(symbol, currency = 'USD', useCache = true) {
    const cacheKey = `price:${symbol}:${currency}`;
    
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
    }
    
    this.stats.cacheMisses++;
    
    try {
      // Try providers in priority order
      let result = null;
      const providers = this.getEnabledProviders();
      
      for (const provider of providers) {
        try {
          result = await this[`get${this.capitalize(provider.name)}Price`](symbol, currency);
          if (result) break;
        } catch (error) {
          continue; // Try next provider
        }
      }
      
      if (!result) {
        throw new Error('All providers failed to fetch price');
      }
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Failed to get current price: ${error.message}`);
    }
  }

  /**
   * Get price from CoinGecko
   */
  async getCoinGeckoPrice(symbol, currency = 'USD') {
    const coinId = this.symbolToCoinGeckoId(symbol);
    const endpoint = `/simple/price`;
    
    const params = {
      ids: coinId,
      vs_currencies: currency.toLowerCase(),
      include_24hr_change: true,
      include_24hr_vol: true,
      include_market_cap: true,
      include_last_updated_at: true
    };
    
    const data = await this.coinGeckoRequest(endpoint, params);
    
    if (!data[coinId]) {
      throw new Error(`Price not found for ${symbol}`);
    }
    
    const priceData = data[coinId];
    const currencyLower = currency.toLowerCase();
    
    return {
      symbol: symbol,
      currency: currency,
      price: priceData[currencyLower],
      change24h: priceData[`${currencyLower}_24h_change`],
      volume24h: priceData[`${currencyLower}_24h_vol`],
      marketCap: priceData[`${currencyLower}_market_cap`],
      lastUpdated: new Date(priceData.last_updated_at * 1000).toISOString(),
      source: 'CoinGecko'
    };
  }

  /**
   * Get price from CoinMarketCap
   */
  async getCoinMarketCapPrice(symbol, currency = 'USD') {
    const endpoint = '/cryptocurrency/quotes/latest';
    
    const params = {
      symbol: symbol.toUpperCase(),
      convert: currency.toUpperCase()
    };
    
    const data = await this.coinMarketCapRequest(endpoint, params);
    
    const quote = data.data[symbol.toUpperCase()];
    if (!quote) {
      throw new Error(`Price not found for ${symbol}`);
    }
    
    const currencyData = quote.quote[currency.toUpperCase()];
    
    return {
      symbol: symbol,
      currency: currency,
      price: currencyData.price,
      change24h: currencyData.percent_change_24h,
      volume24h: currencyData.volume_24h,
      marketCap: currencyData.market_cap,
      lastUpdated: currencyData.last_updated,
      source: 'CoinMarketCap',
      rank: quote.cmc_rank
    };
  }

  /**
   * Get price from CryptoCompare
   */
  async getCryptoComparePrice(symbol, currency = 'USD') {
    const endpoint = '/price';
    
    const params = {
      fsym: symbol.toUpperCase(),
      tsyms: currency.toUpperCase()
    };
    
    const data = await this.cryptoCompareRequest(endpoint, params);
    
    if (!data[currency.toUpperCase()]) {
      throw new Error(`Price not found for ${symbol}`);
    }
    
    return {
      symbol: symbol,
      currency: currency,
      price: data[currency.toUpperCase()],
      lastUpdated: new Date().toISOString(),
      source: 'CryptoCompare'
    };
  }

  /**
   * Get market data for multiple cryptocurrencies
   */
  async getMarketData(symbols, currency = 'USD', options = {}) {
    const cacheKey = `market:${symbols.join(',')}:${currency}`;
    
    if (options.useCache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
    }
    
    this.stats.cacheMisses++;
    
    try {
      // Use CoinGecko as primary source for market data
      const coinIds = symbols.map(s => this.symbolToCoinGeckoId(s)).join(',');
      const endpoint = '/coins/markets';
      
      const params = {
        vs_currency: currency.toLowerCase(),
        ids: coinIds,
        order: 'market_cap_desc',
        per_page: symbols.length,
        page: 1,
        sparkline: options.sparkline || false,
        price_change_percentage: '24h,7d,30d'
      };
      
      const data = await this.coinGeckoRequest(endpoint, params);
      
      const result = data.map(coin => this.normalizeMarketData(coin, currency));
      
      // Cache the result
      this.cache.set(cacheKey, result, this.config.cacheTTL);
      
      return result;
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Failed to get market data: ${error.message}`);
    }
  }

  /**
   * Normalize market data from different providers
   */
  normalizeMarketData(data, currency) {
    return {
      id: data.id,
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      image: data.image,
      currentPrice: data.current_price,
      marketCap: data.market_cap,
      marketCapRank: data.market_cap_rank,
      fullyDilutedValuation: data.fully_diluted_valuation,
      totalVolume: data.total_volume,
      high24h: data.high_24h,
      low24h: data.low_24h,
      priceChange24h: data.price_change_24h,
      priceChangePercentage24h: data.price_change_percentage_24h,
      priceChangePercentage7d: data.price_change_percentage_7d_in_currency,
      priceChangePercentage30d: data.price_change_percentage_30d_in_currency,
      circulatingSupply: data.circulating_supply,
      totalSupply: data.total_supply,
      maxSupply: data.max_supply,
      ath: data.ath,
      athChangePercentage: data.ath_change_percentage,
      athDate: data.ath_date,
      atl: data.atl,
      atlChangePercentage: data.atl_change_percentage,
      atlDate: data.atl_date,
      lastUpdated: data.last_updated,
      sparkline: data.sparkline_in_7d?.price,
      currency: currency
    };
  }

  /**
   * Get historical price data
   */
  async getHistoricalData(symbol, days = 30, currency = 'USD') {
    const cacheKey = `historical:${symbol}:${days}:${currency}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }
    
    this.stats.cacheMisses++;
    
    try {
      const coinId = this.symbolToCoinGeckoId(symbol);
      const endpoint = `/coins/${coinId}/market_chart`;
      
      const params = {
        vs_currency: currency.toLowerCase(),
        days: days,
        interval: days > 90 ? 'daily' : 'hourly'
      };
      
      const data = await this.coinGeckoRequest(endpoint, params);
      
      const result = {
        symbol: symbol,
        currency: currency,
        days: days,
        prices: data.prices,
        marketCaps: data.market_caps,
        totalVolumes: data.total_volumes
      };
      
      // Cache with longer TTL for historical data
      this.cache.set(cacheKey, result, this.config.cacheTTL * 10);
      
      return result;
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Failed to get historical data: ${error.message}`);
    }
  }

  /**
   * Get Fear & Greed Index
   */
  async getFearGreedIndex() {
    const cacheKey = 'fear_greed_index';
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }
    
    this.stats.cacheMisses++;
    
    try {
      const endpoint = '/fng/';
      const data = await this.alternativeRequest(endpoint, { limit: 30 });
      
      const result = {
        current: {
          value: parseInt(data.data[0].value),
          classification: data.data[0].value_classification,
          timestamp: new Date(parseInt(data.data[0].timestamp) * 1000).toISOString()
        },
        history: data.data.map(item => ({
          value: parseInt(item.value),
          classification: item.value_classification,
          timestamp: new Date(parseInt(item.timestamp) * 1000).toISOString()
        }))
      };
      
      // Cache for 1 hour
      this.cache.set(cacheKey, result, 3600);
      
      return result;
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Failed to get Fear & Greed Index: ${error.message}`);
    }
  }

  /**
   * Get trending cryptocurrencies
   */
  async getTrendingCoins() {
    const cacheKey = 'trending_coins';
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }
    
    this.stats.cacheMisses++;
    
    try {
      const endpoint = '/search/trending';
      const data = await this.coinGeckoRequest(endpoint);
      
      const result = data.coins.map(item => ({
        id: item.item.id,
        symbol: item.item.symbol,
        name: item.item.name,
        marketCapRank: item.item.market_cap_rank,
        thumb: item.item.thumb,
        small: item.item.small,
        large: item.item.large,
        score: item.item.score
      }));
      
      // Cache for 30 minutes
      this.cache.set(cacheKey, result, 1800);
      
      return result;
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Failed to get trending coins: ${error.message}`);
    }
  }

  /**
   * Get global market data
   */
  async getGlobalMarketData() {
    const cacheKey = 'global_market_data';
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }
    
    this.stats.cacheMisses++;
    
    try {
      const endpoint = '/global';
      const data = await this.coinGeckoRequest(endpoint);
      
      const result = {
        totalMarketCap: data.data.total_market_cap,
        totalVolume: data.data.total_volume,
        marketCapPercentage: data.data.market_cap_percentage,
        marketCapChangePercentage24h: data.data.market_cap_change_percentage_24h_usd,
        activeCryptocurrencies: data.data.active_cryptocurrencies,
        upcomingIcos: data.data.upcoming_icos,
        ongoingIcos: data.data.ongoing_icos,
        endedIcos: data.data.ended_icos,
        markets: data.data.markets,
        updatedAt: data.data.updated_at
      };
      
      // Cache for 5 minutes
      this.cache.set(cacheKey, result, 300);
      
      return result;
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Failed to get global market data: ${error.message}`);
    }
  }

  /**
   * Make request to CoinGecko API
   */
  async coinGeckoRequest(endpoint, params = {}) {
    this.checkRateLimit('coinGecko');
    
    const startTime = Date.now();
    this.stats.providerStats.coinGecko.requests++;
    
    try {
      const baseURL = this.config.coinGeckoApiKey 
        ? this.providers.coinGecko.proBaseURL 
        : this.providers.coinGecko.baseURL;
      
      const headers = {};
      if (this.config.coinGeckoApiKey) {
        headers['x-cg-pro-api-key'] = this.config.coinGeckoApiKey;
      }
      
      const response = await axios.get(`${baseURL}${endpoint}`, {
        params: params,
        headers: headers,
        timeout: this.config.timeout
      });
      
      const responseTime = Date.now() - startTime;
      this.updateProviderStats('coinGecko', responseTime);
      
      return response.data;
    } catch (error) {
      this.stats.providerStats.coinGecko.errors++;
      this.handleProviderError('CoinGecko', error);
    }
  }

  /**
   * Make request to CoinMarketCap API
   */
  async coinMarketCapRequest(endpoint, params = {}) {
    if (!this.config.coinMarketCapApiKey) {
      throw new Error('CoinMarketCap API key required');
    }
    
    this.checkRateLimit('coinMarketCap');
    
    const startTime = Date.now();
    this.stats.providerStats.coinMarketCap.requests++;
    
    try {
      const response = await axios.get(`${this.providers.coinMarketCap.baseURL}${endpoint}`, {
        params: params,
        headers: {
          'X-CMC_PRO_API_KEY': this.config.coinMarketCapApiKey,
          'Accept': 'application/json'
        },
        timeout: this.config.timeout
      });
      
      const responseTime = Date.now() - startTime;
      this.updateProviderStats('coinMarketCap', responseTime);
      
      return response.data;
    } catch (error) {
      this.stats.providerStats.coinMarketCap.errors++;
      this.handleProviderError('CoinMarketCap', error);
    }
  }

  /**
   * Make request to CryptoCompare API
   */
  async cryptoCompareRequest(endpoint, params = {}) {
    this.checkRateLimit('cryptoCompare');
    
    const startTime = Date.now();
    this.stats.providerStats.cryptoCompare.requests++;
    
    try {
      const headers = {};
      if (this.config.cryptoCompareApiKey) {
        headers['authorization'] = `Apikey ${this.config.cryptoCompareApiKey}`;
      }
      
      const response = await axios.get(`${this.providers.cryptoCompare.baseURL}${endpoint}`, {
        params: params,
        headers: headers,
        timeout: this.config.timeout
      });
      
      const responseTime = Date.now() - startTime;
      this.updateProviderStats('cryptoCompare', responseTime);
      
      return response.data;
    } catch (error) {
      this.stats.providerStats.cryptoCompare.errors++;
      this.handleProviderError('CryptoCompare', error);
    }
  }

  /**
   * Make request to Alternative.me API
   */
  async alternativeRequest(endpoint, params = {}) {
    this.checkRateLimit('alternative');
    
    const startTime = Date.now();
    this.stats.providerStats.alternative.requests++;
    
    try {
      const response = await axios.get(`${this.providers.alternative.baseURL}${endpoint}`, {
        params: params,
        timeout: this.config.timeout
      });
      
      const responseTime = Date.now() - startTime;
      this.updateProviderStats('alternative', responseTime);
      
      return response.data;
    } catch (error) {
      this.stats.providerStats.alternative.errors++;
      this.handleProviderError('Alternative.me', error);
    }
  }

  /**
   * Test CoinGecko connectivity
   */
  async testCoinGecko() {
    await this.coinGeckoRequest('/ping');
    return true;
  }

  /**
   * Test CoinMarketCap connectivity
   */
  async testCoinMarketCap() {
    await this.coinMarketCapRequest('/key/info');
    return true;
  }

  /**
   * Test CryptoCompare connectivity
   */
  async testCryptoCompare() {
    await this.cryptoCompareRequest('/price', { fsym: 'BTC', tsyms: 'USD' });
    return true;
  }

  /**
   * Test Alternative.me connectivity
   */
  async testAlternative() {
    await this.alternativeRequest('/fng/', { limit: 1 });
    return true;
  }

  /**
   * Check rate limit for a provider
   */
  checkRateLimit(provider) {
    const limiter = this.rateLimiters[provider];
    if (!limiter) return;
    
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;
    
    // Remove old requests
    limiter.requests = limiter.requests.filter(time => time > windowStart);
    
    if (limiter.requests.length >= limiter.limit) {
      throw new Error(`Rate limit exceeded for ${provider}`);
    }
    
    limiter.requests.push(now);
  }

  /**
   * Update provider statistics
   */
  updateProviderStats(provider, responseTime) {
    const stats = this.stats.providerStats[provider];
    const currentAvg = stats.avgResponseTime;
    const totalRequests = stats.requests;
    
    stats.avgResponseTime = ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  /**
   * Handle provider-specific errors
   */
  handleProviderError(provider, error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      throw new Error(`${provider} API Error ${status}: ${data.error || data.status?.error_message || 'Unknown error'}`);
    } else if (error.request) {
      throw new Error(`${provider} Network Error: No response received`);
    } else {
      throw new Error(`${provider} Request Error: ${error.message}`);
    }
  }

  /**
   * Convert symbol to CoinGecko ID
   */
  symbolToCoinGeckoId(symbol) {
    const mapping = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'BNB': 'binancecoin',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'SOL': 'solana',
      'DOT': 'polkadot',
      'MATIC': 'matic-network',
      'SHIB': 'shiba-inu',
      'AVAX': 'avalanche-2',
      'LINK': 'chainlink',
      'ATOM': 'cosmos',
      'UNI': 'uniswap'
    };
    
    return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      cacheSize: this.cache.keys().length,
      cacheHitRate: this.stats.requests > 0 
        ? (this.stats.cacheHits / this.stats.requests * 100).toFixed(2) + '%'
        : '0%',
      providers: this.getEnabledProviders()
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.flushAll();
    this.emit('cache_cleared');
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    this.clearCache();
    this.initialized = false;
    this.emit('shutdown');
  }
}

module.exports = MarketDataAggregationService;
