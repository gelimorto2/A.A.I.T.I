/**
 * A.A.I.T.I Function Registry
 * 
 * Central registry for all important functions across the application.
 * This provides a single point of access to discover and understand
 * the key functions available in A.A.I.T.I.
 * 
 * Organization: Functions are grouped by category and importance level.
 */

const logger = require('./logger');

class FunctionRegistry {
  constructor() {
    this.functions = new Map();
    this.categories = new Map();
    this.importanceLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    
    this.initializeRegistry();
    logger.info('Function Registry initialized with comprehensive function catalog');
  }

  /**
   * Initialize the function registry with all important functions
   */
  initializeRegistry() {
    // CRITICAL FUNCTIONS - Core trading and ML functionality
    this.registerFunction({
      name: 'createLinearRegressionModel',
      category: 'ML_ALGORITHMS',
      importance: 'CRITICAL',
      description: 'Creates linear regression model for price trend prediction using real ml-regression library',
      module: 'realMLService',
      usage: 'Basic trend analysis and prediction',
      parameters: ['data', 'config'],
      returns: 'Trained linear regression model',
      example: 'createLinearRegressionModel(priceData, {period: 20})'
    });

    this.registerFunction({
      name: 'createRSIStrategy',
      category: 'ML_ALGORITHMS',
      importance: 'CRITICAL',
      description: 'Generates buy/sell signals based on RSI momentum analysis',
      module: 'realMLService',
      usage: 'Momentum-based trading in ranging markets',
      parameters: ['symbol', 'period', 'oversold', 'overbought'],
      returns: 'RSI strategy with trading signals',
      example: 'createRSIStrategy("BTC", 14, 30, 70)'
    });

    this.registerFunction({
      name: 'backtestStrategy',
      category: 'TRADING_STRATEGIES',
      importance: 'CRITICAL',
      description: 'Tests strategy performance on historical data with comprehensive metrics',
      module: 'tradingStrategyFactory',
      usage: 'Validating strategies before live trading',
      parameters: ['strategyId', 'historicalData', 'timeRange'],
      returns: 'Performance metrics including returns, Sharpe ratio, drawdown',
      example: 'backtestStrategy("strategy_123", priceData, {start: "2024-01-01", end: "2024-06-01"})'
    });

    this.registerFunction({
      name: 'calculatePositionSize',
      category: 'RISK_MANAGEMENT',
      importance: 'CRITICAL',
      description: 'Calculates optimal position size based on risk tolerance and account size',
      module: 'riskManagement',
      usage: 'Essential for proper risk management in all trades',
      parameters: ['accountBalance', 'riskPercentage', 'stopLoss'],
      returns: 'Position size in units/shares',
      example: 'calculatePositionSize(10000, 2, 0.05)'
    });

    this.registerFunction({
      name: 'getRealTimePrice',
      category: 'MARKET_DATA',
      importance: 'CRITICAL',
      description: 'Fetches current market price and volume data from CoinGecko API',
      module: 'marketData',
      usage: 'Real-time trading decisions and current market analysis',
      parameters: ['symbol'],
      returns: 'Current price, volume, and market data object',
      example: 'getRealTimePrice("bitcoin")'
    });

    // HIGH PRIORITY FUNCTIONS
    this.registerFunction({
      name: 'createBollingerBandsStrategy',
      category: 'ML_ALGORITHMS',
      importance: 'HIGH',
      description: 'Creates volatility-based trading strategy using Bollinger Bands',
      module: 'realMLService',
      usage: 'Mean-reversion trading and volatility analysis',
      parameters: ['data', 'period', 'stdDev'],
      returns: 'Bollinger Bands strategy with support/resistance levels',
      example: 'createBollingerBandsStrategy(priceData, 20, 2)'
    });

    this.registerFunction({
      name: 'createMACDStrategy',
      category: 'ML_ALGORITHMS',
      importance: 'HIGH',
      description: 'Implements MACD strategy for trend detection using moving average convergence/divergence',
      module: 'realMLService',
      usage: 'Trend following and momentum analysis',
      parameters: ['data', 'fastPeriod', 'slowPeriod', 'signalPeriod'],
      returns: 'MACD strategy with trend direction and momentum signals',
      example: 'createMACDStrategy(priceData, 12, 26, 9)'
    });

    this.registerFunction({
      name: 'optimizeStrategy',
      category: 'TRADING_STRATEGIES',
      importance: 'HIGH',
      description: 'Optimizes strategy parameters for maximum performance using grid search',
      module: 'tradingStrategyFactory',
      usage: 'Fine-tuning strategy parameters for better returns',
      parameters: ['strategyId', 'parameterRanges'],
      returns: 'Optimal parameters and performance metrics',
      example: 'optimizeStrategy("strategy_123", {period: [10, 20, 30], threshold: [0.02, 0.03, 0.05]})'
    });

    this.registerFunction({
      name: 'assessPortfolioRisk',
      category: 'RISK_MANAGEMENT',
      importance: 'HIGH',
      description: 'Evaluates overall portfolio risk considering asset correlations',
      module: 'riskManagement',
      usage: 'Portfolio diversification and total risk management',
      parameters: ['positions', 'correlations'],
      returns: 'Portfolio risk metrics and diversification recommendations',
      example: 'assessPortfolioRisk(currentPositions, correlationMatrix)'
    });

    this.registerFunction({
      name: 'calculateFibonacciLevels',
      category: 'TECHNICAL_ANALYSIS',
      importance: 'HIGH',
      description: 'Calculates Fibonacci retracement levels for support/resistance analysis',
      module: 'advancedIndicators',
      usage: 'Identifying potential reversal points and key levels',
      parameters: ['high', 'low'],
      returns: 'Array of Fibonacci levels (23.6%, 38.2%, 50%, 61.8%)',
      example: 'calculateFibonacciLevels(65000, 55000)'
    });

    this.registerFunction({
      name: 'getHistoricalData',
      category: 'MARKET_DATA',
      importance: 'HIGH',
      description: 'Retrieves historical OHLCV data for backtesting and analysis',
      module: 'marketData',
      usage: 'Strategy backtesting and historical analysis',
      parameters: ['symbol', 'timeframe', 'startDate', 'endDate'],
      returns: 'Array of historical price bars with OHLCV data',
      example: 'getHistoricalData("bitcoin", "1d", "2024-01-01", "2024-06-01")'
    });

    // MEDIUM PRIORITY FUNCTIONS
    this.registerFunction({
      name: 'calculateStochastic',
      category: 'TECHNICAL_ANALYSIS',
      importance: 'MEDIUM',
      description: 'Calculates Stochastic Oscillator for momentum analysis',
      module: 'advancedIndicators',
      usage: 'Overbought/oversold identification and momentum trading',
      parameters: ['data', 'kPeriod', 'dPeriod'],
      returns: 'Stochastic %K and %D values (0-100)',
      example: 'calculateStochastic(ohlcData, 14, 3)'
    });

    this.registerFunction({
      name: 'calculateVWAP',
      category: 'TECHNICAL_ANALYSIS',
      importance: 'MEDIUM',
      description: 'Calculates Volume Weighted Average Price for institutional-level analysis',
      module: 'advancedIndicators',
      usage: 'Price benchmarking and institutional trading levels',
      parameters: ['data'],
      returns: 'VWAP line and volume-based trading signals',
      example: 'calculateVWAP(ohlcvData)'
    });

    this.registerFunction({
      name: 'sendTradingAlert',
      category: 'NOTIFICATIONS',
      importance: 'MEDIUM',
      description: 'Sends real-time trading alerts and notifications to users',
      module: 'notificationService',
      usage: 'Keeping users informed of important trading events',
      parameters: ['userId', 'alertType', 'message'],
      returns: 'Notification delivery status',
      example: 'sendTradingAlert("user123", "SIGNAL", "RSI oversold on BTC")'
    });

    this.registerFunction({
      name: 'cacheMarketData',
      category: 'PERFORMANCE',
      importance: 'MEDIUM',
      description: 'Caches market data to improve performance and reduce API calls',
      module: 'cache',
      usage: 'Performance optimization and API cost reduction',
      parameters: ['symbol', 'data', 'ttl'],
      returns: 'Cache status and data access info',
      example: 'cacheMarketData("bitcoin", priceData, 300)'
    });

    // LOW PRIORITY FUNCTIONS (Supporting/Infrastructure)
    this.registerFunction({
      name: 'authenticateUser',
      category: 'AUTHENTICATION',
      importance: 'LOW',
      description: 'Validates user credentials and generates JWT tokens',
      module: 'auth',
      usage: 'User login and API access security',
      parameters: ['email', 'password'],
      returns: 'JWT token and user information',
      example: 'authenticateUser("user@example.com", "password123")'
    });

    this.registerFunction({
      name: 'collectMetrics',
      category: 'MONITORING',
      importance: 'LOW',
      description: 'Collects system performance metrics for monitoring',
      module: 'prometheusMetrics',
      usage: 'System health monitoring and performance tracking',
      parameters: [],
      returns: 'CPU, memory, and API response time metrics',
      example: 'collectMetrics()'
    });

    // Initialize category mappings
    this.initializeCategories();
  }

