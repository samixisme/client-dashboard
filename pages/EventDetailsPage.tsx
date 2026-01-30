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
             }, event.projectId);
              await updateSourceItemAssignees(event.sourceId, event.type, editedAssingees);
        }
        
        // Sync Calendar Doc
        await updateCalendarEventById(event.id, updatedEventData);
        alert('Event updated successfully!');
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"></div>
                <p className="text-sm font-bold text-text-primary animate-pulse">Loading event details...</p>
            </div>
        </div>
    );

    if (!event) return (
        <div className="flex h-screen items-center justify-center flex-col gap-4">
            <div className="w-16 h-16 rounded-full bg-glass-light/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            <p className="text-text-secondary font-medium">Event not found.</p>
            <button onClick={() => navigate('/calendar')} className="px-4 py-2 bg-primary text-background font-semibold rounded-lg hover:bg-primary-hover transition-all duration-200">
                Back to Calendar
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-text-primary p-6 md:p-12 font-sans selection:bg-primary/30">
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
                .animate-fade-in-up {
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
            `}</style>

            <div className="max-w-6xl mx-auto">
                {/* Header / Breadcrumbs - Matching Projects Page Style */}
                <div className="flex items-center gap-2 text-sm text-text-secondary mb-8 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                     <button onClick={() => navigate('/calendar')} className="hover:text-primary font-semibold transition-all duration-300 hover:scale-105">Calendar</button>
                     <span className="text-border-color">/</span>
                     {projectContext ? (
                         <>
                            <span className="hover:text-primary font-semibold transition-all duration-300 cursor-default">{projectContext.name}</span>
                            <span className="text-border-color">/</span>
                         </>
                     ) : null}
                     <span className="text-text-primary font-bold">Event Details</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Hero Section - Matching Projects Card Style */}
                        <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-8 relative overflow-hidden group hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.01] transition-all duration-500 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            {/* Subtle gradient overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="relative z-10">
                                <div className="flex gap-3 mb-4 flex-wrap">
                                     <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-glass-light/60 backdrop-blur-sm border border-border-color/50 shadow-sm hover:scale-105 transition-all duration-300">
                                        {event.type.replace('_', ' ')}
                                     </span>
                                     {projectContext && (
                                         <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/50 shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)] flex items-center gap-2 hover:scale-105 transition-all duration-300">
                                             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]"></div>
                                             {projectContext.name}
                                         </span>
                                     )}
                                </div>

                                <input
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    className="bg-transparent text-4xl font-bold text-text-primary w-full focus:outline-none border-b-2 border-transparent focus:border-primary/50 placeholder-text-secondary/30 transition-all duration-300 hover:text-primary pb-2"
                                    placeholder="Event Title"
                                />
                            </div>
                        </div>

                        {/* Date & Time Grid - Matching Projects Page Style */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            <div className="bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-xl p-6 hover:border-primary/40 hover:bg-glass-light/80 transition-all duration-300 hover:shadow-lg">
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                    Starts
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editedDates.startDate}
                                    onChange={(e) => setEditedDates({...editedDates, startDate: e.target.value})}
                                    className="w-full bg-transparent text-lg font-bold text-text-primary focus:outline-none focus:text-primary transition-colors duration-300"
                                />
                            </div>
                            <div className="bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-xl p-6 hover:border-primary/40 hover:bg-glass-light/80 transition-all duration-300 hover:shadow-lg">
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                    Ends
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editedDates.endDate}
                                    onChange={(e) => setEditedDates({...editedDates, endDate: e.target.value})}
                                    className="w-full bg-transparent text-lg font-bold text-text-primary focus:outline-none focus:text-primary transition-colors duration-300"
                                />
                            </div>
                        </div>

                        {/* Description */}
                         <div className="bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-xl p-6 min-h-[12rem] hover:border-primary/40 hover:bg-glass-light/80 transition-all duration-300 hover:shadow-lg animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                Description / Notes
                            </label>
                            <textarea
                                className="w-full h-full bg-transparent text-text-primary focus:outline-none resize-none placeholder-text-secondary/50 text-base leading-relaxed focus:placeholder-text-secondary/30 transition-all duration-300"
                                placeholder="Add detailed notes, agenda items, or context for this event..."
                                value={editedDescription}
                                onChange={e => setEditedDescription(e.target.value)}
                                rows={6}
                            ></textarea>
                         </div>
                    </div>

                    {/* Sidebar / Meta Column */}
                    <div className="space-y-6">

                        {/* Actions Card - Matching Projects Page Button Style */}
                        <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                Actions
                            </h3>
                            <button onClick={handleSave} className="w-full py-3 mb-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-105 transition-all duration-300 shadow-lg relative overflow-hidden group">
                                <span className="relative z-10">Save Changes</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </button>
                             {editedMeetLink && (
                                <a href={editedMeetLink} target="_blank" rel="noopener noreferrer" className="block w-full py-3 mb-3 text-center bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-[0_8px_30px_rgba(37,99,235,0.4)]">
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                                        Join Google Meet
                                    </span>
                                </a>
                            )}
                             <button onClick={() => navigate(-1)} className="w-full py-3 bg-glass-light/60 backdrop-blur-sm text-text-secondary font-semibold rounded-xl hover:bg-glass-light hover:text-text-primary border border-border-color hover:border-primary/30 transition-all duration-300">
                                Cancel
                            </button>
                        </div>

                        {/* Conferencing Input - Matching Form Style */}
                         <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-6 hover:border-primary/40 hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                                Google Meet
                            </label>
                            <input
                                type="url"
                                placeholder="https://meet.google.com/..."
                                value={editedMeetLink}
                                onChange={(e) => setEditedMeetLink(e.target.value)}
                                className="w-full bg-glass-light/60 backdrop-blur-sm border border-border-color/50 rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                             />
                        </div>

                        {/* Assignees Card - Matching Projects Member Display */}
                        <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-6 hover:border-primary/40 hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                             <div className="flex justify-between items-center mb-4">
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                                    Assignees
                                </label>
                                <span className="text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-lg font-bold border border-primary/50 shadow-sm">{editedAssingees.length}</span>
                             </div>

                             <div className="flex flex-col gap-2 mb-4">
                                 {editedAssingees.map(uid => {
                                     const u = data.users.find(user => user.id === uid);
                                     return (
                                         <div key={uid} className="flex items-center justify-between bg-glass-light/60 backdrop-blur-sm p-3 rounded-lg border border-border-color/50 group hover:border-primary/40 hover:bg-glass-light/80 transition-all duration-300 hover:shadow-md">
                                             <div className="flex items-center gap-3">
                                                 {u?.avatarUrl ? (
                                                     <img src={u.avatarUrl} alt={u.name} className="w-9 h-9 rounded-full border-2 border-surface shadow-md transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                                                 ) : (
                                                     <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-bold text-primary border-2 border-primary/20 shadow-md">
                                                         {(u?.name || '?').charAt(0).toUpperCase()}
                                                     </div>
                                                 )}
                                                 <div>
                                                     <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors duration-300">{u?.name || 'Unknown'}</p>
                                                     <p className="text-[10px] text-text-secondary font-medium">{u?.role || 'Member'}</p>
                                                 </div>
                                             </div>
                                             <button onClick={() => setEditedAssignees(prev => prev.filter(id => id !== uid))} className="text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300 p-1 hover:scale-125 font-bold text-lg">
                                                 ×
                                             </button>
                                         </div>
                                     );
                                 })}
                                 {editedAssingees.length === 0 && (
                                     <div className="text-center py-6 text-text-secondary text-sm font-medium bg-glass-light/30 rounded-lg border border-border-color/30">
                                         No assignees yet
                                     </div>
                                 )}
                             </div>

                             <div className="relative">
                                 <select
                                     onChange={(e) => {
                                         if(e.target.value && !editedAssingees.includes(e.target.value)) setEditedAssignees([...editedAssingees, e.target.value]);
                                         e.target.value = '';
                                     }}
                                      className="w-full appearance-none bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm py-2.5 px-4 rounded-lg cursor-pointer transition-all duration-300 text-center focus:outline-none border border-primary/30 hover:border-primary/50 hover:shadow-md"
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
