const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const portfolioOptimizer = require('../utils/portfolioOptimizer');
const marketDataService = require('../utils/marketData');

const router = express.Router();

// Get portfolio overview for user
router.get('/portfolio', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      b.id as bot_id,
      b.name as bot_name,
      b.trading_mode,
      COALESCE(SUM(t.pnl), 0) as total_pnl,
      COUNT(t.id) as total_trades,
      COUNT(CASE WHEN t.pnl > 0 THEN 1 END) as winning_trades,
      COALESCE(AVG(t.pnl), 0) as avg_pnl,
      COALESCE(MAX(t.pnl), 0) as best_trade,
      COALESCE(MIN(t.pnl), 0) as worst_trade
    FROM bots b
    LEFT JOIN trades t ON b.id = t.bot_id AND t.status = 'closed'
    WHERE b.user_id = ?
    GROUP BY b.id, b.name, b.trading_mode
  `;

  db.all(query, [req.user.id], (err, portfolio) => {
    if (err) {
      logger.error('Error fetching portfolio:', err);
      return res.status(500).json({ error: 'Failed to fetch portfolio' });
    }

    // Calculate overall statistics
    const overall = portfolio.reduce((acc, bot) => {
      acc.total_pnl += bot.total_pnl;
      acc.total_trades += bot.total_trades;
      acc.winning_trades += bot.winning_trades;
      return acc;
    }, { total_pnl: 0, total_trades: 0, winning_trades: 0 });

    overall.win_rate = overall.total_trades > 0 ? (overall.winning_trades / overall.total_trades) * 100 : 0;

    res.json({ 
      portfolio: portfolio.map(bot => ({
        ...bot,
        win_rate: bot.total_trades > 0 ? (bot.winning_trades / bot.total_trades) * 100 : 0
      })),
      overall 
    });
  });
});

// Get performance analytics for a specific bot
router.get('/performance/:botId', authenticateToken, (req, res) => {
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

      const { days = 30 } = req.query;

      // Get daily performance snapshots
      db.all(
        `SELECT * FROM performance_snapshots 
         WHERE bot_id = ? AND date >= date('now', '-${parseInt(days)} days')
         ORDER BY date ASC`,
        [req.params.botId],
        (err, snapshots) => {
          if (err) {
            logger.error('Error fetching performance snapshots:', err);
            return res.status(500).json({ error: 'Failed to fetch performance data' });
          }

          // If no snapshots exist, create mock data for demonstration
          if (snapshots.length === 0) {
            snapshots = Array.from({ length: parseInt(days) }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (parseInt(days) - i));
              
              return {
                date: date.toISOString().split('T')[0],
                total_pnl: Math.random() * 1000 - 500,
                daily_pnl: Math.random() * 100 - 50,
                total_trades: Math.floor(Math.random() * 20),
                win_rate: Math.random() * 100,
                sharpe_ratio: Math.random() * 3,
                max_drawdown: Math.random() * 0.2,
                exposure: Math.random() * 10000
              };
            });
          }

          res.json({ performance: snapshots });
        }
      );
    }
  );
});

// Get risk metrics for user's portfolio
router.get('/risk', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      b.id as bot_id,
      b.name as bot_name,
      b.trading_mode,
      rp.max_position_size,
      rp.max_daily_loss,
      rp.max_drawdown,
      rp.stop_loss_pct,
      rp.take_profit_pct,
      COALESCE(SUM(CASE WHEN t.status = 'open' THEN t.quantity * t.entry_price END), 0) as current_exposure,
      COALESCE(SUM(CASE WHEN t.status = 'closed' AND DATE(t.opened_at) = DATE('now') THEN t.pnl END), 0) as daily_pnl
    FROM bots b
    LEFT JOIN risk_parameters rp ON b.id = rp.bot_id
    LEFT JOIN trades t ON b.id = t.bot_id
    WHERE b.user_id = ?
    GROUP BY b.id, b.name, b.trading_mode, rp.max_position_size, rp.max_daily_loss, rp.max_drawdown, rp.stop_loss_pct, rp.take_profit_pct
  `;

  db.all(query, [req.user.id], (err, riskData) => {
    if (err) {
      logger.error('Error fetching risk data:', err);
      return res.status(500).json({ error: 'Failed to fetch risk data' });
    }

    // Calculate overall risk metrics
    const totalExposure = riskData.reduce((sum, bot) => sum + (bot.current_exposure || 0), 0);
    const totalDailyPnL = riskData.reduce((sum, bot) => sum + (bot.daily_pnl || 0), 0);
    const maxDailyLoss = riskData.reduce((sum, bot) => sum + (bot.max_daily_loss || 0), 0);

    // Check for risk violations
    const violations = riskData.filter(bot => {
      return (
        (bot.current_exposure > bot.max_position_size) ||
        (bot.daily_pnl < -bot.max_daily_loss)
      );
    });

    res.json({
      bots: riskData,
      overall: {
        total_exposure: totalExposure,
        daily_pnl: totalDailyPnL,
        max_daily_loss: maxDailyLoss,
        risk_utilization: maxDailyLoss > 0 ? (Math.abs(totalDailyPnL) / maxDailyLoss) * 100 : 0
      },
      violations
    });
  });
});

