// Reports Core Web Vitals (LCP, INP, CLS) plus FCP and TTFB to `onPerfEntry`,
// e.g. reportWebVitals(console.log). web-vitals is loaded lazily, and only
// when a callback is passed. Since web-vitals v4, onINP replaces the old FID metric.
const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onINP(onPerfEntry);
      onFCP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
