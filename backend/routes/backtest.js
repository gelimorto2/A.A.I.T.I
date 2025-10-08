/**
 * Sprint 3: Backtest API Routes
 * REST API for deterministic backtesting with fixture datasets
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

module.exports = (backtestHarness) => {
  /**
   * Create fixture dataset
   * POST /api/backtest/fixtures
   */
  router.post('/fixtures', authenticateToken, async (req, res) => {
    try {
      const { name, symbol, timeframe, startDate, endDate, data } = req.body;

      if (!name || !symbol || !timeframe || !startDate || !endDate || !data) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['name', 'symbol', 'timeframe', 'startDate', 'endDate', 'data']
        });
      }

      const result = await backtestHarness.createFixture({
        name,
        symbol,
        timeframe,
        startDate,
        endDate,
        data
      });

      res.status(201).json({
        success: true,
        message: 'Fixture created successfully',
        ...result
      });
    } catch (error) {
      console.error('Error creating fixture:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * List available fixtures
   * GET /api/backtest/fixtures
   */
  router.get('/fixtures', authenticateToken, async (req, res) => {
    try {
      const fixtures = await backtestHarness.listFixtures();

      res.json({
        success: true,
        count: fixtures.length,
        fixtures
      });
    } catch (error) {
      console.error('Error listing fixtures:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get fixture details
   * GET /api/backtest/fixtures/:name
   */
  router.get('/fixtures/:name', authenticateToken, async (req, res) => {
    try {
      const fixtureName = req.params.name;
      const fixture = await backtestHarness.loadFixture(fixtureName);

      res.json({
        success: true,
        fixture
      });
    } catch (error) {
      console.error('Error loading fixture:', error);
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * Run backtest
   * POST /api/backtest/run
   */
  router.post('/run', authenticateToken, async (req, res) => {
    try {
      const {
        strategyId,
        fixtureName,
        initialCapital,
        commission,
        slippage
      } = req.body;

      if (!strategyId) {
        return res.status(400).json({ error: 'strategyId is required' });
      }

      const result = await backtestHarness.runBacktest({
        strategyId,
        fixtureName,
        initialCapital,
        commission,
        slippage
      });

      res.json({
        success: true,
        message: 'Backtest completed successfully',
        result
      });
    } catch (error) {
      console.error('Error running backtest:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Verify reproducibility
   * POST /api/backtest/verify
   */
  router.post('/verify', authenticateToken, async (req, res) => {
    try {
      const { strategyId, fixtureName, expectedHash } = req.body;

      if (!strategyId || !fixtureName || !expectedHash) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['strategyId', 'fixtureName', 'expectedHash']
        });
      }

      const result = await backtestHarness.verifyReproducibility(
        strategyId,
        fixtureName,
        expectedHash
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error verifying reproducibility:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
