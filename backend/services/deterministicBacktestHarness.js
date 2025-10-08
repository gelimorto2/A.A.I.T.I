/**
 * Sprint 3: Deterministic Backtest Harness
 * Implements comprehensive backtesting framework with fixture datasets and reproducible results
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class DeterministicBacktestHarness {
  constructor(db, mlModelRepository) {
    this.db = db;
    this.mlModelRepository = mlModelRepository;
    this.fixturesPath = path.join(__dirname, '../fixtures');
  }

  /**
   * Initialize backtest harness with default BTC fixture data
   */
  async initialize() {
    try {
      // Ensure fixtures directory exists
      await fs.mkdir(this.fixturesPath, { recursive: true });
      
      // Create default BTC daily fixture if it doesn't exist
      await this.createDefaultBTCFixture();
      
      console.log('✅ Deterministic Backtest Harness initialized');
    } catch (error) {
      console.error('❌ Failed to initialize backtest harness:', error);
      throw error;
    }
  }

  /**
   * Create default BTC daily OHLCV fixture dataset
   */
  async createDefaultBTCFixture() {
    const fixtureName = 'BTC_daily_2023_2024';
    
    // Check if fixture already exists
    const existingFixture = await this.db('backtest_fixtures')
      .where('name', fixtureName)
      .first();
    
    if (existingFixture) {
      console.log('BTC fixture already exists, skipping creation');
      return existingFixture;
    }

    // Generate synthetic but realistic BTC daily data for 2023-2024
    const startDate = new Date('2023-01-01');
    const endDate = new Date('2024-12-31');
    const ohlcvData = this.generateSyntheticBTCData(startDate, endDate);
    
    const dataString = JSON.stringify(ohlcvData);
    const dataChecksum = crypto.createHash('sha256').update(dataString).digest('hex');

    const fixture = {
      name: fixtureName,
      symbol: 'BTC',
      start_date: startDate,
      end_date: endDate,
      data_points: dataString, // Store the JSON data in data_points column
      market_conditions: JSON.stringify({ description: 'BTC daily OHLCV data for 2023-2024 (synthetic but realistic patterns)', count: ohlcvData.length }),
      checksum: dataChecksum,
      is_active: true,
      created_at: new Date()
    };

    const [createdFixture] = await this.db('backtest_fixtures').insert(fixture).returning('*');
    console.log(`✅ Created BTC fixture with ${ohlcvData.length} data points`);
    
    return createdFixture;
  }

  /**
   * Generate synthetic but realistic BTC price data
   */
  generateSyntheticBTCData(startDate, endDate) {
    const data = [];
    let currentDate = new Date(startDate);
    let price = 16500; // Starting price around Jan 2023 levels
    let volume = 25000; // Base volume
    
    while (currentDate <= endDate) {
      // Add some realistic volatility and trends
      const dailyChange = (Math.random() - 0.5) * 0.08; // ±4% daily change
      const trendFactor = Math.sin((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365)) * 0.002;
      
      price *= (1 + dailyChange + trendFactor);
      price = Math.max(price, 10000); // Floor price
      price = Math.min(price, 75000); // Ceiling price
      
      // Generate OHLC from closing price
      const volatility = Math.random() * 0.03; // Intraday volatility
      const high = price * (1 + volatility);
      const low = price * (1 - volatility);
      const open = price * (0.99 + Math.random() * 0.02);
      const close = price;
      
      // Volume with some correlation to price movement
      const volumeMultiplier = 1 + Math.abs(dailyChange) * 2;
      const dayVolume = volume * volumeMultiplier * (0.8 + Math.random() * 0.4);
      
      data.push({
        timestamp: currentDate.toISOString(),
        date: currentDate.toISOString().split('T')[0],
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.round(dayVolume)
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }

  /**
   * Run deterministic backtest on a model using fixture data
   */
  async runBacktest(modelId, fixtureId, backtestParams = {}) {
    const model = await this.mlModelRepository.findById(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const fixture = await this.db('backtest_fixtures')
      .where('id', fixtureId)
      .where('is_active', true)
      .first();
    
    if (!fixture) {
      throw new Error(`Fixture ${fixtureId} not found or inactive`);
    }

    console.log(`🧪 Running backtest for model ${model.name} on fixture ${fixture.name}`);

    const ohlcvData = JSON.parse(fixture.ohlcv_data);
    const results = await this.executeBacktest(model, ohlcvData, backtestParams);
    
    // Generate validation hash for deterministic results
    const validationHash = this.generateValidationHash(modelId, fixtureId, backtestParams, results);
    
    // Store validation results
    await this.storeValidationResults(modelId, fixtureId, results, validationHash);
    
    return {
      model_id: modelId,
      fixture_id: fixtureId,
      fixture_name: fixture.name,
      results,
      validation_hash: validationHash,
      data_points: ohlcvData.length,
      backtest_params: backtestParams
    };
  }

  /**
   * Execute the actual backtest logic
   */
  async executeBacktest(model, ohlcvData, params) {
    const {
      initialCapital = 100000,
      transactionCost = 0.001, // 0.1% per trade
      lookbackPeriod = 20,
      rebalanceFrequency = 1, // Daily
      maxPositionSize = 0.25 // 25% max position
    } = params;

    let capital = initialCapital;
    let position = 0;
    let trades = [];
    let equity = [initialCapital];
    let drawdowns = [];
    let maxEquity = initialCapital;

    // Simple trend-following strategy for demonstration
    for (let i = lookbackPeriod; i < ohlcvData.length; i += rebalanceFreency) {
      const currentData = ohlcvData.slice(i - lookbackPeriod, i);
      const currentPrice = ohlcvData[i].close;
      
      // Calculate simple moving averages
      const shortMA = this.calculateSMA(currentData.slice(-10), 'close');
      const longMA = this.calculateSMA(currentData, 'close');
      
      // Generate signal based on model type
      let signal = 0;
      if (model.type === 'trend_following') {
        signal = shortMA > longMA ? 1 : -1;
      } else if (model.type === 'mean_reversion') {
        const rsi = this.calculateRSI(currentData, 14);
        signal = rsi < 30 ? 1 : rsi > 70 ? -1 : 0;
      } else {
        // Random walk for unknown model types
        signal = Math.random() > 0.5 ? 1 : -1;
      }

      // Position sizing
      const targetPosition = signal * maxPositionSize * capital / currentPrice;
      const positionChange = targetPosition - position;
      
      if (Math.abs(positionChange) > 0.01) { // Minimum trade size
        const tradeValue = Math.abs(positionChange * currentPrice);
        const cost = tradeValue * transactionCost;
        
        capital -= cost; // Deduct transaction costs
        position = targetPosition;
        
        trades.push({
          timestamp: ohlcvData[i].timestamp,
          price: currentPrice,
          position_change: positionChange,
          transaction_cost: cost,
          signal,
          capital_after_trade: capital
        });
      }

      // Update equity
      const currentEquity = capital + position * currentPrice;
      equity.push(currentEquity);
      
      // Track drawdown
      if (currentEquity > maxEquity) {
        maxEquity = currentEquity;
      }
      const drawdown = (maxEquity - currentEquity) / maxEquity;
      drawdowns.push(drawdown);
    }

    // Calculate performance metrics
    const finalEquity = equity[equity.length - 1];
    const totalReturn = (finalEquity - initialCapital) / initialCapital;
    const annualizedReturn = Math.pow(1 + totalReturn, 365 / ohlcvData.length) - 1;
    
    // Calculate Sharpe ratio (simplified)
    const returns = equity.slice(1).map((eq, i) => (eq - equity[i]) / equity[i]);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStd = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = returnStd > 0 ? (avgReturn * Math.sqrt(365)) / (returnStd * Math.sqrt(365)) : 0;
    
    const maxDrawdown = Math.max(...drawdowns);
    const winRate = trades.filter(t => t.position_change * (t.price - trades[trades.indexOf(t) - 1]?.price || t.price) > 0).length / trades.length;

    return {
      total_return: totalReturn,
      annualized_return: annualizedReturn,
      sharpe_ratio: sharpeRatio,
      max_drawdown: maxDrawdown,
      win_rate: winRate || 0,
      total_trades: trades.length,
      final_equity: finalEquity,
      initial_capital: initialCapital,
      equity_curve: equity,
      trades: trades.slice(0, 100), // Limit trade history for storage
      validation_score: this.calculateValidationScore({
        totalReturn,
        sharpeRatio,
        maxDrawdown,
        winRate: winRate || 0
      })
    };
  }

  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(data, field) {
    const sum = data.reduce((acc, item) => acc + item[field], 0);
    return sum / data.length;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(data, period = 14) {
    if (data.length < period + 1) return 50; // Default neutral RSI
    
    const changes = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i].close - data[i-1].close);
    }
    
    const gains = changes.slice(-period).map(c => c > 0 ? c : 0);
    const losses = changes.slice(-period).map(c => c < 0 ? Math.abs(c) : 0);
    
    const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate overall validation score
   */
  calculateValidationScore(metrics) {
    const { totalReturn, sharpeRatio, maxDrawdown, winRate } = metrics;
    
    // Weighted scoring (can be customized)
    const returnScore = Math.min(totalReturn * 2, 1); // Cap at 50% return
    const sharpeScore = Math.min(sharpeRatio / 2, 1); // Cap at Sharpe 2.0
    const drawdownScore = Math.max(1 - maxDrawdown * 2, 0); // Penalty for drawdown
    const winRateScore = winRate;
    
    return (returnScore * 0.3 + sharpeScore * 0.4 + drawdownScore * 0.2 + winRateScore * 0.1);
  }

  /**
   * Generate validation hash for deterministic results
   */
  generateValidationHash(modelId, fixtureId, params, results) {
    const hashInput = JSON.stringify({
      model_id: modelId,
      fixture_id: fixtureId,
      params,
      total_return: Math.round(results.total_return * 10000) / 10000,
      sharpe_ratio: Math.round(results.sharpe_ratio * 10000) / 10000,
      max_drawdown: Math.round(results.max_drawdown * 10000) / 10000
    });
    
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Store validation results in database
   */
  async storeValidationResults(modelId, fixtureId, results, validationHash) {
    const validation = {
      model_id: modelId,
      fixture_id: fixtureId,
      validation_score: results.validation_score,
      detailed_results: JSON.stringify(results),
      validation_hash: validationHash,
      validated_at: new Date()
    };

    // Use upsert to handle duplicate validations
    await this.db('model_fixture_validations')
      .insert(validation)
      .onConflict(['model_id', 'fixture_id', 'validation_hash'])
      .merge(['validation_score', 'detailed_results', 'validated_at']);

    return validation;
  }

  /**
   * Get validation results for a model
   */
  async getValidationResults(modelId, fixtureId = null) {
    let query = this.db('model_fixture_validations as mfv')
      .join('backtest_fixtures as bf', 'mfv.fixture_id', 'bf.id')
      .where('mfv.model_id', modelId);

    if (fixtureId) {
      query = query.where('mfv.fixture_id', fixtureId);
    }

    return await query.select([
      'mfv.*',
      'bf.name as fixture_name',
      'bf.symbol',
      'bf.timeframe',
      'bf.start_date',
      'bf.end_date'
    ]).orderBy('mfv.validated_at', 'desc');
  }

  /**
   * Get all available fixtures
   */
  async getAvailableFixtures() {
    return await this.db('backtest_fixtures')
      .where('is_active', true)
      .orderBy('created_at', 'desc');
  }

  /**
   * Compare models on same fixture
   */
  async compareModels(modelIds, fixtureId) {
    const comparisons = [];
    
    for (const modelId of modelIds) {
      const results = await this.getValidationResults(modelId, fixtureId);
      if (results.length > 0) {
        const latestResult = results[0];
        const detailedResults = JSON.parse(latestResult.detailed_results);
        
        comparisons.push({
          model_id: modelId,
          validation_score: latestResult.validation_score,
          total_return: detailedResults.total_return,
          sharpe_ratio: detailedResults.sharpe_ratio,
          max_drawdown: detailedResults.max_drawdown,
          win_rate: detailedResults.win_rate,
          validated_at: latestResult.validated_at
        });
      }
    }

    // Sort by validation score descending
    return comparisons.sort((a, b) => b.validation_score - a.validation_score);
  }
}

module.exports = DeterministicBacktestHarness;
