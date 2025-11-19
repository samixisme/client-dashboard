import { CalendarEvent } from '../types';
import { tasks } from './mockData';
import { invoices, estimates } from './paymentsData';
import { roadmapItems } from './mockData';
import { feedbackComments } from './feedbackData';


export let calendar_events: CalendarEvent[] = [
    // Sync from Tasks
    ...tasks.filter(task => task.dueDate).map(task => ({
        id: `cal-task-${task.id}`,
        title: `Task: ${task.title}`,
        startDate: task.dueDate!,
        endDate: task.dueDate!,
        type: 'task' as const,
        sourceId: task.id,
        userId: 'user-1'
    })),

    // Sync from Invoices
    ...invoices.map(invoice => ({
        id: `cal-inv-${invoice.id}`,
        title: `Invoice #${invoice.invoiceNumber} Due`,
        startDate: invoice.date,
        endDate: invoice.date,
        type: 'invoice' as const,
        sourceId: invoice.id,
        userId: 'user-1'
    })),

    // Sync from Estimates
    ...estimates.map(estimate => ({
        id: `cal-est-${estimate.id}`,
        title: `Estimate #${estimate.estimateNumber}`,
        startDate: estimate.date,
        endDate: estimate.date,
        type: 'estimate' as const,
        sourceId: estimate.id,
        userId: 'user-1'
    })),
    
    // Sync from Roadmap Items
    ...roadmapItems.map(item => ({
        id: `cal-roadmap-${item.id}`,
        title: `Roadmap: ${item.title}`,
        startDate: item.startDate,
        endDate: item.endDate,
        type: 'roadmap_item' as const,
        sourceId: item.id,
        userId: 'user-1'
    })),

    // Sync from Feedback Comments with a due date
    ...feedbackComments.filter(comment => comment.dueDate).map(comment => ({
        id: `cal-comment-${comment.id}`,
        title: `Comment #${comment.pin_number}: ${comment.comment.substring(0, 30)}...`,
        startDate: comment.dueDate!,
        endDate: comment.dueDate!,
        type: 'task' as const, // Display as a task in the calendar
        sourceId: comment.id,
        userId: comment.reporterId, // or a default user
        projectId: comment.projectId
    })),


    // Manual events
    {
        id: 'cal-manual-1',
        title: 'Team Standup',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        type: 'manual',
        sourceId: null,
        userId: 'user-1'
    }
];