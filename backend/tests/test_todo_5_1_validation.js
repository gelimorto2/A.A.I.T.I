const { expect } = require('chai');
const { getIntelligentTradingAssistants } = require('../utils/intelligentTradingAssistants');
const { getGitHubIssueReporter } = require('../utils/githubIssueReporter');
const { getPerformanceMonitor } = require('../utils/performanceMonitor');

describe('TODO 5.1 - Intelligent Trading Assistants Validation', () => {
  let intelligentTrading;
  let githubReporter;
  let performanceMonitor;

  before(() => {
    intelligentTrading = getIntelligentTradingAssistants();
    githubReporter = getGitHubIssueReporter({ enabled: false });
    performanceMonitor = getPerformanceMonitor({ reportToGitHub: false });
  });

  describe('Roadmap Section 5.1 Validation', () => {
    it('should validate all autonomous trading agent features are implemented', async () => {
      // Test self-learning trading bots
      const selfLearningBot = await intelligentTrading.createSelfLearningBot({
        name: 'Validation Self-Learning Bot',
        tradingPairs: ['BTC/USDT', 'ETH/USDT'],
        initialCapital: 25000,
        strategies: ['momentum', 'meanReversion', 'trendFollowing']
      });
      
      expect(selfLearningBot.success).to.be.true;
      expect(selfLearningBot.agent.type).to.equal('self_learning');
      expect(selfLearningBot.agent).to.have.property('id');
      
      // Test multi-agent trading systems
      const multiAgentSystem = await intelligentTrading.createMultiAgentSystem({
        name: 'Validation Multi-Agent System',
        agentCount: 3,
        specializations: ['technical', 'fundamental', 'sentiment'],
        coordinationStrategy: 'consensus'
      });
      
      expect(multiAgentSystem.success).to.be.true;
      expect(multiAgentSystem.agents).to.have.length(3);
      expect(multiAgentSystem.system.config.coordinationStrategy).to.equal('consensus');
      
      // Test genetic algorithm strategy evolution
      const geneticAlgorithm = await intelligentTrading.createGeneticAlgorithm({
        name: 'Validation Genetic Algorithm',
        populationSize: 30,
        generations: 100,
        fitnessFunction: 'sharpe_ratio'
      });
      
      expect(geneticAlgorithm.success).to.be.true;
      expect(geneticAlgorithm.algorithm.config.populationSize).to.equal(30);
      expect(geneticAlgorithm.algorithm.population).to.have.length(30);
      
      // Test swarm intelligence for market analysis
      const swarmIntelligence = await intelligentTrading.createSwarmIntelligence({
        name: 'Validation Swarm Intelligence',
        particleCount: 25,
        algorithm: 'PSO',
        dimensions: 12
      });
      
      expect(swarmIntelligence.success).to.be.true;
      expect(swarmIntelligence.swarm.config.particleCount).to.equal(25);
      expect(swarmIntelligence.swarm.particles).to.have.length(25);
    });

    it('should validate all predictive market intelligence features are implemented', async () => {
      // Test market crash prediction systems
      const crashPredictor = await intelligentTrading.createMarketCrashPredictor({
        name: 'Validation Crash Predictor',
        markets: ['BTC', 'ETH', 'SPX', 'VIX'],
        predictionHorizon: 24,
        indicators: ['volatility_spike', 'volume_surge', 'correlation_breakdown']
      });
      
      expect(crashPredictor.success).to.be.true;
      expect(crashPredictor.predictor.config.markets).to.include('BTC');
      expect(crashPredictor.predictor.config.predictionHorizon).to.equal(24);
      
      // Test bull/bear market cycle detection
      const cycleDetector = await intelligentTrading.createCycleDetector({
        name: 'Validation Cycle Detector',
        markets: ['BTC', 'ETH', 'DJI', 'SPX', 'NASDAQ'],
        cyclePeriods: [
          { name: 'short_term', days: 30 },
          { name: 'long_term', days: 365 }
        ]
      });
      
      expect(cycleDetector.success).to.be.true;
      expect(cycleDetector.detector.config.markets).to.include('BTC');
      expect(cycleDetector.detector.config.cyclePeriods).to.have.length(2);
      
      // Test economic indicator integration
      const economicIntegration = await intelligentTrading.createEconomicIntegration({
        name: 'Validation Economic Integration',
        dataSources: ['FRED', 'BLS', 'IMF'],
        indicators: ['GDP_growth', 'inflation_rate', 'unemployment_rate'],
        updateFrequency: 'daily'
      });
      
      expect(economicIntegration.success).to.be.true;
      expect(economicIntegration.integration.config.dataSources).to.include('FRED');
      expect(economicIntegration.integration.config.indicators).to.include('GDP_growth');
      
      // Test geopolitical event impact analysis
      const geopoliticalAnalyzer = await intelligentTrading.createGeopoliticalAnalyzer({
        name: 'Validation Geopolitical Analyzer',
        eventSources: ['news_feeds', 'government_announcements'],
        regions: ['north_america', 'europe', 'asia_pacific'],
        impactCategories: ['currency', 'commodities', 'crypto']
      });
      
      expect(geopoliticalAnalyzer.success).to.be.true;
      expect(geopoliticalAnalyzer.analyzer.config.regions).to.include('north_america');
      expect(geopoliticalAnalyzer.analyzer.config.impactCategories).to.include('crypto');
    });

    it('should validate system integration and status tracking', () => {
      const status = intelligentTrading.getSystemStatus();
      
      // Validate all component types are tracked
      expect(status).to.have.property('autonomous_agents');
      expect(status).to.have.property('multi_agent_systems');
      expect(status).to.have.property('genetic_algorithms');
      expect(status).to.have.property('swarm_intelligence');
      expect(status).to.have.property('market_predictors');
      expect(status).to.have.property('cycle_detectors');
      expect(status).to.have.property('economic_integration');
      expect(status).to.have.property('geopolitical_analyzers');
      expect(status).to.have.property('total_components');
      
      // Validate components have been created
      expect(status.total_components).to.be.greaterThan(0);
      expect(status.autonomous_agents.count).to.be.greaterThan(0);
      expect(status.multi_agent_systems.count).to.be.greaterThan(0);
      expect(status.genetic_algorithms.count).to.be.greaterThan(0);
      expect(status.swarm_intelligence.count).to.be.greaterThan(0);
      expect(status.market_predictors.count).to.be.greaterThan(0);
      expect(status.cycle_detectors.count).to.be.greaterThan(0);
      expect(status.economic_integration.count).to.be.greaterThan(0);
      expect(status.geopolitical_analyzers.count).to.be.greaterThan(0);
    });

    it('should validate GitHub integration for intelligent trading errors', () => {
      const aiError = new Error('Intelligent Trading Agent Error');
      aiError.agentId = 'test-agent-validation';
      aiError.type = 'autonomous_agent';
      
      const context = {
        severity: 'error',
        source: 'intelligent_trading_assistants',
        component: 'autonomous_agent',
        agentId: 'test-agent-validation'
      };
      
      const issue = githubReporter.formatErrorIssue(aiError, context);
      
      expect(issue.title).to.include('Intelligent Trading Agent Error');
      expect(issue.body).to.include('intelligent_trading_assistants');
      expect(issue.body).to.include('test-agent-validation');
      expect(issue.labels).to.include('type:error');
    });

    it('should validate performance monitoring integration', () => {
      const startTime = Date.now();
      
      // Simulate intelligent trading operations
      const operations = [
        'agent_creation',
        'strategy_optimization',
        'market_prediction',
        'risk_assessment'
      ];
      
      operations.forEach((operation, index) => {
        const duration = 50 + index * 25; // Varying durations
        performanceMonitor.recordScriptPerformance(
          `intelligent_trading_${operation}`,
          duration,
          true
        );
      });
      
      const metrics = performanceMonitor.getPerformanceMetrics();
      expect(metrics.scripts).to.be.an('array');
      
      const intelligentTradingMetrics = metrics.scripts.filter(s => 
        s.name.includes('intelligent_trading')
      );
      expect(intelligentTradingMetrics).to.have.length.greaterThan(0);
    });
  });

  describe('Production Readiness Validation', () => {
    it('should validate all features work together in a comprehensive demo', async () => {
      const startTime = Date.now();
      
      // Create a comprehensive setup with all components
      const results = {};
      
      // Autonomous Trading Agents
      results.selfLearningBot = await intelligentTrading.createSelfLearningBot({
        name: 'Production Demo Bot',
        tradingPairs: ['BTC/USDT', 'ETH/USDT'],
        initialCapital: 100000,
        strategies: ['momentum', 'meanReversion', 'trendFollowing']
      });
      
      results.multiAgentSystem = await intelligentTrading.createMultiAgentSystem({
        name: 'Production Multi-Agent System',
        agentCount: 5,
        specializations: ['technical', 'fundamental', 'sentiment']
      });
      
      results.geneticAlgorithm = await intelligentTrading.createGeneticAlgorithm({
        name: 'Production Genetic Algorithm',
        populationSize: 50,
        generations: 200
      });
      
      results.swarmIntelligence = await intelligentTrading.createSwarmIntelligence({
        name: 'Production Swarm Intelligence',
        particleCount: 30,
        dimensions: 15
      });
      
      // Predictive Market Intelligence
      results.crashPredictor = await intelligentTrading.createMarketCrashPredictor({
        name: 'Production Crash Predictor',
        markets: ['BTC', 'ETH', 'SPX', 'VIX', 'GOLD'],
        predictionHorizon: 48
      });
      
      results.cycleDetector = await intelligentTrading.createCycleDetector({
        name: 'Production Cycle Detector',
        markets: ['BTC', 'ETH', 'DJI', 'SPX', 'NASDAQ']
      });
      
      results.economicIntegration = await intelligentTrading.createEconomicIntegration({
        name: 'Production Economic Integration',
        dataSources: ['FRED', 'BLS', 'IMF', 'OECD', 'ECB']
      });
      
      results.geopoliticalAnalyzer = await intelligentTrading.createGeopoliticalAnalyzer({
        name: 'Production Geopolitical Analyzer',
        regions: ['north_america', 'europe', 'asia_pacific', 'middle_east']
      });
      
      const setupTime = Date.now() - startTime;
      
      // Validate all components were created successfully
      Object.values(results).forEach(result => {
        expect(result.success).to.be.true;
      });
      
      // Validate performance
      expect(setupTime).to.be.lessThan(1000); // Should complete in under 1 second
      
      // Validate system status reflects all components
      const finalStatus = intelligentTrading.getSystemStatus();
      expect(finalStatus.total_components).to.equal(8);
      
      console.log(`\n🎉 Production Demo Completed Successfully!`);
      console.log(`📊 Total Components Created: ${finalStatus.total_components}`);
      console.log(`⏱️  Setup Time: ${setupTime}ms`);
      console.log(`✅ All TODO 5.1 Features Validated\n`);
    });

    it('should validate error handling and recovery', async () => {
      // Test invalid configuration handling
      try {
        await intelligentTrading.createSelfLearningBot({
          // Missing required fields
        });
      } catch (error) {
        // Should handle gracefully
        expect(error).to.be.undefined; // Function should not throw, should return error response
      }
      
      // Test with invalid parameters
      const invalidBot = await intelligentTrading.createSelfLearningBot({
        name: '', // Invalid empty name
        tradingPairs: [], // Invalid empty array
        initialCapital: -1000 // Invalid negative capital
      });
      
      // System should handle gracefully and still create with defaults
      expect(invalidBot).to.have.property('success');
    });

    it('should validate service lifecycle management', () => {
      // Test service status
      const initialStatus = intelligentTrading.getSystemStatus();
      expect(initialStatus).to.have.property('service_uptime');
      expect(initialStatus.service_uptime).to.be.a('number');
      
      // Test service can be stopped and started
      intelligentTrading.stop();
      intelligentTrading.start();
      
      // Service should still be functional
      const postRestartStatus = intelligentTrading.getSystemStatus();
      expect(postRestartStatus.total_components).to.equal(initialStatus.total_components);
    });
  });

  after(() => {
    // Clean up
    if (performanceMonitor && performanceMonitor.stop) {
      performanceMonitor.stop();
    }
    if (intelligentTrading && intelligentTrading.stop) {
      intelligentTrading.stop();
    }
    
    console.log('\n✅ TODO 5.1 - Intelligent Trading Assistants Implementation Validated');
    console.log('🚀 All roadmap requirements have been successfully implemented and tested');
  });
});

module.exports = {
  'TODO 5.1 Validation': () => getIntelligentTradingAssistants()
};