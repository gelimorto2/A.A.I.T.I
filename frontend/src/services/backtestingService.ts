// Authentication helper
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export interface BacktestConfig {
  // Basic parameters
  modelIds: string[];
  symbols: string[];
  startDate: string;
  endDate: string;
  initialCapital?: number;
  
  // Trading parameters
  commission?: number;
  slippage?: number;
  positionSizing?: 'fixed' | 'percentage' | 'kelly';
  riskPerTrade?: number;
  stopLoss?: number;
  takeProfit?: number;
  maxPositions?: number;
  
  // Advanced features
  walkForwardOptimization?: boolean;
  walkForwardPeriods?: number;
  monteCarloSimulations?: number;
  benchmarkSymbol?: string;
  
  // Risk management
  maxDailyLoss?: number;
  maxDrawdown?: number;
  positionConcentration?: number;
  
  // ML-specific parameters
  retrain_frequency?: 'daily' | 'weekly' | 'monthly';
  prediction_confidence_threshold?: number;
  feature_importance_analysis?: boolean;
  drift_detection?: boolean;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryDate: string;
  exitDate?: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  signalConfidence: number;
  predictionAccuracy?: number;
  modelCount?: number;
}

export interface BacktestPerformance {
  totalTrades: number;
  profitableTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  avgTradeReturn: number;
  bestTrade: number;
  worstTrade: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  avgTradeDuration: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  calmarRatio: number;
  sortinoRatio: number;
  recoveryFactor: number;
  avgPredictionAccuracy: number;
  avgSignalConfidence: number;
  highConfidenceWinRate: number;
}

export interface BacktestResult {
  backtestId: string;
  modelIds: string[];
  symbols: string[];
  period: {
    startDate: string;
    endDate: string;
  };
  initialCapital: number;
  finalCapital: number;
  
  // Individual model results
  modelResults: Array<{
    modelId: string;
    trades: BacktestTrade[];
    performance: BacktestPerformance;
  }>;
  
  // Ensemble results
  trades: BacktestTrade[];
  performance: BacktestPerformance;
  
  // Advanced analysis
  walkForwardOptimization?: any;
  monteCarloAnalysis?: any;
  benchmarkComparison?: any;
  featureImportance?: any;
  driftAnalysis?: any;
  riskMetrics: any;
  
  executedAt: string;
}

export interface BacktestHistoryItem {
  id: string;
  model_id: string;
  model_names: string;
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
  created_at: string;
  parameters: BacktestConfig;
}

export interface BacktestHistoryResponse {
  backtests: BacktestHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class BacktestingService {
  /**
   * Run comprehensive backtest
   */
  async runBacktest(config: BacktestConfig): Promise<{ success: boolean; backtestId: string; results: BacktestResult }> {
    try {
      const response = await fetch('/api/backtesting/run', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error running backtest:', error);
      throw new Error('Failed to run backtest');
    }
  }

  /**
   * Get backtest results with detailed analysis
   */
  async getBacktestResults(backtestId: string): Promise<{
    backtest: BacktestHistoryItem;
    trades: BacktestTrade[];
    performance: BacktestPerformance;
  }> {
    try {
      const response = await fetch(`/api/backtesting/${backtestId}/results`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching backtest results:', error);
      throw new Error('Failed to fetch backtest results');
    }
  }

  /**
   * Get backtest history
   */
  async getBacktestHistory(
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'created_at',
    sortOrder: 'ASC' | 'DESC' = 'DESC'
  ): Promise<BacktestHistoryResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/backtesting/history?${params}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching backtest history:', error);
      throw new Error('Failed to fetch backtest history');
    }
  }

  /**
   * Compare multiple backtest results
   */
  async compareBacktests(backtestIds: string[]): Promise<{
    backtests: Array<{
      backtest: BacktestHistoryItem;
      trades: BacktestTrade[];
      performance: BacktestPerformance;
    }>;
    comparison: any;
  }> {
    try {
      const response = await fetch('/api/backtesting/compare', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ backtestIds })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error comparing backtests:', error);
      throw new Error('Failed to compare backtests');
    }
  }

  /**
   * Delete backtest
   */
  async deleteBacktest(backtestId: string): Promise<void> {
    try {
      const response = await fetch(`/api/backtesting/${backtestId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting backtest:', error);
      throw new Error('Failed to delete backtest');
    }
  }

  /**
   * Get available models for backtesting
   */
  async getAvailableModels(): Promise<Array<{
    id: string;
    name: string;
    model_type: string;
    training_status: string;
    accuracy?: number;
  }>> {
    try {
      const response = await fetch('/api/ml/models', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.models.filter((model: any) => model.training_status === 'trained');
    } catch (error) {
      console.error('Error fetching models:', error);
      throw new Error('Failed to fetch available models');
    }
  }

  /**
   * Get market symbols for backtesting
   */
  async getAvailableSymbols(): Promise<string[]> {
    try {
      // This would typically come from a market data service
      // For now, return common crypto symbols
      return [
        'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT',
        'BNBUSDT', 'LTCUSDT', 'XRPUSDT', 'BCHUSDT', 'EOSUSDT',
        'TRXUSDT', 'XLMUSDT', 'ATOMUSDT', 'VETUSDT', 'NEOUSDT'
      ];
    } catch (error) {
      console.error('Error fetching symbols:', error);
      throw new Error('Failed to fetch available symbols');
    }
  }

  /**
   * Calculate performance statistics for display
   */
  calculateDisplayMetrics(performance: BacktestPerformance) {
    return {
      returns: {
        total: `${(performance.totalReturn * 100).toFixed(2)}%`,
        annualized: `${(performance.totalReturn * 100 * (365 / 30)).toFixed(2)}%`, // Rough approximation
        monthly: `${(performance.totalReturn * 100 / 12).toFixed(2)}%`
      },
      risk: {
        sharpe: performance.sharpeRatio?.toFixed(2) || 'N/A',
        sortino: performance.sortinoRatio?.toFixed(2) || 'N/A',
        calmar: performance.calmarRatio?.toFixed(2) || 'N/A',
        maxDrawdown: `${(performance.maxDrawdown * 100).toFixed(2)}%`
      },
      trading: {
        winRate: `${(performance.winRate * 100).toFixed(1)}%`,
        profitFactor: performance.profitFactor?.toFixed(2) || 'N/A',
        avgTrade: `${performance.avgTradeReturn?.toFixed(2)}%`,
        totalTrades: performance.totalTrades
      },
      ml: {
        avgAccuracy: `${(performance.avgPredictionAccuracy * 100).toFixed(1)}%`,
        avgConfidence: `${(performance.avgSignalConfidence * 100).toFixed(1)}%`,
        highConfidenceWinRate: `${(performance.highConfidenceWinRate * 100).toFixed(1)}%`
      }
    };
  }

  /**
   * Format currency values
   */
  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Format percentage values
   */
  formatPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  /**
   * Generate color for performance values
   */
  getPerformanceColor(value: number, threshold: number = 0): string {
    if (value > threshold) return '#4caf50'; // Green
    if (value < threshold) return '#f44336'; // Red
    return '#ff9800'; // Orange
  }
}

export default new BacktestingService();