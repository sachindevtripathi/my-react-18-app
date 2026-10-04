import { createSlice } from '@reduxjs/toolkit';

/**
 * Client-side UI state: data that exists only in the browser.
 * Server data (companies, quarters, watchlist) stays in RTK Query's cache
 * (companyApi), never copied here.
 */
const uiSlice = createSlice({
  // Becomes the action type prefix, e.g. "ui/selectTicker".
  name: 'ui',
  initialState: {
    // Ticker of the company selected in the grid; null = nothing selected.
    selectedTicker: null,
  },
  reducers: {
    // createSlice generates an action creator with the same name:
    //   dispatch(selectTicker('IBM')) -> { type: 'ui/selectTicker', payload: 'IBM' }
    // Immer lets us "mutate" state here; it produces a new immutable state for us.
    selectTicker: (state, action) => {
      state.selectedTicker = action.payload ?? null;
    },
    clearSelectedTicker: (state) => {
      state.selectedTicker = null;
    },
  },
});

// Action creators, for dispatch(...).
export const { selectTicker, clearSelectedTicker } = uiSlice.actions;

// Selector: components read state through it with useSelector(selectSelectedTicker),
// so they don't depend on where the slice lives in the store.
export const selectSelectedTicker = (state) => state.ui.selectedTicker;

// Reducer, registered in store.js under the "ui" key.
export default uiSlice.reducer;
