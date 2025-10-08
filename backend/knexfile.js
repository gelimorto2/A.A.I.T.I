require('dotenv').config();

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

// Production PostgreSQL connection with optimizations
const productionConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'aaiti_prod',
    user: process.env.DB_USER || 'aaiti_user',
    password: process.env.DB_PASSWORD || 'aaiti_secure_password_2025',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // Connection pool optimizations for trading
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      max: parseInt(process.env.DB_POOL_MAX) || 50,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false
    },
    // PostgreSQL-specific optimizations
    options: {
      application_name: 'AAITI_Trading_Platform',
      statement_timeout: 30000,
      query_timeout: 30000,
      timezone: 'UTC'
    }
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
    schemaName: 'public'
  },
  seeds: {
    directory: './seeds'
  },
  // Performance optimizations
  asyncStackTraces: !isProduction,
  debug: isDevelopment,
  acquireConnectionTimeout: 30000
};

// Test configuration with separate test database
const testConfig = {
  ...productionConfig,
  connection: {
    ...productionConfig.connection,
    database: process.env.DB_NAME_TEST || 'aaiti_test',
    pool: {
      min: 1,
      max: 5
    }
  }
};

// Development configuration (can use SQLite or PostgreSQL)
const developmentConfig = process.env.DB_TYPE === 'sqlite' ? {
  client: 'sqlite3',
  connection: {
    filename: process.env.DB_PATH || './database/aaiti.sqlite'
  },
  useNullAsDefault: true,
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations'
  },
  pool: {
    afterCreate: (conn, cb) => {
      // SQLite performance optimizations
      conn.run('PRAGMA journal_mode = WAL;');
      conn.run('PRAGMA synchronous = NORMAL;');
      conn.run('PRAGMA cache_size = 10000;');
      conn.run('PRAGMA temp_store = MEMORY;');
      cb();
    }
  }
} : productionConfig;

module.exports = {
  development: developmentConfig,
  test: testConfig,
  production: productionConfig
};
