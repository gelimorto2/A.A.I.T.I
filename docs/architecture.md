# Architecture Overview

A.A.I.T.I v1.2.1 system architecture documentation. Understand the complete system design, components, and data flow of the Auto AI Trading Interface.

## 🏗 System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     A.A.I.T.I v1.2.1 Architecture              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐ │
│  │   Frontend  │    │   Backend    │    │   External APIs     │ │
│  │   React TS  │◄──►│  Node.js API │◄──►│   CoinGecko        │ │
│  │   Port 3000 │    │   Port 5000  │    │   Webhook Endpoints │ │
│  └─────────────┘    └──────────────┘    └─────────────────────┘ │
│         │                    │                                  │
│         │            ┌───────▼────────┐                        │
│         │            │  SQLite3 DB    │                        │
│         │            │  with WAL mode │                        │
│         │            └────────────────┘                        │
│         │                                                      │
│  ┌──────▼──────────────────────────────────────────────────────┐ │
│  │              WebSocket Communication Layer               │ │
│  │         Real-time Updates & Live Data Streaming         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Overview

#### Frontend Layer (React TypeScript)
- **React 19** with TypeScript for type safety
- **Material-UI v7** for professional interface
- **Redux Toolkit** for state management
- **Socket.IO Client** for real-time updates
- **Chart.js** for data visualization

#### Backend Layer (Node.js)
- **Express.js** REST API server
- **Socket.IO** WebSocket server
- **SQLite3** database with WAL mode
- **JWT** authentication system
- **Winston** structured logging

#### Data Layer
- **SQLite3** with Write-Ahead Logging
- **In-memory caching** for performance
- **File-based configuration** management
- **Real-time data streams** via WebSocket

## 🔧 Technical Stack

### Backend Technologies

```yaml
Runtime Environment:
  - Node.js: 18+
  - Operating System: Linux/macOS/Windows
  - Container: Docker Alpine Linux

Core Framework:
  - Express.js: 4.x (REST API)
  - Socket.IO: 4.x (WebSocket communication)

Database:
  - SQLite3: 3.x with WAL mode
  - Database Size: Auto-scaling with VACUUM
  - Backup: Automated with retention

Authentication & Security:
  - JWT: JSON Web Tokens
  - bcryptjs: Password hashing
  - Helmet.js: Security headers
  - CORS: Cross-origin resource sharing
  - Rate Limiting: Express-rate-limit

Machine Learning:
  - Custom ML implementations
  - ml-regression: Statistical models
  - Mathematical libraries: NumJS equivalents
  - Time series analysis: Custom ARIMA/SARIMA
  - Deep learning: Custom LSTM implementation

Market Data:
  - CoinGecko API: Cryptocurrency data
  - WebSocket streams: Real-time price feeds
  - Caching layer: In-memory with TTL
  - Rate limiting: API-compliant requests

Logging & Monitoring:
  - Winston: Structured logging
  - Custom metrics: Performance tracking
  - Health checks: System monitoring
  - Error tracking: Comprehensive error handling
```

### Frontend Technologies

```yaml
Core Framework:
  - React: 19.x with Hooks
  - TypeScript: 5.x for type safety
  - Create React App: Build toolchain

UI & Styling:
  - Material-UI: v7 component library
  - Emotion: CSS-in-JS styling
  - Material Icons: Icon library
  - Responsive design: Mobile-first approach

State Management:
  - Redux Toolkit: Global state
  - React Query: Server state caching
  - Local Storage: Persistent settings
  - Session Storage: Temporary data

Communication:
  - Axios: HTTP client with interceptors
  - Socket.IO Client: Real-time communication
  - WebSocket: Live data streaming

Data Visualization:
  - Chart.js: Financial charts
  - React Chart.js: React integration
  - Custom components: Trading interfaces
  - Real-time updates: Live chart streaming

Development Tools:
  - ESLint: Code linting
  - Prettier: Code formatting
  - TypeScript: Static type checking
  - React DevTools: Development debugging
```

## 🗄 Database Architecture

### Database Schema

