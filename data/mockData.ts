/**
 * mockData.ts — DEPRECATED
 *
 * All data is now stored in and served from Firebase Firestore.
 * This file exports empty arrays to avoid breaking any residual imports
 * while the codebase is fully migrated.
 *
 * To seed Firestore with initial data, run:
 *   npx ts-node scripts/seedFirestore.ts
 */
import type {
    Project, Board, Stage, Task, Tag, Comment, Activity,
    RoadmapItem, CustomField, BoardNotificationSettings, User, TimeLog
} from '../types';

export const projects:                   Project[]                   = [];
export const boards:                     Board[]                     = [];
export const stages:                     Stage[]                     = [];
export const tasks:                      Task[]                      = [];
export const tags:                       Tag[]                       = [];
export const comments:                   Comment[]                   = [];
export const activities:                 Activity[]                  = [];
export const roadmapItems:               RoadmapItem[]               = [];
export const custom_fields:              CustomField[]               = [];
export const board_notification_settings: BoardNotificationSettings[] = [];
export const users:                      User[]                      = [];
export const time_logs:                  TimeLog[]                   = [];
