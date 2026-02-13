import { useState, useRef, useEffect } from 'react'
import { Plus, Type, Image, Heading1, Minus, Space, CircleUser, Code, Columns, SquareIcon, MousePointer2 } from 'lucide-react'

type TEditorBlock = { type: string; data: Record<string, unknown> }

const BLOCK_OPTIONS: { type: string; icon: typeof Type; label: string }[] = [
  { type: 'Heading', icon: Heading1, label: 'Heading' },
  { type: 'Text', icon: Type, label: 'Text' },
  { type: 'Image', icon: Image, label: 'Image' },
  { type: 'Button', icon: MousePointer2, label: 'Button' },
  { type: 'Divider', icon: Minus, label: 'Divider' },
  { type: 'Spacer', icon: Space, label: 'Spacer' },
  { type: 'Avatar', icon: CircleUser, label: 'Avatar' },
  { type: 'Html', icon: Code, label: 'HTML' },
  { type: 'Container', icon: SquareIcon, label: 'Container' },
  { type: 'ColumnsContainer', icon: Columns, label: 'Columns' },
]

const BLOCK_DEFAULTS: Record<string, () => TEditorBlock> = {
  Text: () => ({
    type: 'Text',
    data: {
      style: { color: '#333333', fontSize: 16, fontFamily: 'MODERN_SANS', fontWeight: 'normal', textAlign: 'left' as const, padding: { top: 8, bottom: 8, left: 24, right: 24 } },
      props: { text: 'Enter your text here...' },
    },
  }),
  Heading: () => ({
    type: 'Heading',
    data: {
      style: { color: '#111111', fontFamily: 'MODERN_SANS', fontWeight: 'bold', textAlign: 'left' as const, padding: { top: 16, bottom: 8, left: 24, right: 24 } },
      props: { text: 'Heading', level: 'h2' },
    },
  }),
  Image: () => ({
    type: 'Image',
    data: {
      style: { padding: { top: 8, bottom: 8, left: 24, right: 24 }, textAlign: 'center' as const },
      props: { url: 'https://placehold.co/600x200/F8F8F8/CCC?text=Your+image', alt: 'Image', contentAlignment: 'middle', width: null, height: null, linkHref: null },
    },
  }),
  Button: () => ({
    type: 'Button',
    data: {
      style: { fontSize: 16, fontFamily: 'MODERN_SANS', fontWeight: 'bold', textAlign: 'center' as const, padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      props: { text: 'Click Here', url: 'https://example.com', buttonBackgroundColor: '#a3e635', buttonTextColor: '#000000', buttonStyle: 'rounded', size: 'medium', fullWidth: false },
    },
  }),
  Divider: () => ({
    type: 'Divider',
    data: {
      style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      props: { lineColor: '#e5e5e5', lineHeight: 1 },
    },
  }),
  Spacer: () => ({
    type: 'Spacer',
    data: { style: {}, props: { height: 32 } },
  }),
  Avatar: () => ({
    type: 'Avatar',
    data: {
      style: { textAlign: 'left' as const, padding: { top: 8, bottom: 8, left: 24, right: 24 } },
      props: { imageUrl: 'https://placehold.co/100x100/F8F8F8/CCC?text=A', alt: 'Avatar', size: 64, shape: 'circle' },
    },
  }),
  Html: () => ({
    type: 'Html',
    data: {
      style: { fontSize: 14, fontFamily: 'MONOSPACE', padding: { top: 8, bottom: 8, left: 24, right: 24 } },
      props: { contents: '<p style="color: #333;">Custom HTML content</p>' },
    },
  }),
  Container: () => ({
    type: 'Container',
    data: {
      style: { backgroundColor: null, borderColor: null, borderRadius: null, padding: { top: 16, bottom: 16, left: 0, right: 0 } },
      props: { childrenIds: [] },
    },
  }),
  ColumnsContainer: () => ({
    type: 'ColumnsContainer',
    data: {
      style: { backgroundColor: null, padding: { top: 16, bottom: 16, left: 0, right: 0 } },
      props: { columnsCount: 2, columnsGap: 16, contentAlignment: 'top', columns: [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }] },
    },
  }),
}

export function getBlockDefault(type: string): TEditorBlock {
  return (BLOCK_DEFAULTS[type] || BLOCK_DEFAULTS.Text)()
}

type AddBlockMenuProps = {
  onSelect: (block: TEditorBlock) => void
  placeholder?: boolean
}

export default function AddBlockMenu({ onSelect, placeholder }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (placeholder) {
    return (
      <div ref={menuRef} className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
          className="w-full py-8 flex items-center justify-center text-text-secondary hover:text-primary border-2 border-dashed border-border-color/50 hover:border-primary/50 rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span className="text-sm">Add block</span>
        </button>
        {open && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-glass-light/80 backdrop-blur-xl border border-border-color/50 rounded-xl shadow-2xl z-50 p-2 grid grid-cols-2 gap-1">
            {BLOCK_OPTIONS.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={(e) => { e.stopPropagation(); onSelect(getBlockDefault(type)); setOpen(false) }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={menuRef} className="relative group" style={{ height: 0 }}>
      <div className="absolute inset-x-0 -top-px flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex-1 h-px bg-primary/40" />
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
          className="w-5 h-5 flex items-center justify-center bg-primary text-background rounded-full shadow-md hover:bg-primary/80 transition-colors flex-shrink-0"
        >
          <Plus className="w-3 h-3" />
        </button>
        <div className="flex-1 h-px bg-primary/40" />
      </div>
      {open && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-72 bg-glass-light/80 backdrop-blur-xl border border-border-color/50 rounded-xl shadow-2xl z-50 p-2 grid grid-cols-2 gap-1">
          {BLOCK_OPTIONS.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={(e) => { e.stopPropagation(); onSelect(getBlockDefault(type)); setOpen(false) }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
