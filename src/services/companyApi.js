/**
 * Plain HTTP client for the company API.
 *
 * The HTTP layer knows nothing about Redux: it just returns promises. The
 * thunks in src/store/actions/ call these functions and dispatch actions with
 * the results.
 */

const BASE_URL = 'http://localhost:4000/api';

/**
 * Small wrapper around fetch().
 * fetch() only rejects on network failure, NOT on 404/500, so we check
 * `response.ok` ourselves and throw an error carrying the status and the
 * server's `{ error: "..." }` message (e.g. "unknown ticker").
 */
async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  // 204 No Content (e.g. DELETE) has no body to parse.
  const body = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(body?.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

// GET /companies -> { count, data: [...] }; we return only the array.
export const getCompanies = () => request('/companies/').then((body) => body.data);

// GET /companies/:ticker -> single company object (404 if the ticker is unknown).
export const getCompanyByTicker = (ticker) => request(`/companies/${ticker}`);

// GET /companies/:ticker/quarters -> { count, data: [...] }, last 4 quarters oldest -> newest.
export const getCompanyQuarters = (ticker) =>
  request(`/companies/${ticker}/quarters`).then((body) => body.data);

// GET /watchlist -> { count, data: ['AAPL', ...] }
export const getWatchlist = () => request('/watchlist').then((body) => body.data);

// POST /watchlist { ticker } -> 201 { ticker }
export const addToWatchlist = (ticker) =>
  request('/watchlist', { method: 'POST', body: JSON.stringify({ ticker }) });

// DELETE /watchlist/:ticker -> 204
export const removeFromWatchlist = (ticker) =>
  request(`/watchlist/${ticker}`, { method: 'DELETE' });
