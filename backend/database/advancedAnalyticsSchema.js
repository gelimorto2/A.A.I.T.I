/**
 * Database Schema for Advanced Analytics & Reporting (TODO 2.2)
 * Creates tables for storing analytics reports, risk monitoring, and performance data
 */

const logger = require('../utils/logger');

function createAdvancedAnalyticsTables(db) {
  return new Promise((resolve, reject) => {
    const tables = [
      // Advanced reports storage
      `CREATE TABLE IF NOT EXISTS advanced_reports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        portfolio_id TEXT,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        metadata TEXT,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (portfolio_id) REFERENCES bots(id)
      )`,

      // Risk monitoring alerts
      `CREATE TABLE IF NOT EXISTS risk_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        acknowledged BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES bots(id)
      )`,

      // Performance snapshots (enhanced)
      `CREATE TABLE IF NOT EXISTS performance_snapshots_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id TEXT NOT NULL,
        date DATE NOT NULL,
        total_value REAL DEFAULT 0,
        total_pnl REAL DEFAULT 0,
        daily_pnl REAL DEFAULT 0,
        daily_return REAL DEFAULT 0,
        total_trades INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0,
        sharpe_ratio REAL DEFAULT 0,
        sortino_ratio REAL DEFAULT 0,
        max_drawdown REAL DEFAULT 0,
        volatility REAL DEFAULT 0,
        var_95 REAL DEFAULT 0,
        conditional_var_95 REAL DEFAULT 0,
        alpha REAL DEFAULT 0,
        beta REAL DEFAULT 1,
        tracking_error REAL DEFAULT 0,
        information_ratio REAL DEFAULT 0,
        exposure REAL DEFAULT 0,
        leverage REAL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots(id),
        UNIQUE(bot_id, date)
      )`,

      // Attribution analysis results
      `CREATE TABLE IF NOT EXISTS attribution_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id TEXT NOT NULL,
        analysis_date DATE NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        asset_level_data TEXT,
        sector_level_data TEXT,
        strategy_level_data TEXT,
        risk_factor_data TEXT,
        summary_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES bots(id)
      )`,

      // Benchmark comparison results
      `CREATE TABLE IF NOT EXISTS benchmark_comparisons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id TEXT NOT NULL,
        comparison_date DATE NOT NULL,
        period_days INTEGER NOT NULL,
        benchmarks TEXT NOT NULL,
        portfolio_metrics TEXT,
        benchmark_metrics TEXT,
        rankings TEXT,
        analysis TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES bots(id)
      )`,

      // Risk monitoring history
      `CREATE TABLE IF NOT EXISTS risk_monitoring_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id TEXT NOT NULL,
        check_timestamp DATETIME NOT NULL,
        risk_checks TEXT NOT NULL,
        violations_count INTEGER DEFAULT 0,
        risk_score REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES bots(id)
      )`,

      // VaR calculations history
      `CREATE TABLE IF NOT EXISTS var_calculations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id TEXT NOT NULL,
        calculation_date DATE NOT NULL,
        confidence_level REAL NOT NULL,
        horizon_days INTEGER NOT NULL,
        method TEXT NOT NULL,
        var_amount REAL NOT NULL,
        var_percent REAL NOT NULL,
        expected_shortfall REAL,
        calculation_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES bots(id)
      )`,

      // Position sizing recommendations
      `CREATE TABLE IF NOT EXISTS position_sizing_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        method TEXT NOT NULL,
        recommended_value REAL NOT NULL,
        parameters TEXT,
        reasoning TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES bots(id)
      )`,

      // Stress test results
      `CREATE TABLE IF NOT EXISTS stress_test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id TEXT NOT NULL,
        test_date DATE NOT NULL,
        scenarios TEXT NOT NULL,
        results TEXT NOT NULL,
        worst_case_scenario TEXT,
        average_impact REAL,
        recommended_hedges TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES bots(id)
      )`,

      // Correlation analysis results
      `CREATE TABLE IF NOT EXISTS correlation_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id TEXT NOT NULL,
        analysis_date DATE NOT NULL,
        correlation_matrix TEXT,
        avg_correlation REAL,
        max_correlation REAL,
        diversification_metrics TEXT,
        recommendations TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES bots(id)
      )`
    ];

    let completed = 0;
    const total = tables.length;

    tables.forEach((tableSQL) => {
      db.run(tableSQL, (err) => {
        if (err) {
          logger.error('Error creating advanced analytics table:', err);
          reject(err);
          return;
        }
        
        completed++;
        if (completed === total) {
          logger.info('Advanced Analytics database tables created successfully');
          createIndexes(db).then(resolve).catch(reject);
        }
      });
    });
  });
}

function createIndexes(db) {
  return new Promise((resolve, reject) => {
    const indexes = [
      // Performance optimization indexes
      'CREATE INDEX IF NOT EXISTS idx_advanced_reports_user_portfolio ON advanced_reports(user_id, portfolio_id)',
      'CREATE INDEX IF NOT EXISTS idx_advanced_reports_created ON advanced_reports(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_risk_alerts_portfolio ON risk_alerts(portfolio_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_risk_alerts_severity ON risk_alerts(severity, acknowledged)',
      'CREATE INDEX IF NOT EXISTS idx_performance_snapshots_v2_bot_date ON performance_snapshots_v2(bot_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_attribution_portfolio_date ON attribution_analysis(portfolio_id, analysis_date)',
      'CREATE INDEX IF NOT EXISTS idx_benchmark_portfolio_date ON benchmark_comparisons(portfolio_id, comparison_date)',
      'CREATE INDEX IF NOT EXISTS idx_risk_monitoring_portfolio ON risk_monitoring_history(portfolio_id, check_timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_var_calculations_portfolio ON var_calculations(portfolio_id, calculation_date)',
      'CREATE INDEX IF NOT EXISTS idx_position_sizing_portfolio ON position_sizing_recommendations(portfolio_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_stress_test_portfolio ON stress_test_results(portfolio_id, test_date)',
      'CREATE INDEX IF NOT EXISTS idx_correlation_portfolio ON correlation_analysis(portfolio_id, analysis_date)'
    ];

    let completed = 0;
    const total = indexes.length;

    indexes.forEach((indexSQL) => {
      db.run(indexSQL, (err) => {
        if (err) {
          logger.error('Error creating index:', err);
          reject(err);
          return;
        }
        
        completed++;
        if (completed === total) {
          logger.info('Advanced Analytics database indexes created successfully');
          resolve();
        }
      });
    });
  });
}

function initializeAdvancedAnalytics(db) {
  return createAdvancedAnalyticsTables(db);
}

module.exports = {
  initializeAdvancedAnalytics,
  createAdvancedAnalyticsTables,
  createIndexes
};