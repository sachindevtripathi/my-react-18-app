import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// Router context for <Routes> in App.js
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from './queries/queryClient';
import { SelectedTickerProvider } from './context/SelectedTickerContext';

import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Server state: TanStack Query's cache, available to every useQuery/useMutation */}
    <QueryClientProvider client={queryClient}>
      {/* Client state: sits above the routes so the selection survives navigation */}
      <SelectedTickerProvider>
        <BrowserRouter>
          <App className="app-container"/>
        </BrowserRouter>
      </SelectedTickerProvider>
      {/* Floating cache inspector; only included in development builds */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);


