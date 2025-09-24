const express = require('express');
const { db } = require('../database/init');
const tradesRepository = require('../repositories/tradesRepository');
const botsRepository = require('../repositories/botsRepository');
const { authenticateToken, auditLog } = require('../middleware/auth');
const marketDataService = require('../utils/marketData');
const logger = require('../utils/logger');
const { validate, schemas } = require('../utils/validation');
const { evaluateOrder } = require('../utils/riskEngine');
const tradingService = require('../services/tradingService');

const router = express.Router();

// Get trading signals for a bot
router.get('/signals/:botId', authenticateToken, (req, res) => {
  // Verify bot belongs to user
    botsRepository.findOwnedByUser(req.params.botId, req.user.id).then((bot) => {
        if (!bot) return res.status(404).json({ error: 'Bot not found' });

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
    }).catch((err) => {
      logger.error('Error checking bot ownership via repository:', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Get trades for a bot
router.get('/trades/:botId', authenticateToken, (req, res) => {
  // Verify bot belongs to user
    botsRepository.findOwnedByUser(req.params.botId, req.user.id).then((bot) => {
        if (!bot) return res.status(404).json({ error: 'Bot not found' });

      const { limit = 50, offset = 0, status } = req.query;
      tradesRepository
        .listByBot(req.params.botId, { status, limit: parseInt(limit), offset: parseInt(offset) })
        .then((trades) => res.json({ trades }))
        .catch((err) => {
          logger.error('Error fetching trades via repository:', { error: err.message });
          res.status(500).json({ error: 'Failed to fetch trades' });
        });
    }).catch((err) => {
      logger.error('Error checking bot ownership via repository:', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Execute manual trade
router.post('/execute', authenticateToken, validate(schemas.executeTradeSchema), auditLog('manual_trade', 'trade'), async (req, res) => {
  try {
    const { botId, symbol, side, quantity, price, order_type } = req.validated;
    const created = await tradingService.executeManualTrade({
      userId: req.user.id,
      botId,
      symbol,
      side,
      quantity,
      order_type,
      price
    });
    logger.info(`Manual trade executed: ${side} ${quantity} ${symbol} at ${created.entry_price}`, { tradeId: created.id });
    res.json({
      message: 'Trade executed successfully',
      trade: {
        id: created.id,
        symbol: created.symbol,
        side: created.side,
        quantity: created.quantity,
        entry_price: created.entry_price,
        status: created.status || 'open'
      }
    });
  } catch (err) {
    const status = err.status || 500;
    logger.error('Error executing manual trade', { error: err.message });
    res.status(status).json({ error: err.message || 'Failed to execute trade' });
  }
});

// Close trade
router.post('/trades/:tradeId/close', authenticateToken, auditLog('close_trade', 'trade'), async (req, res) => {
  try {
    const { price } = req.body;
    const updated = await tradingService.closeTrade({ userId: req.user.id, tradeId: req.params.tradeId, price });
    logger.info(`Trade closed: ${req.params.tradeId} with PnL: ${updated.pnl}`);
    res.json({ message: 'Trade closed successfully', trade: { id: updated.id, exit_price: updated.exit_price, pnl: updated.pnl, status: updated.status } });
  } catch (err) {
    const status = err.status || 500;
    logger.error('Error closing trade', { error: err.message });
    res.status(status).json({ error: err.message || 'Failed to close trade' });
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