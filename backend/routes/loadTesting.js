/**
 * Performance Load Testing API Routes
 * Manages k6 load testing execution and results for A.A.I.T.I platform
 */

const express = require('express');
const PerformanceLoadTestingService = require('../services/performanceLoadTestingService');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();
const loadTestingService = new PerformanceLoadTestingService();

/**
 * GET /api/load-testing/status
 * Get load testing service status and configuration
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const status = {
            service: 'ACTIVE',
            timestamp: new Date(),
            configuration: {
                baseUrl: loadTestingService.baseUrl,
                targetRPS: loadTestingService.targetRPS,
                k6Path: loadTestingService.k6Path,
                resultsDirectory: loadTestingService.testResultsDir
            },
            availableTests: ['smoke', 'load', 'stress', 'spike', 'volume', 'suite'],
            targets: {
                responseTime: '<2000ms (P95)',
                errorRate: '<5%',
                targetRPS: `${loadTestingService.targetRPS} RPS`,
                availability: '>99%'
            }
        };

        res.json(status);
    } catch (error) {
        logger.error('Load testing status retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve status', details: error.message });
    }
});

/**
 * POST /api/load-testing/smoke
 * Run smoke test - basic functionality verification
 */
router.post('/smoke', authenticateToken, async (req, res) => {
    try {
        const options = req.body || {};
        
        logger.info('🔍 Starting smoke test', { options });
        
        const results = await loadTestingService.runSmokeTest(options);
        
        res.json({
            testType: 'smoke',
            status: 'completed',
            results,
            summary: {
                passed: results.evaluation?.passed || false,
                grade: results.evaluation?.grade || 'N/A',
                responseTime: results.summary?.responseTime?.avg || 0,
                errorRate: (results.summary?.errorRate || 0) * 100,
                duration: results.summary?.duration || 0
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        logger.error('Smoke test execution failed:', error);
        res.status(500).json({ 
            error: 'Smoke test failed', 
            details: error.message,
            testType: 'smoke',
            status: 'failed'
        });
    }
});

/**
 * POST /api/load-testing/load
 * Run load test - target 200 RPS performance validation
 */
router.post('/load', authenticateToken, async (req, res) => {
    try {
        const options = req.body || {};
        
        logger.info('📊 Starting load test', { targetRPS: loadTestingService.targetRPS, options });
        
        const results = await loadTestingService.runLoadTest(options);
        
        res.json({
            testType: 'load',
            status: 'completed',
            results,
            summary: {
                passed: results.evaluation?.passed || false,
                grade: results.evaluation?.grade || 'N/A',
                responseTime: results.summary?.responseTime?.p95 || 0,
                errorRate: (results.summary?.errorRate || 0) * 100,
                requestRate: results.summary?.requestRate || 0,
                targetRPS: loadTestingService.targetRPS
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        logger.error('Load test execution failed:', error);
        res.status(500).json({ 
            error: 'Load test failed', 
            details: error.message,
            testType: 'load',
            status: 'failed'
        });
    }
});

/**
 * POST /api/load-testing/stress
 * Run stress test - beyond normal capacity
 */
router.post('/stress', authenticateToken, async (req, res) => {
    try {
        const options = req.body || {};
        
        logger.info('🔥 Starting stress test', { options });
        
        const results = await loadTestingService.runStressTest(options);
        
        res.json({
            testType: 'stress',
            status: 'completed',
            results,
            summary: {
                passed: results.evaluation?.passed || false,
                grade: results.evaluation?.grade || 'N/A',
                responseTime: results.summary?.responseTime?.p95 || 0,
                errorRate: (results.summary?.errorRate || 0) * 100,
                requestRate: results.summary?.requestRate || 0,
                peakRPS: loadTestingService.targetRPS * 3
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        logger.error('Stress test execution failed:', error);
        res.status(500).json({ 
            error: 'Stress test failed', 
            details: error.message,
            testType: 'stress',
            status: 'failed'
        });
    }
});

/**
 * POST /api/load-testing/spike
 * Run spike test - sudden traffic spikes
 */
router.post('/spike', authenticateToken, async (req, res) => {
    try {
        const options = req.body || {};
        
        logger.info('⚡ Starting spike test', { options });
        
        const results = await loadTestingService.runSpikeTest(options);
        
        res.json({
            testType: 'spike',
            status: 'completed',
            results,
            summary: {
                passed: results.evaluation?.passed || false,
                grade: results.evaluation?.grade || 'N/A',
                responseTime: results.summary?.responseTime?.p99 || 0,
                errorRate: (results.summary?.errorRate || 0) * 100,
                requestRate: results.summary?.requestRate || 0,
                recoveryTime: results.summary?.recoveryTime || 0
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        logger.error('Spike test execution failed:', error);
        res.status(500).json({ 
            error: 'Spike test failed', 
            details: error.message,
            testType: 'spike',
            status: 'failed'
        });
    }
});

/**
 * POST /api/load-testing/volume
 * Run volume test - sustained high load
 */
router.post('/volume', authenticateToken, async (req, res) => {
    try {
        const options = req.body || {};
        
        logger.info('🔄 Starting volume test', { options });
        
        const results = await loadTestingService.runVolumeTest(options);
        
        res.json({
            testType: 'volume',
            status: 'completed',
            results,
            summary: {
                passed: results.evaluation?.passed || false,
                grade: results.evaluation?.grade || 'N/A',
                responseTime: results.summary?.responseTime?.avg || 0,
                errorRate: (results.summary?.errorRate || 0) * 100,
                requestRate: results.summary?.requestRate || 0,
                sustainedDuration: results.summary?.duration || 0
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        logger.error('Volume test execution failed:', error);
        res.status(500).json({ 
            error: 'Volume test failed', 
            details: error.message,
            testType: 'volume',
            status: 'failed'
        });
    }
});

/**
 * POST /api/load-testing/suite
 * Run comprehensive test suite
 */
router.post('/suite', authenticateToken, async (req, res) => {
    try {
        const options = req.body || {};
        const suite = options.suite || ['smoke', 'load', 'stress', 'spike'];
        
        logger.info('🚀 Starting comprehensive test suite', { suite, options });
        
        // Set longer timeout for suite execution
        req.setTimeout(30 * 60 * 1000); // 30 minutes
        res.setTimeout(30 * 60 * 1000);
        
        const results = await loadTestingService.runFullTestSuite(options);
        
        const summary = {
            totalTests: Object.keys(results).length,
            passedTests: Object.values(results).filter(r => r.evaluation?.passed).length,
            overallScore: loadTestingService.calculateOverallScore(results),
            testTypes: Object.keys(results),
            duration: Object.values(results).reduce((total, r) => total + (r.summary?.duration || 0), 0)
        };
        
        res.json({
            testType: 'suite',
            status: 'completed',
            results,
            summary,
            recommendations: loadTestingService.generateRecommendations(results),
            timestamp: new Date()
        });
        
    } catch (error) {
        logger.error('Test suite execution failed:', error);
        res.status(500).json({ 
            error: 'Test suite failed', 
            details: error.message,
            testType: 'suite',
            status: 'failed'
        });
    }
});

/**
 * GET /api/load-testing/results
 * Get test results history
 */
router.get('/results', authenticateToken, async (req, res) => {
    try {
        const { testType, limit = 10, offset = 0 } = req.query;
        
        const fs = require('fs').promises;
        const path = require('path');
        
        const resultsDir = loadTestingService.testResultsDir;
        const files = await fs.readdir(resultsDir);
        
        let resultFiles = files.filter(file => file.endsWith('-parsed.json'));
        
        if (testType) {
            resultFiles = resultFiles.filter(file => file.startsWith(testType));
        }
        
        // Sort by timestamp (newest first)
        resultFiles.sort((a, b) => {
            const timeA = a.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)?.[0] || '';
            const timeB = b.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)?.[0] || '';
            return timeB.localeCompare(timeA);
        });
        
        const paginatedFiles = resultFiles.slice(offset, offset + parseInt(limit));
        const results = [];
        
        for (const file of paginatedFiles) {
            try {
                const filePath = path.join(resultsDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const result = JSON.parse(content);
                results.push({
                    file,
                    testType: result.testType,
                    timestamp: result.timestamp,
                    passed: result.evaluation?.passed || false,
                    grade: result.evaluation?.grade || 'N/A',
                    summary: {
                        responseTime: result.summary?.responseTime?.p95 || 0,
                        errorRate: (result.summary?.errorRate || 0) * 100,
                        requestRate: result.summary?.requestRate || 0
                    }
                });
            } catch (parseError) {
                logger.warn(`Failed to parse result file ${file}:`, parseError);
            }
        }
        
        res.json({
            results,
            pagination: {
                total: resultFiles.length,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(resultFiles.length / parseInt(limit))
            },
            filters: { testType }
        });
        
    } catch (error) {
        logger.error('Results retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve results', details: error.message });
    }
});

/**
 * GET /api/load-testing/results/:file
 * Get detailed test result
 */
router.get('/results/:file', authenticateToken, async (req, res) => {
    try {
        const { file } = req.params;
        
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = path.join(loadTestingService.testResultsDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const result = JSON.parse(content);
        
        res.json(result);
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Result file not found' });
        } else {
            logger.error('Result file retrieval failed:', error);
            res.status(500).json({ error: 'Failed to retrieve result file', details: error.message });
        }
    }
});

/**
 * DELETE /api/load-testing/results/:file
 * Delete test result file
 */
router.delete('/results/:file', authenticateToken, async (req, res) => {
    try {
        const { file } = req.params;
        
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = path.join(loadTestingService.testResultsDir, file);
        await fs.unlink(filePath);
        
        res.json({
            message: 'Result file deleted successfully',
            file,
            timestamp: new Date()
        });
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Result file not found' });
        } else {
            logger.error('Result file deletion failed:', error);
            res.status(500).json({ error: 'Failed to delete result file', details: error.message });
        }
    }
});

/**
 * GET /api/load-testing/reports
 * Get available test reports
 */
router.get('/reports', authenticateToken, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        const resultsDir = loadTestingService.testResultsDir;
        const files = await fs.readdir(resultsDir);
        
        const reportFiles = files.filter(file => 
            file.startsWith('suite-report-') && (file.endsWith('.json') || file.endsWith('.html'))
        );
        
        const reports = reportFiles.map(file => {
            const timestamp = file.match(/suite-report-(.+)\.(json|html)$/)?.[1] || '';
            const type = file.endsWith('.html') ? 'html' : 'json';
            
            return {
                file,
                type,
                timestamp: timestamp.replace(/[-]/g, ':').replace(/T/, ' '),
                url: `/api/load-testing/reports/${file}`
            };
        });
        
        // Sort by timestamp (newest first)
        reports.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        
        res.json({ reports });
        
    } catch (error) {
        logger.error('Reports retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve reports', details: error.message });
    }
});

/**
 * GET /api/load-testing/reports/:file
 * Get test report file
 */
router.get('/reports/:file', authenticateToken, async (req, res) => {
    try {
        const { file } = req.params;
        
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = path.join(loadTestingService.testResultsDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        
        if (file.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        } else {
            res.setHeader('Content-Type', 'application/json');
        }
        
        res.send(content);
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Report file not found' });
        } else {
            logger.error('Report file retrieval failed:', error);
            res.status(500).json({ error: 'Failed to retrieve report file', details: error.message });
        }
    }
});

/**
 * POST /api/load-testing/baseline
 * Establish performance baseline with current system state
 */
router.post('/baseline', authenticateToken, async (req, res) => {
    try {
        const options = req.body || {};
        
        logger.info('📈 Establishing performance baseline');
        
        // Run baseline test suite
        const baselineResults = await loadTestingService.runFullTestSuite({
            ...options,
            suite: ['smoke', 'load'],
            tag: 'baseline'
        });
        
        // Store baseline for future comparisons
        const baseline = {
            timestamp: new Date().toISOString(),
            results: baselineResults,
            configuration: {
                baseUrl: loadTestingService.baseUrl,
                targetRPS: loadTestingService.targetRPS
            }
        };
        
        const fs = require('fs').promises;
        const path = require('path');
        const baselineFile = path.join(loadTestingService.testResultsDir, 'performance-baseline.json');
        
        await fs.writeFile(baselineFile, JSON.stringify(baseline, null, 2));
        
        res.json({
            message: 'Performance baseline established',
            baseline,
            timestamp: new Date()
        });
        
    } catch (error) {
        logger.error('Baseline establishment failed:', error);
        res.status(500).json({ error: 'Failed to establish baseline', details: error.message });
    }
});

module.exports = router;