const express = require('express');
const { WebSocketServer } = require('ws');
const router = express.Router();
const MLPerformanceController = require('../controllers/mlPerformanceController');
const MLPerformanceMonitor = require('../services/mlPerformanceMonitor');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// Initialize services
let performanceController = null;
let mlMonitor = null;

// Middleware to ensure services are initialized
const ensureServices = (req, res, next) => {
  if (!performanceController || !mlMonitor) {
    try {
      // Initialize ML Performance Monitor (new real-time system)
      if (!mlMonitor) {
        mlMonitor = new MLPerformanceMonitor();
        logger.info('ML Performance Monitor initialized', {
          route: req.path,
          service: 'ml-performance-monitor'
        });
      }

      // Initialize legacy controller for compatibility
      if (!performanceController) {
        const MLPerformanceTracker = require('../services/mlPerformanceTracker');
        const tracker = new MLPerformanceTracker();
        performanceController = new MLPerformanceController(tracker);
        
        logger.info('ML Performance Controller initialized', {
          route: req.path,
          service: 'ml-performance-controller'
        });
      }
    } catch (error) {
      logger.error('Failed to initialize ML Performance services', {
        error: error.message,
        service: 'ml-performance-routes'
      });
      
      return res.status(500).json({
        success: false,
        error: 'ML Performance tracking service unavailable',
        message: 'Failed to initialize performance services'
      });
    }
  }
  next();
};

// Apply middleware to all routes
router.use(ensureServices);

/**
 * @route GET /api/ml-performance/dashboard
 * @desc Get ML performance dashboard data
 * @access Private
 */
router.get('/dashboard', auth, async (req, res) => {
  await performanceController.getPerformanceDashboard(req, res);
});

/**
 * @route GET /api/ml-performance/models/:modelId
 * @desc Get performance report for a specific model
 * @access Private
 */
router.get('/models/:modelId', auth, async (req, res) => {
  await performanceController.getModelPerformance(req, res);
});

/**
 * @route POST /api/ml-performance/predictions
 * @desc Record a model prediction for tracking
 * @access Private
 * @body {string} modelId - Model identifier
 * @body {number} prediction - Prediction value
 * @body {number} confidence - Prediction confidence (0-1)
 * @body {object} features - Input features used
 * @body {object} metadata - Additional metadata
 */
router.post('/predictions', auth, async (req, res) => {
  await performanceController.recordPrediction(req, res);
});

/**
 * @route PUT /api/ml-performance/predictions/:predictionId/outcome
 * @desc Update prediction with actual outcome
 * @access Private
 * @body {number} outcome - Actual outcome value
 * @body {object} metadata - Additional metadata
 */
router.put('/predictions/:predictionId/outcome', auth, async (req, res) => {
  await performanceController.updatePredictionOutcome(req, res);
});

/**
 * @route GET /api/ml-performance/models/:modelId/drift
 * @desc Get model drift analysis
 * @access Private
 */
router.get('/models/:modelId/drift', auth, async (req, res) => {
  await performanceController.getModelDrift(req, res);
});

/**
 * @route GET /api/ml-performance/models/:modelId/features
 * @desc Get feature importance analysis
 * @access Private
 */
router.get('/models/:modelId/features', auth, async (req, res) => {
  await performanceController.getFeatureImportance(req, res);
});

/**
 * @route POST /api/ml-performance/models/:modelId/retrain
 * @desc Trigger model retraining
 * @access Private
 * @body {string} reason - Reason for retraining
 * @body {object} metadata - Additional metadata
 */
router.post('/models/:modelId/retrain', auth, async (req, res) => {
  await performanceController.triggerRetraining(req, res);
});

/**
 * @route POST /api/ml-performance/ab-test
 * @desc Start A/B test between two models
 * @access Private
 * @body {string} modelA - First model ID
 * @body {string} modelB - Second model ID
 * @body {object} config - Test configuration
 */
router.post('/ab-test', auth, async (req, res) => {
  await performanceController.startABTest(req, res);
});

/**
 * @route GET /api/ml-performance/ab-test/:testId
 * @desc Get A/B test results
 * @access Private
 */
router.get('/ab-test/:testId', auth, async (req, res) => {
  await performanceController.getABTestResults(req, res);
});

