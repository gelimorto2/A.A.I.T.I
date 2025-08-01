const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Performance metrics collection
let metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    responseTime: []
  },
  system: {
    startTime: Date.now(),
    uptime: 0,
    memory: {},
    cpu: {}
  },
  database: {
    queries: 0,
    connections: 0,
    errors: 0
  }
};

// Middleware to collect request metrics
const collectRequestMetrics = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    metrics.requests.total++;
    metrics.requests.responseTime.push(duration);
    
    // Keep only last 1000 response times
    if (metrics.requests.responseTime.length > 1000) {
      metrics.requests.responseTime = metrics.requests.responseTime.slice(-1000);
    }
    
    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.requests.success++;
    } else {
      metrics.requests.errors++;
    }
  });
  
  next();
};

// Update system metrics
const updateSystemMetrics = () => {
  metrics.system.uptime = Date.now() - metrics.system.startTime;
  metrics.system.memory = process.memoryUsage();
  
  // CPU usage (approximation)
  const cpuUsage = process.cpuUsage();
  metrics.system.cpu = {
    user: cpuUsage.user,
    system: cpuUsage.system
  };
};

// Prometheus-style metrics endpoint
router.get('/metrics', (req, res) => {
  updateSystemMetrics();
  
  const avgResponseTime = metrics.requests.responseTime.length > 0 
    ? metrics.requests.responseTime.reduce((a, b) => a + b, 0) / metrics.requests.responseTime.length 
    : 0;
  
  const prometheusMetrics = `
# HELP aaiti_requests_total Total number of HTTP requests
# TYPE aaiti_requests_total counter
aaiti_requests_total ${metrics.requests.total}

# HELP aaiti_requests_success_total Total number of successful HTTP requests
# TYPE aaiti_requests_success_total counter
aaiti_requests_success_total ${metrics.requests.success}

# HELP aaiti_requests_errors_total Total number of failed HTTP requests
# TYPE aaiti_requests_errors_total counter
aaiti_requests_errors_total ${metrics.requests.errors}

# HELP aaiti_response_time_avg Average response time in milliseconds
# TYPE aaiti_response_time_avg gauge
aaiti_response_time_avg ${avgResponseTime.toFixed(2)}

# HELP aaiti_uptime_seconds Application uptime in seconds
# TYPE aaiti_uptime_seconds gauge
aaiti_uptime_seconds ${Math.floor(metrics.system.uptime / 1000)}

# HELP aaiti_memory_usage_bytes Memory usage in bytes
# TYPE aaiti_memory_usage_bytes gauge
aaiti_memory_usage_bytes{type="rss"} ${metrics.system.memory.rss || 0}
aaiti_memory_usage_bytes{type="heapTotal"} ${metrics.system.memory.heapTotal || 0}
aaiti_memory_usage_bytes{type="heapUsed"} ${metrics.system.memory.heapUsed || 0}
aaiti_memory_usage_bytes{type="external"} ${metrics.system.memory.external || 0}

# HELP aaiti_cpu_usage_microseconds CPU usage in microseconds
# TYPE aaiti_cpu_usage_microseconds gauge
aaiti_cpu_usage_microseconds{type="user"} ${metrics.system.cpu.user || 0}
aaiti_cpu_usage_microseconds{type="system"} ${metrics.system.cpu.system || 0}

# HELP aaiti_database_queries_total Total number of database queries
# TYPE aaiti_database_queries_total counter
aaiti_database_queries_total ${metrics.database.queries}

# HELP aaiti_database_connections_total Total number of database connections
# TYPE aaiti_database_connections_total counter
aaiti_database_connections_total ${metrics.database.connections}

# HELP aaiti_database_errors_total Total number of database errors
# TYPE aaiti_database_errors_total counter
aaiti_database_errors_total ${metrics.database.errors}
`;
  
  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics.trim());
});

// JSON metrics endpoint
router.get('/metrics.json', (req, res) => {
  updateSystemMetrics();
  
  const avgResponseTime = metrics.requests.responseTime.length > 0 
    ? metrics.requests.responseTime.reduce((a, b) => a + b, 0) / metrics.requests.responseTime.length 
    : 0;
  
  res.json({
    requests: {
      total: metrics.requests.total,
      success: metrics.requests.success,
      errors: metrics.requests.errors,
      successRate: metrics.requests.total > 0 ? (metrics.requests.success / metrics.requests.total * 100).toFixed(2) : 0,
      errorRate: metrics.requests.total > 0 ? (metrics.requests.errors / metrics.requests.total * 100).toFixed(2) : 0,
      avgResponseTime: avgResponseTime.toFixed(2)
    },
    system: {
      uptime: Math.floor(metrics.system.uptime / 1000),
      uptimeHuman: formatUptime(metrics.system.uptime),
      memory: {
        rss: formatBytes(metrics.system.memory.rss),
        heapTotal: formatBytes(metrics.system.memory.heapTotal),
        heapUsed: formatBytes(metrics.system.memory.heapUsed),
        external: formatBytes(metrics.system.memory.external),
        heapUsedPercent: metrics.system.memory.heapTotal > 0 
          ? ((metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100).toFixed(2)
          : 0
      },
      cpu: metrics.system.cpu
    },
    database: {
      queries: metrics.database.queries,
      connections: metrics.database.connections,
      errors: metrics.database.errors
    },
    timestamp: new Date().toISOString()
  });
});

// Health check with metrics
router.get('/health', (req, res) => {
  updateSystemMetrics();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(metrics.system.uptime / 1000),
    memory: {
      used: formatBytes(metrics.system.memory.heapUsed),
      total: formatBytes(metrics.system.memory.heapTotal)
    },
    requests: {
      total: metrics.requests.total,
      successRate: metrics.requests.total > 0 ? ((metrics.requests.success / metrics.requests.total) * 100).toFixed(2) : 100
    }
  };
  
  // Determine health status
  const memoryUsagePercent = metrics.system.memory.heapTotal > 0 
    ? (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100
    : 0;
  
  const errorRate = metrics.requests.total > 0 
    ? (metrics.requests.errors / metrics.requests.total) * 100
    : 0;
  
  if (memoryUsagePercent > 90 || errorRate > 50) {
    health.status = 'unhealthy';
    res.status(503);
  } else if (memoryUsagePercent > 75 || errorRate > 25) {
    health.status = 'degraded';
  }
  
  res.json(health);
});

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Export middleware and metrics functions
module.exports = {
  router,
  collectRequestMetrics,
  updateMetrics: (type, value) => {
    switch (type) {
      case 'db_query':
        metrics.database.queries++;
        break;
      case 'db_connection':
        metrics.database.connections++;
        break;
      case 'db_error':
        metrics.database.errors++;
        break;
    }
  }
};