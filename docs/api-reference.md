# API Reference

Complete API documentation for A.A.I.T.I v1.2.1. This reference covers all endpoints, request/response formats, and authentication requirements.

## Base URL

- **Production**: `http://localhost:5000/api`
- **Development**: `http://localhost:5000/api`

## Key Features

✅ **Function Discovery** - Browse 25+ core functions with comprehensive documentation  
✅ **Portable Installation** - Deploy to external drives for maximum portability  
✅ **Real ML Algorithms** - 12 implemented algorithms with actual predictions  
✅ **Comprehensive Documentation** - Detailed guides for all experience levels  

---

## Authentication

A.A.I.T.I uses JWT (JSON Web Token) authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

#### POST `/auth/login`
User login and JWT token generation.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "trader",
    "createdAt": "2025-01-08T12:00:00Z"
  }
}
```

#### POST `/auth/register`
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "role": "trader"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "userId": "user-id"
}
```

#### GET `/auth/profile`
Get current user profile. Requires authentication.

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "trader",
    "createdAt": "2025-01-08T12:00:00Z"
  }
}
```

## Machine Learning Models

### GET `/ml/models`
List all ML models for the authenticated user.

**Query Parameters:**
- `limit` (optional): Number of models to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "models": [
    {
      "id": "model-id",
      "name": "BTC Price Predictor",
      "algorithmType": "lstm",
      "targetTimeframe": "1h",
      "symbols": ["BTC", "ETH"],
      "parameters": {
        "units": 50,
        "layers": 2,
        "dropout": 0.2
      },
      "accuracy": 0.75,
      "precision_score": 0.72,
      "recall_score": 0.78,
      "f1_score": 0.75,
      "prediction_count": 150,
      "backtest_count": 3,
      "created_at": "2025-01-08T12:00:00Z",
      "last_trained": "2025-01-08T12:00:00Z"
    }
  ]
}
```

### POST `/ml/models`
Create and train a new ML model.

**Request Body:**
```json
{
  "name": "BTC ARIMA Forecaster",
  "algorithmType": "arima",
  "targetTimeframe": "1d",
  "symbols": ["BTC"],
  "parameters": {
    "p": 2,
    "d": 1,
    "q": 2
  },
  "trainingPeriodDays": 365
}
```

**Supported Algorithm Types:**
- `linear_regression` - Basic linear regression
- `polynomial_regression` - Polynomial regression
- `random_forest` - Random forest ensemble
- `svm` - Support Vector Machine
- `naive_bayes` - Naive Bayes classifier
- `lstm` - Long Short-Term Memory neural network
- `arima` - AutoRegressive Integrated Moving Average
- `sarima` - Seasonal ARIMA
- `sarimax` - SARIMA with exogenous variables
- `prophet` - Facebook Prophet forecasting
- `ensemble_gradient_boost` - Gradient boosting ensemble
- `deep_neural_network` - Deep neural network
- `reinforcement_learning` - Q-learning agent

**Response:**
```json
{
  "success": true,
  "model": {
    "id": "new-model-id",
    "name": "BTC ARIMA Forecaster",
    "algorithmType": "arima",
    "targetTimeframe": "1d",
    "symbols": ["BTC"],
    "parameters": {
      "p": 2,
      "d": 1,
      "q": 2
    },
    "performanceMetrics": {
      "r2": 0.68,
      "mae": 0.05,
      "rmse": 0.08,
      "directionalAccuracy": 0.72
    },
    "trainingStatus": "trained"
  }
}
```

### GET `/ml/models/:id`
Get details for a specific ML model.

**Response:**
```json
{
  "model": {
    "id": "model-id",
    "name": "BTC ARIMA Forecaster",
    "algorithmType": "arima",
    "targetTimeframe": "1d",
    "symbols": ["BTC"],
    "parameters": {
      "p": 2,
      "d": 1,
      "q": 2
    },
    "accuracy": 0.72,
    "precision_score": 0.70,
    "recall_score": 0.74,
    "f1_score": 0.72,
    "prediction_count": 50,
    "avg_confidence": 0.68,
    "training_status": "trained",
    "created_at": "2025-01-08T12:00:00Z",
    "last_trained": "2025-01-08T12:00:00Z"
  }
}
```

### PUT `/ml/models/:id`
Update an ML model (retrain with new parameters).

**Request Body:**
```json
{
  "name": "Updated Model Name",
  "parameters": {
    "p": 3,
    "d": 1,
    "q": 3
  },
  "retrain": true
}
```

