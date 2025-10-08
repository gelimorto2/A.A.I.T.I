# Production TensorFlow ML System Documentation

## Overview

The A.A.I.T.I Production ML System is a comprehensive machine learning infrastructure built with real TensorFlow.js models for cryptocurrency trading. This system replaces all previous mock/demo ML implementations with production-grade deep learning capabilities.

## Architecture

### Core Components

1. **ProductionTensorFlowMLService** (`/backend/utils/productionTensorFlowMLService.js`)
   - Real TensorFlow.js model implementations
   - Support for LSTM, GRU, CNN, Transformer, and Ensemble architectures
   - Advanced features: attention mechanisms, dropout, regularization

2. **ProductionMLManager** (`/backend/services/productionMLManager.js`)
   - Complete model lifecycle management
   - Training job orchestration
   - Model deployment and versioning

3. **MLModelRepository** (`/backend/repositories/mlModelRepository.js`)
   - Model persistence and metadata management
   - Performance tracking and lineage
   - Artifact storage and retrieval

4. **Production ML API** (`/backend/routes/productionML.js`)
   - RESTful endpoints for model management
   - Training, prediction, and deployment endpoints
   - File upload support for training data

5. **Production ML Dashboard** (`/frontend/src/components/ProductionMLDashboard.tsx`)
   - Professional React UI with Material-UI
   - Model creation, training, and prediction interfaces
   - Performance visualization and monitoring

## Supported ML Architectures

### 1. LSTM (Long Short-Term Memory)
- **Use Case**: Short to medium-term price forecasting
- **Features**: Bidirectional processing, attention mechanisms, dropout
- **Parameters**: sequence length, LSTM units, dropout rate, attention toggle

### 2. GRU (Gated Recurrent Unit)
- **Use Case**: Medium-term trend analysis
- **Features**: Simplified RNN with faster training
- **Parameters**: sequence length, GRU units, layers, dropout rate

### 3. CNN (Convolutional Neural Network)
- **Use Case**: Chart pattern recognition and signal detection
- **Features**: Multi-layer convolution with max pooling
- **Parameters**: filter sizes, kernel size, dropout rate

### 4. Transformer
- **Use Case**: Complex multi-asset and multi-timeframe predictions
- **Features**: Self-attention mechanism, multi-head attention
- **Parameters**: model dimension, attention heads, layers, dropout

### 5. Ensemble
- **Use Case**: Production-ready robust predictions with uncertainty quantification
- **Features**: Combines multiple architectures with weighted voting
- **Parameters**: constituent models, weights, aggregation method

## Database Schema

