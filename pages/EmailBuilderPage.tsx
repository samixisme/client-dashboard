import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Eye, ChevronDown, Undo2, Redo2,
  Type, Image, Heading1, Minus, Space, CircleUser, Code,
  Columns, SquareIcon, MousePointer2, Monitor, Smartphone,
  PanelLeftClose, PanelLeftOpen, PanelRightOpen, Maximize, Minimize,
} from 'lucide-react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { EmailTemplate, EmailTemplateStatus } from '../types'
import { toast } from 'sonner'
import { Reader, renderToStaticMarkup } from '@usewaypoint/email-builder'
import { useEmailHistory } from '../hooks/useEmailHistory'

import EditorBlock from '../components/email-builder/EditorBlock'
import InspectorPanel from '../components/email-builder/inspector/InspectorPanel'
import { getBlockDefault } from '../components/email-builder/AddBlockMenu'
import {
  useDocument,
  useSelectedMainTab,
  useSelectedScreenSize,
  useInspectorDrawerOpen,
  useBlockPaletteOpen,
  resetDocument,
  setDocument,
  setDocumentOnly,
  setSelectedMainTab,
  setSelectedScreenSize,
  setSelectedBlockId,
  toggleInspectorDrawerOpen,
  toggleBlockPaletteOpen,
  getDocument,
} from '../stores/emailEditorStore'

type EmailDocument = Record<string, { type: string; data: Record<string, unknown> }>

const createDefaultDocument = (): EmailDocument => ({
  root: {
    type: 'EmailLayout',
    data: {
      backdropColor: '#F5F5F5',
      canvasColor: '#FFFFFF',
      textColor: '#262626',
      fontFamily: 'MODERN_SANS',
      borderRadius: null,
      borderColor: null,
      childrenIds: [],
    },
  },
})

const BLOCK_PALETTE: { type: string; icon: typeof Type; label: string }[] = [
  { type: 'Heading', icon: Heading1, label: 'Heading' },
  { type: 'Text', icon: Type, label: 'Text' },
  { type: 'Image', icon: Image, label: 'Image' },
  { type: 'Button', icon: MousePointer2, label: 'Button' },
  { type: 'Divider', icon: Minus, label: 'Divider' },
  { type: 'Spacer', icon: Space, label: 'Spacer' },
  { type: 'Avatar', icon: CircleUser, label: 'Avatar' },
  { type: 'Html', icon: Code, label: 'HTML' },
  { type: 'Container', icon: SquareIcon, label: 'Container' },
  { type: 'ColumnsContainer', icon: Columns, label: 'Columns' },
]

