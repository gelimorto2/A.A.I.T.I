const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const advancedPortfolioIntelligence = require('../utils/advancedPortfolioIntelligence');
const logger = require('../utils/logger');

const router = express.Router();

// =====================================
// ADVANCED PORTFOLIO INTELLIGENCE ROUTES
// =====================================

// Risk Parity Portfolio Optimization
router.post('/optimize/risk-parity', authenticateToken, auditLog('optimize_risk_parity'), async (req, res) => {
  try {
    const { 
      assetReturns, 
      targetVolatility = 0.10,
      maxIterations = 1000,
      tolerance = 1e-6,
      constraints = {}
    } = req.body;

    if (!assetReturns || !Array.isArray(assetReturns)) {
      return res.status(400).json({ error: 'Asset returns array is required' });
    }

    const options = {
      targetVolatility,
      maxIterations,
      tolerance,
      constraints
    };

    const riskParityPortfolio = await advancedPortfolioIntelligence.optimizeRiskParity(assetReturns, options);

    // Save portfolio to database
    const portfolioId = await advancedPortfolioIntelligence.createPortfolio({
      ...riskParityPortfolio,
      userId: req.user.id,
      name: `Risk Parity Portfolio ${new Date().toISOString().split('T')[0]}`,
      description: 'Risk parity optimized portfolio with equal risk contributions'
    });

    db.run(
      `INSERT INTO portfolios (
        id, user_id, name, type, weights, performance_metrics, optimization_details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        portfolioId,
        req.user.id,
        `Risk Parity Portfolio ${new Date().toISOString().split('T')[0]}`,
        'risk_parity',
        JSON.stringify(riskParityPortfolio.weights),
        JSON.stringify(riskParityPortfolio.metrics),
        JSON.stringify(riskParityPortfolio.optimization),
        new Date().toISOString()
      ]
    );

    logger.info('Risk parity portfolio optimized successfully', {
      userId: req.user.id,
      portfolioId,
      targetVolatility,
      achievedVolatility: riskParityPortfolio.metrics.volatility
    });

    res.json({
      success: true,
      portfolioId,
      portfolio: riskParityPortfolio
    });

  } catch (error) {
    logger.error('Error optimizing risk parity portfolio:', error);
    res.status(500).json({ error: 'Failed to optimize risk parity portfolio' });
  }
});

// Factor-Based Portfolio Optimization
router.post('/optimize/factor-based', authenticateToken, auditLog('optimize_factor_based'), async (req, res) => {
  try {
    const { 
      assetReturns,
      factorExposures,
      targetFactorExposures = {},
      factorConstraints = {},
      maxIterations = 1000,
      tolerance = 1e-6
    } = req.body;

    if (!assetReturns || !Array.isArray(assetReturns)) {
      return res.status(400).json({ error: 'Asset returns array is required' });
    }

    if (!factorExposures || !Array.isArray(factorExposures)) {
      return res.status(400).json({ error: 'Factor exposures array is required' });
    }

    const options = {
      targetFactorExposures,
      factorConstraints,
      maxIterations,
      tolerance
    };

    const factorBasedPortfolio = await advancedPortfolioIntelligence.optimizeFactorBased(
      assetReturns, 
      factorExposures, 
      options
    );

    // Save portfolio to database
    const portfolioId = await advancedPortfolioIntelligence.createPortfolio({
      ...factorBasedPortfolio,
      userId: req.user.id,
      name: `Factor-Based Portfolio ${new Date().toISOString().split('T')[0]}`,
      description: 'Factor-based optimized portfolio with target factor exposures'
    });

    db.run(
      `INSERT INTO portfolios (
        id, user_id, name, type, weights, performance_metrics, factor_exposures, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        portfolioId,
        req.user.id,
        `Factor-Based Portfolio ${new Date().toISOString().split('T')[0]}`,
        'factor_based',
        JSON.stringify(factorBasedPortfolio.weights),
        JSON.stringify(factorBasedPortfolio.metrics),
        JSON.stringify(factorBasedPortfolio.factorExposures),
        new Date().toISOString()
      ]
    );

    logger.info('Factor-based portfolio optimized successfully', {
      userId: req.user.id,
      portfolioId,
      expectedReturn: factorBasedPortfolio.metrics.expectedReturn,
      volatility: factorBasedPortfolio.metrics.volatility
    });

    res.json({
      success: true,
      portfolioId,
      portfolio: factorBasedPortfolio
    });

  } catch (error) {
    logger.error('Error optimizing factor-based portfolio:', error);
    res.status(500).json({ error: 'Failed to optimize factor-based portfolio' });
  }
});

