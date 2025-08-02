# Frequently Asked Questions (FAQ)

Common questions and answers about A.A.I.T.I v1.2.1 - Auto AI Trading Interface.

## 📚 General Questions

### What is A.A.I.T.I?

**A.A.I.T.I (Auto AI Trading Interface)** is a Docker-first, production-ready platform for deploying and managing AI-powered cryptocurrency trading bots. It provides:

- 13 different machine learning algorithms
- Real-time market data integration
- Professional trading interface
- Comprehensive backtesting capabilities
- Enterprise-grade security and monitoring

### What makes A.A.I.T.I different from other trading platforms?

A.A.I.T.I stands out with:

- **Docker-First Architecture**: Production-ready containerized deployment
- **Comprehensive ML Suite**: 13 algorithms from classical to deep learning
- **No API Keys Required**: Uses free CoinGecko API for market data
- **Professional Interface**: Mission-critical design with real-time updates
- **Complete Documentation**: Extensive guides and examples
- **Open Source**: Full transparency and customizability

### Is A.A.I.T.I free to use?

Yes, A.A.I.T.I is completely free and open-source. It uses the free CoinGecko API for market data, so you don't need to pay for data feeds.

### What cryptocurrencies are supported?

A.A.I.T.I supports all cryptocurrencies available on CoinGecko, including:
- Bitcoin (BTC), Ethereum (ETH), Binance Coin (BNB)
- Cardano (ADA), Solana (SOL), Polkadot (DOT)
- Dogecoin (DOGE), Chainlink (LINK), Polygon (MATIC)
- 10,000+ other cryptocurrencies

## 🚀 Installation & Setup

### What are the system requirements?

**Minimum Requirements:**
- 2GB RAM
- 2 CPU cores
- 5GB disk space
- Docker 20.0+ and Docker Compose v2.0+

**Recommended Requirements:**
- 4GB RAM
- 4 CPU cores
- 10GB disk space
- Stable internet connection

### How do I install A.A.I.T.I?

The fastest way is using our one-command Docker installer:

```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./install-docker.sh
```

See our [Installation Guide](installation.md) for detailed instructions.

### Can I install A.A.I.T.I without Docker?

Yes, you can install manually with Node.js:

```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
npm run install:all
npm start
```

However, Docker installation is recommended for reliability and security.

### Why does the installation take so long?

Initial installation includes:
- Downloading Docker images
- Installing Node.js dependencies
- Building optimized containers
- Setting up the database

Subsequent starts are much faster (30-60 seconds).

### How do I update A.A.I.T.I to the latest version?

```bash
cd A.A.I.T.I
git pull origin main
make rebuild  # Docker
# OR
npm run update  # Manual installation
```

## 🤖 Machine Learning & Trading

### Which ML algorithm should I use for trading?

**For Beginners:**
- **ARIMA**: Good for trend analysis, easy to understand
- **Prophet**: Robust forecasting, handles missing data well
- **Linear Regression**: Simple and interpretable

**For Advanced Users:**
- **LSTM**: Best for complex patterns and long-term dependencies  
- **Random Forest**: Good overall performance, feature importance
- **Ensemble Methods**: Combine multiple algorithms for better results

**For Specific Use Cases:**
- **Short-term trading**: LSTM, ARIMA
- **Long-term forecasting**: Prophet, SARIMA
- **Pattern recognition**: Random Forest, SVM

### How accurate are the ML predictions?

Accuracy varies by:
- **Algorithm used**: 60-85% directional accuracy typically
- **Market conditions**: Bull/bear markets affect performance
- **Training data quality**: More data generally improves accuracy
- **Timeframe**: Shorter timeframes are harder to predict

Remember: Past performance doesn't guarantee future results.

### How long does model training take?

Training times depend on:
- **Algorithm complexity**: Linear regression (seconds) vs LSTM (minutes)
- **Dataset size**: More data = longer training
- **System resources**: More CPU/RAM = faster training

**Typical Training Times:**
- Linear/Polynomial Regression: 1-10 seconds
- ARIMA/SARIMA: 10-60 seconds
- Prophet: 30-120 seconds
- LSTM/Deep NN: 2-10 minutes
- Random Forest: 30-180 seconds

### How much historical data do I need?

**Minimum Requirements:**
- Classical ML: 50+ data points
- Time series (ARIMA): 100+ data points
- Deep learning (LSTM): 200+ data points

**Recommended:**
- Short-term models: 3-6 months
- Long-term models: 1-3 years
- More data generally improves accuracy

