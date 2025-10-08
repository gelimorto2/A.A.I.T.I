/**
 * Sprint 3: ML Model Registry Test Suite
 * Tests for model versioning, persistence, and reproducibility
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs').promises;
const MLModelRegistry = require('../services/mlModelRegistry');

class MLModelRegistryTests {
  constructor(db) {
    this.db = db;
    this.registry = new MLModelRegistry(db);
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Run all ML Model Registry tests
   */
  async runAll() {
    console.log('🧪 Running ML Model Registry Tests...\n');

    await this.registry.initialize();

    await this.testRegisterModel();
    await this.testReproducibilityHash();
    await this.testModelVersioning();
    await this.testArtifactStorage();
    await this.testModelStatus();
    await this.testMetricsRecording();
    await this.testEvaluationStorage();
    await this.testModelComparison();

    this.printResults();
    return this.testResults;
  }

  /**
   * Test model registration
   */
  async testRegisterModel() {
    const testName = 'Model Registration';
    try {
      const modelData = {
        name: 'LSTM_Price_Predictor',
        type: 'LSTM',
        description: 'LSTM model for price prediction',
        params: {
          hiddenUnits: 128,
          layers: 3,
          dropout: 0.2,
          learningRate: 0.001
        },
        metrics: {
          mae: 0.05,
          rmse: 0.08,
          r2: 0.85
        },
        version: '1.0.0',
        dataChecksum: 'abc123',
        trainingSamples: 10000,
        validationSamples: 2000
      };

      const result = await this.registry.registerModel(modelData);

      assert(result.modelId, 'Model ID should be returned');
      assert(result.reproHash, 'Reproducibility hash should be generated');
      assert(result.reproHash.length === 64, 'Hash should be SHA256 (64 chars)');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test reproducibility hash generation
   */
  async testReproducibilityHash() {
    const testName = 'Reproducibility Hash';
    try {
      const params1 = { a: 1, b: 2 };
      const params2 = { a: 1, b: 2 };
      const params3 = { a: 1, b: 3 };

      const hash1 = this.registry.generateReproHash(params1, 'data123');
      const hash2 = this.registry.generateReproHash(params2, 'data123');
      const hash3 = this.registry.generateReproHash(params3, 'data123');

      // Different params should generate different hashes
      assert(hash1 !== hash3, 'Different params should generate different hashes');
      assert(hash1.length === 64, 'Hash should be 64 characters');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test model versioning
   */
  async testModelVersioning() {
    const testName = 'Model Versioning';
    try {
      // Register v1.0.0
      const v1 = await this.registry.registerModel({
        name: 'Test_Model_V1',
        type: 'GRU',
        params: { units: 64 },
        metrics: { accuracy: 0.8 },
        version: '1.0.0',
        dataChecksum: 'v1_data'
      });

      // Register v2.0.0 with different params
      const v2 = await this.registry.registerModel({
        name: 'Test_Model_V1',
        type: 'GRU',
        params: { units: 128 },
        metrics: { accuracy: 0.85 },
        version: '2.0.0',
        dataChecksum: 'v2_data'
      });

      assert(v1.modelId !== v2.modelId, 'Different versions should have different IDs');
      assert(v1.reproHash !== v2.reproHash, 'Different versions should have different hashes');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test artifact storage
   */
  async testArtifactStorage() {
    const testName = 'Artifact Storage';
    try {
      // Register a model
      const result = await this.registry.registerModel({
        name: 'Artifact_Test_Model',
        type: 'CNN',
        params: { filters: 32 },
        metrics: { accuracy: 0.9 },
        version: '1.0.0',
        dataChecksum: 'artifact_test'
      });

      // Save artifact
      const artifactData = {
        weights: [0.1, 0.2, 0.3],
        biases: [0.01, 0.02],
        architecture: { layers: 3 }
      };

      const artifactPath = await this.registry.saveArtifact(result.modelId, artifactData);

      assert(artifactPath, 'Artifact path should be returned');
      
      // Verify file exists
      const stats = await fs.stat(artifactPath);
      assert(stats.isFile(), 'Artifact file should exist');

      // Load artifact
      const loadedArtifact = await this.registry.loadArtifact(result.modelId);
      assert.deepStrictEqual(loadedArtifact, artifactData, 'Loaded artifact should match saved data');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test model status updates
   */
  async testModelStatus() {
    const testName = 'Model Status Updates';
    try {
      // Register a model
      const result = await this.registry.registerModel({
        name: 'Status_Test_Model',
        type: 'Transformer',
        params: { heads: 8 },
        metrics: { perplexity: 12.5 },
        version: '1.0.0',
        dataChecksum: 'status_test'
      });

      // Update to training
      await this.registry.updateModelStatus(result.modelId, 'training');
      let model = await this.db('ml_models').where({ id: result.modelId }).first();
      assert.strictEqual(model.status, 'training', 'Status should be training');

      // Update to active
      await this.registry.updateModelStatus(result.modelId, 'active');
      model = await this.db('ml_models').where({ id: result.modelId }).first();
      assert.strictEqual(model.status, 'active', 'Status should be active');
      assert(model.training_completed_at, 'Training completed timestamp should be set');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test metrics recording
   */
  async testMetricsRecording() {
    const testName = 'Metrics Recording';
    try {
      // Register a model
      const result = await this.registry.registerModel({
        name: 'Metrics_Test_Model',
        type: 'LSTM',
        params: { units: 64 },
        metrics: { accuracy: 0.8 },
        version: '1.0.0',
        dataChecksum: 'metrics_test'
      });

      // Record multiple metrics
      await this.registry.recordMetric(result.modelId, 'accuracy', 0.85);
      await this.registry.recordMetric(result.modelId, 'accuracy', 0.87);
      await this.registry.recordMetric(result.modelId, 'loss', 0.15);

      // Get metrics history
      const timeseries = await this.registry.getMetricsTimeSeries(result.modelId, 'accuracy');
      assert.strictEqual(timeseries.length, 2, 'Should have 2 accuracy metrics');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test evaluation storage
   */
  async testEvaluationStorage() {
    const testName = 'Evaluation Storage';
    try {
      // Register a model
      const result = await this.registry.registerModel({
        name: 'Eval_Test_Model',
        type: 'GRU',
        params: { units: 128 },
        metrics: { accuracy: 0.9 },
        version: '1.0.0',
        dataChecksum: 'eval_test'
      });

      // Store evaluation
      const evaluationData = {
        evaluationType: 'backtest',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        results: { trades: 100, wins: 60 },
        config: { commission: 0.001 },
        sharpeRatio: 1.5,
        maxDrawdown: 0.15,
        winRate: 0.6,
        profitFactor: 1.8
      };

      const evalId = await this.registry.storeEvaluation(result.modelId, evaluationData);
      assert(evalId, 'Evaluation ID should be returned');

      // Get model with history
      const model = await this.registry.getModelWithHistory(result.modelId);
      assert(model.evaluationHistory.length > 0, 'Should have evaluation history');

      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * Test model comparison
   */
  async testModelComparison() {
    const testName = 'Model Comparison';
    try {
      // Register two models
      const model1 = await this.registry.registerModel({
        name: 'Compare_Model_1',
        type: 'LSTM',
        params: { units: 64 },
        metrics: { accuracy: 0.8 },
        version: '1.0.0',
        dataChecksum: 'compare_1'
      });

      const model2 = await this.registry.registerModel({
        name: 'Compare_Model_2',
        type: 'GRU',
        params: { units: 128 },
        metrics: { accuracy: 0.85 },
        version: '1.0.0',
        dataChecksum: 'compare_2'
      });

      // Store evaluations
      await this.registry.storeEvaluation(model1.modelId, {
        evaluationType: 'backtest',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        results: {},
        sharpeRatio: 1.2
      });

      await this.registry.storeEvaluation(model2.modelId, {
        evaluationType: 'backtest',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        results: {},
        sharpeRatio: 1.5
      });

      // Compare models
      const comparison = await this.registry.compareModels(
        [model1.modelId, model2.modelId],
        'sharpe_ratio'
      );

      assert(comparison.models.length === 2, 'Should return 2 models');
      assert(comparison.evaluations[model1.modelId], 'Should have evaluations for model 1');
      assert(comparison.evaluations[model2.modelId], 'Should have evaluations for model 2');

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
    console.log('ML Model Registry Test Results:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📊 Total: ${this.testResults.tests.length}`);
    console.log('='.repeat(60) + '\n');
  }
}

module.exports = MLModelRegistryTests;
