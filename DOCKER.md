# 🐳 AAITI Docker Guide

This guide covers Docker-first installation and deployment of A.A.I.T.I (Auto AI Trading Interface).

## 🚀 Quick Start

### One-Command Installation
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./install-docker.sh
```

### Manual Docker Commands
```bash
# Production
docker compose up -d

# Development  
docker compose --profile development up -d

# With monitoring
docker compose --profile monitoring up -d

# Full stack
docker compose --profile production --profile monitoring --profile nginx up -d
```

## 📋 Prerequisites

### System Requirements
- **Docker** 20.0+ 
- **Docker Compose** 2.0+
- **4GB RAM** (recommended)
- **5GB disk space** (recommended)

### Installation Check
```bash
docker --version          # Should be 20.0+
docker compose version    # Should be 2.0+
```

## 🎯 Deployment Options

### 1. Production (Default)
```bash
make install
# or
docker compose up -d aaiti
```
- **Services**: AAITI application
- **Access**: http://localhost:5000
- **Use**: Production deployment

### 2. Development
```bash
make dev
# or  
docker compose --profile development up -d
```
- **Services**: AAITI with hot reload
- **Access**: http://localhost:3000 (frontend), http://localhost:5001 (backend)
- **Use**: Development and testing

### 3. Production + Monitoring
```bash
make monitor
# or
docker compose --profile monitoring up -d
```
- **Services**: AAITI + Prometheus + Grafana
- **Access**: 
  - AAITI: http://localhost:5000
  - Prometheus: http://localhost:9090
  - Grafana: http://localhost:3001 (admin/admin)
- **Use**: Production with monitoring

### 4. Production + Nginx Proxy
```bash
make prod
# or
docker compose --profile nginx up -d
```
- **Services**: AAITI + Nginx reverse proxy
- **Access**: http://localhost (via nginx)
- **Use**: Production with reverse proxy

### 5. Full Stack
```bash
make full
# or
docker compose --profile production --profile monitoring --profile nginx --profile redis up -d
```
- **Services**: All services (AAITI + Nginx + Monitoring + Redis)
- **Use**: Complete production environment

## ⚙️ Configuration

### Environment Variables
Copy and customize the environment file:
```bash
cp .env.docker .env
# Edit .env with your settings
```

### Key Configuration Options
```bash
# Performance
NODE_OPTIONS=--max-old-space-size=2048
UV_THREADPOOL_SIZE=16
SQLITE_CACHE_SIZE=10000

# API Settings
API_RATE_LIMIT_MAX=1000
CONCURRENT_REQUESTS=50

# Caching
CACHE_TTL=300
REDIS_HOST=redis  # if using Redis profile
```

## 🛠️ Management Commands

### Using Makefile (Recommended)
```bash
make help              # Show all commands
make install           # Build and start production
make dev              # Development environment
make logs             # View logs
make shell            # Access container shell
make status           # Show service status
make restart          # Restart services
make clean            # Clean containers and volumes
```

### Using Docker Compose
```bash
# Service management
docker compose up -d           # Start services
docker compose down           # Stop services
docker compose restart       # Restart services
docker compose ps            # Show status

# Logs and debugging
docker compose logs -f        # Follow logs
docker compose logs aaiti    # AAITI logs only
docker compose exec aaiti sh # Access shell

