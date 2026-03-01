import React, { useState, useEffect } from 'react';
import { useSearch } from '../contexts/SearchContext';
import { Proposal, ProposalStatus } from '../types';
import { toast } from 'sonner';
import { Plus, X, Trash2, Pencil } from 'lucide-react';
import { useProposals } from '../hooks/useProposals';

const StatusBadge = ({ status }: { status: string }) => {
    const baseClasses = 'px-2.5 py-1 text-xs font-semibold rounded-full';
    let colorClasses = '';
    switch (status) {
        case 'Approved':
            colorClasses = 'bg-green-500/20 text-green-400 border border-green-500/30';
            break;
        case 'Pending':
            colorClasses = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
            break;
        case 'Rejected':
            colorClasses = 'bg-red-500/20 text-red-400 border border-red-500/30';
            break;
    }
    return <span className={`${baseClasses} ${colorClasses}`}>{status}</span>;
};

interface ProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (title: string, description: string) => Promise<void>;
    initialTitle?: string;
    initialDescription?: string;
    mode: 'create' | 'edit';
}

const ProposalModal: React.FC<ProposalModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialTitle = '',
    initialDescription = '',
    mode,
}) => {
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setTitle(initialTitle);
        setDescription(initialDescription);
    }, [initialTitle, initialDescription, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSaving(true);
        try {
            await onSubmit(title.trim(), description.trim());
            onClose();
        } catch {
            toast.error('Failed to save proposal');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-surface border border-border-color rounded-2xl p-6 max-w-lg w-full">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-primary">
                        {mode === 'create' ? 'New Proposal' : 'Edit Proposal'}
                    </h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-glass-light/60 border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                            placeholder="Proposal title"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-glass-light/60 border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none resize-none"
                            rows={4}
                            placeholder="Describe the proposal..."
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg font-medium bg-glass/40 hover:bg-glass/60 text-text-primary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !title.trim()}
                            className="flex-1 px-4 py-2 rounded-lg font-bold bg-primary text-black hover:bg-primary-hover transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ProposalsPage = () => {
    const { searchQuery } = useSearch();
    const { proposals, loading, addProposal, updateProposal, deleteProposal, updateProposalStatus } = useProposals();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const filteredProposals = proposals.filter(
        (p) =>
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.submitter.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = async (title: string, description: string) => {
        await addProposal(title, description);
    };

    const handleEdit = async (title: string, description: string) => {
        if (!editingProposal) return;
        await updateProposal(editingProposal.id, title, description);
    };

    const handleDelete = async (id: string) => {
        await deleteProposal(id);
        setDeleteConfirmId(null);
    };

    const handleStatusChange = async (proposal: Proposal, newStatus: ProposalStatus) => {
        await updateProposalStatus(proposal.id, newStatus);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Proposals</h1>
                    <p className="mt-2 text-text-secondary">Review and manage submitted proposals.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingProposal(null);
                        setModalOpen(true);
                    }}
                    className="px-6 py-2.5 bg-primary text-black text-sm font-bold rounded-xl hover:bg-primary-hover transition-all flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Proposal
                </button>
            </div>

            <div className="bg-glass rounded-lg border border-border-color overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-color">
                        <thead className="bg-glass-light">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Title
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Submitter
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={4} className="px-6 py-4">
                                            <div className="h-4 bg-glass-light/60 rounded animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredProposals.length > 0 ? (
                                filteredProposals.map((proposal) => (
                                    <tr key={proposal.id} className="hover:bg-glass-light transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-text-primary">{proposal.title}</div>
                                            {proposal.description && (
                                                <div className="text-xs text-text-secondary mt-1 line-clamp-1">{proposal.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                            {proposal.submitter}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={proposal.status} />
                                                {proposal.status === 'Pending' && (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleStatusChange(proposal, 'Approved')}
                                                            className="px-2 py-0.5 text-xs rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(proposal, 'Rejected')}
                                                            className="px-2 py-0.5 text-xs rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingProposal(proposal);
                                                        setModalOpen(true);
                                                    }}
                                                    className="p-1.5 hover:bg-glass-light/60 rounded-lg text-text-secondary hover:text-primary transition-all"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmId(proposal.id)}
                                                    className="p-1.5 hover:bg-glass-light/60 rounded-lg text-text-secondary hover:text-red-400 transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-text-secondary">
                                        {searchQuery
                                            ? `No proposals found for "${searchQuery}".`
                                            : 'No proposals yet. Create one to get started.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit Modal */}
            <ProposalModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingProposal(null);
                }}
                onSubmit={editingProposal ? handleEdit : handleCreate}
                initialTitle={editingProposal?.title || ''}
                initialDescription={editingProposal?.description || ''}
                mode={editingProposal ? 'edit' : 'create'}
            />

            {/* Delete Confirmation */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-surface border border-border-color rounded-2xl p-6 max-w-md">
                        <h3 className="text-xl font-bold text-text-primary mb-2">Delete Proposal?</h3>
                        <p className="text-text-secondary mb-6">
                            This action cannot be undone. The proposal will be permanently removed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 px-4 py-2 rounded-lg font-medium bg-glass/40 hover:bg-glass/60 text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="flex-1 px-4 py-2 rounded-lg font-bold bg-red-500 hover:bg-red-600 text-white transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProposalsPage;