### DELETE `/ml/models/:id`
Delete an ML model and all associated data.

**Response:**
```json
{
  "success": true,
  "deleted": 1
}
```

---

## Function Discovery API

The Function Discovery API provides comprehensive access to A.A.I.T.I's function catalog, helping developers understand and utilize the available functionality.

### GET `/functions`
Get all functions with optional filtering.

**Query Parameters:**
- `category` - Filter by category (ML_ALGORITHMS, TRADING_STRATEGIES, etc.)
- `importance` - Filter by importance level (CRITICAL, HIGH, MEDIUM, LOW)
- `module` - Filter by module name
- `search` - Search in function names and descriptions

**Example Request:**
```
GET /api/functions?importance=CRITICAL&category=ML_ALGORITHMS
```

**Response:**
```json
{
  "success": true,
  "data": {
    "functions": [
      {
        "name": "createLinearRegressionModel",
        "category": "ML_ALGORITHMS",
        "importance": "CRITICAL",
        "description": "Creates linear regression model for price trend prediction using real ml-regression library",
        "module": "realMLService",
        "usage": "Basic trend analysis and prediction",
        "parameters": ["data", "config"],
        "returns": "Trained linear regression model",
        "example": "createLinearRegressionModel(priceData, {period: 20})"
      }
    ],
    "total": 1,
    "filters": {
      "importance": "CRITICAL",
      "category": "ML_ALGORITHMS"
    }
  }
}
```

### GET `/functions/critical`
Get only critical functions for quick reference.

**Response:**
```json
{
  "success": true,
  "data": {
    "functions": [
      {
        "name": "createLinearRegressionModel",
        "importance": "CRITICAL",
        "description": "Creates linear regression model for price trend prediction"
      },
      {
        "name": "getRealTimePrice", 
        "importance": "CRITICAL",
        "description": "Fetches current market price and volume data"
      }
    ],
    "total": 2,
    "description": "Critical functions for core A.A.I.T.I functionality"
  }
}
```

