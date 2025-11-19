import React, { useState } from 'react';
import { Stage } from '../../types';

interface AddStageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddStage: (name: string, status: 'Open' | 'Closed') => void;
}

const AddStageModal: React.FC<AddStageModalProps> = ({ isOpen, onClose, onAddStage }) => {
    const [name, setName] = useState('New Stage');
    const [status, setStatus] = useState<'Open' | 'Closed'>('Open');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onAddStage(name, status);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-glass w-full max-w-md rounded-2xl shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center"><span className="w-2 h-2 rounded-full bg-primary mr-3"></span>New Stage</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="appearance-none block w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                    <div>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as 'Open' | 'Closed')}
                            required
                            className="appearance-none block w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            <option value="Open">Open</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStageModal;
