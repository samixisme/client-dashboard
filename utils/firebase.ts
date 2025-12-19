import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyDKQu4JYoxz3eub4KXe73EyteEf-gX8uhQ",
  authDomain: "client-dashboard-v2.firebaseapp.com",
  projectId: "client-dashboard-v2",
  storageBucket: "gs://client-dashboard-v2.firebasestorage.app",
  messagingSenderId: "779958789032",
  appId: "1:779958789032:web:76c240c04e6a886645339d"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize App Check
// Note: Replace 'your-recaptcha-site-key' with your actual reCAPTCHA v3 site key
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6Ld2JhMsAAAAAJPrW_WqgGrHbAw_JxkarGO2gEP9'),
  isTokenAutoRefreshEnabled: true
});

// Now, initialize and export other Firebase services
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
    // Depending on the app's needs, you might want to throw a more specific error
    // or handle it in a way that provides better user feedback.
    throw new Error("File upload failed.");
  }
};