```sql
-- Users and Authentication
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'trader',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- ML Models
CREATE TABLE ml_models (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    algorithm_type TEXT NOT NULL,
    target_timeframe TEXT NOT NULL,
    symbols TEXT NOT NULL, -- JSON array
    parameters TEXT NOT NULL, -- JSON object
    training_status TEXT DEFAULT 'untrained',
    performance_metrics TEXT, -- JSON object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_trained DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Model Predictions
CREATE TABLE predictions (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    prediction_value REAL NOT NULL,
    confidence REAL,
    features TEXT, -- JSON array
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES ml_models(id)
);

-- Trading Bots
CREATE TABLE trading_bots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    strategy TEXT NOT NULL,
    status TEXT DEFAULT 'stopped',
    configuration TEXT NOT NULL, -- JSON object
    performance_metrics TEXT, -- JSON object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Backtesting Results
CREATE TABLE backtests (
    id TEXT PRIMARY KEY,
    model_id TEXT,
    bot_id TEXT,
    user_id TEXT NOT NULL,
    symbols TEXT NOT NULL, -- JSON array
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    initial_capital REAL NOT NULL,
    final_capital REAL NOT NULL,
    total_return REAL,
    performance_metrics TEXT, -- JSON object
    trades_data TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (model_id) REFERENCES ml_models(id),
    FOREIGN KEY (bot_id) REFERENCES trading_bots(id)
);

-- System Settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT, -- JSON object
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Database Optimization

#### Indexing Strategy
```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_ml_models_user_id ON ml_models(user_id);
CREATE INDEX idx_ml_models_algorithm_type ON ml_models(algorithm_type);
CREATE INDEX idx_predictions_model_id ON predictions(model_id);
CREATE INDEX idx_predictions_symbol ON predictions(symbol);
CREATE INDEX idx_predictions_timestamp ON predictions(timestamp);
CREATE INDEX idx_trading_bots_user_id ON trading_bots(user_id);
CREATE INDEX idx_trading_bots_status ON trading_bots(status);
CREATE INDEX idx_backtests_user_id ON backtests(user_id);
CREATE INDEX idx_backtests_model_id ON backtests(model_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

#### Database Configuration
```javascript
// SQLite optimization settings
const dbConfig = {
  mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  pragmas: {
    journal_mode: 'WAL',        // Write-Ahead Logging
    synchronous: 'NORMAL',      // Balance safety/performance
    cache_size: -64000,         // 64MB cache
    temp_store: 'MEMORY',       // Temporary tables in memory
    mmap_size: 268435456,       // 256MB memory-mapped I/O
    foreign_keys: 'ON',         // Enforce foreign key constraints
    page_size: 4096,            // Optimal page size
    auto_vacuum: 'INCREMENTAL'  // Automatic space reclamation
  }
};
```

## 🔄 Data Flow Architecture

### Request Flow Diagram

```
Frontend Request Flow:
┌─────────────┐    HTTP/WebSocket    ┌─────────────┐
│   React     │────────────────────►│   Express   │
│ Component   │                     │   Router    │
└─────────────┘                     └─────────────┘
       │                                    │
       │                            ┌──────▼──────┐
       │                            │ Middleware  │
       │                            │ - Auth      │
       │                            │ - Logging   │
       │                            │ - CORS      │
       │                            └──────┬──────┘
       │                                   │
       │                            ┌──────▼──────┐
       │                            │ Route       │
       │                            │ Handler     │
       │                            └──────┬──────┘
       │                                   │
       │                            ┌──────▼──────┐
       │                            │ Business    │
       │                            │ Logic       │
       │                            └──────┬──────┘
       │                                   │
       │                            ┌──────▼──────┐
       │                            │ Database    │
       │                            │ Operations  │
       │                            └──────┬──────┘
       │                                   │
┌──────▼──────┐    JSON Response    ┌──────▼──────┐
│ Redux Store │◄────────────────────│ HTTP        │
│ Update      │                     │ Response    │
└─────────────┘                     └─────────────┘
```

### WebSocket Communication Flow

```
Real-time Data Flow:
┌─────────────┐                    ┌─────────────┐
│  External   │                    │   Socket.IO │
│  API Data   │                    │   Server    │
│ (CoinGecko) │                    │             │
└─────────────┘                    └─────────────┘
       │                                  │
       ▼                                  │
┌─────────────┐    Process & Emit         │
│ Data        │──────────────────────────►│
│ Processing  │                           │
│ Service     │                           │
└─────────────┘                           │
                                         │
┌─────────────┐    WebSocket Event       │
│   React     │◄─────────────────────────┘
│ Components  │
│ (Auto       │
│  Update)    │
└─────────────┘
```

## 🧠 ML Architecture

### Machine Learning Pipeline

```
ML Model Training Pipeline:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Historical  │    │   Feature   │    │    Data     │
│ Market Data │───▶│ Engineering │───▶│ Preparation │
└─────────────┘    └─────────────┘    └─────────────┘
                                             │
┌─────────────┐    ┌─────────────┐          ▼
│   Model     │    │ Parameter   │    ┌─────────────┐
│ Evaluation  │◄───│ Optimization│◄───│   Model     │
└─────────────┘    └─────────────┘    │  Training   │
       │                              └─────────────┘
       ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Performance │    │   Model     │    │  Model      │
│ Metrics     │───▶│ Validation  │───▶│ Deployment  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Algorithm Architecture

#### Time Series Models (ARIMA, SARIMA, Prophet)
```javascript
class TimeSeriesModel {
  constructor(algorithm, parameters) {
    this.algorithm = algorithm;
    this.parameters = parameters;
    this.model = null;
  }

  preprocess(data) {
    // Data cleaning, normalization, feature engineering
    return processedData;
  }

  train(data) {
    // Algorithm-specific training logic
    this.model = this.algorithm.fit(data, this.parameters);
    return this.model;
  }

  predict(features) {
    // Generate predictions with confidence intervals
    return this.model.predict(features);
  }

  evaluate(testData) {
    // Calculate performance metrics
    return metrics;
  }
}
```

#### Deep Learning Models (LSTM, Neural Networks)
```javascript
class DeepLearningModel {
  constructor(architecture, parameters) {
    this.architecture = architecture;
    this.parameters = parameters;
    this.model = this.buildModel();
  }

  buildModel() {
    // Construct neural network architecture
    return model;
  }

  trainModel(trainingData, validationData) {
    // Training with backpropagation
    return this.model.fit(trainingData, validationData);
  }

  predict(inputData) {
    // Forward pass prediction
    return this.model.predict(inputData);
  }
}
```

## 🔐 Security Architecture

### Authentication & Authorization Flow

```
Security Flow:
┌─────────────┐    Credentials     ┌─────────────┐
│   Login     │───────────────────▶│   Auth      │
│  Component  │                    │ Middleware  │
└─────────────┘                    └─────────────┘
       │                                  │
       │                           ┌──────▼──────┐
       │                           │ Password    │
       │                           │ Validation  │
       │                           │ (bcrypt)    │
       │                           └──────┬──────┘
       │                                  │
       │                           ┌──────▼──────┐
       │                           │ JWT Token   │
       │                           │ Generation  │
       │                           └──────┬──────┘
       │                                  │
┌──────▼──────┐    JWT Token       ┌──────▼──────┐
│ Client      │◄───────────────────│ Secure      │
│ Storage     │                    │ Response    │
│ (localStorage)                   └─────────────┘
└─────────────┘
```

### Security Layers

#### Application Security
- **JWT Authentication**: Stateless token-based auth
- **Password Hashing**: bcryptjs with salt rounds
- **Rate Limiting**: Per-endpoint request throttling
- **CORS Protection**: Cross-origin request filtering
- **Input Validation**: Request sanitization and validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy headers

#### Infrastructure Security
- **Container Security**: Non-root user execution
- **Network Security**: Internal container networking
- **File System Security**: Read-only file system where possible
- **Environment Variables**: Secure secret management
- **HTTPS/TLS**: Encrypted communication (production)

## 📊 Performance Architecture

### Caching Strategy

```
Multi-Layer Caching:
┌─────────────┐
│  Browser    │ ── Cache-Control headers
│  Cache      │    (Static assets, API responses)
└─────────────┘
┌─────────────┐
│ Application │ ── In-memory caching
│ Cache       │    (Market data, user sessions)
└─────────────┘
┌─────────────┐
│ Database    │ ── Query result caching
│ Cache       │    (Frequently accessed data)
└─────────────┘
```

### Performance Optimizations

#### Backend Optimizations
- **Connection Pooling**: Database connection management
- **Query Optimization**: Indexed queries and efficient joins
- **Memory Management**: Garbage collection optimization
- **Asynchronous Processing**: Non-blocking I/O operations
- **Compression**: Response compression (gzip)
- **CDN Integration**: Static asset delivery optimization

#### Frontend Optimizations
- **Code Splitting**: Lazy loading of components
- **Bundle Optimization**: Tree shaking and minification
- **State Management**: Efficient Redux patterns
- **Memoization**: React.memo and useMemo optimization
- **Virtual Scrolling**: Large dataset rendering
- **Image Optimization**: Responsive images and formats

## 🔄 Deployment Architecture

### Docker Architecture

```
Docker Container Architecture:
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Frontend   │  │  Backend    │  │   Monitoring        │  │
│  │  Container  │  │  Container  │  │   Stack             │  │
│  │             │  │             │  │   (Optional)        │  │
│  │  Nginx      │  │  Node.js    │  │  ┌─────────────┐    │  │
│  │  React      │  │  Express    │  │  │ Prometheus  │    │  │
│  │             │  │  SQLite     │  │  └─────────────┘    │  │
│  │             │  │             │  │  ┌─────────────┐    │  │
│  │             │  │             │  │  │  Grafana    │    │  │
│  └─────────────┘  └─────────────┘  │  └─────────────┘    │  │
│                                    └─────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Network                          │  │
│  │        (Internal container communication)           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Persistent Volumes                      │  │
│  │   - Database storage                                 │  │
│  │   - Configuration files                              │  │
│  │   - Log files                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Scalability Architecture

#### Horizontal Scaling
- **Load Balancer**: Nginx or cloud load balancer
- **Multiple Backend Instances**: Stateless API servers
- **Database Clustering**: Read replicas for scaling
- **Container Orchestration**: Docker Swarm or Kubernetes

#### Vertical Scaling
- **Resource Allocation**: Dynamic CPU and memory allocation
- **Performance Monitoring**: Resource usage tracking
- **Auto-scaling**: Container resource adjustment
- **Optimization**: Code and query performance tuning

## 📈 Monitoring Architecture

### Observability Stack

```
Monitoring & Observability:
┌─────────────┐    Metrics     ┌─────────────┐
│ Application │───────────────▶│ Prometheus  │
│ Metrics     │                │ (Scraping)  │
└─────────────┘                └─────────────┘
                                      │
┌─────────────┐    Logs        ┌──────▼──────┐
│ Application │───────────────▶│  Grafana    │
│ Logs        │                │ (Dashboard) │
└─────────────┘                └─────────────┘
                                      │
┌─────────────┐    Traces            │
│ Request     │──────────────────────┘
│ Traces      │    
└─────────────┘    
```

### Health Monitoring

#### System Health Checks
- **Application Health**: `/api/health` endpoint
- **Database Health**: Connection and query testing
- **External API Health**: Market data connectivity
- **Resource Monitoring**: CPU, memory, disk usage
- **Performance Metrics**: Response times, throughput

#### Alerting System
- **Threshold Alerts**: Performance degradation
- **Error Rate Alerts**: High error frequency
- **Resource Alerts**: Resource exhaustion warnings
- **Business Logic Alerts**: Trading anomalies
- **Security Alerts**: Suspicious activity detection

---

**Related Documentation:**
- [Docker Guide](docker.md) - Container deployment details
- [Performance Guide](performance.md) - Optimization strategies
- [Security Guide](security.md) - Security implementation
- [Development Guide](development.md) - Development architecture