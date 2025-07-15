const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const marketDataService = require('../utils/marketData');
const logger = require('../utils/logger');

const router = express.Router();

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

// Execute manual trade
router.post('/execute', authenticateToken, auditLog('manual_trade', 'trade'), (req, res) => {
  const { botId, symbol, side, quantity, price } = req.body;

  if (!botId || !symbol || !side || !quantity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Verify bot belongs to user
  db.get(
    'SELECT id, trading_mode FROM bots WHERE id = ? AND user_id = ?',
    [botId, req.user.id],
    (err, bot) => {
      if (err) {
        logger.error('Error checking bot ownership:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      // In a real implementation, this would interface with actual trading APIs
      // For now, we'll simulate the trade execution
      const tradeId = uuidv4();
      const executionPrice = price || (Math.random() * 1000 + 100); // Mock price
      const currentTime = new Date().toISOString();

      db.run(
        `INSERT INTO trades (id, bot_id, symbol, side, quantity, entry_price, status, opened_at)
         VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
        [tradeId, botId, symbol, side, quantity, executionPrice, currentTime],
        function(err) {
          if (err) {
            logger.error('Error executing trade:', err);
            return res.status(500).json({ error: 'Failed to execute trade' });
          }

          logger.info(`Manual trade executed: ${side} ${quantity} ${symbol} at ${executionPrice}`);
          
          res.json({
            message: 'Trade executed successfully',
            trade: {
              id: tradeId,
              symbol,
              side,
              quantity,
              entry_price: executionPrice,
              status: 'open'
            }
          });
        }
      );
    }
  );
});

// Close trade
router.post('/trades/:tradeId/close', authenticateToken, auditLog('close_trade', 'trade'), (req, res) => {
  const { price } = req.body;

  // First, verify the trade belongs to the user's bot
  db.get(
    `SELECT t.*, b.user_id FROM trades t 
     JOIN bots b ON t.bot_id = b.id 
     WHERE t.id = ? AND b.user_id = ?`,
    [req.params.tradeId, req.user.id],
    (err, trade) => {
      if (err) {
        logger.error('Error checking trade ownership:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!trade) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      if (trade.status !== 'open') {
        return res.status(400).json({ error: 'Trade is not open' });
      }

      const exitPrice = price || (Math.random() * 1000 + 100); // Mock price
      const pnl = (exitPrice - trade.entry_price) * trade.quantity * (trade.side === 'buy' ? 1 : -1);
      const currentTime = new Date().toISOString();

      db.run(
        `UPDATE trades 
         SET exit_price = ?, pnl = ?, status = 'closed', closed_at = ?
         WHERE id = ?`,
        [exitPrice, pnl, currentTime, req.params.tradeId],
        function(err) {
          if (err) {
            logger.error('Error closing trade:', err);
            return res.status(500).json({ error: 'Failed to close trade' });
          }

          logger.info(`Trade closed: ${req.params.tradeId} with PnL: ${pnl}`);
          
          res.json({
            message: 'Trade closed successfully',
            trade: {
              id: req.params.tradeId,
              exit_price: exitPrice,
              pnl,
              status: 'closed'
            }
          });
        }
      );
    }
  );
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