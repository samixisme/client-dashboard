// hooks/useFileFilters.ts — DES-97
// State container for all filter criteria types.
// No filtering logic here — pure state management.
import { useState, useCallback } from 'react';
import { FileFilter, DriveFileType, DriveSizeRange, DriveDateRange } from '../types/drive';

const FILTERS_KEY = 'filesActiveFilters';

function getStoredFilters(): FileFilter {
  try {
    const stored = localStorage.getItem(FILTERS_KEY);
    if (stored) return JSON.parse(stored) as FileFilter;
  } catch { /* ignore */ }
  return {};
}

function saveFilters(filters: FileFilter): void {
  try { localStorage.setItem(FILTERS_KEY, JSON.stringify(filters)); } catch { /* ignore */ }
}

export interface UseFileFiltersReturn {
  filters: FileFilter;
  hasActiveFilters: boolean;
  setFileType: (types: DriveFileType[] | undefined) => void;
  setSizeRange: (range: DriveSizeRange | undefined) => void;
  setDateRange: (range: DriveDateRange | undefined) => void;
  setCustomDateRange: (start: string | undefined, end: string | undefined) => void;
  setOwner: (owners: string[] | undefined) => void;
  setTags: (tags: string[] | undefined) => void;
  setFolder: (folders: string[] | undefined) => void;
  clearAllFilters: () => void;
}

export function useFileFilters(): UseFileFiltersReturn {
  const [filters, setFilters] = useState<FileFilter>(getStoredFilters);

  const update = useCallback((patch: Partial<FileFilter>) => {
    setFilters(prev => {
      const next = { ...prev, ...patch };
      // Remove undefined keys
      (Object.keys(next) as (keyof FileFilter)[]).forEach(k => {
        if (next[k] === undefined) delete next[k];
      });
      saveFilters(next);
      return next;
    });
  }, []);

  const hasActiveFilters = Object.keys(filters).some(k => {
    const v = (filters as Record<string, unknown>)[k];
    return v !== undefined && (Array.isArray(v) ? v.length > 0 : true);
  });

  return {
    filters,
    hasActiveFilters,
    setFileType:  (types) => update({ fileType: types }),
    setSizeRange: (range) => update({ sizeRange: range }),
    setDateRange: (range) => update({ dateRange: range }),
    setCustomDateRange: (start, end) => update({ customDateStart: start, customDateEnd: end }),
    setOwner:     (owners) => update({ owner: owners }),
    setTags:      (tags) => update({ tags }),
    setFolder:    (folders) => update({ folder: folders }),
    clearAllFilters: () => {
      setFilters({});
      saveFilters({});
    },
  };
}
