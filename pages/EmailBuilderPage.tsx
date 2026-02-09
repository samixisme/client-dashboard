import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Eye, Plus, Trash2, ChevronDown, Type, Image, Layout, Minus, GripVertical } from 'lucide-react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { EmailTemplate, EmailTemplateStatus } from '../types'
import { toast } from 'sonner'
import { Reader } from '@usewaypoint/email-builder'

// Block types available in the email builder
type BlockType = 'Text' | 'Image' | 'Button' | 'Divider' | 'Container'

interface EmailBlock {
  type: BlockType
  data: {
    style?: Record<string, unknown>
    props?: Record<string, unknown>
  }
}

// Default blocks for new templates
const createDefaultDocument = () => ({
  root: {
    type: 'Container',
    data: {
      style: {
        backgroundColor: '#ffffff',
        padding: { top: 24, bottom: 24, left: 24, right: 24 }
      },
      props: {
        childrenIds: []
      }
    }
  }
})

// Block templates
const blockTemplates: Record<BlockType, (id: string) => Record<string, unknown>> = {
  Text: (id) => ({
    type: 'Text',
    data: {
      style: {
        color: '#333333',
        fontSize: 16,
        fontFamily: 'MODERN_SANS',
        padding: { top: 8, bottom: 8, left: 0, right: 0 }
      },
      props: {
        text: 'Enter your text here...'
      }
    }
  }),
  Image: (id) => ({
    type: 'Image',
    data: {
      style: {
        padding: { top: 8, bottom: 8, left: 0, right: 0 }
      },
      props: {
        url: 'https://placehold.co/600x200/a3e635/000000?text=Add+Your+Image',
        alt: 'Image description',
        contentAlignment: 'middle'
      }
    }
  }),
  Button: (id) => ({
    type: 'Button',
    data: {
      style: {
        backgroundColor: '#a3e635',
        padding: { top: 12, bottom: 12, left: 24, right: 24 },
        fontSize: 16,
        fontWeight: 'bold'
      },
      props: {
        text: 'Click Here',
        url: 'https://example.com'
      }
    }
  }),
  Divider: (id) => ({
    type: 'Divider',
    data: {
      style: {
        padding: { top: 16, bottom: 16, left: 0, right: 0 }
      },
      props: {
        lineColor: '#e5e5e5',
        lineHeight: 1
      }
    }
  }),
  Container: (id) => ({
    type: 'Container',
    data: {
      style: {
        backgroundColor: '#f5f5f5',
        padding: { top: 16, bottom: 16, left: 16, right: 16 }
      },
      props: {
        childrenIds: []
      }
    }
  })
}

