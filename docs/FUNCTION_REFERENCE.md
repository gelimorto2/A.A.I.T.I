# A.A.I.T.I Function Reference

## 🎯 Core Functions Overview

This document provides a comprehensive reference for all important functions in A.A.I.T.I, organized by category and importance.

---

## 🧠 Machine Learning Functions (CRITICAL)

### Primary ML Algorithms
These are the core trading algorithms that power A.A.I.T.I's predictions:

#### `realMLService.js` - Real ML Implementations
```javascript
// LINEAR REGRESSION - Trend prediction with real ml-regression library
createLinearRegressionModel(data, config)
  Purpose: Creates linear regression model for price trend prediction
  Input: Historical price data, configuration parameters
  Output: Trained model with prediction capabilities
  Usage: Best for identifying clear trending markets

// POLYNOMIAL REGRESSION - Non-linear pattern recognition
createPolynomialRegressionModel(data, degree)
  Purpose: Captures non-linear price patterns and curved trends
  Input: Price data, polynomial degree (2-4 recommended)
  Output: Model that can predict complex price curves
  Usage: Ideal for volatile markets with curved patterns

// RSI STRATEGY - Momentum-based signals with optimization
createRSIStrategy(symbol, period, oversold, overbought)
  Purpose: Generates buy/sell signals based on RSI momentum
  Input: Trading symbol, RSI period (14 default), thresholds
  Output: Trading signals with confidence scores
  Usage: Best for sideways/ranging markets

// BOLLINGER BANDS - Volatility-based trading signals
createBollingerBandsStrategy(data, period, stdDev)
  Purpose: Identifies overbought/oversold conditions using volatility
  Input: Price data, moving average period, standard deviations
  Output: Support/resistance levels and signals
  Usage: Excellent for mean-reversion trading

// MACD STRATEGY - Moving average convergence/divergence
createMACDStrategy(data, fastPeriod, slowPeriod, signalPeriod)
  Purpose: Detects trend changes using moving average crossovers
  Input: Price data, MACD parameters (12, 26, 9 default)
  Output: Trend direction and momentum signals
  Usage: Great for trend following strategies
```

### Advanced Indicators
#### `advancedIndicators.js` - Technical Analysis Functions
```javascript
// FIBONACCI RETRACEMENT - Support/resistance level analysis
calculateFibonacciLevels(high, low)
  Purpose: Calculates key retracement levels for support/resistance
  Input: Recent high and low prices
  Output: Array of fibonacci levels (23.6%, 38.2%, 50%, 61.8%)
  Usage: Identifying potential reversal points

// STOCHASTIC OSCILLATOR - %K %D momentum indicators
calculateStochastic(data, kPeriod, dPeriod)
  Purpose: Measures momentum using price position in range
  Input: OHLC data, %K and %D periods
  Output: Stochastic %K and %D values (0-100)
  Usage: Overbought/oversold identification

// WILLIAMS %R - Price momentum oscillator
calculateWilliamsR(data, period)
  Purpose: Momentum oscillator similar to stochastic
  Input: OHLC data, period (14 default)
  Output: Williams %R values (-100 to 0)
  Usage: Timing entry/exit points

// VWAP - Volume weighted average price
calculateVWAP(data)
  Purpose: Calculates volume-weighted average price
  Input: OHLC data with volume
  Output: VWAP line and trading signals
  Usage: Institutional-level price benchmarking
```

---

## 📊 Trading Strategy Functions (HIGH PRIORITY)

### Strategy Creation & Management
#### `tradingStrategyFactory.js` - Strategy Framework
```javascript
// CREATE STRATEGY - Build ML-based trading strategies
createStrategy(strategyConfig)
  Purpose: Creates new trading strategy with ML models
  Input: Strategy configuration (type, models, symbols, parameters)
  Output: Strategy object with backtesting capabilities
  Usage: Building custom automated trading strategies

// BACKTEST STRATEGY - Historical performance testing
backtestStrategy(strategyId, historicalData, timeRange)
  Purpose: Tests strategy performance on historical data
  Input: Strategy ID, price data, date range
  Output: Performance metrics (returns, Sharpe ratio, drawdown)
  Usage: Validating strategy before live trading

// OPTIMIZE STRATEGY - Parameter optimization
optimizeStrategy(strategyId, parameterRanges)
  Purpose: Finds optimal parameters for maximum performance
  Input: Strategy ID, parameter ranges to test
  Output: Best parameters and performance metrics
  Usage: Fine-tuning strategy performance
```

### Risk Management
#### `riskManagement.js` - Position Sizing & Risk Control
```javascript
// CALCULATE POSITION SIZE - Risk-based position sizing
calculatePositionSize(accountBalance, riskPercentage, stopLoss)
  Purpose: Calculates safe position size based on risk tolerance
  Input: Account size, risk %, stop loss distance
  Output: Position size in units/shares
  Usage: Essential for proper risk management

// PORTFOLIO RISK ASSESSMENT - Overall portfolio risk
assessPortfolioRisk(positions, correlations)
  Purpose: Evaluates total portfolio risk considering correlations
  Input: Current positions, correlation matrix
  Output: Portfolio risk metrics and recommendations
  Usage: Managing diversification and total risk exposure
```

---

## 📈 Market Data Functions (MEDIUM PRIORITY)

