import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Monitor, Tablet, Smartphone, Copy, Download, Send, Check } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { EmailTemplate } from '../types'
import { toast } from 'sonner'

// Email builder render function
import { renderToStaticMarkup } from '@usewaypoint/email-builder'

type DeviceType = 'desktop' | 'tablet' | 'mobile'

const deviceWidths: Record<DeviceType, number> = {
  desktop: 800,
  tablet: 600,
  mobile: 375,
}

export default function EmailPreviewPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [device, setDevice] = useState<DeviceType>('desktop')
  const [copied, setCopied] = useState(false)

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

  const htmlContent = useMemo(() => {
    if (!template?.document) return ''
    try {
      return renderToStaticMarkup(template.document, { rootBlockId: 'root' })
    } catch (error) {
      console.error('Failed to render email:', error)
      return '<p>Failed to render email content</p>'
    }
  }, [template?.document])

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent)
      setCopied(true)
      toast.success('HTML copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('Failed to copy HTML')
    }
  }

  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template?.name || 'email-template'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('HTML file downloaded')
  }

  const handleSendTest = () => {
    toast.info('Test email functionality coming soon')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-border-color">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/email-templates/${templateId}`)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>

          <div>
            <h1 className="text-lg font-semibold text-white">{template?.name}</h1>
            {template?.subject && (
              <p className="text-sm text-zinc-400">Subject: {template.subject}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Device switcher */}
          <div className="flex items-center bg-zinc-800 border border-border-color rounded-lg overflow-hidden">
            <button
              onClick={() => setDevice('desktop')}
              className={`p-2 ${device === 'desktop' ? 'bg-primary text-black' : 'text-zinc-400 hover:text-white'}`}
              title="Desktop"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={`p-2 ${device === 'tablet' ? 'bg-primary text-black' : 'text-zinc-400 hover:text-white'}`}
              title="Tablet"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`p-2 ${device === 'mobile' ? 'bg-primary text-black' : 'text-zinc-400 hover:text-white'}`}
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCopyHtml}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-border-color rounded-lg text-sm text-white hover:bg-zinc-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            Copy HTML
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-border-color rounded-lg text-sm text-white hover:bg-zinc-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>

          <button
            onClick={handleSendTest}
            className="flex items-center gap-2 px-4 py-1.5 bg-primary text-black font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
            Send Test
          </button>
        </div>
      </header>

      {/* Preview area */}
      <div className="flex-1 overflow-auto p-8 bg-zinc-900/50">
        <div
          className="mx-auto bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
          style={{ width: deviceWidths[device], maxWidth: '100%' }}
        >
          <iframe
            srcDoc={htmlContent}
            className="w-full min-h-[600px] border-none"
            title="Email Preview"
            style={{ height: 'calc(100vh - 200px)' }}
          />
        </div>
      </div>

      {/* Device indicator */}
      <div className="text-center py-2 bg-zinc-900 border-t border-border-color">
        <p className="text-xs text-zinc-500">
          {device.charAt(0).toUpperCase() + device.slice(1)} Preview ({deviceWidths[device]}px)
        </p>
      </div>
    </div>
  )
}
