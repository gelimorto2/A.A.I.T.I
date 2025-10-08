/**
 * Comprehensive Test Runner for Sprint 3 & 4 Completion
 * Tests ML Strategy Lifecycle, Deterministic Backtesting, RBAC, and Security Hardening
 */

const { expect } = require('chai');
const request = require('supertest');
const path = require('path');

// Import test suites
const SecurityTestSuite = require('./securityTestSuite');

// Import services for testing
const MLModelRepository = require('../repositories/MLModelRepository');
const DeterministicBacktestHarness = require('../services/deterministicBacktestHarness');
const StrategyLifecycleManager = require('../services/strategyLifecycleManager');
const RBACMiddleware = require('../middleware/rbacMiddleware');
const SecurityHardeningService = require('../services/securityHardeningService');

class ComprehensiveTestRunner {
  constructor(app, db) {
    this.app = app;
    this.db = db;
    this.testResults = {
      sprint3: { passed: 0, failed: 0, tests: [] },
      sprint4: { passed: 0, failed: 0, tests: [] },
      overall: { passed: 0, failed: 0, duration: 0 }
    };
  }

  /**
   * Run all Sprint 3 & 4 tests
   */
  async runAllTests() {
    const startTime = Date.now();
    
    console.log('🚀 Starting comprehensive Sprint 3 & 4 test suite...\n');

    try {
      // Initialize services
      await this.initializeServices();

      // Run Sprint 3 tests
      console.log('📋 Running Sprint 3: ML & Strategy Legitimacy Tests...');
      await this.runSprint3Tests();
      
      console.log('\n📋 Running Sprint 4: Security & Hardening Tests...');
      await this.runSprint4Tests();

      // Calculate overall results
      this.calculateOverallResults();
      this.testResults.overall.duration = Date.now() - startTime;

      // Generate comprehensive report
      const report = this.generateComprehensiveReport();
      
      console.log('\n' + '='.repeat(80));
      console.log('📊 COMPREHENSIVE TEST RESULTS');
      console.log('='.repeat(80));
      console.log(report);

      // Determine if tests passed
      const allPassed = this.testResults.overall.failed === 0;
      
      if (allPassed) {
        console.log('\n🎉 ALL TESTS PASSED! Sprints 3 & 4 implementation complete.');
      } else {
        console.log(`\n❌ ${this.testResults.overall.failed} tests failed. Review and fix before deployment.`);
      }

      return {
        success: allPassed,
        results: this.testResults,
        report
      };

    } catch (error) {
      console.error('💥 Test suite execution failed:', error);
      throw error;
    }
  }

  /**
   * Initialize all services for testing
   */
  async initializeServices() {
    this.mlModelRepository = new MLModelRepository(this.db);
    this.backtestHarness = new DeterministicBacktestHarness(this.db, this.mlModelRepository);
    this.strategyLifecycleManager = new StrategyLifecycleManager(
      this.db, 
      this.mlModelRepository, 
      this.backtestHarness
    );
    this.rbacMiddleware = new RBACMiddleware();
    this.securityService = new SecurityHardeningService();
    this.securityTestSuite = new SecurityTestSuite(this.app, this.db);

    // Initialize backtest harness
    await this.backtestHarness.initialize();
    
    console.log('✅ All services initialized for testing');
  }

  /**
   * Run Sprint 3 ML & Strategy Legitimacy tests
   */
  async runSprint3Tests() {
    const sprint3Tests = [
      { name: 'ML Models Expanded Schema', test: this.testMLModelsSchema.bind(this) },
      { name: 'Training Metadata Persistence', test: this.testTrainingMetadataPersistence.bind(this) },
      { name: 'Model Evaluation Metrics Storage', test: this.testModelEvaluationMetrics.bind(this) },
      { name: 'Model Reproducibility Hash', test: this.testModelReproducibilityHash.bind(this) },
      { name: 'Deterministic Backtest Harness', test: this.testDeterministicBacktesting.bind(this) },
      { name: 'Strategy Lifecycle Management', test: this.testStrategyLifecycle.bind(this) },
      { name: 'Model Performance Tracking', test: this.testModelPerformanceTracking.bind(this) },
      { name: 'Model Activity Audit Trail', test: this.testModelActivityAuditTrail.bind(this) }
    ];

    for (const testCase of sprint3Tests) {
      try {
        console.log(`  🧪 Running: ${testCase.name}...`);
        await testCase.test();
        this.testResults.sprint3.passed++;
        this.testResults.sprint3.tests.push({
          name: testCase.name,
          status: 'PASSED',
          timestamp: new Date()
        });
        console.log(`    ✅ PASSED: ${testCase.name}`);
      } catch (error) {
        this.testResults.sprint3.failed++;
        this.testResults.sprint3.tests.push({
          name: testCase.name,
          status: 'FAILED',
          error: error.message,
          timestamp: new Date()
        });
        console.log(`    ❌ FAILED: ${testCase.name} - ${error.message}`);
      }
    }

    console.log(`\n📊 Sprint 3 Results: ${this.testResults.sprint3.passed} passed, ${this.testResults.sprint3.failed} failed`);
  }

