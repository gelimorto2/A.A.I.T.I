/**
 * Walk-Forward Validation System - Sprint 3
 * Implements time-series cross-validation with expanding and rolling windows
 * for realistic model validation that respects temporal order
 */

const logger = require('../utils/logger');
const productionMLTrainingPipeline = require('./productionMLTrainingPipeline');

class WalkForwardValidator {
  constructor() {
    this.defaultConfig = {
      initialTrainSize: 0.6, // 60% initial training window
      testSize: 0.1, // 10% test window
      stepSize: 0.05, // 5% step forward each iteration
      windowType: 'expanding', // 'expanding' or 'rolling'
      minTrainSamples: 100
    };
  }

  /**
   * Perform walk-forward validation
   * @param {Array} data - Complete dataset
   * @param {Object} modelConfig - Model configuration
   * @param {Object} validationConfig - Validation parameters
   * @returns {Object} - Validation results with performance metrics
   */
  async validate(data, modelConfig, validationConfig = {}) {
    const config = { ...this.defaultConfig, ...validationConfig };
    
    logger.info(`Starting walk-forward validation: ${config.windowType} window`);
    logger.info(`Dataset size: ${data.length} samples`);
    
    const splits = this.generateSplits(data.length, config);
    logger.info(`Generated ${splits.length} validation splits`);
    
    const results = [];
    
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      logger.info(`\n=== Split ${i + 1}/${splits.length} ===`);
      logger.info(`Train: ${split.trainStart} to ${split.trainEnd} (${split.trainEnd - split.trainStart} samples)`);
      logger.info(`Test: ${split.testStart} to ${split.testEnd} (${split.testEnd - split.testStart} samples)`);
      
      try {
        // Prepare data for this split
        const trainData = data.slice(split.trainStart, split.trainEnd);
        const testData = data.slice(split.testStart, split.testEnd);
        
        // Train model on this window
        const model = await this.trainOnSplit(trainData, modelConfig, i);
        
        // Evaluate on test window
        const evaluation = await this.evaluateOnSplit(model, testData);
        
        results.push({
          splitIndex: i,
          split,
          modelId: model.id,
          ...evaluation,
          trainSize: trainData.length,
          testSize: testData.length
        });
        
        logger.info(`Split ${i + 1} complete - Test Accuracy: ${(evaluation.accuracy * 100).toFixed(2)}%`);
        
      } catch (error) {
        logger.error(`Error in split ${i + 1}:`, error);
        results.push({
          splitIndex: i,
          split,
          error: error.message,
          failed: true
        });
      }
    }
    
    // Aggregate results
    const aggregated = this.aggregateResults(results);
    
    logger.info('\n=== Walk-Forward Validation Complete ===');
    logger.info(`Average Test Accuracy: ${(aggregated.avgAccuracy * 100).toFixed(2)}%`);
    logger.info(`Std Dev: ${(aggregated.stdAccuracy * 100).toFixed(2)}%`);
    logger.info(`Best: ${(aggregated.bestAccuracy * 100).toFixed(2)}%`);
    logger.info(`Worst: ${(aggregated.worstAccuracy * 100).toFixed(2)}%`);
    
    return {
      config,
      splits: results,
      aggregated,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate split indices for walk-forward validation
   */
  generateSplits(dataLength, config) {
    const splits = [];
    
    const initialTrainSize = Math.floor(dataLength * config.initialTrainSize);
    const testSize = Math.floor(dataLength * config.testSize);
    const stepSize = Math.floor(dataLength * config.stepSize);
    
    let currentTrainEnd = initialTrainSize;
    
    while (currentTrainEnd + testSize <= dataLength) {
      const trainStart = config.windowType === 'expanding' 
        ? 0 
        : Math.max(0, currentTrainEnd - initialTrainSize);
      
      const split = {
        trainStart,
        trainEnd: currentTrainEnd,
        testStart: currentTrainEnd,
        testEnd: currentTrainEnd + testSize
      };
      
      // Ensure minimum training samples
      if (split.trainEnd - split.trainStart >= config.minTrainSamples) {
        splits.push(split);
      }
      
      currentTrainEnd += stepSize;
    }
    
    return splits;
  }

  /**
   * Train model on a specific split
   */
  async trainOnSplit(trainData, modelConfig, splitIndex) {
    const config = {
      ...modelConfig,
      name: `${modelConfig.name}_split${splitIndex}`,
      version: `${modelConfig.version}.${splitIndex}`,
      dataSource: {
        ...modelConfig.dataSource,
        data: trainData
      },
      trainingParams: {
        ...modelConfig.trainingParams,
        epochs: Math.min(modelConfig.trainingParams.epochs, 50) // Limit epochs for walk-forward
      }
    };
    
    // Use mock data for now (replace with actual training)
    const model = await productionMLTrainingPipeline.trainModel(config);
    
    return model;
  }

  /**
   * Evaluate model on test split
   */
  async evaluateOnSplit(model, testData) {
    // TODO: Implement actual prediction and evaluation
    // This is a simplified version
    
    const predictions = this.generatePredictions(model, testData);
    const actuals = this.extractLabels(testData);
    
    return this.calculateMetrics(predictions, actuals);
  }

  /**
   * Generate predictions (placeholder)
   */
  generatePredictions(model, testData) {
    // TODO: Use actual model.predict()
    // For now, return mock predictions
    return testData.map(() => Math.random() > 0.5 ? 1 : 0);
  }

  /**
   * Extract labels from test data
   */
  extractLabels(testData) {
    return testData.map((d, i) => {
      if (i >= testData.length - 1) return 0;
      const currentPrice = d.close || d.price || 100;
      const nextPrice = testData[i + 1].close || testData[i + 1].price || 100;
      return nextPrice > currentPrice ? 1 : 0;
    });
  }

  /**
   * Calculate evaluation metrics
   */
  calculateMetrics(predictions, actuals) {
    let correct = 0;
    let tp = 0, tn = 0, fp = 0, fn = 0;
    
    for (let i = 0; i < Math.min(predictions.length, actuals.length); i++) {
      const pred = predictions[i];
      const actual = actuals[i];
      
      if (pred === actual) correct++;
      
      if (pred === 1 && actual === 1) tp++;
      else if (pred === 0 && actual === 0) tn++;
      else if (pred === 1 && actual === 0) fp++;
      else if (pred === 0 && actual === 1) fn++;
    }
    
    const accuracy = correct / actuals.length;
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      truePositives: tp,
      trueNegatives: tn,
      falsePositives: fp,
      falseNegatives: fn,
      totalSamples: actuals.length
    };
  }

