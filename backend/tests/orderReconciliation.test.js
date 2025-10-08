const { expect } = require('chai');
const sinon = require('sinon');
const EventEmitter = require('events');
const OrderReconciliationService = require('../services/orderReconciliationService');
const TradingModeDBManager = require('../services/tradingModeDBManager');
const request = require('supertest');
const express = require('express');
const reconciliationRouter = require('../routes/reconciliation');

describe('Order Reconciliation System', function() {
  let reconciliationService;
  let mockDBManager;
  let mockExchangeAdapterFactory;
  let mockExchangeAdapter;
  let app;
  let sandbox;

  before(function() {
    // Setup test app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = {
        id: 1,
        permissions: ['paper_trading', 'live_trading', 'admin']
      };
      req.ip = '127.0.0.1';
      next();
    });
    
    app.use('/api/reconciliation', reconciliationRouter);
  });

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    
    // Mock database manager
    mockDBManager = {
      initialize: sandbox.stub().resolves(),
      getConnection: sandbox.stub(),
      logAuditEvent: sandbox.stub().resolves()
    };

    // Mock exchange adapter
    mockExchangeAdapter = {
      getOrderStatus: sandbox.stub(),
      isConnected: true
    };

    // Mock exchange adapter factory
    mockExchangeAdapterFactory = {
      createAdapter: sandbox.stub().resolves({
        adapter: mockExchangeAdapter,
        instanceId: 'test_instance'
      }),
      destroyAdapter: sandbox.stub().resolves()
    };

    // Create reconciliation service
    reconciliationService = new OrderReconciliationService(
      mockExchangeAdapterFactory,
      mockDBManager
    );
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('Service Initialization', function() {
    it('should initialize reconciliation service successfully', async function() {
      const result = await reconciliationService.start();
      
      expect(reconciliationService.isRunning).to.be.true;
      expect(reconciliationService.intervalId).to.not.be.null;
      expect(mockDBManager.initialize.calledOnce).to.be.true;
    });

    it('should stop reconciliation service successfully', async function() {
      await reconciliationService.start();
      await reconciliationService.stop();
      
      expect(reconciliationService.isRunning).to.be.false;
      expect(reconciliationService.intervalId).to.be.null;
    });

    it('should not start service if already running', async function() {
      await reconciliationService.start();
      
      // Try to start again
      await reconciliationService.start();
      
      // Should still only be called once
      expect(mockDBManager.initialize.calledOnce).to.be.true;
    });
  });

  describe('Order Discrepancy Detection', function() {
    it('should detect status discrepancy', function() {
      const localOrder = {
        id: 1,
        exchange_order_id: 'EXC123',
        status: 'open',
        filled_quantity: 0,
        avg_fill_price: null
      };

      const exchangeOrder = {
        status: 'filled',
        filled_quantity: 100,
        avg_fill_price: 50000
      };

      const discrepancy = reconciliationService.detectOrderDiscrepancy(localOrder, exchangeOrder);
      
      expect(discrepancy).to.not.be.null;
      expect(discrepancy.type).to.equal('order_state_mismatch');
      expect(discrepancy.discrepancies).to.have.length.greaterThan(0);
      
      const statusDiscrepancy = discrepancy.discrepancies.find(d => d.field === 'status');
      expect(statusDiscrepancy).to.exist;
      expect(statusDiscrepancy.local).to.equal('open');
      expect(statusDiscrepancy.exchange).to.equal('filled');
    });

    it('should detect filled quantity discrepancy', function() {
      const localOrder = {
        id: 1,
        exchange_order_id: 'EXC123',
        status: 'partially_filled',
        filled_quantity: 50,
        avg_fill_price: 49500
      };

      const exchangeOrder = {
        status: 'partially_filled',
        filled_quantity: 75,
        avg_fill_price: 49800
      };

      const discrepancy = reconciliationService.detectOrderDiscrepancy(localOrder, exchangeOrder);
      
      expect(discrepancy).to.not.be.null;
      
      const quantityDiscrepancy = discrepancy.discrepancies.find(d => d.field === 'filled_quantity');
      expect(quantityDiscrepancy).to.exist;
      expect(quantityDiscrepancy.local).to.equal(50);
      expect(quantityDiscrepancy.exchange).to.equal(75);
      expect(quantityDiscrepancy.difference).to.equal(25);
    });

    it('should detect missing fills', function() {
      const localOrder = {
        id: 1,
        exchange_order_id: 'EXC123',
        status: 'partially_filled',
        filled_quantity: 30,
        avg_fill_price: 49500
      };

      const exchangeOrder = {
        status: 'filled',
        filled_quantity: 100,
        avg_fill_price: 49800
      };

      const discrepancy = reconciliationService.detectOrderDiscrepancy(localOrder, exchangeOrder);
      
      expect(discrepancy).to.not.be.null;
      
      const missingFillsDiscrepancy = discrepancy.discrepancies.find(d => d.field === 'missing_fills');
      expect(missingFillsDiscrepancy).to.exist;
      expect(missingFillsDiscrepancy.missing_quantity).to.equal(70);
      expect(missingFillsDiscrepancy.severity).to.equal('high');
    });

    it('should not detect discrepancy for matching orders', function() {
      const localOrder = {
        id: 1,
        exchange_order_id: 'EXC123',
        status: 'filled',
        filled_quantity: 100,
        avg_fill_price: 50000
      };

      const exchangeOrder = {
        status: 'filled',
        filled_quantity: 100,
        avg_fill_price: 50000
      };

      const discrepancy = reconciliationService.detectOrderDiscrepancy(localOrder, exchangeOrder);
      
      expect(discrepancy).to.be.null;
    });
  });

  describe('Discrepancy Resolution', function() {
    beforeEach(function() {
      const mockConnection = {
        where: sandbox.stub().returnsThis(),
        first: sandbox.stub(),
        update: sandbox.stub().resolves(),
        insert: sandbox.stub().resolves()
      };
      
      mockDBManager.getConnection.returns(mockConnection);
    });

    it('should resolve status discrepancy', async function() {
      const localOrder = {
        id: 1,
        account_id: 1,
        exchange_order_id: 'EXC123',
        status: 'open'
      };

      const discrepancy = {
        type: 'order_state_mismatch',
        orderId: 1,
        discrepancies: [{
          field: 'status',
          local: 'open',
          exchange: 'filled',
          severity: 'medium'
        }]
      };

      mockDBManager.getConnection().first.resolves(localOrder);
      sandbox.stub(reconciliationService, 'updateReconciliationLog').resolves();

      const resolved = await reconciliationService.resolveDiscrepancy('paper', discrepancy);
      
      expect(resolved).to.be.true;
      expect(mockDBManager.getConnection().update.calledOnce).to.be.true;
      expect(mockDBManager.logAuditEvent.calledOnce).to.be.true;
    });

    it('should resolve missing fills by creating synthetic trade', async function() {
      const localOrder = {
        id: 1,
        account_id: 1,
        exchange_order_id: 'EXC123',
        symbol: 'BTC/USD',
        side: 'buy',
        quantity: 100,
        price: 50000
      };

      const discrepancy = {
        type: 'order_state_mismatch',
        orderId: 1,
        discrepancies: [{
          field: 'missing_fills',
          local: 30,
          exchange: 100,
          missing_quantity: 70,
          severity: 'high'
        }]
      };

      mockDBManager.getConnection().first.resolves(localOrder);
      sandbox.stub(reconciliationService, 'updateReconciliationLog').resolves();

      const resolved = await reconciliationService.resolveDiscrepancy('paper', discrepancy);
      
      expect(resolved).to.be.true;
      expect(mockDBManager.getConnection().insert.calledOnce).to.be.true; // Synthetic trade creation
      expect(mockDBManager.getConnection().update.calledOnce).to.be.true; // Order update
    });
  });

  describe('Reconciliation Job Execution', function() {
    beforeEach(function() {
      const mockConnection = {
        select: sandbox.stub().returnsThis(),
        where: sandbox.stub().returnsThis(),
        limit: sandbox.stub().returnsThis(),
        then: sandbox.stub().resolves([])
      };
      
      mockDBManager.getConnection.returns(mockConnection);
      
      sandbox.stub(reconciliationService, 'reconcileTradingMode').resolves({
        tradingMode: 'paper',
        accountsProcessed: 1,
        ordersChecked: 5,
        discrepancies: 2,
        resolved: 2,
        errors: []
      });
    });

    it('should run full reconciliation job', async function() {
      const results = await reconciliationService.runReconciliation();
      
      expect(results).to.have.property('paper');
      expect(results).to.have.property('live');
      expect(reconciliationService.metrics.totalReconciliations).to.equal(1);
    });

    it('should emit high discrepancy alert when threshold exceeded', async function() {
      // Mock high discrepancy count
      reconciliationService.reconcileTradingMode.resolves({
        tradingMode: 'paper',
        accountsProcessed: 1,
        ordersChecked: 20,
        discrepancies: 15, // Above threshold of 10
        resolved: 10,
        errors: []
      });

      let alertEmitted = false;
      reconciliationService.once('high_discrepancy_alert', (data) => {
        alertEmitted = true;
        expect(data.discrepancies).to.equal(30); // 15 + 15 from both modes
      });

      await reconciliationService.runReconciliation();
      
      expect(alertEmitted).to.be.true;
    });
  });

  describe('Manual Reconciliation', function() {
    beforeEach(function() {
      const mockConnection = {
        select: sandbox.stub().returnsThis(),
        join: sandbox.stub().returnsThis(),
        where: sandbox.stub().returnsThis(),
        first: sandbox.stub()
      };
      
      mockDBManager.getConnection.returns(mockConnection);
    });

    it('should reconcile specific order manually', async function() {
      const mockOrder = {
        id: 1,
        account_id: 1,
        exchange_order_id: 'EXC123',
        exchange: 'binance',
        credentials: '{"apiKey": "test"}'
      };

      mockDBManager.getConnection().first.resolves(mockOrder);
      mockExchangeAdapter.getOrderStatus.resolves({
        status: 'filled',
        filled_quantity: 100,
        avg_fill_price: 50000
      });

      sandbox.stub(reconciliationService, 'detectOrderDiscrepancy').returns(null);

      const result = await reconciliationService.reconcileOrderManually('paper', 1);
      
      expect(result.discrepancy).to.be.null;
      expect(result.resolved).to.be.false;
    });

    it('should throw error for non-existent order', async function() {
      mockDBManager.getConnection().first.resolves(null);

      try {
        await reconciliationService.reconcileOrderManually('paper', 999);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Order 999 not found');
      }
    });
  });

  describe('Reconciliation API Routes', function() {
    beforeEach(function() {
      // Mock the reconciliation service methods
      sandbox.stub(reconciliationService, 'getMetrics').returns({
        totalReconciliations: 10,
        discrepanciesFound: 5,
        discrepanciesResolved: 4,
        isRunning: true,
        lastReconciliation: new Date().toISOString()
      });
    });

    it('should get reconciliation status', async function() {
      const response = await request(app)
        .get('/api/reconciliation/status')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.service).to.equal('order_reconciliation');
      expect(response.body.data.totalReconciliations).to.equal(10);
    });

    it('should manually trigger reconciliation', async function() {
      sandbox.stub(reconciliationService, 'runReconciliation').resolves({
        paper: { discrepancies: 2, resolved: 2 },
        live: { discrepancies: 1, resolved: 1 }
      });

      const response = await request(app)
        .post('/api/reconciliation/run')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.paper.discrepancies).to.equal(2);
    });

    it('should get reconciliation history', async function() {
      sandbox.stub(reconciliationService, 'getReconciliationHistory').resolves([
        {
          id: 1,
          type: 'order',
          status: 'resolved',
          created_at: new Date(),
          discrepancy_details: { type: 'status_mismatch' }
        }
      ]);

      const response = await request(app)
        .get('/api/reconciliation/paper/history')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.tradingMode).to.equal('paper');
      expect(response.body.data.history).to.have.length(1);
    });

    it('should manually reconcile specific order', async function() {
      sandbox.stub(reconciliationService, 'reconcileOrderManually').resolves({
        discrepancy: {
          type: 'order_state_mismatch',
          discrepancies: [{ field: 'status' }]
        },
        resolved: true
      });

      const response = await request(app)
        .post('/api/reconciliation/paper/order/123')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.resolved).to.be.true;
      expect(response.body.message).to.include('Discrepancy found and resolved');
    });

    it('should validate trading mode parameter', async function() {
      const response = await request(app)
        .get('/api/reconciliation/invalid/history')
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Invalid trading mode');
    });
  });

  describe('Error Handling', function() {
    it('should handle exchange adapter creation failure', async function() {
      mockExchangeAdapterFactory.createAdapter.rejects(new Error('Exchange not available'));

      const account = {
        id: 1,
        exchange: 'binance',
        credentials: '{"apiKey": "test"}'
      };

      const result = await reconciliationService.reconcileAccount('paper', account);
      
      expect(result.ordersChecked).to.equal(0);
      expect(result.discrepancies).to.equal(0);
    });

    it('should handle database connection errors', async function() {
      mockDBManager.getConnection.throws(new Error('Database connection failed'));

      try {
        await reconciliationService.reconcileTradingMode('paper');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Database connection failed');
      }
    });

    it('should handle order reconciliation errors gracefully', async function() {
      const mockConnection = {
        select: sandbox.stub().returnsThis(),
        where: sandbox.stub().returnsThis(),
        limit: sandbox.stub().resolves([
          { id: 1, exchange_order_id: 'EXC123' }
        ])
      };
      
      mockDBManager.getConnection.returns(mockConnection);
      mockExchangeAdapter.getOrderStatus.rejects(new Error('Network error'));

      const account = { id: 1, exchange: 'binance', credentials: '{}' };
      const result = await reconciliationService.reconcileAccount('paper', account);
      
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].error).to.include('Network error');
    });
  });

  describe('Metrics and Monitoring', function() {
    it('should track reconciliation metrics correctly', async function() {
      // Run a reconciliation job
      sandbox.stub(reconciliationService, 'reconcileTradingMode').resolves({
        tradingMode: 'paper',
        discrepancies: 3,
        resolved: 2
      });

      await reconciliationService.runReconciliation();

      const metrics = reconciliationService.getMetrics();
      
      expect(metrics.totalReconciliations).to.equal(1);
      expect(metrics.discrepanciesFound).to.equal(6); // 3 + 3 from both modes
      expect(metrics.discrepanciesResolved).to.equal(4); // 2 + 2 from both modes
      expect(metrics.lastReconciliation).to.not.be.null;
    });

    it('should calculate moving average correctly', function() {
      const current = 100;
      const newValue = 200;
      const count = 5;
      
      const average = reconciliationService.calculateMovingAverage(current, newValue, count);
      
      expect(average).to.equal(120); // ((100 * 4) + 200) / 5
    });
  });

  describe('Event Emission', function() {
    it('should emit discrepancy detected event', function() {
      let eventEmitted = false;
      
      reconciliationService.once('discrepancy_detected', (data) => {
        eventEmitted = true;
        expect(data).to.have.property('tradingMode');
        expect(data).to.have.property('discrepancy');
      });

      reconciliationService.emit('discrepancy_detected', {
        tradingMode: 'paper',
        discrepancy: { type: 'status_mismatch' }
      });

      expect(eventEmitted).to.be.true;
    });

    it('should emit service started event', function() {
      let eventEmitted = false;
      
      reconciliationService.once('service_started', () => {
        eventEmitted = true;
      });

      reconciliationService.emit('service_started');

      expect(eventEmitted).to.be.true;
    });
  });
});