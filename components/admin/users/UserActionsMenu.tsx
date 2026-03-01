import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Trash2, Edit, CheckCircle, Ban } from 'lucide-react';
import { User } from '../../../types';

interface ActionsMenuProps {
  user: User;
  onAction: (action: string, user: User) => void;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({ user, onAction }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-glass rounded-lg text-text-secondary transition-colors focus:outline-none"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[#1a1a2e] border border-border-color z-50 overflow-hidden">
          <div className="py-1">
            <button onClick={() => { setOpen(false); onAction('edit', user); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-glass hover:text-text-primary transition-colors">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button onClick={() => { setOpen(false); onAction('approve', user); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-green-500/10 transition-colors">
              <CheckCircle className="w-4 h-4" /> Approve
            </button>
            <button onClick={() => { setOpen(false); onAction('disable', user); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors">
              <Ban className="w-4 h-4" /> Disable
            </button>
            <button onClick={() => { setOpen(false); onAction('delete', user); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const getRelativeTime = (isoString?: string) => {
  if (!isoString) return 'Never';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diff = (new Date(isoString).getTime() - Date.now()) / 1000;
  const absDiff = Math.abs(diff);

  if (absDiff < 60) return 'Just now';
  if (absDiff < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (absDiff < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (absDiff < 2592000) return rtf.format(Math.round(diff / 86400), 'day');
  if (absDiff < 31536000) return rtf.format(Math.round(diff / 2592000), 'month');
  return rtf.format(Math.round(diff / 31536000), 'year');
};
