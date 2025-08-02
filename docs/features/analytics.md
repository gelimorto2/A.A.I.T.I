# Analytics & Reporting Guide

Comprehensive analytics and reporting system for A.A.I.T.I v1.2.1. Track performance, analyze trading patterns, and generate detailed reports.

## 📊 Analytics Overview

A.A.I.T.I provides enterprise-grade analytics capabilities:

- **Real-time Performance Tracking**: Live P&L and metrics
- **Advanced Charting**: Interactive financial charts
- **Risk Analytics**: Comprehensive risk assessment
- **Portfolio Analysis**: Multi-asset performance tracking
- **Custom Dashboards**: Personalized analytics views
- **Automated Reporting**: Scheduled reports and alerts

## 🎯 Performance Analytics

### Portfolio Performance Dashboard

![Portfolio Analytics](../screenshots/portfolio-analytics.png)
*Comprehensive portfolio performance dashboard*

#### Key Performance Indicators (KPIs)

```javascript
// Portfolio KPIs structure
{
  "totalReturn": {
    "absolute": 2547.83,      // Absolute profit/loss
    "percentage": 25.48,      // Percentage return
    "annualized": 45.67       // Annualized return
  },
  "riskMetrics": {
    "sharpeRatio": 1.45,      // Risk-adjusted returns
    "sortinoRatio": 2.18,     // Downside risk-adjusted
    "maxDrawdown": 0.156,     // Maximum drawdown
    "volatility": 0.234       // Portfolio volatility
  },
  "tradingMetrics": {
    "totalTrades": 342,
    "winRate": 0.634,
    "profitFactor": 1.87,
    "averageWin": 0.042,
    "averageLoss": -0.024
  },
  "timeMetrics": {
    "averageHoldTime": "4.2 hours",
    "longestWinStreak": 12,
    "longestLossStreak": 5,
    "bestMonth": "March 2024",
    "worstMonth": "June 2024"
  }
}
```

#### Performance Attribution Analysis

Break down performance by different factors:

```javascript
// Performance attribution
{
  "attribution": {
    "strategy": {
      "momentum": { "contribution": 0.156, "trades": 89 },
      "meanReversion": { "contribution": 0.089, "trades": 67 },
      "mlDriven": { "contribution": 0.234, "trades": 45 }
    },
    "assets": {
      "BTC": { "contribution": 0.145, "allocation": 0.40 },
      "ETH": { "contribution": 0.089, "allocation": 0.30 },
      "ADA": { "contribution": 0.067, "allocation": 0.20 },
      "SOL": { "contribution": 0.045, "allocation": 0.10 }
    },
    "timeframes": {
      "1m": { "contribution": 0.023, "trades": 156 },
      "5m": { "contribution": 0.067, "trades": 89 },
      "1h": { "contribution": 0.134, "trades": 67 },
      "1d": { "contribution": 0.089, "trades": 23 }
    }
  }
}
```

### Individual Bot Analytics

#### Bot Performance Metrics

```javascript
// Individual bot analytics
{
  "botId": "btc-momentum-bot-001",
  "name": "BTC Momentum Bot",
  "performance": {
    "totalReturn": 0.187,     // 18.7% return
    "sharpeRatio": 1.67,
    "maxDrawdown": 0.089,
    "winRate": 0.671,
    "profitFactor": 2.14,
    "volatility": 0.156,
    "beta": 1.23,             // Correlation with market
    "alpha": 0.045,           // Excess return
    "informationRatio": 0.89
  },
  "tradingHistory": {
    "totalTrades": 156,
    "winningTrades": 105,
    "losingTrades": 51,
    "breakEvenTrades": 0,
    "averageWin": 0.056,
    "averageLoss": -0.034,
    "largestWin": 0.234,
    "largestLoss": -0.089,
    "consecutiveWins": 8,
    "consecutiveLosses": 3
  },
  "timing": {
    "averageHoldTime": "3.4 hours",
    "shortestTrade": "45 seconds",
    "longestTrade": "2.3 days",
    "bestEntryTime": "09:30-10:30 UTC",
    "worstEntryTime": "15:30-16:30 UTC"
  }
}
```

#### Trade Analysis Dashboard

