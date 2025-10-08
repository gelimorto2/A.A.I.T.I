const logger = require('./logger');
const { db } = require('../database/init');

/**
 * Real Risk Engine with Enforcement & Audit Trail
 * Sprint 5: Production-grade risk management with real-time enforcement
 */
class RealRiskEngine {
  constructor() {
    this.riskLimits = {
      // Portfolio-level limits
      maxPortfolioDrawdown: 0.15,     // 15% maximum drawdown
      maxDailyLoss: 0.05,             // 5% maximum daily loss
      maxPositionSize: 0.10,          // 10% maximum position size
      maxTotalExposure: 0.95,         // 95% maximum total exposure
      
      // Position limits
      maxPositionValue: 100000,       // $100k max position value
      minPositionValue: 100,          // $100 min position value
      maxLeverage: 2.0,               // 2x maximum leverage
      
      // Correlation limits
      maxCorrelation: 0.80,           // 80% maximum correlation
      maxSectorExposure: 0.30,        // 30% maximum sector exposure
      
      // Liquidity limits
      minDailyVolume: 1000000,        // $1M minimum daily volume
      maxSlippage: 0.005,             // 0.5% maximum slippage
      
      // Risk metrics limits
      maxVaR_95: 0.03,                // 3% maximum 95% VaR
      maxVaR_99: 0.05,                // 5% maximum 99% VaR
      maxBeta: 2.0,                   // 2.0 maximum portfolio beta
      minSharpeRatio: 0.5             // 0.5 minimum Sharpe ratio
    };
    
    this.enforcements = new Map(); // Active enforcement rules
    this.auditTrail = [];          // Risk decision audit trail
    this.riskAlerts = [];          // Active risk alerts
    this.riskMetrics = new Map();  // Current risk metrics by portfolio
    
    this.initializeDatabase();
    this.startRiskMonitoring();
    
    logger.info('Real Risk Engine initialized with comprehensive enforcement');
  }

  /**
   * Initialize risk engine database tables
   */
  async initializeDatabase() {
    try {
      // Risk enforcement audit trail
      await db.run(`
        CREATE TABLE IF NOT EXISTS risk_audit_trail (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT,
          portfolio_id TEXT,
          action_type TEXT NOT NULL,
          risk_type TEXT NOT NULL,
          decision TEXT NOT NULL,
          risk_value REAL,
          limit_value REAL,
          reason TEXT,
          metadata TEXT,
          severity TEXT DEFAULT 'medium'
        )
      `);

      // Risk alerts table
      await db.run(`
        CREATE TABLE IF NOT EXISTS risk_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          portfolio_id TEXT NOT NULL,
          alert_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          message TEXT NOT NULL,
          current_value REAL,
          limit_value REAL,
          resolved BOOLEAN DEFAULT FALSE,
          resolved_at DATETIME,
          metadata TEXT
        )
      `);

      // Risk limits per portfolio
      await db.run(`
        CREATE TABLE IF NOT EXISTS portfolio_risk_limits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          portfolio_id TEXT NOT NULL UNIQUE,
          risk_limits TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_by TEXT
        )
      `);

      // Risk metrics history
      await db.run(`
        CREATE TABLE IF NOT EXISTS risk_metrics_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          portfolio_id TEXT NOT NULL,
          metric_type TEXT NOT NULL,
          metric_value REAL NOT NULL,
          benchmark_value REAL,
          status TEXT DEFAULT 'normal'
        )
      `);

      logger.info('Risk Engine database tables initialized');
    } catch (error) {
      logger.error('Failed to initialize risk engine database:', error);
      throw error;
    }
  }

