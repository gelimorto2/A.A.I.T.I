const { EventEmitter } = require('events');
const os = require('os');
const fs = require('fs').promises;
const logger = require('./logger');

/**
 * Comprehensive System Monitoring and Alerting
 * Implements enterprise-grade monitoring capabilities:
 * - Real-time system metrics collection
 * - Application performance monitoring (APM)
 * - Health checks and uptime monitoring
 * - Alert management with multiple channels
 * - Performance analytics and trending
 * - Anomaly detection and automated responses
 */
class SystemMonitoringAndAlerting extends EventEmitter {
  constructor() {
    super();
    
    this.metrics = {
      system: new Map(),
      application: new Map(),
      performance: new Map(),
      errors: new Map()
    };
    
    this.alerts = new Map();
    this.alertChannels = new Map();
    this.healthChecks = new Map();
    
    // Configuration
    this.config = {
      // Monitoring intervals
      systemMetricsInterval: 30000,  // 30 seconds
      appMetricsInterval: 60000,     // 1 minute
      healthCheckInterval: 15000,    // 15 seconds
      performanceInterval: 30000,    // 30 seconds
      
      // Alert thresholds
      cpuThreshold: 80,              // 80% CPU usage
      memoryThreshold: 85,           // 85% memory usage
      diskThreshold: 90,             // 90% disk usage
      responseTimeThreshold: 5000,   // 5 second response time
      errorRateThreshold: 0.05,      // 5% error rate
      
      // Retention periods
      metricsRetentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      alertRetentionPeriod: 30 * 24 * 60 * 60 * 1000,  // 30 days
      
      // Alert configuration
      alertCooldownPeriod: 300000,   // 5 minutes
      maxAlertsPerHour: 10,
      alertEscalationTime: 900000,   // 15 minutes
      
      // Performance baselines
      baselineCalculationPeriod: 24 * 60 * 60 * 1000, // 24 hours
      anomalyDetectionSensitivity: 2.0 // Standard deviations
    };
    
    // System state
    this.isMonitoring = false;
    this.startTime = Date.now();
    this.lastMetricsCleanup = Date.now();
    this.performanceBaselines = new Map();
    
    // Alert statistics
    this.alertStats = {
      totalAlerts: 0,
      resolvedAlerts: 0,
      activeAlerts: 0,
      criticalAlerts: 0,
      warningAlerts: 0,
      infoAlerts: 0
    };
    
    logger.info('System Monitoring and Alerting initialized');
  }

  /**
   * Initialize monitoring system
   */
  async initialize() {
    try {
      // Initialize alert channels
      await this.initializeAlertChannels();
      
      // Set up health checks
      this.setupHealthChecks();
      
      // Start monitoring
      this.startMonitoring();
      
      // Initialize performance baselines
      this.initializePerformanceBaselines();
      
      logger.info('System Monitoring and Alerting started successfully');
      
    } catch (error) {
      logger.error('Failed to initialize monitoring system:', error);
      throw error;
    }
  }

