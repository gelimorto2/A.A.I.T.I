# Quick Start Guide

Get A.A.I.T.I v1.2.1 up and running in minutes. This guide covers the fastest path to start trading with AI-powered algorithms.

## ⚡ 5-Minute Setup

### Step 1: Install (30 seconds)

**Docker Method (Recommended):**
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./install-docker.sh
```

**Manual Method:**
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
npm run setup
npm start
```

### Step 2: Access Interface (30 seconds)

1. **Open your browser**: http://localhost:3000
2. **Register account**: Click "Register" and create your trader account
3. **Login**: Use your credentials to access the dashboard

![Quick Login](screenshots/quick-login.png)

### Step 3: Create Your First AI Model (2 minutes)

1. **Go to ML Models** in the sidebar
2. **Click "Create New Model"**
3. **Use these settings for your first model:**

```json
{
  "name": "My First BTC Predictor",
  "algorithmType": "arima",
  "targetTimeframe": "1h",
  "symbols": ["BTC"],
  "parameters": {
    "p": 2,
    "d": 1,
    "q": 2
  },
  "trainingPeriodDays": 90
}
```

4. **Click "Train Model"** and wait ~30 seconds
5. **View your trained model** with performance metrics

![First Model](screenshots/first-model-creation.png)

### Step 4: Make Your First Prediction (1 minute)

1. **Select your trained model**
2. **Click "Make Prediction"**
3. **Choose BTC as target symbol**
4. **Get instant prediction** with confidence score

![First Prediction](screenshots/first-prediction.png)

### Step 5: Set Up Your First Trading Bot (1 minute)

1. **Go to Trading Bots** in sidebar
2. **Click "Create Bot"**
3. **Use these safe settings:**

```json
{
  "name": "BTC Demo Bot",
  "symbol": "BTC",
  "strategy": "momentum",
  "initialBalance": 1000,
  "riskPerTrade": 0.01,
  "stopLoss": 0.02,
  "takeProfit": 0.04,
  "maxPositions": 1
}
```

4. **Start the bot** and watch it analyze market conditions

**🎉 Congratulations!** You now have A.A.I.T.I running with:
- ✅ AI model trained and making predictions
- ✅ Trading bot analyzing the market
- ✅ Real-time dashboard monitoring everything

## 🎯 Next Steps (10 minutes)

### Explore Advanced Features

#### 1. Try Different ML Models (2 minutes)

**Time Series Models:**
- **ARIMA**: Classic forecasting (good for beginners)
- **SARIMA**: Seasonal patterns (for recurring trends)
- **Prophet**: Facebook's algorithm (robust and user-friendly)

**Deep Learning:**
- **LSTM**: Neural networks for complex patterns
- **Deep NN**: Multi-layer networks for advanced analysis

```bash
# Quick model comparison
curl -X POST http://localhost:5000/api/ml/compare \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"modelIds":["model1","model2"],"metric":"accuracy"}'
```

#### 2. Run a Backtest (3 minutes)

Test your model's performance on historical data:

1. **Select your model**
2. **Click "Run Backtest"**
3. **Use these settings:**

```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-06-30",
  "initialCapital": 10000,
  "commission": 0.001,
  "riskPerTrade": 0.02
}
```

4. **Analyze results**: View profit/loss, win rate, and trade history

![Backtest Results](screenshots/quick-backtest.png)

#### 3. Set Up Notifications (2 minutes)

Get alerts for important events:

1. **Go to Settings > Notifications**
2. **Enable email notifications**
3. **Add webhook URL** (optional)
4. **Set alert thresholds**

```json
{
  "email": "your@email.com",
  "events": [
    "trade_executed",
    "bot_stopped",
    "model_retrained",
    "high_profit_alert"
  ]
}
```

#### 4. Monitor Performance (3 minutes)

Use the built-in monitoring tools:

1. **System Health**: http://localhost:5000/api/health
2. **Metrics Dashboard**: Built into the interface
3. **Real-time Charts**: Live P&L and performance tracking

## 🚀 Advanced Quick Setups

### For Scalpers (High-Frequency Trading)

```json
{
  "model": {
    "algorithmType": "lstm",
    "targetTimeframe": "5m",
    "parameters": {
      "units": 64,
      "layers": 3,
      "dropout": 0.2
    }
  },
  "bot": {
    "strategy": "scalping",
    "riskPerTrade": 0.005,
    "stopLoss": 0.01,
    "takeProfit": 0.015,
    "maxPositions": 5
  }
}
```

### For Long-Term Investors

