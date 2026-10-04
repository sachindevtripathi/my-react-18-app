/**
 * WATCHLIST SELECTORS
 *
 * Flags derived from the watchlist state:
 *   selectWatchlistFetching                                  any GET /watchlist in flight
 *   selectIsAddingToWatchlist / selectIsRemovingFromWatchlist a mutation in flight
 *   selectWatchlistError                                     most recent error
 */

export const selectWatchlist = (state) => state.watchlist.items;
export const selectWatchlistStatus = (state) => state.watchlist.status;

// True during the first load AND during refetches after a mutation.
export const selectWatchlistFetching = (state) => state.watchlist.status === 'loading';

export const selectIsAddingToWatchlist = (state) => state.watchlist.add.status === 'loading';
export const selectIsRemovingFromWatchlist = (state) => state.watchlist.remove.status === 'loading';

// Booleans are compared by value, so deriving one here is safe.
export const selectIsInWatchlist = (state, ticker) => state.watchlist.items.includes(ticker);

// Most recent error from either mutation, or from loading the list itself.
// Returns an object that already lives in the state, so it is stable for useSelector.
export const selectWatchlistError = (state) =>
  state.watchlist.add.error || state.watchlist.remove.error || state.watchlist.error;
