

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, Tag, TimeLog, RecurringTaskSettings, Stage, Activity, Comment } from '../types';
import { useData } from '../contexts/DataContext';
import { useTimer } from '../contexts/TimerContext';
import { Link } from 'react-router-dom';

import { AddIcon } from './icons/AddIcon';
import { EditIcon } from './icons/EditIcon';
import { TimerIcon } from './icons/TimerIcon';
import { RecurringIcon } from './icons/RecurringIcon';
import { AttachmentIcon } from './icons/AttachmentIcon';
import { FileIcon } from './icons/FileIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { RoadmapIcon } from './icons/RoadmapIcon';
import { CalendarIcon } from './icons/CalendarIcon';


import LogTimeModal from './tasks/LogTimeModal';
import RecurringTaskPopover from './tasks/RecurringTaskPopover';


interface TaskModalProps {
    task: Task;
    onClose: () => void;
    onUpdateTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
}

const PriorityIndicator: React.FC<{ priority: Task['priority'] }> = ({ priority }) => {
    const priorityClasses = {
        High: 'bg-red-500',
        Medium: 'bg-yellow-500',
        Low: 'bg-green-500',
    };
    return <span className={`w-3 h-3 rounded-full ${priorityClasses[priority]}`} title={`${priority} priority`}></span>;
}

const tagColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onUpdateTask, onDeleteTask }) => {
    const { data, updateData, forceUpdate } = useData();
    const [editedTask, setEditedTask] = useState<Task>(task);
    const [boardTags, setBoardTags] = useState<Tag[]>(() => JSON.parse(JSON.stringify(data.tags.filter(t => t.boardId === task.boardId))));
    
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    
    const [activeTab, setActiveTab] = useState('all');
    const [newComment, setNewComment] = useState('');
    
    // Time Tracking State
    const [isLogTimeModalOpen, setIsLogTimeModalOpen] = useState(false);
    const [isEditingEstimation, setIsEditingEstimation] = useState(false);
    const [estimationInput, setEstimationInput] = useState('');

    // Recurring Task State
    const [isRecurringPopoverOpen, setIsRecurringPopoverOpen] = useState(false);
    const recurringButtonRef = useRef<HTMLButtonElement>(null);
    
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditedTask(task);
    }, [task]);
    
    const projectRoadmapItems = useMemo(() => {
        const board = data.boards.find(b => b.id === task.boardId);
        if (!board) return [];
        return data.roadmapItems.filter(item => item.projectId === board.projectId);
    }, [data.roadmapItems, data.boards, task.boardId]);

    const boardMembers = useMemo(() => {
        const board = data.boards.find(b => b.id === task.boardId);
        if (!board) return [];
        return data.board_members.filter(m => board.member_ids.includes(m.id));
    }, [data.board_members, data.boards, task.boardId]);

    const availableMembers = useMemo(() => {
        return boardMembers.filter(m => !editedTask.assignees.includes(m.id));
    }, [boardMembers, editedTask.assignees]);
    
    const totalLoggedTime = useMemo(() => {
        return data.time_logs
            .filter(log => log.taskId === task.id)
            .reduce((sum, log) => sum + log.duration, 0);
    }, [data.time_logs, task.id]);

    const taskActivities = useMemo(() => {
        const activities = data.activities.filter(a => a.objectId === task.id && a.objectType === 'task');
        const comments = data.comments.filter(c => c.taskId === task.id);
        
        let allItems: (Activity | Comment)[] = [...activities, ...comments];

        allItems.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        const filteredItems = activeTab === 'all' 
            ? allItems 
            : activeTab === 'comments' 
            ? comments 
            : activities;

        return filteredItems;
    }, [data.activities, data.comments, task.id, activeTab]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditedTask(prev => ({ ...prev, [name]: value }));
    };
    
    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setEditedTask(prev => ({...prev, start_date: value ? new Date(value).toISOString() : undefined }));
    };
    
    const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         const { value } = e.target;
         setEditedTask(prev => ({...prev, dueDate: value ? new Date(value).toISOString() : undefined }));
    };

    const handleSave = () => {
        const changes: string[] = [];
        if (task.title !== editedTask.title) changes.push(`renamed task to "${editedTask.title}"`);
        if (task.description !== editedTask.description) changes.push(`updated the description`);
        if (task.priority !== editedTask.priority) changes.push(`changed priority to ${editedTask.priority}`);
        if (task.start_date !== editedTask.start_date) changes.push(`set start date`);
        if (task.dueDate !== editedTask.dueDate) changes.push(`set due date`);
        if (JSON.stringify(task.assignees.sort()) !== JSON.stringify(editedTask.assignees.sort())) changes.push(`updated assignees`);
        if (JSON.stringify(task.labelIds.sort()) !== JSON.stringify(editedTask.labelIds.sort())) changes.push(`updated labels`);

        if (changes.length > 0) {
            const newActivity: Activity = {
                id: `activity-${Date.now()}`,
                objectId: task.id,
                objectType: 'task',
                description: `admin ${changes.join(', ')}.`,
                timestamp: new Date().toISOString()
            };
            data.activities.unshift(newActivity);
        }

        const otherBoardsTags = data.tags.filter(t => t.boardId !== task.boardId);
        updateData('tags', [...otherBoardsTags, ...boardTags]);
        onUpdateTask(editedTask);
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            onDeleteTask(task.id);
            onClose();
        }
    };
    
    const handleToggleTag = (tagId: string) => {
        setEditedTask(prev => {
            const labelIds = prev.labelIds.includes(tagId)
                ? prev.labelIds.filter(id => id !== tagId)
                : [...prev.labelIds, tagId];
            return { ...prev, labelIds };
        });
    };
    
    const handleCreateTag = (tagName: string) => {
        const newTag: Tag = {
            id: `tag-${Date.now()}`, boardId: task.boardId, name: tagName,
            color: tagColors[Math.floor(Math.random() * tagColors.length)],
        };
        setBoardTags(prev => [...prev, newTag]);
        handleToggleTag(newTag.id);
        setTagSearch('');
    };

    const handleAddAssignee = (memberId: string) => {
        setEditedTask(prev => ({ ...prev, assignees: [...prev.assignees, memberId] }));
    };

    const handleRemoveAssignee = (memberId: string) => {
        setEditedTask(prev => ({ ...prev, assignees: prev.assignees.filter(id => id !== memberId) }));
    };
    
     const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const newAttachment = {
                id: `att-${Date.now()}`,
                name: file.name,
                url: URL.createObjectURL(file),
                type: file.type.split('/')[1] || 'file'
            };
            setEditedTask(prev => ({...prev, attachments: [...prev.attachments, newAttachment]}));
        }
    };
    
     const handleRemoveAttachment = (attachmentId: string) => {
        setEditedTask(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attachmentId)}));
    };

    const handlePostComment = () => {
        if (newComment.trim()) {
            const comment: Comment = {
                id: `comment-${Date.now()}`,
                taskId: task.id,
                boardId: task.boardId,
                author: 'admin', // Hardcoded user
                text: newComment,
                timestamp: new Date().toISOString()
            };
            data.comments.unshift(comment);
            forceUpdate();
            setNewComment('');
        }
    };
    
    const handleSetEstimation = () => {
        const parts = estimationInput.toLowerCase().match(/(\d+h)?\s*(\d+m)?/);
        if (!parts) return;
        let totalMinutes = 0;
        if(parts[1]) totalMinutes += parseInt(parts[1]) * 60;
        if(parts[2]) totalMinutes += parseInt(parts[2]);

        setEditedTask(prev => ({ ...prev, timeEstimation: totalMinutes > 0 ? totalMinutes : undefined }));
        setIsEditingEstimation(false);
        setEstimationInput('');
    };

    const formatMinutes = (minutes: number | undefined) => {
        if (!minutes) return 'n/a';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h > 0 ? `${h}h ` : ''}${m}m`;
    };
    
    const formatSeconds = (seconds: number) => {
        if (!seconds) return '0m logged';
        const totalMinutes = Math.floor(seconds / 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : '0m'}`.trim() + ' logged';
    };
    
    const priorityClasses = {
        High: 'bg-red-500/20 text-red-400',
        Medium: 'bg-yellow-500/20 text-yellow-400',
        Low: 'bg-green-500/20 text-green-400',
    };
    
    const getSafeDateForInput = (isoString?: string) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            return (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
        } catch (e) { return ''; }
    };
    
    const roadmapItem = editedTask.roadmapItemId ? data.roadmapItems.find(r => r.id === editedTask.roadmapItemId) : null;
    const board = data.boards.find(b => b.id === editedTask.boardId);
    const project = board ? data.projects.find(p => p.id === board.projectId) : undefined;

    const taskCurrentTags = boardTags.filter(t => editedTask.labelIds.includes(t.id));

    const SidebarSection: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
        <div className="py-3 border-b border-border-color">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-1 mb-3">{title}</h4>
            <div className="px-1">{children}</div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-surface w-full max-w-5xl h-full max-h-[90vh] rounded-2xl shadow-xl border border-border-color flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border-color flex-shrink-0">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <input
                                type="text"
                                name="title"
                                value={editedTask.title}
                                onChange={handleChange}
                                className="text-xl font-bold text-text-primary bg-transparent w-full focus:outline-none focus:bg-surface-light rounded-lg px-2 py-1 -mx-2 -my-1"
                            />
                             <select name="priority" value={editedTask.priority} onChange={handleChange} className={`appearance-none py-1 pl-3 pr-8 text-sm rounded-lg bg-surface-light border border-border-color font-medium ${priorityClasses[editedTask.priority]}`}>
                                <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                             {project && roadmapItem && (
                                <Link to={`/projects/${project.id}/roadmap`} onClick={onClose} className="flex items-center gap-1.5 px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/40 whitespace-nowrap">
                                    <RoadmapIcon className="w-4 h-4"/> Go to Roadmap
                                </Link>
                            )}
                            <button onClick={onClose} className="text-2xl text-text-secondary hover:text-text-primary">&times;</button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Dates & Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="text-sm">
                                <label className="block text-xs font-medium text-text-secondary mb-1">Start Date</label>
                                <input type="datetime-local" name="start_date" value={getSafeDateForInput(editedTask.start_date)} onChange={handleStartDateChange} className="w-full p-1.5 text-sm rounded-lg bg-surface-light border border-border-color text-text-primary"/>
                            </div>
                            <div className="text-sm">
                                <label className="block text-xs font-medium text-text-secondary mb-1">Due Date</label>
                                <input type="datetime-local" name="dueDate" value={getSafeDateForInput(editedTask.dueDate)} onChange={handleDueDateChange} className="w-full p-1.5 text-sm rounded-lg bg-surface-light border border-border-color text-text-primary"/>
                            </div>

                            {(editedTask.start_date || editedTask.dueDate) && (
                                <div className="md:col-span-2">
                                    <Link to="/calendar" onClick={onClose} className="flex items-center justify-center gap-2 text-sm text-primary font-medium hover:underline py-2">
                                        <CalendarIcon className="w-4 h-4"/> View in Calendar
                                    </Link>
                                </div>
                            )}
                        </div>
                        
                        {/* Description */}
                        <div>
                            <div className="flex items-center gap-2 text-text-secondary mb-2">
                                <EditIcon className="w-5 h-5"/>
                                <h3 className="text-lg font-semibold text-text-primary">Description</h3>
                            </div>
                            <textarea
                                name="description" value={editedTask.description} onChange={handleChange}
                                rows={5} placeholder="Add a more detailed description of the task here..."
                                className="w-full p-3 text-sm rounded-lg bg-surface-light border border-border-color focus:ring-primary focus:border-primary text-text-primary"
                            />
                        </div>
                        
                        {/* Attachments */}
                        <div>
                             <div className="flex items-center gap-2 text-text-secondary mb-3">
                                <AttachmentIcon className="w-5 h-5"/>
                                <h3 className="text-lg font-semibold text-text-primary">Attachments</h3>
                            </div>
                             <div className="space-y-2">
                                {editedTask.attachments.map(att => (
                                    <div key={att.id} className="flex items-center gap-3 bg-surface-light p-2 rounded-lg border border-border-color">
                                        <FileIcon className="w-6 h-6 text-text-secondary"/>
                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-text-primary hover:underline flex-1 truncate">{att.name}</a>
                                        <button onClick={() => handleRemoveAttachment(att.id)} className="p-1 rounded-full hover:bg-red-500/20 text-text-secondary hover:text-red-400"><DeleteIcon className="w-4 h-4"/></button>
                                    </div>
                                ))}
                             </div>
                             <button onClick={() => attachmentInputRef.current?.click()} className="mt-3 text-sm text-primary font-semibold hover:underline">+ Add Attachment</button>
                             <input type="file" ref={attachmentInputRef} onChange={handleAddAttachment} className="hidden" />
                        </div>

                        {/* Comments & Activities */}
                        <div>
                           <div className="border-b border-border-color flex items-center gap-4 mb-4">
                                {(['all', 'comments', 'activities'] as const).map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2 px-1 text-sm font-medium capitalize ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                                        {tab}
                                    </button>
                                ))}
                            </div>
                             {/* Comment input */}
                             <div className="flex items-start gap-3 mb-6">
                                <img src="https://picsum.photos/100" alt="admin" className="w-8 h-8 rounded-full"/>
                                <div className="flex-1">
                                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." rows={2} className="w-full p-2 text-sm rounded-lg bg-surface-light border border-border-color focus:ring-primary focus:border-primary text-text-primary"/>
                                    <button onClick={handlePostComment} className="mt-2 px-3 py-1.5 bg-primary text-background text-xs font-bold rounded-lg hover:bg-primary-hover">Comment</button>
                                </div>
                             </div>

                             {/* Activity List */}
                            <div className="space-y-4">
                                {taskActivities.length > 0 ? taskActivities.map(item => (
                                     <div key={item.id} className="flex items-start gap-3">
                                        <img src="https://picsum.photos/100" alt="admin" className="w-8 h-8 rounded-full"/>
                                        <div>
                                            <p className="text-sm">
                                                <span className="font-bold text-text-primary">admin</span>
                                                <span className="text-text-secondary ml-2 text-xs">{new Date(item.timestamp).toLocaleString()}</span>
                                            </p>
                                            <div className="mt-1 text-sm bg-surface-light p-3 rounded-lg text-text-primary">
                                                {'text' in item ? item.text : item.description}
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-text-secondary text-center py-4">No activity yet.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="w-1/3 min-w-[300px] border-l border-border-color overflow-y-auto p-4 space-y-1">
                        {/* Time Tracking */}
                        <SidebarSection title="Time Tracking">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 bg-surface-light border border-border-color rounded-lg px-2 py-1">
                                        <TimerIcon className="w-5 h-5 text-text-secondary"/>
                                        {isEditingEstimation ? (
                                            <input type="text" value={estimationInput} onChange={e => setEstimationInput(e.target.value)} onBlur={handleSetEstimation} onKeyDown={e => e.key === 'Enter' && handleSetEstimation()} placeholder="e.g. 2h 30m" autoFocus className="bg-transparent text-sm w-24 focus:outline-none"/>
                                        ) : (
                                            <span className="text-sm font-semibold text-text-primary w-24">{formatMinutes(editedTask.timeEstimation)}</span>
                                        )}
                                    </div>
                                     <button onClick={() => setIsEditingEstimation(true)} className="px-3 py-1.5 bg-surface-light text-text-primary text-xs font-bold rounded-lg hover:bg-border-color">Set Estimation</button>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-semibold text-text-primary">{formatSeconds(totalLoggedTime)}</p>
                                    <button onClick={() => setIsLogTimeModalOpen(true)} className="px-3 py-1.5 bg-primary text-background text-xs font-bold rounded-lg hover:bg-primary-hover">+ Log Time</button>
                                </div>
                            </div>
                        </SidebarSection>
                        
                        <SidebarSection title="Assignees">
                             <div className="flex items-center gap-2 flex-wrap">
                                {editedTask.assignees.map(assigneeId => {
                                    const member = boardMembers.find(m => m.id === assigneeId);
                                    if (!member) return null;
                                    return (
                                        <div key={member.id} className="relative group">
                                            <img className="h-8 w-8 rounded-full object-cover" src={member.avatarUrl} alt={member.name} title={member.name} />
                                            <button onClick={() => handleRemoveAssignee(member.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100">&times;</button>
                                        </div>
                                    );
                                })}
                                <div className="relative">
                                    <button onClick={() => setIsAssigneeDropdownOpen(o => !o)} className="h-8 w-8 rounded-full bg-surface-light border border-dashed border-border-color flex items-center justify-center text-text-secondary hover:border-primary hover:text-primary"><AddIcon className="w-4 h-4" /></button>
                                    {isAssigneeDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-60 bg-surface p-2 rounded-lg border border-border-color shadow-lg z-10">
                                            {availableMembers.map(member => (
                                                <button key={member.id} onClick={() => handleAddAssignee(member.id)} className="w-full text-left flex items-center gap-2 p-1.5 rounded hover:bg-surface-light text-sm">
                                                    <img src={member.avatarUrl} className="w-6 h-6 rounded-full" alt={member.name} />
                                                    <span className="text-text-primary">{member.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SidebarSection>
                        <SidebarSection title="Labels">
                             <div className="flex flex-wrap gap-1 items-center">
                                {taskCurrentTags.map(tag => (
                                    <div key={tag.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ backgroundColor: `${tag.color}30` }}>
                                        <span className="text-xs font-semibold" style={{ color: tag.color }}>{tag.name}</span>
                                        <button onClick={() => handleToggleTag(tag.id)} className="text-xs hover:font-bold" style={{ color: tag.color }}>&times;</button>
                                    </div>
                                ))}
                                 <div className="relative">
                                    <button onClick={() => setIsTagDropdownOpen(o => !o)} className="p-1 rounded-full bg-surface-light hover:bg-border-color"><AddIcon className="w-3 h-3 text-text-secondary"/></button>
                                    {isTagDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-56 bg-surface p-2 rounded-lg border border-border-color shadow-lg z-10">
                                            <input type="text" placeholder="Search/create..." value={tagSearch} onChange={e => setTagSearch(e.target.value)} className="w-full text-xs bg-surface-light border-border-color rounded px-2 py-1 mb-2"/>
                                            <div className="max-h-32 overflow-y-auto">
                                                {boardTags.filter(t => !editedTask.labelIds.includes(t.id) && t.name.toLowerCase().includes(tagSearch.toLowerCase())).map(tag => (
                                                    <button key={tag.id} onClick={() => handleToggleTag(tag.id)} className="w-full text-left flex items-center gap-2 p-1 rounded hover:bg-surface-light text-xs"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: tag.color}}></span> <span className="text-text-primary">{tag.name}</span></button>
                                                ))}
                                                {tagSearch && !boardTags.some(t => t.name.toLowerCase() === tagSearch.toLowerCase()) && (
                                                    <button onClick={() => handleCreateTag(tagSearch)} className="w-full text-left p-1 rounded hover:bg-surface-light text-xs text-primary">+ Create "{tagSearch}"</button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SidebarSection>
                         <SidebarSection title="Roadmap">
                             <select name="roadmapItemId" value={editedTask.roadmapItemId || ''} onChange={handleChange} className="w-full p-2 text-sm rounded-lg bg-surface-light border border-border-color text-text-primary">
                                <option value="">None</option>
                                {projectRoadmapItems.map(item => ( <option key={item.id} value={item.id}>{item.title}</option> ))}
                            </select>
                        </SidebarSection>
                        
                        {/* Recurring Task */}
                        <SidebarSection title="Automations">
                             <button ref={recurringButtonRef} onClick={() => setIsRecurringPopoverOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 bg-surface-light text-text-primary text-sm font-medium rounded-lg border border-border-color hover:bg-border-color">
                                <RecurringIcon className="w-5 h-5"/> Recurring Task
                            </button>
                        </SidebarSection>
                    </div>
                </div>

                <div className="flex justify-between items-center p-4 border-t border-border-color flex-shrink-0">
                    <button onClick={handleDelete} className="px-4 py-2 bg-red-800 text-red-100 text-sm font-medium rounded-lg hover:bg-red-700">Delete Task</button>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-4 py-2 bg-surface-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Save Changes</button>
                    </div>
                </div>
            </div>

            {isLogTimeModalOpen && <LogTimeModal isOpen={isLogTimeModalOpen} onClose={() => setIsLogTimeModalOpen(false)} onTaskModalClose={onClose} taskId={task.id} />}
            {isRecurringPopoverOpen && (
                <RecurringTaskPopover 
                    isOpen={isRecurringPopoverOpen}
                    onClose={() => setIsRecurringPopoverOpen(false)}
                    anchorEl={recurringButtonRef.current}
                    settings={editedTask.recurring}
                    onSave={(newSettings) => setEditedTask(prev => ({...prev, recurring: newSettings}))}
                    boardId={task.boardId}
                />
            )}
        </div>
    );
};

export default TaskModal;