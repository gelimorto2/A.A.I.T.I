# 🚀 A.A.I.T.I Installation Guide v2.0 - Streamlined & Production-Ready

## Quick Start - One-Command Installation

### Universal Docker Installer with Configuration

```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./install
```

**That's it!** The interactive installer will guide you through configuration and deployment.

## What's New in v2.0

✨ **Interactive Configuration Wizard** - Set up your installation with a step-by-step wizard
✨ **Streamlined Installation** - Removed unnecessary dependencies and functions
✨ **Environment-Based Config** - All settings in one `.env` file
✨ **API Key Management** - Configure exchange APIs during installation
✨ **Flexible Deployment** - Choose between production, development, or docker-dev modes

## What the Installer Does

The unified installer:
- ✅ **Runs configuration wizard** to generate `.env` file
- ✅ **Configures installation type** (production/development/docker-dev)
- ✅ **Sets up API keys** for exchanges (Binance, Alpaca, Polygon)
- ✅ **Configures database** (SQLite or PostgreSQL)
- ✅ **Generates security secrets** (JWT, encryption keys)
- ✅ **Checks system requirements** (Docker, memory, disk space)
- ✅ **Builds production containers** with all ML dependencies
- ✅ **Starts all services** with health monitoring
- ✅ **Provides management commands** for ongoing operations

## System Requirements

### Minimum Requirements
- **Docker**: Version 20.0+ with Docker Compose
- **Memory**: 4GB RAM (2GB for development)
- **Disk**: 2GB available space
- **Network**: Internet connection for market data

### Supported Operating Systems
- **Linux**: All distributions with Docker support
- **macOS**: Docker Desktop required
- **Windows**: Docker Desktop with WSL2

## Installation Process

### Step 1: Configuration Wizard

When you run `./install` for the first time, you'll be guided through an interactive configuration wizard that asks for:

#### 1. Installation Type
- **Production** - Docker-based, optimized for live trading
- **Development** - Local setup with hot-reload and debugging
- **Docker Development** - Containerized with dev tools

#### 2. Application Settings
- HTTP port (default: 5000)
- Log level (error/warn/info/debug)
- Frontend URL

#### 3. Database Configuration
- **SQLite** - Simple, file-based (recommended for small deployments)
- **PostgreSQL** - Production-grade, scalable

#### 4. Security Settings
- Automatically generated JWT secret
- Encryption key for sensitive data
- Session secret

#### 5. Exchange API Keys (Optional)
- **Binance** - API key, secret, testnet option
- **Alpaca** - API key, secret, paper trading option
- **Polygon.io** - Market data API key

#### 6. Performance Settings
- Thread pool size
- Memory limits
- Cache TTL
- Rate limiting

### Step 2: Docker Build & Deploy

After configuration, the installer will:
1. Build Docker containers with your configuration
2. Start services
3. Perform health checks
4. Display access URLs and management commands

## Interactive Installer Menu

When you run `./install`, you get an interactive menu:

```
╔══════════════════════════════════════════════════════════════╗
║  🚀 A.A.I.T.I v2.1.0                                        ║
║  📊 Status: Running                                          ║
║  🌐 Port: 5000                                              ║
╚══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Main Menu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1) 🚀 Install / Full Setup
  2) ▶️  Start Services
  3) 📊 Check Status
  4) ⏹️  Stop Services
  5) 📋 View Logs
  6) 🔄 Restart Services
  7) ⚙️  Reconfigure
  8) ❓ Help
  9) 🗑️  Remove / Uninstall
  0) 🚪 Exit
```

## Management Commands

After installation, manage A.A.I.T.I with these commands:

### Quick Commands

```bash
./install start       # Start services
./install stop        # Stop services
./install restart     # Restart services
./install status      # Check status
./install logs        # View logs (tail -f)
./install config      # Reconfigure settings
./install help        # Show help
```

### Configuration Management

#### Reconfigure Settings
```bash
# Run the configuration wizard again
bash scripts/config-generator.sh

# Or use the installer menu
./install config
```

#### Manual Configuration
You can manually edit the `.env` file:
```bash
nano .env
# After editing, restart services:
./install restart
```

### Check Status
```bash
# Interactive status check with health info
./install status

# Direct Docker command
docker compose ps
```

### View Logs
```bash
# Interactive log viewer (follows logs)
./install logs

# Direct Docker command
docker compose logs -f aaiti

# Last 100 lines
docker compose logs --tail 100 aaiti
```

### Stop/Start Services
```bash
# Stop A.A.I.T.I
./install stop
# OR
docker compose down

# Restart A.A.I.T.I
docker compose restart aaiti

# Start if stopped
docker compose up -d aaiti
```

### Update A.A.I.T.I
```bash
# Pull latest code and rebuild
git pull
docker compose build
docker compose up -d aaiti
```

## Troubleshooting

### Docker Not Found
```bash
# Install Docker on Linux
curl -fsSL https://get.docker.com | sh

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

### Docker Not Running
- **Linux**: `sudo systemctl start docker`
- **macOS**: Start Docker Desktop application

### Port Already in Use
If port 5000 is busy, edit `docker-compose.yml`:
```yaml
ports:
  - "5001:5000"  # Change 5000 to 5001 or another port
