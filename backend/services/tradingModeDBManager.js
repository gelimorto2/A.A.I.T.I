const knex = require('knex');
const logger = require('../utils/logger');

/**
 * Trading Mode Database Manager
 * Manages segregated databases for paper trading vs live trading
 */
class TradingModeDBManager {
  constructor() {
    this.connections = {
      paper: null,
      live: null
    };
    this.config = {
      paper: {
        client: 'better-sqlite3',
        connection: {
          filename: './database/paper_trading.db'
        },
        useNullAsDefault: true,
        migrations: {
          directory: './migrations/paper'
        },
        pool: {
          min: 1,
          max: 5
        }
      },
      live: {
        client: 'better-sqlite3',
        connection: {
          filename: './database/live_trading.db'
        },
        useNullAsDefault: true,
        migrations: {
          directory: './migrations/live'
        },
        pool: {
          min: 2,
          max: 10
        }
      }
    };
  }

  /**
   * Initialize database connections for both modes
   */
  async initialize() {
    try {
      // Initialize paper trading database
      this.connections.paper = knex(this.config.paper);
      
      // Initialize live trading database
      this.connections.live = knex(this.config.live);

      // Run migrations for both databases
      await this.runMigrations('paper');
      await this.runMigrations('live');

      // Verify database schemas
      await this.verifySchemas();

      logger.info('Trading mode database manager initialized', {
        paperConnection: !!this.connections.paper,
        liveConnection: !!this.connections.live
      });

      return true;

    } catch (error) {
      logger.error('Failed to initialize trading mode databases', { error: error.message });
      throw error;
    }
  }

  /**
   * Get database connection for trading mode
   */
  getConnection(tradingMode) {
    if (!['paper', 'live'].includes(tradingMode)) {
      throw new Error(`Invalid trading mode: ${tradingMode}. Must be 'paper' or 'live'`);
    }

    const connection = this.connections[tradingMode];
    if (!connection) {
      throw new Error(`Database connection not available for ${tradingMode} mode`);
    }

    return connection;
  }

  /**
   * Run migrations for specific trading mode
   */
  async runMigrations(tradingMode) {
    try {
      const connection = this.connections[tradingMode];
      if (!connection) {
        throw new Error(`No connection available for ${tradingMode} mode`);
      }

      const [batchNo, migrations] = await connection.migrate.latest();
      
      logger.info('Migrations completed', {
        tradingMode,
        batchNo,
        migrationsRun: migrations.length
      });

      return { batchNo, migrations };

    } catch (error) {
      logger.error('Migration failed', { tradingMode, error: error.message });
      throw error;
    }
  }

  /**
   * Verify database schemas match expected structure
   */
  async verifySchemas() {
    const expectedTables = [
      'accounts',
      'orders',
      'trades',
      'positions',
      'balances',
      'performance_metrics',
      'risk_events',
      'audit_logs'
    ];

    for (const mode of ['paper', 'live']) {
      const connection = this.connections[mode];
      
      for (const tableName of expectedTables) {
        const exists = await connection.schema.hasTable(tableName);
        if (!exists) {
          logger.warn('Missing table in database schema', { mode, tableName });
        }
      }
    }
  }

  /**
   * Create segregated account for trading mode
   */
  async createAccount(tradingMode, accountData) {
    try {
      const connection = this.getConnection(tradingMode);
      
      const account = {
        id: this.generateAccountId(tradingMode),
        name: accountData.name,
        type: tradingMode,
        exchange: accountData.exchange,
        credentials: this.encryptCredentials(accountData.credentials),
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        metadata: JSON.stringify({
          initial_balance: accountData.initialBalance || 0,
          currency: accountData.currency || 'USD',
          risk_profile: accountData.riskProfile || 'moderate',
          trading_mode: tradingMode
        })
      };

      const [accountId] = await connection('accounts').insert(account);
      
      // Initialize account balance
      await this.initializeAccountBalance(tradingMode, accountId, accountData.initialBalance || 0);
      
      logger.info('Account created', { tradingMode, accountId, name: account.name });
      
      return { ...account, id: accountId };

    } catch (error) {
      logger.error('Failed to create account', { tradingMode, error: error.message });
      throw error;
    }
  }

  /**
   * Initialize account balance
   */
  async initializeAccountBalance(tradingMode, accountId, initialBalance) {
    const connection = this.getConnection(tradingMode);
    
    const balance = {
      account_id: accountId,
      currency: 'USD',
      available: initialBalance,
      locked: 0,
      total: initialBalance,
      created_at: new Date(),
      updated_at: new Date()
    };

    await connection('balances').insert(balance);
  }

  /**
   * Get account by ID and trading mode
   */
  async getAccount(tradingMode, accountId) {
    try {
      const connection = this.getConnection(tradingMode);
      
      const account = await connection('accounts')
        .where({ id: accountId })
        .first();

      if (!account) {
        throw new Error(`Account ${accountId} not found in ${tradingMode} mode`);
      }

      // Parse metadata
      account.metadata = JSON.parse(account.metadata || '{}');
      
      // Get current balance
      const balance = await connection('balances')
        .where({ account_id: accountId })
        .first();

      account.balance = balance;

      return account;

    } catch (error) {
      logger.error('Failed to get account', { tradingMode, accountId, error: error.message });
      throw error;
    }
  }

  /**
   * Log audit event for trading mode
   */
  async logAuditEvent(tradingMode, event) {
    try {
      const connection = this.getConnection(tradingMode);
      
      const auditLog = {
        event_type: event.type,
        account_id: event.accountId,
        user_id: event.userId,
        description: event.description,
        metadata: JSON.stringify(event.metadata || {}),
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        created_at: new Date()
      };

      await connection('audit_logs').insert(auditLog);
      
      logger.info('Audit event logged', { tradingMode, eventType: event.type });

    } catch (error) {
      logger.error('Failed to log audit event', { tradingMode, error: error.message });
      throw error;
    }
  }

