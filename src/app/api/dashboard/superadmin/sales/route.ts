import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/firebase/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

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
            console.warn(`[AUTH] Unauthorized superadmin sales access attempt by UID: ${uid}`);
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
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            const targetMonth = selectedAnalyticsMonth ? parseInt(selectedAnalyticsMonth) : currentMonth;
            const targetYear = selectedAnalyticsYear ? parseInt(selectedAnalyticsYear) : currentYear;
            const targetMonthName = monthNames[targetMonth];

            // --- 1. Fetch Salespeople (Low Cost) ---
            const usersRef = adminDb.collection("users");
            const usersSnapshot = await usersRef.where("role", "==", "sales").get();

            const salespeople: { id: string; name: string }[] = [];
            usersSnapshot.forEach((doc) => {
                const userData = doc.data();
                const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                const isActive = userData.status === 'active' || !userData.status;

                if (fullName && isActive) {
                    salespeople.push({ id: doc.id, name: fullName });
                }
            });
            salespeople.sort((a, b) => a.name.localeCompare(b.name));

            // --- 2. Fetch Sales Analytics (Optimized) ---
            let totalTarget = 0;
            let totalCollected = 0;
            let paymentBasedRevenue = 0;

            const startOfMonth = new Date(targetYear, targetMonth, 1);
            const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

            const paymentsSnapshot = await adminDb.collection("payments")
                .where("status", "==", "approved")
                .where("timestamp", ">=", Timestamp.fromDate(startOfMonth))
                .where("timestamp", "<=", Timestamp.fromDate(endOfMonth))
                .get();

            console.log(`[API DEBUG] Superadmin Sales: Read ${paymentsSnapshot.size} payments for ${targetMonthName} ${targetYear}`);

            paymentsSnapshot.forEach((doc) => {
                const payment = doc.data();
                paymentBasedRevenue += parseFloat(payment.amount) || 0;
            });

            // Fetch targets
            const monthYearName = `${targetMonthName}_${targetYear}`;
            const salesTargetsRef = adminDb.collection(`targets/${monthYearName}/sales_targets`);
            const salesTargetsSnapshot = await salesTargetsRef.get();

            const allSalesTargets: Record<string, any> = {};
            salesTargetsSnapshot.forEach((doc) => {
                const targetData = doc.data();
                totalTarget += targetData.amountCollectedTarget || 0;
                if (!paymentsSnapshot.size) {
                    totalCollected += targetData.amountCollected || 0;
                }

                allSalesTargets[doc.id] = {
                    userId: doc.id,
                    userName: targetData.userName || 'Unknown',
                    amountCollectedTarget: targetData.amountCollectedTarget || 0,
                    amountCollected: targetData.amountCollected || 0,
                    convertedLeads: targetData.convertedLeads || 0,
                    convertedLeadsTarget: targetData.convertedLeadsTarget || 0
                };
            });

            if (paymentsSnapshot.size > 0) {
                totalCollected = paymentBasedRevenue;
            }

            const salesAnalytics = {
                totalTargetAmount: totalTarget,
                totalCollectedAmount: totalCollected,
                monthlyRevenue: [0, 0, 0, 0, 0, 0],
                conversionRate: totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0,
                avgDealSize: 0,
            };

            // --- 3. Individual Sales Data ---
            let individualSalesData = null;
            if (selectedSalesperson) {
                const person = salespeople.find(p => p.name === selectedSalesperson);
                if (person) {
                    const targetData = allSalesTargets[person.id];
                    if (targetData) {
                        individualSalesData = {
                            name: targetData.userName || selectedSalesperson,
                            targetAmount: targetData.amountCollectedTarget || 0,
                            collectedAmount: targetData.amountCollected || 0,
                            conversionRate: targetData.amountCollectedTarget > 0
                                ? Math.round((targetData.amountCollected / targetData.amountCollectedTarget) * 100)
                                : 0,
                            monthlyData: [0, 0, 0, 0, 0, 0]
                        };
                    }
                }
            }

            return NextResponse.json({
                salesAnalytics,
                salespeople,
                individualSalesData,
                allSalesTargets
            }, {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
                }
            });
        } catch (error) {
            console.error("Error fetching superadmin sales data:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    } catch (authError: any) {
        console.error("Authentication Error (superadmin sales):", authError);
        return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }
}
