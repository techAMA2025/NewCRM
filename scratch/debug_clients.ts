
import { db } from "@/firebase/firebase"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"

async function checkRecentClients() {
  const q = query(collection(db, "clients"), orderBy("lastModified", "desc"), limit(5))
  const snap = await getDocs(q)
  snap.forEach(doc => {
    const data = doc.data()
    console.log(`Client: ${data.name}, Status: ${data.adv_status}, droppedAt: ${data.droppedAt}, lastModified: ${data.lastModified?.toDate?.()}`)
  })
}
