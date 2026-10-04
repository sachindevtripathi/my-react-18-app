/**
 * UI ACTION CREATORS
 *
 * An action creator is just a function that returns an action object.
 * Components call dispatch(selectTicker('IBM')) instead of building
 * { type: SELECT_TICKER, payload: 'IBM' } by hand everywhere.
 */
import { SELECT_TICKER, CLEAR_SELECTED_TICKER } from '../actionTypes';

// Called when a grid row is selected; payload is the company ticker.
export const selectTicker = (ticker) => ({
  type: SELECT_TICKER,
  payload: ticker ?? null,
});

// Clears the selection (e.g. when the grid selection is removed).
export const clearSelectedTicker = () => ({
  type: CLEAR_SELECTED_TICKER,
});
