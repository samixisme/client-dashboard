import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../../components/icons/AddIcon';
import { EditIcon } from '../../components/icons/EditIcon';
import { DeleteIcon } from '../../components/icons/DeleteIcon';

const AdminProjectsPage: React.FC = () => {
  const { data } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = data.projects.filter(project => {
    if (!project || !project.title) {
      return false;
    }
    return project.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'active': return 'text-green-500 bg-green-500/10 border-green-500/20';
          case 'completed': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
          case 'archived': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
          default: return 'text-text-secondary bg-glass border-border-color';
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-text-primary">Manage Projects</h2>
            <p className="text-text-secondary text-sm mt-1">Oversee all ongoing and past projects.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20">
            <AddIcon className="h-4 w-4" />
            Create Project
        </button>
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
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Last Updated</th>
                        <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                    {filteredProjects.map((project) => {
                        const brand = data.brands.find(b => b.id === project.brandId);
                        return (
                        <tr key={project.id} className="hover:bg-glass-light/50 transition-colors">
                            <td className="p-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-text-primary">{project.title}</span>
                                    <span className="text-xs text-text-secondary truncate max-w-[200px]">{project.description}</span>
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
                                {new Date(project.updatedAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                                        <EditIcon className="h-4 w-4" />
                                    </button>
                                    <button className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
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
    </div>
  );
};

export default AdminProjectsPage;
