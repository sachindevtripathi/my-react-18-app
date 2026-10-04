/**
 * WATCHLIST ACTIONS (async, via redux-thunk)
 *
 * Query:     fetchWatchlist
 * Mutations: addToWatchlist, removeFromWatchlist
 *
 * After a mutation the list in the store is out of date, so each mutation
 * thunk dispatches fetchWatchlist() itself once the server has confirmed the
 * change.
 */
import * as api from '../../services/companyApi';
import {
  FETCH_WATCHLIST_REQUEST,
  FETCH_WATCHLIST_SUCCESS,
  FETCH_WATCHLIST_FAILURE,
  ADD_TO_WATCHLIST_REQUEST,
  ADD_TO_WATCHLIST_SUCCESS,
  ADD_TO_WATCHLIST_FAILURE,
  REMOVE_FROM_WATCHLIST_REQUEST,
  REMOVE_FROM_WATCHLIST_SUCCESS,
  REMOVE_FROM_WATCHLIST_FAILURE,
} from '../actionTypes';
import { selectWatchlistStatus } from '../selectors/watchlistSelectors';
import { toSerializableError } from './companyActions';

// ---- GET /watchlist ---------------------------------------------------------------
// Unlike the company fetches, this one may run again after it succeeded
// (that's how the list refreshes after a mutation). We only skip it while a
// request is already in flight, which also absorbs React StrictMode's
// double-run of effects in development.
export const fetchWatchlist = () => async (dispatch, getState) => {
  if (selectWatchlistStatus(getState()) === 'loading') return;

  dispatch({ type: FETCH_WATCHLIST_REQUEST });
  try {
    const tickers = await api.getWatchlist();
    dispatch({ type: FETCH_WATCHLIST_SUCCESS, payload: tickers });
  } catch (error) {
    dispatch({ type: FETCH_WATCHLIST_FAILURE, error: toSerializableError(error) });
  }
};

// ---- POST /watchlist ----------------------------------------------------------------
export const addToWatchlist = (ticker) => async (dispatch) => {
  dispatch({ type: ADD_TO_WATCHLIST_REQUEST, meta: { ticker } });
  try {
    await api.addToWatchlist(ticker);
    dispatch({ type: ADD_TO_WATCHLIST_SUCCESS, meta: { ticker } });
    // The server data changed, so reload the list.
    dispatch(fetchWatchlist());
  } catch (error) {
    dispatch({ type: ADD_TO_WATCHLIST_FAILURE, error: toSerializableError(error), meta: { ticker } });
  }
};

// ---- DELETE /watchlist/:ticker ------------------------------------------------------
export const removeFromWatchlist = (ticker) => async (dispatch) => {
  dispatch({ type: REMOVE_FROM_WATCHLIST_REQUEST, meta: { ticker } });
  try {
    await api.removeFromWatchlist(ticker);
    dispatch({ type: REMOVE_FROM_WATCHLIST_SUCCESS, meta: { ticker } });
    dispatch(fetchWatchlist());
  } catch (error) {
    dispatch({ type: REMOVE_FROM_WATCHLIST_FAILURE, error: toSerializableError(error), meta: { ticker } });
  }
};
