/**
 * Chaos Testing Framework for A.A.I.T.I
 * Simulates failures and validates system resilience
 */

const EventEmitter = require('events');
const { logger } = require('../utils/logger');

class ChaosTestingFramework extends EventEmitter {
    constructor() {
        super();
        this.activeTests = new Map();
        this.failureScenarios = new Map();
        this.circuitBreakers = new Map();
        this.fallbackStrategies = new Map();
        this.testResults = [];
        
        this.initializeFailureScenarios();
        this.initializeCircuitBreakers();
        this.initializeFallbackStrategies();
    }

    /**
     * Initialize predefined failure scenarios
     */
    initializeFailureScenarios() {
        // Market data provider failure
        this.failureScenarios.set('market_data_provider_failure', {
            name: 'Market Data Provider Failure',
            description: 'Simulates complete market data provider outage',
            duration: 30000, // 30 seconds
            severity: 'critical',
            affectedServices: ['marketData', 'trading', 'analytics'],
            simulate: async () => {
                logger.warn('🔥 CHAOS TEST: Simulating market data provider failure');
                
                // Simulate network timeout
                const originalFetch = global.fetch;
                global.fetch = () => Promise.reject(new Error('CHAOS: Market data provider unreachable'));
                
                // Restore after duration
                setTimeout(() => {
                    global.fetch = originalFetch;
                    logger.info('🔧 CHAOS TEST: Market data provider restored');
                }, this.failureScenarios.get('market_data_provider_failure').duration);
            }
        });

        // Database connection failure
        this.failureScenarios.set('database_connection_failure', {
            name: 'Database Connection Failure',
            description: 'Simulates database connectivity issues',
            duration: 20000, // 20 seconds
            severity: 'critical',
            affectedServices: ['database', 'trading', 'analytics', 'auth'],
            simulate: async () => {
                logger.warn('🔥 CHAOS TEST: Simulating database connection failure');
                this.emit('database_failure', { type: 'connection_timeout' });
            }
        });

        // High latency simulation
        this.failureScenarios.set('high_latency_simulation', {
            name: 'High Latency Simulation',
            description: 'Simulates network latency spikes',
            duration: 60000, // 1 minute
            severity: 'warning',
            affectedServices: ['network', 'api'],
            simulate: async () => {
                logger.warn('🔥 CHAOS TEST: Simulating high network latency');
                
                // Add artificial delays to requests
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                this.originalDelay = delay;
                this.emit('latency_spike', { delay: 2000 });
            }
        });

        // Memory pressure simulation
        this.failureScenarios.set('memory_pressure_simulation', {
            name: 'Memory Pressure Simulation',
            description: 'Simulates high memory usage conditions',
            duration: 45000, // 45 seconds
            severity: 'warning',
            affectedServices: ['system', 'ml', 'analytics'],
            simulate: async () => {
                logger.warn('🔥 CHAOS TEST: Simulating memory pressure');
                
                // Create memory pressure
                const memoryConsumer = [];
                for (let i = 0; i < 1000; i++) {
                    memoryConsumer.push(new Array(10000).fill('chaos_test_data'));
                }
                
                // Release memory after duration
                setTimeout(() => {
                    memoryConsumer.length = 0;
                    logger.info('🔧 CHAOS TEST: Memory pressure released');
                }, this.failureScenarios.get('memory_pressure_simulation').duration);
            }
        });
    }

    /**
     * Initialize circuit breakers for different services
     */
    initializeCircuitBreakers() {
        this.circuitBreakers.set('market_data', {
            name: 'Market Data Circuit Breaker',
            state: 'closed', // closed, open, half-open
            failureThreshold: 5,
            resetTimeout: 30000,
            failureCount: 0,
            lastFailureTime: null,
            
            recordSuccess: function() {
                this.failureCount = 0;
                if (this.state === 'half-open') {
                    this.state = 'closed';
                    logger.info('🔧 Market Data Circuit Breaker: Closed (recovered)');
                }
            },
            
            recordFailure: function() {
                this.failureCount++;
                this.lastFailureTime = Date.now();
                
                if (this.failureCount >= this.failureThreshold && this.state === 'closed') {
                    this.state = 'open';
                    logger.warn('⚡ Market Data Circuit Breaker: OPEN (too many failures)');
                    
                    // Schedule reset attempt
                    setTimeout(() => {
                        if (this.state === 'open') {
                            this.state = 'half-open';
                            logger.info('🔄 Market Data Circuit Breaker: Half-open (testing)');
                        }
                    }, this.resetTimeout);
                }
            },
            
            canExecute: function() {
                return this.state !== 'open';
            }
        });

        this.circuitBreakers.set('database', {
            name: 'Database Circuit Breaker',
            state: 'closed',
            failureThreshold: 3,
            resetTimeout: 20000,
            failureCount: 0,
            lastFailureTime: null,
            
            recordSuccess: function() {
                this.failureCount = 0;
                if (this.state === 'half-open') {
                    this.state = 'closed';
                    logger.info('🔧 Database Circuit Breaker: Closed (recovered)');
                }
            },
            
            recordFailure: function() {
                this.failureCount++;
                this.lastFailureTime = Date.now();
                
                if (this.failureCount >= this.failureThreshold && this.state === 'closed') {
                    this.state = 'open';
                    logger.warn('⚡ Database Circuit Breaker: OPEN (too many failures)');
                    
                    setTimeout(() => {
                        if (this.state === 'open') {
                            this.state = 'half-open';
                            logger.info('🔄 Database Circuit Breaker: Half-open (testing)');
                        }
                    }, this.resetTimeout);
                }
            },
            
            canExecute: function() {
                return this.state !== 'open';
            }
        });
    }

