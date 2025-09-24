# Production Trading API Guide

## 🚀 Quick Start: Real ML Crypto Trading

A.A.I.T.I now supports **real cryptocurrency trading** with ML models. This guide shows you how to use the production trading features.

## 🔑 Prerequisites

1. **Backend running**: `./install` or Docker setup
2. **API authentication**: Valid JWT token
3. **Exchange API keys** (optional for testing, required for live trading):
   - Binance API Key and Secret
   - Set in environment variables: `BINANCE_API_KEY`, `BINANCE_SECRET_KEY`

## 📡 API Base URL

```
Production Trading API: http://localhost:5000/api/production-trading/
```

## 🤖 1. Create and Train ML Models

### Create a new ML model:
```bash
curl -X POST http://localhost:5000/api/production-trading/model/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bitcoin Trend Predictor",
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "lookbackPeriod": 100
  }'
```

**Response:**
```json
{
  "success": true,
  "model": {
    "id": "model-1701234567890",
    "name": "Bitcoin Trend Predictor",
    "symbol": "BTCUSDT",
    "status": "training"
  },
  "message": "Model created and training started"
}
```

### Check model status:
```bash
curl -X GET http://localhost:5000/api/production-trading/model/model-1701234567890/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "model": {
    "id": "model-1701234567890",
    "name": "Bitcoin Trend Predictor",
    "symbol": "BTCUSDT",
    "status": "ready",
    "isReady": true,
    "trainingComplete": true,
    "performance": {
      "accuracy": 0.73,
      "precision": 0.71,
      "recall": 0.75
    }
  }
}
```

## 📈 2. Generate Trading Signals

### Get ML prediction:
```bash
curl -X POST http://localhost:5000/api/production-trading/model/model-1701234567890/predict \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "symbol": "BTCUSDT",
    "action": "BUY",
    "confidence": 0.87,
    "price": 43250.50,
    "reasoning": "Strong momentum, RSI oversold, MACD bullish crossover",
    "indicators": {
      "rsi": 28.5,
      "macd": 45.2,
      "sma": 42800,
      "momentum": 0.15
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 💰 3. Execute Trades

### Execute trading signal (dry run):
```bash
curl -X POST http://localhost:5000/api/production-trading/trade/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "model-1701234567890",
    "autoExecute": false
  }'
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "symbol": "BTCUSDT",
    "action": "BUY",
    "confidence": 0.87,
    "price": 43250.50
  },
  "message": "Prediction generated. Set autoExecute=true to execute trade."
}
```

### Execute real trade (live trading):
```bash
curl -X POST http://localhost:5000/api/production-trading/trade/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "model-1701234567890",
    "autoExecute": true
  }'
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "symbol": "BTCUSDT",
    "action": "BUY",
    "confidence": 0.87,
    "price": 43250.50
  },
  "trade": {
    "success": true,
    "orderId": "12345678",
    "symbol": "BTCUSDT",
    "side": "BUY",
    "quantity": 0.0023,
    "price": 43250.50,
    "positionSize": 100.00,
    "stopLoss": 41088,
    "takeProfit": 47513
  }
}
```

## 📊 4. Portfolio Management

### Get portfolio balance:
```bash
curl -X GET http://localhost:5000/api/production-trading/portfolio/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "balance": {
    "USDT": 1250.75,
    "BTC": 0.0123,
    "ETH": 0.45
  },
  "portfolio": {
    "totalBalance": 1850.25,
    "dailyPnL": 45.20,
    "activePositions": 2,
    "positions": [
      {
        "symbol": "BTCUSDT",
        "side": "LONG",
        "quantity": 0.0123,
        "entryPrice": 42800,
        "currentPrice": 43250,
        "pnl": 5.54,
        "pnlPercent": 1.05
      }
    ]
  }
}
```

### Get active positions:
```bash
curl -X GET http://localhost:5000/api/production-trading/positions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Close a position:
```bash
curl -X POST http://localhost:5000/api/production-trading/position/pos-123/close \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Taking profit"
  }'
```

## 📡 5. Real-Time Market Data

