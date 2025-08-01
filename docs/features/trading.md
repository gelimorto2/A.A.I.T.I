# Trading Interface Guide

Complete guide to A.A.I.T.I's trading interface and bot management system. Learn how to create, configure, and manage AI-powered trading bots.

## 🤖 Trading Bot Overview

A.A.I.T.I's trading system provides intelligent, automated trading capabilities with:

- **Multiple Trading Strategies**: Scalping, momentum, mean reversion, ML-driven
- **Advanced Risk Management**: Stop losses, take profits, position sizing
- **Real-time Monitoring**: Live performance tracking and alerts
- **Paper Trading**: Test strategies without real money
- **Comprehensive Analytics**: Detailed performance metrics and reporting

## 🚀 Getting Started with Trading Bots

### Creating Your First Trading Bot

1. **Navigate to Trading Bots** in the sidebar
2. **Click "Create New Bot"**
3. **Configure basic settings:**

```json
{
  "name": "My First BTC Bot",
  "symbol": "BTC",
  "strategy": "momentum",
  "initialBalance": 10000,
  "active": false
}
```

4. **Set risk parameters** (covered below)
5. **Review and create** the bot
6. **Test with paper trading** before going live

![Bot Creation Interface](../screenshots/bot-creation.png)
*Comprehensive bot configuration interface*

### Bot Configuration Parameters

#### Basic Settings
- **Name**: Descriptive bot name for identification
- **Symbol**: Target cryptocurrency (BTC, ETH, ADA, etc.)
- **Strategy**: Trading strategy algorithm
- **Initial Balance**: Starting capital for the bot
- **Status**: Active/inactive state

#### Risk Management
- **Risk Per Trade**: Percentage of balance per trade (1-5% recommended)
- **Stop Loss**: Maximum loss threshold (2-10%)
- **Take Profit**: Profit target threshold (4-20%)
- **Max Positions**: Maximum concurrent positions (1-5)
- **Max Daily Trades**: Daily trading limit for risk control

#### Advanced Settings
- **Timeframe**: Chart timeframe for analysis (1m, 5m, 1h, 1d)
- **Indicators**: Technical indicators to use
- **ML Model**: Associated machine learning model (optional)
- **Rebalance Period**: Portfolio rebalancing frequency

## 📊 Trading Strategies

### 1. Momentum Strategy

**Best for**: Trending markets, breakout patterns
**Timeframe**: 15m - 4h
**Risk**: Medium to High

```javascript
// Momentum strategy configuration
{
  "strategy": "momentum",
  "parameters": {
    "lookbackPeriod": 20,
    "momentumThreshold": 0.02,
    "trendConfirmation": true,
    "volumeFilter": true,
    "rsiFilter": {
      "enabled": true,
      "oversold": 30,
      "overbought": 70
    }
  }
}
```

**How it works:**
- Identifies strong price momentum
- Enters positions in direction of trend
- Uses RSI to avoid overbought/oversold conditions
- Confirms with volume analysis

**Performance Characteristics:**
- High profits in trending markets
- Losses during sideways movement
- Requires proper stop-loss management

### 2. Mean Reversion Strategy

**Best for**: Range-bound markets, stable cryptocurrencies
**Timeframe**: 5m - 1h
**Risk**: Low to Medium

```javascript
// Mean reversion strategy configuration
{
  "strategy": "mean_reversion",
  "parameters": {
    "lookbackPeriod": 50,
    "standardDeviations": 2,
    "meanType": "sma", // Simple Moving Average
    "exitCondition": "mean_cross",
    "bollingerBands": {
      "enabled": true,
      "period": 20,
      "multiplier": 2
    }
  }
}
```

**How it works:**
- Identifies when prices deviate from average
- Buys when price is below mean
- Sells when price returns to mean
- Uses Bollinger Bands for confirmation

**Performance Characteristics:**
- Consistent small profits
- Lower risk than momentum strategies
- Struggles in strong trends

### 3. Scalping Strategy

**Best for**: High-frequency trading, stable markets
**Timeframe**: 1m - 5m
**Risk**: Medium (requires careful management)

```javascript
// Scalping strategy configuration
{
  "strategy": "scalping",
  "parameters": {
    "targetProfit": 0.005, // 0.5% target
    "stopLoss": 0.003,     // 0.3% stop loss
    "maxHoldTime": 300,    // 5 minutes max
    "spreadFilter": 0.001, // Minimum spread
    "volumeThreshold": 1000000,
    "indicators": {
      "ema": [9, 21],
      "rsi": 14,
      "macd": [12, 26, 9]
    }
  }
}
```

