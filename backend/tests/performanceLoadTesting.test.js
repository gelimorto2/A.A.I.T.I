/**
 * Performance Load Testing - Comprehensive Test Suite
 * Tests for k6 load testing service, performance validation, and results analysis
 */

const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs').promises;
const path = require('path');
const PerformanceLoadTestingService = require('../services/performanceLoadTestingService');

describe('Performance Load Testing Service', () => {
    let loadTestingService;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        loadTestingService = new PerformanceLoadTestingService();
        
        // Mock file system operations
        sandbox.stub(fs, 'mkdir').resolves();
        sandbox.stub(fs, 'readFile').resolves('{}');
        sandbox.stub(fs, 'writeFile').resolves();
        sandbox.stub(fs, 'readdir').resolves([]);
        sandbox.stub(fs, 'unlink').resolves();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Service Initialization', () => {
        it('should initialize with default configuration', () => {
            expect(loadTestingService.baseUrl).to.equal('http://localhost:5000');
            expect(loadTestingService.targetRPS).to.equal(200);
            expect(loadTestingService.k6Path).to.equal('k6');
        });

        it('should use environment variables when available', () => {
            const originalEnv = process.env;
            process.env.BASE_URL = 'http://test.example.com';
            process.env.TARGET_RPS = '500';
            process.env.K6_PATH = '/usr/local/bin/k6';

            const service = new PerformanceLoadTestingService();

            expect(service.baseUrl).to.equal('http://test.example.com');
            expect(service.targetRPS).to.equal(500);
            expect(service.k6Path).to.equal('/usr/local/bin/k6');

            process.env = originalEnv;
        });

        it('should create results directory on initialization', async () => {
            expect(fs.mkdir.calledOnce).to.be.true;
            expect(fs.mkdir.calledWith(loadTestingService.testResultsDir, { recursive: true })).to.be.true;
        });
    });

    describe('Test Execution', () => {
        beforeEach(() => {
            // Mock k6 process execution
            sandbox.stub(loadTestingService, 'executeK6Test').resolves({
                testType: 'smoke',
                summary: {
                    responseTime: { p95: 500, p99: 800, avg: 300 },
                    errorRate: 0.02,
                    requestRate: 10,
                    totalRequests: 100
                },
                evaluation: {
                    passed: true,
                    score: 85,
                    grade: 'B',
                    issues: [],
                    recommendations: []
                }
            });
        });

        it('should run smoke test successfully', async () => {
            const result = await loadTestingService.runSmokeTest();

            expect(result.testType).to.equal('smoke');
            expect(result.evaluation.passed).to.be.true;
            expect(result.evaluation.grade).to.equal('B');
        });

        it('should run load test with correct configuration', async () => {
            const options = { customOption: 'value' };
            await loadTestingService.runLoadTest(options);

            expect(loadTestingService.executeK6Test.calledOnce).to.be.true;
            const [testType, config] = loadTestingService.executeK6Test.getCall(0).args;
            
            expect(testType).to.equal('load');
            expect(config.scenario).to.equal('load');
            expect(config.targetRPS).to.equal(200);
            expect(config.customOption).to.equal('value');
        });

        it('should run stress test with higher RPS targets', async () => {
            await loadTestingService.runStressTest();

            const [testType, config] = loadTestingService.executeK6Test.getCall(0).args;
            
            expect(testType).to.equal('stress');
            expect(config.maxRPS).to.equal(600); // 3x target RPS
        });

        it('should run spike test with sudden load increases', async () => {
            await loadTestingService.runSpikeTest();

            const [testType, config] = loadTestingService.executeK6Test.getCall(0).args;
            
            expect(testType).to.equal('spike');
            expect(config.peakMultiplier).to.equal(10);
        });

        it('should run volume test for sustained load', async () => {
            await loadTestingService.runVolumeTest();

            const [testType, config] = loadTestingService.executeK6Test.getCall(0).args;
            
            expect(testType).to.equal('volume');
            expect(config.duration).to.equal('15m');
            expect(config.vus).to.equal(150);
        });
    });

    describe('Full Test Suite', () => {
        beforeEach(() => {
            // Mock individual test methods
            sandbox.stub(loadTestingService, 'runSmokeTest').resolves({ testType: 'smoke', evaluation: { passed: true } });
            sandbox.stub(loadTestingService, 'runLoadTest').resolves({ testType: 'load', evaluation: { passed: true } });
            sandbox.stub(loadTestingService, 'runStressTest').resolves({ testType: 'stress', evaluation: { passed: false } });
            sandbox.stub(loadTestingService, 'runSpikeTest').resolves({ testType: 'spike', evaluation: { passed: true } });
            sandbox.stub(loadTestingService, 'sleep').resolves();
            sandbox.stub(loadTestingService, 'generateSuiteReport').resolves();
        });

        it('should run complete test suite with default tests', async () => {
            const results = await loadTestingService.runFullTestSuite();

            expect(Object.keys(results)).to.have.length(4);
            expect(results).to.have.property('smoke');
            expect(results).to.have.property('load');
            expect(results).to.have.property('stress');
            expect(results).to.have.property('spike');
        });

        it('should run custom test suite selection', async () => {
            const results = await loadTestingService.runFullTestSuite({ suite: ['smoke', 'load'] });

            expect(Object.keys(results)).to.have.length(2);
            expect(results).to.have.property('smoke');
            expect(results).to.have.property('load');
        });

        it('should wait between tests for system recovery', async () => {
            await loadTestingService.runFullTestSuite({ suite: ['smoke', 'load'] });

            expect(loadTestingService.sleep.calledOnce).to.be.true;
            expect(loadTestingService.sleep.calledWith(30000)).to.be.true; // 30 seconds
        });

        it('should handle test failures gracefully', async () => {
            loadTestingService.runLoadTest.rejects(new Error('Load test failed'));

            const results = await loadTestingService.runFullTestSuite({ suite: ['smoke', 'load'] });

            expect(results.smoke.evaluation.passed).to.be.true;
            expect(results.load).to.have.property('error', 'Load test failed');
        });

        it('should generate suite report after completion', async () => {
            await loadTestingService.runFullTestSuite();

            expect(loadTestingService.generateSuiteReport.calledOnce).to.be.true;
        });
    });

    describe('Results Parsing', () => {
        const mockK6Output = `
{"type":"Point","data":{"time":"2024-01-01T12:00:00Z","value":500},"metric":"http_req_duration"}
{"type":"Point","data":{"time":"2024-01-01T12:00:01Z","value":600},"metric":"http_req_duration"}
{"type":"Point","data":{"time":"2024-01-01T12:00:02Z","value":1},"metric":"http_req_failed"}
{"type":"Point","data":{"time":"2024-01-01T12:00:03Z","value":1},"metric":"http_reqs"}
        `.trim();

        beforeEach(() => {
            fs.readFile.resolves(mockK6Output);
        });

        it('should parse k6 JSON output correctly', async () => {
            const results = await loadTestingService.parseTestResults('/fake/output.json', {
                testType: 'load',
                config: {},
                exitCode: 0
            });

            expect(results.testType).to.equal('load');
            expect(results.dataPoints).to.equal(4);
            expect(results.summary).to.have.property('responseTime');
            expect(results.summary).to.have.property('errorRate');
            expect(results.evaluation).to.have.property('passed');
        });

        it('should handle empty output file', async () => {
            fs.readFile.resolves('');

            try {
                await loadTestingService.parseTestResults('/fake/empty.json', { testType: 'load' });
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('No test data found');
            }
        });

        it('should skip invalid JSON lines', async () => {
            const invalidOutput = `
{"valid": "json"}
invalid json line
{"another": "valid"}
            `.trim();

            fs.readFile.resolves(invalidOutput);

            const results = await loadTestingService.parseTestResults('/fake/output.json', {
                testType: 'load',
                config: {},
                exitCode: 0
            });

            expect(results.dataPoints).to.equal(2); // Only valid JSON lines
        });
    });

    describe('Performance Evaluation', () => {
        it('should pass evaluation when all metrics meet targets', () => {
            const summary = {
                responseTime: { p95: 1500, p99: 2000 },
                errorRate: 0.02, // 2%
                requestRate: 180 // 90% of 200 RPS target
            };

            const evaluation = loadTestingService.evaluatePerformance(summary, 'load');

            expect(evaluation.passed).to.be.true;
            expect(evaluation.score).to.equal(75); // 25 + 25 + 25
            expect(evaluation.grade).to.equal('C');
            expect(evaluation.issues).to.have.length(0);
        });

        it('should fail evaluation when response time exceeds target', () => {
            const summary = {
                responseTime: { p95: 3000, p99: 4000 },
                errorRate: 0.02,
                requestRate: 200
            };

            const evaluation = loadTestingService.evaluatePerformance(summary, 'load');

            expect(evaluation.passed).to.be.false;
            expect(evaluation.issues).to.have.length.greaterThan(0);
            expect(evaluation.issues[0]).to.include('Response time P95');
        });

        it('should fail evaluation when error rate is too high', () => {
            const summary = {
                responseTime: { p95: 1500, p99: 2000 },
                errorRate: 0.1, // 10%
                requestRate: 200
            };

            const evaluation = loadTestingService.evaluatePerformance(summary, 'load');

            expect(evaluation.passed).to.be.false;
            expect(evaluation.issues.some(issue => issue.includes('Error rate'))).to.be.true;
        });

        it('should provide recommendations for poor performance', () => {
            const summary = {
                responseTime: { p95: 5000, p99: 10000 },
                errorRate: 0.15,
                requestRate: 50
            };

            const evaluation = loadTestingService.evaluatePerformance(summary, 'load');

            expect(evaluation.recommendations).to.have.length.greaterThan(0);
            expect(evaluation.recommendations.some(rec => rec.includes('database queries'))).to.be.true;
            expect(evaluation.recommendations.some(rec => rec.includes('error sources'))).to.be.true;
        });

        it('should detect high response time variability', () => {
            const summary = {
                responseTime: { p95: 1000, p99: 3000 }, // High variability
                errorRate: 0.02,
                requestRate: 200
            };

            const evaluation = loadTestingService.evaluatePerformance(summary, 'load');

            expect(evaluation.issues.some(issue => issue.includes('variability'))).to.be.true;
        });
    });

    describe('Target RPS Calculation', () => {
        it('should return correct target RPS for different test types', () => {
            expect(loadTestingService.getTargetRPS('smoke')).to.equal(10);
            expect(loadTestingService.getTargetRPS('load')).to.equal(200);
            expect(loadTestingService.getTargetRPS('stress')).to.equal(400);
            expect(loadTestingService.getTargetRPS('spike')).to.equal(1000);
            expect(loadTestingService.getTargetRPS('volume')).to.equal(150);
        });

        it('should return default target for unknown test types', () => {
            expect(loadTestingService.getTargetRPS('unknown')).to.equal(200);
        });
    });

    describe('Grade Calculation', () => {
        it('should assign correct grades based on scores', () => {
            expect(loadTestingService.calculateGrade(95)).to.equal('A');
            expect(loadTestingService.calculateGrade(85)).to.equal('B');
            expect(loadTestingService.calculateGrade(75)).to.equal('C');
            expect(loadTestingService.calculateGrade(65)).to.equal('D');
            expect(loadTestingService.calculateGrade(55)).to.equal('F');
        });

        it('should handle edge cases', () => {
            expect(loadTestingService.calculateGrade(90)).to.equal('A');
            expect(loadTestingService.calculateGrade(80)).to.equal('B');
            expect(loadTestingService.calculateGrade(70)).to.equal('C');
            expect(loadTestingService.calculateGrade(60)).to.equal('D');
        });
    });

    describe('Statistical Calculations', () => {
        it('should calculate average correctly', () => {
            const values = [100, 200, 300, 400, 500];
            expect(loadTestingService.average(values)).to.equal(300);
        });

        it('should calculate percentiles correctly', () => {
            const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            
            expect(loadTestingService.percentile(values, 0.5)).to.equal(5); // Median
            expect(loadTestingService.percentile(values, 0.95)).to.equal(10); // 95th percentile
            expect(loadTestingService.percentile(values, 0.99)).to.equal(10); // 99th percentile
        });

        it('should handle empty arrays gracefully', () => {
            expect(loadTestingService.average([])).to.be.NaN;
            expect(loadTestingService.percentile([], 0.95)).to.be.undefined;
        });
    });

    describe('Overall Score Calculation', () => {
        it('should calculate overall score from multiple test results', () => {
            const results = {
                smoke: { evaluation: { score: 90 } },
                load: { evaluation: { score: 80 } },
                stress: { evaluation: { score: 70 } }
            };

            const overall = loadTestingService.calculateOverallScore(results);

            expect(overall.score).to.equal(80); // Average of 90, 80, 70
            expect(overall.grade).to.equal('B');
        });

        it('should handle results without evaluation scores', () => {
            const results = {
                smoke: { evaluation: { score: 90 } },
                load: { error: 'Test failed' },
                stress: { evaluation: { score: 80 } }
            };

            const overall = loadTestingService.calculateOverallScore(results);

            expect(overall.score).to.equal(85); // Average of 90, 80 (ignoring failed test)
        });

        it('should return zero score for no valid results', () => {
            const results = {
                load: { error: 'Test failed' },
                stress: { error: 'Another failure' }
            };

            const overall = loadTestingService.calculateOverallScore(results);

            expect(overall.score).to.equal(0);
            expect(overall.grade).to.equal('F');
        });
    });

    describe('Recommendations Generation', () => {
        it('should collect unique recommendations from test results', () => {
            const results = {
                load: {
                    evaluation: {
                        recommendations: ['Optimize database queries', 'Scale infrastructure']
                    }
                },
                stress: {
                    evaluation: {
                        recommendations: ['Scale infrastructure', 'Add caching']
                    }
                }
            };

            const recommendations = loadTestingService.generateRecommendations(results);

            expect(recommendations).to.have.length(3);
            expect(recommendations).to.include('Optimize database queries');
            expect(recommendations).to.include('Scale infrastructure');
            expect(recommendations).to.include('Add caching');
        });

        it('should return empty array when no recommendations exist', () => {
            const results = {
                smoke: { evaluation: { passed: true } }
            };

            const recommendations = loadTestingService.generateRecommendations(results);

            expect(recommendations).to.have.length(0);
        });
    });

    describe('HTML Report Generation', () => {
        it('should generate valid HTML report', () => {
            const report = {
                timestamp: '2024-01-01T12:00:00Z',
                baseUrl: 'http://test.example.com',
                targetRPS: 200,
                summary: {
                    overallScore: { score: 85, grade: 'B' },
                    passedTests: 3,
                    totalTests: 4
                },
                results: {
                    smoke: {
                        evaluation: { passed: true, grade: 'A' },
                        summary: { responseTime: { p95: 500 }, errorRate: 0.01, requestRate: 15 }
                    }
                },
                recommendations: ['Optimize performance', 'Add monitoring']
            };

            const html = loadTestingService.generateHTMLReport(report);

            expect(html).to.include('<!DOCTYPE html>');
            expect(html).to.include('A.A.I.T.I Performance Test Report');
            expect(html).to.include('85/100 (B)');
            expect(html).to.include('3/4 Passed');
            expect(html).to.include('SMOKE Test');
            expect(html).to.include('Optimize performance');
        });
    });

    describe('Error Handling', () => {
        it('should handle file system errors gracefully', async () => {
            fs.mkdir.rejects(new Error('Permission denied'));

            // Should not throw error during initialization
            const service = new PerformanceLoadTestingService();
            expect(service).to.be.instanceOf(PerformanceLoadTestingService);
        });

        it('should handle k6 execution failures', async () => {
            sandbox.stub(loadTestingService, 'executeK6Test').rejects(new Error('k6 not found'));

            try {
                await loadTestingService.runLoadTest();
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.include('k6 not found');
            }
        });
    });
});