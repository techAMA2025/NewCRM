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
            console.warn(`[AUTH] Unauthorized superadmin clients access attempt by UID: ${uid}`);
            return NextResponse.json({ error: "Unauthorized: User not found in database" }, { status: 403 });
        }

        try {
            const clientsRef = adminDb.collection("clients");

            // 1. Optimized Total Count (Low Cost)
            const totalCountSnapshot = await clientsRef.count().get();
            const totalClients = totalCountSnapshot.data().count;

            // 2. Complex Distributions (Currently requires .get() - High Cost)
            const snapshot = await clientsRef.get();
            console.log(`[API DEBUG] Superadmin Clients: Read ${snapshot.size} documents for complex distributions.`);

            const statusDistribution: Record<string, number> = {
                Active: 0, Dropped: 0, 'Not Responding': 0, 'On Hold': 0, Inactive: 0
            };

            const analytics = {
                totalClients: totalClients,
                statusDistribution: statusDistribution,
                advocateCount: {} as Record<string, number>,
                loanTypeDistribution: {} as Record<string, number>,
                sourceDistribution: {} as Record<string, number>,
                cityDistribution: {} as Record<string, number>,
                totalLoanAmount: 0,
                loanCount: 0,
                advocateStatusDistribution: {} as Record<string, Record<string, number>>
            };

            snapshot.forEach((doc) => {
                const client = doc.data();

                let status = client.adv_status;
                if (!status || status === 'Inactive') {
                    status = 'Inactive';
                }

                if (statusDistribution[status] !== undefined) {
                    statusDistribution[status]++;
                } else {
                    statusDistribution[status] = 1;
                }

                const advocate = client.alloc_adv || 'Unassigned';
                analytics.advocateCount[advocate] = (analytics.advocateCount[advocate] || 0) + 1;

                if (!analytics.advocateStatusDistribution[advocate]) {
                    analytics.advocateStatusDistribution[advocate] = {
                        Active: 0, Dropped: 0, 'Not Responding': 0, 'On Hold': 0, Inactive: 0
                    };
                }
                if (analytics.advocateStatusDistribution[advocate][status] !== undefined) {
                    analytics.advocateStatusDistribution[advocate][status]++;
                } else {
                    analytics.advocateStatusDistribution[advocate][status] = 1;
                }

                const source = client.source || 'Unknown';
                analytics.sourceDistribution[source] = (analytics.sourceDistribution[source] || 0) + 1;

                const city = client.city || 'Unknown';
                analytics.cityDistribution[city] = (analytics.cityDistribution[city] || 0) + 1;

                let totalClientLoanAmount = 0;
                if (client.creditCardDues) {
                    const creditCardDues = typeof client.creditCardDues === 'string'
                        ? parseFloat(client.creditCardDues.replace(/[^0-9.-]+/g, ''))
                        : parseFloat(client.creditCardDues) || 0;
                    if (!isNaN(creditCardDues) && creditCardDues > 0) totalClientLoanAmount += creditCardDues;
                }
                if (client.personalLoanDues) {
                    const personalLoanDues = typeof client.personalLoanDues === 'string'
                        ? parseFloat(client.personalLoanDues.replace(/[^0-9.-]+/g, ''))
                        : parseFloat(client.personalLoanDues) || 0;
                    if (!isNaN(personalLoanDues) && personalLoanDues > 0) totalClientLoanAmount += personalLoanDues;
                }

                if (totalClientLoanAmount > 0) {
                    analytics.totalLoanAmount += totalClientLoanAmount;
                    analytics.loanCount++;
                }

                if (client.banks && Array.isArray(client.banks) && client.banks.length > 0) {
                    client.banks.forEach((bank: any) => {
                        const loanType = bank.loanType || 'Unknown';
                        analytics.loanTypeDistribution[loanType] = (analytics.loanTypeDistribution[loanType] || 0) + 1;
                    });
                }
            });

            const avgLoanAmount = analytics.loanCount > 0 ? Math.round(analytics.totalLoanAmount / analytics.loanCount) : 0;
            const advocateEntries = Object.entries(analytics.advocateCount);
            advocateEntries.sort((a, b) => b[1] - a[1]);
            const topAdvocates = advocateEntries.slice(0, 10).map(([name, clientCount]) => ({ name, clientCount }));

            return NextResponse.json({
                totalClients,
                statusDistribution,
                topAdvocates,
                loanTypeDistribution: analytics.loanTypeDistribution,
                sourceDistribution: analytics.sourceDistribution,
                cityDistribution: analytics.cityDistribution,
                totalLoanAmount: analytics.totalLoanAmount,
                avgLoanAmount,
                advocateStatusDistribution: analytics.advocateStatusDistribution
            }, {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
                }
            });
        } catch (error) {
            console.error("Error fetching superadmin client analytics:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    } catch (authError: any) {
        console.error("Authentication Error (superadmin clients):", authError);
        return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }
}
