import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CompanyDetailsPage from './pages/CompanyDetailsPage';

// App only defines the routes; each route renders a page from src/pages.
// <BrowserRouter> is provided in index.js.
function App() {
  return (
    <Routes>
      {/* "/" is the landing page showing the companies grid */}
      <Route path="/" element={<LandingPage />} />
      {/* "/company/AAPL" shows all data and metrics for one company */}
      <Route path="/company/:ticker" element={<CompanyDetailsPage />} />
    </Routes>
  );
}

export default App;
