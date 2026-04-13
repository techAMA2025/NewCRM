import { adminDb } from "../src/firebase/firebase-admin";

async function countLeads() {
  try {
    const snapshot = await adminDb.collection("billcutLeads").count().get();
    console.log("Total leads in billcutLeads:", snapshot.data().count);
  } catch (error) {
    console.error("Error counting leads:", error);
  }
}

countLeads();