# Data management
docker compose down -v        # Stop and remove volumes
docker system prune -f        # Clean Docker system
```

## 📊 Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| AAITI | 5000 | Main application |
| Frontend Dev | 3000 | Development frontend |
| Backend Dev | 5001 | Development backend |  
| Nginx | 80/443 | Reverse proxy |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3001 | Monitoring dashboards |
| Redis | 6379 | Caching (internal) |

## 🔒 Security

### Production Security
- Non-root container user (aaiti:1001)
- Minimal Alpine Linux base image
- Security headers via Nginx
- Rate limiting and request throttling
- Health checks and monitoring

### SSL/TLS Setup
1. Place certificates in `docker/ssl/`:
   ```
   docker/ssl/cert.pem
   docker/ssl/key.pem
   ```

2. Uncomment HTTPS section in `docker/nginx/default.conf`

3. Start with nginx profile:
   ```bash
   docker compose --profile nginx up -d
   ```

## 💾 Data Persistence

### Volumes
- **aaiti_data**: Application database and user data
- **aaiti_logs**: Application logs
- **aaiti_cache**: Application cache
- **prometheus_data**: Prometheus metrics data
- **grafana_data**: Grafana dashboards and settings

### Backup
```bash
# Create backup
make backup

# Manual backup
docker compose exec aaiti tar czf - /app/data > backup-$(date +%Y%m%d).tar.gz
```

### Restore
```bash
# Restore from backup
make restore BACKUP_FILE=aaiti-backup-20250108.tar.gz

# Manual restore
cat backup-20250108.tar.gz | docker compose exec -T aaiti tar xzf - -C /
```

## 🐛 Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker compose logs aaiti

# Check system resources
docker stats

# Restart services
make restart
```

#### Port Already in Use
```bash
# Find process using port
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>
```

#### Build Failures
```bash
# Clean build
docker compose build --no-cache

# Check Docker space
docker system df

# Clean Docker system
docker system prune -a
```

#### Permission Issues
```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Check Docker daemon
sudo systemctl status docker
```

### Performance Issues

#### High Memory Usage
- Increase container memory limits in docker-compose.yml
- Adjust NODE_OPTIONS memory settings
- Enable Redis caching profile

#### Slow Database
- Check SQLite performance settings in .env
- Ensure WAL mode is enabled
- Increase cache size

#### Network Issues
- Check Docker network: `docker network ls`
- Verify port availability: `netstat -tulpn`
- Check firewall settings

## 📈 Monitoring

### Health Checks
```bash
# Check application health
curl http://localhost:5000/api/health

# Check container health
docker compose ps

# View health check logs
docker inspect <container_id> | grep Health -A 10
```

### Performance Monitoring
- **Prometheus**: http://localhost:9090 (with monitoring profile)
- **Grafana**: http://localhost:3001 (admin/admin)
- **Container stats**: `docker stats`

### Log Monitoring
```bash
# Real-time logs
make logs

# Specific service logs
docker compose logs -f prometheus
docker compose logs -f grafana
docker compose logs -f nginx
```

## 🔄 Updates

### Application Updates
```bash
# Update from git
make update

# Manual update
git pull
docker compose build
docker compose up -d
```

### Docker Image Updates
```bash
# Pull latest base images
docker compose pull

# Rebuild with latest
docker compose build --pull
```

## 🎯 Production Deployment

### Recommended Production Setup
1. **Full stack deployment**:
   ```bash
   make full
   ```

2. **Configure environment**:
   - Copy `.env.docker` to `.env`
   - Set production database paths
   - Configure SSL certificates
   - Set proper resource limits

3. **Monitor deployment**:
   - Check all services: `make status`
   - Verify health: `make health`
   - Monitor logs: `make logs`

4. **Set up backups**:
   - Configure automated backups
   - Test restore procedures
   - Monitor data volumes

### Production Checklist
- [ ] SSL/TLS certificates configured
- [ ] Environment variables set
- [ ] Resource limits configured  
- [ ] Monitoring enabled
- [ ] Backups automated
- [ ] Health checks verified
- [ ] Performance tuned
- [ ] Security hardened

## 📞 Support

### Getting Help
1. Check logs: `make logs`
2. Verify configuration: `make status`
3. Review this documentation
4. Check GitHub issues
5. Create new issue with logs and configuration

### Development
For development contributions:
```bash
make dev          # Start development environment
make shell        # Access development shell
make test         # Run tests (when available)
```