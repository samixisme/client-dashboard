import { useState } from 'react'
import { useCurrentBlockId } from './EditorBlock'
import { setSelectedBlockId, useSelectedBlockId } from '../../stores/emailEditorStore'
import TuneMenu from './TuneMenu'

type TEditorBlockWrapperProps = {
  children: React.ReactNode
}

export default function EditorBlockWrapper({ children }: TEditorBlockWrapperProps) {
  const selectedBlockId = useSelectedBlockId()
  const [mouseInside, setMouseInside] = useState(false)
  const blockId = useCurrentBlockId()

  let outline: string | undefined
  if (selectedBlockId === blockId) {
    outline = '2px solid rgba(163, 230, 53, 1)'
  } else if (mouseInside) {
    outline = '2px solid rgba(163, 230, 53, 0.3)'
  }

  return (
    <div
      style={{
        position: 'relative',
        maxWidth: '100%',
        outlineOffset: '-1px',
        outline,
      }}
      onMouseEnter={(ev) => {
        setMouseInside(true)
        ev.stopPropagation()
      }}
      onMouseLeave={() => {
        setMouseInside(false)
      }}
      onClick={(ev) => {
        setSelectedBlockId(blockId)
        ev.stopPropagation()
        ev.preventDefault()
      }}
    >
      {selectedBlockId === blockId && <TuneMenu blockId={blockId} />}
      {children}
    </div>
  )
}
