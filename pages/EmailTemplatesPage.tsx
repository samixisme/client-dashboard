import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Grid, List } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { EmailTemplateCard } from '../components/email/EmailTemplateCard'
import { CreateTemplateModal } from '../components/email/CreateTemplateModal'
import { EmailTemplate, EmailTemplateCategory, EmailTemplateStatus } from '../types'
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { useUser } from '../contexts/UserContext'
import { toast } from 'sonner'

export default function EmailTemplatesPage() {
  const navigate = useNavigate()
  const { dataStore } = useData()
  const { user } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EmailTemplateCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<EmailTemplateStatus | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const templates = dataStore.emailTemplates || []

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
      const matchesStatus = statusFilter === 'all' || template.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [templates, searchQuery, categoryFilter, statusFilter])

  const handleCreateTemplate = async (data: {
    name: string
    subject: string
    category: EmailTemplateCategory
    description: string
  }) => {
    if (!user) return

    setIsCreating(true)
    try {
      const newTemplate = {
        name: data.name,
        subject: data.subject,
        category: data.category,
        description: data.description,
        status: 'draft' as EmailTemplateStatus,
        document: {},
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isGlobal: false,
        tags: [],
      }

      const docRef = await addDoc(collection(db, 'emailTemplates'), newTemplate)
      toast.success('Template created successfully')
      setShowCreateModal(false)
      navigate(`/email-templates/${docRef.id}`)
    } catch (error) {
      console.error('Failed to create template:', error)
      toast.error('Failed to create template')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDuplicate = async (template: EmailTemplate) => {
    if (!user) return

    try {
      const duplicatedTemplate = {
        ...template,
        id: undefined,
        name: `${template.name} (Copy)`,
        status: 'draft' as EmailTemplateStatus,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await addDoc(collection(db, 'emailTemplates'), duplicatedTemplate)
      toast.success('Template duplicated successfully')
    } catch (error) {
      console.error('Failed to duplicate template:', error)
      toast.error('Failed to duplicate template')
    }
  }

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return

    try {
      await deleteDoc(doc(db, 'emailTemplates', template.id))
      toast.success('Template deleted successfully')
    } catch (error) {
      console.error('Failed to delete template:', error)
      toast.error('Failed to delete template')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Templates</h1>
          <p className="text-zinc-400 mt-1">Create and manage your email templates</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-border-color rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
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
        </div>

        {/* Status filter */}
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

        {/* View toggle */}
        <div className="flex items-center bg-zinc-800 border border-border-color rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-primary text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Template count */}
      <p className="text-sm text-zinc-500 mb-4">
        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
      </p>

      {/* Templates grid/list */}
      {filteredTemplates.length > 0 ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'flex flex-col gap-3'
          }
        >
          {filteredTemplates.map((template) => (
            <EmailTemplateCard
              key={template.id}
              template={template}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
            <Plus className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
          <p className="text-zinc-400 mb-4">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first email template'}
          </p>
          {!searchQuery && categoryFilter === 'all' && statusFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          )}
        </div>
      )}

      {/* Create modal */}
      <CreateTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTemplate}
      />
    </div>
  )
}
