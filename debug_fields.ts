import { adminDb } from './src/firebase/firebase-admin';

async function check() {
  const snapshot = await adminDb.collection('billcutLeads').limit(20).get();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log('--- Lead ID:', doc.id);
    Object.keys(data).forEach(key => {
        if (key.toLowerCase().includes('note') || key.toLowerCase().includes('remark') || key.toLowerCase().includes('sales')) {
            console.log(`${key}: `, data[key]);
        }
    });
  });
}

check();
