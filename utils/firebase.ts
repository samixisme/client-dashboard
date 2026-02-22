// Import the Firebase SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Debug token only on localhost — NEVER on production domains.
// The token below is registered in Firebase Console > App Check > Debug tokens.
// It is intentionally not secret (it only works when registered), but must not
// be set on production where reCAPTCHA enforcement applies.
const isLocalhost = typeof window !== 'undefined' &&
  (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');

if (isLocalhost) {
  (self as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN ?? true;
}

// Your web app's Firebase configuration (secure via environment variables)
// Vite replaces import.meta.env.VITE_* with actual values at build time
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize App Check with reCAPTCHA v3.
// Requires VITE_FIREBASE_APP_CHECK_SITE_KEY to be set in production.
// On localhost the debug token above is used automatically by the SDK.
const initAppCheck = () => {
  const siteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
  if (!siteKey) return null;

  try {
    return initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch {
    return null;
  }
};

export const appCheck = initAppCheck();

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Uploads a file to Firebase Storage and returns its public URL.
 * @param file The file to upload.
 * @param path The path in the storage bucket where the file should be saved (e.g., 'brand_assets').
 * @returns A promise that resolves with the public URL of the uploaded file.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const uniqueFilename = `${Date.now()}-${file.name}`;
  const storageRef = ref(storage, `${path}/${uniqueFilename}`);

  try {
    const uploadTask = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadTask.ref);
    return downloadURL;
  } catch (error) {
    throw new Error("File upload failed.");
  }
};