### GET `/functions/categories`
Get all categories with their functions organized by importance.

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": {
      "ML_ALGORITHMS": {
        "name": "Machine Learning Algorithms",
        "description": "Core ML functions for trading predictions and analysis",
        "icon": "🧠",
        "priority": 1,
        "functions": [...]
      },
      "TRADING_STRATEGIES": {
        "name": "Trading Strategies", 
        "description": "Strategy creation, backtesting, and optimization functions",
        "icon": "📊",
        "priority": 2,
        "functions": [...]
      }
    },
    "total": 9
  }
}
```

### GET `/functions/quick-reference`
Get functions organized by user experience level.

**Response:**
```json
{
  "success": true,
  "data": {
    "beginnerFunctions": [
      {
        "name": "getRealTimePrice",
        "description": "Fetches current market price for a symbol"
      }
    ],
    "intermediateFunctions": [
      {
        "name": "createLinearRegressionModel", 
        "description": "Creates ML model for trend prediction"
      }
    ],
    "advancedFunctions": [
      {
        "name": "optimizeStrategy",
        "description": "Optimizes trading strategy parameters"
      }
    ]
  },
  "description": "Functions organized by user experience level"
}
```

### GET `/functions/:functionName`
Get detailed information about a specific function.

**Example Request:**
```
GET /api/functions/createRSIStrategy
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "createRSIStrategy",
    "category": "ML_ALGORITHMS",
    "importance": "CRITICAL",
    "description": "Generates buy/sell signals based on RSI momentum analysis",
    "module": "realMLService",
    "usage": "Momentum-based trading in ranging markets",
    "parameters": ["symbol", "period", "oversold", "overbought"],
    "returns": "RSI strategy with trading signals",
    "example": "createRSIStrategy(\"BTC\", 14, 30, 70)"
  }
}
```

### POST `/functions/search`
Advanced function search with multiple criteria.

**Request Body:**
```json
{
  "query": "regression",
  "categories": ["ML_ALGORITHMS"],
  "importance": ["CRITICAL", "HIGH"],
  "modules": ["realMLService"],
  "includeExamples": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "name": "createLinearRegressionModel",
        "category": "ML_ALGORITHMS",
        "importance": "CRITICAL",
        "description": "Creates linear regression model for price trend prediction",
        "example": "createLinearRegressionModel(priceData, {period: 20})"
      }
    ],
    "total": 1,
    "searchCriteria": {
      "query": "regression",
      "categories": ["ML_ALGORITHMS"],
      "importance": ["CRITICAL", "HIGH"]
    }
  }
}
```

---

### POST `/ml/models/:id/predict`
Make predictions using a trained model.

**Request Body:**
```json
{
  "symbols": ["BTC", "ETH"],
  "features": [
    [100.5, 101.2, 99.8, 50.5, 0.02, 1.2],
    [101.2, 102.0, 100.1, 52.3, 0.01, 1.1]
  ]
}
```

**Response:**
```json
{
  "predictions": [
    {
      "id": "prediction-id",
      "symbol": "BTC",
      "prediction": 0.025,
      "confidence": 0.72,
      "timestamp": "2025-01-08T12:00:00Z"
    }
  ]
}
```

### GET `/ml/models/:id/predictions`
Get prediction history for a model.

**Query Parameters:**
- `limit` (optional): Number of predictions (default: 100)
- `offset` (optional): Pagination offset (default: 0)
- `symbol` (optional): Filter by symbol

**Response:**
```json
{
  "predictions": [
    {
      "id": "prediction-id",
      "symbol": "BTC",
      "prediction_value": 0.025,
      "confidence": 0.72,
      "features": [100.5, 101.2, 99.8, 50.5, 0.02, 1.2],
      "timestamp": "2025-01-08T12:00:00Z",
      "model_name": "BTC ARIMA Forecaster"
    }
  ]
}
```

### POST `/ml/models/:id/backtest`
Run backtest for an ML model.

**Request Body:**
```json
{
  "symbols": ["BTC", "ETH"],
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "initialCapital": 100000,
  "commission": 0.001,
  "slippage": 0.0005,
  "positionSizing": "percentage",
  "riskPerTrade": 0.02,
  "stopLoss": 0.05,
  "takeProfit": 0.10,
  "maxPositions": 5
}
```

**Response:**
```json
{
  "backtest": {
    "id": "backtest-id",
    "modelId": "model-id",
    "symbols": ["BTC", "ETH"],
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "initialCapital": 100000,
    "finalCapital": 125000,
    "totalReturn": 0.25,
    "performanceMetrics": {
      "sharpeRatio": 1.45,
      "maxDrawdown": 0.08,
      "winRate": 0.68,
      "profitFactor": 1.85,
      "avgTradeDuration": 3.2
    },
    "tradeCount": 150
  }
}
```

### GET `/ml/models/:id/backtests`
Get backtest results for a model.

**Response:**
```json
{
  "backtests": [
    {
      "id": "backtest-id",
      "symbols": ["BTC", "ETH"],
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "initial_capital": 100000,
      "final_capital": 125000,
      "total_return": 0.25,
      "sharpe_ratio": 1.45,
      "max_drawdown": 0.08,
      "total_trades": 150,
      "win_rate": 0.68,
      "profit_factor": 1.85,
      "trade_count": 150,
      "created_at": "2025-01-08T12:00:00Z"
    }
  ]
}
```

### GET `/backtests/:id`
Get detailed backtest results including individual trades.

**Response:**
```json
{
  "backtest": {
    "id": "backtest-id",
    "symbols": ["BTC", "ETH"],
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "parameters": {
      "initialCapital": 100000,
      "commission": 0.001
    },
    "trades": [
      {
        "id": "trade-id",
        "symbol": "BTC",
        "side": "buy",
        "entry_date": "2024-01-15T10:30:00Z",
        "exit_date": "2024-01-18T14:45:00Z",
        "entry_price": 42000,
        "exit_price": 43500,
        "quantity": 0.1,
        "pnl": 150,
        "signal_confidence": 0.75
      }
    ]
  }
}
```

### POST `/ml/compare`
Compare performance of multiple models.

**Request Body:**
```json
{
  "modelIds": ["model1-id", "model2-id", "model3-id"],
  "metric": "sharpe_ratio"
}
```

**Response:**
```json
{
  "comparison": [
    {
      "id": "model1-id",
      "name": "LSTM Model",
      "algorithmType": "lstm",
      "accuracy": 0.75,
      "prediction_count": 200,
      "avg_confidence": 0.72,
      "backtest_count": 5,
      "avg_return": 0.18,
      "avg_sharpe_ratio": 1.32,
      "avg_win_rate": 0.65
    }
  ]
}
```

## Trading Bots

### GET `/bots`
List user's trading bots.

**Response:**
```json
{
  "bots": [
    {
      "id": "bot-id",
      "name": "BTC Scalper",
      "symbol": "BTC",
      "strategy": "scalping",
      "status": "active",
      "balance": 10000,
      "pnl": 250.50,
      "trades_count": 45,
      "win_rate": 0.67,
      "created_at": "2025-01-08T12:00:00Z"
    }
  ]
}
```

### POST `/bots`
Create a new trading bot.

**Request Body:**
```json
{
  "name": "ETH Momentum Bot",
  "symbol": "ETH",
  "strategy": "momentum",
  "initialBalance": 5000,
  "riskPerTrade": 0.02,
  "stopLoss": 0.05,
  "takeProfit": 0.10,
  "maxPositions": 3
}
```

### PUT `/bots/:id`
Update trading bot configuration.

### DELETE `/bots/:id`
Delete a trading bot.

### POST `/bots/:id/start`
Start a trading bot.

### POST `/bots/:id/stop`
Stop a trading bot.

## Market Data

### GET `/trading/market-data/:symbol`
Get live market data for a cryptocurrency.

**Response:**
```json
{
  "symbol": "BTC",
  "price": 42500.50,
  "change_24h": 0.025,
  "volume_24h": 1250000000,
  "market_cap": 835000000000,
  "high_24h": 43200,
  "low_24h": 41800,
  "last_updated": "2025-01-08T12:00:00Z"
}
```

## System Health

### GET `/health`
System health check and status.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.2.1",
  "uptime": 3600,
  "database": "connected",
  "marketData": "active",
  "memory": {
    "used": 45.5,
    "total": 512,
    "percentage": 8.9
  },
  "performance": {
    "avgResponseTime": 125,
    "requestCount": 1250,
    "errorRate": 0.002
  },
  "marketDataStats": {
    "cacheHits": 850,
    "cacheMisses": 25,
    "lastUpdate": "2025-01-08T12:00:00Z"
  }
}
```

