#!/usr/bin/env node
/*
  Lightweight e2e smoke test (Public Demo Mode)
  - Checks backend health
  - Probes key API endpoints used by the UI (unauthenticated)
  - Warns but does not fail hard on non-critical misses
*/
const http = require('http');

const HOST = process.env.AAITI_HOST || 'localhost';
const PORT = parseInt(process.env.AAITI_PORT || '5000', 10);

const endpoints = [
  { path: '/api/health', label: 'Health' },
  { path: '/api/bots', label: 'Bots' },
  { path: '/api/analytics/portfolio', label: 'Portfolio' },
  { path: '/api/trading/quotes', label: 'Quotes', method: 'POST', body: { symbols: ['AAPL','GOOGL'] }, headers: { 'Content-Type': 'application/json' } },
  { path: '/api/analytics/performance?days=7&botId=all', label: 'Performance' },
];

function request({ path, method='GET', body, headers = {} }) {
  return new Promise((resolve) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers,
      timeout: 8000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async function run() {
  console.log(`🔎 Smoke test against http://${HOST}:${PORT}`);

  const results = [];
  for (const ep of endpoints) {
    const res = await request(ep);
    results.push({ ...ep, res });
  }

  // Try CSV export if we can detect a bot ID
  let botId = '1';
  try {
    const bots = results.find(r => r.label === 'Bots')?.res?.data;
    const parsed = bots ? JSON.parse(bots) : null;
    if (parsed && Array.isArray(parsed)) {
      botId = parsed[0]?.id || botId;
    } else if (parsed && parsed.bots && parsed.bots.length) {
      botId = parsed.bots[0].id || botId;
    }
  } catch {}
  const csvRes = await request({ path: `/api/bots/${botId}/history.csv?limit=5`, label: 'CSV', method: 'GET' });
  results.push({ path: `/api/bots/${botId}/history.csv`, label: 'CSV export', res: csvRes.res || csvRes });

  let pass = true;
  for (const r of results) {
    const ok = r.res.status && r.res.status >= 200 && r.res.status < 500; // treat 4xx as non-fatal in public mode
    pass = pass && !!r.res.status;
    const statusTxt = r.res.status ? r.res.status : `ERR(${r.res.error})`;
    console.log(`${ok ? '✅' : '⚠️'} ${r.label} ${r.method || 'GET'} ${r.path} -> ${statusTxt}`);
  }

  if (!pass) {
    console.log('\n❌ Smoke test encountered connection failures. Ensure backend is running.');
    process.exit(1);
  } else {
    console.log('\n✅ Smoke test completed (public mode)');
  }
})();
