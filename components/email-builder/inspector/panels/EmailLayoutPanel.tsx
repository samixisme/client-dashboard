import ColorInput from '../inputs/ColorInput'

const INPUT_CLASS = "w-full px-3 py-2 bg-glass-light/40 backdrop-blur-sm border border-border-color/50 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)] hover:border-border-color/80 transition-all duration-300"

const FONT_FAMILIES = [
  { value: 'MODERN_SANS', label: 'Modern Sans' },
  { value: 'BOOK_SANS', label: 'Book Sans' },
  { value: 'ORGANIC_SANS', label: 'Organic Sans' },
  { value: 'GEOMETRIC_SANS', label: 'Geometric Sans' },
  { value: 'HEAVY_SANS', label: 'Heavy Sans' },
  { value: 'ROUNDED_SANS', label: 'Rounded Sans' },
  { value: 'MODERN_SERIF', label: 'Modern Serif' },
  { value: 'BOOK_SERIF', label: 'Book Serif' },
  { value: 'MONOSPACE', label: 'Monospace' },
]

type Props = {
  data: Record<string, unknown>
  setData: (v: Record<string, unknown>) => void
}

export default function EmailLayoutPanel({ data, setData }: Props) {
  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase">Email Layout</h3>
      <div>
        <label className="block text-xs text-text-secondary mb-1">Font Family</label>
        <select
          value={(data.fontFamily as string) || 'MODERN_SANS'}
          onChange={(e) => setData({ ...data, fontFamily: e.target.value })}
          className={INPUT_CLASS}
        >
          {FONT_FAMILIES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <ColorInput
        label="Backdrop Color"
        defaultValue={(data.backdropColor as string) || '#F5F5F5'}
        onChange={(backdropColor) => setData({ ...data, backdropColor })}
      />
      <ColorInput
        label="Canvas Color"
        defaultValue={(data.canvasColor as string) || '#FFFFFF'}
        onChange={(canvasColor) => setData({ ...data, canvasColor })}
      />
      <ColorInput
        label="Text Color"
        defaultValue={(data.textColor as string) || '#262626'}
        onChange={(textColor) => setData({ ...data, textColor })}
      />
      <ColorInput
        label="Border Color"
        defaultValue={(data.borderColor as string) || ''}
        onChange={(borderColor) => setData({ ...data, borderColor: borderColor || null })}
      />
      <div>
        <label className="block text-xs text-text-secondary mb-1">Border Radius</label>
        <input
          type="number"
          value={(data.borderRadius as number) || 0}
          onChange={(e) => setData({ ...data, borderRadius: parseInt(e.target.value) || null })}
          className={INPUT_CLASS}
          min={0}
          max={32}
        />
      </div>
    </div>
  )
}