![Trade Analysis](../screenshots/trade-analysis.png)
*Detailed trade-by-trade analysis*

**Trade Distribution Analysis:**
- Entry/exit point analysis
- Hold time distribution
- Profit/loss distribution
- Trade frequency patterns
- Market condition correlation

**Trade Quality Metrics:**
```javascript
{
  "tradeQuality": {
    "avgEntrySlippage": 0.0023,  // 0.23% average slippage
    "avgExitSlippage": 0.0019,
    "executionSpeed": "1.2s",    // Average execution time
    "fillRate": 0.987,           // 98.7% fill rate
    "partialFills": 0.032,       // 3.2% partial fills
    "rejectedOrders": 0.008      // 0.8% rejected orders
  }
}
```

## 📈 Risk Analytics

### Risk Dashboard

Comprehensive risk monitoring and analysis:

#### Value at Risk (VaR) Analysis

```javascript
// VaR calculations
{
  "var95": {
    "daily": 0.045,           // 95% confidence, daily VaR
    "weekly": 0.089,          // Weekly VaR
    "monthly": 0.156          // Monthly VaR
  },
  "expectedShortfall": {
    "daily": 0.067,           // Expected loss beyond VaR
    "weekly": 0.123,
    "monthly": 0.234
  },
  "stressTest": {
    "scenario2008": -0.234,   // 2008 financial crisis scenario
    "scenario2020": -0.187,   // COVID crash scenario
    "scenarioCustom": -0.156  // Custom stress scenario
  }
}
```

#### Risk Decomposition

```javascript
// Risk attribution by different factors
{
  "riskDecomposition": {
    "systematic": 0.67,       // Market risk (67%)
    "specific": 0.33,         // Asset-specific risk (33%)
    "strategies": {
      "momentum": 0.45,       // 45% of total risk
      "meanReversion": 0.23,  // 23% of total risk
      "mlDriven": 0.32        // 32% of total risk
    },
    "assets": {
      "BTC": 0.56,           // BTC contributes 56% of risk
      "ETH": 0.23,           // ETH contributes 23% of risk
      "others": 0.21         // Others contribute 21% of risk
    }
  }
}
```

#### Correlation Analysis

```javascript
// Asset correlation matrix
{
  "correlationMatrix": {
    "BTC": { "BTC": 1.00, "ETH": 0.78, "ADA": 0.65, "SOL": 0.72 },
    "ETH": { "BTC": 0.78, "ETH": 1.00, "ADA": 0.71, "SOL": 0.84 },
    "ADA": { "BTC": 0.65, "ETH": 0.71, "ADA": 1.00, "SOL": 0.69 },
    "SOL": { "BTC": 0.72, "ETH": 0.84, "ADA": 0.69, "SOL": 1.00 }
  },
  "riskDiversification": {
    "effectiveDiversification": 0.73, // 73% diversification benefit
    "concentrationRisk": 0.34,        // 34% concentration in top asset
    "correlationRisk": "MEDIUM"       // Overall correlation risk level
  }
}
```

### Drawdown Analysis

#### Drawdown Metrics

```javascript
// Detailed drawdown analysis
{
  "drawdownAnalysis": {
    "currentDrawdown": 0.023,     // Current drawdown
    "maxDrawdown": 0.156,         // Maximum historical drawdown
    "avgDrawdown": 0.045,         // Average drawdown
    "drawdownDuration": {
      "current": "12 days",       // Current drawdown duration
      "maximum": "45 days",       // Longest drawdown period
      "average": "8.5 days"       // Average recovery time
    },
    "drawdownFrequency": 0.23,    // 23% of time in drawdown
    "recoveryStats": {
      "averageRecoveryTime": "11.3 days",
      "fastestRecovery": "2.1 days",
      "slowestRecovery": "67 days"
    }
  }
}
```

![Drawdown Analysis](../screenshots/drawdown-analysis.png)
*Comprehensive drawdown visualization*

## 📊 Advanced Charting

### Interactive Charts

A.A.I.T.I provides professional-grade charting:

