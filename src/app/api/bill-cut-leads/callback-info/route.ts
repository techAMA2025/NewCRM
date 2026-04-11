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

        const callbackSnapshot = await adminDb
            .collection("billcutLeads")
            .doc(leadId)
            .collection("callback_info")
            .limit(1)
            .get()

        if (callbackSnapshot.empty) {
            return NextResponse.json({ callbackInfo: null })
        }

        const data = callbackSnapshot.docs[0].data()
        return NextResponse.json({
            callbackInfo: {
                id: callbackSnapshot.docs[0].id,
                scheduled_dt: data.scheduled_dt?.toDate ? data.scheduled_dt.toDate().toISOString() : data.scheduled_dt,
                scheduled_by: data.scheduled_by || "",
                created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at
            }
        })
    } catch (error: any) {
        console.error("Error fetching callback info:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

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
        const body = await request.json()
        const { leadId, scheduledDateTime, userName } = body

        if (!leadId || !scheduledDateTime) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const callbackData = {
            id: 'attempt_1',
            scheduled_dt: new Date(scheduledDateTime),
            scheduled_by: userName || "Unknown",
            created_at: new Date()
        }

        // Add to subcollection
        await adminDb.collection("billcutLeads").doc(leadId).collection("callback_info").add(callbackData)
        
        // Update main document
        await adminDb.collection("billcutLeads").doc(leadId).update({
            category: "Callback",
            scheduled_dt: new Date(scheduledDateTime),
            lastModified: new Date()
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error scheduling callback:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
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
        const body = await request.json()
        const { leadId, callbackDocId, scheduledDateTime, userName } = body

        if (!leadId || !scheduledDateTime) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const updateData = {
            scheduled_dt: new Date(scheduledDateTime),
            scheduled_by: userName || "Unknown",
            updated_at: new Date()
        }

        if (callbackDocId) {
            await adminDb.collection("billcutLeads").doc(leadId).collection("callback_info").doc(callbackDocId).update(updateData)
        } else {
            // Fallback: find the first callback doc if ID not provided
            const snap = await adminDb.collection("billcutLeads").doc(leadId).collection("callback_info").limit(1).get()
            if (!snap.empty) {
                await adminDb.collection("billcutLeads").doc(leadId).collection("callback_info").doc(snap.docs[0].id).update(updateData)
            }
        }
        
        // Update main document
        await adminDb.collection("billcutLeads").doc(leadId).update({
            scheduled_dt: new Date(scheduledDateTime),
            lastModified: new Date()
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error updating callback:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