export default function EmailBuilderPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [document, setDocument] = useState<Record<string, unknown>>(createDefaultDocument())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [showBlockMenu, setShowBlockMenu] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load template
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) {
        setLoading(false)
        return
      }

      try {
        const docRef = doc(db, 'emailTemplates', templateId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as EmailTemplate
          setTemplate(data)
          setDocument(data.document && Object.keys(data.document).length > 0 ? data.document : createDefaultDocument())
          setName(data.name)
          setSubject(data.subject || '')
        } else {
          toast.error('Template not found')
          navigate('/email-templates')
        }
      } catch (error) {
        console.error('Failed to load template:', error)
        toast.error('Failed to load template')
      } finally {
        setLoading(false)
      }
    }

    loadTemplate()
  }, [templateId, navigate])

  // Auto-save with debounce
  const debouncedSave = useCallback(
    (newDocument: Record<string, unknown>) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (!templateId) return

        try {
          await updateDoc(doc(db, 'emailTemplates', templateId), {
            document: newDocument,
            updatedAt: new Date().toISOString(),
          })
          setHasChanges(false)
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }, 3000)
    },
    [templateId]
  )

  const handleDocumentChange = useCallback(
    (newDocument: Record<string, unknown>) => {
      setDocument(newDocument)
      setHasChanges(true)
      debouncedSave(newDocument)
    },
    [debouncedSave]
  )

  const handleSave = async () => {
    if (!templateId) return

    setSaving(true)
    try {
      await updateDoc(doc(db, 'emailTemplates', templateId), {
        document,
        name,
        subject,
        updatedAt: new Date().toISOString(),
      })
      setHasChanges(false)
      toast.success('Template saved')
    } catch (error) {
      console.error('Failed to save template:', error)
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
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    }
  }

  const handlePreview = () => {
    navigate(`/email-templates/${templateId}/preview`)
  }

  // Add a new block
  const addBlock = (type: BlockType) => {
    const id = `block-${Date.now()}`
    const newBlock = blockTemplates[type](id)

    const newDocument = { ...document }
    newDocument[id] = newBlock

    // Add to root container's children
    const root = newDocument.root as { data: { props: { childrenIds: string[] } } }
    if (root?.data?.props?.childrenIds) {
      root.data.props.childrenIds = [...root.data.props.childrenIds, id]
    }

    handleDocumentChange(newDocument)
    setShowBlockMenu(false)
    setSelectedBlock(id)
  }

  // Remove a block
  const removeBlock = (blockId: string) => {
    const newDocument = { ...document }
    delete newDocument[blockId]

    // Remove from root container's children
    const root = newDocument.root as { data: { props: { childrenIds: string[] } } }
    if (root?.data?.props?.childrenIds) {
      root.data.props.childrenIds = root.data.props.childrenIds.filter((id: string) => id !== blockId)
    }

    handleDocumentChange(newDocument)
    setSelectedBlock(null)
  }

  // Update block content
  const updateBlock = (blockId: string, updates: Partial<EmailBlock['data']>) => {
    const newDocument = { ...document }
    const block = newDocument[blockId] as { data: EmailBlock['data'] }
    if (block) {
      block.data = { ...block.data, ...updates }
      if (updates.props) {
        block.data.props = { ...(block.data.props || {}), ...updates.props }
      }
      if (updates.style) {
        block.data.style = { ...(block.data.style || {}), ...updates.style }
      }
    }
    handleDocumentChange(newDocument)
  }

  // Get children blocks
  const getChildrenBlocks = () => {
    const root = document.root as { data: { props: { childrenIds: string[] } } } | undefined
    return root?.data?.props?.childrenIds || []
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const childrenIds = getChildrenBlocks()

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-border-color">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/email-templates')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setHasChanges(true)
              }}
              className="text-lg font-semibold bg-transparent border-none text-white focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1"
              placeholder="Template Name"
            />
            {hasChanges && (
              <span className="text-xs text-yellow-500">Unsaved changes</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-border-color rounded-lg text-sm text-white hover:bg-zinc-700 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${
                template?.status === 'published' ? 'bg-green-500' :
                template?.status === 'archived' ? 'bg-gray-500' : 'bg-yellow-500'
              }`} />
              {template?.status || 'draft'}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showSettings && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-800 border border-border-color rounded-lg shadow-xl z-20 py-1">
                  <button
                    onClick={() => { handleStatusChange('draft'); setShowSettings(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-yellow-500" /> Draft
                  </button>
                  <button
                    onClick={() => { handleStatusChange('published'); setShowSettings(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500" /> Published
                  </button>
                  <button
                    onClick={() => { handleStatusChange('archived'); setShowSettings(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-gray-500" /> Archived
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-border-color rounded-lg text-sm text-white hover:bg-zinc-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 bg-primary text-black font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Subject line */}
      <div className="px-4 py-2 bg-zinc-900/50 border-b border-border-color">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <label className="text-sm text-zinc-400 whitespace-nowrap">Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setHasChanges(true)
            }}
            className="flex-1 px-3 py-1.5 bg-zinc-800 border border-border-color rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary text-sm"
            placeholder="Enter email subject line..."
          />
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Block palette */}
        <div className="w-64 bg-zinc-900 border-r border-border-color p-4 overflow-y-auto">
          <h3 className="text-sm font-medium text-white mb-3">Add Block</h3>
          <div className="space-y-2">
            <button
              onClick={() => addBlock('Text')}
              className="w-full flex items-center gap-3 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm transition-colors"
            >
              <Type className="w-4 h-4 text-primary" />
              Text
            </button>
            <button
              onClick={() => addBlock('Image')}
              className="w-full flex items-center gap-3 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm transition-colors"
            >
              <Image className="w-4 h-4 text-primary" />
              Image
            </button>
            <button
              onClick={() => addBlock('Button')}
              className="w-full flex items-center gap-3 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm transition-colors"
            >
              <Layout className="w-4 h-4 text-primary" />
              Button
            </button>
            <button
              onClick={() => addBlock('Divider')}
              className="w-full flex items-center gap-3 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm transition-colors"
            >
              <Minus className="w-4 h-4 text-primary" />
              Divider
            </button>
          </div>

          {/* Block list */}
          {childrenIds.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-white mt-6 mb-3">Blocks ({childrenIds.length})</h3>
              <div className="space-y-1">
                {childrenIds.map((blockId: string, index: number) => {
                  const block = document[blockId] as { type: string } | undefined
                  return (
                    <div
                      key={blockId}
                      onClick={() => setSelectedBlock(blockId)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                        selectedBlock === blockId ? 'bg-primary/20 text-primary' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <GripVertical className="w-3 h-3" />
                      <span>{block?.type || 'Unknown'}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeBlock(blockId)
                        }}
                        className="ml-auto p-1 hover:bg-red-500/20 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Canvas - Preview area */}
        <div className="flex-1 overflow-auto p-8 bg-zinc-800/50">
          <div className="max-w-[600px] mx-auto bg-white rounded-lg shadow-2xl overflow-hidden min-h-[400px]">
            {childrenIds.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                <Plus className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">Add blocks from the sidebar to build your email</p>
              </div>
            ) : (
              <div className="p-6">
                <Reader document={document as Record<string, never>} rootBlockId="root" />
              </div>
            )}
          </div>
        </div>

        {/* Properties panel */}
        {selectedBlock && document[selectedBlock] && (
          <div className="w-72 bg-zinc-900 border-l border-border-color p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Block Properties</h3>
              <button
                onClick={() => setSelectedBlock(null)}
                className="text-zinc-400 hover:text-white"
              >
                ×
              </button>
            </div>

            {(() => {
              const block = document[selectedBlock] as { type: string; data: { props?: Record<string, unknown>; style?: Record<string, unknown> } }

              if (block.type === 'Text') {
                return (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Text Content</label>
                      <textarea
                        value={(block.data.props?.text as string) || ''}
                        onChange={(e) => updateBlock(selectedBlock, { props: { text: e.target.value } })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white text-sm resize-none h-24"
                        placeholder="Enter text..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Font Size</label>
                      <input
                        type="number"
                        value={(block.data.style?.fontSize as number) || 16}
                        onChange={(e) => updateBlock(selectedBlock, { style: { fontSize: parseInt(e.target.value) } })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Text Color</label>
                      <input
                        type="color"
                        value={(block.data.style?.color as string) || '#333333'}
                        onChange={(e) => updateBlock(selectedBlock, { style: { color: e.target.value } })}
                        className="w-full h-10 bg-zinc-800 border border-border-color rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )
              }

              if (block.type === 'Image') {
                return (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Image URL</label>
                      <input
                        type="url"
                        value={(block.data.props?.url as string) || ''}
                        onChange={(e) => updateBlock(selectedBlock, { props: { url: e.target.value } })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Alt Text</label>
                      <input
                        type="text"
                        value={(block.data.props?.alt as string) || ''}
                        onChange={(e) => updateBlock(selectedBlock, { props: { alt: e.target.value } })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white text-sm"
                        placeholder="Image description"
                      />
                    </div>
                  </div>
                )
              }

              if (block.type === 'Button') {
                return (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Button Text</label>
                      <input
                        type="text"
                        value={(block.data.props?.text as string) || ''}
                        onChange={(e) => updateBlock(selectedBlock, { props: { text: e.target.value } })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white text-sm"
                        placeholder="Click Here"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Link URL</label>
                      <input
                        type="url"
                        value={(block.data.props?.url as string) || ''}
                        onChange={(e) => updateBlock(selectedBlock, { props: { url: e.target.value } })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Background Color</label>
                      <input
                        type="color"
                        value={(block.data.style?.backgroundColor as string) || '#a3e635'}
                        onChange={(e) => updateBlock(selectedBlock, { style: { backgroundColor: e.target.value } })}
                        className="w-full h-10 bg-zinc-800 border border-border-color rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )
              }

              if (block.type === 'Divider') {
                return (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Line Color</label>
                      <input
                        type="color"
                        value={(block.data.props?.lineColor as string) || '#e5e5e5'}
                        onChange={(e) => updateBlock(selectedBlock, { props: { lineColor: e.target.value } })}
                        className="w-full h-10 bg-zinc-800 border border-border-color rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Line Height</label>
                      <input
                        type="number"
                        value={(block.data.props?.lineHeight as number) || 1}
                        onChange={(e) => updateBlock(selectedBlock, { props: { lineHeight: parseInt(e.target.value) } })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white text-sm"
                        min={1}
                        max={10}
                      />
                    </div>
                  </div>
                )
              }

              return <p className="text-zinc-400 text-sm">No properties available</p>
            })()}

            <button
              onClick={() => removeBlock(selectedBlock)}
              className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Block
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
