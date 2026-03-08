// components/files/FilterChips.tsx — DES-107
// Displays active filters as removable chips + Clear all button.
import React from 'react';
import { X } from 'lucide-react';
import { UseFileFiltersReturn } from '../../hooks/useFileFilters';
import { DriveFileType, DriveSizeRange, DriveDateRange } from '../../types/drive';

interface FilterChipsProps extends UseFileFiltersReturn {}

const TYPE_LABELS: Record<DriveFileType, string> = {
  image: 'Images', video: 'Videos', document: 'Documents',
  pdf: 'PDFs', archive: 'Archives', code: 'Code', other: 'Other',
};

const SIZE_LABELS: Record<DriveSizeRange, string> = {
  '<1mb': '< 1 MB', '1-10mb': '1–10 MB', '10-100mb': '10–100 MB', '>100mb': '> 100 MB',
};

const DATE_LABELS: Record<DriveDateRange, string> = {
  today: 'Today', last7: 'Last 7 days', last30: 'Last 30 days', last90: 'Last 90 days', custom: 'Custom range',
};

interface ChipProps {
  label: string;
  onRemove: () => void;
}

const Chip: React.FC<ChipProps> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-xs font-medium text-primary">
    {label}
    <button
      onClick={onRemove}
      aria-label={`Remove ${label} filter`}
      className="ml-0.5 rounded-full hover:bg-primary/20 transition-colors"
    >
      <X className="w-3 h-3" />
    </button>
  </span>
);

const FilterChips: React.FC<FilterChipsProps> = ({
  filters, hasActiveFilters,
  setFileType, setSizeRange, setDateRange, setOwner, setTags, setFolder,
  clearAllFilters,
}) => {
  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      {/* File type chips */}
      {(filters.fileType ?? []).map(type => (
        <Chip
          key={type}
          label={`Type: ${TYPE_LABELS[type]}`}
          onRemove={() => setFileType((filters.fileType ?? []).filter(t => t !== type))}
        />
      ))}

      {/* Size range chip */}
      {filters.sizeRange && (
        <Chip
          label={`Size: ${SIZE_LABELS[filters.sizeRange]}`}
          onRemove={() => setSizeRange(undefined)}
        />
      )}

      {/* Date range chip */}
      {filters.dateRange && (
        <Chip
          label={`Date: ${DATE_LABELS[filters.dateRange]}`}
          onRemove={() => setDateRange(undefined)}
        />
      )}

      {/* Owner chips */}
      {(filters.owner ?? []).map(owner => (
        <Chip
          key={owner}
          label={`Owner: ${owner}`}
          onRemove={() => setOwner((filters.owner ?? []).filter(o => o !== owner))}
        />
      ))}

      {/* Tag chips */}
      {(filters.tags ?? []).map(tag => (
        <Chip
          key={tag}
          label={`Tag: ${tag}`}
          onRemove={() => setTags((filters.tags ?? []).filter(t => t !== tag))}
        />
      ))}

      {/* Folder chips */}
      {(filters.folder ?? []).map(folder => (
        <Chip
          key={folder}
          label={`Folder: ${folder}`}
          onRemove={() => setFolder((filters.folder ?? []).filter(f => f !== folder))}
        />
      ))}

      {/* Clear all */}
      <button
        onClick={clearAllFilters}
        className="text-xs text-text-secondary hover:text-red-400 transition-colors flex items-center gap-1"
        aria-label="Clear all filters"
      >
        <X className="w-3 h-3" /> Clear all
      </button>
    </div>
  );
};

export default FilterChips;
