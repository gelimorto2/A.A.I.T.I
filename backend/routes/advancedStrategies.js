const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const AdvancedTradingStrategies = require('../services/advancedTradingStrategies');
const logger = require('../utils/logger');

// Temporary audit log middleware (replace with proper implementation later)
const auditLog = (action) => (req, res, next) => {
  logger.info(`Audit: ${action}`, { 
    userId: req.user?.id, 
    ip: req.ip, 
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
};

const router = express.Router();

// Initialize advanced trading strategies service
const strategiesService = new AdvancedTradingStrategies();

/**
 * Get all available trading strategies
 */
router.get('/strategies', authenticateToken, (req, res) => {
  try {
    const strategies = strategiesService.getAvailableStrategies();
    
    res.json({
      success: true,
      strategies,
      totalStrategies: strategies.length,
      categories: {
        statistical: ['pairs_trading', 'mean_reversion'],
        momentum: ['momentum'],
        arbitrage: ['arbitrage'],
        portfolio: ['portfolio_optimization']
      }
    });
  } catch (error) {
    logger.error('Error fetching trading strategies:', error);
    res.status(500).json({
      error: 'Failed to fetch trading strategies',
      message: error.message
    });
  }
});

/**
 * Get specific strategy details and parameters
 */
router.get('/strategies/:strategyId', authenticateToken, (req, res) => {
  try {
    const { strategyId } = req.params;
    const strategies = strategiesService.getAvailableStrategies();
    const strategy = strategies.find(s => s.id === strategyId);
    
    if (!strategy) {
      return res.status(404).json({
        error: 'Strategy not found',
        availableStrategies: strategies.map(s => s.id)
      });
    }

    const metrics = strategiesService.getStrategyMetrics(strategyId);
    
    res.json({
      success: true,
      strategy,
      metrics,
      lastUpdated: metrics.lastUpdated || null
    });
  } catch (error) {
    logger.error('Error fetching strategy details:', error);
    res.status(500).json({
      error: 'Failed to fetch strategy details',
      message: error.message
    });
  }
});

/**
 * Execute pairs trading strategy
 */
router.post('/execute/pairs-trading', authenticateToken, auditLog('execute_pairs_trading'), async (req, res) => {
  try {
    const {
      symbol1,
      symbol2,
      marketData,
      config = {}
    } = req.body;

    if (!symbol1 || !symbol2 || !marketData) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['symbol1', 'symbol2', 'marketData']
      });
    }

    const result = await strategiesService.executePairsTrading(symbol1, symbol2, marketData, config);
    
    // Update performance metrics
    strategiesService.updateStrategyPerformance('pairs_trading', {
      lastExecution: new Date(),
      executionCount: (strategiesService.getStrategyMetrics('pairs_trading').executionCount || 0) + 1
    });

    res.json({
      success: true,
      strategy: 'pairs_trading',
      result,
      pair: `${symbol1}/${symbol2}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error executing pairs trading strategy:', error);
    res.status(500).json({
      error: 'Failed to execute pairs trading strategy',
      message: error.message
    });
  }
});

/**
 * Execute mean reversion strategy
 */
router.post('/execute/mean-reversion', authenticateToken, auditLog('execute_mean_reversion'), async (req, res) => {
  try {
    const {
      symbol,
      marketData,
      config = {}
    } = req.body;

    if (!symbol || !marketData) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['symbol', 'marketData']
      });
    }

    const result = await strategiesService.executeMeanReversion(symbol, marketData, config);
    
    strategiesService.updateStrategyPerformance('mean_reversion', {
      lastExecution: new Date(),
      executionCount: (strategiesService.getStrategyMetrics('mean_reversion').executionCount || 0) + 1
    });

    res.json({
      success: true,
      strategy: 'mean_reversion',
      result,
      symbol,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error executing mean reversion strategy:', error);
    res.status(500).json({
      error: 'Failed to execute mean reversion strategy',
      message: error.message
    });
  }
});

/**
 * Execute momentum strategy
 */
router.post('/execute/momentum', authenticateToken, auditLog('execute_momentum'), async (req, res) => {
  try {
    const {
      symbol,
      marketData,
      config = {}
    } = req.body;

    if (!symbol || !marketData) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['symbol', 'marketData']
      });
    }

    const result = await strategiesService.executeMomentumStrategy(symbol, marketData, config);
    
    strategiesService.updateStrategyPerformance('momentum', {
      lastExecution: new Date(),
      executionCount: (strategiesService.getStrategyMetrics('momentum').executionCount || 0) + 1
    });

    res.json({
      success: true,
      strategy: 'momentum',
      result,
      symbol,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error executing momentum strategy:', error);
    res.status(500).json({
      error: 'Failed to execute momentum strategy',
      message: error.message
    });
  }
});

/**
 * Execute arbitrage strategy
 */
router.post('/execute/arbitrage', authenticateToken, auditLog('execute_arbitrage'), async (req, res) => {
  try {
    const {
      symbol,
      exchangeData,
      config = {}
    } = req.body;

    if (!symbol || !exchangeData) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['symbol', 'exchangeData']
      });
    }

    const result = await strategiesService.executeArbitrageStrategy(symbol, exchangeData, config);
    
    strategiesService.updateStrategyPerformance('arbitrage', {
      lastExecution: new Date(),
      executionCount: (strategiesService.getStrategyMetrics('arbitrage').executionCount || 0) + 1,
      opportunitiesFound: result.opportunities?.length || 0
    });

    res.json({
      success: true,
      strategy: 'arbitrage',
      result,
      symbol,
      exchanges: Object.keys(exchangeData),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error executing arbitrage strategy:', error);
    res.status(500).json({
      error: 'Failed to execute arbitrage strategy',
      message: error.message
    });
  }
});

/**
 * Execute portfolio optimization
 */
router.post('/execute/portfolio-optimization', authenticateToken, auditLog('execute_portfolio_optimization'), async (req, res) => {
  try {
    const {
      assets,
      marketData,
      config = {}
    } = req.body;

    if (!assets || !marketData || !Array.isArray(assets)) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['assets (array)', 'marketData']
      });
    }

    const result = await strategiesService.executePortfolioOptimization(assets, marketData, config);
    
    strategiesService.updateStrategyPerformance('portfolio_optimization', {
      lastExecution: new Date(),
      executionCount: (strategiesService.getStrategyMetrics('portfolio_optimization').executionCount || 0) + 1,
      assetsCount: assets.length
    });

    res.json({
      success: true,
      strategy: 'portfolio_optimization',
      result,
      assets,
      optimizationMethod: config.optimizationMethod || 'mean_variance',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error executing portfolio optimization:', error);
    res.status(500).json({
      error: 'Failed to execute portfolio optimization',
      message: error.message
    });
  }
});

/**
 * Batch execute multiple strategies
 */
router.post('/execute/batch', authenticateToken, auditLog('execute_batch_strategies'), async (req, res) => {
  try {
    const { strategies: strategiesToExecute } = req.body;

    if (!strategiesToExecute || !Array.isArray(strategiesToExecute)) {
      return res.status(400).json({
        error: 'Missing required parameter: strategies (array)'
      });
    }

    const results = [];
    const errors = [];

    for (const strategyRequest of strategiesToExecute) {
      const { strategy, params } = strategyRequest;

      try {
        let result;
        
        switch (strategy) {
          case 'pairs_trading':
            result = await strategiesService.executePairsTrading(
              params.symbol1, params.symbol2, params.marketData, params.config
            );
            break;
          case 'mean_reversion':
            result = await strategiesService.executeMeanReversion(
              params.symbol, params.marketData, params.config
            );
            break;
          case 'momentum':
            result = await strategiesService.executeMomentumStrategy(
              params.symbol, params.marketData, params.config
            );
            break;
          case 'arbitrage':
            result = await strategiesService.executeArbitrageStrategy(
              params.symbol, params.exchangeData, params.config
            );
            break;
          case 'portfolio_optimization':
            result = await strategiesService.executePortfolioOptimization(
              params.assets, params.marketData, params.config
            );
            break;
          default:
            throw new Error(`Unknown strategy: ${strategy}`);
        }

        results.push({
          strategy,
          success: true,
          result,
          executedAt: new Date().toISOString()
        });

        // Update performance metrics
        strategiesService.updateStrategyPerformance(strategy, {
          lastExecution: new Date(),
          executionCount: (strategiesService.getStrategyMetrics(strategy).executionCount || 0) + 1
        });

      } catch (error) {
        errors.push({
          strategy,
          error: error.message,
          executedAt: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      totalExecuted: strategiesToExecute.length,
      successfulExecutions: results.length,
      failedExecutions: errors.length,
      results,
      errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error executing batch strategies:', error);
    res.status(500).json({
      error: 'Failed to execute batch strategies',
      message: error.message
    });
  }
});

/**
 * Get strategy performance analytics
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { 
      strategies: requestedStrategies,
      timeframe = '30d'
    } = req.query;

    const allStrategies = strategiesService.getAvailableStrategies();
    const strategiesToAnalyze = requestedStrategies 
      ? requestedStrategies.split(',') 
      : allStrategies.map(s => s.id);

    const analytics = {};

    strategiesToAnalyze.forEach(strategyId => {
      const metrics = strategiesService.getStrategyMetrics(strategyId);
      const strategy = allStrategies.find(s => s.id === strategyId);

      if (strategy) {
        analytics[strategyId] = {
          name: strategy.name,
          category: strategy.category || 'general',
          executionCount: metrics.executionCount || 0,
          lastExecution: metrics.lastExecution || null,
          expectedMetrics: strategy.riskMetrics,
          currentMetrics: {
            // These would be calculated from actual trade history
            sharpeRatio: metrics.sharpeRatio || null,
            maxDrawdown: metrics.maxDrawdown || null,
            winRate: metrics.winRate || null,
            avgReturn: metrics.avgReturn || null
          }
        };
      }
    });

    res.json({
      success: true,
      analytics,
      timeframe,
      totalStrategies: Object.keys(analytics).length,
      summary: {
        mostExecuted: Object.entries(analytics)
          .sort(([,a], [,b]) => (b.executionCount || 0) - (a.executionCount || 0))[0]?.[0] || null,
        totalExecutions: Object.values(analytics)
          .reduce((sum, metric) => sum + (metric.executionCount || 0), 0)
      }
    });

  } catch (error) {
    logger.error('Error fetching strategy analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch strategy analytics',
      message: error.message
    });
  }
});

/**
 * Generate sample market data for testing strategies
 */
router.get('/sample-data/:symbol', authenticateToken, (req, res) => {
  try {
    const { symbol } = req.params;
    const { periods = 100, timeframe = '1h' } = req.query;

    const sampleData = generateSampleMarketData(symbol, parseInt(periods), timeframe);

    res.json({
      success: true,
      symbol,
      periods: parseInt(periods),
      timeframe,
      data: sampleData,
      note: 'Sample data for strategy testing - not real market data'
    });

  } catch (error) {
    logger.error('Error generating sample data:', error);
    res.status(500).json({
      error: 'Failed to generate sample data',
      message: error.message
    });
  }
});

/**
 * Generate sample exchange data for arbitrage testing
 */
router.get('/sample-exchange-data/:symbol', authenticateToken, (req, res) => {
  try {
    const { symbol } = req.params;

    const exchanges = ['binance', 'coinbase', 'kraken', 'bitfinex'];
    const basePrice = symbol.includes('BTC') ? 50000 : 2000;
    
    const exchangeData = {};
    exchanges.forEach((exchange, index) => {
      const priceVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
      const price = basePrice * (1 + priceVariation);
      const spread = 0.001 + Math.random() * 0.002; // 0.1% to 0.3% spread
      
      exchangeData[exchange] = {
        bid: price * (1 - spread / 2),
        ask: price * (1 + spread / 2),
        volume: 1000 + Math.random() * 5000,
        timestamp: new Date().toISOString()
      };
    });

    res.json({
      success: true,
      symbol,
      exchanges: Object.keys(exchangeData),
      data: exchangeData,
      note: 'Sample exchange data for arbitrage testing - not real market data'
    });

  } catch (error) {
    logger.error('Error generating sample exchange data:', error);
    res.status(500).json({
      error: 'Failed to generate sample exchange data',
      message: error.message
    });
  }
});

/**
 * Generate sample market data
 */
function generateSampleMarketData(symbol, periods, timeframe) {
  const data = [];
  const basePrice = symbol.includes('BTC') ? 50000 : 
                   symbol.includes('ETH') ? 3000 : 
                   symbol.includes('ADA') ? 0.5 : 100;
  
  let currentPrice = basePrice;
  const timeframeMins = {
    '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440
  };
  const intervalMs = (timeframeMins[timeframe] || 60) * 60 * 1000;
  
  for (let i = 0; i < periods; i++) {
    // Generate realistic price movement
    const volatility = 0.02; // 2% volatility
    const trend = (Math.random() - 0.5) * 0.001; // Small trend component
    const randomWalk = (Math.random() - 0.5) * volatility;
    
    const priceChange = trend + randomWalk;
    currentPrice *= (1 + priceChange);
    
    // Generate OHLC data
    const open = i === 0 ? basePrice : data[i - 1].close;
    const close = currentPrice;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = 1000 + Math.random() * 2000;
    
    data.push({
      timestamp: new Date(Date.now() - (periods - i - 1) * intervalMs).toISOString(),
      open: parseFloat(open.toFixed(8)),
      high: parseFloat(high.toFixed(8)),
      low: parseFloat(low.toFixed(8)),
      close: parseFloat(close.toFixed(8)),
      volume: parseFloat(volume.toFixed(2))
    });
  }
  
  return data;
}

module.exports = router;