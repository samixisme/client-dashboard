import React, { useState, useMemo, useRef } from 'react';
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
    Active: 'bg-green-500/20 text-green-400 ring-green-500/30',
    Completed: 'bg-blue-500/20 text-blue-400 ring-blue-500/30',
    Archived: 'bg-gray-500/20 text-gray-400 ring-gray-500/30',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ring-1 ring-inset ${statusClasses[status] || statusClasses.Archived}`}>
      {status}
    </span>
  );
};

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
    const { data } = useData();
    const { brands, users, tasks, moodboards, boards, roadmapItems } = data;
    
    const brand = brands.find(b => b.id === project.brandId);
    const projectBoards = boards.filter(b => b.projectId === project.id);
    const memberIds = [...new Set(projectBoards.flatMap(b => b.member_ids))];
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

    return (
        <Link 
            to={mainBoard ? `/board/${mainBoard.id}` : '#'}
            className="bg-glass p-5 rounded-2xl border border-border-color flex flex-col gap-4 hover:border-primary transition-colors"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs text-text-secondary">{brand?.name || 'No Brand'}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <h3 className="font-bold text-lg text-text-primary">{project.name}</h3>
                        <StatusBadge status={project.status} />
                    </div>
                </div>
                <div className="flex -space-x-2">
                    {members.slice(0, 3).map(member => (
                        <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="w-8 h-8 rounded-full border-2 border-surface" />
                    ))}
                </div>
            </div>
            
            {project.logoUrl && (
                <div className="w-full h-32 rounded-xl overflow-hidden mt-2 border border-border-color">
                     <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
                </div>
            )}
            
            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-text-secondary">Progress ({projectTasks.length} tasks)</span>
                    <span className="text-xs font-bold text-text-primary">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-glass-light rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {upcomingTask && (
                <div className="bg-glass-light p-3 rounded-lg">
                    <p className="text-xs text-text-secondary font-medium">Upcoming</p>
                    <p className="text-sm text-text-primary font-semibold mt-1">{upcomingTask.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{new Date(upcomingTask.dueDate!).toLocaleDateString()}</p>
                </div>
            )}

            <div className="flex items-center flex-wrap gap-2 text-xs mt-auto pt-4 border-t border-border-color">
                <Link to={mainBoard ? `/board/${mainBoard.id}` : '#'} onClick={e => e.stopPropagation()} className="px-3 py-1.5 rounded-md bg-glass-light text-text-secondary hover:bg-border-color hover:text-text-primary font-medium transition-colors flex items-center gap-1.5">
                    <BoardIcon className="h-4 w-4" />
                    {boardCount} {boardCount === 1 ? 'Board' : 'Boards'}
                </Link>
                <Link to={`/projects/${project.id}/roadmap`} onClick={e => e.stopPropagation()} className="px-3 py-1.5 rounded-md bg-glass-light text-text-secondary hover:bg-border-color hover:text-text-primary font-medium transition-colors flex items-center gap-1.5">
                    <RoadmapIcon className="h-4 w-4" />
                    {roadmapCount} {roadmapCount === 1 ? 'Roadmap' : 'Roadmaps'}
                </Link>
                <Link to={mainBoard ? `/board/${mainBoard.id}` : '#'} onClick={e => e.stopPropagation()} className="px-3 py-1.5 rounded-md bg-glass-light text-text-secondary hover:bg-border-color hover:text-text-primary font-medium transition-colors flex items-center gap-1.5">
                    <ListIcon className="h-4 w-4" />
                    {projectTasks.length} {projectTasks.length === 1 ? 'Task' : 'Tasks'}
                </Link>
            </div>
        </Link>
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
  
  const [activeTaskTab, setActiveTaskTab] = useState<'upcoming' | 'missed' | 'past'>('upcoming');

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

  const tasksOverview = useMemo(() => {
    const now = new Date();
    const upcoming: Task[] = [];
    const missed: Task[] = [];
    const past: Task[] = [];

    data.tasks.forEach(task => {
        if (task.stageId === 'stage-3') { // Completed
            past.push(task);
        } else if (task.dueDate && new Date(task.dueDate) < now) {
            missed.push(task);
        } else {
            upcoming.push(task);
        }
    });

    return {
        upcoming: upcoming.sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()),
        missed: missed.sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()),
        past: past.sort((a,b) => new Date(b.dueDate!).getTime() - new Date(a.dueDate!).getTime()),
    };
  }, [data.tasks]);
  
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
            logoUrl: logoUrl // Add logoUrl to saved data
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

  const TaskRow: React.FC<{task: Task}> = ({task}) => {
    const stage = data.stages.find(s => s.id === task.stageId);
    const assignees = data.users.filter(m => task.assignees.includes(m.id));

    const priorityClasses = {
        High: 'text-red-400',
        Medium: 'text-yellow-400',
        Low: 'text-green-400',
    };

    return (
        <tr className="border-b border-border-color last:border-b-0 hover:bg-glass-light cursor-pointer" onClick={() => navigate(`/board/${task.boardId}`)}>
            <td className="p-4 font-medium text-text-primary">{task.title}</td>
            <td className="p-4 text-text-secondary">{stage?.name || 'N/A'}</td>
            <td className={`p-4 font-medium ${priorityClasses[task.priority]}`}>{task.priority}</td>
            <td className="p-4">
                 <div className="flex -space-x-2">
                    {assignees.map(member => (
                        <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="w-8 h-8 rounded-full border-2 border-surface" />
                    ))}
                </div>
            </td>
            <td className="p-4 text-text-secondary">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</td>
        </tr>
    )
  }
  
  const activeFilterCount = (filterSortState.status !== 'All' ? 1 : 0) + filterSortState.brands.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Projects</h1>
            <p className="mt-2 text-text-secondary">Organize, track, and manage all your work in one place.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-text-secondary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                </span>
                <input
                    type="text"
                    placeholder="Search Projects"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-48 rounded-lg bg-glass focus:outline-none text-text-primary border border-border-color"
                />
            </div>
            <div className="flex items-center bg-glass rounded-lg p-1 border border-border-color">
                <button onClick={() => setViewMode('board')} className={`p-1 rounded-md ${viewMode === 'board' ? 'bg-primary text-background' : 'text-text-secondary'}`}><BoardIcon className="h-5 w-5"/></button>
                <button onClick={() => setViewMode('list')} className={`p-1 rounded-md ${viewMode === 'list' ? 'bg-primary text-background' : 'text-text-secondary'}`}><ListIcon className="h-5 w-5"/></button>
            </div>
            <div className="relative">
                <button ref={filterAnchorEl} onClick={() => setIsFilterOpen(o => !o)} className="px-4 py-2 flex items-center gap-2 bg-glass text-text-primary text-sm font-medium rounded-lg border border-border-color hover:bg-glass-light">
                    <FilterIcon className="h-4 w-4" /> Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
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
            <button onClick={() => setIsAddProjectModalOpen(true)} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">
                + Add Project
            </button>
        </div>
      </div>
      
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
            ))}
        </div>
      ) : (
        <div className="bg-glass p-4 rounded-xl border border-border-color">
            <table className="min-w-full">
                <thead>
                    <tr className="border-b border-border-color">
                        <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Project</th>
                        <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Brand</th>
                        <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Members</th>
                        <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Tasks</th>
                        <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Boards</th>
                        <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Roadmaps</th>
                        <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Progress</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredProjects.map(project => {
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
                            <tr key={project.id} className="border-b border-border-color last:border-b-0">
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                         {project.logoUrl && <img src={project.logoUrl} alt={project.name} className="w-8 h-8 rounded-md object-cover border border-border-color" />}
                                        <Link to={mainBoard ? `/board/${mainBoard.id}` : '#'} className="font-semibold text-text-primary hover:text-primary">{project.name}</Link>
                                        <StatusBadge status={project.status} />
                                    </div>
                                </td>
                                <td className="p-4 text-text-secondary">{brand?.name}</td>
                                <td className="p-4">
                                    <div className="flex -space-x-2">
                                        {members.slice(0, 4).map(member => (
                                            <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="w-8 h-8 rounded-full border-2 border-surface" />
                                        ))}
                                    </div>
                                </td>
                                <td className="p-4 text-text-secondary">{projectTasks.length}</td>
                                <td className="p-4 text-text-secondary">{boardCount}</td>
                                <td className="p-4 text-text-secondary">{roadmapCount}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-glass-light rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
                                        <span className="text-xs font-medium text-text-secondary">{Math.round(progress)}%</span>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
      )}

        <div className="mt-12">
            <h2 className="text-2xl font-bold text-text-primary mb-4">Tasks Overview</h2>
            <div className="border-b border-border-color flex items-center gap-4 mb-4">
                {(['upcoming', 'missed', 'past'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTaskTab(tab)} className={`py-2 px-4 text-sm font-medium capitalize ${activeTaskTab === tab ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                        {tab} ({tasksOverview[tab].length})
                    </button>
                ))}
            </div>
            <div className="bg-glass rounded-xl border border-border-color overflow-hidden">
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b border-border-color bg-glass-light">
                            <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Task</th>
                            <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Stage</th>
                            <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Priority</th>
                            <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Assignee</th>
                            <th className="p-4 text-left text-xs font-medium text-text-secondary uppercase">Due Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasksOverview[activeTaskTab].map(task => <TaskRow key={task.id} task={task} />)}
                    </tbody>
                </table>
                 {tasksOverview[activeTaskTab].length === 0 && (
                    <p className="text-center text-text-secondary py-10">No {activeTaskTab} tasks.</p>
                )}
            </div>
        </div>

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