    /**
     * Initialize fallback strategies
     */
    initializeFallbackStrategies() {
        this.fallbackStrategies.set('market_data_fallback', {
            name: 'Market Data Fallback Strategy',
            description: 'Use cached/historical data when live data unavailable',
            execute: async () => {
                logger.info('🔄 FALLBACK: Using cached market data');
                
                // Simulate using cached data
                const cachedData = {
                    symbol: 'BTC/USD',
                    price: 45000,
                    timestamp: new Date(Date.now() - 60000), // 1 minute old
                    source: 'cache',
                    staleness: '1m'
                };
                
                return cachedData;
            }
        });

        this.fallbackStrategies.set('database_fallback', {
            name: 'Database Fallback Strategy',
            description: 'Use in-memory cache when database unavailable',
            execute: async () => {
                logger.info('🔄 FALLBACK: Using in-memory data cache');
                
                // Simulate using in-memory cache
                return {
                    source: 'memory_cache',
                    data: 'limited_dataset',
                    warning: 'Database unavailable - using cached data'
                };
            }
        });

        this.fallbackStrategies.set('trading_halt_fallback', {
            name: 'Trading Halt Fallback Strategy',
            description: 'Halt trading operations during critical failures',
            execute: async () => {
                logger.warn('🛑 FALLBACK: Trading operations halted due to critical failure');
                
                return {
                    action: 'trading_halted',
                    reason: 'critical_system_failure',
                    timestamp: new Date().toISOString(),
                    message: 'All trading operations suspended until systems recover'
                };
            }
        });
    }

    /**
     * Run a specific chaos test scenario
     */
    async runChaosTest(scenarioId, options = {}) {
        const scenario = this.failureScenarios.get(scenarioId);
        if (!scenario) {
            throw new Error(`Unknown chaos test scenario: ${scenarioId}`);
        }

        const testId = `chaos_${scenarioId}_${Date.now()}`;
        const testStart = Date.now();

        logger.info(`🧪 Starting chaos test: ${scenario.name}`, {
            testId,
            duration: scenario.duration,
            severity: scenario.severity,
            affectedServices: scenario.affectedServices
        });

        this.activeTests.set(testId, {
            scenarioId,
            scenario,
            startTime: testStart,
            status: 'running',
            metrics: {
                failuresDetected: 0,
                circuitBreakersTriggered: 0,
                fallbacksActivated: 0,
                recoveryTime: null
            }
        });

        try {
            // Execute the failure simulation
            await scenario.simulate();

            // Monitor system behavior during chaos
            const monitoringInterval = setInterval(() => {
                this.monitorSystemBehavior(testId);
            }, 1000);

            // Wait for test duration
            await new Promise(resolve => setTimeout(resolve, scenario.duration));

            clearInterval(monitoringInterval);

            // Complete the test
            const testEnd = Date.now();
            const test = this.activeTests.get(testId);
            test.status = 'completed';
            test.endTime = testEnd;
            test.totalDuration = testEnd - testStart;

            this.testResults.push({
                ...test,
                result: 'success',
                message: 'Chaos test completed successfully'
            });

            logger.info(`✅ Chaos test completed: ${scenario.name}`, {
                testId,
                duration: test.totalDuration,
                metrics: test.metrics
            });

            return {
                testId,
                status: 'completed',
                result: 'success',
                duration: test.totalDuration,
                metrics: test.metrics
            };

        } catch (error) {
            const test = this.activeTests.get(testId);
            test.status = 'failed';
            test.error = error.message;

            this.testResults.push({
                ...test,
                result: 'failed',
                error: error.message
            });

            logger.error(`❌ Chaos test failed: ${scenario.name}`, {
                testId,
                error: error.message
            });

            throw error;
        } finally {
            this.activeTests.delete(testId);
        }
    }

