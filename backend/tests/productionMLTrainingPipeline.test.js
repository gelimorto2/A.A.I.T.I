/**
 * Production ML Training Pipeline Tests
 * Comprehensive test suite for Sprint 3 ML training pipeline
 */

const { expect } = require('chai');
const sinon = require('sinon');
const tf = require('@tensorflow/tfjs-node');
const productionMLTrainingPipeline = require('../../services/productionMLTrainingPipeline');
const mlModelRepository = require('../../repositories/mlModelRepository');

describe('Production ML Training Pipeline', function() {
  this.timeout(30000); // ML training can take time

  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    // Clean up TensorFlow memory
    tf.disposeVariables();
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration fields', () => {
      const invalidConfig = {
        name: 'test_model'
        // Missing required fields
      };

      expect(() => {
        productionMLTrainingPipeline.validateConfig(invalidConfig);
      }).to.throw('Missing required config field');
    });

    it('should reject invalid epochs', () => {
      const config = {
        name: 'test_model',
        version: '1.0.0',
        type: 'lstm',
        dataSource: {},
        architecture: {},
        trainingParams: { epochs: 0, batchSize: 32 }
      };

      expect(() => {
        productionMLTrainingPipeline.validateConfig(config);
      }).to.throw('Invalid epochs count');
    });

    it('should reject invalid batch size', () => {
      const config = {
        name: 'test_model',
        version: '1.0.0',
        type: 'lstm',
        dataSource: {},
        architecture: {},
        trainingParams: { epochs: 10, batchSize: -1 }
      };

      expect(() => {
        productionMLTrainingPipeline.validateConfig(config);
      }).to.throw('Invalid batch size');
    });

    it('should accept valid configuration', () => {
      const config = {
        name: 'test_model',
        version: '1.0.0',
        type: 'lstm',
        dataSource: { symbol: 'BTC/USD' },
        architecture: { type: 'dense' },
        trainingParams: { epochs: 10, batchSize: 32 }
      };

      expect(() => {
        productionMLTrainingPipeline.validateConfig(config);
      }).to.not.throw();
    });
  });

  describe('Feature Engineering', () => {
    it('should generate features from market data', async () => {
      const mockData = generateMockMarketData(100);

      const features = await productionMLTrainingPipeline.engineerFeatures(mockData);

      expect(features).to.be.an('array');
      expect(features.length).to.be.greaterThan(0);
      expect(features[0]).to.have.property('close');
      expect(features[0]).to.have.property('price_change_1');
      expect(features[0]).to.have.property('high_low_range');
    });

    it('should include technical indicators', async () => {
      const mockData = generateMockMarketData(100);

      const features = await productionMLTrainingPipeline.engineerFeatures(mockData);

      // Check for common technical indicators
      expect(features[0]).to.have.property('rsi');
      expect(features[0]).to.have.property('macd');
      expect(features[0]).to.have.property('sma_20');
    });

    it('should handle insufficient data gracefully', async () => {
      const mockData = generateMockMarketData(10); // Too little data

      const features = await productionMLTrainingPipeline.engineerFeatures(mockData);

      expect(features).to.be.an('array');
      // Should return empty or very few features
      expect(features.length).to.be.lessThan(10);
    });

    it('should include time-based features', async () => {
      const mockData = generateMockMarketData(100);

      const features = await productionMLTrainingPipeline.engineerFeatures(mockData);

      expect(features[0]).to.have.property('hour_of_day');
      expect(features[0]).to.have.property('day_of_week');
      expect(features[0]).to.have.property('day_of_month');
    });
  });

  describe('Label Generation', () => {
    it('should generate binary classification labels', () => {
      const mockData = generateMockMarketData(100);

      const labels = productionMLTrainingPipeline.generateLabels(mockData, 1);

      expect(labels).to.be.an('array');
      labels.forEach(label => {
        expect(label).to.be.oneOf([0, 1]);
      });
    });

    it('should respect prediction horizon', () => {
      const mockData = generateMockMarketData(100);

      const labels1 = productionMLTrainingPipeline.generateLabels(mockData, 1);
      const labels5 = productionMLTrainingPipeline.generateLabels(mockData, 5);

      expect(labels1.length).to.equal(labels5.length);
      // Different horizons should produce different labels
      expect(labels1).to.not.deep.equal(labels5);
    });
  });

  describe('Feature Normalization', () => {
    it('should normalize features to 0-1 range', () => {
      const features = [
        { price: 100, volume: 1000 },
        { price: 200, volume: 2000 },
        { price: 150, volume: 1500 }
      ];

      const { features: normalized, scaler } = productionMLTrainingPipeline.normalizeFeatures(features);

      normalized.forEach(feature => {
        Object.values(feature).forEach(value => {
          expect(value).to.be.at.least(0);
          expect(value).to.be.at.most(1);
        });
      });
    });

    it('should return scaler for inverse transform', () => {
      const features = [
        { price: 100, volume: 1000 },
        { price: 200, volume: 2000 }
      ];

      const { scaler } = productionMLTrainingPipeline.normalizeFeatures(features);

      expect(scaler).to.have.property('price');
      expect(scaler.price).to.have.property('min');
      expect(scaler.price).to.have.property('max');
      expect(scaler.price).to.have.property('mean');
    });

    it('should handle constant features', () => {
      const features = [
        { price: 100, volume: 100 },
        { price: 200, volume: 100 },
        { price: 150, volume: 100 }
      ];

      const { features: normalized } = productionMLTrainingPipeline.normalizeFeatures(features);

      // Constant feature should be normalized to 0
      normalized.forEach(feature => {
        expect(feature.volume).to.equal(0);
      });
    });
  });

  describe('Dataset Splitting', () => {
    it('should split data into train/val/test sets', () => {
      const mockDataset = {
        features: generateMockFeatures(1000),
        labels: generateMockLabels(1000)
      };

      const splits = productionMLTrainingPipeline.splitDataset(mockDataset);

      expect(splits).to.have.property('train');
      expect(splits).to.have.property('validation');
      expect(splits).to.have.property('test');
      expect(splits).to.have.property('stats');
    });

    it('should respect split ratios', () => {
      const mockDataset = {
        features: generateMockFeatures(1000),
        labels: generateMockLabels(1000)
      };

      const splits = productionMLTrainingPipeline.splitDataset(mockDataset);

      const total = splits.stats.train + splits.stats.validation + splits.stats.test;
      expect(total).to.equal(1000);

      // Check approximate ratios (70/20/10)
      expect(splits.stats.train).to.be.closeTo(700, 50);
      expect(splits.stats.validation).to.be.closeTo(200, 50);
      expect(splits.stats.test).to.be.closeTo(100, 50);
    });

    it('should preserve temporal order (no shuffling)', () => {
      const features = Array.from({ length: 100 }, (_, i) => ({ index: i }));
      const labels = Array.from({ length: 100 }, (_, i) => i);

      const mockDataset = { features, labels };
      const splits = productionMLTrainingPipeline.splitDataset(mockDataset);

      // Check that order is preserved
      splits.train.features.forEach((f, i) => {
        expect(f.index).to.equal(i);
      });
    });
  });

  describe('Model Architecture', () => {
    it('should build LSTM model', async () => {
      const architecture = {
        type: 'lstm',
        units: 64,
        learningRate: 0.001
      };

      const model = await productionMLTrainingPipeline.buildModel(architecture, 10);

      expect(model).to.be.an('object');
      expect(model.layers.length).to.be.greaterThan(0);

      // Clean up
      model.dispose();
    });

    it('should build Dense model', async () => {
      const architecture = {
        type: 'dense',
        layers: [128, 64, 32],
        learningRate: 0.001
      };

      const model = await productionMLTrainingPipeline.buildModel(architecture, 10);

      expect(model).to.be.an('object');
      expect(model.layers.length).to.be.greaterThan(0);

      // Clean up
      model.dispose();
    });

    it('should reject unknown architecture types', async () => {
      const architecture = {
        type: 'unknown_type'
      };

      try {
        await productionMLTrainingPipeline.buildModel(architecture, 10);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Unknown architecture type');
      }
    });

    it('should compile model with correct optimizer', async () => {
      const architecture = {
        type: 'dense',
        learningRate: 0.01
      };

      const model = await productionMLTrainingPipeline.buildModel(architecture, 10);

      // Model should be compiled (checking indirectly)
      expect(model.loss).to.not.be.undefined;
      expect(model.optimizer).to.not.be.undefined;

      model.dispose();
    });
  });

  describe('Model Training', () => {
    it('should train model successfully', async function() {
      this.timeout(30000);

      const model = await productionMLTrainingPipeline.buildModel(
        { type: 'dense', layers: [32, 16] },
        10
      );

      const splits = {
        train: {
          features: generateMockFeatures(100),
          labels: generateMockLabels(100)
        },
        validation: {
          features: generateMockFeatures(30),
          labels: generateMockLabels(30)
        }
      };

      const params = {
        epochs: 5,
        batchSize: 16
      };

      const result = await productionMLTrainingPipeline.train(model, splits, params);

      expect(result).to.have.property('history');
      expect(result).to.have.property('epochs', 5);
      expect(result).to.have.property('finalAccuracy');
      expect(result).to.have.property('trainingTime');

      model.dispose();
    });

    it('should record training history', async function() {
      this.timeout(30000);

      const model = await productionMLTrainingPipeline.buildModel(
        { type: 'dense', layers: [32] },
        10
      );

      const splits = {
        train: {
          features: generateMockFeatures(100),
          labels: generateMockLabels(100)
        },
        validation: {
          features: generateMockFeatures(30),
          labels: generateMockLabels(30)
        }
      };

      const result = await productionMLTrainingPipeline.train(
        model, 
        splits, 
        { epochs: 3, batchSize: 16 }
      );

      expect(result.history).to.have.property('loss');
      expect(result.history).to.have.property('acc');
      expect(result.history.loss).to.be.an('array').with.lengthOf(3);

      model.dispose();
    });
  });

  describe('Model Evaluation', () => {
    it('should evaluate model on test set', async function() {
      this.timeout(30000);

      const model = await productionMLTrainingPipeline.buildModel(
        { type: 'dense', layers: [32] },
        10
      );

      // Quick training
      const trainSplits = {
        train: {
          features: generateMockFeatures(50),
          labels: generateMockLabels(50)
        },
        validation: {
          features: generateMockFeatures(20),
          labels: generateMockLabels(20)
        }
      };

      await productionMLTrainingPipeline.train(
        model, 
        trainSplits, 
        { epochs: 2, batchSize: 16 }
      );

      const testSet = {
        features: generateMockFeatures(30),
        labels: generateMockLabels(30)
      };

      const evaluation = await productionMLTrainingPipeline.evaluate(model, testSet);

      expect(evaluation).to.have.property('testAccuracy');
      expect(evaluation).to.have.property('precision');
      expect(evaluation).to.have.property('recall');
      expect(evaluation).to.have.property('f1Score');

      model.dispose();
    });

    it('should calculate confusion matrix metrics', async function() {
      this.timeout(30000);

      const model = await productionMLTrainingPipeline.buildModel(
        { type: 'dense', layers: [16] },
        5
      );

      // Quick training
      const trainSplits = {
        train: {
          features: generateMockFeatures(50),
          labels: generateMockLabels(50)
        },
        validation: {
          features: generateMockFeatures(20),
          labels: generateMockLabels(20)
        }
      };

      await productionMLTrainingPipeline.train(
        model, 
        trainSplits, 
        { epochs: 2, batchSize: 16 }
      );

      const testSet = {
        features: generateMockFeatures(30),
        labels: generateMockLabels(30)
      };

      const evaluation = await productionMLTrainingPipeline.evaluate(model, testSet);

      expect(evaluation).to.have.property('truePositives');
      expect(evaluation).to.have.property('trueNegatives');
      expect(evaluation).to.have.property('falsePositives');
      expect(evaluation).to.have.property('falseNegatives');

      const total = evaluation.truePositives + evaluation.trueNegatives +
                   evaluation.falsePositives + evaluation.falseNegatives;
      expect(total).to.equal(30);

      model.dispose();
    });
  });

  describe('Feature Importance', () => {
    it('should calculate feature importance', async function() {
      this.timeout(30000);

      const model = await productionMLTrainingPipeline.buildModel(
        { type: 'dense', layers: [16] },
        5
      );

      // Quick training
      const trainSplits = {
        train: {
          features: generateMockFeatures(50),
          labels: generateMockLabels(50)
        },
        validation: {
          features: generateMockFeatures(20),
          labels: generateMockLabels(20)
        }
      };

      await productionMLTrainingPipeline.train(
        model, 
        trainSplits, 
        { epochs: 2, batchSize: 16 }
      );

      const testSet = {
        features: generateMockFeatures(30),
        labels: generateMockLabels(30)
      };

      const featureNames = ['feature1', 'feature2', 'feature3', 'feature4', 'feature5'];

      const importance = await productionMLTrainingPipeline.calculateFeatureImportance(
        model,
        testSet,
        featureNames
      );

      expect(importance).to.be.an('array');
      expect(importance.length).to.equal(5);
      importance.forEach(feat => {
        expect(feat).to.have.property('name');
        expect(feat).to.have.property('importance');
        expect(feat).to.have.property('type');
      });

      model.dispose();
    });

    it('should rank features by importance', async function() {
      this.timeout(30000);

      const model = await productionMLTrainingPipeline.buildModel(
        { type: 'dense', layers: [16] },
        5
      );

      const trainSplits = {
        train: {
          features: generateMockFeatures(50),
          labels: generateMockLabels(50)
        },
        validation: {
          features: generateMockFeatures(20),
          labels: generateMockLabels(20)
        }
      };

      await productionMLTrainingPipeline.train(
        model, 
        trainSplits, 
        { epochs: 2, batchSize: 16 }
      );

      const testSet = {
        features: generateMockFeatures(30),
        labels: generateMockLabels(30)
      };

      const featureNames = ['f1', 'f2', 'f3'];

      const importance = await productionMLTrainingPipeline.calculateFeatureImportance(
        model,
        testSet,
        featureNames
      );

      // Check that importance values are sorted descending
      for (let i = 0; i < importance.length - 1; i++) {
        expect(importance[i].importance).to.be.at.least(importance[i + 1].importance);
      }

      model.dispose();
    });
  });

  describe('Model Persistence', () => {
    it('should save model with metadata', async function() {
      this.timeout(30000);

      const saveStub = sandbox.stub(mlModelRepository, 'createModel').resolves({
        id: 1,
        name: 'test_model',
        version: '1.0.0'
      });

      const saveFeatureStub = sandbox.stub(mlModelRepository, 'saveFeatureImportance').resolves();

      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 1, inputShape: [5] }));
      model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy' });

      const config = {
        name: 'test_model',
        version: '1.0.0',
        type: 'dense',
        architecture: { type: 'dense' },
        trainingParams: { epochs: 10 },
        userId: 1
      };

      const trainingResult = {
        finalLoss: 0.5,
        finalAccuracy: 0.7,
        finalValLoss: 0.6,
        finalValAccuracy: 0.65,
        epochs: 10,
        trainingTime: 60
      };

      const evaluation = {
        testAccuracy: 0.68,
        precision: 0.7,
        recall: 0.65
      };

      const featureImportance = [
        { name: 'f1', importance: 0.5, type: 'technical' }
      ];

      const splitStats = {
        train: 70,
        validation: 20,
        test: 10
      };

      const saved = await productionMLTrainingPipeline.saveModel(
        model,
        config,
        trainingResult,
        evaluation,
        featureImportance,
        splitStats
      );

      expect(saveStub.calledOnce).to.be.true;
      expect(saveFeatureStub.calledOnce).to.be.true;
      expect(saved).to.have.property('id', 1);

      model.dispose();
    });
  });

  describe('Integration Test', () => {
    it('should complete full training pipeline', async function() {
      this.timeout(60000);

      // Mock repository methods
      sandbox.stub(mlModelRepository, 'createModel').resolves({
        id: 1,
        name: 'integration_test_model',
        version: '1.0.0'
      });
      sandbox.stub(mlModelRepository, 'saveFeatureImportance').resolves();

      // Mock data fetching
      sandbox.stub(productionMLTrainingPipeline, 'fetchMarketData')
        .resolves(generateMockMarketData(200));

      const config = {
        name: 'integration_test_model',
        version: '1.0.0',
        type: 'dense',
        dataSource: { symbol: 'BTC/USD' },
        architecture: {
          type: 'dense',
          layers: [32, 16],
          learningRate: 0.001
        },
        trainingParams: {
          epochs: 3,
          batchSize: 16
        },
        featureConfig: {},
        userId: 1
      };

      const result = await productionMLTrainingPipeline.trainModel(config);

      expect(result).to.have.property('id', 1);
      expect(result).to.have.property('name', 'integration_test_model');
    });
  });
});

// Helper functions
function generateMockMarketData(count) {
  const data = [];
  let price = 100;

  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.5) * 2;
    data.push({
      timestamp: new Date(Date.now() - (count - i) * 3600000).toISOString(),
      open: price,
      high: price + Math.random(),
      low: price - Math.random(),
      close: price,
      volume: Math.random() * 1000000
    });
  }

  return data;
}

function generateMockFeatures(count) {
  return Array.from({ length: count }, () => ({
    f1: Math.random(),
    f2: Math.random(),
    f3: Math.random(),
    f4: Math.random(),
    f5: Math.random()
  }));
}

function generateMockLabels(count) {
  return Array.from({ length: count }, () => Math.random() > 0.5 ? 1 : 0);
}
