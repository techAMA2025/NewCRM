import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/firebase/firebase-admin"
import { verifyAuth } from "@/lib/auth"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    try {
        // 1. Fetch all active salespersons
        const usersRef = adminDb.collection("users")
        const usersSnapshot = await usersRef
            .where("role", "in", ["salesperson", "sales"])
            .get()

        const salespersons = usersSnapshot.docs
            .map((doc) => {
                const data = doc.data()
                return {
                    id: doc.id,
                    uid: data.uid,
                    name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.name || data.email || "Unknown",
                    email: data.email,
                    status: data.status,
                }
            })
            .filter((user) => user.status?.toLowerCase() === "active")

        // 2. Calculate the start of the current month (IST)
        const now = new Date()
        // Get IST offset: UTC+5:30
        const istOffset = 5.5 * 60 * 60 * 1000
        const istNow = new Date(now.getTime() + istOffset)
        const monthStart = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1, 0, 0, 0, 0))
        // Adjust back to UTC from IST
        monthStart.setTime(monthStart.getTime() - istOffset)

        const leadsRef = adminDb.collection("ama_leads")

        // 3. For each salesperson, run count() queries for overall and this month in parallel
        const countPromises = salespersons.map(async (sp) => {
            // Query using assigned_to field (which stores salesperson name)
            const overallQuery = leadsRef.where("assigned_to", "==", sp.name)
            const monthQuery = leadsRef
                .where("assigned_to", "==", sp.name)
                .where("synced_at", ">=", Timestamp.fromDate(monthStart))

            const [overallSnap, monthSnap] = await Promise.all([
                overallQuery.count().get(),
                monthQuery.count().get(),
            ])

            return {
                id: sp.id,
                uid: sp.uid,
                name: sp.name,
                email: sp.email,
                overallCount: overallSnap.data().count,
                thisMonthCount: monthSnap.data().count,
            }
        })

        const results = await Promise.all(countPromises)

        // Sort by this month count descending
        results.sort((a, b) => b.thisMonthCount - a.thisMonthCount)

        return NextResponse.json(results, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        })
    } catch (error) {
        console.error("Error fetching salesperson counts:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
