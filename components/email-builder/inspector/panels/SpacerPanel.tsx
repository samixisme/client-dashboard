const INPUT_CLASS = "w-full px-3 py-2 bg-glass-light/40 backdrop-blur-sm border border-border-color/50 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)] hover:border-border-color/80 transition-all duration-300"

type Props = {
  data: Record<string, unknown>
  setData: (v: Record<string, unknown>) => void
}

export default function SpacerPanel({ data, setData }: Props) {
  const props = (data.props || {}) as Record<string, unknown>

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase">Spacer Block</h3>
      <div>
        <label className="block text-xs text-text-secondary mb-1">Height (px)</label>
        <input
          type="range"
          value={(props.height as number) || 32}
          onChange={(e) => setData({ ...data, props: { ...props, height: parseInt(e.target.value) } })}
          className="w-full accent-primary"
          min={8}
          max={128}
        />
        <div className="text-center text-sm text-text-secondary mt-1">{(props.height as number) || 32}px</div>
      </div>
    </div>
  )
}
