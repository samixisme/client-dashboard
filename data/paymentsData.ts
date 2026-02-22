/**
 * paymentsData.ts — DEPRECATED
 *
 * Clients, invoices, estimates, and user settings are stored in and served
 * from Firestore:
 *   - clients      → `clients` collection
 *   - invoices     → `invoices` collection
 *   - estimates    → `estimates` collection
 *   - userSettings → `userSettings/{userId}` document
 *
 * This file is kept only to avoid breaking residual imports.
 *
 * To seed Firestore with initial payments data, run:
 *   npx ts-node scripts/seedFirestore.ts
 */
import type { Client, Invoice, Estimate, UserSettings } from '../types';

export const clients:      Client[]      = [];
export const invoices:     Invoice[]     = [];
export const estimates:    Estimate[]    = [];

/**
 * Default empty UserSettings used when no document exists in Firestore yet.
 * The real value is loaded per-user from `userSettings/{uid}`.
 */
export const userSettings: UserSettings = {
    userId: '',
    ae: '',
    cnie: '',
    ice: '',
    if: '',
    tp: '',
    adresse_ae: '',
    bankDetails: {
        codeBanque: '',
        codeVille: '',
        nDeCompte: '',
        cleRib: '',
        codeSwift: '',
    },
    footerDetails: {
        adresseMail: '',
        telephone: '',
        site: '',
    },
    legalNote: '',
    signatureBoxClient: '',
    signatureBoxAutoEntrepreneur: '',
};
