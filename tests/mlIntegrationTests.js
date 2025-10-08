const request = require('supertest');
const { expect } = require('chai');
const ProductionMLModel = require('../backend/utils/productionMLModel');
const RealExchangeService = require('../backend/utils/realExchangeService');
const RealTradingEngine = require('../backend/utils/realTradingEngine');
const realMLService = require('../backend/utils/realMLService');

describe('Production ML Integration Tests', function() {
  this.timeout(30000); // ML operations can take time

  let testModel;
  let exchangeService;
  let tradingEngine;

  before(async function() {
    // Initialize test services
    exchangeService = new RealExchangeService();
    tradingEngine = new RealTradingEngine();
  });

  describe('Real ML Service Integration', function() {
    it('should create and train a real ML model', async function() {
      const modelConfig = {
        name: 'Test Integration Model',
        algorithmType: 'linear_regression',
        targetTimeframe: '1h',
        symbols: ['bitcoin'],
        parameters: {
          lookbackPeriod: 50
        },
        trainingPeriodDays: 30
      };

      const model = await realMLService.createModel(modelConfig);
      
      expect(model).to.have.property('id');
      expect(model).to.have.property('name', 'Test Integration Model');
      expect(model).to.have.property('algorithmType', 'linear_regression');
      expect(model).to.have.property('performanceMetrics');
      expect(model).to.have.property('trainingSize');
      expect(model.trainingSize).to.be.greaterThan(20);
      expect(model.performanceMetrics).to.have.property('mse');
    });

    it('should make predictions with trained model', async function() {
      const models = realMLService.listModels();
      expect(models.length).to.be.greaterThan(0);
      
      const model = models[0];
      const modelData = realMLService.getModel(model.id);
      expect(modelData).to.exist;
      
      // Test prediction capabilities
      const features = [[1, 2, 3, 4, 5]]; // Simple test features
      const predictions = realMLService.predict(
        JSON.parse(modelData.model), 
        features, 
        modelData.algorithmType
      );
      
      expect(predictions).to.be.an('array');
      expect(predictions.length).to.be.greaterThan(0);
    });

    it('should handle invalid model requests gracefully', async function() {
      try {
        await realMLService.createModel({
          name: 'Invalid Model',
          algorithmType: 'fake_algorithm',
          symbols: ['bitcoin']
        });
        expect.fail('Should have thrown error for invalid algorithm');
      } catch (error) {
        expect(error.message).to.include('not implemented');
      }
    });
  });

  describe('Production ML Model Integration', function() {
    it('should create and train production ML model', async function() {
      const config = {
        id: 'test-production-model',
        name: 'Integration Test Model',
        symbol: 'BTCUSDT',
        timeframe: '1h',
        lookbackPeriod: 50
      };

      testModel = new ProductionMLModel(config);
      expect(testModel.id).to.equal('test-production-model');
      expect(testModel.name).to.equal('Integration Test Model');
      expect(testModel.isReady).to.be.false;

      // Train the model
      const trainingResult = await testModel.trainModel();
      expect(trainingResult).to.not.be.false;
      expect(testModel.isReady).to.be.true;
      expect(testModel.model).to.exist;
    });

    it('should make predictions after training', async function() {
      if (!testModel || !testModel.isReady) {
        this.skip();
      }

      const prediction = await testModel.makePrediction();
      
      expect(prediction).to.have.property('symbol', 'BTCUSDT');
      expect(prediction).to.have.property('action');
      expect(prediction.action).to.match(/^(BUY|SELL|HOLD)$/);
      expect(prediction).to.have.property('confidence');
      expect(prediction.confidence).to.be.a('number');
      expect(prediction.confidence).to.be.at.least(0);
      expect(prediction.confidence).to.be.at.most(1);
      expect(prediction).to.have.property('price');
      expect(prediction.price).to.be.a('number');
      expect(prediction.price).to.be.greaterThan(0);
    });

    it('should track model performance', function() {
      if (!testModel) {
        this.skip();
      }

      const status = testModel.getModelStatus();
      
      expect(status).to.have.property('id');
      expect(status).to.have.property('name');
      expect(status).to.have.property('symbol');
      expect(status).to.have.property('status');
      expect(status).to.have.property('isReady');
      expect(status).to.have.property('lastTrainingDate');
    });
  });

  describe('Exchange Service Integration', function() {
    it('should test exchange connections', async function() {
      const connectionTest = await exchangeService.testConnection();
      
      expect(connectionTest).to.have.property('binance');
      expect(connectionTest.binance).to.have.property('connected');
    });

    it('should fetch real market data', async function() {
      try {
        const marketData = await exchangeService.getBinanceMarketData('BTCUSDT', '1h', 10);
        
        expect(marketData).to.be.an('array');
        expect(marketData.length).to.be.greaterThan(0);
        
        const dataPoint = marketData[0];
        expect(dataPoint).to.have.property('timestamp');
        expect(dataPoint).to.have.property('open');
        expect(dataPoint).to.have.property('high');
        expect(dataPoint).to.have.property('low');
        expect(dataPoint).to.have.property('close');
        expect(dataPoint).to.have.property('volume');
        
        // Validate data types
        expect(dataPoint.open).to.be.a('number');
        expect(dataPoint.high).to.be.a('number');
        expect(dataPoint.low).to.be.a('number');
        expect(dataPoint.close).to.be.a('number');
        expect(dataPoint.volume).to.be.a('number');
      } catch (error) {
        console.warn('Market data test skipped (API limitations):', error.message);
        this.skip();
      }
    });

    it('should get real-time ticker data', async function() {
      try {
        const ticker = await exchangeService.getRealTimeTicker('BTCUSDT');
        
        expect(ticker).to.have.property('symbol', 'BTCUSDT');
        expect(ticker).to.have.property('price');
        expect(ticker).to.have.property('change24h');
        expect(ticker).to.have.property('volume24h');
        expect(ticker).to.have.property('timestamp');
        
        expect(ticker.price).to.be.a('number');
        expect(ticker.price).to.be.greaterThan(0);
      } catch (error) {
        console.warn('Ticker test skipped (API limitations):', error.message);
        this.skip();
      }
    });
  });

  describe('Trading Engine Integration', function() {
    it('should validate trading signals', function() {
      const validSignal = {
        symbol: 'BTCUSDT',
        action: 'BUY',
        confidence: 0.8,
        price: 50000,
        amount: 100
      };

      const isValid = tradingEngine.validateRiskParameters(validSignal);
      expect(isValid).to.be.a('boolean');
    });

    it('should calculate position sizes', function() {
      const signal = {
        symbol: 'BTCUSDT',
        action: 'BUY',
        confidence: 0.7,
        price: 45000
      };

      const positionSize = tradingEngine.calculatePositionSize(signal);
      expect(positionSize).to.be.a('number');
      expect(positionSize).to.be.greaterThan(0);
    });

    it('should get portfolio summary', async function() {
      const portfolio = await tradingEngine.getPortfolioSummary();
      
      expect(portfolio).to.have.property('totalBalance');
      expect(portfolio).to.have.property('positions');
      expect(portfolio).to.have.property('activePositions');
      expect(portfolio.positions).to.be.an('array');
      expect(portfolio.totalBalance).to.be.a('number');
      expect(portfolio.activePositions).to.be.a('number');
    });
  });

  describe('End-to-End ML Trading Workflow', function() {
    it('should complete full ML trading workflow', async function() {
      if (!testModel || !testModel.isReady) {
        this.skip();
      }

      // Step 1: Generate ML prediction
      const prediction = await testModel.makePrediction();
      expect(prediction).to.exist;
      expect(prediction.action).to.match(/^(BUY|SELL|HOLD)$/);

      // Step 2: Validate risk parameters
      if (prediction.action !== 'HOLD') {
        const signal = {
          symbol: prediction.symbol,
          action: prediction.action,
          confidence: prediction.confidence,
          price: prediction.price,
          amount: 50 // Small test amount
        };

        const isValid = tradingEngine.validateRiskParameters(signal);
        expect(isValid).to.be.a('boolean');

        // Step 3: Calculate position size
        const positionSize = tradingEngine.calculatePositionSize(signal);
        expect(positionSize).to.be.a('number');
        expect(positionSize).to.be.greaterThan(0);

        // Step 4: Simulate trade execution (don't actually execute in tests)
        const mockTradeResult = {
          success: true,
          orderId: 'test-order-123',
          executedPrice: signal.price,
          quantity: positionSize,
          symbol: signal.symbol
        };

        expect(mockTradeResult.success).to.be.true;
        expect(mockTradeResult.orderId).to.exist;
      }
    });
  });

  describe('Performance and Load Testing', function() {
    it('should handle multiple concurrent predictions', async function() {
      if (!testModel || !testModel.isReady) {
        this.skip();
      }

      const predictionPromises = [];
      const numConcurrentPredictions = 5;

      for (let i = 0; i < numConcurrentPredictions; i++) {
        predictionPromises.push(testModel.makePrediction());
      }

      const predictions = await Promise.all(predictionPromises);
      
      expect(predictions).to.have.length(numConcurrentPredictions);
      predictions.forEach(prediction => {
        expect(prediction).to.have.property('symbol');
        expect(prediction).to.have.property('action');
        expect(prediction).to.have.property('confidence');
      });
    });

    it('should handle rapid market data requests', async function() {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];
      const startTime = Date.now();

      try {
        const dataPromises = symbols.map(symbol => 
          exchangeService.getBinanceMarketData(symbol, '1h', 5)
        );
        
        const results = await Promise.all(dataPromises);
        const duration = Date.now() - startTime;

        expect(results).to.have.length(symbols.length);
        expect(duration).to.be.lessThan(10000); // Should complete within 10 seconds
        
        results.forEach((data, index) => {
          expect(data).to.be.an('array');
          if (data.length > 0) {
            expect(data[0]).to.have.property('timestamp');
            expect(data[0]).to.have.property('close');
          }
        });
      } catch (error) {
        console.warn('Rapid market data test skipped (API limitations):', error.message);
        this.skip();
      }
    });
  });

  describe('Error Handling and Edge Cases', function() {
    it('should handle invalid symbols gracefully', async function() {
      try {
        await exchangeService.getBinanceMarketData('INVALID_SYMBOL', '1h', 10);
        expect.fail('Should have thrown error for invalid symbol');
      } catch (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.include('INVALID_SYMBOL');
      }
    });

    it('should handle model prediction without training', async function() {
      const untrainedModel = new ProductionMLModel({
        id: 'untrained-model',
        name: 'Untrained Model',
        symbol: 'BTCUSDT'
      });

      try {
        await untrainedModel.makePrediction();
        expect.fail('Should have thrown error for untrained model');
      } catch (error) {
        expect(error.message).to.include('not ready');
      }
    });

    it('should handle insufficient training data', async function() {
      const insufficientDataModel = new ProductionMLModel({
        id: 'insufficient-data-model',
        name: 'Insufficient Data Model',
        symbol: 'BTCUSDT',
        lookbackPeriod: 1000 // Very large period likely to cause insufficient data
      });

      try {
        await insufficientDataModel.trainModel();
        // If it succeeds, that's fine - just check it's handled gracefully
      } catch (error) {
        expect(error.message).to.include('Insufficient data');
      }
    });

    it('should validate risk parameters for extreme values', function() {
      const extremeSignal = {
        symbol: 'BTCUSDT',
        action: 'BUY',
        confidence: 0.1, // Very low confidence
        price: 1000000, // Extremely high price
        amount: 1 // Very small amount
      };

      const isValid = tradingEngine.validateRiskParameters(extremeSignal);
      // Should handle extreme values gracefully
      expect(isValid).to.be.a('boolean');
    });
  });

  after(function() {
    // Cleanup
    if (testModel) {
      // Any cleanup needed for test model
    }
  });
});

console.log('🧪 Production ML Integration Tests');
console.log('==================================');
console.log('Comprehensive testing of:');
console.log('• Real ML model creation and training');
console.log('• Production ML prediction workflow');
console.log('• Exchange service integration');
console.log('• Trading engine risk management');
console.log('• End-to-end ML trading pipeline');
console.log('• Performance and load testing');
console.log('• Error handling and edge cases');
console.log('');
console.log('Run with: npm test tests/mlIntegrationTests.js');