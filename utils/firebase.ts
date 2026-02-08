// Import the Firebase SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

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

// Initialize App Check
if (typeof window !== 'undefined' && window.location && window.location.hostname === "localhost") {
  (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = "d87f033a-8f4d-4340-8e8b-f96ebcd3ff7c";
}
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(FIREBASE_ENV.VITE_FIREBASE_APP_CHECK_SITE_KEY ?? '6Ld2JhMsAAAAAJPrW_WqgGrHbAw_JxkarGO2gEP9c'),
  isTokenAutoRefreshEnabled: true
});

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
