import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useData } from '../contexts/DataContext';
import { useCalendar } from '../contexts/CalendarContext';
import { CalendarEvent } from '../types';
import { createCalendarEvent, updateSourceItemDate, updateCalendarEventById, updateSourceItemAssignees } from '../utils/calendarSync';
import { toast } from 'sonner';
// import { projects, tasks, boards, roadmapItems } from '../data/mockData';
// import { invoices, clients } from '../data/paymentsData';

// --- Type Definitions ---
type CalendarView = 'day' | 'week' | 'month' | '3-month' | '6-month';
const eventTypes: CalendarEvent['type'][] = ['task', 'invoice', 'estimate', 'roadmap_item', 'manual', 'comment'];

interface LaidOutEvent extends CalendarEvent {
    startCol: number;
    span: number;
    track: number;
}

// String-based helper to avoid timezone matching issues
const toDateKey = (date: Date | string): string => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '1970-01-01';
    // IMPORANT: Use local time, do NOT use toISOString() which shifts to UTC
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const startOfDay = (date: Date | string | number | any): Date => {
    if (!date) return new Date(0);
    // Handle Firestore Timestamp objects directly if they slip through
    let d: Date;
    if (date.seconds !== undefined) d = new Date(date.seconds * 1000);
    else if (date.toDate && typeof date.toDate === 'function') d = date.toDate();
    else d = new Date(date);
    
    if (isNaN(d.getTime())) return new Date(0);
    const result = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    result.setHours(0, 0, 0, 0);
    return result;
};

const addDays = (date: Date, days: number): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
};

const areDatesSame = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();

const startOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const result = new Date(d.getFullYear(), d.getMonth(), diff);
    result.setHours(0, 0, 0, 0);
    return result;
};


const getSortableTime = (dateStr: string | undefined): number => {
    if (!dateStr) return 0;
    const time = new Date(dateStr).getTime();
    return isNaN(time) ? 0 : time;
};

