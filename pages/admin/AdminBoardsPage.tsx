import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../../components/icons/AddIcon';
import { EditIcon } from '../../components/icons/EditIcon';
import { DeleteIcon } from '../../components/icons/DeleteIcon';
import { ChevronDownIcon } from '../../components/icons/ChevronDownIcon';
import { Board, Task, Project, Stage } from '../../types';
import TaskModal from '../../components/TaskModal';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import { doc, deleteDoc, updateDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { slugify } from '../../utils/slugify';

type SortField = 'name' | 'taskCount' | 'brand';
type SortDirection = 'asc' | 'desc';

const AdminBoardsPage: React.FC = () => {
  const { data, forceUpdate } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());
  
  // Task Management
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Filter/Sort State
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all'); // Added Brand Filter

  const handleSort = (field: SortField) => {
      if (sortBy === field) {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
          setSortBy(field);
          setSortDirection('asc');
      }
  };

  const filteredBoards = useMemo(() => {
    let boards = data.boards.filter(board => {
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
        } else if (sortBy === 'taskCount') {
            valA = data.tasks.filter(t => t.boardId === a.id).length;
            valB = data.tasks.filter(t => t.boardId === b.id).length;
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
  }, [data.boards, data.projects, data.tasks, data.brands, searchTerm, sortBy, sortDirection, filterProject, filterBrand]);

  const toggleBoardExpand = (boardId: string) => {
      const newExpanded = new Set(expandedBoards);
      if (newExpanded.has(boardId)) newExpanded.delete(boardId);
      else newExpanded.add(boardId);
      setExpandedBoards(newExpanded);
  };

  const handleCreateTask = (boardId: string) => {
      const board = data.boards.find(b => b.id === boardId);
      if (!board) return;
      
      const stages = data.stages.filter(s => s.boardId === boardId).sort((a,b) => a.order - b.order);
      const defaultStageId = stages[0]?.id || '';

      const newTask: Task = {
          id: `task-${Date.now()}`,
          boardId: boardId,
          stageId: defaultStageId,
          title: 'New Task',
          description: '',
          priority: 'Medium',
          dateAssigned: new Date().toISOString(),
          assignees: [],
          labelIds: [],
          attachments: [],
          createdAt: new Date().toISOString(),
      };
      setSelectedTask(newTask);
      setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
      setSelectedTask(task);
      setIsTaskModalOpen(true);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
      const isNew = !data.tasks.find(t => t.id === updatedTask.id);
      if (isNew) {
          data.tasks.push(updatedTask);
      } else {
          const index = data.tasks.findIndex(t => t.id === updatedTask.id);
          if (index !== -1) data.tasks[index] = updatedTask;
      }
      forceUpdate();

      const board = data.boards.find(b => b.id === updatedTask.boardId);
      const project = board ? data.projects.find(p => p.id === board.projectId) : undefined;

      if (project && board) {
          try {
              if (isNew || updatedTask.id.startsWith('task-')) {
                   const taskSlug = slugify(updatedTask.title);
                   const taskId = `${taskSlug}-${Date.now()}`;
                   const taskToSave = { ...updatedTask, id: taskId };
                   const { id, ...taskData } = taskToSave;
                   await setDoc(doc(db, 'projects', project.id, 'boards', board.id, 'tasks', taskId), taskData);
              } else {
                   const { id, ...taskData } = updatedTask;
                   const cleanData = JSON.parse(JSON.stringify(taskData));
                   await updateDoc(doc(db, 'projects', project.id, 'boards', board.id, 'tasks', id), cleanData);
              }
          } catch (e) {
              console.error("Error syncing task to Firestore", e);
          }
      }
  };

  const confirmDelete = (task: Task) => {
      setTaskToDelete(task);
      setIsDeleteModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
      const targetId = taskId || taskToDelete?.id;
      if (!targetId) return;

      const task = data.tasks.find(t => t.id === targetId);
      data.tasks = data.tasks.filter(t => t.id !== targetId);
      forceUpdate();
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);

      if (task) {
          const board = data.boards.find(b => b.id === task.boardId);
          const project = board ? data.projects.find(p => p.id === board.projectId) : undefined;
          if (project && board && !targetId.startsWith('task-')) {
              try {
                  await deleteDoc(doc(db, 'projects', project.id, 'boards', board.id, 'tasks', targetId));
              } catch (e) {
                  console.error("Error deleting task from Firestore", e);
              }
          }
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
                <h2 className="text-2xl font-bold text-text-primary">Manage Boards</h2>
                <p className="text-text-secondary text-sm mt-1">View and manage tasks within their boards.</p>
            </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-glass border border-border-color rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center flex-wrap">
            <input 
                type="text" 
                placeholder="Search boards..." 
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
                <button onClick={() => handleSort('taskCount')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-glass-light hover:bg-border-color text-text-secondary flex items-center">
                    Tasks <SortIcon field="taskCount" />
                </button>
                <button onClick={() => handleSort('brand')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-glass-light hover:bg-border-color text-text-secondary flex items-center">
                    Brand <SortIcon field="brand" />
                </button>
            </div>
        </div>

        {/* Boards List */}
        <div className="space-y-4">
            {filteredBoards.map(board => {
                const project = data.projects.find(p => p.id === board.projectId);
                const brand = project ? data.brands.find(b => b.id === project.brandId) : undefined;
                const boardTasks = data.tasks.filter(t => t.boardId === board.id);
                const isExpanded = expandedBoards.has(board.id);

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
                                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                                    {boardTasks.length} Tasks
                                </span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleCreateTask(board.id); }}
                                    className="p-2 rounded-lg bg-glass-light hover:bg-primary hover:text-white text-text-secondary transition-colors"
                                >
                                    <AddIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-border-color bg-glass-light/30 p-4">
                                {boardTasks.length > 0 ? (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-xs text-text-secondary border-b border-border-color/50">
                                                <th className="p-3 font-medium cursor-pointer hover:text-text-primary">Task Name</th>
                                                <th className="p-3 font-medium">Status</th>
                                                <th className="p-3 font-medium cursor-pointer hover:text-text-primary">Priority</th>
                                                <th className="p-3 font-medium">Assignees</th>
                                                <th className="p-3 font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-color/50">
                                            {boardTasks.map(task => {
                                                const stage = data.stages.find(s => s.id === task.stageId);
                                                return (
                                                    <tr key={task.id} className="hover:bg-glass-light/50 text-sm">
                                                        <td className="p-3 text-text-primary">{task.title}</td>
                                                        <td className="p-3 text-text-secondary">{stage?.name || 'No Stage'}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                                task.priority === 'High' ? 'bg-red-500/10 text-red-500' : 
                                                                task.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' : 
                                                                'bg-green-500/10 text-green-500'
                                                            }`}>
                                                                {task.priority}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="flex -space-x-2">
                                                                {task.assignees.map(uid => {
                                                                    const u = data.users.find(user => user.id === uid);
                                                                    return u ? <img key={uid} src={u.avatarUrl} className="w-6 h-6 rounded-full border border-surface" title={u.name}/> : null;
                                                                })}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => handleEditTask(task)} className="text-text-secondary hover:text-primary"><EditIcon className="h-4 w-4"/></button>
                                                                <button onClick={() => confirmDelete(task)} className="text-text-secondary hover:text-red-500"><DeleteIcon className="h-4 w-4"/></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-center text-sm text-text-secondary py-4">No tasks in this board.</p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            {filteredBoards.length === 0 && (
                <p className="text-center text-text-secondary py-8">No boards found.</p>
            )}
        </div>

        {selectedTask && isTaskModalOpen && (
            <TaskModal
                task={selectedTask}
                onClose={() => setIsTaskModalOpen(false)}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={() => confirmDelete(selectedTask)}
            />
        )}

        <DeleteConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={() => handleDeleteTask(taskToDelete?.id || '')}
            itemName={taskToDelete?.title || 'Task'}
        />
    </div>
  );
};

export default AdminBoardsPage;
