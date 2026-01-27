import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RoadmapItem, Task } from '../../types';
import { useData } from '../../contexts/DataContext';
import { AddIcon } from '../icons/AddIcon';
import { AttachmentIcon } from '../icons/AttachmentIcon';
import { DeleteIcon } from '../icons/DeleteIcon';
import { FileIcon } from '../icons/FileIcon';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../utils/firebase';
import { toast } from 'sonner';

interface RoadmapItemModalProps {
    item: RoadmapItem;
    onClose: () => void;
    onUpdateItem: (item: RoadmapItem) => void;
    onDeleteItem: (itemId: string) => void;
}

const RoadmapItemModal: React.FC<RoadmapItemModalProps> = ({ item, onClose, onUpdateItem, onDeleteItem }) => {
    const { data } = useData();
    const [editedItem, setEditedItem] = useState(item);
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

    useEffect(() => {
        setEditedItem(item);
    }, [item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditedItem(prev => ({ ...prev, [name]: value }));
    };
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'startDate' | 'endDate') => {
        setEditedItem(prev => ({ ...prev, [field]: new Date(e.target.value).toISOString() }));
    };

    const handleSave = () => {
        onUpdateItem(editedItem);
        toast.success('Roadmap item updated');
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this roadmap item and all its associated tasks?')) {
            onDeleteItem(item.id);
            toast.success('Roadmap item deleted');
        }
    };
    
    const handleAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && item.projectId) {
            const file = e.target.files[0];
            setUploadingAttachment(true);
            try {
                const storageRef = ref(storage, `projects/${item.projectId}/roadmap/${item.id}/attachments/${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);

                const newAttachment = {
                    id: `att-${Date.now()}`,
                    name: file.name,
                    url: url,
                    type: file.type.split('/')[1] || 'file'
                };
                setEditedItem(prev => ({...prev, attachments: [...prev.attachments, newAttachment]}));
                toast.success('Attachment uploaded');
            } catch (error) {
                console.error("Error uploading attachment:", error);
                toast.error('Failed to upload attachment');
            } finally {
                setUploadingAttachment(false);
            }
        }
    };

    const handleRemoveAttachment = (attachmentId: string) => {
        setEditedItem(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attachmentId)}));
        toast.success('Attachment removed');
    };

    const projectBoardIds = useMemo(() => {
        const boardsForProject = (data.boards || []).filter(b => b.projectId === item.projectId);
        return boardsForProject.map(b => b.id);
    }, [data.boards, item.projectId]);
    
    const itemTasks = useMemo(() => {
        return (data.tasks || []).filter(t => t.roadmapItemId === item.id);
    }, [data.tasks, item.id]);

    const getSafeDateForInput = (isoString?: string) => {
        if (!isoString) return '';
        try {
            return new Date(isoString).toISOString().split('T')[0];
        } catch (e) { return ''; }
    };
    
    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-surface w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl border border-border-color flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border-color">
                    <input 
                        type="text"
                        name="title"
                        value={editedItem.title}
                        onChange={handleChange}
                        className="text-xl font-bold text-text-primary bg-transparent w-full focus:outline-none focus:bg-surface-light rounded-lg px-2 py-1 -mx-2"
                    />
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Status & Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
                            <select name="status" value={editedItem.status} onChange={handleChange} className="w-full p-2 text-sm rounded-lg bg-surface-light border border-border-color text-text-primary">
                                <option>Planned</option>
                                <option>In Progress</option>
                                <option>Completed</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Start Date</label>
                            <input type="date" value={getSafeDateForInput(editedItem.startDate)} onChange={e => handleDateChange(e, 'startDate')} className="w-full p-1.5 text-sm rounded-lg bg-surface-light border border-border-color text-text-primary"/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">End Date</label>
                            <input type="date" value={getSafeDateForInput(editedItem.endDate)} onChange={e => handleDateChange(e, 'endDate')} className="w-full p-1.5 text-sm rounded-lg bg-surface-light border border-border-color text-text-primary"/>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-2">Description</label>
                        <textarea
                            name="description"
                            value={editedItem.description}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Add a description..."
                            className="w-full p-3 text-sm rounded-lg bg-surface-light border border-border-color focus:ring-primary focus:border-primary text-text-primary"
                        />
                    </div>
                    
                    {/* Tasks */}
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary mb-2">Tasks ({itemTasks.length})</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {itemTasks.map(task => (
                                <div key={task.id} className="bg-surface-light p-2 rounded-md text-sm text-text-primary border border-border-color">{task.title}</div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Attachments */}
                    <div>
                         <div className="flex items-center gap-2 text-text-secondary mb-3">
                            <AttachmentIcon className="w-5 h-5"/>
                            <h3 className="text-sm font-semibold text-text-primary">Attachments</h3>
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
                         <button onClick={() => attachmentInputRef.current?.click()} disabled={uploadingAttachment} className="mt-3 text-sm text-primary font-semibold hover:underline">
                             {uploadingAttachment ? 'Uploading...' : '+ Add Attachment'}
                         </button>
                         <input type="file" ref={attachmentInputRef} onChange={handleAddAttachment} className="hidden" />
                    </div>
                </div>

                <div className="flex justify-between items-center p-4 border-t border-border-color">
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
