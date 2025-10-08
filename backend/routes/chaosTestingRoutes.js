/**
 * Chaos Testing API Routes
 * Endpoints for running chaos tests and validating system resilience
 */

const express = require('express');
const { getChaosTestingFramework } = require('../services/chaosTestingService');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/chaos/status
 * Get current chaos testing status
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const chaos = getChaosTestingFramework();
        const status = chaos.getStatus();
        
        res.json({
            status: 'success',
            data: status,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Chaos testing status retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve chaos testing status', details: error.message });
    }
});

/**
 * GET /api/chaos/scenarios
 * Get available chaos test scenarios
 */
router.get('/scenarios', authenticateToken, async (req, res) => {
    try {
        const chaos = getChaosTestingFramework();
        const scenarios = Array.from(chaos.failureScenarios.entries()).map(([id, scenario]) => ({
            id,
            name: scenario.name,
            description: scenario.description,
            duration: scenario.duration,
            severity: scenario.severity,
            affectedServices: scenario.affectedServices
        }));
        
        res.json({
            status: 'success',
            data: {
                scenarios,
                totalScenarios: scenarios.length
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Chaos scenarios retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve chaos scenarios', details: error.message });
    }
});

/**
 * POST /api/chaos/test/:scenarioId
 * Run a specific chaos test scenario
 */
router.post('/test/:scenarioId', authenticateToken, async (req, res) => {
    try {
        const { scenarioId } = req.params;
        const options = req.body || {};
        
        const chaos = getChaosTestingFramework();
        
        logger.info(`🧪 Starting chaos test: ${scenarioId}`, { 
            user: req.user?.username,
            options 
        });
        
        // Run chaos test (this will be async but we return immediately)
        const testPromise = chaos.runChaosTest(scenarioId, options);
        
        // Don't await - let it run in background
        testPromise.catch(error => {
            logger.error(`Chaos test ${scenarioId} failed:`, error);
        });
        
        res.json({
            status: 'success',
            message: `Chaos test ${scenarioId} started`,
            scenario: scenarioId,
            estimatedDuration: chaos.failureScenarios.get(scenarioId)?.duration || 'unknown',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Chaos test execution failed:', error);
        res.status(500).json({ error: 'Failed to execute chaos test', details: error.message });
    }
});

/**
 * POST /api/chaos/test/market-data-failure
 * Run market data provider failure test (convenience endpoint)
 */
router.post('/test/market-data-failure', authenticateToken, async (req, res) => {
    try {
        const chaos = getChaosTestingFramework();
        
        logger.info('🧪 Starting market data provider failure test', { 
            user: req.user?.username 
        });
        
        // Run the specific test scenario
        const testPromise = chaos.runChaosTest('market_data_provider_failure');
        
        testPromise.catch(error => {
            logger.error('Market data failure test failed:', error);
        });
        
        res.json({
            status: 'success',
            message: 'Market data provider failure test started',
            scenario: 'market_data_provider_failure',
            estimatedDuration: '30 seconds',
            description: 'Simulating complete market data provider outage',
            expectedBehavior: [
                'Circuit breaker should open after failures',
                'System should switch to cached data',
                'Trading should pause or use fallback strategies',
                'System should recover when data provider returns'
            ],
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Market data failure test failed:', error);
        res.status(500).json({ error: 'Failed to execute market data failure test', details: error.message });
    }
});

/**
 * POST /api/chaos/validate/degradation
 * Validate graceful degradation capabilities
 */
router.post('/validate/degradation', authenticateToken, async (req, res) => {
    try {
        const chaos = getChaosTestingFramework();
        
        logger.info('🔍 Starting graceful degradation validation', { 
            user: req.user?.username 
        });
        
        const results = await chaos.validateGracefulDegradation();
        
        const summary = {
            totalTests: results.length,
            passed: results.filter(r => r.graceful && r.status === 'completed').length,
            failed: results.filter(r => !r.graceful || r.status === 'failed').length,
            overallStatus: results.every(r => r.graceful && r.status === 'completed') ? 'passed' : 'failed'
        };
        
        res.json({
            status: 'success',
            data: {
                summary,
                results,
                recommendations: generateDegradationRecommendations(results)
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Graceful degradation validation failed:', error);
        res.status(500).json({ error: 'Failed to validate graceful degradation', details: error.message });
    }
});

/**
 * GET /api/chaos/results
 * Get chaos test results and history
 */
router.get('/results', authenticateToken, async (req, res) => {
    try {
        const chaos = getChaosTestingFramework();
        const results = chaos.getTestResults();
        
        res.json({
            status: 'success',
            data: results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Chaos test results retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve chaos test results', details: error.message });
    }
});

/**
 * GET /api/chaos/circuit-breakers
 * Get circuit breaker status
 */
router.get('/circuit-breakers', authenticateToken, async (req, res) => {
    try {
        const chaos = getChaosTestingFramework();
        const status = chaos.getStatus();
        
        res.json({
            status: 'success',
            data: {
                circuitBreakers: status.circuitBreakers,
                summary: {
                    total: status.circuitBreakers.length,
                    open: status.circuitBreakers.filter(cb => cb.state === 'open').length,
                    halfOpen: status.circuitBreakers.filter(cb => cb.state === 'half-open').length,
                    closed: status.circuitBreakers.filter(cb => cb.state === 'closed').length
                }
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Circuit breaker status retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve circuit breaker status', details: error.message });
    }
});

/**
 * POST /api/chaos/circuit-breakers/reset
 * Reset all circuit breakers
 */
router.post('/circuit-breakers/reset', authenticateToken, async (req, res) => {
    try {
        const chaos = getChaosTestingFramework();
        chaos.resetCircuitBreakers();
        
        logger.info('🔧 Circuit breakers reset by user', { 
            user: req.user?.username 
        });
        
        res.json({
            status: 'success',
            message: 'All circuit breakers have been reset',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Circuit breaker reset failed:', error);
        res.status(500).json({ error: 'Failed to reset circuit breakers', details: error.message });
    }
});

/**
 * DELETE /api/chaos/results
 * Clear chaos test results history
 */
router.delete('/results', authenticateToken, async (req, res) => {
    try {
        const chaos = getChaosTestingFramework();
        chaos.clearTestResults();
        
        logger.info('🧹 Chaos test results cleared by user', { 
            user: req.user?.username 
        });
        
        res.json({
            status: 'success',
            message: 'Chaos test results history cleared',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Chaos test results clearing failed:', error);
        res.status(500).json({ error: 'Failed to clear chaos test results', details: error.message });
    }
});

/**
 * POST /api/chaos/test/comprehensive
 * Run comprehensive chaos testing suite
 */
router.post('/test/comprehensive', authenticateToken, async (req, res) => {
    try {
        const { scenarios = ['market_data_provider_failure', 'database_connection_failure', 'high_latency_simulation'] } = req.body;
        
        const chaos = getChaosTestingFramework();
        
        logger.info('🧪 Starting comprehensive chaos testing suite', { 
            user: req.user?.username,
            scenarios 
        });
        
        // Run scenarios sequentially with delays
        const testPromises = scenarios.map((scenarioId, index) => {
            return new Promise((resolve) => {
                setTimeout(async () => {
                    try {
                        const result = await chaos.runChaosTest(scenarioId);
                        resolve({ scenarioId, result });
                    } catch (error) {
                        resolve({ scenarioId, error: error.message });
                    }
                }, index * 10000); // 10 second delays between tests
            });
        });
        
        // Don't await all - just start them
        Promise.all(testPromises).then(results => {
            logger.info('🎉 Comprehensive chaos testing suite completed', { results });
        });
        
        res.json({
            status: 'success',
            message: 'Comprehensive chaos testing suite started',
            scenarios,
            estimatedDuration: `${scenarios.length * 1} minutes`,
            description: 'Running multiple chaos scenarios to validate system resilience',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Comprehensive chaos testing failed:', error);
        res.status(500).json({ error: 'Failed to execute comprehensive chaos testing', details: error.message });
    }
});

/**
 * GET /api/chaos/dashboard
 * Get chaos testing dashboard data
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const chaos = getChaosTestingFramework();
        const status = chaos.getStatus();
        const results = chaos.getTestResults();
        
        const dashboard = {
            overview: {
                totalTests: results.totalTests,
                successRate: results.totalTests > 0 ? (results.successful / results.totalTests * 100).toFixed(1) + '%' : '0%',
                averageTestDuration: Math.round(results.averageDuration / 1000) + 's',
                activeTests: status.activeTests.length
            },
            circuitBreakers: status.circuitBreakers.map(cb => ({
                name: cb.name,
                status: cb.state,
                healthy: cb.canExecute,
                failures: cb.failureCount
            })),
            recentTests: results.results.slice(-10).map(test => ({
                scenario: test.scenarioName,
                result: test.result,
                duration: Math.round(test.duration / 1000) + 's',
                timestamp: test.timestamp
            })),
            systemHealth: {
                memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
                uptime: Math.round(process.uptime() / 60) + 'm',
                nodeVersion: process.version
            }
        };
        
        res.json({
            status: 'success',
            data: dashboard,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Chaos testing dashboard retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve chaos testing dashboard', details: error.message });
    }
});

/**
 * Generate recommendations based on degradation test results
 */
function generateDegradationRecommendations(results) {
    const recommendations = [];
    
    const failedTests = results.filter(r => !r.graceful || r.status === 'failed');
    
    if (failedTests.length === 0) {
        recommendations.push({
            type: 'success',
            message: 'All graceful degradation tests passed. System shows good resilience.',
            priority: 'info'
        });
    } else {
        failedTests.forEach(test => {
            recommendations.push({
                type: 'improvement',
                message: `${test.name} failed graceful degradation. Consider implementing additional fallback strategies.`,
                priority: 'high',
                details: test.error || test.reason
            });
        });
    }
    
    // General recommendations
    recommendations.push({
        type: 'monitoring',
        message: 'Implement continuous chaos testing in CI/CD pipeline for ongoing resilience validation.',
        priority: 'medium'
    });
    
    recommendations.push({
        type: 'documentation',
        message: 'Document all fallback strategies and recovery procedures for operational teams.',
        priority: 'medium'
    });
    
    return recommendations;
}

module.exports = router;