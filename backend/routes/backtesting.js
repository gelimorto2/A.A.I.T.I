const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../middleware/enhancedAuth');
const BacktestingService = require('../utils/backtestingService');
const database = require('../config/database');
const logger = require('../utils/logger');

// Initialize backtesting service
const backtestingService = new BacktestingService();

/**
 * Run comprehensive backtest with ML integration
 */
router.post('/run', authenticateToken, auditLog('run_advanced_backtest'), async (req, res) => {
  try {
    const {
      // Basic parameters
      modelIds, // Array of model IDs to compare
      symbols,
      startDate,
      endDate,
      initialCapital = 100000,
      
      // Trading parameters
      commission = 0.001,
      slippage = 0.0005,
      positionSizing = 'percentage',
      riskPerTrade = 0.02,
      stopLoss = 0.05,
      takeProfit = 0.10,
      maxPositions = 5,
      
      // Advanced features
      walkForwardOptimization = false,
      walkForwardPeriods = 12,
      monteCarloSimulations = 1000,
      benchmarkSymbol = 'SPY',
      
      // Risk management
      maxDailyLoss = 0.05,
      maxDrawdown = 0.20,
      positionConcentration = 0.10,
      
      // ML-specific parameters
      retrain_frequency = 'monthly',
      prediction_confidence_threshold = 0.6,
      feature_importance_analysis = true,
      drift_detection = true
    } = req.body;

    // Validate required parameters
    if (!modelIds || !Array.isArray(modelIds) || modelIds.length === 0) {
      return res.status(400).json({ error: 'At least one model ID is required' });
    }

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'At least one symbol is required' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Validate models belong to user
    const modelQuery = `
      SELECT id, name, model_type, training_status 
      FROM ml_models 
      WHERE id IN (${modelIds.map(() => '?').join(',')}) 
      AND user_id = ?
    `;
    
    const models = await database.query(modelQuery, [...modelIds, req.user.id]);
    
    if (models.length !== modelIds.length) {
      return res.status(404).json({ error: 'One or more models not found or not accessible' });
    }

    // Check all models are trained
    const untrainedModels = models.filter(m => m.training_status !== 'trained');
    if (untrainedModels.length > 0) {
      return res.status(400).json({ 
        error: 'All models must be trained before backtesting',
        untrainedModels: untrainedModels.map(m => ({ id: m.id, name: m.name }))
      });
    }

    const backtestId = uuidv4();
    logger.info(`Starting advanced backtest ${backtestId} for user ${req.user.id}`);

    // Prepare backtest configuration
    const backtestConfig = {
      backtestId,
      userId: req.user.id,
      modelIds,
      symbols,
      startDate,
      endDate,
      initialCapital,
      commission,
      slippage,
      positionSizing,
      riskPerTrade,
      stopLoss,
      takeProfit,
      maxPositions,
      walkForwardOptimization,
      walkForwardPeriods,
      monteCarloSimulations,
      benchmarkSymbol,
      maxDailyLoss,
      maxDrawdown,
      positionConcentration,
      retrain_frequency,
      prediction_confidence_threshold,
      feature_importance_analysis,
      drift_detection
    };

    // Run the comprehensive backtest
    const backtestResults = await backtestingService.runComprehensiveBacktest(backtestConfig);

    // Save results to database
    await database.run(`
      INSERT INTO backtesting_results (
        id, model_id, user_id, symbols, start_date, end_date, initial_capital,
        final_capital, total_return, sharpe_ratio, max_drawdown, total_trades,
        win_rate, avg_trade_duration, profit_factor, parameters, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      backtestId,
      modelIds.join(','), // Store multiple model IDs
      req.user.id,
      JSON.stringify(symbols),
      startDate,
      endDate,
      initialCapital,
      backtestResults.finalCapital,
      backtestResults.performance.totalReturn,
      backtestResults.performance.sharpeRatio,
      backtestResults.performance.maxDrawdown,
      backtestResults.trades.length,
      backtestResults.performance.winRate,
      backtestResults.performance.avgTradeDuration,
      backtestResults.performance.profitFactor,
      JSON.stringify(backtestConfig),
      new Date().toISOString()
    ]);

    // Save individual trades
    for (const trade of backtestResults.trades) {
      await database.run(`
        INSERT INTO backtesting_trades (
          id, backtest_id, symbol, side, entry_date, exit_date,
          entry_price, exit_price, quantity, pnl, signal_confidence, prediction_accuracy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        trade.id,
        backtestId,
        trade.symbol,
        trade.side,
        trade.entryDate,
        trade.exitDate,
        trade.entryPrice,
        trade.exitPrice,
        trade.quantity,
        trade.pnl,
        trade.signalConfidence,
        trade.predictionAccuracy
      ]);
    }

    logger.info(`Advanced backtest ${backtestId} completed successfully`);

    res.json({
      success: true,
      backtestId,
      results: backtestResults
    });

  } catch (error) {
    logger.error('Error running advanced backtest:', error);
    res.status(500).json({
      error: 'Failed to run backtest',
      message: error.message
    });
  }
});

