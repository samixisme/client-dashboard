import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditIcon } from '../icons/EditIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { CancelIcon } from '../icons/CancelIcon';
import { DeleteIcon } from '../icons/DeleteIcon';
import { PlayIcon } from '../icons/PlayIcon';
import { CommentsIcon } from '../icons/CommentsIcon';
import VersionDropdown from './VersionDropdown';
import { Textarea } from '../ui/textarea';

interface FeedbackItemVersion {
    versionNumber: number;
    assetUrl: string;
    createdAt: { seconds: number } | string;
    createdBy: string;
    notes?: string;
}

interface FeedbackItemCardProps {
    type: 'video' | 'mockup';
    id: string;
    name: string;
    description?: string;
    assetUrl: string;
    version?: string;
    createdAt?: { seconds: number } | string;
    commentCount?: number;
    approved?: boolean;
    status?: string;
    projectId: string;
    projectName?: string;
    feedbackItemId?: string; // For mockup screens
    versions?: FeedbackItemVersion[]; // All versions of this item
    currentVersion?: number; // Which version is currently being displayed
    images?: {id: string, name: string, url: string, approved?: boolean}[]; // For mockup screens count
    onEdit?: (id: string, newName: string, newDescription?: string) => void;
    onDelete?: (id: string) => void;
    onToggleApproval?: (id: string) => void;
    onNavigate?: (versionNumber?: number) => void;
    index?: number;
    showDelete?: boolean;
    showVersionDropdown?: boolean; // Control version dropdown visibility
    showScreensCount?: boolean; // Control screens count pill visibility (only for mockup collections)
}

