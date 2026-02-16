import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Firebase Admin SDK initialization module
 *
 * This module initializes the Firebase Admin SDK with service account credentials
 * and provides convenient exports for auth, firestore, and database operations.
 *
 * Service account key location:
 * - Production (VPS): /home/clientdash/.firebase-admin.json
 * - Local dev: Set FIREBASE_SERVICE_ACCOUNT_PATH env var
 */

// Singleton instance
let adminApp: admin.app.App | null = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * @returns Firebase Admin app instance or null if initialization fails
 */
export function initializeFirebaseAdmin(): admin.app.App | null {
  // Return existing instance if already initialized
  if (adminApp) {
    return adminApp;
  }

  try {
    // Determine service account path
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      '/home/clientdash/.firebase-admin.json';

    // Check if service account file exists
    if (!fs.existsSync(serviceAccountPath)) {
      console.warn('⚠️  Firebase Admin SDK: Service account not found at:', serviceAccountPath);
      console.warn('⚠️  Admin API endpoints will return 503 Service Unavailable');
      console.warn('⚠️  To enable admin features, create the service account file');
      return null;
    }

    // Read and parse service account
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Initialize Firebase Admin
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://client-dashboard-v2-default-rtdb.europe-west1.firebasedatabase.app"
    });

    isInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('   Project ID:', serviceAccount.project_id);
    console.log('   Service Account:', serviceAccount.client_email);

    return adminApp;
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    console.error('   Admin API endpoints will return 503 Service Unavailable');
    return null;
  }
}

/**
 * Check if Firebase Admin SDK is initialized
 */
export function isAdminInitialized(): boolean {
  return isInitialized;
}

/**
 * Get Firebase Auth instance
 * @throws Error if Admin SDK is not initialized
 */
export function getAuth(): admin.auth.Auth {
  if (!adminApp) {
    throw new Error('Firebase Admin SDK not initialized. Call initializeFirebaseAdmin() first.');
  }
  return admin.auth();
}

/**
 * Get Firestore instance
 * @throws Error if Admin SDK is not initialized
 */
export function getFirestore(): admin.firestore.Firestore {
  if (!adminApp) {
    throw new Error('Firebase Admin SDK not initialized. Call initializeFirebaseAdmin() first.');
  }
  return admin.firestore();
}

/**
 * Get Realtime Database instance
 * @throws Error if Admin SDK is not initialized
 */
export function getDatabase(): admin.database.Database {
  if (!adminApp) {
    throw new Error('Firebase Admin SDK not initialized. Call initializeFirebaseAdmin() first.');
  }
  return admin.database();
}

/**
 * Get the admin app instance
 */
export function getAdminApp(): admin.app.App | null {
  return adminApp;
}

// Auto-initialize on module load
initializeFirebaseAdmin();
