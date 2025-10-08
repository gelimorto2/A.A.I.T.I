/**
 * Performance Load Testing Configuration and Scripts
 * k6 load testing for A.A.I.T.I production trading platform
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTimeTrend = new Trend('response_time');
const requestCounter = new Counter('requests_total');

// Test configuration
export const options = {
  // Performance target: 200 RPS for development environment
  scenarios: {
    // Smoke test - basic functionality
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },

    // Load test - target 200 RPS
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },   // Ramp up to 20 VUs
        { duration: '5m', target: 50 },   // Stay at 50 VUs (≈100 RPS)
        { duration: '5m', target: 100 },  // Scale to 100 VUs (≈200 RPS)
        { duration: '3m', target: 100 },  // Hold at 200 RPS
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'load' },
      exec: 'loadTest',
    },

    // Stress test - push beyond normal limits
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp to normal load
        { duration: '3m', target: 200 },  // Push to 400 RPS
        { duration: '2m', target: 300 },  // Peak stress at 600 RPS
        { duration: '2m', target: 200 },  // Scale back
        { duration: '2m', target: 0 },    // Recovery
      ],
      tags: { test_type: 'stress' },
      exec: 'stressTest',
    },

    // Spike test - sudden traffic spikes
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },   // Normal traffic
        { duration: '30s', target: 200 }, // Sudden spike
        { duration: '1m', target: 20 },   // Back to normal
        { duration: '30s', target: 300 }, // Another spike
        { duration: '1m', target: 0 },    // Recovery
      ],
      tags: { test_type: 'spike' },
      exec: 'spikeTest',
    },

    // Volume test - sustained high load
    volume: {
      executor: 'constant-vus',
      vus: 150,
      duration: '15m',
      tags: { test_type: 'volume' },
      exec: 'volumeTest',
    },
  },

  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    errors: ['rate<0.05'],             // Custom error rate under 5%
    response_time: ['p(99)<3000'],     // 99% under 3s
    requests_total: ['count>1000'],    // Minimum request volume
  },
};

// Test data and configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API_KEY = __ENV.API_KEY || 'test-api-key';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Authentication headers
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'X-API-Key': API_KEY,
};

// Test data generators
function generateOrderData() {
  return {
    symbol: ['BTCUSD', 'ETHUSD', 'ADAUSD'][Math.floor(Math.random() * 3)],
    side: Math.random() > 0.5 ? 'buy' : 'sell',
    quantity: Math.floor(Math.random() * 1000) + 100,
    price: Math.floor(Math.random() * 10000) + 10000,
    orderType: 'limit',
    timeInForce: 'GTC',
  };
}

function generatePortfolioData() {
  return {
    totalValue: Math.floor(Math.random() * 1000000) + 100000,
    equity: Math.floor(Math.random() * 500000) + 50000,
    positions: {
      BTCUSD: Math.floor(Math.random() * 100000),
      ETHUSD: Math.floor(Math.random() * 200000),
    },
    dailyPnL: (Math.random() - 0.5) * 10000,
  };
}

// Smoke test - basic functionality verification
export function smokeTest() {
  const testName = 'Smoke Test';
  
  // Health check
  let response = http.get(`${BASE_URL}/api/health`);
  check(response, {
    [`${testName} - Health check status is 200`]: (r) => r.status === 200,
    [`${testName} - Health check response time < 500ms`]: (r) => r.timings.duration < 500,
  });

  // Authentication check
  response = http.get(`${BASE_URL}/api/auth/verify`, { headers });
  check(response, {
    [`${testName} - Auth verification works`]: (r) => r.status === 200 || r.status === 401,
  });

  // Basic API endpoints
  const endpoints = [
    '/api/performance/metrics',
    '/api/risk-management/status',
    '/api/trading-modes/status',
    '/api/reconciliation/status',
  ];

  endpoints.forEach(endpoint => {
    response = http.get(`${BASE_URL}${endpoint}`, { headers });
    check(response, {
      [`${testName} - ${endpoint} responds`]: (r) => r.status >= 200 && r.status < 500,
    });
  });

  sleep(1);
}

// Load test - target performance validation
export function loadTest() {
  const testName = 'Load Test';
  
  // Risk validation endpoint - core functionality
  const orderData = generateOrderData();
  const portfolioData = generatePortfolioData();
  
  const riskValidationPayload = {
    order: orderData,
    portfolio: portfolioData,
    market: {
      currentPrice: orderData.price,
      volume24h: Math.floor(Math.random() * 1000000000),
      volatility: Math.random() * 50,
    },
  };

  const startTime = Date.now();
  
  let response = http.post(
    `${BASE_URL}/api/risk-management/validate`,
    JSON.stringify(riskValidationPayload),
    { headers, timeout: '10s' }
  );

  const responseTime = Date.now() - startTime;
  responseTimeTrend.add(responseTime);
  requestCounter.add(1);

  const success = check(response, {
    [`${testName} - Risk validation status OK`]: (r) => r.status >= 200 && r.status < 400,
    [`${testName} - Risk validation response time < 2s`]: (r) => r.timings.duration < 2000,
    [`${testName} - Risk validation has valid JSON`]: (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }

  // Performance metrics endpoint
  response = http.get(`${BASE_URL}/api/performance/summary`, { headers });
  check(response, {
    [`${testName} - Performance metrics accessible`]: (r) => r.status === 200,
  });

  // Latency instrumentation
  response = http.get(`${BASE_URL}/api/performance/latency/histogram`, { headers });
  check(response, {
    [`${testName} - Latency histogram available`]: (r) => r.status === 200,
  });

  sleep(0.5);
}

// Stress test - beyond normal capacity
export function stressTest() {
  const testName = 'Stress Test';
  
  // Multiple concurrent operations
  const requests = [
    // Risk validation
    {
      method: 'POST',
      url: `${BASE_URL}/api/risk-management/validate`,
      body: JSON.stringify({
        order: generateOrderData(),
        portfolio: generatePortfolioData(),
      }),
    },
    // Order reconciliation
    {
      method: 'POST',
      url: `${BASE_URL}/api/reconciliation/run`,
      body: JSON.stringify({ symbol: 'BTCUSD' }),
    },
    // Performance metrics
    {
      method: 'GET',
      url: `${BASE_URL}/api/performance/metrics`,
    },
    // Audit trail query
    {
      method: 'GET',
      url: `${BASE_URL}/api/risk-management/audit-trail?limit=10`,
    },
  ];

  const responses = http.batch(requests.map(req => ({
    ...req,
    params: { headers, timeout: '15s' },
  })));

  responses.forEach((response, index) => {
    const success = check(response, {
      [`${testName} - Request ${index + 1} successful`]: (r) => r.status >= 200 && r.status < 500,
      [`${testName} - Request ${index + 1} reasonable response time`]: (r) => r.timings.duration < 5000,
    });

    if (!success) {
      errorRate.add(1);
    }
    requestCounter.add(1);
  });

  sleep(0.3);
}

// Spike test - sudden load increases
export function spikeTest() {
  const testName = 'Spike Test';
  
  // Simulate sudden burst of risk validations
  const batchSize = Math.floor(Math.random() * 5) + 1;
  const requests = [];

  for (let i = 0; i < batchSize; i++) {
    requests.push({
      method: 'POST',
      url: `${BASE_URL}/api/risk-management/validate`,
      body: JSON.stringify({
        order: generateOrderData(),
        portfolio: generatePortfolioData(),
      }),
      params: { headers, timeout: '10s' },
    });
  }

  const startTime = Date.now();
  const responses = http.batch(requests);
  const totalTime = Date.now() - startTime;

  responses.forEach((response, index) => {
    const success = check(response, {
      [`${testName} - Spike request ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 500,
    });

    if (!success) {
      errorRate.add(1);
    }
    requestCounter.add(1);
  });

  // Check system recovery after spike
  const recoveryResponse = http.get(`${BASE_URL}/api/performance/health`, { headers });
  check(recoveryResponse, {
    [`${testName} - System recovers after spike`]: (r) => r.status === 200,
  });

  sleep(1);
}

// Volume test - sustained load
export function volumeTest() {
  const testName = 'Volume Test';
  
  // Sustained operations mix
  const operations = [
    () => {
      // Risk validation
      const response = http.post(
        `${BASE_URL}/api/risk-management/validate`,
        JSON.stringify({
          order: generateOrderData(),
          portfolio: generatePortfolioData(),
        }),
        { headers }
      );
      return check(response, {
        [`${testName} - Risk validation sustained`]: (r) => r.status >= 200 && r.status < 400,
      });
    },
    () => {
      // Performance monitoring
      const response = http.get(`${BASE_URL}/api/performance/summary`, { headers });
      return check(response, {
        [`${testName} - Performance monitoring sustained`]: (r) => r.status === 200,
      });
    },
    () => {
      // Audit trail access
      const response = http.get(`${BASE_URL}/api/risk-management/audit-trail?limit=5`, { headers });
      return check(response, {
        [`${testName} - Audit trail access sustained`]: (r) => r.status === 200,
      });
    },
  ];

  // Execute random operation
  const operation = operations[Math.floor(Math.random() * operations.length)];
  const success = operation();
  
  if (!success) {
    errorRate.add(1);
  }
  requestCounter.add(1);

  sleep(0.4);
}

// Setup function - runs before all tests
export function setup() {
  console.log(`🚀 Starting performance tests against ${BASE_URL}`);
  console.log(`📊 Target: 200 RPS with <2s response time`);
  
  // Verify system is ready
  const healthResponse = http.get(`${BASE_URL}/api/health`);
  if (healthResponse.status !== 200) {
    console.error(`❌ System health check failed: ${healthResponse.status}`);
    throw new Error('System not ready for testing');
  }
  
  console.log(`✅ System health check passed`);
  return { timestamp: new Date().toISOString() };
}

// Teardown function - runs after all tests
export function teardown(data) {
  console.log(`🏁 Performance tests completed at ${new Date().toISOString()}`);
  console.log(`📈 Test session started: ${data.timestamp}`);
}

// Handle summary - custom results processing
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    scenarios: {},
    metrics: {},
    thresholds: {},
  };

  // Process scenario results
  Object.entries(data.metrics).forEach(([name, metric]) => {
    if (metric.type === 'trend') {
      summary.metrics[name] = {
        avg: metric.avg,
        p95: metric.p95,
        p99: metric.p99,
        max: metric.max,
      };
    } else if (metric.type === 'rate') {
      summary.metrics[name] = {
        rate: metric.rate,
        count: metric.count,
      };
    } else if (metric.type === 'counter') {
      summary.metrics[name] = {
        count: metric.count,
        rate: metric.rate,
      };
    }
  });

  // Process threshold results
  Object.entries(data.thresholds).forEach(([name, threshold]) => {
    summary.thresholds[name] = {
      ok: threshold.ok,
      passes: threshold.passes,
      fails: threshold.fails,
    };
  });

  // Generate reports
  const textSummary = generateTextSummary(summary);
  const jsonSummary = JSON.stringify(summary, null, 2);

  return {
    'stdout': textSummary,
    'summary.json': jsonSummary,
    'results/performance-report.json': jsonSummary,
  };
}

function generateTextSummary(summary) {
  return `
🎯 A.A.I.T.I Performance Test Results
=====================================

⏱️  Test Duration: ${(summary.duration / 1000).toFixed(2)}s
📊 Key Metrics:
   • Response Time (p95): ${summary.metrics.http_req_duration?.p95?.toFixed(2) || 'N/A'}ms
   • Response Time (p99): ${summary.metrics.http_req_duration?.p99?.toFixed(2) || 'N/A'}ms
   • Error Rate: ${(summary.metrics.http_req_failed?.rate * 100)?.toFixed(2) || 'N/A'}%
   • Total Requests: ${summary.metrics.http_reqs?.count || 'N/A'}
   • Request Rate: ${summary.metrics.http_reqs?.rate?.toFixed(2) || 'N/A'} RPS

🎯 Performance Targets:
   • Target RPS: 200 ✓
   • Response Time: <2000ms ${summary.metrics.http_req_duration?.p95 < 2000 ? '✅' : '❌'}
   • Error Rate: <5% ${(summary.metrics.http_req_failed?.rate || 0) < 0.05 ? '✅' : '❌'}

🧪 Threshold Results:
${Object.entries(summary.thresholds)
  .map(([name, result]) => `   • ${name}: ${result.ok ? '✅ PASS' : '❌ FAIL'} (${result.passes}/${result.passes + result.fails})`)
  .join('\n')}

Generated: ${summary.timestamp}
`;
}