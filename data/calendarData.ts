/**
 * calendarData.ts — DEPRECATED
 *
 * Calendar events are stored in and served from the Firestore `calendar_events`
 * collection. Synthetic events derived from tasks, invoices, and roadmap items
 * are computed at write time (when those entities are created/updated) via
 * the `syncCalendarEvent` utility in utils/calendarSync.ts.
 *
 * This file is kept only to avoid breaking residual imports.
 *
 * To seed Firestore with initial calendar events, run:
 *   npx ts-node scripts/seedFirestore.ts
 */
import type { CalendarEvent } from '../types';

export const calendar_events: CalendarEvent[] = [];