  /**
   * Enforce pre-trade risk check with audit trail
   */
  async enforcePreTradeRisk(tradeRequest) {
    const startTime = Date.now();
    const auditEntry = {
      timestamp: new Date().toISOString(),
      user_id: tradeRequest.userId,
      portfolio_id: tradeRequest.portfolioId,
      action_type: 'PRE_TRADE_CHECK',
      trade_symbol: tradeRequest.symbol,
      trade_side: tradeRequest.side,
      trade_quantity: tradeRequest.quantity,
      trade_value: tradeRequest.value
    };

    try {
      logger.info('Enforcing pre-trade risk check', {
        userId: tradeRequest.userId,
        symbol: tradeRequest.symbol,
        side: tradeRequest.side,
        quantity: tradeRequest.quantity
      });

      // 1. Portfolio limit checks
      const portfolioCheck = await this.checkPortfolioLimits(tradeRequest);
      if (!portfolioCheck.approved) {
        await this.auditRiskDecision({
          ...auditEntry,
          risk_type: 'PORTFOLIO_LIMIT',
          decision: 'REJECTED',
          reason: portfolioCheck.reason,
          risk_value: portfolioCheck.currentValue,
          limit_value: portfolioCheck.limitValue,
          severity: 'high'
        });
        return portfolioCheck;
      }

      // 2. Position size limits
      const positionCheck = await this.checkPositionLimits(tradeRequest);
      if (!positionCheck.approved) {
        await this.auditRiskDecision({
          ...auditEntry,
          risk_type: 'POSITION_LIMIT',
          decision: 'REJECTED',
          reason: positionCheck.reason,
          risk_value: positionCheck.currentValue,
          limit_value: positionCheck.limitValue,
          severity: 'high'
        });
        return positionCheck;
      }

      // 3. Correlation limits
      const correlationCheck = await this.checkCorrelationLimits(tradeRequest);
      if (!correlationCheck.approved) {
        await this.auditRiskDecision({
          ...auditEntry,
          risk_type: 'CORRELATION_LIMIT',
          decision: 'REJECTED',
          reason: correlationCheck.reason,
          risk_value: correlationCheck.currentValue,
          limit_value: correlationCheck.limitValue,
          severity: 'medium'
        });
        return correlationCheck;
      }

      // 4. Liquidity checks
      const liquidityCheck = await this.checkLiquidityLimits(tradeRequest);
      if (!liquidityCheck.approved) {
        await this.auditRiskDecision({
          ...auditEntry,
          risk_type: 'LIQUIDITY_LIMIT',
          decision: 'REJECTED',
          reason: liquidityCheck.reason,
          risk_value: liquidityCheck.currentValue,
          limit_value: liquidityCheck.limitValue,
          severity: 'medium'
        });
        return liquidityCheck;
      }

      // 5. VaR limits
      const varCheck = await this.checkVaRLimits(tradeRequest);
      if (!varCheck.approved) {
        await this.auditRiskDecision({
          ...auditEntry,
          risk_type: 'VAR_LIMIT',
          decision: 'REJECTED',
          reason: varCheck.reason,
          risk_value: varCheck.currentValue,
          limit_value: varCheck.limitValue,
          severity: 'high'
        });
        return varCheck;
      }

      // All checks passed
      const processingTime = Date.now() - startTime;
      await this.auditRiskDecision({
        ...auditEntry,
        risk_type: 'COMPREHENSIVE',
        decision: 'APPROVED',
        reason: 'All risk checks passed',
        severity: 'low',
        metadata: JSON.stringify({
          processing_time_ms: processingTime,
          checks_performed: ['portfolio', 'position', 'correlation', 'liquidity', 'var']
        })
      });

      logger.info('Pre-trade risk check approved', {
        userId: tradeRequest.userId,
        symbol: tradeRequest.symbol,
        processingTime: processingTime + 'ms'
      });

      return {
        approved: true,
        reason: 'All risk checks passed',
        processingTime,
        checksPerformed: 5
      };

    } catch (error) {
      logger.error('Pre-trade risk check failed:', error);
      
      await this.auditRiskDecision({
        ...auditEntry,
        risk_type: 'SYSTEM_ERROR',
        decision: 'REJECTED',
        reason: `Risk engine error: ${error.message}`,
        severity: 'critical'
      });

      return {
        approved: false,
        reason: 'Risk engine system error',
        error: error.message
      };
    }
  }

