const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const marketDataService = require('../utils/marketData');
const logger = require('../utils/logger');

const router = express.Router();

// Basic in-memory cache for historical market data to reduce external calls
const histCache = new Map(); // key: symbol|tf, value: { ts, candles }

// Map timeframe to minutes and sample size
const TF_CONFIG = {
  '1m': { minutes: 1, points: 500 },
  '5m': { minutes: 5, points: 500 },
  '15m': { minutes: 15, points: 400 },
  '1h': { minutes: 60, points: 400 },
  '4h': { minutes: 240, points: 300 },
  '1d': { minutes: 1440, points: 365 }
};

// GET /api/market/history?symbol=bitcoin&tf=1h
router.get('/market/history', async (req, res) => {
  try {
    const symbol = (req.query.symbol || 'bitcoin').toString().toLowerCase();
    const tf = (req.query.tf || '1h').toString();
    if (!TF_CONFIG[tf]) return res.status(400).json({ error: 'Invalid timeframe' });
    const cacheKey = symbol + '|' + tf;
    const cached = histCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 30_000) {
      return res.json({ symbol, tf, candles: cached.candles, cached: true });
    }
    // For now use existing marketData service for spot price sampling (placeholder). Ideally integrate real OHLC source.
    const { minutes, points } = TF_CONFIG[tf];
    const now = Date.now();
    const candles = [];
    let lastClose = null;
    for (let i = points - 1; i >= 0; i--) {
      const t = now - i * minutes * 60 * 1000;
      // Price approximation (could be replaced with external API call aggregation)
      const base = Math.sin(t / 3.6e6) * 50 + 50000; // synthetic wave baseline
      const noise = (Math.random() - 0.5) * 100;
      const close = base + noise;
      const open = lastClose == null ? close + (Math.random() - 0.5) * 50 : lastClose;
      const high = Math.max(open, close) + Math.random() * 30;
      const low = Math.min(open, close) - Math.random() * 30;
      candles.push({ time: t, open: round(open), high: round(high), low: round(low), close: round(close) });
      lastClose = close;
    }
    histCache.set(cacheKey, { ts: Date.now(), candles });
    res.json({ symbol, tf, candles, cached: false, provenance: 'synthetic_demo' });
  } catch (e) {
    logger.error('history error', e);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// Capability metadata (update as features mature)
const tradingCapabilities = {
  version: '1.0.0',
  timestamp: () => new Date().toISOString(),
  data: {
    marketData: {
      provider: 'CoinGecko',
      fallback: true,
      fallbackFlag: 'isMock',
      intervals: ['1min','hourly','daily','weekly','monthly'],
      reliabilityNotes: 'If isMock true, data is synthetic – live trading blocks execution.'
    },
    execution: {
      manual: true,
      strategies: 'planned',
      orderTypes: ['market','limit (planned)'],
      slippageModel: 'none (planned)',
      idempotency: 'supported via Idempotency-Key header'
    },
    risk: {
      maxPositionSize: 'enforced (risk_parameters.max_position_size)',
      maxDailyLoss: 'enforced (risk_parameters.max_daily_loss)',
      drawdown: 'planned',
      var: 'simulated (not blocking)',
      leverage: 'tracked (not enforced yet)',
      provenanceTagging: 'entry/close responses include data_provenance'
    },
    modes: {
      paper: true,
      shadow: true,
      live: 'enabled (blocks on mock data)'
    },
    transparency: {
      tradeResponseFields: ['data_provenance','trading_mode','order_type'],
      warnings: ['Live trades rejected if quote.isMock']
    }
  }
};

// Capability & status endpoint
router.get('/capabilities', authenticateToken, (req, res) => {
  res.json({
    service: 'trading',
    version: tradingCapabilities.version,
    generatedAt: tradingCapabilities.timestamp(),
    ...tradingCapabilities.data
  });
});

// Get trading signals for a bot
router.get('/signals/:botId', authenticateToken, (req, res) => {
  // Verify bot belongs to user
  db.get(
    'SELECT id FROM bots WHERE id = ? AND user_id = ?',
    [req.params.botId, req.user.id],
    (err, bot) => {
      if (err) {
        logger.error('Error checking bot ownership:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const { limit = 50, offset = 0 } = req.query;

      db.all(
        `SELECT * FROM trading_signals 
         WHERE bot_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ? OFFSET ?`,
        [req.params.botId, parseInt(limit), parseInt(offset)],
        (err, signals) => {
          if (err) {
            logger.error('Error fetching trading signals:', err);
            return res.status(500).json({ error: 'Failed to fetch signals' });
          }

          res.json({ signals });
        }
      );
    }
  );
});

// Get trades for a bot
router.get('/trades/:botId', authenticateToken, (req, res) => {
  // Verify bot belongs to user
  db.get(
    'SELECT id FROM bots WHERE id = ? AND user_id = ?',
    [req.params.botId, req.user.id],
    (err, bot) => {
      if (err) {
        logger.error('Error checking bot ownership:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const { limit = 50, offset = 0, status } = req.query;
      let query = `SELECT * FROM trades WHERE bot_id = ?`;
      let params = [req.params.botId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY opened_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      db.all(query, params, (err, trades) => {
        if (err) {
          logger.error('Error fetching trades:', err);
          return res.status(500).json({ error: 'Failed to fetch trades' });
        }

        res.json({ trades });
      });
    }
  );
});

// In-memory idempotency cache (resets on process restart)
const idempotencyCache = new Map(); // key -> { timestamp, response }

// Helper to promisify db.get
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Helper to promisify db.all
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Helper to promisify db.run
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

// Execute manual trade (now with real quote, risk checks, idempotency, and live-mode validation)
router.post('/execute', authenticateToken, auditLog('manual_trade', 'trade'), async (req, res) => {
  try {
    const { botId, symbol, side, quantity, price, order_type = 'market' } = req.body;
    if (!botId || !symbol || !side || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: 'Invalid side' });
    }
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be > 0' });
    }

    // Idempotency handling
    const idempotencyKey = req.header('Idempotency-Key');
    const idemCacheKey = idempotencyKey ? `${req.user.id}:${idempotencyKey}` : null;
    if (idemCacheKey && idempotencyCache.has(idemCacheKey)) {
      const cached = idempotencyCache.get(idemCacheKey);
      res.set('Idempotent-Replay', 'true');
      return res.json(cached.response);
    }

    // Verify bot
    const bot = await dbGet('SELECT id, trading_mode FROM bots WHERE id = ? AND user_id = ?', [botId, req.user.id]);
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    // Fetch risk parameters
    const riskParams = await dbGet('SELECT * FROM risk_parameters WHERE bot_id = ?', [botId]);

    // Get current quote if market order or if no explicit price
    let quote = null;
    let executionPrice = price;
    if (!price || order_type === 'market') {
      try {
        quote = await marketDataService.getQuote(symbol);
        executionPrice = quote.price;
      } catch (e) {
        logger.error('Quote fetch failed for execution', { symbol, error: e.message });
        return res.status(502).json({ error: 'Failed to fetch market quote' });
      }
    }

    // Enforce real data in live mode
    if (bot.trading_mode === 'live' && quote && quote.isMock) {
      return res.status(503).json({ error: 'Live trading unavailable: real market data unavailable (mock fallback in use)' });
    }

    // Basic risk checks
    const exposureRow = await dbGet("SELECT COALESCE(SUM(quantity * entry_price),0) as exposure FROM trades WHERE bot_id = ? AND status = 'open'", [botId]);
    const currentExposure = exposureRow?.exposure || 0;
    const newNotional = executionPrice * quantity;
    const projectedExposure = side === 'sell' ? Math.max(0, currentExposure - newNotional) : currentExposure + newNotional;

    let riskChecks = [];
    if (riskParams && riskParams.max_position_size && projectedExposure > riskParams.max_position_size) {
      riskChecks.push({
        type: 'MAX_POSITION_SIZE',
        status: 'FAIL',
        currentExposure,
        projectedExposure,
        limit: riskParams.max_position_size
      });
      return res.status(422).json({ error: 'Max position size limit exceeded', risk_checks: riskChecks });
    }

    // Daily loss limit (realized PnL for today)
    if (riskParams && riskParams.max_daily_loss) {
      const today = new Date().toISOString().slice(0,10);
      const pnlRow = await dbGet("SELECT COALESCE(SUM(pnl),0) as realized FROM trades WHERE bot_id = ? AND status='closed' AND date(closed_at) = ?", [botId, today]);
      const realized = pnlRow?.realized || 0;
      if (realized < 0 && Math.abs(realized) >= riskParams.max_daily_loss) {
        riskChecks.push({
          type: 'MAX_DAILY_LOSS',
          status: 'FAIL',
          realizedLoss: realized,
          limit: riskParams.max_daily_loss
        });
        return res.status(422).json({ error: 'Max daily loss limit reached', risk_checks: riskChecks });
      }
    }

    const tradeId = uuidv4();
    const currentTime = new Date().toISOString();

    await dbRun(
      `INSERT INTO trades (id, bot_id, symbol, side, quantity, entry_price, commission, data_provenance, trading_mode, status, opened_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
      [
        tradeId,
        botId,
        symbol,
        side,
        quantity,
        executionPrice,
        0, // commission placeholder
        quote ? (quote.isMock ? 'mock_fallback' : 'real') : (price ? 'user_supplied' : 'unknown'),
        bot.trading_mode,
        currentTime
      ]
    );

    logger.info('Manual trade executed', {
      tradeId,
      botId,
      symbol,
      side,
      quantity,
      executionPrice,
      trading_mode: bot.trading_mode,
      data_provenance: quote ? (quote.isMock ? 'mock_fallback' : 'real') : (price ? 'user_supplied' : 'unknown')
    });

    const responsePayload = {
      message: 'Trade executed successfully',
      trade: {
        id: tradeId,
        bot_id: botId,
        symbol,
        side,
        quantity,
        entry_price: executionPrice,
        status: 'open',
        trading_mode: bot.trading_mode,
        order_type,
        data_provenance: quote ? (quote.isMock ? 'mock_fallback' : 'real') : (price ? 'user_supplied' : 'unknown')
      },
      risk_checks: riskChecks
    };

    if (idemCacheKey) {
      idempotencyCache.set(idemCacheKey, { timestamp: Date.now(), response: responsePayload });
    }

    res.json(responsePayload);
  } catch (error) {
    logger.error('Error executing trade', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to execute trade' });
  }
});

// Close trade
router.post('/trades/:tradeId/close', authenticateToken, auditLog('close_trade', 'trade'), async (req, res) => {
  try {
    const { price } = req.body;
    const trade = await dbGet(`SELECT t.*, b.user_id, b.trading_mode FROM trades t 
      JOIN bots b ON t.bot_id = b.id 
      WHERE t.id = ? AND b.user_id = ?`, [req.params.tradeId, req.user.id]);

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    if (trade.status !== 'open') {
      return res.status(400).json({ error: 'Trade is not open' });
    }

    let exitPrice = price;
    let quote = null;
    if (!price) {
      try {
        quote = await marketDataService.getQuote(trade.symbol);
        exitPrice = quote.price;
      } catch (e) {
        logger.error('Quote fetch failed for close', { symbol: trade.symbol, error: e.message });
        return res.status(502).json({ error: 'Failed to fetch market quote' });
      }
    }

    if (trade.trading_mode === 'live' && quote && quote.isMock) {
      return res.status(503).json({ error: 'Live trading unavailable: real market data unavailable (mock fallback in use)' });
    }

    const pnl = (exitPrice - trade.entry_price) * trade.quantity * (trade.side === 'buy' ? 1 : -1);
    const currentTime = new Date().toISOString();

    await dbRun(`UPDATE trades 
      SET exit_price = ?, pnl = ?, status = 'closed', closed_at = ?
      WHERE id = ?`, [exitPrice, pnl, currentTime, req.params.tradeId]);

    logger.info('Trade closed', { tradeId: req.params.tradeId, exitPrice, pnl });

    res.json({
      message: 'Trade closed successfully',
      trade: {
        id: req.params.tradeId,
        exit_price: exitPrice,
        pnl,
        status: 'closed',
        data_provenance: quote ? (quote.isMock ? 'mock_fallback' : 'real') : (price ? 'user_supplied' : 'unknown')
      }
    });
  } catch (error) {
    logger.error('Error closing trade', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to close trade' });
  }
});

// Get market data (real data from Alpha Vantage)
router.get('/market-data/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = 'daily', limit = 100 } = req.query;

    const historicalData = await marketDataService.getHistoricalData(symbol, timeframe);
    
    if (!historicalData) {
      return res.status(404).json({ error: 'No data available for symbol' });
    }

    // Limit the data if requested
    const limitedData = {
      ...historicalData,
      data: historicalData.data.slice(0, parseInt(limit))
    };

    res.json({ data: limitedData });
  } catch (error) {
    logger.error('Error fetching market data:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// Get real-time price (real data from Alpha Vantage)
router.get('/price/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const quote = await marketDataService.getQuote(symbol);
    
    if (!quote) {
      return res.status(404).json({ error: 'No quote available for symbol' });
    }

    res.json(quote);
  } catch (error) {
    logger.error('Error fetching price:', error);
    res.status(500).json({ error: 'Failed to fetch price data' });
  }
});

// Search for trading symbols
router.get('/search/:keywords', authenticateToken, async (req, res) => {
  try {
    const { keywords } = req.params;
    
    const results = await marketDataService.searchSymbols(keywords);
    
    res.json({ results });
  } catch (error) {
    logger.error('Error searching symbols:', error);
    res.status(500).json({ error: 'Failed to search symbols' });
  }
});

// Get popular trading symbols
router.get('/symbols/popular', authenticateToken, (req, res) => {
  try {
    const symbols = marketDataService.getPopularSymbols();
    res.json({ symbols });
  } catch (error) {
    logger.error('Error fetching popular symbols:', error);
    res.status(500).json({ error: 'Failed to fetch popular symbols' });
  }
});

// Get multiple quotes
router.post('/quotes', authenticateToken, async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }
    
    const quotes = await marketDataService.getMultipleQuotes(symbols);
    
    res.json({ quotes });
  } catch (error) {
    logger.error('Error fetching multiple quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Test API connection for trading providers
router.post('/test-connection/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    
    switch (provider.toLowerCase()) {
      case 'alphavantage':
        try {
          const testQuote = await marketDataService.getQuote('AAPL');
          if (testQuote && testQuote.success) {
            res.json({ 
              success: true, 
              message: 'Alpha Vantage connection successful',
              provider: 'Alpha Vantage'
            });
          } else {
            res.status(400).json({ 
              success: false, 
              message: 'Alpha Vantage connection failed - check API key',
              provider: 'Alpha Vantage'
            });
          }
        } catch (error) {
          res.status(400).json({ 
            success: false, 
            message: 'Alpha Vantage connection failed',
            provider: 'Alpha Vantage'
          });
        }
        break;
        
      case 'binance':
        // For now, simulate connection test
        res.json({ 
          success: true, 
          message: 'Binance connection test completed (simulated)',
          provider: 'Binance'
        });
        break;
        
      case 'coinbase':
        // For now, simulate connection test
        res.json({ 
          success: true, 
          message: 'Coinbase connection test completed (simulated)',
          provider: 'Coinbase'
        });
        break;
        
      default:
        res.status(400).json({ 
          success: false, 
          message: 'Unknown provider',
          provider: provider
        });
    }
  } catch (error) {
    logger.error('Error testing connection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Connection test failed',
      provider: req.params.provider
    });
  }
});

module.exports = router;