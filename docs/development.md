# Development Guide

Complete development guide for contributing to A.A.I.T.I v2.0.0. Learn how to set up your development environment, understand the codebase, and contribute effectively.

## 🛠 Development Environment Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 3+
- **Docker** 20.0+ and **Docker Compose** v2.0+
- **Git** with SSH key configured
- **VS Code** (recommended) with extensions
- **SQLite3** for database access (optional for debugging)

### Initial Setup

```bash
# Clone the repository
git clone git@github.com:gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I

# Install dependencies for all components
npm run install:all

# Set up development environment
npm run setup:dev

# Start development servers
npm run dev
```

### VS Code Extensions (Recommended)

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-docker",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-docker",
    "ms-vscode-remote.remote-containers"
  ]
}
```

## 🏗 Project Architecture

### Directory Structure

```
A.A.I.T.I/
├── backend/                 # Node.js API server
│   ├── config/             # Configuration management
│   ├── database/           # SQLite database and schemas
│   ├── middleware/         # Express middleware
│   ├── routes/             # API route handlers
│   ├── utils/              # Utility functions and services
│   └── server.js           # Main server entry point
├── frontend/               # React TypeScript application
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store and slices
│   │   ├── services/       # API service layer
│   │   ├── contexts/       # React contexts
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Frontend utilities
│   └── package.json
├── docs/                   # Documentation
├── docker/                 # Docker configuration
├── scripts/                # Build and deployment scripts
└── package.json            # Root package configuration
```

### Technology Stack

**Backend:**
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: SQLite3 with WAL mode
- **Authentication**: JWT with bcryptjs
- **WebSockets**: Socket.IO
- **ML**: Custom implementations + ml-regression
- **Logging**: Winston
- **Security**: Helmet.js, CORS, rate limiting

**Frontend:**
- **Framework**: React 19 with TypeScript
- **UI Library**: Material-UI v7
- **State Management**: Redux Toolkit
- **Routing**: React Router 6
- **Charts**: Chart.js
- **HTTP Client**: Axios
- **WebSocket**: Socket.IO Client

**Development Tools:**
- **Build**: Create React App (frontend), Node.js (backend)
- **Linting**: ESLint + Prettier
- **Testing**: Jest (unit), Cypress (e2e)
- **Containerization**: Docker + Docker Compose
- **Monitoring**: Prometheus + Grafana

## 📝 Coding Standards & Guidelines

### Code Quality Requirements

All code contributions must adhere to these standards:

#### 🎯 **General Standards**
- **TypeScript First**: Use TypeScript for all new frontend code
- **ES6+ Syntax**: Use modern JavaScript features (async/await, destructuring, arrow functions)
- **Error Handling**: Comprehensive try-catch blocks and proper error propagation
- **Logging**: Structured logging with appropriate levels (error, warn, info, debug)
- **Documentation**: JSDoc comments for all functions and complex logic
- **Testing**: Unit tests for all business logic, integration tests for APIs

#### 🔧 **Backend Standards**
```javascript
// ✅ Good: Proper error handling and logging
const router = express.Router();

