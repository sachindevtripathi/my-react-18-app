/**
 * UI REDUCER: client-side state that exists only in the browser.
 *
 * A reducer is a PURE function: (currentState, action) => newState.
 *  - It never mutates `state`; it returns a new object (spread syntax).
 *  - It never calls APIs, timers or Math.random().
 *  - For actions it doesn't handle, it returns `state` unchanged.
 * (createSlice let us write `state.x = y` because Immer made the copy for us;
 *  here we copy by hand.)
 */
import { SELECT_TICKER, CLEAR_SELECTED_TICKER } from '../actionTypes';

// Redux calls the reducer with state = undefined on start-up, so the default
// parameter becomes the initial state.
const initialState = {
  // Ticker of the company selected in the grid; null = nothing selected.
  selectedTicker: null,
};

export default function uiReducer(state = initialState, action) {
  switch (action.type) {
    case SELECT_TICKER:
      return { ...state, selectedTicker: action.payload };

    case CLEAR_SELECTED_TICKER:
      return { ...state, selectedTicker: null };

    default:
      return state;
  }
}
