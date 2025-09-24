# 🔧 A.A.I.T.I Advanced Installation Guide

This guide covers advanced installation scenarios for development, staging, and production environments. For basic installation, see [INSTALL.md](../INSTALL.md).

## Table of Contents
- [Development Environment Setup](#development-environment-setup)
- [Production Deployment](#production-deployment)
- [Database Configuration](#database-configuration)
- [Environment Variables](#environment-variables)
- [Docker Configurations](#docker-configurations)
- [Security Hardening](#security-hardening)
- [Monitoring & Observability](#monitoring--observability)
- [Troubleshooting](#troubleshooting)

---

## Development Environment Setup

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 3+
- **Docker** 20.0+ and **Docker Compose** v2.0+
- **Git** with SSH key configured
- **PostgreSQL** 14+ (optional, for production-like setup)
- **Redis** 6+ (optional, for caching)

### Local Development (No Docker)

Perfect for active development with hot reload and debugging.

```bash
# Clone repository
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I

# Install dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Set up environment
cp .env.docker .env.development
nano .env.development  # Edit as needed

# Initialize database (SQLite by default)
cd backend
npm run db:setup
cd ..

# Start development servers
npm run dev
```

**Development URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Hot reload enabled for both

### Development with Docker

For consistent environment matching production.

```bash
# Clone repository
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I

# Create development docker-compose override
cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  aaiti:
    build:
      target: development  # Use development stage
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
    volumes:
      - ./backend:/app/backend
      - ./frontend:/app/frontend
      - ./docs:/app/docs
    ports:
      - "5000:5000"
      - "9229:9229"  # Debug port
    command: npm run dev:debug

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: aaiti_dev
      POSTGRES_USER: aaiti_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data

volumes:
  postgres_dev_data:
  redis_dev_data:
EOF

# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f aaiti
```

---

## Production Deployment

### Option 1: Single Server Deployment

For small to medium production deployments.

```bash
# Clone to production server
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I

# Create production environment file
cat > .env.production << 'EOF'
# === PRODUCTION CONFIGURATION ===
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

# === DATABASE (PostgreSQL Required) ===
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aaiti_prod
DB_USER=aaiti_user
DB_PASSWORD=your_secure_password_here

# === SECURITY ===
JWT_SECRET=your_jwt_secret_here_32_chars_min
API_KEY_SECRET=your_api_key_secret_here
SESSION_SECRET=your_session_secret_here
ENCRYPTION_KEY=your_encryption_key_32_chars

# === EXTERNAL SERVICES ===
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# === RATE LIMITING ===
API_RATE_LIMIT_WINDOW=900000
API_RATE_LIMIT_MAX=1000

# === MONITORING ===
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
STRUCTURED_LOGGING=true
EOF

# Create production docker-compose
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  aaiti:
    build: 
      context: .
      dockerfile: Dockerfile
      target: production
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "5000:5000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: aaiti_prod
      POSTGRES_USER: aaiti_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"  # Bind to localhost only

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_prod_data:/data
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"  # Bind to localhost only

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - aaiti
    restart: unless-stopped

volumes:
  postgres_prod_data:
  redis_prod_data:
EOF

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
curl -f http://localhost:5000/api/health
```

### Option 2: Kubernetes Deployment

For scalable cloud deployments.

```bash
# Create namespace
kubectl create namespace aaiti

# Create secrets
kubectl create secret generic aaiti-secrets \
  --from-literal=db-password=your_secure_password \
  --from-literal=jwt-secret=your_jwt_secret \
  --from-literal=redis-password=your_redis_password \
  -n aaiti

# Apply manifests
kubectl apply -f k8s/ -n aaiti

# Check deployment
kubectl get pods -n aaiti
kubectl get services -n aaiti
```

---

## Database Configuration

### PostgreSQL Setup (Recommended for Production)

#### Local PostgreSQL Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Create database and user
sudo -u postgres psql << 'EOF'
CREATE DATABASE aaiti_prod;
CREATE USER aaiti_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE aaiti_prod TO aaiti_user;
ALTER USER aaiti_user CREATEDB;
\q
EOF
```

#### PostgreSQL with Docker

```bash
# Start PostgreSQL container
docker run --name aaiti-postgres \
  -e POSTGRES_DB=aaiti_prod \
  -e POSTGRES_USER=aaiti_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -v aaiti_postgres_data:/var/lib/postgresql/data \
  -d postgres:15-alpine

# Verify connection
docker exec -it aaiti-postgres psql -U aaiti_user -d aaiti_prod -c "SELECT version();"
```

#### Database Migration

```bash
# Set environment for PostgreSQL
export DB_TYPE=postgresql
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=aaiti_prod
export DB_USER=aaiti_user
export DB_PASSWORD=your_secure_password

# Run migrations
cd backend
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### SQLite Setup (Development/Testing)

SQLite is used by default for development. No additional setup required.

```bash
# Environment variables for SQLite
export DB_TYPE=sqlite
export DB_PATH=./data/aaiti.sqlite

# Initialize database
cd backend
npm run db:setup
```

---

## Environment Variables

### Core Configuration

```bash
# === APPLICATION ===
NODE_ENV=production|development|test
PORT=5000
LOG_LEVEL=error|warn|info|debug

# === DATABASE ===
DB_TYPE=postgresql|sqlite
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aaiti_prod
DB_USER=aaiti_user
DB_PASSWORD=your_secure_password
DB_POOL_MIN=2
DB_POOL_MAX=20

# === SECURITY ===
JWT_SECRET=your_jwt_secret_minimum_32_characters
API_KEY_SECRET=your_api_key_secret
SESSION_SECRET=your_session_secret
ENCRYPTION_KEY=your_encryption_key_32_characters
CORS_ORIGIN=https://your-domain.com

# === EXTERNAL SERVICES ===
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# === API CONFIGURATION ===
API_RATE_LIMIT_WINDOW=900000
API_RATE_LIMIT_MAX=1000
CONCURRENT_REQUESTS=50
REQUEST_TIMEOUT=300000

# === MONITORING ===
METRICS_ENABLED=true
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
HEALTH_CHECK_ENABLED=true
STRUCTURED_LOGGING=true

# === TRADING ===
PAPER_TRADING_ENABLED=true
LIVE_TRADING_ENABLED=false
MAX_POSITION_SIZE=10000
RISK_LIMIT_DAILY=1000
```

### Environment-Specific Files

Create separate files for different environments:

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production

# Testing
.env.test
```

---

## Docker Configurations

### Multi-Stage Dockerfile

The project uses a multi-stage Dockerfile for optimal builds:

- **build-stage**: Installs dependencies and builds frontend
- **production**: Minimal runtime image
- **development**: Development image with debugging tools

### Custom Docker Configurations

#### Development Override

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  aaiti:
    build:
      target: development
    volumes:
      - ./backend:/app/backend
      - ./frontend:/app/frontend
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
    ports:
      - "9229:9229"  # Debug port
```

#### Production Override

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  aaiti:
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
```

### Docker Performance Tuning

```dockerfile
# Memory optimizations
ENV NODE_OPTIONS="--max-old-space-size=2048 --max-semi-space-size=64"
ENV UV_THREADPOOL_SIZE=16

# Build optimizations
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
ENV DISABLE_ESLINT_PLUGIN=true
```

---

## Security Hardening

### SSL/TLS Configuration

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://aaiti:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5432/tcp  # PostgreSQL (internal only)
sudo ufw deny 6379/tcp  # Redis (internal only)
sudo ufw enable

# iptables
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 5432 -j DROP
iptables -A INPUT -p tcp --dport 6379 -j DROP
```

### Environment Security

```bash
# Secure environment files
chmod 600 .env.production
chown root:root .env.production

# Use Docker secrets in production
echo "your_secure_password" | docker secret create db_password -
```

---

## Monitoring & Observability

### Prometheus + Grafana Setup

```yaml
# monitoring/docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/var/lib/grafana/dashboards

volumes:
  prometheus_data:
  grafana_data:
```

### Logging Configuration

```javascript
// Structured logging setup
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

---

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U aaiti_user -d aaiti_prod -c "SELECT 1;"

# View logs
docker-compose logs postgres
```

#### Memory Issues

```bash
# Check memory usage
docker stats

# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=4096"

# Monitor memory
docker exec -it aaiti_container top
```

#### Port Conflicts

```bash
# Check what's using a port
sudo lsof -i :5000

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:5000)

# Use different port
export PORT=5001
```

### Health Checks

```bash
# Application health
curl -f http://localhost:5000/api/health

# Database health
curl -f http://localhost:5000/api/health/db

# Service status
docker-compose ps
```

### Log Analysis

```bash
# View application logs
docker-compose logs -f aaiti

# Search logs for errors
docker-compose logs aaiti | grep ERROR

# View structured logs
tail -f backend/logs/combined.log | jq '.'
```

### Performance Monitoring

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/health

# Monitor container resources
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Database performance
docker exec -it postgres_container psql -U aaiti_user -d aaiti_prod -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"
```

---

## Migration from Basic to Advanced Setup

### Migrating from SQLite to PostgreSQL

```bash
# 1. Backup SQLite database
cp backend/database/aaiti.sqlite backup/aaiti.sqlite.backup

# 2. Export SQLite data
sqlite3 backend/database/aaiti.sqlite .dump > backup/sqlite_dump.sql

# 3. Set up PostgreSQL
# (Follow PostgreSQL setup instructions above)

# 4. Update environment
export DB_TYPE=postgresql
export DB_HOST=localhost
# ... other PostgreSQL settings

# 5. Run migration
cd backend
npm run db:migrate:from-sqlite

# 6. Verify data integrity
npm run db:verify
```

### Upgrading Docker Setup

```bash
# 1. Stop current containers
docker-compose down

# 2. Backup volumes
docker run --rm -v aaiti_aaiti_data:/source -v $(pwd)/backup:/backup alpine tar czf /backup/aaiti_data.tar.gz -C /source .

# 3. Update configuration
# (Follow advanced Docker configuration above)

# 4. Restart with new configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 5. Verify upgrade
curl -f http://localhost:5000/api/health
```

---

## Support and Community

- **Documentation**: [docs/](../docs/)
- **Issues**: [GitHub Issues](https://github.com/gelimorto2/A.A.I.T.I/issues)
- **Security**: Report security issues privately to the maintainers

---

*This guide covers advanced installation scenarios. For basic installation, use the automated installer: `./install`*