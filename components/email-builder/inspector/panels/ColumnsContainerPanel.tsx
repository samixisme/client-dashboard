import ColorInput from '../inputs/ColorInput'

const INPUT_CLASS = "w-full px-3 py-2 bg-glass-light/40 backdrop-blur-sm border border-border-color/50 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)] hover:border-border-color/80 transition-all duration-300"

type Props = {
  data: Record<string, unknown>
  setData: (v: Record<string, unknown>) => void
}

export default function ColumnsContainerPanel({ data, setData }: Props) {
  const props = (data.props || {}) as Record<string, unknown>
  const style = (data.style || {}) as Record<string, unknown>

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase">Columns Block</h3>
      <div>
        <label className="block text-xs text-text-secondary mb-1">Number of Columns</label>
        <div className="flex bg-glass-light/40 border border-border-color/50 rounded-xl overflow-hidden">
          {[2, 3].map((val) => (
            <button
              key={val}
              onClick={() => setData({ ...data, props: { ...props, columnsCount: val } })}
              className={`flex-1 py-1.5 text-xs cursor-pointer transition-all duration-300 ${(props.columnsCount || 2) === val ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {val} Columns
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-secondary mb-1">Column Gap (px)</label>
        <input
          type="number"
          value={(props.columnsGap as number) || 16}
          onChange={(e) => setData({ ...data, props: { ...props, columnsGap: parseInt(e.target.value) } })}
          className={INPUT_CLASS}
          min={0}
          max={48}
        />
      </div>
      <div>
        <label className="block text-xs text-text-secondary mb-1">Vertical Alignment</label>
        <div className="flex bg-glass-light/40 border border-border-color/50 rounded-xl overflow-hidden">
          {(['top', 'middle', 'bottom'] as const).map((val) => (
            <button
              key={val}
              onClick={() => setData({ ...data, props: { ...props, contentAlignment: val } })}
              className={`flex-1 py-1.5 text-xs cursor-pointer transition-all duration-300 ${(props.contentAlignment || 'top') === val ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {val.charAt(0).toUpperCase() + val.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ColorInput
        label="Background Color"
        defaultValue={(style.backgroundColor as string) || '#ffffff'}
        onChange={(backgroundColor) => setData({ ...data, style: { ...style, backgroundColor } })}
      />
    </div>
  )
}