### Enhanced ML Models Table
```sql
CREATE TABLE ml_models (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'regression',
  architecture TEXT NOT NULL,
  symbols TEXT, -- JSON array
  timeframe TEXT,
  description TEXT,
  config TEXT, -- JSON configuration
  status TEXT DEFAULT 'created',
  training_status TEXT DEFAULT 'not_started',
  version INTEGER DEFAULT 1,
  trained_at DATETIME,
  training_metrics TEXT, -- JSON metrics
  artifact_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Model Performance Tracking
```sql
CREATE TABLE model_performance (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  accuracy REAL,
  loss REAL,
  precision_score REAL,
  recall REAL,
  f1_score REAL,
  predictions_count INTEGER DEFAULT 0,
  evaluation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES ml_models (id)
);
```

### Model Activity Log
```sql
CREATE TABLE model_activity_log (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT, -- JSON details
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES ml_models (id)
);
```

### Feature Engineering
```sql
CREATE TABLE feature_engineering (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  feature_type TEXT,
  transformation TEXT,
  importance_score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES ml_models (id)
);
```

### Drift Detection
```sql
CREATE TABLE model_drift_detection (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  drift_score REAL,
  drift_type TEXT,
  detection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  action_taken TEXT,
  FOREIGN KEY (model_id) REFERENCES ml_models (id)
);
```

## API Endpoints

### Model Management

#### GET /api/production-ml/architectures
Get available ML architectures and their configurations.

#### POST /api/production-ml/models
Create a new ML model.

**Request Body:**
```json
{
  "name": "My LSTM Model",
  "architecture": "LSTM",
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "timeframe": "1h",
  "description": "LSTM model for Bitcoin price prediction",
  "customConfig": {
    "sequenceLength": 60,
    "lstmUnits": 100,
    "dropoutRate": 0.3
  }
}
```

#### GET /api/production-ml/models
Get user's ML models with filtering and pagination.

#### GET /api/production-ml/models/:id
Get specific model details with performance history.

### Training and Prediction

#### POST /api/production-ml/models/:id/train
Start model training with training data.

**Request Body:**
```json
{
  "epochs": 100,
  "batchSize": 32,
  "validationSplit": 0.2,
  "earlyStopping": true,
  "patience": 15
}
```

#### GET /api/production-ml/models/:id/training-status
Get current training status and progress.

#### POST /api/production-ml/models/:id/predict
Make predictions with trained model.

**Request Body:**
```json
{
  "inputData": [[50000, 100, 75, 0.5, 15], ...],
  "includeConfidence": true
}
```

### Deployment and Management

#### POST /api/production-ml/models/:id/deploy
Deploy model to production.

#### PATCH /api/production-ml/models/:id/status
Update model status.

#### DELETE /api/production-ml/models/:id
Delete ML model.

#### GET /api/production-ml/models/:id/performance
Get model performance metrics and history.

#### GET /api/production-ml/active-models
Get currently active models and system statistics.

## Frontend Dashboard

### Features

1. **Model Overview**
   - Summary cards showing total, active, trained, and deployed models
   - Architecture distribution charts
   - Performance metrics visualization

2. **Model Management**
   - Create new models with architecture selection
   - Filter and search existing models
   - View model details and configuration

3. **Training Interface**
   - Configure training parameters
   - Monitor training progress
   - View training metrics and validation

4. **Prediction Interface**
   - Input data for predictions
   - View prediction results with confidence scores
   - Export prediction data

5. **Deployment Tools**
   - Deploy trained models to production
   - Monitor active model performance
   - Manage model lifecycle

### Navigation

The Production ML Dashboard is accessible via:
- **URL**: `/production-ml`
- **Sidebar**: "Production ML" (TensorFlow Models)
- **Icon**: Psychology/Brain icon

## Usage Examples

### Creating an LSTM Model

```javascript
const response = await fetch('/api/production-ml/models', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Bitcoin LSTM Predictor',
    architecture: 'LSTM',
    symbols: ['BTCUSDT'],
    timeframe: '1h',
    description: 'Hourly Bitcoin price prediction model',
    customConfig: {
      sequenceLength: 60,
      lstmUnits: 128,
      dropoutRate: 0.2,
      useAttention: true,
      bidirectional: true
    }
  })
});
```

### Training a Model

```javascript
const response = await fetch(`/api/production-ml/models/${modelId}/train`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    epochs: 100,
    batchSize: 32,
    validationSplit: 0.2,
    earlyStopping: true,
    patience: 15
  })
});
```

### Making Predictions

```javascript
const response = await fetch(`/api/production-ml/models/${modelId}/predict`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    inputData: [
      [50000, 100, 75, 0.5, 15], // [price, volume, rsi, macd, bollinger]
      [51000, 120, 80, 0.7, 16],
      // ... 60 time steps
    ],
    includeConfidence: true
  })
});
```

## Testing

A comprehensive test script is available at `/test-production-ml.js`:

```bash
node test-production-ml.js
```

This script validates:
- ML Manager initialization
- Model Repository setup
- TensorFlow service functionality
- Architecture availability
- Model creation process
- Training data generation
- System integration

## Performance Considerations

1. **Memory Management**
   - TensorFlow models are cached in memory for active use
   - Automatic cleanup of inactive models
   - Configurable memory limits per model

2. **Training Optimization**
   - Background training jobs with progress tracking
   - Early stopping to prevent overfitting
   - Batch processing for large datasets

3. **Prediction Speed**
   - Pre-loaded models for active trading
   - Batch prediction support
   - Caching for frequent predictions

## Security Features

1. **Authentication**
   - All endpoints require valid JWT tokens
   - User-specific model isolation

2. **Authorization**
   - Users can only access their own models
   - Admin roles for system-wide management

3. **Audit Logging**
   - All model operations are logged
   - Detailed activity tracking

4. **Data Validation**
   - Input sanitization and validation
   - Schema validation for configurations
   - File upload security

## Monitoring and Alerts

1. **Model Performance**
   - Real-time accuracy tracking
   - Drift detection and alerts
   - Performance degradation warnings

2. **System Health**
   - Active model monitoring
   - Memory usage tracking
   - Training job status

3. **Error Handling**
   - Comprehensive error logging
   - Graceful failure recovery
   - User-friendly error messages

## Migration from Legacy System

The Production ML system maintains backward compatibility with legacy ML endpoints:

- Legacy `/api/ml/train` redirects to production system
- Legacy `/api/ml/predict` uses production models
- Legacy `/api/ml/performance` provides compatible metrics

## Future Enhancements

1. **Advanced Features**
   - Hyperparameter optimization with Bayesian methods
   - Automated feature engineering
   - Multi-GPU training support

2. **Integration**
   - Real-time market data feeds
   - Exchange API integration for live trading
   - Portfolio optimization features

3. **Scalability**
   - Distributed training across multiple nodes
   - Model serving with load balancing
   - Container orchestration support

## Support and Troubleshooting

### Common Issues

1. **Training Failures**
   - Check input data format and shape
   - Verify sufficient training data
   - Review model configuration parameters

2. **Prediction Errors**
   - Ensure model is trained and deployed
   - Validate input data dimensions
   - Check model compatibility

3. **Performance Issues**
   - Monitor memory usage
   - Consider model complexity reduction
   - Optimize training parameters

### Getting Help

- Check the API documentation for endpoint details
- Review the test script for usage examples
- Monitor the activity logs for debugging information
- Use the dashboard for visual troubleshooting

---

*This documentation covers the complete Production TensorFlow ML System implemented in A.A.I.T.I v3.0.0. For additional support or feature requests, please refer to the project roadmap and issue tracker.*