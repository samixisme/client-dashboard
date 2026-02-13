import TextInput from '../inputs/TextInput'

const INPUT_CLASS = "w-full px-3 py-2 bg-glass-light/40 backdrop-blur-sm border border-border-color/50 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)] hover:border-border-color/80 transition-all duration-300"

type Props = {
  data: Record<string, unknown>
  setData: (v: Record<string, unknown>) => void
}

export default function AvatarPanel({ data, setData }: Props) {
  const props = (data.props || {}) as Record<string, unknown>

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase">Avatar Block</h3>
      <TextInput
        label="Image URL"
        defaultValue={(props.imageUrl as string) || ''}
        onChange={(imageUrl) => setData({ ...data, props: { ...props, imageUrl } })}
        type="url"
        placeholder="https://..."
      />
      <TextInput
        label="Alt Text"
        defaultValue={(props.alt as string) || ''}
        onChange={(alt) => setData({ ...data, props: { ...props, alt } })}
        placeholder="Avatar"
      />
      <div>
        <label className="block text-xs text-text-secondary mb-1">Size (px)</label>
        <input
          type="number"
          value={(props.size as number) || 64}
          onChange={(e) => setData({ ...data, props: { ...props, size: parseInt(e.target.value) } })}
          className={INPUT_CLASS}
          min={24}
          max={128}
        />
      </div>
      <div>
        <label className="block text-xs text-text-secondary mb-1">Shape</label>
        <div className="flex bg-glass-light/40 border border-border-color/50 rounded-xl overflow-hidden">
          {(['circle', 'square', 'rounded'] as const).map((val) => (
            <button
              key={val}
              onClick={() => setData({ ...data, props: { ...props, shape: val } })}
              className={`flex-1 py-1.5 text-xs cursor-pointer transition-all duration-300 ${props.shape === val ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {val.charAt(0).toUpperCase() + val.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
