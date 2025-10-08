/**
 * Sprint 3: Strategy Lifecycle API Routes
 * REST API for strategy workflow management: draft → validate → approve → deploy
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

module.exports = (strategyLifecycleManager) => {
  /**
   * Create new strategy
   * POST /api/strategies
   */
  router.post('/', authenticateToken, async (req, res) => {
    try {
      const { name, description, type, config, modelId } = req.body;

      if (!name || !type || !config) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['name', 'type', 'config']
        });
      }

      const result = await strategyLifecycleManager.createStrategy(req.user.id, {
        name,
        description,
        type,
        config,
        modelId
      });

      res.status(201).json({
        success: true,
        message: 'Strategy created successfully',
        ...result
      });
    } catch (error) {
      console.error('Error creating strategy:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Validate strategy
   * POST /api/strategies/:id/validate
   */
  router.post('/:id/validate', authenticateToken, async (req, res) => {
    try {
      const strategyId = parseInt(req.params.id);
      const result = await strategyLifecycleManager.validateStrategy(strategyId, req.user.id);

      res.json({
        success: true,
        message: 'Strategy validation completed',
        ...result
      });
    } catch (error) {
      console.error('Error validating strategy:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Approve strategy
   * POST /api/strategies/:id/approve
   */
  router.post('/:id/approve', authenticateToken, async (req, res) => {
    try {
      const strategyId = parseInt(req.params.id);
      const { notes } = req.body;

      const result = await strategyLifecycleManager.approveStrategy(
        strategyId,
        req.user.id,
        notes
      );

      res.json({
        success: true,
        message: 'Strategy approved successfully',
        ...result
      });
    } catch (error) {
      console.error('Error approving strategy:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Deploy strategy
   * POST /api/strategies/:id/deploy
   */
  router.post('/:id/deploy', authenticateToken, async (req, res) => {
    try {
      const strategyId = parseInt(req.params.id);
      const result = await strategyLifecycleManager.deployStrategy(strategyId, req.user.id);

      res.json({
        success: true,
        message: 'Strategy deployed successfully',
        ...result
      });
    } catch (error) {
      console.error('Error deploying strategy:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Deprecate strategy
   * POST /api/strategies/:id/deprecate
   */
  router.post('/:id/deprecate', authenticateToken, async (req, res) => {
    try {
      const strategyId = parseInt(req.params.id);
      const { reason } = req.body;

      const result = await strategyLifecycleManager.deprecateStrategy(strategyId, reason);

      res.json({
        success: true,
        message: 'Strategy deprecated successfully',
        ...result
      });
    } catch (error) {
      console.error('Error deprecating strategy:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get strategy details
   * GET /api/strategies/:id
   */
  router.get('/:id', authenticateToken, async (req, res) => {
    try {
      const strategyId = parseInt(req.params.id);
      const strategy = await strategyLifecycleManager.getStrategy(strategyId);

      res.json({
        success: true,
        strategy: {
          ...strategy,
          config: JSON.parse(strategy.config)
        }
      });
    } catch (error) {
      console.error('Error getting strategy:', error);
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * Get strategy validations
   * GET /api/strategies/:id/validations
   */
  router.get('/:id/validations', authenticateToken, async (req, res) => {
    try {
      const strategyId = parseInt(req.params.id);
      const validations = await strategyLifecycleManager.getStrategyValidations(strategyId);

      res.json({
        success: true,
        count: validations.length,
        validations
      });
    } catch (error) {
      console.error('Error getting validations:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get strategy lifecycle history
   * GET /api/strategies/:id/history
   */
  router.get('/:id/history', authenticateToken, async (req, res) => {
    try {
      const strategyId = parseInt(req.params.id);
      const history = await strategyLifecycleManager.getLifecycleHistory(strategyId);

      res.json({
        success: true,
        ...history
      });
    } catch (error) {
      console.error('Error getting lifecycle history:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * List strategies
   * GET /api/strategies
   */
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        type: req.query.type,
        createdBy: req.query.createdBy ? parseInt(req.query.createdBy) : undefined
      };

      const strategies = await strategyLifecycleManager.listStrategies(filters);

      res.json({
        success: true,
        count: strategies.length,
        strategies
      });
    } catch (error) {
      console.error('Error listing strategies:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
