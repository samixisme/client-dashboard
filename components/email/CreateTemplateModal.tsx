import { useState } from 'react'
import { X } from 'lucide-react'
import { EmailTemplateCategory } from '../../types'

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

      <div className="relative w-full max-w-md bg-zinc-900 border border-border-color rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <h2 className="text-lg font-semibold text-white">Create Email Template</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">
              Template Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Email"
              className="w-full px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-zinc-300 mb-1">
              Email Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Welcome to our platform!"
              className="w-full px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-zinc-300 mb-1">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as EmailTemplateCategory)}
              className="w-full px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white focus:outline-none focus:border-primary"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template..."
              rows={3}
              className="w-full px-3 py-2 bg-zinc-800 border border-border-color rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
