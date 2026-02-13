import ColorInput from './inputs/ColorInput'
import { setDocument, useDocument } from '../../../stores/emailEditorStore'

const INPUT_CLASS = "w-full px-3 py-2 bg-glass-light/60 border border-border-color rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"

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

export default function StylesPanel() {
  const document = useDocument()
  const rootBlock = document.root
  const rootData = (rootBlock?.data || {}) as Record<string, unknown>

  const updateRootData = (key: string, value: unknown) => {
    setDocument({
      root: {
        type: 'EmailLayout',
        data: { ...rootData, [key]: value },
      },
    })
  }

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">Global Styles</h3>
      <div>
        <label className="block text-xs text-text-secondary mb-1">Font Family</label>
        <select
          value={(rootData.fontFamily as string) || 'MODERN_SANS'}
          onChange={(e) => updateRootData('fontFamily', e.target.value)}
          className={INPUT_CLASS}
        >
          {FONT_FAMILIES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <ColorInput
        label="Backdrop Color"
        defaultValue={(rootData.backdropColor as string) || '#F5F5F5'}
        onChange={(v) => updateRootData('backdropColor', v)}
      />
      <ColorInput
        label="Canvas Color"
        defaultValue={(rootData.canvasColor as string) || '#FFFFFF'}
        onChange={(v) => updateRootData('canvasColor', v)}
      />
      <ColorInput
        label="Text Color"
        defaultValue={(rootData.textColor as string) || '#262626'}
        onChange={(v) => updateRootData('textColor', v)}
      />
      <ColorInput
        label="Border Color"
        defaultValue={(rootData.borderColor as string) || ''}
        onChange={(v) => updateRootData('borderColor', v || null)}
      />
      <div>
        <label className="block text-xs text-text-secondary mb-1">Border Radius</label>
        <input
          type="number"
          value={(rootData.borderRadius as number) || 0}
          onChange={(e) => updateRootData('borderRadius', parseInt(e.target.value) || null)}
          className={INPUT_CLASS}
          min={0}
          max={32}
        />
      </div>
    </div>
  )
}
