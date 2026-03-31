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
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const userDoc = await adminDb.collection("users").where("uid", "==", uid).limit(1).get();
        if (userDoc.empty) {
            console.warn(`[AUTH] Unauthorized IPRKaro history access attempt by UID: ${uid}`);
            return NextResponse.json({ error: "Unauthorized: User not found in database" }, { status: 403 });
        }

        const { id } = await params
        const leadId = id
        if (!leadId) {
            return NextResponse.json({ error: "Missing lead ID" }, { status: 400 })
        }

        const historyRef = adminDb
            .collection("ipr_karo_leads")
            .doc(leadId)
            .collection("history")
            .orderBy("createdAt", "desc")

        const snapshot = await historyRef.get()

        const history = snapshot.docs.map((doc) => {
            const data = doc.data()

            let displayDate = data.displayDate
            let timeString = ""
            let dateObj: Date | null = null

            // Extract date from the actual timestamp
            if (data.createdAt && typeof data.createdAt.toDate === "function") {
                dateObj = data.createdAt.toDate()
            } else if (displayDate) {
                const parsed = new Date(displayDate)
                if (!isNaN(parsed.getTime())) {
                    dateObj = parsed
                }
            }

            if (dateObj) {
                const day = String(dateObj.getDate()).padStart(2, "0")
                const month = String(dateObj.getMonth() + 1).padStart(2, "0")
                const year = dateObj.getFullYear()
                displayDate = `${day}/${month}/${year}`

                // Format time
                timeString = dateObj.toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: "Asia/Kolkata",
                })
            }

            return {
                id: doc.id,
                content: data.content || "",
                createdBy: data.createdBy || "",
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                displayDate: displayDate || "",
                displayTime: timeString || "",
                leadId: data.leadId || leadId,
            }
        })

        return NextResponse.json(history, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            }
        })
    } catch (error) {
        console.error("Error fetching IPRKaro history:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
