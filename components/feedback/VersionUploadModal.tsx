import React, { useState, useRef, DragEvent } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../utils/firebase';
import { X, Upload, FileVideo, FileImage, AlertCircle } from 'lucide-react';

interface VersionUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (fileUrl: string, notes: string) => Promise<void>;
    type: 'video' | 'mockup';
    projectId: string;
    feedbackItemId: string;
}

const VersionUploadModal: React.FC<VersionUploadModalProps> = ({
    isOpen,
    onClose,
    onUpload,
    type,
    projectId,
    feedbackItemId
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [notes, setNotes] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validTypes = type === 'video'
        ? ['video/mp4', 'video/quicktime', 'video/webm']
        : ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    const acceptedExtensions = type === 'video'
        ? '.mp4,.mov,.webm'
        : '.jpg,.jpeg,.png,.webp';

    const handleFileSelect = (selectedFile: File) => {
        // Validate file type
        if (!validTypes.includes(selectedFile.type)) {
            setError(`Invalid file type. Please upload ${type === 'video' ? 'a video (MP4, MOV, WebM)' : 'an image (JPG, PNG, WebP)'}.`);
            return;
        }

        // Validate file size (500MB max)
        const maxSize = 500 * 1024 * 1024; // 500MB in bytes
        if (selectedFile.size > maxSize) {
            setError('File size exceeds 500MB limit.');
            return;
        }

        setFile(selectedFile);
        setError('');
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFileSelect(selectedFile);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);
        setError('');

        try {
            const timestamp = Date.now();
            const versionNumber = timestamp;
            const storagePath = `feedback/${type}s/${projectId}/${feedbackItemId}/v${versionNumber}_${file.name}`;
            const storageRef = ref(storage, storagePath);

            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (uploadError) => {
                    console.error('Upload error:', uploadError);
                    setError('Upload failed: ' + uploadError.message);
                    setUploading(false);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        await onUpload(downloadURL, notes);

                        // Reset state
                        setFile(null);
                        setNotes('');
                        setUploadProgress(0);
                        setUploading(false);
                        onClose();
                    } catch (err) {
                        console.error('Error getting download URL or calling onUpload:', err);
                        setError('Failed to complete upload');
                        setUploading(false);
                    }
                }
            );
        } catch (err) {
            console.error('Upload initialization error:', err);
            setError('Failed to start upload');
            setUploading(false);
        }
    };

    const handleClose = () => {
        if (uploading) return; // Prevent close during upload
        setFile(null);
        setNotes('');
        setError('');
        setUploadProgress(0);
        onClose();
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-glass/90 backdrop-blur-xl border border-border-color rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">
                        Upload New {type === 'video' ? 'Video' : 'Mockup'} Version
                    </h2>
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="text-white/70 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* File Upload Area */}
                <div
                    className={`border-2 border-dashed rounded-xl p-8 mb-4 transition-all ${
                        isDragging
                            ? 'border-primary bg-primary/10'
                            : 'border-border-color hover:border-primary/50 bg-glass-light/40'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={acceptedExtensions}
                        onChange={handleFileInputChange}
                        className="hidden"
                        disabled={uploading}
                    />

                    {!file ? (
                        <div className="text-center">
                            <div className="flex justify-center mb-4">
                                {type === 'video' ? (
                                    <FileVideo size={48} className="text-primary" />
                                ) : (
                                    <FileImage size={48} className="text-primary" />
                                )}
                            </div>
                            <p className="text-white mb-2">
                                Drag & drop your {type} here, or
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-primary hover:text-primary-hover font-semibold underline"
                                disabled={uploading}
                            >
                                browse files
                            </button>
                            <p className="text-white/50 text-sm mt-3">
                                {type === 'video'
                                    ? 'Supported formats: MP4, MOV, WebM'
                                    : 'Supported formats: JPG, PNG, WebP'}
                                <br />
                                Max file size: 500MB
                            </p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="flex justify-center mb-3">
                                {type === 'video' ? (
                                    <FileVideo size={40} className="text-primary" />
                                ) : (
                                    <FileImage size={40} className="text-primary" />
                                )}
                            </div>
                            <p className="text-white font-semibold truncate mb-1">
                                {file.name}
                            </p>
                            <p className="text-white/60 text-sm mb-3">
                                {formatFileSize(file.size)}
                            </p>
                            {!uploading && (
                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setError('');
                                    }}
                                    className="text-red-400 hover:text-red-300 text-sm underline"
                                >
                                    Remove file
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Upload Progress */}
                {uploading && (
                    <div className="mb-4">
                        <div className="flex justify-between text-sm text-white/70 mb-2">
                            <span>Uploading...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-glass-light/40 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                        <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Version Notes */}
                <div className="mb-6">
                    <label className="block text-white font-semibold mb-2">
                        Version Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Describe the changes in this version..."
                        disabled={uploading}
                        className="w-full bg-glass-light/40 border border-border-color rounded-lg p-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                        rows={4}
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="flex-1 bg-glass/60 backdrop-blur-sm hover:bg-glass/80 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="flex-1 bg-primary text-black hover:bg-primary-hover font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Upload size={20} />
                        {uploading ? 'Uploading...' : 'Upload Version'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VersionUploadModal;
