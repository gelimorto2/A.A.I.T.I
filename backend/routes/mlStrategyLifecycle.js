/**
 * Sprint 3: ML Strategy Lifecycle API Routes
 * Comprehensive API for managing ML model lifecycle and strategy deployment
 */

const express = require('express');
const { z } = require('zod');
const router = express.Router();

// Import services (these will be injected by the main server)
let mlModelRepository;
let backtestHarness;
let strategyLifecycleManager;

// Validation schemas
const createModelSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1),
  algorithmType: z.string().min(1),
  targetTimeframe: z.string().min(1),
  symbols: z.array(z.string()).min(1),
  params: z.object({}).passthrough(),
  trainingDataPoints: z.number().min(0).optional()
});

const updateTrainingMetadataSchema = z.object({
  metrics: z.object({}).passthrough(),
  artifactRef: z.string().optional(),
  trainingDataPoints: z.number().min(0).optional()
});

const storeMetricsSchema = z.object({
  accuracy: z.number().min(0).max(1).optional(),
  rSquared: z.number().optional(),
  mae: z.number().min(0).optional(),
  mse: z.number().min(0).optional(),
  sharpeRatio: z.number().optional(),
  calmarRatio: z.number().optional(),
  informationRatio: z.number().optional(),
  maxDrawdown: z.number().min(0).max(1).optional(),
  winRate: z.number().min(0).max(1).optional(),
  profitFactor: z.number().min(0).optional(),
  directionalAccuracy: z.number().min(0).max(1).optional(),
  totalPredictions: z.number().min(0).optional(),
  correctPredictions: z.number().min(0).optional(),
  detailedMetrics: z.object({}).passthrough().optional()
});

const createStrategySchema = z.object({
  modelId: z.string().uuid(),
  strategyName: z.string().min(1).max(100),
  approvalCriteria: z.object({
    min_accuracy: z.number().min(0).max(1).optional(),
    min_sharpe: z.number().optional(),
    max_drawdown: z.number().min(0).max(1).optional(),
    min_tests_passed: z.number().min(0).optional()
  }).optional()
});

const backtestParamsSchema = z.object({
  initialCapital: z.number().min(1000).optional(),
  transactionCost: z.number().min(0).max(0.1).optional(),
  lookbackPeriod: z.number().min(5).max(100).optional(),
  rebalanceFrequency: z.number().min(1).optional(),
  maxPositionSize: z.number().min(0.01).max(1).optional()
});

// Middleware to inject services
router.use((req, res, next) => {
  if (!mlModelRepository || !backtestHarness || !strategyLifecycleManager) {
    return res.status(500).json({ error: 'Services not properly initialized' });
  }
  next();
});

// === ML MODELS MANAGEMENT ===

/**
 * @route POST /api/ml-strategy/models
 * @desc Create new ML model with expanded schema
 */
router.post('/models', async (req, res) => {
  try {
    const validatedData = createModelSchema.parse(req.body);
    const userId = req.user?.id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const model = await mlModelRepository.createModel({
      ...validatedData,
      userId
    });

    res.status(201).json({
      success: true,
      message: 'ML model created successfully',
      data: model
    });

  } catch (error) {
    console.error('❌ Error creating ML model:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to create ML model',
      message: error.message
    });
  }
});

/**
 * @route PUT /api/ml-strategy/models/:id/training
 * @desc Update model training metadata after training completion
 */
router.put('/models/:id/training', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateTrainingMetadataSchema.parse(req.body);

    const updatedModel = await mlModelRepository.updateTrainingMetadata(id, validatedData);

    res.json({
      success: true,
      message: 'Training metadata updated successfully',
      data: updatedModel
    });

  } catch (error) {
    console.error('❌ Error updating training metadata:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to update training metadata',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-strategy/models/:id/metrics
 * @desc Store model evaluation metrics (R²/MAE/Sharpe)
 */
router.post('/models/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = storeMetricsSchema.parse(req.body);

    const metrics = await mlModelRepository.storeEvaluationMetrics(id, validatedData);

    res.json({
      success: true,
      message: 'Evaluation metrics stored successfully',
      data: metrics
    });

  } catch (error) {
    console.error('❌ Error storing metrics:', error);
    res.status(500).json({
      error: 'Failed to store evaluation metrics',
      message: error.message
    });
  }
});

/**
 * @route PUT /api/ml-strategy/models/:id/status
 * @desc Update model lifecycle status
 */
