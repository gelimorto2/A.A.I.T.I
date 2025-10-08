import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '60s', target: 10 },  // Stay at 10 users
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '60s', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate below 10%
  },
};

const BASE_URL = 'http://localhost:5000';

export default function () {
  // Test 1: Health Check
  const healthResponse = http.get(`${BASE_URL}/api/health`);
  const healthCheck = check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  if (!healthCheck) {
    errorRate.add(1);
  }

  sleep(1);

  // Test 2: Market Data Performance
  const marketDataResponse = http.get(`${BASE_URL}/api/market-data/BTCUSDT`);
  const marketDataCheck = check(marketDataResponse, {
    'market data status is 200': (r) => r.status === 200,
    'market data response time < 1000ms': (r) => r.timings.duration < 1000,
    'market data contains price': (r) => r.body.includes('price') || r.body.includes('close'),
  });
  
  if (!marketDataCheck) {
    errorRate.add(1);
  }

  sleep(1);

  // Test 3: ML Model Performance
  const mlModelResponse = http.get(`${BASE_URL}/api/ml/models`);
  const mlModelCheck = check(mlModelResponse, {
    'ML models status is 200 or 401': (r) => r.status === 200 || r.status === 401, // 401 expected without auth
    'ML models response time < 1500ms': (r) => r.timings.duration < 1500,
  });
  
  if (!mlModelCheck) {
    errorRate.add(1);
  }

  sleep(1);

  // Test 4: Analytics Performance
  const analyticsResponse = http.get(`${BASE_URL}/api/analytics/performance-metrics`);
  const analyticsCheck = check(analyticsResponse, {
    'analytics status is 200 or 401': (r) => r.status === 200 || r.status === 401, // 401 expected without auth
    'analytics response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  if (!analyticsCheck) {
    errorRate.add(1);
  }

  sleep(1);

  // Test 5: WebSocket Connection Attempt
  const wsResponse = http.get(`${BASE_URL}/socket.io/`, {
    headers: { 'Connection': 'Upgrade', 'Upgrade': 'websocket' },
  });
  const wsCheck = check(wsResponse, {
    'WebSocket endpoint accessible': (r) => r.status === 400 || r.status === 200, // 400 is OK for WebSocket upgrade attempt
    'WebSocket response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  if (!wsCheck) {
    errorRate.add(1);
  }

  sleep(2);

  // Test 6: Concurrent API Calls (Stress Test)
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/health`],
    ['GET', `${BASE_URL}/api/market-data/ETHUSDT`],
    ['GET', `${BASE_URL}/api/market-data/ADAUSDT`],
  ]);

  const batchCheck = check(responses, {
    'batch request 1 success': (r) => r[0].status === 200,
    'batch request 2 success': (r) => r[1].status === 200,
    'batch request 3 success': (r) => r[2].status === 200,
    'all batch requests < 3000ms': (r) => r.every(res => res.timings.duration < 3000),
  });
  
  if (!batchCheck) {
    errorRate.add(1);
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'performance_results.json': JSON.stringify(data, null, 2),
    stdout: `
🚀 A.A.I.T.I Performance Test Results
=====================================

📊 Request Statistics:
   • Total requests: ${data.metrics.http_reqs.values.count}
   • Request rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/sec
   • Failed requests: ${data.metrics.http_req_failed.values.rate * 100}%

⏱️  Response Times:
   • Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
   • 95th percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
   • Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

🎯 Thresholds:
   • 95% requests < 2000ms: ${data.metrics.http_req_duration.values['p(95)'] < 2000 ? '✅ PASS' : '❌ FAIL'}
   • Error rate < 10%: ${data.metrics.http_req_failed.values.rate < 0.1 ? '✅ PASS' : '❌ FAIL'}
   • Custom error rate < 10%: ${data.metrics.errors ? (data.metrics.errors.values.rate < 0.1 ? '✅ PASS' : '❌ FAIL') : '✅ PASS'}

${data.metrics.http_req_duration.values['p(95)'] < 2000 && 
  data.metrics.http_req_failed.values.rate < 0.1 ? 
  '🎉 Performance test PASSED! A.A.I.T.I is ready for production load.' : 
  '⚠️  Performance test needs attention. Review response times and error rates.'}
    `,
  };
}