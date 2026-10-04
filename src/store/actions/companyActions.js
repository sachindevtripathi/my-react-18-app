/**
 * COMPANY ACTIONS (async, via redux-thunk)
 *
 * A reducer must be pure and synchronous, so it can't call an API. With the
 * redux-thunk middleware an action creator may return a FUNCTION instead of an
 * object. The middleware calls it with (dispatch, getState), and inside it we:
 *   1. dispatch ..._REQUEST  (reducers set status = 'loading')
 *   2. await the API call
 *   3. dispatch ..._SUCCESS with the data, or ..._FAILURE with the error
 *
 * RTK Query did all of this for us, plus caching and de-duplication. Here we
 * do both by hand with getState(): if the data is already loaded or currently
 * loading, we don't send the request again.
 */
import * as api from '../../services/companyApi';
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
import { selectCompaniesStatus, selectCompanyEntry, selectQuartersEntry } from '../selectors/companySelectors';

// Errors in the store must be plain serialisable objects, not Error instances,
// so Redux DevTools can display them and state stays easy to compare.
export const toSerializableError = (error) => ({
  status: error.status ?? 'FETCH_ERROR',
  message: error.message,
});

// Manual cache rule: skip the request if this entry is loading or already loaded.
// (RTK Query's equivalent: per-argument cache + request de-duplication.)
const shouldFetch = (entry) => entry.status !== 'loading' && entry.status !== 'succeeded';

// ---- GET /companies ---------------------------------------------------------------
export const fetchCompanies = () => async (dispatch, getState) => {
  if (!shouldFetch({ status: selectCompaniesStatus(getState()) })) return;

  dispatch({ type: FETCH_COMPANIES_REQUEST });
  try {
    const companies = await api.getCompanies();
    dispatch({ type: FETCH_COMPANIES_SUCCESS, payload: companies });
  } catch (error) {
    dispatch({ type: FETCH_COMPANIES_FAILURE, error: toSerializableError(error) });
  }
};

// ---- GET /companies/:ticker -------------------------------------------------------
// The ticker travels in `meta` so the reducer knows which cache entry to update.
// Each ticker has its own entry, so a slow response for an old selection can't
// overwrite the data of the company that is selected now.
export const fetchCompanyByTicker = (ticker) => async (dispatch, getState) => {
  if (!ticker || !shouldFetch(selectCompanyEntry(getState(), ticker))) return;

  dispatch({ type: FETCH_COMPANY_REQUEST, meta: { ticker } });
  try {
    const company = await api.getCompanyByTicker(ticker);
    dispatch({ type: FETCH_COMPANY_SUCCESS, payload: company, meta: { ticker } });
  } catch (error) {
    dispatch({ type: FETCH_COMPANY_FAILURE, error: toSerializableError(error), meta: { ticker } });
  }
};

// ---- GET /companies/:ticker/quarters ----------------------------------------------
export const fetchCompanyQuarters = (ticker) => async (dispatch, getState) => {
  if (!ticker || !shouldFetch(selectQuartersEntry(getState(), ticker))) return;

  dispatch({ type: FETCH_QUARTERS_REQUEST, meta: { ticker } });
  try {
    const quarters = await api.getCompanyQuarters(ticker);
    dispatch({ type: FETCH_QUARTERS_SUCCESS, payload: quarters, meta: { ticker } });
  } catch (error) {
    dispatch({ type: FETCH_QUARTERS_FAILURE, error: toSerializableError(error), meta: { ticker } });
  }
};
