import { setDocument, useDocument, useSelectedBlockId } from '../../../stores/emailEditorStore'
import TextPanel from './panels/TextPanel'
import HeadingPanel from './panels/HeadingPanel'
import ImagePanel from './panels/ImagePanel'
import ButtonPanel from './panels/ButtonPanel'
import DividerPanel from './panels/DividerPanel'
import SpacerPanel from './panels/SpacerPanel'
import AvatarPanel from './panels/AvatarPanel'
import HtmlPanel from './panels/HtmlPanel'
import ColumnsContainerPanel from './panels/ColumnsContainerPanel'
import ContainerPanel from './panels/ContainerPanel'
import EmailLayoutPanel from './panels/EmailLayoutPanel'

type TEditorBlock = { type: string; data: Record<string, unknown> }

export default function ConfigurationPanel() {
  const document = useDocument()
  const selectedBlockId = useSelectedBlockId()

  if (!selectedBlockId) {
    return (
      <div className="m-4 p-4 border border-dashed border-border-color rounded-xl">
        <p className="text-sm text-text-secondary">Click on a block to inspect.</p>
      </div>
    )
  }

  const block = document[selectedBlockId]
  if (!block) {
    return (
      <div className="m-4 p-4 border border-dashed border-border-color rounded-xl">
        <p className="text-sm text-text-secondary">Block not found. Click on a block to reset.</p>
      </div>
    )
  }

  const setBlock = (conf: TEditorBlock) => setDocument({ [selectedBlockId]: conf })
  const { data, type } = block

  switch (type) {
    case 'Avatar':
      return <AvatarPanel key={selectedBlockId} data={data} setData={(d) => setBlock({ type, data: d })} />
    case 'Button':
      return <ButtonPanel key={selectedBlockId} data={data} setData={(d) => setBlock({ type, data: d })} />
    case 'ColumnsContainer':
      return <ColumnsContainerPanel key={selectedBlockId} data={data} setData={(d) => setBlock({ type, data: d })} />
    case 'Container':
      return <ContainerPanel key={selectedBlockId} data={data} setData={(d) => setBlock({ type, data: d })} />
    case 'Divider':
      return <DividerPanel key={selectedBlockId} data={data} setData={(d) => setBlock({ type, data: d })} />
    case 'Heading':
      return <HeadingPanel key={selectedBlockId} data={data} setData={(d) => setBlock({ type, data: d })} />
    case 'Html':
      return <HtmlPanel key={selectedBlockId} data={data} setData={(d) => setBlock({ type, data: d })} />
    case 'Image':
      return <ImagePanel key={selectedBlockId} data={data} setData={(d) => setBlock({ type, data: d })} />
    case 'EmailLayout':
      return <EmailLayoutPanel key={selectedBlockId} data={data} setData={(d) => setBlock({ type, data: d })} />
    case 'Spacer':
      return <SpacerPanel key={selectedBlockId} data={data} setData={(d) => setBlock({ type, data: d })} />
    case 'Text':
      return <TextPanel key={selectedBlockId} data={data} setData={(d) => setBlock({ type, data: d })} />
    default:
      return (
        <div className="m-4 p-4 border border-dashed border-border-color rounded-xl">
          <p className="text-sm text-text-secondary">No properties available for {type}.</p>
        </div>
      )
  }
}