// Monte Carlo Simulation for Portfolio Stress Testing
router.post('/monte-carlo/:portfolioId', authenticateToken, auditLog('run_monte_carlo'), async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const {
      marketScenarios,
      numSimulations = 10000,
      timeHorizon = 252,
      confidenceLevels = [0.95, 0.99]
    } = req.body;

    if (!marketScenarios) {
      return res.status(400).json({ error: 'Market scenarios are required' });
    }

    // Get portfolio from database
    const portfolio = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM portfolios WHERE id = ? AND user_id = ?',
        [portfolioId, req.user.id],
        (err, row) => {
          if (err) reject(err);
          else if (!row) reject(new Error('Portfolio not found'));
          else resolve({
            weights: JSON.parse(row.weights),
            metrics: JSON.parse(row.performance_metrics)
          });
        }
      );
    });

    const options = {
      numSimulations,
      timeHorizon,
      confidenceLevels
    };

    const simulationResults = await advancedPortfolioIntelligence.runMonteCarloSimulation(
      portfolio,
      marketScenarios,
      options
    );

    // Save simulation results to database
    const simulationId = uuidv4();
    db.run(
      `INSERT INTO monte_carlo_simulations (
        id, portfolio_id, user_id, num_simulations, time_horizon, 
        statistics, stress_tests, path_analysis, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        simulationId,
        portfolioId,
        req.user.id,
        numSimulations,
        timeHorizon,
        JSON.stringify(simulationResults.statistics),
        JSON.stringify(simulationResults.stressTests),
        JSON.stringify(simulationResults.pathAnalysis),
        new Date().toISOString()
      ]
    );

    logger.info('Monte Carlo simulation completed successfully', {
      userId: req.user.id,
      portfolioId,
      simulationId,
      numSimulations,
      timeHorizon,
      expectedReturn: simulationResults.statistics.expectedReturn,
      var95: simulationResults.statistics.valueAtRisk['0.95']
    });

    res.json({
      success: true,
      simulationId,
      results: simulationResults
    });

  } catch (error) {
    logger.error('Error running Monte Carlo simulation:', error);
    res.status(500).json({ error: 'Failed to run Monte Carlo simulation' });
  }
});

// Create Dynamic Hedging Strategy
router.post('/hedging/create', authenticateToken, auditLog('create_hedging_strategy'), async (req, res) => {
  try {
    const {
      portfolioId,
      hedgingAssets = [],
      riskTarget = 0.15,
      rebalanceFrequency = 'weekly',
      hedgingCost = 0.001
    } = req.body;

    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' });
    }

    // Get portfolio from advanced intelligence system
    const portfolio = advancedPortfolioIntelligence.getPortfolio(portfolioId);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const hedgingOptions = {
      hedgingAssets,
      riskTarget,
      rebalanceFrequency,
      hedgingCost
    };

    const hedgingStrategy = await advancedPortfolioIntelligence.createDynamicHedgingStrategy(
      portfolio,
      hedgingOptions
    );

    // Save hedging strategy to database
    db.run(
      `INSERT INTO hedging_strategies (
        id, portfolio_id, user_id, type, hedging_assets, risk_target,
        rebalance_frequency, hedge_ratios, rules, triggers, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hedgingStrategy.id,
        portfolioId,
        req.user.id,
        hedgingStrategy.type,
        JSON.stringify(hedgingStrategy.hedgingAssets),
        hedgingStrategy.riskTarget,
        hedgingStrategy.rebalanceFrequency,
        JSON.stringify(hedgingStrategy.hedgeRatios),
        JSON.stringify(hedgingStrategy.rules),
        JSON.stringify(hedgingStrategy.triggers),
        new Date().toISOString()
      ]
    );

    logger.info('Dynamic hedging strategy created successfully', {
      userId: req.user.id,
      portfolioId,
      strategyId: hedgingStrategy.id,
      riskTarget,
      hedgingAssets: hedgingAssets.length
    });

    res.json({
      success: true,
      strategy: hedgingStrategy
    });

  } catch (error) {
    logger.error('Error creating hedging strategy:', error);
    res.status(500).json({ error: 'Failed to create hedging strategy' });
  }
});

