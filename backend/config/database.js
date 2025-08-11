const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const logger = require('../utils/logger');
const { getCredentials } = require('../utils/credentials');

/**
 * Enhanced Database Configuration Module
 * Supports both SQLite and PostgreSQL with connection pooling
 * Part of TODO 1.1 Infrastructure Hardening implementation
 */

class DatabaseConfig {
  constructor() {
    this.type = process.env.DB_TYPE || 'sqlite';
    this.pools = new Map();
    this.connections = new Map();
    this.credentials = null;
  }

  async initialize() {
    this.credentials = getCredentials();
    
    logger.info('🔧 Initializing database configuration', {
      type: this.type,
      service: 'database-config'
    });

    if (this.type === 'postgresql') {
      await this.initializePostgreSQL();
    } else {
      await this.initializeSQLite();
    }
  }

  async initializePostgreSQL() {
    const config = {
      // Database connection
      host: process.env.DB_HOST || this.credentials?.database?.host || 'localhost',
      port: parseInt(process.env.DB_PORT) || this.credentials?.database?.port || 5432,
      database: process.env.DB_NAME || this.credentials?.database?.name || 'aaiti',
      user: process.env.DB_USER || this.credentials?.database?.user || 'aaiti_user',
      password: process.env.DB_PASSWORD || this.credentials?.database?.password || 'aaiti_password',
      
      // Connection pooling configuration
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 30000,
      
      // Performance optimizations
      application_name: 'AAITI_Backend',
      statement_timeout: 30000,
      query_timeout: 30000,
      
      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    };

    const primaryPool = new Pool(config);
    
    // Test connection
    try {
      const client = await primaryPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      logger.info('✅ PostgreSQL primary connection established', {
        host: config.host,
        database: config.database,
        poolMin: config.min,
        poolMax: config.max,
        service: 'database-config'
      });
    } catch (error) {
      logger.error('❌ Failed to connect to PostgreSQL', {
        error: error.message,
        service: 'database-config'
      });
      throw error;
    }

    this.pools.set('primary', primaryPool);

    // Setup read replica if configured
    if (process.env.DB_READ_HOST) {
      const readConfig = {
        ...config,
        host: process.env.DB_READ_HOST,
        port: parseInt(process.env.DB_READ_PORT) || config.port,
        max: Math.ceil(config.max * 0.7) // 70% of primary pool size
      };

      const readPool = new Pool(readConfig);
      
      try {
        const client = await readPool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        logger.info('✅ PostgreSQL read replica connection established', {
          host: readConfig.host,
          database: readConfig.database,
          service: 'database-config'
        });
        
        this.pools.set('read', readPool);
      } catch (error) {
        logger.warn('⚠️ Read replica unavailable, using primary for reads', {
          error: error.message,
          service: 'database-config'
        });
      }
    }

    this.setupPoolMonitoring();
  }

  async initializeSQLite() {
    const dbPath = this.credentials?.system?.dbPath || process.env.DB_PATH || './database/aaiti.sqlite';
    
    // SQLite performance optimization settings
    const pragmaSettings = {
      journal_mode: process.env.SQLITE_JOURNAL_MODE || 'WAL',
      synchronous: process.env.SQLITE_SYNCHRONOUS || 'NORMAL',
      cache_size: parseInt(process.env.SQLITE_CACHE_SIZE) || 10000,
      temp_store: process.env.SQLITE_TEMP_STORE || 'MEMORY',
      mmap_size: parseInt(process.env.SQLITE_MMAP_SIZE) || 268435456
    };

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('❌ Failed to connect to SQLite', {
            error: err.message,
            path: dbPath,
            service: 'database-config'
          });
          reject(err);
          return;
        }

        // Apply performance optimizations
        Object.entries(pragmaSettings).forEach(([key, value]) => {
          db.run(`PRAGMA ${key} = ${value}`, (err) => {
            if (err) {
              logger.warn(`⚠️ Failed to set PRAGMA ${key}`, {
                error: err.message,
                service: 'database-config'
              });
            }
          });
        });

        logger.info('✅ SQLite connection established with optimizations', {
          path: dbPath,
          optimizations: pragmaSettings,
          service: 'database-config'
        });

