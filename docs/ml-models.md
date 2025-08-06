# Machine Learning Models Guide - **Real Implementations**

A.A.I.T.I provides **real, working machine learning algorithms** for cryptocurrency trading analysis. This guide covers the **actually implemented** models, not placeholder or mock implementations.

## ⚠️ **Important: Honest Documentation**

This documentation describes **only the algorithms that are actually implemented and working**. Unlike previous versions that claimed many algorithms, we now provide:

- ✅ **4 Real ML Algorithms** - Actually implemented with proper libraries
- ✅ **Real Market Data** - Live cryptocurrency data from CoinGecko API  
- ✅ **Real Performance Metrics** - Actual R², MAE, RMSE calculations
- ✅ **Real Backtesting** - Historical strategy testing with real data

## 📊 **Actually Implemented ML Models**

### 1. Linear Regression ✅
- **Implementation**: Real implementation using `ml-regression` library
- **Use Case**: Basic price trend prediction and feature importance analysis
- **Performance**: Fast training, interpretable results
- **Parameters**: None required (automatic optimization)
- **Data Requirements**: Minimum 30 data points
- **Output**: Trend direction, slope, R² score

```javascript
{
  "algorithmType": "linear_regression",
  "parameters": {},
  "symbols": ["bitcoin", "ethereum"],
  "trainingPeriodDays": 90
}
```

### 2. Polynomial Regression ✅
- **Implementation**: Real implementation using `ml-regression` library
- **Use Case**: Non-linear price pattern recognition and curve fitting
- **Performance**: Moderate complexity, good for short-term patterns
- **Parameters**: `degree` (default: 2, range: 1-4)
- **Data Requirements**: Minimum 30 data points
- **Output**: Non-linear trend prediction, polynomial coefficients

```javascript
{
  "algorithmType": "polynomial_regression", 
  "parameters": { "degree": 3 },
  "symbols": ["bitcoin"],
  "trainingPeriodDays": 60
}
```

### 3. Moving Average Strategy ✅
- **Implementation**: Real SMA crossover strategy with signal generation
- **Use Case**: Trend following, momentum trading
- **Performance**: Simple, reliable for trending markets
- **Parameters**: `shortPeriod` (default: 5), `longPeriod` (default: 20)
- **Data Requirements**: Minimum periods based on long period setting
- **Output**: Buy/sell/hold signals, crossover points, accuracy metrics

```javascript
{
  "algorithmType": "moving_average",
  "parameters": { 
    "shortPeriod": 5, 
    "longPeriod": 20 
  },
  "symbols": ["bitcoin"],
  "trainingPeriodDays": 180
}
```

### 4. RSI Strategy ✅  
- **Implementation**: Real RSI calculation with overbought/oversold signals
- **Use Case**: Mean reversion trading, momentum analysis
- **Performance**: Good for range-bound markets
- **Parameters**: `period` (default: 14), `oversold` (default: 30), `overbought` (default: 70)
- **Data Requirements**: Minimum period + 10 additional data points
- **Output**: RSI values, buy/sell signals, strategy accuracy

```javascript
{
  "algorithmType": "rsi_strategy",
  "parameters": {
    "period": 14,
    "oversold": 25,
    "overbought": 75
  },
  "symbols": ["ethereum"],
  "trainingPeriodDays": 120
}
```

## ❌ **NOT Implemented (Despite Previous Claims)**

The following algorithms were mentioned in old documentation but are **NOT actually implemented**:

- ❌ **LSTM** - Requires TensorFlow.js (complex dependency)
- ❌ **Random Forest** - Would need proper ensemble implementation
- ❌ **SVM** - Requires specialized ML libraries
- ❌ **ARIMA/SARIMA** - Need statistical computation libraries
- ❌ **Prophet** - Requires Facebook's Prophet library
- ❌ **Naive Bayes** - Only placeholder implementation exists
- ❌ **Gradient Boosting** - Complex ensemble method not implemented
- ❌ **Deep Neural Networks** - Would require proper deep learning frameworks
- ❌ **Reinforcement Learning** - Complex RL implementation needed

## 📊 **Real Performance Metrics**

All implemented models provide **actual** performance metrics:

### Regression Metrics
- **R² Score**: Coefficient of determination (0-1, higher is better)
- **MAE**: Mean Absolute Error (lower is better)
- **RMSE**: Root Mean Square Error (lower is better)
- **Sample Size**: Number of real data points used

### Strategy Metrics
- **Directional Accuracy**: Percentage of correct trend predictions
- **Signal Accuracy**: Percentage of profitable signals
- **Sharpe Ratio**: Risk-adjusted returns (in backtesting)
- **Win Rate**: Percentage of winning trades

