/**
 * seedFirestore.ts
 *
 * OPTIONAL development utility — DO NOT run in production unless you want
 * to restore a known baseline (e.g. after wiping Firestore during dev).
 *
 * The app works 100% without running this script. All data is created
 * through the UI and stored in Firestore in real-time.
 *
 * Only use this script if you want to pre-populate a fresh Firestore
 * database with placeholder data for development/testing purposes.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/key.json npm run seed
 *
 * Safety:
 *   - Writes use { merge: true } — existing real data is never overwritten.
 *   - Fully idempotent, safe to re-run.
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Init Admin SDK ────────────────────────────────────────────────────────────
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  '/home/clientdash/.firebase-admin.json';

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌  Service account not found at: ${serviceAccountPath}`);
  console.error('    Set FIREBASE_SERVICE_ACCOUNT_PATH or place the file there.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://client-dashboard-v2-default-rtdb.europe-west1.firebasedatabase.app',
});

const db = admin.firestore();

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Write a batch of docs to a collection, skipping existing ones (merge). */
async function seedCollection(
  collectionName: string,
  docs: Array<{ id: string; [key: string]: unknown }>,
  options: { overwrite?: boolean } = {}
) {
  if (docs.length === 0) return;

  // Firestore batches are limited to 500 ops
  const chunks: Array<typeof docs> = [];
  for (let i = 0; i < docs.length; i += 400) {
    chunks.push(docs.slice(i, i + 400));
  }

  let written = 0;
  for (const chunk of chunks) {
    const batch = db.batch();
    for (const { id, ...data } of chunk) {
      const ref = db.collection(collectionName).doc(id);
      if (options.overwrite) {
        batch.set(ref, data);
      } else {
        batch.set(ref, data, { merge: true });
      }
      written++;
    }
    await batch.commit();
  }

  console.log(`  ✅  ${collectionName.padEnd(25)} → ${written} docs seeded`);
}

/** Write a single document (e.g. userSettings). */
async function seedDocument(
  docPath: string,
  data: Record<string, unknown>,
  options: { overwrite?: boolean } = {}
) {
  const ref = db.doc(docPath);
  if (options.overwrite) {
    await ref.set(data);
  } else {
    await ref.set(data, { merge: true });
  }
  console.log(`  ✅  ${docPath.padEnd(40)} → seeded`);
}

// ─── Seed Data (formerly in data/*.ts) ────────────────────────────────────────

const NOW = new Date().toISOString();

// ── users ──────────────────────────────────────────────────────────────────────
const users = [
  { id: 'user-1', name: 'Alex Doe',   avatarUrl: 'https://i.pravatar.cc/150?u=user-1', email: '' },
  { id: 'user-2', name: 'Jane Smith', avatarUrl: 'https://i.pravatar.cc/150?u=user-2', email: '' },
];

