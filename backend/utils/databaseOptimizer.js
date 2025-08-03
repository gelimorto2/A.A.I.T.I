const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');
const performanceConfig = require('../config/performance');

/**
 * AAITI Database Optimization Module
 * Implements advanced SQLite optimizations and query performance enhancements
 * Part of System Enhancements - Performance Optimizations
 */

class DatabaseOptimizer {
  constructor() {
    this.dbPath = path.join(__dirname, '../database/trading.db');
    this.db = null;
    this.queryCache = new Map();
    this.connectionPool = [];
    this.maxConnections = performanceConfig.database.pool.max || 10;
    this.minConnections = performanceConfig.database.pool.min || 2;
    this.stats = {
      queries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTime: 0,
      slowQueries: 0,
      errors: 0
    };

    this.log('Database Optimizer initialized');
  }

  /**
   * Initialize optimized database connection
   */
  async initialize() {
    try {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          this.log('Database connection error', { error: err.message });
          throw err;
        }
        this.log('Database connected successfully');
      });

      // Apply SQLite optimizations
      await this.applyOptimizations();

      // Create connection pool
      await this.initializeConnectionPool();

      // Setup database monitoring
      this.setupMonitoring();

      this.log('Database optimization complete');

    } catch (error) {
      this.log('Failed to initialize database optimizer', { error: error.message });
      throw error;
    }
  }

  /**
   * Apply SQLite performance optimizations
   */
  async applyOptimizations() {
    const optimizations = [
      // Cache size optimization
      `PRAGMA cache_size = ${performanceConfig.database.sqlite.cacheSize}`,
      
      // Journal mode for better concurrency
      `PRAGMA journal_mode = ${performanceConfig.database.sqlite.journalMode}`,
      
      // Synchronous mode for performance
      `PRAGMA synchronous = ${performanceConfig.database.sqlite.synchronous}`,
      
      // Temp store in memory
      `PRAGMA temp_store = ${performanceConfig.database.sqlite.tempStore}`,
      
      // Memory-mapped I/O
      `PRAGMA mmap_size = ${performanceConfig.database.sqlite.mmapSize}`,
      
      // Page size optimization
      `PRAGMA page_size = ${performanceConfig.database.sqlite.pageSize}`,
      
      // Auto vacuum for space management
      `PRAGMA auto_vacuum = ${performanceConfig.database.sqlite.autoVacuum}`,
      
      // Locking mode
      `PRAGMA locking_mode = ${performanceConfig.database.sqlite.lockingMode}`,
      
      // Additional optimizations
      'PRAGMA foreign_keys = ON',
      'PRAGMA case_sensitive_like = ON',
      'PRAGMA secure_delete = OFF',
      'PRAGMA count_changes = OFF',
      'PRAGMA legacy_file_format = OFF'
    ];

    for (const pragma of optimizations) {
      await this.execAsync(pragma);
      this.log('Applied optimization', { pragma });
    }
  }

  /**
   * Initialize connection pool for concurrent operations
   */
  async initializeConnectionPool() {
    for (let i = 0; i < this.minConnections; i++) {
      const connection = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE);
      this.connectionPool.push({
        db: connection,
        inUse: false,
        created: new Date()
      });
    }
    this.log('Connection pool initialized', { size: this.minConnections });
  }

  /**
   * Get available connection from pool
   */
  async getConnection() {
    // Find available connection
    for (const conn of this.connectionPool) {
      if (!conn.inUse) {
        conn.inUse = true;
        return conn;
      }
    }

    // Create new connection if pool is not at max
    if (this.connectionPool.length < this.maxConnections) {
      const connection = {
        db: new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE),
        inUse: true,
        created: new Date()
      };
      this.connectionPool.push(connection);
      return connection;
    }

    // Wait for available connection
    return new Promise((resolve) => {
      const checkForConnection = () => {
        const available = this.connectionPool.find(conn => !conn.inUse);
        if (available) {
          available.inUse = true;
          resolve(available);
        } else {
          setTimeout(checkForConnection, 10);
        }
      };
      checkForConnection();
    });
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(connection) {
    connection.inUse = false;
  }

  /**
   * Setup database monitoring and performance tracking
   */
  setupMonitoring() {
    // Query execution time monitoring
    this.db.on('profile', (sql, time) => {
      this.stats.totalTime += time;
      this.stats.queries++;

      // Flag slow queries (> 100ms)
      if (time > 100) {
        this.stats.slowQueries++;
        this.log('Slow query detected', { sql: sql.substring(0, 100), time });
      }
    });

    // Error monitoring
    this.db.on('error', (err) => {
      this.stats.errors++;
      this.log('Database error', { error: err.message });
    });
  }

  /**
   * Execute SQL with optimization and caching
   */
  async executeOptimized(sql, params = [], options = {}) {
    const startTime = Date.now();
    const cacheKey = options.cache ? `${sql}:${JSON.stringify(params)}` : null;

    try {
      // Check query cache if enabled
      if (cacheKey && this.queryCache.has(cacheKey)) {
        this.stats.cacheHits++;
        const cached = this.queryCache.get(cacheKey);
        
        // Check cache expiry
        if (Date.now() - cached.timestamp < (options.cacheTTL || 60000)) {
          this.log('Query cache hit', { sql: sql.substring(0, 50) });
          return cached.result;
        } else {
          this.queryCache.delete(cacheKey);
        }
      }

      // Get connection from pool
      const connection = await this.getConnection();

      try {
        // Execute query
        const result = await new Promise((resolve, reject) => {
          if (sql.trim().toUpperCase().startsWith('SELECT')) {
            connection.db.all(sql, params, (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            });
          } else {
            connection.db.run(sql, params, function(err) {
              if (err) reject(err);
              else resolve({ 
                lastID: this.lastID, 
                changes: this.changes 
              });
            });
          }
        });

        // Cache result if enabled
        if (cacheKey && options.cache) {
          this.queryCache.set(cacheKey, {
            result,
            timestamp: Date.now()
          });
          this.stats.cacheMisses++;
        }

        const executionTime = Date.now() - startTime;
        this.log('Query executed', { 
          sql: sql.substring(0, 50), 
          time: executionTime,
          cached: !!cacheKey 
        });

        return result;

      } finally {
        this.releaseConnection(connection);
      }

    } catch (error) {
      this.stats.errors++;
      this.log('Query execution error', { sql, error: error.message });
      throw error;
    }
  }

  /**
   * Create optimized indexes for better query performance
   */
  async createOptimizedIndexes() {
    const indexes = [
      // Trading data indexes
      'CREATE INDEX IF NOT EXISTS idx_trades_symbol_timestamp ON trades(symbol, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)',
      'CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)',
      
      // Portfolio indexes
      'CREATE INDEX IF NOT EXISTS idx_portfolio_user_symbol ON portfolio(user_id, symbol)',
      'CREATE INDEX IF NOT EXISTS idx_portfolio_timestamp ON portfolio(timestamp)',
      
      // Market data indexes
      'CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON market_data(symbol)',
      
      // Analytics indexes
      'CREATE INDEX IF NOT EXISTS idx_analytics_symbol_date ON analytics(symbol, date)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics(user_id, date)',
      
      // Notifications indexes
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_timestamp ON notifications(user_id, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)',
      
      // Users indexes
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)',
      
      // Bot performance indexes
      'CREATE INDEX IF NOT EXISTS idx_bots_user_active ON bots(user_id, active)',
      'CREATE INDEX IF NOT EXISTS idx_bot_performance_timestamp ON bot_performance(timestamp)'
    ];

    for (const index of indexes) {
      try {
        await this.executeOptimized(index);
        this.log('Index created', { index: index.substring(0, 50) });
      } catch (error) {
        if (!error.message.includes('already exists')) {
          this.log('Index creation error', { index, error: error.message });
        }
      }
    }

    this.log('Database indexes optimization complete');
  }

  /**
   * Analyze and optimize existing tables
   */
  async analyzeAndOptimize() {
    try {
      // Get all table names
      const tables = await this.executeOptimized(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );

      for (const table of tables) {
        const tableName = table.name;
        
        // Skip system tables
        if (tableName.startsWith('sqlite_')) continue;

        // Analyze table
        await this.executeOptimized(`ANALYZE ${tableName}`);
        
        // Get table info
        const tableInfo = await this.executeOptimized(`PRAGMA table_info(${tableName})`);
        
        this.log('Table analyzed', { 
          table: tableName, 
          columns: tableInfo.length 
        });
      }

      // Update global statistics
      await this.executeOptimized('ANALYZE');

      this.log('Database analysis complete');

    } catch (error) {
      this.log('Database analysis error', { error: error.message });
    }
  }

  /**
   * Get database performance statistics
   */
  async getStats() {
    try {
      const dbStats = await Promise.all([
        this.executeOptimized('PRAGMA cache_size'),
        this.executeOptimized('PRAGMA page_count'),
        this.executeOptimized('PRAGMA freelist_count'),
        this.executeOptimized('PRAGMA integrity_check(1)')
      ]);

      return {
        queries: this.stats,
        database: {
          cacheSize: dbStats[0][0]?.cache_size || 0,
          pageCount: dbStats[1][0]?.page_count || 0,
          freePages: dbStats[2][0]?.freelist_count || 0,
          integrity: dbStats[3][0]?.integrity_check === 'ok'
        },
        connectionPool: {
          total: this.connectionPool.length,
          inUse: this.connectionPool.filter(c => c.inUse).length,
          available: this.connectionPool.filter(c => !c.inUse).length
        },
        queryCache: {
          size: this.queryCache.size,
          hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0
        }
      };

    } catch (error) {
      this.log('Error getting database stats', { error: error.message });
      return this.stats;
    }
  }

  /**
   * Cleanup and maintenance operations
   */
  async cleanup() {
    try {
      // Vacuum database to optimize storage
      await this.executeOptimized('VACUUM');
      
      // Clean old cache entries
      const now = Date.now();
      for (const [key, value] of this.queryCache.entries()) {
        if (now - value.timestamp > 300000) { // 5 minutes
          this.queryCache.delete(key);
        }
      }

      this.log('Database cleanup complete');

    } catch (error) {
      this.log('Database cleanup error', { error: error.message });
    }
  }

  /**
   * Promise wrapper for database exec
   */
  execAsync(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Close database connections
   */
  async close() {
    try {
      // Close all pool connections
      for (const conn of this.connectionPool) {
        await new Promise((resolve) => {
          conn.db.close(resolve);
        });
      }

      // Close main connection
      if (this.db) {
        await new Promise((resolve) => {
          this.db.close(resolve);
        });
      }

      this.log('Database connections closed');

    } catch (error) {
      this.log('Error closing database connections', { error: error.message });
    }
  }

  /**
   * Log database operations
   * @private
   */
  log(message, data = {}) {
    if (logger && typeof logger.info === 'function') {
      logger.info(`[Database] ${message}`, { service: 'database-optimizer', ...data });
    } else {
      console.log(`[Database] ${message}`, data);
    }
  }
}

// Create singleton instance
let dbOptimizerInstance = null;

/**
 * Get database optimizer instance
 * @returns {DatabaseOptimizer} - Database optimizer instance
 */
function getDatabaseOptimizer() {
  if (!dbOptimizerInstance) {
    dbOptimizerInstance = new DatabaseOptimizer();
  }
  return dbOptimizerInstance;
}

module.exports = {
  DatabaseOptimizer,
  getDatabaseOptimizer
};