  /**
   * Run Sprint 4 Security & Hardening tests
   */
  async runSprint4Tests() {
    const sprint4Tests = [
      { name: 'RBAC Matrix Implementation', test: this.testRBACMatrix.bind(this) },
      { name: 'Route Permission Enforcement', test: this.testRoutePermissions.bind(this) },
      { name: 'HMAC Signature Validation', test: this.testHMACValidation.bind(this) },
      { name: 'Input Canonicalization', test: this.testInputCanonicalization.bind(this) },
      { name: 'Security Headers Configuration', test: this.testSecurityHeaders.bind(this) },
      { name: 'API Key Scope Enforcement', test: this.testAPIKeyScopeEnforcement.bind(this) },
      { name: 'Rate Limiting Implementation', test: this.testRateLimiting.bind(this) },
      { name: 'Session Security', test: this.testSessionSecurity.bind(this) }
    ];

    for (const testCase of sprint4Tests) {
      try {
        console.log(`  🔒 Running: ${testCase.name}...`);
        await testCase.test();
        this.testResults.sprint4.passed++;
        this.testResults.sprint4.tests.push({
          name: testCase.name,
          status: 'PASSED',
          timestamp: new Date()
        });
        console.log(`    ✅ PASSED: ${testCase.name}`);
      } catch (error) {
        this.testResults.sprint4.failed++;
        this.testResults.sprint4.tests.push({
          name: testCase.name,
          status: 'FAILED',
          error: error.message,
          timestamp: new Date()
        });
        console.log(`    ❌ FAILED: ${testCase.name} - ${error.message}`);
      }
    }

    // Run comprehensive security test suite
    console.log('  🔒 Running comprehensive security regression tests...');
    try {
      const securityResults = await this.securityTestSuite.runAllTests();
      
      if (securityResults.failed === 0) {
        this.testResults.sprint4.passed++;
        this.testResults.sprint4.tests.push({
          name: 'Comprehensive Security Test Suite',
          status: 'PASSED',
          details: `${securityResults.passed} security tests passed`,
          timestamp: new Date()
        });
        console.log(`    ✅ PASSED: Security Test Suite (${securityResults.passed} tests)`);
      } else {
        this.testResults.sprint4.failed++;
        this.testResults.sprint4.tests.push({
          name: 'Comprehensive Security Test Suite',
          status: 'FAILED',
          error: `${securityResults.failed} security tests failed`,
          timestamp: new Date()
        });
        console.log(`    ❌ FAILED: Security Test Suite (${securityResults.failed} failed)`);
      }
    } catch (error) {
      this.testResults.sprint4.failed++;
      console.log(`    ❌ FAILED: Security Test Suite - ${error.message}`);
    }

    console.log(`\n📊 Sprint 4 Results: ${this.testResults.sprint4.passed} passed, ${this.testResults.sprint4.failed} failed`);
  }

  // ===== SPRINT 3 TEST IMPLEMENTATIONS =====

  async testMLModelsSchema() {
    // Test creating model with expanded schema
    const modelData = {
      name: 'Test ML Model',
      type: 'lstm',
      algorithmType: 'neural_network',
      targetTimeframe: '1h',
      symbols: ['BTC', 'ETH'],
      params: { layers: 3, neurons: 64, dropout: 0.2 },
      userId: 'test-user-id',
      trainingDataPoints: 1000
    };

    const model = await this.mlModelRepository.createModel(modelData);
    
    expect(model).to.have.property('id');
    expect(model).to.have.property('reproducibility_hash');
    expect(model.status).to.equal('draft');
    expect(model.params).to.deep.equal(modelData.params);
    expect(model.symbols).to.deep.equal(modelData.symbols);
    
    // Clean up
    await this.db('ml_models_expanded').where('id', model.id).del();
  }

