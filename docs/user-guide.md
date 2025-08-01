# User Guide

Complete user guide for A.A.I.T.I v1.2.1 - Learn how to use all features of the Neural Command Deck for AI-powered trading.

## 🚀 Getting Started

After completing the [Installation Guide](installation.md), you'll have access to A.A.I.T.I's powerful trading interface. This guide walks you through every feature.

### First Launch

1. **Start the Application**
   ```bash
   # Docker (recommended)
   make install
   
   # Or manual
   npm start
   ```

2. **Access the Interface**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/api/health

3. **Create Your Account**
   - Click "Register" on the login page
   - Choose your role: Admin, Trader, or Viewer
   - Complete the registration form

![Login Screen](screenshots/login-screen.png)
*Professional login interface with role-based access*

## 🎯 Dashboard Overview

The main dashboard provides a real-time view of your trading operations.

![Main Dashboard](screenshots/main-dashboard.png)
*Neural Command Deck interface with live metrics*

### Key Dashboard Components

1. **System Health Panel** (Top Right)
   - Server status and uptime
   - Memory usage and performance
   - Database connectivity
   - Market data feed status

2. **Portfolio Overview** (Center)
   - Total P&L and balance
   - Active positions count
   - Win rate percentage
   - Daily performance chart

3. **Active Bots Panel** (Left Side)
   - Running trading bots
   - Bot performance metrics
   - Quick start/stop controls
   - Real-time status indicators

4. **Market Data Feed** (Right Side)
   - Live cryptocurrency prices
   - 24-hour price changes
   - Volume and market cap data
   - Price alerts and notifications

5. **Recent Activity** (Bottom)
   - Latest trades and signals
   - Model predictions
   - System notifications
   - Performance updates

## 🤖 AI Models Management

### Creating Your First ML Model

1. **Navigate to ML Models**
   - Click "ML Models" in the sidebar
   - Click "Create New Model"

![ML Model Creation](screenshots/ml-model-creation.png)
*Comprehensive model creation interface*

2. **Choose Algorithm Type**
   
   **For Beginners:**
   - **Linear Regression**: Simple trend analysis
   - **ARIMA**: Classic time series forecasting
   - **Prophet**: Robust forecasting with seasonality

   **For Advanced Users:**
   - **LSTM**: Deep learning for complex patterns
   - **SARIMA**: Seasonal time series with external factors
   - **Ensemble Methods**: Multiple algorithms combined

3. **Configure Parameters**

   **ARIMA Model Example:**
   ```json
   {
     "name": "BTC Daily Forecaster",
     "algorithmType": "arima",
     "targetTimeframe": "1d",
     "symbols": ["BTC"],
     "parameters": {
       "p": 2,  // Autoregressive order
       "d": 1,  // Differencing order  
       "q": 2   // Moving average order
     },
     "trainingPeriodDays": 365
   }
   ```

   **Prophet Model Example:**
   ```json
   {
     "name": "ETH Prophet Model",
     "algorithmType": "prophet",
     "targetTimeframe": "1h",
     "symbols": ["ETH"],
     "parameters": {
       "seasonality_mode": "additive",
       "yearly_seasonality": true,
       "weekly_seasonality": true,
       "daily_seasonality": false
     }
   }
   ```

4. **Training Process**
   - Click "Train Model"
   - Monitor training progress
   - Review performance metrics
   - Save the trained model

![Model Training](screenshots/model-training.png)
*Real-time training progress and metrics*

### Model Performance Analysis

After training, analyze your model's performance:

![Model Performance](screenshots/model-performance.png)
*Comprehensive performance metrics dashboard*

**Key Metrics:**
- **R² Score**: Model accuracy (0-1, higher is better)
- **MAE**: Mean Absolute Error (lower is better)
- **Directional Accuracy**: Correct trend predictions
- **Sharpe Ratio**: Risk-adjusted returns
- **F1-Score**: Balanced precision and recall

### Making Predictions

1. **Select Trained Model**
2. **Choose Target Symbols**
3. **Set Prediction Parameters**
4. **Generate Predictions**

