const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const DB_PATH = process.env.DB_PATH || './database/aaiti.sqlite';

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    logger.error('Error opening database:', err);
  } else {
    logger.info('Connected to SQLite database');
  }
});

const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
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
      db.run(`
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
      db.run(`
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
      db.run(`
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
      db.run(`
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
      db.run(`
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
      db.run(`
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
      db.run(`
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
      db.run(`
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
  db,
  initializeDatabase
};