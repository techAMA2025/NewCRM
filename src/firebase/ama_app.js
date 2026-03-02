import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_AMA_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AMA_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_AMA_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_AMA_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_AMA_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_AMA_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_AMA_MEASUREMENT_ID
};

// Initialize Firebase
const appName = "ama-legal-app";
let app;

if (getApps().some(a => a.name === appName)) {
  app = getApp(appName);
} else {
  app = initializeApp(firebaseConfig, appName);
}

const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, db, storage };
