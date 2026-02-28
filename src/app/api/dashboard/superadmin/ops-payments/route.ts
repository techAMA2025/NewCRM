import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/firebase/firebase-admin";

export const dynamic = "force-dynamic";

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
            console.warn(`[AUTH] Unauthorized superadmin ops-payments access attempt by UID: ${uid}`);
            return NextResponse.json({ error: "Unauthorized: User not found in database" }, { status: 403 });
        }

        try {
            const searchParams = request.nextUrl.searchParams;
            const selectedAnalyticsMonth = searchParams.get("month");
            const selectedAnalyticsYear = searchParams.get("year");
            const selectedSalesperson = searchParams.get("salesperson");

            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();

            const targetMonth = selectedAnalyticsMonth ? parseInt(selectedAnalyticsMonth) : currentMonth;
            const targetYear = selectedAnalyticsYear ? parseInt(selectedAnalyticsYear) : currentYear;

            const startOfMonth = new Date(targetYear, targetMonth, 1);
            const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

            let opsPaymentsQuery: FirebaseFirestore.Query = adminDb.collection("ops_payments");

            if (selectedSalesperson) {
                opsPaymentsQuery = opsPaymentsQuery.where("submittedBy", "==", selectedSalesperson);
            }

            const opsPaymentsSnapshot = await opsPaymentsQuery.get();

            const analytics = {
                totalApprovedAmount: 0,
                totalPendingAmount: 0,
                totalRejectedAmount: 0,
                approvedCount: 0,
                pendingCount: 0,
                rejectedCount: 0,
                totalCount: 0
            };

            opsPaymentsSnapshot.forEach((doc) => {
                const payment = doc.data();
                const amount = parseFloat(payment.amount) || 0;

                if (payment.timestamp) {
                    const paymentDate = new Date(payment.timestamp);
                    if (paymentDate < startOfMonth || paymentDate > endOfMonth) {
                        return; // Skip
                    }
                }

                analytics.totalCount++;

                switch (payment.status) {
                    case 'approved':
                        analytics.totalApprovedAmount += amount;
                        analytics.approvedCount++;
                        break;
                    case 'pending':
                        analytics.totalPendingAmount += amount;
                        analytics.pendingCount++;
                        break;
                    case 'rejected':
                        analytics.totalRejectedAmount += amount;
                        analytics.rejectedCount++;
                        break;
                }
            });

            return NextResponse.json(analytics, {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
                }
            });
        } catch (error) {
            console.error("Error fetching superadmin ops payments analytics:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    } catch (authError: any) {
        console.error("Authentication Error (superadmin ops-payments):", authError);
        return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }
}
