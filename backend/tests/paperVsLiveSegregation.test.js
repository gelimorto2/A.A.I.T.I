const { expect } = require('chai');
const sinon = require('sinon');
const TradingModeDBManager = require('../services/tradingModeDBManager');
const request = require('supertest');
const express = require('express');
const tradingModesRouter = require('../routes/tradingModes');

describe('Paper vs Live Mode Segregation', function() {
  let dbManager;
  let app;
  let sandbox;

  before(async function() {
    this.timeout(10000);
    
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
    
    app.use('/api/trading-modes', tradingModesRouter);
    
    // Initialize database manager
    dbManager = new TradingModeDBManager();
    sandbox = sinon.createSandbox();
  });

  beforeEach(function() {
    sandbox.restore();
    sandbox = sinon.createSandbox();
  });

  after(async function() {
    if (dbManager) {
      await dbManager.close();
    }
    sandbox.restore();
  });

  describe('Database Manager', function() {
    it('should initialize with separate connections for paper and live modes', async function() {
      // Mock knex connections
      const mockPaperConnection = { migrate: { latest: sinon.stub().resolves([1, []]) } };
      const mockLiveConnection = { migrate: { latest: sinon.stub().resolves([1, []]) } };
      
      sandbox.stub(require('knex'), 'default')
        .onFirstCall().returns(mockPaperConnection)
        .onSecondCall().returns(mockLiveConnection);
      
      sandbox.stub(dbManager, 'verifySchemas').resolves();
      
      const result = await dbManager.initialize();
      
      expect(result).to.be.true;
      expect(dbManager.connections.paper).to.exist;
      expect(dbManager.connections.live).to.exist;
    });

    it('should create separate account IDs for different trading modes', function() {
      const paperId = dbManager.generateAccountId('paper');
      const liveId = dbManager.generateAccountId('live');
      
      expect(paperId).to.include('PA_');
      expect(liveId).to.include('LA_');
      expect(paperId).to.not.equal(liveId);
    });

    it('should throw error for invalid trading mode', function() {
      expect(() => {
        dbManager.getConnection('invalid');
      }).to.throw('Invalid trading mode: invalid');
    });
  });

  describe('Data Isolation', function() {
    beforeEach(function() {
      // Mock database connections
      const mockPaperConnection = {
        'accounts': {
          insert: sinon.stub().resolves([1]),
          where: sinon.stub().returnsThis(),
          first: sinon.stub().resolves({
            id: 1,
            name: 'Paper Account',
            type: 'paper',
            metadata: '{"currency": "USD"}'
          })
        },
        'balances': {
          insert: sinon.stub().resolves([1])
        }
      };
      
      const mockLiveConnection = {
        'accounts': {
          insert: sinon.stub().resolves([2]),
          where: sinon.stub().returnsThis(),
          first: sinon.stub().resolves({
            id: 2,
            name: 'Live Account',
            type: 'live',
            metadata: '{"currency": "USD"}'
          })
        },
        'balances': {
          insert: sinon.stub().resolves([1])
        }
      };

      // Mock the connection calls
      sandbox.stub(dbManager, 'getConnection')
        .withArgs('paper').returns(mockPaperConnection)
        .withArgs('live').returns(mockLiveConnection);
    });

    it('should create accounts in separate databases for different trading modes', async function() {
      const paperAccountData = {
        name: 'Paper Test Account',
        exchange: 'binance',
        credentials: { apiKey: 'paper_key' },
        initialBalance: 10000
      };

      const liveAccountData = {
        name: 'Live Test Account',
        exchange: 'binance',
        credentials: { apiKey: 'live_key' },
        initialBalance: 5000
      };

      const paperAccount = await dbManager.createAccount('paper', paperAccountData);
      const liveAccount = await dbManager.createAccount('live', liveAccountData);

      expect(paperAccount.name).to.equal('Paper Test Account');
      expect(liveAccount.name).to.equal('Live Test Account');
      expect(paperAccount.id).to.include('PA_');
      expect(liveAccount.id).to.include('LA_');
    });

    it('should validate data isolation between trading modes', async function() {
      // Mock validation results
      const mockPaperConnection = {
        count: sinon.stub().returnsThis(),
        first: sinon.stub().resolves({ count: 5 }),
        where: sinon.stub().returnsThis()
      };
      
      const mockLiveConnection = {
        count: sinon.stub().returnsThis(),
        first: sinon.stub().resolves({ count: 3 }),
        where: sinon.stub().returnsThis()
      };

      dbManager.connections.paper = mockPaperConnection;
      dbManager.connections.live = mockLiveConnection;

      // Mock no cross-contamination
      mockPaperConnection.where.withArgs('type', '!=', 'paper').returns({
        ...mockPaperConnection,
        length: 0
      });
      mockLiveConnection.where.withArgs('type', '!=', 'live').returns({
        ...mockLiveConnection,
        length: 0
      });

      const validation = await dbManager.validateDataIsolation();

      expect(validation.isolated).to.be.true;
      expect(validation.issues).to.be.empty;
    });
  });

  describe('Trading Mode API Routes', function() {
    beforeEach(function() {
      // Mock database manager methods
      sandbox.stub(dbManager, 'initialize').resolves(true);
      sandbox.stub(dbManager, 'getConnection').returns({
        select: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        orderBy: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        offset: sinon.stub().returnsThis(),
        join: sinon.stub().returnsThis(),
        then: sinon.stub().resolves([])
      });
    });

    it('should validate trading mode parameter', async function() {
      const response = await request(app)
        .get('/api/trading-modes/invalid/accounts')
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Invalid trading mode');
    });

    it('should accept valid trading modes', async function() {
      sandbox.stub(dbManager, 'getConnection').returns({
        select: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        orderBy: sinon.stub().resolves([])
      });

      const paperResponse = await request(app)
        .get('/api/trading-modes/paper/accounts')
        .expect(200);

      const liveResponse = await request(app)
        .get('/api/trading-modes/live/accounts')
        .expect(200);

      expect(paperResponse.body.data.tradingMode).to.equal('paper');
      expect(liveResponse.body.data.tradingMode).to.equal('live');
    });

    it('should create accounts with proper data segregation', async function() {
      sandbox.stub(dbManager, 'createAccount').resolves({
        id: 'PA_1234567890_abc123',
        name: 'Test Account',
        type: 'paper'
      });
      sandbox.stub(dbManager, 'logAuditEvent').resolves();

      const accountData = {
        name: 'Test Account',
        exchange: 'binance',
        credentials: { apiKey: 'test_key' },
        initialBalance: 10000
      };

      const response = await request(app)
        .post('/api/trading-modes/paper/accounts')
        .send(accountData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.type).to.equal('paper');
    });

    it('should get trading statistics for specific mode', async function() {
      sandbox.stub(dbManager, 'getTradingStatistics').resolves({
        tradingMode: 'paper',
        total_trades: 10,
        total_pnl: 1500,
        win_rate: 0.7
      });

      const response = await request(app)
        .get('/api/trading-modes/paper/statistics?timeRange=24h')
        .expect(200);

      expect(response.body.data.tradingMode).to.equal('paper');
      expect(response.body.data.total_trades).to.equal(10);
    });

    it('should validate data isolation via API', async function() {
      sandbox.stub(dbManager, 'validateDataIsolation').resolves({
        isolated: true,
        issues: [],
        paper: { accounts: 5, orders: 20 },
        live: { accounts: 3, orders: 15 }
      });

      const response = await request(app)
        .post('/api/trading-modes/validate-isolation')
        .expect(200);

      expect(response.body.data.isolated).to.be.true;
      expect(response.body.data.issues).to.be.empty;
    });
  });

  describe('Account Management', function() {
    beforeEach(function() {
      sandbox.stub(dbManager, 'getConnection').returns({
        insert: sinon.stub().resolves([1]),
        where: sinon.stub().returnsThis(),
        first: sinon.stub().resolves({
          id: 1,
          name: 'Test Account',
          type: 'paper',
          metadata: '{"currency": "USD"}'
        })
      });
    });

    it('should create paper trading accounts with virtual balance', async function() {
      const accountData = {
        name: 'Paper Account',
        exchange: 'binance',
        credentials: { apiKey: 'paper_key' },
        initialBalance: 100000,
        currency: 'USD'
      };

      sandbox.stub(dbManager, 'initializeAccountBalance').resolves();
      sandbox.stub(dbManager, 'generateAccountId').returns('PA_1234567890_abc123');
      sandbox.stub(dbManager, 'encryptCredentials').returns('encrypted');

      const account = await dbManager.createAccount('paper', accountData);

      expect(account.id).to.include('PA_');
      expect(account.name).to.equal('Paper Account');
      expect(account.type).to.equal('paper');
    });

    it('should create live trading accounts with proper verification', async function() {
      const accountData = {
        name: 'Live Account',
        exchange: 'binance',
        credentials: { apiKey: 'live_key', secretKey: 'live_secret' },
        initialBalance: 10000,
        currency: 'USD'
      };

      sandbox.stub(dbManager, 'initializeAccountBalance').resolves();
      sandbox.stub(dbManager, 'generateAccountId').returns('LA_1234567890_xyz789');
      sandbox.stub(dbManager, 'encryptCredentials').returns('encrypted');

      const account = await dbManager.createAccount('live', accountData);

      expect(account.id).to.include('LA_');
      expect(account.name).to.equal('Live Account');
      expect(account.type).to.equal('live');
    });
  });

  describe('Data Transfer and Migration', function() {
    it('should prevent data transfer to same trading mode', async function() {
      try {
        await dbManager.transferData('paper', 'paper', 'accounts');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Cannot transfer data to the same trading mode');
      }
    });

    it('should transfer data between different trading modes', async function() {
      const mockSourceConnection = {
        select: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        then: sinon.stub().resolves([
          { id: 1, name: 'Test', type: 'paper' }
        ])
      };

      const mockTargetConnection = {
        insert: sinon.stub().resolves()
      };

      sandbox.stub(dbManager, 'getConnection')
        .withArgs('paper').returns(mockSourceConnection)
        .withArgs('live').returns(mockTargetConnection);

      const result = await dbManager.transferData('paper', 'live', 'accounts');

      expect(result.transferred).to.equal(1);
      expect(mockTargetConnection.insert.calledOnce).to.be.true;
    });
  });

  describe('Audit Logging', function() {
    beforeEach(function() {
      sandbox.stub(dbManager, 'getConnection').returns({
        insert: sinon.stub().resolves()
      });
    });

    it('should log audit events separately for each trading mode', async function() {
      const paperEvent = {
        type: 'account_created',
        accountId: 'PA_123',
        userId: 1,
        description: 'Paper account created',
        metadata: { test: true }
      };

      const liveEvent = {
        type: 'trade_executed',
        accountId: 'LA_456',
        userId: 1,
        description: 'Live trade executed',
        metadata: { amount: 1000 }
      };

      await dbManager.logAuditEvent('paper', paperEvent);
      await dbManager.logAuditEvent('live', liveEvent);

      // Verify separate calls to different connections
      expect(dbManager.getConnection.calledWith('paper')).to.be.true;
      expect(dbManager.getConnection.calledWith('live')).to.be.true;
    });
  });

  describe('Performance and Statistics', function() {
    beforeEach(function() {
      sandbox.stub(dbManager, 'getConnection').returns({
        select: sinon.stub().returnsThis(),
        where: sinon.stub().returnsThis(),
        first: sinon.stub().resolves({
          total_trades: 100,
          total_pnl: 5000,
          avg_price: 45000,
          win_rate: 0.65
        }),
        raw: sinon.stub().returnsThis()
      });
    });

    it('should calculate separate statistics for each trading mode', async function() {
      const paperStats = await dbManager.getTradingStatistics('paper', null, '24h');
      const liveStats = await dbManager.getTradingStatistics('live', null, '24h');

      expect(paperStats.tradingMode).to.equal('paper');
      expect(liveStats.tradingMode).to.equal('live');
      expect(paperStats.total_trades).to.equal(100);
      expect(liveStats.total_trades).to.equal(100);
    });

    it('should parse time ranges correctly', function() {
      expect(dbManager.parseTimeRange('1h')).to.equal(1);
      expect(dbManager.parseTimeRange('24h')).to.equal(24);
      expect(dbManager.parseTimeRange('7d')).to.equal(168);
      expect(dbManager.parseTimeRange('30d')).to.equal(720);
      expect(dbManager.parseTimeRange('invalid')).to.be.null;
    });
  });

  describe('Error Handling', function() {
    it('should handle database connection failures gracefully', async function() {
      sandbox.stub(dbManager, 'getConnection').throws(new Error('Connection failed'));

      try {
        await dbManager.createAccount('paper', { name: 'Test' });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Connection failed');
      }
    });

    it('should handle invalid account data', async function() {
      sandbox.stub(dbManager, 'getConnection').returns({
        insert: sinon.stub().rejects(new Error('Invalid data'))
      });

      try {
        await dbManager.createAccount('paper', {});
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Invalid data');
      }
    });
  });

  describe('Data Cleanup', function() {
    beforeEach(function() {
      sandbox.stub(dbManager, 'getConnection').returns({
        where: sinon.stub().returnsThis(),
        del: sinon.stub().resolves(5)
      });
    });

    it('should cleanup old data for specific trading mode', async function() {
      const results = await dbManager.cleanupOldData('paper', 30);

      expect(results).to.have.property('audit_logs');
      expect(results).to.have.property('performance_metrics');
      expect(results).to.have.property('risk_events');
      expect(results.audit_logs).to.equal(5);
    });
  });
});