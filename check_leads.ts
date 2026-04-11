import { adminDb } from './src/firebase/firebase-admin';

async function check() {
  const snapshot = await adminDb.collection('billcutLeads').limit(10).get();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log('Lead ID:', doc.id);
    console.log('sales_notes:', data.sales_notes);
    console.log('lastNote:', data.lastNote);
    console.log('latestRemark:', data.latestRemark);
    console.log('---');
  });
}

check();