// Monitor Portfolio Risk in Real-time
router.post('/risk/monitor/:portfolioId', authenticateToken, auditLog('monitor_portfolio_risk'), async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { marketData } = req.body;

    if (!marketData) {
      return res.status(400).json({ error: 'Market data is required' });
    }

    const riskMonitoring = await advancedPortfolioIntelligence.monitorPortfolioRisk(
      portfolioId,
      marketData
    );

    // Save risk monitoring result to database
    db.run(
      `INSERT INTO portfolio_risk_monitoring (
        id, portfolio_id, user_id, current_risk, risk_attribution,
        risk_alerts, market_data, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        portfolioId,
        req.user.id,
        JSON.stringify(riskMonitoring.currentRisk),
        JSON.stringify(riskMonitoring.riskAttribution),
        JSON.stringify(riskMonitoring.riskAlerts),
        JSON.stringify(riskMonitoring.marketData),
        new Date().toISOString()
      ]
    );

    logger.info('Portfolio risk monitoring completed', {
      userId: req.user.id,
      portfolioId,
      alertCount: riskMonitoring.riskAlerts.length,
      currentVol: riskMonitoring.currentRisk.portfolioVolatility
    });

    res.json({
      success: true,
      riskMonitoring
    });

  } catch (error) {
    logger.error('Error monitoring portfolio risk:', error);
    res.status(500).json({ error: 'Failed to monitor portfolio risk' });
  }
});

// Get Portfolio Analytics Dashboard
router.get('/analytics/:portfolioId', authenticateToken, (req, res) => {
  try {
    const { portfolioId } = req.params;

    // Get portfolio from advanced intelligence system
    const portfolio = advancedPortfolioIntelligence.getPortfolio(portfolioId);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    // Get recent risk monitoring data
    db.all(
      `SELECT * FROM portfolio_risk_monitoring 
       WHERE portfolio_id = ? AND user_id = ?
       ORDER BY timestamp DESC LIMIT 100`,
      [portfolioId, req.user.id],
      (err, riskHistory) => {
        if (err) {
          logger.error('Error fetching risk history:', err);
          return res.status(500).json({ error: 'Failed to fetch portfolio analytics' });
        }

        // Get Monte Carlo simulations
        db.all(
          `SELECT * FROM monte_carlo_simulations 
           WHERE portfolio_id = ? AND user_id = ?
           ORDER BY created_at DESC LIMIT 10`,
          [portfolioId, req.user.id],
          (err, simulations) => {
            if (err) {
              logger.error('Error fetching simulations:', err);
              return res.status(500).json({ error: 'Failed to fetch portfolio analytics' });
            }

            // Get hedging strategies
            db.all(
              `SELECT * FROM hedging_strategies 
               WHERE portfolio_id = ? AND user_id = ?
               ORDER BY created_at DESC`,
              [portfolioId, req.user.id],
              (err, hedgingStrategies) => {
                if (err) {
                  logger.error('Error fetching hedging strategies:', err);
                  return res.status(500).json({ error: 'Failed to fetch portfolio analytics' });
                }

                const analytics = {
                  portfolio: {
                    id: portfolioId,
                    ...portfolio
                  },
                  riskHistory: riskHistory.map(r => ({
                    timestamp: r.timestamp,
                    currentRisk: JSON.parse(r.current_risk),
                    riskAlerts: JSON.parse(r.risk_alerts),
                    marketData: JSON.parse(r.market_data)
                  })),
                  monteCarloSimulations: simulations.map(s => ({
                    id: s.id,
                    numSimulations: s.num_simulations,
                    timeHorizon: s.time_horizon,
                    statistics: JSON.parse(s.statistics),
                    createdAt: s.created_at
                  })),
                  hedgingStrategies: hedgingStrategies.map(h => ({
                    id: h.id,
                    type: h.type,
                    riskTarget: h.risk_target,
                    rebalanceFrequency: h.rebalance_frequency,
                    hedgeRatios: JSON.parse(h.hedge_ratios),
                    createdAt: h.created_at
                  })),
                  summary: {
                    totalRiskEvents: riskHistory.length,
                    totalSimulations: simulations.length,
                    activeHedgingStrategies: hedgingStrategies.length,
                    lastRiskCheck: riskHistory.length > 0 ? riskHistory[0].timestamp : null
                  }
                };

                res.json({ analytics });
              }
            );
          }
        );
      }
    );

  } catch (error) {
    logger.error('Error getting portfolio analytics:', error);
    res.status(500).json({ error: 'Failed to get portfolio analytics' });
  }
});

// Get All Portfolios for User
router.get('/portfolios', authenticateToken, (req, res) => {
  try {
    db.all(
      `SELECT 
        id, name, type, weights, performance_metrics, created_at,
        (SELECT COUNT(*) FROM monte_carlo_simulations WHERE portfolio_id = portfolios.id) as simulation_count,
        (SELECT COUNT(*) FROM hedging_strategies WHERE portfolio_id = portfolios.id) as hedging_strategy_count
       FROM portfolios 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id],
      (err, portfolios) => {
        if (err) {
          logger.error('Error fetching portfolios:', err);
          return res.status(500).json({ error: 'Failed to fetch portfolios' });
        }

        const portfoliosWithParsedData = portfolios.map(portfolio => ({
          id: portfolio.id,
          name: portfolio.name,
          type: portfolio.type,
          weights: JSON.parse(portfolio.weights),
          performanceMetrics: JSON.parse(portfolio.performance_metrics),
          createdAt: portfolio.created_at,
          simulationCount: portfolio.simulation_count,
          hedgingStrategyCount: portfolio.hedging_strategy_count
        }));

        res.json({ portfolios: portfoliosWithParsedData });
      }
    );
  } catch (error) {
    logger.error('Error getting portfolios:', error);
    res.status(500).json({ error: 'Failed to get portfolios' });
  }
});

