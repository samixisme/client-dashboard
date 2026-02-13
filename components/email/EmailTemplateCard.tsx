import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Edit, Eye, Copy, Trash2, Mail } from 'lucide-react'
import { EmailTemplate } from '../../types'
import { formatDistanceToNow } from 'date-fns'

interface EmailTemplateCardProps {
  template: EmailTemplate
  index?: number
  onDuplicate: (template: EmailTemplate) => void
  onDelete: (template: EmailTemplate) => void
}

const categoryColors: Record<string, string> = {
  marketing: 'bg-purple-500/15 text-purple-400 border-purple-500/50',
  transactional: 'bg-blue-500/15 text-blue-400 border-blue-500/50',
  notification: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/50',
  newsletter: 'bg-green-500/15 text-green-400 border-green-500/50',
  custom: 'bg-gray-500/15 text-gray-400 border-gray-500/50',
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/50',
  published: 'bg-green-500/15 text-green-400 border-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.2)]',
  archived: 'bg-gray-500/15 text-gray-400 border-gray-500/50',
}

export function EmailTemplateCard({ template, index, onDuplicate, onDelete }: EmailTemplateCardProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const handleEdit = () => {
    navigate(`/email-templates/${template.id}`)
  }

  const handlePreview = () => {
    navigate(`/email-templates/${template.id}/preview`)
  }

  return (
    <div
      className="group relative bg-glass/40 border border-border-color rounded-2xl backdrop-blur-xl overflow-hidden hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] hover:bg-glass/60 transition-all duration-500 animate-fade-in-up"
      style={{ animationDelay: `${(index ?? 0) * 50}ms` }}
    >
      {/* Gradient hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-glass-light/50 backdrop-blur-sm relative overflow-hidden">
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={template.name}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Mail className="w-12 h-12 text-text-secondary/60" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={handleEdit}
            className="p-2 rounded-lg bg-primary text-background hover:bg-primary-hover hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] transition-all duration-300"
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
      <div className="p-4 relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-text-primary truncate group-hover:text-primary transition-colors duration-300">{template.name}</h3>
            {template.subject && (
              <p className="text-sm text-text-secondary truncate mt-0.5">{template.subject}</p>
            )}
          </div>

          {/* Menu button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-text-secondary" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-glass/80 backdrop-blur-2xl border border-border-color rounded-xl shadow-2xl z-20 py-1">
                  <button
                    onClick={() => { handleEdit(); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-white/10 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { handlePreview(); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-white/10 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                  <button
                    onClick={() => { onDuplicate(template); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-white/10 flex items-center gap-2"
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
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${categoryColors[template.category]}`}>
            {template.category}
          </span>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${statusColors[template.status]}`}>
            {template.status}
          </span>
        </div>

        {/* Meta */}
        <p className="text-xs text-text-secondary/80 mt-3">
          Updated {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