**How it works:**
- Makes many small, quick trades
- Profits from small price movements
- Strict time and profit limits
- High-frequency execution

**Performance Characteristics:**
- Many small profits accumulate
- Requires low latency execution
- Higher transaction costs

### 4. ML-Driven Strategy

**Best for**: Complex pattern recognition, adaptive trading
**Timeframe**: 1h - 1d
**Risk**: Variable (depends on model)

```javascript
// ML-driven strategy configuration
{
  "strategy": "ml_driven",
  "parameters": {
    "modelId": "your-trained-model-id",
    "confidenceThreshold": 0.7,
    "retrainFrequency": "weekly",
    "ensembleMethod": "weighted_average",
    "featureSet": {
      "technicalIndicators": true,
      "marketSentiment": true,
      "volumeProfile": true,
      "macroeconomic": false
    }
  }
}
```

**How it works:**
- Uses trained ML models for predictions
- Enters trades based on model confidence
- Adapts to changing market conditions
- Combines multiple data sources

**Performance Characteristics:**
- Can adapt to market changes
- Performance depends on model quality
- Requires regular retraining

## 🛡 Risk Management

### Position Sizing

A.A.I.T.I supports multiple position sizing methods:

#### Fixed Percentage
```javascript
{
  "positionSizing": "fixed_percentage",
  "riskPerTrade": 0.02, // 2% of balance per trade
  "maxPositionSize": 0.25 // Maximum 25% of balance
}
```

#### Kelly Criterion
```javascript
{
  "positionSizing": "kelly_criterion",
  "winRate": 0.6,      // Historical win rate
  "avgWin": 0.05,      // Average win percentage
  "avgLoss": 0.03,     // Average loss percentage
  "maxKelly": 0.25     // Cap Kelly percentage
}
```

#### Volatility-Based
```javascript
{
  "positionSizing": "volatility_based",
  "targetVolatility": 0.02, // 2% daily volatility target
  "lookbackPeriod": 30,     // Days for volatility calc
  "minPosition": 0.01,      // Minimum position size
  "maxPosition": 0.10       // Maximum position size
}
```

### Stop Loss Management

#### Fixed Stop Loss
- Set percentage below entry price
- Automatically executes when hit
- Simple and predictable

#### Trailing Stop Loss
```javascript
{
  "stopLoss": {
    "type": "trailing",
    "initialStop": 0.05,    // 5% initial stop
    "trailAmount": 0.02,    // 2% trailing distance
    "minProfit": 0.01       // Minimum profit before trailing
  }
}
```

#### ATR-Based Stop Loss
```javascript
{
  "stopLoss": {
    "type": "atr_based",
    "atrPeriod": 14,
    "atrMultiplier": 2.0,   // 2x ATR for stop distance
    "minStop": 0.02,        // Minimum 2% stop
    "maxStop": 0.08         // Maximum 8% stop
  }
}
```

### Take Profit Strategies

#### Fixed Take Profit
- Set percentage above entry price
- Locks in profits automatically
- Risk-reward ratio management

#### Partial Take Profits
```javascript
{
  "takeProfit": {
    "type": "partial",
    "levels": [
      { "percentage": 50, "profit": 0.03 }, // 50% at 3% profit
      { "percentage": 30, "profit": 0.06 }, // 30% at 6% profit
      { "percentage": 20, "profit": 0.12 }  // 20% at 12% profit
    ]
  }
}
```

## 📈 Bot Monitoring & Management

### Real-Time Bot Dashboard

![Bot Dashboard](../screenshots/bot-dashboard.png)
*Live bot monitoring interface*

The bot dashboard provides:

#### Performance Metrics
- **Current P&L**: Real-time profit/loss
- **Total Trades**: Number of completed trades
- **Win Rate**: Percentage of profitable trades
- **Average Trade**: Mean profit per trade
- **Drawdown**: Current drawdown from peak
- **Sharpe Ratio**: Risk-adjusted performance

#### Live Status Indicators
- **Bot Status**: Active, paused, stopped, error
- **Last Trade**: Time and details of recent trade
- **Current Position**: Open positions and sizes
- **Next Action**: Predicted next trade decision
- **Model Confidence**: ML model prediction confidence

#### Risk Monitoring
- **Daily Loss**: Current day's losses
- **Position Exposure**: Total position value
- **Available Balance**: Unused trading capital
- **Risk Utilization**: Percentage of risk budget used

### Bot Control Panel