  /**
   * Get trading statistics for mode
   */
  async getTradingStatistics(tradingMode, accountId = null, timeRange = '24h') {
    try {
      const connection = this.getConnection(tradingMode);
      
      let query = connection('trades')
        .select(
          connection.raw('COUNT(*) as total_trades'),
          connection.raw('SUM(CASE WHEN side = "buy" THEN quantity ELSE 0 END) as total_buy_volume'),
          connection.raw('SUM(CASE WHEN side = "sell" THEN quantity ELSE 0 END) as total_sell_volume'),
          connection.raw('AVG(price) as avg_price'),
          connection.raw('SUM(fee) as total_fees'),
          connection.raw('SUM(pnl) as total_pnl')
        );

      if (accountId) {
        query = query.where({ account_id: accountId });
      }

      // Apply time range filter
      const timeRangeHours = this.parseTimeRange(timeRange);
      if (timeRangeHours) {
        const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
        query = query.where('created_at', '>=', cutoffTime);
      }

      const stats = await query.first();

      return {
        tradingMode,
        accountId,
        timeRange,
        ...stats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get trading statistics', { tradingMode, error: error.message });
      throw error;
    }
  }

  /**
   * Transfer data between trading modes (for testing/validation)
   */
  async transferData(fromMode, toMode, dataType, filters = {}) {
    try {
      if (fromMode === toMode) {
        throw new Error('Cannot transfer data to the same trading mode');
      }

      const sourceConnection = this.getConnection(fromMode);
      const targetConnection = this.getConnection(toMode);

      let query = sourceConnection(dataType);
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.where(key, value);
      });

      const data = await query.select('*');
      
      if (data.length === 0) {
        logger.info('No data to transfer', { fromMode, toMode, dataType });
        return { transferred: 0 };
      }

      // Insert data into target database
      await targetConnection(dataType).insert(data);
      
      logger.info('Data transferred between trading modes', {
        fromMode,
        toMode,
        dataType,
        recordsTransferred: data.length
      });

      return { transferred: data.length };

    } catch (error) {
      logger.error('Failed to transfer data', { fromMode, toMode, dataType, error: error.message });
      throw error;
    }
  }

  /**
   * Validate data isolation between trading modes
   */
  async validateDataIsolation() {
    try {
      const paperConnection = this.connections.paper;
      const liveConnection = this.connections.live;

      const validation = {
        paper: {},
        live: {},
        isolated: true,
        issues: []
      };

      const tables = ['accounts', 'orders', 'trades', 'positions'];

      // Count records in each table for both modes
      for (const table of tables) {
        const paperCount = await paperConnection(table).count('* as count').first();
        const liveCount = await liveConnection(table).count('* as count').first();
        
        validation.paper[table] = paperCount.count;
        validation.live[table] = liveCount.count;
      }

      // Check for cross-contamination (accounts with wrong type)
      const paperAccounts = await paperConnection('accounts').where('type', '!=', 'paper');
      const liveAccounts = await liveConnection('accounts').where('type', '!=', 'live');

      if (paperAccounts.length > 0) {
        validation.isolated = false;
        validation.issues.push(`Found ${paperAccounts.length} non-paper accounts in paper database`);
      }

      if (liveAccounts.length > 0) {
        validation.isolated = false;
        validation.issues.push(`Found ${liveAccounts.length} non-live accounts in live database`);
      }

      logger.info('Data isolation validation completed', {
        isolated: validation.isolated,
        issues: validation.issues.length
      });

      return validation;

    } catch (error) {
      logger.error('Failed to validate data isolation', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up old data (for maintenance)
   */
  async cleanupOldData(tradingMode, olderThanDays = 30) {
    try {
      const connection = this.getConnection(tradingMode);
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      const results = {
        audit_logs: 0,
        performance_metrics: 0,
        risk_events: 0
      };

      // Clean up old audit logs
      results.audit_logs = await connection('audit_logs')
        .where('created_at', '<', cutoffDate)
        .del();

      // Clean up old performance metrics
      results.performance_metrics = await connection('performance_metrics')
        .where('created_at', '<', cutoffDate)
        .del();

      // Clean up old risk events
      results.risk_events = await connection('risk_events')
        .where('created_at', '<', cutoffDate)
        .del();

      logger.info('Old data cleanup completed', { tradingMode, results, cutoffDate });

      return results;

    } catch (error) {
      logger.error('Failed to cleanup old data', { tradingMode, error: error.message });
      throw error;
    }
  }

  /**
   * Close database connections
   */
  async close() {
    try {
      if (this.connections.paper) {
        await this.connections.paper.destroy();
        this.connections.paper = null;
      }

      if (this.connections.live) {
        await this.connections.live.destroy();
        this.connections.live = null;
      }

      logger.info('Trading mode database connections closed');

    } catch (error) {
      logger.error('Failed to close database connections', { error: error.message });
      throw error;
    }
  }

  // Helper methods
  generateAccountId(tradingMode) {
    const prefix = tradingMode === 'paper' ? 'PA' : 'LA';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${prefix}_${timestamp}_${random}`;
  }

  encryptCredentials(credentials) {
    // In production, use proper encryption
    return Buffer.from(JSON.stringify(credentials)).toString('base64');
  }

  parseTimeRange(timeRange) {
    const ranges = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    };
    return ranges[timeRange] || null;
  }
}

module.exports = TradingModeDBManager;