## 🔄 **Real Data Integration**

### Market Data Source
- **CoinGecko API**: Free tier with rate limiting
- **Historical Data**: Up to 365 days (API limitation)
- **Update Frequency**: Daily for long periods, hourly for recent data
- **Supported Assets**: 50+ cryptocurrencies
- **Caching**: 24-hour cache to respect API limits

### Data Quality
- **Real Prices**: Actual market prices, not mock data
- **Volume Data**: Real trading volumes
- **Error Handling**: Graceful fallback to cached data
- **Validation**: Data integrity checks before training

## 🔧 **API Usage Examples**

### Get Supported Algorithms
```bash
curl http://localhost:5000/api/ml/algorithms
```

Response:
```json
{
  "algorithms": [
    {
      "id": "linear_regression",
      "name": "Linear Regression",
      "description": "Real linear regression using ml-regression library", 
      "implemented": true,
      "realImplementation": true,
      "params": [],
      "useCase": "Basic trend prediction"
    }
  ],
  "totalImplemented": 4,
  "note": "These are real, working ML implementations."
}
```

### Create Real Model
```bash
curl -X POST http://localhost:5000/api/ml/models \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "name": "BTC Trend Predictor",
    "algorithmType": "linear_regression",
    "targetTimeframe": "1d",
    "symbols": ["bitcoin"],
    "trainingPeriodDays": 90
  }'
```

### Make Real Prediction
```bash
curl -X POST http://localhost:5000/api/ml/models/{modelId}/predict \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "symbols": ["bitcoin"]
  }'
```

## 📈 **Model Selection Guide**

### By Use Case

| Use Case | Recommended Model | Why |
|----------|-------------------|-----|
| **Trend Analysis** | Linear Regression | Simple, interpretable, reliable |
| **Non-linear Patterns** | Polynomial Regression | Captures curves and complex trends |
| **Trend Following** | Moving Average | Proven strategy, good for trending markets |
| **Mean Reversion** | RSI Strategy | Good for range-bound, oscillating markets |
| **Quick Testing** | Moving Average | Fast training, immediate signals |
| **Learning ML** | Linear Regression | Educational, easy to understand |

### By Data Characteristics

| Data Type | Best Model | Notes |
|-----------|------------|--------|
| **Trending Markets** | Moving Average, Linear Regression | Follow momentum |
| **Volatile Markets** | RSI Strategy | Capitalize on swings |
| **Limited Data** | Linear Regression | Works with minimal data |
| **Daily Timeframes** | Any model | All models support daily data |
| **Noisy Data** | Moving Average | Built-in smoothing |

## 🚧 **Current Limitations**

### Technical Limitations
1. **Limited Algorithms**: Only 4 real implementations vs. claimed 16+
2. **API Rate Limits**: CoinGecko free tier has request limits
3. **Data History**: Maximum 365 days due to API constraints
4. **No Real-Time Trading**: Requires manual implementation
5. **Basic Features**: Simple technical indicators only

### Future Development
To implement missing features **properly**:

1. **LSTM**: Add TensorFlow.js dependency and proper neural network implementation
2. **Random Forest**: Implement ensemble methods from scratch or add ml-random-forest
3. **ARIMA**: Add statistical computation libraries (statsmodels equivalent)
4. **Real-Time Trading**: Integrate with cryptocurrency exchange APIs
5. **Advanced Features**: Implement proper portfolio optimization

## 📊 **Performance Expectations**

### Realistic Performance
- **Linear Regression**: R² typically 0.3-0.7 for crypto data
- **Polynomial Regression**: Can overfit, monitor validation performance
- **Moving Average**: 55-65% directional accuracy in trending markets
- **RSI Strategy**: 50-60% accuracy in range-bound markets

### Performance Factors
- **Market Conditions**: All models perform better in trending markets
- **Data Quality**: More data generally improves performance
- **Parameter Tuning**: Default parameters work but tuning helps
- **Timeframe**: Daily timeframes more predictable than intraday

## 🛠 **Best Practices**

### Model Development
1. **Start Simple**: Begin with linear regression to understand data
2. **Validate Properly**: Use out-of-sample testing
3. **Monitor Performance**: Track accuracy over time
4. **Regular Retraining**: Update models with new data

### Production Use
1. **Paper Trading First**: Test strategies before live trading
2. **Risk Management**: Implement stop-losses and position sizing
3. **Multiple Models**: Use ensemble of different approaches
4. **Market Awareness**: Understand when models may fail

---

**Next**: Learn about [API Integration](api-reference.md) or explore [Real Backtesting](backtesting.md)