/**
 * Walk-Forward Validation Tests
 * Test suite for time-series cross-validation system
 */

const { expect } = require('chai');
const sinon = require('sinon');
const walkForwardValidator = require('../../services/walkForwardValidator');
const productionMLTrainingPipeline = require('../../services/productionMLTrainingPipeline');

describe('Walk-Forward Validator', function() {
  this.timeout(60000); // Validation can take time

  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Split Generation', () => {
    it('should generate correct number of splits', () => {
      const config = {
        initialTrainSize: 0.6,
        testSize: 0.1,
        stepSize: 0.1,
        windowType: 'expanding',
        minTrainSamples: 50
      };

      const splits = walkForwardValidator.generateSplits(1000, config);

      expect(splits).to.be.an('array');
      expect(splits.length).to.be.greaterThan(0);
    });

    it('should respect minimum training samples', () => {
      const config = {
        initialTrainSize: 0.1,
        testSize: 0.1,
        stepSize: 0.1,
        windowType: 'expanding',
        minTrainSamples: 500
      };

      const splits = walkForwardValidator.generateSplits(1000, config);

      splits.forEach(split => {
        const trainSize = split.trainEnd - split.trainStart;
        expect(trainSize).to.be.at.least(config.minTrainSamples);
      });
    });

    it('should create expanding windows', () => {
      const config = {
        initialTrainSize: 0.5,
        testSize: 0.1,
        stepSize: 0.1,
        windowType: 'expanding',
        minTrainSamples: 50
      };

      const splits = walkForwardValidator.generateSplits(1000, config);

      splits.forEach(split => {
        expect(split.trainStart).to.equal(0); // Always starts at 0 for expanding
      });

      // Each subsequent split should have larger training window
      for (let i = 1; i < splits.length; i++) {
        const prevTrainSize = splits[i-1].trainEnd - splits[i-1].trainStart;
        const currTrainSize = splits[i].trainEnd - splits[i].trainStart;
        expect(currTrainSize).to.be.greaterThan(prevTrainSize);
      }
    });

    it('should create rolling windows', () => {
      const config = {
        initialTrainSize: 0.5,
        testSize: 0.1,
        stepSize: 0.1,
        windowType: 'rolling',
        minTrainSamples: 50
      };

      const splits = walkForwardValidator.generateSplits(1000, config);

      // Rolling window should maintain approximately constant size
      const expectedSize = Math.floor(1000 * 0.5);

      splits.forEach(split => {
        const trainSize = split.trainEnd - split.trainStart;
        expect(trainSize).to.be.closeTo(expectedSize, 100);
      });
    });

    it('should not overlap train and test sets', () => {
      const config = {
        initialTrainSize: 0.6,
        testSize: 0.1,
        stepSize: 0.05,
        windowType: 'expanding',
        minTrainSamples: 50
      };

      const splits = walkForwardValidator.generateSplits(1000, config);

      splits.forEach(split => {
        expect(split.testStart).to.equal(split.trainEnd); // No overlap
        expect(split.testEnd).to.be.greaterThan(split.testStart);
      });
    });

    it('should stay within data bounds', () => {
      const dataLength = 1000;
      const config = {
        initialTrainSize: 0.6,
        testSize: 0.1,
        stepSize: 0.1,
        windowType: 'expanding',
        minTrainSamples: 50
      };

      const splits = walkForwardValidator.generateSplits(dataLength, config);

      splits.forEach(split => {
        expect(split.trainStart).to.be.at.least(0);
        expect(split.trainEnd).to.be.at.most(dataLength);
        expect(split.testStart).to.be.at.least(0);
        expect(split.testEnd).to.be.at.most(dataLength);
      });
    });
  });

  describe('Label Extraction', () => {
    it('should extract binary labels from price data', () => {
      const testData = [
        { close: 100 },
        { close: 105 }, // up
        { close: 103 }, // down
        { close: 110 }, // up
        { close: 108 }  // down
      ];

      const labels = walkForwardValidator.extractLabels(testData);

      expect(labels).to.be.an('array');
      expect(labels[0]).to.equal(1); // 100 -> 105 = up
      expect(labels[1]).to.equal(0); // 105 -> 103 = down
      expect(labels[2]).to.equal(1); // 103 -> 110 = up
      expect(labels[3]).to.equal(0); // 110 -> 108 = down
    });

    it('should handle missing price field', () => {
      const testData = [
        { price: 100 },
        { price: 105 },
        { price: 103 }
      ];

      const labels = walkForwardValidator.extractLabels(testData);

      expect(labels).to.be.an('array');
      expect(labels.length).to.equal(3);
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate accuracy correctly', () => {
      const predictions = [1, 0, 1, 1, 0];
      const actuals =     [1, 0, 1, 0, 0];

      const metrics = walkForwardValidator.calculateMetrics(predictions, actuals);

      expect(metrics.accuracy).to.equal(0.8); // 4 out of 5 correct
    });

    it('should calculate precision and recall', () => {
      const predictions = [1, 1, 0, 0, 1];
      const actuals =     [1, 0, 0, 1, 1];

      const metrics = walkForwardValidator.calculateMetrics(predictions, actuals);

      // TP=2, FP=1, TN=1, FN=1
      expect(metrics.truePositives).to.equal(2);
      expect(metrics.falsePositives).to.equal(1);
      expect(metrics.trueNegatives).to.equal(1);
      expect(metrics.falseNegatives).to.equal(1);

      expect(metrics.precision).to.be.closeTo(2/3, 0.01); // TP/(TP+FP)
      expect(metrics.recall).to.be.closeTo(2/3, 0.01);    // TP/(TP+FN)
    });

    it('should calculate F1 score', () => {
      const predictions = [1, 1, 0, 0];
      const actuals =     [1, 0, 0, 1];

      const metrics = walkForwardValidator.calculateMetrics(predictions, actuals);

      const expectedF1 = 2 * (metrics.precision * metrics.recall) / 
                        (metrics.precision + metrics.recall);
      expect(metrics.f1Score).to.be.closeTo(expectedF1, 0.01);
    });

    it('should handle all correct predictions', () => {
      const predictions = [1, 0, 1, 0];
      const actuals =     [1, 0, 1, 0];

      const metrics = walkForwardValidator.calculateMetrics(predictions, actuals);

      expect(metrics.accuracy).to.equal(1.0);
      expect(metrics.precision).to.equal(1.0);
      expect(metrics.recall).to.equal(1.0);
      expect(metrics.f1Score).to.equal(1.0);
    });

    it('should handle all incorrect predictions', () => {
      const predictions = [1, 1, 0, 0];
      const actuals =     [0, 0, 1, 1];

      const metrics = walkForwardValidator.calculateMetrics(predictions, actuals);

      expect(metrics.accuracy).to.equal(0);
    });
  });

  describe('Result Aggregation', () => {
    it('should calculate average metrics', () => {
      const results = [
        { accuracy: 0.8, precision: 0.75, recall: 0.85, f1Score: 0.80 },
        { accuracy: 0.7, precision: 0.65, recall: 0.75, f1Score: 0.70 },
        { accuracy: 0.9, precision: 0.85, recall: 0.95, f1Score: 0.90 }
      ];

      const aggregated = walkForwardValidator.aggregateResults(results);

      expect(aggregated.avgAccuracy).to.be.closeTo(0.8, 0.01);
      expect(aggregated.avgPrecision).to.be.closeTo(0.75, 0.01);
      expect(aggregated.avgRecall).to.be.closeTo(0.85, 0.01);
    });

    it('should calculate standard deviation', () => {
      const results = [
        { accuracy: 0.8, precision: 0.8, recall: 0.8, f1Score: 0.8 },
        { accuracy: 0.6, precision: 0.6, recall: 0.6, f1Score: 0.6 },
        { accuracy: 0.7, precision: 0.7, recall: 0.7, f1Score: 0.7 }
      ];

      const aggregated = walkForwardValidator.aggregateResults(results);

      expect(aggregated.stdAccuracy).to.be.greaterThan(0);
      expect(aggregated.stdAccuracy).to.be.lessThan(0.2);
    });

    it('should identify best and worst splits', () => {
      const results = [
        { splitIndex: 0, accuracy: 0.7, precision: 0.7, recall: 0.7, f1Score: 0.7 },
        { splitIndex: 1, accuracy: 0.9, precision: 0.9, recall: 0.9, f1Score: 0.9 },
        { splitIndex: 2, accuracy: 0.5, precision: 0.5, recall: 0.5, f1Score: 0.5 }
      ];

      const aggregated = walkForwardValidator.aggregateResults(results);

      expect(aggregated.bestAccuracy).to.equal(0.9);
      expect(aggregated.worstAccuracy).to.equal(0.5);
    });

    it('should calculate consistency score', () => {
      const consistentResults = [
        { accuracy: 0.75, precision: 0.75, recall: 0.75, f1Score: 0.75 },
        { accuracy: 0.76, precision: 0.76, recall: 0.76, f1Score: 0.76 },
        { accuracy: 0.74, precision: 0.74, recall: 0.74, f1Score: 0.74 }
      ];

      const inconsistentResults = [
        { accuracy: 0.9, precision: 0.9, recall: 0.9, f1Score: 0.9 },
        { accuracy: 0.5, precision: 0.5, recall: 0.5, f1Score: 0.5 },
        { accuracy: 0.7, precision: 0.7, recall: 0.7, f1Score: 0.7 }
      ];

      const consistent = walkForwardValidator.aggregateResults(consistentResults);
      const inconsistent = walkForwardValidator.aggregateResults(inconsistentResults);

      expect(consistent.consistencyScore).to.be.greaterThan(inconsistent.consistencyScore);
    });

    it('should handle failed splits', () => {
      const results = [
        { accuracy: 0.8, precision: 0.8, recall: 0.8, f1Score: 0.8 },
        { failed: true, error: 'Training failed' },
        { accuracy: 0.7, precision: 0.7, recall: 0.7, f1Score: 0.7 }
      ];

      const aggregated = walkForwardValidator.aggregateResults(results);

      expect(aggregated.successfulSplits).to.equal(2);
      expect(aggregated.failedSplits).to.equal(1);
      expect(aggregated.avgAccuracy).to.be.closeTo(0.75, 0.01);
    });

    it('should handle all failed splits', () => {
      const results = [
        { failed: true, error: 'Error 1' },
        { failed: true, error: 'Error 2' }
      ];

      const aggregated = walkForwardValidator.aggregateResults(results);

      expect(aggregated.failed).to.be.true;
      expect(aggregated.error).to.include('All splits failed');
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', () => {
      const validationResults = {
        config: { windowType: 'expanding' },
        aggregated: {
          totalSplits: 5,
          successfulSplits: 5,
          avgAccuracy: 0.75,
          stdAccuracy: 0.05,
          consistencyScore: 0.93,
          bestAccuracy: 0.82,
          worstAccuracy: 0.68,
          avgPrecision: 0.74,
          avgRecall: 0.76,
          avgF1Score: 0.75
        },
        splits: [
          { splitIndex: 0, accuracy: 0.75 },
          { splitIndex: 1, accuracy: 0.82 }
        ],
        timestamp: new Date().toISOString()
      };

      const report = walkForwardValidator.generateReport(validationResults);

      expect(report).to.have.property('summary');
      expect(report).to.have.property('performance');
      expect(report).to.have.property('recommendation');
      expect(report.summary.avgAccuracy).to.equal('75.00%');
    });

    it('should include best and worst splits', () => {
      const validationResults = {
        config: { windowType: 'rolling' },
        aggregated: {
          totalSplits: 3,
          successfulSplits: 3,
          avgAccuracy: 0.7,
          stdAccuracy: 0.1,
          consistencyScore: 0.85,
          bestAccuracy: 0.8,
          worstAccuracy: 0.6,
          avgPrecision: 0.7,
          avgRecall: 0.7,
          avgF1Score: 0.7
        },
        splits: [
          { splitIndex: 0, accuracy: 0.7 },
          { splitIndex: 1, accuracy: 0.8 },
          { splitIndex: 2, accuracy: 0.6 }
        ],
        timestamp: new Date().toISOString()
      };

      const report = walkForwardValidator.generateReport(validationResults);

      expect(report.performance.best.split).to.equal(1);
      expect(report.performance.worst.split).to.equal(2);
    });
  });

  describe('Recommendations', () => {
    it('should recommend GOOD for high accuracy and consistency', () => {
      const aggregated = {
        avgAccuracy: 0.7,
        consistencyScore: 0.85
      };

      const rec = walkForwardValidator.generateRecommendation(aggregated);

      expect(rec.status).to.equal('GOOD');
      expect(rec.confidence).to.equal('HIGH');
    });

    it('should recommend ACCEPTABLE for moderate performance', () => {
      const aggregated = {
        avgAccuracy: 0.58,
        consistencyScore: 0.72
      };

      const rec = walkForwardValidator.generateRecommendation(aggregated);

      expect(rec.status).to.equal('ACCEPTABLE');
      expect(rec.confidence).to.equal('MEDIUM');
    });

    it('should recommend MARGINAL for borderline performance', () => {
      const aggregated = {
        avgAccuracy: 0.53,
        consistencyScore: 0.65
      };

      const rec = walkForwardValidator.generateRecommendation(aggregated);

      expect(rec.status).to.equal('MARGINAL');
      expect(rec.confidence).to.equal('LOW');
    });

    it('should recommend POOR for low performance', () => {
      const aggregated = {
        avgAccuracy: 0.48,
        consistencyScore: 0.5
      };

      const rec = walkForwardValidator.generateRecommendation(aggregated);

      expect(rec.status).to.equal('POOR');
      expect(rec.confidence).to.equal('VERY_LOW');
    });
  });

  describe('Statistical Functions', () => {
    it('should calculate mean correctly', () => {
      const values = [1, 2, 3, 4, 5];
      const mean = walkForwardValidator.mean(values);
      expect(mean).to.equal(3);
    });

    it('should calculate standard deviation correctly', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const std = walkForwardValidator.std(values);
      expect(std).to.be.closeTo(2, 0.1);
    });

    it('should handle empty arrays', () => {
      const mean = walkForwardValidator.mean([]);
      const std = walkForwardValidator.std([]);
      expect(mean).to.equal(0);
      expect(std).to.equal(0);
    });
  });

  describe('Integration Tests', () => {
    it('should validate with mock data', async function() {
      this.timeout(60000);

      // Mock training
      sandbox.stub(walkForwardValidator, 'trainOnSplit').resolves({
        id: 1,
        name: 'test_model'
      });

      // Mock evaluation
      sandbox.stub(walkForwardValidator, 'evaluateOnSplit').resolves({
        accuracy: 0.75,
        precision: 0.73,
        recall: 0.77,
        f1Score: 0.75
      });

      const mockData = generateMockData(500);
      const modelConfig = {
        name: 'test_model',
        version: '1.0.0',
        type: 'dense'
      };

      const config = {
        initialTrainSize: 0.6,
        testSize: 0.1,
        stepSize: 0.1,
        windowType: 'expanding'
      };

      const results = await walkForwardValidator.validate(mockData, modelConfig, config);

      expect(results).to.have.property('splits');
      expect(results).to.have.property('aggregated');
      expect(results).to.have.property('config');
      expect(results.splits.length).to.be.greaterThan(0);
    });

    it('should handle validation failures gracefully', async function() {
      this.timeout(60000);

      // Mock training to fail
      sandbox.stub(walkForwardValidator, 'trainOnSplit').rejects(new Error('Training failed'));

      const mockData = generateMockData(200);
      const modelConfig = { name: 'test_model' };
      const config = { initialTrainSize: 0.6, testSize: 0.1, stepSize: 0.2 };

      const results = await walkForwardValidator.validate(mockData, modelConfig, config);

      expect(results.splits.some(s => s.failed)).to.be.true;
    });
  });

  describe('Anchored vs Rolling', () => {
    it('should perform anchored walk-forward', async function() {
      this.timeout(60000);

      sandbox.stub(walkForwardValidator, 'trainOnSplit').resolves({ id: 1 });
      sandbox.stub(walkForwardValidator, 'evaluateOnSplit').resolves({
        accuracy: 0.7,
        precision: 0.7,
        recall: 0.7,
        f1Score: 0.7
      });

      const mockData = generateMockData(300);
      const modelConfig = { name: 'test' };

      const results = await walkForwardValidator.anchoredWalkForward(mockData, modelConfig);

      expect(results.config.windowType).to.equal('expanding');
    });

    it('should perform rolling walk-forward', async function() {
      this.timeout(60000);

      sandbox.stub(walkForwardValidator, 'trainOnSplit').resolves({ id: 1 });
      sandbox.stub(walkForwardValidator, 'evaluateOnSplit').resolves({
        accuracy: 0.7,
        precision: 0.7,
        recall: 0.7,
        f1Score: 0.7
      });

      const mockData = generateMockData(300);
      const modelConfig = { name: 'test' };

      const results = await walkForwardValidator.rollingWalkForward(mockData, modelConfig);

      expect(results.config.windowType).to.equal('rolling');
    });
  });
});

// Helper function
function generateMockData(count) {
  const data = [];
  let price = 100;

  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.5) * 2;
    data.push({
      timestamp: new Date(Date.now() - (count - i) * 3600000).toISOString(),
      close: price,
      open: price - Math.random(),
      high: price + Math.random(),
      low: price - Math.random(),
      volume: Math.random() * 1000000
    });
  }

  return data;
}