  /**
   * Aggregate results across all splits
   */
  aggregateResults(results) {
    const validResults = results.filter(r => !r.failed && !r.error);
    
    if (validResults.length === 0) {
      return {
        failed: true,
        error: 'All splits failed'
      };
    }
    
    const accuracies = validResults.map(r => r.accuracy);
    const precisions = validResults.map(r => r.precision);
    const recalls = validResults.map(r => r.recall);
    const f1Scores = validResults.map(r => r.f1Score);
    
    return {
      totalSplits: results.length,
      successfulSplits: validResults.length,
      failedSplits: results.length - validResults.length,
      
      avgAccuracy: this.mean(accuracies),
      stdAccuracy: this.std(accuracies),
      minAccuracy: Math.min(...accuracies),
      maxAccuracy: Math.max(...accuracies),
      
      avgPrecision: this.mean(precisions),
      avgRecall: this.mean(recalls),
      avgF1Score: this.mean(f1Scores),
      
      bestAccuracy: Math.max(...accuracies),
      worstAccuracy: Math.min(...accuracies),
      
      consistencyScore: 1 - (this.std(accuracies) / this.mean(accuracies)), // Higher is more consistent
      
      splitResults: validResults.map(r => ({
        splitIndex: r.splitIndex,
        accuracy: r.accuracy,
        precision: r.precision,
        recall: r.recall,
        f1Score: r.f1Score
      }))
    };
  }

  /**
   * Calculate mean
   */
  mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Calculate standard deviation
   */
  std(arr) {
    if (arr.length === 0) return 0;
    const avg = this.mean(arr);
    const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  /**
   * Perform anchored walk-forward (fixed origin, expanding window)
   */
  async anchoredWalkForward(data, modelConfig, config = {}) {
    return this.validate(data, modelConfig, {
      ...config,
      windowType: 'expanding'
    });
  }

  /**
   * Perform rolling walk-forward (fixed window size, sliding forward)
   */
  async rollingWalkForward(data, modelConfig, config = {}) {
    return this.validate(data, modelConfig, {
      ...config,
      windowType: 'rolling'
    });
  }

  /**
   * Generate validation report
   */
  generateReport(validationResults) {
    const report = {
      summary: {
        validationType: validationResults.config.windowType,
        totalSplits: validationResults.aggregated.totalSplits,
        successfulSplits: validationResults.aggregated.successfulSplits,
        avgAccuracy: (validationResults.aggregated.avgAccuracy * 100).toFixed(2) + '%',
        stdAccuracy: (validationResults.aggregated.stdAccuracy * 100).toFixed(2) + '%',
        consistencyScore: (validationResults.aggregated.consistencyScore * 100).toFixed(2) + '%'
      },
      performance: {
        best: {
          accuracy: (validationResults.aggregated.bestAccuracy * 100).toFixed(2) + '%',
          split: validationResults.splits.find(s => s.accuracy === validationResults.aggregated.bestAccuracy)?.splitIndex
        },
        worst: {
          accuracy: (validationResults.aggregated.worstAccuracy * 100).toFixed(2) + '%',
          split: validationResults.splits.find(s => s.accuracy === validationResults.aggregated.worstAccuracy)?.splitIndex
        },
        average: {
          precision: (validationResults.aggregated.avgPrecision * 100).toFixed(2) + '%',
          recall: (validationResults.aggregated.avgRecall * 100).toFixed(2) + '%',
          f1Score: (validationResults.aggregated.avgF1Score * 100).toFixed(2) + '%'
        }
      },
      recommendation: this.generateRecommendation(validationResults.aggregated),
      timestamp: validationResults.timestamp
    };
    
    return report;
  }

  /**
   * Generate recommendation based on results
   */
  generateRecommendation(aggregated) {
    const avgAcc = aggregated.avgAccuracy;
    const consistency = aggregated.consistencyScore;
    
    if (avgAcc > 0.6 && consistency > 0.8) {
      return {
        status: 'GOOD',
        message: 'Model shows good performance and consistency. Ready for production.',
        confidence: 'HIGH'
      };
    } else if (avgAcc > 0.55 && consistency > 0.7) {
      return {
        status: 'ACCEPTABLE',
        message: 'Model shows acceptable performance. Consider additional tuning.',
        confidence: 'MEDIUM'
      };
    } else if (avgAcc > 0.50) {
      return {
        status: 'MARGINAL',
        message: 'Model shows marginal performance. Significant improvements needed.',
        confidence: 'LOW'
      };
    } else {
      return {
        status: 'POOR',
        message: 'Model performance is poor. Not recommended for production.',
        confidence: 'VERY_LOW'
      };
    }
  }
}

module.exports = new WalkForwardValidator();
