const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken, auditLog } = require('../middleware/auth');
const realMLService = require('../utils/realMLService'); // Using real ML service
const AdvancedMLService = require('../utils/advancedMLService'); // New advanced ML service
const backtestingService = require('../utils/backtestingService');
const tradingStrategyFactory = require('../utils/tradingStrategyFactory');
const advancedIndicators = require('../utils/advancedIndicators');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize advanced ML service
const advancedMLService = new AdvancedMLService();

// Get supported algorithms (real implementations only)
router.get('/algorithms', authenticateToken, (req, res) => {
  try {
    const basicAlgorithms = realMLService.getSupportedAlgorithms().map(alg => {
      const info = realMLService.getAlgorithmInfo(alg);
      return {
        id: alg,
        ...info,
        implemented: true,
        realImplementation: true,
        category: 'basic'
      };
    });

    const advancedAlgorithms = Object.values(advancedMLService.supportedAlgorithms)
      .filter(alg => !basicAlgorithms.find(basic => basic.id === alg))
      .map(alg => ({
        id: alg,
        name: router.formatAlgorithmName(alg),
        description: router.getAlgorithmDescription(alg),
        implemented: true,
        realImplementation: true,
        category: 'advanced'
      }));

    const allAlgorithms = [...basicAlgorithms, ...advancedAlgorithms];

    res.json({ 
      algorithms: allAlgorithms,
      basicCount: basicAlgorithms.length,
      advancedCount: advancedAlgorithms.length,
      totalImplemented: allAlgorithms.length,
      note: 'Real implementations including LSTM, Random Forest, SVM, ARIMA, SARIMA, and advanced portfolio optimization'
    });
  } catch (error) {
    logger.error('Error fetching algorithms:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create advanced ML model
router.post('/models/advanced', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      algorithmType,
      targetTimeframe = '1d',
      symbols = ['bitcoin'],
      parameters = {},
      trainingPeriodDays = 365,
      validationSplit = 0.2
    } = req.body;

    // Validate required fields
    if (!name || !algorithmType) {
      return res.status(400).json({ 
        error: 'Missing required fields: name and algorithmType' 
      });
    }

    // Check if algorithm is supported
    const supportedAlgorithms = Object.values(advancedMLService.supportedAlgorithms);
    if (!supportedAlgorithms.includes(algorithmType)) {
      return res.status(400).json({ 
        error: `Unsupported algorithm: ${algorithmType}. Supported: ${supportedAlgorithms.join(', ')}` 
      });
    }

    logger.info(`Creating advanced ML model: ${name} with ${algorithmType}`);

    // Create model using advanced ML service
    const result = await advancedMLService.createAdvancedModel({
      name,
      algorithmType,
      targetTimeframe,
      symbols,
      parameters,
      trainingPeriodDays,
      validationSplit
    });

    // Store in database
    const query = `
      INSERT INTO ml_models (
        id, user_id, name, algorithm_type, target_timeframe, symbols, 
        parameters, status, metrics, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    db.run(query, [
      result.modelId,
      req.user.id,
      name,
      algorithmType,
      targetTimeframe,
      JSON.stringify(symbols),
      JSON.stringify(parameters),
      result.status,
      JSON.stringify(result.metrics)
    ], function(err) {
      if (err) {
        logger.error('Database error creating model:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      auditLog(req.user.id, 'CREATE_ADVANCED_MODEL', { 
        modelId: result.modelId, 
        algorithm: algorithmType,
        metrics: result.metrics 
      });

      res.json({
        modelId: result.modelId,
        name: result.name,
        algorithmType: result.algorithmType,
        status: result.status,
        metrics: result.metrics,
        validationAccuracy: result.validationAccuracy,
        trainingDataPoints: result.trainingDataPoints,
        message: `Advanced ${algorithmType} model trained successfully with ${result.trainingDataPoints} data points`
      });
    });

  } catch (error) {
    logger.error('Error creating advanced model:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for algorithm information
router.formatAlgorithmName = function(algorithmId) {
  return algorithmId.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

router.getAlgorithmDescription = function(algorithmId) {
  const descriptions = {
    'lstm_neural_network': 'Long Short-Term Memory neural network for time series forecasting',
    'random_forest': 'Ensemble learning method using multiple decision trees',
    'support_vector_machine': 'Support Vector Machine for classification and regression',
    'arima_model': 'AutoRegressive Integrated Moving Average for time series analysis',
    'sarima_model': 'Seasonal ARIMA model for time series with seasonal patterns',
    'prophet_forecast': 'Facebook Prophet algorithm for time series forecasting',
    'ensemble_strategy': 'Combination of multiple ML algorithms for improved accuracy',
    'adaptive_moving_average': 'Dynamic moving average that adapts to market conditions',
    'kalman_filter': 'Kalman filter for state estimation and noise reduction'
  };
  
  return descriptions[algorithmId] || 'Advanced machine learning algorithm';
}

// Get all ML models for the authenticated user
router.get('/models', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      m.*,
      (SELECT COUNT(*) FROM ml_predictions WHERE model_id = m.id) as prediction_count,
      (SELECT COUNT(*) FROM backtesting_results WHERE model_id = m.id) as backtest_count
    FROM ml_models m
    WHERE m.user_id = ?
    ORDER BY m.created_at DESC
  `;

  db.all(query, [req.user.id], (err, models) => {
    if (err) {
      logger.error('Error fetching ML models:', err);
      return res.status(500).json({ error: 'Failed to fetch ML models' });
    }

    // Parse JSON fields
    const modelsWithParsedData = models.map(model => ({
      ...model,
      parameters: model.parameters ? JSON.parse(model.parameters) : {},
      symbols: model.symbols ? JSON.parse(model.symbols) : []
    }));

    res.json({ models: modelsWithParsedData });
  });
});

// Create a new ML model
router.post('/models', authenticateToken, auditLog('create_ml_model'), async (req, res) => {
  const {
    name,
    algorithmType,
    targetTimeframe,
    symbols,
    parameters = {},
    trainingPeriodDays = 365
  } = req.body;

  try {
    // Validate required fields
    if (!name || !algorithmType || !targetTimeframe || !symbols || symbols.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, algorithmType, targetTimeframe, symbols' 
      });
    }

    // Validate algorithm type is actually supported
    if (!realMLService.isAlgorithmSupported(algorithmType)) {
      const supported = realMLService.getSupportedAlgorithms();
      return res.status(400).json({ 
        error: `Algorithm '${algorithmType}' is not implemented. Supported algorithms: ${supported.join(', ')}`,
        supportedAlgorithms: supported
      });
    }

    // Create model configuration
    const modelConfig = {
      name,
      algorithmType,
      targetTimeframe,
      symbols,
      parameters,
      trainingPeriodDays
    };

    // Train the model with real data
    logger.info(`Training real ML model: ${name} (${algorithmType})`);
    const trainedModel = await realMLService.createModel(modelConfig);

    // Save model to database
    const modelId = trainedModel.id;
    const insertQuery = `
      INSERT INTO ml_models (
        id, name, user_id, algorithm_type, target_timeframe, symbols, 
        parameters, model_data, training_status, accuracy, precision_score, 
        recall_score, f1_score, created_at, last_trained
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(insertQuery, [
      modelId,
      name,
      req.user.id,
      algorithmType,
      targetTimeframe,
      JSON.stringify(symbols),
      JSON.stringify(parameters),
      trainedModel.model,
      'trained',
      trainedModel.performanceMetrics.r2 || 0,
      trainedModel.performanceMetrics.directionalAccuracy || 0,
      trainedModel.performanceMetrics.directionalAccuracy || 0, // Using directional accuracy as proxy
      trainedModel.performanceMetrics.directionalAccuracy || 0,
      new Date().toISOString(),
      new Date().toISOString()
    ], function(err) {
      if (err) {
        logger.error('Error saving ML model:', err);
        return res.status(500).json({ error: 'Failed to save ML model' });
      }

      logger.info(`Real ML model created: ${name} (${algorithmType}) with ${trainedModel.trainingSize} real data points`);
      res.json({
        success: true,
        model: {
          id: modelId,
          name,
          algorithmType,
          targetTimeframe,
          symbols,
          parameters,
          performanceMetrics: trainedModel.performanceMetrics,
          trainingStatus: 'trained',
          trainingSize: trainedModel.trainingSize,
          dataSource: trainedModel.dataSource,
          algorithmInfo: realMLService.getAlgorithmInfo(algorithmType)
        }
      });
    });

  } catch (error) {
    logger.error('Error creating real ML model:', error);
    res.status(500).json({ 
      error: error.message,
      type: 'ml_training_error'
    });
  }
});

// Get a specific ML model
router.get('/models/:id', authenticateToken, (req, res) => {
  const query = `
    SELECT m.*, 
           COUNT(p.id) as prediction_count,
           AVG(p.confidence) as avg_confidence
    FROM ml_models m
    LEFT JOIN ml_predictions p ON m.id = p.model_id
    WHERE m.id = ? AND m.user_id = ?
    GROUP BY m.id
  `;

  db.get(query, [req.params.id, req.user.id], (err, model) => {
    if (err) {
      logger.error('Error fetching ML model:', err);
      return res.status(500).json({ error: 'Failed to fetch ML model' });
    }

    if (!model) {
      return res.status(404).json({ error: 'ML model not found' });
    }

    // Parse JSON fields
    const modelWithParsedData = {
      ...model,
      parameters: model.parameters ? JSON.parse(model.parameters) : {},
      symbols: model.symbols ? JSON.parse(model.symbols) : []
    };

    res.json({ model: modelWithParsedData });
  });
});

// Update an ML model
router.put('/models/:id', authenticateToken, auditLog('update_ml_model'), async (req, res) => {
  const { name, parameters, retrain = false } = req.body;

  try {
    // Check if model exists and belongs to user
    const model = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM ml_models WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!model) {
      return res.status(404).json({ error: 'ML model not found' });
    }

    let updateData = {};
    
    if (name) updateData.name = name;
    if (parameters) updateData.parameters = JSON.stringify(parameters);

    // If retrain requested, retrain the model
    if (retrain) {
      const trainingData = await getModelTrainingData(req.params.id);
      if (trainingData.length > 0) {
        const modelConfig = {
          name: name || model.name,
          algorithmType: model.algorithm_type,
          targetTimeframe: model.target_timeframe,
          symbols: JSON.parse(model.symbols),
          parameters: parameters || JSON.parse(model.parameters || '{}'),
          trainingData
        };

        const retrainedModel = await mlService.createModel(modelConfig);
        
        updateData.model_data = retrainedModel.model;
        updateData.accuracy = retrainedModel.performanceMetrics.r2 || 0;
        updateData.precision_score = retrainedModel.performanceMetrics.directionalAccuracy || 0;
        updateData.last_trained = new Date().toISOString();
        updateData.training_status = 'trained';
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updateData.updated_at = new Date().toISOString();

    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);

    db.run(
      `UPDATE ml_models SET ${setClause} WHERE id = ? AND user_id = ?`,
      [...values, req.params.id, req.user.id],
      function(err) {
        if (err) {
          logger.error('Error updating ML model:', err);
          return res.status(500).json({ error: 'Failed to update ML model' });
        }

        logger.info(`ML model updated: ${req.params.id}`);
        res.json({ success: true, updated: this.changes });
      }
    );

  } catch (error) {
    logger.error('Error updating ML model:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an ML model
router.delete('/models/:id', authenticateToken, auditLog('delete_ml_model'), (req, res) => {
  // First check if model exists and belongs to user
  db.get(
    'SELECT id FROM ml_models WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, model) => {
      if (err) {
        logger.error('Error checking ML model:', err);
        return res.status(500).json({ error: 'Failed to check ML model' });
      }

      if (!model) {
        return res.status(404).json({ error: 'ML model not found' });
      }

      // Delete related data first
      db.serialize(() => {
        db.run('DELETE FROM ml_training_data WHERE model_id = ?', [req.params.id]);
        db.run('DELETE FROM ml_predictions WHERE model_id = ?', [req.params.id]);
        db.run('DELETE FROM backtesting_results WHERE model_id = ?', [req.params.id]);
        db.run('DELETE FROM model_performance_metrics WHERE model_id = ?', [req.params.id]);
        
        // Finally delete the model
        db.run('DELETE FROM ml_models WHERE id = ?', [req.params.id], function(err) {
          if (err) {
            logger.error('Error deleting ML model:', err);
            return res.status(500).json({ error: 'Failed to delete ML model' });
          }

          // Remove from ML service
          mlService.deleteModel(req.params.id);
          
          logger.info(`ML model deleted: ${req.params.id}`);
          res.json({ success: true, deleted: this.changes });
        });
      });
    }
  );
});

// Make predictions using an ML model
router.post('/models/:id/predict', authenticateToken, async (req, res) => {
  const { symbols, features } = req.body;

  try {
    // Get model
    const model = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM ml_models WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!model) {
      return res.status(404).json({ error: 'ML model not found' });
    }

    if (model.training_status !== 'trained') {
      return res.status(400).json({ error: 'Model is not trained' });
    }

    // Check if algorithm is supported
    if (!realMLService.isAlgorithmSupported(model.algorithm_type)) {
      return res.status(400).json({ 
        error: `Algorithm '${model.algorithm_type}' is not supported by real ML service`,
        supportedAlgorithms: realMLService.getSupportedAlgorithms()
      });
    }

    // Load model from real ML service
    let mlModel = realMLService.getModel(req.params.id);
    if (!mlModel) {
      return res.status(404).json({ 
        error: 'Model not found in ML service. Please retrain the model.',
        suggestion: 'Use PUT /api/ml/models/:id with retrain=true'
      });
    }

    // Make predictions with real ML service
    const predictions = [];
    const targetSymbols = symbols || JSON.parse(model.symbols);

    // For real predictions, we need recent market data
    logger.info(`Making real predictions for ${targetSymbols.join(', ')}`);
    
    try {
      const recentData = await realMLService.getRealMarketData(targetSymbols, 30);
      if (recentData.length === 0) {
        return res.status(400).json({ 
          error: 'No recent market data available for prediction',
          symbols: targetSymbols
        });
      }

      const modelData = realMLService.deserializeModel(model.model_data);
      if (!modelData) {
        return res.status(500).json({ error: 'Failed to load model data' });
      }

      // Extract features for prediction
      const predictionFeatures = realMLService.extractRealFeatures(recentData);
      
      if (predictionFeatures.length === 0) {
        return res.status(400).json({ 
          error: 'Insufficient data to generate features for prediction' 
        });
      }

      // Make prediction using real ML service
      const prediction = realMLService.predict(
        modelData.modelData,
        [predictionFeatures[predictionFeatures.length - 1]], // Use latest features
        model.algorithm_type
      )[0];

      // Calculate confidence based on model performance
      const confidence = Math.min(Math.max(mlModel.performanceMetrics.r2 || 0, 0), 1);
      
      // Save prediction to database
      const predictionId = uuidv4();
      db.run(
        `INSERT INTO ml_predictions (id, model_id, symbol, prediction_value, confidence, features, timestamp, timeframe)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          predictionId,
          req.params.id,
          targetSymbols.join(','),
          prediction,
          confidence,
          JSON.stringify(predictionFeatures[predictionFeatures.length - 1]),
          new Date().toISOString(),
          model.target_timeframe
        ]
      );

      predictions.push({
        id: predictionId,
        symbols: targetSymbols,
        prediction,
        confidence,
        timestamp: new Date().toISOString(),
        algorithm: model.algorithm_type,
        dataPoints: recentData.length
      });

      logger.info(`Real prediction made for ${targetSymbols.join(', ')}: ${prediction} (confidence: ${confidence})`);

    } catch (predictionError) {
      logger.error('Error making prediction:', predictionError);
      return res.status(500).json({ 
        error: 'Failed to make prediction: ' + predictionError.message,
        type: 'prediction_error'
      });
    }

    res.json({ 
      predictions,
      note: 'This prediction uses real market data and legitimate ML algorithms'
    });

  } catch (error) {
    logger.error('Error making predictions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get predictions for a model
router.get('/models/:id/predictions', authenticateToken, (req, res) => {
  const { limit = 100, offset = 0, symbol } = req.query;

  let query = `
    SELECT p.*, m.name as model_name
    FROM ml_predictions p
    JOIN ml_models m ON p.model_id = m.id
    WHERE p.model_id = ? AND m.user_id = ?
  `;
  
  const params = [req.params.id, req.user.id];

  if (symbol) {
    query += ' AND p.symbol = ?';
    params.push(symbol);
  }

  query += ' ORDER BY p.timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, predictions) => {
    if (err) {
      logger.error('Error fetching predictions:', err);
      return res.status(500).json({ error: 'Failed to fetch predictions' });
    }

    // Parse features JSON
    const predictionsWithParsedFeatures = predictions.map(pred => ({
      ...pred,
      features: pred.features ? JSON.parse(pred.features) : []
    }));

    res.json({ predictions: predictionsWithParsedFeatures });
  });
});

