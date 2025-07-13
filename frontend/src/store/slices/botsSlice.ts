import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Bot, BotMetrics } from '../../types';
import { botsAPI } from '../../services/api';

interface BotsState {
  bots: Bot[];
  currentBot: Bot | null;
  botMetrics: { [botId: string]: BotMetrics[] };
  isLoading: boolean;
  error: string | null;
}

const initialState: BotsState = {
  bots: [],
  currentBot: null,
  botMetrics: {},
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchBots = createAsyncThunk(
  'bots/fetchBots',
  async (_, { rejectWithValue }) => {
    try {
      const response = await botsAPI.getBots();
      return response.bots;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch bots');
    }
  }
);

export const fetchBot = createAsyncThunk(
  'bots/fetchBot',
  async (botId: string, { rejectWithValue }) => {
    try {
      const response = await botsAPI.getBot(botId);
      return response.bot;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch bot');
    }
  }
);

export const createBot = createAsyncThunk(
  'bots/createBot',
  async (botData: Partial<Bot>, { rejectWithValue }) => {
    try {
      const response = await botsAPI.createBot(botData);
      return response.bot;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create bot');
    }
  }
);

export const updateBot = createAsyncThunk(
  'bots/updateBot',
  async ({ botId, data }: { botId: string; data: Partial<Bot> }, { rejectWithValue }) => {
    try {
      await botsAPI.updateBot(botId, data);
      return { botId, data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update bot');
    }
  }
);

export const deleteBot = createAsyncThunk(
  'bots/deleteBot',
  async (botId: string, { rejectWithValue }) => {
    try {
      await botsAPI.deleteBot(botId);
      return botId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete bot');
    }
  }
);

export const startBot = createAsyncThunk(
  'bots/startBot',
  async (botId: string, { rejectWithValue }) => {
    try {
      await botsAPI.startBot(botId);
      return botId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to start bot');
    }
  }
);

export const stopBot = createAsyncThunk(
  'bots/stopBot',
  async (botId: string, { rejectWithValue }) => {
    try {
      await botsAPI.stopBot(botId);
      return botId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to stop bot');
    }
  }
);

export const fetchBotMetrics = createAsyncThunk(
  'bots/fetchBotMetrics',
  async ({ botId, days = 7 }: { botId: string; days?: number }, { rejectWithValue }) => {
    try {
      const response = await botsAPI.getBotMetrics(botId, days);
      return { botId, metrics: response.metrics };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch bot metrics');
    }
  }
);

const botsSlice = createSlice({
  name: 'bots',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentBot: (state, action: PayloadAction<Bot | null>) => {
      state.currentBot = action.payload;
    },
    updateBotStatus: (state, action: PayloadAction<{ botId: string; status: string }>) => {
      const bot = state.bots.find(b => b.id === action.payload.botId);
      if (bot) {
        bot.status = action.payload.status as any;
      }
      if (state.currentBot && state.currentBot.id === action.payload.botId) {
        state.currentBot.status = action.payload.status as any;
      }
    },
    updateBotMetrics: (state, action: PayloadAction<{ botId: string; metrics: Partial<BotMetrics> }>) => {
      const bot = state.bots.find(b => b.id === action.payload.botId);
      if (bot) {
        Object.assign(bot, action.payload.metrics);
      }
      if (state.currentBot && state.currentBot.id === action.payload.botId) {
        Object.assign(state.currentBot, action.payload.metrics);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Bots
      .addCase(fetchBots.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBots.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bots = action.payload;
      })
      .addCase(fetchBots.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Bot
      .addCase(fetchBot.fulfilled, (state, action) => {
        state.currentBot = action.payload;
        const existingBotIndex = state.bots.findIndex(b => b.id === action.payload.id);
        if (existingBotIndex >= 0) {
          state.bots[existingBotIndex] = action.payload;
        }
      })
      // Create Bot
      .addCase(createBot.fulfilled, (state, action) => {
        state.bots.unshift(action.payload);
      })
      // Update Bot
      .addCase(updateBot.fulfilled, (state, action) => {
        const botIndex = state.bots.findIndex(b => b.id === action.payload.botId);
        if (botIndex >= 0) {
          state.bots[botIndex] = { ...state.bots[botIndex], ...action.payload.data };
        }
        if (state.currentBot && state.currentBot.id === action.payload.botId) {
          state.currentBot = { ...state.currentBot, ...action.payload.data };
        }
      })
      // Delete Bot
      .addCase(deleteBot.fulfilled, (state, action) => {
        state.bots = state.bots.filter(b => b.id !== action.payload);
        if (state.currentBot && state.currentBot.id === action.payload) {
          state.currentBot = null;
        }
      })
      // Start Bot
      .addCase(startBot.fulfilled, (state, action) => {
        const bot = state.bots.find(b => b.id === action.payload);
        if (bot) {
          bot.status = 'running';
        }
        if (state.currentBot && state.currentBot.id === action.payload) {
          state.currentBot.status = 'running';
        }
      })
      // Stop Bot
      .addCase(stopBot.fulfilled, (state, action) => {
        const bot = state.bots.find(b => b.id === action.payload);
        if (bot) {
          bot.status = 'stopped';
        }
        if (state.currentBot && state.currentBot.id === action.payload) {
          state.currentBot.status = 'stopped';
        }
      })
      // Fetch Bot Metrics
      .addCase(fetchBotMetrics.fulfilled, (state, action) => {
        state.botMetrics[action.payload.botId] = action.payload.metrics;
      });
  },
});

export const { clearError, setCurrentBot, updateBotStatus, updateBotMetrics } = botsSlice.actions;
export default botsSlice.reducer;