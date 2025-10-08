const LatencyInstrumentationService = require('../services/latencyInstrumentationService');
const logger = require('../utils/logger');

/**
 * Performance Monitoring Middleware
 * Automatically instruments HTTP requests with latency tracking
 */
class PerformanceMonitoringMiddleware {
  constructor() {
    this.latencyService = new LatencyInstrumentationService();
    this.requestCounter = 0;
    
    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Express middleware for request timing
   */
  requestTimingMiddleware() {
    return (req, res, next) => {
      const requestId = `req_${++this.requestCounter}_${Date.now()}`;
      const operation = this.getOperationName(req);
      
      // Start timing
      const sessionId = this.latencyService.startTiming(requestId, operation, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        requestId
      });

      // Store session info in request
      req.performanceSession = {
        sessionId,
        requestId,
        operation,
        startTime: Date.now()
      };

      // Intercept response end
      const originalEnd = res.end;
      res.end = (chunk, encoding) => {
        const success = res.statusCode < 400;
        const errorDetails = success ? null : {
          statusCode: res.statusCode,
          statusMessage: res.statusMessage
        };

        // End timing
        this.latencyService.endTiming(sessionId, success, errorDetails);

        // Call original end
        originalEnd.call(res, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Trading operation timing middleware
   */
  tradingOperationMiddleware() {
    return (req, res, next) => {
      // Add trading-specific timing methods to request
      req.startTradingOperation = (operation, metadata = {}) => {
        const sessionId = `trading_${operation}_${Date.now()}`;
        return this.latencyService.startTiming(sessionId, `trading_${operation}`, {
          ...metadata,
          requestId: req.performanceSession?.requestId,
          userId: req.user?.id,
          tradingMode: req.params?.tradingMode || req.body?.tradingMode
        });
      };

      req.endTradingOperation = (sessionId, success = true, errorDetails = null) => {
        return this.latencyService.endTiming(sessionId, success, errorDetails);
      };

      req.startOrderTiming = (orderId, operation, exchange, symbol, metadata = {}) => {
        return this.latencyService.startOrderTiming(orderId, operation, exchange, symbol, {
          ...metadata,
          requestId: req.performanceSession?.requestId,
          userId: req.user?.id
        });
      };

      req.endOrderTiming = (sessionId, success = true, errorDetails = null) => {
        return this.latencyService.endOrderTiming(sessionId, success, errorDetails);
      };

      next();
    };
  }

  /**
   * Database operation timing middleware
   */
  databaseTimingMiddleware() {
    return (req, res, next) => {
      // Add database timing methods to request
      req.startDatabaseOperation = (operation, table, metadata = {}) => {
        const sessionId = `db_${operation}_${table}_${Date.now()}`;
        return this.latencyService.startTiming(sessionId, `database_${operation}`, {
          table,
          ...metadata,
          requestId: req.performanceSession?.requestId
        });
      };

      req.endDatabaseOperation = (sessionId, success = true, errorDetails = null) => {
        return this.latencyService.endTiming(sessionId, success, errorDetails);
      };

      next();
    };
  }

  /**
   * Exchange operation timing middleware
   */
  exchangeTimingMiddleware() {
    return (req, res, next) => {
      // Add exchange timing methods to request
      req.startExchangeOperation = (exchange, operation, metadata = {}) => {
        const sessionId = `exchange_${exchange}_${operation}_${Date.now()}`;
        this.latencyService.startTiming(sessionId, `exchange_${operation}`, {
          exchange,
          ...metadata,
          requestId: req.performanceSession?.requestId
        });
        
        // Also record exchange-specific latency
        return {
          sessionId,
          recordExchangeLatency: (latencyMs) => {
            this.latencyService.recordExchangeLatency(exchange, operation, latencyMs);
          }
        };
      };

      req.endExchangeOperation = (sessionData, success = true, errorDetails = null) => {
        if (typeof sessionData === 'string') {
          // Legacy support for sessionId only
          return this.latencyService.endTiming(sessionData, success, errorDetails);
        }
        
        const timingData = this.latencyService.endTiming(sessionData.sessionId, success, errorDetails);
        
        // Record exchange-specific latency if timing was successful
        if (timingData && sessionData.recordExchangeLatency) {
          sessionData.recordExchangeLatency(timingData.latencyMs);
        }
        
        return timingData;
      };

      next();
    };
  }

  /**
   * Performance metrics endpoint middleware
   */
  metricsEndpointMiddleware() {
    return (req, res, next) => {
      if (req.path === '/metrics' && req.method === 'GET') {
        const format = req.query.format || 'json';
        
        try {
          if (format === 'prometheus') {
            res.set('Content-Type', 'text/plain');
            res.send(this.latencyService.exportPrometheusMetrics());
          } else {
            res.json({
              success: true,
              data: this.latencyService.getMetrics()
            });
          }
        } catch (error) {
          logger.error('Failed to generate metrics', { error: error.message });
          res.status(500).json({
            success: false,
            error: 'Failed to generate metrics'
          });
        }
        
        return; // Don't call next()
      }
      
      next();
    };
  }

  /**
   * Performance alerts endpoint middleware
   */
  alertsEndpointMiddleware() {
    return (req, res, next) => {
      if (req.path === '/performance/alerts' && req.method === 'GET') {
        try {
          const alerts = this.latencyService.getPerformanceAlerts();
          res.json({
            success: true,
            data: {
              alerts,
              count: alerts.length,
              timestamp: new Date().toISOString()
            }
          });
        } catch (error) {
          logger.error('Failed to get performance alerts', { error: error.message });
          res.status(500).json({
            success: false,
            error: 'Failed to get performance alerts'
          });
        }
        
        return; // Don't call next()
      }
      
      next();
    };
  }

  /**
   * Get operation name from request
   */
  getOperationName(req) {
    const method = req.method.toLowerCase();
    const path = req.path;
    
    // Extract meaningful operation names
    if (path.includes('/api/orders')) {
      if (method === 'post') return 'order_placement';
      if (method === 'delete' || path.includes('/cancel')) return 'order_cancellation';
      if (method === 'get') return 'order_query';
    }
    
    if (path.includes('/api/trades')) {
      return 'trade_query';
    }
    
    if (path.includes('/api/positions')) {
      return 'position_query';
    }
    
    if (path.includes('/api/market-data')) {
      return 'market_data_fetch';
    }
    
    if (path.includes('/api/auth')) {
      return 'authentication';
    }
    
    if (path.includes('/api/trading-modes')) {
      return 'trading_mode_operation';
    }
    
    if (path.includes('/api/reconciliation')) {
      return 'reconciliation_operation';
    }
    
    // Default operation name
    return `${method}_${path.split('/')[2] || 'unknown'}`;
  }

  /**
   * Setup event handlers for latency service
   */
  setupEventHandlers() {
    this.latencyService.on('timing_completed', (timingData) => {
      // Log slow operations
      if (timingData.latencyMs > 5000) { // 5 seconds
        logger.warn('Slow operation detected', {
          sessionId: timingData.sessionId,
          operation: timingData.operation,
          latencyMs: Math.round(timingData.latencyMs * 100) / 100,
          success: timingData.success
        });
      }
    });

    this.latencyService.on('threshold_exceeded', (data) => {
      logger.warn('Performance threshold exceeded', {
        operation: data.operation,
        latencyMs: Math.round(data.latencyMs * 100) / 100,
        threshold: data.threshold,
        severity: data.severity
      });
    });

    this.latencyService.on('order_lifecycle_completed', (orderMetrics) => {
      logger.info('Order lifecycle completed', {
        orderId: orderMetrics.orderId,
        exchange: orderMetrics.exchange,
        symbol: orderMetrics.symbol,
        totalLatency: Math.round(orderMetrics.totalLatency * 100) / 100,
        operations: orderMetrics.lifecycle.length
      });
    });
  }

  /**
   * Get middleware stack for Express app
   */
  getMiddlewareStack() {
    return [
      this.requestTimingMiddleware(),
      this.tradingOperationMiddleware(),
      this.databaseTimingMiddleware(),
      this.exchangeTimingMiddleware(),
      this.metricsEndpointMiddleware(),
      this.alertsEndpointMiddleware()
    ];
  }

  /**
   * Get latency service instance
   */
  getLatencyService() {
    return this.latencyService;
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary() {
    const metrics = this.latencyService.getMetrics();
    const alerts = this.latencyService.getPerformanceAlerts();
    
    return {
      system: {
        totalRequests: metrics.system.totalRequests,
        totalErrors: metrics.system.totalErrors,
        errorRate: metrics.system.totalRequests > 0 ? 
          (metrics.system.totalErrors / metrics.system.totalRequests * 100).toFixed(2) + '%' : '0%',
        averageLatency: Math.round(metrics.system.averageLatency * 100) / 100,
        p95Latency: Math.round(metrics.system.p95Latency * 100) / 100
      },
      realtime: {
        requestsPerSecond: Math.round(metrics.realtime.requestsPerSecond * 100) / 100,
        errorsPerSecond: Math.round(metrics.realtime.errorsPerSecond * 100) / 100,
        activeRequests: metrics.realtime.activeRequests,
        queueDepth: metrics.realtime.queueDepth
      },
      alerts: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warnings: alerts.filter(a => a.severity === 'warning').length
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export performance data for external monitoring
   */
  exportPerformanceData(format = 'json') {
    const metrics = this.latencyService.getMetrics();
    
    switch (format) {
      case 'prometheus':
        return this.latencyService.exportPrometheusMetrics();
      
      case 'csv':
        return this.exportCSVMetrics(metrics);
      
      case 'json':
      default:
        return JSON.stringify(metrics, null, 2);
    }
  }

  /**
   * Export metrics in CSV format
   */
  exportCSVMetrics(metrics) {
    let csv = 'operation,count,avg_latency_ms,p50_latency_ms,p90_latency_ms,p95_latency_ms,p99_latency_ms,min_latency_ms,max_latency_ms\n';
    
    for (const [operation, operationMetrics] of Object.entries(metrics.operations)) {
      csv += `${operation},${operationMetrics.count},${operationMetrics.avg.toFixed(2)},${operationMetrics.p50.toFixed(2)},${operationMetrics.p90.toFixed(2)},${operationMetrics.p95.toFixed(2)},${operationMetrics.p99.toFixed(2)},${operationMetrics.min.toFixed(2)},${operationMetrics.max.toFixed(2)}\n`;
    }
    
    return csv;
  }
}

// Create singleton instance
const performanceMonitoring = new PerformanceMonitoringMiddleware();

module.exports = performanceMonitoring;