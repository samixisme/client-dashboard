import { create } from 'zustand'

type TEditorBlock = {
  type: string
  data: Record<string, unknown>
}

type TEditorDocument = Record<string, TEditorBlock>

type TValue = {
  document: TEditorDocument
  selectedBlockId: string | null
  selectedSidebarTab: 'block-configuration' | 'styles'
  selectedMainTab: 'editor' | 'preview' | 'json' | 'html'
  selectedScreenSize: 'desktop' | 'mobile'
  inspectorDrawerOpen: boolean
  blockPaletteOpen: boolean
}

const editorStateStore = create<TValue>(() => ({
  document: {},
  selectedBlockId: null,
  selectedSidebarTab: 'styles',
  selectedMainTab: 'editor',
  selectedScreenSize: 'desktop',
  inspectorDrawerOpen: true,
  blockPaletteOpen: true,
}))

export function useDocument() {
  return editorStateStore((s) => s.document)
}

export function useSelectedBlockId() {
  return editorStateStore((s) => s.selectedBlockId)
}

export function useSelectedScreenSize() {
  return editorStateStore((s) => s.selectedScreenSize)
}

export function useSelectedMainTab() {
  return editorStateStore((s) => s.selectedMainTab)
}

export function setSelectedMainTab(selectedMainTab: TValue['selectedMainTab']) {
  return editorStateStore.setState({ selectedMainTab })
}

export function useSelectedSidebarTab() {
  return editorStateStore((s) => s.selectedSidebarTab)
}

export function useInspectorDrawerOpen() {
  return editorStateStore((s) => s.inspectorDrawerOpen)
}

export function useBlockPaletteOpen() {
  return editorStateStore((s) => s.blockPaletteOpen)
}

export function setSidebarTab(selectedSidebarTab: TValue['selectedSidebarTab']) {
  return editorStateStore.setState({ selectedSidebarTab })
}

export function setSelectedBlockId(selectedBlockId: TValue['selectedBlockId']) {
  const selectedSidebarTab = selectedBlockId === null ? 'styles' : 'block-configuration'
  const options: Partial<TValue> = {}
  if (selectedBlockId !== null) {
    options.inspectorDrawerOpen = true
  }
  return editorStateStore.setState({
    selectedBlockId,
    selectedSidebarTab,
    ...options,
  })
}

export function resetDocument(document: TValue['document']) {
  return editorStateStore.setState({
    document,
    selectedSidebarTab: 'styles',
    selectedBlockId: null,
  })
}

export function setDocumentOnly(document: TValue['document']) {
  return editorStateStore.setState({ document })
}

export function setDocument(document: Partial<TValue['document']>) {
  const originalDocument = editorStateStore.getState().document
  return editorStateStore.setState({
    document: {
      ...originalDocument,
      ...document,
    },
  })
}

export function deleteBlockFromDocument(blockId: string) {
  const doc = { ...editorStateStore.getState().document }
  delete doc[blockId]
  return editorStateStore.setState({ document: doc })
}

export function toggleInspectorDrawerOpen() {
  const inspectorDrawerOpen = !editorStateStore.getState().inspectorDrawerOpen
  return editorStateStore.setState({ inspectorDrawerOpen })
}

export function toggleBlockPaletteOpen() {
  const blockPaletteOpen = !editorStateStore.getState().blockPaletteOpen
  return editorStateStore.setState({ blockPaletteOpen })
}

export function setSelectedScreenSize(selectedScreenSize: TValue['selectedScreenSize']) {
  return editorStateStore.setState({ selectedScreenSize })
}

export function getDocument() {
  return editorStateStore.getState().document
}
