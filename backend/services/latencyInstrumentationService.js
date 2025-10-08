const EventEmitter = require('events');
const logger = require('../utils/logger');

/**
 * Latency Instrumentation Service
 * Tracks order lifecycle timing, exchange response times, and performance bottlenecks
 */
class LatencyInstrumentationService extends EventEmitter {
  constructor() {
    super();
    
    // Histogram buckets for latency measurements (in milliseconds)
    this.histogramBuckets = [
      1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000
    ];
    
    // Performance metrics storage
    this.metrics = {
      orderRoundTrip: new Map(), // orderId -> timing data
      exchangeLatency: new Map(), // exchange -> latency histogram
      operationLatency: new Map(), // operation -> latency histogram
      systemPerformance: {
        totalRequests: 0,
        totalErrors: 0,
        averageLatency: 0,
        p50Latency: 0,
        p90Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        maxLatency: 0,
        minLatency: Number.MAX_VALUE
      },
      realtimeMetrics: {
        requestsPerSecond: 0,
        errorsPerSecond: 0,
        activeRequests: 0,
        queueDepth: 0
      }
    };
    
    // Sliding window for real-time metrics (last 60 seconds)
    this.slidingWindow = {
      requests: [],
      errors: [],
      windowSize: 60000 // 60 seconds in milliseconds
    };
    
    // Active timing sessions
    this.activeSessions = new Map();
    
    // Performance thresholds
    this.thresholds = {
      orderPlacement: 1000, // 1 second
      orderCancellation: 500, // 500ms
      marketDataFetch: 200, // 200ms
      exchangeConnection: 5000, // 5 seconds
      databaseQuery: 100, // 100ms
      criticalLatency: 10000, // 10 seconds
      warningLatency: 2500 // 2.5 seconds
    };
    
    // Start real-time metrics calculation
    this.startRealtimeMetrics();
  }

  /**
   * Start timing session for operation
   */
  startTiming(sessionId, operation, metadata = {}) {
    const startTime = process.hrtime.bigint();
    
    this.activeSessions.set(sessionId, {
      operation,
      startTime,
      metadata: {
        ...metadata,
        sessionId,
        startTimestamp: new Date().toISOString()
      }
    });
    
    this.metrics.realtimeMetrics.activeRequests++;
    
    // Add to sliding window
    this.slidingWindow.requests.push({
      timestamp: Date.now(),
      sessionId,
      operation
    });
    
    this.emit('timing_started', {
      sessionId,
      operation,
      metadata: this.activeSessions.get(sessionId).metadata
    });
  }

