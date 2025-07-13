import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { PortfolioData, RiskData, PerformanceSnapshot } from '../../types';
import { analyticsAPI } from '../../services/api';

interface AnalyticsState {
  portfolio: {
    bots: PortfolioData[];
    overall: any;
  } | null;
  performance: { [botId: string]: PerformanceSnapshot[] };
  risk: {
    bots: RiskData[];
    overall: any;
    violations: RiskData[];
  } | null;
  correlations: any[];
  marketRegime: any | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  portfolio: null,
  performance: {},
  risk: null,
  correlations: [],
  marketRegime: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchPortfolio = createAsyncThunk(
  'analytics/fetchPortfolio',
  async (_, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getPortfolio();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch portfolio');
    }
  }
);

export const fetchPerformance = createAsyncThunk(
  'analytics/fetchPerformance',
  async ({ botId, days = 30 }: { botId: string; days?: number }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getPerformance(botId, days);
      return { botId, performance: response.performance };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch performance');
    }
  }
);

export const fetchRisk = createAsyncThunk(
  'analytics/fetchRisk',
  async (_, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getRisk();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch risk data');
    }
  }
);

export const fetchCorrelations = createAsyncThunk(
  'analytics/fetchCorrelations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getCorrelations();
      return response.correlations;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch correlations');
    }
  }
);

export const fetchMarketRegime = createAsyncThunk(
  'analytics/fetchMarketRegime',
  async (_, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getMarketRegime();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch market regime');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Portfolio
      .addCase(fetchPortfolio.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPortfolio.fulfilled, (state, action) => {
        state.isLoading = false;
        state.portfolio = action.payload;
      })
      .addCase(fetchPortfolio.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Performance
      .addCase(fetchPerformance.fulfilled, (state, action) => {
        state.performance[action.payload.botId] = action.payload.performance;
      })
      // Fetch Risk
      .addCase(fetchRisk.fulfilled, (state, action) => {
        state.risk = action.payload;
      })
      // Fetch Correlations
      .addCase(fetchCorrelations.fulfilled, (state, action) => {
        state.correlations = action.payload;
      })
      // Fetch Market Regime
      .addCase(fetchMarketRegime.fulfilled, (state, action) => {
        state.marketRegime = action.payload;
      });
  },
});

export const { clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;