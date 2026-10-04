/**
 * WATCHLIST SELECTORS
 *
 * These rebuild the flags RTK Query's hooks used to return:
 *   isFetching -> selectWatchlistFetching   (any request in flight)
 *   mutation isLoading / error -> selectIsAddingToWatchlist / selectWatchlistMutationError
 */

export const selectWatchlist = (state) => state.watchlist.items;
export const selectWatchlistStatus = (state) => state.watchlist.status;

// True during the first load AND during refetches after a mutation.
export const selectWatchlistFetching = (state) => state.watchlist.status === 'loading';

export const selectIsAddingToWatchlist = (state) => state.watchlist.add.status === 'loading';

// Most recent error from either mutation, or from loading the list itself.
// Returns an object that already lives in the state, so it is stable for useSelector.
export const selectWatchlistError = (state) =>
  state.watchlist.add.error || state.watchlist.remove.error || state.watchlist.error;