![Predictions Dashboard](screenshots/predictions-dashboard.png)
*Live predictions with confidence scores*

## 📊 Trading Bots

### Creating a Trading Bot

1. **Bot Configuration**
   - Name and description
   - Target cryptocurrency
   - Trading strategy
   - Risk parameters

![Bot Creation](screenshots/bot-creation.png)
*Comprehensive bot configuration interface*

2. **Risk Management Settings**
   ```json
   {
     "initialBalance": 10000,
     "riskPerTrade": 0.02,      // 2% risk per trade
     "stopLoss": 0.05,          // 5% stop loss
     "takeProfit": 0.10,        // 10% take profit
     "maxPositions": 3          // Max concurrent positions
   }
   ```

3. **Strategy Selection**
   - **Scalping**: High-frequency, small profits
   - **Momentum**: Trend-following strategy
   - **Mean Reversion**: Buy low, sell high
   - **ML-Driven**: Use AI model predictions

### Bot Management Dashboard

![Bot Management](screenshots/bot-management.png)
*Real-time bot monitoring and control*

**Features:**
- Start/stop bots with one click
- Real-time P&L tracking
- Trade history and analysis
- Performance optimization suggestions
- Risk monitoring and alerts

## 📈 Backtesting

Test your strategies before live trading:

### Setting Up a Backtest

1. **Select Model or Strategy**
2. **Set Date Range**
3. **Configure Parameters**
4. **Run Backtest**

![Backtest Configuration](screenshots/backtest-config.png)
*Comprehensive backtesting setup*

### Analyzing Results

![Backtest Results](screenshots/backtest-results.png)
*Detailed backtest performance analysis*

**Key Metrics:**
- **Total Return**: Overall profit/loss percentage
- **Sharpe Ratio**: Risk-adjusted performance
- **Maximum Drawdown**: Largest loss from peak
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Ratio of gains to losses

### Trade-by-Trade Analysis

![Individual Trades](screenshots/trade-analysis.png)
*Detailed trade-by-trade breakdown*

Review every trade executed during the backtest:
- Entry and exit points
- Profit/loss for each trade
- Signal confidence scores
- Duration and timing analysis

## 💹 Market Data & Analytics

### Live Market Data

![Market Data](screenshots/market-data.png)
*Real-time cryptocurrency market data*

**Available Data:**
- Real-time prices from CoinGecko API
- 24-hour price changes and volume
- Market capitalization data
- Historical price charts
- Technical indicators

### Advanced Analytics

![Analytics Dashboard](screenshots/analytics-dashboard.png)
*Comprehensive analytics and insights*

**Analytics Features:**
- Portfolio performance tracking
- Risk analysis and metrics
- Correlation analysis between assets
- Market sentiment indicators
- Custom performance dashboards

## 🔔 Notifications & Alerts

### Setting Up Notifications

1. **Navigate to Settings > Notifications**
2. **Configure Notification Types**
3. **Set Alert Thresholds**
4. **Test Notification Delivery**

![Notification Settings](screenshots/notification-settings.png)
*Comprehensive notification configuration*

### Notification Types

**Email Notifications:**
- Trade execution alerts
- Model prediction updates
- System health warnings
- Performance milestone alerts

**Webhook Notifications:**
- Real-time trade data
- Bot status changes
- Market alerts
- Custom event triggers

### Webhook Configuration

```json
{
  "webhookUrl": "https://your-webhook-endpoint.com",
  "authentication": {
    "type": "bearer",
    "token": "your-auth-token"
  },
  "events": [
    "trade_executed",
    "bot_status_changed",
    "model_prediction",
    "system_alert"
  ],
  "retryPolicy": {
    "maxRetries": 3,
    "retryDelay": 5000
  }
}
```

## ⚙️ Settings & Configuration

### System Settings

![System Settings](screenshots/system-settings.png)
*Comprehensive system configuration*

**Categories:**
- **Trading Settings**: Default risk parameters, commission rates
- **Market Data**: Refresh intervals, data providers
- **Notifications**: Email and webhook configuration
- **Security**: Authentication, API keys
- **Performance**: Caching, logging levels

### User Management

