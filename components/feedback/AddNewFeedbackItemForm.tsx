import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../utils/firebase';

interface Props {
  projectId: string;
  onSuccess?: (docId: string) => void;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

const AddNewFeedbackItemForm: React.FC<Props> = ({ projectId, onSuccess }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError('URL is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const uid = auth.currentUser?.uid;
      const payload = stripUndefined({
        projectId,
        url: url.trim(),
        name: name.trim() || undefined,
        version: version.trim() || '1.0',
        status: 'open' as const,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
      const ref = await addDoc(collection(db, 'feedbackItems'), payload);
      setUrl('');
      setName('');
      setVersion('1.0');
      onSuccess?.(ref.id);
    } catch {
      setError('Failed to save feedback item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Item name (optional)"
        className="w-full px-3 py-2 bg-surface border border-border-color rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Website URL"
        required
        className="w-full px-3 py-2 bg-surface border border-border-color rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <input
        value={version}
        onChange={e => setVersion(e.target.value)}
        placeholder="Version (e.g. 1.0)"
        className="w-full px-3 py-2 bg-surface border border-border-color rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Add Feedback Item'}
      </button>
    </form>
  );
};

export default AddNewFeedbackItemForm;
