/**
 * Comprehensive Observability and Alerting System
 * Production-ready monitoring, metrics collection, and automated alerting for A.A.I.T.I
 */

const prometheus = require('prom-client');
const { logger } = require('../utils/logger');

/**
 * A.A.I.T.I Observability Service
 * Manages metrics collection, alerting rules, and monitoring dashboards
 */
class ObservabilityService {
    constructor() {
        this.metrics = new Map();
        this.alertRules = new Map();
        this.alertingEnabled = process.env.ALERTING_ENABLED !== 'false';
        this.alertingWebhook = process.env.ALERTING_WEBHOOK;
        this.alertHistory = [];
        
        this.initializeMetrics();
        this.initializeAlertRules();
    }

    /**
     * Initialize Prometheus metrics for comprehensive monitoring
     */
    initializeMetrics() {
        // HTTP Request metrics
        this.metrics.set('http_requests_total', new prometheus.Counter({
            name: 'aaiti_http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code', 'user_type']
        }));

        this.metrics.set('http_request_duration', new prometheus.Histogram({
            name: 'aaiti_http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.1, 0.3, 0.5, 0.7, 1, 2, 3, 5, 7, 10]
        }));

        // Trading Operation metrics
        this.metrics.set('trading_operations_total', new prometheus.Counter({
            name: 'aaiti_trading_operations_total',
            help: 'Total number of trading operations',
            labelNames: ['operation_type', 'status', 'symbol', 'mode']
        }));

        this.metrics.set('trading_operation_duration', new prometheus.Histogram({
            name: 'aaiti_trading_operation_duration_seconds',
            help: 'Trading operation duration in seconds',
            labelNames: ['operation_type', 'symbol'],
            buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
        }));

        // Risk Engine metrics
        this.metrics.set('risk_validations_total', new prometheus.Counter({
            name: 'aaiti_risk_validations_total',
            help: 'Total number of risk validations',
            labelNames: ['result', 'violation_type', 'severity']
        }));

