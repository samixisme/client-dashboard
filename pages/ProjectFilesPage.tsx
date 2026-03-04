import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectFiles } from '../src/hooks/useProjectFiles';
import { useDriveFiles } from '../hooks/useDriveFiles';
import { useData } from '../contexts/DataContext';
import { ProjectFile, ProjectLink } from '../types';
import SourceFilterSidebar from '../components/files/SourceFilterSidebar';
import FileUpload from '../components/files/FileUpload';
import AddLinkDialog from '../components/files/AddLinkDialog';
import LinkCard from '../components/files/LinkCard';

const ProjectFilesPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const safeProjectId = projectId || '';
    const navigate = useNavigate();
    const { data } = useData();

    const files = useProjectFiles(safeProjectId);
    const { upload, isUploading, uploadProgress } = useDriveFiles({ projectId: safeProjectId });

    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<ProjectLink | undefined>(undefined);

    // Get project links for LinkCard rendering
    const projectLinks = useMemo(
        () => data.projectLinks.filter(l => l.projectId === safeProjectId),
        [data.projectLinks, safeProjectId]
    );

    // Derived filtered list
    const displayedFiles = useMemo(() => {
        let filtered = files;
        if (activeFilter !== 'all') {
            filtered = filtered.filter(f => f.source === activeFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
        }
        return filtered;
    }, [files, activeFilter, searchQuery]);

    const handleUpload = async (file: File) => {
        if (!safeProjectId) return;
        await upload(file);
    };

    const handleFileClick = (file: ProjectFile) => {
        if (file.sourceRoute) {
            // Internal route — use hash router navigation
            if (file.sourceRoute.startsWith('/')) {
                navigate(file.sourceRoute);
            } else {
                window.open(file.sourceRoute, '_blank', 'noopener');
            }
        } else if (file.url) {
            window.open(file.url, '_blank', 'noopener');
        }
    };

    const handleEditLink = (link: ProjectLink) => {
        setEditingLink(link);
        setLinkDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setLinkDialogOpen(false);
        setEditingLink(undefined);
    };

    // Determine if we should show the upload zone
    const canUpload = activeFilter === 'all' || activeFilter === 'drive';
    // Determine if we show the add-link button
    const canAddLink = activeFilter === 'all' || activeFilter === 'link';

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Sidebar area */}
            <SourceFilterSidebar
                files={files}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
            />

            {/* Main Content Area */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-8">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary">Project Files</h1>
                            <p className="text-text-secondary mt-1 text-sm">
                                All attachments, links, and Drive files for this project.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {canAddLink && (
                                <button
                                    onClick={() => { setEditingLink(undefined); setLinkDialogOpen(true); }}
                                    className="px-4 py-2 text-sm font-bold bg-primary text-background rounded-xl hover:opacity-90 transition-opacity shrink-0"
                                >
                                    + Add Link
                                </button>
                            )}
                            <div className="relative w-full md:w-56">
                                <input
                                    type="text"
                                    placeholder="Search files..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 bg-glass border border-border-color rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                        </div>
                    </header>

                    {/* Upload area */}
                    {canUpload && (
                        <div className="animate-fade-in-up">
                            <FileUpload
                                isUploading={isUploading}
                                uploadProgress={uploadProgress}
                                onUpload={handleUpload}
                            />
                        </div>
                    )}

                    {/* Link cards section — shown when links are in the filtered view */}
                    {(activeFilter === 'all' || activeFilter === 'link') && projectLinks.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">External Links</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {projectLinks
                                    .filter(l => !searchQuery.trim() || l.title?.toLowerCase().includes(searchQuery.toLowerCase()) || l.url.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map(link => (
                                        <LinkCard key={link.id} link={link} onEdit={handleEditLink} />
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    {/* File grid */}
                    <div className="space-y-3">
                        {(activeFilter === 'all' || activeFilter !== 'link') && (
                            <>
                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                                    {activeFilter === 'all' ? 'All Files' : activeFilter.replace('_', ' ')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {displayedFiles
                                        .filter(f => f.source !== 'link')
                                        .map(file => (
                                            <button
                                                key={file.id}
                                                onClick={() => handleFileClick(file)}
                                                className="group p-5 rounded-xl border border-border-color bg-glass hover:bg-glass-light hover:border-primary/50 transition-all text-left cursor-pointer"
                                            >
                                                <p className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                                                    {file.name}
                                                </p>
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-2 py-1 bg-background/50 rounded-md">
                                                        {file.source.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            </>
                        )}

                        {displayedFiles.length === 0 && projectLinks.length === 0 && (
                            <div className="col-span-full py-16 text-center text-text-secondary bg-glass/20 rounded-2xl border border-border-color border-dashed">
                                <span className="block text-4xl mb-3">📁</span>
                                <p className="font-medium">No files found matching your criteria.</p>
                                <p className="text-sm opacity-60 mt-1">Try adjusting your source filter or search terminology.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add/Edit Link Dialog */}
            <AddLinkDialog
                projectId={safeProjectId}
                open={linkDialogOpen}
                onClose={handleCloseDialog}
                editingLink={editingLink ? {
                    id: editingLink.id,
                    url: editingLink.url,
                    title: editingLink.title,
                    favicon: editingLink.favicon,
                } : undefined}
            />
        </div>
    );
};

export default ProjectFilesPage;