#### Chart Types
- **Candlestick Charts**: OHLC price data
- **Line Charts**: Clean price trends  
- **Area Charts**: Filled price movements
- **Volume Charts**: Trading volume analysis
- **Performance Charts**: Cumulative returns
- **Drawdown Charts**: Risk visualization

#### Technical Indicators
```javascript
// Available technical indicators
{
  "movingAverages": {
    "sma": [5, 10, 20, 50, 200],
    "ema": [12, 26, 50, 100],
    "wma": [10, 20, 50],
    "vwma": [20, 50]
  },
  "oscillators": {
    "rsi": { period: 14, overbought: 70, oversold: 30 },
    "macd": { fast: 12, slow: 26, signal: 9 },
    "stoch": { kPeriod: 14, dPeriod: 3 },
    "williams": { period: 14 }
  },
  "volatility": {
    "bollingerBands": { period: 20, multiplier: 2 },
    "atr": { period: 14 },
    "keltnerChannels": { period: 20, multiplier: 2 }
  },
  "volume": {
    "obv": true,
    "volumeProfile": true,
    "chaikinMoney": { period: 21 },
    "volumeOscillator": { fast: 12, slow: 26 }
  }
}
```

#### Custom Chart Configurations

```javascript
// Chart customization options
{
  "chartConfig": {
    "theme": "dark",              // Light/dark theme
    "timeframe": "1h",            // Default timeframe
    "candleStyle": "hollow",      // Solid/hollow candles
    "showVolume": true,           // Volume bars
    "showGrid": true,             // Price grid
    "annotations": {
      "trades": true,             // Show trade markers
      "alerts": true,             // Show alert levels
      "support": true,            // Support/resistance lines
      "fibonacci": true           // Fibonacci retracements
    },
    "overlays": {
      "bollinger": true,
      "ema20": true,
      "sma50": true,
      "volume": true
    }
  }
}
```

### Chart Analysis Tools

#### Pattern Recognition
- **Candlestick Patterns**: Doji, hammer, engulfing, etc.
- **Chart Patterns**: Head and shoulders, triangles, flags
- **Trend Lines**: Support/resistance identification
- **Fibonacci Levels**: Retracement and extension levels

#### Market Analysis
```javascript
// Market analysis features
{
  "marketAnalysis": {
    "trendAnalysis": {
      "shortTerm": "BULLISH",     // 1-7 days
      "mediumTerm": "NEUTRAL",    // 1-4 weeks  
      "longTerm": "BULLISH",      // 1-3 months
      "trendStrength": 0.67       // Trend strength score
    },
    "volatilityAnalysis": {
      "currentVolatility": 0.034,
      "historicalPercentile": 0.78, // 78th percentile
      "volatilityTrend": "INCREASING",
      "volatilityCluster": true
    },
    "supportResistance": {
      "nearestSupport": 41250,
      "nearestResistance": 43500,
      "keyLevels": [40000, 42000, 45000, 50000]
    }
  }
}
```

## 📋 Reporting System

### Automated Reports

#### Daily Performance Report

```javascript
// Daily report structure
{
  "reportType": "daily_performance",
  "date": "2025-01-08",
  "summary": {
    "totalReturn": 0.023,        // 2.3% daily return
    "bestBot": "btc-momentum-001",
    "worstBot": "eth-scalper-002",
    "totalTrades": 23,
    "winRate": 0.652,
    "largestWin": 0.089,
    "largestLoss": -0.034
  },
  "botPerformance": [
    {
      "botName": "BTC Momentum Bot",
      "return": 0.034,
      "trades": 8,
      "winRate": 0.75,
      "pnl": 340.50
    }
    // ... more bots
  ],
  "marketConditions": {
    "btcPrice": 43250,
    "ethPrice": 3420,
    "marketVolatility": 0.045,
    "fearGreedIndex": 68
  },
  "alerts": [
    {
      "type": "HIGH_DRAWDOWN",
      "bot": "ada-scalper-001",
      "value": 0.089,
      "threshold": 0.08
    }
  ]
}
```

#### Weekly Summary Report

