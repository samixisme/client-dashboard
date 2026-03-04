import React, { useState, useEffect } from 'react';
import { ProjectLink } from '../../types';
import { useProjectLinks } from '../../hooks/useProjectLinks';

interface LinkCardProps {
  link: ProjectLink;
  onEdit: (link: ProjectLink) => void;
}

const LinkCard: React.FC<LinkCardProps> = ({ link, onEdit }) => {
  const { deleteLink } = useProjectLinks();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setConfirmDelete(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setIsDeleting(true);
    try {
      await deleteLink(link.id);
    } finally {
      setIsDeleting(false);
      setMenuOpen(false);
      setConfirmDelete(false);
    }
  };

  // Try to extract a clean hostname for display
  let hostname = '';
  try { hostname = new URL(link.url).hostname; } catch { hostname = link.url; }

  return (
    <div className="group relative p-5 rounded-xl border border-border-color bg-glass hover:bg-glass-light hover:border-primary/40 transition-all">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="flex items-start gap-3">
          {/* Favicon */}
          {link.favicon ? (
            <img
              src={link.favicon}
              alt=""
              className="w-5 h-5 rounded mt-0.5 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-5 h-5 rounded bg-glass flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.386-3.376a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.313 8.82" />
              </svg>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
              {link.title || link.url}
            </p>
            <p className="text-xs text-text-secondary mt-1 truncate">{hostname}</p>
          </div>
        </div>
      </a>

      {/* Kebab menu */}
      <div className="absolute top-3 right-3">
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(o => !o); setConfirmDelete(false); }}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-glass transition-colors opacity-0 group-hover:opacity-100"
          title="Actions"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(false); setConfirmDelete(false); }} />
            <div className="absolute right-0 top-8 z-20 w-40 bg-background border border-border-color rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(link); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-glass-light transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={isDeleting}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  confirmDelete
                    ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                    : 'text-red-400 hover:bg-glass-light'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                {isDeleting ? 'Deleting…' : confirmDelete ? 'Confirm' : 'Delete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LinkCard;
