import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuration Firebase : variables d'environnement (VITE_*) avec repli sur valeurs par défaut
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyBDHmsIdstWYdi4yHMW0PE7rSsCnvnkm7k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "logicycle01.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "logicycle01",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "logicycle01.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "373355040435",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:373355040435:web:c85b13e61c6fa10d0eeac6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-03X2FB0F0B"
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