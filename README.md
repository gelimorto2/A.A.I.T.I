# A.A.I.T.I v2.0.0 - Auto AI Trading Interface 🚀🤖

**A.A.I.T.I v2.0.0** is a production-ready, AI-powered trading platform designed for professional cryptocurrency trading operations. Built with a Docker-first architecture, it provides a comprehensive Neural Command Deck with advanced ML algorithms, real-time market data, and enterprise-grade security.

![AAITI Dashboard](https://github.com/user-attachments/assets/02041a91-eaaa-4593-9cd2-1538e23cf6f4)

## 🚀 Quick Start

### 🖥️ **Try the Demo** (Minimal Setup)
```bash
# Quick demo with sample data
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I

# Linux/Mac
./demo.sh

# Windows
demo.bat
```

### 📦 **Full Installation**

#### Linux/Mac
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./install-docker.sh
```

#### Windows
```batch
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
install.bat
# Or with PowerShell: .\install.ps1
```

The installer automatically:
- ✅ Checks system requirements
- 🎯 Configures deployment profile  
- 🔨 Builds optimized containers
- 🚀 Starts all services
- 📊 Opens dashboard at `http://localhost:5000`

### ⚡ Alternative Commands

```bash
make install    # Production deployment
make dev        # Development environment
make monitor    # With Prometheus/Grafana
make full       # Complete enterprise setup
```

## 🖥️ **Cross-Platform Support**

A.A.I.T.I supports all major operating systems:

- **🐧 Linux**: Native Docker support, recommended for production
- **🍎 macOS**: Full Docker Desktop compatibility  
- **🪟 Windows**: Complete support with Docker Desktop
  - Windows 10/11 Pro, Enterprise, or Education
  - Windows Server 2019+ 
  - WSL2 backend recommended

### 📋 **System Requirements**

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4GB | 8GB+ |
| CPU | 2 cores | 4+ cores |
| Storage | 5GB | 20GB+ |
| Docker | 20.0+ | Latest |

## ✨ Key Features

### 🤖 **Advanced AI Trading Suite**
- **16+ ML Algorithms**: ARIMA, SARIMA, Prophet, LSTM, SVM, Random Forest
- **Real-time Adaptation**: Dynamic model retraining and selection
- **Portfolio Intelligence**: Risk parity, Monte Carlo simulation, dynamic hedging
- **Multi-Asset Analysis**: Vector Autoregression (VAR), change point detection

### 🐳 **Enterprise Architecture**
- **Docker-First Design**: Multi-stage builds with security hardening
- **Microservices Ready**: Scalable service orchestration
- **Production Monitoring**: Prometheus, Grafana, health checks
- **Security Hardened**: Non-root containers, minimal attack surface

### 📊 **Professional Trading Interface**
- **Neural Command Deck**: Mission-critical dashboard design
- **Real-time Market Data**: Live cryptocurrency feeds via CoinGecko API
- **Multi-Bot Management**: Deploy and manage multiple trading strategies
- **Advanced Analytics**: Performance tracking, risk analysis, P&L monitoring

### 🔧 **Development Ready**
- **Zero Configuration**: UI-based settings management
- **Comprehensive Documentation**: 15+ detailed guides
- **TypeScript Support**: Full type safety for frontend
- **Testing Framework**: Built-in test suites and validation

## 📚 Documentation

Comprehensive documentation is available to guide you through every aspect of A.A.I.T.I:

### 🎯 Getting Started
- **[📖 Installation Guide](docs/installation.md)** - Complete setup instructions
- **[🪟 Windows Guide](docs/windows.md)** - Windows-specific installation  
- **[🚀 Quick Start Guide](docs/quick-start.md)** - 5-minute setup guide
- **[👤 User Guide](docs/user-guide.md)** - Feature walkthrough with screenshots

### 🔧 Technical Documentation
- **[🔌 API Reference](docs/api-reference.md)** - Complete REST API documentation
- **[🧠 ML Models Guide](docs/ml-models.md)** - 16 algorithms with examples
- **[🐳 Docker Guide](docs/docker.md)** - Container deployment guide
- **[🏗️ Architecture Overview](docs/architecture.md)** - System design and components

### 🛠 Development
- **[💻 Development Guide](docs/development.md)** - Developer setup and guidelines
- **[🚀 TODO Roadmap](TODO-ROADMAP.md)** - Planned features and roadmap
- **[🆘 Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

**[📖 Browse All Documentation](docs/README.md)**

## 🛠 Tech Stack

- **Backend**: Node.js + Express.js + SQLite + Socket.IO
- **Frontend**: React 19 + TypeScript + Material-UI v7 + Redux Toolkit
- **ML Stack**: 16 algorithms including ARIMA, SARIMA, Prophet, LSTM
- **Deployment**: Docker-first with multi-stage builds
- **Monitoring**: Prometheus + Grafana + health checks
- **Security**: JWT auth, Helmet.js, rate limiting, CORS

## 🎯 What's New in v2.0.0

### 🚀 **Major Enhancements**
- **Complete Documentation Overhaul**: Comprehensive 15+ guide structure
- **Enhanced ML Suite**: 16+ algorithms with advanced time series forecasting
- **Production Architecture**: Microservices-ready with enterprise monitoring
- **Developer Experience**: Improved development guidelines and contribution workflow
- **Performance Optimization**: Advanced container tuning and resource management

## 💰 Supported Assets

A.A.I.T.I supports **50+ cryptocurrencies** via CoinGecko API (no API key required):
- Bitcoin (BTC), Ethereum (ETH), Binance Coin (BNB)
- Cardano (ADA), Solana (SOL), Polkadot (DOT)
- And many more with real-time data and historical analysis

## 🔄 Real-Time Features

- **Live Market Data**: Real-time price updates and WebSocket communication
- **Bot Monitoring**: Live status tracking and performance metrics
- **System Health**: Real-time monitoring and alerting
- **Portfolio Analytics**: Live P&L tracking and risk analysis

## 🆘 Need Help?

1. **📖 Documentation**: Check our [comprehensive guides](docs/README.md)
2. **🔍 Troubleshooting**: See the [troubleshooting guide](docs/troubleshooting.md)
3. **🏥 Health Check**: Visit `http://localhost:5000/api/health`
4. **🐛 Issues**: Report bugs on [GitHub Issues](https://github.com/gelimorto2/A.A.I.T.I/issues)

## ⚠️ Important Notes

- **Development Version**: For live trading, implement proper security hardening
- **System Requirements**: 4GB RAM, Docker 20.0+, 5GB disk space recommended
- **Production Use**: Review security guidelines before live deployment

## 📝 License

ISC License - see LICENSE file for details.

---

**A.A.I.T.I v2.0.0**: AI-Powered Trading Platform • 16+ ML Algorithms • Production-Ready • Enterprise-Grade

**[📖 Get Started with Documentation](docs/README.md)**