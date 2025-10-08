#!/bin/bash

# Performance Load Testing Setup Script
# Installs k6 and sets up performance testing environment for A.A.I.T.I

set -e

echo "🚀 Setting up A.A.I.T.I Performance Load Testing Environment"
echo "=========================================================="

# Check if k6 is already installed
if command -v k6 &> /dev/null; then
    echo "✅ k6 is already installed: $(k6 version)"
else
    echo "📦 Installing k6..."
    
    # Detect OS and architecture
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    
    K6_VERSION="v0.47.0"
    K6_FILENAME="k6-${K6_VERSION}-${OS}-${ARCH}"
    K6_URL="https://github.com/grafana/k6/releases/download/${K6_VERSION}/${K6_FILENAME}.tar.gz"
    
    echo "📥 Downloading k6 ${K6_VERSION} for ${OS}-${ARCH}..."
    curl -L "$K6_URL" -o "/tmp/${K6_FILENAME}.tar.gz"
    
    echo "📂 Extracting k6..."
    tar -xzf "/tmp/${K6_FILENAME}.tar.gz" -C /tmp
    
    echo "🔧 Installing k6 to /usr/local/bin..."
    sudo mv "/tmp/${K6_FILENAME}/k6" /usr/local/bin/k6
    sudo chmod +x /usr/local/bin/k6
    
    # Cleanup
    rm -rf "/tmp/${K6_FILENAME}" "/tmp/${K6_FILENAME}.tar.gz"
    
    echo "✅ k6 installed successfully: $(k6 version)"
fi

# Create performance testing directories
echo "📁 Creating performance testing directories..."
mkdir -p tests/performance/results
mkdir -p tests/performance/configs
mkdir -p tests/performance/scripts

# Set proper permissions
chmod +x tests/performance/load-test.js

# Create environment configuration
echo "⚙️  Creating environment configuration..."
cat > tests/performance/.env.example << EOF
# A.A.I.T.I Performance Testing Configuration
BASE_URL=http://localhost:5000
TARGET_RPS=200
API_KEY=your-api-key-here
AUTH_TOKEN=your-auth-token-here

# k6 Configuration
K6_PATH=k6
K6_OUT=json=results/test-results.json

# Test Configuration
SMOKE_DURATION=30s
LOAD_DURATION=10m
STRESS_DURATION=15m
VOLUME_DURATION=20m

# Thresholds
MAX_RESPONSE_TIME=2000
MAX_ERROR_RATE=0.05
MIN_REQUEST_RATE=150
EOF

echo "📋 Creating performance testing documentation..."
cat > tests/performance/README.md << 'EOF'
# A.A.I.T.I Performance Load Testing

This directory contains performance testing scripts and configurations for the A.A.I.T.I trading platform.

## Setup

1. Install k6:
   ```bash
   ./setup-performance-testing.sh
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Running Tests

### Individual Tests
```bash
# Smoke test (basic functionality)
npm run test:smoke

# Load test (target 200 RPS)
npm run test:load

# Stress test (beyond normal capacity)
npm run test:stress

# Spike test (sudden traffic spikes)
npm run test:spike

# Volume test (sustained load)
npm run test:volume
```

### Full Test Suite
```bash
npm run test:all
```

### API-based Testing
```bash
# Via A.A.I.T.I API
curl -X POST http://localhost:5000/api/load-testing/smoke \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

curl -X POST http://localhost:5000/api/load-testing/suite \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"suite": ["smoke", "load", "stress"]}'
```

## Test Types

### Smoke Test
- **Purpose**: Basic functionality verification
- **Load**: 1 VU for 30 seconds
- **Target**: Basic system responsiveness

### Load Test
- **Purpose**: Target performance validation
- **Load**: Ramp to 100 VUs (≈200 RPS)
- **Target**: <2s response time, <5% error rate

### Stress Test
- **Purpose**: Beyond normal capacity
- **Load**: Up to 300 VUs (≈600 RPS)
- **Target**: System stability under stress

### Spike Test
- **Purpose**: Sudden traffic spikes
- **Load**: Rapid scaling to 200-300 VUs
- **Target**: Recovery after spike

### Volume Test
- **Purpose**: Sustained high load
- **Load**: 150 VUs for 15 minutes
- **Target**: Sustained performance

## Results Analysis

Test results are stored in `results/` directory:
- Raw k6 output: `{test-type}-{timestamp}.json`
- Parsed results: `{test-type}-{timestamp}-parsed.json`
- Suite reports: `suite-report-{timestamp}.json`
- HTML reports: `suite-report-{timestamp}.html`

## Performance Targets

- **Response Time**: <2000ms (P95)
- **Error Rate**: <5%
- **Target RPS**: 200 RPS
- **Availability**: >99%

## Monitoring

Performance tests include monitoring for:
- Response time distribution
- Error rates and types
- Request rate and throughput
- System resource utilization
- Recovery time after load

## Integration

Tests can be integrated with:
- CI/CD pipelines
- Performance monitoring dashboards
- Alerting systems
- Capacity planning tools
EOF

echo "🔧 Setting up k6 configuration..."
cat > tests/performance/k6.config.js << 'EOF'
// k6 Configuration for A.A.I.T.I Performance Testing
export const config = {
  // Global options
  options: {
    cloud: {
      // Grafana Cloud k6 configuration (if using cloud)
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 },
      },
    },
    
    // Thresholds
    thresholds: {
      http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
      http_req_failed: ['rate<0.05'],    // Error rate under 5%
      http_reqs: ['rate>150'],           // At least 150 RPS
    },
    
    // User agent
    userAgent: 'A.A.I.T.I-Performance-Test/1.0',
    
    // Network settings
    dns: {
      ttl: '5m',
      select: 'first',
    },
    
    // HTTP settings
    http: {
      responseCallback: null,
    },
    
    // Console output
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
    summaryTimeUnit: 'ms',
  },
  
  // Test scenarios configuration
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },
    
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
    
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
  },
};
EOF

echo "✅ Performance testing environment setup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Copy .env.example to .env and configure your settings"
echo "2. Start your A.A.I.T.I server"
echo "3. Run your first test: npm run test:smoke"
echo ""
echo "🔗 API Endpoints:"
echo "- Smoke Test: POST /api/load-testing/smoke"
echo "- Load Test: POST /api/load-testing/load"
echo "- Full Suite: POST /api/load-testing/suite"
echo ""
echo "📊 View results at: tests/performance/results/"
echo "🌐 HTML reports will be generated for suite runs"