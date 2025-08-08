const os = require('os');
const process = require('process');
const logger = require('./logger');
const { getGitHubIssueReporter } = require('./githubIssueReporter');

/**
 * Performance Monitor for AAITI
 * Monitors system performance and reports issues when thresholds are exceeded
 * Optimizes script execution and API performance
 */

class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      // Monitoring intervals
      memoryCheckInterval: config.memoryCheckInterval || 30000, // 30 seconds
      cpuCheckInterval: config.cpuCheckInterval || 60000, // 1 minute
      scriptTimeoutWarning: config.scriptTimeoutWarning || 30000, // 30 seconds
      apiTimeoutWarning: config.apiTimeoutWarning || 5000, // 5 seconds
      
      // Performance thresholds
      thresholds: {
        memoryUsage: config.memoryThreshold || 0.85, // 85% of available memory
        cpuUsage: config.cpuThreshold || 0.80, // 80% CPU usage
        heapUsage: config.heapThreshold || 0.90, // 90% heap usage
        responseTime: config.responseTimeThreshold || 3000, // 3 seconds
        errorRate: config.errorRateThreshold || 0.05, // 5% error rate
        requestsPerSecond: config.rpsThreshold || 100, // 100 RPS
        dbQueryTime: config.dbQueryThreshold || 1000 // 1 second
      },
      
      // Optimization settings
      optimization: {
        enableGarbageCollection: config.enableGC !== false,
        enableMemoryOptimization: config.enableMemoryOpt !== false,
        enableRequestBatching: config.enableBatching !== false,
        enableCaching: config.enableCaching !== false,
        gcInterval: config.gcInterval || 300000, // 5 minutes
        cacheCleanupInterval: config.cacheCleanup || 600000 // 10 minutes
      },
      
      // Reporting settings
      reportToGitHub: config.reportToGitHub !== false,
      alertOnThresholds: config.alertOnThresholds !== false
    };

    // Performance tracking
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        totalTime: 0,
        lastReset: Date.now()
      },
      memory: {
        peak: 0,
        current: 0,
        lastCheck: Date.now()
      },
      cpu: {
        usage: 0,
        lastCheck: Date.now()
      },
      scripts: new Map(), // script name -> { runs, totalTime, errors }
      apiCalls: new Map(), // endpoint -> { calls, totalTime, errors }
      dbQueries: new Map() // query type -> { count, totalTime, errors }
    };

    // Active monitoring
    this.monitoring = {
      activeRequests: new Map(),
      activeScripts: new Map(),
      activeQueries: new Map()
    };

    // GitHub issue reporter
    this.issueReporter = getGitHubIssueReporter();

    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  initializeMonitoring() {
    // Memory monitoring
    this.memoryInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.memoryCheckInterval);

    // CPU monitoring
    this.cpuInterval = setInterval(() => {
      this.checkCPUUsage();
    }, this.config.cpuCheckInterval);

    // Garbage collection optimization
    if (this.config.optimization.enableGarbageCollection) {
      this.gcInterval = setInterval(() => {
        this.optimizeMemory();
      }, this.config.optimization.gcInterval);
    }

    logger.info('Performance Monitor initialized', {
      memoryThreshold: `${this.config.thresholds.memoryUsage * 100}%`,
      cpuThreshold: `${this.config.thresholds.cpuUsage * 100}%`,
      responseTimeThreshold: `${this.config.thresholds.responseTime}ms`
    });
  }

  /**
   * Monitor script execution performance
   */
  monitorScript(scriptName, execution) {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now();
      const scriptId = `${scriptName}_${startTime}`;
      
      // Track active script
      this.monitoring.activeScripts.set(scriptId, {
        name: scriptName,
        startTime,
        timeout: setTimeout(() => {
          logger.warn(`Script timeout warning: ${scriptName}`, {
            duration: Date.now() - startTime,
            threshold: this.config.scriptTimeoutWarning
          });
        }, this.config.scriptTimeoutWarning)
      });

      try {
        let result;
        if (typeof execution === 'function') {
          result = await execution();
        } else {
          result = await execution;
        }

        const duration = Date.now() - startTime;
        this.recordScriptPerformance(scriptName, duration, true);
        resolve(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordScriptPerformance(scriptName, duration, false);
        
        // Report critical script errors to GitHub
        if (this.config.reportToGitHub) {
          this.issueReporter.reportScriptError(scriptName, error, {
            duration,
            severity: 'error'
          });
        }
        
        reject(error);
      } finally {
        // Clean up monitoring
        const activeScript = this.monitoring.activeScripts.get(scriptId);
        if (activeScript) {
          clearTimeout(activeScript.timeout);
          this.monitoring.activeScripts.delete(scriptId);
        }
      }
    });
  }

  /**
   * Monitor API call performance
   */
  monitorAPICall(endpoint, call) {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now();
      const callId = `${endpoint}_${startTime}`;
      
      // Track active API call
      this.monitoring.activeRequests.set(callId, {
        endpoint,
        startTime,
        timeout: setTimeout(() => {
          logger.warn(`API call timeout warning: ${endpoint}`, {
            duration: Date.now() - startTime,
            threshold: this.config.apiTimeoutWarning
          });
        }, this.config.apiTimeoutWarning)
      });

      try {
        let result;
        if (typeof call === 'function') {
          result = await call();
        } else {
          result = await call;
        }

        const duration = Date.now() - startTime;
        this.recordAPIPerformance(endpoint, duration, true);
        resolve(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordAPIPerformance(endpoint, duration, false);
        
        // Report API errors if they exceed threshold
        const errorRate = this.getAPIErrorRate(endpoint);
        if (errorRate > this.config.thresholds.errorRate) {
          if (this.config.reportToGitHub) {
            this.issueReporter.reportError(error, {
              type: 'api_error',
              endpoint,
              errorRate: errorRate.toFixed(3),
              duration,
              severity: 'warning'
            });
          }
        }
        
        reject(error);
      } finally {
        // Clean up monitoring
        const activeCall = this.monitoring.activeRequests.get(callId);
        if (activeCall) {
          clearTimeout(activeCall.timeout);
          this.monitoring.activeRequests.delete(callId);
        }
      }
    });
  }

  /**
   * Monitor database query performance
   */
  monitorDBQuery(queryType, query) {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now();
      const queryId = `${queryType}_${startTime}`;
      
      try {
        let result;
        if (typeof query === 'function') {
          result = await query();
        } else {
          result = await query;
        }

        const duration = Date.now() - startTime;
        this.recordDBPerformance(queryType, duration, true);
        
        // Warn about slow queries
        if (duration > this.config.thresholds.dbQueryTime) {
          logger.warn(`Slow database query detected`, {
            queryType,
            duration,
            threshold: this.config.thresholds.dbQueryTime
          });
        }
        
        resolve(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordDBPerformance(queryType, duration, false);
        reject(error);
      }
    });
  }

  /**
   * Check memory usage and optimize if needed
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = usedMem / totalMem;
    const heapUsage = memUsage.heapUsed / memUsage.heapTotal;

    // Update metrics
    this.metrics.memory.current = memoryUsage;
    this.metrics.memory.lastCheck = Date.now();
    
    if (memUsage.heapUsed > this.metrics.memory.peak) {
      this.metrics.memory.peak = memUsage.heapUsed;
    }

    // Check thresholds
    if (memoryUsage > this.config.thresholds.memoryUsage) {
      logger.warn('High memory usage detected', {
        usage: `${(memoryUsage * 100).toFixed(2)}%`,
        threshold: `${(this.config.thresholds.memoryUsage * 100).toFixed(2)}%`,
        usedMB: Math.round(usedMem / 1024 / 1024),
        totalMB: Math.round(totalMem / 1024 / 1024)
      });

      if (this.config.reportToGitHub) {
        this.issueReporter.reportPerformanceIssue(
          'memory_usage',
          memoryUsage,
          this.config.thresholds.memoryUsage,
          {
            usedMB: Math.round(usedMem / 1024 / 1024),
            totalMB: Math.round(totalMem / 1024 / 1024),
            severity: 'warning'
          }
        );
      }

      // Trigger memory optimization
      if (this.config.optimization.enableMemoryOptimization) {
        this.optimizeMemory();
      }
    }

    if (heapUsage > this.config.thresholds.heapUsage) {
      logger.warn('High heap usage detected', {
        heapUsage: `${(heapUsage * 100).toFixed(2)}%`,
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024)
      });

      // Force garbage collection if available
      if (global.gc && this.config.optimization.enableGarbageCollection) {
        global.gc();
      }
    }
  }

  /**
   * Check CPU usage
   */
  checkCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsage = 1 - (totalIdle / totalTick);
    this.metrics.cpu.usage = cpuUsage;
    this.metrics.cpu.lastCheck = Date.now();

    if (cpuUsage > this.config.thresholds.cpuUsage) {
      logger.warn('High CPU usage detected', {
        usage: `${(cpuUsage * 100).toFixed(2)}%`,
        threshold: `${(this.config.thresholds.cpuUsage * 100).toFixed(2)}%`,
        cores: cpus.length
      });

      if (this.config.reportToGitHub) {
        this.issueReporter.reportPerformanceIssue(
          'cpu_usage',
          cpuUsage,
          this.config.thresholds.cpuUsage,
          {
            cores: cpus.length,
            severity: 'warning'
          }
        );
      }
    }
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory() {
    try {
      // Force garbage collection if available
      if (global.gc) {
        const beforeMem = process.memoryUsage().heapUsed;
        global.gc();
        const afterMem = process.memoryUsage().heapUsed;
        const freed = beforeMem - afterMem;
        
        if (freed > 0) {
          logger.info('Memory optimization completed', {
            freedMB: Math.round(freed / 1024 / 1024),
            beforeMB: Math.round(beforeMem / 1024 / 1024),
            afterMB: Math.round(afterMem / 1024 / 1024)
          });
        }
      }

      // Clean up old metrics
      this.cleanupMetrics();
      
    } catch (error) {
      logger.error('Memory optimization failed', error);
    }
  }

  /**
   * Record script performance metrics
   */
  recordScriptPerformance(scriptName, duration, success) {
    if (!this.metrics.scripts.has(scriptName)) {
      this.metrics.scripts.set(scriptName, {
        runs: 0,
        totalTime: 0,
        errors: 0,
        avgTime: 0,
        lastRun: Date.now()
      });
    }

    const metrics = this.metrics.scripts.get(scriptName);
    metrics.runs++;
    metrics.totalTime += duration;
    metrics.avgTime = metrics.totalTime / metrics.runs;
    metrics.lastRun = Date.now();
    
    if (!success) {
      metrics.errors++;
    }

    // Log slow scripts
    if (duration > this.config.scriptTimeoutWarning) {
      logger.warn(`Slow script execution: ${scriptName}`, {
        duration: `${duration}ms`,
        averageTime: `${Math.round(metrics.avgTime)}ms`,
        runs: metrics.runs,
        errorRate: `${((metrics.errors / metrics.runs) * 100).toFixed(2)}%`
      });
    }
  }

  /**
   * Record API performance metrics
   */
  recordAPIPerformance(endpoint, duration, success) {
    if (!this.metrics.apiCalls.has(endpoint)) {
      this.metrics.apiCalls.set(endpoint, {
        calls: 0,
        totalTime: 0,
        errors: 0,
        avgTime: 0,
        lastCall: Date.now()
      });
    }

    const metrics = this.metrics.apiCalls.get(endpoint);
    metrics.calls++;
    metrics.totalTime += duration;
    metrics.avgTime = metrics.totalTime / metrics.calls;
    metrics.lastCall = Date.now();
    
    if (!success) {
      metrics.errors++;
    }

    // Update request metrics
    this.metrics.requests.total++;
    this.metrics.requests.totalTime += duration;
    
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }
  }

  /**
   * Record database performance metrics
   */
  recordDBPerformance(queryType, duration, success) {
    if (!this.metrics.dbQueries.has(queryType)) {
      this.metrics.dbQueries.set(queryType, {
        count: 0,
        totalTime: 0,
        errors: 0,
        avgTime: 0,
        lastQuery: Date.now()
      });
    }

    const metrics = this.metrics.dbQueries.get(queryType);
    metrics.count++;
    metrics.totalTime += duration;
    metrics.avgTime = metrics.totalTime / metrics.count;
    metrics.lastQuery = Date.now();
    
    if (!success) {
      metrics.errors++;
    }
  }

  /**
   * Get API error rate
   */
  getAPIErrorRate(endpoint) {
    const metrics = this.metrics.apiCalls.get(endpoint);
    if (!metrics || metrics.calls === 0) return 0;
    return metrics.errors / metrics.calls;
  }

  /**
   * Get overall performance metrics
   */
  getPerformanceMetrics() {
    const now = Date.now();
    const timeSinceReset = now - this.metrics.requests.lastReset;
    const requestsPerSecond = timeSinceReset > 0 
      ? (this.metrics.requests.total / (timeSinceReset / 1000))
      : 0;

    return {
      memory: {
        usage: this.metrics.memory.current,
        peak: this.metrics.memory.peak,
        current: process.memoryUsage()
      },
      cpu: {
        usage: this.metrics.cpu.usage,
        cores: os.cpus().length
      },
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        errorRate: this.metrics.requests.total > 0 
          ? this.metrics.requests.failed / this.metrics.requests.total 
          : 0,
        avgResponseTime: this.metrics.requests.total > 0
          ? this.metrics.requests.totalTime / this.metrics.requests.total
          : 0,
        requestsPerSecond
      },
      scripts: Array.from(this.metrics.scripts.entries()).map(([name, metrics]) => ({
        name,
        ...metrics,
        errorRate: metrics.runs > 0 ? metrics.errors / metrics.runs : 0
      })),
      apiCalls: Array.from(this.metrics.apiCalls.entries()).map(([endpoint, metrics]) => ({
        endpoint,
        ...metrics,
        errorRate: metrics.calls > 0 ? metrics.errors / metrics.calls : 0
      })),
      dbQueries: Array.from(this.metrics.dbQueries.entries()).map(([type, metrics]) => ({
        type,
        ...metrics,
        errorRate: metrics.count > 0 ? metrics.errors / metrics.count : 0
      })),
      thresholds: this.config.thresholds,
      uptime: process.uptime()
    };
  }

  /**
   * Clean up old metrics to free memory
   */
  cleanupMetrics() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    // Clean up old script metrics
    for (const [name, metrics] of this.metrics.scripts.entries()) {
      if (metrics.lastRun < cutoff) {
        this.metrics.scripts.delete(name);
      }
    }

    // Clean up old API metrics
    for (const [endpoint, metrics] of this.metrics.apiCalls.entries()) {
      if (metrics.lastCall < cutoff) {
        this.metrics.apiCalls.delete(endpoint);
      }
    }

    // Clean up old DB metrics
    for (const [type, metrics] of this.metrics.dbQueries.entries()) {
      if (metrics.lastQuery < cutoff) {
        this.metrics.dbQueries.delete(type);
      }
    }
  }

  /**
   * Reset performance counters
   */
  resetMetrics() {
    this.metrics.requests = {
      total: 0,
      successful: 0,
      failed: 0,
      totalTime: 0,
      lastReset: Date.now()
    };
    
    logger.info('Performance metrics reset');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.memoryInterval) clearInterval(this.memoryInterval);
    if (this.cpuInterval) clearInterval(this.cpuInterval);
    if (this.gcInterval) clearInterval(this.gcInterval);
    
    logger.info('Performance Monitor stopped');
  }
}

// Singleton instance
let instance = null;

/**
 * Get PerformanceMonitor instance
 */
function getPerformanceMonitor(config) {
  if (!instance) {
    instance = new PerformanceMonitor(config);
  }
  return instance;
}

module.exports = {
  PerformanceMonitor,
  getPerformanceMonitor
};