  /**
   * Check portfolio-level risk limits
   */
  async checkPortfolioLimits(tradeRequest) {
    try {
      // Get current portfolio metrics
      const portfolioMetrics = await this.getPortfolioMetrics(tradeRequest.portfolioId);
      
      // Check maximum drawdown
      if (portfolioMetrics.drawdown > this.riskLimits.maxPortfolioDrawdown) {
        await this.createRiskAlert(tradeRequest.portfolioId, 'DRAWDOWN_EXCEEDED', 'high',
          `Portfolio drawdown ${(portfolioMetrics.drawdown * 100).toFixed(2)}% exceeds limit ${(this.riskLimits.maxPortfolioDrawdown * 100).toFixed(2)}%`,
          portfolioMetrics.drawdown, this.riskLimits.maxPortfolioDrawdown);
          
        return {
          approved: false,
          reason: `Portfolio drawdown limit exceeded: ${(portfolioMetrics.drawdown * 100).toFixed(2)}%`,
          currentValue: portfolioMetrics.drawdown,
          limitValue: this.riskLimits.maxPortfolioDrawdown
        };
      }

      // Check daily loss limit
      if (Math.abs(portfolioMetrics.dailyPnL / portfolioMetrics.totalValue) > this.riskLimits.maxDailyLoss) {
        const dailyLossPercent = Math.abs(portfolioMetrics.dailyPnL / portfolioMetrics.totalValue);
        
        await this.createRiskAlert(tradeRequest.portfolioId, 'DAILY_LOSS_EXCEEDED', 'high',
          `Daily loss ${(dailyLossPercent * 100).toFixed(2)}% exceeds limit ${(this.riskLimits.maxDailyLoss * 100).toFixed(2)}%`,
          dailyLossPercent, this.riskLimits.maxDailyLoss);
          
        return {
          approved: false,
          reason: `Daily loss limit exceeded: ${(dailyLossPercent * 100).toFixed(2)}%`,
          currentValue: dailyLossPercent,
          limitValue: this.riskLimits.maxDailyLoss
        };
      }

      // Check total exposure
      const newExposure = portfolioMetrics.totalExposure + (tradeRequest.value / portfolioMetrics.totalValue);
      if (newExposure > this.riskLimits.maxTotalExposure) {
        return {
          approved: false,
          reason: `Total exposure limit exceeded: ${(newExposure * 100).toFixed(2)}%`,
          currentValue: newExposure,
          limitValue: this.riskLimits.maxTotalExposure
        };
      }

      return { approved: true };

    } catch (error) {
      logger.error('Portfolio limits check failed:', error);
      throw error;
    }
  }

  /**
   * Check position-level risk limits
   */
  async checkPositionLimits(tradeRequest) {
    try {
      const portfolioMetrics = await this.getPortfolioMetrics(tradeRequest.portfolioId);
      
      // Check maximum position size
      const positionPercent = tradeRequest.value / portfolioMetrics.totalValue;
      if (positionPercent > this.riskLimits.maxPositionSize) {
        return {
          approved: false,
          reason: `Position size limit exceeded: ${(positionPercent * 100).toFixed(2)}%`,
          currentValue: positionPercent,
          limitValue: this.riskLimits.maxPositionSize
        };
      }

      // Check maximum position value
      if (tradeRequest.value > this.riskLimits.maxPositionValue) {
        return {
          approved: false,
          reason: `Position value limit exceeded: $${tradeRequest.value.toLocaleString()}`,
          currentValue: tradeRequest.value,
          limitValue: this.riskLimits.maxPositionValue
        };
      }

      // Check minimum position value
      if (tradeRequest.value < this.riskLimits.minPositionValue) {
        return {
          approved: false,
          reason: `Position value below minimum: $${tradeRequest.value.toLocaleString()}`,
          currentValue: tradeRequest.value,
          limitValue: this.riskLimits.minPositionValue
        };
      }

      return { approved: true };

    } catch (error) {
      logger.error('Position limits check failed:', error);
      throw error;
    }
  }

