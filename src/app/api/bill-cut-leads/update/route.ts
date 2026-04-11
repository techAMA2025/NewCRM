import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"
import { Timestamp, FieldValue } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

export async function PATCH(request: NextRequest) {
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
    const userEmail = decodedToken.email || "Unknown User"
    const userId = decodedToken.uid

    const body = await request.json()
    const { id, data, userName } = body

    if (!id || !data) {
      return NextResponse.json({ error: "Missing ID or data" }, { status: 400 })
    }

    const leadRef = adminDb.collection("billcutLeads").doc(id)
    const leadSnap = await leadRef.get()
    
    if (!leadSnap.exists) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }
    
    const leadData = leadSnap.data() || {}
    const isChangingFromConverted = (leadData.category === 'Converted') && (data.status && data.status !== 'Converted')
    const isChangingToConverted = (leadData.category !== 'Converted') && (data.status === 'Converted')

    const updateData: any = {
      ...data,
      lastModified: FieldValue.serverTimestamp(),
    }

    if ("status" in data) {
      updateData.category = data.status
      updateData.lastStatusUpdatedBy = userEmail
    }

    if ("assignedTo" in data) {
      updateData.assigned_to = data.assignedTo
    }

    if ("sales_notes" in data) {
      updateData.sales_notes = data.sales_notes
    }

    if (data.status === 'Converted') {
        updateData.convertedAt = FieldValue.serverTimestamp()
    } else if (isChangingFromConverted) {
        updateData.convertedAt = null
    }

    await leadRef.update(updateData)

    // Send email message if status changed to Interested or Not Answering (Non-blocking)
    if (data.status === "Interested" || data.status === "Not Answering") {
        if (leadData.email) {
            // FIRE AND FORGET - Don't await to keep the API response fast
            (async () => {
                try {
                    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "amacrm-76fd1";
                    const region = "us-central1"; 
                    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/sendStatusChangeMessage`;

                    console.log(`[API] Background trigger: sending status change email for ${leadData.email}`);

                    await fetch(functionUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                            data: {
                                leadName: leadData.name || 'Dear Sir/Ma\'am',
                                leadEmail: leadData.email,
                                leadId: id,
                                newStatus: data.status,
                                leadSource: 'billcut'
                            }
                        })
                    });
                } catch (emailError) {
                    console.error("[API] Background email trigger failed:", emailError);
                }
            })();
        }
    }

    // Handle Targets logic
    if (isChangingToConverted || isChangingFromConverted) {
      const targetUserName = userName || leadData.assigned_to 
      if (targetUserName) {
        const now = new Date()
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const monthDocId = `${monthNames[now.getMonth()]}_${now.getFullYear()}`
        
        const monthlyDocRef = adminDb.collection('targets').doc(monthDocId)
        const salesTargetsRef = monthlyDocRef.collection('sales_targets')

        // Try to find existing user target
        const userTargetQuery = await salesTargetsRef.where("userName", "==", targetUserName).limit(1).get()
        
        if (!userTargetQuery.empty) {
          const targetDoc = userTargetQuery.docs[0]
          const currentCount = targetDoc.data().convertedLeads || 0
          const increment = isChangingToConverted ? 1 : -1
          await targetDoc.ref.update({
            convertedLeads: Math.max(0, currentCount + increment),
            updatedAt: FieldValue.serverTimestamp()
          })
        } else if (isChangingToConverted) {
          // Create new target doc if converting for the first time
          await salesTargetsRef.add({
            userId: userId,
            userName: targetUserName,
            convertedLeads: 1,
            convertedLeadsTarget: 0,
            amountCollected: 0,
            amountCollectedTarget: 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy: userId
          })
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Error in bill-cut-leads update API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
