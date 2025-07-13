export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'trader' | 'viewer';
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface Bot {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  strategy_type: string;
  trading_mode: 'live' | 'paper' | 'shadow';
  status: 'running' | 'stopped' | 'error';
  config?: any;
  created_at: string;
  updated_at: string;
  health_score?: number;
  pnl?: number;
  total_trades?: number;
  win_rate?: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  execution_latency?: number;
  prediction_accuracy?: number;
  risk_score?: number;
}

export interface BotMetrics {
  id: string;
  bot_id: string;
  timestamp: string;
  health_score: number;
  pnl: number;
  total_trades: number;
  win_rate: number;
  sharpe_ratio: number;
  max_drawdown: number;
  execution_latency: number;
  prediction_accuracy: number;
  risk_score: number;
}

export interface TradingSignal {
  id: string;
  bot_id: string;
  symbol: string;
  signal_type: 'buy' | 'sell' | 'hold';
  confidence: number;
  price: number;
  quantity: number;
  timestamp: string;
  executed: boolean;
  execution_price?: number;
  execution_time?: string;
}

export interface Trade {
  id: string;
  bot_id: string;
  signal_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  pnl?: number;
  commission?: number;
  status: 'open' | 'closed' | 'cancelled';
  opened_at: string;
  closed_at?: string;
}

export interface MarketData {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeframe: string;
}

export interface RealTimePrice {
  symbol: string;
  price: number;
  timestamp: string;
  bid: number;
  ask: number;
  volume: number;
}

export interface PortfolioData {
  bot_id: string;
  bot_name: string;
  trading_mode: string;
  total_pnl: number;
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  avg_pnl: number;
  best_trade: number;
  worst_trade: number;
}

export interface RiskData {
  bot_id: string;
  bot_name: string;
  trading_mode: string;
  max_position_size: number;
  max_daily_loss: number;
  max_drawdown: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  current_exposure: number;
  daily_pnl: number;
}

export interface PerformanceSnapshot {
  date: string;
  total_pnl: number;
  daily_pnl: number;
  total_trades: number;
  win_rate: number;
  sharpe_ratio: number;
  max_drawdown: number;
  exposure: number;
}