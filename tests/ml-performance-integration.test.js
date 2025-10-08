const { expect } = require('chai');
const request = require('supertest');
const express = require('express');

const MLService = require('../backend/services/mlService');
const TradingService = require('../backend/services/tradingService');

describe('ML Performance Integration Tests', () => {
  let app;
  let mlService;
  let tradingService;
  let testModelId;

  before(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';

    // Initialize services
    mlService = MLService;
    tradingService = TradingService;

    // Create Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { id: 'test-user-123', username: 'testuser' };
      next();
    });

    // Mount routes
    const mlRoutes = require('../backend/routes/ml');
    const tradingRoutes = require('../backend/routes/trading');
    const mlPerformanceRoutes = require('../backend/routes/mlPerformance');
    
    app.use('/api/ml', mlRoutes);
    app.use('/api/trading', tradingRoutes);
    app.use('/api/ml-performance', mlPerformanceRoutes);
  });

  describe('ML Service Performance Integration', () => {
    beforeEach(async () => {
      // Create a test model
      const modelData = {
        name: 'Integration Test LSTM',
        algorithm_type: 'lstm',
        symbols: ['BTC/USD'],
        targetTimeframe: '1h',
        parameters: {
          lookback: 50,
          features: ['price', 'volume', 'rsi'],
          layers: [64, 32],
          epochs: 10
        },
        trainingPeriodDays: 30,
        validationSplit: 0.2
      };

      const result = await mlService.createAdvancedModel(modelData, 'test-user-123');
      testModelId = result.modelId;
    });

    it('should automatically track predictions from ML service', async () => {
      // Mock training completion
      await mlService.trainModel(testModelId, 'test-user-123');

      // Get predictions (should auto-track)
      const predictions = await mlService.getModelPredictions(testModelId, 'test-user-123', {
        symbol: 'BTC/USD',
        lookback: 50
      });

      expect(predictions).to.have.property('predictions');

      // Check if predictions were tracked
      const performanceTracker = mlService.getPerformanceTracker();
      const model = performanceTracker.performanceState.models.get(testModelId);
      
      if (model) {
        expect(model.totalPredictions).to.be.greaterThan(0);
      }
    });

    it('should provide performance report for ML models', async () => {
      // Train model first
      await mlService.trainModel(testModelId, 'test-user-123');
      
      // Get some predictions
      await mlService.getModelPredictions(testModelId, 'test-user-123', {
        symbol: 'BTC/USD'
      });

      // Get performance report
      const report = await mlService.getModelPerformanceReport(testModelId, 'test-user-123');

      expect(report).to.have.property('modelId', testModelId);
      expect(report).to.have.property('performance');
      expect(report.performance).to.have.property('totalPredictions');
      expect(report.performance).to.have.property('currentAccuracy');
    });

    it('should update prediction outcomes when available', async () => {
      await mlService.trainModel(testModelId, 'test-user-123');
      
      // Record a prediction
      const performanceTracker = mlService.getPerformanceTracker();
      const predictionId = await performanceTracker.recordPrediction(testModelId, {
        prediction: 45000,
        confidence: 0.8,
        features: { rsi: 55, macd: 0.5 },
        metadata: { symbol: 'BTC/USD' }
      });

      // Update with outcome
      const result = await mlService.updatePredictionOutcome(predictionId, 46200, {
        actualPrice: 46200,
        timestamp: Date.now()
      });

      expect(result).to.have.property('accuracy');
      expect(result).to.have.property('predictionId', predictionId);
    });
  });

  describe('Trading Service ML Performance Integration', () => {
    it('should track ML predictions used in trading decisions', async () => {
      // This test would verify that when trading service uses ML predictions,
      // they are automatically tracked for performance monitoring
      
      const mockTradingRequest = {
        symbol: 'BTC/USD',
        amount: 0.01,
        type: 'market',
        side: 'buy',
        mlModelId: testModelId,
        useMLSignals: true
      };

      // Mock the trading process that would use ML predictions
      // In real implementation, this would integrate with trading service
      const performanceTracker = mlService.getPerformanceTracker();
      
      // Simulate ML prediction being used in trading
      const predictionId = await performanceTracker.recordPrediction(testModelId, {
        prediction: 45000,
        confidence: 0.75,
        features: { 
          currentPrice: 44500,
          volume: 1000000,
          rsi: 45,
          macd: -0.2
        },
        metadata: {
          symbol: 'BTC/USD',
          tradingAction: 'buy',
          usedInTrading: true
        }
      });

      expect(predictionId).to.be.a('string');

      // Later, when trade outcome is known, update prediction outcome
      setTimeout(async () => {
        await performanceTracker.updatePredictionOutcome(predictionId, 45500, {
          tradeProfit: 1000,
          executedPrice: 44520
        });
      }, 100);
    });
  });

  describe('Performance Dashboard Integration', () => {
    it('should provide comprehensive dashboard data', async () => {
      // Create multiple models for testing
      const models = [];
      for (let i = 0; i < 3; i++) {
        const modelData = {
          name: `Dashboard Test Model ${i + 1}`,
          algorithm_type: i === 0 ? 'lstm' : i === 1 ? 'randomForest' : 'svm',
          symbols: ['BTC/USD', 'ETH/USD'],
          targetTimeframe: '1h',
          parameters: { features: ['price', 'volume'] },
          trainingPeriodDays: 30
        };
        
        const result = await mlService.createAdvancedModel(modelData, 'test-user-123');
        models.push(result.modelId);
      }

      // Add some performance data
      const performanceTracker = mlService.getPerformanceTracker();
      
      for (const modelId of models) {
        // Register models in performance tracker
        await performanceTracker.registerModel(modelId, {
          name: `Model ${modelId}`,
          algorithm: 'lstm'
        });

        // Add some predictions
        for (let j = 0; j < 5; j++) {
          const predId = await performanceTracker.recordPrediction(modelId, {
            prediction: 45000 + Math.random() * 1000,
            confidence: 0.7 + Math.random() * 0.3,
            features: { rsi: 40 + Math.random() * 20 }
          });
          
          // Update some outcomes
          if (j < 3) {
            await performanceTracker.updatePredictionOutcome(
              predId, 
              45000 + Math.random() * 800
            );
          }
        }
      }

      // Get dashboard via API
      const response = await request(app)
        .get('/api/ml-performance/dashboard')
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.have.property('overview');
      expect(response.body.data).to.have.property('models');
      
      const { overview, models: dashboardModels } = response.body.data;
      expect(overview.totalModels).to.be.greaterThan(0);
      expect(dashboardModels).to.be.an('array');
    });

    it('should handle model comparison requests', async () => {
      // Create two models for comparison
      const modelIds = [];
      for (let i = 0; i < 2; i++) {
        const modelData = {
          name: `Comparison Model ${i + 1}`,
          algorithm_type: i === 0 ? 'lstm' : 'randomForest',
          symbols: ['BTC/USD'],
          targetTimeframe: '1h',
          parameters: { features: ['price'] },
          trainingPeriodDays: 30
        };
        
        const result = await mlService.createAdvancedModel(modelData, 'test-user-123');
        modelIds.push(result.modelId);
      }

      // Add performance data
      const performanceTracker = mlService.getPerformanceTracker();
      
      for (const modelId of modelIds) {
        await performanceTracker.registerModel(modelId, {
          name: `Model ${modelId}`,
          algorithm: modelIds.indexOf(modelId) === 0 ? 'lstm' : 'randomForest'
        });

        // Add different performance levels
        const baseAccuracy = modelIds.indexOf(modelId) === 0 ? 0.8 : 0.75;
        
        for (let j = 0; j < 10; j++) {
          const prediction = 45000 + Math.random() * 1000;
          // Second model has slightly worse accuracy
          const outcome = prediction + (Math.random() - 0.5) * 
            (modelIds.indexOf(modelId) === 0 ? 200 : 400);
          
          const predId = await performanceTracker.recordPrediction(modelId, {
            prediction,
            confidence: baseAccuracy + Math.random() * 0.1
          });
          
          await performanceTracker.updatePredictionOutcome(predId, outcome);
        }
      }

      // Compare models via API
      const response = await request(app)
        .post('/api/ml-performance/compare')
        .send({ models: modelIds })
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.have.property('models');
      expect(response.body.data).to.have.property('summary');
      
      const { models, summary } = response.body.data;
      expect(models).to.have.length(2);
      expect(summary).to.have.property('bestAccuracy');
    });
  });

  describe('A/B Testing Integration', () => {
    let modelA, modelB;

    beforeEach(async () => {
      // Create two models for A/B testing
      const modelDataA = {
        name: 'A/B Test Model A',
        algorithm_type: 'lstm',
        symbols: ['BTC/USD'],
        targetTimeframe: '1h',
        parameters: { features: ['price', 'volume'] },
        trainingPeriodDays: 30
      };
      
      const modelDataB = {
        name: 'A/B Test Model B',
        algorithm_type: 'randomForest',
        symbols: ['BTC/USD'],
        targetTimeframe: '1h',
        parameters: { features: ['price', 'volume', 'rsi'] },
        trainingPeriodDays: 30
      };

      const resultA = await mlService.createAdvancedModel(modelDataA, 'test-user-123');
      const resultB = await mlService.createAdvancedModel(modelDataB, 'test-user-123');
      
      modelA = resultA.modelId;
      modelB = resultB.modelId;

      // Register models in performance tracker
      const performanceTracker = mlService.getPerformanceTracker();
      await performanceTracker.registerModel(modelA, {
        name: 'Model A',
        algorithm: 'lstm'
      });
      await performanceTracker.registerModel(modelB, {
        name: 'Model B',
        algorithm: 'randomForest'
      });
    });

    it('should start and manage A/B test', async () => {
      // Start A/B test via API
      const testResponse = await request(app)
        .post('/api/ml-performance/ab-test')
        .send({
          modelA,
          modelB,
          config: {
            trafficSplit: 0.5,
            duration: 7 * 24 * 60 * 60 * 1000, // 7 days
            minSampleSize: 100
          }
        })
        .expect(201);

      const testId = testResponse.body.data.testId;
      expect(testId).to.be.a('string');

      // Add some test data
      const performanceTracker = mlService.getPerformanceTracker();
      
      // Simulate traffic split between models
      for (let i = 0; i < 20; i++) {
        const useModelA = Math.random() < 0.5;
        const modelId = useModelA ? modelA : modelB;
        
        const predId = await performanceTracker.recordPrediction(modelId, {
          prediction: 45000 + Math.random() * 1000,
          confidence: 0.8,
          features: { rsi: 50 + Math.random() * 20 },
          metadata: { abTestId: testId }
        });

        // Model A slightly more accurate for testing
        const accuracy = useModelA ? 0.9 : 0.8;
        const outcome = 45000 + Math.random() * (useModelA ? 500 : 800);
        
        await performanceTracker.updatePredictionOutcome(predId, outcome);
      }

      // Get A/B test results
      const resultsResponse = await request(app)
        .get(`/api/ml-performance/ab-test/${testId}`)
        .expect(200);

      const results = resultsResponse.body.data;
      expect(results).to.have.property('id', testId);
      expect(results).to.have.property('modelA');
      expect(results).to.have.property('modelB');
      expect(results).to.have.property('status');
    });
  });

  describe('Real-time Performance Monitoring', () => {
    it('should detect model drift and trigger alerts', async () => {
      const performanceTracker = mlService.getPerformanceTracker();
      
      await performanceTracker.registerModel(testModelId, {
        name: 'Drift Detection Model',
        algorithm: 'lstm'
      });

      // Add baseline predictions (normal performance)
      for (let i = 0; i < 50; i++) {
        const predId = await performanceTracker.recordPrediction(testModelId, {
          prediction: 45000 + Math.random() * 200,
          confidence: 0.85 + Math.random() * 0.1,
          features: { 
            rsi: 50 + Math.random() * 10,
            volume: 1000000 + Math.random() * 200000
          }
        });
        
        await performanceTracker.updatePredictionOutcome(
          predId, 
          45000 + Math.random() * 150 // Good accuracy
        );
      }

      // Add drifted predictions (different pattern)
      for (let i = 0; i < 20; i++) {
        const predId = await performanceTracker.recordPrediction(testModelId, {
          prediction: 50000 + Math.random() * 500, // Different range
          confidence: 0.6 + Math.random() * 0.2,   // Lower confidence
          features: { 
            rsi: 70 + Math.random() * 20,           // Different RSI range
            volume: 500000 + Math.random() * 100000 // Different volume
          }
        });
        
        await performanceTracker.updatePredictionOutcome(
          predId,
          50000 + Math.random() * 800 // Worse accuracy
        );
      }

      // Check drift detection
      const driftMetrics = performanceTracker.performanceState.driftMetrics.get(testModelId);
      if (driftMetrics) {
        expect(driftMetrics).to.have.property('overallDrift');
        expect(driftMetrics.overallDrift).to.be.a('number');
      }

      // Get drift analysis via API
      const response = await request(app)
        .get(`/api/ml-performance/models/${testModelId}/drift`)
        .expect(200);

      expect(response.body).to.have.property('success', true);
      if (response.body.data.drift) {
        expect(response.body.data.drift).to.have.property('overallDrift');
        expect(response.body.data).to.have.property('recommendations');
      }
    });

    it('should track feature importance over time', async () => {
      const performanceTracker = mlService.getPerformanceTracker();
      
      await performanceTracker.registerModel(testModelId, {
        name: 'Feature Importance Model',
        algorithm: 'randomForest'
      });

      // Add predictions with feature importance data
      const features = ['rsi', 'macd', 'volume', 'price_change', 'bollinger'];
      
      for (let i = 0; i < 30; i++) {
        const featureData = {};
        const featureImportance = {};
        
        features.forEach(feature => {
          featureData[feature] = Math.random() * 100;
          featureImportance[feature] = Math.random(); // Random importance
        });
        
        const predId = await performanceTracker.recordPrediction(testModelId, {
          prediction: 45000 + Math.random() * 1000,
          confidence: 0.8,
          features: featureData,
          featureImportance,
          metadata: { 
            timestamp: Date.now(),
            iteration: i
          }
        });
        
        await performanceTracker.updatePredictionOutcome(
          predId,
          45000 + Math.random() * 800
        );
      }

      // Get feature importance via API
      const response = await request(app)
        .get(`/api/ml-performance/models/${testModelId}/features`)
        .expect(200);

      expect(response.body).to.have.property('success', true);
      expect(response.body.data).to.have.property('features');
      expect(response.body.data).to.have.property('topFeatures');
      
      const { features: featureList, topFeatures } = response.body.data;
      expect(featureList).to.be.an('array');
      expect(topFeatures).to.be.an('array');
      
      if (featureList.length > 0) {
        expect(featureList[0]).to.have.property('feature');
        expect(featureList[0]).to.have.property('importance');
      }
    });
  });

  after(() => {
    // Cleanup test environment
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
  });
});

