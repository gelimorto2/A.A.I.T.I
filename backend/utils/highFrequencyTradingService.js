const logger = require('./logger');
const { EventEmitter } = require('events');

/**
 * High-Frequency Trading Service
 * Implements low-latency infrastructure and optimization capabilities
 */
class HighFrequencyTradingService extends EventEmitter {
  constructor(exchangeAbstraction) {
    super();
    this.exchangeAbstraction = exchangeAbstraction;
    this.webSocketConnections = new Map();
    this.orderBatch = [];
    this.batchTimeout = null;
    this.latencyMetrics = new Map();
    this.coLocationRecommendations = new Map();
    
    // Configuration
    this.config = {
      batchSize: 10,
      batchTimeoutMs: 50, // 50ms batching window
      maxLatencyMs: 200,
      webSocketReconnectDelayMs: 1000,
      heartbeatIntervalMs: 30000,
      metricsRetentionMs: 300000 // 5 minutes
    };

    this.initializeLatencyTracking();
    logger.info('HighFrequencyTradingService initialized');
  }

  /**
   * Initialize WebSocket streaming for all exchanges
   */
  async initializeWebSocketStreaming() {
    logger.info('Initializing WebSocket streaming for all exchanges...');
    
    const exchanges = this.exchangeAbstraction.listExchanges();
    const streamingPromises = exchanges.map(exchange => 
      this.setupExchangeWebSocket(exchange)
    );

    try {
      await Promise.allSettled(streamingPromises);
      logger.info(`WebSocket streaming initialized for ${exchanges.length} exchanges`);
      
      // Start heartbeat monitoring
      this.startHeartbeatMonitoring();
      
      return {
        success: true,
        activeConnections: this.webSocketConnections.size,
        exchanges: exchanges.map(ex => ex.id)
      };
    } catch (error) {
      logger.error('Failed to initialize WebSocket streaming:', error);
      throw error;
    }
  }

