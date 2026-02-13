
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FeedbackItem } from '../types';
import { getFeedbackItem, updateFeedbackItemImages, updateFeedbackItem } from '../utils/feedbackUtils';
import { AddIcon } from '../components/icons/AddIcon';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { MockupIcon } from '../components/icons/MockupIcon';
import { useData } from '../contexts/DataContext';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../utils/firebase';
import FeedbackItemCard from '../components/feedback/FeedbackItemCard';

const FeedbackMockupScreensSelectionPage = () => {
    const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
    const navigate = useNavigate();
    const { data } = useData();
    const project = data.projects.find(p => p.id === projectId);
    const [item, setItem] = useState<FeedbackItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'approved' | 'unapproved'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newImageName, setNewImageName] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
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

    const filteredImages = item?.images?.filter(image => {
        if (filter === 'approved') return image.approved;
        if (filter === 'unapproved') return !image.approved;
        return true;
    }) || [];

    const handleAddImage = async () => {
        if (!newImageName || !newImageUrl || !item || !projectId || !feedbackItemId) return;

        const newImage = {
            id: `img-${Date.now()}`,
            name: newImageName,
            url: newImageUrl,
            approved: false,
            createdAt: new Date().toISOString(),
            version: (item.images || []).length + 1
        };

        const updatedImages = [...(item.images || []), newImage];

        // Optimistic update
        const updatedItem = { ...item, images: updatedImages };
        setItem(updatedItem);
        setShowAddModal(false);
        setNewImageName('');
        setNewImageUrl('');

        await updateFeedbackItemImages(projectId, feedbackItemId, updatedImages);
    };

    const handleEditMainItem = async (itemId: string, newName: string) => {
        if (!item || !projectId || !feedbackItemId) {
            console.error('Missing required data:', { item, projectId, feedbackItemId });
            return;
        }

        try {
            console.log('Updating main item name:', newName);
            await updateFeedbackItem(projectId, feedbackItemId, {
                name: newName
            });
            // Refresh data
            const updatedItem = await getFeedbackItem(projectId, feedbackItemId);
            setItem(updatedItem);
            console.log('Successfully updated main item name');
        } catch (error) {
            console.error('Error updating main item name:', error);
        }
    };

    const handleEdit = async (imageId: string, newName: string) => {
        if (!item || !projectId || !feedbackItemId) {
            console.error('Missing required data:', { item, projectId, feedbackItemId });
            return;
        }

        try {
            const updatedImages = (item.images || []).map(img =>
                img.id === imageId ? { ...img, name: newName } : img
            );

            // Optimistic update
            setItem({ ...item, images: updatedImages });

            await updateFeedbackItemImages(projectId, feedbackItemId, updatedImages);
            console.log('Successfully updated image name:', newName);
        } catch (error) {
            console.error('Error updating image name:', error);
            // Revert optimistic update on error
            const items = await getFeedbackItem(projectId, feedbackItemId);
            setItem(items);
        }
    };

    const handleToggleApproval = async (imageId: string) => {
        if (!item || !projectId || !feedbackItemId) return;

        const updatedImages = (item.images || []).map(img =>
            img.id === imageId ? { ...img, approved: !img.approved } : img
        );

        // Optimistic update
        setItem({ ...item, images: updatedImages });

        await updateFeedbackItemImages(projectId, feedbackItemId, updatedImages);
    };

    const handleDelete = async (imageId: string) => {
        if (!item || !projectId || !feedbackItemId) return;

        const updatedImages = (item.images || []).filter(img => img.id !== imageId);

        // Optimistic update
        setItem({ ...item, images: updatedImages });

        await updateFeedbackItemImages(projectId, feedbackItemId, updatedImages);
    };

    const handleFileSelect = (file: File) => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setUploadError('Invalid file type. Please upload an image (JPG, PNG, WebP).');
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
        if (!selectedFile || !item || !projectId || !feedbackItemId || !newImageName) return;

        setUploadingFile(true);
        setUploadProgress(0);
        setUploadError('');

        try {
            const timestamp = Date.now();
            const storagePath = `feedback/screens/${projectId}/${feedbackItemId}/${timestamp}_${selectedFile.name}`;
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

                    // Use functional update to get fresh state and prevent stale closure
                    setItem(prevItem => {
                        if (!prevItem) return prevItem;

                        const newImage = {
                            id: `img-${timestamp}`,
                            name: newImageName,
                            url: downloadURL,
                            approved: false,
                            createdAt: new Date().toISOString(),
                            version: (prevItem.images || []).length + 1
                        };

                        const updatedImages = [...(prevItem.images || []), newImage];

                        // Update Firestore (fire and forget, state already updated)
                        updateFeedbackItemImages(projectId!, feedbackItemId!, updatedImages);

                        return { ...prevItem, images: updatedImages };
                    });

                    setShowAddModal(false);
                    setNewImageName('');
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

    // Use main asset as default if no images
    const hasImages = item.images && item.images.length > 0;

    return (
        <div className="min-h-screen text-text-primary p-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <button onClick={() => navigate(`/feedback/${projectId}/mockups`)} className="p-2 bg-glass/40 backdrop-blur-sm hover:bg-glass/60 rounded-full transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-text-secondary" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{item.name}</h1>
                        <p className="text-text-secondary text-sm">Select a screen to view feedback</p>
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
                        All ({(item.images?.length || 0) + (!hasImages ? 1 : 0)})
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                            filter === 'approved'
                                ? 'bg-green-500 text-white shadow-lg'
                                : 'bg-glass/40 backdrop-blur-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass/60'
                        }`}
                    >
                        Approved ({item.images?.filter(img => img.approved).length || 0})
                    </button>
                    <button
                        onClick={() => setFilter('unapproved')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                            filter === 'unapproved'
                                ? 'bg-yellow-500 text-black shadow-lg'
                                : 'bg-glass/40 backdrop-blur-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass/60'
                        }`}
                    >
                        Unapproved ({(item.images?.filter(img => !img.approved).length || 0) + (!hasImages ? 1 : 0)})
                    </button>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-primary text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg"
                >
                    <AddIcon className="w-4 h-4" />
                    Add Screen
                </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Default Main Screen if no images */}
                {!hasImages && (filter === 'all' || filter === 'unapproved') && (
                    <FeedbackItemCard
                        type="mockup"
                        id="main"
                        name="Main Screen"
                        assetUrl={item.assetUrl}
                        version="v1"
                        createdAt={item.createdAt}
                        commentCount={item.commentCount}
                        approved={false}
                        projectId={projectId!}
                        projectName={project?.name}
                        feedbackItemId={feedbackItemId}
                        versions={item.versions || []}
                        currentVersion={item.version || 1}
                        onToggleApproval={() => {}}
                        onNavigate={() => navigate(`/feedback/${projectId}/mockup/${feedbackItemId}/view`)}
                        showDelete={false}
                    />
                )}

                {filteredImages.map((image, index) => (
                    <FeedbackItemCard
                        key={image.id}
                        type="mockup"
                        id={image.id}
                        name={image.name}
                        assetUrl={image.url}
                        version={typeof (image as any).version === 'number' ? `v${(image as any).version}` : ((image as any).version || 'v1')}
                        createdAt={(image as any).createdAt}
                        commentCount={0}
                        approved={image.approved}
                        projectId={projectId!}
                        projectName={project?.name}
                        feedbackItemId={feedbackItemId}
                        versions={[]}
                        currentVersion={1}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleApproval={handleToggleApproval}
                        onNavigate={() => navigate(`/feedback/${projectId}/mockup/${feedbackItemId}/view?path=${encodeURIComponent(image.url)}`)}
                        index={index}
                        showDelete={true}
                        showVersionDropdown={false}
                    />
                ))}
            </div>

            {/* Add Image Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border-color rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                <MockupIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold">Add New Screen</h2>
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
                                <label className="block text-sm text-text-secondary mb-1">Screen Name</label>
                                <input
                                    type="text"
                                    value={newImageName}
                                    onChange={e => setNewImageName(e.target.value)}
                                    placeholder="e.g. Login Screen"
                                    disabled={uploadingFile}
                                    className="w-full bg-surface-light border border-border-color rounded-lg px-4 py-2 text-text-primary focus:border-primary outline-none disabled:opacity-50"
                                />
                            </div>

                            {uploadMode === 'file' ? (
                                <>
                                    <div>
                                        <label className="block text-sm text-text-secondary mb-1">Image File</label>
                                        <div className="border-2 border-dashed border-border-color rounded-lg p-4 text-center hover:border-primary/50 transition-all">
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.webp"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleFileSelect(file);
                                                }}
                                                disabled={uploadingFile}
                                                className="hidden"
                                                id="fileInput"
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
                                                <label htmlFor="fileInput" className="cursor-pointer">
                                                    <div className="text-primary mb-2">📁</div>
                                                    <p className="text-text-primary">Click to select or drag & drop</p>
                                                    <p className="text-text-secondary text-xs mt-1">
                                                        JPG, PNG, WebP (max 500MB)
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
                                    <label className="block text-sm text-text-secondary mb-1">Image URL</label>
                                    <input
                                        type="text"
                                        value={newImageUrl}
                                        onChange={e => setNewImageUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-surface-light border border-border-color rounded-lg px-4 py-2 text-text-primary focus:border-primary outline-none font-mono text-sm"
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
                                    setNewImageName('');
                                    setNewImageUrl('');
                                    setSelectedFile(null);
                                    setUploadError('');
                                    setUploadMode('file');
                                }}
                                disabled={uploadingFile}
                                className="flex-1 px-4 py-2 rounded-lg font-medium hover:bg-surface-light transition-colors text-text-secondary disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (uploadMode === 'file') {
                                        handleFileUpload();
                                    } else {
                                        handleAddImage();
                                    }
                                }}
                                disabled={
                                    !newImageName ||
                                    uploadingFile ||
                                    (uploadMode === 'file' ? !selectedFile : !newImageUrl)
                                }
                                className="flex-1 bg-primary text-black px-4 py-2 rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploadingFile ? 'Uploading...' : 'Add Screen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackMockupScreensSelectionPage;
