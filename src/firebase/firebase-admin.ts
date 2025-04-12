import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin if not already initialized
const initAdmin = () => {
  try {
    if (!getApps().length) {
      console.log("Initializing Firebase Admin app...");
      
      // Log environment variables without exposing sensitive data
      console.log("Firebase Project ID:", process.env.FIREBASE_PROJECT_ID);
      console.log("Firebase Client Email exists:", !!process.env.FIREBASE_CLIENT_EMAIL);
      console.log("Firebase Private Key exists:", !!process.env.FIREBASE_PRIVATE_KEY);
      console.log("Firebase Storage Bucket:", process.env.FIREBASE_STORAGE_BUCKET || "amacrm-76fd1.firebasestorage.app");
      
      // If any keys are missing, report it
      if (!process.env.FIREBASE_CLIENT_EMAIL) {
        console.error("Missing FIREBASE_CLIENT_EMAIL environment variable");
      }
      if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.error("Missing FIREBASE_PRIVATE_KEY environment variable");
      }
      
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || "amacrm-76fd1",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "amacrm-76fd1.firebasestorage.app"
      });
      console.log("Firebase Admin initialized successfully");
    } else {
      console.log("Firebase Admin already initialized");
    }
    
    return {
      storage: getStorage()
    };
  } catch (error: any) {
    console.error("Error initializing Firebase Admin:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
};

export { initAdmin };