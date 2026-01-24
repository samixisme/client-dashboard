import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useData } from '../contexts/DataContext';
import { CalendarEvent } from '../types';
import { updateCalendarEventById, updateSourceItemDate, updateSourceItemAssignees } from '../utils/calendarSync';
import { projects, tasks, boards, roadmapItems } from '../data/mockData';
import { brands } from '../data/brandData';

const EventDetailsPage = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const { user, data } = useData();
    const { events } = useCalendarEvents(user?.uid || 'user-1');
    
    const [event, setEvent] = useState<CalendarEvent | null>(null);
    const [loading, setLoading] = useState(true);

    const [editedTitle, setEditedTitle] = useState('');
    const [editedDates, setEditedDates] = useState({ startDate: '', endDate: '' });
    const [editedAssingees, setEditedAssignees] = useState<string[]>([]);
    const [editedMeetLink, setEditedMeetLink] = useState('');
    const [editedDescription, setEditedDescription] = useState(''); 

    useEffect(() => {
        if (eventId && events.length > 0) {
            const found = events.find(e => e.id === eventId);
            if (found) {
                setEvent(found);
                
                // Initialize form
                setEditedTitle(found.title);
                setEditedDates({
                   startDate: new Date(new Date(found.startDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                   endDate: new Date(new Date(found.endDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                });
                setEditedAssignees(found.assignees || []);
                setEditedMeetLink(found.meetLink || '');
                setLoading(false);
            } else {
                 if(!loading) setLoading(false);
            }
        }
    }, [eventId, events]);

    // Enhanced Project Name Lookup
    const projectContext = useMemo(() => {
        if (!event) return null;
        if (event.projectId) {
            return projects.find(p => p.id === event.projectId);
        }
        if (event.sourceId) {
            if (event.type === 'task') {
                 const task = tasks.find(t => t.id === event.sourceId);
                 const board = task ? boards.find(b => b.id === task.boardId) : undefined;
                 return board ? projects.find(p => p.id === board.projectId) : undefined;
            }
            if (event.type === 'roadmap_item') {
                 const item = roadmapItems.find(i => i.id === event.sourceId);
                 return item ? projects.find(p => p.id === item.projectId) : undefined;
            }
        }
        return null;
    }, [event]);

    // Auto-Assignee Suggestions: Project Members
    const suggestedAssignees = useMemo(() => {
        // Fallback to all users if project context is missing or has no members found
        // This ensures the dropdown is never empty
        return data.users;
    }, [projectContext, data.users]);

    const handleSave = async () => {
        if (!event) return;
        
        const updatedEventData = {
            ...event,
            title: editedTitle,
            startDate: new Date(editedDates.startDate).toISOString(),
            endDate: new Date(editedDates.endDate).toISOString(),
            assignees: editedAssingees,
            meetLink: editedMeetLink
        };
        
        // Sync Source
        if (event.sourceId) {
             await updateSourceItemDate(event.sourceId, event.type, {
                startDate: updatedEventData.startDate,
                endDate: updatedEventData.endDate,
             });
              await updateSourceItemAssignees(event.sourceId, event.type, editedAssingees);
        }
        
        // Sync Calendar Doc
        await updateCalendarEventById(event.id, updatedEventData);
        alert('Event updated successfully!');
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-text-secondary animate-pulse">Loading detail...</div>;
    if (!event) return <div className="flex h-screen items-center justify-center text-text-secondary">Event not found.</div>;

    return (
        <div className="min-h-screen bg-background text-text-primary p-6 md:p-12 font-sans selection:bg-primary/30">
            <div className="max-w-6xl mx-auto">
                {/* Header / Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-text-secondary mb-8">
                     <button onClick={() => navigate('/calendar')} className="hover:text-primary transition-colors">Calendar</button>
                     <span>/</span>
                     {projectContext ? (
                         <>
                            <span className="hover:text-primary transition-colors cursor-default">{projectContext.name}</span>
                            <span>/</span>
                         </>
                     ) : null}
                     <span className="text-text-primary font-medium">Event Details</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Hero Section */}
                        <div className="bg-glass/50 backdrop-blur-2xl border border-border-color rounded-3xl p-8 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-10 -mt-10 pointer-events-none transition-all duration-500 group-hover:bg-primary/30`}></div>
                            
                            <div className="relative z-10">
                                <div className="flex gap-3 mb-4">
                                     <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-background/50 border border-border-color shadow-sm">
                                        {event.type.replace('_', ' ')}
                                     </span>
                                     {projectContext && (
                                         <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shadow-sm flex items-center gap-1">
                                             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                             {projectContext.name}
                                         </span>
                                     )}
                                </div>
                                
                                <input 
                                    type="text" 
                                    value={editedTitle} 
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    className="bg-transparent text-5xl font-extrabold text-text-primary w-full focus:outline-none border-b-2 border-transparent focus:border-primary/50 placeholder-text-secondary/30 transition-all font-display tracking-tight"
                                />
                            </div>
                        </div>

                        {/* Date & Time Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-surface-light border border-border-color rounded-2xl p-6 hover:border-primary/30 transition-colors">
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Starts</label>
                                <input 
                                    type="datetime-local" 
                                    value={editedDates.startDate} 
                                    onChange={(e) => setEditedDates({...editedDates, startDate: e.target.value})}
                                    className="w-full bg-transparent text-xl font-medium text-text-primary focus:outline-none"
                                />
                            </div>
                            <div className="bg-surface-light border border-border-color rounded-2xl p-6 hover:border-primary/30 transition-colors">
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Ends</label>
                                <input 
                                    type="datetime-local" 
                                    value={editedDates.endDate} 
                                    onChange={(e) => setEditedDates({...editedDates, endDate: e.target.value})}
                                    className="w-full bg-transparent text-xl font-medium text-text-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Description (Placeholder for now) */}
                         <div className="bg-glass-light border border-border-color rounded-2xl p-6 min-h-[12rem]">
                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Description / Notes</label>
                            <textarea 
                                className="w-full h-full bg-transparent text-text-primary focus:outline-none resize-none placeholder-text-secondary/40 text-lg leading-relaxed"
                                placeholder="Add detailed notes for this event..."
                                value={editedDescription}
                                onChange={e => setEditedDescription(e.target.value)}
                            ></textarea>
                         </div>
                    </div>

                    {/* Sidebar / Meta Column */}
                    <div className="space-y-6">
                        
                        {/* Actions Card */}
                        <div className="bg-surface border border-border-color rounded-2xl p-6 shadow-xl shadow-black/5">
                            <h3 className="text-sm font-bold text-text-primary mb-4">Actions</h3>
                            <button onClick={handleSave} className="w-full py-3 mb-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
                                Save Changes
                            </button>
                             {editedMeetLink && (
                                <a href={editedMeetLink} target="_blank" rel="noopener noreferrer" className="block w-full py-3 text-center bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20">
                                    Join Google Meet
                                </a>
                            )}
                             <button onClick={() => navigate(-1)} className="w-full py-3 bg-surface-light text-text-secondary font-medium rounded-xl hover:bg-border-color transition-colors">
                                Cancel
                            </button>
                        </div>

                        {/* Conferencing Input */}
                         <div className="bg-glass border border-border-color rounded-2xl p-6">
                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Google Meet</label>
                            <input 
                                type="url" 
                                placeholder="https://meet.google.com/..." 
                                value={editedMeetLink} 
                                onChange={(e) => setEditedMeetLink(e.target.value)}
                                className="w-full bg-glass-light border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary/50"
                             />
                        </div>

                        {/* Assignees Card */}
                        <div className="bg-glass border border-border-color rounded-2xl p-6">
                             <div className="flex justify-between items-center mb-4">
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">Assignees</label>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{editedAssingees.length}</span>
                             </div>
                             
                             <div className="flex flex-col gap-2 mb-4">
                                 {editedAssingees.map(uid => {
                                     const u = data.users.find(user => user.id === uid);
                                     return (
                                         <div key={uid} className="flex items-center justify-between bg-surface-light p-2 rounded-lg border border-border-color group hover:border-primary/30 transition-colors">
                                             <div className="flex items-center gap-3">
                                                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary">
                                                     {(u?.name || '?').charAt(0)}
                                                 </div>
                                                 <div>
                                                     <p className="text-sm font-medium text-text-primary">{u?.name || 'Unknown'}</p>
                                                     <p className="text-[10px] text-text-secondary">{u?.role || 'Member'}</p>
                                                 </div>
                                             </div>
                                             <button onClick={() => setEditedAssignees(prev => prev.filter(id => id !== uid))} className="text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                                 &times;
                                             </button>
                                         </div>
                                     );
                                 })}
                                 {editedAssingees.length === 0 && (
                                     <div className="text-center py-4 text-text-secondary text-sm italic">
                                         No one assigned yet.
                                     </div>
                                 )}
                             </div>

                             <div className="relative">
                                 <select 
                                     onChange={(e) => {
                                         if(e.target.value && !editedAssingees.includes(e.target.value)) setEditedAssignees([...editedAssingees, e.target.value]);
                                         e.target.value = '';
                                     }}
                                      className="w-full appearance-none bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm py-2 px-4 rounded-lg cursor-pointer transition-colors text-center focus:outline-none"
                                 >
                                     <option value="">+ Add Team Member</option>
                                     {suggestedAssignees.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                                 </select>
                             </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailsPage;
