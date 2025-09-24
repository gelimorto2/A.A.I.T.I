const express = require('express');
const { authenticateToken, auditLog } = require('../middleware/auth');
const mlController = require('../controllers/mlController');

const router = express.Router();

// Core ML endpoints - delegated to controller
router.get('/algorithms', authenticateToken, mlController.getAlgorithms);
router.post('/models/advanced', authenticateToken, auditLog('ml_model_create'), mlController.createAdvancedModel);
router.post('/models/:modelId/train', authenticateToken, auditLog('ml_model_train'), mlController.trainModel);
router.get('/models/:modelId/predictions', authenticateToken, mlController.getModelPredictions);
router.get('/models/:modelId/metrics', authenticateToken, mlController.getModelMetrics);
router.get('/models/:modelId', authenticateToken, mlController.getModelById);
router.get('/models', authenticateToken, mlController.getUserModels);
router.delete('/models/:modelId', authenticateToken, auditLog('ml_model_delete'), mlController.deleteModel);

module.exports = router;