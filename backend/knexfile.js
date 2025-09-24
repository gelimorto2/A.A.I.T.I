require('dotenv').config();

const isPg = (process.env.DB_TYPE || 'sqlite') === 'postgresql';

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'aaiti',
      user: process.env.DB_USER || 'aaiti_user',
      password: process.env.DB_PASSWORD || 'aaiti_password'
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations'
    }
  },
  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations'
    }
  }
};
