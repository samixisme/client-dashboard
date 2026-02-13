
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Project } from '../../types';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from '../../utils/firebase';
import { Textarea } from '../ui/textarea';
import { slugify } from '../../utils/slugify';
import { ImageIcon } from '../icons/ImageIcon';
import { toast } from 'sonner';
import CustomSelect from '../common/CustomSelect';

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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-glass/60 backdrop-blur-2xl w-full max-w-lg rounded-2xl shadow-2xl border border-border-color p-8 max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-text-primary">{isEditing ? 'Edit Project' : 'Add New Project'}</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors duration-200 p-1 hover:bg-glass-light rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && <div className="bg-red-500/15 text-red-400 border border-red-500/30 p-4 rounded-xl text-sm mb-6 backdrop-blur-sm flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col items-center mb-6">
                        <label className="block text-sm font-bold text-text-secondary mb-3 uppercase tracking-wider">Project Logo</label>
                        <div className="relative group w-28 h-28 rounded-2xl overflow-hidden bg-glass-light/50 backdrop-blur-sm border-2 border-border-color hover:border-primary/50 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Project Logo" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-10 h-10 text-text-secondary/40 group-hover:text-text-secondary/60 transition-colors duration-300" />
                            )}
                            <label htmlFor="project-logo" className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center cursor-pointer">
                                <div className="text-center">
                                    <svg className="w-6 h-6 text-white mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-white text-xs font-semibold">Change</span>
                                </div>
                                <input id="project-logo" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            </label>
                        </div>
                        {isLoading && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="font-medium">Uploading...</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="projectName" className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Project Name</label>
                        <input
                            id="projectName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Enter project name"
                            className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-medium shadow-sm"
                        />
                    </div>
                     <div>
                        <label htmlFor="projectDescription" className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Description</label>
                        <Textarea
                            id="projectDescription"
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your project..."
                            className="px-4 py-3 bg-glass-light rounded-xl font-medium shadow-sm"
                        />
                    </div>
                     <div>
                        <label htmlFor="brandId" className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Brand</label>
                        <CustomSelect
                            value={brandId}
                            onChange={(value) => setBrandId(value)}
                            options={data.brands.map(brand => ({
                                value: brand.id,
                                label: brand.name
                            }))}
                            placeholder="Select a brand"
                        />
                    </div>

                    <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-border-color/50">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-6 py-3 bg-glass-light text-text-primary text-sm font-bold rounded-xl hover:bg-border-color hover:scale-105 disabled:opacity-50 transition-all duration-300 border border-border-color shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-3 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-105 disabled:opacity-50 transition-all duration-300 shadow-lg relative overflow-hidden group/btn"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {isLoading && <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />}
                                {isEditing ? 'Save Changes' : 'Create Project'}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEditProjectModal;
