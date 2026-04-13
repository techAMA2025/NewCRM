import { adminDb } from '../src/firebase/firebase-admin';

async function countLeads() {
  const db = adminDb;
  if (!db) {
    console.error("adminDb is null");
    return;
  }
  try {
    const snapshot = await db.collection("billcutLeads").count().get();
    console.log("Total leads in billcutLeads:", snapshot.data().count);
  } catch (error) {
    console.error("Error counting leads:", error);
  }
}

countLeads();
