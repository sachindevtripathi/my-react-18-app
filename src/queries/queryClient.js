/**
 * QUERY CLIENT
 *
 * The QueryClient owns TanStack Query's cache: one entry per query key, each
 * holding { data, error, status, fetchStatus, dataUpdatedAt, ... }.
 * It is provided to the whole app once, in src/index.js, with
 * <QueryClientProvider client={queryClient}>.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // TanStack's default is 0: data is "stale" at once, so it refetches
      // whenever a component using it mounts or the browser tab regains focus.
      // Company figures change once a quarter, so we keep data fresh until a
      // mutation invalidates it. Unused entries are still removed from the
      // cache after 5 minutes (gcTime, default).
      staleTime: Infinity,
      // The default is 3 retries with back-off, which would delay a 404
      // ("unknown ticker") by several seconds. Retry only network/server errors.
      retry: (failureCount, error) => !(error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
});
