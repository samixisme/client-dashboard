
import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';

interface AddProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddProject: (details: { name: string; description: string; brandId: string; }) => void;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onAddProject }) => {
    const { data } = useData();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [brandId, setBrandId] = useState<string>(data.brands[0]?.id || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && brandId) {
            onAddProject({ name, description, brandId });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-glass w-full max-w-lg rounded-2xl shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-6">Add New Project</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Create Project</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProjectModal;
