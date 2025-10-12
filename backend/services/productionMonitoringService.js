/**
 * Production Monitoring & Alerting Service
 * 
 * Comprehensive 24/7 production monitoring with real-time performance analytics,
 * intelligent alerting, error tracking, financial reconciliation, and SLA monitoring
 * for the A.A.I.T.I trading platform in production environment.
 * 
 * Features:
 * - 24/7 system health monitoring with uptime tracking
 * - Real-time trading performance analytics and P&L calculation
 * - Intelligent alerting with escalation procedures
 * - Error tracking and debugging with Sentry integration
 * - Financial reconciliation and balance verification
 * - SLA compliance monitoring and reporting
 * - Performance metrics dashboards and visualization
 * - Automated incident response and notification
 * 
 * @author A.A.I.T.I Development Team
 * @version 3.0.0
 * @created December 2024
 */

const prometheus = require('prom-client');
const winston = require('winston');
const { Webhook } = require('discord-webhook-node');
const nodemailer = require('nodemailer');
const Sentry = require('@sentry/node');
const Redis = require('redis');
const axios = require('axios');

class ProductionMonitoringService {
    constructor(config = {}) {
        this.config = {
            environment: 'production',
            uptimeThreshold: config.uptimeThreshold || 0.999, // 99.9% uptime SLA
            responseTimeThreshold: config.responseTimeThreshold || 1000, // 1 second
            errorRateThreshold: config.errorRateThreshold || 0.01, // 1% error rate
            balanceDiscrepancyThreshold: config.balanceDiscrepancyThreshold || 0.001, // 0.1%
            monitoringInterval: config.monitoringInterval || 30000, // 30 seconds
            alertCooldown: config.alertCooldown || 300000, // 5 minutes
            dashboardRefreshInterval: config.dashboardRefreshInterval || 10000,
            sentryDsn: config.sentryDsn,
            notifications: {
                discord: config.notifications?.discord,
                email: config.notifications?.email,
                slack: config.notifications?.slack,
                pagerduty: config.notifications?.pagerduty
            },
            ...config
        };

        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/production-monitoring.log' }),
                new winston.transports.Console()
            ]
        });

        // Initialize Sentry for error tracking
        if (this.config.sentryDsn) {
            Sentry.init({
                dsn: this.config.sentryDsn,
                environment: this.config.environment,
                tracesSampleRate: 1.0
            });
        }

        // Prometheus metrics
        this.metrics = {
            uptime: new prometheus.Gauge({
                name: 'system_uptime_percentage',
                help: 'System uptime percentage over time window'
            }),
            responseTime: new prometheus.Histogram({
                name: 'api_response_time_seconds',
                help: 'API response time in seconds',
                labelNames: ['endpoint', 'method', 'status']
            }),
            errorRate: new prometheus.Gauge({
                name: 'system_error_rate',
                help: 'System error rate percentage',
                labelNames: ['service', 'type']
            }),
            tradingPnL: new prometheus.Gauge({
                name: 'trading_pnl_usd',
                help: 'Trading P&L in USD',
                labelNames: ['strategy', 'exchange', 'timeframe']
            }),
            balanceDiscrepancy: new prometheus.Gauge({
                name: 'balance_discrepancy_percentage',
                help: 'Balance discrepancy percentage',
                labelNames: ['exchange', 'currency']
            }),
            alertsTriggered: new prometheus.Counter({
                name: 'alerts_triggered_total',
                help: 'Total number of alerts triggered',
                labelNames: ['severity', 'type', 'service']
            }),
            slaCompliance: new prometheus.Gauge({
                name: 'sla_compliance_percentage',
                help: 'SLA compliance percentage',
                labelNames: ['metric', 'timeframe']
            }),
            activeConnections: new prometheus.Gauge({
                name: 'active_connections_total',
                help: 'Number of active connections',
                labelNames: ['type', 'status']
            })
        };

        // Monitoring state
        this.monitoringState = {
            startTime: Date.now(),
            lastHealthCheck: null,
            systemHealth: 'healthy',
            alerts: new Map(),
            incidents: new Map(),
            performance: {
                uptime: 100,
                avgResponseTime: 0,
                errorRate: 0,
                throughput: 0
            },
            trading: {
                dailyPnL: 0,
                totalPnL: 0,
                successRate: 0,
                sharpeRatio: 0,
                maxDrawdown: 0
            },
            exchanges: new Map(),
            services: new Map()
        };

        // Alert definitions
        this.alertRules = new Map([
            ['high_error_rate', {
                threshold: this.config.errorRateThreshold,
                severity: 'critical',
                cooldown: this.config.alertCooldown,
                condition: (value) => value > this.config.errorRateThreshold
            }],
            ['low_uptime', {
                threshold: this.config.uptimeThreshold,
                severity: 'critical',
                cooldown: this.config.alertCooldown,
                condition: (value) => value < this.config.uptimeThreshold
            }],
            ['high_response_time', {
                threshold: this.config.responseTimeThreshold,
                severity: 'warning',
                cooldown: this.config.alertCooldown / 2,
                condition: (value) => value > this.config.responseTimeThreshold
            }],
            ['balance_discrepancy', {
                threshold: this.config.balanceDiscrepancyThreshold,
                severity: 'critical',
                cooldown: this.config.alertCooldown,
                condition: (value) => value > this.config.balanceDiscrepancyThreshold
            }],
            ['trading_loss_limit', {
                threshold: -0.05, // 5% daily loss
                severity: 'critical',
                cooldown: 60000, // 1 minute
                condition: (value) => value < -0.05
            }]
        ]);

        // Notification channels
        this.notifications = new Map();

        this.initialize();
    }

    async initialize() {
        try {
            this.logger.info('Initializing Production Monitoring Service');
            
            // Initialize Redis for caching and state management
            this.redis = Redis.createClient(this.config.redis);
            await this.redis.connect();
            
            // Initialize notification channels
            await this.initializeNotifications();
            
            // Start monitoring loops
            this.startSystemMonitoring();
            this.startTradingMonitoring();
            this.startBalanceMonitoring();
            this.startPerformanceMonitoring();
            
            // Initialize dashboard data
            await this.initializeDashboard();
            
            this.logger.info('Production Monitoring Service initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Production Monitoring Service:', error);
            throw error;
        }
    }

    async initializeNotifications() {
        try {
            // Discord webhook
            if (this.config.notifications.discord?.webhook) {
                this.notifications.set('discord', new Webhook(this.config.notifications.discord.webhook));
            }
            
            // Email SMTP
            if (this.config.notifications.email) {
                this.notifications.set('email', nodemailer.createTransporter(this.config.notifications.email));
            }
            
            // Slack webhook
            if (this.config.notifications.slack?.webhook) {
                this.notifications.set('slack', {
                    webhook: this.config.notifications.slack.webhook,
                    channel: this.config.notifications.slack.channel || '#alerts'
                });
            }
            
            // PagerDuty integration
            if (this.config.notifications.pagerduty?.routingKey) {
                this.notifications.set('pagerduty', {
                    routingKey: this.config.notifications.pagerduty.routingKey,
                    apiUrl: 'https://events.pagerduty.com/v2/enqueue'
                });
            }
            
            this.logger.info(`Initialized ${this.notifications.size} notification channels`);
        } catch (error) {
            this.logger.error('Failed to initialize notifications:', error);
        }
    }

    startSystemMonitoring() {
        setInterval(async () => {
            try {
                await this.performHealthCheck();
                await this.checkSystemMetrics();
                await this.updateUptimeMetrics();
                await this.checkServiceHealth();
            } catch (error) {
                this.logger.error('System monitoring error:', error);
                Sentry.captureException(error);
            }
        }, this.config.monitoringInterval);
        
        this.logger.info('System monitoring started');
    }

    startTradingMonitoring() {
        setInterval(async () => {
            try {
                await this.calculateTradingMetrics();
                await this.checkTradingLimits();
                await this.updateStrategyPerformance();
                await this.validateTradeReconciliation();
            } catch (error) {
                this.logger.error('Trading monitoring error:', error);
                Sentry.captureException(error);
            }
        }, this.config.monitoringInterval * 2); // Less frequent for trading metrics
        
        this.logger.info('Trading monitoring started');
    }

    startBalanceMonitoring() {
        setInterval(async () => {
            try {
                await this.performBalanceReconciliation();
                await this.checkBalanceDiscrepancies();
                await this.validateExchangeBalances();
                await this.updatePortfolioMetrics();
            } catch (error) {
                this.logger.error('Balance monitoring error:', error);
                Sentry.captureException(error);
            }
        }, this.config.monitoringInterval * 4); // Less frequent for balance checks
        
        this.logger.info('Balance monitoring started');
    }

    startPerformanceMonitoring() {
        setInterval(async () => {
            try {
                await this.collectPerformanceMetrics();
                await this.analyzeTrendData();
                await this.updateDashboard();
                await this.generatePerformanceReport();
            } catch (error) {
                this.logger.error('Performance monitoring error:', error);
                Sentry.captureException(error);
            }
        }, this.config.dashboardRefreshInterval);
        
        this.logger.info('Performance monitoring started');
    }

    async performHealthCheck() {
        const healthCheck = {
            timestamp: new Date().toISOString(),
            overall: 'healthy',
            services: {},
            exchanges: {},
            infrastructure: {},
            alerts: []
        };
        
        try {
            // Check core services
            healthCheck.services = await this.checkCoreServices();
            
            // Check exchange connections
            healthCheck.exchanges = await this.checkExchangeHealth();
            
            // Check infrastructure components
            healthCheck.infrastructure = await this.checkInfrastructure();
            
            // Determine overall health
            const unhealthyServices = Object.values(healthCheck.services)
                .filter(service => service.status !== 'healthy').length;
            const unhealthyExchanges = Object.values(healthCheck.exchanges)
                .filter(exchange => exchange.status !== 'healthy').length;
            const unhealthyInfra = Object.values(healthCheck.infrastructure)
                .filter(component => component.status !== 'healthy').length;
            
            if (unhealthyServices > 0 || unhealthyExchanges > 0 || unhealthyInfra > 0) {
                healthCheck.overall = unhealthyServices > 2 || unhealthyExchanges > 1 ? 'critical' : 'degraded';
            }
            
            this.monitoringState.lastHealthCheck = healthCheck;
            this.monitoringState.systemHealth = healthCheck.overall;
            
            // Update uptime metric
            const uptimePercentage = this.calculateUptimePercentage();
            this.metrics.uptime.set(uptimePercentage);
            
            // Check for alerts
            await this.processHealthAlerts(healthCheck);
            
        } catch (error) {
            this.logger.error('Health check failed:', error);
            healthCheck.overall = 'critical';
            healthCheck.error = error.message;
        }
        
        return healthCheck;
    }

    async checkCoreServices() {
        const services = [
            'api-gateway',
            'trading-engine',
            'risk-management',
            'market-data',
            'order-management',
            'portfolio-service',
            'notification-service'
        ];
        
        const serviceHealth = {};
        
        for (const serviceName of services) {
            try {
                const health = await this.checkServiceEndpoint(serviceName);
                serviceHealth[serviceName] = health;
                
                this.metrics.activeConnections.set(
                    { type: 'service', status: health.status },
                    health.status === 'healthy' ? 1 : 0
                );
                
            } catch (error) {
                serviceHealth[serviceName] = {
                    status: 'unhealthy',
                    error: error.message,
                    lastCheck: new Date().toISOString()
                };
            }
        }
        
        return serviceHealth;
    }

    async calculateTradingMetrics() {
        try {
            const tradingData = await this.getTradingData();
            
            // Calculate daily P&L
            const dailyPnL = this.calculateDailyPnL(tradingData);
            this.monitoringState.trading.dailyPnL = dailyPnL;
            
            // Calculate success rate
            const successRate = this.calculateSuccessRate(tradingData);
            this.monitoringState.trading.successRate = successRate;
            
            // Calculate Sharpe ratio
            const sharpeRatio = this.calculateSharpeRatio(tradingData);
            this.monitoringState.trading.sharpeRatio = sharpeRatio;
            
            // Calculate max drawdown
            const maxDrawdown = this.calculateMaxDrawdown(tradingData);
            this.monitoringState.trading.maxDrawdown = maxDrawdown;
            
            // Update metrics
            this.metrics.tradingPnL.set({ strategy: 'all', exchange: 'all', timeframe: 'daily' }, dailyPnL);
            
            this.logger.info('Trading metrics updated', {
                dailyPnL,
                successRate,
                sharpeRatio,
                maxDrawdown
            });
            
        } catch (error) {
            this.logger.error('Failed to calculate trading metrics:', error);
            throw error;
        }
    }

    async performBalanceReconciliation() {
        try {
            const reconciliation = {
                timestamp: new Date().toISOString(),
                exchanges: {},
                totalDiscrepancy: 0,
                alerts: []
            };
            
            // Get balances from all exchanges
            const exchangeBalances = await this.getExchangeBalances();
            
            // Get internal balance records
            const internalBalances = await this.getInternalBalances();
            
            // Compare and calculate discrepancies
            for (const [exchange, balances] of Object.entries(exchangeBalances)) {
                const internalBalance = internalBalances[exchange] || {};
                const discrepancies = {};
                
                for (const [currency, amount] of Object.entries(balances)) {
                    const internalAmount = internalBalance[currency] || 0;
                    const discrepancy = Math.abs(amount - internalAmount) / Math.max(amount, internalAmount, 1);
                    
                    if (discrepancy > this.config.balanceDiscrepancyThreshold) {
                        discrepancies[currency] = {
                            exchange: amount,
                            internal: internalAmount,
                            discrepancy: discrepancy,
                            severity: discrepancy > 0.05 ? 'critical' : 'warning'
                        };
                        
                        reconciliation.alerts.push({
                            type: 'balance_discrepancy',
                            exchange,
                            currency,
                            discrepancy,
                            severity: discrepancies[currency].severity
                        });
                    }
                    
                    this.metrics.balanceDiscrepancy.set(
                        { exchange, currency },
                        discrepancy * 100
                    );
                }
                
                reconciliation.exchanges[exchange] = {
                    balances,
                    discrepancies,
                    status: Object.keys(discrepancies).length === 0 ? 'reconciled' : 'discrepancy'
                };
            }
            
            // Process alerts
            for (const alert of reconciliation.alerts) {
                await this.triggerAlert('balance_discrepancy', alert);
            }
            
            this.logger.info('Balance reconciliation completed', {
                exchanges: Object.keys(reconciliation.exchanges).length,
                alerts: reconciliation.alerts.length
            });
            
            return reconciliation;
            
        } catch (error) {
            this.logger.error('Balance reconciliation failed:', error);
            throw error;
        }
    }

    async triggerAlert(alertType, alertData) {
        const rule = this.alertRules.get(alertType);
        if (!rule) {
            this.logger.warn(`Unknown alert type: ${alertType}`);
            return;
        }
        
        const alertKey = `${alertType}_${JSON.stringify(alertData)}`;
        const lastAlert = this.monitoringState.alerts.get(alertKey);
        
        // Check cooldown
        if (lastAlert && Date.now() - lastAlert.timestamp < rule.cooldown) {
            return; // Still in cooldown period
        }
        
        // Create alert
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: alertType,
            severity: rule.severity,
            timestamp: Date.now(),
            data: alertData,
            acknowledged: false,
            resolved: false
        };
        
        // Store alert
        this.monitoringState.alerts.set(alertKey, alert);
        
        // Update metrics
        this.metrics.alertsTriggered.inc({
            severity: alert.severity,
            type: alertType,
            service: alertData.service || 'system'
        });
        
        // Send notifications
        await this.sendAlertNotifications(alert);
        
        // Log alert
        this.logger.warn('Alert triggered', alert);
        
        // Send to Sentry for critical alerts
        if (alert.severity === 'critical') {
            Sentry.captureMessage(`Critical alert: ${alertType}`, 'error');
        }
        
        return alert;
    }

    async sendAlertNotifications(alert) {
        const message = this.formatAlertMessage(alert);
        const notifications = [];
        
        // Discord notification
        if (this.notifications.has('discord')) {
            notifications.push(this.sendDiscordAlert(message, alert));
        }
        
        // Email notification
        if (this.notifications.has('email')) {
            notifications.push(this.sendEmailAlert(message, alert));
        }
        
        // Slack notification
        if (this.notifications.has('slack')) {
            notifications.push(this.sendSlackAlert(message, alert));
        }
        
        // PagerDuty for critical alerts
        if (alert.severity === 'critical' && this.notifications.has('pagerduty')) {
            notifications.push(this.sendPagerDutyAlert(message, alert));
        }
        
        try {
            await Promise.allSettled(notifications);
            this.logger.info(`Alert notifications sent for ${alert.id}`);
        } catch (error) {
            this.logger.error('Failed to send alert notifications:', error);
        }
    }

    formatAlertMessage(alert) {
        const timestamp = new Date(alert.timestamp).toISOString();
        const severity = alert.severity.toUpperCase();
        
        let message = `🚨 **${severity} ALERT** 🚨\n\n`;
        message += `**Type:** ${alert.type}\n`;
        message += `**Time:** ${timestamp}\n`;
        message += `**Environment:** ${this.config.environment}\n\n`;
        
        // Add specific alert data
        if (alert.data) {
            message += `**Details:**\n`;
            for (const [key, value] of Object.entries(alert.data)) {
                message += `• ${key}: ${value}\n`;
            }
        }
        
        // Add system status
        message += `\n**System Status:** ${this.monitoringState.systemHealth}`;
        
        return message;
    }

    async generateDashboardData() {
        const dashboardData = {
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.monitoringState.startTime,
            
            system: {
                health: this.monitoringState.systemHealth,
                uptime: this.monitoringState.performance.uptime,
                responseTime: this.monitoringState.performance.avgResponseTime,
                errorRate: this.monitoringState.performance.errorRate,
                throughput: this.monitoringState.performance.throughput
            },
            
            trading: {
                dailyPnL: this.monitoringState.trading.dailyPnL,
                totalPnL: this.monitoringState.trading.totalPnL,
                successRate: this.monitoringState.trading.successRate,
                sharpeRatio: this.monitoringState.trading.sharpeRatio,
                maxDrawdown: this.monitoringState.trading.maxDrawdown
            },
            
            exchanges: Array.from(this.monitoringState.exchanges.entries()).map(([id, data]) => ({
                id,
                status: data.status,
                balance: data.balance,
                orders: data.orders,
                lastUpdate: data.lastUpdate
            })),
            
            alerts: Array.from(this.monitoringState.alerts.values())
                .filter(alert => !alert.resolved)
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 10), // Latest 10 alerts
            
            performance: {
                cpu: await this.getCPUUsage(),
                memory: await this.getMemoryUsage(),
                disk: await this.getDiskUsage(),
                network: await this.getNetworkUsage()
            }
        };
        
        return dashboardData;
    }

    async getMonitoringReport() {
        const report = {
            timestamp: new Date().toISOString(),
            period: '24h',
            summary: {
                uptime: this.calculateUptimePercentage(),
                totalAlerts: this.monitoringState.alerts.size,
                criticalAlerts: Array.from(this.monitoringState.alerts.values())
                    .filter(alert => alert.severity === 'critical').length,
                systemHealth: this.monitoringState.systemHealth,
                tradingPnL: this.monitoringState.trading.dailyPnL
            },
            
            services: await this.getServicesSummary(),
            exchanges: await this.getExchangesSummary(),
            performance: await this.getPerformanceSummary(),
            alerts: await this.getAlertsSummary(),
            
            recommendations: await this.generateRecommendations()
        };
        
        return report;
    }

    calculateUptimePercentage() {
        const totalTime = Date.now() - this.monitoringState.startTime;
        const downtimeEvents = Array.from(this.monitoringState.alerts.values())
            .filter(alert => alert.type === 'low_uptime' || alert.severity === 'critical');
        
        // Simple calculation - would be more sophisticated in production
        const estimatedDowntime = downtimeEvents.length * 60000; // 1 minute per critical event
        const uptime = Math.max(0, (totalTime - estimatedDowntime) / totalTime) * 100;
        
        return Math.min(100, uptime);
    }

    // Additional helper methods would continue here...
    // (CPU/Memory monitoring, notification sending, report generation, etc.)
}

module.exports = ProductionMonitoringService;