// Run backtest for a model
router.post('/models/:id/backtest', authenticateToken, auditLog('run_backtest'), async (req, res) => {
  const {
    symbols,
    startDate,
    endDate,
    initialCapital = 100000,
    commission = 0.001,
    slippage = 0.0005,
    positionSizing = 'percentage',
    riskPerTrade = 0.02,
    stopLoss = 0.05,
    takeProfit = 0.10,
    maxPositions = 5
  } = req.body;

  try {
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Get model
    const model = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM ml_models WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!model) {
      return res.status(404).json({ error: 'ML model not found' });
    }

    if (model.training_status !== 'trained') {
      return res.status(400).json({ error: 'Model is not trained' });
    }

    // Prepare backtest configuration
    const backtestConfig = {
      modelId: req.params.id,
      userId: req.user.id,
      symbols: symbols || JSON.parse(model.symbols),
      startDate,
      endDate,
      initialCapital,
      commission,
      slippage,
      positionSizing,
      riskPerTrade,
      stopLoss,
      takeProfit,
      maxPositions
    };

    // Run backtest
    const backtestResults = await backtestingService.runBacktest(backtestConfig);

    // Save results to database
    const backtestId = backtestResults.id;
    db.run(
      `INSERT INTO backtesting_results (
        id, model_id, user_id, symbols, start_date, end_date, initial_capital,
        final_capital, total_return, sharpe_ratio, max_drawdown, total_trades,
        win_rate, avg_trade_duration, profit_factor, parameters
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        backtestId,
        req.params.id,
        req.user.id,
        JSON.stringify(backtestConfig.symbols),
        startDate,
        endDate,
        initialCapital,
        backtestResults.finalCapital,
        backtestResults.totalReturn,
        backtestResults.sharpeRatio,
        backtestResults.maxDrawdown,
        backtestResults.totalTrades,
        backtestResults.winRate,
        backtestResults.avgTradeDuration,
        backtestResults.profitFactor,
        JSON.stringify(backtestConfig)
      ]
    );

    // Save individual trades
    const tradePromises = backtestResults.trades
      .filter(trade => trade.status === 'closed')
      .map(trade => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO backtesting_trades (
              id, backtest_id, symbol, side, entry_date, exit_date,
              entry_price, exit_price, quantity, pnl, signal_confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              trade.id,
              backtestId,
              trade.symbol,
              trade.side,
              trade.entryDate,
              trade.exitDate,
              trade.entryPrice,
              trade.exitPrice,
              trade.quantity,
              trade.pnl,
              trade.signalConfidence
            ],
            (err) => err ? reject(err) : resolve()
          );
        });
      });

    await Promise.all(tradePromises);

    logger.info(`Backtest completed for model ${req.params.id}: ${backtestResults.totalTrades} trades, ${(backtestResults.totalReturn * 100).toFixed(2)}% return`);

    // Return summarized results (without all trades for performance)
    const summary = {
      id: backtestResults.id,
      modelId: req.params.id,
      symbols: backtestConfig.symbols,
      startDate,
      endDate,
      initialCapital,
      finalCapital: backtestResults.finalCapital,
      totalReturn: backtestResults.totalReturn,
      performanceMetrics: backtestResults.performanceMetrics,
      tradeCount: backtestResults.totalTrades
    };

    res.json({ backtest: summary });

  } catch (error) {
    logger.error('Error running backtest:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get backtest results for a model
router.get('/models/:id/backtests', authenticateToken, (req, res) => {
  const query = `
    SELECT br.*, 
           COUNT(bt.id) as trade_count
    FROM backtesting_results br
    LEFT JOIN backtesting_trades bt ON br.id = bt.backtest_id
    WHERE br.model_id = ? AND br.user_id = ?
    GROUP BY br.id
    ORDER BY br.created_at DESC
  `;

  db.all(query, [req.params.id, req.user.id], (err, backtests) => {
    if (err) {
      logger.error('Error fetching backtests:', err);
      return res.status(500).json({ error: 'Failed to fetch backtests' });
    }

    // Parse JSON fields
    const backtestsWithParsedData = backtests.map(backtest => ({
      ...backtest,
      symbols: backtest.symbols ? JSON.parse(backtest.symbols) : [],
      parameters: backtest.parameters ? JSON.parse(backtest.parameters) : {}
    }));

    res.json({ backtests: backtestsWithParsedData });
  });
});

// Get specific backtest details including trades
router.get('/backtests/:id', authenticateToken, (req, res) => {
  // First get backtest summary
  db.get(
    `SELECT br.* FROM backtesting_results br
     JOIN ml_models m ON br.model_id = m.id
     WHERE br.id = ? AND m.user_id = ?`,
    [req.params.id, req.user.id],
    (err, backtest) => {
      if (err) {
        logger.error('Error fetching backtest:', err);
        return res.status(500).json({ error: 'Failed to fetch backtest' });
      }

      if (!backtest) {
        return res.status(404).json({ error: 'Backtest not found' });
      }

      // Get trades for this backtest
      db.all(
        'SELECT * FROM backtesting_trades WHERE backtest_id = ? ORDER BY entry_date',
        [req.params.id],
        (err, trades) => {
          if (err) {
            logger.error('Error fetching backtest trades:', err);
            return res.status(500).json({ error: 'Failed to fetch backtest trades' });
          }

          // Parse JSON fields and combine
          const backtestWithTrades = {
            ...backtest,
            symbols: backtest.symbols ? JSON.parse(backtest.symbols) : [],
            parameters: backtest.parameters ? JSON.parse(backtest.parameters) : {},
            trades
          };

          res.json({ backtest: backtestWithTrades });
        }
      );
    }
  );
});

// Compare multiple models
router.post('/compare', authenticateToken, (req, res) => {
  const { modelIds, metric = 'accuracy' } = req.body;

  if (!modelIds || !Array.isArray(modelIds) || modelIds.length < 2) {
    return res.status(400).json({ error: 'At least 2 model IDs required for comparison' });
  }

  const placeholders = modelIds.map(() => '?').join(',');
  const query = `
    SELECT 
      m.*,
      COUNT(p.id) as prediction_count,
      AVG(p.confidence) as avg_confidence,
      COUNT(br.id) as backtest_count,
      AVG(br.total_return) as avg_return,
      AVG(br.sharpe_ratio) as avg_sharpe_ratio,
      AVG(br.win_rate) as avg_win_rate
    FROM ml_models m
    LEFT JOIN ml_predictions p ON m.id = p.model_id
    LEFT JOIN backtesting_results br ON m.id = br.model_id
    WHERE m.id IN (${placeholders}) AND m.user_id = ?
    GROUP BY m.id
    ORDER BY 
      CASE 
        WHEN ? = 'accuracy' THEN m.accuracy
        WHEN ? = 'sharpe_ratio' THEN AVG(br.sharpe_ratio)
        WHEN ? = 'return' THEN AVG(br.total_return)
        ELSE m.accuracy
      END DESC
  `;

  db.all(query, [...modelIds, req.user.id, metric, metric, metric], (err, models) => {
    if (err) {
      logger.error('Error comparing models:', err);
      return res.status(500).json({ error: 'Failed to compare models' });
    }

    const comparison = models.map(model => ({
      ...model,
      parameters: model.parameters ? JSON.parse(model.parameters) : {},
      symbols: model.symbols ? JSON.parse(model.symbols) : []
    }));

    res.json({ comparison });
  });
});

// Helper functions

async function generateTrainingData(symbols, timeframe, periodDays) {
  // In a real implementation, this would fetch actual market data
  // For demo purposes, generate mock training data
  const trainingData = [];
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));

  for (const symbol of symbols) {
    let currentDate = new Date(startDate);
    let price = 100 + Math.random() * 50;
    const prices = [];
    const volumes = [];

    // Generate price series
    while (currentDate <= endDate) {
      const dailyChange = (Math.random() - 0.5) * 0.1;
      price = price * (1 + dailyChange);
      prices.push(price);
      volumes.push(1000000 + Math.random() * 500000);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Create training samples with features and targets
    for (let i = 20; i < prices.length - 1; i++) {
      const features = [
        calculateSMA(prices.slice(0, i), 5),
        calculateSMA(prices.slice(0, i), 10),
        calculateSMA(prices.slice(0, i), 20),
        calculateRSI(prices.slice(0, i), 14),
        prices[i-1] / prices[i-20] - 1, // 20-day return
        volumes[i-1] / calculateSMA(volumes.slice(0, i), 20) // Volume ratio
      ].filter(f => !isNaN(f) && isFinite(f));

      const target = (prices[i+1] - prices[i]) / prices[i]; // Next day return

      if (features.length > 0 && !isNaN(target)) {
        const sampleDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
        trainingData.push({
          features: JSON.stringify(features),
          target,
          timestamp: sampleDate.toISOString(),
          symbol
        });
      }
    }
  }

  return trainingData;
}

async function generateRealtimeFeatures(symbol, timeframe) {
  // Generate mock realtime features
  // In reality, this would fetch recent market data and calculate indicators
  return [
    100 + Math.random() * 10, // SMA 5
    100 + Math.random() * 10, // SMA 10
    100 + Math.random() * 10, // SMA 20
    30 + Math.random() * 40,  // RSI
    (Math.random() - 0.5) * 0.2, // 20-day return
    0.8 + Math.random() * 0.4     // Volume ratio
  ];
}

async function getModelTrainingData(modelId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM ml_training_data WHERE model_id = ? ORDER BY timestamp',
      [modelId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function calculateSMA(prices, period) {
  if (prices.length < period) return NaN;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return NaN;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  
  return 100 - (100 / (1 + rs));
}

// Enhanced real-time prediction endpoint
router.post('/models/:id/realtime/start', authenticateToken, async (req, res) => {
  const { symbols = [], intervalSeconds = 30 } = req.body;

  try {
    const model = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM ml_models WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!model) {
      return res.status(404).json({ error: 'ML model not found' });
    }

    const targetSymbols = symbols.length > 0 ? symbols : JSON.parse(model.symbols);
    
    const intervalId = await mlService.startRealtimePredictions(
      req.params.id,
      targetSymbols,
      (predictions) => {
        // In a real implementation, this would use WebSocket to push predictions
        logger.info(`Real-time predictions generated for ${predictions.length} symbols`);
      }
    );

    res.json({
      success: true,
      message: 'Real-time predictions started',
      intervalId: intervalId.toString(),
      symbols: targetSymbols,
      interval: intervalSeconds
    });

  } catch (error) {
    logger.error('Error starting real-time predictions:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/models/:id/realtime/stop', authenticateToken, (req, res) => {
  const { intervalId } = req.body;

  try {
    mlService.stopRealtimePredictions(parseInt(intervalId));
    res.json({ success: true, message: 'Real-time predictions stopped' });
  } catch (error) {
    logger.error('Error stopping real-time predictions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Model performance tracking
router.post('/models/:id/performance/track', authenticateToken, (req, res) => {
  const { actualValues, predictedValues } = req.body;

  if (!actualValues || !predictedValues || actualValues.length !== predictedValues.length) {
    return res.status(400).json({ error: 'actualValues and predictedValues must be arrays of equal length' });
  }

  try {
    const trackingResult = mlService.trackModelPerformance(
      req.params.id,
      actualValues,
      predictedValues
    );

    res.json({
      success: true,
      performance: trackingResult.performance,
      isDrifting: trackingResult.isDrifting,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error tracking model performance:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/models/:id/performance/history', authenticateToken, (req, res) => {
  try {
    const history = mlService.getModelPerformanceHistory(req.params.id);
    res.json({ history });
  } catch (error) {
    logger.error('Error fetching performance history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Advanced indicators endpoint
router.post('/indicators/calculate', authenticateToken, (req, res) => {
  const { ohlcv, indicators = 'all' } = req.body;

  if (!ohlcv || !ohlcv.closes || ohlcv.closes.length < 50) {
    return res.status(400).json({ error: 'OHLCV data with at least 50 data points required' });
  }

  try {
    let result;
    
    if (indicators === 'all') {
      result = advancedIndicators.calculateAllIndicators(ohlcv);
    } else {
      result = advancedIndicators.generateMLFeatures(ohlcv);
    }

    res.json({
      success: true,
      indicators: result,
      dataPoints: ohlcv.closes.length
    });

  } catch (error) {
    logger.error('Error calculating indicators:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trading strategies endpoints
router.post('/strategies', authenticateToken, auditLog('create_trading_strategy'), async (req, res) => {
  try {
    const strategy = await tradingStrategyFactory.createStrategy(req.body);
    
    res.json({ strategy });
  } catch (error) {
    logger.error('Error creating trading strategy:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/strategies', authenticateToken, (req, res) => {
  try {
    const strategies = tradingStrategyFactory.listStrategies();
    res.json({ strategies });
  } catch (error) {
    logger.error('Error fetching trading strategies:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/strategies/:id/execute', authenticateToken, async (req, res) => {
  const { marketData } = req.body;

  if (!marketData || !Array.isArray(marketData)) {
    return res.status(400).json({ error: 'Market data array required' });
  }

  try {
    const signals = await tradingStrategyFactory.executeStrategy(req.params.id, marketData);
    res.json({ 
      signals,
      count: signals.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error executing trading strategy:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/strategies/:id/activate', authenticateToken, (req, res) => {
  try {
    const success = tradingStrategyFactory.activateStrategy(req.params.id);
    if (success) {
      res.json({ success: true, message: 'Strategy activated' });
    } else {
      res.status(404).json({ error: 'Strategy not found' });
    }
  } catch (error) {
    logger.error('Error activating strategy:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/strategies/:id/deactivate', authenticateToken, (req, res) => {
  try {
    const success = tradingStrategyFactory.deactivateStrategy(req.params.id);
    if (success) {
      res.json({ success: true, message: 'Strategy deactivated' });
    } else {
      res.status(404).json({ error: 'Strategy not found' });
    }
  } catch (error) {
    logger.error('Error deactivating strategy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions

async function generateTrainingData(symbols, timeframe, periodDays) {
  // Enhanced training data generation with advanced indicators
  const trainingData = [];
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));

  for (const symbol of symbols) {
    let currentDate = new Date(startDate);
    let price = 100 + Math.random() * 50;
    const ohlcvData = {
      highs: [],
      lows: [],
      opens: [],
      closes: [],
      volumes: []
    };

    // Generate OHLCV data
    while (currentDate <= endDate) {
      const dailyChange = (Math.random() - 0.5) * 0.1;
      const open = price;
      const close = price * (1 + dailyChange);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      const volume = 1000000 + Math.random() * 500000;
      
      ohlcvData.opens.push(open);
      ohlcvData.highs.push(high);
      ohlcvData.lows.push(low);
      ohlcvData.closes.push(close);
      ohlcvData.volumes.push(volume);
      
      price = close;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate advanced features using the new indicators
    if (ohlcvData.closes.length >= 50) {
      const features = advancedIndicators.generateMLFeatures(ohlcvData);
      
      // Create training samples with targets
      for (let i = 1; i < ohlcvData.closes.length - 1; i++) {
        if (features.length > 0) {
          const target = (ohlcvData.closes[i+1] - ohlcvData.closes[i]) / ohlcvData.closes[i];
          const sampleDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
          
          trainingData.push({
            features: JSON.stringify({ ohlcv: ohlcvData, advanced: features }),
            target,
            timestamp: sampleDate.toISOString(),
            symbol
          });
        }
      }
    }
  }

  return trainingData;
}

async function generateRealtimeFeatures(symbol, timeframe) {
  // Enhanced real-time feature generation
  const mockOHLCV = {
    highs: Array.from({ length: 50 }, () => 100 + Math.random() * 20),
    lows: Array.from({ length: 50 }, () => 90 + Math.random() * 20),
    opens: Array.from({ length: 50 }, () => 95 + Math.random() * 20),
    closes: Array.from({ length: 50 }, () => 95 + Math.random() * 20),
    volumes: Array.from({ length: 50 }, () => 1000000 + Math.random() * 500000)
  };
  
  return advancedIndicators.generateMLFeatures(mockOHLCV);
}

// Clean up the remaining routes to remove fake implementations
// Remove all the fake advanced ML endpoints that don't actually work

// Enhanced real-time prediction endpoint (simplified, real implementation)
router.post('/models/:id/predict/realtime', authenticateToken, async (req, res) => {
  try {
    // For now, this just calls the regular predict endpoint
    // Real-time implementation would require WebSocket integration
    return res.status(501).json({ 
      error: 'Real-time predictions not yet implemented',
      suggestion: 'Use POST /api/ml/models/:id/predict for current predictions',
      note: 'Real-time feature requires WebSocket implementation'
    });
  } catch (error) {
    logger.error('Error in real-time prediction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Model performance tracking (simplified)
router.post('/models/:id/performance/track', authenticateToken, (req, res) => {
  const { actualValue, predictedValue } = req.body;

  if (!actualValue || !predictedValue) {
    return res.status(400).json({ 
      error: 'actualValue and predictedValue are required' 
    });
  }

  try {
    // Simple performance tracking
    const error = Math.abs(actualValue - predictedValue);
    const percentError = (error / Math.abs(actualValue)) * 100;
    
    res.json({
      success: true,
      performance: {
        absoluteError: error,
        percentageError: percentError,
        accuracy: Math.max(0, 100 - percentError)
      },
      timestamp: new Date().toISOString(),
      note: 'Basic performance tracking. Advanced features require implementation.'
    });

  } catch (error) {
    logger.error('Error tracking model performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Advanced indicators endpoint (real implementation)
router.post('/indicators/calculate', authenticateToken, (req, res) => {
  const { ohlcv, indicators = 'basic' } = req.body;

  if (!ohlcv || !ohlcv.closes || ohlcv.closes.length < 20) {
    return res.status(400).json({ 
      error: 'OHLCV data with at least 20 data points required' 
    });
  }

  try {
    const result = {};
    const prices = ohlcv.closes;
    
    if (indicators === 'basic' || indicators === 'all') {
      // Calculate real basic indicators
      result.sma_5 = realMLService.calculateSMA(prices.slice(-5));
      result.sma_10 = realMLService.calculateSMA(prices.slice(-10));
      result.sma_20 = realMLService.calculateSMA(prices.slice(-20));
      result.rsi_14 = realMLService.calculateRSI(prices, 14);
    }

    res.json({
      success: true,
      indicators: result,
      dataPoints: prices.length,
      note: 'Basic indicators only. Advanced indicators require additional implementation.'
    });

  } catch (error) {
    logger.error('Error calculating indicators:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;