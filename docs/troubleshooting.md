# Troubleshooting Guide

Complete troubleshooting guide for A.A.I.T.I v1.2.1. Find solutions to common issues and learn how to diagnose problems.

## 🔍 Quick Diagnostics

Before diving into specific issues, run these quick checks:

### System Health Check
```bash
# Check application health
curl http://localhost:5000/api/health | python3 -m json.tool

# Check Docker services (if using Docker)
make status

# Check system resources
docker stats  # For Docker deployment
top           # For manual deployment
```

### Service Status Check
```bash
# Backend status
curl -I http://localhost:5000

# Frontend status  
curl -I http://localhost:3000

# Database connectivity
# Check logs for database connection messages
```

## ⚡ Common Issues & Solutions

### 🚫 Installation Issues

#### Port Already in Use
**Problem:** `Error: listen EADDRINUSE: address already in use`

**Solutions:**
```bash
# Kill processes on ports 3000 and 5000
sudo lsof -ti:3000 | xargs sudo kill -9
sudo lsof -ti:5000 | xargs sudo kill -9

# Or find and kill specific processes
lsof -ti:3000  # Find process ID
kill -9 <PID>  # Kill the process
```

#### Docker Installation Issues

**Problem:** Docker containers fail to start

**Solutions:**
```bash
# Check Docker status
docker --version
docker compose --version

# Restart Docker service
sudo systemctl restart docker

# Clean Docker cache
docker system prune -a

# Check Docker logs
docker compose logs -f
```

**Problem:** Permission denied errors

**Solutions:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Fix ownership issues
sudo chown -R $USER:$USER /path/to/aaiti
```

#### Node.js/npm Issues

**Problem:** npm install fails or modules not found

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use clean installation
npm run install:clean

# Check Node.js version (requires 16+)
node --version
```

### 🖥 Frontend Issues

#### Frontend Not Starting

**Problem:** React development server fails to start

**Solutions:**
1. **Check Node.js version:**
   ```bash
   node --version  # Should be 16 or higher
   ```

2. **Clear React cache:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Fix port conflicts:**
   ```bash
   # Check what's using port 3000
   lsof -ti:3000
   # Kill the process or use different port
   PORT=3001 npm start
   ```

4. **Memory issues:**
   ```bash
   # Increase Node.js heap memory
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm start
   ```

#### Build Failures

**Problem:** Production build fails

**Solutions:**
```bash
# Clear build cache
cd frontend
rm -rf build
npm run build

# Fix TypeScript errors
npm run build 2>&1 | grep error

# Memory optimization
export NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

#### White Screen / Loading Issues

**Problem:** Frontend loads but shows blank screen

**Solutions:**
1. **Check browser console** for JavaScript errors
2. **Clear browser cache** and reload
3. **Check backend connectivity:**
   ```bash
   curl http://localhost:5000/api/health
   ```
4. **Verify build files:**
   ```bash
   ls -la frontend/build/
   ```

### 🔧 Backend Issues

#### Backend Connection Issues

**Problem:** Backend fails to start or crashes

**Solutions:**
1. **Check port availability:**
   ```bash
   lsof -ti:5000
   ```

2. **Verify dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Check database file:**
   ```bash
   ls -la backend/database/
   chmod 664 backend/database/aaiti.sqlite
   ```

4. **Review backend logs:**
   ```bash
   cd backend
   npm run dev  # Run in development mode to see logs
   ```

#### Database Issues

**Problem:** SQLite database errors

**Solutions:**
1. **Check database file permissions:**
   ```bash
   ls -la backend/database/aaiti.sqlite
   chmod 664 backend/database/aaiti.sqlite
   ```

2. **Reset database (development only):**
   ```bash
   # Backup first!
   cp backend/database/aaiti.sqlite backend/database/aaiti.sqlite.backup
   rm backend/database/aaiti.sqlite
   # Restart application to recreate
   ```

3. **Database corruption:**
   ```bash
   # Check database integrity
   sqlite3 backend/database/aaiti.sqlite "PRAGMA integrity_check;"
   ```

#### API Errors

**Problem:** API endpoints returning errors

**Solutions:**
1. **Check authentication:**
   ```bash
   # Test login endpoint
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

2. **Verify JWT tokens:**
   - Check token expiry
   - Ensure proper Authorization header format
   - Regenerate token if needed

3. **Rate limiting issues:**
   - Wait for rate limit reset
   - Check API usage patterns
   - Implement request throttling

### 🤖 ML Model Issues

#### Model Training Fails

**Problem:** ML model training doesn't complete