### GET `/metrics`
Prometheus-compatible metrics endpoint.

**Response:**
```
# HELP aaiti_requests_total Total number of requests
# TYPE aaiti_requests_total counter
aaiti_requests_total 1250

# HELP aaiti_response_time_ms Response time in milliseconds
# TYPE aaiti_response_time_ms histogram
aaiti_response_time_ms_sum 156250
aaiti_response_time_ms_count 1250
```

## Settings Management

### GET `/settings`
Get application settings (Admin only).

**Response:**
```json
{
  "settings": {
    "trading": {
      "maxPositions": 10,
      "defaultRiskPerTrade": 0.02,
      "commissionRate": 0.001
    },
    "market": {
      "refreshInterval": 5000,
      "dataProvider": "coingecko"
    },
    "notifications": {
      "emailEnabled": true,
      "webhookEnabled": true
    }
  }
}
```

### PUT `/settings`
Update application settings (Admin only).

### POST `/settings/reset`
Reset settings to defaults (Admin only).

## Notifications

### POST `/notifications/webhook`
Send webhook notification.

### POST `/notifications/email`
Send email notification.

### GET `/notifications/history`
Get notification history.

## Analytics

### GET `/analytics/portfolio`
Portfolio overview and performance.

### GET `/analytics/performance/:botId`
Bot-specific performance metrics.

### GET `/analytics/risk`
Risk analysis and metrics.

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request parameters",
  "details": "Specific error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "Please provide a valid JWT token"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "message": "Admin role required"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "message": "The requested resource does not exist"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "message": "Please wait before making another request",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Rate Limits

- **Authentication endpoints**: 5 requests per minute
- **Model training**: 2 requests per minute
- **Predictions**: 60 requests per minute
- **Market data**: 100 requests per minute
- **General API**: 100 requests per minute

## WebSocket Events

A.A.I.T.I provides real-time updates via WebSocket connections:

### Connection
```javascript
const socket = io('http://localhost:5000');
```

### Events
- `market_data_update` - Live cryptocurrency price updates
- `system_health` - Server health and performance metrics
- `bot_update` - Trading bot status changes
- `trade_update` - Real-time trade execution updates
- `model_prediction` - New ML model predictions

### Example Usage
```javascript
socket.on('market_data_update', (data) => {
  console.log('Price update:', data);
});

socket.on('bot_update', (data) => {
  console.log('Bot status:', data);
});
```

---

**Next**: Learn about [ML Models](ml-models.md) or check the [User Guide](user-guide.md)