// ── brands ─────────────────────────────────────────────────────────────────────
const brands = [
  {
    id: 'brand-1',
    name: 'Starlight Inc.',
    createdAt: new Date('2023-01-15T10:00:00.000Z').toISOString(),
    memberIds: ['user-1', 'user-2'],
    logos: [
      { type: 'Full Logo',  variation: 'Color',            formats: [{ format: 'svg', url: '' }, { format: 'png', url: '' }] },
      { type: 'Logomark',   variation: 'Color',            formats: [{ format: 'svg', url: '' }, { format: 'png', url: '' }] },
      { type: 'Logotype',   variation: 'Color',            formats: [{ format: 'svg', url: '' }] },
      { type: 'Full Logo',  variation: 'Dark Background',  formats: [{ format: 'svg', url: '' }, { format: 'png', url: '' }] },
      { type: 'Full Logo',  variation: 'White Background', formats: [{ format: 'svg', url: '' }, { format: 'png', url: '' }] },
      { type: 'Full Logo',  variation: 'Grayscale',        formats: [{ format: 'svg', url: '' }, { format: 'png', url: '' }] },
    ],
    colors: [
      { name: 'Primary Neon',    type: 'Primary',   hex: '#a3e635', rgb: '163, 230, 53',  hsl: '84, 76%, 55%',   cmyk: '29, 0, 77, 10' },
      { name: 'Background Dark', type: 'Primary',   hex: '#111827', rgb: '17, 24, 39',    hsl: '215, 39%, 11%',  cmyk: '56, 38, 0, 85' },
      { name: 'Surface Gray',    type: 'Secondary', hex: '#1f2937', rgb: '31, 41, 55',    hsl: '215, 28%, 17%',  cmyk: '44, 25, 0, 78' },
      { name: 'Text Primary',    type: 'Secondary', hex: '#f9fafb', rgb: '249, 250, 251', hsl: '210, 17%, 98%',  cmyk: '1, 0, 0, 2'    },
    ],
    fonts: [
      {
        name: 'Inter', type: 'Primary', url: 'https://fonts.google.com/specimen/Inter',
        styles: [
          { name: 'H1 / Headline 1', size: '96px', weight: '300', letterSpacing: '-1.5px', lineHeight: '112px' },
          { name: 'H2 / Headline 2', size: '60px', weight: '300', letterSpacing: '-0.5px', lineHeight: '72px'  },
          { name: 'H3 / Headline 3', size: '48px', weight: '400', letterSpacing: '0px',    lineHeight: '56px'  },
          { name: 'Body 1',          size: '16px', weight: '400', letterSpacing: '0.5px',  lineHeight: '24px'  },
          { name: 'Body 2',          size: '14px', weight: '400', letterSpacing: '0.25px', lineHeight: '20px'  },
        ],
      },
      {
        name: 'Roboto Mono', type: 'Secondary', url: 'https://fonts.google.com/specimen/Roboto+Mono',
        styles: [
          { name: 'Code Snippet', size: '14px', weight: '400', letterSpacing: '0.1px', lineHeight: '20px' },
          { name: 'Caption',      size: '12px', weight: '400', letterSpacing: '0.4px', lineHeight: '16px' },
        ],
      },
    ],
    brandVoice: '**Confident & Competent:** We are experts in our field, and our language reflects that.',
    brandPositioning: 'For growing tech companies that need to scale their infrastructure.',
    imagery: [],
    graphics: [],
  },
  {
    id: 'brand-2',
    name: 'Aperture Labs',
    createdAt: new Date('2023-05-20T10:00:00.000Z').toISOString(),
    memberIds: ['user-1'],
    logos: [
      { type: 'Full Logo', variation: 'Color', formats: [{ format: 'svg', url: '' }] },
    ],
    colors: [
      { name: 'Warning Amber', type: 'Primary', hex: '#f59e0b', rgb: '245, 158, 11', hsl: '38, 92%, 50%', cmyk: '0, 36, 96, 4' },
    ],
    fonts: [],
    brandVoice: '',
    brandPositioning: '',
    imagery: [],
    graphics: [],
  },
];

// ── projects ───────────────────────────────────────────────────────────────────
const projects = [
  { id: 'proj-1', brandId: 'brand-1', name: 'JRAG',           description: 'A next-generation platform for cloud-native applications.', status: 'Active',    createdAt: '2023-10-25T10:00:00.000Z', memberIds: [] },
  { id: 'proj-2', brandId: 'brand-1', name: 'Managem',        description: 'Developing a new mobile experience for our users.',         status: 'Active',    createdAt: '2023-09-15T10:00:00.000Z', memberIds: [] },
  { id: 'proj-3', brandId: 'brand-2', name: 'Tassaout Media', description: 'Media management and delivery platform.',                   status: 'Completed', createdAt: '2023-05-20T10:00:00.000Z', memberIds: [] },
  { id: 'proj-4', brandId: 'brand-2', name: 'Quantum Leap',   description: 'R&D for future AI integrations.',                          status: 'Active',    createdAt: '2023-11-01T10:00:00.000Z', memberIds: [] },
  { id: 'proj-5', brandId: 'brand-1', name: 'Website Revamp', description: 'Complete overhaul of the main corporate website.',         status: 'Archived',  createdAt: '2022-01-10T10:00:00.000Z', memberIds: [] },
  { id: 'proj-6', brandId: 'brand-1', name: 'Mobile SDK',     description: 'A new SDK for mobile developers.',                         status: 'Completed', createdAt: '2023-11-05T10:00:00.000Z', memberIds: [] },
];