**Solutions:**
1. **Check training data:**
   ```bash
   # Ensure minimum data points (50+)
   # Verify data format and quality
   ```

2. **Memory issues:**
   - Reduce training period
   - Use simpler algorithms
   - Increase system memory

3. **Parameter validation:**
   - Check algorithm-specific parameters
   - Use default parameters first
   - Validate parameter ranges

4. **Algorithm-specific fixes:**
   
   **ARIMA Issues:**
   ```json
   {
     "p": 1,  // Keep low initially
     "d": 1,  // Usually 1 or 2
     "q": 1   // Keep low initially
   }
   ```
   
   **Prophet Issues:**
   ```json
   {
     "seasonality_mode": "additive",  // Start with additive
     "yearly_seasonality": "auto",    // Let Prophet decide
     "weekly_seasonality": "auto"
   }
   ```

#### Predictions Not Working

**Problem:** Model predictions fail or return errors

**Solutions:**
1. **Check model status:**
   ```bash
   # Verify model is trained
   curl http://localhost:5000/api/ml/models/:id
   ```

2. **Validate input features:**
   - Ensure feature count matches training
   - Check data types and ranges
   - Verify symbol availability

3. **Model re-training:**
   ```bash
   # Retrain model with fresh data
   curl -X PUT http://localhost:5000/api/ml/models/:id \
     -H "Authorization: Bearer <token>" \
     -d '{"retrain": true}'
   ```

#### Model Performance Issues

**Problem:** Poor model accuracy or predictions

**Solutions:**
1. **Data quality improvement:**
   - Increase training period
   - Clean outliers and anomalies
   - Add more relevant features

2. **Parameter tuning:**
   - Try different algorithm parameters
   - Use cross-validation
   - Compare multiple models

3. **Algorithm selection:**
   - Try different algorithm types
   - Use ensemble methods
   - Consider market conditions

### 🔄 Trading Bot Issues

#### Bot Not Starting

**Problem:** Trading bot fails to start

**Solutions:**
1. **Check bot configuration:**
   - Verify all required parameters
   - Check balance sufficiency
   - Validate symbol availability

2. **Market data connectivity:**
   ```bash
   # Test market data endpoint
   curl http://localhost:5000/api/trading/market-data/BTC
   ```

3. **Review bot logs:**
   - Check application logs for errors
   - Look for authentication issues
   - Verify API connectivity

#### Bot Crashes or Stops

**Problem:** Bot stops unexpectedly

**Solutions:**
1. **Exception handling:**
   - Check error logs for stack traces
   - Look for unhandled exceptions
   - Review trading logic errors

2. **Resource monitoring:**
   - Check memory usage
   - Monitor CPU usage
   - Verify network connectivity

3. **Risk management:**
   - Check stop-loss triggers
   - Verify position limits
   - Review risk parameters

### 📊 Market Data Issues

#### Market Data Not Updating

**Problem:** Cryptocurrency prices not refreshing

**Solutions:**
1. **Check CoinGecko API:**
   ```bash
   # Test direct API call
   curl "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
   ```

2. **Network connectivity:**
   - Check internet connection
   - Verify firewall settings
   - Test DNS resolution

3. **Cache issues:**
   - Clear application cache
   - Restart application
   - Check cache configuration

#### API Rate Limiting

**Problem:** Market data API rate limits exceeded

**Solutions:**
1. **Reduce request frequency:**
   - Increase cache duration
   - Implement smart polling
   - Use WebSocket connections

2. **API key configuration:**
   - Use API keys if available
   - Distribute requests across keys
   - Monitor usage limits

### 🌐 WebSocket Issues

#### WebSocket Disconnections

**Problem:** Real-time updates stop working

**Solutions:**
1. **Network stability:**
   - Check internet connection
   - Test with different networks
   - Monitor connection quality

2. **Firewall configuration:**
   ```bash
   # Check if WebSocket ports are open
   telnet localhost 5000
   ```

3. **Client reconnection:**
   - Implement auto-reconnect logic
   - Handle connection state properly
   - Add exponential backoff

### 💾 Performance Issues

#### Slow Application Response

**Problem:** Application becomes slow or unresponsive

**Solutions:**
1. **Resource monitoring:**
   ```bash
   # Check system resources
   top
   df -h
   free -m
   ```

2. **Database optimization:**
   ```bash
   # Vacuum SQLite database
   sqlite3 backend/database/aaiti.sqlite "VACUUM;"
   ```

3. **Cache optimization:**
   - Enable Redis caching
   - Optimize cache policies
   - Monitor cache hit rates

