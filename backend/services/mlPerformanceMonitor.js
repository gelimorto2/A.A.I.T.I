const express = require('express');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const EventEmitter = require('events');

class MLPerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
    this.modelMetrics = new Map();
    this.alertRules = new Map();
    this.historicalData = new Map();
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  initializeDefaultRules() {
    // Default alert rules
    const defaultRules = [
      {
        id: 'accuracy_drop',
        name: 'Accuracy Drop',
        metric: 'accuracy',
        operator: 'less_than',
        threshold: 0.8,
        severity: 'high',
        enabled: true,
        timeWindow: 300000, // 5 minutes
        minSamples: 10
      },
      {
        id: 'drift_detected',
        name: 'Model Drift Detected',
        metric: 'drift',
        operator: 'greater_than',
        threshold: 0.3,
        severity: 'critical',
        enabled: true,
        timeWindow: 600000, // 10 minutes
        minSamples: 5
      },
      {
        id: 'high_latency',
        name: 'High Latency',
        metric: 'latency',
        operator: 'greater_than',
        threshold: 100, // ms
        severity: 'medium',
        enabled: true,
        timeWindow: 180000, // 3 minutes
        minSamples: 20
      },
      {
        id: 'error_rate_spike',
        name: 'Error Rate Spike',
        metric: 'errorRate',
        operator: 'greater_than',
        threshold: 0.05, // 5%
        severity: 'high',
        enabled: true,
        timeWindow: 300000, // 5 minutes
        minSamples: 15
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  startMonitoring() {
    // Start monitoring interval
    setInterval(() => {
      this.checkAlertRules();
      this.cleanupOldData();
    }, 30000); // Check every 30 seconds

    // Simulate some data updates
    setInterval(() => {
      this.simulateModelUpdates();
    }, 5000); // Update every 5 seconds
  }

  addClient(ws) {
    this.clients.add(ws);
    console.log(`WebSocket client connected. Total clients: ${this.clients.size}`);

    // Send current state to new client
    this.sendToClient(ws, {
      type: 'initial-state',
      data: {
        models: Array.from(this.modelMetrics.keys()),
        alerts: this.getRecentAlerts(),
        timestamp: Date.now()
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        this.handleClientMessage(ws, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
  }

  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'subscribe-models':
        ws.subscribedModels = data.modelIds || [];
        break;
      case 'subscribe-timeframe':
        ws.subscribedTimeframe = data.timeframe;
        break;
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: data.timestamp || Date.now() });
        break;
      case 'get-historical':
        this.sendHistoricalData(ws, data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  sendToClient(ws, data) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(data));
    }
  }

  broadcast(data) {
    this.clients.forEach(ws => {
      this.sendToClient(ws, data);
    });
  }

  updateModelMetrics(modelId, metrics) {
    const timestamp = Date.now();
    
    if (!this.modelMetrics.has(modelId)) {
      this.modelMetrics.set(modelId, []);
    }

    const modelData = this.modelMetrics.get(modelId);
    modelData.push({
      timestamp,
      ...metrics
    });

    // Keep only last 1000 data points per model
    if (modelData.length > 1000) {
      modelData.splice(0, modelData.length - 1000);
    }

    // Store in historical data by metric
    Object.keys(metrics).forEach(metric => {
      const metricKey = `${modelId}_${metric}`;
      if (!this.historicalData.has(metricKey)) {
        this.historicalData.set(metricKey, []);
      }
      
      const metricData = this.historicalData.get(metricKey);
      metricData.push({ timestamp, value: metrics[metric] });
      
      // Keep only last 10000 points per metric
      if (metricData.length > 10000) {
        metricData.splice(0, metricData.length - 10000);
      }
    });

    // Broadcast live update
    this.broadcast({
      type: 'ml-performance-update',
      data: {
        modelId,
        metrics,
        timestamp
      }
    });

    // Check for alerts
    this.checkModelAlerts(modelId, metrics);
  }

  checkModelAlerts(modelId, currentMetrics) {
    this.alertRules.forEach((rule, ruleId) => {
      if (!rule.enabled) return;

      const metricValue = currentMetrics[rule.metric];
      if (metricValue === undefined) return;

      const shouldAlert = this.evaluateAlertCondition(rule, metricValue, modelId);
      
      if (shouldAlert) {
        this.triggerAlert(rule, modelId, metricValue);
      }
    });
  }

  evaluateAlertCondition(rule, currentValue, modelId) {
    // Get recent data for the model within the time window
    const modelData = this.modelMetrics.get(modelId) || [];
    const cutoffTime = Date.now() - rule.timeWindow;
    const recentData = modelData.filter(d => d.timestamp > cutoffTime);

    if (recentData.length < rule.minSamples) {
      return false; // Not enough samples
    }

    // Check if condition is consistently met
    const violations = recentData.filter(data => {
      const value = data[rule.metric];
      if (value === undefined) return false;

      switch (rule.operator) {
        case 'greater_than':
          return value > rule.threshold;
        case 'less_than':
          return value < rule.threshold;
        case 'equals':
          return Math.abs(value - rule.threshold) < 0.001;
        case 'not_equals':
          return Math.abs(value - rule.threshold) >= 0.001;
        default:
          return false;
      }
    });

    // Alert if more than 50% of recent samples violate the condition
    return violations.length > (recentData.length * 0.5);
  }

  triggerAlert(rule, modelId, value) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random()}`,
      type: rule.id,
      severity: rule.severity,
      title: rule.name,
      description: `${rule.name} detected for model ${modelId}`,
      modelId,
      timestamp: Date.now(),
      acknowledged: false,
      value,
      threshold: rule.threshold,
      trend: this.calculateTrend(modelId, rule.metric),
      metadata: {
        rule: rule.id,
        timeWindow: rule.timeWindow,
        samplesChecked: this.getRecentSampleCount(modelId, rule.timeWindow)
      }
    };

    // Broadcast alert
    this.broadcast({
      type: 'model-alert',
      data: alert
    });

    console.log(`Alert triggered: ${alert.title} for model ${modelId}`);
  }

  calculateTrend(modelId, metric) {
    const modelData = this.modelMetrics.get(modelId) || [];
    if (modelData.length < 2) return 'stable';

    const recent = modelData.slice(-10); // Last 10 samples
    const first = recent[0]?.[metric];
    const last = recent[recent.length - 1]?.[metric];

    if (first === undefined || last === undefined) return 'stable';

    const change = (last - first) / first;
    if (change > 0.02) return 'up';
    if (change < -0.02) return 'down';
    return 'stable';
  }

  getRecentSampleCount(modelId, timeWindow) {
    const modelData = this.modelMetrics.get(modelId) || [];
    const cutoffTime = Date.now() - timeWindow;
    return modelData.filter(d => d.timestamp > cutoffTime).length;
  }

  checkAlertRules() {
    // Periodic check for any missed alerts
    this.modelMetrics.forEach((data, modelId) => {
      if (data.length === 0) return;
      
      const latest = data[data.length - 1];
      this.checkModelAlerts(modelId, latest);
    });
  }

  cleanupOldData() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    // Clean model metrics
    this.modelMetrics.forEach((data, modelId) => {
      const filtered = data.filter(d => d.timestamp > cutoffTime);
      this.modelMetrics.set(modelId, filtered);
    });

    // Clean historical data
    this.historicalData.forEach((data, key) => {
      const filtered = data.filter(d => d.timestamp > cutoffTime);
      this.historicalData.set(key, filtered);
    });
  }

  getRecentAlerts(limit = 50) {
    // In a real implementation, this would come from a database
    return []; // Placeholder
  }

  sendHistoricalData(ws, request) {
    const { modelId, metric, timeframe, startTime, endTime } = request;
    const metricKey = `${modelId}_${metric}`;
    const data = this.historicalData.get(metricKey) || [];
    
    const filtered = data.filter(point => {
      return (!startTime || point.timestamp >= startTime) &&
             (!endTime || point.timestamp <= endTime);
    });

    this.sendToClient(ws, {
      type: 'historical-data',
      data: {
        modelId,
        metric,
        timeframe,
        data: filtered,
        aggregationLevel: this.getAggregationLevel(timeframe),
        lastUpdated: Date.now()
      }
    });
  }

  getAggregationLevel(timeframe) {
    const levels = {
      '1m': 'raw',
      '5m': 'raw',
      '15m': 'minute',
      '1h': 'minute',
      '4h': 'hour',
      '1d': 'hour',
      '7d': 'hour',
      '30d': 'hour',
      '90d': 'day',
      '1y': 'day'
    };
    return levels[timeframe] || 'hour';
  }

  simulateModelUpdates() {
    // Simulate updates for demo models
    const demoModels = ['model_btc_lstm_v2', 'model_eth_transformer_v1', 'model_portfolio_rf_v3'];
    
    demoModels.forEach(modelId => {
      const metrics = {
        accuracy: Math.max(0.7, Math.min(0.95, 0.85 + (Math.random() - 0.5) * 0.1)),
        precision: Math.max(0.7, Math.min(0.95, 0.82 + (Math.random() - 0.5) * 0.08)),
        recall: Math.max(0.7, Math.min(0.95, 0.8 + (Math.random() - 0.5) * 0.08)),
        f1Score: Math.max(0.7, Math.min(0.95, 0.83 + (Math.random() - 0.5) * 0.08)),
        drift: Math.max(0, Math.min(0.5, 0.1 + (Math.random() - 0.5) * 0.15)),
        latency: Math.max(10, Math.min(200, 45 + (Math.random() - 0.5) * 30)),
        errorRate: Math.max(0, Math.min(0.1, 0.02 + (Math.random() - 0.5) * 0.03)),
        confidence: Math.max(0.6, Math.min(0.99, 0.85 + (Math.random() - 0.5) * 0.1)),
        memoryUsage: Math.max(100, Math.min(1000, 512 + (Math.random() - 0.5) * 200)),
        predictions: Math.floor(Math.random() * 50) + 10
      };

      this.updateModelMetrics(modelId, metrics);
    });
  }

  // API Methods
  getHistoricalData(modelId, metric, options = {}) {
    const metricKey = `${modelId}_${metric}`;
    const data = this.historicalData.get(metricKey) || [];
    
    let filtered = data;
    if (options.startTime) {
      filtered = filtered.filter(point => point.timestamp >= options.startTime);
    }
    if (options.endTime) {
      filtered = filtered.filter(point => point.timestamp <= options.endTime);
    }

    // Apply aggregation if needed
    if (options.aggregation && options.maxDataPoints && filtered.length > options.maxDataPoints) {
      filtered = this.aggregateData(filtered, options.maxDataPoints, options.aggregation);
    }

    return {
      modelId,
      metric,
      timeframe: options.timeframe || '1h',
      data: filtered.map(point => ({ timestamp: point.timestamp, value: point.value })),
      aggregationLevel: options.aggregationLevel || 'raw',
      lastUpdated: Date.now()
    };
  }

  aggregateData(data, maxPoints, aggregationType) {
    if (data.length <= maxPoints) return data;

    const bucketSize = Math.ceil(data.length / maxPoints);
    const aggregated = [];

    for (let i = 0; i < data.length; i += bucketSize) {
      const bucket = data.slice(i, i + bucketSize);
      if (bucket.length === 0) continue;

      let aggregatedValue;
      const values = bucket.map(point => point.value);

      switch (aggregationType) {
        case 'mean':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'max':
          aggregatedValue = Math.max(...values);
          break;
        case 'min':
          aggregatedValue = Math.min(...values);
          break;
        case 'sum':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0);
          break;
        default:
          aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      }

      aggregated.push({
        timestamp: bucket[Math.floor(bucket.length / 2)].timestamp, // Use middle timestamp
        value: aggregatedValue
      });
    }

    return aggregated;
  }

  getLiveData(modelIds) {
    return modelIds.map(modelId => {
      const modelData = this.modelMetrics.get(modelId) || [];
      const latest = modelData[modelData.length - 1];
      
      if (!latest) {
        return {
          modelId,
          metrics: {},
          timestamp: Date.now(),
          predictions: 0
        };
      }

      const { timestamp, ...metrics } = latest;
      return {
        modelId,
        metrics,
        timestamp,
        predictions: metrics.predictions || 0,
        alerts: this.getModelAlerts(modelId)
      };
    });
  }

  getModelAlerts(modelId) {
    // Return recent alerts for the model
    // In a real implementation, this would query a database
    return [];
  }
}

module.exports = MLPerformanceMonitor;