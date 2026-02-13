
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FeedbackItem } from '../types';
import { getFeedbackItem, updateFeedbackItemVideos } from '../utils/feedbackUtils';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { AddIcon } from '../components/icons/AddIcon';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { VideoIcon } from '../components/icons/VideoIcon';
import { PlayIcon } from '../components/icons/PlayIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { CheckIcon } from '../components/icons/CheckIcon';
import { CancelIcon } from '../components/icons/CancelIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { useData } from '../contexts/DataContext';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../utils/firebase';

const FeedbackVideoVersionsSelectionPage = () => {
    const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
    const navigate = useNavigate();
    const { data } = useData();
    const project = data.projects.find(p => p.id === projectId);
    const [item, setItem] = useState<FeedbackItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'approved' | 'unapproved'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newVideoName, setNewVideoName] = useState('');
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
        if (projectId && feedbackItemId) {
            getFeedbackItem(projectId, feedbackItemId).then(fetchedItem => {
                setItem(fetchedItem);
                setIsLoading(false);
            });
        }
    }, [projectId, feedbackItemId]);

    const filteredVideos = item?.videos?.filter(video => {
        if (filter === 'approved') return video.approved;
        if (filter === 'unapproved') return !video.approved;
        return true;
    }) || [];

    const handleAddVideo = async () => {
        if (!newVideoName || !newVideoUrl || !item || !projectId || !feedbackItemId) return;

        const newVideo = {
            id: `vid-${Date.now()}`,
            name: newVideoName,
            url: newVideoUrl,
            approved: false
        };

        const updatedVideos = [...(item.videos || []), newVideo];

        // Optimistic update
        const updatedItem = { ...item, videos: updatedVideos };
        setItem(updatedItem);
        setShowAddModal(false);
        setNewVideoName('');
        setNewVideoUrl('');

        await updateFeedbackItemVideos(projectId, feedbackItemId, updatedVideos);
    };

    const handleEdit = (video: { id: string; name: string; url: string; approved?: boolean }) => {
        setEditingId(video.id);
        setEditName(video.name);
    };

    const handleSaveEdit = async (videoId: string) => {
        if (!item || !projectId || !feedbackItemId) return;

        const updatedVideos = (item.videos || []).map(vid =>
            vid.id === videoId ? { ...vid, name: editName } : vid
        );

        // Optimistic update
        setItem({ ...item, videos: updatedVideos });
        setEditingId(null);

        await updateFeedbackItemVideos(projectId, feedbackItemId, updatedVideos);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleToggleApproval = async (videoId: string) => {
        if (!item || !projectId || !feedbackItemId) return;

        const updatedVideos = (item.videos || []).map(vid =>
            vid.id === videoId ? { ...vid, approved: !vid.approved } : vid
        );

        // Optimistic update
        setItem({ ...item, videos: updatedVideos });

        await updateFeedbackItemVideos(projectId, feedbackItemId, updatedVideos);
    };

    const handleDelete = async (videoId: string) => {
        if (!item || !projectId || !feedbackItemId) return;

        const updatedVideos = (item.videos || []).filter(vid => vid.id !== videoId);

        // Optimistic update
        setItem({ ...item, videos: updatedVideos });
        setDeleteConfirmId(null);

        await updateFeedbackItemVideos(projectId, feedbackItemId, updatedVideos);
    };

    const handleFileSelect = (file: File) => {
        // Validate file type
        const validTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
        if (!validTypes.includes(file.type)) {
            setUploadError('Invalid file type. Please upload a video (MP4, MOV, WebM).');
            return;
        }

        // Validate file size (500MB max)
        const maxSize = 500 * 1024 * 1024;
        if (file.size > maxSize) {
            setUploadError('File size exceeds 500MB limit.');
            return;
        }

        setSelectedFile(file);
        setUploadError('');
    };

    const handleFileUpload = async () => {
        if (!selectedFile || !item || !projectId || !feedbackItemId || !newVideoName) return;

        setUploadingFile(true);
        setUploadProgress(0);
        setUploadError('');

        try {
            const timestamp = Date.now();
            const storagePath = `feedback/videos/${projectId}/${feedbackItemId}/${timestamp}_${selectedFile.name}`;
            const storageRef = ref(storage, storagePath);

            const uploadTask = uploadBytesResumable(storageRef, selectedFile);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error('Upload error:', error);
                    setUploadError('Upload failed: ' + error.message);
                    setUploadingFile(false);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                    const newVideo = {
                        id: `vid-${timestamp}`,
                        name: newVideoName,
                        url: downloadURL,
                        approved: false
                    };

                    const updatedVideos = [...(item.videos || []), newVideo];
                    setItem({ ...item, videos: updatedVideos });
                    await updateFeedbackItemVideos(projectId, feedbackItemId, updatedVideos);

                    setShowAddModal(false);
                    setNewVideoName('');
                    setSelectedFile(null);
                    setUploadingFile(false);
                    setUploadProgress(0);
                    setUploadMode('file');
                }
            );
        } catch (error) {
            console.error('Upload failed:', error);
            setUploadError('Failed to upload file');
            setUploadingFile(false);
        }
    };

    if (isLoading) return <div className="h-screen w-full flex items-center justify-center text-text-primary">Loading...</div>;
    if (!item) return <div className="h-screen w-full flex items-center justify-center text-red-500">Item not found</div>;

    const hasVideos = item.videos && item.videos.length > 0;

    return (
        <div className="min-h-screen text-text-primary p-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <button onClick={() => navigate(`/feedback/${projectId}/videos`)} className="p-2 bg-glass/40 backdrop-blur-sm hover:bg-glass/60 rounded-full transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-text-secondary" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{item.name}</h1>
                        <p className="text-text-secondary text-sm">Select a version or clip to view feedback</p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Add Button */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                            filter === 'all'
                                ? 'bg-primary text-black shadow-lg'
                                : 'bg-glass/40 backdrop-blur-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass/60'
                        }`}
                    >
                        All ({(item.videos?.length || 0) + (!hasVideos ? 1 : 0)})
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                            filter === 'approved'
                                ? 'bg-green-500 text-white shadow-lg'
                                : 'bg-glass/40 backdrop-blur-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass/60'
                        }`}
                    >
                        Approved ({item.videos?.filter(v => v.approved).length || 0})
                    </button>
                    <button
                        onClick={() => setFilter('unapproved')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                            filter === 'unapproved'
                                ? 'bg-yellow-500 text-black shadow-lg'
                                : 'bg-glass/40 backdrop-blur-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass/60'
                        }`}
                    >
                        Unapproved ({(item.videos?.filter(v => !v.approved).length || 0) + (!hasVideos ? 1 : 0)})
                    </button>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-primary text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg"
                >
                    <AddIcon className="w-4 h-4" />
                    Add Version
                </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {/* Default/Main Video */}
                 {!hasVideos && (filter === 'all' || filter === 'unapproved') && (
                    <div
                        className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-xl overflow-hidden hover:border-primary hover:bg-glass/60 transition-all group relative flex flex-col shadow-sm hover:shadow-md"
                    >
                         <div
                            onClick={() => navigate(`/feedback/${projectId}/video/${feedbackItemId}/view`)}
                            className="relative aspect-video bg-black overflow-hidden flex items-center justify-center cursor-pointer"
                         >
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <span className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                    View Feedback
                                </span>
                            </div>
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary/30 group-hover:scale-110 transition-all">
                                <PlayIcon className="w-6 h-6 ml-1" />
                            </div>

                            {/* Status Badge */}
                            <div className="absolute top-3 left-3">
                                <div className="w-8 h-8 rounded-full bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 flex items-center justify-center">
                                    <span className="text-yellow-300 text-xs font-bold">○</span>
                                </div>
                            </div>
                         </div>
                         <div className="p-4 bg-glass/40 backdrop-blur-xl border-t border-border-color">
                            {/* Project Pill */}
                            {project && (
                                <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    <span className="text-xs font-bold text-primary">{project.name}</span>
                                </div>
                            )}
                            <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors mb-2">Main Version</h3>
                            <p className="text-text-secondary/90 text-xs mb-3">Default Asset</p>
                            <div className="flex justify-end items-center">
                                <button
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30"
                                    title="Pending approval"
                                >
                                    Pending
                                </button>
                            </div>
                         </div>
                    </div>
                )}

                {filteredVideos.map(video => (
                    <div
                        key={video.id}
                        className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-xl overflow-hidden hover:border-primary hover:bg-glass/60 transition-all group relative flex flex-col shadow-sm hover:shadow-md"
                    >
                         <div
                            onClick={() => navigate(`/feedback/${projectId}/video/${feedbackItemId}/view?path=${encodeURIComponent(video.url)}`)}
                            className="relative aspect-video bg-black overflow-hidden flex items-center justify-center cursor-pointer"
                         >
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <span className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                    View Feedback
                                </span>
                            </div>
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary/30 group-hover:scale-110 transition-all">
                                <PlayIcon className="w-6 h-6 ml-1" />
                            </div>

                            {/* Status Badge */}
                            <div className="absolute top-3 left-3">
                                {video.approved ? (
                                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg">
                                        <CheckCircleIcon className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 flex items-center justify-center">
                                        <span className="text-yellow-300 text-xs font-bold">○</span>
                                    </div>
                                )}
                            </div>
                         </div>

                         <div className="p-4 bg-glass/40 backdrop-blur-xl border-t border-border-color">
                            {/* Project Pill */}
                            {project && (
                                <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    <span className="text-xs font-bold text-primary">{project.name}</span>
                                </div>
                            )}

                            {editingId === video.id ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-glass-light/60 border border-border-color rounded-lg px-3 py-2 text-sm font-bold text-text-primary focus:border-primary outline-none"
                                        placeholder="Version name"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSaveEdit(video.id)}
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
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors flex-1">
                                            {video.name}
                                        </h3>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleEdit(video);
                                                }}
                                                className="p-2 hover:bg-glass-light/60 rounded-lg text-text-secondary hover:text-primary transition-all"
                                                title="Edit version"
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setDeleteConfirmId(video.id);
                                                }}
                                                className="p-2 hover:bg-glass-light/60 rounded-lg text-text-secondary hover:text-red-400 transition-all"
                                                title="Delete version"
                                            >
                                                <DeleteIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-text-secondary/90 line-clamp-1 mb-3 font-mono text-xs">
                                        {video.url}
                                    </p>
                                    <div className="flex justify-end items-center">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleToggleApproval(video.id);
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                video.approved
                                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                                                    : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30'
                                            }`}
                                            title={video.approved ? 'Mark as unapproved' : 'Mark as approved'}
                                        >
                                            {video.approved ? '✓ Approved' : 'Pending'}
                                        </button>
                                    </div>
                                </>
                            )}
                         </div>
                    </div>
                ))}
            </div>

            {/* Add Video Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                <VideoIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold">Add New Version</h2>
                        </div>

                        {/* Tab Selector */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setUploadMode('file')}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                    uploadMode === 'file'
                                        ? 'bg-primary text-black'
                                        : 'bg-glass/40 text-text-secondary hover:bg-glass/60'
                                }`}
                            >
                                Upload File
                            </button>
                            <button
                                onClick={() => setUploadMode('url')}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                    uploadMode === 'url'
                                        ? 'bg-primary text-black'
                                        : 'bg-glass/40 text-text-secondary hover:bg-glass/60'
                                }`}
                            >
                                Enter URL
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Version Name</label>
                                <input
                                    type="text"
                                    value={newVideoName}
                                    onChange={e => setNewVideoName(e.target.value)}
                                    placeholder="e.g. v2 - Adjusted Color"
                                    disabled={uploadingFile}
                                    className="w-full bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-lg px-4 py-2 text-text-primary focus:border-primary outline-none disabled:opacity-50"
                                />
                            </div>

                            {uploadMode === 'file' ? (
                                <>
                                    <div>
                                        <label className="block text-sm text-text-secondary mb-1">Video File</label>
                                        <div className="border-2 border-dashed border-border-color rounded-lg p-4 text-center hover:border-primary/50 transition-all">
                                            <input
                                                type="file"
                                                accept=".mp4,.mov,.webm"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleFileSelect(file);
                                                }}
                                                disabled={uploadingFile}
                                                className="hidden"
                                                id="videoFileInput"
                                            />
                                            {selectedFile ? (
                                                <div>
                                                    <p className="text-text-primary font-semibold">{selectedFile.name}</p>
                                                    <p className="text-text-secondary text-sm">
                                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                    {!uploadingFile && (
                                                        <button
                                                            onClick={() => setSelectedFile(null)}
                                                            className="text-red-400 text-sm mt-2 hover:underline"
                                                        >
                                                            Remove file
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <label htmlFor="videoFileInput" className="cursor-pointer">
                                                    <div className="text-primary mb-2">🎬</div>
                                                    <p className="text-text-primary">Click to select or drag & drop</p>
                                                    <p className="text-text-secondary text-xs mt-1">
                                                        MP4, MOV, WebM (max 500MB)
                                                    </p>
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {uploadingFile && (
                                        <div>
                                            <div className="flex justify-between text-sm text-text-secondary mb-2">
                                                <span>Uploading...</span>
                                                <span>{Math.round(uploadProgress)}%</span>
                                            </div>
                                            <div className="w-full bg-glass-light/40 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-primary h-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Video URL</label>
                                    <input
                                        type="text"
                                        value={newVideoUrl}
                                        onChange={e => setNewVideoUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-lg px-4 py-2 text-text-primary focus:border-primary outline-none font-mono text-sm"
                                    />
                                </div>
                            )}

                            {uploadError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                    {uploadError}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewVideoName('');
                                    setNewVideoUrl('');
                                    setSelectedFile(null);
                                    setUploadError('');
                                    setUploadMode('file');
                                }}
                                disabled={uploadingFile}
                                className="flex-1 px-4 py-2 rounded-lg font-medium hover:bg-glass-light/60 transition-colors text-text-secondary disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (uploadMode === 'file') {
                                        handleFileUpload();
                                    } else {
                                        handleAddVideo();
                                    }
                                }}
                                disabled={
                                    !newVideoName ||
                                    uploadingFile ||
                                    (uploadMode === 'file' ? !selectedFile : !newVideoUrl)
                                }
                                className="flex-1 bg-primary text-black px-4 py-2 rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploadingFile ? 'Uploading...' : 'Add Version'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-6 max-w-md">
                        <h3 className="text-xl font-bold text-text-primary mb-2">Delete Version?</h3>
                        <p className="text-text-secondary mb-6">
                            This action cannot be undone. The video version will be permanently removed.
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

export default FeedbackVideoVersionsSelectionPage;
