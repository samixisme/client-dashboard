import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { CalendarEvent, Task } from '../../types';

// Simplified helper functions from the main calendar page
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
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
};


interface ProjectCalendarViewProps {
    projectId: string;
    onEventClick: (task: Task) => void;
}

const ProjectCalendarView: React.FC<ProjectCalendarViewProps> = ({ projectId, onEventClick }) => {
    const { data } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());

    const projectEvents = useMemo(() => {
        const projectBoardIds = data.boards.filter(b => b.projectId === projectId).map(b => b.id);
        const projectTasks = data.tasks.filter(t => projectBoardIds.includes(t.boardId) && t.dueDate);
        
        return projectTasks.map(task => ({
            id: task.id,
            title: task.title,
            startDate: task.dueDate!,
            endDate: task.dueDate!,
            sourceId: task.id,
            type: 'task' as const,
        }));
    }, [projectId, data.boards, data.tasks]);

    const monthData = useMemo(() => {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const gridStartDate = startOfWeek(startOfMonth);

        return Array.from({ length: 6 }, (_, weekIndex) => {
            const weekStart = addDays(gridStartDate, weekIndex * 7);
            const days = Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex));
            return { days };
        });
    }, [currentDate]);

    const navigateMonth = (direction: number) => {
        setCurrentDate(current => {
            const newDate = new Date(current);
            newDate.setMonth(newDate.getMonth() + direction, 1);
            return newDate;
        });
    };

    return (
        <div className="w-full h-full flex flex-col bg-glass border border-border-color rounded-2xl overflow-hidden p-4">
            <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={() => navigateMonth(-1)} className="p-2 rounded-md hover:bg-glass-light">&larr;</button>
                <h2 className="text-lg font-bold text-text-primary">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => navigateMonth(1)} className="p-2 rounded-md hover:bg-glass-light">&rarr;</button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-bold text-text-secondary border-b border-border-color bg-glass-light rounded-t-lg">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="flex-1 grid grid-rows-6">
                {monthData.map(({ days }, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-b border-border-color last:border-b-0 min-h-[6rem]">
                        {days.map(day => {
                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                            const eventsOnDay = projectEvents.filter(e => areDatesSame(new Date(e.startDate), day));

                            return (
                                <div key={day.toISOString()} className={`border-r border-border-color p-1.5 last:border-r-0 h-full flex flex-col gap-1 ${isCurrentMonth ? '' : 'bg-background/50 text-text-secondary'}`}>
                                    <span className={`text-xs font-semibold self-end ${areDatesSame(new Date(), day) ? 'bg-primary text-background rounded-full h-5 w-5 flex items-center justify-center' : ''}`}>{day.getDate()}</span>
                                    <div className="flex-1 overflow-y-auto space-y-1">
                                        {eventsOnDay.map(event => {
                                            const task = data.tasks.find(t => t.id === event.sourceId);
                                            return task ? (
                                                <button key={event.id} onClick={() => onEventClick(task)} className="w-full text-left p-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 text-[11px] font-medium truncate">
                                                    {event.title}
                                                </button>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectCalendarView;