```json
{
  "model": {
    "algorithmType": "prophet",
    "targetTimeframe": "1d",
    "parameters": {
      "seasonality_mode": "multiplicative",
      "yearly_seasonality": true
    }
  },
  "bot": {
    "strategy": "momentum",
    "riskPerTrade": 0.03,
    "stopLoss": 0.10,
    "takeProfit": 0.20,
    "maxPositions": 3
  }
}
```

### For Portfolio Optimization

```json
{
  "symbols": ["BTC", "ETH", "ADA", "SOL"],
  "optimization": {
    "method": "risk_parity",
    "constraints": {
      "maxWeight": 0.4,
      "minWeight": 0.1
    }
  }
}
```

## 🎛 Dashboard Tour (5 minutes)

### Main Dashboard Overview

![Dashboard Tour](screenshots/dashboard-tour.png)

**Key Areas:**
1. **Top Bar**: System health, user info, notifications
2. **Left Sidebar**: Navigation to all features
3. **Main Area**: Live metrics, charts, and data
4. **Right Panel**: Market data feed and alerts

### Essential Panels

**System Health (Top Right)**
- Server uptime and performance
- Database connectivity status
- Market data feed health
- Memory and CPU usage

**Portfolio Overview (Center)**
- Total balance and P&L
- Active positions count
- Win rate and performance metrics
- Daily/weekly/monthly charts

**Active Bots (Left)**
- Running bot status
- Individual bot performance
- Quick start/stop controls
- Bot configuration access

**Market Data (Right)**
- Live cryptocurrency prices
- 24-hour changes and volume
- Price alerts and notifications
- Market cap and trading data

## ⚙️ Quick Configuration

### Essential Settings

1. **Trading Settings** (Settings > Trading)
   ```json
   {
     "maxPositions": 5,
     "defaultRisk": 0.02,
     "commission": 0.001,
     "slippage": 0.0005
   }
   ```

2. **Market Data Settings** (Settings > Market)
   ```json
   {
     "refreshInterval": 5000,
     "dataProvider": "coingecko",
     "cacheTimeout": 60000
   }
   ```

3. **Notification Settings** (Settings > Notifications)
   ```json
   {
     "emailEnabled": true,
     "webhookEnabled": false,
     "alertThresholds": {
       "profitAlert": 5.0,
       "lossAlert": -2.0
     }
   }
   ```

## 🔧 Quick Troubleshooting

### Common 5-Minute Fixes

**Issue: "Backend not responding"**
```bash
# Check if services are running
curl http://localhost:5000/api/health

# Restart if needed
make restart  # Docker
npm start     # Manual
```

**Issue: "Model training fails"**
- Ensure you have enough training data (90+ days recommended)
- Check system memory (4GB+ recommended)
- Try simpler algorithms first (linear_regression, arima)

**Issue: "No market data"**
```bash
# Test CoinGecko API directly
curl "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"

# Check your internet connection
ping api.coingecko.com
```

**Issue: "WebSocket disconnections"**
- Check firewall settings
- Verify network stability
- Restart browser/clear cache

## 📱 Mobile Quick Access

A.A.I.T.I works great on mobile devices:

1. **Open mobile browser**
2. **Navigate to**: http://your-server:5000
3. **Login with your credentials**
4. **Use touch-optimized interface**

## 🎯 Quick Commands Reference

```bash
# Installation
./install-docker.sh      # One-command Docker install
make install            # Docker production
npm start               # Manual start

# Management
make status             # Check service status
make logs               # View logs
make restart            # Restart services
make health             # Health check

# Development
npm run dev             # Development mode
npm run build           # Build for production
npm test                # Run tests

# API Testing
curl http://localhost:5000/api/health                    # Health check
curl http://localhost:5000/api/trading/market-data/BTC   # Market data
```

## 🚀 What's Next?

Now that you have A.A.I.T.I running, explore these advanced features:

1. **[📖 User Guide](user-guide.md)** - Complete feature walkthrough
2. **[🧠 ML Models](ml-models.md)** - Learn about all 13 algorithms
3. **[🔌 API Reference](api-reference.md)** - Integrate with external systems
4. **[📊 Analytics](features/analytics.md)** - Advanced performance analysis
5. **[🔔 Notifications](features/notifications.md)** - Set up alerts and webhooks
6. **[🐳 Docker Guide](docker.md)** - Advanced deployment options

**🎉 Happy Trading!** You're now ready to harness the power of AI for cryptocurrency trading.

---

**Quick Links:**
- [🆘 Troubleshooting](troubleshooting.md) - Fix common issues
- [⚙️ Settings Guide](user-guide.md#settings--configuration) - Optimize your setup
- [📈 Trading Strategies](features/trading.md) - Advanced trading techniques