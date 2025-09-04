import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration, using hardcoded values
const firebaseConfig = {
  apiKey: "AIzaSyBDHmsIdstWYdi4yHMW0PE7rSsCnvnkm7k",
  authDomain: "logicycle01.firebaseapp.com",
  projectId: "logicycle01",
  storageBucket: "logicycle01.appspot.com",
  messagingSenderId: "373355040435",
  appId: "1:373355040435:web:c85b13e61c6fa10d0eeac6",
  measurementId: "G-03X2FB0F0B"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with optimized settings
const db = initializeFirestore(app, {
  cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache
  experimentalForceOwningTab: false, // Better multi-tab support
});

// Export services
export const auth = getAuth(app);
export { db };
export const storage = getStorage(app);