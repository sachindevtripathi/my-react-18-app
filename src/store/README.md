# State management with legacy Redux

This branch (`redux-old`) implements the app's state with **hand-written Redux**:
action types, action creators, thunks, reducers and selectors. The `main` branch does the same
job with Redux Toolkit (`createSlice`, `createApi` / RTK Query). Comparing the two shows what
RTK generates for you.

Stack: React 19, `redux` 5, `redux-thunk` 3, `react-redux` 9. There is no `@reduxjs/toolkit`.

---

## 1. The one-way data flow

```
 ┌────────────┐  dispatch(action)  ┌────────────┐  action  ┌────────────┐
 │ Component  │ ─────────────────▶ │ Middleware │ ───────▶ │  Reducers  │
 │ (React)    │                    │ (thunk)    │          │ (pure fns) │
 └────────────┘                    └────────────┘          └─────┬──────┘
       ▲                                 │ async: call API,            │ new state
       │ useSelector(selector)           │ then dispatch more actions  ▼
       │                                 ▼                       ┌────────────┐
       └──────────── re-render when the selected value changes ──│   Store    │
                                                                 └────────────┘
```

1. A component **dispatches** an action, for example when a grid row is clicked.
2. **Middleware** sees it first. `redux-thunk` runs it if the action is a function (an async thunk).
3. Every **reducer** receives the plain action and returns the next state.
4. The **store** saves the new state and notifies subscribers.
5. Components re-render if the value returned by their **selector** changed.

State is changed in exactly one place, the reducers, and only in response to actions. That's
what makes Redux predictable and easy to debug.

---

## 2. Folder structure

```
src/
├── services/
│   └── companyApi.js          HTTP only: fetch() wrappers, no Redux
└── store/
    ├── store.js               createStore + thunk middleware + DevTools
    ├── actionTypes.js         every action "type" string, defined once
    ├── actions/               action creators
    │   ├── uiActions.js         plain (sync): selectTicker, clearSelectedTicker
    │   ├── companyActions.js    thunks (async): fetchCompanies, fetchCompanyByTicker, fetchCompanyQuarters
    │   └── watchlistActions.js  thunks (async): fetchWatchlist, addToWatchlist, removeFromWatchlist
    ├── reducers/
    │   ├── index.js             combineReducers -> rootReducer
    │   ├── uiReducer.js         state.ui
    │   ├── companiesReducer.js  state.companies
    │   └── watchlistReducer.js  state.watchlist
    └── selectors/
        ├── uiSelectors.js
        ├── companySelectors.js
        └── watchlistSelectors.js
```

The store is wired into React once, in `src/index.js`, with `<Provider store={store}>`.

---

## 3. The building blocks

### Store (`store.js`)
The single object that holds the whole state tree. It has three methods:

| Method | Purpose |
|---|---|
| `getState()` | Read the current state |
| `dispatch(action)` | Send an action through middleware and reducers |
| `subscribe(listener)` | Get notified after each dispatch. `react-redux` uses this internally |

It's created with `legacy_createStore(rootReducer, enhancer)`. Redux 5 marks the plain
`createStore` name as deprecated to promote RTK; `legacy_createStore` is the identical function.
The enhancer adds the thunk middleware and the Redux DevTools browser extension.

### Action types (`actionTypes.js`)
Constants such as `FETCH_COMPANIES_REQUEST`. Reducers match on them, and a typo in a constant
name is a build error instead of a silent no-op. An async operation uses three types:

| Type | Dispatched when | Reducer sets |
|---|---|---|
| `..._REQUEST` | The request starts | `status: 'loading'` |
| `..._SUCCESS` | The response arrives | `data`, `status: 'succeeded'` |
| `..._FAILURE` | The request fails | `error`, `status: 'failed'` |

### Actions and action creators (`actions/`)
An **action** is a plain object that describes what happened:

```js
{ type: 'ui/SELECT_TICKER', payload: 'IBM' }
```

An **action creator** is a function that builds one, so components don't hand-write objects:

```js
export const selectTicker = (ticker) => ({ type: SELECT_TICKER, payload: ticker ?? null });
dispatch(selectTicker('IBM'));
```

Conventional fields are `type` (required), `payload` (the data), `error` (for failures) and
`meta` (extra info). Here `meta.ticker` tells the reducer which cache entry to update.

### Thunks: async logic (`actions/companyActions.js`, `actions/watchlistActions.js`)
Reducers must be pure, so API calls can't happen there. With `redux-thunk`, an action creator can
return a **function**. The middleware calls it with `(dispatch, getState)`:

```js
export const fetchCompanyByTicker = (ticker) => async (dispatch, getState) => {
  if (!shouldFetch(selectCompanyEntry(getState(), ticker))) return; // manual cache check
  dispatch({ type: FETCH_COMPANY_REQUEST, meta: { ticker } });
  try {
    const company = await api.getCompanyByTicker(ticker);
    dispatch({ type: FETCH_COMPANY_SUCCESS, payload: company, meta: { ticker } });
  } catch (error) {
    dispatch({ type: FETCH_COMPANY_FAILURE, error: toSerializableError(error), meta: { ticker } });
  }
};
```

`getState()` lets a thunk skip requests whose data is already loaded or in flight. That is our
hand-made **cache and de-duplication**.

### Reducers (`reducers/`)
A reducer is a **pure function** `(state, action) => newState`:

```js
export default function uiReducer(state = initialState, action) {
  switch (action.type) {
    case SELECT_TICKER:
      return { ...state, selectedTicker: action.payload }; // new object, never mutate
    default:
      return state;                                         // unknown action: unchanged
  }
}
```