  /**
   * End timing session and record latency
   */
  endTiming(sessionId, success = true, errorDetails = null) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      logger.warn('Timing session not found', { sessionId });
      return null;
    }

    const endTime = process.hrtime.bigint();
    const latencyNs = endTime - session.startTime;
    const latencyMs = Number(latencyNs) / 1000000; // Convert to milliseconds

    const timingData = {
      sessionId,
      operation: session.operation,
      latencyMs,
      latencyNs,
      success,
      errorDetails,
      metadata: session.metadata,
      endTimestamp: new Date().toISOString()
    };

    // Remove from active sessions
    this.activeSessions.delete(sessionId);
    this.metrics.realtimeMetrics.activeRequests--;

    // Record metrics
    this.recordLatency(session.operation, latencyMs);
    this.updateSystemMetrics(latencyMs, success);

    // Check thresholds
    this.checkThresholds(timingData);

    // Add to sliding window if error
    if (!success) {
      this.slidingWindow.errors.push({
        timestamp: Date.now(),
        sessionId,
        operation: session.operation,
        latencyMs,
        errorDetails
      });
      this.metrics.realtimeMetrics.errorsPerSecond++;
    }

    logger.info('Operation timing recorded', {
      sessionId,
      operation: session.operation,
      latencyMs: Math.round(latencyMs * 100) / 100,
      success,
      thresholdExceeded: this.isThresholdExceeded(session.operation, latencyMs)
    });

    this.emit('timing_completed', timingData);

    return timingData;
  }

  /**
   * Start order lifecycle timing
   */
  startOrderTiming(orderId, operation, exchange, symbol, metadata = {}) {
    const sessionId = `order_${orderId}_${operation}_${Date.now()}`;
    
    if (!this.metrics.orderRoundTrip.has(orderId)) {
      this.metrics.orderRoundTrip.set(orderId, {
        orderId,
        exchange,
        symbol,
        lifecycle: [],
        totalLatency: 0,
        startTime: Date.now(),
        metadata
      });
    }

    this.startTiming(sessionId, `order_${operation}`, {
      orderId,
      exchange,
      symbol,
      operation,
      ...metadata
    });

    return sessionId;
  }

  /**
   * End order lifecycle timing
   */
  endOrderTiming(sessionId, success = true, errorDetails = null) {
    const timingData = this.endTiming(sessionId, success, errorDetails);
    
    if (timingData && timingData.metadata.orderId) {
      const orderId = timingData.metadata.orderId;
      const orderMetrics = this.metrics.orderRoundTrip.get(orderId);
      
      if (orderMetrics) {
        orderMetrics.lifecycle.push({
          operation: timingData.metadata.operation,
          latencyMs: timingData.latencyMs,
          success,
          timestamp: timingData.endTimestamp,
          errorDetails
        });
        
        orderMetrics.totalLatency += timingData.latencyMs;
        
        // Check if order lifecycle is complete
        if (this.isOrderLifecycleComplete(orderMetrics)) {
          this.emit('order_lifecycle_completed', orderMetrics);
        }
      }
    }

    return timingData;
  }

  /**
   * Record exchange-specific latency
   */
  recordExchangeLatency(exchange, operation, latencyMs) {
    const key = `${exchange}_${operation}`;
    
    if (!this.metrics.exchangeLatency.has(key)) {
      this.metrics.exchangeLatency.set(key, {
        exchange,
        operation,
        histogram: this.createHistogram(),
        samples: [],
        stats: {
          count: 0,
          sum: 0,
          min: Number.MAX_VALUE,
          max: 0,
          avg: 0,
          p50: 0,
          p90: 0,
          p95: 0,
          p99: 0
        }
      });
    }

    const exchangeMetrics = this.metrics.exchangeLatency.get(key);
    this.addToHistogram(exchangeMetrics.histogram, latencyMs);
    
    // Keep last 1000 samples for percentile calculation
    exchangeMetrics.samples.push(latencyMs);
    if (exchangeMetrics.samples.length > 1000) {
      exchangeMetrics.samples.shift();
    }

    // Update statistics
    this.updateExchangeStats(exchangeMetrics, latencyMs);
  }

  /**
   * Record operation latency
   */
  recordLatency(operation, latencyMs) {
    if (!this.metrics.operationLatency.has(operation)) {
      this.metrics.operationLatency.set(operation, {
        operation,
        histogram: this.createHistogram(),
        samples: [],
        stats: {
          count: 0,
          sum: 0,
          min: Number.MAX_VALUE,
          max: 0,
          avg: 0,
          p50: 0,
          p90: 0,
          p95: 0,
          p99: 0
        }
      });
    }

    const operationMetrics = this.metrics.operationLatency.get(operation);
    this.addToHistogram(operationMetrics.histogram, latencyMs);
    
    // Keep last 1000 samples for percentile calculation
    operationMetrics.samples.push(latencyMs);
    if (operationMetrics.samples.length > 1000) {
      operationMetrics.samples.shift();
    }

    // Update statistics
    this.updateOperationStats(operationMetrics, latencyMs);
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics() {
    return {
      system: this.metrics.systemPerformance,
      realtime: this.metrics.realtimeMetrics,
      operations: this.getOperationMetrics(),
      exchanges: this.getExchangeMetrics(),
      orders: this.getOrderMetrics(),
      thresholds: this.thresholds,
      activeSessions: this.activeSessions.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get operation-specific metrics
   */
  getOperationMetrics() {
    const operations = {};
    
    for (const [operation, metrics] of this.metrics.operationLatency) {
      operations[operation] = {
        ...metrics.stats,
        histogram: this.getHistogramSummary(metrics.histogram),
        thresholdMs: this.thresholds[operation] || null,
        thresholdExceeded: metrics.stats.avg > (this.thresholds[operation] || Number.MAX_VALUE)
      };
    }
    
    return operations;
  }

  /**
   * Get exchange-specific metrics
   */
  getExchangeMetrics() {
    const exchanges = {};
    
    for (const [key, metrics] of this.metrics.exchangeLatency) {
      const [exchange, operation] = key.split('_');
      
      if (!exchanges[exchange]) {
        exchanges[exchange] = {};
      }
      
      exchanges[exchange][operation] = {
        ...metrics.stats,
        histogram: this.getHistogramSummary(metrics.histogram)
      };
    }
    
    return exchanges;
  }

  /**
   * Get order lifecycle metrics
   */
  getOrderMetrics() {
    const orderMetrics = {
      activeOrders: this.metrics.orderRoundTrip.size,
      completedOrders: 0,
      averageLifecycleTime: 0,
      slowestOrders: []
    };

    const completedOrders = [];
    for (const [orderId, order] of this.metrics.orderRoundTrip) {
      if (this.isOrderLifecycleComplete(order)) {
        completedOrders.push(order);
      }
    }

    orderMetrics.completedOrders = completedOrders.length;
    
    if (completedOrders.length > 0) {
      const totalTime = completedOrders.reduce((sum, order) => sum + order.totalLatency, 0);
      orderMetrics.averageLifecycleTime = totalTime / completedOrders.length;
      
      // Get slowest orders
      orderMetrics.slowestOrders = completedOrders
        .sort((a, b) => b.totalLatency - a.totalLatency)
        .slice(0, 10)
        .map(order => ({
          orderId: order.orderId,
          exchange: order.exchange,
          symbol: order.symbol,
          totalLatency: order.totalLatency,
          operations: order.lifecycle.length
        }));
    }

    return orderMetrics;
  }

  /**
   * Get latency percentiles for operation
   */
  getPercentiles(operation) {
    const operationMetrics = this.metrics.operationLatency.get(operation);
    if (!operationMetrics || operationMetrics.samples.length === 0) {
      return null;
    }

    const sortedSamples = [...operationMetrics.samples].sort((a, b) => a - b);
    const length = sortedSamples.length;

    return {
      p50: this.getPercentile(sortedSamples, 0.5),
      p90: this.getPercentile(sortedSamples, 0.9),
      p95: this.getPercentile(sortedSamples, 0.95),
      p99: this.getPercentile(sortedSamples, 0.99),
      min: sortedSamples[0],
      max: sortedSamples[length - 1],
      count: length
    };
  }

  /**
   * Get performance alerts
   */
  getPerformanceAlerts() {
    const alerts = [];
    const now = Date.now();

    // Check system-wide performance
    if (this.metrics.systemPerformance.p95Latency > this.thresholds.criticalLatency) {
      alerts.push({
        severity: 'critical',
        type: 'high_latency',
        message: `System P95 latency is ${Math.round(this.metrics.systemPerformance.p95Latency)}ms`,
        threshold: this.thresholds.criticalLatency,
        actual: this.metrics.systemPerformance.p95Latency,
        timestamp: new Date().toISOString()
      });
    }

    // Check error rate
    const recentErrors = this.slidingWindow.errors.filter(
      error => now - error.timestamp < 60000 // Last minute
    );
    
    if (recentErrors.length > 10) {
      alerts.push({
        severity: 'warning',
        type: 'high_error_rate',
        message: `High error rate: ${recentErrors.length} errors in the last minute`,
        threshold: 10,
        actual: recentErrors.length,
        timestamp: new Date().toISOString()
      });
    }

    // Check individual operation thresholds
    for (const [operation, metrics] of this.metrics.operationLatency) {
      const threshold = this.thresholds[operation];
      if (threshold && metrics.stats.p95 > threshold) {
        alerts.push({
          severity: metrics.stats.p95 > threshold * 2 ? 'critical' : 'warning',
          type: 'operation_threshold_exceeded',
          message: `${operation} P95 latency is ${Math.round(metrics.stats.p95)}ms`,
          operation,
          threshold,
          actual: metrics.stats.p95,
          timestamp: new Date().toISOString()
        });
      }
    }

    return alerts;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics() {
    let metrics = '';
    
    // System metrics
    metrics += `# HELP aaiti_requests_total Total number of requests\n`;
    metrics += `# TYPE aaiti_requests_total counter\n`;
    metrics += `aaiti_requests_total ${this.metrics.systemPerformance.totalRequests}\n\n`;
    
    metrics += `# HELP aaiti_errors_total Total number of errors\n`;
    metrics += `# TYPE aaiti_errors_total counter\n`;
    metrics += `aaiti_errors_total ${this.metrics.systemPerformance.totalErrors}\n\n`;
    
    metrics += `# HELP aaiti_latency_seconds Request latency in seconds\n`;
    metrics += `# TYPE aaiti_latency_seconds histogram\n`;
    
    // Operation latency histograms
    for (const [operation, operationMetrics] of this.metrics.operationLatency) {
      const histogram = operationMetrics.histogram;
      let cumulativeCount = 0;
      
      for (let i = 0; i < this.histogramBuckets.length; i++) {
        cumulativeCount += histogram[i];
        metrics += `aaiti_latency_seconds_bucket{operation="${operation}",le="${this.histogramBuckets[i] / 1000}"} ${cumulativeCount}\n`;
      }
      
      metrics += `aaiti_latency_seconds_count{operation="${operation}"} ${operationMetrics.stats.count}\n`;
      metrics += `aaiti_latency_seconds_sum{operation="${operation}"} ${operationMetrics.stats.sum / 1000}\n`;
    }
    
    return metrics;
  }

  // Helper methods

  createHistogram() {
    return new Array(this.histogramBuckets.length).fill(0);
  }

  addToHistogram(histogram, latencyMs) {
    for (let i = 0; i < this.histogramBuckets.length; i++) {
      if (latencyMs <= this.histogramBuckets[i]) {
        histogram[i]++;
        break;
      }
    }
  }

  getHistogramSummary(histogram) {
    const summary = {};
    for (let i = 0; i < this.histogramBuckets.length; i++) {
      summary[`le_${this.histogramBuckets[i]}ms`] = histogram[i];
    }
    return summary;
  }

  updateSystemMetrics(latencyMs, success) {
    const metrics = this.metrics.systemPerformance;
    
    metrics.totalRequests++;
    if (!success) {
      metrics.totalErrors++;
    }
    
    metrics.maxLatency = Math.max(metrics.maxLatency, latencyMs);
    metrics.minLatency = Math.min(metrics.minLatency, latencyMs);
    
    // Update running average
    const totalLatency = (metrics.averageLatency * (metrics.totalRequests - 1)) + latencyMs;
    metrics.averageLatency = totalLatency / metrics.totalRequests;
  }

  updateOperationStats(operationMetrics, latencyMs) {
    const stats = operationMetrics.stats;
    
    stats.count++;
    stats.sum += latencyMs;
    stats.min = Math.min(stats.min, latencyMs);
    stats.max = Math.max(stats.max, latencyMs);
    stats.avg = stats.sum / stats.count;
    
    // Calculate percentiles from samples
    if (operationMetrics.samples.length > 0) {
      const sorted = [...operationMetrics.samples].sort((a, b) => a - b);
      stats.p50 = this.getPercentile(sorted, 0.5);
      stats.p90 = this.getPercentile(sorted, 0.9);
      stats.p95 = this.getPercentile(sorted, 0.95);
      stats.p99 = this.getPercentile(sorted, 0.99);
    }
  }

  updateExchangeStats(exchangeMetrics, latencyMs) {
    this.updateOperationStats(exchangeMetrics, latencyMs);
  }

  getPercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  isThresholdExceeded(operation, latencyMs) {
    const threshold = this.thresholds[operation];
    return threshold && latencyMs > threshold;
  }

  checkThresholds(timingData) {
    const { operation, latencyMs, sessionId } = timingData;
    const threshold = this.thresholds[operation.replace('order_', '')];
    
    if (threshold && latencyMs > threshold) {
      const severity = latencyMs > threshold * 2 ? 'critical' : 'warning';
      
      this.emit('threshold_exceeded', {
        severity,
        sessionId,
        operation,
        latencyMs,
        threshold,
        timingData
      });
      
      logger.warn('Performance threshold exceeded', {
        sessionId,
        operation,
        latencyMs: Math.round(latencyMs * 100) / 100,
        threshold,
        severity
      });
    }
  }

  isOrderLifecycleComplete(orderMetrics) {
    const requiredOperations = ['placement', 'acknowledgment'];
    const completedOperations = orderMetrics.lifecycle.map(op => op.operation);
    
    return requiredOperations.every(op => completedOperations.includes(op));
  }

  startRealtimeMetrics() {
    // Update real-time metrics every second
    setInterval(() => {
      this.updateRealtimeMetrics();
    }, 1000);
  }

  updateRealtimeMetrics() {
    const now = Date.now();
    const windowStart = now - this.slidingWindow.windowSize;
    
    // Clean old entries
    this.slidingWindow.requests = this.slidingWindow.requests.filter(
      req => req.timestamp > windowStart
    );
    this.slidingWindow.errors = this.slidingWindow.errors.filter(
      err => err.timestamp > windowStart
    );
    
    // Calculate rates
    this.metrics.realtimeMetrics.requestsPerSecond = this.slidingWindow.requests.length / 60;
    this.metrics.realtimeMetrics.errorsPerSecond = this.slidingWindow.errors.length / 60;
    this.metrics.realtimeMetrics.queueDepth = this.activeSessions.size;
  }
}

module.exports = LatencyInstrumentationService;