/**
 * Get backtest results with detailed analysis
 */
router.get('/:id/results', authenticateToken, async (req, res) => {
  try {
    const backtestId = req.params.id;

    // Get backtest results
    const backtest = await database.get(`
      SELECT * FROM backtesting_results 
      WHERE id = ? AND user_id = ?
    `, [backtestId, req.user.id]);

    if (!backtest) {
      return res.status(404).json({ error: 'Backtest not found' });
    }

    // Get trades
    const trades = await database.query(`
      SELECT * FROM backtesting_trades 
      WHERE backtest_id = ? 
      ORDER BY entry_date
    `, [backtestId]);

    // Calculate additional performance metrics
    const performanceAnalysis = await backtestingService.calculateDetailedPerformance(trades, backtest);

    res.json({
      backtest: {
        ...backtest,
        parameters: JSON.parse(backtest.parameters),
        symbols: JSON.parse(backtest.symbols)
      },
      trades,
      performance: performanceAnalysis
    });

  } catch (error) {
    logger.error('Error fetching backtest results:', error);
    res.status(500).json({
      error: 'Failed to fetch backtest results',
      message: error.message
    });
  }
});

/**
 * Get user's backtest history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const backtests = await database.query(`
      SELECT 
        br.*,
        COALESCE(m.name, 'Multiple Models') as model_names
      FROM backtesting_results br
      LEFT JOIN ml_models m ON m.id = CASE 
        WHEN br.model_id NOT LIKE '%,%' THEN br.model_id 
        ELSE NULL 
      END
      WHERE br.user_id = ?
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), parseInt(offset)]);

    const total = await database.get(`
      SELECT COUNT(*) as count 
      FROM backtesting_results 
      WHERE user_id = ?
    `, [req.user.id]);

    res.json({
      backtests: backtests.map(bt => ({
        ...bt,
        parameters: JSON.parse(bt.parameters),
        symbols: JSON.parse(bt.symbols)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching backtest history:', error);
    res.status(500).json({
      error: 'Failed to fetch backtest history',
      message: error.message
    });
  }
});

/**
 * Compare multiple backtest results
 */
router.post('/compare', authenticateToken, async (req, res) => {
  try {
    const { backtestIds } = req.body;
    
    if (!backtestIds || !Array.isArray(backtestIds) || backtestIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 backtest IDs are required for comparison' });
    }

    // Get all backtest results
    const backtests = await database.query(`
      SELECT * FROM backtesting_results 
      WHERE id IN (${backtestIds.map(() => '?').join(',')}) 
      AND user_id = ?
    `, [...backtestIds, req.user.id]);

    if (backtests.length !== backtestIds.length) {
      return res.status(404).json({ error: 'One or more backtests not found' });
    }

    // Get trades for each backtest
    const backtestComparison = await Promise.all(
      backtests.map(async (backtest) => {
        const trades = await database.query(`
          SELECT * FROM backtesting_trades 
          WHERE backtest_id = ? 
          ORDER BY entry_date
        `, [backtest.id]);

        const performance = await backtestingService.calculateDetailedPerformance(trades, backtest);

        return {
          backtest: {
            ...backtest,
            parameters: JSON.parse(backtest.parameters),
            symbols: JSON.parse(backtest.symbols)
          },
          trades,
          performance
        };
      })
    );

    // Generate comparison analysis
    const comparisonAnalysis = backtestingService.generateComparisonAnalysis(backtestComparison);

    res.json({
      backtests: backtestComparison,
      comparison: comparisonAnalysis
    });

  } catch (error) {
    logger.error('Error comparing backtests:', error);
    res.status(500).json({
      error: 'Failed to compare backtests',
      message: error.message
    });
  }
});

/**
 * Delete backtest results
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const backtestId = req.params.id;

    // Verify ownership
    const backtest = await database.get(`
      SELECT id FROM backtesting_results 
      WHERE id = ? AND user_id = ?
    `, [backtestId, req.user.id]);

    if (!backtest) {
      return res.status(404).json({ error: 'Backtest not found' });
    }

    // Delete trades first (foreign key constraint)
    await database.run('DELETE FROM backtesting_trades WHERE backtest_id = ?', [backtestId]);
    
    // Delete backtest results
    await database.run('DELETE FROM backtesting_results WHERE id = ?', [backtestId]);

    logger.info(`Backtest ${backtestId} deleted by user ${req.user.id}`);

    res.json({ success: true, message: 'Backtest deleted successfully' });

  } catch (error) {
    logger.error('Error deleting backtest:', error);
    res.status(500).json({
      error: 'Failed to delete backtest',
      message: error.message
    });
  }
});

module.exports = router;