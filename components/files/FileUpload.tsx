import React, { useRef, useState } from 'react';

// 200 MB client-side limit (matches server)
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

// Accepted MIME types (mirrors server allowlist)
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/json',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
].join(',');

interface FileUploadProps {
  isUploading: boolean;
  uploadProgress: number;
  onUpload: (file: File) => Promise<void>;
}

const FileUpload: React.FC<FileUploadProps> = ({ isUploading, uploadProgress, onUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateAndUpload = async (file: File) => {
    setValidationError(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(`File too large. Maximum size is 200 MB.`);
      return;
    }
    if (!ACCEPTED_TYPES.split(',').includes(file.type)) {
      setValidationError(`File type "${file.type || 'unknown'}" is not supported.`);
      return;
    }
    await onUpload(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  };

  const handleDragLeave = () => {
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await validateAndUpload(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await validateAndUpload(file);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
        isDragging
          ? 'border-primary bg-primary/10'
          : 'border-border-color hover:border-primary/50 hover:bg-glass-light'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {isUploading ? (
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">Uploading... {uploadProgress}%</p>
          <div className="w-full h-1.5 bg-glass rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-center">
            <svg className="h-8 w-8 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">
            Drop a file here or{' '}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-primary hover:underline font-medium"
            >
              browse
            </button>
          </p>
          <p className="text-xs text-text-secondary opacity-60">Max 200 MB · PDF, Word, Excel, images, video, ZIP</p>
          {validationError && (
            <p className="text-xs text-red-400 mt-1">{validationError}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