### Get market data:
```bash
curl -X GET "http://localhost:5000/api/production-trading/market/BTCUSDT?interval=1h&limit=24" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "symbol": "BTCUSDT",
  "ticker": {
    "symbol": "BTCUSDT",
    "price": 43250.50,
    "change24h": 2.35,
    "volume24h": 28450.75
  },
  "ohlcv": [
    {
      "timestamp": 1705308000000,
      "open": 43100,
      "high": 43400,
      "low": 43050,
      "close": 43250,
      "volume": 125.45
    }
  ]
}
```

## 🤖 6. Automated Trading

### Start automated trading:
```bash
curl -X POST http://localhost:5000/api/production-trading/automated/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelIds": ["model-1701234567890"],
    "interval": 300000
  }'
```

**Response:**
```json
{
  "success": true,
  "automationId": "automation-1701234567890",
  "message": "Automated trading started",
  "interval": "300 seconds",
  "modelIds": ["model-1701234567890"]
}
```

### Stop automated trading:
```bash
curl -X POST http://localhost:5000/api/production-trading/automated/automation-1701234567890/stop \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔍 7. Exchange Integration

### Test exchange connection:
```bash
curl -X GET http://localhost:5000/api/production-trading/exchange/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "connection": {
    "binance": {
      "connected": true,
      "status": "healthy",
      "latency": 45
    }
  }
}
```

## 📋 8. Model Management

### List all models:
```bash
curl -X GET http://localhost:5000/api/production-trading/models \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "models": [
    {
      "id": "model-1701234567890",
      "name": "Bitcoin Trend Predictor",
      "symbol": "BTCUSDT",
      "status": "ready",
      "performance": {
        "accuracy": 0.73,
        "totalPredictions": 145,
        "successfulTrades": 89
      }
    }
  ],
  "count": 1
}
```

## ⚠️ Risk Management

### Built-in Risk Controls:
- **Confidence Threshold**: Only executes trades with >70% confidence
- **Position Sizing**: Automatic position sizing based on risk tolerance
- **Stop-Loss**: Automatic stop-loss orders at 5% below entry
- **Take-Profit**: Automatic profit-taking at 10% above entry
- **Max Exposure**: Limits total portfolio exposure per symbol

### Risk Parameters (configurable):
```javascript
const riskConfig = {
  maxPositionSize: 0.10,     // 10% of portfolio per position
  stopLossPercent: 0.05,     // 5% stop-loss
  takeProfitPercent: 0.10,   // 10% take-profit
  minConfidence: 0.70,       // 70% minimum confidence
  maxDailyTrades: 10         // Maximum trades per day
};
```

## 🚨 Important Notes

### For Live Trading:
1. **Set up Binance API keys** in environment variables
2. **Start with small amounts** to test the system
3. **Monitor positions closely** when starting
4. **Review ML model performance** regularly

### For Testing:
- Use `autoExecute: false` for dry runs
- Test with small amounts first
- Monitor logs for any errors
- Validate model predictions manually

## 🎯 Example Trading Workflow

```bash
# 1. Create ML model
MODEL_ID=$(curl -s -X POST http://localhost:5000/api/production-trading/model/create \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"BTC Model","symbol":"BTCUSDT","timeframe":"1h"}' | jq -r '.model.id')

# 2. Wait for training (check status)
while true; do
  STATUS=$(curl -s -X GET http://localhost:5000/api/production-trading/model/$MODEL_ID/status \
    -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.model.isReady')
  if [ "$STATUS" = "true" ]; then break; fi
  echo "Training... waiting 30s"
  sleep 30
done

# 3. Execute trade
curl -X POST http://localhost:5000/api/production-trading/trade/execute \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"modelId\":\"$MODEL_ID\",\"autoExecute\":true}"

# 4. Monitor positions
curl -X GET http://localhost:5000/api/production-trading/positions \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## 🎉 You're Ready for Production Trading!

A.A.I.T.I now provides a complete, production-ready ML trading platform. Start with testing, then move to live trading when you're confident in the system.

**Happy Trading! 🚀📈**