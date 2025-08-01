# A.A.I.T.I v1.2.1 - Docker-First Auto AI Trading Interface 🐳🚀

**A.A.I.T.I v1.2.1** is a **Docker-first, production-ready, mission-critical environment** for deploying, supervising, and evolving AI-powered trading agents in live crypto markets. This complete Neural Command Deck provides enterprise-grade performance and monitoring for professional trading operations.

![AAITI Dashboard](https://github.com/user-attachments/assets/02041a91-eaaa-4593-9cd2-1538e23cf6f4)

## 🚀 Quick Start

### One-Command Docker Installation (Recommended)

```bash
# Clone and install in one go
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./install-docker.sh
```

**That's it!** 🎉 The installer will:
- ✅ Check system requirements automatically
- 🎯 Let you choose installation type (Production/Development/Monitoring)  
- 🔨 Build optimized Docker containers
- 🚀 Start all services automatically
- 📊 Be ready at `http://localhost:5000`

### Alternative Quick Commands

```bash
# Production deployment
make install

# Development environment
make dev

# With monitoring (Prometheus/Grafana)
make monitor

# Complete enterprise setup
make full
```

## ✨ Key Features

### 🐳 **Docker-First Architecture** 
- **Multi-Stage Docker Builds** - Optimized production containers with minimal attack surface
- **Docker Compose Orchestration** - Flexible deployment profiles for any scenario
- **Performance Optimized** - Advanced caching, compression, and resource management
- **Security Hardened** - Non-root containers, minimal dependencies, security headers

### 🧠 **Advanced ML Suite** - 13 Algorithms Available
- **Time Series Models**: ARIMA, SARIMA, SARIMAX, Prophet
- **Deep Learning**: LSTM, Deep Neural Networks
- **Classical ML**: Random Forest, SVM, Linear/Polynomial Regression
- **Ensemble Methods**: Gradient Boosting, Reinforcement Learning

### 📊 **Professional Trading Interface**
- **Real-time Dashboard** - Professional dark theme with mission-critical design
- **Multi-Bot Management** - Deploy and manage multiple AI trading bots
- **Live Market Data** - Real-time cryptocurrency data via CoinGecko API
- **WebSocket Communications** - Live updates for all metrics and market data
- **Advanced Authentication** - JWT-based security with role management

### 🔧 **Production-Ready Operations** 
- **Single Command Startup** - `npm start` launches the complete application
- **Enhanced ASCII Dashboard** - Real-time system monitoring with version info
- **Zero Configuration** - UI-based settings management, no manual config files
- **Comprehensive Logging** - Structured logging with performance metrics

## 📚 Comprehensive Documentation

We've created detailed documentation for every aspect of A.A.I.T.I:

### 🎯 Getting Started
- **[📖 Installation Guide](docs/installation.md)** - Complete setup instructions (Docker & manual)
- **[🚀 Quick Start Guide](docs/quick-start.md)** - Get up and running in minutes
- **[👤 User Guide](docs/user-guide.md)** - Complete feature walkthrough with screenshots

### 🔧 Technical Documentation
- **[🔌 API Reference](docs/api-reference.md)** - Complete REST API documentation
- **[🧠 ML Models Guide](docs/ml-models.md)** - All 13 algorithms with examples
- **[🐳 Docker Guide](docs/docker.md)** - Container deployment and orchestration
- **[🏗️ Architecture Overview](docs/architecture.md)** - System design and components

### 🛠 Development & Maintenance
- **[💻 Development Guide](docs/development.md)** - Developer setup and contributions
- **[🆘 Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[⚡ Performance Tuning](docs/performance.md)** - Optimization and configuration
- **[🔒 Security Guide](docs/security.md)** - Security best practices

### 📊 Feature Guides
- **[📈 Trading Interface](docs/features/trading.md)** - Trading bots and strategies
- **[📊 Analytics & Reporting](docs/features/analytics.md)** - Performance tracking
- **[🔔 Notifications](docs/features/notifications.md)** - Webhook and email alerts
- **[💼 Portfolio Management](docs/features/portfolio.md)** - Advanced optimization

## 🛠 Tech Stack

- **Backend**: Node.js + Express.js + SQLite + Socket.IO
- **Frontend**: React 19 + TypeScript + Material-UI v7 + Redux Toolkit
- **ML Stack**: 13 algorithms including ARIMA, SARIMA, SARIMAX, Prophet, LSTM
- **Deployment**: Docker-first with multi-stage builds and orchestration
- **Monitoring**: Prometheus + Grafana + health checks
- **Security**: JWT auth, Helmet.js, rate limiting, CORS

## 🎯 What's New in v1.2.1

### 🧠 **Enhanced ML Suite**
- ✅ **ARIMA** - Classic time series forecasting with autoregressive, integrated, and moving average components
- ✅ **SARIMA** - Seasonal ARIMA handling recurring patterns with configurable seasonal periods  
- ✅ **SARIMAX** - SARIMA extended with external variables for multi-factor analysis
- ✅ **Prophet** - Facebook's robust forecasting with automatic trend and seasonality detection

### 📚 **Comprehensive Documentation**
- ✅ **Organized Documentation Structure** - 15+ detailed guides covering every aspect
- ✅ **ML Models Guide** - Complete coverage of all 13 algorithms with examples
- ✅ **API Reference** - 400+ documented endpoints with request/response examples
- ✅ **User Guide** - Step-by-step tutorials with screenshots
- ✅ **Troubleshooting Guide** - Solutions for common issues and problems

### 🐳 **Docker-First Enhancements**
- ✅ **Advanced Performance Tuning** - Optimized containers and resource management
- ✅ **Multi-Profile Deployment** - Production, development, monitoring, and full-stack profiles
- ✅ **Security Hardening** - Non-root containers, minimal attack surface
- ✅ **Health Monitoring** - Built-in health checks and auto-recovery

## 📊 System Status Dashboard

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🚀 A.A.I.T.I v1.2.1 - NEURAL COMMAND DECK               ║
║                     Auto AI Trading Interface - Live Status                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┌─ SYSTEM STATUS ──────────────────────────────────────────────────────────────┐
│ Server Status:    ONLINE       │ Uptime: 2m 30s         │
│ Database:         CONNECTED    │ Memory: 45MB           │ 
│ Market Data:      ACTIVE       │ CPU Cores: 8           │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ LIVE TRADING STATUS ───────────────────────────────────────────────────────┐
│ 🤖 Active Bots:     3        │ 📊 Active Trades:    12       │ 💰 P&L: +$247.83 │
│ 📈 Market Feeds:    LIVE     │ 🎯 Win Rate:         67.3%    │ ⚠️ Alerts: 0      │
│ 🔄 Data Refresh:    5s       │ 📡 WebSocket:        ACTIVE   │ 🛡️ Health: 98%    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 💰 Supported Cryptocurrencies

A.A.I.T.I uses **CoinGecko API** for live cryptocurrency data with **no API key required**:

- Bitcoin (BTC), Ethereum (ETH), Binance Coin (BNB)
- Cardano (ADA), Solana (SOL), Polkadot (DOT)
- Dogecoin (DOGE), Chainlink (LINK), Polygon (MATIC)
- And many more...

## 🔄 Real-Time Features

- **Live Cryptocurrency Prices** - Real-time updates from CoinGecko API
- **WebSocket Communications** - Instant updates for all metrics
- **Bot Status Monitoring** - Real-time bot health and performance
- **Market Data Streaming** - Live price feeds and market updates
- **Performance Metrics** - Real-time system health and statistics

## 🆘 Need Help?

1. **📖 Start with Documentation**: Check our [comprehensive documentation](docs/README.md)
2. **🔍 Troubleshooting**: See the [troubleshooting guide](docs/troubleshooting.md)  
3. **🏥 Health Check**: Visit `http://localhost:5000/api/health`
4. **📊 Metrics**: Check `http://localhost:5000/api/metrics`
5. **🐛 Issues**: Report bugs on GitHub Issues

## ⚠️ Important Notes

- **Development/Demo Version**: For live trading, implement proper security hardening
- **System Requirements**: 4GB RAM, Docker 20.0+, 5GB disk space recommended
- **Documentation**: All guides include screenshots and examples
- **Support**: Comprehensive troubleshooting and community support available

## 📝 License

ISC License - see LICENSE file for details.

---

**A.A.I.T.I v1.2.1**: Docker-First Neural Command Deck • 13 ML Algorithms • Production-Ready • Enterprise-Grade

**[📖 Get Started with Full Documentation](docs/README.md)**