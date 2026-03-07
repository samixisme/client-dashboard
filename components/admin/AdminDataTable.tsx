import React, { useState, useCallback, useRef } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  PaginationState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Columns, ChevronLeft, ChevronRight, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BulkAction {
  label: string;
  onClick: (selectedIds: string[]) => void;
  variant?: 'default' | 'danger';
}

interface AdminDataTableProps<TData extends { id: string }> {
  data: TData[];
  columns: ColumnDef<TData>[];
  /** Bulk actions shown in the floating bar when rows are selected */
  bulkActions?: BulkAction[];
  /** Controlled search value — parent manages debouncing */
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  /** Total count for server-side pagination */
  totalCount?: number;
  /** Current page index (0-based) */
  pageIndex?: number;
  pageSize?: number;
  onPageChange?: (pageIndex: number) => void;
  isLoading?: boolean;
}

// ─── Debounce hook (no external dep needed) ───────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminDataTable<TData extends { id: string }>({
  data,
  columns,
  bulkActions = [],
  globalFilter: controlledFilter,
  onGlobalFilterChange,
  totalCount,
  pageIndex: controlledPageIndex = 0,
  pageSize = 25,
  onPageChange,
  isLoading = false,
}: AdminDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [internalFilter, setInternalFilter] = useState('');
  const [visibilityOpen, setVisibilityOpen] = useState(false);

  const filterValue = controlledFilter ?? internalFilter;
  const debouncedFilter = useDebounce(filterValue, 300);

  const handleFilterChange = useCallback((val: string) => {
    if (onGlobalFilterChange) {
      onGlobalFilterChange(val);
    } else {
      setInternalFilter(val);
    }
  }, [onGlobalFilterChange]);

  const table = useReactTable({
    data,
    columns: [
      // Selection column prepended automatically
      {
        id: '__select',
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all rows"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomePageRowsSelected();
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-4 w-4 rounded border-border-color bg-glass accent-primary cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select row ${row.id}`}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="h-4 w-4 rounded border-border-color bg-glass accent-primary cursor-pointer"
          />
        ),
        size: 40,
        enableSorting: false,
        enableHiding: false,
      } as ColumnDef<TData>,
      ...columns,
    ],
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: debouncedFilter,
      pagination: { pageIndex: controlledPageIndex, pageSize },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: !!onPageChange,
    pageCount: totalCount ? Math.ceil(totalCount / pageSize) : undefined,
    getRowId: (row) => row.id,
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const hasSelection = selectedIds.length > 0;

  // CSV export
  const handleExportCSV = useCallback(() => {
    const visibleRows = hasSelection
      ? table.getSelectedRowModel().rows
      : table.getRowModel().rows;
    const headerRow = table
      .getVisibleFlatColumns()
      .filter((c) => c.id !== '__select')
      .map((c) => c.id)
      .join(',');
    const dataRows = visibleRows.map((row) =>
      table
        .getVisibleFlatColumns()
        .filter((c) => c.id !== '__select')
        .map((c) => {
          const val = row.getValue(c.id);
          const str = val == null ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csv = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [table, hasSelection, rowSelection]);

  const totalPages = totalCount
    ? Math.ceil(totalCount / pageSize)
    : table.getPageCount();

  return (
    <div className="flex flex-col gap-3">

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search…"
            aria-label="Search table"
            value={filterValue}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="w-full pl-3 pr-8 py-2 text-sm bg-glass border border-border-color rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {filterValue && (
            <button
              onClick={() => handleFilterChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Column visibility */}
        <div className="relative">
          <button
            onClick={() => setVisibilityOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-glass border border-border-color rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Toggle column visibility"
            aria-expanded={visibilityOpen}
          >
            <Columns className="h-4 w-4" />
            Columns
          </button>
          {visibilityOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-glass border border-border-color rounded-lg shadow-xl p-2 min-w-[160px]">
              {table.getAllLeafColumns()
                .filter((col) => col.id !== '__select')
                .map((col) => (
                  <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-primary hover:bg-glass-light rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                  </label>
                ))}
            </div>
          )}
        </div>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-glass border border-border-color rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Export to CSV"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border-color">
        <table className="w-full text-sm" role="table" aria-label="Data table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border-color bg-glass-light">
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider select-none"
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer hover:text-text-primary' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-text-secondary">
                              {sorted === 'asc' ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : sorted === 'desc' ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className="px-4 py-12 text-center text-text-secondary text-sm">
                  Loading…
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className="px-4 py-12 text-center text-sm">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <p className="text-text-primary font-medium text-base">No results found</p>
                    <p className="text-text-secondary">
                      {filterValue ? "Try adjusting your search or filters." : "There is no data to display."}
                    </p>
                    {filterValue && (
                      <button
                        onClick={() => handleFilterChange('')}
                        className="mt-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 font-medium rounded-lg transition-colors"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  aria-selected={row.getIsSelected()}
                  className={`border-b border-border-color last:border-0 transition-colors hover:bg-glass-light ${row.getIsSelected() ? 'bg-primary/5' : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-text-primary">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-text-secondary">
        <span>
          {hasSelection ? `${selectedIds.length} of ` : ''}
          {totalCount ?? data.length} rows
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange ? onPageChange(controlledPageIndex - 1) : table.previousPage()}
            disabled={controlledPageIndex === 0}
            className="p-1.5 rounded-lg border border-border-color bg-glass hover:bg-glass-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2">
            Page {controlledPageIndex + 1} of {totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange ? onPageChange(controlledPageIndex + 1) : table.nextPage()}
            disabled={controlledPageIndex + 1 >= (totalPages || 1)}
            className="p-1.5 rounded-lg border border-border-color bg-glass hover:bg-glass-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Floating bulk action bar */}
      {hasSelection && bulkActions.length > 0 && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-glass border border-border-color rounded-2xl shadow-2xl backdrop-blur-md"
        >
          <span className="text-sm font-medium text-text-primary mr-2">
            {selectedIds.length} selected
          </span>
          {bulkActions.map((action) => (
            <button
              key={action.label}
              onClick={() => action.onClick(selectedIds)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                action.variant === 'danger'
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {action.label}
            </button>
          ))}
          <button
            onClick={() => setRowSelection({})}
            className="ml-1 text-text-secondary hover:text-text-primary"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}