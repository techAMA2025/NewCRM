import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!adminDb || !adminAuth) {
    return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
  }

  // Auth Check
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
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 })
    }

    const docSnapshot = await adminDb.collection("billcutLeads").doc(leadId).get()
    
    if (!docSnapshot.exists) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const data = docSnapshot.data() || {}
    const statusHistory = data.statusHistory || []

    // Map timestamps to ISO strings for JSON safety
    const sanitizedHistory = statusHistory.map((entry: any) => ({
      ...entry,
      timestamp: entry.timestamp?.toDate ? entry.timestamp.toDate().toISOString() : entry.timestamp
    }))

    return NextResponse.json({
      history: sanitizedHistory
    })

  } catch (error: any) {
    console.error("Error in bill-cut-leads history-status API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
