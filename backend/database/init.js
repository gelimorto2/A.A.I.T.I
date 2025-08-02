const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { getCredentials } = require('../utils/credentials');

// Get database path from configuration
const getDbPath = () => {
  const credentials = getCredentials();
  return credentials?.system?.dbPath || process.env.DB_PATH || './database/aaiti.sqlite';
};

let db = null;

// Initialize database connection
const initializeDbConnection = () => {
  if (db) return db;
  
  const DB_PATH = getDbPath();
  
  // Ensure database directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      logger.error('Error opening database:', err);
    } else {
      logger.info('Connected to SQLite database');
    }
  });
  
  return db;
};

const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    const database = initializeDbConnection();
    
    database.serialize(() => {
      // Users table
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'trader',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          is_active BOOLEAN DEFAULT 1
        )
      `);

      // Trading bots table
      database.run(`
        CREATE TABLE IF NOT EXISTS bots (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          user_id TEXT NOT NULL,
          strategy_type TEXT NOT NULL,
          trading_mode TEXT DEFAULT 'paper',
          status TEXT DEFAULT 'stopped',
          config TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Bot metrics table for health monitoring
      database.run(`
        CREATE TABLE IF NOT EXISTS bot_metrics (
          id TEXT PRIMARY KEY,
          bot_id TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          health_score REAL,
          pnl REAL,
          total_trades INTEGER,
          win_rate REAL,
          sharpe_ratio REAL,
          max_drawdown REAL,
          execution_latency REAL,
          prediction_accuracy REAL,
          risk_score REAL,
          FOREIGN KEY (bot_id) REFERENCES bots (id)
        )
      `);

      // Trading signals table
      database.run(`
        CREATE TABLE IF NOT EXISTS trading_signals (
          id TEXT PRIMARY KEY,
          bot_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          signal_type TEXT NOT NULL,
          confidence REAL,
          price REAL,
          quantity REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          executed BOOLEAN DEFAULT 0,
          execution_price REAL,
          execution_time DATETIME,
          FOREIGN KEY (bot_id) REFERENCES bots (id)
        )
      `);

      // Trades table
      database.run(`
        CREATE TABLE IF NOT EXISTS trades (
          id TEXT PRIMARY KEY,
          bot_id TEXT NOT NULL,
          signal_id TEXT,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL,
          quantity REAL NOT NULL,
          entry_price REAL NOT NULL,
          exit_price REAL,
          pnl REAL,
          commission REAL,
          status TEXT DEFAULT 'open',
          opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          closed_at DATETIME,
          FOREIGN KEY (bot_id) REFERENCES bots (id),
          FOREIGN KEY (signal_id) REFERENCES trading_signals (id)
        )
      `);

      // Risk parameters table
      database.run(`
        CREATE TABLE IF NOT EXISTS risk_parameters (
          id TEXT PRIMARY KEY,
          bot_id TEXT NOT NULL,
          max_position_size REAL,
          max_daily_loss REAL,
          max_drawdown REAL,
          stop_loss_pct REAL,
          take_profit_pct REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (bot_id) REFERENCES bots (id)
        )
      `);

      // Audit log table
      database.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          action TEXT NOT NULL,
          resource_type TEXT,
          resource_id TEXT,
          details TEXT,
          ip_address TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Market data table (for backtesting and analysis)
      database.run(`
        CREATE TABLE IF NOT EXISTS market_data (
          id TEXT PRIMARY KEY,
          symbol TEXT NOT NULL,
          timestamp DATETIME NOT NULL,
          open REAL,
          high REAL,
          low REAL,
          close REAL,
          volume REAL,
          timeframe TEXT DEFAULT '1m'
        )
      `);

      // Bot performance snapshots
      database.run(`
        CREATE TABLE IF NOT EXISTS performance_snapshots (
          id TEXT PRIMARY KEY,
          bot_id TEXT NOT NULL,
          date DATE NOT NULL,
          total_pnl REAL,
          daily_pnl REAL,
          total_trades INTEGER,
          win_rate REAL,
          sharpe_ratio REAL,
          max_drawdown REAL,
          exposure REAL,
          FOREIGN KEY (bot_id) REFERENCES bots (id)
        )
      `);

      // ML Models table
      database.run(`
        CREATE TABLE IF NOT EXISTS ml_models (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          user_id TEXT NOT NULL,
          algorithm_type TEXT NOT NULL,
          target_timeframe TEXT NOT NULL,
          symbols TEXT NOT NULL,
          parameters TEXT,
          model_data TEXT,
          training_status TEXT DEFAULT 'untrained',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_trained DATETIME,
          accuracy REAL,
          precision_score REAL,
          recall_score REAL,
          f1_score REAL,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // ML Training Data table
      database.run(`
        CREATE TABLE IF NOT EXISTS ml_training_data (
          id TEXT PRIMARY KEY,
          model_id TEXT NOT NULL,
          features TEXT NOT NULL,
          target REAL NOT NULL,
          timestamp DATETIME NOT NULL,
          symbol TEXT NOT NULL,
          timeframe TEXT NOT NULL,
          FOREIGN KEY (model_id) REFERENCES ml_models (id)
        )
      `);

      // ML Predictions table
      database.run(`
        CREATE TABLE IF NOT EXISTS ml_predictions (
          id TEXT PRIMARY KEY,
          model_id TEXT NOT NULL,
          bot_id TEXT,
          symbol TEXT NOT NULL,
          prediction_value REAL NOT NULL,
          confidence REAL NOT NULL,
          features TEXT NOT NULL,
          actual_value REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          timeframe TEXT NOT NULL,
          FOREIGN KEY (model_id) REFERENCES ml_models (id),
          FOREIGN KEY (bot_id) REFERENCES bots (id)
        )
      `);

      // Backtesting Results table
      database.run(`
        CREATE TABLE IF NOT EXISTS backtesting_results (
          id TEXT PRIMARY KEY,
          model_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          symbols TEXT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          initial_capital REAL NOT NULL,
          final_capital REAL NOT NULL,
          total_return REAL NOT NULL,
          sharpe_ratio REAL,
          max_drawdown REAL,
          total_trades INTEGER,
          win_rate REAL,
          avg_trade_duration REAL,
          profit_factor REAL,
          parameters TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (model_id) REFERENCES ml_models (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Backtesting Trades table
      database.run(`
        CREATE TABLE IF NOT EXISTS backtesting_trades (
          id TEXT PRIMARY KEY,
          backtest_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL,
          entry_date DATETIME NOT NULL,
          exit_date DATETIME,
          entry_price REAL NOT NULL,
          exit_price REAL,
          quantity REAL NOT NULL,
          pnl REAL,
          signal_confidence REAL,
          prediction_accuracy REAL,
          FOREIGN KEY (backtest_id) REFERENCES backtesting_results (id)
        )
      `);

      // Model Performance Metrics table
      database.run(`
        CREATE TABLE IF NOT EXISTS model_performance_metrics (
          id TEXT PRIMARY KEY,
          model_id TEXT NOT NULL,
          metric_date DATE NOT NULL,
          accuracy REAL,
          precision_score REAL,
          recall_score REAL,
          f1_score REAL,
          mean_absolute_error REAL,
          root_mean_square_error REAL,
          directional_accuracy REAL,
          profit_correlation REAL,
          FOREIGN KEY (model_id) REFERENCES ml_models (id)
        )
      `);

      // Portfolio optimizations table
      database.run(`
        CREATE TABLE IF NOT EXISTS portfolio_optimizations (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          method TEXT NOT NULL,
          assets TEXT NOT NULL,
          result TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Advanced Portfolios table
      database.run(`
        CREATE TABLE IF NOT EXISTS portfolios (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          weights TEXT NOT NULL,
          performance_metrics TEXT,
          optimization_details TEXT,
          factor_exposures TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Monte Carlo Simulations table
      database.run(`
        CREATE TABLE IF NOT EXISTS monte_carlo_simulations (
          id TEXT PRIMARY KEY,
          portfolio_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          num_simulations INTEGER NOT NULL,
          time_horizon INTEGER NOT NULL,
          statistics TEXT NOT NULL,
          stress_tests TEXT,
          path_analysis TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (portfolio_id) REFERENCES portfolios (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Hedging Strategies table
      database.run(`
        CREATE TABLE IF NOT EXISTS hedging_strategies (
          id TEXT PRIMARY KEY,
          portfolio_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          hedging_assets TEXT,
          risk_target REAL,
          rebalance_frequency TEXT,
          hedge_ratios TEXT,
          rules TEXT,
          triggers TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (portfolio_id) REFERENCES portfolios (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Portfolio Risk Monitoring table
      database.run(`
        CREATE TABLE IF NOT EXISTS portfolio_risk_monitoring (
          id TEXT PRIMARY KEY,
          portfolio_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          current_risk TEXT NOT NULL,
          risk_attribution TEXT,
          risk_alerts TEXT,
          market_data TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (portfolio_id) REFERENCES portfolios (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Advanced Orders table
      database.run(`
        CREATE TABLE IF NOT EXISTS advanced_orders (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL,
          type TEXT NOT NULL,
          quantity REAL NOT NULL,
          price REAL,
          stop_price REAL,
          status TEXT DEFAULT 'PENDING',
          parameters TEXT,
          executions TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Arbitrage Trades table
      database.run(`
        CREATE TABLE IF NOT EXISTS arbitrage_trades (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          buy_exchange TEXT NOT NULL,
          sell_exchange TEXT NOT NULL,
          buy_price REAL NOT NULL,
          sell_price REAL NOT NULL,
          quantity REAL NOT NULL,
          expected_profit REAL NOT NULL,
          actual_profit REAL,
          status TEXT DEFAULT 'PENDING',
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Position Risk Tracking table
      database.run(`
        CREATE TABLE IF NOT EXISTS position_risk_tracking (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          position_size REAL NOT NULL,
          entry_price REAL NOT NULL,
          stop_price REAL,
          risk_amount REAL NOT NULL,
          var_1d REAL,
          position_value REAL,
          risk_percentage REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          logger.error('Error creating tables:', err);
          reject(err);
        } else {
          logger.info('Database tables initialized successfully');
          resolve();
        }
      });
    });
  });
};

module.exports = {
  get db() {
    return initializeDbConnection();
  },
  initializeDatabase
};