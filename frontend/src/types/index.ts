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

// Machine Learning Types
export interface MLModel {
  id: string;
  name: string;
  user_id: string;
  algorithm_type: 'linear_regression' | 'polynomial_regression' | 'random_forest' | 'naive_bayes' | 'moving_average' | 'technical_indicators';
  target_timeframe: string;
  symbols: string[];
  parameters: Record<string, any>;
  model_data?: string;
  training_status: 'untrained' | 'training' | 'trained' | 'error';
  created_at: string;
  updated_at: string;
  last_trained?: string;
  accuracy?: number;
  precision_score?: number;
  recall_score?: number;
  f1_score?: number;
  prediction_count?: number;
  backtest_count?: number;
  avg_confidence?: number;
}

export interface MLPrediction {
  id: string;
  model_id: string;
  bot_id?: string;
  symbol: string;
  prediction_value: number;
  confidence: number;
  features: number[];
  actual_value?: number;
  timestamp: string;
  timeframe: string;
  model_name?: string;
}

export interface BacktestResult {
  id: string;
  model_id: string;
  user_id: string;
  symbols: string[];
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_capital: number;
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  total_trades: number;
  win_rate: number;
  avg_trade_duration: number;
  profit_factor: number;
  parameters: Record<string, any>;
  created_at: string;
  trade_count?: number;
  trades?: BacktestTrade[];
  performanceMetrics?: BacktestPerformanceMetrics;
}

export interface BacktestTrade {
  id: string;
  backtest_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entry_date: string;
  exit_date?: string;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  pnl?: number;
  signal_confidence: number;
  prediction_accuracy?: number;
  exitReason?: string;
  duration?: number;
}

export interface BacktestPerformanceMetrics {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgTradeDuration: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  grossProfit: number;
  grossLoss: number;
  avgWin: number;
  avgLoss: number;
}

export interface MLTrainingData {
  id: string;
  model_id: string;
  features: number[];
  target: number;
  timestamp: string;
  symbol: string;
  timeframe: string;
}

export interface ModelPerformanceMetrics {
  id: string;
  model_id: string;
  metric_date: string;
  accuracy: number;
  precision_score: number;
  recall_score: number;
  f1_score: number;
  mean_absolute_error: number;
  root_mean_square_error: number;
  directional_accuracy: number;
  profit_correlation: number;
}

export interface MLModelConfig {
  name: string;
  algorithmType: string;
  targetTimeframe: string;
  symbols: string[];
  parameters?: Record<string, any>;
  trainingPeriodDays?: number;
}

export interface BacktestConfig {
  symbols?: string[];
  startDate: string;
  endDate: string;
  initialCapital?: number;
  commission?: number;
  slippage?: number;
  positionSizing?: 'fixed' | 'percentage' | 'kelly';
  riskPerTrade?: number;
  stopLoss?: number;
  takeProfit?: number;
  maxPositions?: number;
}

export interface SystemHealthData {
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  config: {
    nodeEnv: string;
    version: string;
    port: number;
  };
  marketData: {
    provider: string;
    cacheStats: {
      hits: number;
      misses: number;
      cacheSize: number;
      lastUpdate: string;
    };
  };
}