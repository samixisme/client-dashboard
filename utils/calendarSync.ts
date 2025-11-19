import { calendar_events } from '../data/calendarData';
import { CalendarEvent, Task, Invoice, Estimate, RoadmapItem, FeedbackComment } from '../types';
import { tasks, roadmapItems } from '../data/mockData';
import { invoices, estimates } from '../data/paymentsData';
import { feedbackComments } from '../data/feedbackData';

type SourceItem = Task | Invoice | Estimate | RoadmapItem | FeedbackComment | Omit<CalendarEvent, 'id'>;
type EventType = 'task' | 'invoice' | 'estimate' | 'roadmap_item' | 'manual' | 'comment';

export const createCalendarEvent = (item: SourceItem, type: EventType): CalendarEvent => {
    let newEvent: Omit<CalendarEvent, 'id'>;

    switch (type) {
        case 'task':
            const task = item as Task;
            if (!task.dueDate) throw new Error("Task must have a due date to be added to calendar.");
            newEvent = {
                title: `Task: ${task.title}`,
                startDate: task.dueDate,
                endDate: task.dueDate,
                type: 'task',
                sourceId: task.id,
                userId: 'user-1'
            };
            break;
        case 'invoice':
            const invoice = item as Invoice;
            newEvent = {
                title: `Invoice #${invoice.invoiceNumber} Due`,
                startDate: invoice.date,
                endDate: invoice.date,
                type: 'invoice',
                sourceId: invoice.id,
                userId: 'user-1'
            };
            break;
         case 'roadmap_item':
            const roadmapItem = item as RoadmapItem;
            newEvent = {
                title: `Roadmap: ${roadmapItem.title}`,
                startDate: roadmapItem.startDate,
                endDate: roadmapItem.endDate,
                type: 'roadmap_item',
                sourceId: roadmapItem.id,
                userId: 'user-1'
            };
            break;
        case 'comment':
            const comment = item as FeedbackComment;
             if (!comment.dueDate) throw new Error("Comment must have a due date.");
            newEvent = {
                title: `Comment #${comment.pin_number}: ${comment.comment.substring(0,30)}...`,
                startDate: comment.dueDate,
                endDate: comment.dueDate,
                type: 'task',
                sourceId: comment.id,
                userId: comment.reporterId
            };
            break;
        case 'manual':
             newEvent = item as Omit<CalendarEvent, 'id'>;
             break;
        // Add cases for estimate if needed
        default:
            throw new Error(`Unsupported event type for creation: ${type}`);
    }
    
    const calendarEvent: CalendarEvent = {
        id: `cal-${type}-${newEvent.sourceId || Date.now()}`,
        ...newEvent
    };

    // Check for duplicates before adding
    const existingIndex = calendar_events.findIndex(e => e.sourceId === calendarEvent.sourceId && e.sourceId !== null);
    if (existingIndex === -1) {
        calendar_events.push(calendarEvent);
    } else {
        console.warn(`Event with sourceId ${calendarEvent.sourceId} already exists. Skipping creation.`);
        // To prevent duplicates on hot-reload, we can update instead.
        calendar_events[existingIndex] = { ...calendar_events[existingIndex], ...calendarEvent, id: calendar_events[existingIndex].id };
    }

    return calendarEvent;
};

export const updateSourceItemDate = (sourceId: string, type: EventType, newDates: { startDate: string; endDate: string }) => {
    switch (type) {
        case 'task': {
            const task = tasks.find(t => t.id === sourceId);
            if (task) {
                task.dueDate = newDates.endDate;
            } else {
                // If not found in tasks, it might be a comment being displayed as a task
                const comment = feedbackComments.find(c => c.id === sourceId);
                if (comment) {
                    comment.dueDate = newDates.endDate;
                }
            }
            break;
        }
        case 'roadmap_item': {
            const item = roadmapItems.find(i => i.id === sourceId);
            if (item) {
                item.startDate = newDates.startDate;
                item.endDate = newDates.endDate;
            }
            break;
        }
        case 'invoice': {
            const item = invoices.find(i => i.id === sourceId);
            if (item) {
                item.date = newDates.startDate;
            }
            break;
        }
        case 'estimate': {
            const item = estimates.find(i => i.id === sourceId);
            if (item) {
                item.date = newDates.startDate;
            }
            break;
        }
        default:
            return;
    }
};

export const updateCalendarEventById = (eventId: string, updates: Partial<CalendarEvent>) => {
    const eventIndex = calendar_events.findIndex(e => e.id === eventId);
    if (eventIndex !== -1) {
        calendar_events[eventIndex] = { ...calendar_events[eventIndex], ...updates };
        console.log(`Updated calendar event with ID: ${eventId}`);
    } else {
        console.warn(`Could not find calendar event with ID: ${eventId} to update.`);
    }
};

export const deleteCalendarEventById = (eventId: string) => {
    const eventIndex = calendar_events.findIndex(e => e.id === eventId);
    if (eventIndex !== -1) {
        calendar_events.splice(eventIndex, 1);
        console.log(`Deleted calendar event with ID: ${eventId}`);
    } else {
        console.warn(`Could not find calendar event with ID: ${eventId} to delete.`);
    }
};

// Backward compatible functions
export const updateCalendarEvent = (sourceId: string, updates: Partial<Omit<CalendarEvent, 'id' | 'sourceId' | 'type'>>) => {
    const event = calendar_events.find(e => e.sourceId === sourceId);
    if (event) {
        updateCalendarEventById(event.id, updates);
    } else {
        console.warn(`Could not find calendar event with sourceId: ${sourceId} to update.`);
    }
};

export const deleteCalendarEvent = (sourceId: string) => {
    const eventIndex = calendar_events.findIndex(e => e.sourceId === sourceId);
    if (eventIndex !== -1) {
        calendar_events.splice(eventIndex, 1);
        console.log(`Deleted calendar event with sourceId: ${sourceId}`);
    } else {
        console.warn(`Could not find calendar event with sourceId: ${sourceId} to delete.`);
    }
};