const { expect } = require('chai');
const sinon = require('sinon');
const { describe, it, beforeEach, afterEach } = require('mocha');

const EnhancedRiskManager = require('../backend/services/enhancedRiskManager');

describe('Enhanced Risk Management System', function() {
  let riskManager;
  let mockDatabase;
  let mockExchange;

  beforeEach(function() {
    // Mock database
    mockDatabase = {
      query: sinon.stub(),
      close: sinon.stub()
    };

    // Mock exchange service
    mockExchange = {
      getMarketData: sinon.stub(),
      getHistoricalPrices: sinon.stub(),
      getQuote: sinon.stub()
    };

    // Initialize risk manager
    riskManager = new EnhancedRiskManager(mockDatabase, mockExchange);
    
    // Stub the initialization methods to avoid real async operations
    sinon.stub(riskManager, 'loadRiskConfiguration').resolves();
    sinon.stub(riskManager, 'calculateInitialRiskMetrics').resolves();
    sinon.stub(riskManager, 'startRiskMonitoring');
    sinon.stub(riskManager, 'updatePortfolioState').resolves();
    sinon.stub(riskManager, 'getPortfolioSnapshot').resolves({
      totalValue: 100000,
      totalExposure: 45000,
      drawdown: 0.02,
      dailyPnL: -500,
      positions: []
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('Risk Manager Initialization', function() {
    it('should initialize with default configuration', function() {
      expect(riskManager.config).to.exist;
      expect(riskManager.config.maxPositionSizeUSD).to.equal(10000);
      expect(riskManager.config.maxPortfolioExposure).to.equal(0.95);
      expect(riskManager.config.maxDrawdownPercent).to.equal(0.10);
    });

    it('should initialize risk state', function() {
      expect(riskManager.riskState).to.exist;
      expect(riskManager.riskState.positions).to.be.instanceOf(Map);
      expect(riskManager.riskState.correlationMatrix).to.be.instanceOf(Map);
      expect(riskManager.riskState.volatilityData).to.be.instanceOf(Map);
    });

    it('should initialize risk metrics', function() {
      expect(riskManager.riskMetrics).to.exist;
      expect(riskManager.riskMetrics).to.have.property('var95');
      expect(riskManager.riskMetrics).to.have.property('sharpeRatio');
      expect(riskManager.riskMetrics).to.have.property('maxDrawdown');
    });
  });

  describe('Trade Risk Evaluation', function() {
    const mockTradeParams = {
      botId: 'bot123',
      symbol: 'BTCUSDT',
      side: 'buy',
      quantity: 0.1,
      price: 50000
    };

    beforeEach(function() {
      // Setup mock portfolio state
      riskManager.riskState.portfolioValue = 100000;
      riskManager.riskState.totalExposure = 45000;
      riskManager.riskState.currentDrawdown = 0.02;
      riskManager.riskState.dailyPnL = -500;
    });

    it('should approve trades within risk limits', async function() {
      const assessment = await riskManager.evaluateTradeRisk(
        mockTradeParams.botId,
        mockTradeParams.symbol,
        mockTradeParams.side,
        mockTradeParams.quantity,
        mockTradeParams.price
      );

      expect(assessment).to.have.property('approved');
      expect(assessment).to.have.property('riskScore');
      expect(assessment).to.have.property('adjustedQuantity');
      expect(assessment).to.have.property('warnings').that.is.an('array');
      expect(assessment).to.have.property('blockers').that.is.an('array');
      expect(assessment).to.have.property('recommendations').that.is.an('array');
    });

    it('should reject trades exceeding position limits', async function() {
      // Set a very low position limit
      riskManager.config.maxPositionSizeUSD = 1000;

      const assessment = await riskManager.evaluateTradeRisk(
        mockTradeParams.botId,
        mockTradeParams.symbol,
        mockTradeParams.side,
        mockTradeParams.quantity,
        mockTradeParams.price
      );

      expect(assessment.warnings.length).to.be.greaterThan(0);
      expect(assessment.adjustedQuantity).to.be.lessThan(mockTradeParams.quantity);
    });

    it('should reject trades when drawdown limit exceeded', async function() {
      // Set high drawdown to trigger limit
      riskManager.riskState.currentDrawdown = 0.15; // Above 10% limit

      const assessment = await riskManager.evaluateTradeRisk(
        mockTradeParams.botId,
        mockTradeParams.symbol,
        mockTradeParams.side,
        mockTradeParams.quantity,
        mockTradeParams.price
      );

      expect(assessment.approved).to.be.false;
      expect(assessment.blockers).to.include.something.that.includes('drawdown');
    });

    it('should reject trades when daily loss limit exceeded', async function() {
      // Set high daily loss
      riskManager.riskState.dailyPnL = -6000; // Above 5% of 100k portfolio

      const assessment = await riskManager.evaluateTradeRisk(
        mockTradeParams.botId,
        mockTradeParams.symbol,
        mockTradeParams.side,
        mockTradeParams.quantity,
        mockTradeParams.price
      );

      expect(assessment.approved).to.be.false;
      expect(assessment.blockers).to.include.something.that.includes('Daily loss');
    });

    it('should calculate risk score correctly', async function() {
      const assessment = await riskManager.evaluateTradeRisk(
        mockTradeParams.botId,
        mockTradeParams.symbol,
        mockTradeParams.side,
        mockTradeParams.quantity,
        mockTradeParams.price
      );

      expect(assessment.riskScore).to.be.a('number');
      expect(assessment.riskScore).to.be.at.least(0);
      expect(assessment.riskScore).to.be.at.most(1);
    });
  });

  describe('Position Limit Checks', function() {
    it('should enforce maximum position size in USD', async function() {
      const result = await riskManager.checkPositionLimits('bot123', 'BTCUSDT', 'buy', 1, 50000);
      
      // 1 BTC at $50,000 = $50,000, above the $10,000 limit
      expect(result.warnings.length).to.be.greaterThan(0);
      expect(result.adjustments).to.have.property('quantity');
    });

    it('should enforce symbol exposure limits', async function() {
      // Set portfolio state with existing exposure
      riskManager.riskState.portfolioValue = 100000;
      riskManager.riskState.positions.set('bot123:BTCUSDT', { quantity: 0.1, value: 20000 });

      const result = await riskManager.checkPositionLimits('bot123', 'BTCUSDT', 'buy', 0.1, 50000);
      
      // Additional 0.1 BTC would bring total to 25000, which is 25% of portfolio (above 15% limit)
      expect(result.warnings.length).to.be.greaterThan(0);
    });

    it('should enforce bot exposure limits', async function() {
      // Set portfolio state with high bot exposure
      riskManager.riskState.portfolioValue = 100000;
      riskManager.riskState.positions.set('bot123:BTCUSDT', { quantity: 0.1, value: 20000 });
      riskManager.riskState.positions.set('bot123:ETHUSDT', { quantity: 5, value: 10000 });

      const result = await riskManager.checkPositionLimits('bot123', 'ADAUSDT', 'buy', 1000, 1);
      
      // Bot already has 30% exposure, adding more would exceed 25% limit
      expect(result.blockers.length).to.be.greaterThan(0);
    });
  });

  describe('Volatility-Based Position Sizing', function() {
    beforeEach(function() {
      // Mock historical price data for volatility calculation
      const mockPriceHistory = [
        { close: 50000 },
        { close: 51000 },
        { close: 49500 },
        { close: 52000 },
        { close: 48000 },
        { close: 53000 },
        { close: 47000 }
      ];
      mockExchange.getHistoricalPrices.resolves(mockPriceHistory);
    });

    it('should calculate symbol volatility', async function() {
      const volatility = await riskManager.calculateSymbolVolatility('BTCUSDT');
      
      expect(volatility).to.be.a('number');
      expect(volatility).to.be.greaterThan(0);
    });

    it('should adjust position size based on volatility', async function() {
      // Stub volatility calculation to return high volatility
      sinon.stub(riskManager, 'calculateSymbolVolatility').resolves(0.08); // 8% daily volatility

      const result = await riskManager.checkVolatilityBasedSizing('BTCUSDT', 0.1, 50000);
      
      expect(result.warnings).to.include.something.that.includes('volatility');
    });

    it('should handle volatility calculation failures gracefully', async function() {
      mockExchange.getHistoricalPrices.rejects(new Error('API Error'));

      const volatility = await riskManager.calculateSymbolVolatility('BTCUSDT');
      
      expect(volatility).to.equal(0.02); // Default volatility
    });
  });

  describe('Correlation Analysis', function() {
    beforeEach(function() {
      // Mock historical data for correlation calculation
      const mockHistory1 = [
        { close: 50000 }, { close: 51000 }, { close: 49500 }, { close: 52000 }
      ];
      const mockHistory2 = [
        { close: 3000 }, { close: 3100 }, { close: 2950 }, { close: 3200 }
      ];
      
      mockExchange.getHistoricalPrices
        .withArgs('BTCUSDT', '1d', 30).resolves(mockHistory1)
        .withArgs('ETHUSDT', '1d', 30).resolves(mockHistory2);
    });

    it('should calculate correlation between symbols', async function() {
      const correlation = await riskManager.getSymbolCorrelation('BTCUSDT', 'ETHUSDT');
      
      expect(correlation).to.be.a('number');
      expect(correlation).to.be.at.least(-1);
      expect(correlation).to.be.at.most(1);
    });

    it('should identify correlated positions', async function() {
      // Set up correlated positions
      riskManager.riskState.positions.set('bot123:ETHUSDT', { quantity: 5, value: 15000, symbol: 'ETHUSDT' });
      
      // Mock high correlation
      sinon.stub(riskManager, 'getSymbolCorrelation').resolves(0.8);

      const correlatedPositions = await riskManager.getCorrelatedPositions('BTCUSDT');
      
      expect(correlatedPositions).to.be.an('array');
    });

    it('should enforce correlation limits', async function() {
      // Set up high correlation scenario
      riskManager.riskState.portfolioValue = 100000;
      riskManager.riskState.positions.set('bot123:ETHUSDT', { quantity: 5, value: 25000 });
      
      sinon.stub(riskManager, 'getCorrelatedPositions').resolves([
        { symbol: 'ETHUSDT', value: 25000, correlation: 0.8 }
      ]);

      const result = await riskManager.checkCorrelationLimits('BTCUSDT', 0.1, 50000);
      
      // Adding BTC position to highly correlated ETH position should trigger warning
      expect(result.warnings.length).to.be.greaterThan(0);
    });
  });

  describe('Market Conditions Check', function() {
    it('should warn about low volume markets', async function() {
      mockExchange.getMarketData.resolves({
        volume24h: 500000, // Below 1M threshold
        spread: 0.001,
        priceChange24h: 0.02
      });

      const result = await riskManager.checkMarketConditions('LOWVOLCOIN', {});
      
      expect(result.warnings).to.include.something.that.includes('Low 24h volume');
    });

    it('should warn about wide spreads', async function() {
      mockExchange.getMarketData.resolves({
        volume24h: 2000000,
        spread: 0.005, // 0.5% spread, above 0.2% threshold
        priceChange24h: 0.01
      });

      const result = await riskManager.checkMarketConditions('BTCUSDT', {});
      
      expect(result.warnings).to.include.something.that.includes('Wide spread');
    });

    it('should warn about high volatility', async function() {
      mockExchange.getMarketData.resolves({
        volume24h: 2000000,
        spread: 0.001,
        priceChange24h: 0.15 // 15% price change
      });

      const result = await riskManager.checkMarketConditions('BTCUSDT', {});
      
      expect(result.warnings).to.include.something.that.includes('High price volatility');
    });

    it('should consider ML model confidence', async function() {
      mockExchange.getMarketData.resolves({
        volume24h: 2000000,
        spread: 0.001,
        priceChange24h: 0.02
      });

      const result = await riskManager.checkMarketConditions('BTCUSDT', {
        modelConfidence: 0.5 // Low confidence
      });
      
      expect(result.warnings).to.include.something.that.includes('Low ML model confidence');
    });
  });

  describe('Risk Configuration Management', function() {
    it('should update risk configuration', function() {
      const newConfig = {
        maxPositionSizeUSD: 15000,
        maxDrawdownPercent: 0.08
      };

      riskManager.updateRiskConfiguration(newConfig);
      
      expect(riskManager.config.maxPositionSizeUSD).to.equal(15000);
      expect(riskManager.config.maxDrawdownPercent).to.equal(0.08);
      expect(riskManager.config.maxPortfolioExposure).to.equal(0.95); // Should remain unchanged
    });

    it('should provide risk status', function() {
      const status = riskManager.getRiskStatus();
      
      expect(status).to.have.property('portfolioState');
      expect(status).to.have.property('riskMetrics');
      expect(status).to.have.property('configuration');
      expect(status).to.have.property('lastUpdate');
    });
  });

  describe('Risk Assessment Integration', function() {
    it('should merge multiple risk assessments', function() {
      const target = {
        warnings: ['Warning 1'],
        blockers: [],
        recommendations: ['Rec 1'],
        adjustedQuantity: 10
      };

      const source = {
        warnings: ['Warning 2'],
        blockers: ['Blocker 1'],
        recommendations: ['Rec 2'],
        adjustments: { quantity: 5 }
      };

      riskManager.mergeRiskAssessment(target, source);
      
      expect(target.warnings).to.have.lengthOf(2);
      expect(target.blockers).to.have.lengthOf(1);
      expect(target.recommendations).to.have.lengthOf(2);
      expect(target.adjustedQuantity).to.equal(5); // Should use minimum
    });

    it('should calculate overall risk score', function() {
      const assessmentWithWarnings = {
        warnings: ['Warning 1', 'Warning 2'],
        blockers: [],
        adjustedQuantity: 8,
        originalQuantity: 10
      };

      const score = riskManager.calculateOverallRiskScore(assessmentWithWarnings);
      
      expect(score).to.be.a('number');
      expect(score).to.be.greaterThan(0);
      expect(score).to.be.lessThan(1);
    });

    it('should return maximum risk score for blocked trades', function() {
      const assessmentWithBlockers = {
        warnings: [],
        blockers: ['Critical blocker'],
        adjustedQuantity: 10,
        originalQuantity: 10
      };

      const score = riskManager.calculateOverallRiskScore(assessmentWithBlockers);
      
      expect(score).to.equal(1.0);
    });
  });

  describe('Portfolio State Management', function() {
    it('should update portfolio state from database', async function() {
      await riskManager.updatePortfolioState();
      
      expect(riskManager.riskState.portfolioValue).to.equal(100000);
      expect(riskManager.riskState.totalExposure).to.equal(45000);
      expect(riskManager.riskState.currentDrawdown).to.equal(0.02);
    });

    it('should handle portfolio state update errors', async function() {
      riskManager.getPortfolioSnapshot.rejects(new Error('Database error'));
      
      // Should not throw error
      await riskManager.updatePortfolioState();
      
      // Risk state should remain in previous state
      expect(riskManager.riskState.portfolioValue).to.exist;
    });
  });

  describe('Error Handling and Resilience', function() {
    it('should handle exchange API failures gracefully', async function() {
      mockExchange.getMarketData.rejects(new Error('Exchange API down'));
      
      const assessment = await riskManager.evaluateTradeRisk('bot123', 'BTCUSDT', 'buy', 0.1, 50000);
      
      expect(assessment).to.have.property('approved');
      // Should still provide assessment even with API failures
    });

    it('should handle database failures gracefully', async function() {
      riskManager.updatePortfolioState.rejects(new Error('Database error'));
      
      const assessment = await riskManager.evaluateTradeRisk('bot123', 'BTCUSDT', 'buy', 0.1, 50000);
      
      expect(assessment).to.have.property('approved');
      // Should fall back to default behavior
    });

    it('should provide fallback risk assessment on system errors', async function() {
      // Simulate complete system failure
      sinon.stub(riskManager, 'checkPositionLimits').rejects(new Error('System error'));
      sinon.stub(riskManager, 'checkExposureLimits').rejects(new Error('System error'));
      sinon.stub(riskManager, 'checkDrawdownProtection').rejects(new Error('System error'));

      const assessment = await riskManager.evaluateTradeRisk('bot123', 'BTCUSDT', 'buy', 0.1, 50000);
      
      expect(assessment.approved).to.be.false;
      expect(assessment.blockers).to.include('Risk evaluation system error');
    });
  });
});