    /**
     * Monitor system behavior during chaos tests
     */
    monitorSystemBehavior(testId) {
        const test = this.activeTests.get(testId);
        if (!test) return;

        // Check circuit breaker states
        for (const [name, breaker] of this.circuitBreakers) {
            if (breaker.state === 'open') {
                test.metrics.circuitBreakersTriggered++;
                logger.info(`🔌 Circuit breaker activated: ${name}`);
            }
        }

        // Simulate monitoring system health
        const memoryUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

        // Check if fallbacks should be activated
        if (heapUsedMB > 500) { // If memory usage > 500MB
            test.metrics.fallbacksActivated++;
            logger.warn(`🔄 High memory usage detected: ${heapUsedMB}MB`);
        }
    }

    /**
     * Validate graceful degradation
     */
    async validateGracefulDegradation() {
        logger.info('🔍 Validating graceful degradation capabilities...');

        const degradationTests = [
            {
                name: 'Market Data Degradation',
                test: async () => {
                    const breaker = this.circuitBreakers.get('market_data');
                    if (!breaker.canExecute()) {
                        const fallback = this.fallbackStrategies.get('market_data_fallback');
                        const result = await fallback.execute();
                        return { graceful: true, strategy: 'cached_data', result };
                    }
                    return { graceful: false, reason: 'No fallback activated' };
                }
            },
            {
                name: 'Database Degradation',
                test: async () => {
                    const breaker = this.circuitBreakers.get('database');
                    if (!breaker.canExecute()) {
                        const fallback = this.fallbackStrategies.get('database_fallback');
                        const result = await fallback.execute();
                        return { graceful: true, strategy: 'memory_cache', result };
                    }
                    return { graceful: false, reason: 'No fallback activated' };
                }
            }
        ];

        const results = [];
        for (const degradationTest of degradationTests) {
            try {
                const result = await degradationTest.test();
                results.push({
                    name: degradationTest.name,
                    ...result,
                    status: 'completed'
                });
                logger.info(`✅ Degradation test passed: ${degradationTest.name}`);
            } catch (error) {
                results.push({
                    name: degradationTest.name,
                    graceful: false,
                    error: error.message,
                    status: 'failed'
                });
                logger.error(`❌ Degradation test failed: ${degradationTest.name}`, error);
            }
        }

        return results;
    }

    /**
     * Get chaos testing status and results
     */
    getStatus() {
        return {
            activeTests: Array.from(this.activeTests.entries()).map(([id, test]) => ({
                id,
                scenario: test.scenario.name,
                status: test.status,
                startTime: test.startTime,
                metrics: test.metrics
            })),
            totalTestsRun: this.testResults.length,
            successfulTests: this.testResults.filter(t => t.result === 'success').length,
            failedTests: this.testResults.filter(t => t.result === 'failed').length,
            circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
                name: breaker.name,
                state: breaker.state,
                failureCount: breaker.failureCount,
                canExecute: breaker.canExecute()
            })),
            availableScenarios: Array.from(this.failureScenarios.keys())
        };
    }

    /**
     * Get test results summary
     */
    getTestResults() {
        return {
            totalTests: this.testResults.length,
            successful: this.testResults.filter(t => t.result === 'success').length,
            failed: this.testResults.filter(t => t.result === 'failed').length,
            averageDuration: this.testResults.reduce((sum, t) => sum + (t.totalDuration || 0), 0) / this.testResults.length || 0,
            results: this.testResults.map(test => ({
                scenarioName: test.scenario.name,
                result: test.result,
                duration: test.totalDuration,
                metrics: test.metrics,
                timestamp: new Date(test.startTime).toISOString()
            }))
        };
    }

    /**
     * Reset all circuit breakers
     */
    resetCircuitBreakers() {
        for (const [name, breaker] of this.circuitBreakers) {
            breaker.state = 'closed';
            breaker.failureCount = 0;
            breaker.lastFailureTime = null;
            logger.info(`🔧 Circuit breaker reset: ${name}`);
        }
    }

    /**
     * Clear test results
     */
    clearTestResults() {
        this.testResults = [];
        logger.info('🧹 Chaos test results cleared');
    }
}

// Singleton instance
let chaosFramework = null;

function getChaosTestingFramework() {
    if (!chaosFramework) {
        chaosFramework = new ChaosTestingFramework();
    }
    return chaosFramework;
}

module.exports = {
    ChaosTestingFramework,
    getChaosTestingFramework
};