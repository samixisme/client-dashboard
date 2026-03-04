import { useCallback } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { ProjectLink } from '../types';

type NewProjectLink = Omit<ProjectLink, 'id'>;
type ProjectLinkUpdate = Partial<Omit<ProjectLink, 'id'>>;

export interface UseProjectLinksReturn {
  addLink: (linkData: NewProjectLink) => Promise<string>;
  updateLink: (linkId: string, updates: ProjectLinkUpdate) => Promise<void>;
  deleteLink: (linkId: string) => Promise<void>;
}

/**
 * Provides CRUD operations for the `projectLinks` Firestore collection.
 * This hook does NOT fetch data — use `DataContext` (data.projectLinks) for reads.
 */
export function useProjectLinks(): UseProjectLinksReturn {
  const addLink = useCallback(async (linkData: NewProjectLink): Promise<string> => {
    try {
      const ref = await addDoc(collection(db, 'projectLinks'), linkData);
      return ref.id;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add link');
    }
  }, []);

  const updateLink = useCallback(async (linkId: string, updates: ProjectLinkUpdate): Promise<void> => {
    try {
      const ref = doc(db, 'projectLinks', linkId);
      await updateDoc(ref, updates as Record<string, unknown>);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update link');
    }
  }, []);

  const deleteLink = useCallback(async (linkId: string): Promise<void> => {
    try {
      const ref = doc(db, 'projectLinks', linkId);
      await deleteDoc(ref);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete link');
    }
  }, []);

  return { addLink, updateLink, deleteLink };
}
