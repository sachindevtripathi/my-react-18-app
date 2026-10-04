import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Define a service using a base URL and expected endpoints
export const companyApi = createApi({
  reducerPath: 'companyApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:4000/api/' }),
  endpoints: (builder) => ({
    getCompanies: builder.query({
      query: () => '/companies/',
      
      transformResponse: (response) => response.data,
    }),

    // GET /companies/:ticker -> a single company, e.g. getCompanyByTicker('NVDA').
    // For an unknown ticker the server returns 404; RTK Query exposes that as
    // `error.status === 404` in the hook result.
    getCompanyByTicker: builder.query({
      query: (ticker) => `/companies/${ticker}`,
    }),

    // GET /companies/:ticker/quarters -> last 4 quarters for that company,
    // intended as the data source for Highcharts / D3 line charts.
    getCompanyQuarters: builder.query({
      query: (ticker) => `/companies/${ticker}/quarters`,
      // Response is { count, data: [...] }; keep only the array (oldest -> newest quarter).
      transformResponse: (response) => response.data,
    }),

    // ---- Watchlist ----------------------------------------------------------
    // LEARNING STEP 1: these endpoints deliberately have NO tags yet.
    // After a mutation succeeds, RTK Query doesn't know getWatchlist is stale,
    // so the list on screen keeps showing the old cached data.
    // Step 2 fixes this with providesTags / invalidatesTags.

    // GET /watchlist -> ['AAPL', 'IBM', ...]
    getWatchlist: builder.query({
      query: () => '/watchlist',
      tagTypes: ['Watchlist'], // Mark this query as providing the 'Company' tag
      providesTags: ['Watchlist'], // Mark this mutation as providing the 'Watchlist' tag
      transformResponse: (response) => response.data,
    }),

    // Mutations use builder.mutation and return a request object
    // (url + method + body) instead of just a URL string.
    // POST /watchlist { ticker }
    addToWatchlist: builder.mutation({
      query: (ticker) => ({ url: '/watchlist', method: 'POST', body: { ticker } }),
      invalidatesTags: ['Watchlist'], // Mark this mutation as invalidating the 'Watchlist' tag
    }),

    // DELETE /watchlist/:ticker
    removeFromWatchlist: builder.mutation({
      query: (ticker) => ({ url: `/watchlist/${ticker}`, method: 'DELETE' }),
      invalidatesTags: ['Watchlist'], // Mark this mutation as invalidating the 'Watchlist' tag
    }),
    }),
  
});

// Export hooks for usage in functional components, which are auto-generated
export const {
  useGetCompaniesQuery,
  useGetCompanyByTickerQuery,
  useGetCompanyQuartersQuery,
  useGetWatchlistQuery,
  // Mutation hooks are named use<Endpoint>Mutation.
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} = companyApi;
export default companyApi;
