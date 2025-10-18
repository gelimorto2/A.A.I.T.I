/**
 * Market Data Aggregation API Routes
 * 
 * Provides REST API endpoints for accessing aggregated market data
 * from multiple providers (CoinGecko, CoinMarketCap, CryptoCompare, Alternative.me)
 * 
 * Endpoints:
 * - GET /api/market-data/price/:symbol - Get current price
 * - GET /api/market-data/markets - Get market data for multiple coins
 * - GET /api/market-data/historical/:symbol - Get historical price data
 * - GET /api/market-data/fear-greed - Get Fear & Greed Index
 * - GET /api/market-data/trending - Get trending cryptocurrencies
 * - GET /api/market-data/global - Get global market statistics
 * - GET /api/market-data/stats - Get service statistics
 * 
 * @module routes/marketDataAggregation
 */

const express = require('express');
const router = express.Router();
const MarketDataAggregationService = require('../services/marketDataAggregationService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Initialize market data service
const marketDataService = new MarketDataAggregationService({
  coinGeckoApiKey: process.env.COINGECKO_API_KEY,
  coinMarketCapApiKey: process.env.COINMARKETCAP_API_KEY,
  cryptoCompareApiKey: process.env.CRYPTOCOMPARE_API_KEY,
  cacheTTL: 60,
  maxRequestsPerWindow: 50
});

/**
 * @route GET /api/market-data/price/:symbol
 * @desc Get current price for a cryptocurrency
 * @access Public
 */
router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { currency = 'USD', useCache = 'true' } = req.query;
    
    const price = await marketDataService.getCurrentPrice(
      symbol.toUpperCase(),
      currency.toUpperCase(),
      useCache === 'true'
    );
    
    res.json({
      success: true,
      data: price
    });
  } catch (error) {
    logger.error('Error fetching price', { error: error.message, symbol: req.params.symbol });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/market-data/markets
 * @desc Get market data for multiple cryptocurrencies
 * @access Public
 */
router.get('/markets', async (req, res) => {
  try {
    const { symbols, currency = 'USD', sparkline = 'false' } = req.query;
    
    if (!symbols) {
      return res.status(400).json({
        success: false,
        error: 'symbols parameter is required'
      });
    }
    
    const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
    
    const marketData = await marketDataService.getMarketData(symbolArray, currency.toUpperCase(), {
      sparkline: sparkline === 'true'
    });
    
    res.json({
      success: true,
      data: marketData,
      count: marketData.length
    });
  } catch (error) {
    logger.error('Error fetching market data', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/market-data/historical/:symbol
 * @desc Get historical price data
 * @access Public
 */
router.get('/historical/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = '30', currency = 'USD' } = req.query;
    
    const historicalData = await marketDataService.getHistoricalData(
      symbol.toUpperCase(),
      parseInt(days),
      currency.toUpperCase()
    );
    
    res.json({
      success: true,
      data: historicalData
    });
  } catch (error) {
    logger.error('Error fetching historical data', { error: error.message, symbol: req.params.symbol });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/market-data/fear-greed
 * @desc Get Fear & Greed Index
 * @access Public
 */
router.get('/fear-greed', async (req, res) => {
  try {
    const index = await marketDataService.getFearGreedIndex();
    
    res.json({
      success: true,
      data: index
    });
  } catch (error) {
    logger.error('Error fetching Fear & Greed Index', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/market-data/trending
 * @desc Get trending cryptocurrencies
 * @access Public
 */
router.get('/trending', async (req, res) => {
  try {
    const trending = await marketDataService.getTrendingCoins();
    
    res.json({
      success: true,
      data: trending,
      count: trending.length
    });
  } catch (error) {
    logger.error('Error fetching trending coins', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/market-data/global
 * @desc Get global market statistics
 * @access Public
 */
router.get('/global', async (req, res) => {
  try {
    const globalData = await marketDataService.getGlobalMarketData();
    
    res.json({
      success: true,
      data: globalData
    });
  } catch (error) {
    logger.error('Error fetching global market data', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/market-data/stats
 * @desc Get service statistics
 * @access Private (Authenticated)
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = marketDataService.getStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching service statistics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/market-data/cache/clear
 * @desc Clear service cache
 * @access Private (Authenticated, Admin only)
 */
router.post('/cache/clear', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    marketDataService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/market-data/batch-prices
 * @desc Get prices for multiple cryptocurrencies efficiently
 * @access Public
 */
router.get('/batch-prices', async (req, res) => {
  try {
    const { symbols, currency = 'USD' } = req.query;
    
    if (!symbols) {
      return res.status(400).json({
        success: false,
        error: 'symbols parameter is required'
      });
    }
    
    const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
    
    // Get prices in parallel
    const pricePromises = symbolArray.map(symbol => 
      marketDataService.getCurrentPrice(symbol, currency.toUpperCase())
        .catch(error => ({ symbol, error: error.message }))
    );
    
    const prices = await Promise.all(pricePromises);
    
    // Separate successful and failed requests
    const successful = prices.filter(p => !p.error);
    const failed = prices.filter(p => p.error);
    
    res.json({
      success: true,
      data: {
        prices: successful,
        errors: failed
      },
      summary: {
        total: symbolArray.length,
        successful: successful.length,
        failed: failed.length
      }
    });
  } catch (error) {
    logger.error('Error fetching batch prices', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/market-data/providers
 * @desc Get list of enabled providers
 * @access Public
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = marketDataService.getEnabledProviders();
    
    res.json({
      success: true,
      data: providers,
      count: providers.length
    });
  } catch (error) {
    logger.error('Error fetching providers', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/market-data/health
 * @desc Check service health
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: marketDataService.initialized ? 'healthy' : 'initializing',
      timestamp: new Date().toISOString(),
      providers: marketDataService.getEnabledProviders(),
      stats: marketDataService.getStatistics()
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error checking health', { error: error.message });
    res.status(503).json({
      success: false,
      error: error.message
    });
  }
});

// Event listeners for service events
marketDataService.on('initialized', (data) => {
  logger.info('Market data service initialized', data);
});

marketDataService.on('error', (data) => {
  logger.error('Market data service error', data);
});

marketDataService.on('cache_cleared', () => {
  logger.info('Market data service cache cleared');
});

module.exports = router;
