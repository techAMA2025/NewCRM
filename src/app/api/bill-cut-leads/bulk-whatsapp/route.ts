import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/firebase/firebase-admin"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const idToken = authHeader.split("Bearer ")[1]

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const body = await request.json()
    
    // Cloud Functions triggered via REST
    const region = "us-central1"
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "amacrm-76fd1"
    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/sendBulkWhatsappMessages`

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ data: body })
    })

    const result = await response.json()
    
    if (!response.ok) {
        return NextResponse.json({ 
            success: false, 
            error: result.error || "Cloud Function returned an error",
            details: result
        }, { status: response.status })
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error("Error in bulk-whatsapp API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
