const request = require('supertest');
const { expect } = require('chai');
const { app } = require('../server');

/**
 * Integration tests to ensure risk engine enforcement across execution paths
 */
describe('Risk Enforcement Integration', () => {
  let authToken;
  let userId;
  let botId;
  let portfolioId;

  before(async () => {
    // Create user and login
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'risk@test.com', username: 'riskuser', password: 'StrongPass123' });
      if (registerRes.status === 201) {
        userId = registerRes.body.user.id;
      } else if (registerRes.status !== 409) {
        throw new Error(`Unexpected register status: ${registerRes.status}`);
      }

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'risk@test.com', password: 'StrongPass123' })
      .expect(200);
    authToken = login.body.token;

    // Create a bot to use with manual execute
    const botRes = await request(app)
      .post('/api/bots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Risk Bot', description: 'Risk test bot', strategy_type: 'basic', trading_mode: 'paper', config: {} })
      .expect(201);
    botId = botRes.body.bot.id;

    // Create a paper portfolio
    const portfolioRes = await request(app)
      .post('/api/paper-trading/portfolios')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Risk Portfolio', initialBalance: 1000, currency: 'USD', riskProfile: 'moderate' })
      .expect(200);
    portfolioId = portfolioRes.body.portfolioId;
  });

  it('blocks manual trade when notional exceeds maxPositionSize', async () => {
    const payload = {
      botId,
      symbol: 'BTC',
      side: 'buy',
      quantity: 10000, // very large
      order_type: 'market',
      price: 100 // explicit to compute notional
    };

    const res = await request(app)
      .post('/api/trading/execute')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(400);

    expect(res.body.error).to.match(/Order (notional|blocked).*maxPositionSize/i);
  });

  it('blocks paper order when quantity is non-positive', async () => {
    const payload = {
      symbol: 'ETH',
      side: 'buy',
      type: 'market',
      quantity: 0
    };

    const res = await request(app)
      .post(`/api/paper-trading/portfolios/${portfolioId}/orders`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(400);

  expect(res.body.error).to.match(/(Quantity must be positive|Number must be greater than 0)/i);
  });

  it('allows a small manual trade to pass risk and create an open trade', async () => {
    const payload = {
      botId,
      symbol: 'BTC',
      side: 'buy',
      quantity: 0.001,
      order_type: 'market',
      price: 10000
    };

    const res = await request(app)
      .post('/api/trading/execute')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(200);

    expect(res.body).to.have.property('trade');
    expect(res.body.trade).to.include({ symbol: 'BTC', side: 'buy', status: 'open' });
  });
});
