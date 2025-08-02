# Docker Guide

Complete Docker deployment guide for A.A.I.T.I v1.2.1. Learn how to deploy, manage, and optimize A.A.I.T.I using Docker containers.

## 🐳 Docker Architecture

A.A.I.T.I is designed with a Docker-first approach, providing multiple deployment profiles for different use cases:

### Container Structure
- **Backend Container**: Node.js API server with SQLite database
- **Frontend Container**: React TypeScript application served by Nginx
- **Monitoring Stack**: Prometheus + Grafana (optional)
- **Reverse Proxy**: Nginx with SSL/TLS support (optional)
- **Redis Cache**: Performance optimization (optional)

### Multi-Stage Builds
All containers use optimized multi-stage builds:
- **Development Stage**: Full development tools and hot-reload
- **Build Stage**: Compilation and optimization
- **Production Stage**: Minimal runtime with security hardening

## 🚀 Quick Start

### One-Command Deployment
```bash
# Clone and deploy with interactive installer
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./install-docker.sh
```

### Manual Docker Commands
```bash
# Production deployment (default)
docker compose up -d

# Development with hot-reload
docker compose --profile development up -d

# Full stack with monitoring
docker compose --profile full up -d

# Production with monitoring
docker compose --profile monitoring up -d
```

## 🎯 Deployment Profiles

### Production Profile (Default)
**Command:** `docker compose up -d`

**Services:**
- Backend API server (optimized)
- Frontend served by Nginx
- SQLite database with persistence
- Health checks and auto-restart

**Features:**
- Minimal container size
- Production optimizations
- Security hardening
- Automatic SSL/TLS (optional)

**Resource Usage:**
- Memory: ~512MB total
- CPU: 1-2 cores recommended
- Disk: ~2GB including data

### Development Profile
**Command:** `docker compose --profile development up -d`

**Additional Services:**
- Hot-reload for backend and frontend
- Development tools and debugging
- Extended logging and monitoring
- Source code volume mounts

**Features:**
- Live code reloading
- Development debugging tools
- Verbose logging
- Source maps enabled

**Resource Usage:**
- Memory: ~1GB total
- CPU: 2-4 cores recommended
- Disk: ~3GB including dev tools

### Monitoring Profile
**Command:** `docker compose --profile monitoring up -d`

**Additional Services:**
- Prometheus metrics collection
- Grafana dashboard
- Node Exporter system metrics
- cAdvisor container metrics

**Access Points:**
- Application: http://localhost:5000
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090

**Features:**
- Real-time performance monitoring
- Custom trading metrics
- System resource tracking
- Alerting capabilities

### Full Stack Profile
**Command:** `docker compose --profile full up -d`

**All Services:**
- Production application stack
- Complete monitoring suite
- Nginx reverse proxy
- Redis caching layer
- SSL/TLS termination

**Features:**
- Enterprise-grade deployment
- Load balancing ready
- Full observability
- Production security

## 🔧 Configuration

### Environment Variables

Create `.env` file in the project root:

```bash
# Application Configuration
NODE_ENV=production
PORT=5000
FRONTEND_PORT=3000

# Database Configuration
DATABASE_PATH=./database/aaiti.sqlite
DATABASE_BACKUP_ENABLED=true

# JWT Configuration
JWT_SECRET=<your-secure-secret>
JWT_EXPIRES_IN=24h

# API Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Market Data Configuration
COINGECKO_API_BASE=https://api.coingecko.com/api/v3
MARKET_DATA_CACHE_TTL=60000

# Monitoring (optional)
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD=<secure-password>

# SSL/TLS (optional)
SSL_ENABLED=false
SSL_CERT_PATH=/certs/cert.pem
SSL_KEY_PATH=/certs/key.pem
```

### Docker Compose Override

Create `docker-compose.override.yml` for custom configurations:

```yaml
version: '3.8'

services:
  backend:
    environment:
      - DEBUG=aaiti:*
    volumes:
      - ./custom-configs:/app/config
    ports:
      - "5001:5000"  # Custom port mapping
  
  frontend:
    environment:
      - REACT_APP_API_URL=http://localhost:5001
    volumes:
      - ./custom-frontend:/app/public
```

### Resource Limits

Optimize container resource usage:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.5'
  
  frontend:
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
        reservations:
          memory: 128M
          cpus: '0.25'
```

## 📊 Monitoring & Logging

### Container Health Checks

All containers include comprehensive health checks:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Logging Configuration

Structured logging with JSON format:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Monitoring Commands

```bash
# View container status
docker compose ps

# Check container logs
docker compose logs -f backend
docker compose logs -f frontend

# Monitor resource usage
docker stats

# View container health
docker inspect $(docker compose ps -q backend) | grep Health -A 10
```

## 🛠 Management Commands

### Using Makefile

The project includes a comprehensive Makefile:

```bash
# Installation and startup
make install          # Production deployment
make dev              # Development environment
make monitor          # With monitoring stack
make full             # Full enterprise stack

