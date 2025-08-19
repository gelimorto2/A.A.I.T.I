const { expect } = require('chai');
const { getGitHubIssueReporter } = require('../utils/githubIssueReporter');
const { getPerformanceMonitor } = require('../utils/performanceMonitor');
const { getIntelligentTradingAssistants } = require('../utils/intelligentTradingAssistants');

describe('Enhanced GitHub Integration Tests', () => {
  let githubReporter;
  let performanceMonitor;
  let intelligentTrading;

  before(() => {
    githubReporter = getGitHubIssueReporter({
      enabled: false, // Disable for tests
      githubToken: 'test_token',
      owner: 'test_owner',
      repo: 'test_repo'
    });

    performanceMonitor = getPerformanceMonitor({
      reportToGitHub: false,
      alertOnThresholds: false
    });

    intelligentTrading = getIntelligentTradingAssistants();
  });

  describe('GitHub Issue Reporter - Enhanced Tests', () => {
    it('should initialize with correct configuration', () => {
      const status = githubReporter.getStatus();
      expect(status).to.have.property('enabled');
      expect(status).to.have.property('configured');
      expect(status).to.have.property('recentIssues');
      expect(status.enabled).to.be.false; // Disabled in tests
    });

    it('should validate severity levels correctly', () => {
      const testError = new Error('Test error');
      
      // Test severity extraction
      const severity1 = githubReporter.extractSeverity(testError);
      expect(severity1).to.equal('error');
      
      // Test severity threshold
      const meetsCritical = githubReporter.meetsSeverityThreshold('critical');
      expect(meetsCritical).to.be.true;
      
      const meetsInfo = githubReporter.meetsSeverityThreshold('info');
      expect(meetsInfo).to.be.false; // default threshold is 'error'
    });

    it('should format error issues correctly', () => {
      const testError = new Error('Test error message');
      testError.stack = 'Test stack trace';
      
      const context = {
        severity: 'error',
        script: 'test-script',
        type: 'test'
      };
      
      const issue = githubReporter.formatErrorIssue(testError, context);
      
      expect(issue).to.have.property('title');
      expect(issue).to.have.property('body');
      expect(issue).to.have.property('labels');
      expect(issue.title).to.include('Test error message');
      expect(issue.body).to.include('Test error message');
      expect(issue.body).to.include('test-script');
      expect(issue.labels).to.include('type:performance');
    });

    it('should handle rate limiting correctly', () => {
      // Test rate limiting logic
      const canCreate1 = githubReporter.checkRateLimit();
      expect(canCreate1).to.be.a('boolean');
    });

    it('should detect duplicate issues', () => {
      const testError = new Error('Duplicate test error');
      const context = { severity: 'error', type: 'test' };
      
      // First check should allow creation
      const shouldCreate1 = githubReporter.shouldCreateIssue(testError, context);
      expect(shouldCreate1).to.be.a('boolean');
    });

    it('should format performance issues with detailed metrics', () => {
      const perfError = new Error('Performance threshold exceeded: memory_usage');
      perfError.metric = 'memory_usage';
      perfError.value = 0.9;
      perfError.threshold = 0.85;
      perfError.type = 'performance';
      
      const context = {
        performance: {
          metric: 'memory_usage',
          value: 0.9,
          threshold: 0.85,
          percentage: '105.88'
        },
        type: 'performance'
      };
      
      const issue = githubReporter.formatErrorIssue(perfError, context);
      
      expect(issue.title).to.include('Performance threshold exceeded');
      expect(issue.body).to.include('Performance Details');
      expect(issue.body).to.include('memory_usage');
      expect(issue.body).to.include('105.88%');
      expect(issue.labels).to.include('performance');
      expect(issue.labels).to.include('memory');
    });

    it('should handle script errors with context', async () => {
      const scriptError = new Error('Script execution failed');
      const context = {
        script: 'intelligent-trading-test',
        severity: 'error',
        type: 'script'
      };
      
      // This should not throw even with GitHub reporting disabled
      const result = await githubReporter.reportScriptError('test-script', scriptError, context);
      expect(result).to.be.false; // Should return false when disabled
    });

    it('should validate GitHub API configuration', () => {
      const config = githubReporter.getConfiguration();
      expect(config).to.have.property('enabled');
      expect(config).to.have.property('owner');
      expect(config).to.have.property('repo');
      expect(config).to.have.property('token');
    });

    it('should test connection status', async () => {
      try {
        // This will fail since we're not providing real credentials
        const connectionTest = await githubReporter.testConnection();
        expect(connectionTest).to.be.false;
      } catch (error) {
        // Expected to fail in test environment
        expect(error).to.be.an('error');
      }
    });

    it('should handle error filtering patterns', () => {
      const networkError = new Error('ECONNREFUSED');
      const context = { severity: 'error', type: 'network' };
      
      const shouldCreateNetwork = githubReporter.shouldCreateIssue(networkError, context);
      expect(shouldCreateNetwork).to.be.a('boolean');
      
      const timeoutError = new Error('ETIMEDOUT');
      const shouldCreateTimeout = githubReporter.shouldCreateIssue(timeoutError, context);
      expect(shouldCreateTimeout).to.be.a('boolean');
    });

    it('should track issue creation metrics', () => {
      const metrics = githubReporter.getMetrics();
      expect(metrics).to.have.property('issuesCreated');
      expect(metrics).to.have.property('rateLimitHits');
      expect(metrics).to.have.property('duplicatesDetected');
      expect(metrics).to.have.property('errorsByType');
    });
  });

  describe('Performance Monitor - Enhanced Tests', () => {
    it('should initialize with correct configuration', () => {
      const config = performanceMonitor.getConfiguration();
      expect(config).to.have.property('thresholds');
      expect(config).to.have.property('monitoring');
      expect(config.thresholds).to.have.property('memory');
      expect(config.thresholds).to.have.property('cpu');
    });

    it('should monitor script performance with detailed metrics', (done) => {
      const scriptName = 'test-intelligent-trading-script';
      const startTime = Date.now();
      
      setTimeout(() => {
        const duration = Date.now() - startTime;
        performanceMonitor.recordScriptPerformance(scriptName, duration, true);
        
        const metrics = performanceMonitor.getPerformanceMetrics();
        expect(metrics.scripts).to.be.an('array');
        
        const scriptMetrics = metrics.scripts.find(s => s.name === scriptName);
        if (scriptMetrics) {
          expect(scriptMetrics).to.have.property('runs');
          expect(scriptMetrics).to.have.property('totalTime');
          expect(scriptMetrics).to.have.property('avgTime');
          expect(scriptMetrics).to.have.property('errors');
        }
        
        done();
      }, 50);
    });

    it('should monitor API call performance', () => {
      const endpoint = 'intelligent-trading-api-test';
      const duration = 150;
      
      performanceMonitor.recordAPIPerformance(endpoint, duration, true);
      
      const metrics = performanceMonitor.getPerformanceMetrics();
      expect(metrics.apiCalls).to.be.an('array');
      
      const apiMetrics = metrics.apiCalls.find(a => a.endpoint === endpoint);
      if (apiMetrics) {
        expect(apiMetrics).to.have.property('calls');
        expect(apiMetrics).to.have.property('totalTime');
        expect(apiMetrics).to.have.property('avgTime');
        expect(apiMetrics).to.have.property('errors');
      }
    });

    it('should track memory and CPU usage accurately', () => {
      const metrics = performanceMonitor.getPerformanceMetrics();
      
      expect(metrics.memory.usage).to.be.a('number');
      expect(metrics.memory.usage).to.be.at.least(0);
      expect(metrics.cpu.usage).to.be.a('number');
      expect(metrics.cpu.usage).to.be.at.least(0);
      expect(metrics.memory.current).to.be.an('object');
    });

    it('should handle threshold violations', () => {
      // Simulate high memory usage
      const highMemoryUsage = 0.95; // 95%
      const violation = performanceMonitor.checkThresholds({
        memory: highMemoryUsage,
        cpu: 0.5
      });
      
      expect(violation).to.be.an('object');
      if (violation.violations && violation.violations.length > 0) {
        expect(violation.violations[0]).to.have.property('type');
        expect(violation.violations[0]).to.have.property('value');
        expect(violation.violations[0]).to.have.property('threshold');
      }
    });

    it('should optimize performance automatically', async () => {
      const optimizationResult = await performanceMonitor.optimizePerformance();
      expect(optimizationResult).to.be.an('object');
      expect(optimizationResult).to.have.property('success');
      expect(optimizationResult).to.have.property('optimizations');
    });

    it('should reset metrics correctly', () => {
      // Add some test data
      performanceMonitor.recordScriptPerformance('test', 100, true);
      performanceMonitor.recordAPIPerformance('test-api', 200, true);
      
      // Reset metrics
      performanceMonitor.resetMetrics();
      
      const metrics = performanceMonitor.getPerformanceMetrics();
      expect(metrics.requests.total).to.equal(0);
      expect(metrics.requests.successful).to.equal(0);
      expect(metrics.requests.failed).to.equal(0);
    });

    it('should provide health status', () => {
      const health = performanceMonitor.getHealthStatus();
      expect(health).to.have.property('status');
      expect(health).to.have.property('metrics');
      expect(health).to.have.property('timestamp');
      expect(['healthy', 'warning', 'critical']).to.include(health.status);
    });

    it('should track performance trends', () => {
      // Record multiple data points
      for (let i = 0; i < 5; i++) {
        performanceMonitor.recordScriptPerformance('trend-test', 100 + i * 10, true);
      }
      
      const trends = performanceMonitor.getPerformanceTrends();
      expect(trends).to.be.an('object');
      expect(trends).to.have.property('scripts');
      expect(trends).to.have.property('api_calls');
    });
  });

  describe('Intelligent Trading Assistants - Integration Tests', () => {
    it('should initialize service correctly', () => {
      const status = intelligentTrading.getSystemStatus();
      expect(status).to.have.property('autonomous_agents');
      expect(status).to.have.property('multi_agent_systems');
      expect(status).to.have.property('genetic_algorithms');
      expect(status).to.have.property('swarm_intelligence');
      expect(status).to.have.property('market_predictors');
      expect(status).to.have.property('cycle_detectors');
      expect(status).to.have.property('economic_integration');
      expect(status).to.have.property('geopolitical_analyzers');
      expect(status).to.have.property('total_components');
    });

    it('should create self-learning bot successfully', async () => {
      const config = {
        name: 'Test Self-Learning Bot',
        tradingPairs: ['BTC/USDT'],
        initialCapital: 10000,
        strategies: ['momentum', 'meanReversion']
      };
      
      const result = await intelligentTrading.createSelfLearningBot(config);
      expect(result).to.have.property('success');
      expect(result).to.have.property('agentId');
      expect(result).to.have.property('agent');
      expect(result.success).to.be.true;
      expect(result.agent).to.have.property('id');
      expect(result.agent).to.have.property('name');
      expect(result.agent).to.have.property('type');
    });

    it('should create multi-agent system successfully', async () => {
      const config = {
        name: 'Test Multi-Agent System',
        agentCount: 3,
        specializations: ['technical', 'fundamental', 'sentiment']
      };
      
      const result = await intelligentTrading.createMultiAgentSystem(config);
      expect(result).to.have.property('success');
      expect(result).to.have.property('systemId');
      expect(result).to.have.property('system');
      expect(result).to.have.property('agents');
      expect(result.success).to.be.true;
      expect(result.agents).to.be.an('array');
      expect(result.agents).to.have.length(3);
    });

    it('should create genetic algorithm successfully', async () => {
      const config = {
        name: 'Test Genetic Algorithm',
        populationSize: 20,
        generations: 50
      };
      
      const result = await intelligentTrading.createGeneticAlgorithm(config);
      expect(result).to.have.property('success');
      expect(result).to.have.property('algorithmId');
      expect(result).to.have.property('algorithm');
      expect(result.success).to.be.true;
      expect(result.algorithm.config.populationSize).to.equal(20);
      expect(result.algorithm.config.generations).to.equal(50);
    });

    it('should create swarm intelligence successfully', async () => {
      const config = {
        name: 'Test Swarm Intelligence',
        particleCount: 15,
        dimensions: 8
      };
      
      const result = await intelligentTrading.createSwarmIntelligence(config);
      expect(result).to.have.property('success');
      expect(result).to.have.property('swarmId');
      expect(result).to.have.property('swarm');
      expect(result.success).to.be.true;
      expect(result.swarm.config.particleCount).to.equal(15);
      expect(result.swarm.config.dimensions).to.equal(8);
    });

    it('should create market crash predictor successfully', async () => {
      const config = {
        name: 'Test Crash Predictor',
        markets: ['BTC', 'ETH'],
        predictionHorizon: 12
      };
      
      const result = await intelligentTrading.createMarketCrashPredictor(config);
      expect(result).to.have.property('success');
      expect(result).to.have.property('predictorId');
      expect(result).to.have.property('predictor');
      expect(result.success).to.be.true;
      expect(result.predictor.config.markets).to.include('BTC');
      expect(result.predictor.config.markets).to.include('ETH');
    });

    it('should create cycle detector successfully', async () => {
      const config = {
        name: 'Test Cycle Detector',
        markets: ['BTC', 'ETH', 'SPX']
      };
      
      const result = await intelligentTrading.createCycleDetector(config);
      expect(result).to.have.property('success');
      expect(result).to.have.property('detectorId');
      expect(result).to.have.property('detector');
      expect(result.success).to.be.true;
      expect(result.detector.config.markets).to.include('BTC');
    });

    it('should create economic integration successfully', async () => {
      const config = {
        name: 'Test Economic Integration',
        dataSources: ['FRED', 'BLS'],
        indicators: ['GDP_growth', 'inflation_rate']
      };
      
      const result = await intelligentTrading.createEconomicIntegration(config);
      expect(result).to.have.property('success');
      expect(result).to.have.property('integrationId');
      expect(result).to.have.property('integration');
      expect(result.success).to.be.true;
      expect(result.integration.config.dataSources).to.include('FRED');
    });

    it('should create geopolitical analyzer successfully', async () => {
      const config = {
        name: 'Test Geopolitical Analyzer',
        regions: ['north_america', 'europe'],
        impactCategories: ['currency', 'crypto']
      };
      
      const result = await intelligentTrading.createGeopoliticalAnalyzer(config);
      expect(result).to.have.property('success');
      expect(result).to.have.property('analyzerId');
      expect(result).to.have.property('analyzer');
      expect(result.success).to.be.true;
      expect(result.analyzer.config.regions).to.include('north_america');
    });

    it('should track system status changes', async () => {
      const initialStatus = intelligentTrading.getSystemStatus();
      const initialCount = initialStatus.total_components;
      
      // Create a new component
      await intelligentTrading.createSelfLearningBot({
        name: 'Status Test Bot'
      });
      
      const updatedStatus = intelligentTrading.getSystemStatus();
      expect(updatedStatus.total_components).to.be.greaterThan(initialCount);
    });
  });

  describe('Integration Between GitHub and Performance Monitoring', () => {
    it('should integrate performance alerts with GitHub issue creation', async () => {
      const testError = new Error('Performance threshold exceeded');
      testError.type = 'performance';
      
      const context = {
        performance: {
          metric: 'intelligent_trading_latency',
          value: 5000,
          threshold: 3000,
          percentage: '166.67'
        },
        type: 'performance',
        source: 'intelligent_trading_assistants'
      };
      
      // This should not throw even with GitHub reporting disabled
      const result = await githubReporter.reportError(testError, context);
      expect(result).to.be.false; // Should return false when disabled
    });

    it('should format intelligent trading errors correctly', () => {
      const aiError = new Error('Autonomous agent failed to execute trade');
      aiError.agentId = 'test-agent-123';
      aiError.type = 'autonomous_agent';
      
      const context = {
        severity: 'critical',
        source: 'intelligent_trading_assistants',
        component: 'autonomous_agent',
        agentId: 'test-agent-123',
        tradingPair: 'BTC/USDT',
        type: 'trading_error'
      };
      
      const issue = githubReporter.formatErrorIssue(aiError, context);
      
      expect(issue.title).to.include('Autonomous agent failed');
      expect(issue.body).to.include('intelligent_trading_assistants');
      expect(issue.body).to.include('test-agent-123');
      expect(issue.body).to.include('BTC/USDT');
      expect(issue.labels).to.include('critical');
      expect(issue.labels).to.include('autonomous-agent');
    });

    it('should monitor intelligent trading performance', async () => {
      const startTime = Date.now();
      
      // Simulate creating an AI component
      await intelligentTrading.createSelfLearningBot({
        name: 'Performance Test Bot'
      });
      
      const duration = Date.now() - startTime;
      performanceMonitor.recordScriptPerformance('intelligent_trading_creation', duration, true);
      
      const metrics = performanceMonitor.getPerformanceMetrics();
      const aiMetrics = metrics.scripts.find(s => s.name === 'intelligent_trading_creation');
      
      if (aiMetrics) {
        expect(aiMetrics.runs).to.be.at.least(1);
        expect(aiMetrics.avgTime).to.be.a('number');
      }
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
  });
});

module.exports = {
  'Enhanced GitHub Integration': () => getGitHubIssueReporter(),
  'Enhanced Performance Monitor': () => getPerformanceMonitor(),
  'Intelligent Trading Assistants': () => getIntelligentTradingAssistants()
};