        this.connections.set('primary', db);
        resolve(db);
      });
    });
  }

  setupPoolMonitoring() {
    // Monitor connection pool health every 30 seconds
    setInterval(() => {
      this.pools.forEach((pool, name) => {
        const stats = {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        };

        logger.debug(`📊 Pool ${name} statistics`, {
          ...stats,
          utilization: `${Math.round(((stats.totalCount - stats.idleCount) / pool.options.max) * 100)}%`,
          service: 'database-config'
        });

        // Alert on high utilization
        const utilization = (stats.totalCount - stats.idleCount) / pool.options.max;
        if (utilization > 0.8) {
          logger.warn('🔥 High database pool utilization detected', {
            poolName: name,
            utilization: `${Math.round(utilization * 100)}%`,
            totalConnections: stats.totalCount,
            maxConnections: pool.options.max,
            service: 'database-config'
          });
        }
      });
    }, 30000);
  }

  getPool(type = 'primary') {
    if (this.type === 'postgresql') {
      return this.pools.get(type) || this.pools.get('primary');
    }
    return null;
  }

  getConnection(type = 'primary') {
    if (this.type === 'sqlite') {
      return this.connections.get('primary');
    }
    return null;
  }

  async query(sql, params = [], useReadReplica = false) {
    if (this.type === 'postgresql') {
      const poolType = useReadReplica && this.pools.has('read') ? 'read' : 'primary';
      const pool = this.pools.get(poolType);
      
      const start = Date.now();
      try {
        const result = await pool.query(sql, params);
        const duration = Date.now() - start;
        
        logger.debug('📊 Query executed', {
          duration: `${duration}ms`,
          poolType,
          rowCount: result.rowCount,
          service: 'database-config'
        });
        
        return result;
      } catch (error) {
        logger.error('❌ Query execution failed', {
          error: error.message,
          sql: sql.substring(0, 100) + '...',
          poolType,
          service: 'database-config'
        });
        throw error;
      }
    } else {
      const db = this.connections.get('primary');
      return new Promise((resolve, reject) => {
        const start = Date.now();
        
        if (sql.toLowerCase().startsWith('select')) {
          db.all(sql, params, (err, rows) => {
            const duration = Date.now() - start;
            if (err) {
              logger.error('❌ SQLite query failed', {
                error: err.message,
                sql: sql.substring(0, 100) + '...',
                service: 'database-config'
              });
              reject(err);
            } else {
              logger.debug('📊 SQLite query executed', {
                duration: `${duration}ms`,
                rowCount: rows.length,
                service: 'database-config'
              });
              resolve({ rows, rowCount: rows.length });
            }
          });
        } else {
          db.run(sql, params, function(err) {
            const duration = Date.now() - start;
            if (err) {
              logger.error('❌ SQLite command failed', {
                error: err.message,
                sql: sql.substring(0, 100) + '...',
                service: 'database-config'
              });
              reject(err);
            } else {
              logger.debug('📊 SQLite command executed', {
                duration: `${duration}ms`,
                changes: this.changes,
                service: 'database-config'
              });
              resolve({ rowCount: this.changes, lastID: this.lastID });
            }
          });
        }
      });
    }
  }

  async close() {
    logger.info('🔌 Closing database connections', {
      service: 'database-config'
    });

    if (this.type === 'postgresql') {
      for (const [name, pool] of this.pools) {
        try {
          await pool.end();
          logger.info(`✅ Closed PostgreSQL pool: ${name}`, {
            service: 'database-config'
          });
        } catch (error) {
          logger.error(`❌ Error closing pool ${name}`, {
            error: error.message,
            service: 'database-config'
          });
        }
      }
    } else {
      for (const [name, db] of this.connections) {
        db.close((err) => {
          if (err) {
            logger.error(`❌ Error closing SQLite connection ${name}`, {
              error: err.message,
              service: 'database-config'
            });
          } else {
            logger.info(`✅ Closed SQLite connection: ${name}`, {
              service: 'database-config'
            });
          }
        });
      }
    }
  }

  getStats() {
    const stats = {
      type: this.type,
      timestamp: new Date().toISOString()
    };

    if (this.type === 'postgresql') {
      stats.pools = {};
      this.pools.forEach((pool, name) => {
        stats.pools[name] = {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
          maxConnections: pool.options.max,
          utilization: Math.round(((pool.totalCount - pool.idleCount) / pool.options.max) * 100)
        };
      });
    } else {
      stats.connections = {
        primary: this.connections.has('primary') ? 'connected' : 'disconnected'
      };
    }

    return stats;
  }
}

module.exports = new DatabaseConfig();