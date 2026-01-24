import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useData } from '../contexts/DataContext';
import { CalendarEvent } from '../types';
import { createCalendarEvent, updateSourceItemDate, updateCalendarEventById, updateSourceItemAssignees } from '../utils/calendarSync';
import { brands } from '../data/brandData';
import { projects, tasks, boards, roadmapItems } from '../data/mockData';
import { invoices, clients } from '../data/paymentsData';

// --- Type Definitions ---
type CalendarView = 'day' | 'week' | 'month' | '3-month' | '6-month';
const eventTypes: CalendarEvent['type'][] = ['task', 'invoice', 'estimate', 'roadmap_item', 'manual', 'comment'];

interface LaidOutEvent extends CalendarEvent {
    startCol: number;
    span: number;
    track: number;
}

// --- Helper Functions ---
const startOfDay = (date: Date | string | number): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
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
    const diff = d.getDate() - day; // adjust when day is sunday
    return new Date(d.setDate(diff));
};


const getSortableTime = (dateStr: string | undefined): number => {
    if (!dateStr) return 0;
    const time = new Date(dateStr).getTime();
    return isNaN(time) ? 0 : time;
};

export const CalendarPage = () => {
    // --- State Management ---
    const [searchParams] = useSearchParams();
    const brandId = searchParams.get('brandId');
    const brand = brandId ? brands.find(b => b.id === brandId) : null;
    
    // Get current user from context
    const { user, data } = useData();
    const currentUserId = user?.uid || 'user-1';

    // Use the hook instead of local state
    const { events, loading } = useCalendarEvents(currentUserId);
    
    // UI State
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [view, setView] = useState<CalendarView>('week');
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
        meetLink: ''
    });
    const [filters, setFilters] = useState<Record<CalendarEvent['type'], boolean>>({
        task: true, invoice: true, estimate: true, roadmap_item: true, manual: true, comment: true,
    });

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
        task: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500', dot: 'bg-blue-500' },
        invoice: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500', dot: 'bg-green-500' },
        estimate: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500', dot: 'bg-yellow-500' },
        roadmap_item: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500', dot: 'bg-purple-500' },
        comment: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500', dot: 'bg-orange-500' },
        manual: { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500', dot: 'bg-gray-400' },
    };
    
    // --- Event Handlers & Callbacks ---
    const handleFilterToggle = useCallback((type: CalendarEvent['type']) => {
        setFilters(prev => ({ ...prev, [type]: !prev[type] }));
    }, []);

    const navigateDate = (direction: number) => {
        setCurrentDate(current => {
            const newDate = new Date(current);
            switch (view) {
                case 'day': newDate.setDate(newDate.getDate() + direction); break;
                case 'week': newDate.setDate(newDate.getDate() + 7 * direction); break;
                case 'month': newDate.setMonth(newDate.getMonth() + direction, 1); break;
                case '3-month': newDate.setMonth(newDate.getMonth() + 3 * direction, 1); break;
                case '6-month': newDate.setMonth(newDate.getMonth() + 6 * direction, 1); break;
            }
            return newDate;
        });
    };
    const today = () => setCurrentDate(new Date());

    const handleAdvancedCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEventData.title.trim() || !newEventData.startDate || !newEventData.endDate) {
            alert('Please fill in title, start date, and end date.');
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
        setIsCreateModalOpen(false);
        setNewEventData({ title: '', startDate: '', endDate: '', brandId: '', projectId: '', taskId: '', reminder: 'none', meetLink: '' });
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
                            const board = task ? boards.find(b => b.id === task.boardId) : undefined;
                            const project = board ? projects.find(p => p.id === board.projectId) : undefined;
                            return project?.brandId;
                        }
                        case 'roadmap_item': {
                            const item = roadmapItems.find(i => i.id === event.sourceId);
                            const project = item ? projects.find(p => p.id === item.projectId) : undefined;
                            return project?.brandId;
                        }
                        case 'invoice': {
                            const invoice = invoices.find(i => i.id === event.sourceId);
                            if (!invoice) return undefined;
                            const client = clients.find(c => c.id === invoice.clientId);
                            return client?.brandId;
                        }
                        case 'comment': {
                            // Assuming comments are tied to projects or feedback items which might have a project
                            // For now, if a comment has a projectId, use that. Otherwise, it might not be brand-specific.
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
            eventsToFilter = eventsToFilter.filter(event => getBrandForEvent(event) === brandId);
        }

        return eventsToFilter;
    }, [events, filters, brandId]);
    
    const availableTasks = useMemo(() => {
        if (!newEventData.projectId) return [];
        const projectBoards = boards.filter(b => b.projectId === newEventData.projectId).map(b => b.id);
        return tasks.filter(t => projectBoards.includes(t.boardId));
    }, [newEventData.projectId]);

    const headerTitle = useMemo(() => {
        const options = { month: 'short', day: 'numeric', year: 'numeric' } as const;
        switch (view) {
            case 'day': return currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            case 'week':
                const weekStart = startOfWeek(new Date(currentDate));
                const weekEnd = addDays(new Date(weekStart), 6);
                 const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                 if (weekStart.getFullYear() !== weekEnd.getFullYear()) {
                     return `${startStr}, ${weekStart.getFullYear()} - ${weekEnd.toLocaleDateString('en-US', options)}`;
                 }
                 if (weekStart.getMonth() !== weekEnd.getMonth()) {
                     return `${startStr} - ${weekEnd.toLocaleDateString('en-US', options)}`;
                 }
                 return `${startStr} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
            default: return currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        }
    }, [currentDate, view]);
    
    const layOutEventsForWeek = useCallback((weekStart: Date, weekEnd: Date) => {
        const eventsInWeek = filteredEvents.filter(event => {
            if (!event.startDate || !event.endDate) return false;
            const eventStart = startOfDay(event.startDate);
            const eventEnd = startOfDay(event.endDate);
            return eventStart <= weekEnd && eventEnd >= weekStart;
        }).sort((a, b) => {
            const startA = getSortableTime(a.startDate);
            const endA = getSortableTime(a.endDate);
            const startB = getSortableTime(b.startDate);
            const endB = getSortableTime(b.endDate);
            const durationA = endA - startA;
            const durationB = endB - startB;
            if (durationA !== durationB) return durationB - durationA;
            return startA - startB;
        });

        const laidOutEvents: LaidOutEvent[] = [];
        const tracks: (Date | null)[][] = Array.from({ length: 10 }, () => Array(7).fill(null));

        eventsInWeek.forEach(event => {
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
            
            const startCol = eventStart < weekStart ? 0 : eventStart.getDay();
            const span = endDayIndex - startDayIndex + 1;

            laidOutEvents.push({ ...event, startCol, span, track: trackIndex });
        });
        return laidOutEvents;
    }, [filteredEvents]);


    const monthData = useMemo(() => {
        if (view !== 'month') return [];
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const gridStartDate = startOfWeek(startOfMonth);

        return Array.from({ length: 6 }, (_, weekIndex) => {
            const weekStart = addDays(gridStartDate, weekIndex * 7);
            const weekEnd = addDays(weekStart, 6);
            const days = Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex));
            const laidOutEvents = layOutEventsForWeek(weekStart, weekEnd);
            return { days, laidOutEvents };
        });
    }, [currentDate, view, layOutEventsForWeek]);

    const weekData = useMemo(() => {
        if (view !== 'week') return { days: [], laidOutEvents: [] };
        const weekStart = startOfWeek(new Date(currentDate));
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const weekEnd = days[6];

        const eventsInWeek = filteredEvents.filter(e => 
            e.startDate && e.endDate && 
            startOfDay(e.startDate) <= weekEnd && 
            startOfDay(e.endDate) >= weekStart
        ).sort((a, b) => {
            const startA = getSortableTime(a.startDate);
            const endA = getSortableTime(a.endDate);
            const startB = getSortableTime(b.startDate);
            const endB = getSortableTime(b.endDate);
            const durationA = endA - startA;
            const durationB = endB - startB;
            if (durationA !== durationB) return durationB - durationA;
            return startA - startB;
        });

        const laidOutEvents: LaidOutEvent[] = [];
        const tracks: (CalendarEvent | null)[][] = []; 

        eventsInWeek.forEach(event => {
            const eventStart = startOfDay(event.startDate);
            const eventEnd = startOfDay(event.endDate);

            const weekRelativeStart = eventStart < weekStart ? weekStart : eventStart;
            const weekRelativeEnd = eventEnd > weekEnd ? weekEnd : eventEnd;

            const startDayIndex = weekRelativeStart.getDay();
            const span = (weekRelativeEnd.getTime() - weekRelativeStart.getTime()) / (1000 * 60 * 60 * 24) + 1;

            let trackIndex = 0;
            while (true) {
                if (!tracks[trackIndex]) {
                    tracks[trackIndex] = Array(7).fill(null);
                }
                let isAvailable = true;
                for (let i = startDayIndex; i < startDayIndex + span; i++) {
                    if (tracks[trackIndex][i % 7]) {
                        isAvailable = false;
                        break;
                    }
                }
                if (isAvailable) break;
                trackIndex++;
            }

            for (let i = startDayIndex; i < startDayIndex + span; i++) {
                tracks[trackIndex][i % 7] = event;
            }

            laidOutEvents.push({
                ...event,
                startCol: startDayIndex,
                span: span,
                track: trackIndex
            });
        });

        return { days, laidOutEvents };
    }, [currentDate, filteredEvents, view]);

    // OLD Day Events Logic replaced by new renderDayView but kept variable if needed? No, removing.


    const multiMonthData = useMemo(() => {
        if (view !== '3-month' && view !== '6-month') return [];
        const numMonths = view === '3-month' ? 3 : 6;
        return Array.from({ length: numMonths }, (_, i) => {
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
            const gridStartDate = startOfWeek(startOfMonth);
            const days = Array.from({length: 42}, (_, i) => addDays(gridStartDate, i));
            
            const eventsByDay: Record<string, CalendarEvent['type'][]> = {};
            filteredEvents.forEach(e => {
                if (!e.startDate || !e.endDate) return;
                let d = startOfDay(e.startDate);
                while(d <= startOfDay(e.endDate)) {
                    const key = d.toDateString();
                    if (!eventsByDay[key]) eventsByDay[key] = [];
                    if (!eventsByDay[key].includes(e.type)) {
                        eventsByDay[key].push(e.type);
                    }
                    d = addDays(d, 1);
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
            <div className="flex-1 flex flex-col bg-glass border border-border-color rounded-2xl overflow-hidden">
                <div className="flex-1 overflow-auto">
                    <div className="min-w-[42rem] flex flex-col h-full">
                        <div className="grid grid-cols-7 sticky top-0 bg-glass z-10">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center py-2 text-xs font-bold text-text-secondary border-b border-r border-border-color bg-glass-light last:border-r-0">{d}</div>)}
                        </div>
                        <div className="flex-1 grid grid-rows-6">
                            {monthData.map(({ days, laidOutEvents }, weekIndex) => (
                                <div key={weekIndex} className="relative grid grid-cols-7 border-b border-border-color last:border-b-0 min-h-[7rem]">
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
                                                className={`border-r border-border-color p-1.5 last:border-r-0 h-full flex flex-col gap-1 ${isCurrentMonth ? 'cursor-pointer hover:bg-glass-light' : 'bg-background/50 text-text-secondary'}`}
                                            >
                                                <span className={`text-xs font-semibold self-end ${areDatesSame(new Date(), day) ? 'bg-primary text-background rounded-full h-5 w-5 flex items-center justify-center' : ''}`}>{day.getDate()}</span>
                                                <div className="flex-1"></div>
                                                {hiddenEventsCount > 0 && (
                                                    <button onClick={(e) => { e.stopPropagation(); setMoreEventsInfo({ date: day, events: eventsOnThisDay }); }} className="text-[11px] text-text-secondary hover:underline text-left mt-auto">
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
                                                        onDoubleClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                                        className={`absolute rounded p-0.5 pointer-events-auto cursor-pointer ${colors.bg} ${colors.text} flex items-center`}
                                                        style={{
                                                            top: `calc(1.75rem + ${event.track * 1.5}rem)`,
                                                            left: `calc(${(event.startCol / 7) * 100}% + 2px)`,
                                                            width: `calc(${(event.span / 7) * 100}% - 4px)`,
                                                            height: '1.4rem',
                                                        }}
                                                    >
                                                        <p className="text-[11px] font-medium px-1 leading-tight">
                                                            {event.type === 'roadmap_item' ? event.title : event.title.replace(/^(Task|Invoice|Estimate):\s*/, '')}
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
        const EVENT_HEIGHT = 48; // px
        const GRID_GAP = 4; // px
    
        return (
            <div className="rounded-2xl border border-border-color overflow-hidden flex flex-col flex-1">
                <div className="overflow-auto flex-1">
                    <div className="min-w-[56rem] flex flex-col h-full">
                        {/* Week Header */}
                        <div className="grid grid-cols-7 bg-glass border-b border-border-color flex-shrink-0 sticky top-0 z-10">
                            {weekData.days.map(day => (
                                <div key={day.toISOString()} onClick={() => { setCurrentDate(day); setView('day'); }} className="text-center p-4 border-r border-border-color last:border-r-0 cursor-pointer hover:bg-glass-light">
                                    <p className="text-xs font-medium text-text-secondary">{day.toLocaleDateString('default', { weekday: 'short' }).toUpperCase()}</p>
                                    <p className={`text-xl font-bold mt-2 ${areDatesSame(new Date(), day) ? 'text-primary' : 'text-text-primary'}`}>{day.getDate()}</p>
                                </div>
                            ))}
                        </div>
                
                        {/* Week Body - Grid */}
                        <div className="relative bg-background min-h-[40rem] flex-1">
                            <div className="grid grid-cols-7 absolute w-full h-full">
                                {/* Day columns for borders */}
                                {weekData.days.map((day) => (
                                    <div key={day.toISOString()} className="border-r border-border-color last:border-r-0 h-full"></div>
                                ))}
                            </div>
                            
                            {/* Event container */}
                            <div className="relative p-1 w-full h-full">
                                {weekData.laidOutEvents.map(event => (
                                    <div 
                                        key={event.id} 
                                        onDoubleClick={() => setSelectedEvent(event)}
                                        className={`absolute px-2 py-1 rounded-lg flex items-center border-l-4 bg-glass shadow-sm cursor-pointer hover:shadow-lg ${eventColors[event.type].border}`}
                                        style={{
                                            top: `${event.track * (EVENT_HEIGHT + GRID_GAP) + GRID_GAP}px`,
                                            left: `calc(${(event.startCol / 7) * 100}% + 2px)`,
                                            width: `calc(${(event.span / 7) * 100}% - 4px)`,
                                            height: `${EVENT_HEIGHT}px`,
                                        }}
                                    >
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-semibold text-sm text-text-primary leading-tight line-clamp-2">{event.title}</p>
                                            <p className="text-xs text-text-secondary mt-0.5 truncate">
                                                {formatEventDateRange(event.startDate, event.endDate)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const dayStart = startOfDay(currentDate);
        
        // Filter events for this day
        const dayEvents = filteredEvents.filter(e => {
            if (!e.startDate || !e.endDate) return false;
            const s = new Date(e.startDate);
            const end = new Date(e.endDate);
            return s < addDays(dayStart, 1) && end > dayStart;
        });

        const getEventStyle = (event: CalendarEvent) => {
            const s = new Date(event.startDate);
            const end = new Date(event.endDate);
            
            // Clamp to current day
            const startMinutes = Math.max(0, (s.getTime() - dayStart.getTime()) / 60000);
            const endMinutes = Math.min(1440, (end.getTime() - dayStart.getTime()) / 60000);
            const duration = endMinutes - startMinutes;

            return {
                top: `${(startMinutes / 60) * 60}px`,
                height: `${Math.max(20, (duration / 60) * 60)}px`,
            };
        };

        return (
             <div className="flex-1 overflow-y-auto bg-background rounded-2xl border border-border-color reltaive">
                <div className="relative min-h-[1440px]" style={{ height: '1440px' }}>
                    {hours.map(h => (
                        <div key={h} className="absolute w-full border-t border-border-color flex" style={{ top: `${h * 60}px`, height: '60px' }}>
                            <span className="w-16 text-right pr-4 text-xs text-text-secondary -mt-2 bg-background z-10">{h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}</span>
                            <div className="flex-1 border-l border-border-color/50 h-full"></div> 
                        </div>
                    ))}
                    
                    {/* Events */}
                    <div className="absolute top-0 right-0 left-16 bottom-0">
                         {dayEvents.map(event => (
                            <div
                                key={event.id}
                                onDoubleClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                className={`absolute rounded-lg border-l-4 px-2 py-1 text-xs cursor-pointer hover:z-20 hover:shadow-lg transition-all overflow-hidden ${eventColors[event.type].bg} ${eventColors[event.type].border}`}
                                style={{ ...getEventStyle(event), width: '90%' }} 
                            >
                                <div className="font-bold text-text-primary">{event.title}</div>
                                <div className="text-text-secondary flex gap-2">
                                     <span>{formatEventDateRange(event.startDate, event.endDate).split('-')[0].trim()}</span>
                                     {getProjectName(event) && <span className="opacity-75">• {getProjectName(event)}</span>}
                                </div>
                            </div>
                         ))}
                    </div>
                    
                    {/* Current Time Line */}
                    {areDatesSame(currentDate, new Date()) && (
                         <div 
                            className="absolute left-16 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
                            style={{ top: `${(new Date().getHours() * 60) + new Date().getMinutes()}px` }}
                         >
                            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                         </div>
                    )}
                </div>
             </div>
        );
    };
    
    const renderMultiMonthView = () => {
        const numMonths = view === '3-month' ? 3 : 6;
        return (
            <div className={`grid grid-cols-1 ${numMonths === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-3'} gap-8`}>
                {multiMonthData.map(({ monthDate, days, eventsByDay }) => (
                    <div key={monthDate.toISOString()} className="bg-glass p-6 rounded-2xl border border-border-color">
                        <h3 className="text-center font-semibold text-text-primary mb-2">{monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                        <div className="grid grid-cols-7 text-center text-xs text-text-secondary mb-1">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 text-center text-sm">
                            {days.map(day => {
                                const isCurrentMonth = day.getMonth() === monthDate.getMonth();
                                const dayKey = day.toDateString();
                                const dayEventTypes = eventsByDay[dayKey] || [];
                                return (
                                    <div key={day.toISOString()} onClick={() => { setCurrentDate(day); setView('day'); }} className={`py-1 rounded-full relative ${isCurrentMonth ? 'cursor-pointer hover:bg-glass-light' : 'text-text-secondary/50'}`}>
                                        <span className={`${areDatesSame(new Date(), day) ? 'bg-primary text-background rounded-full' : ''} w-6 h-6 flex items-center justify-center mx-auto`}>{day.getDate()}</span>
                                        {dayEventTypes.length > 0 && (
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                                                {dayEventTypes.slice(0, 3).map(type => <div key={type} className={`w-1 h-1 rounded-full ${eventColors[type].dot}`}></div>)}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
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
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300" style={{ marginRight: isSidePanelOpen ? '0' : '0' }}> 
                 <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 p-4 md:p-0">
                     <div>
                        <h1 className="text-3xl font-bold text-text-primary">{brand ? `Calendar for ${brand.name}`: 'Calendar'}</h1>
                        <p className="mt-1 text-text-secondary">A unified view of all your dated events.</p>
                    </div>
                     <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                             <button onClick={() => navigateDate(-1)} className="px-3 py-2 bg-glass rounded-lg hover:bg-glass-light">&larr;</button>
                             <button onClick={today} className="px-4 py-2 bg-glass rounded-lg hover:bg-glass-light text-sm font-semibold whitespace-nowrap">{headerTitle}</button>
                             <button onClick={() => navigateDate(1)} className="px-3 py-2 bg-glass rounded-lg hover:bg-glass-light">&rarr;</button>
                           <div className="flex items-center bg-glass rounded-lg p-1 border border-border-color">
                                {(['month', 'week', 'day', '3-month', '6-month'] as CalendarView[]).map(v => (
                                     <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-sm font-medium rounded-md ${view === v ? 'bg-primary text-background' : 'text-text-secondary hover:bg-glass-light'}`}>{v.charAt(0).toUpperCase() + v.replace('-month', ' Month').slice(1)}</button>
                                ))}
                           </div>
                        </div>
                     </div>
                 </div>
                 
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex flex-wrap gap-2">
                        {eventTypes.map(type => (
                            <button key={type} onClick={() => handleFilterToggle(type)} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${filters[type] ? `${eventColors[type].bg} ${eventColors[type].text.replace('300','400')} ${eventColors[type].border}` : 'bg-transparent text-text-secondary border-border-color hover:bg-glass-light'} ${filters[type] ? 'opacity-100' : 'opacity-60'}`}>
                                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Create Event</button>
                    </div>
                </div>
                 
                 <div className="flex-1 flex flex-col min-h-0 pb-6 relative">
                    {view === 'month' && renderMonthView()}
                    {view === 'week' && renderWeekView()} 
                    {view === 'day' && renderDayView()}
                    {(view === '3-month' || view === '6-month') && renderMultiMonthView()}
                 </div>
            </div>

            {/* SIDE PANEL (Right Drawer) */}
            <div className={`fixed top-0 right-0 h-full w-96 bg-surface shadow-2xl border-l border-border-color transform transition-transform duration-300 z-50 ${isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedEvent ? (
                    <div className="h-full flex flex-col overflow-y-auto p-6 bg-glass backdrop-blur-xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-text-primary">{selectedEvent.title}</h2>
                                <div className="flex gap-2 mt-2">
                                     <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${eventColors[selectedEvent.type].bg} ${eventColors[selectedEvent.type].text} border ${eventColors[selectedEvent.type].border}`}>
                                         {selectedEvent.type.replace('_', ' ')}
                                     </span>
                                     {getProjectName(selectedEvent) && (
                                         <span className="px-2 py-0.5 rounded text-xs font-medium uppercase bg-primary/10 text-primary border border-primary/20">
                                             {getProjectName(selectedEvent)}
                                         </span>
                                     )}
                                </div>
                            </div>
                            <button onClick={handleCloseSidePanel} className="text-text-secondary hover:text-text-primary text-2xl">&times;</button>
                        </div>

                        <div className="space-y-6 flex-1">
                             {/* Always show basic info */}
                             <div className="bg-glass-light rounded-xl p-4 border border-border-color">
                                 <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Details</h3>
                                 <p className="text-lg font-medium text-text-primary mb-2">{selectedEvent.title}</p>
                                 <p className="text-sm text-text-secondary">
                                      {formatEventDateRange(selectedEvent.startDate, selectedEvent.endDate)}
                                 </p>
                             </div>
                             <div className="space-y-4">
                                <FormInput label="Start" type="datetime-local" value={editedDates.startDate} onChange={e => setEditedDates({...editedDates, startDate: e.target.value})} />
                                <FormInput label="End" type="datetime-local" value={editedDates.endDate} onChange={e => setEditedDates({...editedDates, endDate: e.target.value})} />
                             </div>
                             
                             <div>
                                 <label className="block text-sm font-medium text-text-secondary mb-1">Google Meet</label>
                                 <div className="flex gap-2">
                                     <input type="url" placeholder="https://meet.google.com/..." value={editedMeetLink} onChange={e => setEditedMeetLink(e.target.value)} className="flex-1 px-3 py-2 bg-glass-light border border-border-color rounded-lg text-sm text-text-primary" />
                                     {editedMeetLink && (
                                         <a href={editedMeetLink} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700">
                                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                                         </a>
                                     )}
                                 </div>
                             </div>
                             
                             <div>
                                 <label className="block text-sm font-medium text-text-secondary mb-1">Assignees</label>
                                 <div className="flex flex-wrap gap-2 mb-2">
                                     {editedAssingees.map(uid => {
                                         const u = data.users.find(user => user.id === uid);
                                         return (
                                             <span key={uid} className="flex items-center gap-1 bg-surface-light border border-border-color px-2 py-1 rounded-full text-xs">
                                                 {u ? (u.firstName || u.name) : 'Unknown'}
                                                 <button onClick={() => setEditedAssignees(prev => prev.filter(id => id !== uid))} className="hover:text-red-500">&times;</button>
                                             </span>
                                         );
                                     })}
                                 </div>
                                 <select 
                                     onChange={(e) => {
                                         if(e.target.value && !editedAssingees.includes(e.target.value)) setEditedAssignees([...editedAssingees, e.target.value]);
                                         e.target.value = '';
                                     }}
                                     className="w-full px-3 py-2 bg-glass-light border border-border-color rounded-lg text-sm text-text-primary"
                                 >
                                     <option value="">+ Add Assignee</option>
                                     {data.users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                                 </select>
                             </div>

                             <div className="space-y-2 pt-4 border-t border-border-color">
                                 {getSourceLink(selectedEvent) && (
                                     <Link to={getSourceLink(selectedEvent)!.to} className="block w-full py-2 text-center border border-primary text-primary rounded-lg font-medium hover:bg-primary/10">
                                         {getSourceLink(selectedEvent)!.text}
                                     </Link>
                                 )}
                                 <Link to={`/calendar/event/${selectedEvent.id}`} className="block w-full py-2 text-center border border-border-color text-text-secondary rounded-lg font-medium hover:bg-surface-light hover:text-text-primary">
                                     View Full Details Page
                                 </Link>
                             </div>
                        </div>

                        <div className="flex gap-2 mt-6 pt-4 border-t border-border-color">
                            <button onClick={handleEventUpdate} className="flex-1 py-2 bg-primary text-background font-bold rounded-lg hover:bg-primary-hover">Save</button>
                            <button onClick={handleCloseSidePanel} className="px-4 py-2 bg-surface-light text-text-primary font-medium rounded-lg hover:bg-border-color">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-text-secondary p-4 text-center">
                        Select an event to view details
                    </div>
                )}
            </div>

            {isCreateModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={() => setIsCreateModalOpen(false)}>
                    <form onSubmit={handleAdvancedCreateEvent} className="bg-glass w-full max-w-lg rounded-2xl shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-text-primary mb-6">Create New Event</h3>
                        <div className="space-y-4">
                            <FormInput label="Event Name" type="text" value={newEventData.title} onChange={e => setNewEventData({...newEventData, title: e.target.value})} required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="Start Date & Time" type="datetime-local" value={newEventData.startDate} onChange={e => setNewEventData({...newEventData, startDate: e.target.value})} required />
                                <FormInput label="End Date & Time" type="datetime-local" value={newEventData.endDate} onChange={e => setNewEventData({...newEventData, endDate: e.target.value})} required />
                            </div>
                            <FormInput label="Google Meet Link" type="url" placeholder="https://meet.google.com/..." value={newEventData.meetLink} onChange={e => setNewEventData({...newEventData, meetLink: e.target.value})} />
                            <FormSelect label="Visibility (Brand)" value={newEventData.brandId} onChange={e => setNewEventData({...newEventData, brandId: e.target.value})}>
                                <option value="">All Brands</option>
                                {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                            </FormSelect>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormSelect label="Link to Project" value={newEventData.projectId} onChange={e => setNewEventData({...newEventData, projectId: e.target.value, taskId: ''})}>
                                    <option value="">None</option>
                                    {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                                </FormSelect>
                                <FormSelect label="Link to Task" value={newEventData.taskId} onChange={e => setNewEventData({...newEventData, taskId: e.target.value})} disabled={!newEventData.projectId}>
                                    <option value="">None</option>
                                    {availableTasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
                                </FormSelect>
                             </div>
                             <FormSelect label="Reminder" value={newEventData.reminder} onChange={e => setNewEventData({...newEventData, reminder: e.target.value})}>
                                <option value="none">No reminder</option>
                                <option value="15m">15 minutes before</option>
                                <option value="1h">1 hour before</option>
                                <option value="1d">1 day before</option>
                            </FormSelect>
                        </div>
                        <div className="flex justify-end gap-2 mt-8">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">Create Event</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

// export default CalendarPage;
