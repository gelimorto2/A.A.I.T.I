const { Pool } = require('pg');
const logger = require('../utils/logger');

/**
 * PostgreSQL Database Manager for Microservices
 */
class DatabaseManager {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.pool = null;
    this.config = this.getConfig();
  }

  getConfig() {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'aaiti',
      user: process.env.DB_USER || 'aaiti_user',
      password: process.env.DB_PASSWORD || 'aaiti_password',
      // Connection pool settings
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    };
  }

  async connect() {
    try {
      this.pool = new Pool(this.config);

      // Test the connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      logger.info(`✅ Database connected successfully for ${this.serviceName}`, {
        service: this.serviceName,
        database: this.config.database,
        host: this.config.host,
        port: this.config.port,
        poolMax: this.config.max,
        timestamp: result.rows[0].now
      });

      return this.pool;
    } catch (error) {
      logger.error(`❌ Database connection failed for ${this.serviceName}`, {
        service: this.serviceName,
        error: error.message,
        host: this.config.host,
        port: this.config.port,
        database: this.config.database
      });
      throw error;
    }
  }

  async query(text, params = []) {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug(`📊 Database query executed`, {
        service: this.serviceName,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rowCount: result.rowCount
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`❌ Database query failed`, {
        service: this.serviceName,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  }

  async transaction(callback) {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      logger.debug(`✅ Transaction completed successfully`, {
        service: this.serviceName
      });
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`❌ Transaction rolled back`, {
        service: this.serviceName,
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async createTables(tableDefinitions) {
    if (!Array.isArray(tableDefinitions)) {
      tableDefinitions = [tableDefinitions];
    }

    for (const tableDef of tableDefinitions) {
      try {
        await this.query(tableDef);
        logger.info(`✅ Table created/updated successfully`, {
          service: this.serviceName,
          table: this.extractTableName(tableDef)
        });
      } catch (error) {
        logger.error(`❌ Failed to create/update table`, {
          service: this.serviceName,
          table: this.extractTableName(tableDef),
          error: error.message
        });
        throw error;
      }
    }
  }

  extractTableName(sql) {
    const match = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?([^\s(]+)/i);
    return match ? match[1] : 'unknown';
  }

  async healthCheck() {
    try {
      if (!this.pool) {
        return { healthy: false, error: 'Pool not initialized' };
      }

      const result = await this.query('SELECT 1 as health_check');
      return {
        healthy: true,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info(`🔌 Database connection closed for ${this.serviceName}`, {
        service: this.serviceName
      });
    }
  }
}

module.exports = DatabaseManager;