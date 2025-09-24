const request = require('supertest');
const express = require('express');
const ProductionMLModel = require('../backend/utils/productionMLModel');
const RealTradingEngine = require('../backend/utils/realTradingEngine');
const RealExchangeService = require('../backend/utils/realExchangeService');

// Mock authentication middleware for testing
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user', username: 'testuser' };
  next();
};

describe('Production Trading Integration Tests', () => {
  let app;
  let server;
  let authToken = 'test-token';

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/production-trading', mockAuth, require('../backend/routes/productionTrading'));
    
    server = app.listen(0); // Random port
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Exchange Integration', () => {
    test('should test exchange connection', async () => {
      const response = await request(app)
        .get('/api/production-trading/exchange/test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.connection).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('should get portfolio balance', async () => {
      const response = await request(app)
        .get('/api/production-trading/portfolio/balance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.success).toBe(true);
      expect(response.body.balance).toBeDefined();
      expect(response.body.portfolio).toBeDefined();
    });

    test('should get real-time market data', async () => {
      const response = await request(app)
        .get('/api/production-trading/market/BTCUSDT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.symbol).toBe('BTCUSDT');
      expect(response.body.ticker).toBeDefined();
      expect(response.body.ohlcv).toBeDefined();
    });
  });

  describe('ML Model Management', () => {
    let modelId;

    test('should create a new ML model', async () => {
      const response = await request(app)
        .post('/api/production-trading/model/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Bitcoin Model',
          symbol: 'BTCUSDT',
          timeframe: '1h',
          lookbackPeriod: 50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.model.id).toBeDefined();
      expect(response.body.model.name).toBe('Test Bitcoin Model');
      expect(response.body.model.symbol).toBe('BTCUSDT');
      expect(response.body.model.status).toBe('training');
      
      modelId = response.body.model.id;
    });

    test('should get model status', async () => {
      const response = await request(app)
        .get(`/api/production-trading/model/${modelId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.model.id).toBe(modelId);
      expect(response.body.model.status).toBeDefined();
    });

    test('should list all models', async () => {
      const response = await request(app)
        .get('/api/production-trading/models')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.models).toBeDefined();
      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  describe('Trading Operations', () => {
    let modelId;

    beforeAll(async () => {
      // Create a model for trading tests
      const response = await request(app)
        .post('/api/production-trading/model/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Trading Test Model',
          symbol: 'ETHUSDT',
          timeframe: '15m',
          lookbackPeriod: 30
        });
      
      modelId = response.body.model.id;
      
      // Wait a bit for model initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    test('should execute trading signal (dry run)', async () => {
      const response = await request(app)
        .post('/api/production-trading/trade/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          modelId: modelId,
          autoExecute: false
        });

      expect(response.body.success).toBe(true);
      expect(response.body.prediction).toBeDefined();
      expect(response.body.prediction.symbol).toBe('ETHUSDT');
      expect(response.body.prediction.action).toMatch(/BUY|SELL|HOLD/);
      expect(response.body.prediction.confidence).toBeDefined();
    });

    test('should get active positions', async () => {
      const response = await request(app)
        .get('/api/production-trading/positions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.positions).toBeDefined();
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalBalance).toBeDefined();
    });
  });

  describe('Automated Trading', () => {
    let modelId;
    let automationId;

    beforeAll(async () => {
      // Create a model for automation tests
      const response = await request(app)
        .post('/api/production-trading/model/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Automation Test Model',
          symbol: 'ADAUSDT',
          timeframe: '5m',
          lookbackPeriod: 20
        });
      
      modelId = response.body.model.id;
    });

    test('should start automated trading', async () => {
      const response = await request(app)
        .post('/api/production-trading/automated/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          modelIds: [modelId],
          interval: 60000 // 1 minute for testing
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.automationId).toBeDefined();
      expect(response.body.modelIds).toContain(modelId);
      
      automationId = response.body.automationId;
    });

    test('should stop automated trading', async () => {
      const response = await request(app)
        .post(`/api/production-trading/automated/${automationId}/stop`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.automationId).toBe(automationId);
    });
  });
});

describe('ML Model Integration Tests', () => {
  let model;

  beforeAll(() => {
    const config = {
      id: 'test-model-integration',
      name: 'Integration Test Model',
      symbol: 'BTCUSDT',
      timeframe: '1h',
      lookbackPeriod: 50
    };
    
    model = new ProductionMLModel(config);
  });

  test('should initialize ML model correctly', () => {
    expect(model.id).toBe('test-model-integration');
    expect(model.name).toBe('Integration Test Model');
    expect(model.symbol).toBe('BTCUSDT');
    expect(model.isReady).toBe(false);
  });

  test('should get model status', () => {
    const status = model.getModelStatus();
    
    expect(status.id).toBe('test-model-integration');
    expect(status.name).toBe('Integration Test Model');
    expect(status.symbol).toBe('BTCUSDT');
    expect(status.status).toBe('initialized');
    expect(status.isReady).toBe(false);
  });

  test('should train model', async () => {
    // This is a long-running operation, so we'll use a shorter timeout in real tests
    await model.trainModel();
    
    expect(model.isReady).toBe(true);
    
    const status = model.getModelStatus();
    expect(status.status).toBe('ready');
    expect(status.trainingComplete).toBe(true);
  });

  test('should make predictions after training', async () => {
    if (!model.isReady) {
      await model.trainModel();
    }
    
    const prediction = await model.makePrediction();
    
    expect(prediction).toBeDefined();
    expect(prediction.symbol).toBe('BTCUSDT');
    expect(prediction.action).toMatch(/BUY|SELL|HOLD/);
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
    expect(prediction.price).toBeDefined();
    expect(prediction.timestamp).toBeDefined();
  });
});

describe('Trading Engine Integration Tests', () => {
  let tradingEngine;

  beforeAll(() => {
    tradingEngine = new RealTradingEngine();
  });

  test('should initialize trading engine', () => {
    expect(tradingEngine).toBeDefined();
    expect(tradingEngine.exchangeService).toBeDefined();
  });

  test('should get portfolio summary', async () => {
    const portfolio = await tradingEngine.getPortfolioSummary();
    
    expect(portfolio).toBeDefined();
    expect(portfolio.totalBalance).toBeDefined();
    expect(portfolio.positions).toBeDefined();
    expect(portfolio.activePositions).toBeDefined();
    expect(Array.isArray(portfolio.positions)).toBe(true);
  });

  test('should validate risk parameters', () => {
    const signal = {
      symbol: 'BTCUSDT',
      action: 'BUY',
      confidence: 0.8,
      price: 50000,
      amount: 1000 // $1000 position
    };

    const isValid = tradingEngine.validateRiskParameters(signal);
    expect(typeof isValid).toBe('boolean');
  });

  test('should calculate position size', () => {
    const signal = {
      symbol: 'BTCUSDT',
      action: 'BUY',
      confidence: 0.8,
      price: 50000
    };

    const positionSize = tradingEngine.calculatePositionSize(signal);
    expect(positionSize).toBeGreaterThan(0);
    expect(typeof positionSize).toBe('number');
  });
});

describe('Exchange Service Integration Tests', () => {
  let exchangeService;

  beforeAll(() => {
    exchangeService = new RealExchangeService();
  });

  test('should initialize exchange service', () => {
    expect(exchangeService).toBeDefined();
  });

  test('should test connection', async () => {
    const result = await exchangeService.testConnection();
    
    expect(result).toBeDefined();
    expect(result.binance).toBeDefined();
    expect(typeof result.binance.connected).toBe('boolean');
  });

  test('should get market data', async () => {
    const marketData = await exchangeService.getBinanceMarketData('BTCUSDT', '1h', 10);
    
    expect(Array.isArray(marketData)).toBe(true);
    expect(marketData.length).toBeGreaterThan(0);
    
    const candle = marketData[0];
    expect(candle.timestamp).toBeDefined();
    expect(candle.open).toBeDefined();
    expect(candle.high).toBeDefined();
    expect(candle.low).toBeDefined();
    expect(candle.close).toBeDefined();
    expect(candle.volume).toBeDefined();
  });

  test('should get real-time ticker', async () => {
    const ticker = await exchangeService.getRealTimeTicker('BTCUSDT');
    
    expect(ticker).toBeDefined();
    expect(ticker.symbol).toBe('BTCUSDT');
    expect(ticker.price).toBeDefined();
    expect(ticker.change24h).toBeDefined();
    expect(ticker.volume24h).toBeDefined();
    expect(ticker.timestamp).toBeDefined();
  });
});

// Performance and load tests
describe('Performance Tests', () => {
  test('should handle multiple concurrent model predictions', async () => {
    const models = [];
    const numModels = 5;
    
    // Create multiple models
    for (let i = 0; i < numModels; i++) {
      const config = {
        id: `perf-test-model-${i}`,
        name: `Performance Test Model ${i}`,
        symbol: 'BTCUSDT',
        timeframe: '15m',
        lookbackPeriod: 30
      };
      
      const model = new ProductionMLModel(config);
      models.push(model);
    }

    // Train all models concurrently
    const trainingPromises = models.map(model => model.trainModel());
    await Promise.all(trainingPromises);

    // Make predictions concurrently
    const start = Date.now();
    const predictionPromises = models.map(model => model.makePrediction());
    const predictions = await Promise.all(predictionPromises);
    const duration = Date.now() - start;

    expect(predictions.length).toBe(numModels);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    
    predictions.forEach(prediction => {
      expect(prediction.symbol).toBe('BTCUSDT');
      expect(prediction.action).toMatch(/BUY|SELL|HOLD/);
    });
  });

  test('should handle rapid market data requests', async () => {
    const exchangeService = new RealExchangeService();
    const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
    
    const start = Date.now();
    const dataPromises = symbols.map(symbol => 
      exchangeService.getBinanceMarketData(symbol, '1h', 24)
    );
    const marketData = await Promise.all(dataPromises);
    const duration = Date.now() - start;

    expect(marketData.length).toBe(symbols.length);
    expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    
    marketData.forEach((data, index) => {
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });
});

console.log('🧪 Production Trading Integration Tests');
console.log('======================================');
console.log('These tests validate the complete trading flow:');
console.log('1. ML Model creation and training');
console.log('2. Real exchange data integration');
console.log('3. Trading signal generation');
console.log('4. Risk management validation');
console.log('5. Portfolio management');
console.log('6. Automated trading workflows');
console.log('');
console.log('Run with: npm test tests/productionTradingIntegration.test.js');