const logger = require('../utils/logger');

/**
 * ML Performance Tracking Controller
 * Handles ML model performance monitoring API endpoints
 */
class MLPerformanceController {
  constructor(performanceTracker) {
    this.performanceTracker = performanceTracker;
  }

  /**
   * Get performance report for a specific model
   */
  async getModelPerformance(req, res) {
    try {
      const { modelId } = req.params;
      
      if (!modelId) {
        return res.status(400).json({
          success: false,
          error: 'Model ID is required'
        });
      }

      const report = this.performanceTracker.getModelPerformanceReport(modelId);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Model not found or no performance data available'
        });
      }

      res.status(200).json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      });

      logger.debug('Model performance report retrieved', {
        modelId,
        accuracy: report.performance.currentAccuracy,
        totalPredictions: report.performance.totalPredictions,
        service: 'ml-performance-controller'
      });
    } catch (error) {
      logger.error('Failed to get model performance', {
        error: error.message,
        modelId: req.params.modelId,
        service: 'ml-performance-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve model performance',
        message: error.message
      });
    }
  }

  /**
   * Get performance dashboard data for all models
   */
  async getPerformanceDashboard(req, res) {
    try {
      const { timeframe = '24h', metric = 'accuracy' } = req.query;
      
      const dashboard = {
        overview: {
          totalModels: this.performanceTracker.performanceState.models.size,
          activeModels: 0,
          modelsNeedingRetraining: this.performanceTracker.performanceState.retrainingQueue.size,
          totalPredictions: 0,
          avgAccuracy: 0
        },
        models: [],
        alerts: [],
        abTests: this.performanceTracker.getActiveABTests(),
        timeframe,
        requestedMetric: metric
      };

      // Aggregate model data
      const models = Array.from(this.performanceTracker.performanceState.models.values());
      let totalAccuracy = 0;
      let activeModelCount = 0;

      models.forEach(model => {
        const currentAccuracy = model.accuratePredictions / Math.max(model.totalPredictions, 1);
        const recentAccuracy = this.performanceTracker.calculateRecentAccuracy(model.recentPredictions);
        
        dashboard.overview.totalPredictions += model.totalPredictions;
        
        if (model.status === 'active') {
          totalAccuracy += currentAccuracy;
          activeModelCount++;
          dashboard.overview.activeModels++;
        }

        const driftMetrics = this.performanceTracker.performanceState.driftMetrics.get(model.modelId);
        const needsRetraining = this.performanceTracker.performanceState.retrainingQueue.has(model.modelId);

        dashboard.models.push({
          id: model.modelId,
          version: model.version,
          status: model.status,
          accuracy: currentAccuracy,
          recentAccuracy,
          totalPredictions: model.totalPredictions,
          drift: driftMetrics ? driftMetrics.overallDrift : 0,
          needsRetraining,
          lastUpdated: model.lastUpdated,
          confidenceAvg: this.performanceTracker.calculateAverageConfidence(model.recentPredictions)
        });

        // Check for alerts
        if (currentAccuracy < 0.65) {
          dashboard.alerts.push({
            modelId: model.modelId,
            type: 'low_accuracy',
            severity: 'critical',
            message: `Model ${model.modelId} accuracy below 65%: ${(currentAccuracy * 100).toFixed(2)}%`,
            timestamp: Date.now()
          });
        }

        if (driftMetrics && driftMetrics.overallDrift > 0.1) {
          dashboard.alerts.push({
            modelId: model.modelId,
            type: 'drift_detected',
            severity: 'warning',
            message: `Model ${model.modelId} drift detected: ${(driftMetrics.overallDrift * 100).toFixed(2)}%`,
            timestamp: driftMetrics.calculatedAt
          });
        }
      });

      dashboard.overview.avgAccuracy = activeModelCount > 0 ? totalAccuracy / activeModelCount : 0;

      // Sort models by performance
      dashboard.models.sort((a, b) => b.accuracy - a.accuracy);

      res.status(200).json({
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString()
      });

      logger.debug('Performance dashboard retrieved', {
        totalModels: dashboard.overview.totalModels,
        activeModels: dashboard.overview.activeModels,
        avgAccuracy: dashboard.overview.avgAccuracy,
        service: 'ml-performance-controller'
      });
    } catch (error) {
      logger.error('Failed to get performance dashboard', {
        error: error.message,
        service: 'ml-performance-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance dashboard',
        message: error.message
      });
    }
  }

  /**
   * Record a model prediction for tracking
   */
  async recordPrediction(req, res) {
    try {
      const { modelId, prediction, confidence, features, metadata } = req.body;

      if (!modelId || prediction === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['modelId', 'prediction']
        });
      }

      const predictionData = {
        input: req.body.input,
        prediction: parseFloat(prediction),
        confidence: parseFloat(confidence) || 0.5,
        features: features || {},
        metadata: metadata || {}
      };

      const predictionId = await this.performanceTracker.recordPrediction(modelId, predictionData);

      res.status(201).json({
        success: true,
        data: {
          predictionId,
          modelId,
          prediction: predictionData.prediction,
          confidence: predictionData.confidence,
          trackingEnabled: true
        },
        timestamp: new Date().toISOString()
      });

      logger.debug('Prediction recorded for tracking', {
        predictionId,
        modelId,
        prediction: predictionData.prediction,
        confidence: predictionData.confidence,
        service: 'ml-performance-controller'
      });
    } catch (error) {
      logger.error('Failed to record prediction', {
        error: error.message,
        body: req.body,
        service: 'ml-performance-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to record prediction',
        message: error.message
      });
    }
  }

  /**
   * Update prediction with actual outcome
   */
  async updatePredictionOutcome(req, res) {
    try {
      const { predictionId } = req.params;
      const { outcome, metadata } = req.body;

      if (!predictionId || outcome === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['predictionId', 'outcome']
        });
      }

      const result = await this.performanceTracker.updatePredictionOutcome(
        predictionId,
        parseFloat(outcome),
        metadata || {}
      );

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });

      logger.debug('Prediction outcome updated', {
        predictionId,
        outcome,
        accuracy: result.accuracy,
        service: 'ml-performance-controller'
      });
    } catch (error) {
      logger.error('Failed to update prediction outcome', {
        error: error.message,
        predictionId: req.params.predictionId,
        service: 'ml-performance-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update prediction outcome',
        message: error.message
      });
    }
  }

  /**
   * Start A/B test between two models
   */
  async startABTest(req, res) {
    try {
      const { modelA, modelB, config } = req.body;

      if (!modelA || !modelB) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['modelA', 'modelB']
        });
      }

      if (modelA === modelB) {
        return res.status(400).json({
          success: false,
          error: 'Cannot A/B test a model against itself'
        });
      }

      const testId = await this.performanceTracker.startABTest(modelA, modelB, config);

      res.status(201).json({
        success: true,
        data: {
          testId,
          modelA,
          modelB,
          config: config || {},
          status: 'running',
          startTime: Date.now()
        },
        timestamp: new Date().toISOString()
      });

      logger.info('A/B test started', {
        testId,
        modelA,
        modelB,
        service: 'ml-performance-controller'
      });
    } catch (error) {
      logger.error('Failed to start A/B test', {
        error: error.message,
        body: req.body,
        service: 'ml-performance-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to start A/B test',
        message: error.message
      });
    }
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(req, res) {
    try {
      const { testId } = req.params;

      if (!testId) {
        return res.status(400).json({
          success: false,
          error: 'Test ID is required'
        });
      }

      const abTest = this.performanceTracker.performanceState.abTests.get(testId);

      if (!abTest) {
        return res.status(404).json({
          success: false,
          error: 'A/B test not found'
        });
      }

      const response = {
        id: abTest.id,
        modelA: {
          id: abTest.modelA.id,
          predictions: abTest.modelA.predictions,
          accuracy: abTest.modelA.accuracy
        },
        modelB: {
          id: abTest.modelB.id,
          predictions: abTest.modelB.predictions,
          accuracy: abTest.modelB.accuracy
        },
        status: abTest.status,
        startTime: abTest.startTime,
        endTime: abTest.endTime,
        duration: abTest.endTime ? abTest.endTime - abTest.startTime : Date.now() - abTest.startTime,
        results: abTest.results,
        config: abTest.config
      };

      res.status(200).json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });

      logger.debug('A/B test results retrieved', {
        testId,
        status: abTest.status,
        service: 'ml-performance-controller'
      });
    } catch (error) {
      logger.error('Failed to get A/B test results', {
        error: error.message,
        testId: req.params.testId,
        service: 'ml-performance-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve A/B test results',
        message: error.message
      });
    }
  }

  /**
   * Get model drift analysis
   */
  async getModelDrift(req, res) {
    try {
      const { modelId } = req.params;

      if (!modelId) {
        return res.status(400).json({
          success: false,
          error: 'Model ID is required'
        });
      }

      const driftMetrics = this.performanceTracker.performanceState.driftMetrics.get(modelId);

      if (!driftMetrics) {
        return res.status(404).json({
          success: false,
          error: 'No drift data available for this model'
        });
      }

      // Get additional context
      const modelPerf = this.performanceTracker.performanceState.models.get(modelId);
      const recentPredictions = modelPerf ? modelPerf.recentPredictions.length : 0;

      const response = {
        modelId,
        drift: driftMetrics,
        context: {
          recentPredictions,
          driftThreshold: this.performanceTracker.config.driftThreshold,
          retrainingThreshold: this.performanceTracker.config.retrainingDriftThreshold,
          needsRetraining: this.performanceTracker.performanceState.retrainingQueue.has(modelId)
        },
        recommendations: this.generateDriftRecommendations(driftMetrics)
      };

      res.status(200).json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });

      logger.debug('Model drift analysis retrieved', {
        modelId,
        driftScore: driftMetrics.overallDrift,
        service: 'ml-performance-controller'
      });
    } catch (error) {
      logger.error('Failed to get model drift analysis', {
        error: error.message,
        modelId: req.params.modelId,
        service: 'ml-performance-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve model drift analysis',
        message: error.message
      });
    }
  }

  /**
   * Trigger model retraining
   */
  async triggerRetraining(req, res) {
    try {
      const { modelId } = req.params;
      const { reason, metadata } = req.body;

      if (!modelId) {
        return res.status(400).json({
          success: false,
          error: 'Model ID is required'
        });
      }

      const retrainingRequest = await this.performanceTracker.triggerRetraining(
        modelId,
        reason || 'manual_trigger',
        metadata || {}
      );

      res.status(200).json({
        success: true,
        data: {
          modelId,
          reason: reason || 'manual_trigger',
          status: 'queued',
          queuePosition: this.performanceTracker.performanceState.retrainingQueue.size,
          timestamp: Date.now()
        },
        timestamp: new Date().toISOString()
      });

      logger.info('Model retraining triggered manually', {
        modelId,
        reason: reason || 'manual_trigger',
        service: 'ml-performance-controller'
      });
    } catch (error) {
      logger.error('Failed to trigger retraining', {
        error: error.message,
        modelId: req.params.modelId,
        service: 'ml-performance-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to trigger retraining',
        message: error.message
      });
    }
  }

  /**
   * Get feature importance analysis
   */
  async getFeatureImportance(req, res) {
    try {
      const { modelId } = req.params;

      if (!modelId) {
        return res.status(400).json({
          success: false,
          error: 'Model ID is required'
        });
      }

      const modelPerf = this.performanceTracker.performanceState.models.get(modelId);

      if (!modelPerf) {
        return res.status(404).json({
          success: false,
          error: 'Model not found or no performance data available'
        });
      }

      // Convert feature importance map to array for easier consumption
      const featureImportance = Array.from(modelPerf.featureImportance.entries())
        .map(([feature, data]) => ({
          feature,
          importance: data.avgImportance,
          count: data.count,
          totalImportance: data.totalImportance
        }))
        .sort((a, b) => b.importance - a.importance);

      const response = {
        modelId,
        features: featureImportance,
        totalFeatures: featureImportance.length,
        topFeatures: featureImportance.slice(0, 10),
        lastUpdated: modelPerf.lastUpdated
      };

      res.status(200).json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });

      logger.debug('Feature importance analysis retrieved', {
        modelId,
        totalFeatures: featureImportance.length,
        service: 'ml-performance-controller'
      });
    } catch (error) {
      logger.error('Failed to get feature importance', {
        error: error.message,
        modelId: req.params.modelId,
        service: 'ml-performance-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve feature importance',
        message: error.message
      });
    }
  }

  /**
   * Get performance comparison between models
   */
  async compareModels(req, res) {
    try {
      const { models } = req.body;

      if (!models || !Array.isArray(models) || models.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'At least 2 model IDs are required for comparison',
          example: { models: ['model1', 'model2'] }
        });
      }

      const comparison = {
        models: [],
        summary: {
          bestAccuracy: null,
          bestRecentAccuracy: null,
          leastDrift: null,
          mostPredictions: null
        }
      };

      let bestAccuracy = 0;
      let bestRecentAccuracy = 0;
      let leastDrift = Infinity;
      let mostPredictions = 0;

      for (const modelId of models) {
        const report = this.performanceTracker.getModelPerformanceReport(modelId);
        
        if (!report) {
          comparison.models.push({
            id: modelId,
            error: 'Model not found or no data available'
          });
          continue;
        }

        const modelData = {
          id: modelId,
          accuracy: report.performance.currentAccuracy,
          recentAccuracy: report.performance.recentAccuracy,
          totalPredictions: report.performance.totalPredictions,
          drift: report.drift ? report.drift.overallDrift : 0,
          needsRetraining: report.needsRetraining,
          status: report.status
        };

        comparison.models.push(modelData);

        // Track best performers
        if (modelData.accuracy > bestAccuracy) {
          bestAccuracy = modelData.accuracy;
          comparison.summary.bestAccuracy = modelId;
        }
        
        if (modelData.recentAccuracy > bestRecentAccuracy) {
          bestRecentAccuracy = modelData.recentAccuracy;
          comparison.summary.bestRecentAccuracy = modelId;
        }
        
        if (modelData.drift < leastDrift) {
          leastDrift = modelData.drift;
          comparison.summary.leastDrift = modelId;
        }
        
        if (modelData.totalPredictions > mostPredictions) {
          mostPredictions = modelData.totalPredictions;
          comparison.summary.mostPredictions = modelId;
        }
      }

      res.status(200).json({
        success: true,
        data: comparison,
        timestamp: new Date().toISOString()
      });

      logger.debug('Model comparison completed', {
        modelsCompared: models.length,
        bestAccuracy: comparison.summary.bestAccuracy,
        service: 'ml-performance-controller'
      });
    } catch (error) {
      logger.error('Failed to compare models', {
        error: error.message,
        models: req.body.models,
        service: 'ml-performance-controller'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to compare models',
        message: error.message
      });
    }
  }

  /**
   * Generate drift recommendations
   */
  generateDriftRecommendations(driftMetrics) {
    const recommendations = [];

    if (driftMetrics.overallDrift > 0.2) {
      recommendations.push({
        type: 'retraining',
        priority: 'high',
        message: 'Immediate retraining recommended due to severe drift'
      });
    } else if (driftMetrics.overallDrift > 0.1) {
      recommendations.push({
        type: 'monitoring',
        priority: 'medium',
        message: 'Increase monitoring frequency and consider retraining soon'
      });
    }

    if (driftMetrics.confidenceDrift > 0.15) {
      recommendations.push({
        type: 'confidence',
        priority: 'medium',
        message: 'Model confidence has drifted significantly, review prediction thresholds'
      });
    }

    if (driftMetrics.sampleSize < 500) {
      recommendations.push({
        type: 'data',
        priority: 'low',
        message: 'Increase sample size for more reliable drift detection'
      });
    }

    return recommendations;
  }
}

module.exports = MLPerformanceController;