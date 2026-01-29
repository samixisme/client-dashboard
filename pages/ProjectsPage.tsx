import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useSearch } from '../contexts/SearchContext';
import { Project, User, Task, Brand, Stage, ProjectStatus, Board } from '../types';
import { MoreIcon } from '../components/icons/MoreIcon';
import { FilterIcon } from '../components/icons/FilterIcon';
import { BoardIcon } from '../components/icons/BoardIcon';
import { ListIcon } from '../components/icons/ListIcon';
import { RoadmapIcon } from '../components/icons/RoadmapIcon';
import AddEditProjectModal from '../components/projects/AddProjectModal';
import ProjectFilterSortPopover, { FilterSortState } from '../components/projects/ProjectFilterSortPopover';
import { collection, setDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { slugify } from '../utils/slugify';

const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const statusClasses: Record<ProjectStatus, string> = {
    Active: 'bg-primary/15 text-primary border-primary/50 shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]',
    Completed: 'bg-blue-500/15 text-blue-400 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.2)]',
    Archived: 'bg-gray-500/15 text-gray-400 border-gray-500/50',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${statusClasses[status] || statusClasses.Archived}`}>
      {status}
    </span>
  );
};

const ProjectCard: React.FC<{ project: Project; index: number }> = ({ project, index }) => {
    const { data } = useData();
    const navigate = useNavigate();
    const { brands, users, tasks, moodboards, boards, roadmapItems } = data;

    const brand = brands.find(b => b.id === project.brandId);
    const projectBoards = boards.filter(b => b.projectId === project.id);
    const memberIds = [...new Set(projectBoards.flatMap(b => b.member_ids || []))];
    const members = users.filter(m => memberIds.includes(m.id));
    const projectBoardIds = projectBoards.map(b => b.id);
    const projectTasks = tasks.filter(t => projectBoardIds.includes(t.boardId));

    const completedTasks = projectTasks.filter(t => t.stageId === 'stage-3').length;
    const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;

    const upcomingTask = projectTasks
        .filter(t => t.dueDate && new Date(t.dueDate) > new Date())
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0];

    const moodboardCount = moodboards.filter(m => m.projectId === project.id).length;
    const boardCount = projectBoards.length;
    const roadmapCount = roadmapItems.filter(r => r.projectId === project.id).length;

    const mainBoard = projectBoards[0];

    const handleCardClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) return;
        if (mainBoard) navigate(`/board/${mainBoard.id}`);
    };

    return (
        <div
            onClick={handleCardClick}
            className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color flex flex-col gap-4 hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] hover:bg-glass/60 transition-all duration-500 cursor-pointer group animate-fade-in-up relative overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex justify-between items-start relative z-10">
                <div className="flex-1">
                    <p className="text-xs font-medium text-text-secondary/80 uppercase tracking-wider transition-colors duration-200 group-hover:text-text-secondary">{brand?.name || 'No Brand'}</p>
                    <div className="flex items-center gap-3 mt-2">
                        <h3 className="font-bold text-xl text-text-primary group-hover:text-primary transition-all duration-300">{project.name}</h3>
                        <StatusBadge status={project.status} />
                    </div>
                </div>
                <div className="flex -space-x-2.5">
                    {members.slice(0, 3).map(member => (
                        <div key={member.id} className="relative group/avatar">
                            <img
                                src={member.avatarUrl}
                                alt={member.name}
                                title={member.name}
                                className="w-9 h-9 rounded-full border-2 border-surface shadow-lg transition-all duration-300 hover:scale-125 hover:z-10 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {project.logoUrl && (
                <div className="w-full h-36 rounded-xl overflow-hidden mt-2 border border-border-color/50 group-hover:border-primary/60 transition-all duration-500 shadow-md group-hover:shadow-xl relative z-10">
                     <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                     <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
            )}

            <div className="relative z-10">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Progress ({projectTasks.length} tasks)</span>
                    <span className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors duration-300">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-glass-light/50 backdrop-blur-sm rounded-full h-2 overflow-hidden border border-border-color/30 shadow-inner">
                    <div
                        className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--primary-rgb),0.6)] relative overflow-hidden"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </div>
                </div>
            </div>

            {upcomingTask && (
                <div className="bg-glass-light/60 backdrop-blur-sm p-4 rounded-xl border border-border-color/50 hover:border-primary/40 hover:bg-glass-light/80 transition-all duration-300 shadow-sm hover:shadow-md relative z-10 group/upcoming">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Upcoming</p>
                    </div>
                    <p className="text-sm text-text-primary font-bold mt-1.5 group-hover/upcoming:text-primary transition-colors duration-300">{upcomingTask.title}</p>
                    <p className="text-xs text-text-secondary/80 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                        {new Date(upcomingTask.dueDate!).toLocaleDateString()}
                    </p>
                </div>
            )}

            <div className="flex items-center flex-wrap gap-2 text-xs mt-auto pt-4 border-t border-border-color/50 relative z-10">
                <Link to={mainBoard ? `/board/${mainBoard.id}` : '#'} onClick={e => e.stopPropagation()} className="px-3 py-2 rounded-lg bg-glass-light/60 backdrop-blur-sm text-text-secondary hover:bg-primary/10 hover:text-primary hover:scale-110 hover:shadow-lg font-semibold transition-all duration-300 flex items-center gap-2 border border-transparent hover:border-primary/30">
                    <BoardIcon className="h-4 w-4" />
                    {boardCount} {boardCount === 1 ? 'Board' : 'Boards'}
                </Link>
                <Link to={`/projects/${project.id}/roadmap`} onClick={e => e.stopPropagation()} className="px-3 py-2 rounded-lg bg-glass-light/60 backdrop-blur-sm text-text-secondary hover:bg-primary/10 hover:text-primary hover:scale-110 hover:shadow-lg font-semibold transition-all duration-300 flex items-center gap-2 border border-transparent hover:border-primary/30">
                    <RoadmapIcon className="h-4 w-4" />
                    {roadmapCount} {roadmapCount === 1 ? 'Roadmap' : 'Roadmaps'}
                </Link>
                <Link to={mainBoard ? `/board/${mainBoard.id}` : '#'} onClick={e => e.stopPropagation()} className="px-3 py-2 rounded-lg bg-glass-light/60 backdrop-blur-sm text-text-secondary hover:bg-primary/10 hover:text-primary hover:scale-110 hover:shadow-lg font-semibold transition-all duration-300 flex items-center gap-2 border border-transparent hover:border-primary/30">
                    <ListIcon className="h-4 w-4" />
                    {projectTasks.length} {projectTasks.length === 1 ? 'Task' : 'Tasks'}
                </Link>
            </div>
        </div>
    );
};


const ProjectsPage = () => {
  const { data, forceUpdate } = useData();
  const { searchQuery, setSearchQuery } = useSearch();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [filterSortState, setFilterSortState] = useState<FilterSortState>({
    status: 'Active',
    brands: [],
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });

  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterAnchorEl = useRef<HTMLButtonElement>(null);

  const [isPageLoaded, setIsPageLoaded] = useState(false);

  useEffect(() => {
    setIsPageLoaded(true);
  }, []);

  const filteredProjects = useMemo(() => {
    const { projects, brands } = data;
    
    let tempProjects = [...projects];

    // Filtering
    if (filterSortState.status !== 'All') {
        tempProjects = tempProjects.filter(p => p.status === filterSortState.status);
    }
    if (filterSortState.brands.length > 0) {
        tempProjects = tempProjects.filter(p => filterSortState.brands.includes(p.brandId));
    }

    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        tempProjects = tempProjects.filter(p => {
            const brand = brands.find(b => b.id === p.brandId);
            return p.name.toLowerCase().includes(lowercasedQuery) ||
                   (brand && brand.name.toLowerCase().includes(lowercasedQuery));
        });
    }

    // Sorting
    tempProjects.sort((a, b) => {
        let comparison = 0;
        if (filterSortState.sortBy === 'createdAt') {
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else { // 'name'
            comparison = a.name.localeCompare(b.name);
        }
        
        return filterSortState.sortDirection === 'desc' ? -comparison : comparison;
    });

    return tempProjects;
  }, [data.projects, data.brands, searchQuery, filterSortState]);

  const handleAddProject = async ({ name, description, brandId, logoUrl }: { name: string, description: string, brandId: string, logoUrl?: string }) => {
    // Optimistic update (optional but good for UX) or just wait for Firestore
    try {
        // Use project name for slug
        const docId = slugify(name);

        const newProjectData: Omit<Project, 'id'> = { 
            name, 
            description, 
            brandId,
            status: 'Active',
            createdAt: new Date().toISOString(),
            logoUrl: logoUrl, // Add logoUrl to saved data
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

        setIsAddProjectModalOpen(false);
    } catch (error) {
        console.error("Error adding project: ", error);
        alert("Failed to add project. Please try again.");
    }
  };

  const activeFilterCount = (filterSortState.status !== 'All' ? 1 : 0) + filterSortState.brands.length;

  return (
    <div>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 8px var(--primary);
          }
          50% {
            box-shadow: 0 0 20px var(--primary);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }

        .animate-slide-in-right {
          animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2.5s ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-scale-in {
          animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 animate-fade-in">
        <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <h1 className="text-4xl font-bold text-text-primary bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text">Projects</h1>
            <p className="mt-2 text-text-secondary/90 font-medium">Organize, track, and manage all your work in one place.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap animate-slide-in-right">
            <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 transition-all duration-300">
                    <svg className="h-5 w-5 text-text-secondary group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                </span>
                <input
                    type="text"
                    placeholder="Search Projects"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 pr-4 py-2.5 w-56 rounded-xl bg-glass backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary border border-border-color transition-all duration-300 shadow-sm focus:shadow-lg placeholder:text-text-secondary"
                />
            </div>
            <div className="flex items-center bg-glass/60 backdrop-blur-xl rounded-xl p-1.5 border border-border-color shadow-md">
                <button
                    onClick={() => setViewMode('board')}
                    className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'board' ? 'bg-primary text-background shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] scale-110' : 'text-text-secondary hover:text-text-primary hover:bg-glass-light hover:scale-105'}`}
                >
                    <BoardIcon className="h-5 w-5"/>
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'list' ? 'bg-primary text-background shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] scale-110' : 'text-text-secondary hover:text-text-primary hover:bg-glass-light hover:scale-105'}`}
                >
                    <ListIcon className="h-5 w-5"/>
                </button>
            </div>
            <div className="relative z-50">
                <button
                    ref={filterAnchorEl}
                    onClick={() => setIsFilterOpen(o => !o)}
                    className="px-5 py-2.5 flex items-center gap-2.5 bg-glass/60 backdrop-blur-xl text-text-primary text-sm font-semibold rounded-xl border border-border-color hover:bg-glass hover:shadow-xl hover:scale-105 hover:border-primary/40 transition-all duration-300 shadow-md"
                >
                    <FilterIcon className="h-4 w-4" />
                    Filter
                    {activeFilterCount > 0 && (
                        <span className="px-2 py-0.5 bg-primary text-background rounded-full text-xs font-bold shadow-lg animate-pulse-glow">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
                {isFilterOpen && (
                    <ProjectFilterSortPopover
                        isOpen={isFilterOpen}
                        onClose={() => setIsFilterOpen(false)}
                        anchorEl={filterAnchorEl.current}
                        initialState={filterSortState}
                        onApply={setFilterSortState}
                    />
                )}
            </div>
            <button
                onClick={() => setIsAddProjectModalOpen(true)}
                className="px-6 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group/btn"
            >
                <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Add Project
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
            </button>
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
            ))}
        </div>
      ) : (
        <div className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color shadow-xl overflow-hidden animate-fade-in">
            <table className="min-w-full">
                <thead>
                    <tr className="border-b border-border-color/50 bg-glass-light/50 backdrop-blur-sm">
                        <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Project</th>
                        <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Brand</th>
                        <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Members</th>
                        <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Tasks</th>
                        <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Boards</th>
                        <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Roadmaps</th>
                        <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Progress</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredProjects.map((project, index) => {
                         const brand = data.brands.find(b => b.id === project.brandId);
                         const projectBoards = data.boards.filter(b => b.projectId === project.id);
                         const memberIds = [...new Set(projectBoards.flatMap(b => b.member_ids))];
                         const members = data.users.filter(m => memberIds.includes(m.id));
                         const projectBoardIds = projectBoards.map(b => b.id);
                         const projectTasks = data.tasks.filter(t => projectBoardIds.includes(t.boardId));
                         const completedTasks = projectTasks.filter(t => t.stageId === 'stage-3').length;
                         const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
                         const mainBoard = projectBoards[0];
                         const boardCount = projectBoards.length;
                         const roadmapCount = data.roadmapItems.filter(r => r.projectId === project.id).length;

                        return (
                            <tr
                                key={project.id}
                                className="border-b border-border-color/30 last:border-b-0 hover:bg-glass-light/60 hover:shadow-lg transition-all duration-300 animate-fade-in-up group/row cursor-pointer"
                                style={{ animationDelay: `${index * 30}ms` }}
                                onClick={() => mainBoard && navigate(`/board/${mainBoard.id}`)}
                            >
                                <td className="p-5">
                                    <div className="flex items-center gap-3">
                                         {project.logoUrl && <img src={project.logoUrl} alt={project.name} className="w-10 h-10 rounded-lg object-cover border border-border-color shadow-sm transition-all duration-300 group-hover/row:scale-110 group-hover/row:shadow-lg group-hover/row:border-primary/50" />}
                                        <div className="flex items-center gap-2">
                                            <Link to={mainBoard ? `/board/${mainBoard.id}` : '#'} className="font-bold text-text-primary group-hover/row:text-primary transition-colors duration-300">{project.name}</Link>
                                            <StatusBadge status={project.status} />
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5 text-text-secondary font-medium">{brand?.name}</td>
                                <td className="p-5">
                                    <div className="flex -space-x-2.5">
                                        {members.slice(0, 4).map(member => (
                                            <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="w-9 h-9 rounded-full border-2 border-surface shadow-md transition-all duration-300 hover:scale-125 hover:z-10 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                                        ))}
                                    </div>
                                </td>
                                <td className="p-5 text-text-secondary font-semibold">{projectTasks.length}</td>
                                <td className="p-5 text-text-secondary font-semibold">{boardCount}</td>
                                <td className="p-5 text-text-secondary font-semibold">{roadmapCount}</td>
                                <td className="p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-28 bg-glass-light/50 backdrop-blur-sm rounded-full h-2 overflow-hidden border border-border-color/30 shadow-inner">
                                            <div
                                                className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)] relative overflow-hidden"
                                                style={{ width: `${progress}%` }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-text-primary min-w-[3rem]">{Math.round(progress)}%</span>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
      )}

      {isAddProjectModalOpen && (
        <AddEditProjectModal 
            isOpen={isAddProjectModalOpen}
            onClose={() => setIsAddProjectModalOpen(false)}
            onSave={handleAddProject}
        />
      )}
    </div>
  );
};

export default ProjectsPage;