**For Administrators:**
- Create and manage user accounts
- Assign roles and permissions
- Monitor user activity
- System audit logs

**Roles & Permissions:**
- **Admin**: Full system access
- **Trader**: Trading and model creation
- **Viewer**: Read-only access

## 🔍 Monitoring & Health

### System Health Dashboard

![System Health](screenshots/system-health.png)
*Real-time system monitoring*

**Monitored Metrics:**
- CPU and memory usage
- Database performance
- API response times
- Market data connectivity
- Active user sessions

### Performance Monitoring

**Real-time Metrics:**
- Request throughput
- Error rates and types
- Cache hit ratios
- WebSocket connections
- Background job queues

### Alerting System

Set up alerts for:
- System performance degradation
- Trading bot failures
- Model prediction anomalies
- Market data interruptions
- Security events

## 🛠 Advanced Features

### API Integration

Use A.A.I.T.I's REST API for custom integrations:

```javascript
// Example: Create ML model via API
const response = await fetch('/api/ml/models', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'API Created Model',
    algorithmType: 'arima',
    targetTimeframe: '1h',
    symbols: ['BTC'],
    parameters: { p: 2, d: 1, q: 2 }
  })
});
```

### WebSocket Real-time Updates

```javascript
// Example: Real-time market data
const socket = io('http://localhost:5000');

socket.on('market_data_update', (data) => {
  console.log('Price update:', data.symbol, data.price);
});

socket.on('bot_update', (data) => {
  console.log('Bot status:', data.botId, data.status);
});
```

### Custom Indicators

Create custom technical indicators:

```javascript
// Example: Custom RSI calculation
const customRSI = {
  name: 'Custom RSI',
  period: 14,
  calculate: (prices) => {
    // Your custom RSI logic
    return rsiValues;
  }
};
```

## 📱 Mobile Access

A.A.I.T.I's responsive design works on mobile devices:

![Mobile Interface](screenshots/mobile-interface.png)
*Responsive mobile interface*

**Mobile Features:**
- Full dashboard access
- Bot monitoring and control
- Market data viewing
- Push notifications
- Touch-optimized controls

## 🔒 Security Best Practices

### Authentication Security

1. **Use Strong Passwords**
   - Minimum 12 characters
   - Include numbers and symbols
   - Avoid common patterns

2. **JWT Token Management**
   - Tokens expire after 24 hours
   - Refresh tokens regularly
   - Store securely on client side

3. **API Security**
   - Rate limiting: 100 requests/minute
   - Request validation and sanitization
   - Secure headers (Helmet.js)

### Data Protection

- All sensitive data encrypted
- Database access controlled
- Audit logging enabled
- Regular security updates

## 🆘 Troubleshooting

### Common Issues

**Bot Not Starting:**
1. Check bot configuration
2. Verify sufficient balance
3. Review error logs
4. Check market data connectivity

**Model Training Fails:**
1. Ensure sufficient training data (50+ points)
2. Check parameter validity
3. Verify symbol availability
4. Review memory usage

**Predictions Not Updating:**
1. Check model status (trained)
2. Verify market data feed
3. Review prediction parameters
4. Check system resources

**WebSocket Disconnections:**
1. Check network connectivity
2. Review firewall settings
3. Verify server status
4. Monitor connection logs

### Getting Help

1. **Check System Health**: `/api/health`
2. **Review Logs**: Application and system logs
3. **Documentation**: Comprehensive guides available
4. **Community**: GitHub issues and discussions

### Performance Optimization

**For Better Performance:**
- Use Docker deployment
- Enable Redis caching
- Monitor resource usage
- Regular database maintenance
- Optimize model parameters

**Resource Requirements:**
- **Minimum**: 2GB RAM, 2 CPU cores
- **Recommended**: 4GB RAM, 4 CPU cores
- **Disk Space**: 5GB minimum
- **Network**: Stable internet connection

---

**Next Steps:**
- Explore [API Reference](api-reference.md) for integration
- Learn about [ML Models](ml-models.md) in detail
- Check [Troubleshooting Guide](troubleshooting.md) for issues
- Review [Performance Tuning](performance.md) for optimization