  async testTrainingMetadataPersistence() {
    // Create a test model first
    const model = await this.mlModelRepository.createModel({
      name: 'Training Test Model',
      type: 'linear_regression',
      algorithmType: 'supervised',
      targetTimeframe: '4h',
      symbols: ['BTC'],
      params: { regularization: 0.01 },
      userId: 'test-user-id'
    });

    // Update training metadata
    const metadata = {
      metrics: { accuracy: 0.85, loss: 0.15 },
      artifactRef: '/models/artifacts/test-model.h5',
      trainingDataPoints: 5000
    };

    const updatedModel = await this.mlModelRepository.updateTrainingMetadata(model.id, metadata);
    
    expect(updatedModel.metrics).to.deep.equal(metadata.metrics);
    expect(updatedModel.artifact_ref).to.equal(metadata.artifactRef);
    expect(updatedModel.training_data_points).to.equal(metadata.trainingDataPoints);
    expect(updatedModel.last_trained).to.be.a('date');
    
    // Clean up
    await this.db('ml_models_expanded').where('id', model.id).del();
  }

  async testModelEvaluationMetrics() {
    // Create test model
    const model = await this.mlModelRepository.createModel({
      name: 'Metrics Test Model',
      type: 'random_forest',
      algorithmType: 'ensemble',
      targetTimeframe: '1d',
      symbols: ['ETH'],
      params: { n_estimators: 100 },
      userId: 'test-user-id'
    });

    // Store evaluation metrics
    const metrics = {
      accuracy: 0.78,
      rSquared: 0.65,
      mae: 0.12,
      mse: 0.025,
      sharpeRatio: 1.45,
      maxDrawdown: 0.15,
      winRate: 0.58,
      totalPredictions: 1000,
      correctPredictions: 780
    };

    const storedMetrics = await this.mlModelRepository.storeEvaluationMetrics(model.id, metrics);
    
    expect(storedMetrics).to.have.property('id');
    expect(storedMetrics.accuracy).to.equal(metrics.accuracy);
    expect(storedMetrics.r_squared).to.equal(metrics.rSquared);
    expect(storedMetrics.sharpe_ratio).to.equal(metrics.sharpeRatio);
    
    // Verify metrics are updated in model
    const updatedModel = await this.mlModelRepository.findById(model.id);
    expect(updatedModel.metrics).to.have.property('latest_accuracy', metrics.accuracy);
    
    // Clean up
    await this.db('model_performance').where('model_id', model.id).del();
    await this.db('ml_models_expanded').where('id', model.id).del();
  }

  async testModelReproducibilityHash() {
    const params = { learning_rate: 0.001, batch_size: 32 };
    const symbols = ['BTC', 'ETH'];
    const trainingDataPoints = 2000;

    // Generate hash
    const hash1 = this.mlModelRepository.generateReproducibilityHash(params, symbols, trainingDataPoints);
    const hash2 = this.mlModelRepository.generateReproducibilityHash(params, symbols, trainingDataPoints);
    
    expect(hash1).to.equal(hash2); // Same inputs should produce same hash
    expect(hash1).to.be.a('string').with.length(64); // SHA256 hash length
    
    // Different inputs should produce different hashes
    const hash3 = this.mlModelRepository.generateReproducibilityHash(params, ['LTC'], trainingDataPoints);
    expect(hash1).to.not.equal(hash3);
  }

