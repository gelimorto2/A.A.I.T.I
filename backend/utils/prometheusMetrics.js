const promClient = require('prom-client');
const logger = require('./logger');

/**
 * AAITI Prometheus Metrics Collection System
 * Enhanced monitoring and alerting for trading operations
 * Part of System Enhancements - Enhanced Monitoring & Alerting
 */

class PrometheusMetrics {
  constructor() {
    // Create a Registry which registers the metrics
    this.register = new promClient.Registry();
    
    // Add a default label which is added to all metrics
    this.register.setDefaultLabels({
      app: 'aaiti-backend',
      version: process.env.npm_package_version || '1.3.0'
    });

    // Register default Node.js metrics
    promClient.collectDefaultMetrics({
      register: this.register,
      prefix: 'aaiti_nodejs_'
    });

    // Initialize custom metrics
    this.initializeCustomMetrics();

    this.log('Prometheus metrics system initialized');
  }

  /**
   * Initialize custom trading-specific metrics
   */
  initializeCustomMetrics() {
    // API Request metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'aaiti_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'aaiti_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    // Trading metrics
    this.tradesTotal = new promClient.Counter({
      name: 'aaiti_trades_total',
      help: 'Total number of trades executed',
      labelNames: ['symbol', 'side', 'status', 'exchange']
    });

    this.tradeValue = new promClient.Histogram({
      name: 'aaiti_trade_value_usd',
      help: 'Value of trades in USD',
      labelNames: ['symbol', 'side', 'exchange'],
      buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000, 50000]
    });

    this.portfolioValue = new promClient.Gauge({
      name: 'aaiti_portfolio_value_usd',
      help: 'Current portfolio value in USD',
      labelNames: ['user_id', 'currency']
    });

    this.tradingBotStatus = new promClient.Gauge({
      name: 'aaiti_trading_bot_status',
      help: 'Trading bot status (1 = active, 0 = inactive)',
      labelNames: ['bot_id', 'user_id', 'strategy']
    });

    // ML Model metrics
    this.mlModelPredictions = new promClient.Counter({
      name: 'aaiti_ml_predictions_total',
      help: 'Total number of ML predictions made',
      labelNames: ['model_type', 'symbol', 'prediction_type']
    });

    this.mlModelAccuracy = new promClient.Gauge({
      name: 'aaiti_ml_model_accuracy',
      help: 'ML model accuracy percentage',
      labelNames: ['model_type', 'symbol']
    });

    this.mlModelTrainingDuration = new promClient.Histogram({
      name: 'aaiti_ml_training_duration_seconds',
      help: 'Duration of ML model training in seconds',
      labelNames: ['model_type', 'symbol'],
      buckets: [1, 5, 10, 30, 60, 300, 600, 1800]
    });

    // Database metrics
    this.dbQueryDuration = new promClient.Histogram({
      name: 'aaiti_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]
    });

    this.dbConnections = new promClient.Gauge({
      name: 'aaiti_db_connections',
      help: 'Number of active database connections',
      labelNames: ['pool_type']
    });

    this.dbCacheHitRate = new promClient.Gauge({
      name: 'aaiti_db_cache_hit_rate',
      help: 'Database cache hit rate percentage'
    });

    // Cache metrics
    this.cacheOperations = new promClient.Counter({
      name: 'aaiti_cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'cache_type', 'status']
    });

    this.cacheHitRate = new promClient.Gauge({
      name: 'aaiti_cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['cache_type']
    });

    this.cacheSize = new promClient.Gauge({
      name: 'aaiti_cache_size_bytes',
      help: 'Cache size in bytes',
      labelNames: ['cache_type']
    });

    // API Pool metrics
    this.apiRequestsTotal = new promClient.Counter({
      name: 'aaiti_api_requests_total',
      help: 'Total number of external API requests',
      labelNames: ['service', 'endpoint', 'status']
    });

