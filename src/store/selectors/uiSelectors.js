/**
 * UI SELECTORS
 *
 * A selector is a function (state) => value. Components read state only
 * through selectors, so if the state shape changes we fix it here, not in
 * every component.
 */

// null when no grid row is selected.
export const selectSelectedTicker = (state) => state.ui.selectedTicker;
