import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
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
            console.warn(`[AUTH] Unauthorized stats access attempt by UID: ${uid}`);
            return NextResponse.json({ error: "Unauthorized: User not found in database" }, { status: 403 });
        }

        try {
            const searchParams = request.nextUrl.searchParams
            const status = searchParams.get("status")
            const source = searchParams.get("source")
            const salespersonId = searchParams.get("salespersonId")
            const tab = searchParams.get("tab") || "all"

            // Base collection reference
            const baseRef = adminDb.collection("ama_leads")

            // Helper to apply common filters
            const applyFilters = (query: FirebaseFirestore.Query) => {
                if (status && status !== "all") query = query.where("status", "==", status)
                if (source && source !== "all") query = query.where("source", "==", source)
                if (salespersonId && salespersonId !== "all") {
                    if (salespersonId === "unassigned") {
                        query = query.where("assigned_to", "in", ["–", "-", "", null])
                    } else {
                        query = query.where("assigned_to", "==", salespersonId)
                    }
                }
                return query
            }

            // Execute aggregations in parallel
            const callbackQuery = baseRef.where("status", "==", "Callback")

            const startOfDay = new Date()
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date()
            endOfDay.setHours(23, 59, 59, 999)
            const todayQuery = baseRef
                .where("synced_at", ">=", Timestamp.fromDate(startOfDay))
                .where("synced_at", "<=", Timestamp.fromDate(endOfDay))

            const [totalSnap, callbackSnap, todaySnap] = await Promise.all([
                applyFilters(baseRef).count().get(),
                callbackQuery.count().get(),
                todayQuery.count().get()
            ])

            const totalCount = totalSnap.data().count
            const callbackCount = callbackSnap.data().count
            const todayCount = todaySnap.data().count

            console.log(`[API DEBUG] fetchStats: Total: ${totalCount}, Callback: ${callbackCount}, Today: ${todayCount}`)

            return NextResponse.json({
                total: totalCount,
                callback: callbackCount,
                today: todayCount
            })

        } catch (error) {
            console.error("Error fetching lead stats:", error)
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
        }
    } catch (authError: any) {
        console.error("Authentication Error:", authError);
        return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }
}