    this.apiRequestDuration = new promClient.Histogram({
      name: 'aaiti_api_request_duration_seconds',
      help: 'Duration of external API requests in seconds',
      labelNames: ['service', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });

    this.apiConnectionPoolSize = new promClient.Gauge({
      name: 'aaiti_api_connection_pool_size',
      help: 'Number of connections in API pool',
      labelNames: ['service', 'status']
    });

    // WebSocket metrics
    this.wsConnections = new promClient.Gauge({
      name: 'aaiti_websocket_connections',
      help: 'Number of active WebSocket connections'
    });

    this.wsMessages = new promClient.Counter({
      name: 'aaiti_websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['direction', 'event_type']
    });

    // Market Data metrics
    this.marketDataUpdates = new promClient.Counter({
      name: 'aaiti_market_data_updates_total',
      help: 'Total number of market data updates',
      labelNames: ['symbol', 'data_type', 'source']
    });

    this.marketDataLatency = new promClient.Histogram({
      name: 'aaiti_market_data_latency_seconds',
      help: 'Market data update latency in seconds',
      labelNames: ['symbol', 'source'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    });

    // Risk Management metrics
    this.riskViolations = new promClient.Counter({
      name: 'aaiti_risk_violations_total',
      help: 'Total number of risk rule violations',
      labelNames: ['rule_type', 'severity', 'symbol']
    });

    this.portfolioDrawdown = new promClient.Gauge({
      name: 'aaiti_portfolio_drawdown_percent',
      help: 'Current portfolio drawdown percentage',
      labelNames: ['user_id', 'timeframe']
    });

    this.positionSize = new promClient.Gauge({
      name: 'aaiti_position_size_usd',
      help: 'Current position size in USD',
      labelNames: ['user_id', 'symbol', 'side']
    });

    // System Performance metrics
    this.cpuUsage = new promClient.Gauge({
      name: 'aaiti_cpu_usage_percent',
      help: 'CPU usage percentage'
    });

    this.memoryUsage = new promClient.Gauge({
      name: 'aaiti_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type']
    });

    this.diskUsage = new promClient.Gauge({
      name: 'aaiti_disk_usage_bytes',
      help: 'Disk usage in bytes',
      labelNames: ['mount_point']
    });

    // Register all metrics
    this.registerAllMetrics();
  }