```javascript
// Weekly report structure
{
  "reportType": "weekly_summary",
  "week": "2025-W02",
  "dateRange": {
    "start": "2025-01-06",
    "end": "2025-01-12"
  },
  "performance": {
    "weeklyReturn": 0.087,       // 8.7% weekly return
    "bestDay": "2025-01-08",
    "worstDay": "2025-01-10",
    "volatility": 0.156,
    "sharpeRatio": 1.34,
    "maxDrawdown": 0.045
  },
  "tradingActivity": {
    "totalTrades": 156,
    "dailyAverage": 22.3,
    "winRate": 0.634,
    "profitFactor": 1.87,
    "commission": 23.45
  },
  "strategyAnalysis": {
    "bestStrategy": "ml_driven",
    "worstStrategy": "scalping",
    "mostActive": "momentum",
    "consistentPerformer": "mean_reversion"
  }
}
```

#### Monthly Portfolio Review

```javascript
// Monthly comprehensive report
{
  "reportType": "monthly_review",
  "month": "2025-01",
  "performance": {
    "monthlyReturn": 0.234,      // 23.4% monthly return
    "annualizedReturn": 0.456,   // 45.6% annualized
    "volatility": 0.189,
    "sharpeRatio": 1.67,
    "sortinoRatio": 2.34,
    "maxDrawdown": 0.123,
    "calmarRatio": 1.89
  },
  "riskAnalysis": {
    "var95Daily": 0.045,
    "expectedShortfall": 0.067,
    "betaToMarket": 1.23,
    "correlationToBTC": 0.78,
    "diversificationRatio": 0.67
  },
  "tradingStats": {
    "totalTrades": 567,
    "winRate": 0.645,
    "profitFactor": 1.94,
    "averageWin": 0.045,
    "averageLoss": -0.028,
    "totalCommission": 124.56
  },
  "insights": [
    "Best performing strategy: ML-driven (+34.5%)",
    "Highest Sharpe ratio achieved in Q1",
    "Consider reducing correlation between ETH and ADA positions",
    "Momentum strategy underperformed in sideways markets"
  ]
}
```

### Custom Reports

#### Report Builder

```javascript
// Custom report configuration
{
  "reportName": "Custom Trading Report",
  "schedule": "weekly",          // daily, weekly, monthly
  "format": "pdf",              // pdf, html, json, csv
  "recipients": ["trader@example.com"],
  "sections": [
    {
      "type": "performance_summary",
      "timeframe": "last_30_days",
      "metrics": ["return", "sharpe", "drawdown", "winRate"]
    },
    {
      "type": "risk_analysis",
      "include": ["var", "correlation", "concentration"]
    },
    {
      "type": "trade_analysis",
      "filters": {
        "minPnL": 50,
        "strategies": ["momentum", "ml_driven"]
      }
    },
    {
      "type": "charts",
      "charts": [
        { "type": "equity_curve", "timeframe": "1h" },
        { "type": "drawdown", "timeframe": "1d" },
        { "type": "monthly_returns", "style": "heatmap" }
      ]
    }
  ]
}
```

#### Export Options

```javascript
// Export configurations
{
  "exportFormats": {
    "pdf": {
      "enabled": true,
      "template": "professional",
      "includeCharts": true,
      "watermark": false
    },
    "excel": {
      "enabled": true,
      "multipleSheets": true,
      "includeRawData": true,
      "charts": true
    },
    "csv": {
      "enabled": true,
      "separator": ",",
      "includeHeaders": true,
      "timeFormat": "ISO8601"
    },
    "json": {
      "enabled": true,
      "pretty": true,
      "includeMetadata": true
    }
  }
}
```

## 🔍 Advanced Analytics

### Machine Learning Performance Analysis

#### Model Performance Tracking

```javascript
// ML model analytics
{
  "modelPerformance": {
    "modelId": "lstm-btc-001",
    "accuracy": 0.734,           // 73.4% directional accuracy
    "precision": 0.678,
    "recall": 0.789,
    "f1Score": 0.729,
    "sharpeRatio": 1.45,         // Trading performance
    "informationRatio": 0.89,
    "predictionStats": {
      "totalPredictions": 1234,
      "correctDirection": 906,
      "avgConfidence": 0.67,
      "calibrationError": 0.045  // How well calibrated are confidence scores
    }
  }
}
```

#### Feature Importance Analysis

