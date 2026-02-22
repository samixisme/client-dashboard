/**
 * brandData.ts — DEPRECATED
 *
 * Brands are stored in and served from the Firestore `brands` collection.
 * This file is kept only to avoid breaking residual imports.
 *
 * To seed Firestore with initial brand data, run:
 *   npx ts-node scripts/seedFirestore.ts
 */
import type { Brand } from '../types';

export const brands: Brand[] = [];
