/**
 * moodboardData.ts — DEPRECATED
 *
 * Moodboards and their items are stored in and served from the Firestore
 * `moodboards` and `moodboard_items` collections.
 * This file is kept only to avoid breaking residual imports.
 *
 * To seed Firestore with initial moodboard data, run:
 *   npx ts-node scripts/seedFirestore.ts
 */
import type { Moodboard, MoodboardItem } from '../types';

export const moodboards:     Moodboard[]     = [];
export const moodboardItems: MoodboardItem[] = [];
