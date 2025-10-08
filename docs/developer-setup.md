# A.A.I.T.I Developer Setup Guide
**Advanced Automated Intelligent Trading Interface - Developer Setup & Configuration**

Version: 2.0.0 | Last Updated: December 2024

## 🚀 Quick Start

### Prerequisites
- **Node.js**: 18.x or higher
- **Docker**: 20.x or higher
- **Docker Compose**: 2.x or higher
- **Git**: Latest version
- **Memory**: Minimum 4GB RAM, Recommended 8GB+
- **Storage**: Minimum 10GB free space

### 1. Clone & Setup
```bash
# Clone the repository
git clone https://github.com/your-org/A.A.I.T.I.git
cd A.A.I.T.I

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# Initialize environment
cp .env.example .env
```

### 2. Configuration
```bash
# Edit environment variables
nano .env

# Required variables:
DATABASE_URL=sqlite:///./database/aaiti.sqlite
JWT_SECRET=your-jwt-secret-here
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Optional ML/Trading variables:
EXCHANGE_API_KEY=your-exchange-api-key
OPENAI_API_KEY=your-openai-key
TELEGRAM_BOT_TOKEN=your-telegram-token
```

### 3. Start Development Environment
```bash
# Option 1: Docker (Recommended)
docker-compose up -d

# Option 2: Manual
npm run dev:backend &  # Terminal 1
npm run dev:frontend   # Terminal 2

# Verify installation
curl http://localhost:5000/api/health
```

## 🏗️ Architecture Overview

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   React/TS      │◄──►│   Node.js       │◄──►│   SQLite/PG     │
│   Port 3000     │    │   Port 5000     │    │   Embedded      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ML Pipeline   │    │   Trading Eng   │    │   Monitoring    │
│   TensorFlow.js │    │   Risk Mgmt     │    │   Prometheus    │
│   Python Models │    │   Order Mgmt    │    │   Grafana       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Service Architecture
- **API Gateway**: Express.js with authentication, rate limiting, CORS
- **Trading Engine**: Real-time order management, risk controls, paper/live trading
- **ML Pipeline**: TensorFlow.js models, feature engineering, performance tracking
- **Risk Management**: Position limits, drawdown protection, exposure controls
- **Observability**: Prometheus metrics, alerting, health checks
- **Data Layer**: SQLite (dev), PostgreSQL (prod), Redis caching

## 🔧 Development Workflow

### Code Structure
```
A.A.I.T.I/
├── backend/                 # Node.js API server
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   ├── middleware/         # Auth, logging, validation
│   ├── database/           # Schema, migrations
│   ├── utils/             # Helpers, utilities
│   └── tests/             # Unit & integration tests
├── frontend/               # React TypeScript app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API clients
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Frontend utilities
│   └── public/            # Static assets
├── docs/                  # Documentation
├── tests/                 # E2E tests
├── docker/               # Docker configs
└── microservices/        # Microservice modules
```

### Development Commands
```bash
# Development
npm run dev                 # Start full stack
npm run dev:backend        # Backend only
npm run dev:frontend       # Frontend only

# Testing
npm test                   # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests

# Database
npm run migrate           # Run migrations
npm run migrate:rollback  # Rollback migration
npm run db:seed          # Seed test data

# Build
npm run build            # Build production
npm run build:backend    # Backend build
npm run build:frontend   # Frontend build

# Quality
npm run lint             # ESLint check
npm run lint:fix         # Fix lint issues
npm run type-check       # TypeScript check
npm run security-audit   # Security scan
```

## 🧪 Testing

### Test Categories
1. **Unit Tests**: Service/component logic (`/tests/unit/`)
2. **Integration Tests**: API endpoints (`/tests/integration/`)
3. **ML Tests**: Model validation (`/tests/ml/`)
4. **Performance Tests**: Load testing (`/tests/performance/`)
5. **Security Tests**: Vulnerability scans (`/tests/security/`)

### Test Environment Setup
```bash
# Setup test database
NODE_ENV=test npm run migrate

# Run specific test suites
npm run test:trading      # Trading engine tests
npm run test:ml          # ML pipeline tests  
npm run test:security    # Security tests
npm run test:performance # Load tests

# Coverage reports
npm run coverage         # Generate coverage
npm run coverage:report  # View report
```

### Mock Data & Services
```bash
# Generate mock data
npm run mock:generate    # Create test data
npm run mock:trading     # Trading scenarios
npm run mock:market      # Market data
npm run mock:users       # User accounts
```

## 🔒 Security Setup

### Authentication & Authorization
- **JWT Tokens**: 7-day expiry, refresh mechanism
- **API Keys**: Rate-limited, scope-based permissions
- **2FA**: TOTP implementation for admin accounts
- **Session Management**: Redis-based session store

### Security Headers
```javascript
// Automatically applied via helmet.js
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
```

### Environment Security
```bash
# Encrypt sensitive configs
npm run encrypt-config

# Validate security
npm run security-check

# Update dependencies
npm audit && npm audit fix
```

## 📊 Monitoring & Observability