router.put('/models/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes = '' } = req.body;
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const updatedModel = await mlModelRepository.updateModelStatus(id, status, userId, notes);

    res.json({
      success: true,
      message: `Model status updated to ${status}`,
      data: updatedModel
    });

  } catch (error) {
    console.error('❌ Error updating model status:', error);
    res.status(500).json({
      error: 'Failed to update model status',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ml-strategy/models/:id/performance
 * @desc Get model performance history
 */
router.get('/models/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 30 } = req.query;

    const performance = await mlModelRepository.getModelPerformanceHistory(id, parseInt(limit));

    res.json({
      success: true,
      data: {
        model_id: id,
        performance_history: performance
      }
    });

  } catch (error) {
    console.error('❌ Error getting performance history:', error);
    res.status(500).json({
      error: 'Failed to get performance history',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ml-strategy/models/:id/activity
 * @desc Get model activity log for audit trail
 */
router.get('/models/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const activity = await mlModelRepository.getModelActivityLog(id, parseInt(limit));

    res.json({
      success: true,
      data: {
        model_id: id,
        activity_log: activity
      }
    });

  } catch (error) {
    console.error('❌ Error getting activity log:', error);
    res.status(500).json({
      error: 'Failed to get activity log',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ml-strategy/models/search
 * @desc Search models by criteria
 */
router.get('/models/search', async (req, res) => {
  try {
    const {
      userId,
      type,
      status,
      algorithmType,
      symbols
    } = req.query;

    const criteria = {};
    if (userId) criteria.userId = userId;
    if (type) criteria.type = type;
    if (status) criteria.status = status;
    if (algorithmType) criteria.algorithmType = algorithmType;
    if (symbols) criteria.symbols = symbols.split(',');

    const models = await mlModelRepository.searchModels(criteria);

    res.json({
      success: true,
      data: {
        models,
        count: models.length
      }
    });

  } catch (error) {
    console.error('❌ Error searching models:', error);
    res.status(500).json({
      error: 'Failed to search models',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ml-strategy/models/statistics
 * @desc Get model statistics for dashboard
 */
router.get('/models/statistics', async (req, res) => {
  try {
    const { userId } = req.query;
    const statistics = await mlModelRepository.getModelStatistics(userId);

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('❌ Error getting model statistics:', error);
    res.status(500).json({
      error: 'Failed to get model statistics',
      message: error.message
    });
  }
});

// === DETERMINISTIC BACKTESTING ===

/**
 * @route GET /api/ml-strategy/backtest/fixtures
 * @desc Get available backtest fixtures
 */
router.get('/backtest/fixtures', async (req, res) => {
  try {
    const fixtures = await backtestHarness.getAvailableFixtures();

    res.json({
      success: true,
      data: fixtures
    });

  } catch (error) {
    console.error('❌ Error getting fixtures:', error);
    res.status(500).json({
      error: 'Failed to get backtest fixtures',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-strategy/backtest/run
 * @desc Run deterministic backtest on model with fixture data
 */
router.post('/backtest/run', async (req, res) => {
  try {
    const { modelId, fixtureId, params = {} } = req.body;
    
    if (!modelId || !fixtureId) {
      return res.status(400).json({
        error: 'modelId and fixtureId are required'
      });
    }

    const validatedParams = backtestParamsSchema.parse(params);
    const results = await backtestHarness.runBacktest(modelId, fixtureId, validatedParams);

    res.json({
      success: true,
      message: 'Backtest completed successfully',
      data: results
    });

  } catch (error) {
    console.error('❌ Error running backtest:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Invalid backtest parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to run backtest',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ml-strategy/backtest/results/:modelId
 * @desc Get validation results for a model
 */
router.get('/backtest/results/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    const { fixtureId } = req.query;

    const results = await backtestHarness.getValidationResults(modelId, fixtureId);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('❌ Error getting validation results:', error);
    res.status(500).json({
      error: 'Failed to get validation results',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-strategy/backtest/compare
 * @desc Compare multiple models on same fixture
 */
router.post('/backtest/compare', async (req, res) => {
  try {
    const { modelIds, fixtureId } = req.body;

    if (!Array.isArray(modelIds) || !fixtureId) {
      return res.status(400).json({
        error: 'modelIds (array) and fixtureId are required'
      });
    }

    const comparison = await backtestHarness.compareModels(modelIds, fixtureId);

    res.json({
      success: true,
      data: {
        fixture_id: fixtureId,
        model_comparison: comparison
      }
    });

  } catch (error) {
    console.error('❌ Error comparing models:', error);
    res.status(500).json({
      error: 'Failed to compare models',
      message: error.message
    });
  }
});

// === STRATEGY LIFECYCLE MANAGEMENT ===

/**
 * @route POST /api/ml-strategy/strategies
 * @desc Create new strategy lifecycle entry
 */
router.post('/strategies', async (req, res) => {
  try {
    const validatedData = createStrategySchema.parse(req.body);
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const strategy = await strategyLifecycleManager.createStrategy({
      ...validatedData,
      userId
    });

    res.status(201).json({
      success: true,
      message: 'Strategy created successfully',
      data: strategy
    });

  } catch (error) {
    console.error('❌ Error creating strategy:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to create strategy',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-strategy/strategies/:id/validate
 * @desc Move strategy to validation stage
 */
router.post('/strategies/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const { validationParams = {} } = req.body;
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const result = await strategyLifecycleManager.validateStrategy(id, userId, validationParams);

    res.json({
      success: true,
      message: 'Strategy validation completed',
      data: result
    });

  } catch (error) {
    console.error('❌ Error validating strategy:', error);
    res.status(500).json({
      error: 'Failed to validate strategy',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-strategy/strategies/:id/approve
 * @desc Approve strategy for deployment
 */
router.post('/strategies/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes = '' } = req.body;
    const approverId = req.user?.id || req.headers['x-user-id'];

    if (!approverId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const result = await strategyLifecycleManager.approveStrategy(id, approverId, approvalNotes);

    res.json({
      success: true,
      message: 'Strategy approved successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error approving strategy:', error);
    res.status(400).json({
      error: 'Failed to approve strategy',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-strategy/strategies/:id/deploy
 * @desc Deploy strategy to live trading
 */
router.post('/strategies/:id/deploy', async (req, res) => {
  try {
    const { id } = req.params;
    const { deploymentNotes = '' } = req.body;
    const deployerId = req.user?.id || req.headers['x-user-id'];

    if (!deployerId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const result = await strategyLifecycleManager.deployStrategy(id, deployerId, deploymentNotes);

    res.json({
      success: true,
      message: 'Strategy deployed to live trading',
      data: result
    });

  } catch (error) {
    console.error('❌ Error deploying strategy:', error);
    res.status(400).json({
      error: 'Failed to deploy strategy',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-strategy/strategies/:id/retire
 * @desc Retire strategy from live trading
 */
router.post('/strategies/:id/retire', async (req, res) => {
  try {
    const { id } = req.params;
    const { retirementReason = '' } = req.body;
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const result = await strategyLifecycleManager.retireStrategy(id, userId, retirementReason);

    res.json({
      success: true,
      message: 'Strategy retired from live trading',
      data: result
    });

  } catch (error) {
    console.error('❌ Error retiring strategy:', error);
    res.status(500).json({
      error: 'Failed to retire strategy',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ml-strategy/strategies
 * @desc Get strategies by criteria
 */
router.get('/strategies', async (req, res) => {
  try {
    const {
      userId,
      lifecycleStage,
      isLive
    } = req.query;

    const criteria = {};
    if (userId) criteria.userId = userId;
    if (lifecycleStage) criteria.lifecycleStage = lifecycleStage;
    if (isLive !== undefined) criteria.isLive = isLive === 'true';

    const strategies = await strategyLifecycleManager.getStrategies(criteria);

    res.json({
      success: true,
      data: strategies
    });

  } catch (error) {
    console.error('❌ Error getting strategies:', error);
    res.status(500).json({
      error: 'Failed to get strategies',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ml-strategy/strategies/statistics
 * @desc Get strategy lifecycle statistics
 */
router.get('/strategies/statistics', async (req, res) => {
  try {
    const { userId } = req.query;
    const statistics = await strategyLifecycleManager.getLifecycleStatistics(userId);

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('❌ Error getting lifecycle statistics:', error);
    res.status(500).json({
      error: 'Failed to get lifecycle statistics',
      message: error.message
    });
  }
});

// Initialize services (called by server.js)
router.setServices = (services) => {
  mlModelRepository = services.mlModelRepository;
  backtestHarness = services.backtestHarness;
  strategyLifecycleManager = services.strategyLifecycleManager;
};

module.exports = router;