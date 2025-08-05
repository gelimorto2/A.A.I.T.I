# 🚀 A.A.I.T.I Installation Guide - Simplified & Unified

## Quick Start (One Command!)

### Universal Installer (All-in-One)
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./install
```

The unified installer toolkit includes:
- ✅ **Auto-detection** of your OS (Linux/macOS/Windows)
- ✅ **System requirements check** (Docker, Node.js, memory, disk)
- ✅ **Docker installation** (Recommended - Production ready)
- ✅ **NPM installation** (Advanced users)
- ✅ **Demo functionality** (Try before installing)
- ✅ **Interactive menu** - Choose what you need
- ✅ **No complex scripts** - Everything in one file

## Available Commands

### Interactive Menu
```bash
./install                    # Main menu with all options
```

### Direct Commands
```bash
./install docker             # Docker installation (recommended)
./install npm                # NPM installation
./install demo               # Run demo
./install check              # System requirements check
./install help               # Show help
```

## Installation Options

### 🐳 Docker Installation (Recommended)
- **Production**: Just A.A.I.T.I with optimized settings
- **Development**: With hot reload for development
- **Monitoring**: Production + Prometheus/Grafana
- **Full Stack**: All services (nginx, redis, monitoring)
- **Quick Start**: Just run it without configuration

### 📦 NPM Installation (Advanced)
- **Production**: Optimized for live trading
- **Development**: All dev tools included
- **Fast**: Quick setup with minimal features

## System Requirements

### Minimum Requirements
- **Memory**: 4GB RAM (2GB minimum)
- **Disk**: 2GB available space
- **Docker**: Version 20.0+ (for Docker installation)
- **Node.js**: Version 18+ (for NPM installation)

### Supported Operating Systems
- **Linux**: Ubuntu 18.04+, CentOS 7+, Fedora 30+
- **macOS**: 10.15+ (Intel and Apple Silicon)
- **Windows**: 10+ with WSL2 or Git Bash

## Troubleshooting

### Installation Issues
```bash
# Check system requirements
./install check

# Clean installation
npm run clean

# Try Docker instead of NPM
./install docker
```

### Common Solutions
1. **"Docker not found"**: Install Docker Desktop
2. **"Node.js too old"**: Update to Node.js 18+
3. **"Permission denied"**: Don't run as root
4. **"Out of memory"**: Try Docker installation (lighter)

### Getting Help
```bash
./install help              # Show all options
./install check             # Diagnose issues
```

## What's New - Simplified Architecture

### ✅ Before (Complex)
- Multiple OS-specific scripts
- Complex dependency chains
- Platform-specific implementations
- Separate demo scripts

### ✅ After (Simple)
- **One install script** handles everything
- **Toolkit approach** - choose what you need
- **Auto-detection** of optimal installation method
- **Built-in demo** functionality

### Key Improvements
- 🚀 **Faster**: Reduced from 12+ scripts to 1
- 🛡️ **More reliable**: Single point of control
- 🎯 **Simpler**: Interactive menu vs command-line complexity
- 🔧 **Easier maintenance**: One file to update
npm cache verify     # Verify npm cache
./install.sh         # Use interactive installer
```

### Common Solutions
- **Node.js too old**: Install Node.js 18+ from https://nodejs.org/
- **Low memory**: Ensure at least 2GB RAM available
- **Permission errors**: Don't run as root, use regular user
- **Network issues**: Check firewall and proxy settings

### Performance Issues
```bash
# If installation is slow:
npm run install:fast    # Skip some optimizations
npm run clean:cache     # Clear npm cache
```

## System Requirements

### Minimum
- Node.js 18.0+
- npm 8.0+
- 2GB RAM
- 2GB free disk space

### Recommended
- Node.js 20.0+
- npm 10.0+
- 4GB RAM
- 5GB free disk space
- SSD storage

## Quick Commands

```bash
# Check system
npm run check

# Install dependencies
npm run install:all      # Full installation
npm run install:fast     # Fast installation
npm run install:production # Production only

# Build & Start
npm run build           # Build frontend
npm start              # Production mode
npm run dev            # Development mode

# Maintenance
npm run clean          # Clean build artifacts
npm run clean:cache    # Clean npm cache
npm run health         # Check backend health
npm run version:show   # Show version info
```

## 🎉 What's New in Build #4

- ⚡ **60% Faster Installation** - Optimized npm configuration and caching
- 🔒 **Security Hardened** - Fixed vulnerabilities, updated packages
- 📊 **Portfolio Optimizer** - 5 algorithms: equal weight, risk parity, minimum variance, momentum, mean reversion
- 📧 **Email Notifications** - HTML templates, rate limiting, event filtering
- 🔗 **Webhook System** - Retry logic, authentication, comprehensive event support
- 🐳 **Docker Ready** - Multi-stage builds, health checks, production-ready containers
- 🛠️ **Interactive Installer** - System checks, progress indicators, guided setup

---

**Need Help?** Check the full documentation in the main README.md or open an issue on GitHub.