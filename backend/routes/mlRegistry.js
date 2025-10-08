/**
 * Sprint 3: ML Model Registry API Routes
 * REST API for model versioning, persistence, and lineage tracking
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

module.exports = (mlModelRegistry) => {
  /**
   * Register a new ML model
   * POST /api/ml-registry/models
   */
  router.post('/models', authenticateToken, async (req, res) => {
    try {
      const {
        name,
        type,
        description,
        params,
        metrics,
        version,
        dataChecksum,
        isSimulated,
        trainingSamples,
        validationSamples
      } = req.body;

      // Validation
      if (!name || !type || !params || !metrics || !version || !dataChecksum) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['name', 'type', 'params', 'metrics', 'version', 'dataChecksum']
        });
      }

      const result = await mlModelRegistry.registerModel({
        name,
        type,
        description,
        params,
        metrics,
        version,
        dataChecksum,
        isSimulated,
        trainingSamples,
        validationSamples
      });

      res.status(201).json({
        success: true,
        message: 'Model registered successfully',
        ...result
      });
    } catch (error) {
      console.error('Error registering model:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Save model artifact
   * POST /api/ml-registry/models/:id/artifact
   */
  router.post('/models/:id/artifact', authenticateToken, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const artifactData = req.body;

      const artifactPath = await mlModelRegistry.saveArtifact(modelId, artifactData);

      res.json({
        success: true,
        message: 'Artifact saved successfully',
        artifactPath
      });
    } catch (error) {
      console.error('Error saving artifact:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Load model artifact
   * GET /api/ml-registry/models/:id/artifact
   */
  router.get('/models/:id/artifact', authenticateToken, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const artifactData = await mlModelRegistry.loadArtifact(modelId);

      res.json({
        success: true,
        artifact: artifactData
      });
    } catch (error) {
      console.error('Error loading artifact:', error);
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * Update model status
   * PATCH /api/ml-registry/models/:id/status
   */
  router.patch('/models/:id/status', authenticateToken, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { status, ...additionalData } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      await mlModelRegistry.updateModelStatus(modelId, status, additionalData);

      res.json({
        success: true,
        message: `Model status updated to: ${status}`
      });
    } catch (error) {
      console.error('Error updating model status:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Record model metric
   * POST /api/ml-registry/models/:id/metrics
   */
  router.post('/models/:id/metrics', authenticateToken, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { metricType, value, metadata } = req.body;

      if (!metricType || value === undefined) {
        return res.status(400).json({ error: 'metricType and value are required' });
      }

      await mlModelRegistry.recordMetric(modelId, metricType, value, metadata);

      res.json({
        success: true,
        message: 'Metric recorded successfully'
      });
    } catch (error) {
      console.error('Error recording metric:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Store model evaluation
   * POST /api/ml-registry/models/:id/evaluations
   */
  router.post('/models/:id/evaluations', authenticateToken, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const evaluationData = req.body;

      const evalId = await mlModelRegistry.storeEvaluation(modelId, evaluationData);

      res.status(201).json({
        success: true,
        message: 'Evaluation stored successfully',
        evaluationId: evalId
      });
    } catch (error) {
      console.error('Error storing evaluation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get model with full history
   * GET /api/ml-registry/models/:id
   */
  router.get('/models/:id', authenticateToken, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const model = await mlModelRegistry.getModelWithHistory(modelId);

      res.json({
        success: true,
        model
      });
    } catch (error) {
      console.error('Error getting model:', error);
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * List models with filters
   * GET /api/ml-registry/models
   */
  router.get('/models', authenticateToken, async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        type: req.query.type,
        isSimulated: req.query.isSimulated === 'true' ? true : 
                     req.query.isSimulated === 'false' ? false : undefined
      };

      const models = await mlModelRegistry.listModels(filters);

      res.json({
        success: true,
        count: models.length,
        models
      });
    } catch (error) {
      console.error('Error listing models:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get metrics time series
   * GET /api/ml-registry/models/:id/metrics/:type/timeseries
   */
  router.get('/models/:id/metrics/:type/timeseries', authenticateToken, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const metricType = req.params.type;
      const limit = parseInt(req.query.limit) || 100;

      const timeseries = await mlModelRegistry.getMetricsTimeSeries(modelId, metricType, limit);

      res.json({
        success: true,
        metricType,
        count: timeseries.length,
        timeseries
      });
    } catch (error) {
      console.error('Error getting metrics timeseries:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Compare multiple models
   * POST /api/ml-registry/models/compare
   */
  router.post('/models/compare', authenticateToken, async (req, res) => {
    try {
      const { modelIds, metricType } = req.body;

      if (!modelIds || !Array.isArray(modelIds)) {
        return res.status(400).json({ error: 'modelIds array is required' });
      }

      const comparison = await mlModelRegistry.compareModels(modelIds, metricType);

      res.json({
        success: true,
        comparison
      });
    } catch (error) {
      console.error('Error comparing models:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Delete model
   * DELETE /api/ml-registry/models/:id
   */
  router.delete('/models/:id', authenticateToken, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      await mlModelRegistry.deleteModel(modelId);

      res.json({
        success: true,
        message: 'Model deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting model:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
