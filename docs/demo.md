# A.A.I.T.I Demo Guide

Quick evaluation of A.A.I.T.I with minimal setup requirements.

## 🎯 Demo Overview

The A.A.I.T.I demo provides a complete evaluation environment with:
- **Sample trading data** for realistic testing
- **Pre-configured ML models** for immediate demonstration
- **Interactive dashboard** showcasing all features
- **Minimal system requirements** - just Docker needed

## 🚀 Quick Start

### Prerequisites
- **Docker**: Any recent version (20.0+)
- **4GB RAM**: Minimum system memory
- **2GB Storage**: Free disk space

# A.A.I.T.I Demo Guide

Quick evaluation of A.A.I.T.I with minimal setup requirements.

## 🎯 Demo Overview

The A.A.I.T.I demo provides a complete evaluation environment with:
- **Sample trading data** for realistic testing
- **Pre-configured ML models** for immediate demonstration
- **Interactive dashboard** showcasing all features
- **Minimal system requirements** - just Docker needed

## 🚀 Quick Start

### Prerequisites
- **Docker**: Any recent version (20.0+)
- **4GB RAM**: Minimum system memory
- **2GB Storage**: Free disk space

### Platform-Specific Commands

#### 🎯 Enhanced Verbose Demo (Recommended)

The verbose demo provides detailed progress tracking, health checks, and troubleshooting information:

**🐧 Linux:**
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./scripts/linux/demo-verbose.sh
```

**🍎 macOS:**
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./scripts/macos/demo-verbose.sh
```

**🪟 Windows:**
```batch
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
scripts\windows\demo-verbose.bat
```

**Features of Verbose Demo:**
- 🎯 **8-step progress tracking** with detailed status
- 🔍 **Comprehensive health checks** and system validation
- ⏱️ **Timing information** for each step
- 🌈 **Color-coded output** with clear status messages
- 📋 **Built-in troubleshooting** commands and tips
- 🚀 **Smart browser launch** with automatic fallbacks
- 📝 **Complete logging** to timestamped files
- 🛡️ **System-specific optimizations** for each platform

#### ⚡ Quick Demo (Backward Compatible)

**🐧 Linux / 🍎 macOS:**
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./demo.sh
```

**🪟 Windows:**
```batch
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
scripts\windows\demo.bat
```

The quick demo scripts will automatically detect your system and offer to run the enhanced verbose version.

#### 🐳 Docker Only (Any Platform)
```bash
docker compose -f docker-compose.demo.yml up -d --build
```

## 🖥️ Demo Features

### 📊 Dashboard Interface
- **Real-time market simulation** with sample data
- **Interactive trading controls** for strategy testing
- **ML model performance** visualization and metrics
- **Portfolio analytics** with sample portfolio data

### 🤖 AI Models Demo
- **16+ ML algorithms** with pre-trained sample models
- **Backtesting results** using historical sample data
- **Model comparison** showing performance metrics
- **Prediction accuracy** demonstrations

### 📈 Trading Simulation
- **Sample bot strategies** with realistic scenarios
- **Paper trading** with virtual portfolio
- **Performance tracking** over simulated time periods
- **Risk management** demonstrations

## 🌐 Access Points

Once the demo is running:

| Service | URL | Description |
|---------|-----|-------------|
| **Main Dashboard** | http://localhost:3000 | Primary interface |
| **API Health** | http://localhost:5000/api/health | System status |
| **API Docs** | http://localhost:5000/api/docs | API documentation |
| **ML Models** | http://localhost:3000/models | Model management |
| **Trading** | http://localhost:3000/trading | Trading interface |

## 🎮 Demo Scenarios

### Scenario 1: ML Model Evaluation
1. Navigate to **Models** section
2. Select a pre-trained model (e.g., LSTM Bitcoin Predictor)
3. View model performance metrics
4. Run predictions on sample data
5. Compare with actual sample outcomes

### Scenario 2: Trading Bot Simulation
1. Go to **Trading** section
2. Create a new trading bot with sample strategy
3. Configure risk parameters
4. Run simulation on historical sample data
5. Monitor performance in real-time

### Scenario 3: Portfolio Analysis
1. Access **Portfolio** dashboard
2. Review sample portfolio performance
3. Analyze risk metrics and diversification
4. Test different allocation strategies
5. View detailed analytics and reports

## 🛠️ Demo Scripts Comparison

### Enhanced Verbose Demo Scripts

Located in `scripts/[system]/demo-verbose.*`, these provide:

**Progress Tracking:**
- 8-step installation process with clear progress indicators
- Real-time status updates with color-coded messages
- Step timing information and total completion time
- Detailed logging to timestamped files

**System Validation:**
- Comprehensive Docker installation and service checks
- System requirements validation (memory, disk space)
- Port availability testing and conflict resolution
- Docker network connectivity verification
- Docker Compose configuration validation

**Health Monitoring:**
- Backend API health checks with response validation
- Frontend responsiveness testing
- Demo data initialization verification
- Service startup monitoring with retry logic

**Platform Optimizations:**
- **Linux**: Distribution detection and package manager support
- **macOS**: Apple Silicon/Intel detection, Homebrew integration, native notifications
- **Windows**: Docker Desktop specific checks, dual Command Prompt/PowerShell support

**Troubleshooting:**
- Built-in troubleshooting commands and tips
- Comprehensive error messages with solution suggestions
- Log file generation for debugging
- Automatic cleanup and retry mechanisms

### Quick Demo Scripts

Located in project root (`demo.sh`, `scripts/windows/demo.bat`), these provide:

**Backward Compatibility:**
- Simple, fast demo startup
- Minimal output for quick testing
- Automatic detection and offering of verbose demo
- Fallback support when enhanced scripts aren't available

**Use Cases:**
- Quick evaluation without detailed feedback
- CI/CD integration where minimal output is preferred
- Users who prefer simple, traditional script behavior

## 📱 Demo Data

The demo includes:
- **6 months** of sample cryptocurrency data
- **5 pre-configured** trading strategies
- **3 sample portfolios** with different risk profiles
- **Sample news events** for sentiment analysis testing

### Sample Assets
- Bitcoin (BTC) - Primary cryptocurrency
- Ethereum (ETH) - Smart contract platform
- Binance Coin (BNB) - Exchange token
- Cardano (ADA) - Proof-of-stake blockchain
- Solana (SOL) - High-performance blockchain

## 🛠️ Demo Configuration

### Environment Variables
The demo automatically sets:
```
NODE_ENV=demo
DATABASE_URL=sqlite:./data/demo.db
DEMO_MODE=true
REACT_APP_DEMO_MODE=true
```

### Demo Limitations
- **No real trading**: All operations are simulated
- **Sample data only**: No live market connections
- **Limited history**: 6 months of sample data
- **No external APIs**: Offline demonstration mode

## 🔧 Management Commands

### Start Demo
```bash
# Enhanced Verbose Demo (Recommended)
# Linux
./scripts/linux/demo-verbose.sh

