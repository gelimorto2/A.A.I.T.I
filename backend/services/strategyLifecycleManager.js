/**
 * Sprint 3: Strategy Lifecycle Management Service
 * Implements draft → validate → approve → deploy lifecycle for trading strategies
 */

class StrategyLifecycleManager {
  constructor(db, mlModelRepository, backtestHarness) {
    this.db = db;
    this.mlModelRepository = mlModelRepository;
    this.backtestHarness = backtestHarness;
    this.validStages = ['draft', 'validate', 'approve', 'deploy', 'retire'];
  }

  /**
   * Create new strategy lifecycle entry
   */
  async createStrategy(strategyData) {
    const {
      modelId,
      userId,
      strategyName,
      approvalCriteria = {}
    } = strategyData;

    // Verify model exists
    const model = await this.mlModelRepository.findById(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const strategy = {
      model_id: modelId,
      approver_id: userId,
      strategy_name: strategyName,
      status: 'draft',
      validation_results: JSON.stringify(approvalCriteria),
      notes: 'Strategy created in draft mode',
      created_at: new Date(),
      updated_at: new Date()
    };

    const [createdStrategy] = await this.db('strategy_lifecycle').insert(strategy).returning('*');
    
    console.log(`✅ Created strategy "${strategyName}" for model ${model.name}`);
    return this.formatStrategy(createdStrategy);
  }

  /**
   * Move strategy to validation stage
   */
  async validateStrategy(strategyId, userId, validationParams = {}) {
    const strategy = await this.getStrategy(strategyId);
    
    if (strategy.status !== 'draft') {
      throw new Error(`Strategy must be in draft stage to validate. Current stage: ${strategy.status}`);
    }

    console.log(`🔍 Validating strategy ${strategy.strategy_name}...`);

    // Run comprehensive validation tests
    const validationResults = await this.runValidationTests(strategy, validationParams);
    
    // Update strategy with validation results
    const updatedStrategy = await this.updateStrategyStage(
      strategyId, 
      'validate', 
      userId, 
      'Strategy validation completed',
      { validation_results: validationResults }
    );

    return {
      ...updatedStrategy,
      validation_results: validationResults
    };
  }

  /**
   * Approve strategy for deployment
   */
  async approveStrategy(strategyId, approverId, approvalNotes = '') {
    const strategy = await this.getStrategy(strategyId);
    
    if (strategy.status !== 'validating') {
      throw new Error(`Strategy must be validated before approval. Current stage: ${strategy.status}`);
    }

    // Check if validation meets approval criteria
    const validationResults = JSON.parse(strategy.validation_results || '{}');
    const approvalCriteria = JSON.parse(strategy.validation_results || '{}');
    
    const approvalCheck = this.checkApprovalCriteria(validationResults, approvalCriteria);
    
    if (!approvalCheck.approved) {
      throw new Error(`Strategy does not meet approval criteria: ${approvalCheck.reasons.join(', ')}`);
    }

    // Update strategy to approved
    const [updatedStrategy] = await this.db('strategy_lifecycle')
      .where('id', strategyId)
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    console.log(`✅ Strategy ${strategy.strategy_name} approved by user ${approverId}`);
    return this.formatStrategy(updatedStrategy);
  }

  /**
   * Deploy strategy to live trading
   */
  async deployStrategy(strategyId, deployerId, deploymentNotes = '') {
    const strategy = await this.getStrategy(strategyId);
    
    if (strategy.status !== 'approved') {
      throw new Error(`Strategy must be approved before deployment. Current stage: ${strategy.status}`);
    }

    // Final pre-deployment checks
    await this.runPreDeploymentChecks(strategy);

    // Update strategy to deployed
    const [deployedStrategy] = await this.db('strategy_lifecycle')
      .where('id', strategyId)
      .update({
        status: 'deploy',
        deployed_by: deployerId,
        deployed_at: new Date(),
        deployment_notes: deploymentNotes,
        is_live: true,
        updated_at: new Date()
      })
      .returning('*');

    console.log(`🚀 Strategy ${strategy.strategy_name} deployed to live trading`);
    
    // Also update the associated model status
    await this.mlModelRepository.updateModelStatus(
      strategy.model_id, 
      'deployed', 
      deployerId, 
      `Strategy ${strategy.strategy_name} deployed`
    );

    return this.formatStrategy(deployedStrategy);
  }

  /**
   * Retire strategy from live trading
   */
  async retireStrategy(strategyId, userId, retirementReason = '') {
    const strategy = await this.getStrategy(strategyId);
    
    const [retiredStrategy] = await this.db('strategy_lifecycle')
      .where('id', strategyId)
      .update({
        status: 'deprecated',
        deprecated_at: new Date(),
        deployment_notes: `${strategy.deployment_notes || ''}\nRetired: ${retirementReason}`,
        updated_at: new Date()
      })
      .returning('*');

    console.log(`🏁 Strategy ${strategy.strategy_name} retired from live trading`);
    return this.formatStrategy(retiredStrategy);
  }

  /**
   * Run comprehensive validation tests
   */
  async runValidationTests(strategy, params) {
    const results = {
      timestamp: new Date(),
      tests_passed: 0,
      tests_failed: 0,
      details: {}
    };

    try {
      // 1. Model Performance Validation
      console.log('Running model performance validation...');
      const modelPerformance = await this.validateModelPerformance(strategy.model_id);
      results.details.model_performance = modelPerformance;
      if (modelPerformance.passed) results.tests_passed++;
      else results.tests_failed++;

      // 2. Backtest Validation
      console.log('Running backtest validation...');
      const backtestResults = await this.validateBacktestResults(strategy.model_id, params);
      results.details.backtest = backtestResults;
      if (backtestResults.passed) results.tests_passed++;
      else results.tests_failed++;

      // 3. Risk Metrics Validation
      console.log('Running risk metrics validation...');
      const riskValidation = await this.validateRiskMetrics(strategy.model_id);
      results.details.risk_metrics = riskValidation;
      if (riskValidation.passed) results.tests_passed++;
      else results.tests_failed++;

      // 4. Technical Validation
      console.log('Running technical validation...');
      const technicalValidation = await this.validateTechnicalRequirements(strategy);
      results.details.technical = technicalValidation;
      if (technicalValidation.passed) results.tests_passed++;
      else results.tests_failed++;

      results.overall_passed = results.tests_failed === 0;
      console.log(`✅ Validation complete: ${results.tests_passed} passed, ${results.tests_failed} failed`);

    } catch (error) {
      console.error('❌ Validation failed:', error);
      results.error = error.message;
      results.overall_passed = false;
    }

    return results;
  }

  /**
   * Validate model performance metrics
   */
  async validateModelPerformance(modelId) {
    const performanceHistory = await this.mlModelRepository.getModelPerformanceHistory(modelId, 30);
    
    if (performanceHistory.length === 0) {
      return {
        passed: false,
        reason: 'No performance history available',
        details: {}
      };
    }

    const latestPerformance = performanceHistory[0];
    const avgAccuracy = performanceHistory.reduce((sum, p) => sum + (p.accuracy || 0), 0) / performanceHistory.length;
    const avgSharpe = performanceHistory.reduce((sum, p) => sum + (p.sharpe_ratio || 0), 0) / performanceHistory.length;

    const passed = avgAccuracy >= 0.55 && avgSharpe >= 0.5; // Minimum thresholds

    return {
      passed,
      reason: passed ? 'Performance metrics meet requirements' : 'Performance below minimum thresholds',
      details: {
        avg_accuracy: avgAccuracy,
        avg_sharpe: avgSharpe,
        data_points: performanceHistory.length,
        latest_accuracy: latestPerformance.accuracy,
        latest_sharpe: latestPerformance.sharpe_ratio
      }
    };
  }

  /**
   * Validate backtest results
   */
  async validateBacktestResults(modelId, params) {
    try {
      // Get available fixtures
      const fixtures = await this.backtestHarness.getAvailableFixtures();
      if (fixtures.length === 0) {
        return {
          passed: false,
          reason: 'No backtest fixtures available',
          details: {}
        };
      }

      // Run backtest on primary fixture
      const primaryFixture = fixtures[0];
      const backtestResult = await this.backtestHarness.runBacktest(modelId, primaryFixture.id, params);

      const minReturn = 0.05; // 5% minimum return
      const maxDrawdown = 0.25; // 25% maximum drawdown
      const minSharpe = 0.5; // Minimum Sharpe ratio

      const passed = 
        backtestResult.results.total_return >= minReturn &&
        backtestResult.results.max_drawdown <= maxDrawdown &&
        backtestResult.results.sharpe_ratio >= minSharpe;

      return {
        passed,
        reason: passed ? 'Backtest results meet requirements' : 'Backtest results below minimum thresholds',
        details: {
          total_return: backtestResult.results.total_return,
          max_drawdown: backtestResult.results.max_drawdown,
          sharpe_ratio: backtestResult.results.sharpe_ratio,
          win_rate: backtestResult.results.win_rate,
          fixture_used: primaryFixture.name
        }
      };

    } catch (error) {
      return {
        passed: false,
        reason: `Backtest validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate risk metrics
   */
  async validateRiskMetrics(modelId) {
    const model = await this.mlModelRepository.findById(modelId);
    const metrics = model.metrics || {};

    const maxDrawdownLimit = 0.20; // 20% maximum drawdown
    const minWinRateLimit = 0.45; // 45% minimum win rate

    const currentDrawdown = metrics.latest_drawdown || metrics.max_drawdown || 0;
    const currentWinRate = metrics.win_rate || 0.5;

    const passed = currentDrawdown <= maxDrawdownLimit && currentWinRate >= minWinRateLimit;

    return {
      passed,
      reason: passed ? 'Risk metrics within acceptable limits' : 'Risk metrics exceed limits',
      details: {
        current_drawdown: currentDrawdown,
        max_drawdown_limit: maxDrawdownLimit,
        current_win_rate: currentWinRate,
        min_win_rate_limit: minWinRateLimit
      }
    };
  }

  /**
   * Validate technical requirements
   */
  async validateTechnicalRequirements(strategy) {
    const model = await this.mlModelRepository.findById(strategy.model_id);
    
    const checks = {
      has_artifact: !!model.artifact_ref,
      has_reproducibility_hash: !!model.reproducibility_hash,
      has_training_data: model.training_data_points > 100,
      model_not_too_old: new Date() - new Date(model.last_trained || model.created_at) < 30 * 24 * 60 * 60 * 1000 // 30 days
    };

    const passed = Object.values(checks).every(check => check);

    return {
      passed,
      reason: passed ? 'All technical requirements met' : 'Some technical requirements not met',
      details: checks
    };
  }

  /**
   * Check if strategy meets approval criteria
   */
  checkApprovalCriteria(validationResults, approvalCriteria) {
    const reasons = [];
    let approved = true;

    // Default approval criteria if none specified
    const criteria = {
      min_accuracy: 0.55,
      min_sharpe: 0.5,
      max_drawdown: 0.25,
      min_tests_passed: 3,
      ...approvalCriteria
    };

    if (validationResults.tests_passed < criteria.min_tests_passed) {
      approved = false;
      reasons.push(`Insufficient tests passed: ${validationResults.tests_passed} < ${criteria.min_tests_passed}`);
    }

    if (validationResults.details?.model_performance?.details?.avg_accuracy < criteria.min_accuracy) {
      approved = false;
      reasons.push(`Accuracy below threshold: ${validationResults.details.model_performance.details.avg_accuracy} < ${criteria.min_accuracy}`);
    }

    if (validationResults.details?.backtest?.details?.sharpe_ratio < criteria.min_sharpe) {
      approved = false;
      reasons.push(`Sharpe ratio below threshold: ${validationResults.details.backtest.details.sharpe_ratio} < ${criteria.min_sharpe}`);
    }

    if (validationResults.details?.backtest?.details?.max_drawdown > criteria.max_drawdown) {
      approved = false;
      reasons.push(`Drawdown exceeds limit: ${validationResults.details.backtest.details.max_drawdown} > ${criteria.max_drawdown}`);
    }

    return { approved, reasons };
  }

  /**
   * Run pre-deployment checks
   */
  async runPreDeploymentChecks(strategy) {
    // Check for other live strategies for the same model
    const existingLiveStrategies = await this.db('strategy_lifecycle')
      .where('model_id', strategy.model_id)
      .where('status', 'deployed')
      .where('id', '!=', strategy.id);

    if (existingLiveStrategies.length > 0) {
      throw new Error(`Model ${strategy.model_id} already has live strategies. Retire existing strategies first.`);
    }

    // Additional deployment readiness checks can be added here
    console.log('✅ Pre-deployment checks passed');
  }

  /**
   * Update strategy lifecycle stage
   */
  async updateStrategyStage(strategyId, newStage, userId, notes, metadata = {}) {
    if (!this.validStages.includes(newStage)) {
      throw new Error(`Invalid lifecycle stage: ${newStage}`);
    }

    const updateData = {
      status: newStage,
      updated_at: new Date()
    };

    // Add metadata to validation_results if provided
    if (metadata.validation_results) {
      updateData.validation_results = JSON.stringify(metadata.validation_results);
    }

    const [updatedStrategy] = await this.db('strategy_lifecycle')
      .where('id', strategyId)
      .update(updateData)
      .returning('*');

    return this.formatStrategy(updatedStrategy);
  }

  /**
   * Get strategy by ID
   */
  async getStrategy(strategyId) {
    const strategy = await this.db('strategy_lifecycle')
      .where('id', strategyId)
      .first();

    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    return this.formatStrategy(strategy);
  }

  /**
   * Get strategies by criteria
   */
  async getStrategies(criteria = {}) {
    let query = this.db('strategy_lifecycle as sl')
      .leftJoin('ml_models_expanded as mme', 'sl.model_id', 'mme.id')
      .leftJoin('users as u', 'sl.approver_id', 'u.id');

    if (criteria.userId) {
      query = query.where('sl.approver_id', criteria.userId);
    }

    if (criteria.lifecycleStage) {
      query = query.where('sl.status', criteria.lifecycleStage);
    }

    if (criteria.isLive !== undefined) {
      query = query.where('sl.is_live', criteria.isLive);
    }

    const strategies = await query.select([
      'sl.*',
      'mme.name as model_name',
      'mme.type as model_type',
      'u.username',
      'u.email'
    ]).orderBy('sl.created_at', 'desc');

    return strategies.map(strategy => this.formatStrategy(strategy));
  }

  /**
   * Get strategy lifecycle statistics
   */
  async getLifecycleStatistics(userId = null) {
    let baseQuery = this.db('strategy_lifecycle');
    
    if (userId) {
      baseQuery = baseQuery.where('approver_id', userId);
    }

    const stageCounts = await baseQuery.clone()
      .select('status')
      .count('id as count')
      .groupBy('status');

    const [liveCount] = await baseQuery.clone().where('status', 'deployed').count('id as count');
    const [totalStrategies] = await baseQuery.clone().count('id as count');

    return {
      total_strategies: parseInt(totalStrategies.count),
      live_strategies: parseInt(liveCount.count),
      stage_breakdown: stageCounts.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {})
    };
  }

  /**
   * Format strategy data for API response
   */
  formatStrategy(strategy) {
    return {
      ...strategy,
      validation_results: typeof strategy.validation_results === 'string' ? 
        JSON.parse(strategy.validation_results) : strategy.validation_results,
      validation_results: typeof strategy.validation_results === 'string' ? 
        JSON.parse(strategy.validation_results) : strategy.validation_results
    };
  }

  /**
   * Submit strategy for validation (alias for createLifecycleEntry)
   */
  async submitForValidation(strategyId, requestedBy, validationCriteria) {
    return await this.createLifecycleEntry(strategyId, requestedBy, {
      validation_criteria: validationCriteria
    });
  }

  /**
   * Get strategy status (alias for getLifecycleEntry)
   */
  async getStrategyStatus(strategyId) {
    return await this.getLifecycleEntry(strategyId);
  }
}

module.exports = StrategyLifecycleManager;