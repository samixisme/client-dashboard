import { Project, Board, Stage, Task, Tag, Comment, Activity, RoadmapItem, CustomField, BoardNotificationSettings, User, TimeLog } from '../types';

export let projects: Project[] = [
    { id: 'proj-1', brandId: 'brand-1', name: 'JRAG', description: 'A next-generation platform for cloud-native applications.', status: 'Active', createdAt: '2023-10-25T10:00:00.000Z' },
    { id: 'proj-2', brandId: 'brand-1', name: 'Managem', description: 'Developing a new mobile experience for our users.', status: 'Active', createdAt: '2023-09-15T10:00:00.000Z' },
    { id: 'proj-3', brandId: 'brand-2', name: 'Tassaout Media', description: 'Media management and delivery platform.', status: 'Completed', createdAt: '2023-05-20T10:00:00.000Z' },
    { id: 'proj-4', brandId: 'brand-2', name: 'Quantum Leap', description: 'R&D for future AI integrations.', status: 'Active', createdAt: '2023-11-01T10:00:00.000Z' },
    { id: 'proj-5', brandId: 'brand-1', name: 'Website Revamp', description: 'Complete overhaul of the main corporate website.', status: 'Archived', createdAt: '2022-01-10T10:00:00.000Z' },
    { id: 'proj-6', brandId: 'brand-1', name: 'Mobile SDK', description: 'A new SDK for mobile developers.', status: 'Completed', createdAt: '2023-11-05T10:00:00.000Z' },
];

export let boards: Board[] = [
    { id: 'board-1', projectId: 'proj-1', name: 'JRAG', is_pinned: true, background_image: '', member_ids: ['user-1', 'user-2'] },
    { id: 'board-2', projectId: 'proj-2', name: 'Managem', is_pinned: true, background_image: '', member_ids: ['user-1', 'user-2'] },
    { id: 'board-3', projectId: 'proj-3', name: 'Tassaout Media', is_pinned: true, background_image: '', member_ids: ['user-1'] },
    { id: 'board-4', projectId: 'proj-4', name: 'Quantum Leap Board', is_pinned: false, background_image: '', member_ids: ['user-1'] },
    { id: 'board-5', projectId: 'proj-5', name: 'Website Revamp Board', is_pinned: false, background_image: '', member_ids: ['user-2'] },
    { id: 'board-6', projectId: 'proj-6', name: 'Mobile SDK Board', is_pinned: false, background_image: '', member_ids: ['user-1', 'user-2'] },
];

export let stages: Stage[] = [
    { id: 'stage-1', boardId: 'board-1', name: 'Open', order: 1, status: 'Open' },
    { id: 'stage-2', boardId: 'board-1', name: 'In Progress', order: 2, status: 'Open' },
    { id: 'stage-3', boardId: 'board-1', name: 'Completed', order: 3, status: 'Open' },

    // Add default stages for other boards
    { id: 'stage-b2-1', boardId: 'board-2', name: 'Open', order: 1, status: 'Open' },
    { id: 'stage-b2-2', boardId: 'board-2', name: 'In Progress', order: 2, status: 'Open' },
    { id: 'stage-b2-3', boardId: 'board-2', name: 'Completed', order: 3, status: 'Open' },

    { id: 'stage-b3-1', boardId: 'board-3', name: 'Open', order: 1, status: 'Open' },
    { id: 'stage-b3-2', boardId: 'board-3', name: 'In Progress', order: 2, status: 'Open' },
    { id: 'stage-b3-3', boardId: 'board-3', name: 'Completed', order: 3, status: 'Open' },

    { id: 'stage-b4-1', boardId: 'board-4', name: 'Open', order: 1, status: 'Open' },
    { id: 'stage-b4-2', boardId: 'board-4', name: 'In Progress', order: 2, status: 'Open' },
    { id: 'stage-b4-3', boardId: 'board-4', name: 'Completed', order: 3, status: 'Open' },
    
    { id: 'stage-b5-1', boardId: 'board-5', name: 'Open', order: 1, status: 'Open' },
    { id: 'stage-b5-2', boardId: 'board-5', name: 'In Progress', order: 2, status: 'Open' },
    { id: 'stage-b5-3', boardId: 'board-5', name: 'Completed', order: 3, status: 'Open' },

    { id: 'stage-b6-1', boardId: 'board-6', name: 'Open', order: 1, status: 'Open' },
    { id: 'stage-b6-2', boardId: 'board-6', name: 'In Progress', order: 2, status: 'Open' },
    { id: 'stage-b6-3', boardId: 'board-6', name: 'Completed', order: 3, status: 'Open' },
];