```

### Memory Issues
Ensure at least 4GB RAM is available:
```bash
# Check available memory
free -h

# Stop other Docker containers if needed
docker stop $(docker ps -q)
```

### Health Check Failures
```bash
# Check container status
docker compose ps

# View detailed logs
docker compose logs -f aaiti

# Restart if needed
docker compose restart aaiti
```

## Production Configuration

The installer creates a production-ready setup with:

### Performance Optimizations
- **Resource Limits**: 2GB RAM, 1 CPU core maximum
- **Thread Pool**: 16 threads for optimal performance
- **Memory Management**: Optimized Node.js heap settings
- **Database**: SQLite with WAL mode for better concurrency

### Security Features
- **Non-root User**: Container runs as user `aaiti` (UID 1001)
- **Minimal Base**: Alpine Linux with only required packages
- **Network Isolation**: Dedicated Docker network
- **Data Persistence**: Separate volumes for data and logs

### Monitoring & Reliability
- **Health Checks**: Automatic service health monitoring
- **Restart Policies**: Automatic restart on failure
- **Log Management**: Rotating logs with size limits
- **Graceful Shutdown**: Proper signal handling

## Data Persistence

Your A.A.I.T.I data is stored in Docker volumes:

```bash
# View volumes
docker volume ls | grep aaiti

# Backup data (example)
docker run --rm -v aaiti_data:/data -v $(pwd):/backup alpine tar czf /backup/aaiti-backup.tar.gz /data

# Restore data (example)
docker run --rm -v aaiti_data:/data -v $(pwd):/backup alpine tar xzf /backup/aaiti-backup.tar.gz -C /
```

## What's Removed - Simplified Architecture

### ✅ Before (Complex)
- Multiple installation methods (Docker, NPM, portable)
- Platform-specific scripts (Windows .bat/.ps1)
- Complex docker-compose profiles
- Separate build steps and production modes
- Multiple Dockerfile variants

### ✅ After (Simple)
- **Single installation method** (Docker only)
- **One install script** handles everything
- **Simple docker-compose** with production settings
- **Production-ready on install** (no build steps)
- **Single Dockerfile** optimized for production

### Key Benefits
- 🚀 **Faster**: One command gets you started
- 🛡️ **More reliable**: Single, tested deployment method
- 🎯 **Simpler**: No complex configuration options
- 🔧 **Easier maintenance**: Single configuration to maintain

## Configuration Reference

### Environment Variables (.env)

The `.env` file contains all configuration. Here are the key settings:

#### Application Settings
```bash
NODE_ENV=production              # production, development
PORT=5000                        # HTTP port
LOG_LEVEL=info                   # error, warn, info, debug
FRONTEND_URL=http://localhost:3000
```

#### Database Settings
```bash
# SQLite (default)
DB_TYPE=sqlite
DB_PATH=./database/aaiti.sqlite

# PostgreSQL (alternative)
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aaiti
DB_USER=aaiti_user
DB_PASSWORD=your_secure_password
```

#### Security Settings
```bash
JWT_SECRET=auto_generated_secret
ENCRYPTION_KEY=auto_generated_key
SESSION_SECRET=auto_generated_secret
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

#### Exchange API Keys
```bash
# Binance
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
BINANCE_TESTNET=true

# Alpaca (Stocks)
ALPACA_API_KEY=your_api_key
ALPACA_API_SECRET=your_api_secret
ALPACA_PAPER=true

# Polygon.io (Market Data)
POLYGON_API_KEY=your_api_key
```

#### Performance Settings
```bash
UV_THREADPOOL_SIZE=16
NODE_OPTIONS=--max-old-space-size=2048
CACHE_TTL=300
API_RATE_LIMIT_WINDOW=900000
API_RATE_LIMIT_MAX=1000
```

#### Feature Flags
```bash
ENABLE_ML_MODELS=true
ENABLE_ADVANCED_STRATEGIES=true
ENABLE_BACKTESTING=true
ENABLE_PAPER_TRADING=true
ENABLE_WEBSOCKET=true
```

### Updating Configuration

After modifying `.env`:
```bash
./install restart
```

### Development Mode

For local development without Docker:

1. Run configuration wizard:
```bash
bash scripts/config-generator.sh
# Select "Development" mode
```

2. Install dependencies:
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

3. Run services:
```bash
# Backend
cd backend && npm run dev

# Frontend (new terminal)
cd frontend && npm start
```

### Network Access

To allow external access, modify `.env`:
```bash
PORT=0.0.0.0:5000  # Bind to all interfaces
```

⚠️ **Warning**: Only expose to external networks with proper firewall and security measures.

## Getting Help

1. **Interactive Help**: `./install help`
2. **Check Status**: `./install status`
3. **View Logs**: `./install logs`
4. **GitHub Issues**: [Report problems](https://github.com/gelimorto2/A.A.I.T.I/issues)

---

**Ready to start trading?** Run `./install` and access your A.A.I.T.I platform at http://localhost:5000!