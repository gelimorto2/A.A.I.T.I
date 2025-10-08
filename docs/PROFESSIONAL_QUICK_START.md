# A.A.I.T.I Professional Quick Start Guide

Get A.A.I.T.I production-ready cryptocurrency trading platform running in under 30 minutes.

## 🎯 What You'll Deploy

- **Production-grade trading engine** with real exchange integration
- **Advanced ML models** for market prediction and signal generation  
- **Enterprise security** with JWT authentication and API key management
- **Real-time risk management** with automated position sizing and stop-losses
- **Professional monitoring** with health checks and performance metrics

## ⚡ 5-Minute Production Setup

### Prerequisites Check
```bash
# Verify system requirements
docker --version    # Requires 20.0+
docker-compose --version    # Requires v2.0+
curl --version     # For API testing
```

### Step 1: Clone and Configure
```bash
# Clone production repository
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I

# Copy production environment template
cp backend/.env.example backend/.env.production

# Edit with your exchange API keys (required for live trading)
nano backend/.env.production
```

### Step 2: Deploy Production Services
```bash
# Start all production services
docker-compose -f docker-compose.prod.yml up -d

# Initialize production database
docker-compose exec backend npm run migrate:production

# Verify deployment
curl http://localhost:5000/api/health
```

### Step 3: Validate Trading System
```bash
# Run production validation
node validate-production-trading.js

# Test exchange connectivity (requires API keys)
curl http://localhost:5000/api/production-trading/exchange/test

# Access professional trading dashboard
open http://localhost:5000
```

## 🔒 Security Configuration (Critical)

### API Key Setup
```bash
# In backend/.env.production - REQUIRED for live trading
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here
JWT_SECRET=generate_strong_random_secret_key
DATABASE_URL=postgresql://user:pass@localhost:5432/aaiti_prod

# Optional: Additional exchanges
COINBASE_API_KEY=your_coinbase_api_key
COINBASE_SECRET_KEY=your_coinbase_secret_key
```

### Production Security Checklist
- [ ] Strong JWT secret (32+ characters, randomly generated)
- [ ] Exchange API keys with trading permissions
- [ ] Database password changed from default
- [ ] Firewall configured (only ports 80, 443, 5000 exposed)
- [ ] SSL certificates configured for HTTPS
- [ ] API rate limiting enabled

## 📊 Verify Production Readiness

### System Health Check
```bash
# Comprehensive health check
curl http://localhost:5000/api/health/detailed

# Expected response:
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "exchange": "connected", 
    "ml_models": "ready",
    "trading_engine": "active"
  },
  "uptime": "00:05:23"
}
```

### Trading System Validation
```bash
# ML model status
curl http://localhost:5000/api/ml/models/status

# Risk management check
curl http://localhost:5000/api/risk/portfolio-health

# Trading engine status
curl http://localhost:5000/api/production-trading/status
```

## 🚀 Start Live Trading

### Configure Risk Parameters
```bash
# Set conservative risk limits for initial deployment
curl -X POST http://localhost:5000/api/risk/configure \
-H "Content-Type: application/json" \
-d '{
  "maxPositionSize": 0.02,
  "stopLossPercentage": 0.015,
  "takeProfitPercentage": 0.03,
  "maxDailyLoss": 0.01
}'
```

### Deploy ML Trading Strategy
```bash
# Activate ensemble ML model
curl -X POST http://localhost:5000/api/ml/models/deploy \
-H "Content-Type: application/json" \
-d '{
  "modelType": "ensemble",
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "confidence_threshold": 0.75
}'
```

### Enable Automated Trading
```bash
# Start automated trading with strict risk controls
curl -X POST http://localhost:5000/api/production-trading/automated/start \
-H "Content-Type: application/json" \
-d '{
  "strategy": "ml_ensemble",
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "allocation": 10000,
  "riskLevel": "conservative"
}'
```

## 📈 Professional Trading Dashboard

Access your professional trading interface at: **http://localhost:5000**

### Key Dashboard Features
- **Real-time P&L**: Live profit/loss tracking with performance metrics
- **Position Management**: Current positions with risk metrics
- **ML Model Performance**: Prediction accuracy and confidence levels
- **Risk Monitoring**: Portfolio risk metrics and exposure limits
- **Trade History**: Detailed trade log with performance attribution

## 🔧 Production Monitoring

### Real-Time Monitoring
```bash
# View live system logs
docker-compose logs -f backend

# Monitor trading performance
curl http://localhost:5000/api/analytics/performance-summary

# Check ML model accuracy
curl http://localhost:5000/api/ml/performance-metrics
```

### Performance Metrics
```bash
# System performance dashboard
docker-compose exec backend npm run metrics:dashboard

# Trading performance report
curl http://localhost:5000/api/analytics/daily-report
```

## ⚠️ Production Safety

### Risk Management Safeguards
- **Position Limits**: Maximum 5% of capital per position
- **Stop Losses**: Automatic 2% stop-loss on all positions
- **Daily Loss Limits**: Trading halts at 1% daily loss
- **Correlation Limits**: Maximum 50% exposure to correlated assets

### Emergency Controls
```bash
# Emergency stop all trading
curl -X POST http://localhost:5000/api/production-trading/emergency-stop

# Close all positions immediately
curl -X POST http://localhost:5000/api/production-trading/close-all-positions

# View emergency contacts and procedures
curl http://localhost:5000/api/emergency/procedures
```

## 📞 Professional Support

### System Status
- **Health Endpoint**: `http://localhost:5000/api/health`
- **Status Dashboard**: `http://localhost:5000/status`
- **Documentation**: [Complete API Reference](docs/api-reference.md)

### Performance Benchmarks
- **API Latency**: <10ms (95th percentile)
- **Order Execution**: <100ms to exchange
- **ML Predictions**: <500ms generation time
- **System Uptime**: 99.9% target availability

## 🎯 Next Steps

1. **Monitor Performance**: Watch initial trading performance for 24 hours
2. **Optimize Parameters**: Adjust risk parameters based on performance
3. **Scale Deployment**: Add additional trading pairs and strategies  
4. **Enhanced Monitoring**: Set up Grafana dashboards for detailed monitoring
5. **Backup Strategy**: Implement automated database backups

---

**You now have a production-grade cryptocurrency trading platform running with advanced ML models, real-time risk management, and professional monitoring capabilities.**

For advanced configuration and enterprise features, see our [Complete Production Guide](docs/installation.md).