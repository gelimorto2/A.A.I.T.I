exports.up = function(knex) {
  return Promise.all([
    // Accounts table - Live trading accounts
    knex.schema.createTable('accounts', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('type').notNullable().defaultTo('live');
      table.string('exchange').notNullable();
      table.text('credentials'); // Encrypted credentials
      table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
      table.text('metadata'); // JSON metadata
      table.boolean('verified').defaultTo(false); // KYC/verification status
      table.decimal('daily_limit', 20, 8).nullable(); // Daily trading limit
      table.decimal('position_limit', 20, 8).nullable(); // Position size limit
      table.timestamps(true, true);
      
      table.index(['type', 'exchange']);
      table.index('status');
      table.index('verified');
    }),

    // Orders table - Live trading orders
    knex.schema.createTable('orders', table => {
      table.increments('id').primary();
      table.integer('account_id').unsigned().notNullable();
      table.string('exchange_order_id').nullable(); // External exchange order ID
      table.string('symbol').notNullable();
      table.enum('side', ['buy', 'sell']).notNullable();
      table.enum('type', ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop']).notNullable();
      table.decimal('quantity', 20, 8).notNullable();
      table.decimal('price', 20, 8).nullable();
      table.decimal('stop_price', 20, 8).nullable();
      table.decimal('trail_amount', 20, 8).nullable(); // For trailing stops
      table.enum('status', ['pending', 'open', 'filled', 'partially_filled', 'cancelled', 'rejected']).defaultTo('pending');
      table.decimal('filled_quantity', 20, 8).defaultTo(0);
      table.decimal('remaining_quantity', 20, 8).notNullable();
      table.decimal('avg_fill_price', 20, 8).nullable();
      table.decimal('fee', 20, 8).defaultTo(0);
      table.string('fee_currency', 10).defaultTo('USD');
      table.boolean('risk_approved').defaultTo(false); // Risk management approval
      table.text('risk_notes').nullable(); // Risk management notes
      table.text('metadata'); // JSON metadata
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.index(['account_id', 'status']);
      table.index(['symbol', 'created_at']);
      table.index('exchange_order_id');
      table.index('risk_approved');
    }),

    // Trades table - Live trading executions
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
      table.boolean('reconciled').defaultTo(false); // Reconciliation status
      table.timestamp('reconciled_at').nullable();
      table.text('settlement_details'); // Settlement information
      table.text('metadata'); // JSON metadata
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.foreign('order_id').references('orders.id').onDelete('CASCADE');
      table.index(['account_id', 'created_at']);
      table.index(['symbol', 'created_at']);
      table.index('exchange_trade_id');
      table.index('reconciled');
    }),

    // Positions table - Live trading positions
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
      table.decimal('margin_requirement', 20, 8).defaultTo(0); // Margin requirement
      table.boolean('risk_monitored').defaultTo(true); // Risk monitoring flag
      table.text('metadata'); // JSON metadata
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.unique(['account_id', 'symbol']);
      table.index(['account_id', 'status']);
      table.index('symbol');
      table.index('risk_monitored');
    }),

    // Balances table - Live trading balances
    knex.schema.createTable('balances', table => {
      table.increments('id').primary();
      table.integer('account_id').unsigned().notNullable();
      table.string('currency', 10).notNullable();
      table.decimal('available', 20, 8).notNullable().defaultTo(0);
      table.decimal('locked', 20, 8).notNullable().defaultTo(0);
      table.decimal('total', 20, 8).notNullable().defaultTo(0);
      table.decimal('margin_available', 20, 8).defaultTo(0); // Available margin
      table.decimal('margin_used', 20, 8).defaultTo(0); // Used margin
      table.boolean('reconciled').defaultTo(false); // Balance reconciliation
      table.timestamp('last_reconciled_at').nullable();
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.unique(['account_id', 'currency']);
      table.index('account_id');
      table.index('reconciled');
    }),

    // Performance metrics table - Live trading performance
    knex.schema.createTable('performance_metrics', table => {
      table.increments('id').primary();
      table.integer('account_id').unsigned().notNullable();
      table.date('date').notNullable();
      table.decimal('portfolio_value', 20, 8).notNullable();
      table.decimal('cash_balance', 20, 8).notNullable();
      table.decimal('margin_balance', 20, 8).defaultTo(0);
      table.decimal('total_pnl', 20, 8).defaultTo(0);
      table.decimal('daily_pnl', 20, 8).defaultTo(0);
      table.decimal('max_drawdown', 20, 8).defaultTo(0);
      table.integer('trades_count').defaultTo(0);
      table.decimal('win_rate', 5, 4).defaultTo(0); // Percentage as decimal
      table.decimal('sharpe_ratio', 10, 6).nullable();
      table.decimal('var_95', 20, 8).nullable(); // Value at Risk 95%
      table.decimal('var_99', 20, 8).nullable(); // Value at Risk 99%
      table.text('metadata'); // JSON metadata
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.unique(['account_id', 'date']);
      table.index(['account_id', 'date']);
    }),

    // Risk events table - Live trading risk events
    knex.schema.createTable('risk_events', table => {
      table.increments('id').primary();
      table.integer('account_id').unsigned().notNullable();
      table.enum('event_type', ['position_limit', 'drawdown_limit', 'exposure_limit', 'volatility_alert', 'margin_call', 'regulatory_breach', 'large_loss']).notNullable();
      table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable();
      table.string('description').notNullable();
      table.text('details'); // JSON details
      table.enum('status', ['open', 'acknowledged', 'resolved']).defaultTo('open');
      table.boolean('requires_manual_review').defaultTo(false);
      table.integer('reviewed_by').unsigned().nullable(); // User ID
      table.timestamp('acknowledged_at').nullable();
      table.timestamp('resolved_at').nullable();
      table.text('resolution_notes').nullable();
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.index(['account_id', 'status']);
      table.index(['event_type', 'severity']);
      table.index('created_at');
      table.index('requires_manual_review');
    }),

    // Audit logs table - Live trading audit trail
    knex.schema.createTable('audit_logs', table => {
      table.increments('id').primary();
      table.string('event_type').notNullable();
      table.integer('account_id').unsigned().nullable();
      table.integer('user_id').unsigned().nullable();
      table.string('description').notNullable();
      table.text('metadata'); // JSON metadata
      table.string('ip_address').nullable();
      table.text('user_agent').nullable();
      table.boolean('sensitive').defaultTo(false); // Sensitive operation flag
      table.enum('compliance_status', ['compliant', 'flagged', 'reviewed']).defaultTo('compliant');
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('SET NULL');
      table.index(['account_id', 'created_at']);
      table.index(['event_type', 'created_at']);
      table.index('created_at');
      table.index('sensitive');
      table.index('compliance_status');
    }),

    // Reconciliation table - Live trading reconciliation tracking
    knex.schema.createTable('reconciliation_logs', table => {
      table.increments('id').primary();
      table.integer('account_id').unsigned().notNullable();
      table.enum('type', ['balance', 'position', 'trade', 'order']).notNullable();
      table.string('reference_id').notNullable(); // ID of reconciled item
      table.enum('status', ['pending', 'matched', 'discrepancy', 'resolved']).defaultTo('pending');
      table.text('discrepancy_details').nullable();
      table.decimal('expected_value', 20, 8).nullable();
      table.decimal('actual_value', 20, 8).nullable();
      table.text('resolution_action').nullable();
      table.timestamp('resolved_at').nullable();
      table.timestamps(true, true);
      
      table.foreign('account_id').references('accounts.id').onDelete('CASCADE');
      table.index(['account_id', 'type', 'status']);
      table.index(['status', 'created_at']);
      table.index('reference_id');
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('reconciliation_logs'),
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