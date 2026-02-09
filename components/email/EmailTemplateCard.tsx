import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Edit, Eye, Copy, Trash2, Mail } from 'lucide-react'
import { EmailTemplate } from '../../types'
import { formatDistanceToNow } from 'date-fns'

interface EmailTemplateCardProps {
  template: EmailTemplate
  onDuplicate: (template: EmailTemplate) => void
  onDelete: (template: EmailTemplate) => void
}

const categoryColors: Record<string, string> = {
  marketing: 'bg-purple-500/20 text-purple-400',
  transactional: 'bg-blue-500/20 text-blue-400',
  notification: 'bg-yellow-500/20 text-yellow-400',
  newsletter: 'bg-green-500/20 text-green-400',
  custom: 'bg-gray-500/20 text-gray-400',
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400',
  published: 'bg-green-500/20 text-green-400',
  archived: 'bg-gray-500/20 text-gray-400',
}

export function EmailTemplateCard({ template, onDuplicate, onDelete }: EmailTemplateCardProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const handleEdit = () => {
    navigate(`/email-templates/${template.id}`)
  }

  const handlePreview = () => {
    navigate(`/email-templates/${template.id}/preview`)
  }

  return (
    <div className="group relative bg-glass border border-border-color rounded-xl backdrop-blur-md overflow-hidden hover:border-primary/50 transition-all duration-200">
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-zinc-900 relative overflow-hidden">
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={template.name}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Mail className="w-12 h-12 text-zinc-600" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={handleEdit}
            className="p-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={handlePreview}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white truncate">{template.name}</h3>
            {template.subject && (
              <p className="text-sm text-zinc-400 truncate mt-0.5">{template.subject}</p>
            )}
          </div>

          {/* Menu button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-zinc-400" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-800 border border-border-color rounded-lg shadow-xl z-20 py-1">
                  <button
                    onClick={() => { handleEdit(); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { handlePreview(); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                  <button
                    onClick={() => { onDuplicate(template); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <hr className="my-1 border-border-color" />
                  <button
                    onClick={() => { onDelete(template); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mt-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[template.category]}`}>
            {template.category}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[template.status]}`}>
            {template.status}
          </span>
        </div>

        {/* Meta */}
        <p className="text-xs text-zinc-500 mt-3">
          Updated {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
