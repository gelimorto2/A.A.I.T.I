# 🚀 A.A.I.T.I Installation Guide - Simplified & Production-Ready

## One-Command Installation

### Universal Docker Installer

```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./install
```

**That's it!** The interactive installer provides a production-ready A.A.I.T.I trading platform in minutes.

## What the Installer Does

The unified installer:
- ✅ **Checks system requirements** (Docker, memory, disk space)
- ✅ **Builds production containers** with all ML dependencies
- ✅ **Configures optimized settings** for trading performance
- ✅ **Starts all services** with health monitoring
- ✅ **Provides management commands** for ongoing operations

## System Requirements

### Minimum Requirements
- **Docker**: Version 20.0+ with Docker Compose
- **Memory**: 4GB RAM
- **Disk**: 2GB available space
- **Network**: Internet connection for market data

### Supported Operating Systems
- **Linux**: All distributions with Docker support
- **macOS**: Docker Desktop required

## Interactive Installer Menu

When you run `./install`, you get an interactive menu:

```
🔧 A.A.I.T.I Interactive Installer
===================================

1) 🚀 Install A.A.I.T.I (Production Ready)
2) 📊 Check Status
3) ⏹️  Stop A.A.I.T.I
4) 📋 View Logs
5) ❓ Help
6) 🚪 Exit
```

### Installation Process

1. **System Check**: Verifies Docker is installed and running
2. **Container Build**: Creates optimized production containers
3. **Service Start**: Launches A.A.I.T.I with health monitoring
4. **Ready**: Access at http://localhost:5000

## Management Commands

After installation, manage A.A.I.T.I with these commands:

### Check Status
```bash
# Interactive status check
./install status

# Direct Docker command
docker compose ps
```

### View Logs
```bash
# Interactive log viewer
./install logs

# Direct Docker command
docker compose logs -f aaiti
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

## Advanced Usage

### Custom Configuration

Edit `docker-compose.yml` for custom settings:

```yaml
environment:
  - NODE_ENV=production
  - PORT=5000
  - LOG_LEVEL=info        # debug, info, warn, error
  - API_RATE_LIMIT_MAX=1000
  - CACHE_TTL=300
```

### Development Mode

For development with hot reload:

1. Create `docker-compose.override.yml`:
```yaml
services:
  aaiti:
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
```

2. Start: `docker compose up -d`

### Network Access

To allow external access, modify `docker-compose.yml`:
```yaml
ports:
  - "0.0.0.0:5000:5000"  # Bind to all interfaces
```

## Getting Help

1. **Interactive Help**: `./install help`
2. **Check Status**: `./install status`
3. **View Logs**: `./install logs`
4. **GitHub Issues**: [Report problems](https://github.com/gelimorto2/A.A.I.T.I/issues)

---

**Ready to start trading?** Run `./install` and access your A.A.I.T.I platform at http://localhost:5000!