  async testDeterministicBacktesting() {
    // Create test model
    const model = await this.mlModelRepository.createModel({
      name: 'Backtest Model',
      type: 'trend_following',
      algorithmType: 'technical',
      targetTimeframe: '1d',
      symbols: ['BTC'],
      params: { ma_short: 10, ma_long: 20 },
      userId: 'test-user-id'
    });

    // Get available fixtures
    const fixtures = await this.backtestHarness.getAvailableFixtures();
    expect(fixtures).to.be.an('array').with.length.at.least(1);
    
    const fixture = fixtures[0];
    expect(fixture).to.have.property('name');
    expect(fixture).to.have.property('data_checksum');
    
    // Run backtest
    const backtestParams = {
      initialCapital: 10000,
      transactionCost: 0.001,
      lookbackPeriod: 20
    };

    const results = await this.backtestHarness.runBacktest(model.id, fixture.id, backtestParams);
    
    expect(results).to.have.property('results');
    expect(results.results).to.have.property('total_return');
    expect(results.results).to.have.property('sharpe_ratio');
    expect(results.results).to.have.property('max_drawdown');
    expect(results).to.have.property('validation_hash');
    
    // Verify results are stored
    const validationResults = await this.backtestHarness.getValidationResults(model.id);
    expect(validationResults).to.be.an('array').with.length.at.least(1);
    
    // Clean up
    await this.db('model_fixture_validations').where('model_id', model.id).del();
    await this.db('ml_models_expanded').where('id', model.id).del();
  }

  async testStrategyLifecycle() {
    // Create test model
    const model = await this.mlModelRepository.createModel({
      name: 'Strategy Lifecycle Model',
      type: 'mean_reversion',
      algorithmType: 'statistical',
      targetTimeframe: '4h',
      symbols: ['ETH'],
      params: { lookback: 14, threshold: 2.0 },
      userId: 'test-user-id'
    });

    // Create strategy
    const strategyData = {
      modelId: model.id,
      userId: 'test-user-id',
      strategyName: 'Test Strategy',
      approvalCriteria: {
        min_accuracy: 0.6,
        min_sharpe: 0.8,
        max_drawdown: 0.2
      }
    };

    const strategy = await this.strategyLifecycleManager.createStrategy(strategyData);
    
    expect(strategy).to.have.property('id');
    expect(strategy.lifecycle_stage).to.equal('draft');
    expect(strategy.strategy_name).to.equal(strategyData.strategyName);
    
    // Test validation (will likely fail due to no performance history, but should not error)
    try {
      await this.strategyLifecycleManager.validateStrategy(strategy.id, 'test-user-id');
    } catch (error) {
      // Expected to fail validation due to no performance data
      expect(error.message).to.include('validation');
    }
    
    // Test status retrieval
    const strategies = await this.strategyLifecycleManager.getStrategies({
      userId: 'test-user-id',
      lifecycleStage: 'draft'
    });
    
    expect(strategies).to.be.an('array');
    expect(strategies.some(s => s.id === strategy.id)).to.be.true;
    
    // Clean up
    await this.db('strategy_lifecycle').where('id', strategy.id).del();
    await this.db('ml_models_expanded').where('id', model.id).del();
  }

  async testModelPerformanceTracking() {
    // Create test model
    const model = await this.mlModelRepository.createModel({
      name: 'Performance Tracking Model',
      type: 'lstm',
      algorithmType: 'neural_network',
      targetTimeframe: '1h',
      symbols: ['BTC'],
      params: { units: 50 },
      userId: 'test-user-id'
    });

    // Store multiple performance records
    const performanceData = [
      { accuracy: 0.75, sharpeRatio: 1.2, maxDrawdown: 0.1 },
      { accuracy: 0.78, sharpeRatio: 1.3, maxDrawdown: 0.12 },
      { accuracy: 0.73, sharpeRatio: 1.1, maxDrawdown: 0.15 }
    ];

    for (const perf of performanceData) {
      await this.mlModelRepository.storeEvaluationMetrics(model.id, perf);
    }

    // Get performance history
    const history = await this.mlModelRepository.getModelPerformanceHistory(model.id);
    
    expect(history).to.be.an('array').with.length(3);
    expect(history[0]).to.have.property('accuracy');
    expect(history[0]).to.have.property('sharpe_ratio');
    
    // Clean up
    await this.db('model_performance').where('model_id', model.id).del();
    await this.db('ml_models_expanded').where('id', model.id).del();
  }