```javascript
// Feature importance for ML models
{
  "featureImportance": {
    "technicalIndicators": {
      "rsi": 0.234,              // 23.4% importance
      "macd": 0.189,
      "bollinger": 0.156,
      "ema20": 0.123,
      "volume": 0.098
    },
    "marketData": {
      "price": 0.345,
      "volume": 0.234,
      "volatility": 0.189,
      "spread": 0.123
    },
    "timeFeatures": {
      "hourOfDay": 0.089,
      "dayOfWeek": 0.056,
      "monthOfYear": 0.034
    }
  }
}
```

### Market Analysis

#### Market Regime Detection

```javascript
// Market regime analysis
{
  "marketRegime": {
    "current": "TRENDING_BULL",
    "confidence": 0.78,
    "duration": "23 days",
    "regimes": {
      "trending_bull": {
        "probability": 0.45,
        "avgDuration": "28 days",
        "bestStrategy": "momentum"
      },
      "trending_bear": {
        "probability": 0.15,
        "avgDuration": "21 days", 
        "bestStrategy": "short_momentum"
      },
      "sideways": {
        "probability": 0.30,
        "avgDuration": "14 days",
        "bestStrategy": "mean_reversion"
      },
      "high_volatility": {
        "probability": 0.10,
        "avgDuration": "7 days",
        "bestStrategy": "volatility_breakout"
      }
    }
  }
}
```

#### Sentiment Analysis

```javascript
// Market sentiment indicators
{
  "sentiment": {
    "fearGreedIndex": 68,        // 0-100 scale
    "socialSentiment": 0.67,     // Positive sentiment
    "newsSentiment": 0.45,       // Neutral to positive
    "onChainMetrics": {
      "networkActivity": 0.78,   // High activity
      "hodlerSentiment": 0.82,   // Strong hodling
      "exchangeFlows": -0.23     // Net outflow (bullish)
    },
    "technicalSentiment": {
      "trendStrength": 0.67,
      "momentumScore": 0.73,
      "volatilityRegime": "NORMAL"
    }
  }
}
```

## 📱 Real-Time Analytics

### Live Dashboard

Real-time analytics with WebSocket updates:

#### Live Metrics Stream

```javascript
// Real-time metrics update
{
  "timestamp": "2025-01-08T15:30:00Z",
  "metrics": {
    "portfolioValue": 112547.83,
    "dailyPnL": 1247.56,
    "dailyReturn": 0.0112,
    "unrealizedPnL": 234.56,
    "activeBots": 7,
    "activePositions": 12,
    "totalExposure": 89234.56
  },
  "alerts": [
    {
      "type": "HIGH_PROFIT",
      "bot": "btc-momentum-001",
      "value": 0.089,
      "timestamp": "2025-01-08T15:29:45Z"
    }
  ]
}
```

#### Performance Streaming

```javascript
// Live performance updates
{
  "livePerformance": {
    "1min": { "return": 0.0023, "volume": 12345 },
    "5min": { "return": 0.0089, "volume": 56789 },
    "1hour": { "return": 0.0234, "volume": 234567 },
    "1day": { "return": 0.0456, "volume": 1234567 }
  },
  "botUpdates": [
    {
      "botId": "btc-momentum-001",
      "status": "ACTIVE",
      "lastTrade": "2025-01-08T15:28:30Z",
      "pnl": 456.78,
      "positions": 2
    }
  ]
}
```

### Mobile Analytics

Optimized analytics for mobile devices:

#### Mobile Dashboard
- Touch-friendly charts
- Swipe navigation
- Key metrics overview
- Push notifications for alerts
- Offline data caching

#### Quick Stats
```javascript
// Mobile-optimized quick stats
{
  "quickStats": {
    "todayPnL": "+$1,247.56",
    "winRate": "64.5%",
    "bestBot": "BTC Momentum",
    "alert": "2 new alerts",
    "status": "All systems normal"
  }
}
```

---

**Next Steps:**
- Set up [Notifications](notifications.md) for automated alerts
- Configure [Portfolio Management](portfolio.md) for advanced strategies
- Explore [Trading Interface](trading.md) for bot management
- Check [API Reference](../api-reference.md) for custom integrations