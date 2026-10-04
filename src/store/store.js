/**
 * STORE
 *
 * The store holds the whole state tree. It exposes three methods:
 *   getState()          read the current state
 *   dispatch(action)    send an action: middleware, then rootReducer, then new state
 *   subscribe(listener) be notified after every dispatch (react-redux does this for us)
 *
 * Here we wire it up by hand. configureStore in RTK did the same three steps
 * (reducer + thunk middleware + DevTools) automatically.
 */
import { legacy_createStore as createStore, applyMiddleware, compose } from 'redux';
import { thunk } from 'redux-thunk';
import rootReducer from './reducers';

// Redux 5 marks plain `createStore` as deprecated to steer people to RTK.
// `legacy_createStore` is the same function without the deprecation notice.

// Redux DevTools browser extension: use its compose if installed, otherwise
// fall back to the normal compose from redux.
const composeEnhancers =
  (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;

// Middleware sits between dispatch() and the reducers. redux-thunk lets
// dispatch() accept functions (our async action creators in ./actions).
const enhancer = composeEnhancers(applyMiddleware(thunk));

export const store = createStore(rootReducer, enhancer);
