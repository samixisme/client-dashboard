import TextInput from '../inputs/TextInput'
import MultiStylePropertyPanel from '../inputs/MultiStylePropertyPanel'

const INPUT_CLASS = "w-full px-3 py-2 bg-glass-light/40 backdrop-blur-sm border border-border-color/50 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)] hover:border-border-color/80 transition-all duration-300"

type Props = {
  data: Record<string, unknown>
  setData: (v: Record<string, unknown>) => void
}

export default function HeadingPanel({ data, setData }: Props) {
  const props = (data.props || {}) as Record<string, unknown>
  const style = (data.style || {}) as Record<string, unknown>

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase">Heading Block</h3>
      <TextInput
        label="Heading Text"
        defaultValue={(props.text as string) || ''}
        onChange={(text) => setData({ ...data, props: { ...props, text } })}
        placeholder="Enter heading..."
      />
      <div>
        <label className="block text-xs text-text-secondary mb-1">Heading Level</label>
        <select
          value={(props.level as string) || 'h2'}
          onChange={(e) => setData({ ...data, props: { ...props, level: e.target.value } })}
          className={INPUT_CLASS}
        >
          <option value="h1">H1 - Largest</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
        </select>
      </div>
      <MultiStylePropertyPanel
        names={['color', 'backgroundColor', 'fontFamily', 'fontWeight', 'textAlign', 'padding']}
        value={style}
        onChange={(s) => setData({ ...data, style: s })}
      />
    </div>
  )
}
