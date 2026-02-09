// Import the Firebase SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Compatibility shim for environments where ImportMeta typings aren't available
const FIREBASE_ENV: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

// DEBUG: Check if env vars are loading (remove after debugging)
const hasApiKey = !!FIREBASE_ENV.VITE_FIREBASE_API_KEY && FIREBASE_ENV.VITE_FIREBASE_API_KEY.length > 10;
const hasProjectId = !!FIREBASE_ENV.VITE_FIREBASE_PROJECT_ID;
console.log("[Firebase] Config status - API Key loaded:", hasApiKey, "| Project ID loaded:", hasProjectId);
console.log("[Firebase] API Key length:", FIREBASE_ENV.VITE_FIREBASE_API_KEY?.length || 0);

// Your web app's Firebase configuration (secure via environment variables)
const firebaseConfig = {
  apiKey: FIREBASE_ENV.VITE_FIREBASE_API_KEY ?? "",
  authDomain: FIREBASE_ENV.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  databaseURL: FIREBASE_ENV.VITE_FIREBASE_DATABASE_URL ?? "",
  projectId: FIREBASE_ENV.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: FIREBASE_ENV.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: FIREBASE_ENV.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: FIREBASE_ENV.VITE_FIREBASE_APP_ID ?? ""
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize App Check with error handling
// NOTE: App Check is disabled for localhost development to avoid 404 errors
// Enable it in production by setting VITE_FIREBASE_APP_CHECK_SITE_KEY
const initAppCheck = () => {
  const siteKey = FIREBASE_ENV.VITE_FIREBASE_APP_CHECK_SITE_KEY;
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location?.hostname === "localhost" || window.location?.hostname === "127.0.0.1");

  // Skip App Check entirely on localhost - it requires Firebase Console setup
  // and causes 404 errors if not properly configured
  if (isLocalhost) {
    console.info("[Firebase] App Check disabled for localhost development");
    return null;
  }

  // Skip App Check if no site key configured
  if (!siteKey) {
    console.warn("[Firebase] App Check site key not configured. Set VITE_FIREBASE_APP_CHECK_SITE_KEY in .env for production");
    return null;
  }

  try {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
    return appCheck;
  } catch (error) {
    console.error("[Firebase] App Check initialization failed:", error);
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

  // Create a unique filename to prevent overwrites
  const uniqueFilename = `${Date.now()}-${file.name}`;
  const storageRef = ref(storage, `${path}/${uniqueFilename}`);

  try {
    // Upload the file
    const uploadTask = await uploadBytes(storageRef, file);

    // Get the public download URL
    const downloadURL = await getDownloadURL(uploadTask.ref);

    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("File upload failed.");
  }
};
