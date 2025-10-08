const logger = require('./logger');

/**
 * Database Connection Pool Monitor
 * Monitors PostgreSQL connection pool health and performance
 * Provides metrics for Prometheus/Grafana integration
 */
class DatabasePoolMonitor {
  constructor(pools) {
    this.pools = pools || new Map();
    this.metrics = {
      connections: {
        total: 0,
        active: 0,
        idle: 0,
        waiting: 0
      },
      queries: {
        total: 0,
        success: 0,
        errors: 0,
        avgResponseTime: 0
      },
      pool: {
        created: 0,
        destroyed: 0,
        timedOut: 0
      }
    };
    
    this.queryTimes = [];
    this.maxQueryTimeHistory = 1000; // Keep last 1000 query times
    
    this.startMonitoring();
  }

  startMonitoring() {
    // Monitor every 30 seconds
    this.monitorInterval = setInterval(() => {
      this.updateMetrics();
      this.logPoolStatus();
      this.checkPoolHealth();
    }, 30000);

    logger.info('📊 Database pool monitoring started', {
      service: 'database-monitor',
      interval: '30s'
    });
  }

  updateMetrics() {
    let totalConnections = 0;
    let activeConnections = 0;
    let idleConnections = 0;
    let waitingConnections = 0;

    this.pools.forEach((pool, name) => {
      if (pool && pool.pool) {
        totalConnections += pool.pool.numUsed() + pool.pool.numFree();
        activeConnections += pool.pool.numUsed();
        idleConnections += pool.pool.numFree();
        waitingConnections += pool.pool.numPendingAcquires();
      }
    });

    this.metrics.connections = {
      total: totalConnections,
      active: activeConnections,
      idle: idleConnections,
      waiting: waitingConnections
    };

    // Calculate average response time from recent queries
    if (this.queryTimes.length > 0) {
      const sum = this.queryTimes.reduce((a, b) => a + b, 0);
      this.metrics.queries.avgResponseTime = sum / this.queryTimes.length;
    }
  }

  logPoolStatus() {
    const { connections, queries } = this.metrics;
    
    logger.info('📊 Database pool status', {
      service: 'database-monitor',
      connections,
      queries: {
        total: queries.total,
        success: queries.success,
        errors: queries.errors,
        avgResponseTime: Math.round(queries.avgResponseTime * 100) / 100
      }
    });
  }

  checkPoolHealth() {
    const { connections } = this.metrics;
    const healthThresholds = {
      maxActiveRatio: 0.8, // 80% of max connections
      maxWaitingConnections: 10,
      maxAvgResponseTime: 1000 // 1 second
    };

    // Check for pool exhaustion
    this.pools.forEach((pool, name) => {
      if (pool && pool.pool) {
        const maxConnections = pool.pool.max || 20;
        const activeRatio = pool.pool.numUsed() / maxConnections;
        
        if (activeRatio > healthThresholds.maxActiveRatio) {
          logger.warn('⚠️ Database pool nearing exhaustion', {
            service: 'database-monitor',
            pool: name,
            activeConnections: pool.pool.numUsed(),
            maxConnections,
            activeRatio: Math.round(activeRatio * 100) / 100
          });
        }

        if (pool.pool.numPendingAcquires() > healthThresholds.maxWaitingConnections) {
          logger.warn('⚠️ High number of waiting connections', {
            service: 'database-monitor',
            pool: name,
            waitingConnections: pool.pool.numPendingAcquires()
          });
        }
      }
    });

    // Check average response time
    if (this.metrics.queries.avgResponseTime > healthThresholds.maxAvgResponseTime) {
      logger.warn('⚠️ Slow database response times detected', {
        service: 'database-monitor',
        avgResponseTime: Math.round(this.metrics.queries.avgResponseTime * 100) / 100,
        threshold: healthThresholds.maxAvgResponseTime
      });
    }
  }

