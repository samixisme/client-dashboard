import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../../components/icons/AddIcon';
import { DeleteIcon } from '../../components/icons/DeleteIcon';
import { ChevronDownIcon } from '../../components/icons/ChevronDownIcon';
import { Moodboard, MoodboardItem } from '../../types';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import { doc, deleteDoc, collection, getDocs, writeBatch, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { slugify } from '../../utils/slugify';
import { TextIcon } from '../../components/icons/TextIcon';
import { ImageIcon } from '../../components/icons/ImageIcon';
import { LinkIcon } from '../../components/icons/LinkIcon';
import { ColumnIcon } from '../../components/icons/ColumnIcon';
import { ConnectorIcon } from '../../components/icons/ConnectorIcon';
import { ColorPaletteIcon } from '../../components/icons/ColorPaletteIcon';

type SortField = 'name' | 'itemCount' | 'brand';
type SortDirection = 'asc' | 'desc';

const AdminMoodboardsPage: React.FC = () => {
    const { data } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [moodboardToDelete, setMoodboardToDelete] = useState<Moodboard | null>(null);

    // Filter/Sort State
    const [sortBy, setSortBy] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [filterProject, setFilterProject] = useState<string>('all');
    const [filterBrand, setFilterBrand] = useState<string>('all');

    const handleSort = (field: SortField) => {
        if (sortBy === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDirection('asc');
        }
    };

    const filteredMoodboards = useMemo(() => {
        let boards = data.moodboards.filter(board => {
            const project = data.projects.find(p => p.id === board.projectId);
            const brand = project ? data.brands.find(b => b.id === project.brandId) : undefined;

            const matchesSearch = board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project && project.name.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesProject = filterProject === 'all' || board.projectId === filterProject;
            const matchesBrand = filterBrand === 'all' || (project && project.brandId === filterBrand);

            return matchesSearch && matchesProject && matchesBrand;
        });

        return boards.sort((a, b) => {
            let valA: string | number = '';
            let valB: string | number = '';

            if (sortBy === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (sortBy === 'itemCount') {
                valA = data.moodboardItems.filter(i => i.moodboardId === a.id).length;
                valB = data.moodboardItems.filter(i => i.moodboardId === b.id).length;
            } else if (sortBy === 'brand') {
                const projA = data.projects.find(p => p.id === a.projectId);
                const brandA = projA ? data.brands.find(br => br.id === projA.brandId) : undefined;
                valA = brandA?.name.toLowerCase() || '';

                const projB = data.projects.find(p => p.id === b.projectId);
                const brandB = projB ? data.brands.find(br => br.id === projB.brandId) : undefined;
                valB = brandB?.name.toLowerCase() || '';
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data.moodboards, data.projects, data.moodboardItems, data.brands, searchTerm, sortBy, sortDirection, filterProject, filterBrand]);

    const toggleBoardExpand = (boardId: string) => {
        const newExpanded = new Set(expandedBoards);
        if (newExpanded.has(boardId)) newExpanded.delete(boardId);
        else newExpanded.add(boardId);
        setExpandedBoards(newExpanded);
    };

    const handleCreateMoodboard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newBoardName.trim() && selectedProjectId) {
            try {
                const slug = slugify(newBoardName);
                await setDoc(doc(db, 'projects', selectedProjectId, 'moodboards', slug), {
                    name: newBoardName,
                    createdAt: serverTimestamp(),
                });
                setIsCreateModalOpen(false);
                setNewBoardName('');
                setSelectedProjectId('');
            } catch (error) {
                console.error("Error creating moodboard:", error);
            }
        }
    };

    const confirmDelete = (moodboard: Moodboard) => {
        setMoodboardToDelete(moodboard);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteMoodboard = async () => {
        if (!moodboardToDelete) return;

        try {
            // Delete all items first
            const itemsSnapshot = await getDocs(
                collection(db, 'projects', moodboardToDelete.projectId, 'moodboards', moodboardToDelete.id, 'moodboard_items')
            );
            const batch = writeBatch(db);
            itemsSnapshot.docs.forEach(d => batch.delete(d.ref));
            
            // Then delete the moodboard
            batch.delete(doc(db, 'projects', moodboardToDelete.projectId, 'moodboards', moodboardToDelete.id));
            
            await batch.commit();
            setIsDeleteModalOpen(false);
            setMoodboardToDelete(null);
        } catch (error) {
            console.error("Error deleting moodboard:", error);
            alert("Failed to delete moodboard.");
        }
    };

    // Helper for Sort Icons
    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortBy !== field) return <span className="text-gray-400 ml-1 text-[10px]">⇅</span>;
        return <span className="text-primary ml-1 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Manage Moodboards</h2>
                    <p className="text-text-secondary text-sm mt-1">Curate and organize visual inspiration boards.</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20"
                >
                    <AddIcon className="h-4 w-4" />
                    Create Board
                </button>
            </div>

            {/* Filters & Controls */}
            <div className="bg-glass border border-border-color rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center flex-wrap">
                <input 
                    type="text" 
                    placeholder="Search moodboards..." 
                    className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                <select 
                    value={filterBrand} 
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-48"
                >
                    <option value="all">All Brands</option>
                    {data.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                <select 
                    value={filterProject} 
                    onChange={(e) => setFilterProject(e.target.value)}
                    className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-48"
                >
                    <option value="all">All Projects</option>
                    {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                
                {/* Sort Buttons */}
                <div className="flex items-center gap-2 ml-auto">
                    <button onClick={() => handleSort('name')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-glass-light hover:bg-border-color text-text-secondary flex items-center">
                        Name <SortIcon field="name" />
                    </button>
                    <button onClick={() => handleSort('itemCount')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-glass-light hover:bg-border-color text-text-secondary flex items-center">
                        Items <SortIcon field="itemCount" />
                    </button>
                    <button onClick={() => handleSort('brand')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-glass-light hover:bg-border-color text-text-secondary flex items-center">
                        Brand <SortIcon field="brand" />
                    </button>
                </div>
            </div>

            {/* Moodboards List */}
            <div className="space-y-4">
                {filteredMoodboards.map(board => {
                    const project = data.projects.find(p => p.id === board.projectId);
                    const brand = project ? data.brands.find(b => b.id === project.brandId) : undefined;
                    const items = data.moodboardItems.filter(i => i.moodboardId === board.id);
                    const isExpanded = expandedBoards.has(board.id);

                    // Breakdown of item types
                    const typeCounts = items.reduce((acc, item) => {
                        acc[item.type] = (acc[item.type] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);

                    return (
                        <div key={board.id} className="bg-glass border border-border-color rounded-xl overflow-hidden transition-all">
                            <div 
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-glass-light/50"
                                onClick={() => toggleBoardExpand(board.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDownIcon className="h-5 w-5 text-text-secondary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-primary">{board.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                                            <span>{brand?.name || 'Unknown Brand'}</span>
                                            <span>•</span>
                                            <span>{project?.name || 'Unknown Project'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {Object.entries(typeCounts).map(([type, count]) => (
                                            <span key={type} className="flex items-center gap-1 text-[10px] bg-glass-light px-2 py-0.5 rounded text-text-secondary" title={`${count} ${type} items`}>
                                                {type === 'text' && <TextIcon className="h-3 w-3" />}
                                                {type === 'image' && <ImageIcon className="h-3 w-3" />}
                                                {type === 'link' && <LinkIcon className="h-3 w-3" />}
                                                {type === 'column' && <ColumnIcon className="h-3 w-3" />}
                                                {type === 'connector' && <ConnectorIcon className="h-3 w-3" />}
                                                {type === 'color' && <ColorPaletteIcon className="h-3 w-3" />}
                                                <span>{count}</span>
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                                        {items.length} Items
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); confirmDelete(board); }}
                                        className="p-2 rounded-lg bg-glass-light hover:bg-red-500 hover:text-white text-text-secondary transition-colors"
                                    >
                                        <DeleteIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-border-color bg-glass-light/30 p-4">
                                    {items.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {items.filter(i => i.type !== 'connector').slice(0, 12).map(item => (
                                                <div key={item.id} className="bg-glass border border-border-color rounded-lg p-2 text-xs flex flex-col items-center justify-center gap-2 h-24 overflow-hidden relative">
                                                    {item.type === 'image' && item.content.imageUrl ? (
                                                        <img src={item.content.imageUrl} className="w-full h-full object-cover rounded" />
                                                    ) : item.type === 'color' ? (
                                                        <div className="w-full h-full rounded" style={{ backgroundColor: item.content.hex }}></div>
                                                    ) : (
                                                        <>
                                                            {item.type === 'text' && <TextIcon className="h-6 w-6 text-text-secondary" />}
                                                            {item.type === 'link' && <LinkIcon className="h-6 w-6 text-text-secondary" />}
                                                            {item.type === 'column' && <ColumnIcon className="h-6 w-6 text-text-secondary" />}
                                                            <span className="text-center text-text-secondary line-clamp-2">
                                                                {item.content.text || item.content.url || item.content.title || item.type}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                            {items.length > 12 && (
                                                <div className="bg-glass-light border border-border-color rounded-lg p-2 text-xs flex items-center justify-center text-text-secondary">
                                                    +{items.length - 12} more
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-center text-sm text-text-secondary py-4">No items in this moodboard.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                {filteredMoodboards.length === 0 && (
                    <p className="text-center text-text-secondary py-8">No moodboards found.</p>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="bg-glass w-full max-w-md rounded-2xl shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-text-primary mb-6">Create New Moodboard</h2>
                        <form onSubmit={handleCreateMoodboard} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Project</label>
                                <select 
                                    value={selectedProjectId} 
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary sm:text-sm"
                                    required
                                >
                                    <option value="">Select a project</option>
                                    {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Moodboard Name</label>
                                <input
                                    type="text"
                                    value={newBoardName}
                                    onChange={(e) => setNewBoardName(e.target.value)}
                                    className="w-full px-3 py-2 border border-border-color bg-glass-light text-text-primary rounded-lg focus:outline-none focus:ring-primary sm:text-sm"
                                    required
                                    placeholder="e.g., Summer Campaign Inspiration"
                                />
                            </div>
                            <div className="flex justify-end gap-4 mt-6">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteMoodboard}
                itemName={moodboardToDelete?.name || 'Moodboard'}
            />
        </div>
    );
};

export default AdminMoodboardsPage;