### Can I use multiple algorithms together?

Yes! A.A.I.T.I supports ensemble methods that combine multiple algorithms:

```javascript
{
  "algorithmType": "ensemble",
  "baseModels": ["lstm", "arima", "random_forest"],
  "ensembleMethod": "weighted_average",
  "weights": [0.4, 0.3, 0.3]
}
```

### How do I backtest my strategies?

1. **Train your model** with historical data
2. **Navigate to Backtesting** in the interface
3. **Configure parameters**: date range, capital, risk settings
4. **Run backtest** and analyze results
5. **Compare strategies** using performance metrics

See the [User Guide](user-guide.md) for detailed instructions.

### Why do my backtests show good results but live trading doesn't?

Common issues:
- **Overfitting**: Model memorized past data but can't generalize
- **Look-ahead bias**: Using future information in training
- **Market changes**: Conditions changed since training data
- **Execution delays**: Real trading has latency and slippage

**Solutions:**
- Use out-of-sample testing
- Regular model retraining
- Conservative position sizing
- Account for transaction costs

## 🔧 Technical Questions

### Which ports does A.A.I.T.I use?

**Default Ports:**
- **Frontend**: 3000 (React application)
- **Backend**: 5000 (API server)
- **Grafana**: 3001 (monitoring, optional)
- **Prometheus**: 9090 (metrics, optional)

You can change these in the Docker Compose configuration.

### How do I access A.A.I.T.I remotely?

1. **Configure firewall** to allow ports 3000 and 5000
2. **Update CORS settings** to allow your domain
3. **Use HTTPS** for secure remote access
4. **Consider VPN** for additional security

For production deployment, see our [Security Guide](security.md).

### Can I run multiple instances?

Yes, but consider:
- **Database conflicts**: Use different database files
- **Port conflicts**: Configure different ports
- **Resource usage**: Each instance uses CPU/memory
- **API rate limits**: Share CoinGecko API limits

### How do I backup my data?

**Automatic Backup:**
```bash
make backup  # Docker
npm run backup  # Manual
```

**Manual Backup:**
```bash
# Backup database
cp backend/database/aaiti.sqlite backup/

# Backup configuration
cp -r config/ backup/
```

### Where are the log files?

**Docker Deployment:**
```bash
docker compose logs -f  # View live logs
docker compose logs backend > logs.txt  # Save to file
```

**Manual Deployment:**
- Application logs: `backend/logs/`
- Error logs: `backend/logs/error.log`
- Access logs: `backend/logs/access.log`

### How do I reset the database?

**⚠️ Warning: This will delete all data!**

```bash
# Docker
docker compose down
docker volume rm aaiti_data
docker compose up -d

# Manual
rm backend/database/aaiti.sqlite
npm start  # Will recreate database
```

## 💰 Trading & Finance

### Is A.A.I.T.I suitable for live trading?

A.A.I.T.I is currently designed for:
- **Paper trading**: Test strategies without real money
- **Research and analysis**: Understand market patterns
- **Strategy development**: Build and backtest algorithms

For live trading, you would need to:
- Add exchange API integration
- Implement order management
- Add risk management controls
- Ensure regulatory compliance

### How do I interpret the performance metrics?

**Key Metrics Explained:**

- **Total Return**: Overall profit/loss percentage
- **Sharpe Ratio**: Risk-adjusted returns (>1 is good, >2 is excellent)
- **Maximum Drawdown**: Largest loss from peak (lower is better)
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Ratio of gains to losses (>1.5 is good)
- **R² Score**: Model accuracy (0-1, higher is better)

### What's the difference between prediction and trading?

**Prediction Models:**
- Forecast future prices
- Provide confidence scores
- Used for analysis and research

**Trading Bots:**
- Execute buy/sell decisions
- Manage positions and risk
- Use predictions to make trades

Both work together: predictions inform trading decisions.

### How do I manage risk?

**Built-in Risk Management:**
- **Position sizing**: Limit trade size (e.g., 2% of capital)
- **Stop losses**: Automatic loss limits (e.g., 5% stop loss)
- **Take profits**: Secure gains at target levels
- **Maximum positions**: Limit concurrent trades

**Best Practices:**
- Never risk more than you can afford to lose
- Diversify across multiple strategies
- Regular monitoring and adjustment
- Conservative position sizing

## 🔒 Security & Privacy

### Is my data secure?

A.A.I.T.I implements enterprise-grade security:
- **JWT authentication** with secure tokens
- **Password hashing** using bcrypt
- **Data encryption** for sensitive information
- **Rate limiting** to prevent abuse
- **Audit logging** for security monitoring

