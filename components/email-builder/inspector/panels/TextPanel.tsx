import TextInput from '../inputs/TextInput'
import MultiStylePropertyPanel from '../inputs/MultiStylePropertyPanel'

type Props = {
  data: Record<string, unknown>
  setData: (v: Record<string, unknown>) => void
}

export default function TextPanel({ data, setData }: Props) {
  const props = (data.props || {}) as Record<string, unknown>
  const style = (data.style || {}) as Record<string, unknown>

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase">Text Block</h3>
      <TextInput
        label="Text Content"
        defaultValue={(props.text as string) || ''}
        onChange={(text) => setData({ ...data, props: { ...props, text } })}
        multiline
        rows={4}
        placeholder="Enter text..."
      />
      <MultiStylePropertyPanel
        names={['color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight', 'textAlign', 'padding']}
        value={style}
        onChange={(s) => setData({ ...data, style: s })}
      />
    </div>
  )
}
