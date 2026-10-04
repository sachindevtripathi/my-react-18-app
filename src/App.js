import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';

// App only defines the routes; each route renders a page from src/pages.
// <BrowserRouter> is provided in index.js.
function App() {
  return (
    <Routes>
      {/* "/" is the landing page showing the companies grid */}
      <Route path="/" element={<LandingPage />} />
    </Routes>
  );
}

export default App;
