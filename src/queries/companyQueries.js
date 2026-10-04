/**
 * COMPANY QUERIES AND MUTATIONS
 *
 * Every piece of server data the app uses is read through one of these hooks.
 *
 *   useQuery({ queryKey, queryFn })
 *     queryKey  identifies the cache entry. Same key = same entry, shared by
 *               every component that uses it, and requests for it are
 *               de-duplicated.
 *     queryFn   fetches the data (our plain functions in services/companyApi.js).
 *               It receives { queryKey, signal, ... }. We pass `signal` on to
 *               fetch(): if every component using the query unmounts before
 *               the response arrives (e.g. the user navigates away), TanStack
 *               aborts the request instead of downloading data nobody needs.
 *     returns   { data, error, isLoading, isFetching, ... }
 *
 *   useMutation({ mutationFn, onSuccess })
 *     returns   { mutate, isPending, error, ... }
 *     After a successful change we invalidate the affected query: TanStack
 *     marks it stale and refetches it for every component that shows it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/companyApi';

// One place that defines the keys, so a query and its invalidation can't drift apart.
export const queryKeys = {
  companies: ['companies'],
  company: (ticker) => ['company', ticker],
  quarters: (ticker) => ['quarters', ticker],
  watchlist: ['watchlist'],
};

// ---- queries ---------------------------------------------------------------------

// GET /companies
export const useCompanies = () =>
  useQuery({ queryKey: queryKeys.companies, queryFn: ({ signal }) => api.getCompanies({ signal }) });

// GET /companies/:ticker. `enabled: false` means "don't fetch yet": nothing is
// requested until a ticker is selected.
export const useCompany = (ticker) =>
  useQuery({
    queryKey: queryKeys.company(ticker),
    queryFn: ({ signal }) => api.getCompanyByTicker(ticker, { signal }),
    enabled: !!ticker,
  });

// GET /companies/:ticker/quarters
export const useQuarters = (ticker) =>
  useQuery({
    queryKey: queryKeys.quarters(ticker),
    queryFn: ({ signal }) => api.getCompanyQuarters(ticker, { signal }),
    enabled: !!ticker,
  });

// GET /watchlist
export const useWatchlist = () =>
  useQuery({ queryKey: queryKeys.watchlist, queryFn: ({ signal }) => api.getWatchlist({ signal }) });

// ---- mutations -------------------------------------------------------------------

// Returning the invalidateQueries promise from onSuccess keeps the mutation
// "pending" until the refetched watchlist has arrived, so buttons don't flicker
// between the old and new state.
function useWatchlistMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.watchlist }),
  });
}

// POST /watchlist. Usage: const add = useAddToWatchlist(); add.mutate('AAPL');
export const useAddToWatchlist = () => useWatchlistMutation(api.addToWatchlist);

// DELETE /watchlist/:ticker
export const useRemoveFromWatchlist = () => useWatchlistMutation(api.removeFromWatchlist);
