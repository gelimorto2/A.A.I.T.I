const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const logger = require('../utils/logger');

/**
 * Get candlestick chart data
 * GET /api/charts/candlestick/:symbol
 */
router.get('/candlestick/:symbol', authenticateToken, (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1h', limit = 100 } = req.query;

    // Generate realistic candlestick data
    const data = generateCandlestickData(symbol, timeframe, parseInt(limit));

    res.json({
      symbol,
      timeframe,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting candlestick data:', error);
    res.status(500).json({ error: 'Failed to get candlestick data' });
  }
});

/**
 * Get portfolio heat map data
 * GET /api/charts/portfolio-heatmap
 */
router.get('/portfolio-heatmap', authenticateToken, (req, res) => {
  try {
    const { userId } = req.user;

    // Generate realistic portfolio data
    const portfolioData = [
      {
        symbol: 'BTC',
        price: 65432.10 + (Math.random() - 0.5) * 1000,
        change24h: 1234.56 + (Math.random() - 0.5) * 500,
        changePercent24h: 1.92 + (Math.random() - 0.5) * 2,
        volume24h: 28000000000,
        marketCap: 1280000000000,
        allocation: 35.2,
      },
      {
        symbol: 'ETH',
        price: 3421.75 + (Math.random() - 0.5) * 200,
        change24h: -89.33 + (Math.random() - 0.5) * 100,
        changePercent24h: -2.55 + (Math.random() - 0.5) * 2,
        volume24h: 12000000000,
        marketCap: 411000000000,
        allocation: 28.7,
      },
      {
        symbol: 'ADA',
        price: 0.8234 + (Math.random() - 0.5) * 0.1,
        change24h: 0.0523 + (Math.random() - 0.5) * 0.02,
        changePercent24h: 6.78 + (Math.random() - 0.5) * 2,
        volume24h: 890000000,
        marketCap: 28000000000,
        allocation: 15.1,
      },
      {
        symbol: 'DOT',
        price: 12.45 + (Math.random() - 0.5) * 2,
        change24h: 0.89 + (Math.random() - 0.5) * 0.5,
        changePercent24h: 7.69 + (Math.random() - 0.5) * 2,
        volume24h: 456000000,
        marketCap: 14500000000,
        allocation: 10.3,
      },
      {
        symbol: 'LINK',
        price: 28.76 + (Math.random() - 0.5) * 5,
        change24h: -1.23 + (Math.random() - 0.5) * 1,
        changePercent24h: -4.11 + (Math.random() - 0.5) * 2,
        volume24h: 678000000,
        marketCap: 16200000000,
        allocation: 6.9,
      },
      {
        symbol: 'UNI',
        price: 8.92 + (Math.random() - 0.5) * 1,
        change24h: 0.34 + (Math.random() - 0.5) * 0.2,
        changePercent24h: 3.97 + (Math.random() - 0.5) * 2,
        volume24h: 234000000,
        marketCap: 5400000000,
        allocation: 3.8,
      },
    ];

    res.json({
      userId,
      data: portfolioData,
      totalValue: portfolioData.reduce((sum, item) => sum + (item.price * item.allocation / 100 * 10000), 0),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting portfolio heatmap data:', error);
    res.status(500).json({ error: 'Failed to get portfolio heatmap data' });
  }
});

/**
 * Get real-time price updates
 * GET /api/charts/realtime/:symbol
 */
router.get('/realtime/:symbol', authenticateToken, (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Get base price for symbol
    const basePrices = {
      'BTC': 65000,
      'ETH': 3400,
      'ADA': 0.8,
      'DOT': 12,
      'LINK': 28,
      'UNI': 9,
    };

    const basePrice = basePrices[symbol] || 100;
    
    // Generate real-time price update
    const priceChange = (Math.random() - 0.5) * 0.01 * basePrice;
    const currentPrice = basePrice + priceChange;
    const volume = Math.random() * 1000000 + 500000;

    res.json({
      symbol,
      price: currentPrice,
      change: priceChange,
      changePercent: (priceChange / basePrice) * 100,
      volume,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting real-time data:', error);
    res.status(500).json({ error: 'Failed to get real-time data' });
  }
});

/**
 * Get technical indicators
 * GET /api/charts/indicators/:symbol
 */
router.get('/indicators/:symbol', authenticateToken, (req, res) => {
  try {
    const { symbol } = req.params;
    const { indicators = 'sma20,ema12,rsi', timeframe = '1h' } = req.query;
    
    const requestedIndicators = indicators.split(',');
    const data = {};

    // Generate sample indicator data
    requestedIndicators.forEach(indicator => {
      switch (indicator) {
        case 'sma20':
          data.sma20 = generateSMAData(20);
          break;
        case 'ema12':
          data.ema12 = generateEMAData(12);
          break;
        case 'rsi':
          data.rsi = generateRSIData();
          break;
        case 'macd':
          data.macd = generateMACDData();
          break;
        default:
          break;
      }
    });

    res.json({
      symbol,
      timeframe,
      indicators: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting indicators:', error);
    res.status(500).json({ error: 'Failed to get indicators' });
  }
});

// Helper functions
function generateCandlestickData(symbol, timeframe, limit) {
  const data = [];
  const basePrices = {
    'BTC': 65000,
    'ETH': 3400,
    'ADA': 0.8,
    'DOT': 12,
    'LINK': 28,
    'UNI': 9,
  };

  let currentPrice = basePrices[symbol] || 100;
  const now = new Date();
  
  // Calculate time interval based on timeframe
  const intervals = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };
  
  const interval = intervals[timeframe] || intervals['1h'];

  for (let i = limit; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * interval);
    
    // Generate realistic price movement
    const volatility = 0.02; // 2% volatility
    const priceChange = (Math.random() - 0.5) * volatility * currentPrice;
    const open = currentPrice;
    const close = open + priceChange;
    const high = Math.max(open, close) + Math.random() * 0.01 * currentPrice;
    const low = Math.min(open, close) - Math.random() * 0.01 * currentPrice;
    const volume = Math.random() * 1000000 + 500000;

    data.push({
      timestamp: timestamp.toISOString(),
      open: parseFloat(open.toFixed(8)),
      high: parseFloat(high.toFixed(8)),
      low: parseFloat(low.toFixed(8)),
      close: parseFloat(close.toFixed(8)),
      volume: Math.round(volume),
    });

    currentPrice = close;
  }

  return data;
}

function generateSMAData(period) {
  const data = [];
  for (let i = 0; i < 100; i++) {
    data.push({
      timestamp: new Date(Date.now() - (100 - i) * 60 * 60 * 1000).toISOString(),
      value: 65000 + Math.sin(i / 10) * 1000 + (Math.random() - 0.5) * 500,
    });
  }
  return data;
}

function generateEMAData(period) {
  const data = [];
  for (let i = 0; i < 100; i++) {
    data.push({
      timestamp: new Date(Date.now() - (100 - i) * 60 * 60 * 1000).toISOString(),
      value: 65100 + Math.sin(i / 8) * 800 + (Math.random() - 0.5) * 400,
    });
  }
  return data;
}

function generateRSIData() {
  const data = [];
  for (let i = 0; i < 100; i++) {
    data.push({
      timestamp: new Date(Date.now() - (100 - i) * 60 * 60 * 1000).toISOString(),
      value: 50 + Math.sin(i / 7) * 20 + (Math.random() - 0.5) * 10,
    });
  }
  return data;
}

function generateMACDData() {
  const data = [];
  for (let i = 0; i < 100; i++) {
    data.push({
      timestamp: new Date(Date.now() - (100 - i) * 60 * 60 * 1000).toISOString(),
      macd: Math.sin(i / 12) * 100 + (Math.random() - 0.5) * 50,
      signal: Math.sin((i - 5) / 12) * 80 + (Math.random() - 0.5) * 40,
      histogram: Math.sin(i / 15) * 60 + (Math.random() - 0.5) * 30,
    });
  }
  return data;
}

module.exports = router;