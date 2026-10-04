import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import HighChartWrapper from '../components/HighChartWrapper';
import { computeStats } from '../utils/companyStats';
import { fetchCompanyByTicker, fetchCompanyQuarters } from '../store/actions/companyActions';
import { fetchWatchlist, addToWatchlist, removeFromWatchlist } from '../store/actions/watchlistActions';
import { selectCompanyEntry, selectQuartersEntry } from '../store/selectors/companySelectors';
import {
  selectIsInWatchlist,
  selectWatchlistFetching,
  selectIsAddingToWatchlist,
  selectIsRemovingFromWatchlist,
  selectWatchlistError,
} from '../store/selectors/watchlistSelectors';
import './CompanyDetailsPage.css';

// ASSUMPTION (same as computeStats): revenue and netIncome are in $ millions.
const money = (n) => `$${n.toLocaleString()}M`;
const thousands = (n) => `$${n.toLocaleString()}K`;
const period = (q) => `${q.quarter} ${q.fiscalYear}`;

/**
 * Company details page: every field of the company, its last 4 quarters and
 * the derived metrics, plus a Watch / Unwatch button.
 *
 * This component never touches the store itself. It receives everything as
 * props from connect() below: state from mapStateToProps, action creators
 * (already bound to dispatch) from mapDispatchToProps.
 */
