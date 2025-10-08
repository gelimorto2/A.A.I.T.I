const EventEmitter = require('events');
const logger = require('../utils/logger');
const TradingModeDBManager = require('./tradingModeDBManager');

/**
 * Order Reconciliation Service
 * Detects missing fills, handles order state inconsistencies, and performs automated recovery
 */
class OrderReconciliationService extends EventEmitter {
  constructor(exchangeAdapterFactory, tradingModeDBManager) {
    super();
    
    this.exchangeAdapterFactory = exchangeAdapterFactory;
    this.dbManager = tradingModeDBManager;
    this.reconciliationJobs = new Map();
    this.metrics = {
      totalReconciliations: 0,
      discrepanciesFound: 0,
      discrepanciesResolved: 0,
      reconciliationErrors: 0,
      lastReconciliation: null,
      averageReconciliationTime: 0
    };
    
    this.config = {
      reconciliationInterval: 5 * 60 * 1000, // 5 minutes
      maxDiscrepancyAge: 24 * 60 * 60 * 1000, // 24 hours
      batchSize: 100,
      retryAttempts: 3,
      retryDelay: 30 * 1000, // 30 seconds
      alertThreshold: 10 // Alert if more than 10 discrepancies found
    };

    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Start the reconciliation service
   */
  async start() {
    try {
      if (this.isRunning) {
        logger.warn('Order reconciliation service already running');
        return;
      }

      await this.dbManager.initialize();
      
      this.isRunning = true;
      this.intervalId = setInterval(() => {
        this.runReconciliation().catch(error => {
          logger.error('Reconciliation job failed', { error: error.message });
          this.metrics.reconciliationErrors++;
          this.emit('reconciliation_error', error);
        });
      }, this.config.reconciliationInterval);

      logger.info('Order reconciliation service started', {
        interval: this.config.reconciliationInterval,
        batchSize: this.config.batchSize
      });

      this.emit('service_started');

    } catch (error) {
      logger.error('Failed to start order reconciliation service', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop the reconciliation service
   */
  async stop() {
    try {
      if (!this.isRunning) {
        return;
      }

      this.isRunning = false;
      
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      // Wait for ongoing reconciliations to complete
      await this.waitForActiveReconciliations();

      logger.info('Order reconciliation service stopped');
      this.emit('service_stopped');

    } catch (error) {
      logger.error('Failed to stop order reconciliation service', { error: error.message });
      throw error;
    }
  }

  /**
   * Run reconciliation for all trading modes and accounts
   */
  async runReconciliation() {
    const startTime = Date.now();
    
    try {
      logger.info('Starting order reconciliation job');

      const results = {
        paper: await this.reconcileTradingMode('paper'),
        live: await this.reconcileTradingMode('live')
      };

      const totalDiscrepancies = results.paper.discrepancies + results.live.discrepancies;
      const totalResolved = results.paper.resolved + results.live.resolved;

      this.metrics.totalReconciliations++;
      this.metrics.discrepanciesFound += totalDiscrepancies;
      this.metrics.discrepanciesResolved += totalResolved;
      this.metrics.lastReconciliation = new Date().toISOString();
      this.metrics.averageReconciliationTime = this.calculateMovingAverage(
        this.metrics.averageReconciliationTime,
        Date.now() - startTime,
        this.metrics.totalReconciliations
      );

      // Alert if threshold exceeded
      if (totalDiscrepancies > this.config.alertThreshold) {
        this.emit('high_discrepancy_alert', {
          discrepancies: totalDiscrepancies,
          threshold: this.config.alertThreshold,
          results
        });
      }

      logger.info('Order reconciliation job completed', {
        duration: Date.now() - startTime,
        discrepanciesFound: totalDiscrepancies,
        discrepanciesResolved: totalResolved,
        results
      });

      this.emit('reconciliation_completed', {
        duration: Date.now() - startTime,
        results,
        metrics: this.metrics
      });

      return results;

    } catch (error) {
      logger.error('Order reconciliation job failed', { error: error.message });
      this.metrics.reconciliationErrors++;
      throw error;
    }
  }

  /**
   * Reconcile orders for specific trading mode
   */
  async reconcileTradingMode(tradingMode) {
    try {
      const connection = this.dbManager.getConnection(tradingMode);
      
      // Get accounts for this trading mode
      const accounts = await connection('accounts')
        .select('*')
        .where({ status: 'active' });

      const results = {
        tradingMode,
        accountsProcessed: 0,
        ordersChecked: 0,
        discrepancies: 0,
        resolved: 0,
        errors: []
      };

      for (const account of accounts) {
        try {
          const accountResult = await this.reconcileAccount(tradingMode, account);
          
          results.accountsProcessed++;
          results.ordersChecked += accountResult.ordersChecked;
          results.discrepancies += accountResult.discrepancies;
          results.resolved += accountResult.resolved;

        } catch (error) {
          logger.error('Failed to reconcile account', {
            tradingMode,
            accountId: account.id,
            error: error.message
          });
          results.errors.push({
            accountId: account.id,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      logger.error('Failed to reconcile trading mode', { tradingMode, error: error.message });
      throw error;
    }
  }

  /**
   * Reconcile orders for specific account
   */
  async reconcileAccount(tradingMode, account) {
    try {
      const connection = this.dbManager.getConnection(tradingMode);
      
      // Get open and partially filled orders
      const orders = await connection('orders')
        .select('*')
        .where({
          account_id: account.id,
          status: ['open', 'partially_filled']
        })
        .limit(this.config.batchSize);

      const results = {
        accountId: account.id,
        ordersChecked: orders.length,
        discrepancies: 0,
        resolved: 0,
        errors: []
      };

      if (orders.length === 0) {
        return results;
      }

      // Get exchange adapter for this account
      let exchangeAdapter;
      try {
        const adapterResult = await this.exchangeAdapterFactory.createAdapter(
          account.exchange,
          JSON.parse(account.credentials || '{}')
        );
        exchangeAdapter = adapterResult.adapter;
      } catch (error) {
        logger.warn('Could not create exchange adapter for reconciliation', {
          accountId: account.id,
          exchange: account.exchange,
          error: error.message
        });
        return results;
      }

      // Reconcile each order
      for (const order of orders) {
        try {
          const discrepancy = await this.reconcileOrder(
            tradingMode,
            account,
            order,
            exchangeAdapter
          );

          if (discrepancy) {
            results.discrepancies++;
            
            // Attempt to resolve discrepancy
            const resolved = await this.resolveDiscrepancy(tradingMode, discrepancy);
            if (resolved) {
              results.resolved++;
            }
          }

        } catch (error) {
          logger.error('Failed to reconcile order', {
            tradingMode,
            accountId: account.id,
            orderId: order.id,
            error: error.message
          });
          results.errors.push({
            orderId: order.id,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      logger.error('Failed to reconcile account', {
        tradingMode,
        accountId: account.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Reconcile individual order
   */
  async reconcileOrder(tradingMode, account, order, exchangeAdapter) {
    try {
      if (!order.exchange_order_id) {
        // Order not yet submitted to exchange
        return null;
      }

      // Get order status from exchange
      const exchangeOrder = await exchangeAdapter.getOrderStatus(order.exchange_order_id);
      
      // Compare local and exchange order states
      const discrepancy = this.detectOrderDiscrepancy(order, exchangeOrder);
      
      if (discrepancy) {
        // Log discrepancy
        await this.logDiscrepancy(tradingMode, account.id, discrepancy);
        
        logger.warn('Order discrepancy detected', {
          tradingMode,
          accountId: account.id,
          orderId: order.id,
          exchangeOrderId: order.exchange_order_id,
          discrepancy: discrepancy.type,
          details: discrepancy.details
        });

        this.emit('discrepancy_detected', {
          tradingMode,
          accountId: account.id,
          order,
          exchangeOrder,
          discrepancy
        });
      }

      return discrepancy;

    } catch (error) {
      logger.error('Failed to reconcile order', {
        tradingMode,
        orderId: order.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Detect discrepancy between local and exchange order
   */
  detectOrderDiscrepancy(localOrder, exchangeOrder) {
    const discrepancies = [];

    // Status mismatch
    if (localOrder.status !== exchangeOrder.status) {
      discrepancies.push({
        field: 'status',
        local: localOrder.status,
        exchange: exchangeOrder.status,
        severity: this.getStatusDiscrepancySeverity(localOrder.status, exchangeOrder.status)
      });
    }

    // Filled quantity mismatch
    const localFilled = parseFloat(localOrder.filled_quantity);
    const exchangeFilled = parseFloat(exchangeOrder.filled_quantity);
    const filledDifference = Math.abs(localFilled - exchangeFilled);
    
    if (filledDifference > 0.00001) { // Allow for small floating point differences
      discrepancies.push({
        field: 'filled_quantity',
        local: localFilled,
        exchange: exchangeFilled,
        difference: filledDifference,
        severity: filledDifference > localFilled * 0.01 ? 'high' : 'medium'
      });
    }

    // Average fill price mismatch (if order is filled)
    if (exchangeFilled > 0 && localOrder.avg_fill_price && exchangeOrder.avg_fill_price) {
      const localPrice = parseFloat(localOrder.avg_fill_price);
      const exchangePrice = parseFloat(exchangeOrder.avg_fill_price);
      const priceDifference = Math.abs(localPrice - exchangePrice);
      const priceThreshold = localPrice * 0.001; // 0.1% threshold
      
      if (priceDifference > priceThreshold) {
        discrepancies.push({
          field: 'avg_fill_price',
          local: localPrice,
          exchange: exchangePrice,
          difference: priceDifference,
          severity: priceDifference > localPrice * 0.01 ? 'high' : 'medium'
        });
      }
    }

    // Missing fills (exchange shows fills but local doesn't have corresponding trades)
    if (exchangeFilled > localFilled) {
      discrepancies.push({
        field: 'missing_fills',
        local: localFilled,
        exchange: exchangeFilled,
        missing_quantity: exchangeFilled - localFilled,
        severity: 'high'
      });
    }

    if (discrepancies.length === 0) {
      return null;
    }

    return {
      type: 'order_state_mismatch',
      orderId: localOrder.id,
      exchangeOrderId: localOrder.exchange_order_id,
      discrepancies,
      severity: this.calculateOverallSeverity(discrepancies),
      detectedAt: new Date().toISOString()
    };
  }

  /**
   * Resolve detected discrepancy
   */
  async resolveDiscrepancy(tradingMode, discrepancy) {
    try {
      const connection = this.dbManager.getConnection(tradingMode);
      
      // Get the local order
      const localOrder = await connection('orders')
        .where({ id: discrepancy.orderId })
        .first();

      if (!localOrder) {
        logger.error('Local order not found for discrepancy resolution', {
          orderId: discrepancy.orderId
        });
        return false;
      }

      let resolved = false;

      for (const disc of discrepancy.discrepancies) {
        switch (disc.field) {
          case 'status':
            resolved = await this.resolveStatusDiscrepancy(tradingMode, localOrder, disc);
            break;
          case 'filled_quantity':
            resolved = await this.resolveFilledQuantityDiscrepancy(tradingMode, localOrder, disc);
            break;
          case 'avg_fill_price':
            resolved = await this.resolvePriceDiscrepancy(tradingMode, localOrder, disc);
            break;
          case 'missing_fills':
            resolved = await this.resolveMissingFills(tradingMode, localOrder, disc);
            break;
        }
      }

      if (resolved) {
        // Update reconciliation log
        await this.updateReconciliationLog(tradingMode, discrepancy, 'resolved');
        
        logger.info('Discrepancy resolved', {
          tradingMode,
          orderId: discrepancy.orderId,
          type: discrepancy.type
        });

        this.emit('discrepancy_resolved', {
          tradingMode,
          discrepancy
        });
      }

      return resolved;

    } catch (error) {
      logger.error('Failed to resolve discrepancy', {
        tradingMode,
        discrepancy: discrepancy.type,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Resolve status discrepancy
   */
  async resolveStatusDiscrepancy(tradingMode, localOrder, discrepancy) {
    try {
      const connection = this.dbManager.getConnection(tradingMode);
      
      // Update local order status to match exchange
      await connection('orders')
        .where({ id: localOrder.id })
        .update({
          status: discrepancy.exchange,
          updated_at: new Date()
        });

      // Log the status change
      await this.dbManager.logAuditEvent(tradingMode, {
        type: 'order_status_reconciled',
        accountId: localOrder.account_id,
        description: `Order status updated from ${discrepancy.local} to ${discrepancy.exchange}`,
        metadata: {
          orderId: localOrder.id,
          exchangeOrderId: localOrder.exchange_order_id,
          previousStatus: discrepancy.local,
          newStatus: discrepancy.exchange,
          reason: 'reconciliation'
        }
      });

      return true;

    } catch (error) {
      logger.error('Failed to resolve status discrepancy', {
        orderId: localOrder.id,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Resolve filled quantity discrepancy
   */
  async resolveFilledQuantityDiscrepancy(tradingMode, localOrder, discrepancy) {
    try {
      const connection = this.dbManager.getConnection(tradingMode);
      
      // Update local order filled quantity
      const newRemainingQuantity = localOrder.quantity - discrepancy.exchange;
      
      await connection('orders')
        .where({ id: localOrder.id })
        .update({
          filled_quantity: discrepancy.exchange,
          remaining_quantity: Math.max(0, newRemainingQuantity),
          status: newRemainingQuantity <= 0 ? 'filled' : 'partially_filled',
          updated_at: new Date()
        });

      // Log the quantity adjustment
      await this.dbManager.logAuditEvent(tradingMode, {
        type: 'order_quantity_reconciled',
        accountId: localOrder.account_id,
        description: `Order filled quantity adjusted from ${discrepancy.local} to ${discrepancy.exchange}`,
        metadata: {
          orderId: localOrder.id,
          exchangeOrderId: localOrder.exchange_order_id,
          previousQuantity: discrepancy.local,
          newQuantity: discrepancy.exchange,
          difference: discrepancy.difference,
          reason: 'reconciliation'
        }
      });

      return true;

    } catch (error) {
      logger.error('Failed to resolve filled quantity discrepancy', {
        orderId: localOrder.id,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Resolve missing fills
   */
  async resolveMissingFills(tradingMode, localOrder, discrepancy) {
    try {
      const connection = this.dbManager.getConnection(tradingMode);
      
      // Create synthetic trade record for missing fill
      const missingQuantity = discrepancy.missing_quantity;
      const estimatedPrice = localOrder.price || localOrder.avg_fill_price || 0;
      
      const syntheticTrade = {
        account_id: localOrder.account_id,
        order_id: localOrder.id,
        exchange_trade_id: `RECONCILED_${Date.now()}`,
        symbol: localOrder.symbol,
        side: localOrder.side,
        quantity: missingQuantity,
        price: estimatedPrice,
        fee: 0, // Fee will need to be updated separately
        fee_currency: 'USD',
        pnl: 0,
        metadata: JSON.stringify({
          reconciled: true,
          reason: 'missing_fill_recovery',
          original_discrepancy: discrepancy
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      await connection('trades').insert(syntheticTrade);

      // Update order filled quantity
      await connection('orders')
        .where({ id: localOrder.id })
        .update({
          filled_quantity: discrepancy.exchange,
          remaining_quantity: Math.max(0, localOrder.quantity - discrepancy.exchange),
          updated_at: new Date()
        });

      // Log the missing fill recovery
      await this.dbManager.logAuditEvent(tradingMode, {
        type: 'missing_fill_recovered',
        accountId: localOrder.account_id,
        description: `Missing fill recovered for order ${localOrder.id}`,
        metadata: {
          orderId: localOrder.id,
          exchangeOrderId: localOrder.exchange_order_id,
          missingQuantity,
          estimatedPrice,
          syntheticTradeId: syntheticTrade.exchange_trade_id,
          reason: 'reconciliation'
        }
      });

      return true;

    } catch (error) {
      logger.error('Failed to resolve missing fills', {
        orderId: localOrder.id,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Log discrepancy to database
   */
  async logDiscrepancy(tradingMode, accountId, discrepancy) {
    try {
      const connection = this.dbManager.getConnection(tradingMode);
      
      await connection('reconciliation_logs').insert({
        account_id: accountId,
        type: 'order',
        reference_id: discrepancy.orderId,
        status: 'discrepancy',
        discrepancy_details: JSON.stringify(discrepancy),
        created_at: new Date(),
        updated_at: new Date()
      });

    } catch (error) {
      logger.error('Failed to log discrepancy', {
        tradingMode,
        accountId,
        error: error.message
      });
    }
  }

  /**
   * Update reconciliation log status
   */
  async updateReconciliationLog(tradingMode, discrepancy, status) {
    try {
      const connection = this.dbManager.getConnection(tradingMode);
      
      await connection('reconciliation_logs')
        .where({
          reference_id: discrepancy.orderId,
          type: 'order',
          status: 'discrepancy'
        })
        .update({
          status,
          resolved_at: new Date(),
          updated_at: new Date()
        });

    } catch (error) {
      logger.error('Failed to update reconciliation log', {
        tradingMode,
        orderId: discrepancy.orderId,
        error: error.message
      });
    }
  }

  /**
   * Get reconciliation metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isRunning: this.isRunning,
      config: this.config,
      activeJobs: this.reconciliationJobs.size
    };
  }

  /**
   * Get reconciliation history
   */
  async getReconciliationHistory(tradingMode, limit = 100) {
    try {
      const connection = this.dbManager.getConnection(tradingMode);
      
      const history = await connection('reconciliation_logs')
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(limit);

      return history.map(record => ({
        ...record,
        discrepancy_details: JSON.parse(record.discrepancy_details || '{}')
      }));

    } catch (error) {
      logger.error('Failed to get reconciliation history', {
        tradingMode,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Manual reconciliation for specific order
   */
  async reconcileOrderManually(tradingMode, orderId) {
    try {
      const connection = this.dbManager.getConnection(tradingMode);
      
      const order = await connection('orders')
        .select('orders.*', 'accounts.exchange', 'accounts.credentials')
        .join('accounts', 'orders.account_id', 'accounts.id')
        .where('orders.id', orderId)
        .first();

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Create exchange adapter
      const adapterResult = await this.exchangeAdapterFactory.createAdapter(
        order.exchange,
        JSON.parse(order.credentials || '{}')
      );
      const exchangeAdapter = adapterResult.adapter;

      // Reconcile the order
      const discrepancy = await this.reconcileOrder(
        tradingMode,
        { id: order.account_id },
        order,
        exchangeAdapter
      );

      if (discrepancy) {
        const resolved = await this.resolveDiscrepancy(tradingMode, discrepancy);
        return { discrepancy, resolved };
      }

      return { discrepancy: null, resolved: false };

    } catch (error) {
      logger.error('Manual order reconciliation failed', {
        tradingMode,
        orderId,
        error: error.message
      });
      throw error;
    }
  }

  // Helper methods
  
  getStatusDiscrepancySeverity(localStatus, exchangeStatus) {
    const criticalTransitions = [
      ['open', 'cancelled'],
      ['open', 'rejected'],
      ['partially_filled', 'cancelled']
    ];
    
    if (criticalTransitions.some(([from, to]) => localStatus === from && exchangeStatus === to)) {
      return 'critical';
    }
    
    return 'medium';
  }

  calculateOverallSeverity(discrepancies) {
    const severities = discrepancies.map(d => d.severity);
    
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  calculateMovingAverage(current, newValue, count) {
    return ((current * (count - 1)) + newValue) / count;
  }

  async waitForActiveReconciliations() {
    while (this.reconciliationJobs.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

module.exports = OrderReconciliationService;