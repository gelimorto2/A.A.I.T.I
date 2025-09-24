import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor (public mode: no auth header required)
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor (public mode: do not force redirect on 401)
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // In public mode we simply propagate errors
        return Promise.reject(error);
      }
    );
  }

  async get(url: string, config?: AxiosRequestConfig) {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put(url, data, config);
  }

  async delete(url: string, config?: AxiosRequestConfig) {
    return this.client.delete(url, config);
  }
}

const apiClient = new APIClient();

// Auth API
export const authAPI = {
  login: async (credentials: { username: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: { username: string; email: string; password: string; role?: string }) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  refreshToken: async () => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};

// Bots API
export const botsAPI = {
  getBots: async () => {
    const response = await apiClient.get('/bots');
    return response.data;
  },

  getBot: async (botId: string) => {
    const response = await apiClient.get(`/bots/${botId}`);
    return response.data;
  },

  createBot: async (botData: any) => {
    const response = await apiClient.post('/bots', botData);
    return response.data;
  },

  updateBot: async (botId: string, data: any) => {
    const response = await apiClient.put(`/bots/${botId}`, data);
    return response.data;
  },

  deleteBot: async (botId: string) => {
    const response = await apiClient.delete(`/bots/${botId}`);
    return response.data;
  },

  startBot: async (botId: string) => {
    const response = await apiClient.post(`/bots/${botId}/start`);
    return response.data;
  },

  stopBot: async (botId: string) => {
    const response = await apiClient.post(`/bots/${botId}/stop`);
    return response.data;
  },

  getBotMetrics: async (botId: string, days: number = 7) => {
    const response = await apiClient.get(`/bots/${botId}/metrics?days=${days}`);
    return response.data;
  },
};

// Trading API
export const tradingAPI = {
  getSignals: async (botId: string, limit: number = 50, offset: number = 0) => {
    const response = await apiClient.get(`/trading/signals/${botId}?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  getTrades: async (botId: string, limit: number = 50, offset: number = 0, status?: string) => {
    let url = `/trading/trades/${botId}?limit=${limit}&offset=${offset}`;
    if (status) {
      url += `&status=${status}`;
    }
    const response = await apiClient.get(url);
    return response.data;
  },

  executeTrade: async (tradeData: { botId: string; symbol: string; side: string; quantity: number; price?: number }) => {
    const response = await apiClient.post('/trading/execute', tradeData);
    return response.data;
  },

  closeTrade: async (tradeId: string, price?: number) => {
    const response = await apiClient.post(`/trading/trades/${tradeId}/close`, { price });
    return response.data;
  },

  getMarketData: async (symbol: string, timeframe: string = '1m', limit: number = 100) => {
    const response = await apiClient.get(`/trading/market-data/${symbol}?timeframe=${timeframe}&limit=${limit}`);
    return response.data;
  },

  getRealTimePrice: async (symbol: string) => {
    const response = await apiClient.get(`/trading/price/${symbol}`);
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getPortfolio: async () => {
    const response = await apiClient.get('/analytics/portfolio');
    return response.data;
  },

  getPerformance: async (botId: string, days: number = 30) => {
    const response = await apiClient.get(`/analytics/performance/${botId}?days=${days}`);
    return response.data;
  },

  getRisk: async () => {
    const response = await apiClient.get('/analytics/risk');
    return response.data;
  },

  getCorrelations: async () => {
    const response = await apiClient.get('/analytics/correlation');
    return response.data;
  },

  getMarketRegime: async () => {
    const response = await apiClient.get('/analytics/market-regime');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getAuditTrail: async (limit: number = 50, offset: number = 0) => {
    const response = await apiClient.get(`/users/audit-trail?limit=${limit}&offset=${offset}`);
    return response.data;
  },
};

// ML API
export const mlAPI = {
  // Models
  getModels: async () => {
    const response = await apiClient.get('/ml/models');
    return response.data;
  },

  getModel: async (modelId: string) => {
    const response = await apiClient.get(`/ml/models/${modelId}`);
    return response.data;
  },

  createModel: async (modelConfig: {
    name: string;
    algorithmType: string;
    targetTimeframe: string;
    symbols: string[];
    parameters?: Record<string, any>;
    trainingPeriodDays?: number;
  }) => {
    const response = await apiClient.post('/ml/models', modelConfig);
    return response.data;
  },

  updateModel: async (modelId: string, updates: {
    name?: string;
    parameters?: Record<string, any>;
    retrain?: boolean;
  }) => {
    const response = await apiClient.put(`/ml/models/${modelId}`, updates);
    return response.data;
  },

  deleteModel: async (modelId: string) => {
    const response = await apiClient.delete(`/ml/models/${modelId}`);
    return response.data;
  },

  // Predictions
  makePrediction: async (modelId: string, predictionData: {
    symbols?: string[];
    features?: number[];
  }) => {
    const response = await apiClient.post(`/ml/models/${modelId}/predict`, predictionData);
    return response.data;
  },

  getPredictions: async (modelId: string, params?: {
    limit?: number;
    offset?: number;
    symbol?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.symbol) queryParams.append('symbol', params.symbol);
    
    const url = `/ml/models/${modelId}/predictions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  // Backtesting
  runBacktest: async (modelId: string, backtestConfig: {
    symbols?: string[];
    startDate: string;
    endDate: string;
    initialCapital?: number;
    commission?: number;
    slippage?: number;
    positionSizing?: string;
    riskPerTrade?: number;
    stopLoss?: number;
    takeProfit?: number;
    maxPositions?: number;
  }) => {
    const response = await apiClient.post(`/ml/models/${modelId}/backtest`, backtestConfig);
    return response.data;
  },

  getBacktests: async (modelId: string) => {
    const response = await apiClient.get(`/ml/models/${modelId}/backtests`);
    return response.data;
  },

  getBacktestDetails: async (backtestId: string) => {
    const response = await apiClient.get(`/ml/backtests/${backtestId}`);
    return response.data;
  },

  // Model comparison
  compareModels: async (modelIds: string[], metric: string = 'accuracy') => {
    const response = await apiClient.post('/ml/compare', { modelIds, metric });
    return response.data;
  },

  // ========================================================================================
  // ADVANCED ML & AI INTELLIGENCE API METHODS
  // ========================================================================================

  // Real-time Model Adaptation
  initializeModelAdaptation: async (modelId: string, thresholds: {
    performanceThreshold?: number;
    volatilityThreshold?: number;
    evaluationWindow?: number;
    retrainCooldown?: number;
  } = {}) => {
    const response = await apiClient.post(`/ml/models/${modelId}/adaptation/init`, { thresholds });
    return response.data;
  },

  monitorModelPerformance: async (modelId: string, prediction: number, actual: number, marketData?: any) => {
    const response = await apiClient.post(`/ml/models/${modelId}/adaptation/monitor`, {
      prediction,
      actual,
      marketData
    });
    return response.data;
  },

  // GARCH Models for Volatility Prediction
  createGARCHModel: async (config: {
    symbol: string;
    timeframe?: string;
    parameters?: { p?: number; q?: number; maxIterations?: number; tolerance?: number };
    trainingPeriodDays?: number;
  }) => {
    const response = await apiClient.post('/ml/models/garch', config);
    return response.data;
  },

  // Vector Autoregression (VAR) for Multi-Asset Analysis
  createVARModel: async (config: {
    symbols: string[];
    timeframe?: string;
    parameters?: { lag?: number };
    trainingPeriodDays?: number;
  }) => {
    const response = await apiClient.post('/ml/models/var', config);
    return response.data;
  },

  // Change Point Detection
  detectChangePoints: async (config: {
    symbol: string;
    timeframe?: string;
    method?: 'cusum' | 'pelt' | 'binseg';
    parameters?: {
      threshold?: number;
      minSegmentLength?: number;
      maxChangePoints?: number;
    };
    periodDays?: number;
  }) => {
    const response = await apiClient.post('/ml/analysis/changepoints', config);
    return response.data;
  },

  // Monte Carlo Simulation for Portfolio Stress Testing
  runMonteCarloSimulation: async (config: {
    portfolioWeights: number[];
    symbols: string[];
    timeframe?: string;
    parameters?: {
      simulations?: number;
      timeHorizon?: number;
      confidenceLevel?: number;
    };
    trainingPeriodDays?: number;
  }) => {
    const response = await apiClient.post('/ml/portfolio/montecarlo', config);
    return response.data;
  },

  // Dynamic Hedging Strategies
  createHedgeStrategy: async (config: {
    portfolio: Record<string, number>;
    parameters?: {
      hedgeRatio?: number;
      rebalanceThreshold?: number;
      hedgeInstruments?: string[];
      delta?: number;
      volatilityTarget?: number;
      maxCorrelation?: number;
    };
  }) => {
    const response = await apiClient.post('/ml/portfolio/hedge', config);
    return response.data;
  },

  // Enhanced Risk Parity Optimization
  optimizeRiskParity: async (config: {
    symbols: string[];
    timeframe?: string;
    parameters?: {
      targetRiskContributions?: number[];
      maxIterations?: number;
      tolerance?: number;
      shrinkage?: number;
      lookback?: number;
    };
    trainingPeriodDays?: number;
  }) => {
    const response = await apiClient.post('/ml/portfolio/risk-parity', config);
    return response.data;
  },

  // Get Analysis Results
  getAnalysisResults: async (filters: {
    type?: string;
    symbol?: string;
    limit?: number;
  } = {}) => {
    const response = await apiClient.get('/ml/analysis/results', { params: filters });
    return response.data;
  },

  // Get Hedge Strategies
  getHedgeStrategies: async (status: string = 'active') => {
    const response = await apiClient.get('/ml/portfolio/hedge', { params: { status } });
    return response.data;
  },
};

// System Health API
export const healthAPI = {
  getSystemHealth: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default apiClient;