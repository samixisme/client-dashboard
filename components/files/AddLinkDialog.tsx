import React, { useState, useCallback } from 'react';
import { useProjectLinks } from '../../hooks/useProjectLinks';
import { auth } from '../../utils/firebase';

interface AddLinkDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  /** If provided, the dialog will be in "edit" mode. */
  editingLink?: { id: string; url: string; title: string; favicon?: string };
}

const AddLinkDialog: React.FC<AddLinkDialogProps> = ({
  projectId,
  open,
  onClose,
  editingLink,
}) => {
  const { addLink, updateLink } = useProjectLinks();

  const [url, setUrl] = useState(editingLink?.url || '');
  const [title, setTitle] = useState(editingLink?.title || '');
  const [favicon, setFavicon] = useState(editingLink?.favicon || '');
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setUrl(editingLink?.url || '');
      setTitle(editingLink?.title || '');
      setFavicon(editingLink?.favicon || '');
      setError(null);
    }
  }, [open, editingLink]);

  const fetchMeta = useCallback(async (rawUrl: string) => {
    if (!rawUrl.trim() || isFetching) return;
    // Basic URL check
    try { new URL(rawUrl); } catch { return; }

    setIsFetching(true);
    try {
      const res = await fetch(`/api/link-meta?url=${encodeURIComponent(rawUrl)}`);
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.title && !title) setTitle(json.data.title);
        if (json.data.favicon) setFavicon(json.data.favicon);
      }
    } catch {
      // Silently fail — user can still type a title manually
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) { setError('URL is required'); return; }
    setError(null);
    setIsSaving(true);

    try {
      if (editingLink) {
        await updateLink(editingLink.id, { url, title: title || url, favicon });
      } else {
        await addLink({
          projectId,
          url,
          title: title || url,
          favicon,
          createdBy: auth.currentUser?.uid || '',
          createdAt: new Date().toISOString(),
          pinned: false,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save link');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-background border border-border-color rounded-2xl shadow-2xl p-6 space-y-5 animate-fade-in-up"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-bold text-text-primary">
            {editingLink ? 'Edit Link' : 'Add External Link'}
          </h2>

          {/* URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => fetchMeta(url)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                setTimeout(() => fetchMeta(pasted), 100);
              }}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 bg-glass border border-border-color rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
              required
              autoFocus
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Title
              {isFetching && <span className="ml-2 text-primary animate-pulse">fetching…</span>}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-detected or type manually"
              className="w-full px-4 py-2.5 bg-glass border border-border-color rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Favicon preview */}
          {favicon && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <img src={favicon} alt="" className="w-4 h-4 rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span>Favicon detected</span>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-sm font-bold bg-primary text-background rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : editingLink ? 'Update' : 'Add Link'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddLinkDialog;
