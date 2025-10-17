# A.A.I.T.I Quick Reference Card

## Installation Commands

```bash
# First time installation
./install

# Start services
./install start

# Stop services  
./install stop

# Restart services
./install restart

# Check status
./install status

# View logs
./install logs

# Reconfigure
./install config

# Get help
./install help
```

## Configuration

### Run Configuration Wizard
```bash
bash scripts/config-generator.sh
```

### Edit Configuration Manually
```bash
nano .env
./install restart  # Apply changes
```

### Configuration File Location
```
.env  (in project root)
```

## Common Configuration Options

### Change Port
```bash
PORT=8080
```

### Change Log Level
```bash
LOG_LEVEL=debug  # error, warn, info, debug
```

### Enable PostgreSQL
```bash
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aaiti
DB_USER=your_user
DB_PASSWORD=your_password
```

### Add Exchange API Keys
```bash
# Binance
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
BINANCE_TESTNET=true

# Alpaca
ALPACA_API_KEY=your_key
ALPACA_API_SECRET=your_secret
ALPACA_PAPER=true

# Polygon
POLYGON_API_KEY=your_key
```

## Access URLs

### Dashboard
```
http://localhost:5000
```

### API Health Check
```
http://localhost:5000/api/health
```

## Docker Commands

### View Container Status
```bash
docker compose ps
```

### View Container Logs
```bash
docker compose logs -f aaiti
```

### Rebuild Container
```bash
docker compose build --no-cache aaiti
docker compose up -d aaiti
```

### Shell into Container
```bash
docker compose exec aaiti bash
```

### Remove Everything
```bash
docker compose down -v  # WARNING: Deletes data!
```

## Troubleshooting

### Check if Docker is Running
```bash
docker info
```

### View Recent Errors
```bash
docker compose logs --tail 50 aaiti
```

### Reset Everything
```bash
./install stop
docker compose down -v
./install
```

### Configuration Not Loading
```bash
# Check .env exists
ls -la .env

# Verify permissions
chmod 600 .env

# Restart services
./install restart
```

### Port Already in Use
```bash
# Change port in .env
PORT=5001

# Restart
./install restart
```

## File Locations

### Configuration
```
.env                    # Your configuration
.env.example           # Configuration template
docker-compose.yml     # Docker configuration
```

### Data
```
database/              # Database files
logs/                  # Log files
cache/                 # Cache files
```

### Scripts
```
install                        # Main installer
scripts/config-generator.sh   # Config wizard
```

### Documentation
```
INSTALL.md             # Installation guide
README.md              # Project overview
CHANGELOG.md           # Release notes
```

## Security Best Practices

1. **Never commit .env to git** (already in .gitignore)
2. **Use testnet/paper trading for development**
3. **Keep API keys secure**
4. **Use strong passwords**
5. **Rotate secrets regularly**
6. **Set proper file permissions**: `chmod 600 .env`
7. **Don't share production credentials**

## Performance Tuning

### High-Performance Settings
```bash
UV_THREADPOOL_SIZE=32
NODE_OPTIONS=--max-old-space-size=4096
CACHE_TTL=600
API_RATE_LIMIT_MAX=2000
```

### Low-Resource Settings
```bash
UV_THREADPOOL_SIZE=4
NODE_OPTIONS=--max-old-space-size=1024
CACHE_TTL=60
API_RATE_LIMIT_MAX=100
```

## Development Mode

### Local Development (no Docker)
```bash
# Run config wizard, select "Development"
bash scripts/config-generator.sh

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Run backend
cd backend && npm run dev

# Run frontend (new terminal)
cd frontend && npm start
```

### Docker Development
```bash
# Run config wizard, select "Docker Development"
bash scripts/config-generator.sh

# Start with dev mode
./install start
```

## Feature Flags

Enable/disable features in `.env`:
```bash
ENABLE_ML_MODELS=true
ENABLE_ADVANCED_STRATEGIES=true
ENABLE_BACKTESTING=true
ENABLE_PAPER_TRADING=true
ENABLE_WEBSOCKET=true
ENABLE_PROMETHEUS=false
ENABLE_GRAFANA=false
```

## Getting Help

### Interactive Help
```bash
./install help
```

### View Documentation
```bash
cat INSTALL.md | less
```

### Check Configuration Guide
```bash
cat scripts/CONFIG_GENERATOR_README.md | less
```

### GitHub Issues
```
https://github.com/gelimorto2/A.A.I.T.I/issues
```

## Quick Start Example

```bash
# 1. Clone repository
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I

# 2. Run installer (includes config wizard)
./install

# 3. Follow prompts to configure
# - Select: Production
# - Port: 5000
# - Database: SQLite
# - Add API keys (optional)

# 4. Access dashboard
# Open: http://localhost:5000

# 5. Check status anytime
./install status

# 6. View logs if needed
./install logs
```

## Emergency Commands

### Service Won't Start
```bash
./install stop
docker compose down
./install start
```

### Complete Reset (DANGER: Data Loss!)
```bash
./install stop
docker compose down -v
rm .env
./install
```

### Restore from Backup
```bash
./install stop
cp .env.backup.TIMESTAMP .env
cp -r database.backup database/
./install start
```

---

**Version**: A.A.I.T.I v2.1.0  
**Last Updated**: October 2025  
**Quick Help**: `./install help`