  /**
   * Register all metrics with the registry
   */
  registerAllMetrics() {
    const metrics = [
      this.httpRequestDuration,
      this.httpRequestTotal,
      this.tradesTotal,
      this.tradeValue,
      this.portfolioValue,
      this.tradingBotStatus,
      this.mlModelPredictions,
      this.mlModelAccuracy,
      this.mlModelTrainingDuration,
      this.dbQueryDuration,
      this.dbConnections,
      this.dbCacheHitRate,
      this.cacheOperations,
      this.cacheHitRate,
      this.cacheSize,
      this.apiRequestsTotal,
      this.apiRequestDuration,
      this.apiConnectionPoolSize,
      this.wsConnections,
      this.wsMessages,
      this.marketDataUpdates,
      this.marketDataLatency,
      this.riskViolations,
      this.portfolioDrawdown,
      this.positionSize,
      this.cpuUsage,
      this.memoryUsage,
      this.diskUsage
    ];

    metrics.forEach(metric => {
      this.register.registerMetric(metric);
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method, route, statusCode, duration) {
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  }

  /**
   * Record trade execution
   */
  recordTrade(symbol, side, status, exchange, value) {
    this.tradesTotal.inc({ symbol, side, status, exchange });
    if (value) {
      this.tradeValue.observe({ symbol, side, exchange }, value);
    }
  }

  /**
   * Update portfolio value
   */
  updatePortfolioValue(userId, currency, value) {
    this.portfolioValue.set({ user_id: userId, currency }, value);
  }

  /**
   * Update trading bot status
   */
  updateTradingBotStatus(botId, userId, strategy, isActive) {
    this.tradingBotStatus.set({ bot_id: botId, user_id: userId, strategy }, isActive ? 1 : 0);
  }

  /**
   * Record ML prediction
   */
  recordMLPrediction(modelType, symbol, predictionType) {
    this.mlModelPredictions.inc({ model_type: modelType, symbol, prediction_type: predictionType });
  }

  /**
   * Update ML model accuracy
   */
  updateMLModelAccuracy(modelType, symbol, accuracy) {
    this.mlModelAccuracy.set({ model_type: modelType, symbol }, accuracy);
  }

  /**
   * Record ML training duration
   */
  recordMLTrainingDuration(modelType, symbol, duration) {
    this.mlModelTrainingDuration.observe({ model_type: modelType, symbol }, duration);
  }

  /**
   * Record database query
   */
  recordDbQuery(operation, table, duration) {
    this.dbQueryDuration.observe({ operation, table }, duration);
  }

  /**
   * Update database connections
   */
  updateDbConnections(poolType, count) {
    this.dbConnections.set({ pool_type: poolType }, count);
  }

  /**
   * Update cache metrics
   */
  updateCacheMetrics(cacheType, hitRate, sizeBytes) {
    this.cacheHitRate.set({ cache_type: cacheType }, hitRate);
    this.cacheSize.set({ cache_type: cacheType }, sizeBytes);
  }

  /**
   * Record cache operation
   */
  recordCacheOperation(operation, cacheType, status) {
    this.cacheOperations.inc({ operation, cache_type: cacheType, status });
  }

  /**
   * Record API request
   */
  recordApiRequest(service, endpoint, status, duration) {
    this.apiRequestsTotal.inc({ service, endpoint, status });
    this.apiRequestDuration.observe({ service, endpoint }, duration);
  }

  /**
   * Update WebSocket metrics
   */
  updateWebSocketConnections(count) {
    this.wsConnections.set(count);
  }

  /**
   * Record WebSocket message
   */
  recordWebSocketMessage(direction, eventType) {
    this.wsMessages.inc({ direction, event_type: eventType });
  }

  /**
   * Record market data update
   */
  recordMarketDataUpdate(symbol, dataType, source, latency) {
    this.marketDataUpdates.inc({ symbol, data_type: dataType, source });
    if (latency !== undefined) {
      this.marketDataLatency.observe({ symbol, source }, latency);
    }
  }

  /**
   * Record risk violation
   */
  recordRiskViolation(ruleType, severity, symbol) {
    this.riskViolations.inc({ rule_type: ruleType, severity, symbol });
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    this.memoryUsage.set({ type: 'external' }, memUsage.external);

    const cpuUsage = process.cpuUsage();
    this.cpuUsage.set((cpuUsage.user + cpuUsage.system) / 1000000); // Convert to percentage
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics() {
    // Update system metrics before returning
    this.updateSystemMetrics();
    return this.register.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsJSON() {
    const metrics = await this.register.getMetricsAsJSON();
    return metrics;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.register.clear();
    this.log('All metrics cleared');
  }

  /**
   * Create metrics middleware for Express
   */
  createMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        this.recordHttpRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
      });
      
      next();
    };
  }

  /**
   * Log metrics operations
   * @private
   */
  log(message, data = {}) {
    if (logger && typeof logger.info === 'function') {
      logger.info(`[Metrics] ${message}`, { service: 'prometheus-metrics', ...data });
    } else {
      console.log(`[Metrics] ${message}`, data);
    }
  }
}

// Create singleton instance
let metricsInstance = null;

/**
 * Get Prometheus metrics instance
 * @returns {PrometheusMetrics} - Metrics instance
 */
function getMetrics() {
  if (!metricsInstance) {
    metricsInstance = new PrometheusMetrics();
  }
  return metricsInstance;
}

module.exports = {
  PrometheusMetrics,
  getMetrics
};