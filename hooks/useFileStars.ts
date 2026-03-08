import { useState, useCallback, useEffect } from 'react';

const LS_KEY = 'files_starred_ids';
const USER_ID = 'local';

function loadStarred(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveStarred(ids: Set<string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(ids)));
  } catch { /* ignore */ }
}

export interface UseFileStarsReturn {
  starredIds: Set<string>;
  isStarred: (fileId: string) => boolean;
  toggleStar: (fileId: string) => void;
}

/**
 * DES-84 — localStorage-backed file starring / favorites.
 * Stars persist across page reloads and are scoped to this browser.
 */
export function useFileStars(): UseFileStarsReturn {
  const [starredIds, setStarredIds] = useState<Set<string>>(loadStarred);

  const isStarred = useCallback((fileId: string) => starredIds.has(fileId), [starredIds]);

  const toggleStar = useCallback((fileId: string) => {
    setStarredIds(prev => {
      const next = new Set<string>(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      saveStarred(next);
      return next;
    });
  }, []);

  return { starredIds, isStarred, toggleStar };
}

export { USER_ID };
