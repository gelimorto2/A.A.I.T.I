const { expect } = require('chai');
const { evaluateOrder } = require('../utils/riskEngine');

describe('Risk Engine', () => {
  it('blocks non-positive quantities', () => {
    const res = evaluateOrder({ portfolio: null, symbol: 'BTC', side: 'buy', type: 'market', quantity: 0, price: 50000 });
    expect(res.allowed).to.equal(false);
  });

  it('allows reasonable orders', () => {
    const res = evaluateOrder({ portfolio: { initial_balance: 100000, current_balance: 100000 }, symbol: 'BTC', side: 'buy', type: 'market', quantity: 0.1, price: 50000 });
    expect(res.allowed).to.equal(true);
  });
});
