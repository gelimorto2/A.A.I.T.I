import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { healthAPI } from '../../services/api';
import { SystemHealthData } from '../../types';

interface HealthState {
  data: SystemHealthData | null;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
}

const initialState: HealthState = {
  data: null,
  loading: false,
  error: null,
  lastFetched: null,
};

export const fetchSystemHealth = createAsyncThunk(
  'health/fetchSystemHealth',
  async (_, { rejectWithValue }) => {
    try {
      const data = await healthAPI.getSystemHealth();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSystemHealth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSystemHealth.fulfilled, (state, action: PayloadAction<SystemHealthData>) => {
        state.loading = false;
        state.data = action.payload;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(fetchSystemHealth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = healthSlice.actions;
export default healthSlice.reducer;