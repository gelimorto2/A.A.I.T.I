const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');
const LatencyInstrumentationService = require('../services/latencyInstrumentationService');
const PerformanceMonitoringMiddleware = require('../middleware/performanceMonitoring');
const performanceRouter = require('../routes/performance');

describe('Latency Instrumentation System', function() {
  let latencyService;
  let performanceMiddleware;
  let app;
  let sandbox;

  before(function() {
    // Create test app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = {
        id: 1,
        permissions: ['admin', 'paper_trading', 'live_trading']
      };
      req.ip = '127.0.0.1';
      next();
    });
    
    app.use('/api/performance', performanceRouter);
  });

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    latencyService = new LatencyInstrumentationService();
    performanceMiddleware = new PerformanceMonitoringMiddleware();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('LatencyInstrumentationService', function() {
    describe('Basic Timing Operations', function() {
      it('should start and end timing sessions', function() {
        const sessionId = 'test_session_1';
        const operation = 'test_operation';
        
        latencyService.startTiming(sessionId, operation, { test: true });
        
        expect(latencyService.activeSessions.has(sessionId)).to.be.true;
        expect(latencyService.metrics.realtimeMetrics.activeRequests).to.equal(1);
        
        // Wait a bit to ensure some latency
        return new Promise(resolve => {
          setTimeout(() => {
            const timingData = latencyService.endTiming(sessionId, true);
            
            expect(timingData).to.not.be.null;
            expect(timingData.sessionId).to.equal(sessionId);
            expect(timingData.operation).to.equal(operation);
            expect(timingData.latencyMs).to.be.greaterThan(0);
            expect(timingData.success).to.be.true;
            expect(latencyService.activeSessions.has(sessionId)).to.be.false;
            
            resolve();
          }, 10);
        });
      });

      it('should handle non-existent timing sessions gracefully', function() {
        const result = latencyService.endTiming('non_existent_session');
        expect(result).to.be.null;
      });

      it('should track multiple concurrent sessions', function() {
        const sessions = ['session1', 'session2', 'session3'];
        
        sessions.forEach(sessionId => {
          latencyService.startTiming(sessionId, 'concurrent_test');
        });
        
        expect(latencyService.activeSessions.size).to.equal(3);
        expect(latencyService.metrics.realtimeMetrics.activeRequests).to.equal(3);
        
        // End all sessions
        sessions.forEach(sessionId => {
          latencyService.endTiming(sessionId, true);
        });
        
        expect(latencyService.activeSessions.size).to.equal(0);
      });
    });

    describe('Order Lifecycle Tracking', function() {
      it('should track order lifecycle timing', function() {
        const orderId = 'ORDER_123';
        const exchange = 'binance';
        const symbol = 'BTC/USD';
        
        // Start order placement
        const placementSessionId = latencyService.startOrderTiming(
          orderId, 'placement', exchange, symbol
        );
        
        expect(latencyService.metrics.orderRoundTrip.has(orderId)).to.be.true;
        
        // End placement
        return new Promise(resolve => {
          setTimeout(() => {
            latencyService.endOrderTiming(placementSessionId, true);
            
            const orderMetrics = latencyService.metrics.orderRoundTrip.get(orderId);
            expect(orderMetrics.lifecycle).to.have.length(1);
            expect(orderMetrics.lifecycle[0].operation).to.equal('placement');
            expect(orderMetrics.totalLatency).to.be.greaterThan(0);
            
            resolve();
          }, 10);
        });
      });

      it('should detect when order lifecycle is complete', function() {
        const orderId = 'ORDER_456';
        
        // Mock a complete order lifecycle
        latencyService.metrics.orderRoundTrip.set(orderId, {
          orderId,
          exchange: 'coinbase',
          symbol: 'ETH/USD',
          lifecycle: [
            { operation: 'placement', latencyMs: 100, success: true },
            { operation: 'acknowledgment', latencyMs: 50, success: true }
          ],
          totalLatency: 150
        });
        
        const orderMetrics = latencyService.metrics.orderRoundTrip.get(orderId);
        const isComplete = latencyService.isOrderLifecycleComplete(orderMetrics);
        
        expect(isComplete).to.be.true;
      });
    });

    describe('Exchange Latency Recording', function() {
      it('should record exchange-specific latency', function() {
        const exchange = 'binance';
        const operation = 'order_placement';
        const latencyMs = 125.5;
        
        latencyService.recordExchangeLatency(exchange, operation, latencyMs);
        
        const key = `${exchange}_${operation}`;
        const exchangeMetrics = latencyService.metrics.exchangeLatency.get(key);
        
        expect(exchangeMetrics).to.exist;
        expect(exchangeMetrics.exchange).to.equal(exchange);
        expect(exchangeMetrics.operation).to.equal(operation);
        expect(exchangeMetrics.samples).to.include(latencyMs);
        expect(exchangeMetrics.stats.count).to.equal(1);
      });

      it('should calculate exchange statistics correctly', function() {
        const exchange = 'coinbase';
        const operation = 'market_data';
        const latencies = [100, 150, 200, 75, 300];
        
        latencies.forEach(latency => {
          latencyService.recordExchangeLatency(exchange, operation, latency);
        });
        
        const key = `${exchange}_${operation}`;
        const exchangeMetrics = latencyService.metrics.exchangeLatency.get(key);
        
        expect(exchangeMetrics.stats.count).to.equal(5);
        expect(exchangeMetrics.stats.min).to.equal(75);
        expect(exchangeMetrics.stats.max).to.equal(300);
        expect(exchangeMetrics.stats.avg).to.equal(165); // (100+150+200+75+300)/5
      });
    });

    describe('Performance Thresholds', function() {
      it('should detect threshold violations', function() {
        const operation = 'order_placement';
        const threshold = 1000; // 1 second
        const latencyMs = 1500; // 1.5 seconds
        
        // Set threshold
        latencyService.thresholds[operation] = threshold;
        
        const isExceeded = latencyService.isThresholdExceeded(operation, latencyMs);
        expect(isExceeded).to.be.true;
        
        const isNotExceeded = latencyService.isThresholdExceeded(operation, 500);
        expect(isNotExceeded).to.be.false;
      });

      it('should emit threshold exceeded events', function(done) {
        const operation = 'test_operation';
        const threshold = 100;
        
        latencyService.thresholds[operation] = threshold;
        
        latencyService.once('threshold_exceeded', (data) => {
          expect(data.operation).to.equal(operation);
          expect(data.latencyMs).to.be.greaterThan(threshold);
          expect(data.severity).to.be.oneOf(['warning', 'critical']);
          done();
        });
        
        // Start and end timing with high latency
        const sessionId = 'threshold_test';
        latencyService.startTiming(sessionId, operation);
        
        setTimeout(() => {
          latencyService.endTiming(sessionId, true);
        }, 150); // Should exceed 100ms threshold
      });
    });

    describe('Histogram and Percentiles', function() {
      it('should create and populate histograms', function() {
        const operation = 'histogram_test';
        const latencies = [10, 25, 50, 100, 250, 500, 1000];
        
        latencies.forEach(latency => {
          latencyService.recordLatency(operation, latency);
        });
        
        const operationMetrics = latencyService.metrics.operationLatency.get(operation);
        expect(operationMetrics.histogram).to.exist;
        expect(operationMetrics.histogram.length).to.equal(latencyService.histogramBuckets.length);
      });

      it('should calculate percentiles correctly', function() {
        const operation = 'percentile_test';
        const latencies = [];
        
        // Generate 100 latency samples from 1-100ms
        for (let i = 1; i <= 100; i++) {
          latencies.push(i);
        }
        
        latencies.forEach(latency => {
          latencyService.recordLatency(operation, latency);
        });
        
        const percentiles = latencyService.getPercentiles(operation);
        
        expect(percentiles).to.exist;
        expect(percentiles.p50).to.be.approximately(50, 2); // Median should be ~50
        expect(percentiles.p90).to.be.approximately(90, 2); // 90th percentile should be ~90
        expect(percentiles.p95).to.be.approximately(95, 2); // 95th percentile should be ~95
        expect(percentiles.p99).to.be.approximately(99, 2); // 99th percentile should be ~99
      });
    });

    describe('Performance Alerts', function() {
      it('should generate alerts for high latency', function() {
        // Simulate high system latency
        latencyService.metrics.systemPerformance.p95Latency = 15000; // 15 seconds
        
        const alerts = latencyService.getPerformanceAlerts();
        
        const criticalAlert = alerts.find(alert => alert.severity === 'critical');
        expect(criticalAlert).to.exist;
        expect(criticalAlert.type).to.equal('high_latency');
      });

      it('should generate alerts for high error rate', function() {
        // Simulate high error rate
        const now = Date.now();
        for (let i = 0; i < 15; i++) {
          latencyService.slidingWindow.errors.push({
            timestamp: now - (i * 1000),
            operation: 'test_operation'
          });
        }
        
        const alerts = latencyService.getPerformanceAlerts();
        
        const errorAlert = alerts.find(alert => alert.type === 'high_error_rate');
        expect(errorAlert).to.exist;
        expect(errorAlert.severity).to.equal('warning');
      });
    });

    describe('Metrics Export', function() {
      it('should export Prometheus format metrics', function() {
        // Add some sample data
        latencyService.recordLatency('test_operation', 100);
        latencyService.recordLatency('test_operation', 200);
        
        const prometheusMetrics = latencyService.exportPrometheusMetrics();
        
        expect(prometheusMetrics).to.be.a('string');
        expect(prometheusMetrics).to.include('aaiti_requests_total');
        expect(prometheusMetrics).to.include('aaiti_latency_seconds');
        expect(prometheusMetrics).to.include('test_operation');
      });

      it('should provide comprehensive metrics', function() {
        // Add sample data
        latencyService.recordLatency('operation1', 100);
        latencyService.recordExchangeLatency('binance', 'orders', 150);
        
        const metrics = latencyService.getMetrics();
        
        expect(metrics).to.have.property('system');
        expect(metrics).to.have.property('realtime');
        expect(metrics).to.have.property('operations');
        expect(metrics).to.have.property('exchanges');
        expect(metrics).to.have.property('orders');
        expect(metrics).to.have.property('thresholds');
        expect(metrics).to.have.property('timestamp');
      });
    });
  });

  describe('PerformanceMonitoringMiddleware', function() {
    describe('Request Timing Middleware', function() {
      it('should time HTTP requests', function(done) {
        const app = express();
        const middleware = new PerformanceMonitoringMiddleware();
        
        app.use(middleware.requestTimingMiddleware());
        app.get('/test', (req, res) => {
          expect(req.performanceSession).to.exist;
          expect(req.performanceSession.sessionId).to.be.a('string');
          expect(req.performanceSession.operation).to.be.a('string');
          res.json({ success: true });
        });
        
        request(app)
          .get('/test')
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            done();
          });
      });

      it('should detect operation names from request paths', function() {
        const middleware = new PerformanceMonitoringMiddleware();
        
        const orderRequest = { method: 'POST', path: '/api/orders' };
        expect(middleware.getOperationName(orderRequest)).to.equal('order_placement');
        
        const tradeRequest = { method: 'GET', path: '/api/trades' };
        expect(middleware.getOperationName(tradeRequest)).to.equal('trade_query');
        
        const marketDataRequest = { method: 'GET', path: '/api/market-data' };
        expect(middleware.getOperationName(marketDataRequest)).to.equal('market_data_fetch');
      });
    });

    describe('Trading Operation Middleware', function() {
      it('should provide trading timing methods', function(done) {
        const app = express();
        const middleware = new PerformanceMonitoringMiddleware();
        
        app.use(middleware.requestTimingMiddleware());
        app.use(middleware.tradingOperationMiddleware());
        
        app.post('/trade', (req, res) => {
          expect(req.startTradingOperation).to.be.a('function');
          expect(req.endTradingOperation).to.be.a('function');
          expect(req.startOrderTiming).to.be.a('function');
          expect(req.endOrderTiming).to.be.a('function');
          
          const sessionId = req.startTradingOperation('order_placement', {
            symbol: 'BTC/USD',
            quantity: 1
          });
          
          expect(sessionId).to.be.a('string');
          
          setTimeout(() => {
            req.endTradingOperation(sessionId, true);
            res.json({ success: true });
          }, 10);
        });
        
        request(app)
          .post('/trade')
          .expect(200)
          .end(done);
      });
    });

    describe('Exchange Timing Middleware', function() {
      it('should provide exchange timing methods', function(done) {
        const app = express();
        const middleware = new PerformanceMonitoringMiddleware();
        
        app.use(middleware.requestTimingMiddleware());
        app.use(middleware.exchangeTimingMiddleware());
        
        app.get('/exchange-test', (req, res) => {
          expect(req.startExchangeOperation).to.be.a('function');
          expect(req.endExchangeOperation).to.be.a('function');
          
          const sessionData = req.startExchangeOperation('binance', 'market_data', {
            symbol: 'BTC/USD'
          });
          
          expect(sessionData.sessionId).to.be.a('string');
          expect(sessionData.recordExchangeLatency).to.be.a('function');
          
          setTimeout(() => {
            req.endExchangeOperation(sessionData, true);
            res.json({ success: true });
          }, 10);
        });
        
        request(app)
          .get('/exchange-test')
          .expect(200)
          .end(done);
      });
    });
  });

  describe('Performance API Routes', function() {
    describe('Metrics Endpoints', function() {
      it('should get performance metrics', async function() {
        const response = await request(app)
          .get('/api/performance/metrics')
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('system');
        expect(response.body.data).to.have.property('realtime');
        expect(response.body.data).to.have.property('operations');
      });

      it('should get performance summary', async function() {
        const response = await request(app)
          .get('/api/performance/summary')
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('system');
        expect(response.body.data).to.have.property('realtime');
        expect(response.body.data).to.have.property('alerts');
      });

      it('should get performance alerts', async function() {
        const response = await request(app)
          .get('/api/performance/alerts')
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('alerts');
        expect(response.body.data).to.have.property('count');
        expect(response.body.data).to.have.property('summary');
      });

      it('should filter alerts by severity', async function() {
        const response = await request(app)
          .get('/api/performance/alerts?severity=critical')
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data.alerts).to.be.an('array');
      });
    });

    describe('Health Endpoint', function() {
      it('should get performance health status', async function() {
        const response = await request(app)
          .get('/api/performance/health')
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('status');
        expect(response.body.data).to.have.property('score');
        expect(response.body.data).to.have.property('checks');
        expect(response.body.data.checks).to.have.property('latency');
        expect(response.body.data.checks).to.have.property('errorRate');
        expect(response.body.data.checks).to.have.property('activeRequests');
      });
    });

    describe('Percentiles Endpoint', function() {
      it('should get operation percentiles', async function() {
        // First add some data
        const service = performanceMiddleware.getLatencyService();
        service.recordLatency('test_operation', 100);
        service.recordLatency('test_operation', 200);
        
        const response = await request(app)
          .get('/api/performance/operations/test_operation/percentiles')
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('operation');
        expect(response.body.data).to.have.property('percentiles');
      });

      it('should return 404 for non-existent operation', async function() {
        const response = await request(app)
          .get('/api/performance/operations/non_existent/percentiles')
          .expect(404);

        expect(response.body.success).to.be.false;
        expect(response.body.error).to.include('No data found');
      });
    });

    describe('Admin Operations', function() {
      it('should reset metrics with admin permissions', async function() {
        const response = await request(app)
          .delete('/api/performance/metrics/reset')
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.message).to.include('reset successfully');
      });
    });
  });

  describe('Real-time Metrics', function() {
    it('should update sliding window metrics', function(done) {
      latencyService.startRealtimeMetrics();
      
      // Add some requests to sliding window
      const now = Date.now();
      latencyService.slidingWindow.requests.push({
        timestamp: now,
        operation: 'test'
      });
      
      latencyService.slidingWindow.errors.push({
        timestamp: now,
        operation: 'test'
      });
      
      // Wait for next update cycle
      setTimeout(() => {
        expect(latencyService.metrics.realtimeMetrics.requestsPerSecond).to.be.greaterThan(0);
        done();
      }, 1100); // Wait slightly more than 1 second
    });
  });

  describe('Event Emission', function() {
    it('should emit timing completed events', function(done) {
      latencyService.on('timing_completed', (data) => {
        expect(data).to.have.property('sessionId');
        expect(data).to.have.property('operation');
        expect(data).to.have.property('latencyMs');
        expect(data).to.have.property('success');
        done();
      });
      
      const sessionId = 'event_test';
      latencyService.startTiming(sessionId, 'test_operation');
      
      setTimeout(() => {
        latencyService.endTiming(sessionId, true);
      }, 10);
    });

    it('should emit order lifecycle completed events', function(done) {
      latencyService.on('order_lifecycle_completed', (data) => {
        expect(data).to.have.property('orderId');
        expect(data).to.have.property('exchange');
        expect(data).to.have.property('totalLatency');
        done();
      });
      
      // Mock complete order lifecycle
      const orderId = 'EVENT_ORDER_123';
      latencyService.metrics.orderRoundTrip.set(orderId, {
        orderId,
        exchange: 'binance',
        symbol: 'BTC/USD',
        lifecycle: [
          { operation: 'placement', latencyMs: 100 },
          { operation: 'acknowledgment', latencyMs: 50 }
        ],
        totalLatency: 150
      });
      
      // Trigger event
      const orderMetrics = latencyService.metrics.orderRoundTrip.get(orderId);
      latencyService.emit('order_lifecycle_completed', orderMetrics);
    });
  });

  describe('Error Handling', function() {
    it('should handle timing errors gracefully', function() {
      // Test ending non-existent session
      const result = latencyService.endTiming('non_existent_session', false, {
        error: 'Test error'
      });
      
      expect(result).to.be.null;
    });

    it('should handle invalid percentile requests', function() {
      const percentiles = latencyService.getPercentiles('non_existent_operation');
      expect(percentiles).to.be.null;
    });

    it('should handle empty histogram calculations', function() {
      const histogram = latencyService.createHistogram();
      const summary = latencyService.getHistogramSummary(histogram);
      
      expect(summary).to.be.an('object');
      expect(Object.values(summary).every(val => val === 0)).to.be.true;
    });
  });
});