  /**
   * Check correlation risk limits
   */
  async checkCorrelationLimits(tradeRequest) {
    try {
      // Get portfolio positions
      const positions = await this.getPortfolioPositions(tradeRequest.portfolioId);
      
      // Calculate correlation with existing positions
      let maxCorrelation = 0;
      let correlatedSymbol = null;
      
      for (const position of positions) {
        if (position.symbol !== tradeRequest.symbol) {
          const correlation = await this.calculateCorrelation(tradeRequest.symbol, position.symbol);
          if (Math.abs(correlation) > Math.abs(maxCorrelation)) {
            maxCorrelation = correlation;
            correlatedSymbol = position.symbol;
          }
        }
      }

      if (Math.abs(maxCorrelation) > this.riskLimits.maxCorrelation) {
        return {
          approved: false,
          reason: `Correlation limit exceeded with ${correlatedSymbol}: ${(maxCorrelation * 100).toFixed(1)}%`,
          currentValue: Math.abs(maxCorrelation),
          limitValue: this.riskLimits.maxCorrelation
        };
      }

      return { approved: true };

    } catch (error) {
      logger.error('Correlation limits check failed:', error);
      throw error;
    }
  }

  /**
   * Check liquidity risk limits
   */
  async checkLiquidityLimits(tradeRequest) {
    try {
      // Get symbol liquidity metrics (mock implementation)
      const liquidityMetrics = await this.getLiquidityMetrics(tradeRequest.symbol);
      
      // Check minimum daily volume
      if (liquidityMetrics.dailyVolume < this.riskLimits.minDailyVolume) {
        return {
          approved: false,
          reason: `Insufficient liquidity: $${liquidityMetrics.dailyVolume.toLocaleString()} daily volume`,
          currentValue: liquidityMetrics.dailyVolume,
          limitValue: this.riskLimits.minDailyVolume
        };
      }

      // Check estimated slippage
      const estimatedSlippage = this.estimateSlippage(tradeRequest.value, liquidityMetrics.dailyVolume);
      if (estimatedSlippage > this.riskLimits.maxSlippage) {
        return {
          approved: false,
          reason: `Estimated slippage too high: ${(estimatedSlippage * 100).toFixed(3)}%`,
          currentValue: estimatedSlippage,
          limitValue: this.riskLimits.maxSlippage
        };
      }

      return { approved: true };

    } catch (error) {
      logger.error('Liquidity limits check failed:', error);
      throw error;
    }
  }

  /**
   * Check Value at Risk (VaR) limits
   */
  async checkVaRLimits(tradeRequest) {
    try {
      // Calculate portfolio VaR with new position
      const currentVaR = await this.calculatePortfolioVaR(tradeRequest.portfolioId, 0.95);
      const newVaR = await this.calculatePortfolioVaRWithNewPosition(tradeRequest, 0.95);
      
      // Check 95% VaR limit
      if (newVaR > this.riskLimits.maxVaR_95) {
        return {
          approved: false,
          reason: `95% VaR limit exceeded: ${(newVaR * 100).toFixed(2)}%`,
          currentValue: newVaR,
          limitValue: this.riskLimits.maxVaR_95
        };
      }

      // Calculate and check 99% VaR
      const newVaR_99 = await this.calculatePortfolioVaRWithNewPosition(tradeRequest, 0.99);
      if (newVaR_99 > this.riskLimits.maxVaR_99) {
        return {
          approved: false,
          reason: `99% VaR limit exceeded: ${(newVaR_99 * 100).toFixed(2)}%`,
          currentValue: newVaR_99,
          limitValue: this.riskLimits.maxVaR_99
        };
      }

      return { approved: true };

    } catch (error) {
      logger.error('VaR limits check failed:', error);
      throw error;
    }
  }

