import { Container as BaseContainer } from '@usewaypoint/block-container'
import { useCurrentBlockId } from '../EditorBlock'
import { setDocument, setSelectedBlockId, useDocument } from '../../../stores/emailEditorStore'
import EditorChildrenIds from '../EditorChildrenIds'
import { ContainerProps } from './ContainerPropsSchema'

export default function ContainerEditor({ style, props }: ContainerProps) {
  const childrenIds = props?.childrenIds ?? []
  const document = useDocument()
  const currentBlockId = useCurrentBlockId()

  return (
    <BaseContainer style={style}>
      <EditorChildrenIds
        childrenIds={childrenIds}
        onChange={({ block, blockId, childrenIds }) => {
          setDocument({
            [blockId]: block,
            [currentBlockId]: {
              type: 'Container',
              data: {
                ...document[currentBlockId].data,
                props: { childrenIds },
              },
            },
          })
          setSelectedBlockId(blockId)
        }}
      />
    </BaseContainer>
  )
}