  /**
   * Initialize category descriptions and metadata
   */
  initializeCategories() {
    this.categories.set('ML_ALGORITHMS', {
      name: 'Machine Learning Algorithms',
      description: 'Core ML functions for trading predictions and analysis',
      icon: '🧠',
      priority: 1
    });

    this.categories.set('TRADING_STRATEGIES', {
      name: 'Trading Strategies',
      description: 'Strategy creation, backtesting, and optimization functions',
      icon: '📊',
      priority: 2
    });

    this.categories.set('RISK_MANAGEMENT', {
      name: 'Risk Management',
      description: 'Position sizing, portfolio risk, and risk assessment functions',
      icon: '🛡️',
      priority: 3
    });

    this.categories.set('MARKET_DATA', {
      name: 'Market Data',
      description: 'Real-time and historical market data retrieval functions',
      icon: '📈',
      priority: 4
    });

    this.categories.set('TECHNICAL_ANALYSIS', {
      name: 'Technical Analysis',
      description: 'Technical indicators and advanced analysis functions',
      icon: '📉',
      priority: 5
    });

    this.categories.set('NOTIFICATIONS', {
      name: 'Notifications & Alerts',
      description: 'User notification and alert management functions',
      icon: '🔔',
      priority: 6
    });

    this.categories.set('PERFORMANCE', {
      name: 'Performance & Optimization',
      description: 'Caching, optimization, and performance enhancement functions',
      icon: '⚡',
      priority: 7
    });

    this.categories.set('AUTHENTICATION', {
      name: 'Authentication & Security',
      description: 'User authentication and security functions',
      icon: '🔒',
      priority: 8
    });

    this.categories.set('MONITORING', {
      name: 'System Monitoring',
      description: 'System monitoring and metrics collection functions',
      icon: '📊',
      priority: 9
    });
  }