// ── boards ─────────────────────────────────────────────────────────────────────
const boards = [
  { id: 'board-1', projectId: 'proj-1', name: 'JRAG',              is_pinned: true,  background_image: '', member_ids: ['user-1', 'user-2'] },
  { id: 'board-2', projectId: 'proj-2', name: 'Managem',           is_pinned: true,  background_image: '', member_ids: ['user-1', 'user-2'] },
  { id: 'board-3', projectId: 'proj-3', name: 'Tassaout Media',    is_pinned: true,  background_image: '', member_ids: ['user-1'] },
  { id: 'board-4', projectId: 'proj-4', name: 'Quantum Leap Board',is_pinned: false, background_image: '', member_ids: ['user-1'] },
  { id: 'board-5', projectId: 'proj-5', name: 'Website Revamp Board', is_pinned: false, background_image: '', member_ids: ['user-2'] },
  { id: 'board-6', projectId: 'proj-6', name: 'Mobile SDK Board',  is_pinned: false, background_image: '', member_ids: ['user-1', 'user-2'] },
];

// ── stages ─────────────────────────────────────────────────────────────────────
const makeStages = (boardId: string, prefix: string) => [
  { id: `${prefix}-1`, boardId, name: 'Open',        order: 1, status: 'Open' },
  { id: `${prefix}-2`, boardId, name: 'In Progress', order: 2, status: 'Open' },
  { id: `${prefix}-3`, boardId, name: 'Completed',   order: 3, status: 'Open' },
];

const stages = [
  ...makeStages('board-1', 'stage'),
  ...makeStages('board-2', 'stage-b2'),
  ...makeStages('board-3', 'stage-b3'),
  ...makeStages('board-4', 'stage-b4'),
  ...makeStages('board-5', 'stage-b5'),
  ...makeStages('board-6', 'stage-b6'),
];

// ── tags ───────────────────────────────────────────────────────────────────────
const tags = [
  { id: 'tag-1', boardId: 'board-1', name: 'Bug',              color: '#ef4444' },
  { id: 'tag-2', boardId: 'board-1', name: 'Feature',          color: '#3b82f6' },
  { id: 'tag-3', boardId: 'board-1', name: 'Graphic Designer', color: '#22c55e' },
];

