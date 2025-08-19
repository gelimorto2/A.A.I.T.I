const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const { getIntelligentTradingAssistants } = require('../utils/intelligentTradingAssistants');
const logger = require('../utils/logger');

const router = express.Router();
const ita = getIntelligentTradingAssistants();

// ========================================================================
// AUTONOMOUS TRADING AGENTS ENDPOINTS
// ========================================================================

/**
 * Create a self-learning trading bot
 */
router.post('/autonomous-agents/self-learning-bot', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const config = req.body;

    const result = await ita.createSelfLearningBot(config);

    // Save to database
    db.run(
      `INSERT INTO intelligent_agents (
        id, user_id, agent_type, name, configuration, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [result.botId, userId, 'self_learning_bot', config.name || 'Unnamed Bot', JSON.stringify(result.configuration), 'created']
    );

    auditLog(req, 'CREATE_SELF_LEARNING_BOT', { botId: result.botId });

    res.json({
      success: true,
      message: 'Self-learning trading bot created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to create self-learning bot', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a multi-agent trading system
 */
router.post('/autonomous-agents/multi-agent-system', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const config = req.body;

    const result = await ita.createMultiAgentSystem(config);

    // Save to database
    db.run(
      `INSERT INTO intelligent_agents (
        id, user_id, agent_type, name, configuration, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [result.systemId, userId, 'multi_agent_system', config.name || 'Unnamed System', JSON.stringify(config), 'created']
    );

    auditLog(req, 'CREATE_MULTI_AGENT_SYSTEM', { systemId: result.systemId });

    res.json({
      success: true,
      message: 'Multi-agent trading system created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to create multi-agent system', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Evolve trading strategies using genetic algorithms
 */
router.post('/genetic-evolution/evolve-strategy', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const config = req.body;

    const result = await ita.evolveStrategy(config);

    // Save to database
    db.run(
      `INSERT INTO strategy_evolution (
        id, user_id, population_size, generations, status, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [result.evolutionId, userId, config.populationSize || 50, config.generations || 100, 'evolving']
    );

    auditLog(req, 'START_STRATEGY_EVOLUTION', { evolutionId: result.evolutionId });

    res.json({
      success: true,
      message: 'Strategy evolution initiated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to start strategy evolution', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Deploy swarm intelligence for market analysis
 */
router.post('/swarm-intelligence/analyze', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const config = req.body;

    const result = await ita.deploySwarmIntelligence(config);

    auditLog(req, 'DEPLOY_SWARM_INTELLIGENCE', { swarmId: result.swarmId });

    res.json({
      success: true,
      message: 'Swarm intelligence analysis deployed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to deploy swarm intelligence', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
// PREDICTIVE MARKET INTELLIGENCE ENDPOINTS
// ========================================================================

/**
 * Predict market crashes
 */
router.post('/predictive-intelligence/crash-prediction', authenticateToken, async (req, res) => {
  try {
    const config = req.body;
    const result = await ita.predictMarketCrash(config);

    auditLog(req, 'MARKET_CRASH_PREDICTION', { 
      probability: result.probability,
      timeHorizon: config.timeHorizon 
    });

    res.json({
      success: true,
      message: 'Market crash prediction generated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to predict market crash', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Detect bull/bear market cycles
 */
router.post('/predictive-intelligence/cycle-detection', authenticateToken, async (req, res) => {
  try {
    const config = req.body;
    const result = await ita.detectMarketCycles(config);

    auditLog(req, 'MARKET_CYCLE_DETECTION', { 
      asset: config.asset,
      currentCycle: result.current 
    });

    res.json({
      success: true,
      message: 'Market cycle analysis completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to detect market cycles', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Integrate economic indicators
 */
router.post('/predictive-intelligence/economic-indicators', authenticateToken, async (req, res) => {
  try {
    const config = req.body;
    const result = await ita.integrateEconomicIndicators(config);

    auditLog(req, 'INTEGRATE_ECONOMIC_INDICATORS', { 
      indicatorsCount: config.indicators?.length || 0
    });

    res.json({
      success: true,
      message: 'Economic indicators integrated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to integrate economic indicators', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analyze geopolitical event impact
 */
router.post('/predictive-intelligence/geopolitical-analysis', authenticateToken, async (req, res) => {
  try {
    const config = req.body;
    const result = await ita.analyzeGeopoliticalImpact(config);

    auditLog(req, 'GEOPOLITICAL_ANALYSIS', { 
      eventsAnalyzed: result.events.length,
      riskLevel: result.riskLevel 
    });

    res.json({
      success: true,
      message: 'Geopolitical impact analysis completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to analyze geopolitical impact', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
// STATUS AND MONITORING ENDPOINTS
// ========================================================================

/**
 * Get all autonomous agents status
 */
router.get('/autonomous-agents/status', authenticateToken, async (req, res) => {
  try {
    const status = ita.getAutonomousAgentsStatus();

    res.json({
      success: true,
      message: 'Autonomous agents status retrieved successfully',
      data: status
    });
  } catch (error) {
    logger.error('Failed to get autonomous agents status', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get multi-agent systems status
 */
router.get('/multi-agent-systems/status', authenticateToken, async (req, res) => {
  try {
    const status = ita.getMultiAgentSystemsStatus();

    res.json({
      success: true,
      message: 'Multi-agent systems status retrieved successfully',
      data: status
    });
  } catch (error) {
    logger.error('Failed to get multi-agent systems status', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get genetic algorithm evolution status
 */
router.get('/genetic-evolution/status', authenticateToken, async (req, res) => {
  try {
    const status = ita.getEvolutionStatus();

    res.json({
      success: true,
      message: 'Evolution status retrieved successfully',
      data: status
    });
  } catch (error) {
    logger.error('Failed to get evolution status', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get swarm intelligence insights
 */
router.get('/swarm-intelligence/insights', authenticateToken, async (req, res) => {
  try {
    const insights = ita.getSwarmInsights();

    res.json({
      success: true,
      message: 'Swarm intelligence insights retrieved successfully',
      data: insights
    });
  } catch (error) {
    logger.error('Failed to get swarm insights', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get market predictions
 */
router.get('/predictive-intelligence/predictions', authenticateToken, async (req, res) => {
  try {
    const predictions = ita.getMarketPredictions();

    res.json({
      success: true,
      message: 'Market predictions retrieved successfully',
      data: predictions
    });
  } catch (error) {
    logger.error('Failed to get market predictions', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop agent or system
 */
router.post('/agents/:agentId/stop', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const result = await ita.stopAgent(agentId);

    // Update database
    db.run(
      `UPDATE intelligent_agents SET status = 'stopped', updated_at = datetime('now') WHERE id = ?`,
      [agentId]
    );

    auditLog(req, 'STOP_AGENT', { agentId, type: result.type });

    res.json({
      success: true,
      message: `${result.type} stopped successfully`,
      data: result
    });
  } catch (error) {
    logger.error('Failed to stop agent', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's intelligent agents
 */
router.get('/agents', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    db.all(
      `SELECT * FROM intelligent_agents WHERE user_id = ? ORDER BY created_at DESC`,
      [userId],
      (err, rows) => {
        if (err) {
          logger.error('Database error getting user agents', err);
          return res.status(500).json({ error: 'Database error' });
        }

        const agents = rows.map(row => ({
          ...row,
          configuration: JSON.parse(row.configuration || '{}')
        }));

        res.json({
          success: true,
          message: 'User intelligent agents retrieved successfully',
          data: {
            total: agents.length,
            agents
          }
        });
      }
    );
  } catch (error) {
    logger.error('Failed to get user agents', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get evolution history
 */
router.get('/genetic-evolution/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    db.all(
      `SELECT * FROM strategy_evolution WHERE user_id = ? ORDER BY created_at DESC`,
      [userId],
      (err, rows) => {
        if (err) {
          logger.error('Database error getting evolution history', err);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          success: true,
          message: 'Strategy evolution history retrieved successfully',
          data: {
            total: rows.length,
            evolutions: rows
          }
        });
      }
    );
  } catch (error) {
    logger.error('Failed to get evolution history', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;