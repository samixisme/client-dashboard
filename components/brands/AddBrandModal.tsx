import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';

interface AddBrandModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddBrand: (details: { name: string; memberIds: string[] }) => void;
}

const AddBrandModal: React.FC<AddBrandModalProps> = ({ isOpen, onClose, onAddBrand }) => {
    const { data } = useData();
    const [name, setName] = useState('');
    // Default the current user ('user-1') as a member of the new brand
    const [selectedMembers, setSelectedMembers] = useState<string[]>(['user-1']);

    const handleMemberToggle = (memberId: string) => {
        // Prevent deselecting the creator
        if (memberId === 'user-1') return;
        setSelectedMembers(prev => 
            prev.includes(memberId) 
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onAddBrand({ name, memberIds: selectedMembers });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div
                className="bg-glass/90 backdrop-blur-2xl w-full max-w-lg rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-border-color/50 p-8 animate-scale-in relative overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <style>{`
                    @keyframes scale-in {
                        from {
                            opacity: 0;
                            transform: scale(0.95);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }
                    .animate-scale-in {
                        animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                `}</style>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-text-primary">Add New Brand</h2>
                        <button
                            onClick={onClose}
                            className="text-text-secondary hover:text-text-primary transition-colors p-1 hover:bg-glass-light rounded-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="brandName" className="block text-sm font-semibold text-text-secondary mb-2">Brand Name</label>
                            <input
                                id="brandName"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoFocus
                                className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light/60 backdrop-blur-sm placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 shadow-sm focus:shadow-lg"
                                placeholder="Enter brand name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-text-secondary mb-2">Assign Members</label>
                            <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-glass-light/60 backdrop-blur-sm rounded-xl border border-border-color shadow-inner">
                                {data.board_members.map(member => (
                                    <label
                                        key={member.id}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-glass transition-all duration-200 cursor-pointer group"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedMembers.includes(member.id)}
                                            onChange={() => handleMemberToggle(member.id)}
                                            disabled={member.id === 'user-1'}
                                            className="h-5 w-5 rounded-md bg-glass border-border-color text-primary focus:ring-2 focus:ring-primary disabled:opacity-50 cursor-pointer transition-all duration-200"
                                        />
                                        <img
                                            src={member.avatarUrl}
                                            alt={member.name}
                                            className="w-9 h-9 rounded-full border-2 border-surface shadow-md group-hover:border-primary group-hover:scale-110 transition-all duration-300"
                                        />
                                        <span className="font-medium text-text-primary group-hover:text-primary transition-colors duration-200">{member.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border-color/50">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 bg-glass-light text-text-primary text-sm font-semibold rounded-xl hover:bg-border-color hover:scale-105 transition-all duration-300 shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-105 transition-all duration-300 shadow-lg relative overflow-hidden group"
                            >
                                <span className="relative z-10">Create Brand</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddBrandModal;