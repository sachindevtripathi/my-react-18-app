/**
 * COMPANY SELECTORS
 *
 * IMPORTANT for useSelector: a component re-renders whenever its selector
 * returns a value that is not === to the previous one. So a selector must
 * return EXISTING objects from the state (or a shared constant), never build
 * a new object or array on every call. Otherwise the component re-renders on
 * every dispatched action, and react-redux logs a warning in development.
 */

// Shared "nothing cached yet" entry, the same object on every call.
const EMPTY_ENTRY = Object.freeze({ data: null, status: 'idle', error: null });

// ---- list --------------------------------------------------------------------------
export const selectCompanies = (state) => state.companies.list.items;
export const selectCompaniesStatus = (state) => state.companies.list.status;
export const selectCompaniesError = (state) => state.companies.list.error;
// Booleans are compared by value, so deriving one here is safe.
export const selectCompaniesLoading = (state) => state.companies.list.status === 'loading';

// ---- per-ticker cache entries ------------------------------------------------------
// Selectors can take extra arguments: useSelector((s) => selectCompanyEntry(s, ticker)).
export const selectCompanyEntry = (state, ticker) =>
  state.companies.byTicker[ticker] ?? EMPTY_ENTRY;

export const selectQuartersEntry = (state, ticker) =>
  state.companies.quartersByTicker[ticker] ?? EMPTY_ENTRY;
