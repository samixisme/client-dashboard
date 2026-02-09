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

export default function AdminEmailTemplatesPage() {
  const navigate = useNavigate()
  const { dataStore } = useData()
  const { user } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EmailTemplateCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<EmailTemplateStatus | 'all'>('all')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const templates = dataStore.emailTemplates || []

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Templates</h1>
          <p className="text-zinc-400 mt-1">Manage all email templates</p>
        </div>
        <button
          onClick={() => navigate('/email-templates/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-border-color rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as EmailTemplateCategory | 'all')}
          className="px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white focus:outline-none focus:border-primary"
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
          className="px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white focus:outline-none focus:border-primary"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-glass border border-border-color rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-color">
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Category</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Updated</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.map((template) => (
              <tr key={template.id} className="border-b border-border-color last:border-b-0 hover:bg-white/5">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{template.name}</p>
                    {template.subject && (
                      <p className="text-sm text-zinc-400 truncate max-w-xs">{template.subject}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[template.category]}`}>
                    {template.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[template.status]}`}>
                    {template.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">
                  {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => navigate(`/email-templates/${template.id}`)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => navigate(`/email-templates/${template.id}/preview`)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4 text-zinc-400" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === template.id ? null : template.id)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                      </button>

                      {activeMenu === template.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-800 border border-border-color rounded-lg shadow-xl z-20 py-1">
                            <button
                              onClick={() => { handleDuplicate(template); setActiveMenu(null) }}
                              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
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
                                className="w-full px-3 py-2 text-left text-sm text-zinc-400 hover:bg-white/10 flex items-center gap-2"
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
            <p className="text-zinc-400">No templates found</p>
          </div>
        )}
      </div>
    </div>
  )
}
