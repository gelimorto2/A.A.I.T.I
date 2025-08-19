const { expect } = require('chai');
const { describe, it, before, beforeEach, after } = require('mocha');
const { getIntelligentTradingAssistants } = require('../utils/intelligentTradingAssistants');

describe('Intelligent Trading Assistants (TODO 5.1)', () => {
  let ita;

  before(() => {
    ita = getIntelligentTradingAssistants();
  });

  beforeEach(() => {
    // Reset state if needed
  });

  describe('Service Initialization', () => {
    it('should initialize with all required components', () => {
      expect(ita).to.have.property('autonomousAgents');
      expect(ita).to.have.property('multiAgentSystems');
      expect(ita).to.have.property('geneticStrategies');
      expect(ita).to.have.property('swarmIntelligence');
      expect(ita).to.have.property('marketPredictor');
      expect(ita).to.have.property('agentEvolution');
    });
  });

  describe('Autonomous Trading Agents', () => {
    it('should create a self-learning trading bot', async () => {
      const config = {
        name: 'Test Self-Learning Bot',
        learningRate: 0.001,
        explorationRate: 0.1,
        tradingPairs: ['BTC/USDT'],
        initialCapital: 10000
      };

      const result = await ita.createSelfLearningBot(config);

      expect(result).to.have.property('botId');
      expect(result).to.have.property('status', 'created');
      expect(result).to.have.property('configuration');
      expect(result).to.have.property('performance');
      expect(result.configuration.tradingPairs).to.deep.equal(['BTC/USDT']);
    });

    it('should create a multi-agent trading system', async () => {
      const config = {
        name: 'Test Multi-Agent System',
        agentTypes: ['momentum', 'mean_reversion', 'arbitrage'],
        coordinationStrategy: 'democratic_voting',
        consensusThreshold: 0.6
      };

      const result = await ita.createMultiAgentSystem(config);

      expect(result).to.have.property('systemId');
      expect(result).to.have.property('status', 'created');
      expect(result).to.have.property('agents');
      expect(result).to.have.property('coordination');
      expect(result.agents).to.have.lengthOf(3);
    });

    it('should get autonomous agents status', () => {
      const status = ita.getAutonomousAgentsStatus();

      expect(status).to.have.property('totalAgents');
      expect(status).to.have.property('activeAgents');
      expect(status).to.have.property('agents');
      expect(Array.isArray(status.agents)).to.be.true;
    });

    it('should get multi-agent systems status', () => {
      const status = ita.getMultiAgentSystemsStatus();

      expect(status).to.have.property('totalSystems');
      expect(status).to.have.property('activeSystems');
      expect(status).to.have.property('systems');
      expect(Array.isArray(status.systems)).to.be.true;
    });
  });

  describe('Genetic Algorithm Strategy Evolution', () => {
    it('should evolve trading strategies', async () => {
      const config = {
        populationSize: 20,
        generations: 10,
        mutationRate: 0.1,
        crossoverRate: 0.7,
        fitnessFunction: 'sharpe_ratio'
      };

      const result = await ita.evolveStrategy(config);

      expect(result).to.have.property('evolutionId');
      expect(result).to.have.property('status', 'evolving');
      expect(result).to.have.property('progress');
      expect(result).to.have.property('bestStrategy');
      expect(result).to.have.property('population');
      expect(result.progress.totalGenerations).to.equal(10);
    });

    it('should get evolution status', () => {
      const status = ita.getEvolutionStatus();

      expect(status).to.have.property('totalEvolutions');
      expect(status).to.have.property('activeEvolutions');
      expect(status).to.have.property('evolutions');
      expect(Array.isArray(status.evolutions)).to.be.true;
    });
  });

  describe('Swarm Intelligence', () => {
    it('should deploy swarm intelligence for market analysis', async () => {
      const config = {
        swarmSize: 50,
        particleTypes: ['explorer', 'exploiter'],
        optimizationTarget: 'market_efficiency',
        maxIterations: 100
      };

      const result = await ita.deploySwarmIntelligence(config);

      expect(result).to.have.property('swarmId');
      expect(result).to.have.property('converged');
      expect(result).to.have.property('bestSolution');
      expect(result).to.have.property('swarmBehavior');
      expect(result.bestSolution).to.have.property('fitness');
    });

    it('should get swarm insights', () => {
      const insights = ita.getSwarmInsights();

      expect(insights).to.have.property('marketPatterns');
      expect(insights).to.have.property('emergentBehaviors');
      expect(insights).to.have.property('optimizationResults');
      expect(Array.isArray(insights.marketPatterns)).to.be.true;
    });
  });

  describe('Predictive Market Intelligence', () => {
    it('should predict market crashes', async () => {
      const config = {
        timeHorizon: '30d',
        confidence: 0.8,
        indicators: ['volatility', 'volume', 'sentiment'],
        markets: ['crypto']
      };

      const result = await ita.predictMarketCrash(config);

      expect(result).to.have.property('probability');
      expect(result).to.have.property('confidence', 0.8);
      expect(result).to.have.property('timeHorizon', '30d');
      expect(result).to.have.property('riskFactors');
      expect(result).to.have.property('recommendation');
      expect(Array.isArray(result.riskFactors)).to.be.true;
    });

    it('should detect market cycles', async () => {
      const config = {
        asset: 'BTC',
        timeframe: '1d',
        lookbackPeriod: 365
      };

      const result = await ita.detectMarketCycles(config);

      expect(result).to.have.property('current');
      expect(result).to.have.property('confidence');
      expect(result).to.have.property('duration');
      expect(result).to.have.property('nextPhase');
      expect(result).to.have.property('historicalPatterns');
      expect(['accumulation', 'markup', 'distribution', 'markdown']).to.include(result.current);
    });

    it('should integrate economic indicators', async () => {
      const config = {
        indicators: ['unemployment', 'inflation', 'gdp'],
        regions: ['US', 'EU'],
        impactWeight: 0.3
      };

      const result = await ita.integrateEconomicIndicators(config);

      expect(result).to.have.property('lastUpdate');
      expect(result).to.have.property('indicators');
      expect(result).to.have.property('overallScore');
      expect(result).to.have.property('marketImpact');
      expect(Array.isArray(result.indicators)).to.be.true;
      expect(result.indicators).to.have.lengthOf(3);
    });

    it('should analyze geopolitical event impact', async () => {
      const config = {
        eventTypes: ['elections', 'trade_wars'],
        impactRadius: 'global',
        timeWindow: '7d'
      };

      const result = await ita.analyzeGeopoliticalImpact(config);

      expect(result).to.have.property('events');
      expect(result).to.have.property('averageImpact');
      expect(result).to.have.property('riskLevel');
      expect(result).to.have.property('volatilityPrediction');
      expect(result).to.have.property('recommendations');
      expect(Array.isArray(result.events)).to.be.true;
      expect(['high', 'medium', 'low']).to.include(result.riskLevel);
    });

    it('should get market predictions', () => {
      const predictions = ita.getMarketPredictions();

      expect(predictions).to.have.property('crashPredictions');
      expect(predictions).to.have.property('cyclePredictions');
      expect(predictions).to.have.property('economicForecasts');
      expect(predictions).to.have.property('geopoliticalAnalysis');
      expect(Array.isArray(predictions.crashPredictions)).to.be.true;
    });
  });

  describe('Agent Management', () => {
    let testBotId;

    it('should create and track a bot for stopping', async () => {
      const config = {
        name: 'Bot to Stop',
        tradingPairs: ['ETH/USDT']
      };

      const result = await ita.createSelfLearningBot(config);
      testBotId = result.botId;

      expect(testBotId).to.be.a('string');
    });

    it('should stop an agent', async () => {
      if (!testBotId) {
        // Create a bot if the previous test didn't run
        const config = { name: 'Bot to Stop', tradingPairs: ['ETH/USDT'] };
        const result = await ita.createSelfLearningBot(config);
        testBotId = result.botId;
      }

      const result = await ita.stopAgent(testBotId);

      expect(result).to.have.property('success', true);
      expect(result).to.have.property('type');
      expect(['autonomous_agent', 'multi_agent_system']).to.include(result.type);
    });

    it('should throw error when stopping non-existent agent', async () => {
      try {
        await ita.stopAgent('non-existent-id');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Agent or system not found');
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should handle empty configuration for self-learning bot', async () => {
      const result = await ita.createSelfLearningBot({});

      expect(result).to.have.property('botId');
      expect(result).to.have.property('status', 'created');
      expect(result.configuration.tradingPairs).to.deep.equal(['BTC/USDT']); // default
    });

    it('should handle custom parameters for genetic evolution', async () => {
      const config = {
        populationSize: 30,
        generations: 5,
        mutationRate: 0.15,
        crossoverRate: 0.8,
        fitnessFunction: 'return_over_risk'
      };

      const result = await ita.evolveStrategy(config);

      expect(result.progress.totalGenerations).to.equal(5);
      expect(result).to.have.property('evolutionId');
    });
  });

  after(() => {
    // Clean up any resources if needed
  });
});

module.exports = {
  'Intelligent Trading Assistants': () => getIntelligentTradingAssistants()
};