#### Memory Issues

**Problem:** High memory usage or out-of-memory errors

**Solutions:**
1. **Memory monitoring:**
   ```bash
   # Monitor memory usage
   ps aux | grep node
   docker stats  # For Docker
   ```

2. **Optimize Node.js:**
   ```bash
   # Increase heap size
   export NODE_OPTIONS="--max-old-space-size=4096"
   
   # Enable garbage collection logging
   export NODE_OPTIONS="--max-old-space-size=4096 --trace-gc"
   ```

3. **Application optimization:**
   - Reduce concurrent operations
   - Implement data pagination
   - Clear unused variables

### 🔐 Security Issues

#### Authentication Problems

**Problem:** Login fails or tokens invalid

**Solutions:**
1. **Token validation:**
   - Check token expiry
   - Verify token format
   - Regenerate tokens

2. **Password issues:**
   - Verify password complexity
   - Check for special characters
   - Try password reset

3. **Session management:**
   - Clear browser cookies
   - Check localStorage
   - Restart browser

#### API Security Errors

**Problem:** 403 Forbidden or unauthorized access

**Solutions:**
1. **Role verification:**
   - Check user role assignments
   - Verify required permissions
   - Contact administrator

2. **CORS issues:**
   - Check allowed origins
   - Verify request headers
   - Update CORS configuration

## 🛠 Advanced Troubleshooting

### Debug Mode

Enable debug logging for detailed information:

```bash
# Backend debug mode
cd backend
DEBUG=* npm run dev

# Frontend debug mode
cd frontend
REACT_APP_DEBUG=true npm start
```

### Log Analysis

**Important log locations:**
- Application logs: `/var/log/aaiti/`
- Docker logs: `docker compose logs -f`
- System logs: `/var/log/messages`

**Log analysis commands:**
```bash
# Search for errors
grep -i error /path/to/logfile

# Monitor logs in real-time
tail -f /path/to/logfile

# Analyze specific timeframe
grep "2025-01-08" /path/to/logfile
```

### Network Diagnostics

```bash
# Test connectivity
ping api.coingecko.com

# Check DNS resolution
nslookup api.coingecko.com

# Test specific ports
telnet localhost 5000
nc -zv localhost 3000
```

### Database Diagnostics

```bash
# Connect to SQLite database
sqlite3 backend/database/aaiti.sqlite

# Check table structures
.schema

# Query specific data
SELECT * FROM users LIMIT 5;
SELECT * FROM ml_models WHERE user_id = 'your-user-id';

# Check database size
.dbinfo
```

## 📞 Getting Additional Help

### Self-Help Resources

1. **Documentation:**
   - [Installation Guide](installation.md)
   - [User Guide](user-guide.md)
   - [API Reference](api-reference.md)
   - [ML Models Guide](ml-models.md)

2. **Health Endpoints:**
   - System Health: `http://localhost:5000/api/health`
   - Metrics: `http://localhost:5000/api/metrics`
   - Version Info: Check `version.json`

3. **Log Files:**
   - Check application logs for detailed errors
   - Enable debug mode for verbose logging
   - Monitor WebSocket connections

### Community Support

1. **GitHub Issues:**
   - Search existing issues
   - Create detailed bug reports
   - Include system information

2. **Documentation Updates:**
   - Suggest documentation improvements
   - Report missing information
   - Share solutions with community

### Creating Bug Reports

When reporting issues, include:

1. **System Information:**
   - Operating system and version
   - Node.js version
   - Docker version (if applicable)
   - Browser version (for frontend issues)

2. **Error Details:**
   - Complete error messages
   - Stack traces
   - Log excerpts
   - Steps to reproduce

3. **Configuration:**
   - Deployment method (Docker/manual)
   - Environment variables
   - Modified settings

4. **Screenshots:**
   - Error screens
   - Console outputs
   - Network tab information

### Example Bug Report Template

```markdown
## Bug Description
Brief description of the issue

## Environment
- OS: Ubuntu 20.04
- Node.js: v18.19.0
- Docker: v24.0.7
- Browser: Chrome 120.0.0

## Steps to Reproduce
1. Step one
2. Step two
3. Expected vs actual result

## Error Messages
```
[Paste error messages here]
```

## Screenshots
[Attach relevant screenshots]

## Additional Context
Any other relevant information
```

---

**Quick Links:**
- [Installation Guide](installation.md) - Setup and deployment
- [User Guide](user-guide.md) - Feature usage and tutorials
- [Performance Guide](performance.md) - Optimization tips
- [Security Guide](security.md) - Security best practices