import ColorInput from '../inputs/ColorInput'

const INPUT_CLASS = "w-full px-3 py-2 bg-glass-light/40 backdrop-blur-sm border border-border-color/50 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)] hover:border-border-color/80 transition-all duration-300"

type Props = {
  data: Record<string, unknown>
  setData: (v: Record<string, unknown>) => void
}

export default function DividerPanel({ data, setData }: Props) {
  const props = (data.props || {}) as Record<string, unknown>

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase">Divider Block</h3>
      <ColorInput
        label="Line Color"
        defaultValue={(props.lineColor as string) || '#e5e5e5'}
        onChange={(lineColor) => setData({ ...data, props: { ...props, lineColor } })}
      />
      <div>
        <label className="block text-xs text-text-secondary mb-1">Line Height (px)</label>
        <input
          type="number"
          value={(props.lineHeight as number) || 1}
          onChange={(e) => setData({ ...data, props: { ...props, lineHeight: parseInt(e.target.value) } })}
          className={INPUT_CLASS}
          min={1}
          max={10}
        />
      </div>
    </div>
  )
}
