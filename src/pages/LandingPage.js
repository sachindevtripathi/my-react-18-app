import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AgGridWrapper from '../components/AgGridWrapper';
import HighChartWrapper from '../components/HighChartWrapper';
// Legacy Redux: action creators (plain + thunks) and selectors, all hand-written.
import { selectTicker } from '../store/actions/uiActions';
import { fetchCompanies, fetchCompanyByTicker, fetchCompanyQuarters } from '../store/actions/companyActions';
import { fetchWatchlist, addToWatchlist, removeFromWatchlist } from '../store/actions/watchlistActions';
import { selectSelectedTicker } from '../store/selectors/uiSelectors';
import {
  selectCompanies,
  selectCompaniesError,
  selectCompaniesLoading,
  selectCompanyEntry,
  selectQuartersEntry,
} from '../store/selectors/companySelectors';
import {
  selectWatchlist,
  selectWatchlistFetching,
  selectIsAddingToWatchlist,
  selectWatchlistError,
} from '../store/selectors/watchlistSelectors';
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
  // dispatch sends actions to the store: plain objects, or thunks (functions)
  // that redux-thunk runs for us.
  const dispatch = useDispatch();

  // ---- Read state with selectors ------------------------------------------------
  // useSelector subscribes this component to the store and re-renders it when
  // the selected value changes (compared with ===).
  const selectedTicker = useSelector(selectSelectedTicker); // null = nothing selected

  const data = useSelector(selectCompanies);
  const isLoading = useSelector(selectCompaniesLoading);
  const error = useSelector(selectCompaniesError);

  // Per-ticker cache entries: { data, status, error }.
  const { data: company, error: companyError } = useSelector((state) =>
    selectCompanyEntry(state, selectedTicker)
  );
  const { data: quarters, error: quartersError } = useSelector((state) =>
    selectQuartersEntry(state, selectedTicker)
  );

  const watchlist = useSelector(selectWatchlist);
  const watchlistFetching = useSelector(selectWatchlistFetching);
  const adding = useSelector(selectIsAddingToWatchlist);
  const watchError = useSelector(selectWatchlistError);

  // ---- Trigger fetches --------------------------------------------------------------
  // RTK Query hooks fetched on render by themselves. In legacy Redux the
  // component must ask for data explicitly, in an effect. The thunks skip the
  // request if the data is already cached or loading, so re-running these
  // effects (e.g. React 19 StrictMode runs them twice in development) is safe.
  useEffect(() => {
    dispatch(fetchCompanies());
    dispatch(fetchWatchlist());
  }, [dispatch]);

  // Runs whenever the selection changes; replaces `{ skip: !selectedTicker }`.
  useEffect(() => {
    if (!selectedTicker) return;
    dispatch(fetchCompanyByTicker(selectedTicker));
    dispatch(fetchCompanyQuarters(selectedTicker));
  }, [dispatch, selectedTicker]);

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

      {/* Watchlist bar: list from the store + buttons that dispatch the mutation thunks */}
      <div className="watchlist-bar">
        <button
          disabled={!selectedTicker || adding}
          // Action creators don't do anything until they are dispatched.
          onClick={() => dispatch(addToWatchlist(selectedTicker))}
        >
          {adding ? 'Adding...' : `Watch ${selectedTicker ?? ''}`}
        </button>

        <span>Watchlist{watchlistFetching ? ' (refreshing...)' : ''}:</span>
        {watchlist.length === 0 && <span className="muted">empty</span>}
        {watchlist.map((ticker) => (
          <span key={ticker} className="watch-chip">
            {ticker}
            <button title={`Remove ${ticker}`} onClick={() => dispatch(removeFromWatchlist(ticker))}>×</button>
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
