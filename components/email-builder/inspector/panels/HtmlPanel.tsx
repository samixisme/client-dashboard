import TextInput from '../inputs/TextInput'
import MultiStylePropertyPanel from '../inputs/MultiStylePropertyPanel'

type Props = {
  data: Record<string, unknown>
  setData: (v: Record<string, unknown>) => void
}

export default function HtmlPanel({ data, setData }: Props) {
  const props = (data.props || {}) as Record<string, unknown>
  const style = (data.style || {}) as Record<string, unknown>

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase">HTML Block</h3>
      <TextInput
        label="HTML Content"
        defaultValue={(props.contents as string) || ''}
        onChange={(contents) => setData({ ...data, props: { ...props, contents } })}
        multiline
        rows={8}
        placeholder="<p>Your HTML here</p>"
      />
      <p className="text-xs text-text-secondary/70">Use valid HTML that renders in email clients.</p>
      <MultiStylePropertyPanel
        names={['color', 'backgroundColor', 'fontFamily', 'fontSize', 'textAlign', 'padding']}
        value={style}
        onChange={(s) => setData({ ...data, style: s })}
      />
    </div>
  )
}
