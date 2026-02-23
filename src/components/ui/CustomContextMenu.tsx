import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Link,
  Image,
  Copy,
  Scissors,
  ClipboardPaste,
  CheckSquare,
  LayoutDashboard,
  FolderKanban,
  CreditCard,
  Bell,
  RefreshCw,
  Printer,
} from 'lucide-react';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  target: HTMLElement | null;
}

interface Props {
  menuState: ContextMenuState;
  onClose: () => void;
}

const MENU_WIDTH = 224;

export default function CustomContextMenu({ menuState, onClose }: Props) {
  const { visible, x, y, target } = menuState;
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [pos, setPos] = useState({ x, y });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Clamp position to stay inside the viewport after the panel renders
  useEffect(() => {
    if (!visible || !menuRef.current) return;
    const menuH = menuRef.current.offsetHeight;
    setPos({
      x: Math.min(x, window.innerWidth - MENU_WIDTH - 8),
      y: Math.min(y, window.innerHeight - menuH - 8),
    });
  }, [visible, x, y]);

  // Dismiss on click-outside, Escape, and scroll
  useEffect(() => {
    if (!visible) return;
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  // Context detection
  const linkEl = target?.closest('a[href]') as HTMLAnchorElement | null;
  const isLink = !!linkEl;
  const isImage = target?.tagName === 'IMG';
  const imgEl = isImage ? (target as HTMLImageElement) : null;
  const isEditable = !!target?.closest('input, textarea, [contenteditable]');

  const run = (fn: () => void) => { fn(); onClose(); };

  const item =
    'group flex items-center gap-3 px-3 py-[7px] text-sm text-gray-300 rounded-lg mx-1 cursor-pointer ' +
    'transition-all duration-150 hover:bg-lime-400/10 hover:text-lime-400 ' +
    'focus:outline-none focus:bg-lime-400/10 focus:text-lime-400';
  const icon = 'w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150';
  const label = 'px-3 pt-3 pb-1 text-[10px] font-medium uppercase tracking-widest text-gray-500 select-none';
  const sep = 'mx-3 my-1 border-t border-white/[0.07]';

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Context menu"
      style={{ left: pos.x, top: pos.y }}
      className={[
        'fixed z-[9999] min-w-[224px] origin-top-left py-1.5',
        'bg-black/80 backdrop-blur-2xl',
        'border border-white/10 rounded-xl',
        'shadow-[0_8px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]',
        'overflow-hidden',
        reducedMotion ? '' : 'animate-scale-in',
      ].join(' ')}
    >
      {/* ── CONTEXT (link / image) ──────────────────────────── */}
      {(isLink || isImage) && (
        <>
          <p className={label}>Context</p>
          {isLink && (
            <>
              <button
                role="menuitem"
                className={item}
                onClick={() => run(() => window.open(linkEl!.href, '_blank', 'noopener,noreferrer'))}
              >
                <ExternalLink className={icon} />
                Open link in new tab
              </button>
              <button
                role="menuitem"
                className={item}
                onClick={() => run(() => navigator.clipboard.writeText(linkEl!.href))}
              >
                <Link className={icon} />
                Copy link address
              </button>
            </>
          )}
          {isImage && (
            <button
              role="menuitem"
              className={item}
              onClick={() => run(() => navigator.clipboard.writeText(imgEl!.src))}
            >
              <Image className={icon} />
              Copy image URL
            </button>
          )}
          <div className={sep} />
        </>
      )}

      {/* ── EDIT ───────────────────────────────────────────── */}
      <p className={label}>Edit</p>
      <button
        role="menuitem"
        className={item}
        onClick={() => run(() => document.execCommand('copy'))}
      >
        <Copy className={icon} />
        Copy
      </button>
      {isEditable && (
        <>
          <button
            role="menuitem"
            className={item}
            onClick={() => run(() => document.execCommand('cut'))}
          >
            <Scissors className={icon} />
            Cut
          </button>
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              navigator.clipboard.readText()
                .then(text => document.execCommand('insertText', false, text))
                .catch(() => {});
              onClose();
            }}
          >
            <ClipboardPaste className={icon} />
            Paste
          </button>
        </>
      )}
      <button
        role="menuitem"
        className={item}
        onClick={() => run(() => document.execCommand('selectAll'))}
      >
        <CheckSquare className={icon} />
        Select All
      </button>

      <div className={sep} />

      {/* ── NAVIGATE ───────────────────────────────────────── */}
      <p className={label}>Navigate</p>
      <button role="menuitem" className={item} onClick={() => run(() => navigate('/dashboard'))}>
        <LayoutDashboard className={icon} />
        Dashboard
      </button>
      <button role="menuitem" className={item} onClick={() => run(() => navigate('/projects'))}>
        <FolderKanban className={icon} />
        Projects
      </button>
      <button role="menuitem" className={item} onClick={() => run(() => navigate('/payments'))}>
        <CreditCard className={icon} />
        Payments
      </button>
      <button role="menuitem" className={item} onClick={() => run(() => navigate('/notifications'))}>
        <Bell className={icon} />
        Notifications
      </button>

      <div className={sep} />

      {/* ── PAGE ───────────────────────────────────────────── */}
      <p className={label}>Page</p>
      <button role="menuitem" className={item} onClick={() => run(() => window.location.reload())}>
        <RefreshCw className={icon} />
        Reload
      </button>
      <button role="menuitem" className={item} onClick={() => run(() => window.print())}>
        <Printer className={icon} />
        Print
      </button>
    </div>
  );
}