# Management
make status           # Show service status
make logs             # View all logs
make logs-backend     # Backend logs only
make logs-frontend    # Frontend logs only
make restart          # Restart all services
make stop             # Stop all services

# Maintenance
make backup           # Backup database and config
make restore          # Restore from backup
make clean            # Clean containers and volumes
make update           # Update to latest images
make health           # Check system health

# Development
make shell            # Access backend container shell
make shell-frontend   # Access frontend container shell
make build            # Build all images
make rebuild          # Force rebuild all images
```

### Direct Docker Commands

```bash
# Container management
docker compose up -d --build       # Build and start
docker compose down                 # Stop and remove containers
docker compose restart backend     # Restart specific service
docker compose exec backend bash   # Access container shell

# Image management
docker compose build               # Build all images
docker compose pull                # Pull latest base images
docker compose push                # Push images to registry

# Data management
docker compose cp backend:/app/database ./backup/  # Copy database
docker volume ls                   # List volumes
docker volume inspect aaiti_data  # Inspect volume
```

## 🔒 Security Hardening

### Container Security

All production containers follow security best practices:

```dockerfile
# Non-root user
USER node

# Read-only root filesystem
--read-only
--tmpfs /tmp:rw,size=100M

# Minimal base images
FROM node:18-alpine

# Security scanning
hadolint Dockerfile
docker scan aaiti-backend:latest
```

### Network Security

```yaml
networks:
  default:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
  
  internal:
    driver: bridge
    internal: true  # No external access
```

### Secrets Management

```yaml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt

services:
  backend:
    secrets:
      - jwt_secret
      - db_password
```

## 🚀 Production Deployment

### Docker Swarm Deployment

```yaml
version: '3.8'

services:
  backend:
    image: aaiti-backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      placement:
        constraints:
          - node.role == worker
    networks:
      - aaiti-network

  frontend:
    image: aaiti-frontend:latest
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
    networks:
      - aaiti-network
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aaiti-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aaiti-backend
  template:
    metadata:
      labels:
        app: aaiti-backend
    spec:
      containers:
      - name: backend
        image: aaiti-backend:latest
        ports:
        - containerPort: 5000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### CI/CD Integration

```yaml
# GitHub Actions example
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: docker compose build
      - name: Run tests
        run: docker compose run --rm backend npm test
      - name: Deploy to production
        run: docker compose up -d
```

## 📈 Performance Optimization

### Container Optimization

```dockerfile
# Multi-stage build optimization
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Volume Optimization

```yaml
volumes:
  # Named volumes for better performance
  aaiti_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/aaiti/data
  
  # tmpfs for temporary files
  temp_data:
    driver: tmpfs
    driver_opts:
      size: 100m
```

### Network Optimization

```yaml
networks:
  aaiti-network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: aaiti0
      com.docker.network.driver.mtu: 1500
```

## 🆘 Troubleshooting

### Common Docker Issues

#### Container Won't Start
```bash
# Check container logs
docker compose logs backend

# Inspect container configuration
docker inspect $(docker compose ps -q backend)

# Check resource constraints
docker stats
```

#### Port Conflicts
```bash
# Find processes using ports
sudo lsof -i :5000
sudo lsof -i :3000

# Kill conflicting processes
sudo kill -9 <PID>

# Use different ports
docker compose up -d -p 5001:5000
```

#### Volume Issues
```bash
# Check volume mounts
docker volume ls
docker volume inspect aaiti_data

# Fix permissions
sudo chown -R 1000:1000 ./data
sudo chmod -R 755 ./data
```

#### Memory Issues
```bash
# Monitor memory usage
docker stats --no-stream

# Increase memory limits
docker compose up -d --memory=1g

# Clean up unused resources
docker system prune -a
```

### Performance Issues

#### Slow Container Startup
```bash
# Check image size
docker images | grep aaiti

# Optimize Dockerfile
# Use .dockerignore
# Minimize layers
```

#### Database Performance
```bash
# Enable WAL mode (already configured)
# Monitor database size
# Implement connection pooling
# Use read replicas for scaling
```

## 🔄 Updates and Maintenance

### Updating A.A.I.T.I

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
make rebuild
make restart

# Or use rolling update
docker compose up -d --build
```

### Backup and Restore

```bash
# Create backup
make backup

# Manual backup
docker compose exec backend cp -r /app/database /backup/
docker compose cp backend:/app/database ./backup/

# Restore from backup
docker compose down
cp -r ./backup/database ./
docker compose up -d
```

### Database Maintenance

```bash
# Access database
docker compose exec backend sqlite3 /app/database/aaiti.sqlite

# Vacuum database
docker compose exec backend sqlite3 /app/database/aaiti.sqlite "VACUUM;"

# Check database integrity
docker compose exec backend sqlite3 /app/database/aaiti.sqlite "PRAGMA integrity_check;"
```

---

**Next Steps:**
- Explore [Performance Tuning](performance.md) for optimization
- Check [Security Guide](security.md) for hardening
- See [Troubleshooting](troubleshooting.md) for common issues