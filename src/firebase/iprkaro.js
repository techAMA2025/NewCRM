import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const iprkaroFirebaseConfig = {
  apiKey: "AIzaSyBFGd7OGNuAvt9HazsdcLsWyS4mbfz9n5c",
  authDomain: "iprkaro-729d3.firebaseapp.com",
  projectId: "iprkaro-729d3",
  storageBucket: "iprkaro-729d3.firebasestorage.app",
  messagingSenderId: "165087210161",
  appId: "1:165087210161:web:65171994c2da9bd4e39090",
  measurementId: "G-V5E1ZSWW1N"
};

// Initialize as a named app to avoid conflicts with the CRM's default Firebase app
const iprkaroAppName = "iprkaro";
const iprkaroApp = getApps().find(app => app.name === iprkaroAppName)
  ? getApp(iprkaroAppName)
  : initializeApp(iprkaroFirebaseConfig, iprkaroAppName);

// Export instances for IPRKaro
export const auth = getAuth(iprkaroApp);
export const storage = getStorage(iprkaroApp);
export const db = getFirestore(iprkaroApp);
export const iprkaroDb = db; // Maintain backward compatibility if needed

export default iprkaroApp;