import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TradingSignal, Trade, MarketData, RealTimePrice } from '../../types';
import { tradingAPI } from '../../services/api';

interface TradingState {
  signals: { [botId: string]: TradingSignal[] };
  trades: { [botId: string]: Trade[] };
  marketData: { [symbol: string]: MarketData[] };
  realTimePrices: { [symbol: string]: RealTimePrice };
  isLoading: boolean;
  error: string | null;
}

const initialState: TradingState = {
  signals: {},
  trades: {},
  marketData: {},
  realTimePrices: {},
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchSignals = createAsyncThunk(
  'trading/fetchSignals',
  async ({ botId, limit = 50, offset = 0 }: { botId: string; limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      const response = await tradingAPI.getSignals(botId, limit, offset);
      return { botId, signals: response.signals };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch signals');
    }
  }
);

export const fetchTrades = createAsyncThunk(
  'trading/fetchTrades',
  async ({ botId, limit = 50, offset = 0, status }: { botId: string; limit?: number; offset?: number; status?: string }, { rejectWithValue }) => {
    try {
      const response = await tradingAPI.getTrades(botId, limit, offset, status);
      return { botId, trades: response.trades };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch trades');
    }
  }
);

export const executeTrade = createAsyncThunk(
  'trading/executeTrade',
  async (tradeData: { botId: string; symbol: string; side: string; quantity: number; price?: number }, { rejectWithValue }) => {
    try {
      const response = await tradingAPI.executeTrade(tradeData);
      return response.trade;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to execute trade');
    }
  }
);

export const closeTrade = createAsyncThunk(
  'trading/closeTrade',
  async ({ tradeId, price }: { tradeId: string; price?: number }, { rejectWithValue }) => {
    try {
      const response = await tradingAPI.closeTrade(tradeId, price);
      return response.trade;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to close trade');
    }
  }
);

export const fetchMarketData = createAsyncThunk(
  'trading/fetchMarketData',
  async ({ symbol, timeframe = '1m', limit = 100 }: { symbol: string; timeframe?: string; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await tradingAPI.getMarketData(symbol, timeframe, limit);
      return { symbol, data: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch market data');
    }
  }
);

export const fetchRealTimePrice = createAsyncThunk(
  'trading/fetchRealTimePrice',
  async (symbol: string, { rejectWithValue }) => {
    try {
      const response = await tradingAPI.getRealTimePrice(symbol);
      return { symbol, price: response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch real-time price');
    }
  }
);

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addSignal: (state, action) => {
      const { botId, signal } = action.payload;
      if (!state.signals[botId]) {
        state.signals[botId] = [];
      }
      state.signals[botId].unshift(signal);
    },
    addTrade: (state, action) => {
      const { botId, trade } = action.payload;
      if (!state.trades[botId]) {
        state.trades[botId] = [];
      }
      state.trades[botId].unshift(trade);
    },
    updateTrade: (state, action) => {
      const { tradeId, updates } = action.payload;
      Object.keys(state.trades).forEach(botId => {
        const tradeIndex = state.trades[botId].findIndex(t => t.id === tradeId);
        if (tradeIndex >= 0) {
          state.trades[botId][tradeIndex] = { ...state.trades[botId][tradeIndex], ...updates };
        }
      });
    },
    updateRealTimePrice: (state, action) => {
      const { symbol, price } = action.payload;
      state.realTimePrices[symbol] = price;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Signals
      .addCase(fetchSignals.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSignals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.signals[action.payload.botId] = action.payload.signals;
      })
      .addCase(fetchSignals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Trades
      .addCase(fetchTrades.fulfilled, (state, action) => {
        state.trades[action.payload.botId] = action.payload.trades;
      })
      // Execute Trade
      .addCase(executeTrade.fulfilled, (state, action) => {
        const trade = action.payload;
        if (!state.trades[trade.bot_id]) {
          state.trades[trade.bot_id] = [];
        }
        state.trades[trade.bot_id].unshift(trade);
      })
      // Close Trade
      .addCase(closeTrade.fulfilled, (state, action) => {
        const updatedTrade = action.payload;
        Object.keys(state.trades).forEach(botId => {
          const tradeIndex = state.trades[botId].findIndex(t => t.id === updatedTrade.id);
          if (tradeIndex >= 0) {
            state.trades[botId][tradeIndex] = { ...state.trades[botId][tradeIndex], ...updatedTrade };
          }
        });
      })
      // Fetch Market Data
      .addCase(fetchMarketData.fulfilled, (state, action) => {
        state.marketData[action.payload.symbol] = action.payload.data;
      })
      // Fetch Real-Time Price
      .addCase(fetchRealTimePrice.fulfilled, (state, action) => {
        state.realTimePrices[action.payload.symbol] = action.payload.price;
      });
  },
});

export const { clearError, addSignal, addTrade, updateTrade, updateRealTimePrice } = tradingSlice.actions;
export default tradingSlice.reducer;