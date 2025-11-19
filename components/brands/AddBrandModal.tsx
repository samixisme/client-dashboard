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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-glass w-full max-w-lg rounded-2xl shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-6">Add New Brand</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="brandName" className="block text-sm font-medium text-text-secondary mb-1">Brand Name</label>
                        <input
                            id="brandName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                            className="appearance-none block w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Assign Members</label>
                        <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-glass-light rounded-lg border border-border-color">
                            {data.board_members.map(member => (
                                <label key={member.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-light cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedMembers.includes(member.id)}
                                        onChange={() => handleMemberToggle(member.id)}
                                        disabled={member.id === 'user-1'}
                                        className="h-5 w-5 rounded bg-glass border-border-color text-primary focus:ring-primary disabled:opacity-50"
                                    />
                                    <img src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full" />
                                    <span className="font-medium text-text-primary">{member.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Create Brand</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddBrandModal;