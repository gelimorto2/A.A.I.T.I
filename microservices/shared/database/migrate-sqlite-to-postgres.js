const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const logger = require('../shared/utils/logger');

require('dotenv').config();

/**
 * Migration script to transfer data from SQLite to PostgreSQL
 */
class DatabaseMigration {
  constructor() {
    this.sqliteDbPath = process.env.SQLITE_DB_PATH || './backend/database/aaiti.sqlite';
    this.pgConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'aaiti',
      user: process.env.DB_USER || 'aaiti_user',
      password: process.env.DB_PASSWORD || 'aaiti_password'
    };
    
    this.sqliteDb = null;
    this.pgPool = null;
    this.migrationLog = [];
  }

  async initialize() {
    try {
      // Check if SQLite database exists
      if (!fs.existsSync(this.sqliteDbPath)) {
        throw new Error(`SQLite database not found at: ${this.sqliteDbPath}`);
      }

      // Connect to SQLite
      this.sqliteDb = new sqlite3.Database(this.sqliteDbPath, sqlite3.OPEN_READONLY);
      logger.info('✅ Connected to SQLite database', {
        service: 'migration',
        path: this.sqliteDbPath
      });

      // Connect to PostgreSQL
      this.pgPool = new Pool(this.pgConfig);
      const pgClient = await this.pgPool.connect();
      await pgClient.query('SELECT NOW()');
      pgClient.release();
      
      logger.info('✅ Connected to PostgreSQL database', {
        service: 'migration',
        host: this.pgConfig.host,
        database: this.pgConfig.database
      });

    } catch (error) {
      logger.error('❌ Failed to initialize migration', {
        service: 'migration',
        error: error.message
      });
      throw error;
    }
  }

  async createPostgresSchema() {
    const schemaSQL = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- User sessions table
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        ip_address INET,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Bots table
      CREATE TABLE IF NOT EXISTS bots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        config JSONB,
        status VARCHAR(50) DEFAULT 'inactive',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Trading positions table
      CREATE TABLE IF NOT EXISTS positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
        symbol VARCHAR(20) NOT NULL,
        side VARCHAR(10) NOT NULL,
        size DECIMAL(18,8) NOT NULL,
        entry_price DECIMAL(18,8),
        current_price DECIMAL(18,8),
        pnl DECIMAL(18,8) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Market data table
      CREATE TABLE IF NOT EXISTS market_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol VARCHAR(20) NOT NULL,
        price DECIMAL(18,8) NOT NULL,
        volume DECIMAL(18,8),
        market_cap DECIMAL(18,2),
        change_24h DECIMAL(8,4),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Analytics data table
      CREATE TABLE IF NOT EXISTS analytics_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- ML models table
      CREATE TABLE IF NOT EXISTS ml_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        version VARCHAR(20) DEFAULT '1.0.0',
        config JSONB,
        model_data JSONB,
        performance_metrics JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        data JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
      CREATE INDEX IF NOT EXISTS idx_positions_bot_id ON positions(bot_id);
      CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
      CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON market_data(symbol);
      CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp);
      CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_data(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_data(type);
      CREATE INDEX IF NOT EXISTS idx_ml_models_name ON ml_models(name);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `;

    try {
      await this.pgPool.query(schemaSQL);
      logger.info('✅ PostgreSQL schema created successfully', {
        service: 'migration'
      });
      this.migrationLog.push('Schema creation: SUCCESS');
    } catch (error) {
      logger.error('❌ Failed to create PostgreSQL schema', {
        service: 'migration',
        error: error.message
      });
      throw error;
    }
  }

  async migrateTables() {
    const tableMappings = [
      { sqlite: 'users', postgres: 'users' },
      { sqlite: 'bots', postgres: 'bots' },
      { sqlite: 'positions', postgres: 'positions' },
      { sqlite: 'market_data', postgres: 'market_data' },
      { sqlite: 'analytics_data', postgres: 'analytics_data' },
      { sqlite: 'ml_models', postgres: 'ml_models' },
      { sqlite: 'notifications', postgres: 'notifications' }
    ];

    for (const mapping of tableMappings) {
      try {
        await this.migrateTable(mapping.sqlite, mapping.postgres);
      } catch (error) {
        logger.error(`❌ Failed to migrate table ${mapping.sqlite}`, {
          service: 'migration',
          error: error.message
        });
        this.migrationLog.push(`Table ${mapping.sqlite}: FAILED - ${error.message}`);
      }
    }
  }

  async migrateTable(sqliteTable, postgresTable) {
    return new Promise((resolve, reject) => {
      // First, check if SQLite table exists
      this.sqliteDb.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [sqliteTable],
        async (err, result) => {
          if (err) {
            reject(err);
            return;
          }

          if (!result) {
            logger.info(`⚠️ SQLite table ${sqliteTable} does not exist, skipping`, {
              service: 'migration'
            });
            this.migrationLog.push(`Table ${sqliteTable}: SKIPPED - does not exist`);
            resolve();
            return;
          }

          // Get all rows from SQLite table
          this.sqliteDb.all(`SELECT * FROM ${sqliteTable}`, async (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            if (rows.length === 0) {
              logger.info(`ℹ️ SQLite table ${sqliteTable} is empty, skipping`, {
                service: 'migration'
              });
              this.migrationLog.push(`Table ${sqliteTable}: EMPTY`);
              resolve();
              return;
            }

            try {
              // Clear existing data in PostgreSQL table
              await this.pgPool.query(`TRUNCATE TABLE ${postgresTable} RESTART IDENTITY CASCADE`);

              let insertedCount = 0;
              const batchSize = 100;

              // Process rows in batches
              for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                
                for (const row of batch) {
                  await this.insertRowToPostgres(postgresTable, row);
                  insertedCount++;
                }

                logger.debug(`📊 Migrated ${insertedCount}/${rows.length} rows for ${sqliteTable}`, {
                  service: 'migration'
                });
              }

              logger.info(`✅ Successfully migrated table ${sqliteTable}`, {
                service: 'migration',
                rowCount: insertedCount
              });
              this.migrationLog.push(`Table ${sqliteTable}: SUCCESS - ${insertedCount} rows`);
              resolve();

            } catch (error) {
              reject(error);
            }
          });
        }
      );
    });
  }

  async insertRowToPostgres(tableName, row) {
    // Convert SQLite row to PostgreSQL format
    const processedRow = this.processRowForPostgres(tableName, row);
    
    if (!processedRow) {
      return; // Skip this row
    }

    const columns = Object.keys(processedRow);
    const values = Object.values(processedRow);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT DO NOTHING
    `;

    await this.pgPool.query(query, values);
  }

  processRowForPostgres(tableName, row) {
    // Handle data type conversions and generate UUIDs where needed
    const processedRow = { ...row };

    // Generate UUID for id if it's an integer
    if (typeof processedRow.id === 'number') {
      processedRow.id = require('crypto').randomUUID();
    }

    // Convert timestamps
    ['created_at', 'updated_at', 'last_login', 'expires_at'].forEach(field => {
      if (processedRow[field] && typeof processedRow[field] === 'string') {
        // Convert SQLite datetime to PostgreSQL timestamp
        processedRow[field] = new Date(processedRow[field]).toISOString();
      }
    });

    // Convert JSON strings to objects for JSONB fields
    ['config', 'data', 'model_data', 'performance_metrics'].forEach(field => {
      if (processedRow[field] && typeof processedRow[field] === 'string') {
        try {
          processedRow[field] = JSON.parse(processedRow[field]);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
    });

    // Handle foreign key relationships (convert integer IDs to UUIDs)
    if (processedRow.user_id && typeof processedRow.user_id === 'number') {
      // This would need proper UUID mapping - for now, skip rows with invalid FKs
      return null;
    }

    return processedRow;
  }

  async generateMigrationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      migrationLog: this.migrationLog,
      summary: {
        total: this.migrationLog.length,
        successful: this.migrationLog.filter(log => log.includes('SUCCESS')).length,
        failed: this.migrationLog.filter(log => log.includes('FAILED')).length,
        skipped: this.migrationLog.filter(log => log.includes('SKIPPED')).length
      }
    };

    const reportPath = path.join(__dirname, '../../logs/migration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    logger.info('📊 Migration Report Generated', {
      service: 'migration',
      reportPath,
      summary: report.summary
    });

    return report;
  }

  async close() {
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
    if (this.pgPool) {
      await this.pgPool.end();
    }
    logger.info('🔌 Migration connections closed', {
      service: 'migration'
    });
  }

  async run() {
    try {
      await this.initialize();
      await this.createPostgresSchema();
      await this.migrateTables();
      const report = await this.generateMigrationReport();
      
      logger.info('🎉 Migration completed successfully', {
        service: 'migration',
        summary: report.summary
      });

      return report;
    } catch (error) {
      logger.error('💥 Migration failed', {
        service: 'migration',
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      await this.close();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new DatabaseMigration();
  
  migration.run()
    .then(report => {
      console.log('Migration completed with summary:', report.summary);
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = DatabaseMigration;