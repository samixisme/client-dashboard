import React, { useState, useEffect } from 'react';
import { Loader2, X, Download, Trash2, ExternalLink, Clock, Tag, User, Calendar, FileIcon } from 'lucide-react';
import { DriveFile, formatFileSize, formatRelativeTime } from '../../types/drive';
import { useFileMetadata } from '../../hooks/useFileMetadata';
import { db } from '../../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface MetadataSidebarProps {
  file: DriveFile;
  onClose: () => void;
  onDelete: (fileId: string) => Promise<void>;
}

const MetadataSidebar: React.FC<MetadataSidebarProps> = ({ file, onClose, onDelete }) => {
  const { metadata, revisions, isLoading, error, revertToRevision } = useFileMetadata(file.id);
  const [activeTab, setActiveTab] = useState<'details' | 'versions'>('details');
  
  // Local state for actions
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  // Tags state
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSavingTags, setIsSavingTags] = useState(false);

  // Load tags from Firestore
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const docRef = doc(db, 'fileMetadata', file.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTags(docSnap.data().tags || []);
        }
      } catch (err) {
        console.error('Failed to fetch tags', err);
      }
    };
    fetchTags();
  }, [file.id]);

  // Save tags to Firestore
  const saveTags = async (updatedTags: string[]) => {
    setIsSavingTags(true);
    try {
      const docRef = doc(db, 'fileMetadata', file.id);
      await setDoc(docRef, { tags: updatedTags }, { merge: true });
      setTags(updatedTags);
    } catch (err) {
      console.error('Failed to save tags', err);
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      saveTags([...tags, tag]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    saveTags(tags.filter(t => t !== tagToRemove));
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    try {
      setIsDeleting(true);
      await onDelete(file.id);
      onClose(); // Close on success
    } catch (error) {
      console.error('Deletion failed', error);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRevert = async (revisionId: string) => {
    if (window.confirm('Are you sure you want to revert to this version?')) {
      try {
        setIsReverting(true);
        await revertToRevision(revisionId);
      } catch (err) {
        console.error(err);
      } finally {
        setIsReverting(false);
      }
    }
  };

  // The actual metadata object to display (merge list-level basic meta with full meta)
  const displayMeta = metadata || file;
  
  const ownerNames = displayMeta.owners?.map(o => o.displayName || o.emailAddress).join(', ') || 'Unknown';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm lg:hidden" onClick={onClose} />
      
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-glass/60 backdrop-blur-xl border-l border-border-color flex flex-col shadow-2xl transform transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <div className="flex items-center gap-2 min-w-0">
            <FileIcon className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-base font-semibold text-text-primary truncate" title={displayMeta.name}>
              {displayMeta.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-color px-4 gap-4">
          <button
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'versions' ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            onClick={() => setActiveTab('versions')}
          >
            Versions
            {revisions.length > 0 && (
              <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{revisions.length}</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-red-400 text-sm p-4 bg-red-400/10 rounded-lg border border-red-400/20">
              {error}
            </div>
          ) : activeTab === 'details' ? (
            <div className="space-y-6">
              
              {/* Thumbnail (if any) */}
              {displayMeta.thumbnailLink && (
                <div className="w-full h-32 rounded-lg overflow-hidden bg-black/20 flex items-center justify-center border border-border-color">
                  <img src={displayMeta.thumbnailLink} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Information List */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-text-primary">
                    <User className="w-4 h-4 text-text-secondary shrink-0" />
                    <span className="truncate">Owner: {ownerNames}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-primary">
                    <Calendar className="w-4 h-4 text-text-secondary shrink-0" />
                    <span>Created: {formatRelativeTime(displayMeta.createdTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-primary">
                    <Clock className="w-4 h-4 text-text-secondary shrink-0" />
                    <span>Modified: {formatRelativeTime(displayMeta.modifiedTime)}</span>
                  </div>
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-3 pt-4 border-t border-border-color">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Tags
                  </h3>
                  {isSavingTags && <Loader2 className="w-3 h-3 animate-spin text-text-secondary" />}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-primary/70 ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                
                <form onSubmit={handleAddTag} className="mt-2">
                  <input 
                    type="text" 
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    className="w-full bg-input text-sm text-text-primary border border-border-color rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </form>
              </div>

            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Version History</h3>
              {revisions.length === 0 ? (
                <p className="text-sm text-text-secondary py-4 text-center">No version history available.</p>
              ) : (
                <div className="space-y-2 relative border-l-2 border-border-color ml-2 pl-4 py-2">
                  {revisions.map((rev, index) => (
                    <div key={rev.id} className="relative group">
                      <div className="absolute -left-5.25 top-1.5 w-2 h-2 rounded-full border-2 border-primary bg-background" />
                      <div className="flex flex-col gap-0.5 mb-4">
                        <span className="text-sm font-medium text-text-primary">
                          {formatRelativeTime(rev.modifiedTime)}
                        </span>
                        <span className="text-xs text-text-secondary flex justify-between items-center">
                          <span>{rev.lastModifyingUser?.displayName || 'Unknown'} • {formatFileSize(rev.size)}</span>
                          {index !== 0 && (
                            <button 
                              onClick={() => handleRevert(rev.id)}
                              disabled={isReverting}
                              className="opacity-0 group-hover:opacity-100 text-primary hover:underline text-[10px] transition-opacity disabled:opacity-50"
                            >
                              Restore
                            </button>
                          )}
                        </span>
                        {index === 0 && (
                          <span className="text-[10px] text-green-400 mt-0.5">Current Version</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border-color space-y-2 bg-black/10">
          <div className="grid grid-cols-2 gap-2">
            {displayMeta.webViewLink && (
              <a
                href={displayMeta.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 text-text-primary transition-all"
              >
                <ExternalLink className="w-4 h-4" /> Open
              </a>
            )}
            {displayMeta.webContentLink && (
              <a
                href={displayMeta.webContentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary hover:bg-primary-hover text-white transition-all"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            )}
          </div>
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              showDeleteConfirm 
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' 
              : 'bg-white/5 hover:bg-red-500/10 text-red-400 hover:text-red-300'
            }`}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {showDeleteConfirm ? 'Click to confirm delete' : 'Delete File'}
          </button>
        </div>
      </div>
    </>
  );
};

export default MetadataSidebar;
