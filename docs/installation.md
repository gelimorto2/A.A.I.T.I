# Installation Guide

This guide provides comprehensive installation instructions for A.A.I.T.I v1.2.1, supporting both Docker-first deployment (recommended) and manual installation.

## Prerequisites

### System Requirements
- **Docker** (20.0+) and **Docker Compose** (v2.0+)
- **Git** for cloning the repository
- **4GB RAM** (recommended for optimal performance)
- **5GB Disk Space** (recommended)

### Optional Requirements
- **Node.js** 16+ (for manual installation only)
- **npm** 8+ (for manual installation only)

## 🚀 Docker Installation (Recommended)

### One-Command Installation

```bash
# 1. Clone the repository
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I

# 2. Docker installation with interactive menu (ONE COMMAND!)
./install-docker.sh
```

**That's it!** 🎉 The Docker installer will:
- ✅ Check system requirements automatically
- 🎯 Let you choose installation type (Production/Development/Monitoring)  
- 🔨 Build optimized Docker containers
- 🚀 Start all services automatically
- 📊 Be ready at `http://localhost:5000`

### Manual Docker Commands

If you prefer manual control:

```bash
# Production deployment
make install              # Build and start production
make dev                 # Development environment  
make monitor             # Production + Prometheus/Grafana
make full               # All services (nginx, redis, monitoring)

# Or use Docker Compose directly
docker compose up -d     # Production
docker compose --profile development up -d  # Development
```

### Available Docker Profiles

- **Production** (default): Optimized containers with minimal resources
- **Development**: Hot-reload enabled with development tools
- **Monitoring**: Includes Prometheus and Grafana dashboards
- **Full Stack**: All services including Nginx, Redis, monitoring

## 🛠 Manual Installation (Alternative)

### Step 1: Install Dependencies

```bash
# Clone repository
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I

# Install all dependencies
npm run install:all
```

### Step 2: Build Application

```bash
# Build for production
npm run build:production
```

### Step 3: Start Services

```bash
# Start complete application
npm start

# Or start services individually
npm run start:backend     # Backend API server
npm run start:frontend    # Frontend React app
```

## 🔧 Docker Commands Reference

### Installation & Management
```bash
./install-docker.sh          # Interactive installation
make help                   # Show all available commands
make install               # Production deployment
make dev                  # Development environment
make monitor              # With monitoring stack
make full                # Complete enterprise setup
```

### Operations
```bash
make status               # Show service status
make logs                # View application logs  
make shell               # Access container shell
make restart             # Restart services
make clean               # Clean containers and volumes
make backup              # Create data backup
```

### Health Checks
```bash
make health              # Check application health
curl http://localhost:5000/api/health  # Direct health check
curl http://localhost:5000/api/metrics # Performance metrics
```

## 🎨 What You'll See After Installation

### ASCII Dashboard (Backend Terminal)
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

### Web Dashboard
- Professional dark theme Neural Command Deck interface
- Real-time trading metrics and bot management
- Live cryptocurrency data feeds
- Advanced charts and analytics
- Secure authentication system

## 🔍 Installation Verification

### 1. Check Services
```bash
# Docker installation
make status

# Manual installation
npm run health
```

### 2. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health
- **Metrics**: http://localhost:5000/api/metrics

### 3. Test Authentication
1. Navigate to http://localhost:3000
2. Register a new user account
3. Log in to access the dashboard

## 🧹 Clean Installation

If you encounter issues, perform a clean installation:

```bash
# Docker clean installation
make clean
./install-docker.sh

# Manual clean installation
npm run clean:all
npm run install:clean
npm run build:production
npm start
```

## 📝 Installation Scripts Reference

### Production Scripts
```bash
npm run install:all         # Standard dependency installation
npm run install:clean       # Clean installation from scratch
npm run install:production  # Production-ready installation with optimizations
npm run setup              # Complete setup with dependencies and build
```

### Cleanup Scripts
```bash
npm run clean:all           # Remove all files including lock files
npm run clean:cache         # Clear npm cache for all packages
```

## 🐳 Docker-Specific Features

### Multi-Stage Builds
- Optimized production containers with minimal attack surface
- Non-root container security
- Advanced caching and compression

### Health Monitoring
- Built-in health checks and auto-recovery
- Comprehensive container orchestration
- Performance tracking and metrics

### Security Hardening
- Security headers and middleware
- Minimal dependencies and optimized builds
- Rate limiting and protection

## 🆘 Installation Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill processes on ports 3000 and 5000
sudo lsof -ti:3000 | xargs sudo kill -9
sudo lsof -ti:5000 | xargs sudo kill -9
```

#### Docker Issues
```bash
# Check Docker status
docker --version
docker compose --version

# Restart Docker service
sudo systemctl restart docker
```

#### Permission Issues
```bash
# Fix permissions for Docker
sudo usermod -aG docker $USER
newgrp docker
```

#### Build Failures
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean Docker cache
docker system prune -a
```

For more troubleshooting help, see the [Troubleshooting Guide](troubleshooting.md).

---

**Next Steps**: After installation, continue with the [Quick Start Guide](quick-start.md) to begin using A.A.I.T.I.