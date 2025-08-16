const { expect } = require('chai');
const request = require('supertest');
const app = require('../backend/server');
const nextGenAIService = require('../backend/utils/nextGenAIService');

describe('TODO 2.1: Next-Generation AI & ML Implementation', function() {
  this.timeout(30000); // Increase timeout for ML operations

  let authToken;
  let userId;

  before(async function() {
    // Set up test user and authentication
    const testUser = {
      username: 'testuser_nextgen_ai',
      email: 'test@nextgenai.com',
      password: 'TestPassword123!'
    };

    // Register test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(registerResponse.status).to.equal(201);

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password
      });

    expect(loginResponse.status).to.equal(200);
    authToken = loginResponse.body.token;
    userId = loginResponse.body.user.id;
  });

  describe('Service Status and Capabilities', function() {
    it('should return service status with all components ready', async function() {
      const response = await request(app)
        .get('/api/next-gen-ai/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.status).to.have.property('services');
      expect(response.body.status).to.have.property('components');
      expect(response.body.features).to.have.property('deepLearning');
      expect(response.body.features).to.have.property('marketIntelligence');
      expect(response.body.features).to.have.property('adaptiveSystems');
    });

    it('should return comprehensive AI capabilities overview', async function() {
      const response = await request(app)
        .get('/api/next-gen-ai/capabilities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.capabilities.section).to.equal('2.1 Next-Generation AI & ML');
      expect(response.body.capabilities.implemented).to.be.true;
      
      // Check all required features
      const features = response.body.capabilities.features;
      expect(features).to.have.property('deepLearningEnhancements');
      expect(features).to.have.property('realTimeMarketIntelligence');
      expect(features).to.have.property('adaptiveTradingSystems');
      
      // Verify roadmap status
      expect(response.body.capabilities.roadmapStatus.status).to.equal('✅ COMPLETED');
    });
  });

  describe('Deep Learning Enhancements', function() {
    let transformerModelId;
    let reinforcementAgentId;
    let ensembleStrategyId;

    it('should create a transformer model for time series forecasting', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/transformer/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Transformer Model',
          sequenceLength: 50,
          modelDim: 64,
          numHeads: 4,
          numLayers: 3
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.type).to.equal('transformer');
      expect(response.body.status).to.equal('initialized');
      transformerModelId = response.body.modelId;
    });

    it('should train the transformer model', async function() {
      const response = await request(app)
        .post(`/api/next-gen-ai/transformer/${transformerModelId}/train`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbols: ['bitcoin'],
          trainingPeriodDays: 100,
          validationSplit: 0.2
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.performance).to.have.property('accuracy');
      expect(response.body.trainingDataPoints).to.be.greaterThan(0);
    });

    it('should create a reinforcement learning trading agent', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/reinforcement/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test DQN Agent',
          agentType: 'DQN',
          stateSize: 20,
          actionSize: 3,
          learningRate: 0.001
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.type).to.equal('DQN');
      expect(response.body.status).to.equal('initialized');
      reinforcementAgentId = response.body.agentId;
    });

    it('should train the reinforcement learning agent', async function() {
      const response = await request(app)
        .post(`/api/next-gen-ai/reinforcement/${reinforcementAgentId}/train`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbols: ['bitcoin'],
          episodes: 100,
          trainingPeriodDays: 50
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.averageReward).to.be.a('number');
      expect(response.body.episodes).to.equal(100);
    });

    it('should create an ensemble meta-learning strategy', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/ensemble/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Ensemble Strategy',
          baseModels: ['transformer', 'reinforcement', 'statistical'],
          metaLearner: 'stacking',
          adaptationRate: 0.01
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.type).to.equal('ensemble_meta_learning');
      expect(response.body.status).to.equal('initialized');
      ensembleStrategyId = response.body.strategyId;
    });

    it('should initialize federated learning system', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/federated/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          numberOfClients: 3,
          federationRounds: 50,
          aggregationMethod: 'fedavg',
          differentialPrivacy: true
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.clients).to.equal(3);
      expect(response.body.status).to.equal('initialized');
    });
  });

  describe('Real-Time Market Intelligence', function() {
    it('should analyze social media sentiment', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/intelligence/sentiment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbols: ['BTC', 'ETH'],
          sources: ['twitter', 'reddit']
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.sentiment).to.have.property('symbols');
      expect(response.body.sentiment).to.have.property('overall');
      expect(response.body.sentiment.symbols).to.have.property('BTC');
      expect(response.body.sentiment.symbols).to.have.property('ETH');
    });

    it('should analyze news impact with NLP', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/intelligence/news')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbols: ['BTC', 'ETH'],
          timeframe: '24h'
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.analysis).to.have.property('impactScore');
      expect(response.body.analysis).to.have.property('keyEvents');
      expect(response.body.analysis).to.have.property('priceCorrelation');
    });

    it('should perform on-chain analysis for DeFi', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/intelligence/onchain')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocols: ['uniswap', 'compound']
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.analysis).to.have.property('metrics');
      expect(response.body.analysis).to.have.property('liquidityAnalysis');
      expect(response.body.analysis).to.have.property('yieldOpportunities');
      expect(response.body.analysis).to.have.property('arbitrageOpportunities');
    });

    it('should analyze market microstructure', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/intelligence/microstructure')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol: 'BTC',
          exchange: 'binance'
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.analysis).to.have.property('orderBookDepth');
      expect(response.body.analysis).to.have.property('bidAskSpread');
      expect(response.body.analysis).to.have.property('priceImpact');
      expect(response.body.analysis).to.have.property('liquidityMetrics');
    });
  });

  describe('Adaptive Trading Systems', function() {
    let adaptiveSelectorId;
    let coordinatorId;

    it('should create adaptive model selector with regime detection', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/adaptive/selector/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Adaptive Selector',
          models: ['trend_following', 'mean_reversion'],
          regimeDetectionMethod: 'hmm',
          adaptationFrequency: 'hourly'
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.status).to.equal('initialized');
      adaptiveSelectorId = response.body.selectorId;
    });

    it('should initialize online learning with concept drift detection', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/adaptive/online-learning/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          driftDetectionMethod: 'adwin',
          adaptationStrategy: 'incremental',
          forgettingFactor: 0.95
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.status).to.equal('initialized');
    });

    it('should create hyperparameter optimizer', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/adaptive/optimizer/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          optimizationMethod: 'bayesian',
          maxEvaluations: 50,
          optimizationMetric: 'sharpe_ratio'
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.method).to.equal('bayesian');
      expect(response.body.status).to.equal('initialized');
    });

    it('should create multi-timeframe strategy coordinator', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/adaptive/coordinator/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Multi-Timeframe Coordinator',
          timeframes: ['1h', '4h', '1d'],
          coordinationStrategy: 'hierarchical',
          minimumAgreement: 0.6
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.strategy).to.equal('hierarchical');
      expect(response.body.status).to.equal('initialized');
      coordinatorId = response.body.coordinatorId;
    });
  });

  describe('Model Management', function() {
    it('should list all next-gen AI models for user', async function() {
      const response = await request(app)
        .get('/api/next-gen-ai/models')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.models).to.be.an('array');
      expect(response.body.count).to.be.greaterThan(0);
      expect(response.body.categories).to.have.property('deepLearning');
      expect(response.body.categories).to.have.property('adaptive');
    });
  });

  describe('Service Integration Tests', function() {
    it('should handle direct service calls for transformer models', async function() {
      const config = {
        sequenceLength: 30,
        modelDim: 32,
        numHeads: 2,
        numLayers: 2
      };

      const result = await nextGenAIService.createTransformerModel(config);
      expect(result).to.have.property('modelId');
      expect(result.type).to.equal('transformer');
      expect(result.status).to.equal('initialized');
    });

    it('should handle direct service calls for reinforcement learning', async function() {
      const config = {
        agentType: 'DQN',
        stateSize: 10,
        actionSize: 3,
        learningRate: 0.001
      };

      const result = await nextGenAIService.createReinforcementAgent(config);
      expect(result).to.have.property('agentId');
      expect(result.type).to.equal('DQN');
      expect(result.status).to.equal('initialized');
    });

    it('should handle sentiment analysis service calls', async function() {
      const result = await nextGenAIService.analyzeSocialSentiment(['BTC'], ['twitter']);
      expect(result).to.have.property('symbols');
      expect(result).to.have.property('overall');
      expect(result.symbols).to.have.property('BTC');
    });

    it('should handle on-chain analysis service calls', async function() {
      const result = await nextGenAIService.performOnChainAnalysis(['uniswap']);
      expect(result).to.have.property('protocols');
      expect(result).to.have.property('metrics');
      expect(result).to.have.property('yieldOpportunities');
    });
  });

  describe('Error Handling', function() {
    it('should handle invalid transformer model configuration', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/transformer/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required name field
          sequenceLength: 50
        });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.include('name is required');
    });

    it('should handle invalid reinforcement agent configuration', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/reinforcement/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required name field
          agentType: 'DQN'
        });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.include('name is required');
    });

    it('should handle training non-existent models', async function() {
      const response = await request(app)
        .post('/api/next-gen-ai/transformer/nonexistent-id/train')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbols: ['bitcoin']
        });

      expect(response.status).to.equal(404);
      expect(response.body.error).to.include('not found');
    });

    it('should handle unauthorized access', async function() {
      const response = await request(app)
        .get('/api/next-gen-ai/status');
        // No authorization header

      expect(response.status).to.equal(401);
    });
  });
});