export default function EmailBuilderPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { document: historyDoc, setDocument: setHistoryDoc, undo, redo, canUndo, canRedo, reset } = useEmailHistory<EmailDocument>(createDefaultDocument())

  // Zustand store state
  const storeDocument = useDocument()
  const selectedMainTab = useSelectedMainTab()
  const selectedScreenSize = useSelectedScreenSize()
  const inspectorDrawerOpen = useInspectorDrawerOpen()
  const blockPaletteOpen = useBlockPaletteOpen()

  // Sync zustand store changes back to history
  const prevStoreDocRef = useRef<string>('')
  useEffect(() => {
    const currentStr = JSON.stringify(storeDocument)
    if (prevStoreDocRef.current && currentStr !== prevStoreDocRef.current) {
      setHistoryDoc(storeDocument as EmailDocument)
      setHasChanges(true)
      debouncedSave(storeDocument as EmailDocument)
    }
    prevStoreDocRef.current = currentStr
  }, [storeDocument])

  // Sync history doc to zustand store (for undo/redo)
  const prevHistoryDocRef = useRef<string>('')
  useEffect(() => {
    const currentStr = JSON.stringify(historyDoc)
    if (prevHistoryDocRef.current && currentStr !== prevHistoryDocRef.current) {
      setDocumentOnly(historyDoc as Record<string, { type: string; data: Record<string, unknown> }>)
      prevStoreDocRef.current = currentStr
    }
    prevHistoryDocRef.current = currentStr
  }, [historyDoc])

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    const onFsChange = () => {
      const fsEl = document.fullscreenElement
      setIsFullscreen(!!fsEl)

      // Move custom cursor into/out of fullscreen container so it stays visible
      const ring = document.querySelector<HTMLElement>('.custom-cursor')
      const dot = document.querySelector<HTMLElement>('.custom-cursor-dot')
      if (!ring || !dot) return

      if (fsEl && fsEl === containerRef.current) {
        fsEl.appendChild(ring)
        fsEl.appendChild(dot)
      } else if (!fsEl) {
        const root = document.getElementById('root')
        if (root) { root.prepend(dot); root.prepend(ring) }
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) { redo() } else { undo() }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Load template
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) { setLoading(false); return }
      try {
        const docRef = doc(db, 'emailTemplates', templateId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as EmailTemplate
          setTemplate(data)
          const initialDoc = (data.document && Object.keys(data.document).length > 0 ? data.document : createDefaultDocument()) as EmailDocument
          reset(initialDoc)
          resetDocument(initialDoc as Record<string, { type: string; data: Record<string, unknown> }>)
          prevStoreDocRef.current = JSON.stringify(initialDoc)
          prevHistoryDocRef.current = JSON.stringify(initialDoc)
          setName(data.name)
          setSubject(data.subject || '')
        } else {
          toast.error('Template not found')
          navigate('/email-templates')
        }
      } catch {
        toast.error('Failed to load template')
      } finally {
        setLoading(false)
      }
    }
    loadTemplate()
  }, [templateId, navigate, reset])

  // Auto-save
  const debouncedSave = useCallback((newDoc: EmailDocument) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      if (!templateId) return
      try {
        await updateDoc(doc(db, 'emailTemplates', templateId), {
          document: newDoc,
          updatedAt: new Date().toISOString(),
        })
        setHasChanges(false)
      } catch {
        // auto-save failed silently
      }
    }, 3000)
  }, [templateId])

  const handleSave = async () => {
    if (!templateId) return
    setSaving(true)
    try {
      const currentDoc = getDocument()
      await updateDoc(doc(db, 'emailTemplates', templateId), {
        document: currentDoc,
        name,
        subject,
        updatedAt: new Date().toISOString(),
      })
      setHasChanges(false)
      toast.success('Template saved')
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: EmailTemplateStatus) => {
    if (!templateId) return
    try {
      await updateDoc(doc(db, 'emailTemplates', templateId), {
        status,
        updatedAt: new Date().toISOString(),
      })
      setTemplate((prev) => (prev ? { ...prev, status } : null))
      toast.success(`Template ${status === 'published' ? 'published' : status === 'archived' ? 'archived' : 'set to draft'}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  // Add block to root
  const addBlockToRoot = (type: string) => {
    const block = getBlockDefault(type)
    const blockId = `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const currentDoc = getDocument()
    const rootData = currentDoc.root?.data as { childrenIds?: string[] } | undefined
    const childrenIds = [...(rootData?.childrenIds || []), blockId]
    setDocument({
      [blockId]: block,
      root: {
        type: 'EmailLayout',
        data: { ...currentDoc.root?.data, childrenIds },
      },
    })
    setSelectedBlockId(blockId)
  }

  // Render main content area
  const renderMainPanel = () => {
    let containerStyle: React.CSSProperties = { height: '100%' }
    if (selectedScreenSize === 'mobile') {
      containerStyle = {
        ...containerStyle,
        margin: '32px auto',
        width: 370,
        height: 800,
        boxShadow: 'rgba(33, 36, 67, 0.04) 0px 10px 20px, rgba(33, 36, 67, 0.04) 0px 2px 6px',
      }
    }

    switch (selectedMainTab) {
      case 'editor':
        return (
          <div style={containerStyle}>
            <EditorBlock id="root" />
          </div>
        )
      case 'preview':
        return (
          <div style={containerStyle}>
            <Reader document={storeDocument as Record<string, never>} rootBlockId="root" />
          </div>
        )
      case 'html': {
        let html = ''
        try {
          html = renderToStaticMarkup(storeDocument as Record<string, never>, { rootBlockId: 'root' })
        } catch {
          html = '<!-- Error generating HTML -->'
        }
        return (
          <div className="p-4 max-w-4xl mx-auto">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => { navigator.clipboard.writeText(html); toast.success('HTML copied') }}
                className="px-3 py-1.5 bg-glass-light/60 backdrop-blur-sm text-text-primary text-xs rounded-lg hover:bg-glass-light/80 border border-border-color transition-all duration-300"
              >
                Copy HTML
              </button>
            </div>
            <pre className="p-4 bg-glass/60 backdrop-blur-xl rounded-xl text-xs text-text-secondary overflow-auto max-h-[calc(100vh-200px)] font-mono whitespace-pre-wrap border border-border-color/50">
              {html}
            </pre>
          </div>
        )
      }
      case 'json':
        return (
          <div className="p-4 max-w-4xl mx-auto">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => { navigator.clipboard.writeText(JSON.stringify(storeDocument, null, 2)); toast.success('JSON copied') }}
                className="px-3 py-1.5 bg-glass-light/60 backdrop-blur-sm text-text-primary text-xs rounded-lg hover:bg-glass-light/80 border border-border-color transition-all duration-300"
              >
                Copy JSON
              </button>
            </div>
            <pre className="p-4 bg-glass/60 backdrop-blur-xl rounded-xl text-xs text-text-secondary overflow-auto max-h-[calc(100vh-200px)] font-mono whitespace-pre-wrap border border-border-color/50">
              {JSON.stringify(storeDocument, null, 2)}
            </pre>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-3 h-12 bg-glass/60 backdrop-blur-xl border-b border-border-color shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/email-templates')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4 text-text-secondary" />
          </button>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setHasChanges(true) }}
              className="text-sm font-semibold bg-transparent border-none text-text-primary focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 w-48"
              placeholder="Template Name"
            />
            {hasChanges && <span className="text-[10px] text-yellow-500 whitespace-nowrap">Unsaved</span>}
          </div>
        </div>

        {/* Center tabs */}
        <div className="flex items-center gap-1 bg-glass/60 backdrop-blur-xl rounded-lg p-0.5 border border-border-color/50">
          {([
            { tab: 'editor' as const, label: 'Editor' },
            { tab: 'preview' as const, label: 'Preview' },
            { tab: 'html' as const, label: 'HTML' },
            { tab: 'json' as const, label: 'JSON' },
          ]).map(({ tab, label }) => (
            <button
              key={tab}
              onClick={() => setSelectedMainTab(tab)}
              className={`px-3 py-1 text-xs rounded-md transition-all duration-300 cursor-pointer ${
                selectedMainTab === tab ? 'bg-primary text-background font-medium shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Undo/Redo */}
          <div className="flex items-center border border-border-color rounded-lg overflow-hidden">
            <button onClick={undo} disabled={!canUndo} className="p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed" title="Undo (Ctrl+Z)">
              <Undo2 className="w-3.5 h-3.5 text-text-secondary" />
            </button>
            <button onClick={redo} disabled={!canRedo} className="p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed" title="Redo (Ctrl+Y)">
              <Redo2 className="w-3.5 h-3.5 text-text-secondary" />
            </button>
          </div>

          {/* Screen size toggle */}
          <div className="flex items-center border border-border-color rounded-lg overflow-hidden">
            <button
              onClick={() => setSelectedScreenSize('desktop')}
              className={`p-1.5 transition-all duration-300 ${selectedScreenSize === 'desktop' ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:bg-glass-light'}`}
              title="Desktop"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSelectedScreenSize('mobile')}
              className={`p-1.5 transition-all duration-300 ${selectedScreenSize === 'mobile' ? 'bg-primary text-background shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-text-secondary hover:bg-glass-light'}`}
              title="Mobile"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-text-secondary hover:bg-glass-light"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-glass/60 backdrop-blur-xl border border-border-color rounded-lg text-xs text-text-primary hover:bg-glass-light transition-all duration-300"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                template?.status === 'published' ? 'bg-green-500' : template?.status === 'archived' ? 'bg-gray-500' : 'bg-yellow-500'
              }`} />
              {template?.status || 'draft'}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showSettings && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
                <div className="absolute right-0 top-full mt-1 w-36 bg-glass/80 backdrop-blur-2xl border border-border-color rounded-xl shadow-2xl z-20 py-1">
                  {(['draft', 'published', 'archived'] as EmailTemplateStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => { handleStatusChange(s); setShowSettings(false) }}
                      className="w-full px-3 py-1.5 text-left text-xs text-text-primary hover:bg-white/10 flex items-center gap-2"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${s === 'published' ? 'bg-green-500' : s === 'archived' ? 'bg-gray-500' : 'bg-yellow-500'}`} />
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Preview */}
          <button
            onClick={() => navigate(`/email-templates/${templateId}/preview`)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-glass/60 backdrop-blur-xl border border-border-color rounded-lg text-xs text-text-primary hover:bg-glass-light transition-all duration-300"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background font-bold rounded-lg hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:scale-105 transition-all duration-300 disabled:opacity-50 text-xs shadow-md"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Subject line */}
      <div className="px-4 py-1.5 bg-glass/40 backdrop-blur-xl border-b border-border-color shrink-0">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <label className="text-xs text-text-secondary whitespace-nowrap">Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setHasChanges(true) }}
            className="flex-1 px-3 py-1 bg-glass-light/60 border border-border-color rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs transition-all duration-300"
            placeholder="Enter email subject line..."
          />
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Block palette sidebar */}
        {blockPaletteOpen && selectedMainTab === 'editor' && (
          <div className="w-56 bg-glass/40 backdrop-blur-xl border-r border-border-color p-3 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-text-primary">Add Block</h3>
              <button onClick={toggleBlockPaletteOpen} className="p-1 hover:bg-white/10 rounded text-text-secondary">
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BLOCK_PALETTE.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => addBlockToRoot(type)}
                  className="flex flex-col items-center gap-1 p-2.5 bg-glass-light/60 hover:bg-glass-light/80 rounded-lg text-text-primary text-[10px] transition-all duration-300 cursor-pointer border border-border-color hover:border-primary/40 hover:scale-105 hover:shadow-md"
                >
                  <Icon className="w-4 h-4 text-primary" /> {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Toggle sidebar button when collapsed */}
        {!blockPaletteOpen && selectedMainTab === 'editor' && (
          <button
            onClick={toggleBlockPaletteOpen}
            className="w-10 bg-glass/40 backdrop-blur-xl border-r border-border-color flex items-start justify-center pt-3 hover:bg-glass-light transition-all duration-300 shrink-0"
          >
            <PanelLeftOpen className="w-4 h-4 text-text-secondary" />
          </button>
        )}

        {/* Center: Canvas */}
        <div className="flex-1 overflow-auto bg-glass-light/20" style={{ minWidth: 370 }}>
          {renderMainPanel()}
        </div>

        {/* Right: Inspector panel */}
        {selectedMainTab === 'editor' && (
          <>
            <InspectorPanel />
            {!inspectorDrawerOpen && (
              <button
                onClick={toggleInspectorDrawerOpen}
                className="w-10 bg-glass/40 backdrop-blur-xl border-l border-border-color flex items-start justify-center pt-3 hover:bg-glass-light transition-all duration-300 shrink-0"
              >
                <PanelRightOpen className="w-4 h-4 text-text-secondary" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
