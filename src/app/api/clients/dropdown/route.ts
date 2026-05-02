import { NextResponse } from "next/server"
import { adminDb } from "@/firebase/firebase-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const snapshot = await adminDb.collection("clients").get()
    const clients = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name || "Unknown",
        phone: data.phone || "",
        altPhone: data.altPhone || "",
        email: data.email || "",
      }
    })

    // Sort alphabetically by name
    clients.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ success: true, clients })
  } catch (error: any) {
    console.error("Error fetching clients for dropdown:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
