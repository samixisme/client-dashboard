import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import ColorInput from './ColorInput'

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

type StyleValue = Record<string, unknown>

type MultiStylePropertyPanelProps = {
  names: string[]
  value: StyleValue | undefined | null
  onChange: (style: StyleValue) => void
}

const INPUT_CLASS = "w-full px-3 py-2 bg-glass-light/40 backdrop-blur-sm border border-border-color/50 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)] hover:border-border-color/80 transition-all duration-300"

export default function MultiStylePropertyPanel({ names, value, onChange }: MultiStylePropertyPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const style = value || {}

  const update = (key: string, val: unknown) => {
    onChange({ ...style, [key]: val })
  }

  return (
    <div className="border-t border-border-color/30 pt-3 mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary mb-2 w-full"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Style Properties
      </button>
      {expanded && (
        <div className="space-y-3">
          {names.includes('backgroundColor') && (
            <ColorInput
              label="Background Color"
              defaultValue={(style.backgroundColor as string) || '#ffffff'}
              onChange={(v) => update('backgroundColor', v)}
            />
          )}
          {names.includes('fontFamily') && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Font Family</label>
              <select
                value={(style.fontFamily as string) || 'MODERN_SANS'}
                onChange={(e) => update('fontFamily', e.target.value)}
                className={INPUT_CLASS}
              >
                {FONT_FAMILIES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}
          {names.includes('fontSize') && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Font Size</label>
              <input
                type="number"
                value={(style.fontSize as number) || 16}
                onChange={(e) => update('fontSize', parseInt(e.target.value))}
                className={INPUT_CLASS}
                min={8}
                max={72}
              />
            </div>
          )}
          {names.includes('fontWeight') && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Font Weight</label>
              <div className="flex bg-glass-light/40 border border-border-color/50 rounded-xl overflow-hidden">
                <button
                  onClick={() => update('fontWeight', 'normal')}
                  className={`flex-1 py-1.5 text-xs cursor-pointer transition-all duration-300 ${style.fontWeight !== 'bold' ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Normal
                </button>
                <button
                  onClick={() => update('fontWeight', 'bold')}
                  className={`flex-1 py-1.5 text-xs cursor-pointer transition-all duration-300 ${style.fontWeight === 'bold' ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Bold
                </button>
              </div>
            </div>
          )}
          {names.includes('textAlign') && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Text Align</label>
              <div className="flex bg-glass-light/40 border border-border-color/50 rounded-xl overflow-hidden">
                {(['left', 'center', 'right'] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => update('textAlign', val)}
                    className={`flex-1 py-1.5 text-xs cursor-pointer transition-all duration-300 ${style.textAlign === val ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {val.charAt(0).toUpperCase() + val.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {names.includes('padding') && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Padding</label>
              <div className="grid grid-cols-2 gap-2">
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                  <div key={side}>
                    <label className="block text-[10px] text-text-secondary/70 mb-0.5 capitalize">{side}</label>
                    <input
                      type="number"
                      value={((style.padding as Record<string, number>) || {})[side] || 0}
                      onChange={(e) => update('padding', { ...(style.padding as Record<string, number> || {}), [side]: parseInt(e.target.value) })}
                      className={INPUT_CLASS}
                      min={0}
                      max={100}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