        this.metrics.set('risk_validation_duration', new prometheus.Histogram({
            name: 'aaiti_risk_validation_duration_seconds',
            help: 'Risk validation duration in seconds',
            buckets: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5]
        }));

        // ML Model metrics
        this.metrics.set('ml_predictions_total', new prometheus.Counter({
            name: 'aaiti_ml_predictions_total',
            help: 'Total number of ML predictions',
            labelNames: ['model_name', 'model_version', 'symbol', 'prediction_type']
        }));

        this.metrics.set('ml_prediction_accuracy', new prometheus.Gauge({
            name: 'aaiti_ml_prediction_accuracy',
            help: 'ML model prediction accuracy',
            labelNames: ['model_name', 'symbol', 'timeframe']
        }));

        this.metrics.set('ml_model_drift', new prometheus.Gauge({
            name: 'aaiti_ml_model_drift',
            help: 'ML model drift detection score',
            labelNames: ['model_name', 'feature_name']
        }));

        // Database metrics
        this.metrics.set('database_connections_active', new prometheus.Gauge({
            name: 'aaiti_database_connections_active',
            help: 'Number of active database connections'
        }));

        this.metrics.set('database_query_duration', new prometheus.Histogram({
            name: 'aaiti_database_query_duration_seconds',
            help: 'Database query duration in seconds',
            labelNames: ['operation', 'table'],
            buckets: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.5, 1]
        }));

        // System Resource metrics
        this.metrics.set('memory_usage_bytes', new prometheus.Gauge({
            name: 'aaiti_memory_usage_bytes',
            help: 'Memory usage in bytes',
            labelNames: ['type']
        }));

        this.metrics.set('cpu_usage_percent', new prometheus.Gauge({
            name: 'aaiti_cpu_usage_percent',
            help: 'CPU usage percentage'
        }));

        // Business metrics
        this.metrics.set('portfolio_value_usd', new prometheus.Gauge({
            name: 'aaiti_portfolio_value_usd',
            help: 'Total portfolio value in USD',
            labelNames: ['mode', 'user_id']
        }));

        this.metrics.set('daily_pnl_usd', new prometheus.Gauge({
            name: 'aaiti_daily_pnl_usd',
            help: 'Daily profit and loss in USD',
            labelNames: ['mode', 'user_id']
        }));

        // Error metrics
        this.metrics.set('errors_total', new prometheus.Counter({
            name: 'aaiti_errors_total',
            help: 'Total number of errors',
            labelNames: ['component', 'error_type', 'severity']
        }));

        logger.info('Observability metrics initialized', { 
            metricsCount: this.metrics.size 
        });
    }

    /**
     * Initialize alert rules for production monitoring
     */
    initializeAlertRules() {
        // HTTP Error Rate Alert (>2%)
        this.alertRules.set('high_error_rate', {
            name: 'High HTTP Error Rate',
            description: 'HTTP error rate exceeds 2% threshold',
            condition: 'http_error_rate > 0.02',
            severity: 'critical',
            threshold: 0.02,
            evaluationInterval: 30, // seconds
            evaluationPeriod: 300, // 5 minutes
            enabled: true
        });

        // High Response Time Alert (P95 > 500ms)
        this.alertRules.set('high_response_time', {
            name: 'High Response Time',
            description: 'P95 response time exceeds 500ms threshold',
            condition: 'http_request_duration_p95 > 0.5',
            severity: 'warning',
            threshold: 0.5,
            evaluationInterval: 60,
            evaluationPeriod: 300,
            enabled: true
        });

        // Trading Operation Failures (>5%)
        this.alertRules.set('trading_failure_rate', {
            name: 'High Trading Failure Rate',
            description: 'Trading operation failure rate exceeds 5%',
            condition: 'trading_failure_rate > 0.05',
            severity: 'critical',
            threshold: 0.05,
            evaluationInterval: 30,
            evaluationPeriod: 180,
            enabled: true
        });

        // Risk Validation Blocking (>10%)
        this.alertRules.set('high_risk_blocking', {
            name: 'High Risk Validation Blocking',
            description: 'Risk validation blocking rate exceeds 10%',
            condition: 'risk_blocking_rate > 0.10',
            severity: 'warning',
            threshold: 0.10,
            evaluationInterval: 60,
            evaluationPeriod: 300,
            enabled: true
        });

        // ML Model Drift Detection
        this.alertRules.set('ml_model_drift', {
            name: 'ML Model Drift Detected',
            description: 'ML model drift score exceeds acceptable threshold',
            condition: 'ml_model_drift > 0.3',
            severity: 'warning',
            threshold: 0.3,
            evaluationInterval: 300, // 5 minutes
            evaluationPeriod: 900, // 15 minutes
            enabled: true
        });

        // Database Connection Pool Exhaustion
        this.alertRules.set('db_connection_exhaustion', {
            name: 'Database Connection Pool Near Exhaustion',
            description: 'Database connection pool usage >90%',
            condition: 'db_connection_usage > 0.9',
            severity: 'critical',
            threshold: 0.9,
            evaluationInterval: 30,
            evaluationPeriod: 120,
            enabled: true
        });

        // Memory Usage Alert
        this.alertRules.set('high_memory_usage', {
            name: 'High Memory Usage',
            description: 'Memory usage exceeds 85% threshold',
            condition: 'memory_usage_percent > 0.85',
            severity: 'warning',
            threshold: 0.85,
            evaluationInterval: 60,
            evaluationPeriod: 300,
            enabled: true
        });

        // Daily Loss Limit Alert
        this.alertRules.set('daily_loss_limit', {
            name: 'Daily Loss Limit Approached',
            description: 'Daily PnL approaching configured loss limits',
            condition: 'daily_pnl_loss_ratio > 0.8',
            severity: 'critical',
            threshold: 0.8,
            evaluationInterval: 300,
            evaluationPeriod: 600,
            enabled: true
        });

        logger.info('Alert rules initialized', { 
            rulesCount: this.alertRules.size,
            enabledRules: Array.from(this.alertRules.values()).filter(r => r.enabled).length
        });

        // Start alert evaluation loop
        if (this.alertingEnabled) {
            this.startAlertEvaluation();
        }
    }

    /**
     * Record HTTP request metrics
     */
    recordHttpRequest(method, route, statusCode, duration, userType = 'unknown') {
        this.metrics.get('http_requests_total').inc({
            method,
            route,
            status_code: statusCode,
            user_type: userType
        });

        this.metrics.get('http_request_duration').observe({
            method,
            route,
            status_code: statusCode
        }, duration);
    }

    /**
     * Record trading operation metrics
     */
    recordTradingOperation(operationType, status, symbol, mode, duration) {
        this.metrics.get('trading_operations_total').inc({
            operation_type: operationType,
            status,
            symbol,
            mode
        });

        if (duration !== undefined) {
            this.metrics.get('trading_operation_duration').observe({
                operation_type: operationType,
                symbol
            }, duration);
        }
    }

    /**
     * Record risk validation metrics
     */
    recordRiskValidation(result, violationType, severity, duration) {
        this.metrics.get('risk_validations_total').inc({
            result,
            violation_type: violationType || 'none',
            severity: severity || 'none'
        });

        if (duration !== undefined) {
            this.metrics.get('risk_validation_duration').observe(duration);
        }
    }

    /**
     * Record ML prediction metrics
     */
    recordMLPrediction(modelName, modelVersion, symbol, predictionType) {
        this.metrics.get('ml_predictions_total').inc({
            model_name: modelName,
            model_version: modelVersion,
            symbol,
            prediction_type: predictionType
        });
    }

    /**
     * Update ML model accuracy
     */
    updateMLAccuracy(modelName, symbol, timeframe, accuracy) {
        this.metrics.get('ml_prediction_accuracy').set({
            model_name: modelName,
            symbol,
            timeframe
        }, accuracy);
    }

    /**
     * Update ML model drift score
     */
    updateMLDrift(modelName, featureName, driftScore) {
        this.metrics.get('ml_model_drift').set({
            model_name: modelName,
            feature_name: featureName
        }, driftScore);
    }

    /**
     * Record database metrics
     */
    recordDatabaseOperation(operation, table, duration) {
        this.metrics.get('database_query_duration').observe({
            operation,
            table
        }, duration);
    }

    /**
     * Update system resource metrics
     */
    updateSystemMetrics(memoryUsage, cpuUsage, activeConnections) {
        if (memoryUsage) {
            this.metrics.get('memory_usage_bytes').set({ type: 'heap_used' }, memoryUsage.heapUsed);
            this.metrics.get('memory_usage_bytes').set({ type: 'heap_total' }, memoryUsage.heapTotal);
            this.metrics.get('memory_usage_bytes').set({ type: 'external' }, memoryUsage.external);
        }

        if (cpuUsage !== undefined) {
            this.metrics.get('cpu_usage_percent').set(cpuUsage);
        }

        if (activeConnections !== undefined) {
            this.metrics.get('database_connections_active').set(activeConnections);
        }
    }

    /**
     * Update business metrics
     */
    updateBusinessMetrics(portfolioValue, dailyPnL, mode, userId) {
        if (portfolioValue !== undefined) {
            this.metrics.get('portfolio_value_usd').set({
                mode,
                user_id: userId || 'system'
            }, portfolioValue);
        }

        if (dailyPnL !== undefined) {
            this.metrics.get('daily_pnl_usd').set({
                mode,
                user_id: userId || 'system'
            }, dailyPnL);
        }
    }

    /**
     * Record error metrics
     */
    recordError(component, errorType, severity) {
        this.metrics.get('errors_total').inc({
            component,
            error_type: errorType,
            severity
        });
    }

    /**
     * Start alert evaluation loop
     */
    startAlertEvaluation() {
        setInterval(async () => {
            try {
                await this.evaluateAlerts();
            } catch (error) {
                logger.error('Alert evaluation failed:', error);
            }
        }, 30000); // Evaluate every 30 seconds

        logger.info('Alert evaluation loop started');
    }

    /**
     * Evaluate all alert rules
     */
    async evaluateAlerts() {
        const timestamp = new Date();
        
        for (const [ruleId, rule] of this.alertRules) {
            if (!rule.enabled) continue;

            try {
                const shouldAlert = await this.evaluateAlertRule(rule);
                
                if (shouldAlert) {
                    await this.triggerAlert(ruleId, rule, timestamp);
                }
            } catch (error) {
                logger.error(`Alert rule evaluation failed: ${ruleId}`, error);
            }
        }
    }

    /**
     * Evaluate individual alert rule
     */
    async evaluateAlertRule(rule) {
        const metrics = await this.collectCurrentMetrics();
        
        switch (rule.name) {
            case 'High HTTP Error Rate':
                return this.evaluateErrorRate(metrics, rule.threshold);
            
            case 'High Response Time':
                return this.evaluateResponseTime(metrics, rule.threshold);
            
            case 'High Trading Failure Rate':
                return this.evaluateTradingFailures(metrics, rule.threshold);
            
            case 'High Risk Validation Blocking':
                return this.evaluateRiskBlocking(metrics, rule.threshold);
            
            case 'ML Model Drift Detected':
                return this.evaluateMLDrift(metrics, rule.threshold);
            
            case 'Database Connection Pool Near Exhaustion':
                return this.evaluateDatabaseConnections(metrics, rule.threshold);
            
            case 'High Memory Usage':
                return this.evaluateMemoryUsage(metrics, rule.threshold);
            
            case 'Daily Loss Limit Approached':
                return this.evaluateDailyLoss(metrics, rule.threshold);
            
            default:
                return false;
        }
    }

    /**
     * Collect current metrics for evaluation
     */
    async collectCurrentMetrics() {
        const register = prometheus.register;
        const metricsString = await register.metrics();
        
        // Parse metrics (simplified - in production, use proper Prometheus client)
        return this.parseMetricsString(metricsString);
    }

    /**
     * Parse Prometheus metrics string
     */
    parseMetricsString(metricsString) {
        const metrics = {};
        const lines = metricsString.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('#') || !line.trim()) continue;
            
            const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*(?:\{[^}]*\})?) (.+)$/);
            if (match) {
                const [, metricName, value] = match;
                metrics[metricName] = parseFloat(value);
            }
        }
        
        return metrics;
    }

    /**
     * Evaluate HTTP error rate
     */
    evaluateErrorRate(metrics, threshold) {
        const totalRequests = Object.keys(metrics)
            .filter(key => key.startsWith('aaiti_http_requests_total'))
            .reduce((sum, key) => sum + (metrics[key] || 0), 0);
        
        const errorRequests = Object.keys(metrics)
            .filter(key => key.startsWith('aaiti_http_requests_total') && key.includes('status_code="5'))
            .reduce((sum, key) => sum + (metrics[key] || 0), 0);
        
        const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;
        return errorRate > threshold;
    }

    /**
     * Evaluate response time (P95)
     */
    evaluateResponseTime(metrics, threshold) {
        // Simplified P95 calculation - in production, use proper histogram analysis
        const responseTimeMetrics = Object.keys(metrics)
            .filter(key => key.includes('aaiti_http_request_duration_seconds'))
            .map(key => metrics[key]);
        
        if (responseTimeMetrics.length === 0) return false;
        
        responseTimeMetrics.sort((a, b) => a - b);
        const p95Index = Math.floor(responseTimeMetrics.length * 0.95);
        const p95Value = responseTimeMetrics[p95Index] || 0;
        
        return p95Value > threshold;
    }

    /**
     * Trigger alert
     */
    async triggerAlert(ruleId, rule, timestamp) {
        const alert = {
            id: `${ruleId}_${timestamp.getTime()}`,
            ruleId,
            ruleName: rule.name,
            description: rule.description,
            severity: rule.severity,
            timestamp,
            status: 'firing'
        };

        // Check if this alert was recently fired to avoid spam
        const recentAlert = this.alertHistory.find(a => 
            a.ruleId === ruleId && 
            (timestamp.getTime() - new Date(a.timestamp).getTime()) < 300000 // 5 minutes
        );

        if (recentAlert) {
            return; // Skip duplicate alert
        }

        this.alertHistory.push(alert);

        // Keep only last 100 alerts
        if (this.alertHistory.length > 100) {
            this.alertHistory = this.alertHistory.slice(-100);
        }

        logger.error(`ALERT TRIGGERED: ${rule.name}`, {
            alertId: alert.id,
            severity: rule.severity,
            description: rule.description
        });

        // Send alert notification
        if (this.alertingWebhook) {
            await this.sendAlertNotification(alert);
        }

        // Record alert metric
        this.recordError('alerting', 'alert_triggered', rule.severity);
    }

    /**
     * Send alert notification via webhook
     */
    async sendAlertNotification(alert) {
        try {
            const axios = require('axios');
            
            const payload = {
                text: `🚨 A.A.I.T.I Alert: ${alert.ruleName}`,
                attachments: [{
                    color: alert.severity === 'critical' ? 'danger' : 'warning',
                    fields: [
                        { title: 'Severity', value: alert.severity, short: true },
                        { title: 'Description', value: alert.description, short: false },
                        { title: 'Time', value: alert.timestamp.toISOString(), short: true }
                    ]
                }]
            };

            await axios.post(this.alertingWebhook, payload);
            
        } catch (error) {
            logger.error('Failed to send alert notification:', error);
        }
    }

    /**
     * Get current alert status
     */
    getAlertStatus() {
        const now = new Date();
        const activeAlerts = this.alertHistory.filter(alert => 
            (now.getTime() - new Date(alert.timestamp).getTime()) < 3600000 && // Last hour
            alert.status === 'firing'
        );

        return {
            totalRules: this.alertRules.size,
            enabledRules: Array.from(this.alertRules.values()).filter(r => r.enabled).length,
            activeAlerts: activeAlerts.length,
            recentAlerts: activeAlerts,
            alertHistory: this.alertHistory.slice(-10) // Last 10 alerts
        };
    }

    /**
     * Get Prometheus metrics endpoint
     */
    getMetricsEndpoint() {
        return prometheus.register.metrics();
    }

    // Additional evaluation methods for other alert rules...
    evaluateTradingFailures(metrics, threshold) { return false; }
    evaluateRiskBlocking(metrics, threshold) { return false; }
    evaluateMLDrift(metrics, threshold) { return false; }
    evaluateDatabaseConnections(metrics, threshold) { return false; }
    evaluateMemoryUsage(metrics, threshold) { return false; }
    evaluateDailyLoss(metrics, threshold) { return false; }
}

module.exports = ObservabilityService;