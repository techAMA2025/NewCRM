import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
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
    
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "Missing lead ID" }, { status: 400 })
    }

    await adminDb.collection("billcutLeads").doc(id).delete()

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Error in bill-cut-leads delete API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