// ── tasks ──────────────────────────────────────────────────────────────────────
const tasks = [
  {
    id: 'task-1', boardId: 'board-1', stageId: 'stage-2',
    title: 'Logo', description: 'Add a more detailed description here...',
    priority: 'Low', dateAssigned: NOW, assignees: ['user-2'],
    labelIds: ['tag-3', 'tag-2'],
    start_date: '2025-01-02T00:00:00.000Z', dueDate: '2025-01-05T23:59:59.000Z',
    attachments: [], cover_image: '', createdAt: '2025-10-20T10:00:00.000Z',
    roadmapItemId: 'roadmap-2', order: 1, timeEstimation: 240,
    recurring: {
      frequency: 'weekly', interval: 1,
      nextDueDate: '2025-01-12T23:59:59.000Z',
      repeatInStageId: 'stage-1', repeatOnlyWhenCompleted: false,
    },
  },
  { id: 'task-2', boardId: 'board-1', stageId: 'stage-1', title: 'Setup Database',    description: '', priority: 'High',   dateAssigned: NOW, assignees: ['user-1'], labelIds: ['tag-2'], attachments: [], createdAt: '2025-10-22T12:00:00.000Z', roadmapItemId: 'roadmap-be-1', start_date: '2025-01-01T00:00:00.000Z', dueDate: '2025-01-04T23:59:59.000Z', order: 1 },
  { id: 'task-3', boardId: 'board-1', stageId: 'stage-1', title: 'API Authentication', description: '', priority: 'Medium', dateAssigned: NOW, assignees: ['user-1'], labelIds: ['tag-2'], attachments: [], createdAt: '2025-10-21T15:00:00.000Z', roadmapItemId: 'roadmap-be-1', start_date: '2025-01-05T00:00:00.000Z', dueDate: '2025-01-07T23:59:59.000Z', order: 2 },
  { id: 'task-gantt-1', boardId: 'board-1', stageId: 'stage-1', title: 'My Work Area',         description: '', priority: 'Medium', dateAssigned: NOW, assignees: ['user-1'], labelIds: [], start_date: '2025-01-02T00:00:00.000Z', dueDate: '2025-01-05T23:59:59.000Z', attachments: [], createdAt: NOW, roadmapItemId: 'roadmap-2', order: 2 },
  { id: 'task-gantt-2', boardId: 'board-1', stageId: 'stage-1', title: 'Project Overview',     description: '', priority: 'Medium', dateAssigned: NOW, assignees: ['user-2'], labelIds: [], start_date: '2025-01-03T00:00:00.000Z', dueDate: '2025-01-08T23:59:59.000Z', attachments: [], createdAt: NOW, roadmapItemId: 'roadmap-2', order: 3 },
  { id: 'task-gantt-3', boardId: 'board-1', stageId: 'stage-1', title: 'Board',                description: '', priority: 'Medium', dateAssigned: NOW, assignees: ['user-1'], labelIds: [], start_date: '2025-01-06T00:00:00.000Z', dueDate: '2025-01-08T23:59:59.000Z', attachments: [], createdAt: NOW, roadmapItemId: 'roadmap-2', order: 4 },
  { id: 'task-gantt-4', boardId: 'board-1', stageId: 'stage-1', title: 'Task List View',       description: '', priority: 'Medium', dateAssigned: NOW, assignees: ['user-2'], labelIds: [], start_date: '2025-01-04T00:00:00.000Z', dueDate: '2025-01-08T23:59:59.000Z', attachments: [], createdAt: NOW, roadmapItemId: 'roadmap-2', order: 5 },
  { id: 'task-gantt-5', boardId: 'board-1', stageId: 'stage-1', title: 'Timeline',             description: '', priority: 'Medium', dateAssigned: NOW, assignees: ['user-1'], labelIds: [], start_date: '2025-01-07T00:00:00.000Z', dueDate: '2025-01-11T23:59:59.000Z', attachments: [], createdAt: NOW, roadmapItemId: 'roadmap-2', order: 6 },
  { id: 'task-gantt-6', boardId: 'board-1', stageId: 'stage-1', title: 'Messages',             description: '', priority: 'Medium', dateAssigned: NOW, assignees: ['user-2'], labelIds: [], start_date: '2025-01-07T00:00:00.000Z', dueDate: '2025-01-09T23:59:59.000Z', attachments: [], createdAt: NOW, roadmapItemId: 'roadmap-2', order: 7 },
  { id: 'task-gantt-7', boardId: 'board-1', stageId: 'stage-1', title: 'Front-end Implementation', description: '', priority: 'High', dateAssigned: NOW, assignees: ['user-1', 'user-2'], labelIds: ['tag-2'], start_date: '2025-01-09T00:00:00.000Z', dueDate: '2025-01-15T23:59:59.000Z', attachments: [], createdAt: NOW, roadmapItemId: 'roadmap-fe-1', order: 1 },
];

// ── time_logs ──────────────────────────────────────────────────────────────────
const time_logs = [
  { id: 'log-1', taskId: 'task-1', userId: 'user-2', duration: 3600, date: NOW },
];

// ── comments ───────────────────────────────────────────────────────────────────
const comments = [
  { id: 'comment-1',       taskId: 'task-1',      boardId: 'board-1', author: 'admin', text: 'joined Task.',                                         timestamp: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'comment-roadmap-1', roadmapItemId: 'roadmap-2',             author: 'admin', text: 'Kicking off the design phase, please see attached spec.', timestamp: new Date(Date.now() - 10 * 86400000).toISOString() },
];

// ── activities ─────────────────────────────────────────────────────────────────
const activities = [
  { id: 'activity-1',       objectId: 'task-1',     objectType: 'task',          description: 'admin changed Due Date.',                                       timestamp: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'activity-roadmap-1', objectId: 'roadmap-2', objectType: 'roadmap_item', description: 'admin changed End Date from 15 Jan, 2025 to 16 Jan, 2025.',     timestamp: new Date(Date.now() - 15 * 86400000).toISOString() },
];

