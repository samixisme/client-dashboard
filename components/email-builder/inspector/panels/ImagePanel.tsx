import TextInput from '../inputs/TextInput'
import MultiStylePropertyPanel from '../inputs/MultiStylePropertyPanel'

const INPUT_CLASS = "w-full px-3 py-2 bg-glass-light/40 backdrop-blur-sm border border-border-color/50 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)] hover:border-border-color/80 transition-all duration-300"

type Props = {
  data: Record<string, unknown>
  setData: (v: Record<string, unknown>) => void
}

export default function ImagePanel({ data, setData }: Props) {
  const props = (data.props || {}) as Record<string, unknown>
  const style = (data.style || {}) as Record<string, unknown>

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase">Image Block</h3>
      <TextInput
        label="Image URL"
        defaultValue={(props.url as string) || ''}
        onChange={(url) => setData({ ...data, props: { ...props, url } })}
        type="url"
        placeholder="https://..."
      />
      <TextInput
        label="Alt Text"
        defaultValue={(props.alt as string) || ''}
        onChange={(alt) => setData({ ...data, props: { ...props, alt } })}
        placeholder="Image description"
      />
      <TextInput
        label="Link URL (optional)"
        defaultValue={(props.linkHref as string) || ''}
        onChange={(linkHref) => setData({ ...data, props: { ...props, linkHref: linkHref || null } })}
        type="url"
        placeholder="https://..."
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-text-secondary mb-1">Width (px)</label>
          <input
            type="number"
            value={(props.width as number) || ''}
            onChange={(e) => setData({ ...data, props: { ...props, width: e.target.value ? parseInt(e.target.value) : null } })}
            className={INPUT_CLASS}
            placeholder="Auto"
          />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Height (px)</label>
          <input
            type="number"
            value={(props.height as number) || ''}
            onChange={(e) => setData({ ...data, props: { ...props, height: e.target.value ? parseInt(e.target.value) : null } })}
            className={INPUT_CLASS}
            placeholder="Auto"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-secondary mb-1">Content Alignment</label>
        <div className="flex bg-glass-light/40 border border-border-color/50 rounded-xl overflow-hidden">
          {(['left', 'center', 'right'] as const).map((val) => (
            <button
              key={val}
              onClick={() => setData({ ...data, style: { ...style, textAlign: val } })}
              className={`flex-1 py-1.5 text-xs cursor-pointer transition-all duration-300 ${style.textAlign === val ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {val.charAt(0).toUpperCase() + val.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <MultiStylePropertyPanel
        names={['padding', 'backgroundColor']}
        value={style}
        onChange={(s) => setData({ ...data, style: s })}
      />
    </div>
  )
}
