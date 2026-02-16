import React, { useState } from 'react';
import { CalendarEvent } from '../../types';

interface AddEditCalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Omit<CalendarEvent, 'id'>) => Promise<void>;
  initialData?: CalendarEvent | null;
}

const AddEditCalendarEventModal: React.FC<AddEditCalendarEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().slice(0, 16) : '',
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().slice(0, 16) : '',
    type: initialData?.type || 'manual' as const,
    sourceId: initialData?.sourceId || null,
    userId: initialData?.userId || '',
    brandId: initialData?.brandId || '',
    projectId: initialData?.projectId || '',
    taskId: initialData?.taskId || '',
    reminder: initialData?.reminder || '',
    meetLink: initialData?.meetLink || '',
    feedbackItemId: initialData?.feedbackItemId || '',
    assignees: initialData?.assignees || []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      });
      onClose();
    } catch (err) {
      console.error('Error saving event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-glass border border-border-color rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-glass-light border-b border-border-color p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary">
            {initialData ? 'Edit Calendar Event' : 'Add Calendar Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Start Date *
              </label>
              <input
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                End Date *
              </label>
              <input
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Event Type *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="manual">Manual</option>
              <option value="task">Task</option>
              <option value="invoice">Invoice</option>
              <option value="estimate">Estimate</option>
              <option value="roadmap_item">Roadmap Item</option>
              <option value="comment">Comment</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Project ID
              </label>
              <input
                type="text"
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Brand ID
              </label>
              <input
                type="text"
                name="brandId"
                value={formData.brandId}
                onChange={handleChange}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Google Meet Link
            </label>
            <input
              type="url"
              name="meetLink"
              value={formData.meetLink}
              onChange={handleChange}
              placeholder="https://meet.google.com/..."
              className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Reminder
            </label>
            <input
              type="text"
              name="reminder"
              value={formData.reminder}
              onChange={handleChange}
              placeholder="e.g., 1 hour before, 1 day before"
              className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-text-secondary hover:text-text-primary bg-glass hover:bg-glass-light border border-border-color rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (initialData ? 'Update Event' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditCalendarEventModal;
