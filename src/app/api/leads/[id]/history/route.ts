import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"

export const dynamic = "force-dynamic"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!adminDb || !adminAuth) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    // --- Authentication Check ---
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        // Verify the token
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Verify user exists in your 'users' collection
        const userDoc = await adminDb.collection("users").where("uid", "==", uid).limit(1).get();

        if (userDoc.empty) {
            console.warn(`[AUTH] Unauthorized history access attempt by UID: ${uid}`);
            return NextResponse.json({ error: "Unauthorized: User not found in database" }, { status: 403 });
        }
        const { id } = await params
        const leadId = id
        if (!leadId) {
            return NextResponse.json({ error: "Missing lead ID" }, { status: 400 })
        }

        const historyRef = adminDb
            .collection("ama_leads")
            .doc(leadId)
            .collection("history")
            .orderBy("createdAt", "desc")

        const snapshot = await historyRef.get()

        const history = snapshot.docs.map((doc) => {
            const data = doc.data()

            // Format displayDate as dd-mm-yyyy if possible
            let displayDate = data.displayDate
            if (!displayDate && data.createdAt) {
                const date = data.createdAt.toDate()
                const day = String(date.getDate()).padStart(2, '0')
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const year = date.getFullYear()
                const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
                displayDate = `${day}-${month}-${year}, ${time}`
            } else if (displayDate) {
                // Try to reformat if it matches standard formats
                // Assuming displayDate might be in various formats, we leave it if it's already a string
                // But user requested dd-mm-yyyy.
                // If displayDate is "12/16/2025, 10:55:05 AM", let's try to parse and reformat
                try {
                    const date = new Date(displayDate)
                    if (!isNaN(date.getTime())) {
                        const day = String(date.getDate()).padStart(2, '0')
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const year = date.getFullYear()
                        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
                        displayDate = `${day}-${month}-${year}, ${time}`
                    }
                } catch (e) {
                    // Keep original if parsing fails
                }
            }

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString(),
                displayDate: displayDate
            }
        })

        return NextResponse.json(history, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            }
        })
    } catch (error) {
        console.error("Error fetching history:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
