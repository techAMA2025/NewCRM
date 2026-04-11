import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"

export const dynamic = "force-dynamic"

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
        const userSnapshot = await adminDb.collection("users").doc(decodedToken.uid).get()
        const currentUserData = userSnapshot.data()
        
        if (!currentUserData || !["admin", "overlord"].includes(currentUserData.role)) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 })
        }

        const body = await request.json()
        const { userId, enabled } = body

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 })
        }

        await adminDb.collection("users").doc(userId).update({
            noAnswerWorkModeEnabled: enabled,
            updatedAt: new Date()
        })

        return NextResponse.json({ success: true, enabled })
    } catch (error: any) {
        console.error("Error toggling work mode:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
