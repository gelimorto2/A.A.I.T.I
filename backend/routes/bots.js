const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');
const botsService = require('../services/botsService');
const tradesRepository = require('../repositories/tradesRepository');

const router = express.Router();

// Get bot performance data for analytics
router.get('/performance', (req, res) => {
  // Generate demo bot performance data
  const botPerformanceData = [
    {
      botId: '1',
      botName: 'Momentum Trader',
      totalTrades: 156,
      totalPnl: 2347.50,
      winRate: 57.1,
      sharpeRatio: 1.34,
      maxDrawdown: -5.2,
      status: 'running'
    },
    {
      botId: '2',
      botName: 'Arbitrage Hunter',
      totalTrades: 203,
      totalPnl: 1892.30,
      winRate: 66.0,
      sharpeRatio: 1.78,
      maxDrawdown: -3.1,
      status: 'running'
    },
    {
      botId: '3',
      botName: 'Grid Trader',
      totalTrades: 89,
      totalPnl: 1543.20,
      winRate: 45.5,
      sharpeRatio: 0.92,
      maxDrawdown: -8.7,
      status: 'stopped'
    }
  ];

  res.json({ 
    bots: botPerformanceData,
    success: true
  });
});

// Get all bots for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await botsService.getUserBots(req.user.id);
    const bots = rows.map(bot => ({
      ...bot,
      config: bot.config ? (typeof bot.config === 'string' ? JSON.parse(bot.config) : bot.config) : null
    }));
    res.json({ bots });
  } catch (err) {
    logger.error('Error fetching bots:', err);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

// Get specific bot by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const bot = await botsService.getUserBot(req.user.id, req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    bot.config = bot.config ? (typeof bot.config === 'string' ? JSON.parse(bot.config) : bot.config) : null;
    res.json({ bot });
  } catch (err) {
    logger.error('Error fetching bot:', err);
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

// Create new bot
router.post('/', authenticateToken, auditLog('bot_create', 'bot'), async (req, res) => {
  const { name, description, strategy_type, trading_mode = 'paper', config = {} } = req.body;

  if (!name || !strategy_type) {
    return res.status(400).json({ error: 'Name and strategy type are required' });
  }

  const validTradingModes = ['live', 'paper', 'shadow'];
  if (!validTradingModes.includes(trading_mode)) {
    return res.status(400).json({ error: 'Invalid trading mode' });
  }

  try {
    const { id } = await botsService.createBot({
      userId: req.user.id,
      name,
      description,
      strategy_type,
      trading_mode,
      config
    });
    logger.info(`Bot created: ${name} by user ${req.user.username}`);
    res.status(201).json({
      message: 'Bot created successfully',
      bot: { id, name, description, strategy_type, trading_mode, status: 'stopped', config }
    });
  } catch (err) {
    logger.error('Error creating bot:', err);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

// Update bot
router.put('/:id', authenticateToken, auditLog('bot_update', 'bot'), (req, res) => {
  const { name, description, strategy_type, trading_mode, config } = req.body;

  // First check if bot exists and belongs to user
  db.get(
    'SELECT id FROM bots WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, bot) => {
      if (err) {
        logger.error('Error checking bot ownership:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      const configJson = config ? JSON.stringify(config) : null;
      const updates = [];
      const params = [];

      if (name) {
        updates.push('name = ?');
        params.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (strategy_type) {
        updates.push('strategy_type = ?');
        params.push(strategy_type);
      }
      if (trading_mode) {
        updates.push('trading_mode = ?');
        params.push(trading_mode);
      }
      if (config) {
        updates.push('config = ?');
        params.push(configJson);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.params.id);

      const query = `UPDATE bots SET ${updates.join(', ')} WHERE id = ?`;

      db.run(query, params, function(err) {
        if (err) {
          logger.error('Error updating bot:', err);
          return res.status(500).json({ error: 'Failed to update bot' });
        }

        logger.info(`Bot updated: ${req.params.id} by user ${req.user.username}`);
        res.json({ message: 'Bot updated successfully' });
      });
    }
  );
});

// Start bot
router.post('/:id/start', authenticateToken, auditLog('bot_start', 'bot'), async (req, res) => {
  try {
    const current = await botsService.getUserBot(req.user.id, req.params.id);
    if (!current) return res.status(404).json({ error: 'Bot not found' });
    if (current.status === 'running') return res.status(400).json({ error: 'Bot is already running' });
    await botsService.setBotStatus({ userId: req.user.id, botId: req.params.id, status: 'running' });
    logger.info(`Bot started: ${req.params.id} by user ${req.user.username}`);
    res.json({ message: 'Bot started successfully' });
  } catch (err) {
    logger.error('Error starting bot:', err);
    res.status(500).json({ error: 'Failed to start bot' });
  }
});

// Stop bot
router.post('/:id/stop', authenticateToken, auditLog('bot_stop', 'bot'), async (req, res) => {
  try {
    const current = await botsService.getUserBot(req.user.id, req.params.id);
    if (!current) return res.status(404).json({ error: 'Bot not found' });
    if (current.status === 'stopped') return res.status(400).json({ error: 'Bot is already stopped' });
    await botsService.setBotStatus({ userId: req.user.id, botId: req.params.id, status: 'stopped' });
    logger.info(`Bot stopped: ${req.params.id} by user ${req.user.username}`);
    res.json({ message: 'Bot stopped successfully' });
  } catch (err) {
    logger.error('Error stopping bot:', err);
    res.status(500).json({ error: 'Failed to stop bot' });
  }
});

// Delete bot
router.delete('/:id', authenticateToken, auditLog('bot_delete', 'bot'), async (req, res) => {
  try {
    const ok = await botsService.deleteBot({ userId: req.user.id, botId: req.params.id });
    if (!ok) return res.status(404).json({ error: 'Bot not found' });
    logger.info(`Bot deleted: ${req.params.id} by user ${req.user.username}`);
    res.json({ message: 'Bot deleted successfully' });
  } catch (err) {
    logger.error('Error deleting bot:', err);
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

// Get bot metrics history
router.get('/:id/metrics', authenticateToken, (req, res) => {
  const { days = 7 } = req.query;

  db.get(
    'SELECT id FROM bots WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, bot) => {
      if (err) {
        logger.error('Error checking bot:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      db.all(
        `SELECT * FROM bot_metrics 
         WHERE bot_id = ? AND timestamp >= datetime('now', '-${parseInt(days)} days')
         ORDER BY timestamp DESC`,
        [req.params.id],
        (err, metrics) => {
          if (err) {
            logger.error('Error fetching bot metrics:', err);
            return res.status(500).json({ error: 'Failed to fetch metrics' });
          }

          res.json({ metrics });
        }
      );
    }
  );
});

module.exports = router;

// --- CSV/History export endpoints (public mode) ---
// Return bot trade history as JSON
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const botId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit) || 1000, 10000);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;
    const trades = await tradesRepository.listByBot(botId, { status, limit, offset });
    res.json({ botId, count: trades.length, trades });
  } catch (err) {
    logger.error('Error fetching bot history:', err);
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

// Return bot trade history as CSV
router.get('/:id/history.csv', authenticateToken, async (req, res) => {
  try {
    const botId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit) || 5000, 20000);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;
    const trades = await tradesRepository.listByBot(botId, { status, limit, offset });

    // Generate CSV
    const headers = [
      'id','bot_id','signal_id','symbol','side','quantity','entry_price','exit_price','pnl','status','opened_at','closed_at'
    ];
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const rows = trades.map(t => headers.map(h => escape(t[h])).join(','));
    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bot_${botId}_history.csv"`);
    res.send(csv);
  } catch (err) {
    logger.error('Error exporting bot history CSV:', err);
    res.status(500).json({ error: 'Failed to export trade history' });
  }
});