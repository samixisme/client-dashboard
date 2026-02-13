import { ArrowUp, ArrowDown, Copy, Trash2 } from 'lucide-react'
import { resetDocument, setSelectedBlockId, useDocument } from '../../stores/emailEditorStore'

type TEditorBlock = { type: string; data: Record<string, unknown> }
type TEditorDocument = Record<string, TEditorBlock>

function findParentBlockId(blockId: string, document: TEditorDocument) {
  for (const [id, b] of Object.entries(document)) {
    if (id === blockId) continue
    const block = b as TEditorBlock
    switch (block.type) {
      case 'EmailLayout':
        if ((block.data as { childrenIds?: string[] }).childrenIds?.includes(blockId)) return id
        break
      case 'Container':
        if ((block.data as { props?: { childrenIds?: string[] } }).props?.childrenIds?.includes(blockId)) return id
        break
      case 'ColumnsContainer':
        if ((block.data as { props?: { columns?: { childrenIds: string[] }[] } }).props?.columns?.some(
          (col) => col.childrenIds?.includes(blockId)
        )) return id
        break
    }
  }
  return null
}

function cloneBlock(document: TEditorDocument, blockId: string): TEditorBlock {
  const clone = JSON.parse(JSON.stringify(document[blockId])) as TEditorBlock
  if (clone.type === 'Container') {
    const props = (clone.data as { props?: { childrenIds?: string[] } }).props
    if (props?.childrenIds) {
      props.childrenIds = props.childrenIds.map((childId) => {
        const newId = `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        document[newId] = cloneBlock(document, childId)
        return newId
      })
    }
  } else if (clone.type === 'ColumnsContainer') {
    const props = (clone.data as { props?: { columns?: { childrenIds: string[] }[] } }).props
    if (props?.columns) {
      props.columns = props.columns.map((col) => ({
        childrenIds: col.childrenIds.map((childId) => {
          const newId = `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          document[newId] = cloneBlock(document, childId)
          return newId
        }),
      }))
    }
  }
  return clone
}

type Props = { blockId: string }

export default function TuneMenu({ blockId }: Props) {
  const document = useDocument()

  const handleDuplicateClick = () => {
    const parentBlockId = findParentBlockId(blockId, document)
    const newDocument = { ...document }
    const newBlockId = `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    newDocument[newBlockId] = cloneBlock({ ...document }, blockId)

    if (parentBlockId) {
      const parentBlock = JSON.parse(JSON.stringify(newDocument[parentBlockId])) as TEditorBlock
      switch (parentBlock.type) {
        case 'EmailLayout': {
          const data = parentBlock.data as { childrenIds?: string[] }
          if (!data.childrenIds) data.childrenIds = []
          const index = data.childrenIds.indexOf(blockId)
          data.childrenIds.splice(index + 1, 0, newBlockId)
          break
        }
        case 'Container': {
          const data = parentBlock.data as { props?: { childrenIds?: string[] } }
          if (!data.props) data.props = {}
          if (!data.props.childrenIds) data.props.childrenIds = []
          const index = data.props.childrenIds.indexOf(blockId)
          data.props.childrenIds.splice(index + 1, 0, newBlockId)
          break
        }
        case 'ColumnsContainer': {
          const data = parentBlock.data as { props?: { columns?: { childrenIds: string[] }[] } }
          if (data.props?.columns) {
            for (const column of data.props.columns) {
              if (column.childrenIds.includes(blockId)) {
                const index = column.childrenIds.indexOf(blockId)
                column.childrenIds.splice(index + 1, 0, newBlockId)
              }
            }
          }
          break
        }
      }
      newDocument[parentBlockId] = parentBlock
      resetDocument(newDocument)
      setSelectedBlockId(newBlockId)
    }
  }

  const handleDeleteClick = () => {
    const filterChildrenIds = (childrenIds: string[] | null | undefined) => {
      if (!childrenIds) return childrenIds
      return childrenIds.filter((f) => f !== blockId)
    }
    const nDocument: typeof document = {}
    for (const [id, b] of Object.entries(document)) {
      if (id === blockId) continue
      const block = JSON.parse(JSON.stringify(b)) as TEditorBlock
      switch (block.type) {
        case 'EmailLayout': {
          const data = block.data as { childrenIds?: string[] }
          data.childrenIds = filterChildrenIds(data.childrenIds) as string[]
          break
        }
        case 'Container': {
          const data = block.data as { props?: { childrenIds?: string[] } }
          if (data.props) {
            data.props.childrenIds = filterChildrenIds(data.props.childrenIds) as string[]
          }
          break
        }
        case 'ColumnsContainer': {
          const data = block.data as { props?: { columns?: { childrenIds: string[] }[] } }
          if (data.props?.columns) {
            data.props.columns = data.props.columns.map((c) => ({
              childrenIds: (filterChildrenIds(c.childrenIds) || []) as string[],
            }))
          }
          break
        }
      }
      nDocument[id] = block
    }
    resetDocument(nDocument)
  }

  const handleMoveClick = (direction: 'up' | 'down') => {
    const moveChildrenIds = (ids: string[] | null | undefined) => {
      if (!ids) return ids
      const index = ids.indexOf(blockId)
      if (index < 0) return ids
      const childrenIds = [...ids]
      if (direction === 'up' && index > 0) {
        ;[childrenIds[index], childrenIds[index - 1]] = [childrenIds[index - 1], childrenIds[index]]
      } else if (direction === 'down' && index < childrenIds.length - 1) {
        ;[childrenIds[index], childrenIds[index + 1]] = [childrenIds[index + 1], childrenIds[index]]
      }
      return childrenIds
    }

    const nDocument: typeof document = {}
    for (const [id, b] of Object.entries(document)) {
      const block = JSON.parse(JSON.stringify(b)) as TEditorBlock
      if (id === blockId) {
        nDocument[id] = block
        continue
      }
      switch (block.type) {
        case 'EmailLayout': {
          const data = block.data as { childrenIds?: string[] }
          data.childrenIds = moveChildrenIds(data.childrenIds) as string[]
          break
        }
        case 'Container': {
          const data = block.data as { props?: { childrenIds?: string[] } }
          if (data.props) {
            data.props.childrenIds = moveChildrenIds(data.props.childrenIds) as string[]
          }
          break
        }
        case 'ColumnsContainer': {
          const data = block.data as { props?: { columns?: { childrenIds: string[] }[] } }
          if (data.props?.columns) {
            data.props.columns = data.props.columns.map((c) => ({
              childrenIds: (moveChildrenIds(c.childrenIds) || []) as string[],
            }))
          }
          break
        }
      }
      nDocument[id] = block
    }
    resetDocument(nDocument)
    setSelectedBlockId(blockId)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: -52,
        zIndex: 50,
      }}
      onClick={(ev) => ev.stopPropagation()}
    >
      <div className="flex flex-col bg-glass-light/60 backdrop-blur-sm rounded-full px-1 py-2 shadow-xl border border-border-color/50 gap-0.5">
        <button
          onClick={() => handleMoveClick('up')}
          className="p-1.5 rounded-full hover:bg-primary/20 text-text-secondary hover:text-primary transition-colors"
          title="Move up"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleMoveClick('down')}
          className="p-1.5 rounded-full hover:bg-primary/20 text-text-secondary hover:text-primary transition-colors"
          title="Move down"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDuplicateClick}
          className="p-1.5 rounded-full hover:bg-primary/20 text-text-secondary hover:text-primary transition-colors"
          title="Duplicate"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDeleteClick}
          className="p-1.5 rounded-full hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