### Do you store my trading data?

All data is stored locally on your system:
- **No cloud storage**: Everything runs on your machine
- **No data sharing**: Your strategies remain private
- **Complete control**: You own all your data

### Can others access my A.A.I.T.I instance?

By default, A.A.I.T.I only accepts connections from localhost. For remote access:
- Configure firewall rules carefully
- Use HTTPS with valid certificates
- Implement strong authentication
- Consider VPN for additional security

See our [Security Guide](security.md) for details.

### How do I change my password?

1. **Log into A.A.I.T.I**
2. **Go to Settings > Profile**
3. **Click "Change Password"**
4. **Enter current and new passwords**
5. **Save changes**

Passwords must meet security requirements (8+ characters, mixed case, numbers, symbols).

## 🛠 Troubleshooting

### A.A.I.T.I won't start - what should I check?

1. **Check ports are available:**
   ```bash
   lsof -ti:3000,5000  # Should return nothing
   ```

2. **Verify Docker is running:**
   ```bash
   docker --version
   docker compose --version
   ```

3. **Check system resources:**
   ```bash
   free -m  # Check available memory
   df -h    # Check disk space
   ```

4. **Review logs for errors:**
   ```bash
   docker compose logs -f
   ```

### Models won't train - what's wrong?

Common issues:
- **Insufficient data**: Need 50+ data points minimum
- **Invalid parameters**: Check algorithm-specific requirements
- **Memory limits**: Complex models need more RAM
- **Network issues**: Can't fetch market data

**Solutions:**
- Increase training period (more data)
- Try simpler algorithms first
- Check system memory usage
- Verify internet connection

### WebSocket connections keep dropping

**Possible causes:**
- Firewall blocking WebSocket traffic
- Network instability
- Browser security settings
- Proxy server interference

**Solutions:**
- Check firewall settings
- Try different browser
- Disable browser extensions
- Test on local network

### Performance is slow - how to optimize?

**Quick fixes:**
- Restart A.A.I.T.I services
- Clear browser cache
- Reduce active models/bots
- Check system resources

**Long-term optimization:**
- Increase system RAM
- Use SSD storage
- Enable caching
- Optimize database

See our [Performance Guide](performance.md) for detailed optimization.

### I found a bug - how do I report it?

1. **Check existing issues** on GitHub
2. **Gather information:**
   - Operating system and version
   - A.A.I.T.I version
   - Steps to reproduce
   - Error messages
   - Screenshots if applicable

3. **Create detailed issue** on GitHub with all information
4. **Follow up** on any questions from maintainers

## 📖 Documentation & Support

### Where can I find more help?

**Documentation:**
- [User Guide](user-guide.md) - Complete feature walkthrough
- [Installation Guide](installation.md) - Setup instructions
- [API Reference](api-reference.md) - Technical API documentation
- [Troubleshooting Guide](troubleshooting.md) - Common issues and solutions

**Community:**
- GitHub Issues - Bug reports and feature requests
- GitHub Discussions - Community questions and ideas

### How can I contribute to A.A.I.T.I?

We welcome contributions! See our [Development Guide](development.md) for:
- Setting up development environment
- Code style guidelines
- Pull request process
- Architecture overview

**Ways to contribute:**
- Report bugs and suggest features
- Improve documentation
- Add new ML algorithms
- Optimize performance
- Enhance security

### Can I customize A.A.I.T.I for my needs?

Absolutely! A.A.I.T.I is open source and highly customizable:
- **Add new algorithms**: Extend the ML suite
- **Custom indicators**: Implement your own technical indicators
- **UI modifications**: Customize the interface
- **API extensions**: Add new endpoints
- **Integration**: Connect with external services

See the [Development Guide](development.md) for technical details.

### Is there a mobile app?

A.A.I.T.I's web interface is responsive and works well on mobile devices:
- **Mobile browser**: Access via http://your-server:3000
- **Touch-optimized**: Interface adapts to mobile screens
- **Full functionality**: All features available on mobile

A dedicated mobile app may be considered for future versions.

---

**Still have questions?** Check our comprehensive documentation or create an issue on GitHub for community support.

**Quick Links:**
- [🚀 Quick Start Guide](quick-start.md) - Get up and running in 5 minutes
- [📖 User Guide](user-guide.md) - Complete feature guide
- [🔧 Troubleshooting](troubleshooting.md) - Fix common issues
- [🛡️ Security Guide](security.md) - Secure your installation