  /**
   * Register a new function in the registry
   */
  registerFunction(functionInfo) {
    const { name, category, importance } = functionInfo;
    
    if (!this.importanceLevels.includes(importance)) {
      throw new Error(`Invalid importance level: ${importance}`);
    }

    this.functions.set(name, functionInfo);
    logger.debug(`Registered function: ${name} (${category}, ${importance})`);
  }

  /**
   * Get all functions, optionally filtered by category or importance
   */
  getFunctions(filters = {}) {
    let functions = Array.from(this.functions.values());

    if (filters.category) {
      functions = functions.filter(fn => fn.category === filters.category);
    }

    if (filters.importance) {
      functions = functions.filter(fn => fn.importance === filters.importance);
    }

    if (filters.module) {
      functions = functions.filter(fn => fn.module === filters.module);
    }

    return functions;
  }

  /**
   * Get functions by importance level (for quick reference)
   */
  getCriticalFunctions() {
    return this.getFunctions({ importance: 'CRITICAL' });
  }

  getHighPriorityFunctions() {
    return this.getFunctions({ importance: 'HIGH' });
  }

  /**
   * Get functions by category
   */
  getFunctionsByCategory(category) {
    return this.getFunctions({ category });
  }

  /**
   * Search functions by name or description
   */
  searchFunctions(query) {
    const searchQuery = query.toLowerCase();
    return Array.from(this.functions.values()).filter(fn => 
      fn.name.toLowerCase().includes(searchQuery) ||
      fn.description.toLowerCase().includes(searchQuery) ||
      fn.usage.toLowerCase().includes(searchQuery)
    );
  }

  /**
   * Get function details by name
   */
  getFunctionDetails(functionName) {
    return this.functions.get(functionName);
  }

  /**
   * Get all categories with their functions
   */
  getCategoriesWithFunctions() {
    const result = {};
    
    for (const [categoryKey, categoryInfo] of this.categories.entries()) {
      const functions = this.getFunctionsByCategory(categoryKey);
      result[categoryKey] = {
        ...categoryInfo,
        functions: functions.sort((a, b) => {
          // Sort by importance first, then by name
          const importanceOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
          return importanceDiff !== 0 ? importanceDiff : a.name.localeCompare(b.name);
        })
      };
    }

    return result;
  }

  /**
   * Get quick reference - most important functions for new users
   */
  getQuickReference() {
    return {
      beginnerFunctions: [
        'getRealTimePrice',
        'createRSIStrategy',
        'authenticateUser',
        'sendTradingAlert'
      ].map(name => this.functions.get(name)).filter(Boolean),
      
      intermediateFunctions: [
        'createLinearRegressionModel',
        'backtestStrategy',
        'calculatePositionSize',
        'createBollingerBandsStrategy'
      ].map(name => this.functions.get(name)).filter(Boolean),
      
      advancedFunctions: [
        'optimizeStrategy',
        'assessPortfolioRisk',
        'calculateFibonacciLevels',
        'createMACDStrategy'
      ].map(name => this.functions.get(name)).filter(Boolean)
    };
  }

  /**
   * Generate function summary statistics
   */
  getStatistics() {
    const total = this.functions.size;
    const byImportance = {};
    const byCategory = {};

    for (const level of this.importanceLevels) {
      byImportance[level] = this.getFunctions({ importance: level }).length;
    }

    for (const [category] of this.categories) {
      byCategory[category] = this.getFunctions({ category }).length;
    }

    return {
      total,
      byImportance,
      byCategory,
      categories: this.categories.size
    };
  }
}

// Export singleton instance
const functionRegistry = new FunctionRegistry();

module.exports = {
  FunctionRegistry,
  functionRegistry
};