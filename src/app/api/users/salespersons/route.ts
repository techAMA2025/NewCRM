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
        const usersRef = adminDb.collection("users")
        const snapshot = await usersRef
            .where("role", "in", ["salesperson", "sales"])
            .get()

        const salespersons = snapshot.docs
            .map((doc) => {
                const data = doc.data()
                return {
                    id: doc.id,
                    uid: data.uid,
                    name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.name || data.email || "Unknown",
                    email: data.email,
                    phoneNumber: data.phoneNumber,
                    role: data.role,
                    status: data.status,
                }
            })
            .filter((user) => user.status?.toLowerCase() === "active")

        return NextResponse.json(salespersons, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            }
        })
    } catch (error) {
        console.error("Error fetching salespersons:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
