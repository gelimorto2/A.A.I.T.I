# A.A.I.T.I Tests Directory

This directory contains integration and enhancement tests for the A.A.I.T.I trading platform.

## Test Files

### `test_advanced_features.js`
Tests advanced features implementation including AI insights service and related functionality.

**Usage:**
```bash
# Run from project root
node tests/test_advanced_features.js
```

### `test_system_enhancements.js`
Comprehensive test suite for system enhancements including performance optimizations, monitoring, and API functionality.

**Usage:**
```bash
# Run from project root (requires backend dependencies)
cd backend && npm install
cd ..
node tests/test_system_enhancements.js
```

### `test_trading_enhancements.js`
Tests trading engine enhancements including exchange abstraction, order management, and risk management systems.

**Usage:**
```bash
# Run from project root
node tests/test_trading_enhancements.js
```

## Running Tests

Most tests require backend dependencies to be installed. Make sure to run:

```bash
npm run setup:dev
```

Before running individual test files.

## Integration with Backend Tests

These integration tests complement the unit tests located in:
- `backend/tests/` - Backend unit tests
- `frontend/src/` - Frontend unit tests (*.test.tsx files)