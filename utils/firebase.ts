import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyDKQu4JYoxz3eub4KXe73EyteEf-gX8uhQ",
  authDomain: "client-dashboard-v2.firebaseapp.com",
  projectId: "client-dashboard-v2",
  storageBucket: "client-dashboard-v2.firebasestorage.app",
  messagingSenderId: "779958789032",
  appId: "1:779958789032:web:76c240c04e6a886645339d"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize App Check
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6Ld2JhMsAAAAAJPrW_WqgGrHbAw_JxkarGO2gEP9'),
  isTokenAutoRefreshEnabled: true
});

// Now, initialize and export other Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
