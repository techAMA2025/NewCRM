import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

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
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const body = await request.json()
    const { leadIds, salesPersonName, salesPersonId, currentUserName } = body

    if (!Array.isArray(leadIds) || !salesPersonName || !salesPersonId) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    const batch = adminDb.batch()

    for (const leadId of leadIds) {
      const leadRef = adminDb.collection("billcutLeads").doc(leadId)
      const leadSnap = await leadRef.get()
      
      if (leadSnap.exists) {
        const leadData = leadSnap.data() || {}
        
        // Add history entry
        const historyRef = leadRef.collection("history").doc()
        batch.set(historyRef, {
          assignmentChange: true,
          previousAssignee: leadData.assigned_to || "Unassigned",
          newAssignee: salesPersonName,
          timestamp: FieldValue.serverTimestamp(),
          assignedById: currentUserName || "Unknown",
          editor: {
            id: userId,
          },
        })

        // Update lead
        batch.update(leadRef, {
          assigned_to: salesPersonName,
          assignedToId: salesPersonId,
          lastModified: FieldValue.serverTimestamp(),
        })
      }
    }

    await batch.commit()

    return NextResponse.json({ success: true, count: leadIds.length })

  } catch (error: any) {
    console.error("Error in bill-cut-leads bulk-assign API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
