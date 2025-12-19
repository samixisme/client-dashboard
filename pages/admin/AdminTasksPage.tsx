import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../../components/icons/AddIcon';
import { EditIcon } from '../../components/icons/EditIcon';
import { DeleteIcon } from '../../components/icons/DeleteIcon';
import TaskModal from '../../components/TaskModal';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import { Task, Project, Board } from '../../types';
import { doc, deleteDoc, updateDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { slugify } from '../../utils/slugify';

type SortField = 'title' | 'project' | 'assignees' | 'priority' | 'dueDate';
type SortDirection = 'asc' | 'desc';

const AdminTasksPage: React.FC = () => {
  const { data, forceUpdate } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [sortBy, setSortBy] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
      if (sortBy === field) {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
          setSortBy(field);
          setSortDirection('asc');
      }
  };

  // Combine filtering and sorting
  const filteredTasks = useMemo(() => {
    let tasks = data.tasks.filter(task => {
        if (!task.title) return false;
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    return tasks.sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';

        switch (sortBy) {
            case 'title':
                valA = a.title.toLowerCase();
                valB = b.title.toLowerCase();
                break;
            case 'project':
                const projA = data.projects.find(p => {
                    const board = data.boards.find(bo => bo.id === a.boardId);
                    return board && p.id === board.projectId;
                });
                const projB = data.projects.find(p => {
                    const board = data.boards.find(bo => bo.id === b.boardId);
                    return board && p.id === board.projectId;
                });
                valA = projA?.name.toLowerCase() || '';
                valB = projB?.name.toLowerCase() || '';
                break;
            case 'priority':
                const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
                valA = priorityMap[a.priority] || 0;
                valB = priorityMap[b.priority] || 0;
                break;
            case 'dueDate':
                valA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                break;
            case 'assignees':
                valA = a.assignees.length;
                valB = b.assignees.length;
                break;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
  }, [data.tasks, data.projects, data.boards, searchTerm, sortBy, sortDirection]);

  const handleCreateTask = () => {
      const activeBoard = data.boards[0];
      if (!activeBoard) {
          alert("No boards available to create a task. Please create a project first.");
          return;
      }

      const newTask: Task = {
          id: `task-${Date.now()}`, // Temporary ID
          boardId: activeBoard.id,
          stageId: data.stages.find(s => s.boardId === activeBoard.id)?.id || '',
          title: 'New Admin Task',
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

  const getPriorityColor = (priority: string) => {
      switch (priority) {
          case 'High': return 'text-red-500 bg-red-500/10 border-red-500/20';
          case 'Medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
          case 'Low': return 'text-green-500 bg-green-500/10 border-green-500/20';
          default: return 'text-text-secondary bg-glass border-border-color';
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-text-primary">Manage Tasks</h2>
                <p className="text-text-secondary text-sm mt-1">Global task tracking and assignment.</p>
            </div>
            <button 
                onClick={handleCreateTask}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-primary/20"
            >
                <AddIcon className="h-4 w-4" />
                Create Task
            </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-glass border border-border-color rounded-xl p-4 flex items-center gap-4">
            <input 
                type="text" 
                placeholder="Search tasks..." 
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
                            <th 
                                className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                                onClick={() => handleSort('title')}
                            >
                                Task {sortBy === 'title' && (sortDirection === 'asc' ? '▲' : '▼')}
                            </th>
                            <th 
                                className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                                onClick={() => handleSort('project')}
                            >
                                Project / Board {sortBy === 'project' && (sortDirection === 'asc' ? '▲' : '▼')}
                            </th>
                            <th 
                                className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                                onClick={() => handleSort('assignees')}
                            >
                                Assignees {sortBy === 'assignees' && (sortDirection === 'asc' ? '▲' : '▼')}
                            </th>
                            <th 
                                className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                                onClick={() => handleSort('priority')}
                            >
                                Priority {sortBy === 'priority' && (sortDirection === 'asc' ? '▲' : '▼')}
                            </th>
                            <th 
                                className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary"
                                onClick={() => handleSort('dueDate')}
                            >
                                Due Date {sortBy === 'dueDate' && (sortDirection === 'asc' ? '▲' : '▼')}
                            </th>
                            <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {filteredTasks.map((task) => {
                            const board = data.boards.find(b => b.id === task.boardId);
                            const project = board ? data.projects.find(p => p.id === board.projectId) : undefined;
                            const assignees = data.users.filter(u => task.assignees.includes(u.id));

                            return (
                                <tr key={task.id} className="hover:bg-glass-light/50 transition-colors cursor-pointer" onClick={() => handleEditTask(task)}>
                                    <td className="p-4">
                                        <span className="text-sm font-medium text-text-primary">{task.title}</span>
                                    </td>
                                    <td className="p-4 text-sm text-text-secondary">
                                        {project?.name || 'N/A'} <span className="text-text-secondary/50">/</span> {board?.name || 'N/A'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex -space-x-2">
                                            {assignees.map(user => (
                                                <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="w-6 h-6 rounded-full border border-surface" />
                                            ))}
                                            {assignees.length === 0 && <span className="text-xs text-text-secondary">Unassigned</span>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-text-secondary">
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleEditTask(task)}
                                                className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <EditIcon className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => confirmDelete(task)}
                                                className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <DeleteIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredTasks.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-text-secondary text-sm">
                                    No tasks found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {selectedTask && isTaskModalOpen && (
            <TaskModal
                task={selectedTask}
                onClose={() => setIsTaskModalOpen(false)}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
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

export default AdminTasksPage;
