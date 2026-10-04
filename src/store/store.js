import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { companyApi } from '../services/companyApi';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    // Our own client state (selected ticker, ...); appears as state.ui
    ui: uiReducer,
    // Add the generated reducer as a specific top-level slice
    [companyApi.reducerPath]: companyApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling, and other useful features of rtk-query.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(companyApi.middleware),
});

// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);