Rules:
- **Never mutate.** Copy every level you change with spread (`{ ...obj }`, `[...arr]`). Mutating
  in place keeps the same reference, so `useSelector` doesn't see a change and the UI doesn't update.
- **No side effects.** No API calls, timers, `Date.now()` or `Math.random()`.
- **Always handle `default`** by returning the current state.

`combineReducers` (`reducers/index.js`) merges the reducers into one `rootReducer`. Each one owns a
top-level key:

```js
state = {
  ui:        { selectedTicker },
  companies: { list, byTicker, quartersByTicker },
  watchlist: { items, status, error, add, remove },
}
```

Every action reaches **all** reducers. Each reacts only to the types it knows.

### Selectors (`selectors/`)
Functions `(state) => value` that read from the store. Components never touch the state shape
directly, so a shape change is fixed in one file.

```js
export const selectSelectedTicker = (state) => state.ui.selectedTicker;
export const selectCompanyEntry = (state, ticker) => state.companies.byTicker[ticker] ?? EMPTY_ENTRY;
```

**Rule:** `useSelector` re-renders the component whenever the selector's result is not `===` to
the previous one. A selector must therefore return existing state objects or a shared constant
(`EMPTY_ENTRY`), never build a new object or array on each call. Use a memoized selector
(the `reselect` library) when you need derived arrays or objects.

### react-redux hooks (in components)

| Hook | Purpose |
|---|---|
| `useSelector(selector)` | Read state and subscribe to its changes |
| `useDispatch()` | Get `dispatch` to send actions |
| `<Provider store>` | Makes the store available to the hooks (in `index.js`) |

---

## 4. Walkthroughs

### Selecting a company in the grid
1. AG Grid's selection handler calls `dispatch(selectTicker('IBM'))`.
2. `uiReducer` returns `{ selectedTicker: 'IBM' }`.
3. `LandingPage` re-renders. Its effect on `[selectedTicker]` dispatches
   `fetchCompanyByTicker('IBM')` and `fetchCompanyQuarters('IBM')`.
4. Each thunk dispatches `..._REQUEST`, calls the API, then dispatches `..._SUCCESS`.
5. `companiesReducer` stores the results under `byTicker.IBM` and `quartersByTicker.IBM`.
6. The selectors return the new entries, and the title and charts render.
7. Selecting IBM again sends **no requests**: the thunks find `status: 'succeeded'` and return early.

### Adding to the watchlist (a mutation)
1. The button calls `dispatch(addToWatchlist('IBM'))`.
2. The thunk dispatches `ADD_TO_WATCHLIST_REQUEST`, which sets `watchlist.add.status = 'loading'`.
   The button shows "Adding...".
3. It sends `POST /watchlist`, receives 201, and dispatches `ADD_TO_WATCHLIST_SUCCESS`.
4. It then dispatches `fetchWatchlist()` itself, the manual replacement for RTK Query's
   `invalidatesTags`. `GET /watchlist` returns the new list and the chips update.

In the browser's Network tab you'll see `POST /watchlist` followed by `GET /watchlist`.

---

## 5. RTK compared with legacy Redux, side by side

| Concern | Redux Toolkit (`main`) | Legacy Redux (this branch) |
|---|---|---|
| Store setup | `configureStore({ reducer })` | `legacy_createStore` + `applyMiddleware(thunk)` + DevTools compose |
| Action types | Generated from the slice name | `actionTypes.js` constants |
| Action creators | Generated by `createSlice` | Hand-written in `actions/` |
| Immutable updates | Immer: `state.x = y` | Manual spread copies |
| Async request states | `createAsyncThunk` or RTK Query | `REQUEST` / `SUCCESS` / `FAILURE` by hand |
| Fetch on render | `useGetXQuery()` | `useEffect` + `dispatch(fetchX())` |
| `skip` option | `{ skip: !ticker }` | `if (!ticker) return;` in the effect or thunk |
| Per-argument cache | Automatic | `byTicker[ticker]` maps + `shouldFetch` check |
| De-duplication | Automatic | `status === 'loading'` check in the thunk |
| Refetch after mutation | `providesTags` / `invalidatesTags` | Thunk dispatches `fetchWatchlist()` |
| `isLoading` / `isFetching` | Returned by the hook | Derived from `status` in selectors |
| Cache expiry | 60 s after last use (`keepUnusedDataFor`) | None: data stays until reload |

---

## 6. Known limitations of the hand-written version

These are things RTK Query handles that this branch deliberately does not, to keep the code
readable:
- **No cache expiry or refetch-on-focus.** Company data loaded once is reused until page reload.
- **Refetch skipped while loading.** If a mutation finishes while a `GET /watchlist` is already in
  flight, `fetchWatchlist()` returns early and the list can be one change behind. RTK Query
  handles this case.
- **No request cancellation.** Responses for an old selection still arrive, but they land in
  their own `byTicker` entry, so they never overwrite the current company.
- **More code to maintain.** Each new endpoint needs 3 action types, a thunk, reducer cases and
  selectors. That boilerplate is the main reason Redux Toolkit exists.

---

## 7. Debugging tips

- **Redux DevTools extension:** every action appears in order: `ui/SELECT_TICKER`, then
  `companies/FETCH_COMPANY_REQUEST`, then `..._SUCCESS`. You can inspect the state diff after each
  one and "time travel" by jumping to an earlier action.
- **React 19 StrictMode** runs effects twice in development. The thunks' `status` checks make this
  harmless: you'll see only one request per endpoint in the Network tab.
- **UI not updating** almost always means a reducer mutated state instead of returning a new
  object.