  /**
   * Audit risk decision to database
   */
  async auditRiskDecision(auditData) {
    try {
      const query = `
        INSERT INTO risk_audit_trail 
        (user_id, portfolio_id, action_type, risk_type, decision, risk_value, limit_value, reason, metadata, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await db.run(query, [
        auditData.user_id,
        auditData.portfolio_id,
        auditData.action_type,
        auditData.risk_type,
        auditData.decision,
        auditData.risk_value || null,
        auditData.limit_value || null,
        auditData.reason,
        auditData.metadata || JSON.stringify(auditData),
        auditData.severity
      ]);

      // Also keep in-memory trail for quick access
      this.auditTrail.push({
        ...auditData,
        id: Date.now() + Math.random()
      });

      // Limit in-memory trail size
      if (this.auditTrail.length > 1000) {
        this.auditTrail = this.auditTrail.slice(-500);
      }

    } catch (error) {
      logger.error('Failed to audit risk decision:', error);
    }
  }

  /**
   * Create risk alert
   */
  async createRiskAlert(portfolioId, alertType, severity, message, currentValue, limitValue) {
    try {
      const query = `
        INSERT INTO risk_alerts 
        (portfolio_id, alert_type, severity, message, current_value, limit_value)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await db.run(query, [portfolioId, alertType, severity, message, currentValue, limitValue]);
      
      // Add to in-memory alerts
      const alert = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        portfolioId,
        alertType,
        severity,
        message,
        currentValue,
        limitValue,
        resolved: false
      };
      
      this.riskAlerts.push(alert);
      
      logger.warn('Risk alert created', {
        portfolioId,
        alertType,
        severity,
        message
      });

    } catch (error) {
      logger.error('Failed to create risk alert:', error);
    }
  }

  /**
   * Start real-time risk monitoring
   */
  startRiskMonitoring() {
    // Monitor every 30 seconds
    setInterval(async () => {
      await this.monitorRiskMetrics();
    }, 30000);

    // Daily risk report
    setInterval(async () => {
      await this.generateDailyRiskReport();
    }, 24 * 60 * 60 * 1000);

    logger.info('Real-time risk monitoring started');
  }

  /**
   * Monitor risk metrics across all portfolios
   */
  async monitorRiskMetrics() {
    try {
      const portfolios = await this.getAllPortfolios();
      
      for (const portfolioId of portfolios) {
        const metrics = await this.getPortfolioMetrics(portfolioId);
        
        // Store metrics history
        await this.storeRiskMetrics(portfolioId, metrics);
        
        // Check for alert conditions
        await this.checkAlertConditions(portfolioId, metrics);
      }

    } catch (error) {
      logger.error('Risk monitoring failed:', error);
    }
  }

  /**
   * Generate daily risk report
   */
  async generateDailyRiskReport() {
    try {
      const report = {
        date: new Date().toISOString().split('T')[0],
        totalPortfolios: 0,
        totalAlerts: this.riskAlerts.filter(a => !a.resolved).length,
        riskBreaches: 0,
        avgVaR: 0,
        avgDrawdown: 0,
        topRisks: []
      };

      const portfolios = await this.getAllPortfolios();
      report.totalPortfolios = portfolios.length;

      let totalVaR = 0;
      let totalDrawdown = 0;

      for (const portfolioId of portfolios) {
        const metrics = await this.getPortfolioMetrics(portfolioId);
        totalVaR += metrics.var95 || 0;
        totalDrawdown += metrics.drawdown || 0;

        if (metrics.drawdown > this.riskLimits.maxPortfolioDrawdown) {
          report.riskBreaches++;
        }
      }

      report.avgVaR = totalVaR / portfolios.length;
      report.avgDrawdown = totalDrawdown / portfolios.length;

      logger.info('Daily risk report generated', report);
      
      return report;

    } catch (error) {
      logger.error('Failed to generate daily risk report:', error);
    }
  }

  // Mock helper methods (to be implemented with real data)
  
  async getPortfolioMetrics(portfolioId) {
    // Mock implementation - replace with real portfolio data
    return {
      totalValue: 100000,
      dailyPnL: -500,
      drawdown: 0.02,
      totalExposure: 0.85,
      var95: 0.025,
      beta: 1.2,
      sharpeRatio: 0.8
    };
  }

  async getPortfolioPositions(portfolioId) {
    // Mock implementation - replace with real position data
    return [
      { symbol: 'BTCUSDT', value: 10000, weight: 0.1 },
      { symbol: 'ETHUSDT', value: 8000, weight: 0.08 }
    ];
  }

  async calculateCorrelation(symbol1, symbol2) {
    // Mock implementation - replace with real correlation calculation
    return Math.random() * 0.8 - 0.4; // Random between -0.4 and 0.4
  }

  async getLiquidityMetrics(symbol) {
    // Mock implementation - replace with real market data
    return {
      dailyVolume: 50000000, // $50M
      bidAskSpread: 0.001,   // 0.1%
      marketDepth: 1000000   // $1M
    };
  }

  estimateSlippage(tradeValue, dailyVolume) {
    // Simple slippage estimation
    return Math.min((tradeValue / dailyVolume) * 0.1, 0.01);
  }

  async calculatePortfolioVaR(portfolioId, confidence) {
    // Mock VaR calculation
    return 0.02; // 2%
  }

  async calculatePortfolioVaRWithNewPosition(tradeRequest, confidence) {
    // Mock VaR calculation with new position
    return 0.025; // 2.5%
  }

  async getAllPortfolios() {
    // Mock portfolio list
    return ['portfolio1', 'portfolio2', 'portfolio3'];
  }

  async storeRiskMetrics(portfolioId, metrics) {
    try {
      const query = `
        INSERT INTO risk_metrics_history (portfolio_id, metric_type, metric_value, status)
        VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)
      `;
      
      await db.run(query, [
        portfolioId, 'drawdown', metrics.drawdown, metrics.drawdown > this.riskLimits.maxPortfolioDrawdown ? 'alert' : 'normal',
        portfolioId, 'var95', metrics.var95, metrics.var95 > this.riskLimits.maxVaR_95 ? 'alert' : 'normal',
        portfolioId, 'exposure', metrics.totalExposure, metrics.totalExposure > this.riskLimits.maxTotalExposure ? 'alert' : 'normal'
      ]);

    } catch (error) {
      logger.error('Failed to store risk metrics:', error);
    }
  }

  async checkAlertConditions(portfolioId, metrics) {
    // Check for new alert conditions and create alerts if needed
    if (metrics.drawdown > this.riskLimits.maxPortfolioDrawdown) {
      await this.createRiskAlert(portfolioId, 'DRAWDOWN_ALERT', 'high',
        `Drawdown ${(metrics.drawdown * 100).toFixed(2)}% exceeds limit`,
        metrics.drawdown, this.riskLimits.maxPortfolioDrawdown);
    }

    if (metrics.var95 > this.riskLimits.maxVaR_95) {
      await this.createRiskAlert(portfolioId, 'VAR_ALERT', 'medium',
        `95% VaR ${(metrics.var95 * 100).toFixed(2)}% exceeds limit`,
        metrics.var95, this.riskLimits.maxVaR_95);
    }
  }

  /**
   * Get recent audit trail entries
   */
  async getAuditTrail(portfolioId = null, limit = 100) {
    try {
      let query = `
        SELECT * FROM risk_audit_trail 
        ${portfolioId ? 'WHERE portfolio_id = ?' : ''}
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      
      const params = portfolioId ? [portfolioId, limit] : [limit];
      
      return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

    } catch (error) {
      logger.error('Failed to get audit trail:', error);
      return [];
    }
  }

  /**
   * Get active risk alerts
   */
  async getActiveAlerts(portfolioId = null) {
    try {
      let query = `
        SELECT * FROM risk_alerts 
        WHERE resolved = FALSE 
        ${portfolioId ? 'AND portfolio_id = ?' : ''}
        ORDER BY timestamp DESC
      `;
      
      const params = portfolioId ? [portfolioId] : [];
      
      return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

    } catch (error) {
      logger.error('Failed to get active alerts:', error);
      return [];
    }
  }

  /**
   * Update risk limits for portfolio
   */
  async updateRiskLimits(portfolioId, newLimits, updatedBy) {
    try {
      const query = `
        INSERT OR REPLACE INTO portfolio_risk_limits 
        (portfolio_id, risk_limits, updated_by) 
        VALUES (?, ?, ?)
      `;
      
      await db.run(query, [portfolioId, JSON.stringify(newLimits), updatedBy]);
      
      // Audit the change
      await this.auditRiskDecision({
        user_id: updatedBy,
        portfolio_id: portfolioId,
        action_type: 'RISK_LIMITS_UPDATE',
        risk_type: 'CONFIGURATION',
        decision: 'UPDATED',
        reason: 'Risk limits manually updated',
        metadata: JSON.stringify({ newLimits }),
        severity: 'medium'
      });

      logger.info('Risk limits updated', { portfolioId, updatedBy });

    } catch (error) {
      logger.error('Failed to update risk limits:', error);
      throw error;
    }
  }
}

module.exports = RealRiskEngine;