#### Start/Stop Controls
```javascript
// Start bot with validation
await startBot(botId, {
  validateBalance: true,
  checkConnections: true,
  performHealthCheck: true
});

// Stop bot gracefully
await stopBot(botId, {
  closePositions: true,
  saveState: true,
  generateReport: true
});

// Pause bot (maintain positions)
await pauseBot(botId, {
  stopNewTrades: true,
  maintainPositions: true
});
```

#### Emergency Controls
- **Emergency Stop**: Immediately halt all trading
- **Close All Positions**: Market orders to close positions
- **Reduce Risk**: Lower position sizes temporarily
- **Switch to Conservative**: Use safer strategy parameters

### Performance Analytics

#### Trade Analysis
```javascript
// Detailed trade breakdown
{
  "totalTrades": 156,
  "winningTrades": 94,
  "losingTrades": 62,
  "winRate": 0.603,
  "profitFactor": 1.85,
  "averageWin": 0.042,
  "averageLoss": -0.024,
  "largestWin": 0.127,
  "largestLoss": -0.089,
  "consecutiveWins": 8,
  "consecutiveLosses": 4
}
```

#### Risk Metrics
```javascript
// Risk analysis
{
  "maxDrawdown": 0.156,
  "currentDrawdown": 0.023,
  "volatility": 0.034,
  "sharpeRatio": 1.42,
  "sortinoRatio": 2.18,
  "calmarRatio": 0.89,
  "varAtRisk": 0.045, // 95% VaR
  "expectedShortfall": 0.067
}
```

#### Performance Attribution
- **Strategy Performance**: How well the core strategy performed
- **Timing Performance**: Entry/exit timing effectiveness
- **Risk Management**: Impact of stop losses and position sizing
- **Market Conditions**: Performance in different market environments

## 🔄 Strategy Optimization

### A/B Testing Framework

Test multiple strategy variants simultaneously:

```javascript
// A/B test configuration
{
  "testName": "Momentum Strategy Optimization",
  "variants": [
    {
      "name": "Variant A - Conservative",
      "allocation": 0.33,
      "parameters": {
        "riskPerTrade": 0.01,
        "stopLoss": 0.03,
        "takeProfit": 0.06
      }
    },
    {
      "name": "Variant B - Moderate",
      "allocation": 0.33,
      "parameters": {
        "riskPerTrade": 0.02,
        "stopLoss": 0.05,
        "takeProfit": 0.10
      }
    },
    {
      "name": "Variant C - Aggressive",
      "allocation": 0.34,
      "parameters": {
        "riskPerTrade": 0.03,
        "stopLoss": 0.07,
        "takeProfit": 0.15
      }
    }
  ],
  "testDuration": 30, // days
  "successMetric": "sharpe_ratio"
}
```

### Parameter Optimization

Automatically find optimal parameters:

```javascript
// Optimization configuration
{
  "method": "genetic_algorithm",
  "parameters": {
    "riskPerTrade": { "min": 0.01, "max": 0.05, "step": 0.005 },
    "stopLoss": { "min": 0.02, "max": 0.10, "step": 0.01 },
    "takeProfit": { "min": 0.04, "max": 0.20, "step": 0.02 },
    "lookbackPeriod": { "min": 10, "max": 50, "step": 5 }
  },
  "optimizationTarget": "sharpe_ratio",
  "constraints": {
    "maxDrawdown": 0.20,
    "minWinRate": 0.45,
    "minTrades": 50
  },
  "populationSize": 50,
  "generations": 100
}
```

### Walk-Forward Analysis

Test strategy robustness over time:

```javascript
// Walk-forward configuration
{
  "trainingPeriod": 90,  // days
  "testingPeriod": 30,   // days
  "stepSize": 15,        // days to advance
  "reoptimizeFrequency": 30, // days
  "evaluationMetrics": [
    "total_return",
    "sharpe_ratio",
    "max_drawdown",
    "win_rate"
  ]
}
```

## 🔔 Alerts & Notifications

### Trading Alerts

Set up notifications for important trading events:

#### Trade Execution Alerts
```javascript
{
  "alertType": "trade_execution",
  "conditions": {
    "allTrades": true,
    "profitableOnly": false,
    "minTradeSize": 0.01
  },
  "delivery": {
    "email": true,
    "webhook": true,
    "inApp": true
  },
  "template": "Trade executed: {action} {amount} {symbol} at {price}"
}
```

#### Performance Alerts
```javascript
{
  "alertType": "performance",
  "conditions": {
    "dailyLoss": 0.05,      // Alert if daily loss > 5%
    "drawdown": 0.15,       // Alert if drawdown > 15%
    "consecutiveLosses": 5,  // Alert after 5 consecutive losses
    "lowWinRate": 0.40      // Alert if win rate drops below 40%
  }
}
```

