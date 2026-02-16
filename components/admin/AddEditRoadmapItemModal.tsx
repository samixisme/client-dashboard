import React, { useState } from 'react';
import { RoadmapItem } from '../../types';

interface AddEditRoadmapItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<RoadmapItem, 'id'>) => Promise<void>;
  initialData?: RoadmapItem | null;
}

const AddEditRoadmapItemModal: React.FC<AddEditRoadmapItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState({
    projectId: initialData?.projectId || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || 'Planned' as const,
    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().slice(0, 10) : '',
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().slice(0, 10) : '',
    assignees: initialData?.assignees || [],
    order: initialData?.order || 0,
    attachments: initialData?.attachments || [],
    labelIds: initialData?.labelIds || [],
    quarter: initialData?.quarter || '',
    backgroundPattern: initialData?.backgroundPattern || '',
    sortConfig: initialData?.sortConfig || undefined
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
      console.error('Error saving roadmap item:', err);
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
            {initialData ? 'Edit Roadmap Item' : 'Add Roadmap Item'}
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

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Quarter
              </label>
              <input
                type="text"
                name="quarter"
                value={formData.quarter}
                onChange={handleChange}
                placeholder="e.g., Q1 2024"
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Start Date *
              </label>
              <input
                type="date"
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
                type="date"
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
              Order
            </label>
            <input
              type="number"
              name="order"
              value={formData.order}
              onChange={handleChange}
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
              {isSubmitting ? 'Saving...' : (initialData ? 'Update Item' : 'Create Item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditRoadmapItemModal;