function CompanyDetailsPage({
  // own prop, passed in by CompanyDetailsRoute
  ticker,
  // from mapStateToProps
  company,
  companyError,
  quarters,
  quartersError,
  isWatched,
  watchBusy,
  watchError,
  // from mapDispatchToProps
  fetchCompanyByTicker,
  fetchCompanyQuarters,
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
}) {
  // Same effects as on the landing page; the thunks skip cached or in-flight requests.
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  useEffect(() => {
    fetchCompanyByTicker(ticker);
    fetchCompanyQuarters(ticker);
  }, [fetchCompanyByTicker, fetchCompanyQuarters, ticker]);

  const error = companyError || quartersError;
  if (error) {
    return (
      <div className="company-details">
        <Link to="/">← All companies</Link>
        <p className="error">Could not load {ticker} ({error.status ?? 'error'}): {error.message}</p>
      </div>
    );
  }
  if (!company || !quarters) {
    return (
      <div className="company-details">
        <Link to="/">← All companies</Link>
        <p className="muted">Loading {ticker}...</p>
      </div>
    );
  }

  // Derived values are computed during render, not in mapStateToProps:
  // mapStateToProps must return existing objects, or connect re-renders on every action.
  const stats = quarters.map(computeStats);
  const latest = computeStats(company);
  const periods = quarters.map(period);

  const charts = [
    { title: 'Revenue', data: quarters.map((q) => q.revenue), yAxisTitle: '$M', color: '#2f7ed8' },
    { title: 'Net income', data: quarters.map((q) => q.netIncome), yAxisTitle: '$M', color: '#8bbc21' },
    { title: 'Employees', data: quarters.map((q) => q.employees), yAxisTitle: 'people', color: '#910000' },
    { title: 'Net profit margin %', data: stats.map((s) => s.netProfitMargin), yAxisTitle: '%', color: '#1aadce' },
    { title: 'Revenue per employee', data: stats.map((s) => s.revenuePerEmployee), yAxisTitle: '$K', color: '#0d233a' },
    { title: 'Net income per employee', data: stats.map((s) => s.netIncomePerEmployee), yAxisTitle: '$K', color: '#492970' },
  ];

  return (
    <div className="company-details">
      <Link to="/">← All companies</Link>

      <header className="details-header">
        <h1>
          {company.name} <span className="muted">({company.ticker})</span>
        </h1>
        <button
          disabled={watchBusy}
          onClick={() => (isWatched ? removeFromWatchlist(ticker) : addToWatchlist(ticker))}
        >
          {isWatched ? `Unwatch ${ticker}` : `Watch ${ticker}`}
        </button>
        {watchError && <span className="error">Error: {watchError.message}</span>}
      </header>

      {/* Latest quarter: every field returned by GET /companies/:ticker, plus derived metrics */}
      <h2>Latest quarter: {period(company)}</h2>
      <div className="stat-cards">
        <Stat label="Revenue" value={money(company.revenue)} />
        <Stat label="Net income" value={money(company.netIncome)} />
        <Stat label="Result" value={company.result} />
        <Stat label="Employees" value={company.employees.toLocaleString()} />
        <Stat label="Hiring" value={company.hiring ? 'Yes' : 'No'} />
        <Stat label="Net profit margin" value={`${latest.netProfitMargin}%`} />
        <Stat label="Revenue / employee" value={thousands(latest.revenuePerEmployee)} />
        <Stat label="Net income / employee" value={thousands(latest.netIncomePerEmployee)} />
      </div>

      <h2>Trends (last {quarters.length} quarters)</h2>
      <div className="details-charts">
        {charts.map((c) => (
          <div key={c.title} className="details-chart">
            <HighChartWrapper type="line" categories={periods} {...c} />
          </div>
        ))}
      </div>

      <h2>Quarterly data</h2>
      <table className="quarters-table">
        <thead>
          <tr>
            <th>Quarter</th>
            <th>Revenue</th>
            <th>Net income</th>
            <th>Result</th>
            <th>Employees</th>
            <th>Hiring</th>
            <th>Net margin</th>
            <th>Revenue / emp.</th>
            <th>Net income / emp.</th>
          </tr>
        </thead>
        <tbody>
          {quarters.map((q, i) => (
            <tr key={period(q)}>
              <td>{period(q)}</td>
              <td>{money(q.revenue)}</td>
              <td>{money(q.netIncome)}</td>
              <td>{q.result}</td>
              <td>{q.employees.toLocaleString()}</td>
              <td>{q.hiring ? 'Yes' : 'No'}</td>
              <td>{stats[i].netProfitMargin}%</td>
              <td>{thousands(stats[i].revenuePerEmployee)}</td>
              <td>{thousands(stats[i].netIncomePerEmployee)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

// ---- connect() ----------------------------------------------------------------------
// mapStateToProps(state, ownProps) runs after every dispatched action. connect
// shallow-compares the returned object with the previous one and re-renders the
// component only if a value changed. ownProps are the props the parent passed
// in, here `ticker`, so each instance reads its own company's cache entry.
const mapStateToProps = (state, { ticker }) => {
  const companyEntry = selectCompanyEntry(state, ticker);
  const quartersEntry = selectQuartersEntry(state, ticker);
  return {
    company: companyEntry.data,
    companyError: companyEntry.error,
    quarters: quartersEntry.data,
    quartersError: quartersEntry.error,
    isWatched: selectIsInWatchlist(state, ticker),
    // Disable the button while any watchlist request is in flight, including
    // the first load (before it, we don't know whether the ticker is watched).
    watchBusy:
      selectWatchlistFetching(state) ||
      selectIsAddingToWatchlist(state) ||
      selectIsRemovingFromWatchlist(state),
    watchError: selectWatchlistError(state),
  };
};

// Object shorthand: connect wraps each action creator in dispatch, so the
// component calls props.addToWatchlist(ticker) instead of
// dispatch(addToWatchlist(ticker)). The bound functions keep the same identity
// across renders, so they are safe in useEffect dependency arrays.
const mapDispatchToProps = {
  fetchCompanyByTicker,
  fetchCompanyQuarters,
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
};

const ConnectedCompanyDetailsPage = connect(mapStateToProps, mapDispatchToProps)(CompanyDetailsPage);

// The route renders this. It reads :ticker from the URL (connect has no access
// to the router) and passes it to the connected page as an own prop.
export default function CompanyDetailsRoute() {
  const { ticker } = useParams();
  return <ConnectedCompanyDetailsPage ticker={ticker.toUpperCase()} />;
}
