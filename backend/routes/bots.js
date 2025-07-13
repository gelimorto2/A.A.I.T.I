const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all bots for the authenticated user
router.get('/', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      b.*,
      bm.health_score,
      bm.pnl,
      bm.total_trades,
      bm.win_rate,
      bm.sharpe_ratio,
      bm.max_drawdown
    FROM bots b
    LEFT JOIN (
      SELECT bot_id, 
             health_score, 
             pnl, 
             total_trades, 
             win_rate, 
             sharpe_ratio, 
             max_drawdown,
             ROW_NUMBER() OVER (PARTITION BY bot_id ORDER BY timestamp DESC) as rn
      FROM bot_metrics
    ) bm ON b.id = bm.bot_id AND bm.rn = 1
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `;

  db.all(query, [req.user.id], (err, bots) => {
    if (err) {
      logger.error('Error fetching bots:', err);
      return res.status(500).json({ error: 'Failed to fetch bots' });
    }

    // Parse config JSON for each bot
    const botsWithParsedConfig = bots.map(bot => ({
      ...bot,
      config: bot.config ? JSON.parse(bot.config) : null
    }));

    res.json({ bots: botsWithParsedConfig });
  });
});

// Get specific bot by ID
router.get('/:id', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      b.*,
      bm.health_score,
      bm.pnl,
      bm.total_trades,
      bm.win_rate,
      bm.sharpe_ratio,
      bm.max_drawdown,
      bm.execution_latency,
      bm.prediction_accuracy,
      bm.risk_score
    FROM bots b
    LEFT JOIN (
      SELECT bot_id, 
             health_score, 
             pnl, 
             total_trades, 
             win_rate, 
             sharpe_ratio, 
             max_drawdown,
             execution_latency,
             prediction_accuracy,
             risk_score,
             ROW_NUMBER() OVER (PARTITION BY bot_id ORDER BY timestamp DESC) as rn
      FROM bot_metrics
    ) bm ON b.id = bm.bot_id AND bm.rn = 1
    WHERE b.id = ? AND b.user_id = ?
  `;

  db.get(query, [req.params.id, req.user.id], (err, bot) => {
    if (err) {
      logger.error('Error fetching bot:', err);
      return res.status(500).json({ error: 'Failed to fetch bot' });
    }

    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    // Parse config JSON
    bot.config = bot.config ? JSON.parse(bot.config) : null;

    res.json({ bot });
  });
});

// Create new bot
router.post('/', authenticateToken, auditLog('bot_create', 'bot'), (req, res) => {
  const { name, description, strategy_type, trading_mode = 'paper', config = {} } = req.body;

  if (!name || !strategy_type) {
    return res.status(400).json({ error: 'Name and strategy type are required' });
  }

  const validTradingModes = ['live', 'paper', 'shadow'];
  if (!validTradingModes.includes(trading_mode)) {
    return res.status(400).json({ error: 'Invalid trading mode' });
  }

  const botId = uuidv4();
  const configJson = JSON.stringify(config);

  db.run(
    `INSERT INTO bots (id, name, description, user_id, strategy_type, trading_mode, config)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [botId, name, description, req.user.id, strategy_type, trading_mode, configJson],
    function(err) {
      if (err) {
        logger.error('Error creating bot:', err);
        return res.status(500).json({ error: 'Failed to create bot' });
      }

      // Create initial risk parameters
      const riskParamsId = uuidv4();
      db.run(
        `INSERT INTO risk_parameters (id, bot_id, max_position_size, max_daily_loss, max_drawdown, stop_loss_pct, take_profit_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [riskParamsId, botId, 1000, 100, 0.1, 0.02, 0.05],
        (err) => {
          if (err) {
            logger.error('Error creating risk parameters:', err);
          }
        }
      );

      logger.info(`Bot created: ${name} by user ${req.user.username}`);
      res.status(201).json({
        message: 'Bot created successfully',
        bot: {
          id: botId,
          name,
          description,
          strategy_type,
          trading_mode,
          status: 'stopped',
          config
        }
      });
    }
  );
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
router.post('/:id/start', authenticateToken, auditLog('bot_start', 'bot'), (req, res) => {
  db.get(
    'SELECT id, status FROM bots WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, bot) => {
      if (err) {
        logger.error('Error checking bot:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      if (bot.status === 'running') {
        return res.status(400).json({ error: 'Bot is already running' });
      }

      db.run(
        'UPDATE bots SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['running', req.params.id],
        function(err) {
          if (err) {
            logger.error('Error starting bot:', err);
            return res.status(500).json({ error: 'Failed to start bot' });
          }

          logger.info(`Bot started: ${req.params.id} by user ${req.user.username}`);
          
          // Here you would trigger the actual bot execution logic
          // For now, we'll just update the status
          
          res.json({ message: 'Bot started successfully' });
        }
      );
    }
  );
});

// Stop bot
router.post('/:id/stop', authenticateToken, auditLog('bot_stop', 'bot'), (req, res) => {
  db.get(
    'SELECT id, status FROM bots WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, bot) => {
      if (err) {
        logger.error('Error checking bot:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }

      if (bot.status === 'stopped') {
        return res.status(400).json({ error: 'Bot is already stopped' });
      }

      db.run(
        'UPDATE bots SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['stopped', req.params.id],
        function(err) {
          if (err) {
            logger.error('Error stopping bot:', err);
            return res.status(500).json({ error: 'Failed to stop bot' });
          }

          logger.info(`Bot stopped: ${req.params.id} by user ${req.user.username}`);
          res.json({ message: 'Bot stopped successfully' });
        }
      );
    }
  );
});

// Delete bot
router.delete('/:id', authenticateToken, auditLog('bot_delete', 'bot'), (req, res) => {
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

      // Delete related data first
      db.serialize(() => {
        db.run('DELETE FROM bot_metrics WHERE bot_id = ?', [req.params.id]);
        db.run('DELETE FROM trading_signals WHERE bot_id = ?', [req.params.id]);
        db.run('DELETE FROM trades WHERE bot_id = ?', [req.params.id]);
        db.run('DELETE FROM risk_parameters WHERE bot_id = ?', [req.params.id]);
        db.run('DELETE FROM performance_snapshots WHERE bot_id = ?', [req.params.id]);
        
        db.run('DELETE FROM bots WHERE id = ?', [req.params.id], function(err) {
          if (err) {
            logger.error('Error deleting bot:', err);
            return res.status(500).json({ error: 'Failed to delete bot' });
          }

          logger.info(`Bot deleted: ${req.params.id} by user ${req.user.username}`);
          res.json({ message: 'Bot deleted successfully' });
        });
      });
    }
  );
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