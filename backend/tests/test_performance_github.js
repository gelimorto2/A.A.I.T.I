const { expect } = require('chai');
const { getGitHubIssueReporter } = require('../utils/githubIssueReporter');
const { getPerformanceMonitor } = require('../utils/performanceMonitor');

describe('Performance and GitHub Integration', () => {
  let githubReporter;
  let performanceMonitor;

  before(() => {
    githubReporter = getGitHubIssueReporter({
      enabled: false, // Disable for tests
      githubToken: 'test_token',
      owner: 'test_owner',
      repo: 'test_repo'
    });

    performanceMonitor = getPerformanceMonitor({
      reportToGitHub: false,
      alertOnThresholds: false
    });
  });

  describe('GitHub Issue Reporter', () => {
    it('should initialize with correct configuration', () => {
      const status = githubReporter.getStatus();
      expect(status).to.have.property('enabled');
      expect(status).to.have.property('configured');
      expect(status).to.have.property('recentIssues');
    });

    it('should validate severity levels correctly', () => {
      const testError = new Error('Test error');
      
      // Test severity extraction
      const severity1 = githubReporter.extractSeverity(testError);
      expect(severity1).to.equal('error');
      
      // Test severity threshold
      const meetsCritical = githubReporter.meetsSeverityThreshold('critical');
      expect(meetsCritical).to.be.true;
      
      const meetsInfo = githubReporter.meetsSeverityThreshold('info');
      expect(meetsInfo).to.be.false; // default threshold is 'error'
    });

    it('should format error issues correctly', () => {
      const testError = new Error('Test error message');
      testError.stack = 'Test stack trace';
      
      const context = {
        severity: 'error',
        script: 'test-script',
        type: 'test'
      };
      
      const issue = githubReporter.formatErrorIssue(testError, context);
      
      expect(issue).to.have.property('title');
      expect(issue).to.have.property('body');
      expect(issue).to.have.property('labels');
      expect(issue.title).to.include('Test error message');
      expect(issue.body).to.include('Test error message');
      expect(issue.body).to.include('test-script');
      expect(issue.labels).to.include('severity:error');
    });

    it('should check rate limits correctly', () => {
      const testError = new Error('Rate limit test');
      
      // Reset the rate limiter to ensure clean state
      githubReporter.issueCount = 0;
      githubReporter.lastHourReset = Date.now();
      
      // First call should pass
      const shouldCreate1 = githubReporter.checkRateLimit();
      expect(shouldCreate1).to.be.true;
      
      // Simulate multiple calls but stay under the limit
      const maxIssues = githubReporter.config.maxIssuesPerHour || 50;
      const testCount = Math.min(5, maxIssues - 1); // Stay well under the limit
      
      for (let i = 0; i < testCount; i++) {
        githubReporter.recordIssueCreation(testError, { number: i }, {});
      }
      
      // Should still work as we're under the hourly limit
      const shouldCreate2 = githubReporter.checkRateLimit();
      expect(shouldCreate2).to.be.true;
    });

    it('should check for duplicate issues', () => {
      // Create errors in a way that they have the same stack trace
      const createTestError = () => new Error('Duplicate test');
      const testError1 = createTestError();
      const testError2 = createTestError();
      const testError3 = new Error('Different error');
      
      const context = { script: 'test' };
      
      // Clear any existing duplicates first
      githubReporter.recentIssues.clear();
      
      // First occurrence should not be duplicate
      const isDupe1 = githubReporter.isDuplicate(testError1, context);
      expect(isDupe1).to.be.false;
      
      // Record the issue
      githubReporter.recordIssueCreation(testError1, { number: 1 }, context);
      
      // Same error should be duplicate
      const isDupe2 = githubReporter.isDuplicate(testError2, context);
      expect(isDupe2).to.be.true;
      
      // Different error should not be duplicate
      const isDupe3 = githubReporter.isDuplicate(testError3, context);
      expect(isDupe3).to.be.false;
    });
  });

  describe('Performance Monitor', () => {
    it('should initialize with correct configuration', () => {
      const metrics = performanceMonitor.getPerformanceMetrics();
      expect(metrics).to.have.property('memory');
      expect(metrics).to.have.property('cpu');
      expect(metrics).to.have.property('requests');
      expect(metrics).to.have.property('scripts');
      expect(metrics).to.have.property('apiCalls');
      expect(metrics).to.have.property('thresholds');
    });

    it('should monitor script performance', async () => {
      const scriptName = 'test-script';
      
      const result = await performanceMonitor.monitorScript(scriptName, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'test result';
      });
      
      expect(result).to.equal('test result');
      
      const metrics = performanceMonitor.getPerformanceMetrics();
      const scriptMetrics = metrics.scripts.find(s => s.name === scriptName);
      
      expect(scriptMetrics).to.exist;
      expect(scriptMetrics.runs).to.equal(1);
      expect(scriptMetrics.avgTime).to.be.greaterThan(90);
    });

    it('should monitor API call performance', async () => {
      const endpoint = 'test-api';
      
      const result = await performanceMonitor.monitorAPICall(endpoint, async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: 'test' };
      });
      
      expect(result).to.deep.equal({ data: 'test' });
      
      const metrics = performanceMonitor.getPerformanceMetrics();
      const apiMetrics = metrics.apiCalls.find(a => a.endpoint === endpoint);
      
      expect(apiMetrics).to.exist;
      expect(apiMetrics.calls).to.equal(1);
      expect(apiMetrics.avgTime).to.be.greaterThan(40);
    });

    it('should handle script errors', async () => {
      const scriptName = 'error-script';
      
      try {
        await performanceMonitor.monitorScript(scriptName, async () => {
          throw new Error('Test script error');
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Test script error');
      }
      
      const metrics = performanceMonitor.getPerformanceMetrics();
      const scriptMetrics = metrics.scripts.find(s => s.name === scriptName);
      
      expect(scriptMetrics).to.exist;
      expect(scriptMetrics.errors).to.equal(1);
      expect(scriptMetrics.errorRate).to.equal(1);
    });

    it('should track memory and CPU usage', () => {
      // Trigger a check
      performanceMonitor.checkMemoryUsage();
      performanceMonitor.checkCPUUsage();
      
      const metrics = performanceMonitor.getPerformanceMetrics();
      
      expect(metrics.memory.usage).to.be.a('number');
      expect(metrics.memory.usage).to.be.at.least(0);
      expect(metrics.cpu.usage).to.be.a('number');
      expect(metrics.cpu.usage).to.be.at.least(0);
    });

    it('should reset metrics correctly', () => {
      // Add some test data
      performanceMonitor.recordScriptPerformance('test', 100, true);
      performanceMonitor.recordAPIPerformance('test-api', 200, true);
      
      // Reset metrics
      performanceMonitor.resetMetrics();
      
      const metrics = performanceMonitor.getPerformanceMetrics();
      expect(metrics.requests.total).to.equal(0);
      expect(metrics.requests.successful).to.equal(0);
      expect(metrics.requests.failed).to.equal(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle performance issues with GitHub reporting disabled', async () => {
      const testError = new Error('Performance test error');
      
      // This should not throw even with GitHub reporting disabled
      const result = await githubReporter.reportError(testError, {
        severity: 'error',
        type: 'performance'
      });
      
      expect(result).to.be.false; // Should return false when disabled
    });

    it('should format performance issues correctly', () => {
      const perfError = new Error('Performance threshold exceeded: memory_usage');
      perfError.metric = 'memory_usage';
      perfError.value = 0.9;
      perfError.threshold = 0.85;
      perfError.type = 'performance';
      
      const context = {
        performance: {
          metric: 'memory_usage',
          value: 0.9,
          threshold: 0.85,
          percentage: '105.88'
        },
        type: 'performance'
      };
      
      const issue = githubReporter.formatErrorIssue(perfError, context);
      
      expect(issue.title).to.include('Performance threshold exceeded');
      expect(issue.body).to.include('Performance Details');
      expect(issue.body).to.include('memory_usage');
      expect(issue.body).to.include('105.88%');
      expect(issue.labels).to.include('type:performance');
    });
  });

  after(() => {
    // Clean up
    if (performanceMonitor && performanceMonitor.stop) {
      performanceMonitor.stop();
    }
  });
});

module.exports = {
  'GitHub Issue Reporter': () => getGitHubIssueReporter(),
  'Performance Monitor': () => getPerformanceMonitor()
};