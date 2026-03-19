import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/firebase/firebase-admin"
import { verifyAuth } from "@/lib/auth"

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
            .where("role", "in", ["salesperson", "sales", "billcut"])
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
            .filter((user) => {
                const n = user.name.toLowerCase().trim()
                const excluded = ["gaurav johly", "admin .", "admin", "jain bhavya"]
                if (excluded.includes(n)) return false
                if (n.startsWith("gaurav")) return false
                if (n === "admin" || n.startsWith("admin ")) return false
                return true
            })

        // 2. Calculate the start of the current month (IST)
        const now = new Date()
        const istOffset = 5.5 * 60 * 60 * 1000
        const istNow = new Date(now.getTime() + istOffset)
        const monthStart = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1, 0, 0, 0, 0))
        // Adjust back to UTC from IST
        monthStart.setTime(monthStart.getTime() - istOffset)
        const monthStartMs = monthStart.getTime()

        const leadsRef = adminDb.collection("billcutLeads")

        // 3. For each salesperson, run count() queries for overall and this month
        const countPromises = salespersons.map(async (sp) => {
            const overallQuery = leadsRef.where("assigned_to", "==", sp.name)
            const monthQuery = leadsRef
                .where("assigned_to", "==", sp.name)
                .where("date", ">=", monthStartMs)

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
        console.error("Error fetching billcut salesperson counts:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
