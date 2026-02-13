import { createContext, useContext } from 'react'
import { useDocument } from '../../stores/emailEditorStore'
import { EditorBlock as CoreEditorBlock } from './core'

const EditorBlockContext = createContext<string | null>(null)
export const useCurrentBlockId = () => useContext(EditorBlockContext)!

type EditorBlockProps = {
  id: string
}

export default function EditorBlock({ id }: EditorBlockProps) {
  const document = useDocument()
  const block = document[id]
  if (!block) {
    return null
  }
  return (
    <EditorBlockContext.Provider value={id}>
      <CoreEditorBlock {...(block as Parameters<typeof CoreEditorBlock>[0])} />
    </EditorBlockContext.Provider>
  )
}
