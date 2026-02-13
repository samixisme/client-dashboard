import ColorInput from '../inputs/ColorInput'
import MultiStylePropertyPanel from '../inputs/MultiStylePropertyPanel'

type Props = {
  data: Record<string, unknown>
  setData: (v: Record<string, unknown>) => void
}

export default function ContainerPanel({ data, setData }: Props) {
  const style = (data.style || {}) as Record<string, unknown>

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-xs font-medium text-text-secondary uppercase">Container Block</h3>
      <MultiStylePropertyPanel
        names={['backgroundColor', 'padding']}
        value={style}
        onChange={(s) => setData({ ...data, style: s })}
      />
    </div>
  )
}
