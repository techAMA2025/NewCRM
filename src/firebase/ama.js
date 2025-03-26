// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCn8LHNtSycWOnhxlYn51Gblwt_fqF6yE8",
  authDomain: "amalegalsolutionss.firebaseapp.com",
  projectId: "amalegalsolutionss",
  storageBucket: "amalegalsolutionss.firebasestorage.app",
  messagingSenderId: "235592681981",
  appId: "1:235592681981:web:91bb26b058753a175d7194",
  measurementId: "G-3087BV48LQ",
};

// Initialize Firebase
// Fix the AMA Firebase initialization
const app = initializeApp(firebaseConfig, "ama-app");

// Dynamically load Firebase Analytics on the client side
let analytics = null;
if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics }) => {
      analytics = getAnalytics(app);
    })
    .catch((error) => console.error("Error initializing analytics:", error));
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { analytics, db, auth, storage, collection, addDoc };