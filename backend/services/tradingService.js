const { v4: uuidv4 } = require('uuid');
const botsRepository = require('../repositories/botsRepository');
const tradesRepository = require('../repositories/tradesRepository');
const marketDataService = require('../utils/marketData');
const { evaluateOrder } = require('../utils/riskEngine');
const databaseConfig = require('../config/database');

async function executeManualTrade({ userId, botId, symbol, side, quantity, order_type, price }) {
  const bot = await botsRepository.findOwnedByUser(botId, userId);
  if (!bot) {
    const err = new Error('Bot not found');
    err.status = 404;
    throw err;
  }

  let executionPrice = price;
  if (!executionPrice) {
    try {
      const quote = await marketDataService.getQuote(symbol);
      executionPrice = quote?.price || (Math.random() * 1000 + 100);
    } catch (_) {
      executionPrice = Math.random() * 1000 + 100;
    }
  }

  const risk = evaluateOrder({ portfolio: null, symbol, side, type: order_type, quantity, price: executionPrice });
  if (!risk.allowed) {
    const err = new Error(`Order blocked by risk engine: ${risk.reason}`);
    err.status = 400;
    throw err;
  }

  const tradeId = uuidv4();
  const tradePayload = {
    id: tradeId,
    bot_id: botId,
    symbol,
    side,
    quantity,
    entry_price: executionPrice,
    status: 'open'
  };

  const created = await tradesRepository.create(tradePayload);
  return created || tradePayload;
}

async function closeTrade({ userId, tradeId, price }) {
  // Verify ownership and get trade details
  let sql, params;
  if (databaseConfig.type === 'postgresql') {
    sql = `SELECT t.*, b.user_id FROM trades t JOIN bots b ON t.bot_id = b.id WHERE t.id = $1 AND b.user_id = $2`;
    params = [tradeId, userId];
  } else {
    sql = `SELECT t.*, b.user_id FROM trades t JOIN bots b ON t.bot_id = b.id WHERE t.id = ? AND b.user_id = ?`;
    params = [tradeId, userId];
  }
  const { rows } = await databaseConfig.query(sql, params, true);
  const trade = rows[0];
  if (!trade) {
    const err = new Error('Trade not found');
    err.status = 404;
    throw err;
  }
  if (trade.status !== 'open') {
    const err = new Error('Trade is not open');
    err.status = 400;
    throw err;
  }

  const exitPrice = price || (Math.random() * 1000 + 100);
  const pnl = (exitPrice - trade.entry_price) * trade.quantity * (trade.side === 'buy' ? 1 : -1);
  const updated = await tradesRepository.close(tradeId, exitPrice, pnl);
  return updated;
}

module.exports = {
  executeManualTrade,
  closeTrade
};
