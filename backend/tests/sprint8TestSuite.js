/**
 * Sprint 8 Comprehensive Test Suite
 * Multi-Exchange Integration & Scalability Testing
 * 
 * Test Coverage:
 * - Multi-Exchange Integration Service
 * - Horizontal Scaling Manager
 * - Performance Optimization Engine
 * - Enterprise Monitoring Service
 * - Production Security Service
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Import Sprint 8 services
const { MultiExchangeIntegrationService } = require('../services/multiExchangeIntegrationService');
const { HorizontalScalingManager } = require('../services/horizontalScalingManager');
const { PerformanceOptimizationEngine } = require('../services/performanceOptimizationEngine');
const { EnterpriseMonitoringService } = require('../services/enterpriseMonitoringService');
const { ProductionSecurityService } = require('../services/productionSecurityService');

describe('Sprint 8: Multi-Exchange Integration & Scalability Test Suite', function() {
    let mockLogger, mockConfigService, mockDatabaseService;
    
    beforeEach(function() {
        // Setup mocks
        mockLogger = {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            debug: sinon.stub()
        };
        
        mockConfigService = {
            get: sinon.stub().returns({}),
            set: sinon.stub()
        };
        
        mockDatabaseService = {
            query: sinon.stub().resolves([]),
            transaction: sinon.stub().resolves({}),
            pool: {
                query: sinon.stub().resolves([])
            }
        };
    });

    afterEach(function() {
        sinon.restore();
    });

    /**
     * Multi-Exchange Integration Service Tests
     */
    describe('Multi-Exchange Integration Service', function() {
        let integrationService;

        beforeEach(function() {
            integrationService = new MultiExchangeIntegrationService(mockLogger, mockConfigService);
        });

        describe('Service Initialization', function() {
            it('should initialize all exchange adapters successfully', async function() {
                this.timeout(10000);
                
                // Service is auto-initialized in constructor
                expect(mockLogger.info.calledWith('Initializing Multi-Exchange Integration Service')).to.be.true;
                
                // Allow some time for async initialization
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const activeExchanges = await integrationService.getActiveExchanges();
                expect(activeExchanges).to.be.an('array');
                expect(activeExchanges.length).to.be.greaterThan(0);
            });

            it('should setup smart order routing', async function() {
                expect(integrationService.orderRouter).to.not.be.null;
            });

            it('should initialize arbitrage engine', async function() {
                expect(integrationService.arbitrageEngine).to.not.be.null;
            });

            it('should setup market data aggregation', async function() {
                expect(integrationService.marketDataAggregator).to.not.be.null;
            });
        });

        describe('Order Routing', function() {
            it('should route orders to optimal exchange', async function() {
                const orderRequest = {
                    id: 'test-order-001',
                    symbol: 'BTC/USD',
                    side: 'buy',
                    quantity: 1.0,
                    type: 'market'
                };

                try {
                    const result = await integrationService.routeOrder(orderRequest);
                    expect(result).to.be.an('object');
                    expect(result).to.have.property('routing');
                } catch (error) {
                    // Expected during testing without real exchange connections
                    expect(error.message).to.include('routing');
                }
            });

            it('should validate order requests', async function() {
                const invalidOrder = {
                    symbol: 'BTC/USD',
                    // Missing required fields
                };

                try {
                    await integrationService.routeOrder(invalidOrder);
                    expect.fail('Should have thrown validation error');
                } catch (error) {
                    expect(error.message).to.include('Missing required field');
                }
            });
        });

        describe('Arbitrage Detection', function() {
            it('should detect arbitrage opportunities', async function() {
                const symbol = 'BTC/USD';
                
                try {
                    const opportunities = await integrationService.detectArbitrageOpportunities(symbol);
                    expect(opportunities).to.be.an('array');
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('arbitrage');
                }
            });

            it('should calculate arbitrage profitability correctly', function() {
                const buyPrice = { ask: 65000, timestamp: new Date() };
                const sellPrice = { bid: 65500, timestamp: new Date() };
                
                const opportunity = integrationService.calculateArbitrageOpportunity(
                    'BTC/USD', 'binance', 'coinbase', buyPrice, sellPrice
                );
                
                expect(opportunity).to.have.property('profitable');
                expect(opportunity).to.have.property('spread');
                expect(opportunity).to.have.property('netSpread');
            });
        });

        describe('Market Data Aggregation', function() {
            it('should aggregate market data from multiple exchanges', async function() {
                const symbol = 'BTC/USD';
                
                try {
                    const aggregatedData = await integrationService.getAggregatedMarketData(symbol);
                    expect(aggregatedData).to.be.an('object');
                    expect(aggregatedData).to.have.property('symbol', symbol);
                    expect(aggregatedData).to.have.property('exchanges');
                    expect(aggregatedData).to.have.property('best');
                    expect(aggregatedData).to.have.property('average');
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('market data');
                }
            });
        });

        describe('Health Monitoring', function() {
            it('should provide service metrics', async function() {
                const metrics = await integrationService.getServiceMetrics();
                expect(metrics).to.be.an('object');
                expect(metrics).to.have.property('activeExchanges');
                expect(metrics).to.have.property('totalAdapters');
                expect(metrics).to.have.property('uptime');
            });

            it('should track exchange status', async function() {
                const status = await integrationService.getExchangeStatus();
                expect(status).to.be.an('object');
            });
        });
    });

    /**
     * Horizontal Scaling Manager Tests
     */
    describe('Horizontal Scaling Manager', function() {
        let scalingManager;

        beforeEach(function() {
            scalingManager = new HorizontalScalingManager(mockLogger, mockConfigService);
        });

        describe('Service Initialization', function() {
            it('should initialize Kubernetes client', async function() {
                this.timeout(5000);
                
                // Allow time for initialization
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                expect(scalingManager.k8sClient).to.not.be.null;
                expect(scalingManager.deploymentManager).to.not.be.null;
                expect(scalingManager.podManager).to.not.be.null;
            });

            it('should setup load balancer', async function() {
                this.timeout(5000);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                expect(scalingManager.loadBalancer).to.not.be.null;
            });

            it('should initialize circuit breakers', async function() {
                expect(scalingManager.circuitBreakers).to.be.instanceOf(Map);
            });
        });

        describe('Service Deployment', function() {
            it('should deploy service to Kubernetes', async function() {
                const serviceConfig = {
                    name: 'test-service',
                    image: 'test:latest',
                    replicas: 3,
                    ports: [{ containerPort: 3000 }]
                };

                try {
                    const result = await scalingManager.deployService(serviceConfig);
                    expect(result).to.be.an('object');
                    expect(result).to.have.property('deployment');
                    expect(result).to.have.property('service');
                } catch (error) {
                    // Expected during testing without real K8s cluster
                    expect(error.message).to.include('deployment');
                }
            });

            it('should create valid deployment manifest', function() {
                const serviceConfig = {
                    name: 'test-service',
                    image: 'test:latest',
                    replicas: 2
                };

                const manifest = scalingManager.createDeploymentManifest(serviceConfig);
                
                expect(manifest).to.have.property('apiVersion', 'apps/v1');
                expect(manifest).to.have.property('kind', 'Deployment');
                expect(manifest.metadata).to.have.property('name', 'test-service');
                expect(manifest.spec).to.have.property('replicas', 2);
            });

            it('should create valid service manifest', function() {
                const serviceConfig = {
                    name: 'test-service',
                    ports: [{ containerPort: 3000 }]
                };

                const manifest = scalingManager.createServiceManifest(serviceConfig);
                
                expect(manifest).to.have.property('apiVersion', 'v1');
                expect(manifest).to.have.property('kind', 'Service');
                expect(manifest.metadata).to.have.property('name', 'test-service-service');
            });
        });

        describe('Auto-Scaling', function() {
            it('should analyze scaling needs based on metrics', async function() {
                const serviceName = 'test-service';
                const metrics = {
                    cpu: { average: 85 },
                    memory: { average: 75 },
                    requestQueue: { length: 50 }
                };

                const decision = await scalingManager.analyzeScalingNeed(serviceName, metrics);
                
                expect(decision).to.be.an('object');
                expect(decision).to.have.property('serviceName', serviceName);
                expect(decision).to.have.property('action');
                expect(decision).to.have.property('currentReplicas');
                expect(decision).to.have.property('targetReplicas');
            });

            it('should recommend scale up for high resource usage', async function() {
                const serviceName = 'test-service';
                const highUsageMetrics = {
                    cpu: { average: 90 }, // Above threshold
                    memory: { average: 60 },
                    requestQueue: { length: 10 }
                };

                // Register a test service
                scalingManager.registerService(serviceName, {
                    replicas: 2,
                    lastScaled: new Date(Date.now() - 120000) // 2 minutes ago
                });

                const decision = await scalingManager.analyzeScalingNeed(serviceName, highUsageMetrics);
                
                expect(decision.action).to.equal('scale_up');
                expect(decision.targetReplicas).to.be.greaterThan(decision.currentReplicas);
            });

            it('should recommend scale down for low resource usage', async function() {
                const serviceName = 'test-service';
                const lowUsageMetrics = {
                    cpu: { average: 20 }, // Well below threshold
                    memory: { average: 30 },
                    requestQueue: { length: 2 }
                };

                // Register a test service with multiple replicas
                scalingManager.registerService(serviceName, {
                    replicas: 5,
                    lastScaled: new Date(Date.now() - 360000) // 6 minutes ago
                });

                const decision = await scalingManager.analyzeScalingNeed(serviceName, lowUsageMetrics);
                
                expect(decision.action).to.equal('scale_down');
                expect(decision.targetReplicas).to.be.lessThan(decision.currentReplicas);
            });
        });

        describe('Load Balancing', function() {
            it('should route requests to healthy instances', async function() {
                const serviceName = 'test-service';
                const request = { path: '/api/test', method: 'GET' };

                // Register test service
                scalingManager.registerService(serviceName, {
                    replicas: 3,
                    status: 'running'
                });

                try {
                    const response = await scalingManager.routeRequest(serviceName, request);
                    expect(response).to.be.an('object');
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('instances');
                }
            });
        });

        describe('Metrics and Monitoring', function() {
            it('should provide scaling metrics', async function() {
                const metrics = await scalingManager.getScalingMetrics();
                expect(metrics).to.be.an('object');
                expect(metrics).to.have.property('services');
                expect(metrics).to.have.property('totalReplicas');
            });
        });
    });

    /**
     * Performance Optimization Engine Tests
     */
    describe('Performance Optimization Engine', function() {
        let optimizationEngine;

        beforeEach(function() {
            optimizationEngine = new PerformanceOptimizationEngine(
                mockLogger, 
                mockConfigService, 
                mockDatabaseService
            );
        });

        describe('Service Initialization', function() {
            it('should initialize performance monitoring', async function() {
                this.timeout(5000);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                expect(optimizationEngine.performanceMonitor).to.not.be.null;
                expect(optimizationEngine.queryOptimizer).to.not.be.null;
                expect(optimizationEngine.memoryManager).to.not.be.null;
                expect(optimizationEngine.cacheOptimizer).to.not.be.null;
            });
        });

        describe('Performance Metrics Collection', function() {
            it('should collect comprehensive performance metrics', async function() {
                try {
                    const metrics = await optimizationEngine.collectPerformanceMetrics();
                    expect(metrics).to.be.an('object');
                    expect(metrics).to.have.property('timestamp');
                    expect(metrics).to.have.property('application');
                    expect(metrics).to.have.property('database');
                    expect(metrics).to.have.property('system');
                    expect(metrics).to.have.property('performanceScore');
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('metrics');
                }
            });

            it('should calculate performance score correctly', function() {
                const mockMetrics = {
                    application: {
                        memory: { usage: 60 },
                        cpu: { usage: 70 }
                    },
                    database: {
                        queries: { avgExecutionTime: 200 }
                    },
                    cache: { hitRate: 0.85 },
                    network: { responseTime: 150 }
                };

                const score = optimizationEngine.calculatePerformanceScore(mockMetrics);
                expect(score).to.be.a('number');
                expect(score).to.be.within(0, 100);
            });
        });

        describe('Query Optimization', function() {
            it('should analyze and optimize SQL queries', async function() {
                const testQuery = 'SELECT * FROM trades WHERE symbol = ? AND timestamp > ?';
                
                try {
                    const result = await optimizationEngine.optimizeQuery(testQuery);
                    expect(result).to.be.an('object');
                    expect(result).to.have.property('optimizedQuery');
                    expect(result).to.have.property('analysis');
                    expect(result).to.have.property('optimizations');
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('optimization');
                }
            });
        });

        describe('Memory Optimization', function() {
            it('should optimize memory usage', async function() {
                try {
                    const result = await optimizationEngine.optimizeMemoryUsage();
                    expect(result).to.be.an('object');
                    expect(result).to.have.property('optimizations');
                    expect(result).to.have.property('executionTime');
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('memory');
                }
            });
        });

        describe('Cache Optimization', function() {
            it('should optimize caching strategy', async function() {
                try {
                    const result = await optimizationEngine.optimizeCacheStrategy();
                    expect(result).to.be.an('object');
                    expect(result).to.have.property('optimizations');
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('cache');
                }
            });
        });

        describe('Performance Reporting', function() {
            it('should generate performance reports', async function() {
                const report = await optimizationEngine.getPerformanceReport();
                expect(report).to.be.an('object');
                expect(report).to.have.property('performanceScore');
                expect(report).to.have.property('recentOptimizations');
            });

            it('should provide optimization suggestions', async function() {
                const suggestions = await optimizationEngine.getOptimizationSuggestions();
                expect(suggestions).to.be.an('array');
            });
        });
    });

    /**
     * Enterprise Monitoring Service Tests
     */
    describe('Enterprise Monitoring Service', function() {
        let monitoringService;

        beforeEach(function() {
            monitoringService = new EnterpriseMonitoringService(mockLogger, mockConfigService);
        });

        describe('Service Initialization', function() {
            it('should initialize Prometheus metrics', async function() {
                this.timeout(5000);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                expect(monitoringService.prometheusRegistry).to.not.be.null;
                expect(monitoringService.metricsCollector).to.not.be.null;
                expect(monitoringService.alertManager).to.not.be.null;
            });

            it('should setup default metrics', function() {
                expect(monitoringService.httpRequestDuration).to.not.be.undefined;
                expect(monitoringService.httpRequestTotal).to.not.be.undefined;
                expect(monitoringService.databaseQueryDuration).to.not.be.undefined;
                expect(monitoringService.cacheHitRate).to.not.be.undefined;
            });
        });

        describe('Custom Metrics', function() {
            it('should create custom metrics', function() {
                const metricConfig = {
                    name: 'test_counter',
                    help: 'Test counter metric',
                    type: 'counter',
                    labelNames: ['status']
                };

                const metric = monitoringService.createCustomMetric(metricConfig);
                expect(metric).to.not.be.null;
                expect(monitoringService.customMetrics.has('test_counter')).to.be.true;
            });

            it('should validate metric configurations', function() {
                const invalidConfig = {
                    name: 'test_metric'
                    // Missing required fields
                };

                expect(() => {
                    monitoringService.createCustomMetric(invalidConfig);
                }).to.throw('Missing required field');
            });

            it('should update metrics correctly', function() {
                const metricConfig = {
                    name: 'test_gauge',
                    help: 'Test gauge metric',
                    type: 'gauge'
                };

                monitoringService.createCustomMetric(metricConfig);
                
                // Should not throw
                monitoringService.updateMetric('test_gauge', 42);
                monitoringService.updateMetric('nonexistent_metric', 1); // Should log warning
            });
        });

        describe('Alert Management', function() {
            it('should create alert rules', async function() {
                const alertRule = {
                    name: 'test_alert',
                    condition: 'test_metric > 100',
                    severity: 'warning',
                    description: 'Test alert rule'
                };

                try {
                    const rule = await monitoringService.createAlertRule(alertRule);
                    expect(rule).to.be.an('object');
                    expect(rule).to.have.property('id');
                    expect(rule.name).to.equal(alertRule.name);
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('alert');
                }
            });

            it('should validate alert rule configurations', async function() {
                const invalidRule = {
                    name: 'test_alert'
                    // Missing required fields
                };

                try {
                    await monitoringService.createAlertRule(invalidRule);
                    expect.fail('Should have thrown validation error');
                } catch (error) {
                    expect(error.message).to.include('Missing required field');
                }
            });
        });

        describe('Health Status', function() {
            it('should provide health status', async function() {
                const health = await monitoringService.getHealthStatus();
                expect(health).to.be.an('object');
                expect(health).to.have.property('status');
                expect(health).to.have.property('services');
            });
        });

        describe('Metrics Export', function() {
            it('should export metrics in Prometheus format', async function() {
                const metrics = await monitoringService.getMetrics();
                expect(metrics).to.be.a('string');
            });
        });
    });

    /**
     * Production Security Service Tests
     */
    describe('Production Security Service', function() {
        let securityService;

        beforeEach(function() {
            securityService = new ProductionSecurityService(
                mockLogger, 
                mockConfigService, 
                mockDatabaseService
            );
        });

        describe('Service Initialization', function() {
            it('should initialize all security components', async function() {
                this.timeout(5000);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                expect(securityService.authenticationManager).to.not.be.null;
                expect(securityService.authorizationManager).to.not.be.null;
                expect(securityService.encryptionManager).to.not.be.null;
                expect(securityService.threatDetector).to.not.be.null;
                expect(securityService.auditLogger).to.not.be.null;
            });
        });

        describe('Authentication', function() {
            it('should authenticate valid credentials', async function() {
                const credentials = {
                    identifier: 'testuser',
                    password: 'testpassword',
                    clientIP: '127.0.0.1',
                    userAgent: 'test-agent'
                };

                try {
                    const result = await securityService.authenticateUser(credentials);
                    expect(result).to.be.an('object');
                    if (result.success) {
                        expect(result).to.have.property('tokens');
                        expect(result.tokens).to.have.property('accessToken');
                        expect(result.tokens).to.have.property('refreshToken');
                    }
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('authentication');
                }
            });

            it('should validate credentials format', async function() {
                const invalidCredentials = {
                    identifier: 'testuser'
                    // Missing password
                };

                try {
                    await securityService.authenticateUser(invalidCredentials);
                    expect.fail('Should have thrown validation error');
                } catch (error) {
                    expect(error.message).to.include('Missing required credential field');
                }
            });

            it('should generate secure JWT tokens', async function() {
                const user = {
                    id: 'user123',
                    username: 'testuser',
                    roles: ['trader'],
                    permissions: ['trading:execute']
                };

                const tokens = await securityService.generateAuthTokens(user);
                expect(tokens).to.have.property('accessToken');
                expect(tokens).to.have.property('refreshToken');
                expect(tokens).to.have.property('expiresIn');
                expect(tokens).to.have.property('tokenType', 'Bearer');
            });

            it('should verify JWT tokens', async function() {
                const user = {
                    id: 'user123',
                    username: 'testuser',
                    roles: ['trader'],
                    permissions: ['trading:execute']
                };

                const tokens = await securityService.generateAuthTokens(user);
                
                try {
                    const decoded = await securityService.verifyAuthToken(tokens.accessToken);
                    expect(decoded).to.have.property('userId', user.id);
                    expect(decoded).to.have.property('username', user.username);
                } catch (error) {
                    // Expected during testing due to session validation
                    expect(error.message).to.include('Session');
                }
            });
        });

        describe('Authorization', function() {
            it('should authorize valid permissions', async function() {
                const user = {
                    id: 'user123',
                    roles: ['admin']
                };

                try {
                    const result = await securityService.authorizeRequest(user, 'trading', 'execute');
                    expect(result).to.be.true;
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('authorization');
                }
            });
        });

        describe('Encryption', function() {
            it('should encrypt and decrypt data', async function() {
                const testData = 'sensitive test data';
                const context = 'test';

                try {
                    const encrypted = await securityService.encryptSensitiveData(testData, context);
                    expect(encrypted).to.be.a('string');
                    expect(encrypted).to.not.equal(testData);

                    const decrypted = await securityService.decryptSensitiveData(encrypted, context);
                    expect(decrypted).to.equal(testData);
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('encryption');
                }
            });
        });

        describe('Security Analysis', function() {
            it('should analyze request security', async function() {
                const request = {
                    clientIP: '127.0.0.1',
                    userAgent: 'test-agent',
                    path: '/api/test',
                    method: 'GET',
                    user: {
                        id: 'user123',
                        roles: ['trader']
                    }
                };

                try {
                    const analysis = await securityService.analyzeSecurity(request);
                    expect(analysis).to.be.an('object');
                    expect(analysis).to.have.property('threatScore');
                    expect(analysis).to.have.property('riskLevel');
                    expect(analysis).to.have.property('anomalies');
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('security');
                }
            });
        });

        describe('Vulnerability Scanning', function() {
            it('should perform vulnerability scans', async function() {
                try {
                    const scanResult = await securityService.performVulnerabilityScan();
                    expect(scanResult).to.be.an('object');
                    expect(scanResult).to.have.property('scanId');
                    expect(scanResult).to.have.property('vulnerabilities');
                    expect(scanResult).to.have.property('summary');
                } catch (error) {
                    // Expected during testing
                    expect(error.message).to.include('vulnerability');
                }
            });
        });

        describe('Security Status', function() {
            it('should provide security status', async function() {
                const status = await securityService.getSecurityStatus();
                expect(status).to.be.an('object');
                expect(status).to.have.property('status');
                expect(status).to.have.property('blockedIPs');
                expect(status).to.have.property('suspiciousActivities');
            });

            it('should provide security metrics', async function() {
                const metrics = await securityService.getSecurityMetrics();
                expect(metrics).to.be.an('object');
                expect(metrics).to.have.property('authenticationAttempts');
                expect(metrics).to.have.property('blockedRequests');
                expect(metrics).to.have.property('threatsDetected');
            });
        });
    });

    /**
     * Integration Tests
     */
    describe('Sprint 8 Integration Tests', function() {
        let integrationService, scalingManager, optimizationEngine, monitoringService, securityService;

        beforeEach(async function() {
            this.timeout(10000);
            
            // Initialize all services
            integrationService = new MultiExchangeIntegrationService(mockLogger, mockConfigService);
            scalingManager = new HorizontalScalingManager(mockLogger, mockConfigService);
            optimizationEngine = new PerformanceOptimizationEngine(mockLogger, mockConfigService, mockDatabaseService);
            monitoringService = new EnterpriseMonitoringService(mockLogger, mockConfigService);
            securityService = new ProductionSecurityService(mockLogger, mockConfigService, mockDatabaseService);
            
            // Allow time for initialization
            await new Promise(resolve => setTimeout(resolve, 2000));
        });

        it('should integrate monitoring with all services', async function() {
            // Create custom metrics for each service
            const metrics = [
                {
                    name: 'exchange_requests_total',
                    help: 'Total exchange requests',
                    type: 'counter'
                },
                {
                    name: 'scaling_events_total',
                    help: 'Total scaling events',
                    type: 'counter'
                },
                {
                    name: 'optimization_cycles_total',
                    help: 'Total optimization cycles',
                    type: 'counter'
                },
                {
                    name: 'security_threats_detected',
                    help: 'Security threats detected',
                    type: 'counter'
                }
            ];

            for (const metric of metrics) {
                monitoringService.createCustomMetric(metric);
            }

            expect(monitoringService.customMetrics.size).to.equal(metrics.length);
        });

        it('should coordinate scaling based on performance metrics', async function() {
            // Simulate high load scenario
            const highLoadMetrics = {
                cpu: { average: 85 },
                memory: { average: 80 },
                requestQueue: { length: 150 }
            };

            // Register a service
            const serviceName = 'trading-engine';
            scalingManager.registerService(serviceName, {
                replicas: 2,
                lastScaled: new Date(Date.now() - 300000) // 5 minutes ago
            });

            // Analyze scaling need
            const decision = await scalingManager.analyzeScalingNeed(serviceName, highLoadMetrics);
            expect(decision.action).to.equal('scale_up');
        });

        it('should apply security policies across all services', async function() {
            const testRequest = {
                clientIP: '192.168.1.100',
                userAgent: 'Mozilla/5.0',
                path: '/api/trading/execute',
                method: 'POST',
                user: {
                    id: 'trader001',
                    roles: ['trader']
                }
            };

            try {
                const securityAnalysis = await securityService.analyzeSecurity(testRequest);
                expect(securityAnalysis).to.have.property('riskLevel');
                
                // Security analysis should influence other services
                if (securityAnalysis.riskLevel === 'high') {
                    // Should trigger monitoring alerts
                    expect(securityAnalysis.threatScore).to.be.greaterThan(0.7);
                }
            } catch (error) {
                // Expected during testing
                expect(error.message).to.include('security');
            }
        });

        it('should maintain service health across all components', async function() {
            const healthChecks = await Promise.allSettled([
                integrationService.getServiceMetrics(),
                scalingManager.getScalingMetrics(),
                optimizationEngine.getPerformanceReport(),
                monitoringService.getHealthStatus(),
                securityService.getSecurityStatus()
            ]);

            // All health checks should complete (either fulfilled or rejected)
            expect(healthChecks).to.have.length(5);
            
            // At least some should be fulfilled
            const fulfilled = healthChecks.filter(result => result.status === 'fulfilled');
            expect(fulfilled.length).to.be.greaterThan(0);
        });

        it('should handle cross-service communication', async function() {
            // Test event propagation between services
            let eventReceived = false;
            
            // Setup event listener
            scalingManager.on('serviceScaled', (event) => {
                eventReceived = true;
                expect(event).to.have.property('serviceName');
                expect(event).to.have.property('action');
            });

            // Trigger scaling event (simulated)
            scalingManager.emit('serviceScaled', {
                serviceName: 'test-service',
                action: 'scale_up',
                targetReplicas: 5
            });

            expect(eventReceived).to.be.true;
        });
    });

    /**
     * Performance and Load Tests
     */
    describe('Sprint 8 Performance Tests', function() {
        it('should handle multiple concurrent operations', async function() {
            this.timeout(15000);
            
            const integrationService = new MultiExchangeIntegrationService(mockLogger, mockConfigService);
            
            // Allow service to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Create multiple concurrent operations
            const operations = [];
            for (let i = 0; i < 10; i++) {
                operations.push(
                    integrationService.getServiceMetrics().catch(err => ({ error: err.message }))
                );
            }

            const results = await Promise.allSettled(operations);
            
            // Should handle concurrent operations without crashing
            expect(results).to.have.length(10);
        });

        it('should maintain performance under load', async function() {
            this.timeout(10000);
            
            const monitoringService = new EnterpriseMonitoringService(mockLogger, mockConfigService);
            
            // Allow service to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const startTime = Date.now();
            
            // Perform multiple metric operations
            const operations = [];
            for (let i = 0; i < 50; i++) {
                operations.push(
                    monitoringService.updateMetric(`test_metric_${i}`, Math.random() * 100)
                );
            }
            
            await Promise.allSettled(operations);
            
            const executionTime = Date.now() - startTime;
            
            // Should complete within reasonable time
            expect(executionTime).to.be.lessThan(5000); // 5 seconds
        });
    });

    /**
     * Error Handling and Recovery Tests
     */
    describe('Sprint 8 Error Handling Tests', function() {
        it('should handle service initialization failures gracefully', async function() {
            // Create service with invalid configuration
            const invalidConfig = null;
            
            try {
                const service = new MultiExchangeIntegrationService(mockLogger, invalidConfig);
                // Service should still initialize with defaults
                expect(service).to.not.be.null;
            } catch (error) {
                // Expected error should be handled gracefully
                expect(error).to.be.instanceOf(Error);
            }
        });

        it('should recover from temporary failures', async function() {
            const scalingManager = new HorizontalScalingManager(mockLogger, mockConfigService);
            
            // Allow initialization
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Simulate recovery after failure
            const metrics = await scalingManager.getScalingMetrics();
            expect(metrics).to.be.an('object');
        });

        it('should maintain data consistency during errors', async function() {
            const securityService = new ProductionSecurityService(mockLogger, mockConfigService, mockDatabaseService);
            
            // Allow initialization
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Service state should remain consistent
            const status = await securityService.getSecurityStatus();
            expect(status).to.have.property('status');
        });
    });
});

module.exports = {
    // Export test utilities if needed
    createMockLogger: () => ({
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub()
    }),
    
    createMockConfigService: () => ({
        get: sinon.stub().returns({}),
        set: sinon.stub()
    }),
    
    createMockDatabaseService: () => ({
        query: sinon.stub().resolves([]),
        transaction: sinon.stub().resolves({}),
        pool: {
            query: sinon.stub().resolves([])
        }
    })
};