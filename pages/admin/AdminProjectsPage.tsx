import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../../components/icons/AddIcon';
import { EditIcon } from '../../components/icons/EditIcon';
import { DeleteIcon } from '../../components/icons/DeleteIcon';
import AddEditProjectModal from '../../components/projects/AddProjectModal';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import { doc, deleteDoc, updateDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { Project, Board, Stage } from '../../types';
import { slugify } from '../../utils/slugify';
import { deleteProjectDeep, purgeStaleData } from '../../utils/dataCleanup';

const AdminProjectsPage: React.FC = () => {
  const { data, forceUpdate } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // State for editing
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // State for cleanup
  const [isCleaning, setIsCleaning] = useState(false);

  const filteredProjects = data.projects.filter(project => {
    if (!project || !project.name) {
      return false;
    }
    return project.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'Active': return 'text-green-500 bg-green-500/10 border-green-500/20';
          case 'Completed': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
          case 'Archived': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
          default: return 'text-text-secondary bg-glass border-border-color';
      }
  };

  const handleCleanData = async () => {
      if (!confirm("Are you sure you want to scan for and delete all stale/orphaned data? This action cannot be undone.")) return;
      setIsCleaning(true);
      try {
          const count = await purgeStaleData();
          alert(`Cleanup complete! Deleted ${count} orphaned documents.`);
          forceUpdate();
      } catch (e) {
          console.error(e);
          alert("Cleanup failed. Check console.");
      } finally {
          setIsCleaning(false);
      }
  };

  const handleAddProject = async ({ name, description, brandId, logoUrl }: { name: string, description: string, brandId: string, logoUrl?: string }) => {
    try {
        const brand = data.brands.find(b => b.id === brandId);
        const brandName = brand ? brand.name : name;

        // Generate ID from brand name
        const docId = slugify(name);

        const newProjectData: Omit<Project, 'id'> = { 
            name, 
            description, 
            brandId,
            status: 'Active',
            createdAt: new Date().toISOString(),
            logoUrl,
            memberIds: []
        };
        
        await setDoc(doc(db, 'projects', docId), newProjectData);
        
        // Create default board inside project subcollection
        const newProjectId = docId;
        const newBoardId = slugify(`${name}-board`);
        const newBoardData: Omit<Board, 'id'> = { projectId: newProjectId, name: `${name} Board`, is_pinned: false, background_image: '', member_ids: [] };
        
        await setDoc(doc(db, 'projects', newProjectId, 'boards', newBoardId), newBoardData);

        const newStagesData: Omit<Stage, 'id'>[] = [
            { boardId: newBoardId, name: 'Open', order: 1, status: 'Open' },
            { boardId: newBoardId, name: 'In Progress', order: 2, status: 'Open' },
            { boardId: newBoardId, name: 'Completed', order: 3, status: 'Open' },
        ];

        for (const stageData of newStagesData) {
            // Create stages inside board subcollection
            const stageSlug = slugify(stageData.name);
            const stageDocId = stageSlug;
            await setDoc(doc(db, 'projects', newProjectId, 'boards', newBoardId, 'stages', stageDocId), stageData);
        }
        
        forceUpdate();

        setIsAddModalOpen(false);
    } catch (error) {
        console.error("Error adding project: ", error);
        alert("Failed to add project. Please try again.");
    }
  };

  const handleEditProject = async ({ name, description, brandId, logoUrl }: { name: string, description: string, brandId: string, logoUrl?: string }) => {
    if (!editingProject) return;
    try {
      const projectRef = doc(db, 'projects', editingProject.id);
      await updateDoc(projectRef, {
        name,
        description,
        brandId,
        logoUrl
      });
      setIsEditModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error("Error updating project: ", error);
      alert("Failed to update project.");
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };


  const confirmDelete = (project: Project) => {
      setProjectToDelete(project);
      setIsDeleteModalOpen(true);
  };

  const handleDeleteProject = async () => {
      if (!projectToDelete) return;

      try {
          // Perform deep delete to remove all subcollections and related data
          await deleteProjectDeep(projectToDelete.id);

          toast.success('Project deleted');
          setIsDeleteModalOpen(false);
          setProjectToDelete(null);
      } catch (error) {
          console.error("Error deleting project: ", error);
          toast.error('Failed to delete project');
      }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-text-primary">Manage Projects</h2>
            <p className="text-text-secondary text-sm mt-1">Oversee all ongoing and past projects.</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={handleCleanData}
                disabled={isCleaning}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
                {isCleaning ? 'Cleaning...' : 'Cleanup DB'}
            </button>
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20"
            >
                <AddIcon className="h-4 w-4" />
                Create Project
            </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-glass border border-border-color rounded-xl p-4 flex items-center gap-4">
         <input 
            type="text" 
            placeholder="Search projects..." 
            className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-full md:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      {/* Data Table */}
      <div className="bg-glass border border-border-color rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-glass-light border-b border-border-color">
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Project Name</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Client/Brand</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Created At</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                    {filteredProjects.map((project) => {
                        const brand = data.brands.find(b => b.id === project.brandId);
                        return (
                        <tr key={project.id} className="hover:bg-glass-light/50 transition-colors">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    {project.logoUrl ? (
                                        <img src={project.logoUrl} alt={project.name} className="w-8 h-8 rounded-lg object-cover border border-border-color" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg bg-glass-light border border-border-color flex items-center justify-center">
                                            <span className="text-xs text-text-secondary">{project.name.substring(0, 1)}</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-text-primary">{project.name}</span>
                                        <span className="text-xs text-text-secondary truncate max-w-[200px]">{project.description}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 text-sm text-text-secondary">
                                {brand ? brand.name : 'Unknown Brand'}
                            </td>
                            <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)} capitalize`}>
                                    {project.status}
                                </span>
                            </td>
                             <td className="p-4 text-sm text-text-secondary">
                                {new Date(project.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => openEditModal(project)}
                                        className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                                        title="Edit"
                                    >
                                        <EditIcon className="h-4 w-4" />
                                    </button>
                                    <button 
                                        onClick={() => confirmDelete(project)}
                                        className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" 
                                        title="Delete"
                                    >
                                        <DeleteIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )})}
                    {filteredProjects.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-text-secondary text-sm">
                                No projects found matching your search.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <AddEditProjectModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={handleAddProject} 
      />

      {editingProject && (
        <AddEditProjectModal
            isOpen={isEditModalOpen}
            onClose={() => {
                setIsEditModalOpen(false);
                setEditingProject(null);
            }}
            onSave={handleEditProject}
            initialData={editingProject}
        />
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteProject}
        itemName={projectToDelete?.name || 'Project'}
      />
    </div>
  );
};

export default AdminProjectsPage;
