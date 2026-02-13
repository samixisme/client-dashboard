import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Eye, Trash2, Copy, MoreHorizontal } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import { EmailTemplate, EmailTemplateCategory, EmailTemplateStatus } from '../../types'
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../utils/firebase'
import { useUser } from '../../contexts/UserContext'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

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

export default function AdminEmailTemplatesPage() {
  const navigate = useNavigate()
  const { data } = useData()
  const { user } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EmailTemplateCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<EmailTemplateStatus | 'all'>('all')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const templates = data.emailTemplates || []

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.subject?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
      const matchesStatus = statusFilter === 'all' || template.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [templates, searchQuery, categoryFilter, statusFilter])

  const handleDuplicate = async (template: EmailTemplate) => {
    if (!user) return

    try {
      const duplicated = {
        ...template,
        id: undefined,
        name: `${template.name} (Copy)`,
        status: 'draft' as EmailTemplateStatus,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await addDoc(collection(db, 'emailTemplates'), duplicated)
      toast.success('Template duplicated')
    } catch (error) {
      console.error('Failed to duplicate:', error)
      toast.error('Failed to duplicate template')
    }
  }

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return

    try {
      await deleteDoc(doc(db, 'emailTemplates', template.id))
      toast.success('Template deleted')
    } catch (error) {
      console.error('Failed to delete:', error)
      toast.error('Failed to delete template')
    }
  }

  const handleStatusChange = async (template: EmailTemplate, status: EmailTemplateStatus) => {
    try {
      await updateDoc(doc(db, 'emailTemplates', template.id), {
        status,
        updatedAt: new Date().toISOString(),
      })
      toast.success(`Template ${status}`)
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4 animate-fade-in">
        <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <h1 className="text-4xl font-bold text-text-primary bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text">Email Templates</h1>
          <p className="mt-2 text-text-secondary/90 font-medium">Manage all email templates</p>
        </div>
        <button
          onClick={() => navigate('/email-templates/new')}
          className="px-6 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group/btn flex items-center gap-2"
        >
          <span className="relative z-10 flex items-center gap-2">
            <Plus className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" />
            New Template
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-slide-in-right">
        <div className="relative flex-1 min-w-[200px] max-w-sm group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-primary transition-all duration-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2.5 bg-glass backdrop-blur-xl border border-border-color rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 shadow-sm focus:shadow-lg"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as EmailTemplateCategory | 'all')}
          className="px-3 py-2.5 bg-glass/60 backdrop-blur-xl border border-border-color rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300"
        >
          <option value="all">All Categories</option>
          <option value="marketing">Marketing</option>
          <option value="transactional">Transactional</option>
          <option value="notification">Notification</option>
          <option value="newsletter">Newsletter</option>
          <option value="custom">Custom</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EmailTemplateStatus | 'all')}
          className="px-3 py-2.5 bg-glass/60 backdrop-blur-xl border border-border-color rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl overflow-hidden shadow-xl animate-fade-in">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-color/50 bg-glass-light/50 backdrop-blur-sm">
              <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Category</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Updated</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.map((template, index) => (
              <tr
                key={template.id}
                className="border-b border-border-color/30 last:border-b-0 hover:bg-glass-light/60 hover:shadow-lg transition-all duration-300 animate-fade-in-up group/row"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-bold text-text-primary group-hover/row:text-primary transition-colors duration-300">{template.name}</p>
                    {template.subject && (
                      <p className="text-sm text-text-secondary truncate max-w-xs">{template.subject}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${categoryColors[template.category]}`}>
                    {template.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${statusColors[template.status]}`}>
                    {template.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary/80">
                  {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => navigate(`/email-templates/${template.id}`)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4 text-text-secondary" />
                    </button>
                    <button
                      onClick={() => navigate(`/email-templates/${template.id}/preview`)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4 text-text-secondary" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === template.id ? null : template.id)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-text-secondary" />
                      </button>

                      {activeMenu === template.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-glass/80 backdrop-blur-2xl border border-border-color rounded-xl shadow-2xl z-20 py-1">
                            <button
                              onClick={() => { handleDuplicate(template); setActiveMenu(null) }}
                              className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-white/10 flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" /> Duplicate
                            </button>
                            <hr className="my-1 border-border-color" />
                            {template.status !== 'published' && (
                              <button
                                onClick={() => { handleStatusChange(template, 'published'); setActiveMenu(null) }}
                                className="w-full px-3 py-2 text-left text-sm text-green-400 hover:bg-green-500/10 flex items-center gap-2"
                              >
                                Publish
                              </button>
                            )}
                            {template.status !== 'archived' && (
                              <button
                                onClick={() => { handleStatusChange(template, 'archived'); setActiveMenu(null) }}
                                className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-glass-light flex items-center gap-2"
                              >
                                Archive
                              </button>
                            )}
                            <hr className="my-1 border-border-color" />
                            <button
                              onClick={() => { handleDelete(template); setActiveMenu(null) }}
                              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary">No templates found</p>
          </div>
        )}
      </div>
    </div>
  )
}
