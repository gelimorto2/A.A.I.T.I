/**
 * Sprint 3: Strategy Lifecycle Test Suite
 * Tests for strategy workflow: draft → validate → approve → deploy
 */

const assert = require('assert');
const StrategyLifecycleManager = require('../services/strategyLifecycleManager');
const DeterministicBacktestHarness = require('../services/deterministicBacktestHarness');

class StrategyLifecycleTests {
  constructor(db) {
    this.db = db;
    this.backtestHarness = new DeterministicBacktestHarness(db);
    
    // Mock risk engine
    this.mockRiskEngine = {
      validateStrategy: async (strategy) => ({
        passed: true,
        checks: ['position_limits', 'leverage', 'stop_loss']
      })
    };

    this.lifecycleManager = new StrategyLifecycleManager(
      db,
      this.backtestHarness,
      this.mockRiskEngine
    );

    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Run all strategy lifecycle tests
   */
  async runAll() {
    console.log('🧪 Running Strategy Lifecycle Tests...\n');

    // Setup test fixture
    await this.setupFixture();

    await this.testCreateStrategy();
    await this.testStrategyTransitions();
    await this.testValidateStrategy();
    await this.testApproveStrategy();
    await this.testDeployStrategy();
    await this.testInvalidTransitions();
    await this.testComplianceCheck();

    this.printResults();
    return this.testResults;
  }

  /**
   * Setup test fixture
   */
  async setupFixture() {
    const btcFixture = require('../fixtures/btc_daily_2023');
    try {
      await this.backtestHarness.createFixture(btcFixture);
    } catch (error) {
      // Fixture might already exist
      console.log('Note: Fixture already exists');
    }
  }

  /**
   * Test strategy creation
   */
  async testCreateStrategy() {
    const testName = 'Strategy Creation';
    try {
      const strategyData = {
        name: 'Test Momentum Strategy',
        description: 'A simple momentum trading strategy',
        type: 'momentum',
        config: {
          lookbackPeriod: 20,
          threshold: 0.02,
          maxPositionSize: 0.5,
          stopLoss: 0.05
        }
      };

      const result = await this.lifecycleManager.createStrategy(1, strategyData);

      assert(result.strategyId, 'Strategy ID should be returned');
      assert.strictEqual(result.status, 'draft', 'Initial status should be draft');
      assert.strictEqual(result.lifecycle_state, 'created', 'Initial state should be created');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test valid state transitions
   */
  async testStrategyTransitions() {
    const testName = 'Strategy State Transitions';
    try {
      // Test valid transitions
      assert(this.lifecycleManager.canTransition('draft', 'validate'), 'draft → validate should be valid');
      assert(this.lifecycleManager.canTransition('validate', 'approve'), 'validate → approve should be valid');
      assert(this.lifecycleManager.canTransition('approve', 'deploy'), 'approve → deploy should be valid');
      assert(this.lifecycleManager.canTransition('deploy', 'deprecated'), 'deploy → deprecated should be valid');

      // Test invalid transitions
      assert(!this.lifecycleManager.canTransition('draft', 'deploy'), 'draft → deploy should be invalid');
      assert(!this.lifecycleManager.canTransition('deprecated', 'deploy'), 'deprecated → deploy should be invalid');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test strategy validation
   */
  async testValidateStrategy() {
    const testName = 'Strategy Validation';
    try {
      // Create a strategy
      const result = await this.lifecycleManager.createStrategy(1, {
        name: 'Validation Test Strategy',
        type: 'momentum',
        config: {
          strategyType: 'momentum',
          lookbackPeriod: 20,
          maxPositionSize: 0.5,
          stopLoss: 0.05,
          leverage: 2
        }
      });

      // Validate the strategy
      const validation = await this.lifecycleManager.validateStrategy(result.strategyId, 1);

      assert(validation.validationResults, 'Validation results should be returned');
      assert(validation.validationResults.backtest, 'Should have backtest results');
      assert(validation.validationResults.riskCheck, 'Should have risk check results');
      assert(validation.validationResults.compliance, 'Should have compliance results');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test strategy approval
   */
  async testApproveStrategy() {
    const testName = 'Strategy Approval';
    try {
      // Create and validate a strategy
      const createResult = await this.lifecycleManager.createStrategy(1, {
        name: 'Approval Test Strategy',
        type: 'mean_reversion',
        config: {
          strategyType: 'mean_reversion',
          lookbackPeriod: 30,
          maxPositionSize: 0.3,
          stopLoss: 0.03,
          leverage: 1
        }
      });

      // Validate
      await this.lifecycleManager.validateStrategy(createResult.strategyId, 1);

      // Approve
      const approvalResult = await this.lifecycleManager.approveStrategy(
        createResult.strategyId,
        2,
        'Strategy meets all requirements'
      );

      assert.strictEqual(approvalResult.status, 'approve', 'Status should be approve');
      assert.strictEqual(approvalResult.approvedBy, 2, 'Approved by should be set');

      // Verify in database
      const strategy = await this.lifecycleManager.getStrategy(createResult.strategyId);
      assert(strategy.approved_by, 'Approved by should be set in database');
      assert(strategy.approved_at, 'Approved at timestamp should be set');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test strategy deployment
   */
  async testDeployStrategy() {
    const testName = 'Strategy Deployment';
    try {
      // Create, validate, and approve a strategy
      const createResult = await this.lifecycleManager.createStrategy(1, {
        name: 'Deploy Test Strategy',
        type: 'momentum',
        config: {
          strategyType: 'momentum',
          lookbackPeriod: 25,
          maxPositionSize: 0.4,
          stopLoss: 0.04,
          leverage: 1.5
        }
      });

      await this.lifecycleManager.validateStrategy(createResult.strategyId, 1);
      await this.lifecycleManager.approveStrategy(createResult.strategyId, 2, 'Approved for deployment');

      // Deploy
      const deployResult = await this.lifecycleManager.deployStrategy(createResult.strategyId, 1);

      assert.strictEqual(deployResult.status, 'deploy', 'Status should be deploy');
      assert(deployResult.deployedAt, 'Deployed at timestamp should be set');

      // Verify in database
      const strategy = await this.lifecycleManager.getStrategy(createResult.strategyId);
      assert(strategy.deployed_at, 'Deployed at should be set in database');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test invalid state transitions
   */
  async testInvalidTransitions() {
    const testName = 'Invalid State Transitions';
    try {
      // Create a strategy
      const result = await this.lifecycleManager.createStrategy(1, {
        name: 'Invalid Transition Test',
        type: 'momentum',
        config: {
          lookbackPeriod: 20,
          stopLoss: 0.05
        }
      });

      // Try to deploy directly from draft (should fail)
      let errorThrown = false;
      try {
        await this.lifecycleManager.deployStrategy(result.strategyId, 1);
      } catch (error) {
        errorThrown = true;
        assert(error.message.includes('Cannot deploy'), 'Error message should mention deployment restriction');
      }

      assert(errorThrown, 'Should throw error on invalid transition');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test compliance checking
   */
  async testComplianceCheck() {
    const testName = 'Compliance Checking';
    try {
      // Test compliant strategy
      const compliantStrategy = {
        config: JSON.stringify({
          maxPositionSize: 0.5,
          stopLoss: 0.05,
          leverage: 2
        })
      };

      const compliantResult = this.lifecycleManager.checkCompliance(compliantStrategy);
      assert(compliantResult.passed, 'Compliant strategy should pass');
      assert.strictEqual(compliantResult.issues.length, 0, 'Should have no issues');

      // Test non-compliant strategy (excessive position size)
      const nonCompliantStrategy = {
        config: JSON.stringify({
          maxPositionSize: 1.5,
          leverage: 10
        })
      };

      const nonCompliantResult = this.lifecycleManager.checkCompliance(nonCompliantStrategy);
      assert(!nonCompliantResult.passed, 'Non-compliant strategy should fail');
      assert(nonCompliantResult.issues.length > 0, 'Should have compliance issues');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Record test result
   */
  recordTest(name, passed, error = null) {
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${name}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${name}: ${error}`);
    }

    this.testResults.tests.push({
      name,
      passed,
      error
    });
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('Strategy Lifecycle Test Results:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📊 Total: ${this.testResults.tests.length}`);
    console.log('='.repeat(60) + '\n');
  }
}

module.exports = StrategyLifecycleTests;