### Data Retrieval & Processing
#### `marketData.js` - Real-time & Historical Data
```javascript
// GET REAL-TIME PRICE - Live market data
getRealTimePrice(symbol)
  Purpose: Fetches current market price for symbol
  Input: Trading symbol (e.g., 'BTC', 'ETH')
  Output: Current price, volume, and market data
  Usage: Real-time trading decisions

// GET HISTORICAL DATA - Historical price data
getHistoricalData(symbol, timeframe, startDate, endDate)
  Purpose: Retrieves historical OHLCV data
  Input: Symbol, timeframe (1m, 5m, 1h, 1d), date range
  Output: Array of price bars
  Usage: Strategy backtesting and model training

// CACHE MARKET DATA - Performance optimization
cacheMarketData(symbol, data, ttl)
  Purpose: Caches market data to reduce API calls
  Input: Symbol, data to cache, time-to-live
  Output: Cached data for faster access
  Usage: Improving performance and reducing API costs
```

---

## 🔧 System Functions (INFRASTRUCTURE)

### Authentication & Security
#### `auth.js` - User Authentication
```javascript
// AUTHENTICATE USER - JWT-based authentication
authenticateUser(email, password)
  Purpose: Validates user credentials and generates JWT token
  Input: User email and password
  Output: JWT token for API access
  Usage: Securing API endpoints

// AUTHORIZE TRADING - Trading permission validation
authorizeTradingAccess(userId, tradingAction)
  Purpose: Validates user permission for trading actions
  Input: User ID, requested trading action
  Output: Authorization result
  Usage: Preventing unauthorized trading
```

### Performance & Monitoring
#### `prometheusMetrics.js` - System Monitoring
```javascript
// COLLECT METRICS - Performance monitoring
collectMetrics()
  Purpose: Collects system performance metrics
  Output: CPU, memory, API response times
  Usage: System health monitoring

// TRACK API USAGE - API rate limiting
trackAPIUsage(endpoint, userId)
  Purpose: Monitors API usage for rate limiting
  Input: API endpoint, user ID
  Output: Usage statistics
  Usage: Preventing API abuse
```

---

## 🛠️ Utility Functions (SUPPORTING)

### Database Operations
#### `databaseOptimizer.js` - Database Performance
```javascript
// OPTIMIZE QUERIES - Database performance tuning
optimizeQuery(queryParams)
  Purpose: Optimizes database queries for better performance
  Input: Query parameters and conditions
  Output: Optimized query with better execution plan
  Usage: Improving database response times

// CACHE FREQUENTLY ACCESSED DATA
cacheFrequentData(dataType, cacheKey)
  Purpose: Caches frequently accessed data in memory
  Input: Data type and cache key
  Output: Cached data for faster access
  Usage: Reducing database load
```

### Notifications & Alerts
#### `notificationService.js` - User Notifications
```javascript
// SEND TRADING ALERT - Real-time trading notifications
sendTradingAlert(userId, alertType, message)
  Purpose: Sends trading alerts to users
  Input: User ID, alert type, message content
  Output: Notification delivery status
  Usage: Keeping users informed of trading events

// SCHEDULE NOTIFICATIONS - Automated notifications
scheduleNotification(userId, schedule, message)
  Purpose: Schedules future notifications
  Input: User ID, schedule (cron format), message
  Output: Scheduled notification ID
  Usage: Automated reporting and alerts
```

---

## 🎯 Quick Function Lookup

### Most Important Functions (Start Here)
1. `createLinearRegressionModel()` - Basic trend prediction
2. `createRSIStrategy()` - Simple momentum trading
3. `getRealTimePrice()` - Live market data
4. `calculatePositionSize()` - Risk management
5. `backtestStrategy()` - Strategy validation

### For New Users
1. `authenticateUser()` - Login system
2. `getRealTimePrice()` - Market data
3. `createRSIStrategy()` - Simple trading strategy
4. `sendTradingAlert()` - Notifications

### For Advanced Users
1. `createStrategy()` - Custom strategy building
2. `optimizeStrategy()` - Strategy optimization
3. `assessPortfolioRisk()` - Risk management
4. `calculateFibonacciLevels()` - Advanced analysis

### For Developers
1. `collectMetrics()` - System monitoring
2. `optimizeQuery()` - Database performance
3. `cacheMarketData()` - Performance optimization
4. `trackAPIUsage()` - API management

---

## 📚 Related Documentation

- **[API Reference](api-reference.md)** - Complete API documentation
- **[User Guide](user-guide.md)** - Step-by-step tutorials
- **[Development Guide](development.md)** - Developer setup
- **[Trading Strategies](features/trading.md)** - Strategy examples

---

## 🔍 Function Search Tips

**By Use Case:**
- **Trading**: Search for "Strategy", "Signal", "Order"
- **Analysis**: Search for "Calculate", "Indicator", "Analysis"
- **Data**: Search for "Get", "Fetch", "Cache"
- **Risk**: Search for "Risk", "Position", "Portfolio"

**By Complexity:**
- **Beginner**: RSI, Moving Average, Price fetching
- **Intermediate**: Strategy creation, backtesting
- **Advanced**: Optimization, risk management, custom indicators

**By Frequency of Use:**
- **Daily**: Price data, basic strategies, notifications
- **Weekly**: Portfolio analysis, performance review
- **Monthly**: Strategy optimization, risk assessment

---

*This function reference is updated regularly. For the latest API changes, see the [API Reference](api-reference.md).*