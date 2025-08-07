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

      // API Keys table for programmatic access
      database.run(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          key_hash TEXT NOT NULL,
          key_salt TEXT NOT NULL,
          permissions TEXT NOT NULL,
          last_used DATETIME,
          expires_at DATETIME,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // OAuth providers table for external authentication
      database.run(`
        CREATE TABLE IF NOT EXISTS oauth_providers (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          provider TEXT NOT NULL,
          provider_user_id TEXT NOT NULL,
          provider_username TEXT,
          provider_email TEXT,
          access_token TEXT,
          refresh_token TEXT,
          token_expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(provider, provider_user_id)
        )
      `);

      // Security events table for enhanced audit logging
      database.run(`
        CREATE TABLE IF NOT EXISTS security_events (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          event_type TEXT NOT NULL,
          event_severity TEXT DEFAULT 'info',
          description TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          additional_data TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Data retention policies table
      database.run(`
        CREATE TABLE IF NOT EXISTS data_retention_policies (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          retention_days INTEGER NOT NULL,
          condition_column TEXT,
          condition_value TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
          name TEXT NOT NULL,
          method TEXT NOT NULL,
          assets TEXT NOT NULL,
          result TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);
      
      // Paper Trading tables
      database.run(`
        CREATE TABLE IF NOT EXISTS paper_portfolios (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          initial_balance REAL NOT NULL,
          current_balance REAL NOT NULL,
          currency TEXT DEFAULT 'USD',
          risk_profile TEXT DEFAULT 'moderate',
          trading_strategy TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);
      
      database.run(`
        CREATE TABLE IF NOT EXISTS paper_orders (
          id TEXT PRIMARY KEY,
          portfolio_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL, -- 'buy' or 'sell'
          type TEXT NOT NULL, -- 'market', 'limit', 'stop', 'stop_limit'
          quantity REAL NOT NULL,
          price REAL,
          stop_price REAL,
          time_in_force TEXT DEFAULT 'GTC',
          status TEXT DEFAULT 'pending',
          filled_quantity REAL DEFAULT 0,
          avg_fill_price REAL DEFAULT 0,
          commission REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (portfolio_id) REFERENCES paper_portfolios (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);
      
      database.run(`
        CREATE TABLE IF NOT EXISTS paper_trades (
          id TEXT PRIMARY KEY,
          portfolio_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          order_id TEXT,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL,
          quantity REAL NOT NULL,
          price REAL NOT NULL,
          commission REAL DEFAULT 0,
          realized_pnl REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (portfolio_id) REFERENCES paper_portfolios (id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (order_id) REFERENCES paper_orders (id)
        )
      `);
      
      database.run(`
        CREATE TABLE IF NOT EXISTS paper_positions (
          id TEXT PRIMARY KEY,
          portfolio_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          quantity REAL NOT NULL,
          avg_price REAL NOT NULL,
          total_cost REAL NOT NULL,
          unrealized_pnl REAL DEFAULT 0,
          realized_pnl REAL DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (portfolio_id) REFERENCES paper_portfolios (id),
          UNIQUE(portfolio_id, symbol)
        )
      `, (err) => {
        if (err) {
          logger.error('Error creating tables:', err);
          reject(err);
        } else {
          logger.info('Database tables initialized successfully (including Paper Trading)');
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