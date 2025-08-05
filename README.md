# A.A.I.T.I v2.0.0 - Auto AI Trading Interface 🚀🤖

![A.A.I.T.I Banner](assets/banner.svg)

**A.A.I.T.I v2.0.0** is a production-ready, AI-powered trading platform designed for professional cryptocurrency trading operations. Built with a Docker-first architecture, it provides a comprehensive Neural Command Deck with advanced ML algorithms, real-time market data, and enterprise-grade security.

🎯 **[📖 Live Presentation Page](presentation.html)** | 🚀 **[Quick Installation](#-quick-start)** | 🪟 **[Windows Guide](docs/windows.md)**

![AAITI Dashboard](https://github.com/user-attachments/assets/02041a91-eaaa-4593-9cd2-1538e23cf6f4)

## 🚀 Quick Start

### 🖥️ **One-Command Installation**

#### Windows Users 🪟
```batch
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
install.bat
```

#### Linux/macOS Users 🐧🍎
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./install
```

#### PowerShell (Advanced Windows) 💻
```powershell
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
.\install.ps1
```

The **unified installer toolkit** provides:
- ✅ **Native Windows support** - Batch and PowerShell installers
- ✅ **Interactive menu** - Choose Docker, NPM, or Demo
- ✅ **Auto-detection** of your OS (Windows/Linux/macOS)
- ✅ **System requirements check** (Docker, Node.js, memory, disk)
- ✅ **Production & development** options
- ✅ **Built-in demo** functionality
- ✅ **Cross-platform commands** - Works on all platforms

### 🎮 **Try the Demo First**
```bash
./install demo              # Run interactive demo
./install check             # Check system requirements
./install help              # Show all options
```

### 📦 **Direct Installation**
```bash
./install docker            # Docker installation (recommended)
./install npm               # NPM installation (advanced)
```

### 📦 **Full Installation**

#### Universal Installer (Recommended)
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I

# Universal installer - Auto-detects your OS and calls appropriate method
./install

# Or use specific installation types:
./install --docker      # Docker-based installation
./install --dev         # Development installation
./install --production  # Production installation
```

#### Alternative Methods
```bash
# Docker-based installation (all platforms)
./install-docker.sh

# Quick deployment options
./quick-start.sh

# Traditional package managers
make install    # Production deployment
make dev        # Development environment
make monitor    # With Prometheus/Grafana
make full       # Complete enterprise setup
```

The installer automatically:
- ✅ Detects your operating system
- ✅ Checks system requirements
- 🎯 Configures deployment profile  
- 🔨 Builds optimized containers
- 🚀 Starts all services
- 📊 Opens dashboard at appropriate URL

### ⚡ Alternative Commands

```bash
make install    # Production deployment
make dev        # Development environment
make monitor    # With Prometheus/Grafana
make full       # Complete enterprise setup
```

## 🖥️ **Cross-Platform Support**

A.A.I.T.I provides **native support** for all major operating systems with platform-specific installers:

### 🪟 **Windows (Enhanced Support)**
- **Native Windows Batch Script**: `install.bat` - Easy point-and-click installation
- **PowerShell Script**: `install.ps1` - Advanced features and system integration
- **Cross-platform npm scripts**: All commands work natively on Windows
- **Windows-specific documentation**: Complete Windows setup guide
- **Automatic platform detection**: Installers detect Windows version and capabilities
- **WSL2 and Docker Desktop support**: Full containerization support

**Windows Requirements:**
- Windows 10/11 Pro, Enterprise, or Education (64-bit)
- Windows Server 2019+ 
- WSL2 backend recommended for Docker
- PowerShell 5.1+ or Windows Terminal for best experience

### 🐧 **Linux** 
- Native Docker support, recommended for production
- Universal bash installer works on all major distributions
- Package manager integration (apt, yum, dnf)

### 🍎 **macOS**
- Full Docker Desktop compatibility
- Homebrew integration support
- Apple Silicon and Intel compatibility

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
- **[🎮 Demo Guide](docs/demo.md)** - Quick evaluation with minimal setup
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