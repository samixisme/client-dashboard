import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useDocs } from '../../contexts/DocsContext';
import { DocIcon } from '../../components/icons/DocIcon';
import { WhiteboardIcon } from '../../components/icons/WhiteboardIcon';
import { DeleteIcon } from '../../components/icons/DeleteIcon';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import { Doc } from '../../types';

type FilterMode = 'all' | 'page' | 'edgeless';
type SortField = 'title' | 'project' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

const AdminDocsPage: React.FC = () => {
    const { data } = useData();
    const { docs, docsLoading, deleteDoc } = useDocs();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState<FilterMode>('all');
    const [filterProject, setFilterProject] = useState<string>('all');
    const [filterBrand, setFilterBrand] = useState<string>('all');
    const [sortBy, setSortBy] = useState<SortField>('updatedAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Delete modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<Doc | null>(null);

    const handleSort = (field: SortField) => {
        if (sortBy === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDirection('asc');
        }
    };

    const filteredDocs = useMemo(() => {
        let result = docs.filter(d => {
            const project = data.projects.find(p => p.id === d.projectId);
            const brand = project ? data.brands.find(b => b.id === project.brandId) : undefined;

            const matchesSearch =
                d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
            const matchesMode = filterMode === 'all' || d.mode === filterMode;
            const matchesProject = filterProject === 'all' || d.projectId === filterProject;
            const matchesBrand = filterBrand === 'all' || (project?.brandId === filterBrand);

            return matchesSearch && matchesMode && matchesProject && matchesBrand;
        });

        return result.sort((a, b) => {
            let valA: string = '';
            let valB: string = '';

            if (sortBy === 'title') {
                valA = a.title.toLowerCase();
                valB = b.title.toLowerCase();
            } else if (sortBy === 'updatedAt') {
                valA = a.updatedAt;
                valB = b.updatedAt;
            } else if (sortBy === 'project') {
                const pA = data.projects.find(p => p.id === a.projectId);
                const pB = data.projects.find(p => p.id === b.projectId);
                valA = pA?.name.toLowerCase() ?? '';
                valB = pB?.name.toLowerCase() ?? '';
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [docs, data.projects, data.brands, searchTerm, filterMode, filterProject, filterBrand, sortBy, sortDirection]);

    const confirmDelete = (d: Doc) => {
        setDocToDelete(d);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!docToDelete) return;
        await deleteDoc(docToDelete.id);
        setIsDeleteModalOpen(false);
        setDocToDelete(null);
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortBy !== field) return <span className="text-gray-400 ml-1 text-[10px]">⇅</span>;
        return <span className="text-primary ml-1 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
    };

    const pageDocs    = docs.filter(d => d.mode === 'page').length;
    const edgeless    = docs.filter(d => d.mode === 'edgeless').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Manage Docs</h2>
                    <p className="text-text-secondary text-sm mt-1">
                        View all AFFiNE documents and whiteboards across every project.
                    </p>
                </div>
                {/* Summary chips */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        <DocIcon className="h-3.5 w-3.5" />
                        {pageDocs} Pages
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <WhiteboardIcon className="h-3.5 w-3.5" />
                        {edgeless} Whiteboards
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-glass border border-border-color rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center flex-wrap">
                <input
                    type="text"
                    placeholder="Search docs..."
                    className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-64"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />

                <select
                    value={filterMode}
                    onChange={e => setFilterMode(e.target.value as FilterMode)}
                    className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-40"
                >
                    <option value="all">All Types</option>
                    <option value="page">Pages</option>
                    <option value="edgeless">Whiteboards</option>
                </select>

                <select
                    value={filterBrand}
                    onChange={e => setFilterBrand(e.target.value)}
                    className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-48"
                >
                    <option value="all">All Brands</option>
                    {data.brands.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>

                <select
                    value={filterProject}
                    onChange={e => setFilterProject(e.target.value)}
                    className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-48"
                >
                    <option value="all">All Projects</option>
                    {data.projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>

                {/* Sort buttons */}
                <div className="flex items-center gap-2 ml-auto">
                    <button
                        onClick={() => handleSort('title')}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-glass-light hover:bg-border-color text-text-secondary flex items-center"
                    >
                        Title <SortIcon field="title" />
                    </button>
                    <button
                        onClick={() => handleSort('project')}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-glass-light hover:bg-border-color text-text-secondary flex items-center"
                    >
                        Project <SortIcon field="project" />
                    </button>
                    <button
                        onClick={() => handleSort('updatedAt')}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-glass-light hover:bg-border-color text-text-secondary flex items-center"
                    >
                        Updated <SortIcon field="updatedAt" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-glass border border-border-color rounded-xl overflow-hidden">
                {docsLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredDocs.length === 0 ? (
                    <p className="text-center text-text-secondary py-16">No documents found.</p>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-text-secondary border-b border-border-color bg-glass-light/40">
                                <th className="p-4 font-semibold uppercase tracking-wider">Document</th>
                                <th className="p-4 font-semibold uppercase tracking-wider">Type</th>
                                <th className="p-4 font-semibold uppercase tracking-wider">Project</th>
                                <th className="p-4 font-semibold uppercase tracking-wider">Brand</th>
                                <th className="p-4 font-semibold uppercase tracking-wider">Last Updated</th>
                                <th className="p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color/50">
                            {filteredDocs.map(d => {
                                const project = data.projects.find(p => p.id === d.projectId);
                                const brand = project ? data.brands.find(b => b.id === project.brandId) : undefined;
                                const editorPath = d.mode === 'edgeless'
                                    ? `/whiteboard/${d.projectId}/${d.id}`
                                    : `/docs/${d.projectId}/${d.id}`;

                                return (
                                    <tr key={d.id} className="hover:bg-glass-light/40 text-sm transition-colors">
                                        <td className="p-4">
                                            <Link
                                                to={editorPath}
                                                className="flex items-center gap-3 group"
                                            >
                                                <span className="text-xl leading-none flex-shrink-0">{d.emoji}</span>
                                                <span className="font-medium text-text-primary group-hover:text-primary transition-colors truncate max-w-[200px]">
                                                    {d.title || 'Untitled'}
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="p-4">
                                            {d.mode === 'page' ? (
                                                <span className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                                    <DocIcon className="h-3 w-3" />
                                                    Page
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    <WhiteboardIcon className="h-3 w-3" />
                                                    Whiteboard
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-text-secondary">
                                            {project?.name ?? <span className="opacity-40 italic">Unknown</span>}
                                        </td>
                                        <td className="p-4 text-text-secondary">
                                            {brand?.name ?? <span className="opacity-40 italic">—</span>}
                                        </td>
                                        <td className="p-4 text-text-secondary">
                                            {new Date(d.updatedAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => confirmDelete(d)}
                                                className="text-text-secondary hover:text-red-500 transition-colors p-1 rounded"
                                                title="Delete document"
                                            >
                                                <DeleteIcon className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setDocToDelete(null); }}
                onConfirm={handleDelete}
                itemName={docToDelete?.title || 'Document'}
            />
        </div>
    );
};

export default AdminDocsPage;