### Metrics & Alerting
- **Prometheus**: System metrics, custom business metrics
- **Grafana**: Dashboard visualization, alerting
- **Winston**: Structured logging with multiple transports
- **Health Checks**: Comprehensive system health endpoints

### Key Metrics Tracked
- **Performance**: Response time, throughput, error rates
- **Business**: Trading volume, P&L, risk metrics
- **System**: Memory, CPU, disk usage, queue depths
- **ML**: Model accuracy, prediction latency, drift detection

### Alert Rules
```yaml
# Error rate > 2%
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.02

# P95 latency > 500ms  
- alert: HighLatency
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5

# Trading system down
- alert: TradingSystemDown
  expr: up{job="trading-service"} == 0
```

## 🤖 ML Pipeline Development

### Model Development Workflow
1. **Data Collection**: Market data, features, labels
2. **Feature Engineering**: Technical indicators, sentiment, macro
3. **Model Training**: TensorFlow.js, validation, hyperparameter tuning
4. **Evaluation**: Backtesting, performance metrics, risk analysis
5. **Deployment**: A/B testing, gradual rollout, monitoring

### ML Model Structure
```javascript
// Example model definition
const model = tf.sequential({
  layers: [
    tf.layers.dense({inputShape: [50], units: 64, activation: 'relu'}),
    tf.layers.dropout({rate: 0.3}),
    tf.layers.dense({units: 32, activation: 'relu'}),
    tf.layers.dense({units: 1, activation: 'sigmoid'})
  ]
});
```

### Model Validation
```bash
# Validate ML models
npm run ml:validate      # Model validation
npm run ml:backtest     # Backtesting
npm run ml:benchmark    # Performance benchmark
npm run ml:drift-detect # Model drift detection
```

## 🔄 Trading Engine Development

### Trading System Components
- **Order Management**: Limit, market, stop orders
- **Risk Engine**: Position limits, exposure controls
- **Portfolio Manager**: Asset allocation, rebalancing
- **Market Data**: Real-time feeds, historical data
- **Strategy Engine**: Signal generation, execution

### Paper Trading vs Live
```javascript
// Configuration-based trading mode
const tradingMode = process.env.TRADING_MODE || 'paper';

// Paper trading: No real money, simulated execution
// Live trading: Real orders, actual capital at risk
```

### Risk Controls
- **Position Limits**: Maximum position size per asset
- **Drawdown Protection**: Stop trading on losses > threshold
- **Exposure Limits**: Maximum portfolio exposure
- **Volatility Filters**: Pause trading during high volatility

## 🚀 Deployment

### Production Deployment
```bash
# Build production images
docker build -t aaiti:latest .

# Deploy with docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Kubernetes deployment
kubectl apply -f k8s/

# Health check
curl http://production-url/api/health
```

### Environment Variables (Production)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/aaiti
REDIS_URL=redis://cache:6379
JWT_SECRET=secure-production-secret
ENCRYPTION_KEY=32-byte-encryption-key
TRADING_MODE=live  # or 'paper' for safe mode
```

### Monitoring Production
```bash
# View logs
docker-compose logs -f backend

# Check metrics
curl http://localhost:5000/api/observability/metrics

# Health dashboard
open http://localhost:3001  # Grafana
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check database status
npm run db:status

# Reset database
npm run db:reset

# Migration issues
npm run migrate:fresh
```

#### 2. ML Model Loading Errors
```bash
# Verify model files
ls -la backend/ml/models/

# Retrain models
npm run ml:train

# Check TensorFlow.js version
npm list @tensorflow/tfjs-node
```

#### 3. Trading API Errors
```bash
# Test exchange connectivity
npm run exchange:test

# Validate API keys
npm run keys:validate

# Check trading permissions
npm run trading:permissions
```

#### 4. Performance Issues
```bash
# Check system resources
npm run performance:check

# Profile application
npm run profile

# Load test
npm run load-test
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=aaiti:* npm run dev

# Specific component debugging
DEBUG=aaiti:trading npm run dev
DEBUG=aaiti:ml npm run dev
```

## 📚 Additional Resources

### Documentation Links
- [API Reference](./api-reference.md) - Complete API documentation
- [Architecture Guide](./architecture.md) - Detailed system architecture
- [Security Guide](./security.md) - Security implementation details
- [ML Guide](./ml-models.md) - Machine learning documentation
- [Trading Guide](./trading-engine.md) - Trading system details

### Support & Community
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Documentation**: Built-in help system (`/api/docs`)
- **API Explorer**: Interactive API testing (`/api/explorer`)

### Development Tools
- **VS Code Extensions**: ESLint, Prettier, TypeScript
- **Debugging**: Chrome DevTools, Node.js Inspector
- **Testing**: Jest, Supertest, Cypress
- **Monitoring**: Grafana dashboards, log aggregation

---

**⚠️ Important Notice**: This is a sophisticated trading system. Always test thoroughly in paper trading mode before deploying with real capital. Trading involves significant financial risk.

**🔐 Security Note**: Never commit API keys, secrets, or credentials to version control. Use environment variables and secure secret management.