// Get correlation analysis between bots
router.get('/correlation', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      ps1.bot_id as bot1_id,
      b1.name as bot1_name,
      ps2.bot_id as bot2_id,
      b2.name as bot2_name,
      ps1.date,
      ps1.daily_pnl as bot1_pnl,
      ps2.daily_pnl as bot2_pnl
    FROM performance_snapshots ps1
    JOIN performance_snapshots ps2 ON ps1.date = ps2.date AND ps1.bot_id < ps2.bot_id
    JOIN bots b1 ON ps1.bot_id = b1.id
    JOIN bots b2 ON ps2.bot_id = b2.id
    WHERE b1.user_id = ? AND b2.user_id = ?
    AND ps1.date >= date('now', '-30 days')
    ORDER BY ps1.bot_id, ps2.bot_id, ps1.date
  `;

  db.all(query, [req.user.id, req.user.id], (err, correlationData) => {
    if (err) {
      logger.error('Error fetching correlation data:', err);
      return res.status(500).json({ error: 'Failed to fetch correlation data' });
    }

    // Calculate correlation coefficients
    const correlations = {};
    const botPairs = {};

    correlationData.forEach(row => {
      const pairKey = `${row.bot1_id}_${row.bot2_id}`;
      if (!botPairs[pairKey]) {
        botPairs[pairKey] = {
          bot1_id: row.bot1_id,
          bot1_name: row.bot1_name,
          bot2_id: row.bot2_id,
          bot2_name: row.bot2_name,
          data: []
        };
      }
      botPairs[pairKey].data.push({
        date: row.date,
        bot1_pnl: row.bot1_pnl,
        bot2_pnl: row.bot2_pnl
      });
    });

    // Calculate Pearson correlation coefficient for each pair
    Object.keys(botPairs).forEach(pairKey => {
      const pair = botPairs[pairKey];
      const n = pair.data.length;
      
      if (n < 2) {
        correlations[pairKey] = { ...pair, correlation: 0 };
        return;
      }

      const sumX = pair.data.reduce((sum, d) => sum + d.bot1_pnl, 0);
      const sumY = pair.data.reduce((sum, d) => sum + d.bot2_pnl, 0);
      const sumXY = pair.data.reduce((sum, d) => sum + (d.bot1_pnl * d.bot2_pnl), 0);
      const sumX2 = pair.data.reduce((sum, d) => sum + (d.bot1_pnl * d.bot1_pnl), 0);
      const sumY2 = pair.data.reduce((sum, d) => sum + (d.bot2_pnl * d.bot2_pnl), 0);

      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      
      const correlation = denominator === 0 ? 0 : numerator / denominator;
      
      correlations[pairKey] = {
        bot1_id: pair.bot1_id,
        bot1_name: pair.bot1_name,
        bot2_id: pair.bot2_id,
        bot2_name: pair.bot2_name,
        correlation: Math.round(correlation * 1000) / 1000,
        data_points: n
      };
    });

    res.json({ correlations: Object.values(correlations) });
  });
});

// Get market regime analysis
router.get('/market-regime', authenticateToken, (req, res) => {
  // Mock market regime analysis
  // In a real implementation, this would analyze market conditions
  const regimes = [
    {
      name: 'Trending Bull',
      probability: 0.65,
      characteristics: ['High momentum', 'Low volatility', 'Strong volume'],
      recommended_strategies: ['Momentum', 'Trend Following'],
      active_since: '2024-01-15T00:00:00Z'
    },
    {
      name: 'Sideways',
      probability: 0.25,
      characteristics: ['Range-bound', 'Medium volatility', 'Mixed signals'],
      recommended_strategies: ['Mean Reversion', 'Range Trading'],
      active_since: null
    },
    {
      name: 'Volatile Bear',
      probability: 0.10,
      characteristics: ['High volatility', 'Downward trend', 'Fear-driven'],
      recommended_strategies: ['Short Selling', 'Volatility Trading'],
      active_since: null
    }
  ];

  res.json({ 
    current_regime: regimes[0],
    all_regimes: regimes,
    last_updated: new Date().toISOString()
  });
});

// Get system information
router.get('/system-info', authenticateToken, (req, res) => {
  try {
    const uptime = process.uptime();
    const uptimeDays = Math.floor(uptime / 86400);
    const uptimeHours = Math.floor((uptime % 86400) / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    
    const memoryUsage = process.memoryUsage();
    const databaseSize = 45.2; // Mock database size in MB
    
    const systemInfo = {
      version: '1.0.0',
      uptime: `${uptimeDays} days, ${uptimeHours} hours, ${uptimeMinutes} minutes`,
      lastBackup: '2 hours ago', // Mock value
      databaseSize: `${databaseSize} MB`,
      activeSessions: 1, // Mock value
      apiCalls: Math.floor(Math.random() * 2000) + 1000, // Mock value
      systemHealth: 'Healthy',
      memoryUsage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
      },
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch
    };
    
    res.json({ systemInfo });
  } catch (error) {
    logger.error('Error fetching system info:', error);
    res.status(500).json({ error: 'Failed to fetch system information' });
  }
});

// Portfolio optimization endpoints
router.get('/portfolio/optimization/methods', authenticateToken, (req, res) => {
  try {
    const methods = portfolioOptimizer.getMethods();
    res.json({ methods });
  } catch (error) {
    logger.error('Error fetching optimization methods:', error);
    res.status(500).json({ error: 'Failed to fetch optimization methods' });
  }
});

router.post('/portfolio/optimize', authenticateToken, async (req, res) => {
  try {
    const { assets, method = 'risk_parity', constraints = {}, historicalPeriod = 30 } = req.body;

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: 'Assets array is required' });
    }

    // Fetch historical data for assets
    logger.info('Fetching historical data for portfolio optimization', {
      assets,
      method,
      period: historicalPeriod,
      userId: req.user.id
    });

    const historicalData = {};
    const promises = assets.map(async (asset) => {
      try {
        const data = await marketDataService.getHistoricalData(asset, 'daily', 'compact');
        if (data && data.length > 0) {
          historicalData[asset] = data.map(point => point.close || point.price);
        }
      } catch (error) {
        logger.warn('Failed to fetch historical data for asset', { asset, error: error.message });
        // Generate mock data as fallback
        historicalData[asset] = Array.from({ length: historicalPeriod }, (_, i) => 
          100 + Math.random() * 20 - 10 + Math.sin(i / 5) * 5
        );
      }
    });

    await Promise.all(promises);

    // Filter out assets with no data
    const validAssets = assets.filter(asset => historicalData[asset] && historicalData[asset].length > 1);
    
    if (validAssets.length === 0) {
      return res.status(400).json({ error: 'No valid historical data available for any assets' });
    }

    // Run optimization
    const optimization = await portfolioOptimizer.optimizePortfolio(
      validAssets,
      historicalData,
      method,
      constraints
    );

    // Save optimization result to database (optional)
    const optimizationId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const saveQuery = `
      INSERT INTO portfolio_optimizations (id, user_id, method, assets, result, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `;

    db.run(saveQuery, [
      optimizationId,
      req.user.id,
      method,
      JSON.stringify(validAssets),
      JSON.stringify(optimization)
    ], (err) => {
      if (err) {
        logger.warn('Failed to save optimization result', { error: err.message });
      }
    });

    res.json({
      optimizationId,
      ...optimization
    });

  } catch (error) {
    logger.error('Portfolio optimization failed:', error);
    res.status(500).json({ error: error.message || 'Portfolio optimization failed' });
  }
});

router.get('/portfolio/optimizations', authenticateToken, (req, res) => {
  const query = `
    SELECT id, method, assets, created_at, 
           json_extract(result, '$.metrics.expectedReturn') as expected_return,
           json_extract(result, '$.metrics.volatility') as volatility,
           json_extract(result, '$.metrics.sharpeRatio') as sharpe_ratio
    FROM portfolio_optimizations 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 20
  `;

  db.all(query, [req.user.id], (err, optimizations) => {
    if (err) {
      logger.error('Error fetching optimization history:', err);
      return res.status(500).json({ error: 'Failed to fetch optimization history' });
    }

    const results = optimizations.map(opt => ({
      id: opt.id,
      method: opt.method,
      assets: JSON.parse(opt.assets || '[]'),
      createdAt: opt.created_at,
      metrics: {
        expectedReturn: opt.expected_return,
        volatility: opt.volatility,
        sharpeRatio: opt.sharpe_ratio
      }
    }));

    res.json({ optimizations: results });
  });
});

router.get('/portfolio/optimizations/:id', authenticateToken, (req, res) => {
  const query = `
    SELECT * FROM portfolio_optimizations 
    WHERE id = ? AND user_id = ?
  `;

  db.get(query, [req.params.id, req.user.id], (err, optimization) => {
    if (err) {
      logger.error('Error fetching optimization:', err);
      return res.status(500).json({ error: 'Failed to fetch optimization' });
    }

    if (!optimization) {
      return res.status(404).json({ error: 'Optimization not found' });
    }

    const result = {
      id: optimization.id,
      method: optimization.method,
      assets: JSON.parse(optimization.assets || '[]'),
      result: JSON.parse(optimization.result || '{}'),
      createdAt: optimization.created_at
    };

    res.json(result);
  });
});

module.exports = router;