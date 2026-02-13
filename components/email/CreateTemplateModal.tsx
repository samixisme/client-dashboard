import { useState } from 'react'
import { X } from 'lucide-react'
import { EmailTemplateCategory } from '../../types'
import { Textarea } from '../ui/textarea'

interface CreateTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; subject: string; category: EmailTemplateCategory; description: string }) => void
}

const categories: { value: EmailTemplateCategory; label: string }[] = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'notification', label: 'Notification' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'custom', label: 'Custom' },
]

export function CreateTemplateModal({ isOpen, onClose, onSubmit }: CreateTemplateModalProps) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<EmailTemplateCategory>('marketing')
  const [description, setDescription] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), subject: subject.trim(), category, description: description.trim() })
    setName('')
    setSubject('')
    setCategory('marketing')
    setDescription('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-glass/80 backdrop-blur-2xl border border-border-color rounded-2xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <h2 className="text-lg font-semibold text-text-primary">Create Email Template</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">
              Template Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Email"
              className="w-full px-3 py-2.5 bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300"
              required
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-text-secondary mb-1">
              Email Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Welcome to our platform!"
              className="w-full px-3 py-2.5 bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-1">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as EmailTemplateCategory)}
              className="w-full px-3 py-2.5 bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template..."
              rows={3}
              className="px-3 py-2.5 bg-glass-light/60 rounded-xl focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-all duration-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 text-sm font-bold bg-primary text-background rounded-xl hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
