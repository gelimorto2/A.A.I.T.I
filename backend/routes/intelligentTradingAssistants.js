const express = require('express');
const { authenticateToken, auditLog } = require('../middleware/auth');
const { getIntelligentTradingAssistants } = require('../utils/intelligentTradingAssistants');
const logger = require('../utils/logger');
const { getCache } = require('../utils/cache');

const router = express.Router();
const cache = getCache();

// Initialize service
const intelligentTradingService = getIntelligentTradingAssistants();

/**
 * Get system status of all intelligent trading assistants
 */
router.get('/status', authenticateToken, auditLog('intelligent_trading_status'), async (req, res) => {
  try {
    const status = intelligentTradingService.getSystemStatus();
    
    logger.info('Intelligent trading assistants status requested', {
      userId: req.user.id,
      totalComponents: status.total_components
    });

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting intelligent trading assistants status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get system status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================================================
// AUTONOMOUS TRADING AGENTS ENDPOINTS
// ========================================================================

/**
 * Create a self-learning trading bot
 */
router.post('/agents/self-learning', authenticateToken, auditLog('create_self_learning_bot'), async (req, res) => {
  try {
    const config = req.body;
    
    const result = await intelligentTradingService.createSelfLearningBot(config);
    
    logger.info('Self-learning trading bot created', {
      userId: req.user.id,
      agentId: result.agentId,
      name: config.name
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating self-learning bot:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create self-learning bot',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create a multi-agent trading system
 */
router.post('/agents/multi-agent-system', authenticateToken, auditLog('create_multi_agent_system'), async (req, res) => {
  try {
    const config = req.body;
    
    const result = await intelligentTradingService.createMultiAgentSystem(config);
    
    logger.info('Multi-agent trading system created', {
      userId: req.user.id,
      systemId: result.systemId,
      name: config.name,
      agentCount: config.agentCount
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating multi-agent system:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create multi-agent system',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create a genetic algorithm for strategy evolution
 */
router.post('/agents/genetic-algorithm', authenticateToken, auditLog('create_genetic_algorithm'), async (req, res) => {
  try {
    const config = req.body;
    
    const result = await intelligentTradingService.createGeneticAlgorithm(config);
    
    logger.info('Genetic algorithm created', {
      userId: req.user.id,
      algorithmId: result.algorithmId,
      name: config.name,
      populationSize: config.populationSize
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating genetic algorithm:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create genetic algorithm',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create a swarm intelligence system
 */
router.post('/agents/swarm-intelligence', authenticateToken, auditLog('create_swarm_intelligence'), async (req, res) => {
  try {
    const config = req.body;
    
    const result = await intelligentTradingService.createSwarmIntelligence(config);
    
    logger.info('Swarm intelligence system created', {
      userId: req.user.id,
      swarmId: result.swarmId,
      name: config.name,
      particleCount: config.particleCount
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating swarm intelligence:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create swarm intelligence',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================================================
// PREDICTIVE MARKET INTELLIGENCE ENDPOINTS
// ========================================================================

/**
 * Create a market crash prediction system
 */
router.post('/intelligence/crash-predictor', authenticateToken, auditLog('create_crash_predictor'), async (req, res) => {
  try {
    const config = req.body;
    
    const result = await intelligentTradingService.createMarketCrashPredictor(config);
    
    logger.info('Market crash predictor created', {
      userId: req.user.id,
      predictorId: result.predictorId,
      name: config.name,
      markets: config.markets
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating crash predictor:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create crash predictor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create a bull/bear cycle detector
 */
router.post('/intelligence/cycle-detector', authenticateToken, auditLog('create_cycle_detector'), async (req, res) => {
  try {
    const config = req.body;
    
    const result = await intelligentTradingService.createCycleDetector(config);
    
    logger.info('Cycle detector created', {
      userId: req.user.id,
      detectorId: result.detectorId,
      name: config.name,
      markets: config.markets
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating cycle detector:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create cycle detector',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create an economic indicator integration system
 */
router.post('/intelligence/economic-integration', authenticateToken, auditLog('create_economic_integration'), async (req, res) => {
  try {
    const config = req.body;
    
    const result = await intelligentTradingService.createEconomicIntegration(config);
    
    logger.info('Economic integration created', {
      userId: req.user.id,
      integrationId: result.integrationId,
      name: config.name,
      dataSources: config.dataSources
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating economic integration:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create economic integration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create a geopolitical event analyzer
 */
router.post('/intelligence/geopolitical-analyzer', authenticateToken, auditLog('create_geopolitical_analyzer'), async (req, res) => {
  try {
    const config = req.body;
    
    const result = await intelligentTradingService.createGeopoliticalAnalyzer(config);
    
    logger.info('Geopolitical analyzer created', {
      userId: req.user.id,
      analyzerId: result.analyzerId,
      name: config.name,
      regions: config.regions
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating geopolitical analyzer:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create geopolitical analyzer',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================================================
// DEMO ENDPOINTS
// ========================================================================

/**
 * Create a complete demo setup with all components
 */
router.post('/demo/setup', authenticateToken, auditLog('create_demo_setup'), async (req, res) => {
  try {
    const results = {};
    
    // Create a self-learning bot
    results.selfLearningBot = await intelligentTradingService.createSelfLearningBot({
      name: 'Demo Self-Learning Bot',
      tradingPairs: ['BTC/USDT', 'ETH/USDT'],
      initialCapital: 50000,
      strategies: ['momentum', 'meanReversion', 'trendFollowing']
    });
    
    // Create a multi-agent system
    results.multiAgentSystem = await intelligentTradingService.createMultiAgentSystem({
      name: 'Demo Multi-Agent System',
      agentCount: 3,
      specializations: ['technical', 'fundamental', 'sentiment']
    });
    
    // Create genetic algorithm
    results.geneticAlgorithm = await intelligentTradingService.createGeneticAlgorithm({
      name: 'Demo Genetic Algorithm',
      populationSize: 20,
      generations: 50
    });
    
    // Create swarm intelligence
    results.swarmIntelligence = await intelligentTradingService.createSwarmIntelligence({
      name: 'Demo Swarm Intelligence',
      particleCount: 15,
      dimensions: 8
    });
    
    // Create market crash predictor
    results.crashPredictor = await intelligentTradingService.createMarketCrashPredictor({
      name: 'Demo Crash Predictor',
      markets: ['BTC', 'ETH'],
      predictionHorizon: 12
    });
    
    // Create cycle detector
    results.cycleDetector = await intelligentTradingService.createCycleDetector({
      name: 'Demo Cycle Detector',
      markets: ['BTC', 'ETH']
    });
    
    logger.info('Demo setup created successfully', {
      userId: req.user.id,
      components: Object.keys(results).length
    });

    res.json({
      success: true,
      message: 'Demo setup created successfully',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating demo setup:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create demo setup',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get comprehensive feature showcase
 */
router.get('/demo/showcase', async (req, res) => {
  try {
    const showcase = {
      autonomous_agents: {
        description: 'Self-learning trading bots with neural networks and Q-learning',
        features: [
          'Self-learning trading bots',
          'Multi-agent trading systems',
          'Genetic algorithm strategy evolution',
          'Swarm intelligence for market analysis'
        ],
        capabilities: [
          'Neural network decision making',
          'Q-learning for strategy optimization',
          'Agent coordination and communication',
          'Genetic algorithm evolution',
          'Particle swarm optimization'
        ]
      },
      predictive_intelligence: {
        description: 'Advanced market prediction and intelligence systems',
        features: [
          'Market crash prediction systems',
          'Bull/bear market cycle detection',
          'Economic indicator integration',
          'Geopolitical event impact analysis'
        ],
        capabilities: [
          'Ensemble prediction models',
          'Real-time risk assessment',
          'Economic data integration',
          'Event impact analysis',
          'Multi-timeframe cycle detection'
        ]
      },
      system_features: {
        performance_monitoring: 'Integrated with performance monitoring system',
        github_integration: 'Automatic issue reporting for critical errors',
        api_endpoints: 'RESTful API for all components',
        real_time_updates: 'WebSocket support for real-time data',
        scalability: 'Designed for high-frequency trading environments'
      },
      roadmap_status: {
        section: '5.1 Intelligent Trading Assistants',
        status: 'IMPLEMENTED',
        features_completed: [
          'Autonomous Trading Agents',
          'Multi-Agent Trading Systems',
          'Genetic Algorithm Strategy Evolution',
          'Swarm Intelligence for Market Analysis',
          'Market Crash Prediction Systems',
          'Bull/Bear Market Cycle Detection',
          'Economic Indicator Integration',
          'Geopolitical Event Impact Analysis'
        ]
      }
    };

    res.json({
      success: true,
      showcase,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting showcase:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get showcase',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;