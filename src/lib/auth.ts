import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/firebase/firebase-admin";

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Returns `{ uid, error: null }` on success or `{ uid: null, error: NextResponse }` on failure.
 */
export async function verifyAuth(request: NextRequest): Promise<
    { uid: string; error: null } | { uid: null; error: NextResponse }
> {
    if (!adminDb || !adminAuth) {
        return {
            uid: null,
            error: NextResponse.json(
                { error: "Firebase Admin not initialized" },
                { status: 500 }
            ),
        };
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return {
            uid: null,
            error: NextResponse.json(
                { error: "Unauthorized: Missing or invalid token" },
                { status: 401 }
            ),
        };
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Verify user exists in your 'users' collection
        const userDoc = await adminDb
            .collection("users")
            .where("uid", "==", uid)
            .limit(1)
            .get();

        if (userDoc.empty) {
            console.warn(`[AUTH] Unauthorized access attempt by UID: ${uid}`);
            return {
                uid: null,
                error: NextResponse.json(
                    { error: "Unauthorized: User not found in database" },
                    { status: 403 }
                ),
            };
        }

        return { uid, error: null };
    } catch (authError: any) {
        console.error("Authentication Error:", authError);
        return {
            uid: null,
            error: NextResponse.json(
                { error: "Unauthorized: Invalid or expired token" },
                { status: 401 }
            ),
        };
    }
}
