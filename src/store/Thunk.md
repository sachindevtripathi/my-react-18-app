# What is a thunk here?

A **thunk** here is an action creator that returns a **function** instead of a plain action object.
Redux middleware called `redux-thunk` runs that function for you.

## Why you need one

Reducers have to be pure and synchronous, so they can't call an API. A plain action is just data,
like `{ type: 'FETCH_COMPANIES_SUCCESS', payload: [...] }`. So the async work has to go somewhere,
and that place is a thunk.

## What it looks like in this code

[actions/companyActions.js:41-51](actions/companyActions.js#L41-L51):

```js
export const fetchCompanies = () => async (dispatch, getState) => {
  if (!shouldFetch({ status: selectCompaniesStatus(getState()) })) return; // skip if cached/loading

  dispatch({ type: FETCH_COMPANIES_REQUEST });           // status = 'loading'
  try {
    const companies = await api.getCompanies();          // the async work
    dispatch({ type: FETCH_COMPANIES_SUCCESS, payload: companies });
  } catch (error) {
    dispatch({ type: FETCH_COMPANIES_FAILURE, error: toSerializableError(error) });
  }
};
```

There are two arrows:

- `fetchCompanies()` is the **action creator**. Calling it doesn't fetch anything. It just returns
  the inner function.
- `async (dispatch, getState) => {...}` is the **thunk** itself. This is the function that does the
  work later.

## How it runs

1. In [LandingPage.js](../pages/LandingPage.js), `dispatch(fetchCompanies())` hands that inner
   function to `dispatch`.
2. A plain Redux store only accepts objects and would throw an error here. But
   [store.js](store.js) installs `applyMiddleware(thunk)`, so the middleware sees the action first.
3. redux-thunk's whole logic is basically this:
   ```js
   if (typeof action === 'function') return action(dispatch, getState);
   return next(action); // plain objects go on to the reducers
   ```
4. Your function then runs. It reads state with `getState()` and dispatches ordinary objects
   (`_REQUEST`, then `_SUCCESS` or `_FAILURE`). Only those objects ever reach the reducers.

## The thunks in this app

- `fetchCompanies`, `fetchCompanyByTicker` and `fetchCompanyQuarters` live in
  [actions/companyActions.js](actions/companyActions.js).
- `fetchWatchlist`, `addToWatchlist` and `removeFromWatchlist` live in
  [actions/watchlistActions.js](actions/watchlistActions.js).

By contrast, `selectTicker` in [actions/uiActions.js](actions/uiActions.js) is a **plain** action
creator. It returns an object straight away, so it needs no middleware.

## Why "thunk"?

It's an old programming term for a function that wraps work so it can run later instead of now.

## See it yourself

Open Redux DevTools and reload the page. You'll see `FETCH_COMPANIES_REQUEST` and then
`FETCH_COMPANIES_SUCCESS`, but no entry for the thunk itself, because functions never reach the
reducers. Then click the same company twice: the second click sends no request, because
`shouldFetch` returns early.

For comparison, the `main` branch (Redux Toolkit) uses `createAsyncThunk` and RTK Query, which
generate this whole REQUEST/SUCCESS/FAILURE pattern for you.
