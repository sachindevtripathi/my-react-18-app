/**
 * ROOT REDUCER
 *
 * combineReducers builds one reducer out of several. Each key becomes a
 * top-level branch of the state, and each reducer only ever sees its own branch:
 *
 *   state = {
 *     ui:        { selectedTicker }                       <- uiReducer
 *     companies: { list, byTicker, quartersByTicker }     <- companiesReducer
 *     watchlist: { items, status, error, add, remove }    <- watchlistReducer
 *   }
 *
 * Every dispatched action is passed to ALL three reducers; each one reacts only
 * to the action types it knows and returns its state unchanged otherwise.
 */
import { combineReducers } from 'redux';
import uiReducer from './uiReducer';
import companiesReducer from './companiesReducer';
import watchlistReducer from './watchlistReducer';

const rootReducer = combineReducers({
  ui: uiReducer,
  companies: companiesReducer,
  watchlist: watchlistReducer,
});

export default rootReducer;
