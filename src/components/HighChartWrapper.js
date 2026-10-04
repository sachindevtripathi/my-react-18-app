import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

/**
 * Reusable wrapper around Highcharts.
 *
 * Builds a simple single-series chart so pages only pass a title, labels and
 * values. When quarterly data is available later, pass one category per quarter
 * and set `type="line"`.
 *
 * Props:
 *  - title      {string}   chart title
 *  - categories {string[]} x-axis labels (e.g. ["Q2 2026"])
 *  - data       {number[]} y values, same length as `categories`
 *  - seriesName {string}   series name shown in the tooltip
 *  - yAxisTitle {string}   y-axis label (e.g. "%" or "$K")
 *  - type       {string}   Highcharts chart type, default "column"
 *  - color      {string}   series colour
 */
function HighChartWrapper({
  title,
  categories = [],
  data = [],
  seriesName,
  yAxisTitle,
  type = 'column',
  color,
}) {
  const options = {
    chart: { type, reflow: true },
    title: { text: title },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: { categories },
    yAxis: { title: { text: yAxisTitle } },
    series: [{ name: seriesName || title, data, color }],
  };

  return (
    // Outer box fills whatever space the parent gives it.
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        // The chart container is stretched with absolute positioning instead of
        // an inline `height: '100%'`. Highcharts treats an inline 100% height as
        // "unknown" and falls back to a fixed 400px chart, which overflows the
        // parent. With `inset: 0` it measures the real height and fits inside.
        containerProps={{ style: { position: 'absolute', inset: 0 } }}
      />
    </div>
  );
}

export default HighChartWrapper;