// Delete Portfolio
router.delete('/portfolios/:portfolioId', authenticateToken, auditLog('delete_portfolio'), (req, res) => {
  const { portfolioId } = req.params;

  // Start transaction to delete portfolio and related data
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Delete related data first
    db.run('DELETE FROM monte_carlo_simulations WHERE portfolio_id = ? AND user_id = ?', [portfolioId, req.user.id]);
    db.run('DELETE FROM hedging_strategies WHERE portfolio_id = ? AND user_id = ?', [portfolioId, req.user.id]);
    db.run('DELETE FROM portfolio_risk_monitoring WHERE portfolio_id = ? AND user_id = ?', [portfolioId, req.user.id]);

    // Delete the portfolio
    db.run(
      'DELETE FROM portfolios WHERE id = ? AND user_id = ?',
      [portfolioId, req.user.id],
      function(err) {
        if (err) {
          logger.error('Error deleting portfolio:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to delete portfolio' });
        }

        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Portfolio not found' });
        }

        db.run('COMMIT', (err) => {
          if (err) {
            logger.error('Error committing transaction:', err);
            return res.status(500).json({ error: 'Failed to delete portfolio' });
          }

          // Remove from advanced intelligence system
          advancedPortfolioIntelligence.portfolios.delete(portfolioId);

          logger.info('Portfolio deleted successfully', {
            userId: req.user.id,
            portfolioId
          });

          res.json({ 
            success: true, 
            message: 'Portfolio deleted successfully' 
          });
        });
      }
    );
  });
});

module.exports = router;