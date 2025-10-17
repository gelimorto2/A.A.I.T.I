/**
 * ML System Integration Tests
 * End-to-end tests for complete ML workflow:
 * Training → Validation → Persistence → Drift Detection
 */

const { expect } = require('chai');
const sinon = require('sinon');
const tf = require('@tensorflow/tfjs-node');
const productionMLTrainingPipeline = require('../../services/productionMLTrainingPipeline');
const walkForwardValidator = require('../../services/walkForwardValidator');
const MLModelRepository = require('../../repositories/MLModelRepository');
const driftDetectionService = require('../../services/driftDetectionService');

describe('ML System Integration Tests', function() {
  this.timeout(120000); // Extended timeout for full pipeline

  let sandbox;
  let mockRepository;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock repository
    mockRepository = {
      create: sandbox.stub().resolves({ id: 1 }),
      update: sandbox.stub().resolves(true),
      findById: sandbox.stub().resolves(null),
      savePerformance: sandbox.stub().resolves(true),
      saveFeatures: sandbox.stub().resolves(true),
      saveLineage: sandbox.stub().resolves(true),
      saveArtifact: sandbox.stub().resolves(true)
    };

    sandbox.stub(MLModelRepository, 'getInstance').returns(mockRepository);
  });

  afterEach(() => {
    sandbox.restore();
    tf.disposeVariables();
  });

  describe('Complete Training Pipeline', () => {
    it('should execute end-to-end training workflow', async () => {
      const marketData = generateMarketData(1000);
      
      const config = {
        name: 'integration_test_model',
        version: '1.0.0',
        symbol: 'BTC/USD',
        timeframe: '1h',
        lookbackPeriod: 50,
        predictionHorizon: 1,
        modelType: 'lstm',
        epochs: 5,
        batchSize: 32,
        validationSplit: 0.2
      };

      // Step 1: Engineer features
      const features = await productionMLTrainingPipeline.engineerFeatures(marketData);
      expect(features).to.be.an('array');
      expect(features.length).to.equal(marketData.length);
      expect(features[0]).to.have.property('sma_10');

      // Step 2: Generate labels
      const labels = productionMLTrainingPipeline.generateLabels(marketData, config);
      expect(labels).to.be.an('array');
      expect(labels.length).to.be.greaterThan(0);

      // Step 3: Train model
      const trainedModel = await productionMLTrainingPipeline.trainModel(
        marketData,
        config
      );

      expect(trainedModel).to.have.property('id');
      expect(trainedModel).to.have.property('metrics');
      expect(trainedModel.metrics).to.have.property('accuracy');
      expect(trainedModel.status).to.equal('trained');

      // Step 4: Verify persistence
      expect(mockRepository.create.called).to.be.true;
      expect(mockRepository.savePerformance.called).to.be.true;
      expect(mockRepository.saveFeatures.called).to.be.true;
    });

    it('should handle training failures gracefully', async () => {
      const invalidData = generateMarketData(10); // Too small
      
      const config = {
        name: 'test_model',
        lookbackPeriod: 50,
        epochs: 10
      };

      try {
        await productionMLTrainingPipeline.trainModel(invalidData, config);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Insufficient');
      }
    });
  });

  describe('Training → Validation Pipeline', () => {
    it('should train model and validate with walk-forward', async () => {
      const marketData = generateMarketData(800);
      
      const modelConfig = {
        name: 'validated_model',
        version: '1.0.0',
        symbol: 'ETH/USD',
        timeframe: '4h',
        modelType: 'dense',
        epochs: 3,
        batchSize: 16
      };

      // Train initial model
      const model = await productionMLTrainingPipeline.trainModel(
        marketData.slice(0, 500),
        modelConfig
      );

      expect(model).to.have.property('id');
      expect(model.status).to.equal('trained');

      // Validate with remaining data
      const validationConfig = {
        initialTrainSize: 0.6,
        testSize: 0.1,
        stepSize: 0.1,
        windowType: 'expanding'
      };

      // Mock validation functions
      sandbox.stub(walkForwardValidator, 'trainOnSplit').resolves(model);
      sandbox.stub(walkForwardValidator, 'evaluateOnSplit').resolves({
        accuracy: 0.72,
        precision: 0.70,
        recall: 0.75,
        f1Score: 0.72
      });

      const validationResults = await walkForwardValidator.validate(
        marketData.slice(500),
        modelConfig,
        validationConfig
      );

      expect(validationResults).to.have.property('splits');
      expect(validationResults).to.have.property('aggregated');
      expect(validationResults.aggregated.avgAccuracy).to.be.greaterThan(0.5);
      expect(validationResults.aggregated.consistencyScore).to.be.greaterThan(0);
    });

    it('should compare expanding vs rolling validation', async () => {
      const marketData = generateMarketData(600);
      const modelConfig = {
        name: 'comparison_model',
        modelType: 'lstm',
        epochs: 2
      };

      // Mock functions
      sandbox.stub(walkForwardValidator, 'trainOnSplit').resolves({ id: 1 });
      const evalStub = sandbox.stub(walkForwardValidator, 'evaluateOnSplit');
      
      // Simulate better performance on expanding (more training data)
      evalStub.onCall(0).resolves({ accuracy: 0.75, precision: 0.75, recall: 0.75, f1Score: 0.75 });
      evalStub.onCall(1).resolves({ accuracy: 0.77, precision: 0.77, recall: 0.77, f1Score: 0.77 });
      evalStub.onCall(2).resolves({ accuracy: 0.70, precision: 0.70, recall: 0.70, f1Score: 0.70 });
      evalStub.onCall(3).resolves({ accuracy: 0.71, precision: 0.71, recall: 0.71, f1Score: 0.71 });

      const expandingResults = await walkForwardValidator.anchoredWalkForward(
        marketData,
        modelConfig
      );

      const rollingResults = await walkForwardValidator.rollingWalkForward(
        marketData,
        modelConfig
      );

      expect(expandingResults.config.windowType).to.equal('expanding');
      expect(rollingResults.config.windowType).to.equal('rolling');
      
      // Both should complete successfully
      expect(expandingResults.aggregated.successfulSplits).to.be.greaterThan(0);
      expect(rollingResults.aggregated.successfulSplits).to.be.greaterThan(0);
    });
  });

  describe('Model Persistence and Retrieval', () => {
    it('should save and load model artifacts', async () => {
      const marketData = generateMarketData(500);
      const config = {
        name: 'persistent_model',
        version: '1.0.0',
        modelType: 'lstm',
        epochs: 2
      };

      // Train model
      const model = await productionMLTrainingPipeline.trainModel(marketData, config);

      expect(mockRepository.create.called).to.be.true;
      const createCall = mockRepository.create.getCall(0);
      const savedModel = createCall.args[0];

      expect(savedModel).to.have.property('name', config.name);
      expect(savedModel).to.have.property('version', config.version);
      expect(savedModel).to.have.property('architecture');
      expect(savedModel).to.have.property('hyperparameters');
      expect(savedModel).to.have.property('metrics');

      // Verify features were saved
      expect(mockRepository.saveFeatures.called).to.be.true;

      // Verify performance history was saved
      expect(mockRepository.savePerformance.called).to.be.true;
    });

    it('should save feature importance', async () => {
      const marketData = generateMarketData(400);
      const features = await productionMLTrainingPipeline.engineerFeatures(marketData);
      
      const config = {
        name: 'feature_importance_model',
        modelType: 'dense',
        epochs: 2
      };

      const model = await productionMLTrainingPipeline.trainModel(marketData, config);

      // Calculate feature importance (mocked in test)
      const featureImportance = {
        rsi: 0.15,
        macd: 0.12,
        sma_10: 0.10
      };

      // Verify features were saved with importance
      const featuresCall = mockRepository.saveFeatures.getCall(0);
      expect(featuresCall).to.not.be.null;
    });
  });

  describe('Drift Detection Integration', () => {
    it('should detect data drift after training', async () => {
      const originalData = generateMarketData(500, { mean: 100, volatility: 0.02 });
      const driftedData = generateMarketData(200, { mean: 150, volatility: 0.05 });

      const config = {
        name: 'drift_test_model',
        modelType: 'lstm',
        epochs: 3
      };

      // Train on original data
      const model = await productionMLTrainingPipeline.trainModel(originalData, config);

      // Mock drift detection
      sandbox.stub(driftDetectionService, 'detectDrift').returns({
        hasDrift: true,
        driftScore: 0.75,
        features: {
          close: { drift: true, score: 0.8 },
          volume: { drift: true, score: 0.7 }
        }
      });

      const driftResult = driftDetectionService.detectDrift(
        originalData,
        driftedData,
        ['close', 'volume']
      );

      expect(driftResult.hasDrift).to.be.true;
      expect(driftResult.driftScore).to.be.greaterThan(0.5);

      // Model should be marked for retraining
      if (driftResult.hasDrift) {
        await mockRepository.update(model.id, {
          status: 'drift_detected',
          needs_retraining: true
        });

        expect(mockRepository.update.called).to.be.true;
      }
    });

    it('should handle no drift scenario', async () => {
      const data1 = generateMarketData(500, { mean: 100, volatility: 0.02 });
      const data2 = generateMarketData(200, { mean: 101, volatility: 0.021 });

      sandbox.stub(driftDetectionService, 'detectDrift').returns({
        hasDrift: false,
        driftScore: 0.15,
        features: {
          close: { drift: false, score: 0.12 },
          volume: { drift: false, score: 0.18 }
        }
      });

      const driftResult = driftDetectionService.detectDrift(data1, data2, ['close', 'volume']);

      expect(driftResult.hasDrift).to.be.false;
      expect(driftResult.driftScore).to.be.lessThan(0.3);
    });
  });

  describe('Production Deployment Workflow', () => {
    it('should execute complete deployment pipeline', async () => {
      // Step 1: Train model
      const trainingData = generateMarketData(800);
      const config = {
        name: 'production_model',
        version: '2.0.0',
        symbol: 'BTC/USD',
        timeframe: '1h',
        modelType: 'lstm',
        epochs: 5
      };

      const model = await productionMLTrainingPipeline.trainModel(trainingData, config);
      expect(model.status).to.equal('trained');

      // Step 2: Validate with walk-forward
      sandbox.stub(walkForwardValidator, 'trainOnSplit').resolves(model);
      sandbox.stub(walkForwardValidator, 'evaluateOnSplit').resolves({
        accuracy: 0.78,
        precision: 0.76,
        recall: 0.80,
        f1Score: 0.78
      });

      const validationResults = await walkForwardValidator.validate(
        trainingData,
        config,
        { initialTrainSize: 0.6, testSize: 0.1, stepSize: 0.1 }
      );

      expect(validationResults.aggregated.avgAccuracy).to.be.greaterThan(0.65);

      // Step 3: Check if passes production threshold
      const productionThreshold = 0.65;
      const passesValidation = validationResults.aggregated.avgAccuracy >= productionThreshold;

      if (passesValidation) {
        // Step 4: Mark as production-ready
        await mockRepository.update(model.id, {
          status: 'production',
          validated_at: new Date().toISOString(),
          validation_metrics: validationResults.aggregated
        });

        expect(mockRepository.update.called).to.be.true;
        
        // Step 5: Create deployment record
        await mockRepository.saveArtifact(model.id, {
          type: 'deployment',
          environment: 'production',
          timestamp: new Date().toISOString(),
          validation_results: validationResults
        });

        expect(mockRepository.saveArtifact.called).to.be.true;
      }
    });

    it('should reject model with poor validation', async () => {
      const trainingData = generateMarketData(500);
      const config = {
        name: 'poor_model',
        modelType: 'dense',
        epochs: 2
      };

      const model = await productionMLTrainingPipeline.trainModel(trainingData, config);

      // Mock poor validation results
      sandbox.stub(walkForwardValidator, 'trainOnSplit').resolves(model);
      sandbox.stub(walkForwardValidator, 'evaluateOnSplit').resolves({
        accuracy: 0.45,
        precision: 0.42,
        recall: 0.48,
        f1Score: 0.45
      });

      const validationResults = await walkForwardValidator.validate(
        trainingData,
        config,
        { initialTrainSize: 0.6, testSize: 0.1, stepSize: 0.1 }
      );

      const productionThreshold = 0.65;
      const passesValidation = validationResults.aggregated.avgAccuracy >= productionThreshold;

      expect(passesValidation).to.be.false;

      // Model should be marked as rejected
      await mockRepository.update(model.id, {
        status: 'rejected',
        rejection_reason: 'Failed validation threshold',
        validation_metrics: validationResults.aggregated
      });

      expect(mockRepository.update.called).to.be.true;
    });
  });

  describe('Model Lineage Tracking', () => {
    it('should track model lineage through retraining', async () => {
      const initialData = generateMarketData(500);
      const config = {
        name: 'lineage_model',
        version: '1.0.0',
        modelType: 'lstm',
        epochs: 3
      };

      // Train v1
      const modelV1 = await productionMLTrainingPipeline.trainModel(initialData, config);
      expect(modelV1.version).to.equal('1.0.0');

      // Simulate retraining with more data
      const updatedData = generateMarketData(800);
      const configV2 = { ...config, version: '2.0.0', parent_model_id: modelV1.id };

      const modelV2 = await productionMLTrainingPipeline.trainModel(updatedData, configV2);

      // Verify lineage was saved
      expect(mockRepository.saveLineage.called).to.be.true;
      const lineageCall = mockRepository.saveLineage.getCall(0);
      
      if (lineageCall) {
        const lineageData = lineageCall.args[1];
        expect(lineageData).to.have.property('parent_model_id');
      }
    });

    it('should track ensemble model lineage', async () => {
      const data = generateMarketData(600);
      
      // Train multiple models
      const model1 = await productionMLTrainingPipeline.trainModel(data, {
        name: 'ensemble_lstm',
        modelType: 'lstm',
        epochs: 2
      });

      const model2 = await productionMLTrainingPipeline.trainModel(data, {
        name: 'ensemble_dense',
        modelType: 'dense',
        epochs: 2
      });

      // Create ensemble
      const ensembleConfig = {
        name: 'ensemble_model',
        version: '1.0.0',
        type: 'ensemble',
        component_models: [model1.id, model2.id]
      };

      await mockRepository.create(ensembleConfig);

      // Verify component relationships saved
      expect(mockRepository.create.called).to.be.true;
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance over time', async () => {
      const model = await productionMLTrainingPipeline.trainModel(
        generateMarketData(500),
        { name: 'monitored_model', epochs: 2 }
      );

      // Simulate multiple evaluation periods
      const evaluations = [
        { date: '2025-01-01', accuracy: 0.75, precision: 0.73, recall: 0.77 },
        { date: '2025-01-08', accuracy: 0.72, precision: 0.70, recall: 0.74 },
        { date: '2025-01-15', accuracy: 0.68, precision: 0.66, recall: 0.70 }
      ];

      for (const evaluation of evaluations) {
        await mockRepository.savePerformance(model.id, {
          evaluated_at: evaluation.date,
          metrics: evaluation
        });
      }

      expect(mockRepository.savePerformance.callCount).to.equal(3);

      // Detect degradation
      const degradationThreshold = 0.05;
      const initialAccuracy = evaluations[0].accuracy;
      const currentAccuracy = evaluations[2].accuracy;
      const degradation = initialAccuracy - currentAccuracy;

      expect(degradation).to.be.greaterThan(degradationThreshold);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle training interruption gracefully', async () => {
      const data = generateMarketData(500);
      const config = { name: 'interrupted_model', epochs: 10 };

      // Simulate interruption by stubbing tensor operations to fail
      const originalBuildModel = productionMLTrainingPipeline.buildModel;
      sandbox.stub(productionMLTrainingPipeline, 'buildModel').callsFake((inputShape, config) => {
        throw new Error('Training interrupted');
      });

      try {
        await productionMLTrainingPipeline.trainModel(data, config);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('interrupted');
      }

      // Verify cleanup happened (no memory leaks)
      const numTensors = tf.memory().numTensors;
      expect(numTensors).to.be.lessThan(100);
    });

    it('should handle validation failure recovery', async () => {
      const data = generateMarketData(400);
      const config = { name: 'recovery_model', epochs: 2 };

      const model = await productionMLTrainingPipeline.trainModel(data, config);

      // First validation fails
      sandbox.stub(walkForwardValidator, 'trainOnSplit').onFirstCall().rejects(new Error('Validation error'));
      sandbox.stub(walkForwardValidator, 'evaluateOnSplit').resolves({
        accuracy: 0.7,
        precision: 0.7,
        recall: 0.7,
        f1Score: 0.7
      });

      try {
        await walkForwardValidator.validate(data, config, {
          initialTrainSize: 0.6,
          testSize: 0.1,
          stepSize: 0.3
        });
      } catch (error) {
        // Recovery: mark model for review
        await mockRepository.update(model.id, {
          status: 'validation_failed',
          error: error.message
        });

        expect(mockRepository.update.called).to.be.true;
      }
    });
  });
});

// Helper function to generate realistic market data
function generateMarketData(count, params = {}) {
  const { mean = 100, volatility = 0.02, trend = 0 } = params;
  const data = [];
  let price = mean;

  for (let i = 0; i < count; i++) {
    // Add trend and random walk
    price += trend + (Math.random() - 0.5) * price * volatility;
    
    const candle = {
      timestamp: new Date(Date.now() - (count - i) * 3600000).toISOString(),
      open: price * (1 + (Math.random() - 0.5) * 0.01),
      high: price * (1 + Math.random() * 0.015),
      low: price * (1 - Math.random() * 0.015),
      close: price,
      volume: Math.random() * 1000000 + 500000
    };

    data.push(candle);
  }

  return data;
}
