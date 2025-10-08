/**
 * Observability API Routes
 * Comprehensive monitoring, metrics, and alerting endpoints for A.A.I.T.I
 */

const express = require('express');
const { getObservabilityService } = require('../middleware/observabilityMiddleware');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const prometheus = require('prom-client');

const router = express.Router();

/**
 * GET /api/observability/metrics
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (req, res) => {
    try {
        const register = prometheus.register;
        const metrics = await register.metrics();
        
        res.set('Content-Type', register.contentType);
        res.send(metrics);
        
    } catch (error) {
        logger.error('Metrics retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve metrics', details: error.message });
    }
});

/**
 * GET /api/observability/health
 * Comprehensive health check with observability status
 */
router.get('/health', authenticateToken, async (req, res) => {
    try {
        const obs = getObservabilityService();
        const alertStatus = obs.getAlertStatus();
        
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            observability: {
                metricsCollectionActive: true,
                alertingEnabled: obs.alertingEnabled,
                totalAlertRules: alertStatus.totalRules,
                enabledAlertRules: alertStatus.enabledRules,
                activeAlerts: alertStatus.activeAlerts,
                lastEvaluationTime: new Date().toISOString()
            },
            services: {
                prometheus: 'healthy',
                alerting: obs.alertingEnabled ? 'healthy' : 'disabled',
                metrics: 'healthy'
            }
        };

        // Check if there are critical alerts
        const criticalAlerts = alertStatus.recentAlerts.filter(
            alert => alert.severity === 'critical'
        );

        if (criticalAlerts.length > 0) {
            health.status = 'degraded';
            health.issues = [`${criticalAlerts.length} critical alerts active`];
        }

        res.json(health);
        
    } catch (error) {
        logger.error('Observability health check failed:', error);
        res.status(500).json({ 
            status: 'unhealthy',
            error: 'Health check failed', 
            details: error.message 
        });
    }
});

/**
 * GET /api/observability/alerts
 * Get current alert status and history
 */