export let tags: Tag[] = [
    { id: 'tag-1', boardId: 'board-1', name: 'Bug', color: '#ef4444' },
    { id: 'tag-2', boardId: 'board-1', name: 'Feature', color: '#3b82f6' },
    { id: 'tag-3', boardId: 'board-1', name: 'Graphic Designer', color: '#22c55e' },
];

export let tasks: Task[] = [
    { 
        id: 'task-1', 
        boardId: 'board-1', 
        stageId: 'stage-2', 
        title: 'Logo', 
        description: 'Add a more detailed description here...', 
        priority: 'Low', 
        dateAssigned: new Date().toISOString(), 
        assignees: ['user-2'], 
        labelIds: ['tag-3', 'tag-2'], 
        start_date: '2025-01-02T00:00:00.000Z', 
        dueDate: '2025-01-05T23:59:59.000Z', 
        attachments: [{ id: 'att-1', name: 'brief.pdf', url: '#', type: 'pdf' }], 
        cover_image: '', 
        createdAt: new Date('2025-10-20T10:00:00Z').toISOString(), 
        roadmapItemId: 'roadmap-2', 
        order: 1,
        timeEstimation: 240, // 4 hours in minutes
        recurring: {
            frequency: 'weekly',
            interval: 1,
            nextDueDate: new Date('2025-01-12T23:59:59.000Z').toISOString(),
            repeatInStageId: 'stage-1',
            repeatOnlyWhenCompleted: false,
        }
    },
    { id: 'task-2', boardId: 'board-1', stageId: 'stage-1', title: 'Setup Database', description: '', priority: 'High', dateAssigned: new Date().toISOString(), assignees: ['user-1'], labelIds: ['tag-2'], attachments: [], createdAt: new Date('2025-10-22T12:00:00Z').toISOString(), roadmapItemId: 'roadmap-be-1', start_date: '2025-01-01T00:00:00.000Z', dueDate: '2025-01-04T23:59:59.000Z', order: 1 },
    { id: 'task-3', boardId: 'board-1', stageId: 'stage-1', title: 'API Authentication', description: '', priority: 'Medium', dateAssigned: new Date().toISOString(), assignees: ['user-1'], labelIds: ['tag-2'], attachments: [], createdAt: new Date('2025-10-21T15:00:00Z').toISOString(), roadmapItemId: 'roadmap-be-1', start_date: '2025-01-05T00:00:00.000Z', dueDate: '2025-01-07T23:59:59.000Z', order: 2 },
    // New tasks converted from old roadmap items
    { id: 'task-gantt-1', boardId: 'board-1', stageId: 'stage-1', title: 'My Work Area', description: '', priority: 'Medium', dateAssigned: new Date().toISOString(), assignees: ['user-1'], labelIds: [], start_date: '2025-01-02T00:00:00.000Z', dueDate: '2025-01-05T23:59:59.000Z', attachments: [], createdAt: new Date().toISOString(), roadmapItemId: 'roadmap-2', order: 2 },
    { id: 'task-gantt-2', boardId: 'board-1', stageId: 'stage-1', title: 'Project Overview', description: '', priority: 'Medium', dateAssigned: new Date().toISOString(), assignees: ['user-2'], labelIds: [], start_date: '2025-01-03T00:00:00.000Z', dueDate: '2025-01-08T23:59:59.000Z', attachments: [], createdAt: new Date().toISOString(), roadmapItemId: 'roadmap-2', order: 3 },
    { id: 'task-gantt-3', boardId: 'board-1', stageId: 'stage-1', title: 'Board', description: '', priority: 'Medium', dateAssigned: new Date().toISOString(), assignees: ['user-1'], labelIds: [], start_date: '2025-01-06T00:00:00.000Z', dueDate: '2025-01-08T23:59:59.000Z', attachments: [], createdAt: new Date().toISOString(), roadmapItemId: 'roadmap-2', order: 4 },
    { id: 'task-gantt-4', boardId: 'board-1', stageId: 'stage-1', title: 'Task List View', description: '', priority: 'Medium', dateAssigned: new Date().toISOString(), assignees: ['user-2'], labelIds: [], start_date: '2025-01-04T00:00:00.000Z', dueDate: '2025-01-08T23:59:59.000Z', attachments: [], createdAt: new Date().toISOString(), roadmapItemId: 'roadmap-2', order: 5 },
    { id: 'task-gantt-5', boardId: 'board-1', stageId: 'stage-1', title: 'Timeline', description: '', priority: 'Medium', dateAssigned: new Date().toISOString(), assignees: ['user-1'], labelIds: [], start_date: '2025-01-07T00:00:00.000Z', dueDate: '2025-01-11T23:59:59.000Z', attachments: [], createdAt: new Date().toISOString(), roadmapItemId: 'roadmap-2', order: 6 },
    { id: 'task-gantt-6', boardId: 'board-1', stageId: 'stage-1', title: 'Messages', description: '', priority: 'Medium', dateAssigned: new Date().toISOString(), assignees: ['user-2'], labelIds: [], start_date: '2025-01-07T00:00:00.000Z', dueDate: '2025-01-09T23:59:59.000Z', attachments: [], createdAt: new Date().toISOString(), roadmapItemId: 'roadmap-2', order: 7 },
    { id: 'task-gantt-7', boardId: 'board-1', stageId: 'stage-1', title: 'Front-end Implementation', description: '', priority: 'High', dateAssigned: new Date().toISOString(), assignees: ['user-1', 'user-2'], labelIds: ['tag-2'], start_date: '2025-01-09T00:00:00.000Z', dueDate: '2025-01-15T23:59:59.000Z', attachments: [], createdAt: new Date().toISOString(), roadmapItemId: 'roadmap-fe-1', order: 1 }
];

