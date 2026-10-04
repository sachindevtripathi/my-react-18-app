/**
 * COMPANIES REDUCER: server data we cache ourselves.
 *
 * State shape:
 * {
 *   list:             { items: [...], status, error }        // GET /companies
 *   byTicker:         { AAPL: { data, status, error }, ... } // GET /companies/:ticker
 *   quartersByTicker: { AAPL: { data, status, error }, ... } // GET /companies/:ticker/quarters
 * }
 * status: 'idle' | 'loading' | 'succeeded' | 'failed'
 *
 * Keying by ticker is our hand-made version of RTK Query's per-argument cache:
 * re-selecting a company reads its existing entry instead of refetching.
 */
import {
  FETCH_COMPANIES_REQUEST,
  FETCH_COMPANIES_SUCCESS,
  FETCH_COMPANIES_FAILURE,
  FETCH_COMPANY_REQUEST,
  FETCH_COMPANY_SUCCESS,
  FETCH_COMPANY_FAILURE,
  FETCH_QUARTERS_REQUEST,
  FETCH_QUARTERS_SUCCESS,
  FETCH_QUARTERS_FAILURE,
} from '../actionTypes';

const initialState = {
  list: { items: [], status: 'idle', error: null },
  byTicker: {},
  quartersByTicker: {},
};

/**
 * Immutably updates one ticker's cache entry inside a map like `byTicker`.
 * Every level we change must be a NEW object; untouched levels are reused.
 * That's what lets useSelector detect changes with a cheap === comparison.
 */
const updateEntry = (map, ticker, changes) => ({
  ...map,
  [ticker]: { data: null, error: null, ...map[ticker], ...changes },
});

export default function companiesReducer(state = initialState, action) {
  switch (action.type) {
    // ---- list -----------------------------------------------------------------
    case FETCH_COMPANIES_REQUEST:
      return { ...state, list: { ...state.list, status: 'loading', error: null } };

    case FETCH_COMPANIES_SUCCESS:
      return { ...state, list: { items: action.payload, status: 'succeeded', error: null } };

    case FETCH_COMPANIES_FAILURE:
      return { ...state, list: { ...state.list, status: 'failed', error: action.error } };

    // ---- single company -------------------------------------------------------
    case FETCH_COMPANY_REQUEST:
      return {
        ...state,
        byTicker: updateEntry(state.byTicker, action.meta.ticker, { status: 'loading', error: null }),
      };

    case FETCH_COMPANY_SUCCESS:
      return {
        ...state,
        byTicker: updateEntry(state.byTicker, action.meta.ticker, {
          data: action.payload,
          status: 'succeeded',
        }),
      };

    case FETCH_COMPANY_FAILURE:
      return {
        ...state,
        byTicker: updateEntry(state.byTicker, action.meta.ticker, { status: 'failed', error: action.error }),
      };

    // ---- quarters -------------------------------------------------------------
    case FETCH_QUARTERS_REQUEST:
      return {
        ...state,
        quartersByTicker: updateEntry(state.quartersByTicker, action.meta.ticker, {
          status: 'loading',
          error: null,
        }),
      };

    case FETCH_QUARTERS_SUCCESS:
      return {
        ...state,
        quartersByTicker: updateEntry(state.quartersByTicker, action.meta.ticker, {
          data: action.payload,
          status: 'succeeded',
        }),
      };

    case FETCH_QUARTERS_FAILURE:
      return {
        ...state,
        quartersByTicker: updateEntry(state.quartersByTicker, action.meta.ticker, {
          status: 'failed',
          error: action.error,
        }),
      };

    default:
      return state;
  }
}
