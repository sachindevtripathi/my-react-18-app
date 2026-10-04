import React from 'react';
import { Link, useParams } from 'react-router-dom';
import HighChartWrapper from '../components/HighChartWrapper';
import { computeStats } from '../utils/companyStats';
import {
  useCompany,
  useQuarters,
  useWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
} from '../queries/companyQueries';
import './CompanyDetailsPage.css';

// ASSUMPTION (same as computeStats): revenue and netIncome are in $ millions.
const money = (n) => `$${n.toLocaleString()}M`;
const thousands = (n) => `$${n.toLocaleString()}K`;
const period = (q) => `${q.quarter} ${q.fiscalYear}`;

/**
 * Company details page: every field of the company, its last 4 quarters and
 * the derived metrics, plus a Watch / Unwatch button.
 *
 * The ticker comes from the URL, so this page needs no client state at all:
 * everything it shows is server state read through TanStack Query hooks. The
 * landing page uses the same query keys, so whichever page loads a company
 * first, the other one reads it from the cache without a new request.
 */
export default function CompanyDetailsPage() {
  const ticker = useParams().ticker.toUpperCase();

  const { data: company, error: companyError } = useCompany(ticker);
  const { data: quarters, error: quartersError } = useQuarters(ticker);

  const { data: watchlist, isFetching: watchlistFetching, error: watchlistError } = useWatchlist();
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlist();

  const isWatched = watchlist?.includes(ticker) ?? false;
  // Disable the button until we know whether the ticker is watched, and while
  // any watchlist request is in flight.
  const watchBusy = !watchlist || watchlistFetching || add.isPending || remove.isPending;
  const watchError = add.error || remove.error || watchlistError;

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
          onClick={() => (isWatched ? remove.mutate(ticker) : add.mutate(ticker))}
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