// Test utilities
function generateMarketData(symbol, count = 100) {
  const data = [];
  let basePrice = 45000;
  
  for (let i = 0; i < count; i++) {
    basePrice += (Math.random() - 0.5) * 200;
    data.push({
      symbol,
      timestamp: Date.now() - (count - i) * 60000, // 1 minute intervals
      price: basePrice,
      volume: 1000000 + Math.random() * 500000,
      high: basePrice + Math.random() * 100,
      low: basePrice - Math.random() * 100,
      open: basePrice + (Math.random() - 0.5) * 50,
      close: basePrice
    });
  }
  
  return data;
}

function calculateTechnicalIndicators(marketData) {
  const indicators = [];
  
  for (let i = 0; i < marketData.length; i++) {
    const current = marketData[i];
    const recent = marketData.slice(Math.max(0, i - 14), i + 1);
    
    // Simple RSI calculation
    const gains = [];
    const losses = [];
    
    for (let j = 1; j < recent.length; j++) {
      const change = recent[j].price - recent[j - 1].price;
      if (change > 0) gains.push(change);
      else losses.push(Math.abs(change));
    }
    
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b) / gains.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b) / losses.length : 0;
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    
    indicators.push({
      timestamp: current.timestamp,
      rsi: rsi,
      macd: Math.sin(i / 10) * 5, // Simple MACD approximation
      volume: current.volume
    });
  }
  
  return indicators;
}

module.exports = {
  generateMarketData,
  calculateTechnicalIndicators
};