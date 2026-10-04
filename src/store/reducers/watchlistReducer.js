/**
 * WATCHLIST REDUCER
 *
 * State shape:
 * {
 *   items:  ['AAPL', ...]           // last list returned by GET /watchlist
 *   status: 'idle' | 'loading' | 'succeeded' | 'failed'
 *   error:  null | { status, message }
 *   add:    { status, error }       // state of the last POST (mutation)
 *   remove: { status, error }       // state of the last DELETE (mutation)
 * }
 *
 * `items` is kept while a refetch is loading, so the UI can show the old list
 * plus a "refreshing" hint (see selectWatchlistFetching).
 */
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

const idleMutation = { status: 'idle', error: null };

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  add: idleMutation,
  remove: idleMutation,
};

export default function watchlistReducer(state = initialState, action) {
  switch (action.type) {
    // ---- query ------------------------------------------------------------------
    case FETCH_WATCHLIST_REQUEST:
      // Keep `items` as they are: old data stays visible during a refetch.
      return { ...state, status: 'loading', error: null };

    case FETCH_WATCHLIST_SUCCESS:
      return { ...state, items: action.payload, status: 'succeeded' };

    case FETCH_WATCHLIST_FAILURE:
      return { ...state, status: 'failed', error: action.error };

    // ---- add mutation ------------------------------------------------------------
    // A new attempt clears the previous error of the same mutation.
    case ADD_TO_WATCHLIST_REQUEST:
      return { ...state, add: { status: 'loading', error: null } };

    case ADD_TO_WATCHLIST_SUCCESS:
      return { ...state, add: { status: 'succeeded', error: null } };

    case ADD_TO_WATCHLIST_FAILURE:
      return { ...state, add: { status: 'failed', error: action.error } };

    // ---- remove mutation ---------------------------------------------------------
    case REMOVE_FROM_WATCHLIST_REQUEST:
      return { ...state, remove: { status: 'loading', error: null } };

    case REMOVE_FROM_WATCHLIST_SUCCESS:
      return { ...state, remove: { status: 'succeeded', error: null } };

    case REMOVE_FROM_WATCHLIST_FAILURE:
      return { ...state, remove: { status: 'failed', error: action.error } };

    default:
      return state;
  }
}
