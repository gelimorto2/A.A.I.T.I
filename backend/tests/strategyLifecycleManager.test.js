/**
 * Strategy Lifecycle Manager Tests
 * Comprehensive test suite for ML strategy lifecycle management
 */

const { expect } = require('chai');
const sinon = require('sinon');
const StrategyLifecycleManager = require('../../services/strategyLifecycleManager');

describe('Strategy Lifecycle Manager', function() {
  this.timeout(30000);

  let manager;
  let mockDb;
  let mockRepository;
  let mockBacktestHarness;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Mock database
    mockDb = createMockDb();

    // Mock ML repository
    mockRepository = {
      findById: sandbox.stub(),
      updateModelStatus: sandbox.stub().resolves(true),
      getModelPerformanceHistory: sandbox.stub().resolves([])
    };

    // Mock backtest harness
    mockBacktestHarness = {
      getAvailableFixtures: sandbox.stub().resolves([]),
      runBacktest: sandbox.stub().resolves({})
    };

    manager = new StrategyLifecycleManager(mockDb, mockRepository, mockBacktestHarness);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Strategy Creation', () => {
    it('should create strategy in draft state', async () => {
      mockRepository.findById.resolves({ id: 1, name: 'TestModel' });

      const strategy = await manager.createStrategy({
        modelId: 1,
        userId: 100,
        strategyName: 'Test Strategy'
      });

      expect(strategy).to.have.property('id');
      expect(strategy.status).to.equal('draft');
      expect(strategy.strategy_name).to.equal('Test Strategy');
      expect(mockDb.insert.called).to.be.true;
    });

    it('should reject creation if model does not exist', async () => {
      mockRepository.findById.resolves(null);

      try {
        await manager.createStrategy({
          modelId: 999,
          userId: 100,
          strategyName: 'Invalid Strategy'
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('not found');
      }
    });

    it('should store approval criteria', async () => {
      mockRepository.findById.resolves({ id: 1, name: 'TestModel' });

      const approvalCriteria = {
        min_accuracy: 0.7,
        min_sharpe: 1.5
      };

      const strategy = await manager.createStrategy({
        modelId: 1,
        userId: 100,
        strategyName: 'Test Strategy',
        approvalCriteria
      });

      expect(strategy.validation_results).to.deep.equal(approvalCriteria);
    });
  });

  describe('Validation Process', () => {
    it('should validate strategy from draft state', async () => {
      const draftStrategy = {
        id: 1,
        model_id: 1,
        status: 'draft',
        strategy_name: 'Test Strategy'
      };

      mockDb.where().first.resolves(draftStrategy);
      mockRepository.getModelPerformanceHistory.resolves([
        { accuracy: 0.75, sharpe_ratio: 1.2 }
      ]);
      mockBacktestHarness.getAvailableFixtures.resolves([
        { id: 1, name: 'Fixture 1' }
      ]);
      mockBacktestHarness.runBacktest.resolves({
        results: {
          total_return: 0.15,
          max_drawdown: 0.10,
          sharpe_ratio: 1.5,
          win_rate: 0.65
        }
      });
      mockRepository.findById.resolves({
        id: 1,
        artifact_ref: 'artifact123',
        reproducibility_hash: 'hash123',
        training_data_points: 500,
        last_trained: new Date()
      });

      const result = await manager.validateStrategy(1, 100);

      expect(result).to.have.property('validation_results');
      expect(result.validation_results.tests_passed).to.be.greaterThan(0);
    });

    it('should reject validation if not in draft state', async () => {
      const approvedStrategy = {
        id: 1,
        status: 'approved',
        strategy_name: 'Test Strategy'
      };

      mockDb.where().first.resolves(approvedStrategy);

      try {
        await manager.validateStrategy(1, 100);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('must be in draft');
      }
    });

    it('should run model performance validation', async () => {
      const performanceHistory = [
        { accuracy: 0.75, sharpe_ratio: 1.2 },
        { accuracy: 0.72, sharpe_ratio: 1.1 },
        { accuracy: 0.78, sharpe_ratio: 1.3 }
      ];

      mockRepository.getModelPerformanceHistory.resolves(performanceHistory);

      const result = await manager.validateModelPerformance(1);

      expect(result).to.have.property('passed');
      expect(result.details.avg_accuracy).to.be.closeTo(0.75, 0.05);
      expect(result.details.data_points).to.equal(3);
    });

    it('should fail validation if no performance history', async () => {
      mockRepository.getModelPerformanceHistory.resolves([]);

      const result = await manager.validateModelPerformance(1);

      expect(result.passed).to.be.false;
      expect(result.reason).to.include('No performance history');
    });

    it('should validate backtest results', async () => {
      mockBacktestHarness.getAvailableFixtures.resolves([
        { id: 1, name: 'BTC Historical 2024' }
      ]);
      mockBacktestHarness.runBacktest.resolves({
        results: {
          total_return: 0.25,
          max_drawdown: 0.15,
          sharpe_ratio: 1.8,
          win_rate: 0.70
        }
      });

      const result = await manager.validateBacktestResults(1, {});

      expect(result.passed).to.be.true;
      expect(result.details.total_return).to.equal(0.25);
    });

    it('should fail backtest validation if below thresholds', async () => {
      mockBacktestHarness.getAvailableFixtures.resolves([
        { id: 1, name: 'Test Fixture' }
      ]);
      mockBacktestHarness.runBacktest.resolves({
        results: {
          total_return: 0.02, // Below minimum
          max_drawdown: 0.30, // Above maximum
          sharpe_ratio: 0.3,  // Below minimum
          win_rate: 0.45
        }
      });

      const result = await manager.validateBacktestResults(1, {});

      expect(result.passed).to.be.false;
    });

    it('should validate risk metrics', async () => {
      mockRepository.findById.resolves({
        id: 1,
        metrics: {
          latest_drawdown: 0.12,
          win_rate: 0.58
        }
      });

      const result = await manager.validateRiskMetrics(1);

      expect(result.passed).to.be.true;
      expect(result.details.current_drawdown).to.equal(0.12);
    });

    it('should validate technical requirements', async () => {
      mockRepository.findById.resolves({
        id: 1,
        artifact_ref: 'artifact_path',
        reproducibility_hash: 'hash123',
        training_data_points: 1000,
        last_trained: new Date()
      });

      const result = await manager.validateTechnicalRequirements({ model_id: 1 });

      expect(result.passed).to.be.true;
      expect(result.details.has_artifact).to.be.true;
    });
  });

  describe('Approval Process', () => {
    it('should approve validated strategy', async () => {
      const validatedStrategy = {
        id: 1,
        status: 'validating',
        strategy_name: 'Test Strategy',
        validation_results: JSON.stringify({
          tests_passed: 4,
          tests_failed: 0,
          details: {
            model_performance: { details: { avg_accuracy: 0.75 } },
            backtest: {
              details: {
                sharpe_ratio: 1.5,
                max_drawdown: 0.15
              }
            }
          }
        })
      };

      mockDb.where().first.resolves(validatedStrategy);

      const result = await manager.approveStrategy(1, 200, 'Looks good');

      expect(result.status).to.equal('approved');
      expect(result.approved_by).to.equal(200);
    });

    it('should reject approval if not validated', async () => {
      const draftStrategy = {
        id: 1,
        status: 'draft',
        strategy_name: 'Test Strategy'
      };

      mockDb.where().first.resolves(draftStrategy);

      try {
        await manager.approveStrategy(1, 200);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('must be validated');
      }
    });

    it('should check approval criteria', () => {
      const validationResults = {
        tests_passed: 4,
        tests_failed: 0,
        details: {
          model_performance: { details: { avg_accuracy: 0.75 } },
          backtest: {
            details: {
              sharpe_ratio: 1.5,
              max_drawdown: 0.15
            }
          }
        }
      };

      const criteria = {
        min_accuracy: 0.60,
        min_sharpe: 1.0,
        max_drawdown: 0.25,
        min_tests_passed: 3
      };

      const result = manager.checkApprovalCriteria(validationResults, criteria);

      expect(result.approved).to.be.true;
      expect(result.reasons).to.be.empty;
    });

    it('should fail approval if criteria not met', () => {
      const validationResults = {
        tests_passed: 2,
        details: {
          model_performance: { details: { avg_accuracy: 0.50 } },
          backtest: {
            details: {
              sharpe_ratio: 0.3,
              max_drawdown: 0.30
            }
          }
        }
      };

      const criteria = {
        min_accuracy: 0.60,
        min_sharpe: 1.0,
        max_drawdown: 0.25,
        min_tests_passed: 3
      };

      const result = manager.checkApprovalCriteria(validationResults, criteria);

      expect(result.approved).to.be.false;
      expect(result.reasons.length).to.be.greaterThan(0);
    });
  });

  describe('Deployment Process', () => {
    it('should deploy approved strategy', async () => {
      const approvedStrategy = {
        id: 1,
        model_id: 1,
        status: 'approved',
        strategy_name: 'Test Strategy'
      };

      mockDb.where().first.resolves(approvedStrategy);
      mockDb.where().where().where().andWhere = sandbox.stub().resolves([]);

      const result = await manager.deployStrategy(1, 300, 'Deploy to production');

      expect(result.status).to.equal('deploy');
      expect(result.deployed_by).to.equal(300);
      expect(result.is_live).to.be.true;
      expect(mockRepository.updateModelStatus.called).to.be.true;
    });

    it('should reject deployment if not approved', async () => {
      const draftStrategy = {
        id: 1,
        status: 'draft',
        strategy_name: 'Test Strategy'
      };

      mockDb.where().first.resolves(draftStrategy);

      try {
        await manager.deployStrategy(1, 300);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('must be approved');
      }
    });

    it('should run pre-deployment checks', async () => {
      const strategy = { id: 1, model_id: 1 };

      mockDb.where().where().where().andWhere = sandbox.stub().resolves([]);

      await manager.runPreDeploymentChecks(strategy);

      // Should complete without error
      expect(mockDb.where.called).to.be.true;
    });

    it('should reject deployment if model already has live strategy', async () => {
      const strategy = { id: 1, model_id: 1 };
      const existingLiveStrategy = { id: 2, model_id: 1, status: 'deployed' };

      mockDb.where().where().where().andWhere = sandbox.stub().resolves([existingLiveStrategy]);

      try {
        await manager.runPreDeploymentChecks(strategy);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('already has live strategies');
      }
    });
  });

  describe('Retirement Process', () => {
    it('should retire deployed strategy', async () => {
      const deployedStrategy = {
        id: 1,
        status: 'deploy',
        strategy_name: 'Test Strategy'
      };

      mockDb.where().first.resolves(deployedStrategy);

      const result = await manager.retireStrategy(1, 400, 'Poor performance');

      expect(result.status).to.equal('deprecated');
      expect(result.deployment_notes).to.include('Poor performance');
    });

    it('should retire any strategy', async () => {
      const strategy = {
        id: 1,
        status: 'draft',
        strategy_name: 'Test Strategy'
      };

      mockDb.where().first.resolves(strategy);

      const result = await manager.retireStrategy(1, 400, 'No longer needed');

      expect(result.status).to.equal('deprecated');
    });
  });

  describe('Lifecycle Queries', () => {
    it('should get strategy by ID', async () => {
      const strategy = {
        id: 1,
        status: 'approved',
        strategy_name: 'Test Strategy',
        validation_results: '{}'
      };

      mockDb.where().first.resolves(strategy);

      const result = await manager.getStrategy(1);

      expect(result.id).to.equal(1);
      expect(result.status).to.equal('approved');
    });

    it('should get strategies by criteria', async () => {
      const strategies = [
        {
          id: 1,
          approver_id: 100,
          status: 'deployed',
          is_live: true,
          validation_results: '{}'
        },
        {
          id: 2,
          approver_id: 100,
          status: 'approved',
          is_live: false,
          validation_results: '{}'
        }
      ];

      mockDb.leftJoin().leftJoin().where().select().orderBy = sandbox.stub().resolves(strategies);

      const result = await manager.getStrategies({
        userId: 100,
        lifecycleStage: 'deployed'
      });

      expect(result).to.be.an('array');
      expect(result.length).to.be.greaterThan(0);
    });

    it('should get lifecycle statistics', async () => {
      const stageCounts = [
        { status: 'draft', count: '5' },
        { status: 'validating', count: '3' },
        { status: 'deployed', count: '2' }
      ];

      mockDb.select().count().groupBy = sandbox.stub().resolves(stageCounts);
      mockDb.clone().where().count = sandbox.stub().resolves([{ count: '2' }]);
      mockDb.clone().count = sandbox.stub().resolves([{ count: '10' }]);

      const result = await manager.getLifecycleStatistics();

      expect(result.total_strategies).to.equal(10);
      expect(result.live_strategies).to.equal(2);
      expect(result.stage_breakdown).to.have.property('draft');
    });
  });

  describe('Edge Cases', () => {
    it('should handle strategy not found', async () => {
      mockDb.where().first.resolves(null);

      try {
        await manager.getStrategy(999);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('not found');
      }
    });

    it('should handle invalid lifecycle stage', async () => {
      try {
        await manager.updateStrategyStage(1, 'invalid_stage', 100, 'notes');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Invalid lifecycle stage');
      }
    });

    it('should handle validation errors gracefully', async () => {
      const strategy = {
        id: 1,
        model_id: 1,
        status: 'draft',
        strategy_name: 'Test Strategy'
      };

      mockDb.where().first.resolves(strategy);
      mockRepository.getModelPerformanceHistory.rejects(new Error('Database error'));

      const result = await manager.validateStrategy(1, 100);

      expect(result.validation_results.error).to.include('Database error');
      expect(result.validation_results.overall_passed).to.be.false;
    });
  });
});

// Helper function to create mock database
function createMockDb() {
  const mockQuery = {
    insert: sinon.stub().returnsThis(),
    update: sinon.stub().returnsThis(),
    where: sinon.stub().returnsThis(),
    first: sinon.stub().resolves(null),
    returning: sinon.stub().resolves([{ id: 1, status: 'draft' }]),
    leftJoin: sinon.stub().returnsThis(),
    select: sinon.stub().returnsThis(),
    orderBy: sinon.stub().resolves([]),
    clone: sinon.stub().returnsThis(),
    count: sinon.stub().resolves([{ count: '0' }]),
    groupBy: sinon.stub().resolves([]),
    andWhere: sinon.stub().resolves([])
  };

  const mockDb = sinon.stub().returns(mockQuery);
  Object.assign(mockDb, mockQuery);

  return mockDb;
}
