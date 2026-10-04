// Rounds to 2 decimals so tooltips/labels stay readable.
export const round = (n) => Math.round(n * 100) / 100;

// Derived ("artificial") stats from revenue, net income and employees.
// ASSUMPTION: revenue and netIncome are in $ millions, so "* 1000" converts
// the per-employee figures to $ thousands.
export function computeStats({ revenue, netIncome, employees }) {
  return {
    // Share of revenue kept as profit.
    netProfitMargin: round((netIncome / revenue) * 100),
    // Sales generated per employee ($K).
    revenuePerEmployee: round((revenue * 1000) / employees),
    // Profit generated per employee ($K).
    netIncomePerEmployee: round((netIncome * 1000) / employees),
  };
}