  recordQuery(duration, success = true) {
    this.metrics.queries.total++;
    
    if (success) {
      this.metrics.queries.success++;
    } else {
      this.metrics.queries.errors++;
    }

    // Store query time for average calculation
    this.queryTimes.push(duration);
    if (this.queryTimes.length > this.maxQueryTimeHistory) {
      this.queryTimes.shift(); // Remove oldest time
    }
  }

  recordConnection(event, poolName = 'primary') {
    switch (event) {
      case 'created':
        this.metrics.pool.created++;
        logger.debug('Database connection created', {
          service: 'database-monitor',
          pool: poolName,
          totalCreated: this.metrics.pool.created
        });
        break;
      case 'destroyed':
        this.metrics.pool.destroyed++;
        logger.debug('Database connection destroyed', {
          service: 'database-monitor',
          pool: poolName,
          totalDestroyed: this.metrics.pool.destroyed
        });
        break;
      case 'timeout':
        this.metrics.pool.timedOut++;
        logger.warn('Database connection timeout', {
          service: 'database-monitor',
          pool: poolName,
          totalTimeouts: this.metrics.pool.timedOut
        });
        break;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      pools: this.getPoolDetails(),
      timestamp: new Date().toISOString()
    };
  }

  getPoolDetails() {
    const poolDetails = {};
    
    this.pools.forEach((pool, name) => {
      if (pool && pool.pool) {
        poolDetails[name] = {
          active: pool.pool.numUsed(),
          idle: pool.pool.numFree(),
          waiting: pool.pool.numPendingAcquires(),
          max: pool.pool.max,
          min: pool.pool.min
        };
      }
    });

    return poolDetails;
  }

  // Prometheus-compatible metrics format
  getPrometheusMetrics() {
    const metrics = [];
    const timestamp = Date.now();

    // Connection metrics
    metrics.push(`aaiti_db_connections_total ${this.metrics.connections.total} ${timestamp}`);
    metrics.push(`aaiti_db_connections_active ${this.metrics.connections.active} ${timestamp}`);
    metrics.push(`aaiti_db_connections_idle ${this.metrics.connections.idle} ${timestamp}`);
    metrics.push(`aaiti_db_connections_waiting ${this.metrics.connections.waiting} ${timestamp}`);

    // Query metrics
    metrics.push(`aaiti_db_queries_total ${this.metrics.queries.total} ${timestamp}`);
    metrics.push(`aaiti_db_queries_success ${this.metrics.queries.success} ${timestamp}`);
    metrics.push(`aaiti_db_queries_errors ${this.metrics.queries.errors} ${timestamp}`);
    metrics.push(`aaiti_db_query_duration_avg ${this.metrics.queries.avgResponseTime} ${timestamp}`);

    // Pool metrics
    metrics.push(`aaiti_db_pool_connections_created ${this.metrics.pool.created} ${timestamp}`);
    metrics.push(`aaiti_db_pool_connections_destroyed ${this.metrics.pool.destroyed} ${timestamp}`);
    metrics.push(`aaiti_db_pool_connections_timeout ${this.metrics.pool.timedOut} ${timestamp}`);

    return metrics.join('\n');
  }

  // Health check for application monitoring
  getHealthStatus() {
    const isHealthy = 
      this.metrics.connections.waiting < 10 &&
      this.metrics.queries.avgResponseTime < 1000 &&
      this.pools.size > 0;

    return {
      healthy: isHealthy,
      connections: this.metrics.connections,
      avgResponseTime: Math.round(this.metrics.queries.avgResponseTime * 100) / 100,
      totalQueries: this.metrics.queries.total,
      errorRate: this.metrics.queries.total > 0 ? 
        Math.round((this.metrics.queries.errors / this.metrics.queries.total) * 10000) / 100 : 0,
      pools: Object.keys(this.getPoolDetails()).length
    };
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      
      logger.info('📊 Database pool monitoring stopped', {
        service: 'database-monitor'
      });
    }
  }
}

module.exports = DatabasePoolMonitor;