  async testModelActivityAuditTrail() {
    // Create test model
    const model = await this.mlModelRepository.createModel({
      name: 'Audit Trail Model',
      type: 'svm',
      algorithmType: 'kernel',
      targetTimeframe: '2h',
      symbols: ['ETH'],
      params: { kernel: 'rbf', C: 1.0 },
      userId: 'test-user-id'
    });

    // Update model status (should create audit log entry)
    await this.mlModelRepository.updateModelStatus(model.id, 'validated', 'test-user-id', 'Model validation completed');

    // Get activity log
    const activityLog = await this.mlModelRepository.getModelActivityLog(model.id);
    
    expect(activityLog).to.be.an('array').with.length.at.least(2); // Creation + status change
    
    const statusChangeEntry = activityLog.find(entry => entry.action === 'status_changed');
    expect(statusChangeEntry).to.exist;
    expect(statusChangeEntry.status_from).to.equal('draft');
    expect(statusChangeEntry.status_to).to.equal('validated');
    
    // Clean up
    await this.db('model_activity_log').where('model_id', model.id).del();
    await this.db('ml_models_expanded').where('id', model.id).del();
  }

  // ===== SPRINT 4 TEST IMPLEMENTATIONS =====

  async testRBACMatrix() {
    // Test RBAC configuration loading
    expect(this.rbacMiddleware.permissionsConfig).to.exist;
    expect(this.rbacMiddleware.permissionsConfig.roles).to.have.property('admin');
    expect(this.rbacMiddleware.permissionsConfig.roles).to.have.property('trader');
    expect(this.rbacMiddleware.permissionsConfig.roles).to.have.property('viewer');
    
    // Test permission checking
    const adminPermissions = this.rbacMiddleware.getUserPermissions('admin');
    const viewerPermissions = this.rbacMiddleware.getUserPermissions('viewer');
    
    expect(adminPermissions).to.include('user:create');
    expect(adminPermissions).to.include('model:deploy');
    expect(viewerPermissions).to.not.include('user:create');
    expect(viewerPermissions).to.not.include('model:deploy');
  }

  async testRoutePermissions() {
    // Test that route permissions are properly configured
    const routePermissions = this.rbacMiddleware.permissionsConfig.route_permissions;
    
    expect(routePermissions).to.have.property('POST /api/ml-strategy/models');
    expect(routePermissions).to.have.property('POST /api/trading/orders');
    expect(routePermissions).to.have.property('GET /api/system/metrics');
    
    // Test permission inheritance
    const traderPermissions = this.rbacMiddleware.getUserPermissions('trader');
    const inheritedPermissions = this.rbacMiddleware.getInheritedPermissions(traderPermissions);
    
    expect(inheritedPermissions).to.be.an('array');
    expect(inheritedPermissions.length).to.be.at.least(traderPermissions.length);
  }

  async testHMACValidation() {
    // Test HMAC signature generation and validation
    const method = 'POST';
    const url = '/api/trading/orders';
    const body = { symbol: 'BTC', quantity: 0.01 };
    const timestamp = Date.now();
    const nonce = 'test-nonce-123';

    const signature = this.rbacMiddleware.generateHMAC(method, url, body, timestamp, nonce);
    
    expect(signature).to.be.a('string').with.length(64); // SHA256 hex length
    
    // Test validation (mocked request)
    const mockReq = {
      method,
      originalUrl: url,
      body,
      headers: {
        'x-hmac-signature': signature,
        'x-timestamp': timestamp.toString(),
        'x-nonce': nonce
      },
      route: { path: url }
    };

    const isValid = this.rbacMiddleware.validateHMAC(mockReq);
    expect(isValid).to.be.true;
    
    // Test invalid signature
    mockReq.headers['x-hmac-signature'] = 'invalid-signature';
    const isInvalid = this.rbacMiddleware.validateHMAC(mockReq);
    expect(isInvalid).to.be.false;
  }

  async testInputCanonicalization() {
    // Test string canonicalization
    const testStrings = [
      'normal string',
      'string\x00with\x01null\x02bytes',
      '  whitespace  trimmed  \t\n',
      'Unicode\u0301normalized'
    ];

    for (const testString of testStrings) {
      const canonicalized = this.securityService.canonicalizeString(testString);
      expect(canonicalized).to.be.a('string');
      expect(canonicalized).to.not.include('\x00');
      expect(canonicalized).to.not.include('\x01');
    }

    // Test SQL injection detection
    const sqlInjections = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "SELECT * FROM secrets"
    ];

    for (const injection of sqlInjections) {
      expect(() => this.securityService.canonicalizeString(injection))
        .to.throw('SQL injection');
    }

