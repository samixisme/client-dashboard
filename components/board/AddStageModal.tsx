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
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-glass/60 backdrop-blur-xl w-full max-w-md rounded-2xl shadow-2xl border border-border-color p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center"><span className="w-2 h-2 rounded-full bg-primary mr-3"></span>New Stage</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="appearance-none block w-full px-4 py-2.5 border border-border-color bg-glass-light backdrop-blur-sm placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 shadow-sm focus:shadow-lg focus:scale-[1.02] sm:text-sm"
                        />
                    </div>
                    <div>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as 'Open' | 'Closed')}
                            required
                            className="appearance-none block w-full px-4 py-2.5 border border-border-color bg-glass-light backdrop-blur-sm placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 shadow-sm focus:shadow-lg focus:scale-[1.02] sm:text-sm"
                        >
                            <option value="Open">Open</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-xl hover:bg-border-color hover:scale-105 transition-all duration-300 hover:shadow-md">Cancel</button>
                        <button type="submit" className="px-4 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group/btn">
                            <span className="relative z-10">Save</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStageModal;
