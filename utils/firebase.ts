// Import the Firebase SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Set debug token BEFORE any Firebase initialization for localhost App Check
const isLocalhost = typeof window !== 'undefined' &&
  (window.location?.hostname === "localhost" || window.location?.hostname === "127.0.0.1");

// Also enable debug token for production domain during development
const isProductionDebug = typeof window !== 'undefined' &&
  window.location?.hostname === "client.samixism.com";

// Debug logging to see what's happening
if (typeof window !== 'undefined') {
  console.log('[Firebase Debug] Current hostname:', window.location?.hostname);
  console.log('[Firebase Debug] isLocalhost:', isLocalhost);
  console.log('[Firebase Debug] isProductionDebug:', isProductionDebug);
}

if (isLocalhost || isProductionDebug) {
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  console.log('[Firebase Debug] App Check debug token enabled');
  console.log('[Firebase Debug] Debug token will appear after App Check initialization');
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

// Initialize App Check - uses debug tokens for localhost, reCAPTCHA for production
const initAppCheck = () => {
  const siteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;

  // Don't initialize App Check ONLY if there's no site key AND we're not in debug mode
  if (!siteKey && !isLocalhost && !isProductionDebug) {
    console.log('[Firebase Debug] Skipping App Check: no site key and not in debug mode');
    return null;
  }

  console.log('[Firebase Debug] Initializing App Check...');
  console.log('[Firebase Debug] Site key:', siteKey ? 'provided' : 'using fallback test key');
  console.log('[Firebase Debug] Debug mode:', isLocalhost || isProductionDebug);

  try {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"),
      isTokenAutoRefreshEnabled: true
    });
    console.log('[Firebase Debug] App Check initialized successfully');
    return appCheck;
  } catch (error) {
    console.error('[Firebase Debug] App Check initialization failed:', error);
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
