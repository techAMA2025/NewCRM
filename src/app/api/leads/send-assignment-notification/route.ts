import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"

export const dynamic = "force-dynamic"

/**
 * POST /api/leads/send-assignment-notification
 *
 * Sends the "pre_call_message_utlity" WATI template message to one or more leads
 * immediately after they have been assigned to a salesperson.
 *
 * Body:
 *   leadIds          string[]   - IDs of the lead documents that were just assigned
 *   salespersonId    string     - The Firestore document ID (or UID) of the salesperson in the users collection
 *   collectionName   string     - The Firestore collection (optional, defaults to "ama_leads")
 *
 * Template: pre_call_message_utlity
 *   {{1}}      → lead's name    (client name)
 *   {{phone}}  → salesperson's phoneNumber (from users collection)
 *   {{name}}   → salesperson's firstName   (from users collection)
 *
 * All WATI messages are sent in a single batch API call via the
 * sendTemplateMessages endpoint — exactly matching the existing
 * sendBulkWhatsappMessages Firebase function pattern.
 */
export async function POST(request: NextRequest) {
    if (!adminDb || !adminAuth) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    // --- Auth ---
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]

    try {
        await adminAuth.verifyIdToken(idToken)
    } catch {
        return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { leadIds, salespersonId, collectionName = "ama_leads" } = body as { 
            leadIds: string[]; 
            salespersonId: string;
            collectionName?: string;
        }

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: "No lead IDs provided" }, { status: 400 })
        }

        if (!salespersonId) {
            return NextResponse.json({ error: "No salespersonId provided" }, { status: 400 })
        }

        const validCollections = ["ama_leads", "billcutLeads"];
        if (!validCollections.includes(collectionName)) {
            return NextResponse.json({ error: `Invalid collection: ${collectionName}` }, { status: 400 })
        }

        const db = adminDb

        // --- 1. Fetch salesperson details from users collection ---
        let salespersonData: { firstName?: string; phoneNumber?: string } | null = null

        // Try by Firestore doc ID first
        const directDoc = await db.collection("users").doc(salespersonId).get()
        if (directDoc.exists) {
            salespersonData = directDoc.data() as { firstName?: string; phoneNumber?: string }
        } else {
            // Fallback: query by uid field
            const snap = await db.collection("users").where("uid", "==", salespersonId).limit(1).get()
            if (!snap.empty) {
                salespersonData = snap.docs[0].data() as { firstName?: string; phoneNumber?: string }
            }
        }

        if (!salespersonData) {
            console.warn(`[ASSIGNMENT_NOTIFICATION] Salesperson ${salespersonId} not found in users collection`)
            return NextResponse.json({ error: "Salesperson not found in users collection" }, { status: 404 })
        }

        let salespersonPhone = (salespersonData.phoneNumber || "").toString().replace(/\D/g, "")
        // Strip 91 country code prefix so the template shows the raw 10-digit number
        if (salespersonPhone.startsWith("91") && salespersonPhone.length === 12) {
            salespersonPhone = salespersonPhone.substring(2)
        }
        const salespersonFirstName = salespersonData.firstName || "Our Representative"

        if (!salespersonPhone || salespersonPhone.length < 10) {
            console.warn(`[ASSIGNMENT_NOTIFICATION] Salesperson ${salespersonId} has no phone number — skipping`)
            return NextResponse.json({
                success: false,
                message: "Salesperson has no phone number — skipping WATI notification",
            })
        }

        // --- 2. Fetch lead details (name + phone) from the specified collection ---
        const leadSnaps = await Promise.all(
            leadIds.map((id) => db.collection(collectionName).doc(id).get())
        )

        interface Receiver {
            whatsappNumber: string
            customParams: { name: string; value: string }[]
        }

        const receivers: Receiver[] = []

        for (const snap of leadSnaps) {
            if (!snap.exists) continue
            const data = snap.data()!

            let rawLeadPhone = (
                data.mobile || data.phone || data.number || ""
            ).toString().replace(/\D/g, "")

            // Normalise to 91XXXXXXXXXX
            if (rawLeadPhone.startsWith("+91")) {
                rawLeadPhone = rawLeadPhone.substring(3)
            }
            if (!rawLeadPhone.startsWith("91") && rawLeadPhone.length === 10) {
                rawLeadPhone = "91" + rawLeadPhone
            }

            if (rawLeadPhone.length < 10) continue // skip invalid

            const clientName = data.name || "Valued Customer"

            receivers.push({
                whatsappNumber: rawLeadPhone,
                customParams: [
                    // {{1}} = client name
                    { name: "1", value: clientName },
                    // {{phone}} = salesperson phone number (displayed in message)
                    { name: "phone", value: salespersonPhone },
                    // {{name}} = salesperson first name
                    { name: "name", value: salespersonFirstName },
                ],
            })
        }

        if (receivers.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No leads with valid phone numbers — no WATI messages sent",
            })
        }

        // --- 3. WATI API Configuration (mirrors sendBulkWhatsappMessages Firebase function) ---
        const watiApiKey = process.env.WATI_API_KEY
        const watiBaseUrl = process.env.WATI_BASE_URL || "https://live-mt-server.wati.io"
        const tenantId = process.env.WATI_TENANT_ID || "366071"

        if (!watiApiKey) {
            console.warn("[ASSIGNMENT_NOTIFICATION] WATI_API_KEY not configured — skipping notification")
            return NextResponse.json({
                success: true,
                message: "Assignment saved. WATI not configured — no messages sent.",
                attempted: 0,
            })
        }

        const TEMPLATE_NAME = "pre_call_message_utlity"

        // --- 4. Send via the WATI batch endpoint (all in one request, processed in parallel by WATI) ---
        const requestBody = {
            template_name: TEMPLATE_NAME,
            broadcast_name: `${TEMPLATE_NAME}_assign_${Date.now()}`,
            receivers,
        }

        console.log(
            `[ASSIGNMENT_NOTIFICATION] Sending ${receivers.length} messages via WATI batch API. Template: ${TEMPLATE_NAME}`
        )

        const watiResponse = await fetch(
            `${watiBaseUrl}/${tenantId}/api/v1/sendTemplateMessages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${watiApiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            }
        )

        if (!watiResponse.ok) {
            const errorText = await watiResponse.text()
            console.error(`[ASSIGNMENT_NOTIFICATION] WATI API error ${watiResponse.status}: ${errorText}`)
            return NextResponse.json({
                success: false,
                message: `WATI API error: ${watiResponse.status}`,
                detail: errorText,
            })
        }

        const watiResult = await watiResponse.json()

        console.log(
            `[ASSIGNMENT_NOTIFICATION] WATI batch response received for ${receivers.length} leads.`
        )

        return NextResponse.json({
            success: true,
            attempted: receivers.length,
            watiResult,
        })
    } catch (error: any) {
        console.error("[ASSIGNMENT_NOTIFICATION] Error:", error)
        return NextResponse.json({ error: "Internal Server Error", detail: error.message }, { status: 500 })
    }
}
