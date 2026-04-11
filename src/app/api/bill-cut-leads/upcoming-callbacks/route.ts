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
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        
        // Get user role/name for filtering
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get()
        const userData = userDoc.data()
        const userName = `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim()
        const userRole = userData?.role || ""

        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

        let query: FirebaseFirestore.Query = adminDb.collection("billcutLeads")
            .where("category", "==", "Callback")
            .where("scheduled_dt", ">=", now)
            .where("scheduled_dt", "<=", thirtyMinutesFromNow)
            .orderBy("scheduled_dt", "asc")

        if (userRole === "sales") {
            query = query.where("assigned_to", "==", userName)
        }

        const snapshot = await query.get()
        
        const callbacks = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                name: data.name || "Unknown",
                phone: data.mobile || "",
                scheduledTime: data.scheduled_dt?.toDate ? data.scheduled_dt.toDate().toISOString() : data.scheduled_dt,
                assignedTo: data.assigned_to || "Unassigned"
            }
        })

        return NextResponse.json({ callbacks })
    } catch (error: any) {
        console.error("Error fetching upcoming callbacks:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
