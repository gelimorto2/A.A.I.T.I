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

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('aaiti_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token expiration
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('aaiti_token');
          window.location.href = '/login';
        }
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

export default apiClient;