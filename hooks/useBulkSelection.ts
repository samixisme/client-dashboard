import { useState, useCallback, useEffect } from 'react';

export interface UseBulkSelectionReturn {
  selectedIds: Set<string>;
  isSelected: (fileId: string) => boolean;
  toggle: (fileId: string) => void;
  selectAll: (fileIds: string[]) => void;
  clearAll: () => void;
  count: number;
}

/**
 * DES-98 — In-memory bulk file multi-select.
 * Keyboard: Ctrl+A → selectAll, Esc → clearAll.
 * Selection is cleared on page navigation (in-memory only by design).
 */
export function useBulkSelection(allFileIds: string[] = []): UseBulkSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelected  = useCallback((fileId: string) => selectedIds.has(fileId), [selectedIds]);
  const count       = selectedIds.size;

  const toggle = useCallback((fileId: string) => {
    setSelectedIds(prev => {
      const next = new Set<string>(prev);
      if (next.has(fileId)) next.delete(fileId); else next.add(fileId);
      return next;
    });
  }, []);

  const selectAll = useCallback((fileIds: string[]) => {
    setSelectedIds(new Set<string>(fileIds));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedIds(new Set<string>());
  }, []);

  // Keyboard shortcuts: Ctrl+A and Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearAll();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Only intercept if there are files to select
        if (allFileIds.length > 0) {
          e.preventDefault();
          selectAll(allFileIds);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allFileIds, selectAll, clearAll]);

  return { selectedIds, isSelected, toggle, selectAll, clearAll, count };
}
