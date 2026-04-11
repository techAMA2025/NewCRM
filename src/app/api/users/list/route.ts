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
        const searchParams = request.nextUrl.searchParams
        const roles = searchParams.get("roles")?.split(",") || []
        
        let query: FirebaseFirestore.Query = adminDb.collection("users")
        
        if (roles.length > 0) {
            query = query.where("role", "in", roles)
        }

        const snapshot = await query.get()

        const users = snapshot.docs
            .map((doc) => {
                const data = doc.data()
                return {
                    id: doc.id,
                    uid: data.uid,
                    firstName: data.firstName || "",
                    lastName: data.lastName || "",
                    name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.name || data.email || "Unknown",
                    email: data.email,
                    role: data.role,
                    status: data.status,
                    noAnswerWorkModeEnabled: data.noAnswerWorkModeEnabled || false
                }
            })
            .filter((user) => user.status?.toLowerCase() === "active" || !user.status)

        return NextResponse.json(users)
    } catch (error) {
        console.error("Error fetching users:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
