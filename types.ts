import { Timestamp } from 'firebase/firestore';

export type ProjectStatus = 'Active' | 'Archived' | 'Completed';

export interface Project {
    id: string;
    brandId: string;
    name: string;
    description: string;
    status: ProjectStatus;
    createdAt: string; // ISO string
    logoUrl?: string;
}

export interface Board {
    id: string;
    projectId: string;
    name: string;
    is_pinned: boolean;
    background_image: string;
    member_ids: string[];
}

export interface Stage {
    id: string;
    boardId: string;
    name: string;
    order: number;
    status?: 'Open' | 'Closed';
    backgroundPattern?: string;
    sortConfig?: {
        key: 'createdAt' | 'priority' | 'title' | 'dueDate';
        direction: 'asc' | 'desc';
    };
}

export interface RecurringTaskSettings {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // e.g., every 2 weeks
    nextDueDate: string; // ISO string for the next occurrence
    repeatInStageId: string; // Stage where the new task should be created
    repeatOnlyWhenCompleted: boolean;
}

export interface Task {
    id: string;
    boardId: string;
    stageId: string;
    title: string;
    description: string;
    priority: 'Low' | 'Medium' | 'High';
    dateAssigned: string;
    assignees: string[]; // array of user IDs
    labelIds: string[];
    dueDate?: string; // ISO string
    start_date?: string; // ISO string
    cover_image?: string;
    attachments: {id: string, name: string, url: string, type: string}[];
    createdAt: string; // ISO string
    roadmapItemId?: string; // Link to roadmap item
    order?: number;
    timeEstimation?: number; // in minutes
    recurring?: RecurringTaskSettings;
}

export interface TimeLog {
    id: string;
    taskId: string;
    userId: string;
    duration: number; // in seconds
    date: string; // ISO string
}

export interface Tag {
    id: string;
    boardId: string;
    name: string;
    color: string;
}

export interface Comment {
    id: string;
    taskId?: string;
    boardId?: string;
    roadmapItemId?: string;
    author: string;
    text: string;
    timestamp: string;
}

export interface Activity {
    id: string;
    objectId: string;
    objectType: 'task' | 'comment' | 'roadmap_item' | 'feedback_item';
    description: string;
    timestamp: string;
    comment_timestamp_seconds?: number;
    video_screenshot_url?: string;
}

export interface RoadmapItem {
    id: string;
    projectId: string;
    title: string;
    description: string;
    status: 'Planned' | 'In Progress' | 'Completed';
    startDate: string; // ISO string
    endDate: string; // ISO string
    assignees?: string[];
    order?: number;
    attachments: {id: string, name: string, url: string, type: string}[];
    labelIds: string[];
    sortConfig?: {
        key: 'createdAt' | 'priority' | 'title' | 'dueDate';
        direction: 'asc' | 'desc';
    };
    backgroundPattern?: string;
}

export interface CustomField {
    id: string;
    boardId: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'dropdown';
}

export interface BoardNotificationSettings {
    id: string;
    userId: string;
    boardId: string;
    comment: boolean;
    stage_changed: boolean;
    assigned: boolean;
    dates: boolean;
    archived: boolean;
    removed: boolean;
}

export interface User {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl: string;
    role?: 'admin' | 'client';
}


// Payments Feature Types
export interface Client {
    id: string;
    userId: string;
    brandId?: string;
    name: string;
    adresse: string;
    ice: string;
    rc: string;
    if: string;
}

export interface LineItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
}

export interface ItemCategory {
    id: string;
    name: string;
    items: LineItem[];
}

interface DocumentBase {
    id: string;
    userId: string;
    clientId: string;
    date: string; // ISO string
    status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
    itemCategories: ItemCategory[];
    note: string;
    terms: string;
    totals: {
        subtotal: number;
        totalNet: number;
    };
}

export interface Invoice extends DocumentBase {
    invoiceNumber: string;
}

export interface Estimate extends DocumentBase {
    estimateNumber: string;
}

export interface UserSettings {
    userId: string;
    ae: string;
    cnie: string;
    ice: string;
    if: string;
    tp: string;
    adresse_ae: string;
    bankDetails: {
        codeBanque: string;
        codeVille: string;
        nDeCompte: string;
        cleRib: string;
        codeSwift: string;
    };
    footerDetails: {
        logo1Url?: string;
        logo2Url?: string;
        logo3Url?: string;
        adresseMail: string;
        telephone: string;
        site: string;
    };
    legalNote: string;
    signatureBoxClient: string;
    signatureBoxAutoEntrepreneur: string;
}

// Feedback Feature Types
export type DeviceView = 'desktop' | 'notebook' | 'tablet' | 'phone';

export interface WebsitePage {
    id: string;
    path: string; // e.g., "/about", "/contact"
    name: string;
}

export interface FeedbackWebsite {
    id: string;
    projectId: string;
    name: string;
    url: string;
    isSubscribed?: boolean;
    isApproved?: boolean;
    description?: string;
    pages?: WebsitePage[];
    approvedPageIds?: string[];
}

