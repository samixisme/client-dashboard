
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Project } from '../../types';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from '../../utils/firebase';
import { slugify } from '../../utils/slugify';
import { ImageIcon } from '../icons/ImageIcon';
import { toast } from 'sonner';

interface AddEditProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (details: { name: string; description: string; brandId: string; logoUrl?: string }) => void;
    initialData?: Project | null;
}

const AddEditProjectModal: React.FC<AddEditProjectModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const { data } = useData();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [brandId, setBrandId] = useState<string>('');
    const [logoUrl, setLogoUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setDescription(initialData.description);
                setBrandId(initialData.brandId);
                setLogoUrl(initialData.logoUrl || '');
            } else {
                setName('');
                setDescription('');
                setBrandId(data.brands[0]?.id || '');
                setLogoUrl('');
            }
            setError('');
        }
    }, [isOpen, initialData, data.brands]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const uniqueId = `project-logo-${Date.now()}`;
        
        setIsLoading(true);
        setError('');
        
        // Use a temporary name if project name isn't set yet
        const projectNameSlug = slugify(name || 'new-project');
        const storageRef = ref(storage, `projects/${projectNameSlug}/logo/${file.name}`);
        
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            setLogoUrl(downloadURL);
            toast.success('Logo uploaded');
        } catch (err) {
            console.error(`Error uploading project logo:`, err);
            toast.error('Failed to upload logo');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && brandId) {
            onSave({ name, description, brandId, logoUrl });
        }
    };

    if (!isOpen) return null;

    const isEditing = !!initialData;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-glass w-full max-w-lg rounded-2xl shadow-xl border border-border-color p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-6">{isEditing ? 'Edit Project' : 'Add New Project'}</h2>
                
                {error && <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-lg text-sm mb-4">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col items-center mb-6">
                        <label className="block text-sm font-medium text-text-secondary mb-2">Project Logo</label>
                        <div className="relative group w-24 h-24 rounded-xl overflow-hidden bg-glass-light border border-border-color flex items-center justify-center">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Project Logo" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-8 h-8 text-text-secondary opacity-50" />
                            )}
                            <label htmlFor="project-logo" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                <span className="text-white text-xs font-medium">Change</span>
                                <input id="project-logo" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            </label>
                        </div>
                        {isLoading && <span className="text-xs text-text-secondary mt-1">Uploading...</span>}
                    </div>

                    <div>
                        <label htmlFor="projectName" className="block text-sm font-medium text-text-secondary mb-1">Project Name</label>
                        <input
                            id="projectName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="appearance-none block w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                     <div>
                        <label htmlFor="projectDescription" className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                        <textarea
                            id="projectDescription"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                     <div>
                        <label htmlFor="brandId" className="block text-sm font-medium text-text-secondary mb-1">Brand</label>
                        <select
                            id="brandId"
                            value={brandId}
                            onChange={(e) => setBrandId(e.target.value)}
                            required
                            className="appearance-none block w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            {data.brands.map(brand => (
                                <option key={brand.id} value={brand.id}>{brand.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover disabled:opacity-50">{isEditing ? 'Save Changes' : 'Create Project'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEditProjectModal;