    // Test script injection detection
    const scriptInjections = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img onerror="alert(1)">'
    ];

    for (const injection of scriptInjections) {
      expect(() => this.securityService.canonicalizeString(injection))
        .to.throw('script injection');
    }
  }

  async testSecurityHeaders() {
    // Test that security service configures headers properly
    expect(this.securityService.securityPolicies).to.have.property('allowedOrigins');
    expect(this.securityService.securityPolicies).to.have.property('sessionTimeout');
    
    // Test CSP nonce generation
    const mockReq = { sessionID: 'test-session', ip: '127.0.0.1' };
    const nonce = this.securityService.generateCSPNonce(mockReq);
    
    expect(nonce).to.be.a('string');
    expect(nonce.length).to.be.greaterThan(0);
    
    // Test nonce storage and cleanup
    expect(this.securityService.cspNonces.has('test-session')).to.be.true;
  }

  async testAPIKeyScopeEnforcement() {
    // Test API key scope determination
    const mockReqs = [
      { method: 'POST', path: '/api/trading/orders' },
      { method: 'POST', path: '/api/ml-strategy/models' },
      { method: 'GET', path: '/api/ml-strategy/models' },
      { method: 'POST', path: '/api/ml-strategy/strategies/123/deploy' }
    ];

    const expectedScopes = [
      'trading:execute',
      'model:create',
      'read',
      'strategy:deploy'
    ];

    for (let i = 0; i < mockReqs.length; i++) {
      const scope = this.securityService.getRequiredScope(mockReqs[i]);
      expect(scope).to.equal(expectedScopes[i]);
    }
  }

  async testRateLimiting() {
    // Test rate limit calculation
    const mockUser = { id: 'test-user', role: 'trader' };
    const mockApiKey = { id: 'test-key' };

    // Multiple rapid calls should eventually trigger rate limiting
    let rateLimited = false;
    
    for (let i = 0; i < 600; i++) { // Exceed trader limit
      const result = await this.securityService.checkRateLimit(mockUser, null);
      if (!result.allowed) {
        rateLimited = true;
        expect(result).to.have.property('retryAfter');
        break;
      }
    }
    
    expect(rateLimited).to.be.true;
  }

  async testSessionSecurity() {
    // Test session timeout configuration
    expect(this.securityService.securityPolicies.sessionTimeout).to.be.a('number');
    expect(this.securityService.securityPolicies.sessionTimeout).to.be.greaterThan(0);
    
    // Test brute force protection
    expect(this.securityService.securityPolicies.maxLoginAttempts).to.equal(5);
    expect(this.securityService.securityPolicies.lockoutDuration).to.be.greaterThan(0);
  }

  /**
   * Calculate overall test results
   */
  calculateOverallResults() {
    this.testResults.overall.passed = this.testResults.sprint3.passed + this.testResults.sprint4.passed;
    this.testResults.overall.failed = this.testResults.sprint3.failed + this.testResults.sprint4.failed;
  }

  /**
   * Generate comprehensive test report
   */
  generateComprehensiveReport() {
    const total = this.testResults.overall.passed + this.testResults.overall.failed;
    const successRate = total > 0 ? Math.round((this.testResults.overall.passed / total) * 100) : 0;
    
    return `
Sprint 3 (ML & Strategy Legitimacy):
  ✅ Passed: ${this.testResults.sprint3.passed}
  ❌ Failed: ${this.testResults.sprint3.failed}
  
Sprint 4 (Security & Hardening):
  ✅ Passed: ${this.testResults.sprint4.passed}
  ❌ Failed: ${this.testResults.sprint4.failed}

Overall Results:
  📊 Total Tests: ${total}
  ✅ Passed: ${this.testResults.overall.passed}
  ❌ Failed: ${this.testResults.overall.failed}
  📈 Success Rate: ${successRate}%
  ⏱️  Duration: ${Math.round(this.testResults.overall.duration / 1000)}s

Sprint Completion Status:
  🎯 Sprint 3: ${this.testResults.sprint3.failed === 0 ? 'COMPLETE ✅' : 'INCOMPLETE ❌'}
  🔒 Sprint 4: ${this.testResults.sprint4.failed === 0 ? 'COMPLETE ✅' : 'INCOMPLETE ❌'}
`;
  }
}

module.exports = ComprehensiveTestRunner;