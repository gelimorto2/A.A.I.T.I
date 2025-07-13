import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import botsReducer from './slices/botsSlice';
import tradingReducer from './slices/tradingSlice';
import analyticsReducer from './slices/analyticsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    bots: botsReducer,
    trading: tradingReducer,
    analytics: analyticsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;