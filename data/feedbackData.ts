import { FeedbackWebsite, FeedbackMockup, FeedbackVideo, FeedbackComment } from '../types';

export let feedbackWebsites: FeedbackWebsite[] = [
    { 
        id: 'web-1', 
        projectId: 'proj-1', 
        name: 'Alpha Platform Staging', 
        url: 'https://react.dev/', 
        isSubscribed: true, 
        isApproved: false,
        description: 'Staging environment for the new React-based alpha platform. Focus on testing core features and responsive design.',
        pages: [
            { id: 'page-1', name: 'Home Page', path: '/' },
            { id: 'page-2', name: 'Learn Section', path: '/learn' },
            { id: 'page-3', name: 'Blog', path: '/blog' },
        ],
        approvedPageIds: ['page-1'],
    },
    { 
        id: 'web-2', 
        projectId: 'proj-1', 
        name: 'Corporate Main Page', 
        url: 'https://google.com/', 
        isSubscribed: false, 
        isApproved: true,
        description: 'The main public-facing corporate website.',
        pages: [],
        approvedPageIds: [],
    },
];

export let feedbackMockups: FeedbackMockup[] = [
    { 
        id: 'mock-1', 
        projectId: 'proj-1', 
        name: 'New Dashboard Design', 
        images: [
            { id: 'img-mock1-1', name: 'anesta-image-copyright-172', url: 'https://picsum.photos/seed/mockup1/1200/800' },
            { id: 'img-mock1-2', name: 'anesta-image-copyright-173', url: 'https://picsum.photos/seed/newmock/1200/800' }
        ],
        description: 'Initial concepts for the new user dashboard, focusing on a cleaner layout and better data visualization.', 
        approvedImageIds: ['img-mock1-1'] 
    },
    { 
        id: 'mock-2', 
        projectId: 'proj-2', 
        name: 'Mobile App Wireframes', 
        images: [
             { id: 'img-mock2-1', name: 'wireframe-login.jpg', url: 'https://picsum.photos/seed/mockup2/400/800' },
             { id: 'img-mock2-2', name: 'wireframe-home.jpg', url: 'https://picsum.photos/seed/mockup3/400/800' }
        ],
        approvedImageIds: [], 
        description: 'Early wireframes for the mobile app redesign project.' 
    },
];

export let feedbackVideos: FeedbackVideo[] = [
    { 
        id: 'vid-collection-1', 
        projectId: 'proj-1', 
        name: 'Onboarding Demos', 
        description: 'A collection of videos demonstrating the new user onboarding process, from sign-up to first action.',
        videos: [
            { id: 'vid-asset-1', name: 'Onboarding Flow v1', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
            { id: 'vid-asset-2', name: 'Dashboard Intro', url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
        ],
        approvedVideoIds: [],
    },
    { 
        id: 'vid-collection-2', 
        projectId: 'proj-2', 
        name: 'Mobile App Flows', 
        description: 'Demonstrations of the primary user flows for the mobile application.',
        videos: [
            { id: 'vid-asset-3', name: 'User Login Flow', url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
        ],
        approvedVideoIds: ['vid-asset-3'],
    },
];

export let feedbackComments: FeedbackComment[] = [
    { 
        id: 'com-1', 
        projectId: 'proj-1', 
        targetId: 'mock-1', 
        imageId: 'img-mock1-1',
        targetType: 'mockup', 
        comment: 'Can we make this button blue?', 
        reporterId: 'user-2',
        assignedId: 'user-1',
        x_coordinate: 250, 
        y_coordinate: 150, 
        status: 'Active', 
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        pin_number: 1,
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString(), // Due in 3 days
        replies: [
            { id: 'rep-1', authorId: 'user-1', text: 'Sure, I will update the design.', timestamp: new Date(Date.now() - 76400000).toISOString() }
        ]
    },
    { 
        id: 'com-3', 
        projectId: 'proj-1', 
        targetId: 'web-1', 
        targetType: 'website', 
        pageUrl: '/learn',
        deviceView: 'desktop',
        comment: 'The header looks a bit off on mobile.', 
        reporterId: 'user-2',
        x_coordinate: 400, 
        y_coordinate: 50, 
        status: 'Active', 
        timestamp: new Date().toISOString(),
        pin_number: 1,
        replies: []
    },
    { 
        id: 'com-4', 
        projectId: 'proj-1', 
        targetId: 'mock-1',
        imageId: 'img-mock1-2',
        targetType: 'mockup', 
        comment: 'I love the new chart component!', 
        reporterId: 'user-1',
        x_coordinate: 600, 
        y_coordinate: 400, 
        status: 'Resolved', 
        timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
        pin_number: 1,
        replies: []
    },
    { 
        id: 'com-video-1', 
        projectId: 'proj-1', 
        targetId: 'vid-collection-1',
        videoAssetId: 'vid-asset-1', 
        targetType: 'video', 
        comment: 'This animation between 8 and 12 seconds is a bit jarring.', 
        reporterId: 'user-1',
        assignedId: 'user-2',
        startTime: 8,
        endTime: 12,
        x_coordinate: 150,
        y_coordinate: 200,
        status: 'Active', 
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        pin_number: 1,
        replies: []
    },
];