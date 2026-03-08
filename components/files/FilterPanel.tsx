// components/files/FilterPanel.tsx — DES-101
// Collapsible filter panel with controls for all 6 filter criteria.
import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { UseFileFiltersReturn } from '../../hooks/useFileFilters';
import { DriveFileType, DriveSizeRange, DriveDateRange } from '../../types/drive';

interface FilterPanelProps extends UseFileFiltersReturn {
  availableOwners: string[];
}

const FILE_TYPE_OPTIONS: { value: DriveFileType; label: string }[] = [
  { value: 'image',    label: '🖼  Images' },
  { value: 'video',    label: '🎬 Videos' },
  { value: 'document', label: '📝 Documents' },
  { value: 'pdf',      label: '📄 PDFs' },
  { value: 'archive',  label: '🗜  Archives' },
  { value: 'code',     label: '💻 Code' },
];

const SIZE_OPTIONS: { value: DriveSizeRange; label: string }[] = [
  { value: '<1mb',     label: '< 1 MB' },
  { value: '1-10mb',   label: '1 – 10 MB' },
  { value: '10-100mb', label: '10 – 100 MB' },
  { value: '>100mb',   label: '> 100 MB' },
];

const DATE_OPTIONS: { value: DriveDateRange; label: string }[] = [
  { value: 'today',  label: 'Today' },
  { value: 'last7',  label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
];

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  hasActiveFilters,
  setFileType,
  setSizeRange,
  setDateRange,
  setOwner,
  availableOwners,
}) => {
  const [open, setOpen] = useState(false);

  const toggleType = (type: DriveFileType) => {
    const current = filters.fileType ?? [];
    if (current.includes(type)) {
      setFileType(current.filter(t => t !== type));
    } else {
      setFileType([...current, type]);
    }
  };

  return (
    <div className="mb-3 shrink-0">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
          hasActiveFilters
            ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
            : 'border-border-color bg-glass text-text-secondary hover:text-text-primary hover:bg-glass-light'
        }`}
        aria-expanded={open}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {hasActiveFilters && (
          <span className="text-xs bg-primary text-background px-1.5 rounded-full">
            {[
              (filters.fileType?.length ?? 0),
              filters.sizeRange ? 1 : 0,
              filters.dateRange ? 1 : 0,
              (filters.owner?.length ?? 0),
              (filters.tags?.length ?? 0),
            ].reduce((a, b) => a + b, 0)}
          </span>
        )}
        {open ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-2 p-4 rounded-xl bg-glass/60 backdrop-blur-xl border border-border-color grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* File Type */}
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">File Type</h4>
            <div className="flex flex-col gap-1.5">
              {FILE_TYPE_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={(filters.fileType ?? []).includes(value)}
                    onChange={() => toggleType(value)}
                    className="rounded border-border-color accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Size Range */}
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">File Size</h4>
            <div className="flex flex-col gap-1.5">
              {SIZE_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="radio"
                    name="sizeRange"
                    checked={filters.sizeRange === value}
                    onChange={() => setSizeRange(value)}
                    className="accent-primary"
                  />
                  {label}
                </label>
              ))}
              {filters.sizeRange && (
                <button
                  onClick={() => setSizeRange(undefined)}
                  className="text-xs text-text-secondary hover:text-red-400 transition-colors text-left mt-1"
                >
                  Clear size filter
                </button>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Modified Date</h4>
            <div className="flex flex-col gap-1.5">
              {DATE_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="radio"
                    name="dateRange"
                    checked={filters.dateRange === value}
                    onChange={() => setDateRange(value)}
                    className="accent-primary"
                  />
                  {label}
                </label>
              ))}
              {filters.dateRange && (
                <button
                  onClick={() => setDateRange(undefined)}
                  className="text-xs text-text-secondary hover:text-red-400 transition-colors text-left mt-1"
                >
                  Clear date filter
                </button>
              )}
            </div>
          </div>

          {/* Owner */}
          {availableOwners.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Owner</h4>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {availableOwners.map(owner => (
                  <label key={owner} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-primary transition-colors">
                    <input
                      type="checkbox"
                      checked={(filters.owner ?? []).includes(owner)}
                      onChange={() => {
                        const current = filters.owner ?? [];
                        setOwner(
                          current.includes(owner)
                            ? current.filter(o => o !== owner)
                            : [...current, owner]
                        );
                      }}
                      className="rounded border-border-color accent-primary"
                    />
                    <span className="truncate">{owner}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
