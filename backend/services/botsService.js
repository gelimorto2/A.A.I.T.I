const { v4: uuidv4 } = require('uuid');
const databaseConfig = require('../config/database');

function withPlaceholders(sql, params) {
  if (databaseConfig.type === 'postgresql') {
    let i = 0;
    const text = sql.replace(/\?/g, () => `$${++i}`);
    return { text, params };
  }
  return { text: sql, params };
}

async function getUserBots(userId) {
  const sql = `
    SELECT b.*, bm.health_score, bm.pnl, bm.total_trades, bm.win_rate, bm.sharpe_ratio, bm.max_drawdown
    FROM bots b
    LEFT JOIN (
      SELECT bot_id, health_score, pnl, total_trades, win_rate, sharpe_ratio, max_drawdown,
             ROW_NUMBER() OVER (PARTITION BY bot_id ORDER BY timestamp DESC) as rn
      FROM bot_metrics
    ) bm ON b.id = bm.bot_id AND bm.rn = 1
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC`;
  const params = [userId];
  const { text, params: bound } = withPlaceholders(sql, params);
  const { rows } = await databaseConfig.query(text, bound);
  return rows;
}

async function getUserBot(userId, botId) {
  const sql = `
    SELECT b.*, bm.health_score, bm.pnl, bm.total_trades, bm.win_rate, bm.sharpe_ratio, bm.max_drawdown,
           bm.execution_latency, bm.prediction_accuracy, bm.risk_score
    FROM bots b
    LEFT JOIN (
      SELECT bot_id, health_score, pnl, total_trades, win_rate, sharpe_ratio, max_drawdown,
             execution_latency, prediction_accuracy, risk_score,
             ROW_NUMBER() OVER (PARTITION BY bot_id ORDER BY timestamp DESC) as rn
      FROM bot_metrics
    ) bm ON b.id = bm.bot_id AND bm.rn = 1
    WHERE b.id = ? AND b.user_id = ?`;
  const params = [botId, userId];
  const { text, params: bound } = withPlaceholders(sql, params);
  const { rows } = await databaseConfig.query(text, bound, true);
  return rows[0] || null;
}

async function createBot({ userId, name, description, strategy_type, trading_mode, config }) {
  const id = uuidv4();
  const insert = `INSERT INTO bots (id, name, description, user_id, strategy_type, trading_mode, config)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const params = [id, name, description, userId, strategy_type, trading_mode, JSON.stringify(config || {})];
  const { text, params: bound } = withPlaceholders(insert, params);
  await databaseConfig.query(text, bound);
  // Create default risk params (best-effort)
  const riskId = uuidv4();
  const riskSql = `INSERT INTO risk_parameters (id, bot_id, max_position_size, max_daily_loss, max_drawdown, stop_loss_pct, take_profit_pct)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const riskParams = [riskId, id, 1000, 100, 0.1, 0.02, 0.05];
  const { text: riskText, params: riskBound } = withPlaceholders(riskSql, riskParams);
  try { await databaseConfig.query(riskText, riskBound); } catch (_) {}
  return { id };
}

async function setBotStatus({ userId, botId, status }) {
  const exists = await getUserBot(userId, botId);
  if (!exists) return null;
  const sql = `UPDATE bots SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  const params = [status, botId];
  const { text, params: bound } = withPlaceholders(sql, params);
  await databaseConfig.query(text, bound);
  return { id: botId, status };
}

async function deleteBot({ userId, botId }) {
  const exists = await getUserBot(userId, botId);
  if (!exists) return false;
  const queries = [
    ['DELETE FROM bot_metrics WHERE bot_id = ?', [botId]],
    ['DELETE FROM trading_signals WHERE bot_id = ?', [botId]],
    ['DELETE FROM trades WHERE bot_id = ?', [botId]],
    ['DELETE FROM risk_parameters WHERE bot_id = ?', [botId]],
    ['DELETE FROM performance_snapshots WHERE bot_id = ?', [botId]],
    ['DELETE FROM bots WHERE id = ?', [botId]]
  ];
  for (const [sql, params] of queries) {
    const { text, params: bound } = withPlaceholders(sql, params);
    await databaseConfig.query(text, bound);
  }
  return true;
}

module.exports = { getUserBots, getUserBot, createBot, setBotStatus, deleteBot };