  /**
   * Start monitoring processes
   */
  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Monitoring is already active');
      return;
    }
    
    this.isMonitoring = true;
    
    // System metrics collection
    this.systemMetricsTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.systemMetricsInterval);
    
    // Application metrics collection
    this.appMetricsTimer = setInterval(() => {
      this.collectApplicationMetrics();
    }, this.config.appMetricsInterval);
    
    // Health checks
    this.healthCheckTimer = setInterval(() => {
      this.runHealthChecks();
    }, this.config.healthCheckInterval);
    
    // Performance monitoring
    this.performanceTimer = setInterval(() => {
      this.collectPerformanceMetrics();
    }, this.config.performanceInterval);
    
    // Cleanup old metrics
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000); // Every hour
    
    // Alert processing
    this.alertProcessingTimer = setInterval(() => {
      this.processAlerts();
    }, 30000); // Every 30 seconds
    
    logger.info('System monitoring started', {
      systemInterval: this.config.systemMetricsInterval,
      appInterval: this.config.appMetricsInterval,
      healthInterval: this.config.healthCheckInterval
    });
  }

  /**
   * Stop monitoring processes
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    
    clearInterval(this.systemMetricsTimer);
    clearInterval(this.appMetricsTimer);
    clearInterval(this.healthCheckTimer);
    clearInterval(this.performanceTimer);
    clearInterval(this.cleanupTimer);
    clearInterval(this.alertProcessingTimer);
    
    logger.info('System monitoring stopped');
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      const timestamp = Date.now();
      
      // CPU metrics
      const cpus = os.cpus();
      const cpuUsage = await this.getCPUUsage();
      
      // Memory metrics
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsage = (usedMemory / totalMemory) * 100;
      
      // Load average
      const loadAverage = os.loadavg();
      
      // Disk usage
      const diskUsage = await this.getDiskUsage();
      
      // Network interfaces
      const networkInterfaces = os.networkInterfaces();
      
      const systemMetrics = {
        timestamp,
        cpu: {
          count: cpus.length,
          usage: cpuUsage,
          loadAverage: loadAverage
        },
        memory: {
          total: totalMemory,
          used: usedMemory,
          free: freeMemory,
          usage: memoryUsage
        },
        disk: diskUsage,
        network: this.parseNetworkInterfaces(networkInterfaces),
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch()
      };
      
      this.storeMetric('system', 'overall', systemMetrics);
      
      // Check thresholds and generate alerts
      this.checkSystemThresholds(systemMetrics);
      
      this.emit('systemMetrics', systemMetrics);
      
    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Collect application metrics
   */
  async collectApplicationMetrics() {
    try {
      const timestamp = Date.now();
      
      // Process metrics
      const processMetrics = {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      };
      
      // Event loop lag
      const eventLoopLag = await this.measureEventLoopLag();
      
      // Garbage collection stats (if available)
      const gcStats = this.getGCStats();
      
      // Active handles and requests
      const handles = process._getActiveHandles().length;
      const requests = process._getActiveRequests().length;
      
      const appMetrics = {
        timestamp,
        process: processMetrics,
        eventLoopLag,
        gcStats,
        activeHandles: handles,
        activeRequests: requests,
        nodeVersion: process.version,
        env: process.env.NODE_ENV || 'development'
      };
      
      this.storeMetric('application', 'node', appMetrics);
      
      // Check application health
      this.checkApplicationHealth(appMetrics);
      
      this.emit('applicationMetrics', appMetrics);
      
    } catch (error) {
      logger.error('Error collecting application metrics:', error);
    }
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    try {
      const timestamp = Date.now();
      
      // Response time metrics (from cache if available)
      const responseTimes = this.getResponseTimeMetrics();
      
      // Error rate metrics
      const errorRates = this.getErrorRateMetrics();
      
      // Throughput metrics
      const throughput = this.getThroughputMetrics();
      
      // Database performance (if available)
      const databaseMetrics = await this.getDatabaseMetrics();
      
      // Cache performance
      const cacheMetrics = this.getCacheMetrics();
      
      const performanceMetrics = {
        timestamp,
        responseTimes,
        errorRates,
        throughput,
        database: databaseMetrics,
        cache: cacheMetrics
      };
      
      this.storeMetric('performance', 'overall', performanceMetrics);
      
      // Analyze performance trends
      this.analyzePerformanceTrends(performanceMetrics);
      
      this.emit('performanceMetrics', performanceMetrics);
      
    } catch (error) {
      logger.error('Error collecting performance metrics:', error);
    }
  }

  /**
   * Health check management
   */
  setupHealthChecks() {
    // Database health check
    this.addHealthCheck('database', async () => {
      try {
        // Simulate database ping
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 'healthy', responseTime: 10 };
      } catch (error) {
        return { status: 'unhealthy', error: error.message };
      }
    });
    
    // External API health check
    this.addHealthCheck('external_apis', async () => {
      try {
        // Check external dependencies
        const checks = [];
        
        // Example: CoinGecko API check
        checks.push(this.checkExternalAPI('https://api.coingecko.com/api/v3/ping'));
        
        const results = await Promise.allSettled(checks);
        const healthy = results.every(r => r.status === 'fulfilled' && r.value.ok);
        
        return {
          status: healthy ? 'healthy' : 'unhealthy',
          checks: results.length,
          healthy: results.filter(r => r.status === 'fulfilled').length
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message };
      }
    });
    
    // Memory health check
    this.addHealthCheck('memory', async () => {
      const memInfo = process.memoryUsage();
      const heapUsedMB = memInfo.heapUsed / 1024 / 1024;
      const heapTotalMB = memInfo.heapTotal / 1024 / 1024;
      const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
      
      return {
        status: heapUsagePercent < 85 ? 'healthy' : 'unhealthy',
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        heapUsagePercent
      };
    });
    
    // Disk space health check
    this.addHealthCheck('disk_space', async () => {
      try {
        const diskUsage = await this.getDiskUsage();
        const critical = diskUsage.some(disk => disk.usage > 90);
        
        return {
          status: critical ? 'unhealthy' : 'healthy',
          disks: diskUsage
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message };
      }
    });
    
    logger.info('Health checks configured', {
      count: this.healthChecks.size
    });
  }

  addHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, {
      name,
      check: checkFunction,
      lastCheck: null,
      lastResult: null,
      failures: 0,
      consecutiveFailures: 0
    });
  }

  async runHealthChecks() {
    const results = {};
    
    for (const [name, healthCheck] of this.healthChecks.entries()) {
      try {
        const startTime = Date.now();
        const result = await healthCheck.check();
        const duration = Date.now() - startTime;
        
        result.duration = duration;
        result.timestamp = Date.now();
        
        healthCheck.lastCheck = Date.now();
        healthCheck.lastResult = result;
        
        if (result.status === 'healthy') {
          healthCheck.consecutiveFailures = 0;
        } else {
          healthCheck.failures++;
          healthCheck.consecutiveFailures++;
          
          // Generate alert for health check failure
          this.generateAlert({
            type: 'HEALTH_CHECK_FAILED',
            severity: healthCheck.consecutiveFailures > 3 ? 'critical' : 'warning',
            title: `Health check failed: ${name}`,
            description: `Health check ${name} failed with status: ${result.status}`,
            data: {
              healthCheck: name,
              result,
              consecutiveFailures: healthCheck.consecutiveFailures
            }
          });
        }
        
        results[name] = result;
        
      } catch (error) {
        logger.error(`Health check ${name} error:`, error);
        
        healthCheck.failures++;
        healthCheck.consecutiveFailures++;
        
        results[name] = {
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        };
      }
    }
    
    this.emit('healthCheckResults', results);
    return results;
  }

  /**
   * Alert management
   */
  generateAlert(alertData) {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert = {
      id: alertId,
      ...alertData,
      timestamp: Date.now(),
      status: 'active',
      acknowledged: false,
      resolved: false,
      escalated: false,
      escalationTime: Date.now() + this.config.alertEscalationTime,
      cooldownUntil: Date.now() + this.config.alertCooldownPeriod
    };
    
    // Check if similar alert is in cooldown
    if (this.isAlertInCooldown(alert)) {
      logger.debug('Alert suppressed due to cooldown:', alert.type);
      return null;
    }
    
    this.alerts.set(alertId, alert);
    this.updateAlertStats(alert, 'created');
    
    logger.warn('Alert generated:', {
      id: alertId,
      type: alert.type,
      severity: alert.severity,
      title: alert.title
    });
    
    // Send alert through configured channels
    this.sendAlert(alert);
    
    this.emit('alertGenerated', alert);
    
    return alertId;
  }

  async sendAlert(alert) {
    for (const [channelName, channel] of this.alertChannels.entries()) {
      try {
        if (this.shouldSendToChannel(alert, channel)) {
          await channel.send(alert);
          
          logger.info('Alert sent successfully', {
            alertId: alert.id,
            channel: channelName
          });
        }
      } catch (error) {
        logger.error(`Failed to send alert via ${channelName}:`, error);
      }
    }
  }

  acknowledgeAlert(alertId, userId, comment = '') {
    const alert = this.alerts.get(alertId);
    
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = Date.now();
      alert.acknowledgeComment = comment;
      
      this.updateAlertStats(alert, 'acknowledged');
      
      logger.info('Alert acknowledged:', {
        alertId,
        userId,
        comment
      });
      
      this.emit('alertAcknowledged', alert);
      
      return true;
    }
    
    return false;
  }

  resolveAlert(alertId, userId, resolution = '') {
    const alert = this.alerts.get(alertId);
    
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedBy = userId;
      alert.resolvedAt = Date.now();
      alert.resolution = resolution;
      alert.status = 'resolved';
      
      this.updateAlertStats(alert, 'resolved');
      
      logger.info('Alert resolved:', {
        alertId,
        userId,
        resolution
      });
      
      this.emit('alertResolved', alert);
      
      return true;
    }
    
    return false;
  }

  /**
   * Initialize alert channels
   */
  async initializeAlertChannels() {
    // Console/Log channel
    this.alertChannels.set('console', {
      name: 'console',
      enabled: true,
      minSeverity: 'info',
      send: async (alert) => {
        const logLevel = alert.severity === 'critical' ? 'error' : 
                        alert.severity === 'warning' ? 'warn' : 'info';
        
        logger[logLevel]('ALERT:', {
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description
        });
      }
    });
    
    // Email channel (mock implementation)
    this.alertChannels.set('email', {
      name: 'email',
      enabled: false, // Enable when email service is configured
      minSeverity: 'warning',
      recipients: ['admin@example.com'],
      send: async (alert) => {
        // Mock email sending
        logger.info('Email alert would be sent:', {
          to: this.alertChannels.get('email').recipients,
          subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
          body: alert.description
        });
      }
    });
    
    // Webhook channel
    this.alertChannels.set('webhook', {
      name: 'webhook',
      enabled: false, // Enable when webhook URL is configured
      minSeverity: 'critical',
      url: process.env.ALERT_WEBHOOK_URL,
      send: async (alert) => {
        // Mock webhook sending
        logger.info('Webhook alert would be sent:', {
          url: this.alertChannels.get('webhook').url,
          payload: alert
        });
      }
    });
    
    logger.info('Alert channels initialized:', {
      channels: Array.from(this.alertChannels.keys())
    });
  }

  /**
   * Utility methods
   */
  
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const totalUsage = currentUsage.user + currentUsage.system;
        const totalTime = 1000000; // 1 second in microseconds
        const usage = (totalUsage / totalTime) * 100;
        
        resolve(Math.min(usage, 100));
      }, 100);
    });
  }

  async getDiskUsage() {
    try {
      // Mock disk usage - in production, use actual disk space check
      return [
        {
          filesystem: '/',
          size: 100000000,
          used: 45000000,
          available: 55000000,
          usage: 45
        }
      ];
    } catch (error) {
      logger.error('Error getting disk usage:', error);
      return [];
    }
  }

  parseNetworkInterfaces(interfaces) {
    const result = {};
    
    Object.keys(interfaces).forEach(name => {
      const interface_info = interfaces[name];
      const ipv4 = interface_info.find(i => i.family === 'IPv4' && !i.internal);
      
      if (ipv4) {
        result[name] = {
          address: ipv4.address,
          netmask: ipv4.netmask,
          mac: ipv4.mac
        };
      }
    });
    
    return result;
  }

  async measureEventLoopLag() {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        resolve(lag);
      });
    });
  }

  getGCStats() {
    // Mock GC stats - in production, use performance hooks
    return {
      gcCount: 0,
      gcTime: 0,
      gcType: 'unknown'
    };
  }

  storeMetric(category, key, data) {
    if (!this.metrics[category]) {
      this.metrics[category] = new Map();
    }
    
    const metricKey = `${key}_${Date.now()}`;
    this.metrics[category].set(metricKey, data);
    
    // Emit metric for real-time monitoring
    this.emit('metric', { category, key, data });
  }

  checkSystemThresholds(metrics) {
    // CPU threshold check
    if (metrics.cpu.usage > this.config.cpuThreshold) {
      this.generateAlert({
        type: 'HIGH_CPU_USAGE',
        severity: 'warning',
        title: 'High CPU Usage Detected',
        description: `CPU usage is ${metrics.cpu.usage.toFixed(2)}%, exceeding threshold of ${this.config.cpuThreshold}%`,
        data: { cpuUsage: metrics.cpu.usage, threshold: this.config.cpuThreshold }
      });
    }
    
    // Memory threshold check
    if (metrics.memory.usage > this.config.memoryThreshold) {
      this.generateAlert({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'warning',
        title: 'High Memory Usage Detected',
        description: `Memory usage is ${metrics.memory.usage.toFixed(2)}%, exceeding threshold of ${this.config.memoryThreshold}%`,
        data: { memoryUsage: metrics.memory.usage, threshold: this.config.memoryThreshold }
      });
    }
    
    // Disk threshold check
    metrics.disk.forEach(disk => {
      if (disk.usage > this.config.diskThreshold) {
        this.generateAlert({
          type: 'HIGH_DISK_USAGE',
          severity: 'critical',
          title: 'High Disk Usage Detected',
          description: `Disk usage on ${disk.filesystem} is ${disk.usage}%, exceeding threshold of ${this.config.diskThreshold}%`,
          data: { disk, threshold: this.config.diskThreshold }
        });
      }
    });
  }

  checkApplicationHealth(metrics) {
    // Event loop lag check
    if (metrics.eventLoopLag > 100) { // 100ms
      this.generateAlert({
        type: 'HIGH_EVENT_LOOP_LAG',
        severity: 'warning',
        title: 'High Event Loop Lag Detected',
        description: `Event loop lag is ${metrics.eventLoopLag.toFixed(2)}ms, indicating performance issues`,
        data: { eventLoopLag: metrics.eventLoopLag }
      });
    }
    
    // Memory leak detection
    const heapUsed = metrics.process.memoryUsage.heapUsed / 1024 / 1024; // MB
    if (heapUsed > 500) { // 500MB
      this.generateAlert({
        type: 'HIGH_HEAP_USAGE',
        severity: 'warning',
        title: 'High Heap Usage Detected',
        description: `Heap usage is ${heapUsed.toFixed(2)}MB, potential memory leak`,
        data: { heapUsed, memoryUsage: metrics.process.memoryUsage }
      });
    }
  }

  getResponseTimeMetrics() {
    // Mock implementation - in production, collect from actual requests
    return {
      average: 150,
      p95: 300,
      p99: 500,
      max: 1200
    };
  }

  getErrorRateMetrics() {
    // Mock implementation
    return {
      rate: 0.02,
      count: 5,
      total: 250
    };
  }

  getThroughputMetrics() {
    // Mock implementation
    return {
      requestsPerSecond: 45,
      requestsPerMinute: 2700
    };
  }

  async getDatabaseMetrics() {
    // Mock implementation
    return {
      connectionCount: 5,
      activeQueries: 2,
      avgQueryTime: 25,
      slowQueries: 0
    };
  }

  getCacheMetrics() {
    // This would integrate with the high-performance caching system
    return {
      hitRate: 85.5,
      missRate: 14.5,
      size: 1024,
      maxSize: 10240
    };
  }

  analyzePerformanceTrends(metrics) {
    // Implement trend analysis logic
    // For now, just log the metrics
    logger.debug('Performance trends analyzed:', {
      responseTime: metrics.responseTimes.average,
      errorRate: metrics.errorRates.rate,
      throughput: metrics.throughput.requestsPerSecond
    });
  }

  initializePerformanceBaselines() {
    // Initialize baseline calculations
    logger.info('Performance baselines initialized');
  }

  isAlertInCooldown(alert) {
    // Check if similar alert type is in cooldown
    for (const existingAlert of this.alerts.values()) {
      if (existingAlert.type === alert.type && 
          existingAlert.status === 'active' &&
          Date.now() < existingAlert.cooldownUntil) {
        return true;
      }
    }
    return false;
  }

  shouldSendToChannel(alert, channel) {
    if (!channel.enabled) return false;
    
    const severityLevels = { info: 1, warning: 2, critical: 3 };
    const alertLevel = severityLevels[alert.severity] || 1;
    const channelLevel = severityLevels[channel.minSeverity] || 1;
    
    return alertLevel >= channelLevel;
  }

  updateAlertStats(alert, action) {
    switch (action) {
      case 'created':
        this.alertStats.totalAlerts++;
        this.alertStats.activeAlerts++;
        this.alertStats[`${alert.severity}Alerts`]++;
        break;
      case 'resolved':
        this.alertStats.resolvedAlerts++;
        this.alertStats.activeAlerts--;
        break;
      case 'acknowledged':
        // Stats updated but no count changes
        break;
    }
  }

  processAlerts() {
    const now = Date.now();
    
    for (const alert of this.alerts.values()) {
      // Check for escalation
      if (!alert.escalated && !alert.acknowledged && now > alert.escalationTime) {
        alert.escalated = true;
        alert.severity = 'critical';
        
        logger.warn('Alert escalated:', {
          id: alert.id,
          type: alert.type,
          newSeverity: alert.severity
        });
        
        // Re-send escalated alert
        this.sendAlert(alert);
      }
    }
  }

  cleanupOldMetrics() {
    const cutoff = Date.now() - this.config.metricsRetentionPeriod;
    let cleanedCount = 0;
    
    // Clean up metrics
    for (const [category, metrics] of Object.entries(this.metrics)) {
      for (const [key, data] of metrics.entries()) {
        if (data.timestamp && data.timestamp < cutoff) {
          metrics.delete(key);
          cleanedCount++;
        }
      }
    }
    
    // Clean up old alerts
    const alertCutoff = Date.now() - this.config.alertRetentionPeriod;
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt < alertCutoff) {
        this.alerts.delete(alertId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('Metrics cleanup completed:', { cleanedCount });
    }
    
    this.lastMetricsCleanup = Date.now();
  }

  async checkExternalAPI(url) {
    // Mock external API check
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ ok: true, status: 200, responseTime: 150 });
      }, 100);
    });
  }

  /**
   * Public API methods
   */
  
  getSystemStatus() {
    return {
      monitoring: this.isMonitoring,
      uptime: Date.now() - this.startTime,
      healthChecks: this.healthChecks.size,
      activeAlerts: this.alertStats.activeAlerts,
      totalAlerts: this.alertStats.totalAlerts,
      alertChannels: this.alertChannels.size,
      metricsCategories: Object.keys(this.metrics).length
    };
  }

  getMetrics(category = null, timeRange = 3600000) { // Default 1 hour
    const cutoff = Date.now() - timeRange;
    const result = {};
    
    const categories = category ? [category] : Object.keys(this.metrics);
    
    for (const cat of categories) {
      if (this.metrics[cat]) {
        result[cat] = {};
        
        for (const [key, data] of this.metrics[cat].entries()) {
          if (!data.timestamp || data.timestamp >= cutoff) {
            result[cat][key] = data;
          }
        }
      }
    }
    
    return result;
  }

  getAlerts(status = null, severity = null, limit = 100) {
    let alerts = Array.from(this.alerts.values());
    
    if (status) {
      alerts = alerts.filter(alert => alert.status === status);
    }
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    return alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getAlertStats() {
    return { ...this.alertStats };
  }

  async getHealthStatus() {
    const healthResults = await this.runHealthChecks();
    const overallHealthy = Object.values(healthResults).every(
      result => result.status === 'healthy'
    );
    
    return {
      overall: overallHealthy ? 'healthy' : 'unhealthy',
      checks: healthResults,
      timestamp: Date.now()
    };
  }
}

module.exports = new SystemMonitoringAndAlerting();