// ── roadmap ────────────────────────────────────────────────────────────────────
const roadmapItems = [
  { id: 'roadmap-1',     projectId: 'proj-1', title: 'Research',      description: '',                     status: 'Completed',  startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-01-04T23:59:59.000Z', assignees: [],          order: 1, attachments: [], labelIds: [] },
  { id: 'roadmap-2',     projectId: 'proj-1', title: 'Design',        description: 'Detailed design phase.', status: 'In Progress', startDate: '2025-01-02T00:00:00.000Z', endDate: '2025-01-16T23:59:59.000Z', assignees: ['user-2'], order: 2, attachments: [], labelIds: ['tag-2'] },
  { id: 'roadmap-fe-1',  projectId: 'proj-1', title: 'Front-end dev', description: '',                     status: 'Planned',     startDate: '2025-01-09T00:00:00.000Z', endDate: '2025-01-15T23:59:59.000Z', assignees: [],          order: 3, attachments: [], labelIds: [] },
  { id: 'roadmap-be-1',  projectId: 'proj-1', title: 'Back-end dev',  description: '',                     status: 'Planned',     startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-01-07T23:59:59.000Z', assignees: [],          order: 4, attachments: [], labelIds: [] },
  { id: 'roadmap-other-1', projectId: 'proj-2', title: 'Mobile Beta Launch', description: 'Launch beta.', status: 'In Progress', startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-02-28T23:59:59.000Z', order: 1, attachments: [], labelIds: [] },
];

// ── moodboards ─────────────────────────────────────────────────────────────────
const moodboards = [
  { id: 'mood-1', projectId: 'proj-1', name: 'Brand Inspiration' },
  { id: 'mood-2', projectId: 'proj-1', name: 'UI Layouts'        },
  { id: 'mood-3', projectId: 'proj-2', name: 'Mobile App Concepts' },
];

const moodboardItems = [
  { id: 'item-1', moodboardId: 'mood-1', type: 'text',    content: { text: 'Focus on clean, minimalist aesthetics.' },           position: { x: 50,  y: 50  }, size: { width: 250, height: 80  }, creatorId: 'user-1', createdAt: NOW, updatedAt: NOW },
  { id: 'item-2', moodboardId: 'mood-1', type: 'image',   content: { imageUrl: '' },                                             position: { x: 350, y: 80  }, size: { width: 400, height: 300 }, creatorId: 'user-2', createdAt: NOW, updatedAt: NOW },
  { id: 'item-3', moodboardId: 'mood-1', type: 'link',    content: { url: 'https://www.awwwards.com/websites/minimal/' },        position: { x: 50,  y: 180 }, size: { width: 250, height: 100 }, creatorId: 'user-1', createdAt: NOW, updatedAt: NOW },
  { id: 'item-4', moodboardId: 'mood-1', type: 'column',  content: { title: 'Color Palette' },                                   position: { x: 800, y: 50  }, size: { width: 220, height: 400 }, creatorId: 'user-1', createdAt: NOW, updatedAt: NOW },
  { id: 'item-8', moodboardId: 'mood-2', type: 'text',    content: { text: 'Dashboard Layout Ideas' },                           position: { x: 20,  y: 20  }, size: { width: 300, height: 50  }, creatorId: 'user-1', createdAt: NOW, updatedAt: NOW },
];

// ── feedbackWebsites / mockups / videos / comments ─────────────────────────────
// Stored in root collections so DataContext collectionGroup query picks them up.
const feedbackWebsites = [
  {
    id: 'web-1', projectId: 'proj-1', type: 'website',
    name: 'Alpha Platform Staging', url: 'https://react.dev/', isSubscribed: true, isApproved: false,
    description: 'Staging environment for the new React-based alpha platform.',
    pages: [{ id: 'page-1', name: 'Home Page', path: '/' }, { id: 'page-2', name: 'Learn Section', path: '/learn' }],
    approvedPageIds: ['page-1'],
  },
  {
    id: 'web-2', projectId: 'proj-1', type: 'website',
    name: 'Corporate Main Page', url: 'https://google.com/', isSubscribed: false, isApproved: true,
    description: 'The main public-facing corporate website.',
    pages: [], approvedPageIds: [],
  },
];

const feedbackMockups = [
  {
    id: 'mock-1', projectId: 'proj-1', type: 'mockup',
    name: 'New Dashboard Design',
    images: [{ id: 'img-mock1-1', name: 'dashboard-v1.png', url: '' }, { id: 'img-mock1-2', name: 'dashboard-v2.png', url: '' }],
    description: 'Initial concepts for the new user dashboard.',
    approvedImageIds: ['img-mock1-1'],
  },
  {
    id: 'mock-2', projectId: 'proj-2', type: 'mockup',
    name: 'Mobile App Wireframes',
    images: [{ id: 'img-mock2-1', name: 'wireframe-login.jpg', url: '' }, { id: 'img-mock2-2', name: 'wireframe-home.jpg', url: '' }],
    approvedImageIds: [],
    description: 'Early wireframes for the mobile app redesign project.',
  },
];

const feedbackVideos = [
  {
    id: 'vid-collection-1', projectId: 'proj-1', type: 'video',
    name: 'Onboarding Demos',
    description: 'A collection of videos demonstrating the new user onboarding process.',
    videos: [{ id: 'vid-asset-1', name: 'Onboarding Flow v1', url: '' }, { id: 'vid-asset-2', name: 'Dashboard Intro', url: '' }],
    approvedVideoIds: [],
  },
  {
    id: 'vid-collection-2', projectId: 'proj-2', type: 'video',
    name: 'Mobile App Flows',
    description: 'Demonstrations of the primary user flows for the mobile application.',
    videos: [{ id: 'vid-asset-3', name: 'User Login Flow', url: '' }],
    approvedVideoIds: ['vid-asset-3'],
  },
];

const feedbackComments = [
  {
    id: 'com-1', projectId: 'proj-1', targetId: 'mock-1', imageId: 'img-mock1-1', targetType: 'mockup',
    comment: 'Can we make this button blue?', reporterId: 'user-2', assignedId: 'user-1',
    x_coordinate: 250, y_coordinate: 150, status: 'Active',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    pin_number: 1, dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    replies: [{ id: 'rep-1', authorId: 'user-1', text: 'Sure, I will update the design.', timestamp: new Date(Date.now() - 76400000).toISOString() }],
  },
  {
    id: 'com-3', projectId: 'proj-1', targetId: 'web-1', targetType: 'website', pageUrl: '/learn', deviceView: 'desktop',
    comment: 'The header looks a bit off on mobile.', reporterId: 'user-2',
    x_coordinate: 400, y_coordinate: 50, status: 'Active',
    timestamp: NOW, pin_number: 1, replies: [],
  },
  {
    id: 'com-video-1', projectId: 'proj-1', targetId: 'vid-collection-1', videoAssetId: 'vid-asset-1', targetType: 'video',
    comment: 'This animation between 8 and 12 seconds is a bit jarring.',
    reporterId: 'user-1', assignedId: 'user-2',
    startTime: 8, endTime: 12, x_coordinate: 150, y_coordinate: 200,
    status: 'Active', timestamp: new Date(Date.now() - 3600000).toISOString(),
    pin_number: 1, replies: [],
  },
];

// ── payments: clients / invoices / estimates ───────────────────────────────────
const clients = [
  { id: 'client-1', userId: 'user-1', brandId: 'brand-1', name: 'Innovate SARL',          adresse: '456 Tech Park, Rabat',          ice: '998877665544332', rc: 'RC12345', if: '87654321' },
  { id: 'client-2', userId: 'user-1', brandId: 'brand-2', name: 'Creative Minds Agency',  adresse: '789 Design Hub, Marrakech',      ice: '112233445566778', rc: 'RC67890', if: '11223344' },
];

const invoices = [
  {
    id: 'inv-1', userId: 'user-1', clientId: 'client-1', invoiceNumber: '2024-001',
    date: new Date('2024-07-15').toISOString(), status: 'Paid',
    itemCategories: [{ id: 'cat-1', name: 'Développement Web', items: [
      { id: 'item-1', name: 'Conception UI/UX',          quantity: 20, unitPrice: 500 },
      { id: 'item-2', name: 'Développement Frontend',    quantity: 40, unitPrice: 600 },
    ]}],
    note: 'Merci pour votre confiance.', terms: 'Paiement à 30 jours.',
    totals: { subtotal: 34000, totalNet: 34000 },
  },
  {
    id: 'inv-2', userId: 'user-1', clientId: 'client-2', invoiceNumber: '2024-002',
    date: new Date('2024-07-20').toISOString(), status: 'Sent',
    itemCategories: [{ id: 'cat-2', name: 'Branding', items: [
      { id: 'item-3', name: 'Création de logo', quantity: 1, unitPrice: 15000 },
    ]}],
    note: '', terms: 'Paiement à réception.',
    totals: { subtotal: 15000, totalNet: 15000 },
  },
];

const estimates = [
  {
    id: 'est-1', userId: 'user-1', clientId: 'client-2', estimateNumber: 'DEV-2024-001',
    date: new Date('2024-06-30').toISOString(), status: 'Sent',
    itemCategories: [{ id: 'cat-3', name: 'Stratégie Digitale', items: [
      { id: 'item-4', name: 'Audit SEO',        quantity: 1, unitPrice: 8000  },
      { id: 'item-5', name: 'Plan de contenu',  quantity: 1, unitPrice: 12000 },
    ]}],
    note: 'Proposition valable 30 jours.', terms: "Acompte de 50% à la commande.",
    totals: { subtotal: 20000, totalNet: 20000 },
  },
];

// ── calendar events (derived from tasks / invoices / roadmap) ──────────────────
const calendarEvents = [
  // Task due dates
  ...tasks.filter(t => t.dueDate).map(t => ({
    id: `cal-task-${t.id}`,
    title: `Task: ${t.title}`,
    startDate: t.dueDate, endDate: t.dueDate,
    type: 'task', sourceId: t.id, userId: 'user-1',
  })),
  // Invoice dates
  ...invoices.map(inv => ({
    id: `cal-inv-${inv.id}`,
    title: `Invoice #${inv.invoiceNumber} Due`,
    startDate: inv.date, endDate: inv.date,
    type: 'invoice', sourceId: inv.id, userId: 'user-1',
  })),
  // Estimate dates
  ...estimates.map(est => ({
    id: `cal-est-${est.id}`,
    title: `Estimate #${est.estimateNumber}`,
    startDate: est.date, endDate: est.date,
    type: 'estimate', sourceId: est.id, userId: 'user-1',
  })),
  // Roadmap items
  ...roadmapItems.map(item => ({
    id: `cal-roadmap-${item.id}`,
    title: `Roadmap: ${item.title}`,
    startDate: item.startDate, endDate: item.endDate,
    type: 'roadmap_item', sourceId: item.id, userId: 'user-1',
  })),
  // Manual
  { id: 'cal-manual-1', title: 'Team Standup', startDate: NOW, endDate: NOW, type: 'manual', sourceId: null, userId: 'user-1' },
];

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Seeding Firestore for project: client-dashboard-v2\n');
  console.log('    Collections are written with { merge: true } — existing real');
  console.log('    data will NOT be overwritten.\n');

  try {
    await seedCollection('users',           users);
    await seedCollection('brands',          brands);
    await seedCollection('projects',        projects);
    await seedCollection('boards',          boards);
    await seedCollection('stages',          stages);
    await seedCollection('tags',            tags);
    await seedCollection('tasks',           tasks);
    await seedCollection('time_logs',       time_logs);
    await seedCollection('comments',        comments);
    await seedCollection('activities',      activities);
    await seedCollection('roadmap',         roadmapItems);
    await seedCollection('moodboards',      moodboards);
    await seedCollection('moodboard_items', moodboardItems);
    await seedCollection('feedbackItems',   [...feedbackWebsites, ...feedbackMockups, ...feedbackVideos]);
    await seedCollection('feedbackComments', feedbackComments);
    await seedCollection('clients',         clients);
    await seedCollection('invoices',        invoices);
    await seedCollection('estimates',       estimates);
    await seedCollection('calendar_events', calendarEvents);

    // userSettings is a per-user document — seed a placeholder (user must update it)
    await seedDocument('userSettings/user-1', {
      userId: 'user-1',
      ae: 'Business Name',
      cnie: 'AB123456',
      ice: '001122334455667',
      if: '12345678',
      tp: '98765432',
      adresse_ae: '123 Main Street, Casablanca, Morocco',
      bankDetails: { codeBanque: '123', codeVille: '456', nDeCompte: '12345678901234567890', cleRib: '99', codeSwift: 'BCPOMAMC' },
      footerDetails: { adresseMail: 'contact@business.com', telephone: '+212 5 12 34 56 78', site: 'www.business.com' },
      legalNote: "Art 219 de la loi 15-95 formant code de commerce.",
      signatureBoxClient: '',
      signatureBoxAutoEntrepreneur: '',
    });

    console.log('\n✅  All collections seeded successfully!\n');
    console.log('    Next steps:');
    console.log('    1. Open Firebase Console → Firestore to verify the data');
    console.log('    2. Upload real logo/image assets to Firebase Storage');
    console.log('    3. Update placeholder URLs in brands.logos, feedbackMockups.images, etc.');
    console.log('    4. Update userSettings/user-1 with your real business details\n');

  } catch (err) {
    console.error('\n❌  Seeding failed:', err);
    process.exit(1);
  }

  process.exit(0);
}

main();
