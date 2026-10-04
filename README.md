# State management: three ways

This repo builds the same app (a companies grid, per-company charts, a details page and a
watchlist) three times, each with a different approach to state management:

| Branch | Server state (API data) | Client state (`selectedTicker`) |
|---|---|---|
| `main` | Redux Toolkit **RTK Query** (`createApi`) | Redux Toolkit `createSlice` |
| `redux-old` | Hand-written **Redux**: action types, thunks, reducers, selectors | Hand-written Redux reducer |
| `react-query-tanstack-context` (**this branch**) | **TanStack Query** (`useQuery` / `useMutation`) | **React Context** + `useState` |

Stack on this branch: React 19, `@tanstack/react-query` 5 (+ `@tanstack/react-query-devtools`),
React Router 7. There is **no Redux**.

**Running it:** start the company API on `http://localhost:4000`, then run `npm start` and open
`http://localhost:3000`. Click a grid row to open `/company/<TICKER>`.

- [Part 1: TanStack Query + Context (this branch)](#part-1-tanstack-query--context-this-branch)
- [Part 2: RTK vs redux-old vs TanStack + Context](#part-2-rtk-vs-redux-old-vs-tanstack--context)
- [Part 3: The redux-old version, for reference](#part-3-the-redux-old-version-for-reference)

---

# Part 1: TanStack Query + Context (this branch)

## 1.1 Two kinds of state

| Kind | What it is | In this app | Owner |
|---|---|---|---|
| **Server state** | A local copy of data that lives on the server. It can go stale, needs loading and error states, caching and refetching | companies list, company by ticker, quarters, watchlist | **TanStack Query** |
| **Client state** | Exists only in the browser | `selectedTicker` | **React Context** |

In both Redux versions, one store holds both kinds. Most of the Redux code, especially in
`redux-old`, exists to manage server state by hand. TanStack Query is a library built only for
server state, so that code disappears. What's left, a single value, doesn't need a store: a
Context is enough.

## 1.2 The data flow

```
                   ┌──────────────────────────── QueryClient cache ───────────────────────────┐
                   │  ['companies']   ['company','AAPL']   ['quarters','AAPL']   ['watchlist'] │
                   └───────▲───────────────────────────┬──────────────────────────▲───────────┘
          queryFn: fetch   │                           │ data / isLoading / error │ invalidateQueries
          (companyApi.js)  │                           ▼                          │ (after a mutation)
                   ┌───────┴───────────────────────────────────────────┐  ┌───────┴──────────┐
                   │ Component: useQuery({ queryKey, queryFn })        │  │ useMutation(...) │
                   │            useSelectedTicker()  ◀── Context ──┐   │  │   .mutate('AAPL')│
                   └───────────────────────────────────────────────┼───┘  └──────────────────┘
                                                                   │
                                          SelectedTickerProvider: useState(selectedTicker)
```

1. A component calls `useQuery({ queryKey, queryFn })`.
2. If the cache has fresh data for that key, it is returned immediately with no request.
   Otherwise TanStack calls `queryFn` (our `fetch` wrapper). It never sends two requests for the
   same key at once.
3. The component re-renders as the request moves through `isLoading`, then `data` or `error`.
   Every component using the same key shares the same cache entry.
4. A mutation (`useMutation`) changes server data, then **invalidates** the affected key.
   TanStack refetches it, and every component showing it updates.
5. Client state goes through ordinary React: `useState` inside a provider, read with `useContext`.

## 1.3 Folder structure

```
src/
├── services/
│   └── companyApi.js              HTTP only: fetch() wrappers that return promises
├── queries/
│   ├── queryClient.js             the QueryClient (cache) + default options
│   └── companyQueries.js          query keys, useCompanies/useCompany/useQuarters/useWatchlist,
│                                  useAddToWatchlist/useRemoveFromWatchlist
├── context/
│   └── SelectedTickerContext.js   SelectedTickerProvider + useSelectedTicker()
├── pages/
│   ├── LandingPage.js             grid + charts + watchlist bar; row click opens details
│   └── CompanyDetailsPage.js      /company/:ticker: all fields, metrics, charts, Watch button
└── index.js                       QueryClientProvider > SelectedTickerProvider > BrowserRouter
```

## 1.4 The building blocks

### QueryClient and provider (`queries/queryClient.js`, `index.js`)
The `QueryClient` holds the cache. `<QueryClientProvider client={queryClient}>` makes it
available to every hook, as `<Provider store>` did for Redux.

Two defaults are changed on purpose:

| Option | TanStack default | Here | Why |
|---|---|---|---|
| `staleTime` | `0`: data is stale at once, so it refetches on mount and on window focus | `Infinity` | Company figures change once a quarter. This also matches the other branches' behaviour. Mutations still refresh data through invalidation. |
| `retry` | 3 retries with back-off | No retry on 4xx; up to 2 on network or 5xx errors | A 404 for an unknown ticker should show at once, not after about 7 s of retries |

Unused cache entries are removed 5 minutes after the last component using them unmounts
(`gcTime`, default).

### Query keys (`queries/companyQueries.js`)
The key is the cache's address. Same key, same entry:

```js
export const queryKeys = {
  companies: ['companies'],
  company: (ticker) => ['company', ticker],      // ['company', 'AAPL']
  quarters: (ticker) => ['quarters', ticker],
  watchlist: ['watchlist'],
};
```

Keys are arrays, so each argument gets its own entry. That gives a per-ticker cache with no extra
code. Keeping all keys in one object means a query and its invalidation can't drift apart.

### Queries: `useQuery`
```js
export const useQuarters = (ticker) =>
  useQuery({
    queryKey: queryKeys.quarters(ticker),
    queryFn: () => api.getCompanyQuarters(ticker),
    enabled: !!ticker,            // don't fetch until a ticker is selected
  });

// in a component
const { data: quarters, error, isLoading, isFetching } = useQuarters(selectedTicker);
```

| Field | Meaning |
|---|---|
| `data` | The cached result (`undefined` until the first success) |
| `error` | The thrown `Error`, with `error.status` from `companyApi.js` |
| `isLoading` | First load, no data yet |
| `isFetching` | Any request in flight, including background refetches |

There is no `useEffect` and no `dispatch`: the hook fetches when the component renders.

### Mutations: `useMutation` + invalidation
```js
function useWatchlistMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    // Returning the promise keeps isPending true until the new list has arrived.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.watchlist }),
  });
}

// in a component
const add = useAddToWatchlist();
<button disabled={add.isPending} onClick={() => add.mutate('AAPL')}>Watch</button>
```

A mutation doesn't run on render. `mutate(...)` runs it, and `isPending` and `error` describe the
latest run.

### Client state: Context (`context/SelectedTickerContext.js`)
```js
export function SelectedTickerProvider({ children }) {
  const [selectedTicker, setSelectedTicker] = useState(null);
  const value = useMemo(() => ({ selectedTicker, setSelectedTicker }), [selectedTicker]);
  return <SelectedTickerContext value={value}>{children}</SelectedTickerContext>; // React 19 syntax
}

export function useSelectedTicker() {
  const context = useContext(SelectedTickerContext);
  if (!context) throw new Error('useSelectedTicker must be used inside <SelectedTickerProvider>');
  return context;
}
```

**Why Context, not `useState` in `LandingPage`?** Clicking a row navigates to the details page,
which unmounts `LandingPage`. State inside it would be lost, so "← All companies" would come back
to an empty selection. The provider wraps the router in `index.js`, so it stays mounted across
routes.

## 1.5 Walkthroughs

### Selecting a company in the grid
1. The grid's `onRowSelected` calls `setSelectedTicker('MSFT')` and `navigate('/company/MSFT')`.
   React handles both updates in one render, so the next screen is already the details page.
2. `CompanyDetailsPage` calls `useCompany('MSFT')` and `useQuarters('MSFT')`, which find nothing
   in the cache and send `GET /companies/MSFT` and `GET /companies/MSFT/quarters`.
3. "← All companies" goes back. `LandingPage` mounts again and reads `'MSFT'` from the Context, so
   the selection is still there. Its `useCompany('MSFT')` and `useQuarters('MSFT')` use the
   **same keys** as the details page, so the title and charts render from the cache with
   **no requests**.

### Watching a company (a mutation)
1. On `/company/AAPL`, the Watch button calls `add.mutate('AAPL')`. `isPending` disables it.
2. `POST /watchlist` succeeds. `onSuccess` invalidates `['watchlist']`.
3. TanStack refetches `GET /watchlist` for every mounted component using it. The button turns into
   "Unwatch AAPL", and `isPending` becomes false only after the new list has arrived.

The Network tab shows `POST /watchlist` and then `GET /watchlist`, the same sequence as the Redux
versions, now driven by the cache instead of by your code.

### Unknown ticker
`/company/ZZZZ` gets a 404. `retry` skips 4xx errors, so the page shows "Could not load ZZZZ (404):
Company not found" immediately.

## 1.6 Rules worth keeping

- **Server data never goes into Context.** Copying API data into Context or `useState` brings back
  the hand-written loading, error and cache handling that TanStack does for you. Read it with
  `useQuery` wherever it's needed: the cache makes repeated reads free.
- **Context has no selectors.** Every consumer re-renders when the context value changes. That's
  fine for one value. If client state grows, split it into several small contexts, or add a
  client-state library such as Zustand or Redux.
- **Memoize the provider value** (`useMemo`), or consumers re-render whenever the provider does.
- **Keep keys consistent.** `['company', 'AAPL']` and `['company', 'aapl']` are different entries.
  The details page upper-cases the URL ticker for this reason.

## 1.7 Debugging

- **TanStack Query Devtools:** the floating button at the bottom of the page (development builds
  only). It shows every key, its status (fresh, stale, fetching, inactive), its data, and buttons
  to refetch or invalidate it by hand.
- **React DevTools:** select `SelectedTickerProvider` to see the current `selectedTicker`.
- **React 19 StrictMode** renders twice in development. TanStack combines identical requests,
  so the Network tab still shows one request per key.

---

# Part 2: RTK vs redux-old vs TanStack + Context

## 2.1 At a glance

| Concern | RTK (`main`) | Legacy Redux (`redux-old`) | TanStack + Context (this branch) |
|---|---|---|---|
| Libraries | `@reduxjs/toolkit`, `react-redux` | `redux`, `redux-thunk`, `react-redux` | `@tanstack/react-query` |
| State code (incl. comments) | about 125 lines, 3 files | about 590 lines, 13 files | about 185 lines, 4 files |
| Where server data lives | In the Redux store (`state.companyApi`) | In the Redux store (`state.companies`, `state.watchlist`) | TanStack's own cache, outside React state |
| Where client state lives | Redux slice (`createSlice`) | Redux reducer | `useState` in a Context provider |
| Setup | `configureStore` + api middleware | `legacy_createStore` + `applyMiddleware(thunk)` + DevTools compose | `new QueryClient()` + `<QueryClientProvider>` |
| Fetching | Generated hooks `useGetXQuery()` | `useEffect` + `dispatch(fetchX())` | `useQuery({ queryKey, queryFn })` |
| Don't fetch yet | `{ skip: !ticker }` | `if (!ticker) return;` | `enabled: !!ticker` |
| Cache key | Endpoint + argument (automatic) | `byTicker[ticker]` maps, by hand | `queryKey` array, e.g. `['quarters', ticker]` |
| De-duplication | Automatic | `status === 'loading'` checks in thunks | Automatic |
| Loading flags | `isLoading`, `isFetching` | Derived from `status` in selectors | `isLoading`, `isFetching` |
| Mutations | `useXMutation()` returns `[trigger, state]` | Thunk with REQUEST/SUCCESS/FAILURE | `useMutation()` returns `{ mutate, isPending, error }` |
| Refetch after mutation | `providesTags` / `invalidatesTags` (tags) | The thunk dispatches `fetchWatchlist()` | `invalidateQueries({ queryKey })` (keys) |
| Unused data dropped after | 60 s (`keepUnusedDataFor`) | Never, until reload | 5 min (`gcTime`) |
| Refetch on focus/reconnect | Opt-in (`refetchOnFocus` + `setupListeners`) | Not available | On by default for stale data (off here via `staleTime: Infinity`) |
| Error objects | Plain `{ status, data }` | Converted by hand to `{ status, message }` | `Error` instances are fine (not in Redux) |
| Debugging tool | Redux DevTools | Redux DevTools | TanStack Query Devtools + React DevTools |
| Read state outside React | `store.getState()` | `store.getState()` | `queryClient.getQueryData(key)` |

## 2.2 The same feature three ways: fetch the selected company's quarters

**RTK Query (`main`)**: define an endpoint once and the hook is generated:
```js
getCompanyQuarters: builder.query({
  query: (ticker) => `/companies/${ticker}/quarters`,
  transformResponse: (response) => response.data,
}),
// component
const { data: quarters } = useGetCompanyQuartersQuery(selectedTicker, { skip: !selectedTicker });
```

**Legacy Redux (`redux-old`)**: 3 action types, a thunk, 3 reducer cases, a selector and an effect:
```js
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
// + reducer cases for REQUEST / SUCCESS / FAILURE, + selectQuartersEntry, and in the component:
useEffect(() => { if (selectedTicker) dispatch(fetchCompanyQuarters(selectedTicker)); }, [dispatch, selectedTicker]);
const { data: quarters } = useSelector((state) => selectQuartersEntry(state, selectedTicker));
```

**TanStack Query (this branch)**: one hook around the plain API function:
```js
export const useQuarters = (ticker) =>
  useQuery({ queryKey: ['quarters', ticker], queryFn: () => api.getCompanyQuarters(ticker), enabled: !!ticker });
// component
const { data: quarters } = useQuarters(selectedTicker);
```

## 2.3 The same feature three ways: store the selected ticker

| | RTK (`main`) | Legacy Redux (`redux-old`) | Context (this branch) |
|---|---|---|---|
| Define | `createSlice({ name: 'ui', reducers: { selectTicker } })` | Action type + action creator + reducer + selector | `useState` inside `SelectedTickerProvider` |
| Read | `useSelector(selectSelectedTicker)` | `useSelector(selectSelectedTicker)` (or `connect`) | `useSelectedTicker().selectedTicker` |
| Write | `dispatch(selectTicker('IBM'))` | `dispatch(selectTicker('IBM'))` | `setSelectedTicker('IBM')` |
| Re-render rule | Only if the selected value changed | Only if the selected value changed | Every consumer, whenever the value changes |

## 2.4 Which one when?

- **TanStack + Context**: most apps whose state is mainly server data plus a little UI state.
  Least code, and the best caching features (stale-while-revalidate, refetch on focus, retries,
  pagination and infinite queries).
- **RTK (+ RTK Query)**: apps with a lot of shared client state (complex forms, editors,
  multi-step workflows) that benefit from Redux's single store, selectors, middleware and
  time-travel debugging. RTK Query keeps the server cache in the same store and DevTools.
- **Hand-written Redux**: for learning how Redux works, or maintaining older code. RTK replaces it
  in new code; that boilerplate is why RTK exists.

---

# Part 3: The redux-old version, for reference

The files described here live on the **`redux-old` branch** (`git checkout redux-old`). They were
removed from this branch. This part explains what TanStack Query and Context replaced.

## 3.1 The one-way data flow

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

## 3.2 Folder structure

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

## 3.3 The building blocks

### Store (`store.js`)
The single object that holds the whole state tree. It has three methods:

| Method | Purpose |
|---|---|
| `getState()` | Read the current state |
| `dispatch(action)` | Send an action through middleware and reducers |
| `subscribe(listener)` | Get notified after each dispatch. `react-redux` uses this internally |

It's created with `legacy_createStore(rootReducer, enhancer)`. Redux 5 marks the plain
`createStore` name as deprecated; `legacy_createStore` is the identical function. The enhancer
adds the thunk middleware and the Redux DevTools browser extension.

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

`getState()` lets a thunk skip requests whose data is already loaded or in flight. That is the
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

### Connecting components: hooks and `connect()`

| API | Purpose |
|---|---|
| `useSelector(selector)` | Read state and subscribe to its changes |
| `useDispatch()` | Get `dispatch` to send actions |
| `connect(mapStateToProps, mapDispatchToProps)(Component)` | The older HOC form: state and bound action creators arrive as props (`CompanyDetailsPage` on `redux-old`) |
| `<Provider store>` | Makes the store available to both (in `index.js`) |

## 3.4 Walkthroughs

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
4. It then dispatches `fetchWatchlist()` itself to reload the list. `GET /watchlist` returns the
   new list and the chips update.

## 3.5 Known limitations of the hand-written version

- **No cache expiry or refetch-on-focus.** Company data loaded once is reused until page reload.
- **Refetch skipped while loading.** If a mutation finishes while a `GET /watchlist` is already in
  flight, `fetchWatchlist()` returns early and the list can be one change behind.
- **No request cancellation.** Responses for an old selection still arrive, but they land in
  their own `byTicker` entry, so they never overwrite the current company.
- **More code to maintain.** Each new endpoint needs 3 action types, a thunk, reducer cases and
  selectors.

## 3.6 Thunks in one paragraph

A **thunk** is an action creator that returns a function instead of an object.
`dispatch(fetchCompanies())` hands that function to `redux-thunk`, whose core is
`if (typeof action === 'function') return action(dispatch, getState);`. The function then
dispatches ordinary `_REQUEST`, `_SUCCESS` and `_FAILURE` objects; only those reach the reducers.
In Redux DevTools you see those actions, never the thunk itself.

## 3.7 Debugging tips

- **Redux DevTools extension:** every action appears in order: `ui/SELECT_TICKER`, then
  `companies/FETCH_COMPANY_REQUEST`, then `..._SUCCESS`. You can inspect the state diff after each
  one and "time travel" by jumping to an earlier action.
- **React 19 StrictMode** runs effects twice in development. The thunks' `status` checks make this
  harmless: you'll see only one request per endpoint in the Network tab.
- **UI not updating** almost always means a reducer mutated state instead of returning a new
  object.