const FeedbackItemCard: React.FC<FeedbackItemCardProps> = ({
    type,
    id,
    name,
    description,
    assetUrl,
    version = 'v1',
    createdAt,
    commentCount = 0,
    approved,
    status,
    projectId,
    projectName,
    feedbackItemId,
    versions = [],
    currentVersion = 1,
    images = [],
    onEdit,
    onDelete,
    onToggleApproval,
    onNavigate,
    index = 0,
    showDelete = false,
    showVersionDropdown = true,
    showScreensCount = false
}) => {
    const navigate = useNavigate();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const isApproved = type === 'mockup' ? approved : status === 'approved';

    const handleEdit = () => {
        console.log('Edit button clicked for:', id, name);
        setEditingId(id);
        setEditName(name);
        setEditDescription(description || '');
    };

    const handleSaveEdit = () => {
        console.log('Save button clicked:', { id, editName, editDescription });
        if (onEdit) {
            console.log('Calling onEdit callback');
            onEdit(id, editName, editDescription);
        } else {
            console.error('onEdit callback is not defined!');
        }
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditDescription('');
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onToggleApproval) {
            onToggleApproval(id);
        }
    };

    const handleClick = (versionNumber?: number) => {
        if (onNavigate) {
            onNavigate(versionNumber);
        } else if (type === 'video') {
            const versionParam = versionNumber ? `?version=${versionNumber}` : '';
            navigate(`/feedback/${projectId}/video/${id}${versionParam}`);
        } else if (type === 'mockup' && feedbackItemId) {
            const versionParam = versionNumber ? `&version=${versionNumber}` : '';
            navigate(`/feedback/${projectId}/mockup/${feedbackItemId}/view?path=${encodeURIComponent(assetUrl)}${versionParam}`);
        }
    };

    const formatDate = (date: { seconds: number } | string | undefined) => {
        if (!date) return 'N/A';
        const dateObj = typeof date === 'string'
            ? new Date(date)
            : new Date(date.seconds * 1000);
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <>
            <div
                className="bg-glass/40 backdrop-blur-xl rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-500 group animate-fade-in-up relative"
                style={{ animationDelay: `${index * 50}ms` }}
            >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

                {/* Media */}
                <div
                    onClick={handleClick}
                    className="aspect-video bg-black relative overflow-hidden flex items-center justify-center cursor-pointer rounded-t-2xl"
                >
                    {type === 'video' ? (
                        <>
                            <video
                                src={assetUrl}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-300"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-primary/20 backdrop-blur-md border-2 border-primary/40 flex items-center justify-center group-hover:scale-125 group-hover:bg-primary/30 transition-all duration-300 shadow-lg">
                                    <PlayIcon className="w-7 h-7 text-white ml-1" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <img
                                src={assetUrl}
                                alt={name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <span className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                    View Feedback
                                </span>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-5 relative z-10">
                    {/* Top Row: Project Pill, Status, Comment Count */}
                    <div className="mb-3 flex items-center gap-2 flex-wrap">
                        {projectName && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-xs font-bold text-primary">{projectName}</span>
                            </div>
                        )}
                        <button
                            onClick={handleToggle}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                isApproved
                                    ? 'bg-primary/20 text-primary border-primary/30'
                                    : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                            }`}
                            title={isApproved ? 'Mark as unapproved' : 'Mark as approved'}
                        >
                            {isApproved ? 'Approved' : 'Unapproved'}
                        </button>
                        {showScreensCount && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded">
                                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs font-bold text-blue-400">{images.length || 1}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/20 border border-primary/30 rounded">
                            <CommentsIcon className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-bold text-primary">{commentCount}</span>
                        </div>
                    </div>

                    {editingId === id ? (
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-glass-light/60 border border-border-color rounded-lg px-3 py-2 text-sm font-bold text-text-primary focus:border-primary outline-none"
                                placeholder={type === 'video' ? 'Video name' : 'Screen name'}
                            />
                            {type === 'video' && (
                                <Textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="bg-glass-light/60 px-3 py-2 text-text-secondary"
                                    rows={2}
                                    placeholder="Description"
                                />
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveEdit}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-black rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-glass/40 border border-border-color text-text-secondary rounded-lg text-xs font-semibold hover:bg-glass/60 transition-colors"
                                >
                                    <CancelIcon className="w-4 h-4" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors flex-1">
                                    {name}
                                </h3>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleEdit();
                                        }}
                                        className="p-1.5 hover:bg-glass-light/60 rounded-lg text-text-secondary hover:text-primary transition-all"
                                        title={type === 'video' ? 'Edit video' : 'Edit screen'}
                                    >
                                        <EditIcon className="w-3.5 h-3.5" />
                                    </button>
                                    {showDelete && onDelete && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setDeleteConfirmId(id);
                                            }}
                                            className="p-1.5 hover:bg-glass-light/60 rounded-lg text-text-secondary hover:text-red-400 transition-all"
                                            title={type === 'video' ? 'Delete video' : 'Delete screen'}
                                        >
                                            <DeleteIcon className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {description && (
                                <p className="text-sm text-text-secondary/90 line-clamp-2 mb-3">
                                    {description}
                                </p>
                            )}
                            {showVersionDropdown && (
                                <div className="flex justify-between items-center text-xs pt-3 border-t border-border-color/30 overflow-visible">
                                    <VersionDropdown
                                        projectId={projectId}
                                        feedbackItemId={feedbackItemId || id}
                                        currentVersion={currentVersion}
                                        versions={versions}
                                        onVersionChange={(versionNumber) => {
                                            if (onNavigate) {
                                                onNavigate(versionNumber);
                                            }
                                        }}
                                        onCreateVersion={() => {
                                            navigate(type === 'video'
                                                ? `/feedback/${projectId}/videos/new`
                                                : `/feedback/${projectId}/mockup/${feedbackItemId}/screens`
                                            );
                                        }}
                                        type={type}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {deleteConfirmId === id && onDelete && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-surface border border-border-color rounded-2xl p-6 max-w-md">
                        <h3 className="text-xl font-bold text-text-primary mb-2">
                            Delete {type === 'video' ? 'Video' : 'Screen'}?
                        </h3>
                        <p className="text-text-secondary mb-6">
                            This action cannot be undone. The {type === 'video' ? 'video' : 'screen'} will be permanently removed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 px-4 py-2 rounded-lg font-medium bg-glass/40 hover:bg-glass/60 text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onDelete(id);
                                    setDeleteConfirmId(null);
                                }}
                                className="flex-1 px-4 py-2 rounded-lg font-bold bg-red-500 hover:bg-red-600 text-white transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FeedbackItemCard;
