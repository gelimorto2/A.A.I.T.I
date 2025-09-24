const DEFAULT_LIMITS = {
  maxPositionSize: 100000, // notional
  maxOrderQuantity: 1_000_000,
  maxDailyLoss: 0.2, // 20% of initial balance
};

function evaluateOrder({ portfolio, symbol, side, type, quantity, price }) {
  const limits = DEFAULT_LIMITS; // later: fetch per-user/bot limits

  if (quantity <= 0) {
    return { allowed: false, reason: 'Quantity must be positive' };
  }
  if (quantity > limits.maxOrderQuantity) {
    return { allowed: false, reason: 'Quantity exceeds maxOrderQuantity' };
  }

  const notional = (price || portfolio?.avgPrice || 0) * quantity;
  if (notional && notional > limits.maxPositionSize) {
    return { allowed: false, reason: 'Order notional exceeds maxPositionSize' };
  }

  if (portfolio && portfolio.initial_balance) {
    const drawdown = (portfolio.initial_balance - portfolio.current_balance) / portfolio.initial_balance;
    if (drawdown > limits.maxDailyLoss) {
      return { allowed: false, reason: 'Portfolio exceeds max daily loss' };
    }
  }

  return { allowed: true };
}

module.exports = { evaluateOrder };
