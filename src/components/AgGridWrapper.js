import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// AG Grid v33+ requires modules to be registered once before any grid renders.
// AllCommunityModule enables every free feature (sorting, filtering, pagination, ...).
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Reusable wrapper around <AgGridReact />.
 *
 * Keeps grid defaults (sizing, sorting, filtering, pagination) in one place so
 * pages only need to pass data and column definitions.
 *
 * Props:
 *  - rowData    {Array}   rows to display
 *  - columnDefs {Array}   AG Grid column definitions
 *  - loading    {boolean} shows the grid's built-in loading overlay
 *  - height     {number|string} grid height (AG Grid needs an explicit height), default 500
 *  - onRowSelected {function} called with the selected row object (or undefined if cleared)
 */
class AgGridWrapper extends Component {
  // Default behaviour applied to every column unless a column overrides it.
  defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 100,
  };

  render() {
    const { rowData, columnDefs, loading, height = 500, onRowSelected } = this.props;

    return (
      // The grid fills its parent, so the parent div must have a fixed height.
      <div style={{ width: '100%', height }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={this.defaultColDef}
          loading={loading}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          // Single row selection; clicking a row selects it (no checkbox column).
          rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
          // Fires whenever the selection changes; pass the selected row up to the page.
          onSelectionChanged={(event) => onRowSelected?.(event.api.getSelectedRows()[0])}
        />
      </div>
    );
  }
}

export default AgGridWrapper;