router.get('/models', authenticateToken, async (req, res) => {
  try {
    const startTime = Date.now();
    const models = await mlService.getAllModels(req.user.id);
    
    logger.info('Models retrieved successfully', {
      userId: req.user.id,
      count: models.length,
      duration: Date.now() - startTime
    });
    
    res.json({ success: true, data: models });
  } catch (error) {
    logger.error('Failed to retrieve models', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ❌ Bad: No error handling, no logging
router.get('/models', (req, res) => {
  const models = mlService.getAllModels();
  res.json(models);
});
```

#### ⚛️ **Frontend Standards**
```typescript
// ✅ Good: TypeScript with proper types and error handling
interface ModelProps {
  modelId: string;
  onUpdate?: (model: Model) => void;
}

const ModelComponent: React.FC<ModelProps> = ({ modelId, onUpdate }) => {
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModel = async () => {
      try {
        setLoading(true);
        const response = await apiService.getModel(modelId);
        setModel(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchModel();
  }, [modelId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!model) return <NotFound />;

  return <ModelDetails model={model} onUpdate={onUpdate} />;
};

// ❌ Bad: No types, no error handling
const ModelComponent = ({ modelId }) => {
  const [model, setModel] = useState();
  
  useEffect(() => {
    apiService.getModel(modelId).then(setModel);
  }, []);

  return <div>{model?.name}</div>;
};
```

### 🚦 **Git Workflow**

#### Branch Naming Convention
```bash
# Feature branches
feature/user-authentication
feature/ml-model-optimization

# Bug fixes
bugfix/authentication-memory-leak
bugfix/chart-rendering-issue

# Hotfixes
hotfix/security-vulnerability
hotfix/production-crash

# Documentation
docs/api-reference-update
docs/development-guide-enhancement
```

#### Commit Message Standards
```bash
# Format: <type>(<scope>): <subject>
# Types: feat, fix, docs, style, refactor, test, chore

# ✅ Good commit messages
feat(ml): add LSTM neural network implementation
fix(auth): resolve JWT token expiration handling
docs(api): update model training endpoint documentation
test(frontend): add unit tests for trading dashboard
refactor(backend): optimize database query performance
chore(deps): update dependencies to latest versions

# ❌ Bad commit messages
update stuff
fix bug
new feature
changes
```

#### Pull Request Guidelines
1. **Branch from `main`**: Always create feature branches from main
2. **Descriptive Title**: Clear, concise description of changes
3. **Detailed Description**: Include what, why, and how
4. **Link Issues**: Reference related GitHub issues
5. **Add Screenshots**: For UI changes, include before/after screenshots
6. **Test Coverage**: Ensure tests pass and add new tests for new features
7. **Documentation Updates**: Update relevant documentation

#### Example PR Template
```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance impact assessed

## Screenshots (if applicable)
Include before/after screenshots for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] Tests added/updated
```

### 🧪 **Testing Standards**

#### Unit Testing
```javascript
// ✅ Good: Comprehensive test coverage
describe('MLService', () => {
  describe('trainModel', () => {
    it('should train ARIMA model with valid data', async () => {
      const mockData = generateMockPriceData();
      const config = { algorithmType: 'arima', periods: 30 };
      
      const result = await mlService.trainModel(mockData, config);
      
      expect(result.success).toBe(true);
      expect(result.model).toBeDefined();
      expect(result.model.type).toBe('arima');
      expect(result.metrics.mse).toBeLessThan(0.1);
    });

    it('should handle insufficient data gracefully', async () => {
      const insufficientData = generateMockPriceData(5); // Too few points
      const config = { algorithmType: 'arima', periods: 30 };
      
      await expect(mlService.trainModel(insufficientData, config))
        .rejects.toThrow('Insufficient data for training');
    });
  });
});
```

#### Integration Testing
```javascript
// ✅ Good: API integration test
describe('ML Models API', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    authToken = await getTestAuthToken();
  });

  it('should create and train a new model', async () => {
    const modelData = {
      name: 'Test ARIMA Model',
      algorithmType: 'arima',
      symbol: 'BTC-USD'
    };

    const response = await request(app)
      .post('/api/ml/models')
      .set('Authorization', `Bearer ${authToken}`)
      .send(modelData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
  });
});
```

## 🔧 Development Workflows

### Local Development

```bash
# Start all services in development mode
npm run dev

# Start individual services
npm run dev:backend    # Backend with nodemon
npm run dev:frontend   # Frontend with hot reload

# Check service health
npm run health

# View logs
make logs             # Docker logs
tail -f backend/logs/ # Local logs
```

### Database Development

```bash
# Access SQLite database
sqlite3 backend/database/aaiti.sqlite

# Common database commands
.tables                    # List all tables
.schema users             # Show table schema
SELECT * FROM ml_models;  # Query data

# Reset database (development only)
rm backend/database/aaiti.sqlite
npm run dev  # Will recreate on startup
```

### API Development

#### Creating New Endpoints

1. **Create route file** in `backend/routes/`
2. **Add route handler** with proper authentication
3. **Update API documentation**
4. **Add tests** for the new endpoint

Example route structure:
```javascript
const express = require('express');
const { authenticateToken, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET endpoint with authentication
router.get('/example', authenticateToken, (req, res) => {
  try {
    // Your logic here
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error in example endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

#### Testing APIs

```bash
# Use curl for quick testing
curl -X GET http://localhost:5000/api/health

# With authentication
curl -X GET http://localhost:5000/api/ml/models \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# POST request with data
curl -X POST http://localhost:5000/api/ml/models \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"Test Model","algorithmType":"arima"}'
```

### Frontend Development

#### Component Development

Follow these patterns for React components:

```typescript
// Component structure
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAppSelector, useAppDispatch } from '../store/hooks';

interface ComponentProps {
  title: string;
  data?: any[];
}

export const ExampleComponent: React.FC<ComponentProps> = ({ 
  title, 
  data = [] 
}) => {
  const dispatch = useAppDispatch();
  const state = useAppSelector(state => state.example);

  return (
    <Box>
      <Typography variant="h6">{title}</Typography>
      {/* Component content */}
    </Box>
  );
};
```

#### State Management

Use Redux Toolkit for state management:

```typescript
// Store slice example
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ExampleState {
  items: any[];
  loading: boolean;
  error: string | null;
}

const initialState: ExampleState = {
  items: [],
  loading: false,
  error: null,
};

const exampleSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<any[]>) => {
      state.items = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setItems, setLoading } = exampleSlice.actions;
export default exampleSlice.reducer;
```

### ML Model Development

#### Adding New ML Algorithms

1. **Update algorithm constants** in `mlService.js`
2. **Add training method** following existing patterns
3. **Add prediction method** for the new algorithm
4. **Update route validation** to include new algorithm
5. **Add documentation** and examples

Example algorithm implementation:
```javascript
/**
 * Train your new algorithm
 */
trainYourAlgorithm(features, targets, parameters = {}) {
  const param1 = parameters.param1 || defaultValue;
  
  logger.info(`Training YourAlgorithm with parameters: ${JSON.stringify(parameters)}`);
  
  // Your training logic here
  const model = {
    type: 'your_algorithm',
    parameters: { param1 },
    // Model data
  };
  
  return model;
}

/**
 * Make predictions with your algorithm
 */
predictYourAlgorithm(model, features) {
  return features.map(feature => {
    // Your prediction logic
    return prediction;
  });
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run with coverage
npm run test:coverage
```

### Writing Tests

#### Backend API Tests

```javascript
const request = require('supertest');
const app = require('../server');

describe('ML Models API', () => {
  test('GET /api/ml/models should return models list', async () => {
    const response = await request(app)
      .get('/api/ml/models')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('models');
    expect(Array.isArray(response.body.models)).toBe(true);
  });
});
```

#### Frontend Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { ExampleComponent } from './ExampleComponent';

test('renders component with title', () => {
  render(
    <Provider store={store}>
      <ExampleComponent title="Test Title" />
    </Provider>
  );
  
  expect(screen.getByText('Test Title')).toBeInTheDocument();
});
```

## 🐳 Docker Development

### Development with Docker

```bash
# Build development image
docker compose --profile development build

# Start development environment
docker compose --profile development up -d

# View logs
docker compose logs -f

# Execute commands in containers
docker compose exec backend bash
docker compose exec frontend bash
```

### Creating Docker Images

```dockerfile
# Multi-stage build example
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📊 Monitoring & Debugging

### Logging

Use structured logging throughout the application:

```javascript
const logger = require('../utils/logger');

// Different log levels
logger.error('Error message', { error, context });
logger.warn('Warning message', { data });
logger.info('Info message', { userId, action });
logger.debug('Debug message', { details });
```

### Performance Monitoring

```javascript
// Add performance timing
const startTime = Date.now();

// Your code here

const duration = Date.now() - startTime;
logger.info('Operation completed', { 
  operation: 'example',
  duration,
  userId: req.user?.id 
});
```

### Debugging

#### Backend Debugging

```bash
# Debug mode with verbose logging
DEBUG=* npm run dev

# Node.js inspector
node --inspect server.js

# Memory debugging
node --inspect --max-old-space-size=4096 server.js
```

#### Frontend Debugging

```bash
# React Developer Tools
# Install browser extension

# Redux DevTools
# Install browser extension

# Debug build
REACT_APP_DEBUG=true npm start
```

## 🚀 Deployment

### Staging Deployment

```bash
# Build for staging
npm run build:staging

# Deploy to staging
make deploy:staging

# Run smoke tests
npm run test:smoke
```

### Production Deployment

```bash
# Build production optimized
npm run build:production

# Deploy to production
make deploy:production

# Monitor deployment
make logs
make health
```

## 📝 Code Style & Standards

### Code Formatting

```bash
# Format code with Prettier
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Commit Standards

Use conventional commits:

```bash
# Examples
git commit -m "feat: add SARIMA time series model"
git commit -m "fix: resolve memory leak in ML service"
git commit -m "docs: update API reference for new endpoints"
git commit -m "refactor: optimize database queries"
```

### Pull Request Process

1. **Create feature branch** from `main`
2. **Implement changes** with tests
3. **Update documentation** if needed
4. **Run tests** and ensure they pass
5. **Submit PR** with clear description
6. **Address review** feedback
7. **Merge after approval**

## 🤝 Contributing Guidelines

### Before Contributing

1. **Read this development guide** completely
2. **Check existing issues** for similar work
3. **Discuss major changes** in issues first
4. **Ensure tests pass** locally

### Contribution Types

- **Bug fixes**: Fix existing functionality
- **New features**: Add new capabilities
- **Documentation**: Improve guides and docs
- **Performance**: Optimize existing code
- **Refactoring**: Improve code structure

### Code Review Checklist

- [ ] Code follows project standards
- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact considered
- [ ] Security implications reviewed

## 🔧 Useful Development Commands

```bash
# Environment setup
npm run setup:dev        # Complete dev setup
npm run install:all      # Install all dependencies
npm run clean:all        # Clean all artifacts

# Development
npm run dev              # Start all services
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage

# Building
npm run build            # Build frontend
npm run build:production # Optimized build

# Docker
make dev                 # Docker development
make logs                # View Docker logs
make shell               # Access container shell

# Database
npm run db:reset         # Reset database
npm run db:seed          # Seed with test data
npm run db:backup        # Backup database

# Maintenance
npm run lint             # Lint code
npm run format           # Format code
npm run audit            # Security audit
npm run outdated         # Check outdated packages
```

## 📚 Learning Resources

### Internal Documentation
- [API Reference](api-reference.md) - Complete API docs
- [ML Models Guide](ml-models.md) - ML implementation details
- [Architecture Overview](architecture.md) - System design
- [Troubleshooting](troubleshooting.md) - Common issues

### External Resources
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/best-practices/)

---

**Happy Coding!** 🚀 Join us in building the future of AI-powered trading.