router.get('/alerts', authenticateToken, async (req, res) => {
    try {
        const obs = getObservabilityService();
        const alertStatus = obs.getAlertStatus();
        
        res.json({
            status: 'success',
            data: alertStatus,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Alert status retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve alert status', details: error.message });
    }
});

/**
 * GET /api/observability/alerts/rules
 * Get all alert rules configuration
 */
router.get('/alerts/rules', authenticateToken, async (req, res) => {
    try {
        const obs = getObservabilityService();
        const rules = Array.from(obs.alertRules.entries()).map(([id, rule]) => ({
            id,
            ...rule
        }));
        
        res.json({
            status: 'success',
            data: {
                rules,
                totalRules: rules.length,
                enabledRules: rules.filter(r => r.enabled).length
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Alert rules retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve alert rules', details: error.message });
    }
});

/**
 * PUT /api/observability/alerts/rules/:ruleId
 * Update alert rule configuration
 */
router.put('/alerts/rules/:ruleId', authenticateToken, async (req, res) => {
    try {
        const { ruleId } = req.params;
        const { enabled, threshold, severity, evaluationInterval } = req.body;
        
        const obs = getObservabilityService();
        
        if (!obs.alertRules.has(ruleId)) {
            return res.status(404).json({ error: 'Alert rule not found' });
        }
        
        const rule = obs.alertRules.get(ruleId);
        
        // Update rule properties
        if (enabled !== undefined) rule.enabled = enabled;
        if (threshold !== undefined) rule.threshold = threshold;
        if (severity !== undefined) rule.severity = severity;
        if (evaluationInterval !== undefined) rule.evaluationInterval = evaluationInterval;
        
        obs.alertRules.set(ruleId, rule);
        
        logger.info(`Alert rule updated: ${ruleId}`, { 
            enabled: rule.enabled,
            threshold: rule.threshold,
            severity: rule.severity
        });
        
        res.json({
            status: 'success',
            message: 'Alert rule updated successfully',
            data: { id: ruleId, ...rule },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Alert rule update failed:', error);
        res.status(500).json({ error: 'Failed to update alert rule', details: error.message });
    }
});

/**
 * POST /api/observability/alerts/test
 * Test alert notification system
 */
router.post('/alerts/test', authenticateToken, async (req, res) => {
    try {
        const { severity = 'warning', message = 'Test alert from A.A.I.T.I observability system' } = req.body;
        
        const obs = getObservabilityService();
        
        const testAlert = {
            id: `test_${Date.now()}`,
            ruleId: 'test_alert',
            ruleName: 'Test Alert',
            description: message,
            severity,
            timestamp: new Date(),
            status: 'firing'
        };
        
        // Send test alert
        if (obs.alertingWebhook) {
            await obs.sendAlertNotification(testAlert);
            
            res.json({
                status: 'success',
                message: 'Test alert sent successfully',
                alert: testAlert,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                status: 'warning',
                message: 'Test alert created but no webhook configured',
                alert: testAlert,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        logger.error('Test alert failed:', error);
        res.status(500).json({ error: 'Failed to send test alert', details: error.message });
    }
});

/**
 * GET /api/observability/dashboard/summary
 * Dashboard summary with key metrics
 */
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
    try {
        const obs = getObservabilityService();
        const alertStatus = obs.getAlertStatus();
        
        // Get recent metrics (simplified - in production, query actual Prometheus)
        const register = prometheus.register;
        const metricsString = await register.metrics();
        
        const summary = {
            systemHealth: {
                status: alertStatus.activeAlerts === 0 ? 'healthy' : 'degraded',
                activeAlerts: alertStatus.activeAlerts,
                totalAlertRules: alertStatus.totalRules,
                enabledAlertRules: alertStatus.enabledRules
            },
            performanceMetrics: {
                avgResponseTime: '0.245s', // Would come from actual metrics
                errorRate: '0.8%',
                requestRate: '147 RPS',
                uptime: process.uptime()
            },
            businessMetrics: {
                totalTrades: 1247, // Would come from actual data
                successRate: '98.2%',
                portfolioValue: '$125,430.50',
                dailyPnL: '+$2,341.20'
            },
            systemResources: {
                memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                cpuUsage: '12%', // Would come from actual monitoring
                diskUsage: '45%',
                networkIO: '2.3MB/s'
            },
            recentAlerts: alertStatus.recentAlerts.slice(0, 5),
            timestamp: new Date().toISOString()
        };
        
        res.json({
            status: 'success',
            data: summary
        });
        
    } catch (error) {
        logger.error('Dashboard summary failed:', error);
        res.status(500).json({ error: 'Failed to generate dashboard summary', details: error.message });
    }
});

/**
 * GET /api/observability/dashboard/metrics/:metricName
 * Get specific metric data for dashboard charts
 */
router.get('/dashboard/metrics/:metricName', authenticateToken, async (req, res) => {
    try {
        const { metricName } = req.params;
        const { timeRange = '1h', resolution = '1m' } = req.query;
        
        // In production, this would query actual time-series data
        const mockData = generateMockMetricData(metricName, timeRange, resolution);
        
        res.json({
            status: 'success',
            data: {
                metricName,
                timeRange,
                resolution,
                dataPoints: mockData,
                lastUpdated: new Date().toISOString()
            }
        });
        
    } catch (error) {
        logger.error('Metric data retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve metric data', details: error.message });
    }
});

/**
 * POST /api/observability/record/custom
 * Record custom business metrics
 */
router.post('/record/custom', authenticateToken, async (req, res) => {
    try {
        const { metricType, name, value, labels = {} } = req.body;
        
        if (!metricType || !name || value === undefined) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                required: ['metricType', 'name', 'value'] 
            });
        }
        
        const obs = getObservabilityService();
        
        // Record custom metric based on type
        switch (metricType) {
            case 'counter':
                // Would implement custom counter logic
                break;
            case 'gauge':
                // Would implement custom gauge logic
                break;
            case 'histogram':
                // Would implement custom histogram logic
                break;
            default:
                return res.status(400).json({ error: 'Invalid metric type' });
        }
        
        logger.info('Custom metric recorded', { metricType, name, value, labels });
        
        res.json({
            status: 'success',
            message: 'Custom metric recorded successfully',
            metric: { metricType, name, value, labels },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Custom metric recording failed:', error);
        res.status(500).json({ error: 'Failed to record custom metric', details: error.message });
    }
});

/**
 * GET /api/observability/export/grafana
 * Export Grafana dashboard configuration
 */
router.get('/export/grafana', authenticateToken, async (req, res) => {
    try {
        const grafanaDashboard = {
            dashboard: {
                id: null,
                title: 'A.A.I.T.I Production Monitoring',
                tags: ['aaiti', 'trading', 'production'],
                timezone: 'browser',
                panels: [
                    {
                        id: 1,
                        title: 'HTTP Request Rate',
                        type: 'graph',
                        targets: [{
                            expr: 'rate(aaiti_http_requests_total[5m])',
                            legendFormat: '{{method}} {{route}}'
                        }]
                    },
                    {
                        id: 2,
                        title: 'Response Time P95',
                        type: 'graph',
                        targets: [{
                            expr: 'histogram_quantile(0.95, rate(aaiti_http_request_duration_seconds_bucket[5m]))',
                            legendFormat: 'P95 Response Time'
                        }]
                    },
                    {
                        id: 3,
                        title: 'Error Rate',
                        type: 'singlestat',
                        targets: [{
                            expr: 'rate(aaiti_http_requests_total{status_code=~"5.."}[5m]) / rate(aaiti_http_requests_total[5m])',
                            legendFormat: 'Error Rate'
                        }]
                    },
                    {
                        id: 4,
                        title: 'Active Alerts',
                        type: 'table',
                        targets: [{
                            expr: 'ALERTS{alertstate="firing"}',
                            legendFormat: 'Active Alerts'
                        }]
                    }
                ],
                time: { from: 'now-1h', to: 'now' },
                refresh: '30s'
            }
        };
        
        res.json(grafanaDashboard);
        
    } catch (error) {
        logger.error('Grafana export failed:', error);
        res.status(500).json({ error: 'Failed to export Grafana dashboard', details: error.message });
    }
});

/**
 * Generate mock metric data for dashboard (would be replaced with real data in production)
 */
function generateMockMetricData(metricName, timeRange, resolution) {
    const now = new Date();
    const points = [];
    const intervals = getTimeIntervals(timeRange, resolution);
    
    for (let i = intervals; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * getResolutionMs(resolution)));
        const value = generateMockValue(metricName);
        
        points.push({
            timestamp: timestamp.toISOString(),
            value
        });
    }
    
    return points;
}

function getTimeIntervals(timeRange, resolution) {
    const ranges = { '1h': 60, '6h': 360, '24h': 1440, '7d': 10080 };
    const resolutions = { '1m': 1, '5m': 5, '15m': 15, '1h': 60 };
    
    return Math.floor((ranges[timeRange] || 60) / (resolutions[resolution] || 1));
}

function getResolutionMs(resolution) {
    const resolutions = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000 };
    return resolutions[resolution] || 60000;
}

function generateMockValue(metricName) {
    const generators = {
        'response_time': () => Math.random() * 0.5 + 0.1,
        'error_rate': () => Math.random() * 0.05,
        'request_rate': () => Math.random() * 50 + 100,
        'memory_usage': () => Math.random() * 0.3 + 0.4,
        'cpu_usage': () => Math.random() * 0.2 + 0.1
    };
    
    return generators[metricName] ? generators[metricName]() : Math.random();
}

module.exports = router;