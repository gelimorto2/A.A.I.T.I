const { expect } = require('chai');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const MLPerformanceTracker = require('../backend/services/mlPerformanceTracker');
const MLPerformanceController = require('../backend/controllers/mlPerformanceController');
const mlPerformanceRoutes = require('../backend/routes/mlPerformance');

describe('ML Performance Tracking System', () => {
  let app;
  let tracker;
  let controller;
  let authToken;
  let testModelId;
  let testPredictionId;

  before(async () => {
    // Setup test environment
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';

    // Create Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock auth middleware for testing
    app.use((req, res, next) => {
      req.user = { id: 'test-user-123', username: 'testuser' };
      next();
    });
    
    app.use('/api/ml-performance', mlPerformanceRoutes);
    
    // Create test auth token
    authToken = jwt.sign(
      { id: 'test-user-123', username: 'testuser' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    testModelId = 'test-model-1';
  });

  describe('MLPerformanceTracker', () => {
    beforeEach(() => {
      tracker = new MLPerformanceTracker({
        accuracyThreshold: 0.7,
        driftThreshold: 0.1,
        retrainingDriftThreshold: 0.2,
        maxRecentPredictions: 100,
        performanceReviewInterval: 24 * 60 * 60 * 1000 // 24 hours
      });
    });

    describe('Model Registration', () => {
      it('should register a new model successfully', async () => {
        const result = await tracker.registerModel(testModelId, {
          name: 'Test LSTM Model',
          algorithm: 'lstm',
          version: '1.0.0',
          features: ['price', 'volume', 'rsi'],
          target: 'price_direction'
        });

        expect(result).to.have.property('modelId', testModelId);
        expect(result).to.have.property('status', 'registered');
        expect(tracker.performanceState.models.has(testModelId)).to.be.true;
      });

      it('should handle duplicate model registration', async () => {
        await tracker.registerModel(testModelId, { name: 'Test Model' });
        
        const result = await tracker.registerModel(testModelId, { name: 'Test Model Updated' });
        expect(result).to.have.property('status', 'updated');
      });
    });

    describe('Prediction Recording', () => {
      beforeEach(async () => {
        await tracker.registerModel(testModelId, {
          name: 'Test Model',
          algorithm: 'lstm'
        });
      });

      it('should record a prediction successfully', async () => {
        const predictionData = {
          input: { price: 100, volume: 1000 },
          prediction: 105.5,
          confidence: 0.85,
          features: { rsi: 45.2, macd: 1.2 },
          metadata: { symbol: 'BTC/USD' }
        };

        testPredictionId = await tracker.recordPrediction(testModelId, predictionData);

        expect(testPredictionId).to.be.a('string');
        
        const model = tracker.performanceState.models.get(testModelId);
        expect(model.totalPredictions).to.equal(1);
        expect(model.recentPredictions).to.have.length(1);
      });

      it('should handle invalid model ID', async () => {
        try {
          await tracker.recordPrediction('invalid-model', {
            prediction: 100,
            confidence: 0.8
          });
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Model not found');
        }
      });
    });

    describe('Outcome Updates', () => {
      beforeEach(async () => {
        await tracker.registerModel(testModelId, {
          name: 'Test Model',
          algorithm: 'lstm'
        });
        
        testPredictionId = await tracker.recordPrediction(testModelId, {
          prediction: 105.5,
          confidence: 0.85
        });
      });

      it('should update prediction outcome and calculate accuracy', async () => {
        const result = await tracker.updatePredictionOutcome(testPredictionId, 107.2);

        expect(result).to.have.property('accuracy');
        expect(result).to.have.property('predictionId', testPredictionId);
        
        const model = tracker.performanceState.models.get(testModelId);
        expect(model.accuratePredictions).to.be.greaterThan(0);
      });

      it('should handle prediction not found', async () => {
        try {
          await tracker.updatePredictionOutcome('invalid-prediction-id', 100);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Prediction not found');
        }
      });
    });

    describe('Performance Calculation', () => {
      beforeEach(async () => {
        await tracker.registerModel(testModelId, {
          name: 'Test Model',
          algorithm: 'lstm'
        });
      });

      it('should calculate accuracy correctly', async () => {
        // Record and update multiple predictions
        const predictions = [
          { prediction: 100, outcome: 102 }, // Accurate within threshold
          { prediction: 105, outcome: 110 }, // Less accurate
          { prediction: 95, outcome: 96 }    // Accurate
        ];

        for (const pred of predictions) {
          const predId = await tracker.recordPrediction(testModelId, {
            prediction: pred.prediction,
            confidence: 0.8
          });
          await tracker.updatePredictionOutcome(predId, pred.outcome);
        }

        const report = tracker.getModelPerformanceReport(testModelId);
        expect(report).to.have.property('performance');
        expect(report.performance.totalPredictions).to.equal(3);
        expect(report.performance.currentAccuracy).to.be.a('number');
      });

      it('should detect model drift', async () => {
        // Record many predictions to establish baseline
        for (let i = 0; i < 50; i++) {
          const predId = await tracker.recordPrediction(testModelId, {
            prediction: 100 + Math.random() * 10,
            confidence: 0.8,
            features: { rsi: 50 + Math.random() * 20 }
          });
          await tracker.updatePredictionOutcome(predId, 100 + Math.random() * 8);
        }

        // Add predictions with different pattern (drift)
        for (let i = 0; i < 20; i++) {
          const predId = await tracker.recordPrediction(testModelId, {
            prediction: 200 + Math.random() * 10,
            confidence: 0.4, // Lower confidence indicates drift
            features: { rsi: 80 + Math.random() * 10 }
          });
          await tracker.updatePredictionOutcome(predId, 200 + Math.random() * 15);
        }

        const driftMetrics = tracker.performanceState.driftMetrics.get(testModelId);
        expect(driftMetrics).to.exist;
        expect(driftMetrics.overallDrift).to.be.a('number');
      });
    });

    describe('A/B Testing', () => {
      let modelB;

      beforeEach(async () => {
        await tracker.registerModel(testModelId, {
          name: 'Model A',
          algorithm: 'lstm'
        });

        modelB = 'test-model-b';
        await tracker.registerModel(modelB, {
          name: 'Model B',
          algorithm: 'randomForest'
        });
      });

      it('should start A/B test successfully', async () => {
        const testId = await tracker.startABTest(testModelId, modelB, {
          trafficSplit: 0.5,
          duration: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        expect(testId).to.be.a('string');
        
        const abTest = tracker.performanceState.abTests.get(testId);
        expect(abTest).to.exist;
        expect(abTest.status).to.equal('running');
        expect(abTest.modelA.id).to.equal(testModelId);
        expect(abTest.modelB.id).to.equal(modelB);
      });

      it('should prevent A/B test with same model', async () => {
        try {
          await tracker.startABTest(testModelId, testModelId);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Cannot A/B test');
        }
      });
    });

    describe('Retraining Triggers', () => {
      beforeEach(async () => {
        await tracker.registerModel(testModelId, {
          name: 'Test Model',
          algorithm: 'lstm'
        });
      });

      it('should trigger retraining on low accuracy', async () => {
        // Record predictions with low accuracy
        for (let i = 0; i < 20; i++) {
          const predId = await tracker.recordPrediction(testModelId, {
            prediction: 100,
            confidence: 0.8
          });
          // Make predictions inaccurate
          await tracker.updatePredictionOutcome(predId, 150 + Math.random() * 50);
        }

        // Check if retraining was triggered
        const needsRetraining = tracker.performanceState.retrainingQueue.has(testModelId);
        expect(needsRetraining).to.be.true;
      });

      it('should manually trigger retraining', async () => {
        const result = await tracker.triggerRetraining(testModelId, 'manual_trigger', {
          triggeredBy: 'test-user'
        });

        expect(result).to.have.property('modelId', testModelId);
        expect(result).to.have.property('reason', 'manual_trigger');
        expect(tracker.performanceState.retrainingQueue.has(testModelId)).to.be.true;
      });
    });
  });

  describe('ML Performance API Routes', () => {
    beforeEach(async () => {
      // Reset tracker state
      tracker = new MLPerformanceTracker();
      
      // Register test model
      await tracker.registerModel(testModelId, {
        name: 'Test API Model',
        algorithm: 'lstm',
        version: '1.0.0'
      });
    });

    describe('GET /api/ml-performance/dashboard', () => {
      it('should return performance dashboard', async () => {
        const response = await request(app)
          .get('/api/ml-performance/dashboard')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('success', true);
        expect(response.body.data).to.have.property('overview');
        expect(response.body.data).to.have.property('models');
        expect(response.body.data).to.have.property('alerts');
      });

      it('should filter dashboard by timeframe', async () => {
        const response = await request(app)
          .get('/api/ml-performance/dashboard?timeframe=7d&metric=confidence')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        expect(response.body.data).to.have.property('timeframe', '7d');
        expect(response.body.data).to.have.property('requestedMetric', 'confidence');
      });
    });

    describe('POST /api/ml-performance/predictions', () => {
      it('should record a prediction', async () => {
        const predictionData = {
          modelId: testModelId,
          prediction: 105.5,
          confidence: 0.85,
          features: { rsi: 45.2, macd: 1.2 },
          metadata: { symbol: 'BTC/USD' }
        };

        const response = await request(app)
          .post('/api/ml-performance/predictions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(predictionData);

        expect(response.status).to.equal(201);
        expect(response.body).to.have.property('success', true);
        expect(response.body.data).to.have.property('predictionId');
        expect(response.body.data).to.have.property('modelId', testModelId);
        
        testPredictionId = response.body.data.predictionId;
      });

      it('should require modelId and prediction', async () => {
        const response = await request(app)
          .post('/api/ml-performance/predictions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ confidence: 0.8 });

        expect(response.status).to.equal(400);
        expect(response.body).to.have.property('success', false);
        expect(response.body.error).to.include('Missing required fields');
      });
    });

    describe('PUT /api/ml-performance/predictions/:predictionId/outcome', () => {
      beforeEach(async () => {
        // Record a test prediction first
        const response = await request(app)
          .post('/api/ml-performance/predictions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            modelId: testModelId,
            prediction: 100,
            confidence: 0.8
          });
        
        testPredictionId = response.body.data.predictionId;
      });

      it('should update prediction outcome', async () => {
        const response = await request(app)
          .put(`/api/ml-performance/predictions/${testPredictionId}/outcome`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            outcome: 102.5,
            metadata: { actualPrice: 102.5 }
          });

        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('success', true);
        expect(response.body.data).to.have.property('accuracy');
      });

      it('should handle invalid prediction ID', async () => {
        const response = await request(app)
          .put('/api/ml-performance/predictions/invalid-id/outcome')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ outcome: 100 });

        expect(response.status).to.equal(500);
        expect(response.body).to.have.property('success', false);
      });
    });

    describe('GET /api/ml-performance/models/:modelId', () => {
      it('should return model performance report', async () => {
        const response = await request(app)
          .get(`/api/ml-performance/models/${testModelId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('success', true);
        expect(response.body.data).to.have.property('performance');
        expect(response.body.data).to.have.property('modelId', testModelId);
      });

      it('should handle model not found', async () => {
        const response = await request(app)
          .get('/api/ml-performance/models/nonexistent-model')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(404);
        expect(response.body).to.have.property('success', false);
      });
    });

    describe('POST /api/ml-performance/ab-test', () => {
      let modelB;

      beforeEach(async () => {
        modelB = 'test-model-b';
        await tracker.registerModel(modelB, {
          name: 'Model B',
          algorithm: 'randomForest'
        });
      });

      it('should start A/B test', async () => {
        const response = await request(app)
          .post('/api/ml-performance/ab-test')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            modelA: testModelId,
            modelB: modelB,
            config: { duration: 7 * 24 * 60 * 60 * 1000 }
          });

        expect(response.status).to.equal(201);
        expect(response.body).to.have.property('success', true);
        expect(response.body.data).to.have.property('testId');
        expect(response.body.data).to.have.property('status', 'running');
      });

      it('should prevent A/B test with same model', async () => {
        const response = await request(app)
          .post('/api/ml-performance/ab-test')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            modelA: testModelId,
            modelB: testModelId
          });

        expect(response.status).to.equal(400);
        expect(response.body).to.have.property('success', false);
      });
    });

    describe('GET /api/ml-performance/health', () => {
      it('should return health status', async () => {
        const response = await request(app)
          .get('/api/ml-performance/health')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('status', 'healthy');
        expect(response.body.data).to.have.property('totalModels');
        expect(response.body.data).to.have.property('activeModels');
      });
    });

    describe('POST /api/ml-performance/compare', () => {
      let modelB, modelC;

      beforeEach(async () => {
        modelB = 'test-model-b';
        modelC = 'test-model-c';
        
        await tracker.registerModel(modelB, { name: 'Model B', algorithm: 'randomForest' });
        await tracker.registerModel(modelC, { name: 'Model C', algorithm: 'svm' });
      });

      it('should compare multiple models', async () => {
        const response = await request(app)
          .post('/api/ml-performance/compare')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            models: [testModelId, modelB, modelC]
          });

        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('success', true);
        expect(response.body.data).to.have.property('models');
        expect(response.body.data).to.have.property('summary');
        expect(response.body.data.models).to.have.length(3);
      });

      it('should require at least 2 models', async () => {
        const response = await request(app)
          .post('/api/ml-performance/compare')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            models: [testModelId]
          });

        expect(response.status).to.equal(400);
        expect(response.body).to.have.property('success', false);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete prediction lifecycle', async () => {
      // 1. Register model
      await tracker.registerModel(testModelId, {
        name: 'Integration Test Model',
        algorithm: 'lstm'
      });

      // 2. Record prediction
      const predictionId = await tracker.recordPrediction(testModelId, {
        prediction: 100,
        confidence: 0.8,
        features: { rsi: 50 }
      });

      // 3. Update outcome
      await tracker.updatePredictionOutcome(predictionId, 102);

      // 4. Get performance report
      const report = tracker.getModelPerformanceReport(testModelId);

      expect(report).to.exist;
      expect(report.performance.totalPredictions).to.equal(1);
      expect(report.performance.accuratePredictions).to.equal(1);
      expect(report.performance.currentAccuracy).to.be.greaterThan(0);
    });

    it('should trigger retraining workflow', async () => {
      await tracker.registerModel(testModelId, {
        name: 'Retraining Test Model',
        algorithm: 'lstm'
      });

      // Record many inaccurate predictions to trigger retraining
      for (let i = 0; i < 30; i++) {
        const predId = await tracker.recordPrediction(testModelId, {
          prediction: 100,
          confidence: 0.8
        });
        await tracker.updatePredictionOutcome(predId, 200); // Very inaccurate
      }

      // Check retraining was triggered
      expect(tracker.performanceState.retrainingQueue.has(testModelId)).to.be.true;

      // Get performance report should indicate retraining needed
      const report = tracker.getModelPerformanceReport(testModelId);
      expect(report.needsRetraining).to.be.true;
    });
  });

  after(() => {
    // Cleanup test environment
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });
});

// Helper function to generate test data
function generateTestPredictions(count, baseValue = 100, variance = 10) {
  const predictions = [];
  for (let i = 0; i < count; i++) {
    const prediction = baseValue + (Math.random() - 0.5) * variance;
    const outcome = prediction + (Math.random() - 0.5) * (variance * 0.5);
    predictions.push({ prediction, outcome });
  }
  return predictions;
}

module.exports = {
  generateTestPredictions
};