
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { calendar_events as initialEvents } from '../data/calendarData';
import { CalendarEvent } from '../types';
import { createCalendarEvent, updateSourceItemDate, updateCalendarEventById } from '../utils/calendarSync';
import { brands } from '../data/brandData';
import { projects, tasks, boards, roadmapItems } from '../data/mockData';
import { invoices, clients } from '../data/paymentsData';

// --- Type Definitions ---
type CalendarView = 'day' | 'week' | 'month' | '3-month' | '6-month';
const eventTypes: CalendarEvent['type'][] = ['task', 'invoice', 'estimate', 'roadmap_item', 'manual'];

interface LaidOutEvent extends CalendarEvent {
    startCol: number;
    span: number;
    track: number;
}

// --- Helper Functions (moved outside component) ---
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


const CalendarPage = () => {
    // --- State Management ---
    const [searchParams] = useSearchParams();
    const brandId = searchParams.get('brandId');
    const brand = brandId ? brands.find(b => b.id === brandId) : null;
    
    const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
    const [currentDate, setCurrentDate] = useState(new Date("2025-11-14T12:00:00Z")); // Set to match image context
    const [view, setView] = useState<CalendarView>('week');
    const [moreEventsInfo, setMoreEventsInfo] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [editedDates, setEditedDates] = useState({ startDate: '', endDate: '' });

    const [newEventData, setNewEventData] = useState({
        title: '',
        startDate: '',
        endDate: '',
        brandId: '',
        projectId: '',
        taskId: '',
        reminder: 'none'
    });
    const [filters, setFilters] = useState<Record<CalendarEvent['type'], boolean>>({
        task: true, invoice: true, estimate: true, roadmap_item: true, manual: true,
    });

    useEffect(() => {
        if (selectedEvent) {
            setEditedDates({
                startDate: new Date(new Date(selectedEvent.startDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                endDate: new Date(new Date(selectedEvent.endDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            });
        }
    }, [selectedEvent]);

    const eventColors: Record<CalendarEvent['type'], { bg: string; text: string; border: string; dot: string; }> = {
        task: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500', dot: 'bg-blue-500' },
        invoice: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500', dot: 'bg-green-500' },
        estimate: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500', dot: 'bg-yellow-500' },
        roadmap_item: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500', dot: 'bg-purple-500' },
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

    const handleAdvancedCreateEvent = (e: React.FormEvent) => {
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
            userId: 'user-1',
            brandId: newEventData.brandId || undefined,
            projectId: newEventData.projectId || undefined,
            taskId: newEventData.taskId || undefined,
            reminder: newEventData.reminder !== 'none' ? newEventData.reminder : undefined,
        };
        const createdEvent = createCalendarEvent(newEventPayload, 'manual');
        setEvents(prev => [...prev, createdEvent]);
        setIsCreateModalOpen(false);
        // Reset form
        setNewEventData({ title: '', startDate: '', endDate: '', brandId: '', projectId: '', taskId: '', reminder: 'none' });
    };
    
    const handleEventUpdate = useCallback(() => {
        if (!selectedEvent) return;
    
        const updatedEventData = {
            ...selectedEvent,
            startDate: new Date(editedDates.startDate).toISOString(),
            endDate: new Date(editedDates.endDate).toISOString(),
        };
    
        if (selectedEvent.sourceId) {
            updateSourceItemDate(selectedEvent.sourceId, selectedEvent.type, {
                startDate: updatedEventData.startDate,
                endDate: updatedEventData.endDate,
            });
        }
    
        updateCalendarEventById(selectedEvent.id, updatedEventData);
        
        setEvents(prev => prev.map(e => e.id === selectedEvent.id ? updatedEventData : e));
    
        setSelectedEvent(null);
    }, [selectedEvent, editedDates]);

    // --- Memoized Data & Calculations (TOP LEVEL) ---
    const filteredEvents = useMemo(() => {
        let eventsToFilter = events.filter(event => filters[event.type]);
        
        if (brandId) {
            const getBrandForEvent = (event: CalendarEvent): string | undefined => {
                if (event.brandId) return event.brandId;
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

    const dayEvents = useMemo(() => {
        if (view !== 'day') return [];
        const currentDayStart = startOfDay(currentDate);
        return filteredEvents
            .filter(e => {
                if (!e.startDate || !e.endDate) return false;
                const eventStart = startOfDay(e.startDate);
                const eventEnd = startOfDay(e.endDate);
                return currentDayStart >= eventStart && currentDayStart <= eventEnd;
            })
            .sort((a, b) => getSortableTime(a.startDate) - getSortableTime(b.startDate));
    }, [currentDate, filteredEvents, view]);

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
                                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                                        className={`absolute rounded p-0.5 pointer-events-auto cursor-pointer ${colors.bg} ${colors.text} flex items-center`}
                                                        style={{
                                                            top: `calc(1.75rem + ${event.track * 1.5}rem)`,
                                                            left: `calc(${(event.startCol / 7) * 100}% + 2px)`,
                                                            width: `calc(${(event.span / 7) * 100}% - 4px)`,
                                                            height: '1.4rem',
                                                        }}
                                                    >
                                                        <p className="truncate text-[11px] font-medium px-1">
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
                                        onClick={() => setSelectedEvent(event)}
                                        className={`absolute px-2 py-1 rounded-lg flex items-center border-l-4 bg-glass shadow-sm cursor-pointer hover:shadow-lg ${eventColors[event.type].border}`}
                                        style={{
                                            top: `${event.track * (EVENT_HEIGHT + GRID_GAP) + GRID_GAP}px`,
                                            left: `calc(${(event.startCol / 7) * 100}% + 2px)`,
                                            width: `calc(${(event.span / 7) * 100}% - 4px)`,
                                            height: `${EVENT_HEIGHT}px`,
                                        }}
                                    >
                                        <div className="truncate flex-1">
                                            <p className="font-semibold text-sm text-text-primary truncate">{event.title}</p>
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

    const renderDayView = () => (
        <div className="flex-1 p-6 bg-glass border border-border-color rounded-2xl overflow-y-auto">
           {dayEvents.length > 0 ? (
               dayEvents.map(event => (
                   <div key={event.id} onClick={() => setSelectedEvent(event)} className={`p-4 mb-4 rounded-lg border-l-4 cursor-pointer hover:shadow-lg ${eventColors[event.type].bg} ${eventColors[event.type].border}`}>
                       <p className="font-bold text-text-primary">{event.title}</p>
                       <p className="text-sm text-text-secondary capitalize">{event.type.replace('_', ' ')}</p>
                   </div>
               ))
           ) : <p className="text-text-secondary">No events scheduled for this day.</p>}
       </div>
   );
    
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
        <div className="h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6">
                 <div>
                    <h1 className="text-3xl font-bold text-text-primary">{brand ? `Calendar for ${brand.name}`: 'Calendar'}</h1>
                    <p className="mt-1 text-text-secondary">A unified view of all your dated events.</p>
                </div>
                <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-center gap-4 flex-wrap">
                     <div className="flex items-center gap-2">
                        <button onClick={() => navigateDate(-1)} className="px-3 py-2 bg-glass rounded-lg hover:bg-glass-light">&larr;</button>
                        <button onClick={today} className="px-4 py-2 bg-glass rounded-lg hover:bg-glass-light text-sm font-semibold whitespace-nowrap">{headerTitle}</button>
                        <button onClick={() => navigateDate(1)} className="px-3 py-2 bg-glass rounded-lg hover:bg-glass-light">&rarr;</button>
                    </div>
                    <div className="flex items-center bg-glass rounded-lg p-1 border border-border-color flex-wrap">
                        {(['month', 'week', 'day', '3-month', '6-month'] as CalendarView[]).map(v => (
                             <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${view === v ? 'bg-primary text-background font-bold' : 'text-text-secondary hover:bg-glass-light'}`}
                            >
                                {v.charAt(0).toUpperCase() + v.slice(1).replace('-month', ' Month')}
                            </button>
                        ))}
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
                    <button className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Sync to Google Calendar</button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 pb-6">
                {view === 'month' && renderMonthView()}
                {view === 'week' && renderWeekView()}
                {view === 'day' && renderDayView()}
                {(view === '3-month' || view === '6-month') && renderMultiMonthView()}
            </div>
            
            {moreEventsInfo && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={() => setMoreEventsInfo(null)}>
                    <div className="bg-glass w-full max-w-md rounded-2xl shadow-xl border border-border-color p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-text-primary mb-4">{moreEventsInfo.date.toDateString()}</h3>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {moreEventsInfo.events.map(event => (
                                <div key={event.id} className={`p-2 rounded-lg text-sm ${eventColors[event.type].bg} ${eventColors[event.type].text}`}>{event.title}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
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
            {selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-glass w-full max-w-lg rounded-2xl shadow-xl border border-border-color p-8" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-text-primary mb-1 pr-4">{selectedEvent.title}</h3>
                            <button onClick={() => setSelectedEvent(null)} className="text-text-secondary hover:text-text-primary text-2xl font-bold">&times;</button>
                        </div>
                        <div className={`text-sm font-medium px-2 py-0.5 rounded-full inline-block border ${eventColors[selectedEvent.type].bg} ${eventColors[selectedEvent.type].text} ${eventColors[selectedEvent.type].border}`}>
                            {selectedEvent.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        
                        <div className="mt-6 space-y-4">
                            {getSourceLink(selectedEvent) && (
                                <div>
                                    <Link to={getSourceLink(selectedEvent)!.to} className="text-sm font-medium text-primary hover:underline flex items-center gap-2">
                                        {getSourceLink(selectedEvent)!.text} &rarr;
                                    </Link>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="Start Date & Time" type="datetime-local" value={editedDates.startDate} onChange={e => setEditedDates({...editedDates, startDate: e.target.value})} required />
                                <FormInput label="End Date & Time" type="datetime-local" value={editedDates.endDate} onChange={e => setEditedDates({...editedDates, endDate: e.target.value})} required />
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-border-color text-sm text-text-secondary space-y-1">
                            {selectedEvent.brandId && <p><strong>Brand:</strong> {brands.find(b => b.id === selectedEvent.brandId)?.name}</p>}
                            {selectedEvent.projectId && <p><strong>Project:</strong> {projects.find(p => p.id === selectedEvent.projectId)?.name}</p>}
                            {selectedEvent.taskId && <p><strong>Task:</strong> {tasks.find(t => t.id === selectedEvent.taskId)?.title}</p>}
                            {selectedEvent.reminder && <p><strong>Reminder:</strong> {selectedEvent.reminder}</p>}
                        </div>

                        <div className="flex justify-end gap-2 mt-8">
                            <button type="button" onClick={() => setSelectedEvent(null)} className="px-4 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                            <button type="button" onClick={handleEventUpdate} className="px-4 py-2 bg-primary text-background font-bold text-sm rounded-lg hover:bg-primary-hover">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
