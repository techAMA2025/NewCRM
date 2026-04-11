import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/firebase/firebase-admin"
import { getFunctions } from "firebase-admin/functions"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
    if (!adminAuth) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const idToken = authHeader.split("Bearer ")[1]

    try {
        await adminAuth.verifyIdToken(idToken)
        
        const body = await request.json()
        const { leadId, leadName, leadEmail, newStatus, leadSource } = body

        if (!leadEmail || !newStatus) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Call the Firebase Cloud Function 'sendStatusChangeMessage' via HTTPS
        // Since we are on Vercel/Next.js and using admin-sdk/firebase-admin, we can try to call it.
        // Or if it's already deployed as a callable function, we can use a direct fetch to its URL if we know it.
        
        // For simplicity in this CRM, we'll assume there's a utility or we can just fetch the function URL.
        // NOTE: In a real world, you'd probably use a more robust way to call another cloud function.
        // For now, I'll provide a placeholder or try to use the project ID to construct the URL.
        
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "amacrm-76fd1";
        const region = "us-central1"; // common default
        const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/sendStatusChangeMessage`;

        const response = await fetch(functionUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`
            },
            body: JSON.stringify({
                data: {
                    leadName: leadName || 'Dear Sir/Ma\'am',
                    leadEmail: leadEmail,
                    leadId: leadId,
                    newStatus: newStatus,
                    leadSource: leadSource || 'billcut'
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Cloud function error: ${errorText}`);
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error sending status change message:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
