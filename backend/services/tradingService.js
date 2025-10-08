const { v4: uuidv4 } = require('uuid');
const botsRepository = require('../repositories/botsRepository');
const tradesRepository = require('../repositories/tradesRepository');
const marketDataService = require('../utils/marketData');
const { evaluateOrder } = require('../utils/riskEngine');
const databaseConfig = require('../config/database');
const logger = require('../utils/logger');

// Risk manager will be injected
let riskManager = null;

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

  // Enhanced risk evaluation using the new risk manager
  let riskAssessment;
  if (riskManager) {
    try {
      riskAssessment = await riskManager.evaluateTradeRisk(botId, symbol, side, quantity, executionPrice, {
        orderType: order_type,
        isManualTrade: true,
        userId: userId
      });

      if (!riskAssessment.approved) {
        const err = new Error(`Order blocked by risk manager: ${riskAssessment.blockers.join(', ')}`);
        err.status = 400;
        err.riskAssessment = riskAssessment;
        throw err;
      }

      // Use adjusted quantity if recommended
      if (riskAssessment.adjustedQuantity !== quantity) {
        logger.info('Position size adjusted by risk manager', {
          originalQuantity: quantity,
          adjustedQuantity: riskAssessment.adjustedQuantity,
          symbol,
          botId,
          service: 'trading-service'
        });
        quantity = riskAssessment.adjustedQuantity;
      }
    } catch (error) {
      if (error.riskAssessment) throw error;
      logger.warn('Risk evaluation failed, falling back to legacy risk engine', {
        error: error.message,
        service: 'trading-service'
      });
    }
  }

  // Fallback to legacy risk evaluation if enhanced risk manager is not available
  if (!riskAssessment) {
    const risk = evaluateOrder({ portfolio: null, symbol, side, type: order_type, quantity, price: executionPrice });
    if (!risk.allowed) {
      const err = new Error(`Order blocked by risk engine: ${risk.reason}`);
      err.status = 400;
      throw err;
    }
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

/**
 * Initialize trading service with risk manager
 */
function setRiskManager(riskManagerInstance) {
  riskManager = riskManagerInstance;
  logger.info('Enhanced risk manager integrated with trading service', {
    service: 'trading-service'
  });
}

/**
 * Get current risk manager instance
 */
function getRiskManager() {
  return riskManager;
}

/**
 * Execute automated trade (for ML/bot trading)
 */
async function executeAutomatedTrade({ botId, symbol, side, quantity, price, metadata = {} }) {
  try {
    const bot = await botsRepository.findById(botId);
    if (!bot) {
      throw new Error('Bot not found');
    }

    if (!bot.is_active) {
      throw new Error('Bot is not active');
    }

    // Get execution price
    let executionPrice = price;
    if (!executionPrice) {
      try {
        const quote = await marketDataService.getQuote(symbol);
        executionPrice = quote?.price || null;
      } catch (error) {
        logger.warn('Failed to get market price', {
          error: error.message,
          symbol,
          service: 'trading-service'
        });
      }
    }

    if (!executionPrice) {
      throw new Error('Unable to determine execution price');
    }

    // Enhanced risk evaluation for automated trades
    let riskAssessment;
    if (riskManager) {
      riskAssessment = await riskManager.evaluateTradeRisk(botId, symbol, side, quantity, executionPrice, {
        ...metadata,
        isAutomatedTrade: true,
        botStrategy: bot.strategy
      });

      if (!riskAssessment.approved) {
        logger.warn('Automated trade blocked by risk manager', {
          botId,
          symbol,
          side,
          quantity,
          blockers: riskAssessment.blockers,
          warnings: riskAssessment.warnings,
          service: 'trading-service'
        });
        
        return {
          success: false,
          blocked: true,
          reason: riskAssessment.blockers.join(', '),
          riskAssessment
        };
      }

      // Use adjusted quantity
      if (riskAssessment.adjustedQuantity !== quantity) {
        logger.info('Automated trade quantity adjusted by risk manager', {
          originalQuantity: quantity,
          adjustedQuantity: riskAssessment.adjustedQuantity,
          symbol,
          botId,
          service: 'trading-service'
        });
        quantity = riskAssessment.adjustedQuantity;
      }
    }

    // Execute the trade
    const tradeId = uuidv4();
    const tradePayload = {
      id: tradeId,
      bot_id: botId,
      symbol,
      side,
      quantity,
      entry_price: executionPrice,
      status: 'open',
      metadata: JSON.stringify(metadata)
    };

    const created = await tradesRepository.create(tradePayload);
    
    logger.info('Automated trade executed successfully', {
      tradeId,
      botId,
      symbol,
      side,
      quantity,
      price: executionPrice,
      riskScore: riskAssessment?.riskScore,
      service: 'trading-service'
    });

    return {
      success: true,
      trade: created || tradePayload,
      riskAssessment
    };
  } catch (error) {
    logger.error('Automated trade execution failed', {
      error: error.message,
      botId,
      symbol,
      side,
      quantity,
      service: 'trading-service'
    });
    
    return {
      success: false,
      error: error.message,
      blocked: false
    };
  }
}

/**
 * Get trading statistics and risk metrics
 */
async function getTradingStatistics(userId, botId = null) {
  try {
    let sql, params;
    
    // Build query based on parameters
    if (botId) {
      if (databaseConfig.type === 'postgresql') {
        sql = `
          SELECT 
            COUNT(*) as total_trades,
            SUM(CASE WHEN status = 'closed' AND pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
            SUM(CASE WHEN status = 'closed' AND pnl <= 0 THEN 1 ELSE 0 END) as losing_trades,
            SUM(CASE WHEN status = 'closed' THEN pnl ELSE 0 END) as total_pnl,
            AVG(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as avg_pnl,
            MAX(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as max_win,
            MIN(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as max_loss,
            COUNT(CASE WHEN status = 'open' THEN 1 END) as open_trades
          FROM trades t 
          JOIN bots b ON t.bot_id = b.id 
          WHERE b.user_id = $1 AND t.bot_id = $2
        `;
        params = [userId, botId];
      } else {
        sql = `
          SELECT 
            COUNT(*) as total_trades,
            SUM(CASE WHEN status = 'closed' AND pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
            SUM(CASE WHEN status = 'closed' AND pnl <= 0 THEN 1 ELSE 0 END) as losing_trades,
            SUM(CASE WHEN status = 'closed' THEN pnl ELSE 0 END) as total_pnl,
            AVG(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as avg_pnl,
            MAX(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as max_win,
            MIN(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as max_loss,
            COUNT(CASE WHEN status = 'open' THEN 1 END) as open_trades
          FROM trades t 
          JOIN bots b ON t.bot_id = b.id 
          WHERE b.user_id = ? AND t.bot_id = ?
        `;
        params = [userId, botId];
      }
    } else {
      if (databaseConfig.type === 'postgresql') {
        sql = `
          SELECT 
            COUNT(*) as total_trades,
            SUM(CASE WHEN status = 'closed' AND pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
            SUM(CASE WHEN status = 'closed' AND pnl <= 0 THEN 1 ELSE 0 END) as losing_trades,
            SUM(CASE WHEN status = 'closed' THEN pnl ELSE 0 END) as total_pnl,
            AVG(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as avg_pnl,
            MAX(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as max_win,
            MIN(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as max_loss,
            COUNT(CASE WHEN status = 'open' THEN 1 END) as open_trades
          FROM trades t 
          JOIN bots b ON t.bot_id = b.id 
          WHERE b.user_id = $1
        `;
        params = [userId];
      } else {
        sql = `
          SELECT 
            COUNT(*) as total_trades,
            SUM(CASE WHEN status = 'closed' AND pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
            SUM(CASE WHEN status = 'closed' AND pnl <= 0 THEN 1 ELSE 0 END) as losing_trades,
            SUM(CASE WHEN status = 'closed' THEN pnl ELSE 0 END) as total_pnl,
            AVG(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as avg_pnl,
            MAX(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as max_win,
            MIN(CASE WHEN status = 'closed' THEN pnl ELSE NULL END) as max_loss,
            COUNT(CASE WHEN status = 'open' THEN 1 END) as open_trades
          FROM trades t 
          JOIN bots b ON t.bot_id = b.id 
          WHERE b.user_id = ?
        `;
        params = [userId];
      }
    }

    const { rows } = await databaseConfig.query(sql, params, true);
    const stats = rows[0];

    // Calculate additional metrics
    const totalClosed = parseInt(stats.winning_trades) + parseInt(stats.losing_trades);
    const winRate = totalClosed > 0 ? parseInt(stats.winning_trades) / totalClosed : 0;
    const profitFactor = stats.max_loss < 0 ? Math.abs(stats.max_win / stats.max_loss) : 0;

    return {
      totalTrades: parseInt(stats.total_trades),
      openTrades: parseInt(stats.open_trades),
      closedTrades: totalClosed,
      winningTrades: parseInt(stats.winning_trades),
      losingTrades: parseInt(stats.losing_trades),
      winRate: winRate,
      totalPnL: parseFloat(stats.total_pnl || 0),
      avgPnL: parseFloat(stats.avg_pnl || 0),
      maxWin: parseFloat(stats.max_win || 0),
      maxLoss: parseFloat(stats.max_loss || 0),
      profitFactor: profitFactor
    };
  } catch (error) {
    logger.error('Failed to get trading statistics', {
      error: error.message,
      userId,
      botId,
      service: 'trading-service'
    });
    throw error;
  }
}

module.exports = {
  executeManualTrade,
  closeTrade,
  executeAutomatedTrade,
  getTradingStatistics,
  setRiskManager,
  getRiskManager
};
