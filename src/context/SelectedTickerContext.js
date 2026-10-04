/**
 * SELECTED TICKER CONTEXT: the app's only client state.
 *
 * Server data lives in TanStack Query (src/queries). This context holds just
 * the ticker of the company selected in the landing-page grid.
 *
 * Why not useState inside LandingPage? Selecting a row navigates to the details
 * page, which unmounts LandingPage and would lose its state. The provider sits
 * above <Routes> (see src/index.js), so it stays mounted and the selection is
 * still there when the user comes back.
 */
import React, { createContext, useContext, useMemo, useState } from 'react';

const SelectedTickerContext = createContext(null);

export function SelectedTickerProvider({ children }) {
  // null = nothing selected
  const [selectedTicker, setSelectedTicker] = useState(null);

  // Every consumer re-renders when `value` changes identity. useMemo keeps the
  // same object between renders unless the ticker actually changed.
  const value = useMemo(() => ({ selectedTicker, setSelectedTicker }), [selectedTicker]);

  // React 19: a context can be rendered directly as its own provider.
  return <SelectedTickerContext value={value}>{children}</SelectedTickerContext>;
}

// Usage: const { selectedTicker, setSelectedTicker } = useSelectedTicker();
export function useSelectedTicker() {
  const context = useContext(SelectedTickerContext);
  if (!context) throw new Error('useSelectedTicker must be used inside <SelectedTickerProvider>');
  return context;
}
