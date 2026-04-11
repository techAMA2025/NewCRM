import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

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
        const limit = parseInt(searchParams.get("limit") || "50")

        if (!leadId) {
            return NextResponse.json({ error: "Missing leadId" }, { status: 400 })
        }

        const notesSnapshot = await adminDb
            .collection("billcutLeads")
            .doc(leadId)
            .collection("salesNotes")
            .orderBy("createdAt", "desc")
            .limit(limit)
            .get()

        const history = notesSnapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                content: data.content || "",
                createdBy: data.createdBy || "Unknown",
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
                displayDate: data.displayDate || ""
            }
        })

        return NextResponse.json({ history })
    } catch (error: any) {
        console.error("Error fetching notes:", error)
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
        const { leadId, content, userName } = body

        if (!leadId || !content) {
            return NextResponse.json({ error: "Missing leadId or content" }, { status: 400 })
        }

        const noteData = {
            content,
            createdBy: userName || "Unknown",
            createdAt: FieldValue.serverTimestamp(),
            displayDate: new Date().toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true
            })
        }

        await adminDb.collection("billcutLeads").doc(leadId).collection("salesNotes").add(noteData)
        
        // Also update the main document's salesNotes and latestRemark fields
        await adminDb.collection("billcutLeads").doc(leadId).update({
            sales_notes: content,
            latestRemark: content,
            lastModified: FieldValue.serverTimestamp()
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error saving note:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
