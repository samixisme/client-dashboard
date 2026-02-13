import { ColumnsContainer as BaseColumnsContainer } from '@usewaypoint/block-columns-container'
import { useCurrentBlockId } from '../EditorBlock'
import { setDocument, setSelectedBlockId } from '../../../stores/emailEditorStore'
import EditorChildrenIds, { EditorChildrenChange } from '../EditorChildrenIds'
import ColumnsContainerPropsSchema, { ColumnsContainerProps } from './ColumnsContainerPropsSchema'

const EMPTY_COLUMNS: [{ childrenIds: string[] }, { childrenIds: string[] }, { childrenIds: string[] }] = [
  { childrenIds: [] },
  { childrenIds: [] },
  { childrenIds: [] },
]

export default function ColumnsContainerEditor({ style, props }: ColumnsContainerProps) {
  const currentBlockId = useCurrentBlockId()
  const { columns, fixedWidths, ...restProps } = props ?? {}
  const safeFixedWidths = fixedWidths as [number, number, number] | undefined
  const columnsValue = columns ?? EMPTY_COLUMNS

  const updateColumn = (columnIndex: 0 | 1 | 2, { block, blockId, childrenIds }: EditorChildrenChange) => {
    const nColumns = [...columnsValue] as typeof columnsValue
    nColumns[columnIndex] = { childrenIds }
    setDocument({
      [blockId]: block,
      [currentBlockId]: {
        type: 'ColumnsContainer',
        data: ColumnsContainerPropsSchema.parse({
          style,
          props: {
            ...restProps,
            columns: nColumns,
          },
        }),
      },
    })
    setSelectedBlockId(blockId)
  }

  return (
    <BaseColumnsContainer
      props={{ ...restProps, fixedWidths: safeFixedWidths }}
      style={style}
      columns={[
        <EditorChildrenIds key={0} childrenIds={columnsValue[0]?.childrenIds} onChange={(change) => updateColumn(0, change)} />,
        <EditorChildrenIds key={1} childrenIds={columnsValue[1]?.childrenIds} onChange={(change) => updateColumn(1, change)} />,
        <EditorChildrenIds key={2} childrenIds={columnsValue[2]?.childrenIds} onChange={(change) => updateColumn(2, change)} />,
      ]}
    />
  )
}
