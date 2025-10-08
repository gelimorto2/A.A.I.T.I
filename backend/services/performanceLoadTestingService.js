/**
 * Performance Load Testing Service
 * Manages k6 load testing execution and results analysis
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

class PerformanceLoadTestingService {
    constructor() {
        this.k6Path = process.env.K6_PATH || 'k6';
        this.testResultsDir = path.join(__dirname, '../tests/performance/results');
        this.testScriptsDir = path.join(__dirname, '../tests/performance');
        this.baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        this.targetRPS = parseInt(process.env.TARGET_RPS) || 200;
        
        this.ensureResultsDirectory();
    }

    async ensureResultsDirectory() {
        try {
            await fs.mkdir(this.testResultsDir, { recursive: true });
        } catch (error) {
            logger.error('Failed to create results directory:', error);
        }
    }

    /**
     * Run smoke test - basic functionality verification
     */
    async runSmokeTest(options = {}) {
        const testConfig = {
            scenario: 'smoke',
            duration: '30s',
            vus: 1,
            ...options
        };

        return this.executeK6Test('smoke', testConfig);
    }

    /**
     * Run load test - target 200 RPS performance validation
     */
    async runLoadTest(options = {}) {
        const testConfig = {
            scenario: 'load',
            targetRPS: this.targetRPS,
            stages: [
                { duration: '2m', target: 20 },
                { duration: '5m', target: 50 },
                { duration: '5m', target: 100 },
                { duration: '3m', target: 100 },
                { duration: '2m', target: 0 },
            ],
            ...options
        };

        return this.executeK6Test('load', testConfig);
    }

    /**
     * Run stress test - beyond normal capacity
     */
    async runStressTest(options = {}) {
        const testConfig = {
            scenario: 'stress',
            maxRPS: this.targetRPS * 3, // 600 RPS peak
            stages: [
                { duration: '2m', target: 100 },
                { duration: '3m', target: 200 },
                { duration: '2m', target: 300 },
                { duration: '2m', target: 200 },
                { duration: '2m', target: 0 },
            ],
            ...options
        };

        return this.executeK6Test('stress', testConfig);
    }

    /**
     * Run spike test - sudden traffic spikes
     */
    async runSpikeTest(options = {}) {
        const testConfig = {
            scenario: 'spike',
            peakMultiplier: 10,
            stages: [
                { duration: '1m', target: 20 },
                { duration: '30s', target: 200 },
                { duration: '1m', target: 20 },
                { duration: '30s', target: 300 },
                { duration: '1m', target: 0 },
            ],
            ...options
        };

        return this.executeK6Test('spike', testConfig);
    }

    /**
     * Run volume test - sustained high load
     */
    async runVolumeTest(options = {}) {
        const testConfig = {
            scenario: 'volume',
            duration: '15m',
            vus: 150,
            sustainedRPS: this.targetRPS * 0.75, // 75% of target for sustained load
            ...options
        };

        return this.executeK6Test('volume', testConfig);
    }

    /**
     * Run comprehensive test suite
     */
    async runFullTestSuite(options = {}) {
        const suite = options.suite || ['smoke', 'load', 'stress', 'spike'];
        const results = {};

        logger.info(`🚀 Starting comprehensive performance test suite: ${suite.join(', ')}`);

        for (const testType of suite) {
            try {
                logger.info(`📊 Running ${testType} test...`);
                
                switch (testType) {
                    case 'smoke':
                        results[testType] = await this.runSmokeTest(options);
                        break;
                    case 'load':
                        results[testType] = await this.runLoadTest(options);
                        break;
                    case 'stress':
                        results[testType] = await this.runStressTest(options);
                        break;
                    case 'spike':
                        results[testType] = await this.runSpikeTest(options);
                        break;
                    case 'volume':
                        results[testType] = await this.runVolumeTest(options);
                        break;
                    default:
                        logger.warn(`Unknown test type: ${testType}`);
                }

                // Wait between tests to allow system recovery
                if (suite.indexOf(testType) < suite.length - 1) {
                    logger.info('⏱️  Waiting for system recovery...');
                    await this.sleep(30000); // 30 second recovery
                }

            } catch (error) {
                logger.error(`❌ ${testType} test failed:`, error);
                results[testType] = { error: error.message };
            }
        }

        // Generate comprehensive report
        await this.generateSuiteReport(results);

        return results;
    }

    /**
     * Execute k6 test with specified configuration
     */
    async executeK6Test(testType, config) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = path.join(this.testResultsDir, `${testType}-${timestamp}.json`);
        
        const env = {
            ...process.env,
            BASE_URL: this.baseUrl,
            TARGET_RPS: this.targetRPS.toString(),
            TEST_TYPE: testType,
            ...config.env
        };

        const args = [
            'run',
            '--out', `json=${outputFile}`,
            '--summary-trend-stats', 'avg,min,med,max,p(95),p(99)',
            '--summary-time-unit', 'ms',
        ];

        // Add scenario-specific options
        if (config.scenario) {
            args.push('--scenario', config.scenario);
        }

        args.push(path.join(this.testScriptsDir, 'load-test.js'));

        logger.info(`🏃 Executing k6 test: ${testType}`, { config, outputFile });

        return new Promise((resolve, reject) => {
            const k6Process = spawn(this.k6Path, args, {
                env,
                stdio: ['inherit', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            k6Process.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                logger.info(`k6: ${output.trim()}`);
            });

            k6Process.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                logger.warn(`k6 stderr: ${output.trim()}`);
            });

            k6Process.on('close', async (code) => {
                try {
                    const results = await this.parseTestResults(outputFile, {
                        testType,
                        config,
                        exitCode: code,
                        stdout,
                        stderr
                    });

                    if (code === 0) {
                        logger.info(`✅ ${testType} test completed successfully`);
                        resolve(results);
                    } else {
                        logger.error(`❌ ${testType} test failed with exit code ${code}`);
                        reject(new Error(`k6 test failed with exit code ${code}`));
                    }
                } catch (error) {
                    logger.error(`Failed to parse test results:`, error);
                    reject(error);
                }
            });

            k6Process.on('error', (error) => {
                logger.error(`k6 process error:`, error);
                reject(error);
            });
        });
    }

    /**
     * Parse k6 test results from JSON output
     */
    async parseTestResults(outputFile, metadata) {
        try {
            const rawData = await fs.readFile(outputFile, 'utf8');
            
            if (!rawData.trim()) {
                throw new Error('No test data found in output file');
            }

            const lines = rawData.trim().split('\n');
            const metrics = {};
            const dataPoints = [];

            // Parse JSON lines
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    
                    if (data.type === 'Point') {
                        dataPoints.push(data);
                    } else if (data.metric) {
                        if (!metrics[data.metric]) {
                            metrics[data.metric] = [];
                        }
                        metrics[data.metric].push(data);
                    }
                } catch (parseError) {
                    // Skip invalid JSON lines
                }
            }

            // Calculate summary statistics
            const summary = this.calculateSummaryStatistics(metrics, dataPoints);
            
            // Evaluate performance against targets
            const evaluation = this.evaluatePerformance(summary, metadata.testType);

            const results = {
                testType: metadata.testType,
                timestamp: new Date().toISOString(),
                config: metadata.config,
                exitCode: metadata.exitCode,
                summary,
                evaluation,
                dataPoints: dataPoints.length,
                metricsCount: Object.keys(metrics).length,
                outputFile,
            };

            // Save parsed results
            const resultsFile = outputFile.replace('.json', '-parsed.json');
            await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));

            return results;

        } catch (error) {
            logger.error(`Failed to parse test results from ${outputFile}:`, error);
            throw error;
        }
    }

    /**
     * Calculate summary statistics from metrics data
     */
    calculateSummaryStatistics(metrics, dataPoints) {
        const summary = {
            duration: 0,
            totalRequests: 0,
            requestRate: 0,
            errorRate: 0,
            responseTime: {},
            customMetrics: {},
        };

        // Calculate response time statistics
        if (metrics.http_req_duration) {
            const durations = metrics.http_req_duration.map(m => m.data.value);
            summary.responseTime = {
                avg: this.average(durations),
                min: Math.min(...durations),
                max: Math.max(...durations),
                p95: this.percentile(durations, 0.95),
                p99: this.percentile(durations, 0.99),
            };
        }

        // Calculate request statistics
        if (metrics.http_reqs) {
            summary.totalRequests = metrics.http_reqs.length;
        }

        // Calculate error rate
        if (metrics.http_req_failed) {
            const failures = metrics.http_req_failed.filter(m => m.data.value === 1).length;
            summary.errorRate = failures / metrics.http_req_failed.length;
        }

        // Calculate test duration and request rate
        if (dataPoints.length > 0) {
            const timestamps = dataPoints.map(dp => new Date(dp.data.time).getTime());
            const minTime = Math.min(...timestamps);
            const maxTime = Math.max(...timestamps);
            summary.duration = maxTime - minTime;
            summary.requestRate = summary.totalRequests / (summary.duration / 1000);
        }

        return summary;
    }

    /**
     * Evaluate performance against targets and thresholds
     */
    evaluatePerformance(summary, testType) {
        const evaluation = {
            passed: true,
            score: 0,
            issues: [],
            recommendations: [],
        };

        // Response time evaluation (target: <2000ms p95)
        if (summary.responseTime.p95 > 2000) {
            evaluation.passed = false;
            evaluation.issues.push(`Response time P95 (${summary.responseTime.p95.toFixed(2)}ms) exceeds 2000ms target`);
            evaluation.recommendations.push('Optimize database queries and API endpoints');
        } else {
            evaluation.score += 25;
        }

        // Error rate evaluation (target: <5%)
        if (summary.errorRate > 0.05) {
            evaluation.passed = false;
            evaluation.issues.push(`Error rate (${(summary.errorRate * 100).toFixed(2)}%) exceeds 5% target`);
            evaluation.recommendations.push('Investigate and fix error sources');
        } else {
            evaluation.score += 25;
        }

        // Request rate evaluation (varies by test type)
        const targetRPS = this.getTargetRPS(testType);
        if (summary.requestRate < targetRPS * 0.8) { // 80% of target
            evaluation.issues.push(`Request rate (${summary.requestRate.toFixed(2)} RPS) below 80% of ${targetRPS} RPS target`);
            evaluation.recommendations.push('Scale infrastructure or optimize request handling');
        } else {
            evaluation.score += 25;
        }

        // Response time consistency (P99 vs P95 ratio)
        const timeVariability = summary.responseTime.p99 / summary.responseTime.p95;
        if (timeVariability > 2.0) {
            evaluation.issues.push(`High response time variability (P99/P95 ratio: ${timeVariability.toFixed(2)})`);
            evaluation.recommendations.push('Investigate response time outliers and optimize slow operations');
        } else {
            evaluation.score += 25;
        }

        // Set overall grade
        evaluation.grade = this.calculateGrade(evaluation.score);

        return evaluation;
    }

    /**
     * Get target RPS for different test types
     */
    getTargetRPS(testType) {
        const targets = {
            smoke: 10,
            load: this.targetRPS,
            stress: this.targetRPS * 2,
            spike: this.targetRPS * 5,
            volume: this.targetRPS * 0.75,
        };

        return targets[testType] || this.targetRPS;
    }

    /**
     * Calculate performance grade
     */
    calculateGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * Generate comprehensive test suite report
     */
    async generateSuiteReport(results) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = path.join(this.testResultsDir, `suite-report-${timestamp}.json`);
        const htmlReportFile = path.join(this.testResultsDir, `suite-report-${timestamp}.html`);

        const report = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            targetRPS: this.targetRPS,
            summary: {
                totalTests: Object.keys(results).length,
                passedTests: Object.values(results).filter(r => r.evaluation?.passed).length,
                overallScore: this.calculateOverallScore(results),
            },
            results,
            recommendations: this.generateRecommendations(results),
        };

        // Save JSON report
        await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

        // Generate HTML report
        const htmlReport = this.generateHTMLReport(report);
        await fs.writeFile(htmlReportFile, htmlReport);

        logger.info(`📋 Test suite report generated: ${reportFile}`);
        logger.info(`🌐 HTML report generated: ${htmlReportFile}`);

        return report;
    }

    /**
     * Generate HTML report
     */
    generateHTMLReport(report) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>A.A.I.T.I Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e8f4f8; padding: 15px; border-radius: 5px; flex: 1; }
        .test-result { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .passed { border-left: 5px solid #4CAF50; }
        .failed { border-left: 5px solid #f44336; }
        .grade-A { color: #4CAF50; font-weight: bold; }
        .grade-B { color: #8BC34A; font-weight: bold; }
        .grade-C { color: #FF9800; font-weight: bold; }
        .grade-D { color: #FF5722; font-weight: bold; }
        .grade-F { color: #f44336; font-weight: bold; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 A.A.I.T.I Performance Test Report</h1>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        <p><strong>Target:</strong> ${report.baseUrl} @ ${report.targetRPS} RPS</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>📊 Overall Score</h3>
            <h2 class="grade-${report.summary.overallScore.grade}">${report.summary.overallScore.score}/100 (${report.summary.overallScore.grade})</h2>
        </div>
        <div class="metric">
            <h3>✅ Test Results</h3>
            <h2>${report.summary.passedTests}/${report.summary.totalTests} Passed</h2>
        </div>
        <div class="metric">
            <h3>🎯 Target Performance</h3>
            <h2>${report.targetRPS} RPS</h2>
        </div>
    </div>

    ${Object.entries(report.results).map(([testType, result]) => `
        <div class="test-result ${result.evaluation?.passed ? 'passed' : 'failed'}">
            <h3>${testType.toUpperCase()} Test ${result.evaluation?.passed ? '✅' : '❌'}</h3>
            <div class="summary">
                <div class="metric">
                    <h4>Response Time (P95)</h4>
                    <p>${result.summary?.responseTime?.p95?.toFixed(2) || 'N/A'}ms</p>
                </div>
                <div class="metric">
                    <h4>Error Rate</h4>
                    <p>${((result.summary?.errorRate || 0) * 100).toFixed(2)}%</p>
                </div>
                <div class="metric">
                    <h4>Request Rate</h4>
                    <p>${result.summary?.requestRate?.toFixed(2) || 'N/A'} RPS</p>
                </div>
                <div class="metric">
                    <h4>Grade</h4>
                    <p class="grade-${result.evaluation?.grade}">${result.evaluation?.grade || 'N/A'}</p>
                </div>
            </div>
            ${result.evaluation?.issues?.length > 0 ? `
                <h4>Issues:</h4>
                <ul>${result.evaluation.issues.map(issue => `<li>${issue}</li>`).join('')}</ul>
            ` : ''}
        </div>
    `).join('')}

    ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>💡 Recommendations</h3>
            <ul>${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>
        </div>
    ` : ''}
</body>
</html>`;
    }

    // Utility methods
    average(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    percentile(arr, p) {
        const sorted = arr.slice().sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[index];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    calculateOverallScore(results) {
        const scores = Object.values(results)
            .filter(r => r.evaluation?.score !== undefined)
            .map(r => r.evaluation.score);
        
        const avgScore = scores.length > 0 ? this.average(scores) : 0;
        
        return {
            score: Math.round(avgScore),
            grade: this.calculateGrade(avgScore)
        };
    }

    generateRecommendations(results) {
        const recommendations = new Set();
        
        Object.values(results).forEach(result => {
            if (result.evaluation?.recommendations) {
                result.evaluation.recommendations.forEach(rec => recommendations.add(rec));
            }
        });

        return Array.from(recommendations);
    }
}

module.exports = PerformanceLoadTestingService;