#### Risk Management Alerts
```javascript
{
  "alertType": "risk_management",
  "conditions": {
    "stopLossHit": true,
    "positionSizeExceeded": true,
    "riskLimitReached": true,
    "emergencyStopTriggered": true
  }
}
```

### Custom Alert Scripts

Create custom alerts with JavaScript:

```javascript
// Custom alert logic
function customAlertLogic(bot, marketData, portfolio) {
  // Example: Alert when RSI divergence detected
  const rsi = calculateRSI(marketData.prices, 14);
  const priceHigh = Math.max(...marketData.prices.slice(-5));
  const rsiHigh = Math.max(...rsi.slice(-5));
  
  if (marketData.currentPrice > priceHigh && rsi.current < rsiHigh) {
    return {
      trigger: true,
      message: `Bearish RSI divergence detected for ${bot.symbol}`,
      severity: 'medium',
      action: 'consider_exit'
    };
  }
  
  return { trigger: false };
}
```

## 📱 Mobile Trading

### Mobile Interface

A.A.I.T.I's responsive design provides full mobile functionality:

#### Mobile Dashboard
- Touch-optimized controls
- Swipe gestures for navigation
- Real-time push notifications
- Mobile-friendly charts

#### Quick Actions
- Start/stop bots with one tap
- Emergency stop button
- Quick position overview
- Instant alerts

#### Mobile-Specific Features
```javascript
// Mobile push notifications
{
  "mobileNotifications": {
    "enabled": true,
    "criticalOnly": false,
    "quietHours": {
      "start": "22:00",
      "end": "07:00"
    },
    "vibration": true,
    "sound": "trading_alert.mp3"
  }
}
```

## 🔧 Advanced Features

### Multi-Asset Trading

Trade multiple cryptocurrencies simultaneously:

```javascript
// Multi-asset portfolio configuration
{
  "portfolioMode": "multi_asset",
  "assets": [
    {
      "symbol": "BTC",
      "allocation": 0.40,
      "strategy": "momentum",
      "riskBudget": 0.30
    },
    {
      "symbol": "ETH",
      "allocation": 0.30,
      "strategy": "mean_reversion",
      "riskBudget": 0.25
    },
    {
      "symbol": "ADA",
      "allocation": 0.20,
      "strategy": "ml_driven",
      "riskBudget": 0.20
    },
    {
      "symbol": "SOL",
      "allocation": 0.10,
      "strategy": "scalping",
      "riskBudget": 0.15
    }
  ],
  "rebalanceFrequency": "weekly",
  "correlationLimit": 0.7
}
```

### Strategy Combination

Combine multiple strategies for better performance:

```javascript
// Strategy ensemble configuration
{
  "ensembleStrategy": {
    "strategies": [
      {
        "name": "momentum",
        "weight": 0.4,
        "timeframe": "1h",
        "allocation": 0.6
      },
      {
        "name": "mean_reversion",
        "weight": 0.3,
        "timeframe": "15m",
        "allocation": 0.3
      },
      {
        "name": "ml_driven",
        "weight": 0.3,
        "timeframe": "4h",
        "allocation": 0.1
      }
    ],
    "combineMethod": "weighted_signals",
    "conflictResolution": "confidence_based"
  }
}
```

### Dynamic Risk Adjustment

Automatically adjust risk based on market conditions:

```javascript
// Dynamic risk management
{
  "dynamicRisk": {
    "enabled": true,
    "baselines": {
      "riskPerTrade": 0.02,
      "stopLoss": 0.05,
      "maxPositions": 3
    },
    "adjustments": [
      {
        "condition": "high_volatility",
        "threshold": 0.05, // 5% daily volatility
        "adjustments": {
          "riskPerTrade": 0.5,  // Reduce to 50%
          "stopLoss": 1.5,      // Increase stop loss by 50%
          "maxPositions": 0.6   // Reduce max positions
        }
      },
      {
        "condition": "losing_streak",
        "threshold": 3, // 3 consecutive losses
        "adjustments": {
          "riskPerTrade": 0.5,
          "stopLoss": 0.8,
          "takeProfit": 1.2
        }
      }
    ]
  }
}
```

---

**Next Steps:**
- Explore [Analytics & Reporting](analytics.md) for performance analysis
- Set up [Notifications](notifications.md) for trading alerts  
- Learn about [Portfolio Management](portfolio.md) for advanced strategies
- Check [API Reference](../api-reference.md) for programmatic access