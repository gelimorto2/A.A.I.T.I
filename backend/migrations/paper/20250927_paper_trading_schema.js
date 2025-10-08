exports.up = function(knex) {
  return Promise.all([
    // Accounts table - Paper trading accounts
    knex.schema.createTable('accounts', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('type').notNullable().defaultTo('paper');
      table.string('exchange').notNullable();
      table.text('credentials'); // Encrypted credentials
      table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
      table.text('metadata'); // JSON metadata
      table.timestamps(true, true);
      
      table.index(['type', 'exchange']);
      table.index('status');
    }),

    // Orders table - Paper trading orders
    knex.schema.createTable('orders', table => {
      table.increments('id').primary();
      table.integer('account_id').unsigned().notNullable();
      table.string('exchange_order_id').nullable(); // External exchange order ID
      table.string('symbol').notNullable();
      table.enum('side', ['buy', 'sell']).notNullable();
      table.enum('type', ['market', 'limit', 'stop', 'stop_limit']).notNullable();
      table.decimal('quantity', 20, 8).notNullable();
      table.decimal('price', 20, 8).nullable();
      table.decimal('stop_price', 20, 8).nullable();
      table.enum('status', ['pending', 'open', 'filled', 'partially_filled', 'cancelled', 'rejected']).defaultTo('pending');
      table.decimal('filled_quantity', 20, 8).defaultTo(0);
      table.decimal('remaining_quantity', 20, 8).notNullable();
      table.decimal('avg_fill_price', 20, 8).nullable();
      table.decimal('fee', 20, 8).defaultTo(0);
      table.string('fee_currency', 10).defaultTo('USD');
      table.text('metadata'); // JSON metadata
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.index(['account_id', 'status']);
      table.index(['symbol', 'created_at']);
      table.index('exchange_order_id');
    }),

    // Trades table - Paper trading executions
    knex.schema.createTable('trades', table => {
      table.increments('id').primary();
      table.integer('account_id').unsigned().notNullable();
      table.integer('order_id').unsigned().notNullable();
      table.string('exchange_trade_id').nullable();
      table.string('symbol').notNullable();
      table.enum('side', ['buy', 'sell']).notNullable();
      table.decimal('quantity', 20, 8).notNullable();
      table.decimal('price', 20, 8).notNullable();
      table.decimal('fee', 20, 8).defaultTo(0);
      table.string('fee_currency', 10).defaultTo('USD');
      table.decimal('pnl', 20, 8).defaultTo(0); // Realized P&L
      table.text('metadata'); // JSON metadata
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.foreign('order_id').references('orders.id').onDelete('CASCADE');
      table.index(['account_id', 'created_at']);
      table.index(['symbol', 'created_at']);
      table.index('exchange_trade_id');
    }),

    // Positions table - Paper trading positions
    knex.schema.createTable('positions', table => {
      table.increments('id').primary();
      table.integer('account_id').unsigned().notNullable();
      table.string('symbol').notNullable();
      table.decimal('quantity', 20, 8).notNullable();
      table.decimal('avg_price', 20, 8).notNullable();
      table.decimal('market_value', 20, 8).notNullable();
      table.decimal('unrealized_pnl', 20, 8).defaultTo(0);
      table.decimal('realized_pnl', 20, 8).defaultTo(0);
      table.timestamp('opened_at').notNullable();
      table.timestamp('closed_at').nullable();
      table.enum('status', ['open', 'closed']).defaultTo('open');
      table.text('metadata'); // JSON metadata
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.unique(['account_id', 'symbol']);
      table.index(['account_id', 'status']);
      table.index('symbol');
    }),

    // Balances table - Paper trading balances
    knex.schema.createTable('balances', table => {
      table.increments('id').primary();
      table.integer('account_id').unsigned().notNullable();
      table.string('currency', 10).notNullable();
      table.decimal('available', 20, 8).notNullable().defaultTo(0);
      table.decimal('locked', 20, 8).notNullable().defaultTo(0);
      table.decimal('total', 20, 8).notNullable().defaultTo(0);
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.unique(['account_id', 'currency']);
      table.index('account_id');
    }),

    // Performance metrics table - Paper trading performance
    knex.schema.createTable('performance_metrics', table => {
      table.increments('id').primary();
      table.integer('account_id').unsigned().notNullable();
      table.date('date').notNullable();
      table.decimal('portfolio_value', 20, 8).notNullable();
      table.decimal('cash_balance', 20, 8).notNullable();
      table.decimal('total_pnl', 20, 8).defaultTo(0);
      table.decimal('daily_pnl', 20, 8).defaultTo(0);
      table.decimal('max_drawdown', 20, 8).defaultTo(0);
      table.integer('trades_count').defaultTo(0);
      table.decimal('win_rate', 5, 4).defaultTo(0); // Percentage as decimal
      table.decimal('sharpe_ratio', 10, 6).nullable();
      table.text('metadata'); // JSON metadata
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.unique(['account_id', 'date']);
      table.index(['account_id', 'date']);
    }),

    // Risk events table - Paper trading risk events
    knex.schema.createTable('risk_events', table => {
      table.increments('id').primary();
      table.integer('account_id').unsigned().notNullable();
      table.enum('event_type', ['position_limit', 'drawdown_limit', 'exposure_limit', 'volatility_alert', 'margin_call']).notNullable();
      table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable();
      table.string('description').notNullable();
      table.text('details'); // JSON details
      table.enum('status', ['open', 'acknowledged', 'resolved']).defaultTo('open');
      table.timestamp('acknowledged_at').nullable();
      table.timestamp('resolved_at').nullable();
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.index(['account_id', 'status']);
      table.index(['event_type', 'severity']);
      table.index('created_at');
    }),

    // Audit logs table - Paper trading audit trail
    knex.schema.createTable('audit_logs', table => {
      table.increments('id').primary();
      table.string('event_type').notNullable();
      table.integer('account_id').unsigned().nullable();
      table.integer('user_id').unsigned().nullable();
      table.string('description').notNullable();
      table.text('metadata'); // JSON metadata
      table.string('ip_address').nullable();
      table.text('user_agent').nullable();
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('SET NULL');
      table.index(['account_id', 'created_at']);
      table.index(['event_type', 'created_at']);
      table.index('created_at');
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('audit_logs'),
    knex.schema.dropTableIfExists('risk_events'),
    knex.schema.dropTableIfExists('performance_metrics'),
    knex.schema.dropTableIfExists('balances'),
    knex.schema.dropTableIfExists('positions'),
    knex.schema.dropTableIfExists('trades'),
    knex.schema.dropTableIfExists('orders'),
    knex.schema.dropTableIfExists('accounts')
  ]);
};