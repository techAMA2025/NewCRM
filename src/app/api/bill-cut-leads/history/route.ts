import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!adminDb || !adminAuth) {
    return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
  }

  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const idToken = authHeader.split("Bearer ")[1]

  try {
    await adminAuth.verifyIdToken(idToken)
    
    const searchParams = request.nextUrl.searchParams
    const leadId = searchParams.get("leadId")

    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 })
    }

    const salesNotesRef = adminDb.collection("billcutLeads").doc(leadId).collection("salesNotes")
    const snapshot = await salesNotesRef.orderBy("createdAt", "desc").get()

    const historyData = snapshot.docs.map((doc) => {
      const data = doc.data()
      const rawDate = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt instanceof Date ? data.createdAt : null);
      const isoDate = rawDate ? rawDate.toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : null);

      return {
        id: doc.id,
        leadId: leadId,
        content: data.content || "",
        createdAt: isoDate,
        createdBy: data.createdBy || "Unknown",
        createdById: data.createdById || "",
        displayDate: data.displayDate || (rawDate ? rawDate.toLocaleString("en-US", {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: true
        }) : ""),
        assignmentChange: false,
        timestamp: isoDate,
      }
    })

    return NextResponse.json({ history: historyData })

  } catch (error: any) {
    console.error("Error in bill-cut-leads history API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