  /**
   * Setup WebSocket connection for specific exchange
   */
  async setupExchangeWebSocket(exchange) {
    const exchangeId = exchange.id;
    
    try {
      // Mock WebSocket setup (in real implementation, use actual WebSocket libraries)
      const wsConnection = {
        exchangeId,
        connected: false,
        lastHeartbeat: Date.now(),
        subscriptions: new Set(),
        reconnectAttempts: 0,
        latencyHistory: []
      };

      // Simulate WebSocket connection
      wsConnection.connected = true;
      wsConnection.lastHeartbeat = Date.now();
      
      this.webSocketConnections.set(exchangeId, wsConnection);
      
      // Subscribe to essential data streams
      await this.subscribeToStreams(exchangeId, [
        'orderbook',
        'trades',
        'ticker',
        'user_data'
      ]);

      logger.info(`WebSocket connected to ${exchangeId}`);
      
      // Emit connection event
      this.emit('websocket_connected', { exchangeId });
      
    } catch (error) {
      logger.error(`Failed to setup WebSocket for ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to data streams
   */
  async subscribeToStreams(exchangeId, streams) {
    const connection = this.webSocketConnections.get(exchangeId);
    if (!connection) {
      throw new Error(`No WebSocket connection for ${exchangeId}`);
    }

    for (const stream of streams) {
      connection.subscriptions.add(stream);
      
      // Simulate subscription confirmation
      logger.debug(`Subscribed to ${stream} on ${exchangeId}`);
      
      // Emit subscription event
      this.emit('stream_subscribed', { exchangeId, stream });
    }

    logger.info(`Subscribed to ${streams.length} streams on ${exchangeId}`);
  }

  /**
   * Implement smart order batching
   */
  async batchOrder(orderRequest) {
    const timestamp = Date.now();
    
    // Add order to batch with timestamp
    this.orderBatch.push({
      ...orderRequest,
      batchTimestamp: timestamp,
      orderId: `batch_${timestamp}_${this.orderBatch.length}`
    });

    // If batch is full or timeout exists, process immediately
    if (this.orderBatch.length >= this.config.batchSize) {
      return await this.processBatch();
    }

    // Set timeout for batch processing if not already set
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(async () => {
        await this.processBatch();
      }, this.config.batchTimeoutMs);
    }

    return {
      batched: true,
      batchSize: this.orderBatch.length,
      estimatedProcessingTime: this.config.batchTimeoutMs
    };
  }

  /**
   * Process batched orders
   */
  async processBatch() {
    if (this.orderBatch.length === 0) return;

    const batchStartTime = Date.now();
    const currentBatch = [...this.orderBatch];
    this.orderBatch = [];
    
    // Clear timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    logger.info(`Processing batch of ${currentBatch.length} orders`);

    try {
      // Group orders by exchange for optimal routing
      const ordersByExchange = new Map();
      
      for (const order of currentBatch) {
        const exchangeId = order.exchangeId;
        if (!ordersByExchange.has(exchangeId)) {
          ordersByExchange.set(exchangeId, []);
        }
        ordersByExchange.get(exchangeId).push(order);
      }

      // Process orders by exchange in parallel
      const processingPromises = Array.from(ordersByExchange.entries()).map(
        ([exchangeId, orders]) => this.processExchangeBatch(exchangeId, orders)
      );

      const results = await Promise.allSettled(processingPromises);
      
      const batchProcessingTime = Date.now() - batchStartTime;
      
      // Record latency metrics
      this.recordLatencyMetric('batch_processing', batchProcessingTime);

      logger.info(`Batch processed in ${batchProcessingTime}ms`);

      // Emit batch completion event
      this.emit('batch_processed', {
        orderCount: currentBatch.length,
        processingTime: batchProcessingTime,
        exchangeCount: ordersByExchange.size
      });

      return {
        success: true,
        orderCount: currentBatch.length,
        processingTime: batchProcessingTime,
        results: results.map(r => r.status === 'fulfilled' ? r.value : r.reason)
      };

    } catch (error) {
      logger.error('Error processing order batch:', error);
      throw error;
    }
  }

  /**
   * Process batch for specific exchange
   */
  async processExchangeBatch(exchangeId, orders) {
    const startTime = Date.now();
    
    try {
      // Execute orders in parallel for this exchange
      const orderPromises = orders.map(order => 
        this.executeWithLatencyTracking(exchangeId, order)
      );

      const results = await Promise.allSettled(orderPromises);
      const processingTime = Date.now() - startTime;

      logger.debug(`Exchange ${exchangeId} batch processed in ${processingTime}ms`);

      return {
        exchangeId,
        orderCount: orders.length,
        processingTime,
        successCount: results.filter(r => r.status === 'fulfilled').length,
        failureCount: results.filter(r => r.status === 'rejected').length
      };

    } catch (error) {
      logger.error(`Error processing batch for ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Execute order with latency tracking
   */
  async executeWithLatencyTracking(exchangeId, order) {
    const startTime = Date.now();
    
    try {
      // Simulate order execution (replace with actual exchange API call)
      const result = await this.exchangeAbstraction.placeOrder(exchangeId, order);
      
      const latency = Date.now() - startTime;
      this.recordLatencyMetric(exchangeId, latency);

      // Check if latency exceeds threshold
      if (latency > this.config.maxLatencyMs) {
        logger.warn(`High latency detected for ${exchangeId}: ${latency}ms`);
        this.emit('high_latency_warning', { exchangeId, latency, threshold: this.config.maxLatencyMs });
      }

      return {
        success: true,
        orderId: result.orderId,
        latency,
        exchangeId
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      this.recordLatencyMetric(exchangeId, latency);
      
      logger.error(`Order execution failed for ${exchangeId}:`, error);
      throw error;
    }
  }

  /**
   * Generate co-location optimization recommendations
   */
  async generateCoLocationRecommendations() {
    logger.info('Generating co-location optimization recommendations...');

    const recommendations = {
      timestamp: new Date().toISOString(),
      exchanges: [],
      optimalRegions: {},
      latencyAnalysis: {},
      costBenefit: {}
    };

    // Analyze latency for each exchange
    for (const [exchangeId, connection] of this.webSocketConnections) {
      const latencyStats = this.getLatencyStatistics(exchangeId);
      
      recommendations.latencyAnalysis[exchangeId] = latencyStats;
      
      // Determine optimal regions based on latency
      const optimalRegion = this.determineOptimalRegion(latencyStats);
      recommendations.optimalRegions[exchangeId] = optimalRegion;

      // Calculate cost-benefit analysis
      const costBenefit = this.calculateCoLocationCostBenefit(exchangeId, latencyStats);
      recommendations.costBenefit[exchangeId] = costBenefit;

      recommendations.exchanges.push({
        exchangeId,
        currentLatency: latencyStats.average,
        optimalRegion: optimalRegion.region,
        expectedImprovement: optimalRegion.expectedLatencyReduction,
        recommendation: costBenefit.recommendation,
        priority: costBenefit.priority
      });
    }

    // Store recommendations
    this.coLocationRecommendations.set(Date.now(), recommendations);

    logger.info(`Generated co-location recommendations for ${recommendations.exchanges.length} exchanges`);

    return recommendations;
  }

  /**
   * Get latency statistics for exchange
   */
  getLatencyStatistics(exchangeId) {
    const metrics = this.latencyMetrics.get(exchangeId) || [];
    
    if (metrics.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        p95: 0,
        p99: 0,
        sampleCount: 0
      };
    }

    const sorted = [...metrics].sort((a, b) => a - b);
    const sum = metrics.reduce((acc, val) => acc + val, 0);

    return {
      average: sum / metrics.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      sampleCount: metrics.length
    };
  }

  /**
   * Determine optimal region for exchange
   */
  determineOptimalRegion(latencyStats) {
    // Simplified region determination based on latency patterns
    const regions = [
      { region: 'US-East-1', expectedLatency: 20, cost: 100 },
      { region: 'US-West-1', expectedLatency: 30, cost: 95 },
      { region: 'EU-West-1', expectedLatency: 25, cost: 110 },
      { region: 'Asia-Pacific-1', expectedLatency: 40, cost: 120 }
    ];

    // Find region with lowest expected latency
    const optimal = regions.reduce((best, current) => 
      current.expectedLatency < best.expectedLatency ? current : best
    );

    return {
      region: optimal.region,
      expectedLatency: optimal.expectedLatency,
      expectedLatencyReduction: Math.max(0, latencyStats.average - optimal.expectedLatency),
      estimatedMonthlyCost: optimal.cost
    };
  }

  /**
   * Calculate co-location cost-benefit analysis
   */
  calculateCoLocationCostBenefit(exchangeId, latencyStats) {
    const currentLatency = latencyStats.average;
    const optimalLatency = 20; // Target latency with co-location
    const latencyImprovement = Math.max(0, currentLatency - optimalLatency);
    
    // Estimate trading volume impact (simplified calculation)
    const volumeImpact = latencyImprovement * 0.1; // 0.1% volume increase per ms improvement
    const estimatedMonthlyVolume = 1000000; // $1M monthly volume assumption
    const estimatedMonthlyGain = estimatedMonthlyVolume * (volumeImpact / 100);
    const estimatedMonthlyCost = 500; // $500 co-location cost assumption

    const netBenefit = estimatedMonthlyGain - estimatedMonthlyCost;
    const roi = netBenefit / estimatedMonthlyCost * 100;

    let recommendation, priority;
    
    if (roi > 50) {
      recommendation = 'STRONGLY_RECOMMENDED';
      priority = 'HIGH';
    } else if (roi > 20) {
      recommendation = 'RECOMMENDED';
      priority = 'MEDIUM';
    } else if (roi > 0) {
      recommendation = 'CONSIDER';
      priority = 'LOW';
    } else {
      recommendation = 'NOT_RECOMMENDED';
      priority = 'NONE';
    }

    return {
      currentLatency,
      optimalLatency,
      latencyImprovement,
      estimatedMonthlyGain,
      estimatedMonthlyCost,
      netBenefit,
      roi,
      recommendation,
      priority
    };
  }

  /**
   * Record latency metric
   */
  recordLatencyMetric(key, latency) {
    if (!this.latencyMetrics.has(key)) {
      this.latencyMetrics.set(key, []);
    }

    const metrics = this.latencyMetrics.get(key);
    metrics.push(latency);

    // Keep only recent metrics (last 5 minutes)
    const cutoff = Date.now() - this.config.metricsRetentionMs;
    const recentMetrics = metrics.filter(m => m.timestamp > cutoff);
    this.latencyMetrics.set(key, recentMetrics);
  }

  /**
   * Initialize latency tracking
   */
  initializeLatencyTracking() {
    // Set up periodic latency measurement
    setInterval(() => {
      this.measureExchangeLatencies();
    }, 10000); // Every 10 seconds

    logger.debug('Latency tracking initialized');
  }

  /**
   * Measure latencies for all exchanges
   */
  async measureExchangeLatencies() {
    const exchanges = this.exchangeAbstraction.listExchanges();
    
    for (const exchange of exchanges) {
      try {
        const startTime = Date.now();
        
        // Ping exchange (simulate with getQuote)
        await this.exchangeAbstraction.getQuote(exchange.id, 'BTC/USDT');
        
        const latency = Date.now() - startTime;
        this.recordLatencyMetric(exchange.id, latency);
        
      } catch (error) {
        logger.debug(`Failed to measure latency for ${exchange.id}:`, error.message);
      }
    }
  }

  /**
   * Start heartbeat monitoring for WebSocket connections
   */
  startHeartbeatMonitoring() {
    setInterval(() => {
      for (const [exchangeId, connection] of this.webSocketConnections) {
        const timeSinceLastHeartbeat = Date.now() - connection.lastHeartbeat;
        
        if (timeSinceLastHeartbeat > this.config.heartbeatIntervalMs * 2) {
          logger.warn(`WebSocket connection to ${exchangeId} appears stale`);
          this.emit('websocket_stale', { exchangeId, timeSinceLastHeartbeat });
          
          // Attempt to reconnect
          this.reconnectWebSocket(exchangeId);
        }
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Reconnect WebSocket for exchange
   */
  async reconnectWebSocket(exchangeId) {
    const connection = this.webSocketConnections.get(exchangeId);
    if (!connection) return;

    connection.reconnectAttempts++;
    
    try {
      logger.info(`Attempting to reconnect WebSocket for ${exchangeId} (attempt ${connection.reconnectAttempts})`);
      
      // Simulate reconnection
      connection.connected = true;
      connection.lastHeartbeat = Date.now();
      
      this.emit('websocket_reconnected', { exchangeId, attempts: connection.reconnectAttempts });
      
    } catch (error) {
      logger.error(`Failed to reconnect WebSocket for ${exchangeId}:`, error);
      
      // Exponential backoff
      const delay = Math.min(this.config.webSocketReconnectDelayMs * Math.pow(2, connection.reconnectAttempts), 30000);
      
      setTimeout(() => {
        this.reconnectWebSocket(exchangeId);
      }, delay);
    }
  }

  /**
   * Get real-time streaming status
   */
  getStreamingStatus() {
    const status = {
      totalConnections: this.webSocketConnections.size,
      activeConnections: 0,
      subscriptions: {},
      latencyStats: {},
      batchStats: {
        currentBatchSize: this.orderBatch.length,
        batchTimeoutActive: !!this.batchTimeout
      }
    };

    for (const [exchangeId, connection] of this.webSocketConnections) {
      if (connection.connected) {
        status.activeConnections++;
      }
      
      status.subscriptions[exchangeId] = Array.from(connection.subscriptions);
      status.latencyStats[exchangeId] = this.getLatencyStatistics(exchangeId);
    }

    return status;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      latencyMetrics: Object.fromEntries(
        Array.from(this.latencyMetrics.entries()).map(([key, values]) => [
          key,
          this.getLatencyStatistics(key)
        ])
      ),
      webSocketStatus: this.getStreamingStatus(),
      batchingStats: {
        currentBatchSize: this.orderBatch.length,
        batchTimeoutMs: this.config.batchTimeoutMs,
        maxBatchSize: this.config.batchSize
      }
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Clear order batch
    this.orderBatch = [];

    // Close WebSocket connections (simulated)
    for (const [exchangeId, connection] of this.webSocketConnections) {
      connection.connected = false;
      logger.info(`Closed WebSocket connection to ${exchangeId}`);
    }

    this.webSocketConnections.clear();
    this.latencyMetrics.clear();

    logger.info('HighFrequencyTradingService cleaned up');
  }
}

module.exports = HighFrequencyTradingService;