const logger = require('../utils/logger');

/**
 * Initialize Intelligent Trading Assistants database schema (TODO 5.1)
 * 
 * Creates tables for:
 * - Autonomous trading agents
 * - Multi-agent systems
 * - Strategy evolution tracking
 * - Swarm intelligence results
 * - Market predictions
 */
async function initializeIntelligentTradingAssistants(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Intelligent Agents table
      db.run(`
        CREATE TABLE IF NOT EXISTS intelligent_agents (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          agent_type TEXT NOT NULL, -- 'self_learning_bot', 'multi_agent_system'
          name TEXT NOT NULL,
          configuration TEXT, -- JSON configuration
          status TEXT DEFAULT 'created', -- 'created', 'active', 'paused', 'stopped'
          performance_metrics TEXT, -- JSON performance data
          learning_progress TEXT, -- JSON learning metrics
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Strategy Evolution table
      db.run(`
        CREATE TABLE IF NOT EXISTS strategy_evolution (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          population_size INTEGER DEFAULT 50,
          generations INTEGER DEFAULT 100,
          current_generation INTEGER DEFAULT 0,
          mutation_rate REAL DEFAULT 0.1,
          crossover_rate REAL DEFAULT 0.7,
          elitism_rate REAL DEFAULT 0.1,
          fitness_function TEXT DEFAULT 'sharpe_ratio',
          status TEXT DEFAULT 'evolving', -- 'evolving', 'completed', 'failed', 'stopped'
          best_strategy TEXT, -- JSON best strategy found
          population_stats TEXT, -- JSON population statistics
          evolution_history TEXT, -- JSON generation-by-generation results
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Swarm Intelligence Results table
      db.run(`
        CREATE TABLE IF NOT EXISTS swarm_intelligence_results (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          swarm_size INTEGER DEFAULT 100,
          optimization_target TEXT NOT NULL,
          convergence_criteria REAL DEFAULT 0.001,
          iterations_completed INTEGER DEFAULT 0,
          max_iterations INTEGER DEFAULT 1000,
          converged BOOLEAN DEFAULT FALSE,
          best_solution TEXT, -- JSON best solution found
          swarm_behavior TEXT, -- JSON swarm behavior metrics
          insights TEXT, -- JSON extracted insights
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Market Predictions table
      db.run(`
        CREATE TABLE IF NOT EXISTS market_predictions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          prediction_type TEXT NOT NULL, -- 'crash', 'cycle', 'trend', 'volatility'
          asset TEXT, -- Target asset (optional for general market predictions)
          timeframe TEXT NOT NULL, -- Prediction timeframe
          prediction_data TEXT NOT NULL, -- JSON prediction results
          confidence REAL, -- Confidence score (0-1)
          accuracy REAL, -- Accuracy after validation (0-1, null if not validated)
          status TEXT DEFAULT 'active', -- 'active', 'validated', 'expired'
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          validated_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Economic Indicators Integration table
      db.run(`
        CREATE TABLE IF NOT EXISTS economic_indicators (
          id TEXT PRIMARY KEY,
          indicator_name TEXT NOT NULL,
          region TEXT NOT NULL,
          value REAL NOT NULL,
          trend TEXT, -- 'up', 'down', 'stable'
          impact_weight REAL DEFAULT 0.3,
          market_impact TEXT, -- 'positive', 'negative', 'neutral'
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          data_source TEXT,
          UNIQUE(indicator_name, region)
        )
      `);

      // Geopolitical Events table
      db.run(`
        CREATE TABLE IF NOT EXISTS geopolitical_events (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          region TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          impact_score REAL, -- 0-1 impact score
          sentiment_score REAL, -- -1 to 1 sentiment
          volatility_prediction REAL, -- Expected volatility increase
          affected_markets TEXT, -- JSON array of affected markets
          recommendations TEXT, -- JSON array of recommendations
          event_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME
        )
      `);

      // Agent Performance Tracking table
      db.run(`
        CREATE TABLE IF NOT EXISTS agent_performance_tracking (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          tracking_date DATE NOT NULL,
          total_trades INTEGER DEFAULT 0,
          profitable_trades INTEGER DEFAULT 0,
          total_return REAL DEFAULT 0,
          sharpe_ratio REAL DEFAULT 0,
          max_drawdown REAL DEFAULT 0,
          win_rate REAL DEFAULT 0,
          avg_trade_duration REAL, -- in minutes
          risk_adjusted_return REAL DEFAULT 0,
          learning_score REAL DEFAULT 0, -- For self-learning bots
          coordination_score REAL DEFAULT 0, -- For multi-agent systems
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES intelligent_agents (id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(agent_id, tracking_date)
        )
      `);

      // Multi-Agent Communication Logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS multi_agent_communications (
          id TEXT PRIMARY KEY,
          system_id TEXT NOT NULL,
          from_agent TEXT NOT NULL,
          to_agent TEXT, -- NULL for broadcast messages
          message_type TEXT NOT NULL, -- 'proposal', 'vote', 'consensus', 'alert'
          message_content TEXT NOT NULL, -- JSON message data
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (system_id) REFERENCES intelligent_agents (id)
        )
      `, (err) => {
        if (err) {
          logger.error('Error creating Intelligent Trading Assistants tables:', err);
          reject(err);
        } else {
          logger.info('Intelligent Trading Assistants database schema initialized successfully');
          
          // Create indexes for better performance
          createIntelligentTradingAssistantsIndexes(db)
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  });
}

/**
 * Create indexes for Intelligent Trading Assistants tables
 */
async function createIntelligentTradingAssistantsIndexes(db) {
  return new Promise((resolve, reject) => {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_intelligent_agents_user_id ON intelligent_agents(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_intelligent_agents_status ON intelligent_agents(status)',
      'CREATE INDEX IF NOT EXISTS idx_intelligent_agents_type ON intelligent_agents(agent_type)',
      'CREATE INDEX IF NOT EXISTS idx_strategy_evolution_user_id ON strategy_evolution(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_strategy_evolution_status ON strategy_evolution(status)',
      'CREATE INDEX IF NOT EXISTS idx_swarm_results_user_id ON swarm_intelligence_results(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_market_predictions_user_id ON market_predictions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_market_predictions_type ON market_predictions(prediction_type)',
      'CREATE INDEX IF NOT EXISTS idx_market_predictions_asset ON market_predictions(asset)',
      'CREATE INDEX IF NOT EXISTS idx_economic_indicators_region ON economic_indicators(region)',
      'CREATE INDEX IF NOT EXISTS idx_geopolitical_events_type ON geopolitical_events(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_geopolitical_events_region ON geopolitical_events(region)',
      'CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id ON agent_performance_tracking(agent_id)',
      'CREATE INDEX IF NOT EXISTS idx_agent_performance_date ON agent_performance_tracking(tracking_date)',
      'CREATE INDEX IF NOT EXISTS idx_multi_agent_comms_system ON multi_agent_communications(system_id)',
      'CREATE INDEX IF NOT EXISTS idx_multi_agent_comms_timestamp ON multi_agent_communications(timestamp)'
    ];

    let completed = 0;
    const total = indexes.length;

    indexes.forEach((indexSql, i) => {
      db.run(indexSql, (err) => {
        if (err) {
          logger.error(`Error creating index ${i + 1}:`, err);
          reject(err);
          return;
        }
        
        completed++;
        if (completed === total) {
          logger.info('Intelligent Trading Assistants indexes created successfully');
          resolve();
        }
      });
    });
  });
}

/**
 * Insert sample economic indicators
 */
async function insertSampleEconomicIndicators(db) {
  const sampleIndicators = [
    { name: 'unemployment_rate', region: 'US', value: 3.7, trend: 'stable', impact_weight: 0.4 },
    { name: 'inflation_rate', region: 'US', value: 2.1, trend: 'up', impact_weight: 0.5 },
    { name: 'gdp_growth', region: 'US', value: 2.8, trend: 'up', impact_weight: 0.6 },
    { name: 'interest_rate', region: 'US', value: 5.25, trend: 'stable', impact_weight: 0.7 },
    { name: 'unemployment_rate', region: 'EU', value: 6.5, trend: 'down', impact_weight: 0.4 },
    { name: 'inflation_rate', region: 'EU', value: 1.8, trend: 'stable', impact_weight: 0.5 },
    { name: 'gdp_growth', region: 'EU', value: 1.2, trend: 'stable', impact_weight: 0.6 },
    { name: 'interest_rate', region: 'EU', value: 4.0, trend: 'up', impact_weight: 0.7 }
  ];

  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO economic_indicators 
      (id, indicator_name, region, value, trend, impact_weight, market_impact, data_source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let completed = 0;
    const total = sampleIndicators.length;

    sampleIndicators.forEach((indicator) => {
      const id = `${indicator.name}_${indicator.region}`;
      const marketImpact = indicator.value > 3 ? 'negative' : 'positive'; // Simple heuristic
      
      stmt.run([
        id,
        indicator.name,
        indicator.region,
        indicator.value,
        indicator.trend,
        indicator.impact_weight,
        marketImpact,
        'sample_data'
      ], (err) => {
        if (err) {
          logger.error('Error inserting sample economic indicator:', err);
          reject(err);
          return;
        }
        
        completed++;
        if (completed === total) {
          stmt.finalize();
          logger.info('Sample economic indicators inserted successfully');
          resolve();
        }
      });
    });
  });
}

module.exports = {
  initializeIntelligentTradingAssistants,
  createIntelligentTradingAssistantsIndexes,
  insertSampleEconomicIndicators
};