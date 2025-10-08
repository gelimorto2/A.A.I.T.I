const { expect } = require('chai');
const { 
  IExchangeAdapter,
  ExchangeContractValidator,
  OrderType,
  OrderSide,
  OrderStatus,
  ExchangeCapability,
  ExchangeError,
  ConnectionError,
  AuthenticationError,
  RateLimitError,
  OrderError,
  InsufficientFundsError,
  InvalidSymbolError,
  OrderSpec,
  ExchangeResponse
} = require('../interfaces/IExchangeAdapter');
const MockExchangeAdapter = require('../adapters/MockExchangeAdapter');

describe('Exchange Adapter Contract Tests', () => {
  let mockExchange;
  let validator;

  beforeEach(() => {
    mockExchange = new MockExchangeAdapter({
      apiKey: 'test_api_key',
      secretKey: 'test_secret_key',
      sandbox: true,
      orderExecutionDelay: 50,
      connectionFailureRate: 0,
      authFailureRate: 0,
      orderFailureRate: 0,
      rateLimitFailureRate: 0
    });
    
    validator = new ExchangeContractValidator(mockExchange);
  });

  afterEach(async () => {
    if (mockExchange.isConnected) {
      await mockExchange.disconnect();
    }
  });

  describe('Contract Interface Validation', () => {
    it('should pass contract validation', async () => {
      const results = await validator.validate();
      
      expect(results.score).to.be.at.least(90);
      expect(results.failed).to.have.length(0);
      
      console.log('Contract Validation Report:', validator.generateReport());
    });

    it('should implement all required methods', () => {
      const requiredMethods = [
        'connect', 'disconnect', 'isHealthy', 'authenticate', 'validateCredentials',
        'getMarketData', 'getOrderBook', 'getTrades', 'getCandles',
        'getBalance', 'getPositions', 'getAccountInfo',
        'createOrder', 'cancelOrder', 'getOrder', 'getOrders', 'getOrderHistory',
        'subscribeToMarketData', 'subscribeToOrderUpdates',
        'unsubscribeFromMarketData', 'unsubscribeFromOrderUpdates',
        'getExchangeName', 'getSupportedSymbols', 'getCapabilities',
        'getRateLimits', 'handleError', 'retry'
      ];

      requiredMethods.forEach(method => {
        expect(mockExchange).to.have.property(method);
        expect(mockExchange[method]).to.be.a('function');
      });
    });

    it('should have required properties', () => {
      expect(mockExchange).to.have.property('config');
      expect(mockExchange).to.have.property('isConnected');
      expect(mockExchange).to.have.property('capabilities');
      
      expect(mockExchange.isConnected).to.be.a('boolean');
      expect(mockExchange.capabilities).to.be.instanceOf(Set);
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const response = await mockExchange.connect();
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data.connected).to.be.true;
      expect(mockExchange.isConnected).to.be.true;
    });

    it('should disconnect successfully', async () => {
      await mockExchange.connect();
      const response = await mockExchange.disconnect();
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data.disconnected).to.be.true;
      expect(mockExchange.isConnected).to.be.false;
    });

    it('should report health status', async () => {
      await mockExchange.connect();
      const response = await mockExchange.isHealthy();
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data).to.have.property('connected');
      expect(response.data).to.have.property('latency');
      expect(response.data).to.have.property('rateLimitRemaining');
    });

    it('should handle connection failures', async () => {
      // Create adapter with 100% failure rate
      const failingAdapter = new MockExchangeAdapter({
        connectionFailureRate: 1.0
      });

      try {
        await failingAdapter.connect();
        expect.fail('Should have thrown connection error');
      } catch (error) {
        expect(error).to.be.instanceOf(ConnectionError);
        expect(error.code).to.equal('CONNECTION_ERROR');
      }
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      await mockExchange.connect();
    });

    it('should authenticate successfully', async () => {
      const response = await mockExchange.authenticate();
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data.authenticated).to.be.true;
      expect(mockExchange.isAuthenticated).to.be.true;
    });

    it('should validate credentials', async () => {
      const response = await mockExchange.validateCredentials();
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data.valid).to.be.true;
    });

    it('should handle authentication failures', async () => {
      const failingAdapter = new MockExchangeAdapter({
        authFailureRate: 1.0
      });
      await failingAdapter.connect();

      try {
        await failingAdapter.authenticate();
        expect.fail('Should have thrown authentication error');
      } catch (error) {
        expect(error).to.be.instanceOf(AuthenticationError);
        expect(error.code).to.equal('AUTHENTICATION_ERROR');
      }
    });

    it('should require connection before authentication', async () => {
      const disconnectedAdapter = new MockExchangeAdapter();

      try {
        await disconnectedAdapter.authenticate();
        expect.fail('Should have thrown connection error');
      } catch (error) {
        expect(error).to.be.instanceOf(ConnectionError);
      }
    });
  });

  describe('Market Data', () => {
    beforeEach(async () => {
      await mockExchange.connect();
    });

    it('should get market data for valid symbol', async () => {
      const response = await mockExchange.getMarketData('BTC/USD');
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data).to.have.property('symbol', 'BTC/USD');
      expect(response.data).to.have.property('price');
      expect(response.data).to.have.property('bid');
      expect(response.data).to.have.property('ask');
      expect(response.data).to.have.property('volume');
    });

    it('should get order book', async () => {
      const response = await mockExchange.getOrderBook('BTC/USD', 10);
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data).to.have.property('symbol', 'BTC/USD');
      expect(response.data).to.have.property('bids');
      expect(response.data).to.have.property('asks');
      expect(response.data.bids).to.be.an('array');
      expect(response.data.asks).to.be.an('array');
      expect(response.data.bids.length).to.be.at.most(10);
    });

    it('should get recent trades', async () => {
      const response = await mockExchange.getTrades('BTC/USD', 50);
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data).to.be.an('array');
      expect(response.data.length).to.be.at.most(50);
      
      if (response.data.length > 0) {
        const trade = response.data[0];
        expect(trade).to.have.property('id');
        expect(trade).to.have.property('symbol', 'BTC/USD');
        expect(trade).to.have.property('price');
        expect(trade).to.have.property('quantity');
        expect(trade).to.have.property('side');
        expect(trade).to.have.property('timestamp');
      }
    });

    it('should get candles/OHLCV data', async () => {
      const response = await mockExchange.getCandles('BTC/USD', '1h', 20);
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data).to.be.an('array');
      expect(response.data.length).to.be.at.most(20);
      
      if (response.data.length > 0) {
        const candle = response.data[0];
        expect(candle).to.be.an('array');
        expect(candle).to.have.length(6); // [timestamp, open, high, low, close, volume]
      }
    });

    it('should handle invalid symbols', async () => {
      try {
        await mockExchange.getMarketData('INVALID/SYMBOL');
        expect.fail('Should have thrown invalid symbol error');
      } catch (error) {
        expect(error).to.be.instanceOf(InvalidSymbolError);
        expect(error.code).to.equal('INVALID_SYMBOL');
        expect(error.symbol).to.equal('INVALID/SYMBOL');
      }
    });
  });

  describe('Account Information', () => {
    beforeEach(async () => {
      await mockExchange.connect();
      await mockExchange.authenticate();
    });

    it('should get account balance', async () => {
      const response = await mockExchange.getBalance();
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data).to.be.an('object');
      
      // Should have balance for base currencies
      expect(response.data).to.have.property('USD');
      expect(response.data).to.have.property('BTC');
      
      Object.values(response.data).forEach(balance => {
        expect(balance).to.have.property('free');
        expect(balance).to.have.property('used');
        expect(balance).to.have.property('total');
      });
    });

    it('should get positions', async () => {
      const response = await mockExchange.getPositions();
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data).to.be.an('array');
    });

    it('should get account info', async () => {
      const response = await mockExchange.getAccountInfo();
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data).to.have.property('accountId');
      expect(response.data).to.have.property('balance');
      expect(response.data).to.have.property('tradingEnabled');
      expect(response.data).to.have.property('permissions');
    });

    it('should require authentication for account operations', async () => {
      await mockExchange.disconnect();
      await mockExchange.connect();
      
      try {
        await mockExchange.getBalance();
        expect.fail('Should have thrown authentication error');
      } catch (error) {
        expect(error).to.be.instanceOf(AuthenticationError);
      }
    });
  });

  describe('Order Management', () => {
    beforeEach(async () => {
      await mockExchange.connect();
      await mockExchange.authenticate();
    });

    it('should create market order successfully', async () => {
      const orderParams = {
        symbol: 'BTC/USD',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 0.001
      };

      const response = await mockExchange.createOrder(orderParams);
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data).to.have.property('id');
      expect(response.data).to.have.property('symbol', 'BTC/USD');
      expect(response.data).to.have.property('side', OrderSide.BUY);
      expect(response.data).to.have.property('type', OrderType.MARKET);
      expect(response.data).to.have.property('quantity', 0.001);
      expect(response.data).to.have.property('status');
    });

    it('should create limit order successfully', async () => {
      const orderParams = {
        symbol: 'BTC/USD',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 0.001,
        price: 45000
      };

      const response = await mockExchange.createOrder(orderParams);
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data).to.have.property('price', 45000);
    });

    it('should validate order parameters', async () => {
      try {
        await mockExchange.createOrder({
          symbol: 'BTC/USD',
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          quantity: 0.001
          // Missing required price for limit order
        });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).to.include('Price is required for limit orders');
      }
    });

    it('should handle insufficient funds', async () => {
      try {
        await mockExchange.createOrder({
          symbol: 'BTC/USD',
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          quantity: 100 // Way more than available balance
        });
        expect.fail('Should have thrown insufficient funds error');
      } catch (error) {
        expect(error).to.be.instanceOf(InsufficientFundsError);
        expect(error.code).to.equal('INSUFFICIENT_FUNDS');
      }
    });

    it('should get order by ID', async () => {
      // Create order first
      const createResponse = await mockExchange.createOrder({
        symbol: 'BTC/USD',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 0.001,
        price: 45000
      });

      const orderId = createResponse.data.id;
      
      // Get order
      const getResponse = await mockExchange.getOrder(orderId, 'BTC/USD');
      
      expect(getResponse).to.be.instanceOf(ExchangeResponse);
      expect(getResponse.success).to.be.true;
      expect(getResponse.data).to.have.property('id', orderId);
    });

    it('should cancel order successfully', async () => {
      // Create order first
      const createResponse = await mockExchange.createOrder({
        symbol: 'BTC/USD',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 0.001,
        price: 45000
      });

      const orderId = createResponse.data.id;
      
      // Cancel order
      const cancelResponse = await mockExchange.cancelOrder(orderId, 'BTC/USD');
      
      expect(cancelResponse).to.be.instanceOf(ExchangeResponse);
      expect(cancelResponse.success).to.be.true;
      expect(cancelResponse.data).to.have.property('status', OrderStatus.CANCELLED);
    });

    it('should get orders with filters', async () => {
      // Create a few orders
      await mockExchange.createOrder({
        symbol: 'BTC/USD',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 0.001,
        price: 45000
      });

      await mockExchange.createOrder({
        symbol: 'ETH/USD',
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        quantity: 0.1,
        price: 3500
      });

      // Get all orders
      const allOrdersResponse = await mockExchange.getOrders();
      expect(allOrdersResponse.data).to.be.an('array');
      expect(allOrdersResponse.data.length).to.be.at.least(2);

      // Get orders for specific symbol
      const btcOrdersResponse = await mockExchange.getOrders('BTC/USD');
      expect(btcOrdersResponse.data).to.be.an('array');
      btcOrdersResponse.data.forEach(order => {
        expect(order.symbol).to.equal('BTC/USD');
      });
    });

    it('should get order history', async () => {
      const response = await mockExchange.getOrderHistory();
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data).to.be.an('array');
    });
  });

  describe('WebSocket Subscriptions', () => {
    beforeEach(async () => {
      await mockExchange.connect();
    });

    it('should subscribe to market data', async () => {
      const callback = sinon.spy();
      const response = await mockExchange.subscribeToMarketData(['BTC/USD', 'ETH/USD'], callback);
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data.subscribed).to.include('BTC/USD');
      expect(response.data.subscribed).to.include('ETH/USD');
    });

    it('should subscribe to order updates', async () => {
      await mockExchange.authenticate();
      
      const callback = sinon.spy();
      const response = await mockExchange.subscribeToOrderUpdates(callback);
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data.subscribed).to.equal('order_updates');
    });

    it('should unsubscribe from market data', async () => {
      // Subscribe first
      await mockExchange.subscribeToMarketData(['BTC/USD'], () => {});
      
      // Then unsubscribe
      const response = await mockExchange.unsubscribeFromMarketData(['BTC/USD']);
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data.unsubscribed).to.include('BTC/USD');
    });
  });

  describe('Exchange Information', () => {
    it('should return exchange name', () => {
      const name = mockExchange.getExchangeName();
      expect(name).to.be.a('string');
      expect(name).to.equal('Mock Exchange');
    });

    it('should return supported symbols', () => {
      const symbols = mockExchange.getSupportedSymbols();
      expect(symbols).to.be.an('array');
      expect(symbols).to.include('BTC/USD');
      expect(symbols).to.include('ETH/USD');
    });

    it('should return capabilities', () => {
      const capabilities = mockExchange.getCapabilities();
      expect(capabilities).to.be.an('array');
      expect(capabilities).to.include(ExchangeCapability.SPOT_TRADING);
      expect(capabilities).to.include(ExchangeCapability.WEBSOCKET_MARKET_DATA);
    });

    it('should return rate limits', () => {
      const rateLimits = mockExchange.getRateLimits();
      expect(rateLimits).to.be.an('object');
      expect(rateLimits).to.have.property('requestsPerSecond');
      expect(rateLimits).to.have.property('requestsPerMinute');
      expect(rateLimits).to.have.property('remaining');
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await mockExchange.connect();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');
      const response = await mockExchange.handleError(error, { context: 'test' });
      
      expect(response).to.be.instanceOf(ExchangeResponse);
      expect(response.success).to.be.true;
      expect(response.data.handled).to.be.true;
    });

    it('should retry operations', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await mockExchange.retry(operation, 3);
      expect(result).to.equal('success');
      expect(attempts).to.equal(3);
    });

    it('should handle rate limit errors', async () => {
      // Create adapter with high rate limit failure rate
      const rateLimitAdapter = new MockExchangeAdapter({
        rateLimitFailureRate: 1.0
      });
      await rateLimitAdapter.connect();

      try {
        await rateLimitAdapter.getMarketData('BTC/USD');
        expect.fail('Should have thrown rate limit error');
      } catch (error) {
        expect(error).to.be.instanceOf(RateLimitError);
        expect(error.code).to.equal('RATE_LIMIT_ERROR');
        expect(error.retryAfter).to.be.a('number');
      }
    });
  });

  describe('Order Spec Validation', () => {
    it('should create valid order spec', () => {
      const orderSpec = new OrderSpec({
        symbol: 'BTC/USD',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 0.001,
        price: 50000
      });

      expect(orderSpec.symbol).to.equal('BTC/USD');
      expect(orderSpec.side).to.equal(OrderSide.BUY);
      expect(orderSpec.type).to.equal(OrderType.LIMIT);
      expect(orderSpec.quantity).to.equal(0.001);
      expect(orderSpec.price).to.equal(50000);
    });

    it('should validate required parameters', () => {
      try {
        new OrderSpec({
          symbol: 'BTC/USD',
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          quantity: 0.001
          // Missing required price
        });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).to.include('Price is required for limit orders');
      }
    });

    it('should validate order sides', () => {
      try {
        new OrderSpec({
          symbol: 'BTC/USD',
          side: 'invalid_side',
          type: OrderType.MARKET,
          quantity: 0.001
        });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).to.include('Invalid order side');
      }
    });

    it('should serialize to JSON', () => {
      const orderSpec = new OrderSpec({
        symbol: 'BTC/USD',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: 0.001,
        price: 50000,
        clientOrderId: 'test_123'
      });

      const json = orderSpec.toJSON();
      expect(json).to.have.property('symbol', 'BTC/USD');
      expect(json).to.have.property('clientOrderId', 'test_123');
    });
  });

  describe('Exchange Response', () => {
    it('should create successful response', () => {
      const data = { test: 'data' };
      const response = new ExchangeResponse(data, { exchange: 'test' });

      expect(response.success).to.be.true;
      expect(response.data).to.deep.equal(data);
      expect(response.metadata.exchange).to.equal('test');
      expect(response.metadata.timestamp).to.be.a('string');
      expect(response.metadata.requestId).to.be.a('string');
    });

    it('should create error response', () => {
      const error = new Error('Test error');
      const response = ExchangeResponse.error(error, { exchange: 'test' });

      expect(response.success).to.be.false;
      expect(response.error.message).to.equal('Test error');
      expect(response.metadata.exchange).to.equal('test');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent market data requests', async () => {
      await mockExchange.connect();
      
      const promises = [];
      const symbols = ['BTC/USD', 'ETH/USD', 'LTC/USD'];
      
      for (let i = 0; i < 50; i++) {
        const symbol = symbols[i % symbols.length];
        promises.push(mockExchange.getMarketData(symbol));
      }
      
      const results = await Promise.all(promises);
      
      results.forEach(response => {
        expect(response).to.be.instanceOf(ExchangeResponse);
        expect(response.success).to.be.true;
      });
    });

    it('should maintain performance under load', async () => {
      await mockExchange.connect();
      await mockExchange.authenticate();
      
      const startTime = Date.now();
      const requests = [];
      
      // Make 100 concurrent requests
      for (let i = 0; i < 100; i++) {
        requests.push(mockExchange.getBalance());
      }
      
      await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (allowing for mock latency)
      expect(duration).to.be.lessThan(10000); // 10 seconds
    });
  });
});

// Additional contract test helper
function createContractTestSuite(exchangeAdapterClass, config = {}) {
  return () => {
    let adapter;
    let validator;

    beforeEach(() => {
      adapter = new exchangeAdapterClass(config);
      validator = new ExchangeContractValidator(adapter);
    });

    it('should pass contract validation', async () => {
      const results = await validator.validate();
      expect(results.score).to.be.at.least(90);
    });

    it('should implement IExchangeAdapter interface', () => {
      expect(adapter).to.be.instanceOf(IExchangeAdapter);
    });

    // Add more universal contract tests here
  };
}

module.exports = {
  createContractTestSuite
};