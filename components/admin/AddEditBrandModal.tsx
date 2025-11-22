import React, { useState, useEffect } from 'react';
import { Brand } from '../../types';
import { Timestamp } from 'firebase/firestore';
import { slugify } from '../../utils/slugify';

interface AddEditBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (brandData: Omit<Brand, 'id' | 'createdAt'> & { createdAt?: Date | Timestamp }, brandId?: string) => Promise<void>;
  initialData?: Brand | null;
}

const AddEditBrandModal: React.FC<AddEditBrandModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [colors, setColors] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setLogoUrl(initialData.logoUrl || '');
        setIndustry(initialData.industry || '');
        const colorString = Array.isArray(initialData.colors)
          ? initialData.colors
              .map(c => (typeof c === 'string' ? c : (c as any).hex))
              .join(', ')
          : '';
        setColors(colorString);
      } else {
        setName('');
        setLogoUrl('');
        setIndustry('');
        setColors('');
      }
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Brand name is required.');
      return;
    }
    setIsLoading(true);
    setError('');

    const brandId = initialData ? initialData.id : slugify(name);

    // Merge new data with existing data if editing, to preserve detailed fields
    const existingData = initialData ? {
        logos: initialData.logos || [],
        fonts: initialData.fonts || [],
        brandVoice: initialData.brandVoice || '',
        brandPositioning: initialData.brandPositioning || '',
        imagery: initialData.imagery || [],
        graphics: initialData.graphics || [],
        memberIds: initialData.memberIds || [],
    } : {};
    
    const brandData: Omit<Brand, 'id' | 'createdAt'> = {
      ...existingData,
      name,
      logoUrl,
      industry,
      colors: colors.split(',').map(c => c.trim()).filter(c => c),
    };

    try {
      await onSave(brandData, brandId);
      onClose();
    } catch (err) {
      setError('Failed to save brand. A brand with this name may already exist.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-glass border border-border-color rounded-xl shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <h2 className="text-2xl font-bold text-text-primary">{initialData ? 'Edit Brand' : 'Add New Brand'}</h2>
          
          {error && <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-lg text-sm">{error}</div>}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">Brand Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                required
                disabled={!!initialData} // Disable name change on edit to keep ID consistent
              />
               {initialData && <p className="text-xs text-text-secondary mt-1">Brand name cannot be changed as it's used for the URL.</p>}
            </div>
            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-text-secondary mb-1">Logo URL</label>
              <input
                id="logoUrl"
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-text-secondary mb-1">Industry</label>
              <input
                id="industry"
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
             <div>
              <label htmlFor="colors" className="block text-sm font-medium text-text-secondary mb-1">Colors (comma-separated hex values)</label>
              <input
                id="colors"
                type="text"
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                placeholder="e.g., #FFFFFF, #000000"
                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          
          <div className="flex justify-end items-center gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditBrandModal;
