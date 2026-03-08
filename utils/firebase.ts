// Import the Firebase SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// App Check debug token — set VITE_APPCHECK_DEBUG_TOKEN in .env (local) or
// GitHub Secrets (CI/production) and register the same value in Firebase Console
// under App Check > Debug tokens. Must be set before initializeApp().
const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
if (debugToken) {
  (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
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

// Initialize App Check.
// Production: set VITE_FIREBASE_APP_CHECK_SITE_KEY to your reCAPTCHA v3 site key.
// Stopgap: set VITE_APPCHECK_DEBUG_TOKEN to a UUID registered in Firebase Console.
const initAppCheck = () => {
  const siteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
  // If neither a real siteKey nor a debug token is set, skip App Check entirely.
  if (!siteKey && !debugToken) return null;

  try {
    // When only the debug token is set (no real siteKey), we still must call
    // initializeAppCheck — if we skip it, no AppCheck token is sent and Firestore
    // rejects ALL requests (enforcement is on). The SDK uses the debug token
    // global instead of actually calling ReCaptcha, so the siteKey is not used.
    // We pass a placeholder to satisfy the ReCaptchaV3Provider constructor validation.
    const effectiveSiteKey = siteKey || 'debug-placeholder-not-used-in-debug-mode';
    return initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(effectiveSiteKey),
      isTokenAutoRefreshEnabled: true,
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
