import { Moodboard, MoodboardItem } from '../types';

const now = new Date().toISOString();

export let moodboards: Moodboard[] = [
    { id: 'mood-1', projectId: 'proj-1', name: 'Brand Inspiration' },
    { id: 'mood-2', projectId: 'proj-1', name: 'UI Layouts' },
    { id: 'mood-3', projectId: 'proj-2', name: 'Mobile App Concepts' },
];

export let moodboardItems: MoodboardItem[] = [
    // Items for mood-1: Brand Inspiration
    {
        id: 'item-1',
        moodboardId: 'mood-1',
        type: 'text',
        content: { text: 'Focus on clean, minimalist aesthetics.' },
        position: { x: 50, y: 50 },
        size: { width: 250, height: 80 },
        creatorId: 'user-1',
        createdAt: now,
        updatedAt: now,
    },
    {
        id: 'item-2',
        moodboardId: 'mood-1',
        type: 'image',
        content: { imageUrl: 'https://picsum.photos/seed/brand1/400/300' },
        position: { x: 350, y: 80 },
        size: { width: 400, height: 300 },
        creatorId: 'user-2',
        createdAt: now,
        updatedAt: now,
    },
    {
        id: 'item-3',
        moodboardId: 'mood-1',
        type: 'link',
        content: { url: 'https://www.awwwards.com/websites/minimal/' },
        position: { x: 50, y: 180 },
        size: { width: 250, height: 100 },
        creatorId: 'user-1',
        createdAt: now,
        updatedAt: now,
    },
     {
        id: 'item-4',
        moodboardId: 'mood-1',
        type: 'column',
        content: { title: 'Color Palette' },
        position: { x: 800, y: 50 },
        size: { width: 220, height: 400 },
        creatorId: 'user-1',
        createdAt: now,
        updatedAt: now,
    },
     {
        id: 'item-5',
        moodboardId: 'mood-1',
        type: 'text',
        content: { text: '#FFFFFF - Primary White' },
        position: { x: 550, y: 450 }, 
        size: { width: 200, height: 40 },
        parentId: 'item-4',
        creatorId: 'user-2',
        createdAt: now,
        updatedAt: now,
    },
    {
        id: 'item-6',
        moodboardId: 'mood-1',
        type: 'text',
        content: { text: '#111827 - Dark Background' },
        position: { x: 850, y: 500 },
        size: { width: 200, height: 40 },
        parentId: 'item-4',
        creatorId: 'user-2',
        createdAt: now,
        updatedAt: now,
    },
     {
        id: 'item-7',
        moodboardId: 'mood-1',
        type: 'connector',
        content: {},
        position: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
        connector_ends: { start_item_id: 'item-1', end_item_id: 'item-2' },
        creatorId: 'user-1',
        createdAt: now,
        updatedAt: now,
    },

    // Items for mood-2: UI Layouts
    {
        id: 'item-8',
        moodboardId: 'mood-2',
        type: 'text',
        content: { text: 'Dashboard Layout Ideas' },
        position: { x: 20, y: 20 },
        size: { width: 300, height: 50 },
        creatorId: 'user-1',
        createdAt: now,
        updatedAt: now,
    }
];