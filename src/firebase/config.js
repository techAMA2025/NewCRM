// Firebase configuration and initialization
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD72I02Uf1sg8TEJuanvXuwrA00LqWlbls",

  authDomain: "amacrm-76fd1.firebaseapp.com",

  databaseURL: "https://amacrm-76fd1-default-rtdb.firebaseio.com",

  projectId: "amacrm-76fd1",

  storageBucket: "amacrm-76fd1.firebasestorage.app",

  messagingSenderId: "1008668372239",

  appId: "1:1008668372239:web:03cca86d1675df6450227a",

  measurementId: "G-X1B7CKLRST",
};

// Initialize Firebase
let app;

// Check if Firebase app has already been initialized
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
  }
} else {
  app = getApps()[0]; // If already initialized, use the existing app
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
