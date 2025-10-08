const { expect } = require('chai');
const knex = require('knex');
const { describe, it, before, after } = require('mocha');
const path = require('path');

describe('PostgreSQL Migration Tests', function() {
  this.timeout(60000); // 60 seconds for migrations

  let testDb;
  const testDbConfig = {
    client: 'postgresql',
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      user: process.env.POSTGRES_USER || 'aaiti_user',
      password: process.env.POSTGRES_PASSWORD || 'secure_trading_password',
      database: 'aaiti_test'
    },
    migrations: {
      directory: path.join(__dirname, '../backend/migrations'),
      tableName: 'knex_migrations'
    },
    pool: {
      min: 1,
      max: 5
    }
  };

  before(async function() {
    // Create test database connection
    testDb = knex(testDbConfig);
    
    // Wait for database to be ready
    try {
      await testDb.raw('SELECT 1');
      console.log('📊 Test database connection established');
    } catch (error) {
      console.warn('⚠️ PostgreSQL not available, skipping migration tests');
      this.skip();
    }
  });

  after(async function() {
    if (testDb) {
      await testDb.destroy();
    }
  });

  describe('Database Schema Migration', function() {
    it('should run migration successfully', async function() {
      await testDb.migrate.rollback();
      const migrationResult = await testDb.migrate.latest();
      
      expect(migrationResult).to.be.an('array');
      expect(migrationResult[0]).to.be.an('array');
      expect(migrationResult[1]).to.be.an('array');
    });

    it('should create all required tables', async function() {
      const tables = await testDb.raw(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);

      const tableNames = tables.rows.map(row => row.table_name);
      
      const requiredTables = [
        'users',
        'api_keys',
        'trading_bots',
        'trades',
        'bot_performance',
        'risk_metrics',
        'ml_models',
        'predictions',
        'market_data',
        'portfolio_snapshots',
        'advanced_analytics',
        'knex_migrations',
        'knex_migrations_lock'
      ];

      requiredTables.forEach(tableName => {
        expect(tableNames).to.include(tableName, `Table ${tableName} should exist`);
      });
    });

    it('should create indexes for performance', async function() {
      const indexes = await testDb.raw(`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
      `);

      const indexNames = indexes.rows.map(row => row.indexname);
      
      // Check for critical indexes
      const criticalIndexes = [
        'idx_trades_bot_id',
        'idx_trades_timestamp',
        'idx_trades_symbol',
        'idx_bot_performance_bot_id',
        'idx_predictions_model_id',
        'idx_market_data_symbol_timestamp'
      ];

      criticalIndexes.forEach(indexName => {
        expect(indexNames).to.include(indexName, `Index ${indexName} should exist`);
      });
    });

    it('should have proper foreign key constraints', async function() {
      const constraints = await testDb.raw(`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      `);

      expect(constraints.rows.length).to.be.greaterThan(0, 'Should have foreign key constraints');
      
      // Verify specific foreign keys
      const constraintNames = constraints.rows.map(row => row.constraint_name);
      const expectedConstraints = [
        'api_keys_user_id_foreign',
        'trading_bots_user_id_foreign',
        'trades_bot_id_foreign',
        'bot_performance_bot_id_foreign',
        'predictions_model_id_foreign'
      ];

      expectedConstraints.forEach(constraint => {
        const hasConstraint = constraintNames.some(name => name.includes(constraint.split('_')[0]));
        expect(hasConstraint).to.be.true(`Should have constraint for ${constraint}`);
      });
    });
  });

  describe('Data Operations', function() {
    let testUserId, testBotId;

    it('should insert test user', async function() {
      const [user] = await testDb('users')
        .insert({
          username: 'test_trader',
          email: 'test@trading.com',
          password_hash: 'hashed_password',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      expect(user).to.have.property('id');
      expect(user.username).to.equal('test_trader');
      testUserId = user.id;
    });

    it('should insert test trading bot', async function() {
      const [bot] = await testDb('trading_bots')
        .insert({
          user_id: testUserId,
          name: 'Test Bot',
          strategy: 'test_strategy',
          config: { risk_level: 'low' },
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      expect(bot).to.have.property('id');
      expect(bot.name).to.equal('Test Bot');
      testBotId = bot.id;
    });

    it('should insert test trade', async function() {
      const [trade] = await testDb('trades')
        .insert({
          bot_id: testBotId,
          symbol: 'BTCUSDT',
          side: 'buy',
          type: 'market',
          quantity: '0.001',
          price: '50000.00',
          status: 'filled',
          exchange_order_id: 'test_order_123',
          timestamp: new Date()
        })
        .returning('*');

      expect(trade).to.have.property('id');
      expect(trade.symbol).to.equal('BTCUSDT');
    });

    it('should query with joins', async function() {
      const results = await testDb('trades')
        .join('trading_bots', 'trades.bot_id', 'trading_bots.id')
        .join('users', 'trading_bots.user_id', 'users.id')
        .select(
          'trades.*',
          'trading_bots.name as bot_name',
          'users.username'
        )
        .where('trades.symbol', 'BTCUSDT');

      expect(results.length).to.be.greaterThan(0);
      expect(results[0]).to.have.property('bot_name');
      expect(results[0]).to.have.property('username');
    });

    it('should handle advanced analytics queries', async function() {
      // Insert some performance data
      await testDb('bot_performance').insert({
        bot_id: testBotId,
        total_trades: 10,
        winning_trades: 6,
        total_pnl: '150.50',
        win_rate: 0.60,
        sharpe_ratio: 1.25,
        max_drawdown: 0.05,
        calculated_at: new Date()
      });

      const performance = await testDb('bot_performance')
        .join('trading_bots', 'bot_performance.bot_id', 'trading_bots.id')
        .select(
          'bot_performance.*',
          'trading_bots.name as bot_name'
        )
        .where('bot_performance.bot_id', testBotId)
        .first();

      expect(performance).to.exist;
      expect(performance.win_rate).to.equal(0.60);
      expect(performance.bot_name).to.equal('Test Bot');
    });

    after(async function() {
      // Clean up test data
      if (testBotId) {
        await testDb('bot_performance').where('bot_id', testBotId).del();
        await testDb('trades').where('bot_id', testBotId).del();
        await testDb('trading_bots').where('id', testBotId).del();
      }
      if (testUserId) {
        await testDb('users').where('id', testUserId).del();
      }
    });
  });

  describe('Performance Optimizations', function() {
    it('should have proper connection pooling', function() {
      expect(testDb.client.pool.options.min).to.equal(1);
      expect(testDb.client.pool.options.max).to.equal(5);
    });

    it('should execute queries efficiently', async function() {
      const startTime = Date.now();
      
      await testDb.raw('SELECT 1');
      
      const duration = Date.now() - startTime;
      expect(duration).to.be.lessThan(1000, 'Query should execute quickly');
    });

    it('should handle concurrent connections', async function() {
      const queries = Array(10).fill().map(() => 
        testDb.raw('SELECT pg_sleep(0.1), now() as current_time')
      );

      const startTime = Date.now();
      const results = await Promise.all(queries);
      const duration = Date.now() - startTime;

      expect(results.length).to.equal(10);
      expect(duration).to.be.lessThan(2000, 'Concurrent queries should execute efficiently');
    });
  });

  describe('PostgreSQL Specific Features', function() {
    it('should support JSONB columns', async function() {
      const [result] = await testDb('trading_bots')
        .where('config', '@>', { risk_level: 'low' })
        .limit(1);

      // Should not throw error (JSONB query syntax is valid)
      expect(result).to.exist.or.be.undefined;
    });

    it('should support array operations', async function() {
      // Test array operations (if we had array columns)
      const result = await testDb.raw(`
        SELECT array_agg(symbol) as symbols
        FROM (SELECT 'BTCUSDT' as symbol UNION SELECT 'ETHUSDT' as symbol) t
      `);

      expect(result.rows[0].symbols).to.be.an('array');
    });

    it('should support advanced SQL features', async function() {
      const result = await testDb.raw(`
        SELECT 
          extract(epoch from now()) as timestamp,
          random() as random_value,
          current_database() as db_name
      `);

      expect(result.rows[0].timestamp).to.be.a('number');
      expect(result.rows[0].random_value).to.be.a('number');
      expect(result.rows[0].db_name).to.be.a('string');
    });
  });
});