describe('TODO 2.1 Components Unit Tests', function() {
  describe('NextGenAIService', function() {
    it('should initialize with all required components', function() {
      const status = nextGenAIService.getServiceStatus();
      expect(status).to.have.property('services');
      expect(status).to.have.property('components');
      expect(status.components.sentimentAnalyzer).to.be.true;
      expect(status.components.newsAnalyzer).to.be.true;
      expect(status.components.onChainAnalyzer).to.be.true;
      expect(status.components.microstructureAnalyzer).to.be.true;
    });

    it('should create transformer models with valid configuration', async function() {
      const config = {
        sequenceLength: 20,
        modelDim: 16,
        numHeads: 2,
        numLayers: 1
      };

      const result = await nextGenAIService.createTransformerModel(config);
      expect(result.modelId).to.be.a('string');
      expect(result.type).to.equal('transformer');
    });

    it('should create reinforcement learning agents', async function() {
      const config = {
        agentType: 'DQN',
        stateSize: 5,
        actionSize: 3
      };

      const result = await nextGenAIService.createReinforcementAgent(config);
      expect(result.agentId).to.be.a('string');
      expect(result.type).to.equal('DQN');
    });

    it('should perform sentiment analysis', async function() {
      const result = await nextGenAIService.analyzeSocialSentiment(['BTC'], ['twitter']);
      expect(result.symbols.BTC).to.have.property('sentiment');
      expect(result.symbols.BTC).to.have.property('confidence');
      expect(result.overall).to.have.property('sentiment');
    });

    it('should perform news impact analysis', async function() {
      const result = await nextGenAIService.analyzeNewsImpact(['BTC'], '24h');
      expect(result).to.have.property('impactScore');
      expect(result).to.have.property('keyEvents');
    });

    it('should perform on-chain analysis', async function() {
      const result = await nextGenAIService.performOnChainAnalysis(['uniswap']);
      expect(result).to.have.property('metrics');
      expect(result).to.have.property('liquidityAnalysis');
    });

    it('should perform market microstructure analysis', async function() {
      const result = await nextGenAIService.analyzeMarketMicrostructure('BTC', 'binance');
      expect(result).to.have.property('orderBookDepth');
      expect(result).to.have.property('bidAskSpread');
    });
  });
});