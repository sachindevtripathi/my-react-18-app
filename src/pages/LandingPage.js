import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AgGridWrapper from '../components/AgGridWrapper';
import HighChartWrapper from '../components/HighChartWrapper';
import {
  useGetCompaniesQuery,
  useGetCompanyByTickerQuery,
  useGetCompanyQuartersQuery,
  useGetWatchlistQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from '../services/companyApi';
import { selectTicker, selectSelectedTicker } from '../store/uiSlice';
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

// Rounds to 2 decimals so tooltips/labels stay readable.
const round = (n) => Math.round(n * 100) / 100;

// Derived ("artificial") stats from revenue, net income and employees.
// ASSUMPTION: revenue and netIncome are in $ millions, so "* 1000" converts
// the per-employee figures to $ thousands.
function computeStats({ revenue, netIncome, employees }) {
  return {
    // Share of revenue kept as profit.
    netProfitMargin: round((netIncome / revenue) * 100),
    // Sales generated per employee ($K).
    revenuePerEmployee: round((revenue * 1000) / employees),
    // Profit generated per employee ($K).
    netIncomePerEmployee: round((netIncome * 1000) / employees),
  };
}

function LandingPage() {
  // Ticker of the row selected in the grid, read from the Redux "ui" slice
  // (null = nothing selected). Any component can read it the same way.
  const selectedTicker = useSelector(selectSelectedTicker);
  // dispatch sends actions such as selectTicker('IBM') to the store.
  const dispatch = useDispatch();

  // RTK Query hook: fetches /companies/ and exposes loading/error state.
  // `data` is already the array thanks to transformResponse in companyApi.js.
  const { data, error, isLoading } = useGetCompaniesQuery();

  // Fetch the full record for the selected company. `skip` prevents the request
  // until a row has been selected.
  const { data: company, error: companyError } = useGetCompanyByTickerQuery(
    selectedTicker,
    { skip: !selectedTicker }
  );

  // Last 4 quarters for the selected company (oldest -> newest), used for the line charts.
  const { data: quarters, error: quartersError } = useGetCompanyQuartersQuery(
    selectedTicker,
    { skip: !selectedTicker }
  );

  // One stats object per quarter; each chart plots one metric across the quarters.
  const stats = quarters?.map(computeStats);
  // x-axis labels, e.g. ["Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"].
  const periods = quarters?.map((q) => `${q.quarter} ${q.fiscalYear}`) ?? [];

  // Watchlist query: fetched once and cached like any other query.
  const { data: watchlist = [], isFetching: watchlistFetching } = useGetWatchlistQuery();

  // A mutation hook does NOT run on render. It returns a tuple:
  //   [triggerFunction, { isLoading, error, ... }]
  // The request is only sent when you call the trigger function.
  const [addToWatchlist, { isLoading: adding, error: addError }] = useAddToWatchlistMutation();
  const [removeFromWatchlist, { error: removeError }] = useRemoveFromWatchlistMutation();
  const watchError = addError || removeError;

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

      {/* Watchlist bar: shows the cached getWatchlist result and the mutation buttons */}
      <div className="watchlist-bar">
        <button
          disabled={!selectedTicker || adding}
          // .unwrap() would turn the result into a promise that throws on error;
          // here we just read `addError` from the hook instead.
          onClick={() => addToWatchlist(selectedTicker)}
        >
          {adding ? 'Adding...' : `Watch ${selectedTicker ?? ''}`}
        </button>

        <span>Watchlist{watchlistFetching ? ' (refreshing...)' : ''}:</span>
        {watchlist.length === 0 && <span className="muted">empty</span>}
        {watchlist.map((ticker) => (
          <span key={ticker} className="watch-chip">
            {ticker}
            <button title={`Remove ${ticker}`} onClick={() => removeFromWatchlist(ticker)}>×</button>
          </span>
        ))}
        {watchError && <span className="error">Error: {watchError.data?.error ?? watchError.status}</span>}
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

      {/* Part 2 (70%): reusable grid wrapper; selecting a row sets the ticker above. */}
      <div className="div-part-2">
        <AgGridWrapper
          rowData={data}
          columnDefs={columnDefs}
          loading={isLoading}
          height="100%"
          onRowSelected={(row) => dispatch(selectTicker(row?.ticker))}
        />
      </div>
    </div>
  );
}

export default LandingPage;
