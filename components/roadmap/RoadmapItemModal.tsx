import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RoadmapItem, Tag, Activity, Comment, Task } from '../../types';
import { useData } from '../../contexts/DataContext';

import { AddIcon } from '../icons/AddIcon';
import { EditIcon } from '../icons/EditIcon';
import { AttachmentIcon } from '../icons/AttachmentIcon';
import { FileIcon } from '../icons/FileIcon';
import { DeleteIcon } from '../icons/DeleteIcon';
import { ListIcon } from '../icons/ListIcon';

interface RoadmapItemModalProps {
    item: RoadmapItem;
    onClose: () => void;
    onUpdateItem: (item: RoadmapItem) => void;
    onDeleteItem: (itemId: string) => void;
}

const tagColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];

const RoadmapItemModal: React.FC<RoadmapItemModalProps> = ({ item, onClose, onUpdateItem, onDeleteItem }) => {
    const { data, updateData, forceUpdate } = useData();
    const [editedItem, setEditedItem] = useState<RoadmapItem>(item);
    
    const [projectTags, setProjectTags] = useState<Tag[]>(() => {
        const projectBoards = data.boards.filter(b => b.projectId === item.projectId).map(b => b.id);
        const tags = data.tags.filter(t => projectBoards.includes(t.boardId));
        return JSON.parse(JSON.stringify(tags));
    });
    
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    
    const [activeTab, setActiveTab] = useState('all');
    const [newComment, setNewComment] = useState('');
    
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditedItem(item);
    }, [item]);

    const projectMembers = useMemo(() => {
        const projectBoards = data.boards.filter(b => b.projectId === item.projectId);
        const memberIds = new Set(projectBoards.flatMap(b => b.member_ids));
        return data.board_members.filter(m => memberIds.has(m.id));
    }, [data.board_members, data.boards, item.projectId]);

    const availableMembers = useMemo(() => {
        return projectMembers.filter(m => !(editedItem.assignees || []).includes(m.id));
    }, [projectMembers, editedItem.assignees]);

    const linkedTasks = useMemo(() => {
        return data.tasks.filter(t => t.roadmapItemId === item.id);
    }, [data.tasks, item.id]);
    
    const itemActivities = useMemo(() => {
        const activities = data.activities.filter(a => a.objectId === item.id && a.objectType === 'roadmap_item');
        const comments = data.comments.filter(c => c.roadmapItemId === item.id);
        
        let allItems: (Activity | Comment)[] = [...activities, ...comments];
        allItems.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        const filteredItems = activeTab === 'all' 
            ? allItems 
            : activeTab === 'comments' 
            ? comments 
            : activities;

        return filteredItems;
    }, [data.activities, data.comments, item.id, activeTab]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditedItem(prev => ({ ...prev, [name]: value }));
    };
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedItem(prev => ({...prev, [name]: value ? new Date(value).toISOString() : '' }));
    };

    const handleSave = () => {
        const changes: string[] = [];
        if (item.title !== editedItem.title) changes.push(`renamed item to "${editedItem.title}"`);
        if (item.description !== editedItem.description) changes.push(`updated the description`);
        if (item.status !== editedItem.status) changes.push(`changed status to ${editedItem.status}`);
        if (item.startDate !== editedItem.startDate) changes.push(`set start date`);
        if (item.endDate !== editedItem.endDate) changes.push(`set end date`);
        if (JSON.stringify(item.assignees?.sort()) !== JSON.stringify(editedItem.assignees?.sort())) changes.push(`updated assignees`);
        if (JSON.stringify(item.labelIds.sort()) !== JSON.stringify(editedItem.labelIds.sort())) changes.push(`updated labels`);

        if (changes.length > 0) {
            const newActivity: Activity = {
                id: `activity-${Date.now()}`,
                objectId: item.id,
                objectType: 'roadmap_item',
                description: `admin ${changes.join(', ')}.`,
                timestamp: new Date().toISOString()
            };
            data.activities.unshift(newActivity);
        }

        const otherProjectTags = data.tags.filter(t => !projectTags.find(pt => pt.id === t.id));
        updateData('tags', [...otherProjectTags, ...projectTags]);
        onUpdateItem(editedItem);
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this roadmap item and all its tasks?')) {
            onDeleteItem(item.id);
            onClose();
        }
    };
    
    const handleToggleTag = (tagId: string) => {
        setEditedItem(prev => {
            const labelIds = prev.labelIds.includes(tagId)
                ? prev.labelIds.filter(id => id !== tagId)
                : [...prev.labelIds, tagId];
            return { ...prev, labelIds };
        });
    };
    
    const handleCreateTag = (tagName: string) => {
        const boardIdForTag = data.boards.find(b => b.projectId === item.projectId)?.id;
        if (!boardIdForTag) return; // Cannot create tag without a board
        
        const newTag: Tag = {
            id: `tag-${Date.now()}`, boardId: boardIdForTag, name: tagName,
            color: tagColors[Math.floor(Math.random() * tagColors.length)],
        };
        setProjectTags(prev => [...prev, newTag]);
        handleToggleTag(newTag.id);
        setTagSearch('');
    };

    const handleAddAssignee = (memberId: string) => {
        setEditedItem(prev => ({ ...prev, assignees: [...(prev.assignees || []), memberId] }));
    };

    const handleRemoveAssignee = (memberId: string) => {
        setEditedItem(prev => ({ ...prev, assignees: (prev.assignees || []).filter(id => id !== memberId) }));
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
            setEditedItem(prev => ({...prev, attachments: [...prev.attachments, newAttachment]}));
        }
    };
    
     const handleRemoveAttachment = (attachmentId: string) => {
        setEditedItem(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attachmentId)}));
    };

    const handlePostComment = () => {
        if (newComment.trim()) {
            const comment: Comment = {
                id: `comment-${Date.now()}`,
                roadmapItemId: item.id,
                author: 'admin', // Hardcoded user
                text: newComment,
                timestamp: new Date().toISOString()
            };
            data.comments.unshift(comment);
            forceUpdate();
            setNewComment('');
        }
    };

    const getSafeDateForInput = (isoString?: string) => isoString ? isoString.split('T')[0] : '';
    
    const currentTags = projectTags.filter(t => editedItem.labelIds.includes(t.id));

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
                        <input
                            type="text"
                            name="title"
                            value={editedItem.title}
                            onChange={handleChange}
                            className="text-xl font-bold text-text-primary bg-transparent w-full focus:outline-none focus:bg-surface-light rounded-lg px-2 py-1 -mx-2 -my-1"
                        />
                        <button onClick={onClose} className="text-2xl text-text-secondary hover:text-text-primary">&times;</button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Description */}
                        <div>
                            <div className="flex items-center gap-2 text-text-secondary mb-2">
                                <EditIcon className="w-5 h-5"/>
                                <h3 className="text-lg font-semibold text-text-primary">Description</h3>
                            </div>
                            <textarea
                                name="description" value={editedItem.description} onChange={handleChange}
                                rows={5} placeholder="Add a more detailed description of the roadmap item..."
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
                                {editedItem.attachments.map(att => (
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
                             <div className="flex items-start gap-3 mb-6">
                                <img src="https://picsum.photos/100" alt="admin" className="w-8 h-8 rounded-full"/>
                                <div className="flex-1">
                                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." rows={2} className="w-full p-2 text-sm rounded-lg bg-surface-light border border-border-color focus:ring-primary focus:border-primary text-text-primary"/>
                                    <button onClick={handlePostComment} className="mt-2 px-3 py-1.5 bg-primary text-background text-xs font-bold rounded-lg hover:bg-primary-hover">Comment</button>
                                </div>
                             </div>

                            <div className="space-y-4">
                                {itemActivities.length > 0 ? itemActivities.map(activity => (
                                     <div key={activity.id} className="flex items-start gap-3">
                                        <img src="https://picsum.photos/100" alt="admin" className="w-8 h-8 rounded-full"/>
                                        <div>
                                            <p className="text-sm">
                                                <span className="font-bold text-text-primary">admin</span>
                                                <span className="text-text-secondary ml-2 text-xs">{new Date(activity.timestamp).toLocaleString()}</span>
                                            </p>
                                            <div className="mt-1 text-sm bg-surface-light p-3 rounded-lg text-text-primary">
                                                {'text' in activity ? activity.text : activity.description}
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-text-secondary text-center py-4">No activity yet.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="w-1/3 min-w-[300px] border-l border-border-color overflow-y-auto p-4 space-y-1">
                        <SidebarSection title="Status">
                             <select name="status" value={editedItem.status} onChange={handleChange} className="w-full p-2 text-sm rounded-lg bg-surface-light border border-border-color text-text-primary font-medium">
                                <option value="Planned">Planned</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </SidebarSection>
                        <SidebarSection title="Dates">
                            <div className="space-y-3">
                                <div className="text-sm">
                                    <label className="block text-xs font-medium text-text-secondary mb-1">Start Date</label>
                                    <input type="date" name="startDate" value={getSafeDateForInput(editedItem.startDate)} onChange={handleDateChange} className="w-full p-1.5 text-sm rounded-lg bg-surface-light border border-border-color text-text-primary"/>
                                </div>
                                <div className="text-sm">
                                    <label className="block text-xs font-medium text-text-secondary mb-1">End Date</label>
                                    <input type="date" name="endDate" value={getSafeDateForInput(editedItem.endDate)} onChange={handleDateChange} className="w-full p-1.5 text-sm rounded-lg bg-surface-light border border-border-color text-text-primary"/>
                                </div>
                            </div>
                        </SidebarSection>
                        <SidebarSection title="Assignees">
                             <div className="flex items-center gap-2 flex-wrap">
                                {(editedItem.assignees || []).map(assigneeId => {
                                    const member = projectMembers.find(m => m.id === assigneeId);
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
                                {currentTags.map(tag => (
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
                                                {projectTags.filter(t => !editedItem.labelIds.includes(t.id) && t.name.toLowerCase().includes(tagSearch.toLowerCase())).map(tag => (
                                                    <button key={tag.id} onClick={() => handleToggleTag(tag.id)} className="w-full text-left flex items-center gap-2 p-1 rounded hover:bg-surface-light text-xs"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: tag.color}}></span> <span className="text-text-primary">{tag.name}</span></button>
                                                ))}
                                                {tagSearch && !projectTags.some(t => t.name.toLowerCase() === tagSearch.toLowerCase()) && (
                                                    <button onClick={() => handleCreateTag(tagSearch)} className="w-full text-left p-1 rounded hover:bg-surface-light text-xs text-primary">+ Create "{tagSearch}"</button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SidebarSection>
                        <SidebarSection title="Linked Tasks">
                            <div className="space-y-2">
                                {linkedTasks.length > 0 ? linkedTasks.map(task => (
                                    <Link to={`/board/${task.boardId}`} key={task.id} onClick={onClose} className="flex items-center gap-2 p-2 rounded-lg bg-surface-light hover:bg-border-color text-sm text-text-primary">
                                        <ListIcon className="w-4 h-4 text-text-secondary"/>
                                        <span className="flex-1 truncate">{task.title}</span>
                                    </Link>
                                )) : (
                                    <p className="text-sm text-text-secondary text-center py-2">No tasks linked yet.</p>
                                )}
                            </div>
                        </SidebarSection>
                    </div>
                </div>

                <div className="flex justify-between items-center p-4 border-t border-border-color flex-shrink-0">
                    <button onClick={handleDelete} className="px-4 py-2 bg-red-800 text-red-100 text-sm font-medium rounded-lg hover:bg-red-700">Delete Item</button>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-4 py-2 bg-surface-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoadmapItemModal;