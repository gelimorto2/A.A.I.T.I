const express = require('express');
const router = express.Router();
const ProductionMLPipeline = require('../services/productionMLPipeline');
const logger = require('../utils/logger');

// Pipeline instances (in practice, would be managed per model/strategy)
const pipelines = new Map();

/**
 * @route POST /api/ml-pipeline/create
 * @desc Create a new ML pipeline instance
 * @access Private
 */
router.post('/create', async (req, res) => {
  try {
    const { pipelineId, config = {} } = req.body;

    if (!pipelineId) {
      return res.status(400).json({
        error: 'Pipeline ID is required'
      });
    }

    if (pipelines.has(pipelineId)) {
      return res.status(409).json({
        error: 'Pipeline already exists',
        pipelineId
      });
    }

    // Create new pipeline
    const pipeline = new ProductionMLPipeline(config);
    
    // Set up event listeners
    setupPipelineEventListeners(pipeline, pipelineId);
    
    pipelines.set(pipelineId, pipeline);

    await pipeline.initialize();

    res.json({
      success: true,
      pipelineId,
      config: pipeline.config,
      message: 'Pipeline created successfully'
    });

  } catch (error) {
    logger.error('Error creating ML pipeline:', error);
    res.status(500).json({
      error: 'Failed to create pipeline',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-pipeline/:pipelineId/predict
 * @desc Make prediction with online learning and drift detection
 * @access Private
 */
router.post('/:pipelineId/predict', async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const { features, actualValue = null } = req.body;

    if (!features || !Array.isArray(features)) {
      return res.status(400).json({
        error: 'Features array is required'
      });
    }

    const pipeline = pipelines.get(pipelineId);
    if (!pipeline) {
      return res.status(404).json({
        error: 'Pipeline not found',
        pipelineId
      });
    }

    const result = await pipeline.predict(features, actualValue);

    res.json({
      success: true,
      pipelineId,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in pipeline prediction:', error);
    res.status(500).json({
      error: 'Prediction failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-pipeline/:pipelineId/batch-predict
 * @desc Make batch predictions
 * @access Private
 */
router.post('/:pipelineId/batch-predict', async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const { predictions } = req.body;

    if (!predictions || !Array.isArray(predictions)) {
      return res.status(400).json({
        error: 'Predictions array is required'
      });
    }

    const pipeline = pipelines.get(pipelineId);
    if (!pipeline) {
      return res.status(404).json({
        error: 'Pipeline not found',
        pipelineId
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i];
      try {
        if (!prediction.features || !Array.isArray(prediction.features)) {
          throw new Error(`Prediction ${i}: features array is required`);
        }

        const result = await pipeline.predict(prediction.features, prediction.actualValue);
        results.push({
          index: i,
          ...result,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      pipelineId,
      results,
      errors,
      totalPredictions: predictions.length,
      successfulPredictions: results.length,
      failedPredictions: errors.length
    });

  } catch (error) {
    logger.error('Error in batch prediction:', error);
    res.status(500).json({
      error: 'Batch prediction failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-pipeline/:pipelineId/retrain
 * @desc Trigger manual retraining
 * @access Private
 */
router.post('/:pipelineId/retrain', async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const { reason = 'manual' } = req.body;

    const pipeline = pipelines.get(pipelineId);
    if (!pipeline) {
      return res.status(404).json({
        error: 'Pipeline not found',
        pipelineId
      });
    }

    // Trigger retraining
    await pipeline.triggerRetraining(reason);

    res.json({
      success: true,
      pipelineId,
      message: 'Retraining triggered successfully',
      reason
    });

  } catch (error) {
    logger.error('Error triggering retraining:', error);
    res.status(500).json({
      error: 'Failed to trigger retraining',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ml-pipeline/:pipelineId/statistics
 * @desc Get pipeline statistics and performance metrics
 * @access Private
 */
router.get('/:pipelineId/statistics', (req, res) => {
  try {
    const { pipelineId } = req.params;

    const pipeline = pipelines.get(pipelineId);
    if (!pipeline) {
      return res.status(404).json({
        error: 'Pipeline not found',
        pipelineId
      });
    }

    const statistics = pipeline.getStatistics();

    res.json({
      success: true,
      pipelineId,
      statistics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching pipeline statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-pipeline/:pipelineId/reset
 * @desc Reset pipeline state
 * @access Private
 */
router.post('/:pipelineId/reset', (req, res) => {
  try {
    const { pipelineId } = req.params;

    const pipeline = pipelines.get(pipelineId);
    if (!pipeline) {
      return res.status(404).json({
        error: 'Pipeline not found',
        pipelineId
      });
    }

    pipeline.reset();

    res.json({
      success: true,
      pipelineId,
      message: 'Pipeline reset successfully'
    });

  } catch (error) {
    logger.error('Error resetting pipeline:', error);
    res.status(500).json({
      error: 'Failed to reset pipeline',
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/ml-pipeline/:pipelineId
 * @desc Delete pipeline instance
 * @access Private
 */
router.delete('/:pipelineId', (req, res) => {
  try {
    const { pipelineId } = req.params;

    if (!pipelines.has(pipelineId)) {
      return res.status(404).json({
        error: 'Pipeline not found',
        pipelineId
      });
    }

    pipelines.delete(pipelineId);

    res.json({
      success: true,
      pipelineId,
      message: 'Pipeline deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting pipeline:', error);
    res.status(500).json({
      error: 'Failed to delete pipeline',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ml-pipeline/list
 * @desc List all pipeline instances
 * @access Private
 */
router.get('/list', (req, res) => {
  try {
    const pipelineList = [];

    for (const [pipelineId, pipeline] of pipelines) {
      const statistics = pipeline.getStatistics();
      pipelineList.push({
        pipelineId,
        totalPredictions: statistics.totalPredictions,
        ensembleSize: statistics.ensembleSize,
        currentAccuracy: statistics.currentAccuracy,
        retrainingInProgress: statistics.retrainingInProgress,
        lastRetraining: statistics.lastRetraining
      });
    }

    res.json({
      success: true,
      pipelines: pipelineList,
      totalPipelines: pipelineList.length
    });

  } catch (error) {
    logger.error('Error listing pipelines:', error);
    res.status(500).json({
      error: 'Failed to list pipelines',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-pipeline/:pipelineId/configure
 * @desc Update pipeline configuration
 * @access Private
 */
router.post('/:pipelineId/configure', (req, res) => {
  try {
    const { pipelineId } = req.params;
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({
        error: 'Configuration is required'
      });
    }

    const pipeline = pipelines.get(pipelineId);
    if (!pipeline) {
      return res.status(404).json({
        error: 'Pipeline not found',
        pipelineId
      });
    }

    // Update configuration (in practice, would validate and merge config)
    Object.assign(pipeline.config, config);

    res.json({
      success: true,
      pipelineId,
      config: pipeline.config,
      message: 'Configuration updated successfully'
    });

  } catch (error) {
    logger.error('Error updating pipeline configuration:', error);
    res.status(500).json({
      error: 'Failed to update configuration',
      message: error.message
    });
  }
});

/**
 * @route GET /api/ml-pipeline/:pipelineId/health
 * @desc Get pipeline health status
 * @access Private
 */
router.get('/:pipelineId/health', (req, res) => {
  try {
    const { pipelineId } = req.params;

    const pipeline = pipelines.get(pipelineId);
    if (!pipeline) {
      return res.status(404).json({
        error: 'Pipeline not found',
        pipelineId
      });
    }

    const statistics = pipeline.getStatistics();
    
    // Calculate health score
    const healthScore = calculateHealthScore(statistics);
    const status = getHealthStatus(healthScore);

    res.json({
      success: true,
      pipelineId,
      health: {
        status,
        score: healthScore,
        indicators: {
          accuracy: statistics.currentAccuracy,
          driftWarning: pipeline.getDriftWarningLevel(),
          ensembleSize: statistics.ensembleSize,
          recentUpdates: statistics.totalUpdates,
          retrainingStatus: statistics.retrainingInProgress ? 'in-progress' : 'idle'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error checking pipeline health:', error);
    res.status(500).json({
      error: 'Failed to check health',
      message: error.message
    });
  }
});

/**
 * @route POST /api/ml-pipeline/global/cleanup
 * @desc Clean up inactive pipelines
 * @access Private
 */
router.post('/global/cleanup', (req, res) => {
  try {
    const { maxIdleTime = 24 * 60 * 60 * 1000 } = req.body; // 24 hours default
    const now = Date.now();
    const cleanedPipelines = [];

    for (const [pipelineId, pipeline] of pipelines) {
      const statistics = pipeline.getStatistics();
      
      // Check if pipeline has been idle for too long
      if (statistics.totalPredictions === 0 || 
          (statistics.lastRetraining && now - statistics.lastRetraining > maxIdleTime)) {
        pipelines.delete(pipelineId);
        cleanedPipelines.push(pipelineId);
      }
    }

    res.json({
      success: true,
      cleanedPipelines,
      remainingPipelines: pipelines.size,
      message: `Cleaned up ${cleanedPipelines.length} inactive pipelines`
    });

  } catch (error) {
    logger.error('Error cleaning up pipelines:', error);
    res.status(500).json({
      error: 'Failed to cleanup pipelines',
      message: error.message
    });
  }
});

// Helper functions

function setupPipelineEventListeners(pipeline, pipelineId) {
  pipeline.on('pipeline:initialized', () => {
    logger.info(`Pipeline ${pipelineId} initialized`);
  });

  pipeline.on('pipeline:drift_detected', (data) => {
    logger.warn(`Concept drift detected in pipeline ${pipelineId}`, data);
  });

  pipeline.on('pipeline:drift_warning', (data) => {
    logger.debug(`Drift warning in pipeline ${pipelineId}`, data);
  });

  pipeline.on('pipeline:online_update', (data) => {
    logger.debug(`Online learning update in pipeline ${pipelineId}`, data);
  });

  pipeline.on('pipeline:retraining_started', (data) => {
    logger.info(`Retraining started for pipeline ${pipelineId}`, data);
  });

  pipeline.on('pipeline:retraining_completed', (data) => {
    logger.info(`Retraining completed for pipeline ${pipelineId}`, data);
  });

  pipeline.on('pipeline:retraining_failed', (data) => {
    logger.error(`Retraining failed for pipeline ${pipelineId}`, data);
  });
}

function calculateHealthScore(statistics) {
  let score = 0;
  
  // Accuracy component (0-40 points)
  score += Math.min(40, statistics.currentAccuracy * 40);
  
  // Ensemble health (0-20 points)
  if (statistics.ensembleSize > 0) {
    score += Math.min(20, statistics.ensembleSize * 5);
  }
  
  // Update activity (0-20 points)
  if (statistics.totalUpdates > 0) {
    score += Math.min(20, Math.log10(statistics.totalUpdates + 1) * 5);
  }
  
  // Retraining recency (0-20 points)
  if (statistics.lastRetraining) {
    const daysSinceRetraining = (Date.now() - statistics.lastRetraining) / (24 * 60 * 60 * 1000);
    score += Math.max(0, 20 - daysSinceRetraining);
  }
  
  return Math.min(100, score);
}

function getHealthStatus(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'critical';
}

module.exports = router;