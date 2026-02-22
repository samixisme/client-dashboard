/**
 * feedbackData.ts — DEPRECATED
 *
 * Feedback items are stored in and served from Firebase Firestore via
 * collectionGroup('feedbackItems') and the `feedbackComments` collection.
 * This file is kept only to avoid breaking residual imports.
 *
 * To seed Firestore with initial feedback data, run:
 *   npx ts-node scripts/seedFirestore.ts
 */
import type { FeedbackWebsite, FeedbackMockup, FeedbackVideo, FeedbackComment } from '../types';

export const feedbackWebsites:  FeedbackWebsite[]  = [];
export const feedbackMockups:   FeedbackMockup[]   = [];
export const feedbackVideos:    FeedbackVideo[]    = [];
export const feedbackComments:  FeedbackComment[]  = [];
