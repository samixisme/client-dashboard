import React, { useState } from 'react';
import { SocialAccount, SocialPlatform } from '../../types';

interface AddEditSocialAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (accountData: Omit<SocialAccount, 'id'>) => Promise<void>;
  initialData?: SocialAccount | null;
}

const AddEditSocialAccountModal: React.FC<AddEditSocialAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState({
    platform: (initialData?.platform || 'instagram') as SocialPlatform,
    handle: initialData?.handle || '',
    displayName: initialData?.displayName || '',
    avatarUrl: initialData?.avatarUrl || '',
    followers: initialData?.followers || 0,
    following: initialData?.following || 0,
    posts: initialData?.posts || 0,
    isConnected: initialData?.isConnected ?? true,
    lastSynced: initialData?.lastSynced || new Date().toISOString()
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const platforms: SocialPlatform[] = ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.handle || !formData.displayName) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving social account:', err);
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
            {initialData ? 'Edit Social Account' : 'Connect Social Account'}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Handle *
              </label>
              <input
                type="text"
                name="handle"
                value={formData.handle}
                onChange={handleChange}
                placeholder="@username"
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Display Name *
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Avatar URL
            </label>
            <input
              type="url"
              name="avatarUrl"
              value={formData.avatarUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Followers
              </label>
              <input
                type="number"
                name="followers"
                value={formData.followers}
                onChange={handleChange}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Following
              </label>
              <input
                type="number"
                name="following"
                value={formData.following}
                onChange={handleChange}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Posts
              </label>
              <input
                type="number"
                name="posts"
                value={formData.posts}
                onChange={handleChange}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isConnected"
              id="isConnected"
              checked={formData.isConnected}
              onChange={handleChange}
              className="w-4 h-4 text-primary bg-background border-border-color rounded focus:ring-primary focus:ring-2"
            />
            <label htmlFor="isConnected" className="text-sm font-medium text-text-primary">
              Account Connected
            </label>
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
              {isSubmitting ? 'Saving...' : (initialData ? 'Update Account' : 'Connect Account')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditSocialAccountModal;