# macOS
./scripts/macos/demo-verbose.sh

# Windows
scripts\windows\demo-verbose.bat

# Quick Demo (Backward Compatible)
# Linux/macOS
./demo.sh

# Windows
scripts\windows\demo.bat

# Docker Only
docker compose -f docker-compose.demo.yml up -d
```

### Stop Demo
```bash
# Any platform
docker compose -f docker-compose.demo.yml down
```

### View Logs
```bash
docker compose -f docker-compose.demo.yml logs -f
```

### Reset Demo Data
```bash
# Enhanced Scripts
docker compose -f docker-compose.demo.yml down -v
./scripts/linux/demo-verbose.sh   # Linux
./scripts/macos/demo-verbose.sh   # macOS
scripts\windows\demo-verbose.bat  # Windows

# Standard Scripts
docker compose -f docker-compose.demo.yml down -v
docker compose -f docker-compose.demo.yml up -d --build
```

## 🆘 Demo Troubleshooting

### Common Issues

#### Port Already in Use
**Problem**: Error "Port 3000 is already in use"
**Solution**:
```bash
# Find and kill process using port
sudo lsof -ti:3000 | xargs kill -9  # Linux/macOS
netstat -ano | findstr :3000        # Windows (then kill PID)
```

#### Docker Issues
**Problem**: "Cannot connect to Docker daemon"
**Solution**: Ensure Docker Desktop is running

#### Demo Not Loading
**Problem**: Browser shows connection error
**Solution**: 
1. Wait 2-3 minutes for containers to fully start
2. Check status: `docker compose -f docker-compose.demo.yml ps`
3. Check logs: `docker compose -f docker-compose.demo.yml logs`

## 🚀 Next Steps

After evaluating the demo:

1. **Full Installation**: Follow the [installation guide](installation.md)
2. **Development Setup**: See [development guide](development.md)
3. **Production Deployment**: Review [Docker guide](docker.md)
4. **Connect Real Data**: Configure live API connections

## 📞 Support

- **Documentation**: [Browse all guides](README.md)
- **Issues**: [GitHub Issues](https://github.com/gelimorto2/A.A.I.T.I/issues)
- **Troubleshooting**: [Common problems](troubleshooting.md)

---

**Note**: The demo uses simulated data and is designed for evaluation purposes. For live trading, follow the full installation process.