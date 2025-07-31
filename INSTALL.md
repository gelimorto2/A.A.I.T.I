# 🚀 AAITI Installation Guide - Optimized for Speed & Reliability

## Quick Start (30 seconds!)

### Method 1: Interactive Installer (Recommended)
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
chmod +x install.sh
./install.sh
```

The interactive installer will:
- ✅ Check system requirements (Node.js 18+, memory, disk space)
- ✅ Let you choose installation type (Production/Development/Fast)
- ✅ Clean previous installations if needed
- ✅ Show progress indicators during installation
- ✅ Create initial configuration
- ✅ Optionally start the application immediately

### Method 2: Fast Install (For Advanced Users)
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
npm run install:fast  # Uses npm ci for speed
npm run build
npm start
```

### Method 3: Docker (Production Ready)
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
docker-compose up -d
```

## Installation Types

| Type | Command | Use Case | Speed | Features |
|------|---------|----------|-------|----------|
| **Production** | `npm run install:production` | Live trading | Medium | Production-optimized |
| **Development** | `npm run setup:dev` | Testing/Dev | Medium | All dev tools included |
| **Fast** | `npm run install:fast` | Quick setup | ⚡ Fast | Skip some optimizations |

## Performance Improvements

### 🚀 Speed Optimizations
- **Improved .npmrc** - Better caching and offline preferences
- **Parallel Installation** - Root, backend, and frontend install simultaneously  
- **Smart Caching** - Reduced redundant package downloads
- **Progress Indicators** - Visual feedback during installation
- **Selective Dependencies** - Production vs development packages

### 🔧 Reliability Enhancements
- **System Requirements Check** - Validates Node.js version, memory, disk space
- **Clean Installation Options** - Removes conflicting previous installs
- **Error Recovery** - Better error messages and fallback options
- **Dependency Conflict Resolution** - Fixed React version conflicts
- **Security Updates** - Patched vulnerabilities in serve and other packages

## New Features in v1.1.0

### 📊 Portfolio Optimization
```bash
# Access portfolio optimization via API:
# GET /api/analytics/portfolio/optimization/methods
# POST /api/analytics/portfolio/optimize
```

### 🔔 Notification System
```bash
# Webhook management:
# POST /api/notifications/webhooks
# GET /api/notifications/webhooks

# Email notifications:
# POST /api/notifications/subscribe
```

### 🐳 Docker Support
```bash
# Development
docker-compose -f docker-compose.yml up -d

# Production with nginx
docker-compose --profile production up -d
```

## Troubleshooting

### Installation Issues
```bash
# If installation fails, try:
npm run clean:all    # Clean everything
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