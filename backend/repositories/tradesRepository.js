const BaseRepository = require('./baseRepository');
const databaseConfig = require('../config/database');

class TradesRepository extends BaseRepository {
  constructor() {
    super('trades');
  }

  async create(trade) {
    if (databaseConfig.type === 'postgresql') {
      const sql = `INSERT INTO trades (id, bot_id, signal_id, symbol, side, quantity, entry_price, status, opened_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`;
      const params = [
        trade.id,
        trade.bot_id,
        trade.signal_id || null,
        trade.symbol,
        trade.side,
        trade.quantity,
        trade.entry_price,
        trade.status || 'open'
      ];
      const { rows } = await databaseConfig.query(sql, params);
      return rows[0];
    } else {
      const sql = `INSERT INTO trades (id, bot_id, signal_id, symbol, side, quantity, entry_price, status, opened_at)
                   VALUES (?,?,?,?,?,?,?,?, datetime('now'))`;
      const params = [
        trade.id,
        trade.bot_id,
        trade.signal_id || null,
        trade.symbol,
        trade.side,
        trade.quantity,
        trade.entry_price,
        trade.status || 'open'
      ];
      const result = await databaseConfig.query(sql, params);
      return { ...trade, opened_at: new Date().toISOString() };
    }
  }

  async listByBot(botId, { status, limit = 50, offset = 0 } = {}) {
    if (databaseConfig.type === 'postgresql') {
      let sql = `SELECT * FROM trades WHERE bot_id = $1`;
      const params = [botId];
      if (status) {
        sql += ' AND status = $2';
        params.push(status);
      }
      sql += ' ORDER BY opened_at DESC LIMIT $3 OFFSET $4';
      params.push(limit, offset);
      const { rows } = await databaseConfig.query(sql, params);
      return rows;
    } else {
      let sql = `SELECT * FROM trades WHERE bot_id = ?`;
      const params = [botId];
      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }
      sql += ' ORDER BY opened_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      const { rows } = await databaseConfig.query(sql, params);
      return rows;
    }
  }

  async close(tradeId, exitPrice, pnl) {
    if (databaseConfig.type === 'postgresql') {
      const sql = `UPDATE trades SET exit_price = $1, pnl = $2, status = 'closed', closed_at = NOW() WHERE id = $3 RETURNING *`;
      const { rows } = await databaseConfig.query(sql, [exitPrice, pnl, tradeId]);
      return rows[0] || null;
    } else {
      const sql = `UPDATE trades SET exit_price = ?, pnl = ?, status = 'closed', closed_at = datetime('now') WHERE id = ?`;
      await databaseConfig.query(sql, [exitPrice, pnl, tradeId]);
      const { rows } = await databaseConfig.query(`SELECT * FROM trades WHERE id = ?`, [tradeId]);
      return rows[0] || null;
    }
  }
}

module.exports = new TradesRepository();