/**
 * @route POST /api/ml-performance/compare
 * @desc Compare performance between multiple models
 * @access Private
 * @body {string[]} models - Array of model IDs to compare
 */
router.post('/compare', auth, async (req, res) => {
  await performanceController.compareModels(req, res);
});

/**
 * @route GET /api/ml-performance/health
 * @desc Health check for ML performance tracking
 * @access Private
 */
router.get('/health', auth, (req, res) => {
  try {
    const tracker = performanceController.performanceTracker;
    const totalModels = tracker.performanceState.models.size;
    const activeModels = Array.from(tracker.performanceState.models.values())
      .filter(m => m.status === 'active').length;
    const retrainingQueue = tracker.performanceState.retrainingQueue.size;
    const activeABTests = tracker.performanceState.abTests.size;

    res.status(200).json({
      success: true,
      status: 'healthy',
      data: {
        totalModels,
        activeModels,
        retrainingQueue,
        activeABTests,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      },
      timestamp: new Date().toISOString()
    });

    logger.debug('ML Performance health check completed', {
      totalModels,
      activeModels,
      retrainingQueue,
      activeABTests,
      service: 'ml-performance-routes'
    });
  } catch (error) {
    logger.error('ML Performance health check failed', {
      error: error.message,
      service: 'ml-performance-routes'
    });

    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/ml-performance/metrics
 * @desc Get system-wide ML performance metrics for monitoring
 * @access Private
 */
router.get('/metrics', auth, (req, res) => {
  try {
    const tracker = performanceController.performanceTracker;
    const models = Array.from(tracker.performanceState.models.values());
    
    // Calculate system-wide metrics
    let totalPredictions = 0;
    let totalAccuratePredictions = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    const modelMetrics = models.map(model => {
      const accuracy = model.accuratePredictions / Math.max(model.totalPredictions, 1);
      const recentAccuracy = tracker.calculateRecentAccuracy(model.recentPredictions);
      const avgConfidence = tracker.calculateAverageConfidence(model.recentPredictions);
      
      totalPredictions += model.totalPredictions;
      totalAccuratePredictions += model.accuratePredictions;
      
      if (avgConfidence > 0) {
        totalConfidence += avgConfidence;
        confidenceCount++;
      }
      
      return {
        modelId: model.modelId,
        accuracy,
        recentAccuracy,
        totalPredictions: model.totalPredictions,
        avgConfidence,
        drift: tracker.performanceState.driftMetrics.get(model.modelId)?.overallDrift || 0
      };
    });

    const systemMetrics = {
      totalModels: models.length,
      totalPredictions,
      systemAccuracy: totalPredictions > 0 ? totalAccuratePredictions / totalPredictions : 0,
      avgSystemConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      modelsNeedingRetraining: tracker.performanceState.retrainingQueue.size,
      activeABTests: tracker.performanceState.abTests.size,
      modelMetrics: modelMetrics.sort((a, b) => b.accuracy - a.accuracy)
    };

    res.status(200).json({
      success: true,
      data: systemMetrics,
      timestamp: new Date().toISOString()
    });

    logger.debug('ML Performance metrics retrieved', {
      totalModels: systemMetrics.totalModels,
      systemAccuracy: systemMetrics.systemAccuracy,
      service: 'ml-performance-routes'
    });
  } catch (error) {
    logger.error('Failed to get ML performance metrics', {
      error: error.message,
      service: 'ml-performance-routes'
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route DELETE /api/ml-performance/models/:modelId
 * @desc Remove model from performance tracking
 * @access Private
 */
router.delete('/models/:modelId', auth, (req, res) => {
  try {
    const { modelId } = req.params;
    
    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: 'Model ID is required'
      });
    }

    const tracker = performanceController.performanceTracker;
    
    // Remove model from tracking
    const removed = tracker.performanceState.models.delete(modelId);
    tracker.performanceState.driftMetrics.delete(modelId);
    tracker.performanceState.retrainingQueue.delete(modelId);
    
    // Remove from active A/B tests
    const abTestsToRemove = [];
    tracker.performanceState.abTests.forEach((test, testId) => {
      if (test.modelA.id === modelId || test.modelB.id === modelId) {
        test.status = 'terminated';
        test.endTime = Date.now();
        abTestsToRemove.push(testId);
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        modelId,
        removed,
        affectedABTests: abTestsToRemove.length
      },
      timestamp: new Date().toISOString()
    });

    logger.info('Model removed from performance tracking', {
      modelId,
      removed,
      affectedABTests: abTestsToRemove.length,
      service: 'ml-performance-routes'
    });
  } catch (error) {
    logger.error('Failed to remove model from tracking', {
      error: error.message,
      modelId: req.params.modelId,
      service: 'ml-performance-routes'
    });

    res.status(500).json({
      success: false,
      error: 'Failed to remove model from tracking',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Enhanced Real-time ML Performance Endpoints
 */

/**
 * @route GET /api/ml-performance/historical/:modelId/:metric
 * @desc Get historical data for a specific model and metric
 * @access Private
 */
router.get('/models/:modelId/historical/:metric', auth, async (req, res) => {
  try {
    const { modelId, metric } = req.params;
    const { 
      timeframe = '1h', 
      startTime, 
      endTime, 
      aggregationLevel = 'minute',
      maxDataPoints = 100,
      aggregation = 'mean',
      fillGaps = true
    } = req.query;

    const options = {
      timeframe,
      startTime: startTime ? parseInt(startTime) : undefined,
      endTime: endTime ? parseInt(endTime) : undefined,
      aggregationLevel,
      maxDataPoints: parseInt(maxDataPoints),
      aggregation,
      fillGaps: fillGaps === 'true'
    };

    const historicalData = mlMonitor.getHistoricalData(modelId, metric, options);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: historicalData
    });

    logger.info('Historical data retrieved', {
      modelId,
      metric,
      timeframe,
      dataPoints: historicalData.data.length,
      service: 'ml-performance-routes'
    });
  } catch (error) {
    logger.error(`Failed to get historical data for ${req.params.modelId}:`, {
      error: error.message,
      service: 'ml-performance-routes'
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve historical data',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ml-performance/live
 * @desc Get live data for multiple models
 * @access Private
 */
router.get('/live', auth, async (req, res) => {
  try {
    const { modelIds, include = 'metrics,predictions,alerts' } = req.query;
    
    if (!modelIds) {
      return res.status(400).json({
        success: false,
        error: 'modelIds parameter is required'
      });
    }

    const modelIdList = modelIds.split(',');
    const liveData = mlMonitor.getLiveData(modelIdList);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: liveData
    });

    logger.info('Live data retrieved', {
      modelIds: modelIdList,
      count: liveData.length,
      service: 'ml-performance-routes'
    });
  } catch (error) {
    logger.error('Failed to get live data:', {
      error: error.message,
      service: 'ml-performance-routes'
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve live data',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-performance/update-metrics
 * @desc Update metrics for a model (used by ML services)
 * @access Private
 */
router.post('/update-metrics', auth, async (req, res) => {
  try {
    const { modelId, metrics } = req.body;
    
    if (!modelId || !metrics) {
      return res.status(400).json({
        success: false,
        error: 'modelId and metrics are required'
      });
    }

    mlMonitor.updateModelMetrics(modelId, metrics);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: { modelId, updated: true }
    });

    logger.info('Model metrics updated', {
      modelId,
      metrics: Object.keys(metrics),
      service: 'ml-performance-routes'
    });
  } catch (error) {
    logger.error('Failed to update model metrics:', {
      error: error.message,
      service: 'ml-performance-routes'
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update model metrics',
      message: error.message
    });
  }
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  logger.error('ML Performance API error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    service: 'ml-performance-routes'
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error in ML Performance API',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
    timestamp: new Date().toISOString()
  });
});

// WebSocket setup function (to be called by server.js)
const setupWebSocket = (server) => {
  const wss = new WebSocketServer({ 
    server,
    path: '/ml-performance'
  });

  wss.on('connection', (ws, req) => {
    logger.info('New ML performance WebSocket connection', {
      origin: req.headers.origin,
      service: 'ml-performance-websocket'
    });
    
    if (mlMonitor) {
      mlMonitor.addClient(ws);
    }
  });

  logger.info('ML Performance WebSocket server initialized on /ml-performance');
  return wss;
};

module.exports = { 
  router, 
  setupWebSocket, 
  getMLMonitor: () => mlMonitor 
};