export interface MockupImage {
    id: string;
    name: string;
    url: string;
}

export interface FeedbackMockup {
    id: string;
    projectId: string;
    name: string;
    images: MockupImage[];
    description?: string;
    approvedImageIds?: string[];
}

export interface VideoAsset {
    id: string;
    name: string;
    url: string;
}

export interface FeedbackVideo {
    id:string;
    projectId: string;
    name: string;
    videos: VideoAsset[];
    description?: string;
    approvedVideoIds?: string[];
}

export interface FeedbackComment {
    id: string;
    projectId: string;
    targetId: string; // ID of the Mockup, Website, or Video
    imageId?: string; // ID of the specific image within a mockup
    videoAssetId?: string; // for specific video in a collection
    deviceView?: DeviceView;
    pageUrl?: string; // For website feedback, the specific page URL path
    targetType: 'website' | 'mockup' | 'video';
    comment: string;
    reporterId: string; 
    assignedId?: string;
    x_coordinate?: number;
    y_coordinate?: number;
    startTime?: number; // in seconds, for video comments
    endTime?: number;   // in seconds, for video comments
    status: 'Active' | 'Resolved';
    timestamp: string;
    pin_number: number;
    dueDate?: string; // Optional due date for the comment/task
    replies?: {
        id: string;
        authorId: string;
        text: string;
        timestamp: string;
    }[];
}

// New Feedback Types
export type FeedbackType = 'mockup' | 'website' | 'video';
export type FeedbackStatus = 'pending' | 'in_review' | 'approved' | 'changes_requested';

export interface FeedbackItem {
  id: string;
  projectId: string;
  type: FeedbackType;
  name: string;
  description: string;
  assetUrl: string;
  status: FeedbackStatus;
  createdBy: string;
  createdAt: any; // Timestamp or Date or serializable object
  commentCount?: number;
  pages?: {id: string, name: string, url: string}[]; // New pages field
}

export interface FeedbackItemComment {
  id: string;
  feedbackItemId: string;
  authorId: string;
  commentText: string;
  createdAt: any; // Timestamp or Date
  resolved: boolean;
  position?: { x: number; y: number }; // ONLY for 'mockup' type
  timestamp?: number; // ONLY for 'video' type (time in seconds)
  pin_number?: number;
  device?: string;
  pageUrl?: string;
  x_coordinate?: number;
  y_coordinate?: number;
  dueDate?: string;
  status?: 'Active' | 'Resolved';
  replies?: {
      id: string;
      authorId: string;
      text: string;
      timestamp: string;
  }[];
}


// Moodboard Feature Types
export interface Moodboard {
    id: string;
    projectId: string;
    name: string;
}

export type MoodboardItemType = 'text' | 'link' | 'image' | 'todo_list' | 'column' | 'connector' | 'color';

export interface MoodboardItem {
    id: string;
    moodboardId: string;
    type: MoodboardItemType;
    content: {
        text?: string;
        url?: string;
        imageUrl?: string;
        todos?: { id: string; text: string; completed: boolean }[];
        title?: string;
        hex?: string;
    };
    position: { x: number; y: number };
    size: { width: number; height: number };
    parentId?: string;
    connector_ends?: {
        start_item_id: string;
        end_item_id: string;
    };
    creatorId?: string;
    createdAt?: string;
    updatedAt?: string;
}

// Brand Feature Types
export type BrandLogoType = 'Full Logo' | 'Logomark' | 'Logotype';
export type BrandLogoVariation = 'Color' | 'Dark Background' | 'White Background' | 'Grayscale';

export interface BrandLogo {
    url: string;
    name: string;
    tags: string[]; // e.g., 'Full Logo', 'Logomark', 'Logotype', 'Primary', 'Variations'
}

export interface BrandColor {
    hex: string;
    name: string;
    category: 'Primary' | 'Secondary';
}

export interface BrandTypography {
    fontFamily: string;
    usage: string;
    fileUrl: string;
    category: 'Primary' | 'Secondary';
}

export interface BrandAsset {
    name: string;
    url: string;
}

export interface Brand {
    id: string;
    name: string;
    createdAt: Date | Timestamp;
    logoUrl?: string;
    industry?: string;
    memberIds?: string[];
    logos?: BrandLogo[];
    colors?: BrandColor[];
    typography?: BrandTypography[];
    brandVoice?: string;
    brandPositioning?: string;
    imagery?: BrandAsset[];
    graphics?: BrandAsset[];
}


// Calendar Feature Types
export interface CalendarEvent {
    id: string;
    title: string;
    startDate: string; // ISO string
    endDate: string; // ISO string
    type: 'task' | 'invoice' | 'estimate' | 'roadmap_item' | 'manual';
    sourceId: string | null;
    userId: string;
    brandId?: string;
    projectId?: string;
    taskId?: string;
    reminder?: string;
}
