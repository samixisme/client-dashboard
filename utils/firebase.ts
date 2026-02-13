// Import the Firebase SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Set debug token BEFORE any Firebase initialization for localhost App Check
const isLocalhost = typeof window !== 'undefined' &&
  (window.location?.hostname === "localhost" || window.location?.hostname === "127.0.0.1");

if (isLocalhost) {
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// Compatibility shim for environments where ImportMeta typings aren't available
const FIREBASE_ENV: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

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

// Initialize App Check - uses debug tokens for localhost, reCAPTCHA for production
const initAppCheck = () => {
  const siteKey = FIREBASE_ENV.VITE_FIREBASE_APP_CHECK_SITE_KEY;

  if (!siteKey && !isLocalhost) {
    return null;
  }

  try {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"),
      isTokenAutoRefreshEnabled: true
    });
    return appCheck;
  } catch (error) {
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
