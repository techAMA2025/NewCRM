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
        
        // Find the requester by the 'uid' field to handle cases where doc ID !== UID
        const requesterSnap = await adminDb.collection("users").where("uid", "==", decodedToken.uid).limit(1).get()
        
        if (requesterSnap.empty) {
            console.warn(`[WORK_MODE] Requester profile not found for UID: ${decodedToken.uid}`)
            return NextResponse.json({ error: "User profile not found in database" }, { status: 403 })
        }
        
        const currentUserData = requesterSnap.docs[0].data()
        
        // Only allow admins and overlords to toggle work mode
        if (!["admin", "overlord"].includes(currentUserData.role)) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 })
        }

        const body = await request.json()
        const { userId, userName, enabled } = body

        let targetUserId = userId

        // If userName is provided, find the target user by their full name
        if (userName) {
            const searchTerm = userName.trim().toLowerCase()
            const usersSnap = await adminDb.collection("users").get()
            
            const targetDoc = usersSnap.docs.find(doc => {
                const data = doc.data()
                const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim().toLowerCase()
                return fullName === searchTerm || (data.name && data.name.toLowerCase() === searchTerm)
            })

            if (targetDoc) {
                targetUserId = targetDoc.id
            } else if (!targetUserId) {
                return NextResponse.json({ error: `User "${userName}" not found` }, { status: 404 })
            }
        }

        if (!targetUserId) {
            return NextResponse.json({ error: "Missing userId or userName" }, { status: 400 })
        }

        await adminDb.collection("users").doc(targetUserId).update({
            noAnswerWorkModeEnabled: enabled,
            updatedAt: new Date()
        })

        return NextResponse.json({ success: true, enabled })
    } catch (error: any) {
        console.error("Error toggling work mode:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
