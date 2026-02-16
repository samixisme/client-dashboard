import React, { useState } from 'react';
import { ScheduledPost, SocialPlatform } from '../../types';

interface SchedulePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (postData: Omit<ScheduledPost, 'id'>) => Promise<void>;
  initialData?: ScheduledPost | null;
}

const SchedulePostModal: React.FC<SchedulePostModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState({
    accountId: initialData?.accountId || '',
    platform: (initialData?.platform || 'instagram') as SocialPlatform,
    content: initialData?.content || '',
    mediaUrls: initialData?.mediaUrls || [],
    scheduledFor: initialData?.scheduledFor ? new Date(initialData.scheduledFor).toISOString().slice(0, 16) : '',
    status: initialData?.status || 'scheduled' as const,
    createdAt: initialData?.createdAt || new Date().toISOString(),
    accountHandle: initialData?.accountHandle || '',
    error: initialData?.error || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');

  const platforms: SocialPlatform[] = ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddMedia = () => {
    if (mediaUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        mediaUrls: [...(prev.mediaUrls || []), mediaUrl.trim()]
      }));
      setMediaUrl('');
    }
  };

  const handleRemoveMedia = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mediaUrls: prev.mediaUrls?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.content || !formData.scheduledFor || !formData.platform) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        scheduledFor: new Date(formData.scheduledFor).toISOString(),
        createdAt: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      console.error('Error scheduling post:', err);
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
            {initialData ? 'Edit Scheduled Post' : 'Schedule New Post'}
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
              Platform *
            </label>
            <select
              name="platform"
              value={formData.platform}
              onChange={handleChange}
              className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary capitalize"
              required
            >
              {platforms.map(platform => (
                <option key={platform} value={platform} className="capitalize">
                  {platform}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Post Content *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={4}
              className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              placeholder="What would you like to post?"
              required
            />
            <div className="text-xs text-text-secondary mt-1">
              {formData.content.length} characters
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Schedule For *
            </label>
            <input
              type="datetime-local"
              name="scheduledFor"
              value={formData.scheduledFor}
              onChange={handleChange}
              className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Account ID
            </label>
            <input
              type="text"
              name="accountId"
              value={formData.accountId}
              onChange={handleChange}
              className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              placeholder="Social account ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Media URLs
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleAddMedia}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors"
              >
                Add
              </button>
            </div>

            {formData.mediaUrls && formData.mediaUrls.length > 0 && (
              <div className="mt-2 space-y-2">
                {formData.mediaUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-glass-light rounded-lg">
                    <img src={url} alt="" className="w-12 h-12 rounded object-cover" />
                    <span className="flex-1 text-sm text-text-secondary truncate">{url}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index)}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              {isSubmitting ? 'Scheduling...' : (initialData ? 'Update Schedule' : 'Schedule Post')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchedulePostModal;
