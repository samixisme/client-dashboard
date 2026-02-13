import TextInput from '../inputs/TextInput'
import ColorInput from '../inputs/ColorInput'
import MultiStylePropertyPanel from '../inputs/MultiStylePropertyPanel'

const INPUT_CLASS = "w-full px-3 py-2 bg-glass-light/40 backdrop-blur-sm border border-border-color/50 rounded-xl text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)] hover:border-border-color/80 transition-all duration-300"

type Props = {
  data: Record<string, unknown>
  setData: (v: Record<string, unknown>) => void
}

export default function ButtonPanel({ data, setData }: Props) {
  const props = (data.props || {}) as Record<string, unknown>
  const style = (data.style || {}) as Record<string, unknown>

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase">Button Block</h3>
      <TextInput
        label="Text"
        defaultValue={(props.text as string) || ''}
        onChange={(text) => setData({ ...data, props: { ...props, text } })}
      />
      <TextInput
        label="URL"
        defaultValue={(props.url as string) || ''}
        onChange={(url) => setData({ ...data, props: { ...props, url } })}
        type="url"
        placeholder="https://..."
      />
      <div>
        <label className="block text-xs text-text-secondary mb-1">Width</label>
        <div className="flex bg-glass-light/40 border border-border-color/50 rounded-xl overflow-hidden">
          <button
            onClick={() => setData({ ...data, props: { ...props, fullWidth: true } })}
            className={`flex-1 py-1.5 text-xs cursor-pointer transition-all duration-300 ${props.fullWidth ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Full
          </button>
          <button
            onClick={() => setData({ ...data, props: { ...props, fullWidth: false } })}
            className={`flex-1 py-1.5 text-xs cursor-pointer transition-all duration-300 ${!props.fullWidth ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Auto
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-secondary mb-1">Size</label>
        <div className="flex bg-glass-light/40 border border-border-color/50 rounded-xl overflow-hidden">
          {(['x-small', 'small', 'medium', 'large'] as const).map((val) => (
            <button
              key={val}
              onClick={() => setData({ ...data, props: { ...props, size: val } })}
              className={`flex-1 py-1.5 text-xs cursor-pointer transition-all duration-300 ${props.size === val ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {val === 'x-small' ? 'Xs' : val === 'small' ? 'Sm' : val === 'medium' ? 'Md' : 'Lg'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-secondary mb-1">Style</label>
        <div className="flex bg-glass-light/40 border border-border-color/50 rounded-xl overflow-hidden">
          {(['rectangle', 'rounded', 'pill'] as const).map((val) => (
            <button
              key={val}
              onClick={() => setData({ ...data, props: { ...props, buttonStyle: val } })}
              className={`flex-1 py-1.5 text-xs cursor-pointer transition-all duration-300 ${props.buttonStyle === val ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {val.charAt(0).toUpperCase() + val.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ColorInput
        label="Text Color"
        defaultValue={(props.buttonTextColor as string) || '#000000'}
        onChange={(buttonTextColor) => setData({ ...data, props: { ...props, buttonTextColor } })}
      />
      <ColorInput
        label="Button Color"
        defaultValue={(props.buttonBackgroundColor as string) || '#a3e635'}
        onChange={(buttonBackgroundColor) => setData({ ...data, props: { ...props, buttonBackgroundColor } })}
      />
      <MultiStylePropertyPanel
        names={['backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'textAlign', 'padding']}
        value={style}
        onChange={(s) => setData({ ...data, style: s })}
      />
    </div>
  )
}