export const CalendarPage = () => {
    // Get current user from context
    const { user, data } = useData();
    const currentUserId = user?.uid || 'user-1';

    // Use the hook instead of local state
    const { 
        events, 
        loading, 
        projects, 
        boards, 
        tasks, 
        roadmapItems, 
        invoices, 
        brands, 
        clients, 
        feedbackComments 
    } = useCalendarEvents(currentUserId);

    // UI State
    const [searchParams] = useSearchParams();
    const brandId = searchParams.get('brandId');
    const brand = brandId ? (brands || []).find((b: any) => b.id === brandId) : null;

    // Use calendar context for shared state
    const { currentDate, setCurrentDate, view, setView, setHeaderTitle, setIsCalendarPage } = useCalendar();
    const [moreEventsInfo, setMoreEventsInfo] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    
    const [editedDates, setEditedDates] = useState({ startDate: '', endDate: '' });
     const [editedAssingees, setEditedAssignees] = useState<string[]>([]);
    const [editedMeetLink, setEditedMeetLink] = useState('');

    const [newEventData, setNewEventData] = useState({
        title: '',
        startDate: '',
        endDate: '',
        brandId: '',
        projectId: '',
        taskId: '',
        reminder: 'none',
        meetLink: '',
        assignees: [] as string[]
    });
    const [filters, setFilters] = useState<Record<CalendarEvent['type'], boolean>>({
        task: true, invoice: true, estimate: true, roadmap_item: true, manual: true, comment: true,
    });

    // Set calendar page flag when component mounts
    useEffect(() => {
        setIsCalendarPage(true);
        return () => setIsCalendarPage(false);
    }, [setIsCalendarPage]);

    useEffect(() => {
        if (selectedEvent) {
            setEditedDates({
                startDate: new Date(new Date(selectedEvent.startDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                endDate: new Date(new Date(selectedEvent.endDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            });
             setEditedAssignees(selectedEvent.assignees || []);
            setEditedMeetLink(selectedEvent.meetLink || '');
            setIsSidePanelOpen(true);
        } else {
             setIsSidePanelOpen(false);
        }
    }, [selectedEvent]);

     const handleCloseSidePanel = () => {
        setIsSidePanelOpen(false);
        setTimeout(() => setSelectedEvent(null), 300); // Wait for animation
    };


    const eventColors: Record<CalendarEvent['type'], { bg: string; text: string; border: string; dot: string; }> = {
        task: { bg: 'bg-green-700/15', text: 'text-green-400', border: 'border-green-700/50', dot: 'bg-green-700' },
        invoice: { bg: 'bg-primary/15', text: 'text-primary', border: 'border-primary/50', dot: 'bg-primary' },
        estimate: { bg: 'bg-lime-600/15', text: 'text-lime-300', border: 'border-lime-600/50', dot: 'bg-lime-600' },
        roadmap_item: { bg: 'bg-emerald-600/15', text: 'text-emerald-300', border: 'border-emerald-600/50', dot: 'bg-emerald-600' },
        comment: { bg: 'bg-green-600/15', text: 'text-green-300', border: 'border-green-600/50', dot: 'bg-green-600' },
        manual: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/50', dot: 'bg-slate-400' },
    };
    
    // --- Event Handlers & Callbacks ---
    const handleFilterToggle = useCallback((type: CalendarEvent['type']) => {
        setFilters(prev => ({ ...prev, [type]: !prev[type] }));
    }, []);

    const handleAdvancedCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEventData.title.trim() || !newEventData.startDate || !newEventData.endDate) {
            toast.error('Please fill in title, start date, and end date');
            return;
        }
        const newEventPayload: Omit<CalendarEvent, 'id' | 'type' | 'sourceId' | 'userId'> & { type: 'manual', sourceId: null, userId: string } = {
            title: newEventData.title,
            startDate: new Date(newEventData.startDate).toISOString(),
            endDate: new Date(newEventData.endDate).toISOString(),
            type: 'manual',
            sourceId: null,
            userId: currentUserId,
            brandId: newEventData.brandId || undefined,
            projectId: newEventData.projectId || undefined,
            taskId: newEventData.taskId || undefined,
            reminder: newEventData.reminder !== 'none' ? newEventData.reminder : undefined,
            meetLink: newEventData.meetLink || undefined, 
        };

        await createCalendarEvent(newEventPayload, 'manual');
        toast.success(`Event '${newEventData.title}' created successfully`);
        setIsCreateModalOpen(false);
        setNewEventData({ title: '', startDate: '', endDate: '', brandId: '', projectId: '', taskId: '', reminder: 'none', meetLink: '', assignees: [] });
    };
    
    const handleEventUpdate = useCallback(async () => {
        if (!selectedEvent) return;
    
        const updatedEventData = {
            ...selectedEvent,
            startDate: new Date(editedDates.startDate).toISOString(),
            endDate: new Date(editedDates.endDate).toISOString(),
             assignees: editedAssingees,
            meetLink: editedMeetLink
        };
    
        if (selectedEvent.sourceId) {
            await updateSourceItemDate(selectedEvent.sourceId, selectedEvent.type, {
                startDate: updatedEventData.startDate,
                endDate: updatedEventData.endDate,
            });
             await updateSourceItemAssignees(selectedEvent.sourceId, selectedEvent.type, editedAssingees);
        }

        await updateCalendarEventById(selectedEvent.id, updatedEventData);
        toast.success('Event updated successfully');
         handleCloseSidePanel();
    }, [selectedEvent, editedDates, editedAssingees, editedMeetLink]);

    // --- Memoized Data & Calculations (TOP LEVEL) ---
    // --- Memoized Data & Calculations (TOP LEVEL) ---
     const getProjectName = (event: CalendarEvent) => {
        if (event.projectId) {
            const p = projects.find(proj => proj.id === event.projectId);
            // If project ID is valid but not found in mock data, it might be a sync issue or just missing mock data.
            // Return empty if not found so we don't spam "Unknown Project".
            return p ? p.name : ''; 
        }
        if (event.sourceId) {
            if (event.type === 'task') {
                 const task = tasks.find(t => t.id === event.sourceId);
                 const board = task ? boards.find(b => b.id === task.boardId) : undefined;
                 const project = board ? projects.find(p => p.id === board.projectId) : undefined;
                 return project ? project.name : '';
            }
            if (event.type === 'roadmap_item') {
                 const item = roadmapItems.find(i => i.id === event.sourceId);
                 const project = item ? projects.find(p => p.id === item.projectId) : undefined;
                 return project ? project.name : '';
            }
        }
        return '';
    };

    const availableTasks = useMemo(() => {
        if (!newEventData.projectId) return [];
        const projectBoards = boards.filter(b => b.projectId === newEventData.projectId).map(b => b.id);
        return tasks.filter(t => projectBoards.includes(t.boardId));
    }, [newEventData.projectId, boards, tasks]);

    const filteredEvents = useMemo(() => {
        let eventsToFilter = events.filter(event => filters[event.type]);
        
        if (brandId) {
            const getBrandForEvent = (event: CalendarEvent): string | undefined => {
                if (event.brandId) return event.brandId;
                if (event.projectId) {
                    const p = projects.find(proj => proj.id === event.projectId);
                    if (p) return p.brandId;
                }
                if (event.sourceId) {
                    switch (event.type) {
                        case 'task': {
                            const task = tasks.find(t => t.id === event.sourceId);
                            const bId = task?.boardId;
                            const board = boards.find(b => b.id === bId);
                            const project = projects.find(p => p.id === board?.projectId);
                            return project?.brandId;
                        }
                        case 'roadmap_item': {
                            const item = roadmapItems.find(i => i.id === event.sourceId);
                            const project = projects.find(p => p.id === item?.projectId);
                            return project?.brandId;
                        }
                        case 'invoice': {
                            const invoice = invoices.find(i => i.id === event.sourceId);
                            if (!invoice) return undefined;
                            // Ensure we check for brandId in invoices (some might have it directly)
                            if (invoice.brandId) return invoice.brandId;
                            const client = clients.find(c => c.id === invoice.clientId);
                            return client?.brandId;
                        }
                        case 'comment': {
                            if (event.projectId) {
                                const p = projects.find(proj => proj.id === event.projectId);
                                if (p) return p.brandId;
                            }
                            return undefined;
                        }
                        default:
                            return undefined;
                    }
                }
                return undefined;
            };
            eventsToFilter = eventsToFilter.filter(event => {
                const b = getBrandForEvent(event);
                if (!b) return true; // Show events with NO brand so they aren't lost
                return b === brandId;
            });
        }

        return eventsToFilter;
    }, [events, filters, brandId, projects, boards, tasks, roadmapItems, invoices, clients]);

    const headerTitle = useMemo(() => {
        const options = { month: 'short', day: 'numeric', year: 'numeric' } as const;
        let title = '';
        switch (view) {
            case 'day': title = currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); break;
            case 'week':
                const weekStart = startOfWeek(new Date(currentDate));
                const weekEnd = addDays(new Date(weekStart), 6);
                 const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                 if (weekStart.getFullYear() !== weekEnd.getFullYear()) {
                     title = `${startStr}, ${weekStart.getFullYear()} - ${weekEnd.toLocaleDateString('en-US', options)}`;
                 } else if (weekStart.getMonth() !== weekEnd.getMonth()) {
                     title = `${startStr} - ${weekEnd.toLocaleDateString('en-US', options)}`;
                 } else {
                     title = `${startStr} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
                 }
                 break;
            default: title = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        }
        setHeaderTitle(title);
        return title;
    }, [currentDate, view, setHeaderTitle]);
    
    const layOutEventsForWeek = useCallback((weekStart: Date, weekEnd: Date) => {
        const weekStartKey = toDateKey(weekStart);
        const weekEndKey = toDateKey(weekEnd);

        const eventsInWeek = filteredEvents.filter(event => {
            if (!event.startDate || !event.endDate) return false;
            // String comparison is safer
            const eventStartKey = toDateKey(event.startDate);
            const eventEndKey = toDateKey(event.endDate);
            
            return eventStartKey <= weekEndKey && eventEndKey >= weekStartKey;
        }).sort((a, b) => {
            return (new Date(a.startDate).getTime() || 0) - (new Date(b.startDate).getTime() || 0);
        });

        const laidOutEvents: LaidOutEvent[] = [];
        const tracks: (Date | null)[][] = Array.from({ length: 15 }, () => Array(7).fill(null));

        eventsInWeek.forEach(event => {
            const eventStart = startOfDay(event.startDate);
            // ... (rest of layout logic)
            const eventEnd = startOfDay(event.endDate);
            const startDayIndex = Math.max(0, Math.floor((eventStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)));
            const endDayIndex = Math.min(6, Math.floor((eventEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)));
            
            let trackIndex = 0;
            while (true) {
                let available = true;
                for (let i = startDayIndex; i <= endDayIndex; i++) {
                    if (tracks[trackIndex] && tracks[trackIndex][i]) {
                        available = false;
                        break;
                    }
                }
                if (available) break;
                trackIndex++;
            }

            for (let i = startDayIndex; i <= endDayIndex; i++) {
                if (!tracks[trackIndex]) tracks[trackIndex] = Array(7).fill(null);
                tracks[trackIndex][i] = eventStart;
            }
            
            const startCol = eventStart < weekStart ? 0 : eventStart.getDay();
            const span = endDayIndex - startDayIndex + 1;

            laidOutEvents.push({ ...event, startCol, span, track: trackIndex });
        });
        return laidOutEvents;
    }, [filteredEvents]);


    const monthData = useMemo(() => {
        if (view !== 'month') return [];
        const startOfActiveMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const gridStartDate = startOfWeek(startOfActiveMonth);

        return Array.from({ length: 6 }, (_, weekIndex) => {
            const weekStart = addDays(gridStartDate, weekIndex * 7);
            const weekEnd = addDays(weekStart, 6);
            weekEnd.setHours(23, 59, 59, 999);
            const days = Array.from({ length: 7 }, (_, dayIndex) => {
                const d = addDays(weekStart, dayIndex);
                d.setHours(0, 0, 0, 0);
                return d;
            });
            const laidOutEvents = layOutEventsForWeek(weekStart, weekEnd);
            return { days, laidOutEvents };
        });
    }, [currentDate, view, layOutEventsForWeek]);

    const weekData = useMemo(() => {
        if (view !== 'week') return { days: [], allDayEvents: [], timedEvents: [] };
        const weekStart = startOfWeek(new Date(currentDate));
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const weekEnd = days[6];

        const eventsInWeek = filteredEvents.filter(e => 
            e.startDate && e.endDate && 
            startOfDay(e.startDate) <= weekEnd && 
            startOfDay(e.endDate) >= weekStart
        );

        // Separate Roadmap and Timed Events
        const allDayEventsRaw = eventsInWeek.filter(e => e.type === 'roadmap_item');
        const timedEvents = eventsInWeek.filter(e => e.type !== 'roadmap_item');

        // Layout All-Day Events (Roadmaps) for the Header
        const allDayLaidOut: LaidOutEvent[] = [];
        const tracks: (Date | null)[][] = Array.from({ length: 10 }, () => Array(7).fill(null));

        allDayEventsRaw.sort((a, b) => {
            const startA = getSortableTime(a.startDate);
            const durationA = getSortableTime(a.endDate) - startA;
            const startB = getSortableTime(b.startDate);
            const durationB = getSortableTime(b.endDate) - startB;
            if (durationA !== durationB) return durationB - durationA;
            return startA - startB;
        }).forEach(event => {
            const eventStart = startOfDay(event.startDate);
            const eventEnd = startOfDay(event.endDate);
            const startDayIndex = Math.max(0, Math.floor((eventStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)));
            const endDayIndex = Math.min(6, Math.floor((eventEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)));
            
            let trackIndex = 0;
            while (true) {
                let available = true;
                for (let i = startDayIndex; i <= endDayIndex; i++) {
                    if (tracks[trackIndex] && tracks[trackIndex][i]) {
                        available = false;
                        break;
                    }
                }
                if (available) break;
                trackIndex++;
            }

            for (let i = startDayIndex; i <= endDayIndex; i++) {
                if (!tracks[trackIndex]) tracks[trackIndex] = Array(7).fill(null);
                tracks[trackIndex][i] = eventStart;
            }
            
            const startCol = startDayIndex;
            const span = endDayIndex - startDayIndex + 1;
            allDayLaidOut.push({ ...event, startCol, span, track: trackIndex });
        });

        return { days, allDayEvents: allDayLaidOut, timedEvents };
    }, [currentDate, filteredEvents, view]);

    // OLD Day Events Logic replaced by new renderDayView but kept variable if needed? No, removing.


    const multiMonthData = useMemo(() => {
        if (view !== '3-month' && view !== '6-month') return [];
        const numMonths = view === '3-month' ? 3 : 6;
        return Array.from({ length: numMonths }, (_, i) => {
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
            const gridStartDate = startOfWeek(startOfMonth);
            const days = Array.from({length: 42}, (_, i) => {
                const d = addDays(gridStartDate, i);
                d.setHours(0, 0, 0, 0);
                return d;
            });
            
            const eventsByDay: Record<string, CalendarEvent['type'][]> = {};
            filteredEvents.forEach(e => {
                if (!e.startDate || !e.endDate) return;
                let d = startOfDay(e.startDate);
                const endD = startOfDay(e.endDate);
                
                // Safety: Avoid infinite loop if dates are invalid
                if (isNaN(d.getTime()) || isNaN(endD.getTime())) return;
                
                
                // Limit range to reasonable duration
                let count = 0;
                // Safety: Limit loop to avoid infinite cycles, allow up to 2 years span
                while(d.getTime() <= endD.getTime() && count < 730) {
                    const key = d.toDateString();
                    if (!eventsByDay[key]) eventsByDay[key] = [];
                    if (!eventsByDay[key].includes(e.type)) {
                        eventsByDay[key].push(e.type);
                    }
                    d = addDays(d, 1);
                    // Ensure we stick to midnight to match the grid
                    d.setHours(0, 0, 0, 0); 
                    count++;
                }
            });

            return { monthDate, days, eventsByDay };
        });
    }, [currentDate, filteredEvents, view]);


    // --- Render Functions ---
    const formatEventDateRange = (startDateStr?: string, endDateStr?: string) => {
        if (!startDateStr) return 'N/A';
        
        const startDate = new Date(startDateStr);
        const options: Intl.DateTimeFormatOptions = { month: 'numeric', day: 'numeric', year: 'numeric' };
        const formattedStartDate = startDate.toLocaleDateString(undefined, options);
        
        if (!endDateStr) {
            return formattedStartDate;
        }
        
        const endDate = new Date(endDateStr);
        if (areDatesSame(startDate, endDate)) {
            return formattedStartDate;
        }
    
        const formattedEndDate = endDate.toLocaleDateString(undefined, options);
        return `${formattedStartDate} - ${formattedEndDate}`;
    };
    
    const getSourceLink = (event: CalendarEvent) => {
        if (event.id.startsWith('comment-') || event.feedbackItemId) {
            const itemId = event.feedbackItemId;
            let type = 'mockup';
            if (itemId) {
                // Dynamically detect type if possible
                if (data.feedbackWebsites.some(w => w.id === itemId)) type = 'website';
                else if (data.feedbackVideos.some(v => v.id === itemId)) type = 'video';
            }
            if (event.projectId) {
                return { text: 'View Feedback Item', to: `/feedback/${event.projectId}/${type}/${itemId}` };
            }
        }

        if (!event.sourceId) return null;
        switch (event.type) {
            case 'task':
                const task = tasks.find(t => t.id === event.sourceId);
                if (task) {
                    const board = boards.find(b => b.id === task.boardId);
                    if (board) {
                        return { text: 'View Task on Board', to: `/board/${board.id}` };
                    }
                }
                return null;
            case 'roadmap_item':
                if (event.projectId) {
                     return { text: 'View on Roadmap', to: `/projects/${event.projectId}/roadmap` };
                }
                const item = roadmapItems.find(i => i.id === event.sourceId);
                if (item) {
                     return { text: 'View on Roadmap', to: `/projects/${item.projectId}/roadmap` };
                }
                return null;
            case 'invoice':
                return { text: 'View Invoice', to: `/payments` };
            case 'estimate':
                return { text: 'View Estimate', to: `/payments` };
            default:
                return null;
        }
    };

    const renderMonthView = () => {
        const MAX_VISIBLE_TRACKS = 3;
        return (
            <div className="flex-1 flex flex-col bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-500">
                <div className="flex-1 overflow-auto">
                    <div className="min-w-[42rem] flex flex-col h-full">
                        <div className="grid grid-cols-7 sticky top-0 bg-glass-light/80 backdrop-blur-sm z-10 shadow-md">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center py-3 text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-r border-border-color/50 last:border-r-0">{d}</div>)}
                        </div>
                        <div className="flex-1 grid grid-rows-6">
                            {monthData.map(({ days, laidOutEvents }, weekIndex) => (
                                <div key={weekIndex} className="relative grid grid-cols-7 border-b border-border-color/30 last:border-b-0 min-h-[7rem] group">
                                    {days.map(day => {
                                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                                        const eventsOnThisDay = laidOutEvents.filter(e => {
                                            if (!e.startDate || !e.endDate) return false;
                                            const eventStart = startOfDay(e.startDate);
                                            const eventEnd = startOfDay(e.endDate);
                                            return day >= eventStart && day <= eventEnd;
                                        });
                                        const hiddenEventsCount = Math.max(0, eventsOnThisDay.length - MAX_VISIBLE_TRACKS);
                                        return (
                                            <div
                                                key={day.toISOString()}
                                                onClick={() => { setCurrentDate(day); setView('day'); }}
                                                className={`border-r border-border-color/30 p-2 last:border-r-0 h-full flex flex-col gap-1 transition-all duration-300 ${isCurrentMonth ? 'cursor-pointer hover:bg-glass-light/60 hover:shadow-inner' : 'bg-glass/10 text-text-secondary opacity-50'}`}
                                            >
                                                <span className={`text-xs font-bold self-end transition-all duration-300 ${areDatesSame(new Date(), day) ? 'bg-primary text-background rounded-full h-6 w-6 flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] scale-110' : ''}`}>{day.getDate()}</span>
                                                <div className="flex-1"></div>
                                                {hiddenEventsCount > 0 && (
                                                    <button onClick={(e) => { e.stopPropagation(); setMoreEventsInfo({ date: day, events: eventsOnThisDay }); }} className="text-[11px] text-text-secondary hover:text-primary font-semibold hover:underline text-left mt-auto transition-colors duration-200">
                                                        + {hiddenEventsCount} more
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                                        {laidOutEvents
                                            .filter(event => event.track < MAX_VISIBLE_TRACKS)
                                            .map(event => {
                                                const colors = eventColors[event.type];
                                                return (
                                                    <div
                                                        key={event.id}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                                        className={`absolute rounded-lg p-1 pointer-events-auto cursor-pointer border ${colors.bg} ${colors.text} ${colors.border} flex items-center shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 backdrop-blur-sm`}
                                                        style={{
                                                            top: `calc(2rem + ${event.track * 1.5}rem)`,
                                                            left: `calc(${(event.startCol / 7) * 100}% + 3px)`,
                                                            width: `calc(${(event.span / 7) * 100}% - 6px)`,
                                                            height: '1.4rem',
                                                        }}
                                                    >
                                                        <p className="text-[11px] font-semibold px-1 leading-tight truncate">
                                                            {event.title}
                                                        </p>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const START_HOUR = 6;
        const END_HOUR = 21;
        const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);
        const { days, allDayEvents, timedEvents } = weekData;

        const getEventStyle = (event: CalendarEvent, dayStart: Date) => {
            if (!event.startDate) return { top: '0px', height: '0px', display: 'none' };
            const s = new Date(event.startDate);
            const e = new Date(event.endDate);
            const gridStart = startOfDay(dayStart);
            
            const startMinutes = (s.getTime() - gridStart.getTime()) / 60000;
            const endMinutes = (e.getTime() - gridStart.getTime()) / 60000;
            const viewStartMinutes = START_HOUR * 60;
            const viewEndMinutes = (END_HOUR + 1) * 60;
            
            if (endMinutes <= viewStartMinutes || startMinutes >= viewEndMinutes) {
                return { display: 'none' };
            }

            const clampedStart = Math.max(viewStartMinutes, startMinutes);
            const clampedEnd = Math.min(viewEndMinutes, endMinutes);
            const top = clampedStart - viewStartMinutes;
            const height = Math.max(20, clampedEnd - clampedStart);

            return { top: `${top}px`, height: `${height}px` };
        };

        const totalHeight = (END_HOUR - START_HOUR + 1) * 60;

        return (
            <div className="flex-1 flex flex-col bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-500">
                <div className="bg-glass-light/80 backdrop-blur-sm border-b border-border-color/50 sticky top-0 z-30">
                    <div className="flex">
                        <div className="w-16 flex-shrink-0 border-r border-border-color/50"></div>
                        <div className="flex-1 grid grid-cols-7">
                            {days.map(day => (
                                <div key={day.toISOString()} onClick={() => { setCurrentDate(day); setView('day'); }} className="p-4 text-center border-r border-border-color/30 last:border-r-0 cursor-pointer hover:bg-glass-light/60 transition-all duration-300 group">
                                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider group-hover:text-primary transition-colors duration-300">{day.toLocaleDateString('default', { weekday: 'short' })}</p>
                                    <p className={`text-xl font-bold mt-1 transition-all duration-300 ${areDatesSame(new Date(), day) ? 'text-primary scale-110' : 'text-text-primary group-hover:text-primary'}`}>{day.getDate()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    {allDayEvents.length > 0 && (
                        <div className="flex border-t border-border-color/30">
                            <div className="w-16 flex-shrink-0 border-r border-border-color/50 flex items-center justify-center bg-glass-light/40">
                                <span className="text-[10px] font-bold text-text-secondary uppercase vertical-text">Roadmap</span>
                            </div>
                            <div className="flex-1 relative p-2" style={{ minHeight: `${Math.max(1, Math.max(...allDayEvents.map(e => e.track)) + 1) * 26 + 8}px` }}>
                                {allDayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => setSelectedEvent(event)}
                                        className={`absolute rounded-lg px-2 py-0.5 text-xs font-bold cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 truncate border-l-4 border border-r border-t border-b shadow-md backdrop-blur-sm ${eventColors[event.type].bg} ${eventColors[event.type].border} ${eventColors[event.type].text}`}
                                        style={{
                                            top: `${event.track * 26 + 4}px`,
                                            left: `calc(${(event.startCol / 7) * 100}% + 3px)`,
                                            width: `calc(${(event.span / 7) * 100}% - 6px)`,
                                            height: '22px'
                                        }}
                                    >
                                        {event.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="flex relative" style={{ height: `${totalHeight}px` }}>
                        <div className="w-16 flex-shrink-0 bg-glass-light/60 backdrop-blur-sm border-r border-border-color/50 sticky left-0 z-20">
                            {hours.map(h => (
                                <div key={h} className="h-[60px] text-right pr-4 text-[10px] font-bold text-text-secondary pt-1">
                                    {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 grid grid-cols-7 relative">
                            {days.map(day => (
                                <div key={day.toISOString()} className="h-full border-r border-border-color/30 last:border-r-0 relative">
                                    {hours.map(h => (
                                        <div key={h} className="h-[60px] border-b border-border-color/20 last:border-b-0 hover:bg-glass-light/20 transition-colors duration-200"></div>
                                    ))}
                                    {timedEvents.filter(e => {
                                        const s = new Date(e.startDate);
                                        const end = new Date(e.endDate);
                                        const dStart = startOfDay(day);
                                        const dEnd = addDays(dStart, 1);
                                        return s < dEnd && end >= dStart;
                                    }).map(event => (
                                        <div
                                            key={event.id}
                                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                            className={`absolute left-0 right-1 rounded-lg border-l-4 border border-r border-t border-b px-2 py-1 text-xs cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300 z-10 overflow-hidden shadow-lg backdrop-blur-sm ${eventColors[event.type].bg} ${eventColors[event.type].border}`}
                                            style={getEventStyle(event, day)}
                                        >
                                            <div className="font-bold text-text-primary leading-tight truncate">{event.title}</div>
                                            <div className="text-[10px] text-text-secondary opacity-90 font-medium">
                                                {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    ))}
                                    {areDatesSame(day, new Date()) && new Date().getHours() >= START_HOUR && new Date().getHours() <= END_HOUR && (
                                        <div
                                            className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                            style={{ top: `${((new Date().getHours() - START_HOUR) * 60) + new Date().getMinutes()}px` }}
                                        >
                                            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-lg animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const START_HOUR = 6;
        const END_HOUR = 21;
        const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);
        const dayStart = startOfDay(currentDate);
        const dayEnd = addDays(dayStart, 1);

        // Split roadmap vs timed
        const dayRoadmaps = filteredEvents.filter(e => {
            if (e.type !== 'roadmap_item' || !e.startDate || !e.endDate) return false;
            return Math.max(new Date(e.startDate).getTime(), dayStart.getTime()) < Math.min(new Date(e.endDate).getTime(), dayEnd.getTime());
        });

        const dayTimedEvents = filteredEvents.filter(e => {
            if (e.type === 'roadmap_item' || !e.startDate || !e.endDate) return false;
            const s = new Date(e.startDate);
            const end = new Date(e.endDate);
            return s < dayEnd && end > dayStart;
        });

        const getEventStyle = (event: CalendarEvent) => {
            const s = new Date(event.startDate);
            const end = new Date(event.endDate);

            // Minutes relative to the day grid start (midnight)
            const startMinutes = (s.getTime() - dayStart.getTime()) / 60000;
            const endMinutes = (end.getTime() - dayStart.getTime()) / 60000;

            // Restricted range
            const viewStartMinutes = START_HOUR * 60;
            const viewEndMinutes = (END_HOUR + 1) * 60;

            if (endMinutes <= viewStartMinutes || startMinutes >= viewEndMinutes) {
                return { display: 'none' };
            }

            const clampedStart = Math.max(viewStartMinutes, startMinutes);
            const clampedEnd = Math.min(viewEndMinutes, endMinutes);

            return {
                top: `${clampedStart - viewStartMinutes}px`,
                height: `${Math.max(20, clampedEnd - clampedStart)}px`,
            };
        };

        const totalHeight = (END_HOUR - START_HOUR + 1) * 60;

        return (
             <div className="flex-1 flex flex-col bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-500">
                {/* Day Header with Date */}
                <div className="bg-glass-light/80 backdrop-blur-sm border-b border-border-color/50 sticky top-0 z-30">
                    <div className="flex">
                        <div className="w-16 flex-shrink-0 border-r border-border-color/50"></div>
                        <div className="flex-1 p-4 text-center">
                            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{currentDate.toLocaleDateString('default', { weekday: 'long' })}</p>
                            <p className={`text-2xl font-bold mt-1 transition-all duration-300 ${areDatesSame(new Date(), currentDate) ? 'text-primary scale-110' : 'text-text-primary'}`}>{currentDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* Roadmap Section - Always visible like week view */}
                    {dayRoadmaps.length > 0 && (
                        <div className="flex border-t border-border-color/30">
                            <div className="w-16 flex-shrink-0 border-r border-border-color/50 flex items-center justify-center bg-glass-light/40">
                                <span className="text-[10px] font-bold text-text-secondary uppercase vertical-text">Roadmap</span>
                            </div>
                            <div className="flex-1 p-3 flex flex-col gap-2">
                                {dayRoadmaps.map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => setSelectedEvent(event)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer border-l-4 border border-r border-t border-b shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 truncate backdrop-blur-sm ${eventColors[event.type].bg} ${eventColors[event.type].border} ${eventColors[event.type].text}`}
                                    >
                                        {event.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="relative" style={{ height: `${totalHeight}px`, paddingTop: '20px' }}>
                        {hours.map(h => (
                            <div key={h} className="absolute w-full border-t border-border-color/20 flex hover:bg-glass-light/10 transition-colors duration-200" style={{ top: `${(h - START_HOUR) * 60 + 20}px`, height: '60px' }}>
                                <span className="w-16 text-right pr-4 text-[10px] font-bold text-text-secondary -mt-2 bg-background z-10">{h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}</span>
                                <div className="flex-1 border-l border-border-color/30 h-full"></div>
                            </div>
                        ))}

                        {/* Events */}
                        <div className="absolute top-0 right-0 left-16 bottom-0" style={{ paddingTop: '20px' }}>
                             {dayTimedEvents.map(event => {
                                 const style = getEventStyle(event);
                                 const adjustedTop = style.top ? `calc(${style.top} + 20px)` : '20px';
                                 return (
                                    <div
                                        key={event.id}
                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                        className={`absolute rounded-lg border-l-4 border border-r border-t border-b px-3 py-2 text-xs cursor-pointer hover:z-20 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden shadow-lg backdrop-blur-sm ${eventColors[event.type].bg} ${eventColors[event.type].border}`}
                                        style={{ ...style, top: adjustedTop, width: '90%' }}
                                    >
                                        <div className="font-bold text-text-primary text-sm leading-tight truncate">{event.title}</div>
                                        <div className="text-text-secondary flex gap-2 mt-1 font-medium">
                                             <span>{new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                             {getProjectName(event) && <span className="opacity-75">• {getProjectName(event)}</span>}
                                        </div>
                                    </div>
                                 );
                             })}
                        </div>

                        {/* Current Time Line */}
                        {areDatesSame(currentDate, new Date()) && new Date().getHours() >= START_HOUR && new Date().getHours() <= END_HOUR && (
                             <div
                                className="absolute left-16 right-0 border-t-2 border-red-500 z-20 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                style={{ top: `${((new Date().getHours() - START_HOUR) * 60) + new Date().getMinutes() + 20}px` }}
                             >
                                <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-lg animate-pulse"></div>
                             </div>
                        )}
                    </div>
                </div>
             </div>
        );
    };

    const renderMultiMonthView = () => {
        const numMonths = view === '3-month' ? 3 : 6;
        return (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className={`grid grid-cols-1 ${numMonths > 1 ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-6 pb-8`}>
                    {multiMonthData.map(({ monthDate, days, eventsByDay }) => (
                        <div key={monthDate.toISOString()} className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color shadow-lg hover:shadow-xl transition-all duration-500 h-fit hover:scale-105">
                            <h3 className="text-center font-bold text-text-primary mb-4 text-lg tracking-tight">
                                {monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h3>
                            <div className="grid grid-cols-7 text-center text-[10px] font-black text-text-secondary mb-3 opacity-70 uppercase tracking-wider">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 text-center text-sm gap-y-1">
                                {days.map(day => {
                                    const isCurrentMonth = day.getMonth() === monthDate.getMonth();
                                    const dayKey = day.toDateString();
                                    const dayEventTypes = eventsByDay[dayKey] || [];
                                    const isToday = areDatesSame(new Date(), day);

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            onClick={() => { setCurrentDate(day); setView('day'); }}
                                            className={`aspect-square flex flex-col items-center justify-center rounded-xl relative transition-all duration-300 group ${isCurrentMonth ? 'cursor-pointer hover:bg-glass-light/60 hover:shadow-md' : 'opacity-20 pointer-events-none'}`}
                                        >
                                            <span className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg transition-all duration-300 ${isToday ? 'bg-primary text-background shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] scale-110' : 'text-text-primary group-hover:text-primary group-hover:scale-110'}`}>
                                                {day.getDate()}
                                            </span>
                                            
                                            {dayEventTypes.length > 0 ? (
                                                <div className="absolute bottom-1.5 left-0 right-0 flex flex-wrap justify-center gap-1 px-1">
                                                    {dayEventTypes.slice(0, 4).map((type, idx) => (
                                                        <div key={idx} className={`w-2 h-2 rounded-full shadow-md ring-2 ring-white/20 ${eventColors[type]?.dot || 'bg-text-secondary'}`}></div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="absolute bottom-1.5 w-full flex justify-center opacity-10">
                                                    <div className="w-1 h-1 rounded-full bg-text-secondary"></div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const FormInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
        <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
            <input {...props} className="appearance-none block w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
        </div>
    );

    const FormSelect = ({ label, children, ...props }: { label: string, children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
        <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
            <select {...props} className="appearance-none block w-full px-3 py-2 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                {children}
            </select>
        </div>
    );

    // --- Main component return ---
     return (
        <div className="h-full flex flex-row overflow-hidden relative">
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
            `}</style>

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300" style={{ marginRight: isSidePanelOpen ? '0' : '0' }}>
                {/* Filter Section */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 animate-fade-in">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                            Filter Events:
                        </div>
                        {eventTypes.map(type => (
                            <button
                                key={type}
                                onClick={() => handleFilterToggle(type)}
                                className={`px-3 py-2 text-xs font-semibold rounded-lg border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                                    filters[type]
                                        ? `${eventColors[type].bg} ${eventColors[type].text} ${eventColors[type].border} shadow-md hover:shadow-lg`
                                        : 'bg-glass/40 text-text-secondary border-border-color hover:bg-glass-light/60 opacity-50'
                                }`}
                            >
                                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-5 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.4)] hover:scale-105 transition-all duration-300 shadow-lg relative overflow-hidden group/btn cursor-pointer"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <svg className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            New Event
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                    </button>
                </div>
                                {/* Calendar Views - With unified styling */}
                <div className="flex-1 flex flex-col min-h-0 pb-6 relative animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    {loading && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-xl z-50 flex items-center justify-center rounded-2xl">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"></div>
                                <p className="text-sm font-bold text-text-primary animate-pulse">Syncing Calendar...</p>
                            </div>
                        </div>
                    )}
                    {view === 'month' && renderMonthView()}
                    {view === 'week' && renderWeekView()}
                    {view === 'day' && renderDayView()}
                    {(view === '3-month' || view === '6-month') && renderMultiMonthView()}
                </div>
            </div>

            {/* SIDE PANEL (Right Drawer) */}
            <div className={`fixed top-0 right-0 h-full w-96 bg-glass/60 backdrop-blur-2xl shadow-2xl border-l border-border-color transform transition-transform duration-300 z-50 ${isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedEvent ? (
                    <div className="h-full flex flex-col overflow-y-auto p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-bold text-text-primary mb-3">{selectedEvent.title}</h2>
                                <div className="flex flex-wrap gap-2">
                                     <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${eventColors[selectedEvent.type].bg} ${eventColors[selectedEvent.type].text} border ${eventColors[selectedEvent.type].border}`}>
                                         {selectedEvent.type.replace('_', ' ')}
                                     </span>
                                     {getProjectName(selectedEvent) && (
                                         <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase bg-primary/15 text-primary border border-primary/30">
                                             {getProjectName(selectedEvent)}
                                         </span>
                                     )}
                                </div>
                            </div>
                            <button onClick={handleCloseSidePanel} className="text-text-secondary hover:text-text-primary transition-colors duration-200 p-1 hover:bg-glass-light rounded-lg flex-shrink-0 ml-3">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6 flex-1">
                             {/* Always show basic info */}
                             <div className="bg-glass-light rounded-xl p-5 border border-border-color/50 shadow-md">
                                 <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Details</h3>
                                 <p className="text-lg font-semibold text-text-primary mb-3">{selectedEvent.title}</p>
                                 <div className="flex items-center gap-2 text-sm text-text-secondary">
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                     </svg>
                                     <span>{formatEventDateRange(selectedEvent.startDate, selectedEvent.endDate)}</span>
                                 </div>
                             </div>
                             <div className="space-y-4">
                                {(() => {
                                    const startDate = editedDates.startDate ? new Date(editedDates.startDate) : null;
                                    const endDate = editedDates.endDate ? new Date(editedDates.endDate) : null;
                                    const sameDay = startDate && endDate && areDatesSame(startDate, endDate);

                                    if (sameDay) {
                                        return (
                                            <div>
                                                <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Date</label>
                                                <input
                                                    type="datetime-local"
                                                    value={editedDates.startDate}
                                                    onChange={e => setEditedDates({startDate: e.target.value, endDate: e.target.value})}
                                                    className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-medium shadow-sm"
                                                />
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Start</label>
                                                    <input type="datetime-local" value={editedDates.startDate} onChange={e => setEditedDates({...editedDates, startDate: e.target.value})} className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-medium shadow-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">End</label>
                                                    <input type="datetime-local" value={editedDates.endDate} onChange={e => setEditedDates({...editedDates, endDate: e.target.value})} className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-medium shadow-sm" />
                                                </div>
                                            </>
                                        );
                                    }
                                })()}
                             </div>
                             
                             <div>
                                 <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Google Meet</label>
                                 <div className="flex gap-2">
                                     <input type="url" placeholder="https://meet.google.com/..." value={editedMeetLink} onChange={e => setEditedMeetLink(e.target.value)} className="flex-1 px-4 py-3 bg-glass-light border border-border-color rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 shadow-sm" />
                                     {editedMeetLink && (
                                         <a href={editedMeetLink} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-600 rounded-xl text-white hover:bg-blue-700 transition-all duration-300 hover:scale-105 shadow-md cursor-pointer">
                                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                                         </a>
                                     )}
                                 </div>
                             </div>
                             
                             <div>
                                 <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Assignees</label>
                                 <div className="flex flex-wrap gap-2 mb-3">
                                     {editedAssingees.map(uid => {
                                         const u = data.users.find(user => user.id === uid);
                                         return (
                                             <span key={uid} className="flex items-center gap-2 bg-glass-light border border-border-color px-3 py-1.5 rounded-lg text-xs font-medium group hover:border-red-500/50 transition-all duration-200">
                                                 {u ? (u.firstName || u.name) : 'Unknown'}
                                                 <button onClick={() => setEditedAssignees(prev => prev.filter(id => id !== uid))} className="text-text-secondary hover:text-red-400 transition-colors duration-200">&times;</button>
                                             </span>
                                         );
                                     })}
                                 </div>
                                 <select
                                     onChange={(e) => {
                                         if(e.target.value && !editedAssingees.includes(e.target.value)) setEditedAssignees([...editedAssingees, e.target.value]);
                                         e.target.value = '';
                                     }}
                                     className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 font-medium shadow-sm"
                                 >
                                     <option value="">+ Add Assignee</option>
                                     {data.users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                                 </select>
                             </div>

                             <div className="space-y-3 pt-6 border-t border-border-color/50">
                                 {getSourceLink(selectedEvent) && (
                                     <Link to={getSourceLink(selectedEvent)!.to} className="block w-full py-3 text-center border border-primary/50 text-primary rounded-xl font-bold hover:bg-primary/15 transition-all duration-300 bg-primary/5 hover:scale-105 shadow-sm cursor-pointer">
                                         {getSourceLink(selectedEvent)!.text}
                                     </Link>
                                 )}
                                 <Link to={`/calendar/event/${selectedEvent.id}`} className="block w-full py-3 text-center border border-border-color text-text-secondary rounded-xl font-bold hover:bg-glass-light transition-all duration-300 bg-glass/50 hover:scale-105 shadow-sm cursor-pointer">
                                     View Full Details Page
                                 </Link>
                             </div>
                        </div>

                        <div className="flex gap-3 mt-6 pt-6 border-t border-border-color/50">
                            <button onClick={handleEventUpdate} className="flex-1 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">Save</button>
                            <button onClick={handleCloseSidePanel} className="px-6 py-3 bg-glass-light text-text-primary font-bold rounded-xl hover:bg-border-color border border-border-color transition-all duration-300 hover:scale-105 shadow-sm">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-text-secondary p-4 text-center">
                        Select an event to view details
                    </div>
                )}
            </div>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="bg-glass/60 backdrop-blur-2xl border border-border-color rounded-2xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-bold text-text-primary">Create New Event</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-text-secondary hover:text-text-primary transition-colors duration-200 p-1.5 hover:bg-glass-light rounded-lg">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleAdvancedCreateEvent} className="space-y-6">
                            <div>
                                <label htmlFor="eventTitle" className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Event Title</label>
                                <input
                                    id="eventTitle"
                                    type="text"
                                    value={newEventData.title}
                                    onChange={e => setNewEventData({ ...newEventData, title: e.target.value })}
                                    placeholder="Meeting with Client"
                                    autoFocus
                                    className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-medium shadow-sm"
                                />
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Start Date & Time</label>
                                    <input type="datetime-local" value={newEventData.startDate} onChange={e => setNewEventData({ ...newEventData, startDate: e.target.value })} className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-medium shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">End Date & Time</label>
                                    <input type="datetime-local" value={newEventData.endDate} onChange={e => setNewEventData({ ...newEventData, endDate: e.target.value })} className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-medium shadow-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Project (Optional)</label>
                                    <select
                                        className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 font-medium shadow-sm"
                                        value={newEventData.projectId}
                                        onChange={e => setNewEventData({ ...newEventData, projectId: e.target.value, taskId: '' })}
                                    >
                                        <option value="">Select Project</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                {availableTasks.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Task (Optional)</label>
                                        <select
                                            className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 font-medium shadow-sm"
                                            value={newEventData.taskId}
                                            onChange={e => setNewEventData({ ...newEventData, taskId: e.target.value })}
                                        >
                                            <option value="">Select Task</option>
                                            {availableTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>


                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Google Meet (Optional)</label>
                                    <input
                                        type="url"
                                        value={newEventData.meetLink}
                                        onChange={e => setNewEventData({ ...newEventData, meetLink: e.target.value })}
                                        placeholder="https://meet.google.com/..."
                                        className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light placeholder-text-secondary text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-medium shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Reminder</label>
                                    <select
                                        className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 font-medium shadow-sm"
                                        value={newEventData.reminder}
                                        onChange={e => setNewEventData({ ...newEventData, reminder: e.target.value })}
                                    >
                                        <option value="none">No Reminder</option>
                                        <option value="15-min">15 minutes before</option>
                                        <option value="1-hour">1 hour before</option>
                                        <option value="1-day">1 day before</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">Assignees (Optional)</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {newEventData.assignees.map(uid => {
                                        const u = data.users.find(user => user.id === uid);
                                        return (
                                            <span key={uid} className="flex items-center gap-2 bg-glass-light border border-border-color px-3 py-1.5 rounded-lg text-xs font-medium group hover:border-red-500/50 transition-all duration-200">
                                                {u ? (u.firstName || u.name) : 'Unknown'}
                                                <button type="button" onClick={() => setNewEventData({ ...newEventData, assignees: newEventData.assignees.filter(id => id !== uid) })} className="text-text-secondary hover:text-red-400 transition-colors duration-200">&times;</button>
                                            </span>
                                        );
                                    })}
                                </div>
                                <select
                                    onChange={(e) => {
                                        if(e.target.value && !newEventData.assignees.includes(e.target.value)) {
                                            setNewEventData({ ...newEventData, assignees: [...newEventData.assignees, e.target.value] });
                                        }
                                        e.target.value = '';
                                    }}
                                    className="appearance-none block w-full px-4 py-3 border border-border-color bg-glass-light text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 font-medium shadow-sm"
                                >
                                    <option value="">+ Add Assignee</option>
                                    {data.users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                                </select>
                            </div>

                            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-border-color/50">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-6 py-3 bg-glass-light text-text-primary text-sm font-bold rounded-xl hover:bg-border-color hover:scale-105 transition-all duration-300 border border-border-color shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.4)] hover:scale-105 transition-all duration-300 shadow-lg relative overflow-hidden group/btn"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        Create Event
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// export default CalendarPage;
