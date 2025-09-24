/**
 * Initial core tables for PostgreSQL
 */

exports.up = async function(knex) {
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary();
    t.string('username').notNullable().unique();
    t.string('email').notNullable().unique();
    t.string('password_hash').notNullable();
    t.string('role').defaultTo('trader');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.timestamp('last_login');
    t.boolean('is_active').defaultTo(true);
  });

  await knex.schema.createTable('bots', (t) => {
    t.uuid('id').primary();
    t.string('name').notNullable();
    t.text('description');
    t.uuid('user_id').notNullable().references('users.id');
    t.string('strategy_type').notNullable();
    t.string('trading_mode').defaultTo('paper');
    t.string('status').defaultTo('stopped');
    t.jsonb('config');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('trades', (t) => {
    t.uuid('id').primary();
    t.uuid('bot_id').notNullable().references('bots.id');
    t.uuid('signal_id');
    t.string('symbol').notNullable();
    t.string('side').notNullable();
    t.decimal('quantity', 32, 12).notNullable();
    t.decimal('entry_price', 32, 12).notNullable();
    t.decimal('exit_price', 32, 12);
    t.decimal('pnl', 32, 12);
    t.decimal('commission', 32, 12);
    t.string('status').defaultTo('open');
    t.timestamp('opened_at').defaultTo(knex.fn.now());
    t.timestamp('closed_at');
  });

  // Paper trading tables
  await knex.schema.createTable('paper_portfolios', (t) => {
    t.uuid('id').primary();
    t.uuid('user_id').notNullable().references('users.id');
    t.string('name').notNullable();
    t.decimal('initial_balance', 32, 12).notNullable();
    t.decimal('current_balance', 32, 12).notNullable();
    t.string('currency').defaultTo('USD');
    t.string('risk_profile').defaultTo('moderate');
    t.text('trading_strategy');
    t.string('status').defaultTo('active');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('paper_orders', (t) => {
    t.uuid('id').primary();
    t.uuid('portfolio_id').notNullable().references('paper_portfolios.id');
    t.uuid('user_id').notNullable().references('users.id');
    t.string('symbol').notNullable();
    t.string('side').notNullable();
    t.string('type').notNullable();
    t.decimal('quantity', 32, 12).notNullable();
    t.decimal('price', 32, 12);
    t.decimal('stop_price', 32, 12);
    t.string('time_in_force').defaultTo('GTC');
    t.string('status').defaultTo('pending');
    t.decimal('filled_quantity', 32, 12).defaultTo(0);
    t.decimal('avg_fill_price', 32, 12).defaultTo(0);
    t.decimal('commission', 32, 12).defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('paper_trades', (t) => {
    t.uuid('id').primary();
    t.uuid('portfolio_id').notNullable().references('paper_portfolios.id');
    t.uuid('user_id').notNullable().references('users.id');
    t.uuid('order_id').references('paper_orders.id');
    t.string('symbol').notNullable();
    t.string('side').notNullable();
    t.decimal('quantity', 32, 12).notNullable();
    t.decimal('price', 32, 12).notNullable();
    t.decimal('commission', 32, 12).defaultTo(0);
    t.decimal('realized_pnl', 32, 12).defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('paper_positions', (t) => {
    t.uuid('id').primary();
    t.uuid('portfolio_id').notNullable().references('paper_portfolios.id');
    t.string('symbol').notNullable();
    t.decimal('quantity', 32, 12).notNullable();
    t.decimal('avg_price', 32, 12).notNullable();
    t.decimal('total_cost', 32, 12).notNullable();
    t.decimal('unrealized_pnl', 32, 12).defaultTo(0);
    t.decimal('realized_pnl', 32, 12).defaultTo(0);
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['portfolio_id', 'symbol']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('paper_positions');
  await knex.schema.dropTableIfExists('paper_trades');
  await knex.schema.dropTableIfExists('paper_orders');
  await knex.schema.dropTableIfExists('paper_portfolios');
  await knex.schema.dropTableIfExists('trades');
  await knex.schema.dropTableIfExists('bots');
  await knex.schema.dropTableIfExists('users');
};
