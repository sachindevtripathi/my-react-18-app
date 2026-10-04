import React from 'react';
import { useNavigate } from 'react-router-dom';
import AgGridWrapper from '../components/AgGridWrapper';
import HighChartWrapper from '../components/HighChartWrapper';
import { computeStats } from '../utils/companyStats';
// Server state comes from TanStack Query hooks, client state from a React context.
import {
  useCompanies,
  useCompany,
  useQuarters,
  useWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
} from '../queries/companyQueries';
import { useSelectedTicker } from '../context/SelectedTickerContext';
import './LandingPage.css';

// Column definitions: `field` maps to a key in each company object returned by the API.
const columnDefs = [
  { field: 'name', headerName: 'Name' },
  { field: 'ticker', headerName: 'Ticker' },
  { field: 'quarter', headerName: 'Quarter' },
  { field: 'fiscalYear', headerName: 'Fiscal Year' },
  // valueFormatter only changes how the number is displayed; sorting/filtering still use the raw value.
  { field: 'revenue', headerName: 'Revenue', valueFormatter: (p) => p.value?.toLocaleString() },
  { field: 'netIncome', headerName: 'Net Income', valueFormatter: (p) => p.value?.toLocaleString() },
  { field: 'result', headerName: 'Result' },
  { field: 'employees', headerName: 'Employees', valueFormatter: (p) => p.value?.toLocaleString() },
  { field: 'hiring', headerName: 'Hiring', valueFormatter: (p) => (p.value ? 'Yes' : 'No') },
];

function LandingPage() {
  // navigate(path) changes the route from code (here: after a grid row is selected).
  const navigate = useNavigate();

  // ---- Client state (context) ---------------------------------------------------
  const { selectedTicker, setSelectedTicker } = useSelectedTicker(); // null = nothing selected

  // ---- Server state (TanStack Query) --------------------------------------------
  // Each hook fetches on first render and re-renders the component as the
  // request progresses. Components that use the same query key share one cache
  // entry and one request, so React 19 StrictMode's double render is harmless.
  const { data, isLoading, error } = useCompanies();

  // Disabled (no request) while selectedTicker is null.
  const { data: company, error: companyError } = useCompany(selectedTicker);
  const { data: quarters, error: quartersError } = useQuarters(selectedTicker);

  // isFetching is true during the first load AND during refetches after a mutation.
  const { data: watchlist = [], isFetching: watchlistFetching, error: watchlistError } = useWatchlist();
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlist();
  // Most recent error from either mutation, or from loading the list itself.
  const watchError = add.error || remove.error || watchlistError;

  // One stats object per quarter; each chart plots one metric across the quarters.
  const stats = quarters?.map(computeStats);
  // x-axis labels, e.g. ["Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"].
  const periods = quarters?.map((q) => `${q.quarter} ${q.fiscalYear}`) ?? [];

  // Message shown instead of the charts when there is nothing to plot.
  let placeholder = null;
  if (!selectedTicker) placeholder = 'Select a company in the grid to see its stats';
  else if (companyError || quartersError) {
    placeholder = `Could not load ${selectedTicker} (${(companyError || quartersError).status ?? 'error'})`;
  } else if (!stats) placeholder = 'Loading...';

  return (
    <div className="landing-page">
      <h1>Companies{company ? ` – ${company.name} (${company.ticker})` : ''}</h1>
      {error && <p>Oh no, there was an error: {error.status ?? error.message}</p>}

      {/* Watchlist bar: list from useWatchlist + buttons that run the mutations */}
      <div className="watchlist-bar">
        <button
          disabled={!selectedTicker || add.isPending}
          onClick={() => add.mutate(selectedTicker)}
        >
          {add.isPending ? 'Adding...' : `Watch ${selectedTicker ?? ''}`}
        </button>

        <span>Watchlist{watchlistFetching ? ' (refreshing...)' : ''}:</span>
        {watchlist.length === 0 && <span className="muted">empty</span>}
        {watchlist.map((ticker) => (
          <span key={ticker} className="watch-chip">
            {ticker}
            <button title={`Remove ${ticker}`} onClick={() => remove.mutate(ticker)}>×</button>
          </span>
        ))}
        {watchError && <span className="error">Error: {watchError.message}</span>}
      </div>

      {/* Part 1 (30%): stats charts for the selected company */}
      <div className="div-part-1">
        {placeholder ? (
          <div className="chart-placeholder">{placeholder}</div>
        ) : (
          <>
            <div className="chart-box">
              <HighChartWrapper
                title="Net profit margin %"
                categories={periods}
                data={stats.map((s) => s.netProfitMargin)}
                type="line"
                yAxisTitle="%"
                color="#2f7ed8"
              />
            </div>
            <div className="chart-box">
              <HighChartWrapper
                title="Revenue per employee"
                categories={periods}
                data={stats.map((s) => s.revenuePerEmployee)}
                type="line"
                yAxisTitle="$K"
                color="#0d233a"
              />
            </div>
            <div className="chart-box">
              <HighChartWrapper
                title="Net income per employee"
                categories={periods}
                data={stats.map((s) => s.netIncomePerEmployee)}
                type="line"
                yAxisTitle="$K"
                color="#8bbc21"
              />
            </div>
          </>
        )}
      </div>

      {/* Part 2 (70%): reusable grid wrapper; selecting a row sets the ticker and opens its details page. */}
      <div className="div-part-2">
        <AgGridWrapper
          rowData={data}
          columnDefs={columnDefs}
          loading={isLoading}
          height="100%"
          onRowSelected={(row) => {
            setSelectedTicker(row?.ticker ?? null);
            // Opens the details page; row is undefined when the selection is cleared.
            if (row) navigate(`/company/${row.ticker}`);
          }}
        />
      </div>
    </div>
  );
}

export default LandingPage;