export let time_logs: TimeLog[] = [
    { id: 'log-1', taskId: 'task-1', userId: 'user-2', duration: 3600, date: new Date().toISOString() } // 1 hour
];

export let comments: Comment[] = [
    { id: 'comment-1', taskId: 'task-1', boardId: 'board-1', author: 'admin', text: 'joined Task.', timestamp: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 'comment-roadmap-1', roadmapItemId: 'roadmap-2', author: 'admin', text: 'Kicking off the design phase, please see attached spec.', timestamp: new Date(Date.now() - 10 * 86400000).toISOString() },
];

export let activities: Activity[] = [
    { id: 'activity-1', objectId: 'task-1', objectType: 'task', description: 'admin changed Due Date from 25 Oct, 2025 @ 10:30 am to 26 Oct, 2025 @ 10:45 am.', timestamp: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 'activity-roadmap-1', objectId: 'roadmap-2', objectType: 'roadmap_item', description: 'admin changed End Date from 15 Jan, 2025 to 16 Jan, 2025.', timestamp: new Date(Date.now() - 15 * 86400000).toISOString() },
    { 
        id: 'activity-video-1', 
        objectId: 'com-video-1', // Corresponds to the new video comment
        objectType: 'comment',
        description: 'admin commented on video "Onboarding Flow Demo"', 
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        comment_timestamp_seconds: 8,
        video_screenshot_url: 'https://picsum.photos/seed/vidscreen/200/112'
    },
];

export let roadmapItems: RoadmapItem[] = [
    // Top-level roadmap items for projectId: 'proj-1'
    { id: 'roadmap-1', projectId: 'proj-1', title: 'Research', description: '', status: 'Completed', startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-01-04T23:59:59.000Z', assignees: [], order: 1, attachments: [], labelIds: [] },
    { id: 'roadmap-2', projectId: 'proj-1', title: 'Design', description: 'Detailed design phase for all components. The goal is to have a complete set of high-fidelity mockups ready for development.', status: 'In Progress', startDate: '2025-01-02T00:00:00.000Z', endDate: '2025-01-16T23:59:59.000Z', assignees: ['user-2'], order: 2, attachments: [{ id: 'att-roadmap-1', name: 'design-spec.pdf', url: '#', type: 'pdf' }], labelIds: ['tag-2'] },
    { id: 'roadmap-fe-1', projectId: 'proj-1', title: 'Front-end dev', description: '', status: 'Planned', startDate: '2025-01-09T00:00:00.000Z', endDate: '2025-01-15T23:59:59.000Z', assignees: [], order: 3, attachments: [], labelIds: [] },
    { id: 'roadmap-be-1', projectId: 'proj-1', title: 'Back-end dev', description: '', status: 'Planned', startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-01-07T23:59:59.000Z', assignees: [], order: 4, attachments: [], labelIds: [] },

    // Existing data for other projects
    { id: 'roadmap-other-1', projectId: 'proj-2', title: 'Mobile Beta Launch', description: 'Launch beta to early adopters.', status: 'In Progress', startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-02-28T23:59:59.000Z', order: 1, attachments: [], labelIds: [] },
];


export let custom_fields: CustomField[] = [
    { id: 'cf-1', boardId: 'board-1', name: 'CRM Contact', type: 'dropdown' }
];

export let board_notification_settings: BoardNotificationSettings[] = [
    { id: 'bns-1', userId: 'user-1', boardId: 'board-1', comment: true, stage_changed: true, assigned: true, dates: true, archived: true, removed: true }
];

export let users: User[] = [
    { id: 'user-1', name: 'Alex Doe', avatarUrl: 'https://i.pravatar.cc/150?u=user-1' },
    { id: 'user-2', name: 'Jane Smith', avatarUrl: 'https://i.pravatar.cc/150?u=user-2' },
];