// Secondary Firebase app for IPRKaro database (separate from CRM's main Firebase)
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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

// Export the Firestore instance for IPRKaro
export const iprkaroDb = getFirestore(iprkaroApp);
export default iprkaroApp;