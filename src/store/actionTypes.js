/**
 * ACTION TYPES
 *
 * Every action is a plain object `{ type, payload }`. The `type` string is how
 * reducers recognise an action, so we define each one exactly once as a
 * constant. A typo in a constant name is then a build error, while a typo in a
 * raw string would silently match nothing.
 *
 * Naming convention: DOMAIN/ACTION. Async operations get three types, one per
 * stage of the request:
 *   ..._REQUEST  request started  -> set loading flag
 *   ..._SUCCESS  response arrived -> store data
 *   ..._FAILURE  request failed   -> store error
 * (createSlice / createAsyncThunk in RTK generate these strings automatically.)
 */

// ---- UI (client state) -------------------------------------------------------
export const SELECT_TICKER = 'ui/SELECT_TICKER';
export const CLEAR_SELECTED_TICKER = 'ui/CLEAR_SELECTED_TICKER';

// ---- Companies list ------------------------------------------------------------
export const FETCH_COMPANIES_REQUEST = 'companies/FETCH_COMPANIES_REQUEST';
export const FETCH_COMPANIES_SUCCESS = 'companies/FETCH_COMPANIES_SUCCESS';
export const FETCH_COMPANIES_FAILURE = 'companies/FETCH_COMPANIES_FAILURE';

// ---- Single company (by ticker) ------------------------------------------------
export const FETCH_COMPANY_REQUEST = 'companies/FETCH_COMPANY_REQUEST';
export const FETCH_COMPANY_SUCCESS = 'companies/FETCH_COMPANY_SUCCESS';
export const FETCH_COMPANY_FAILURE = 'companies/FETCH_COMPANY_FAILURE';

// ---- Quarters (by ticker) ------------------------------------------------------
export const FETCH_QUARTERS_REQUEST = 'companies/FETCH_QUARTERS_REQUEST';
export const FETCH_QUARTERS_SUCCESS = 'companies/FETCH_QUARTERS_SUCCESS';
export const FETCH_QUARTERS_FAILURE = 'companies/FETCH_QUARTERS_FAILURE';

// ---- Watchlist: query -------------------------------------------------------------
export const FETCH_WATCHLIST_REQUEST = 'watchlist/FETCH_WATCHLIST_REQUEST';
export const FETCH_WATCHLIST_SUCCESS = 'watchlist/FETCH_WATCHLIST_SUCCESS';
export const FETCH_WATCHLIST_FAILURE = 'watchlist/FETCH_WATCHLIST_FAILURE';

// ---- Watchlist: mutations ---------------------------------------------------------
export const ADD_TO_WATCHLIST_REQUEST = 'watchlist/ADD_TO_WATCHLIST_REQUEST';
export const ADD_TO_WATCHLIST_SUCCESS = 'watchlist/ADD_TO_WATCHLIST_SUCCESS';
export const ADD_TO_WATCHLIST_FAILURE = 'watchlist/ADD_TO_WATCHLIST_FAILURE';

export const REMOVE_FROM_WATCHLIST_REQUEST = 'watchlist/REMOVE_FROM_WATCHLIST_REQUEST';
export const REMOVE_FROM_WATCHLIST_SUCCESS = 'watchlist/REMOVE_FROM_WATCHLIST_SUCCESS';
export const REMOVE_FROM_WATCHLIST_FAILURE = 'watchlist/REMOVE_FROM_WATCHLIST_FAILURE';
