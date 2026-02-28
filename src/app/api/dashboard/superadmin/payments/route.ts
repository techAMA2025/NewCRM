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
            console.warn(`[AUTH] Unauthorized superadmin payments access attempt by UID: ${uid}`);
            return NextResponse.json({ error: "Unauthorized: User not found in database" }, { status: 403 });
        }

        try {
            const paymentsCollection = adminDb.collection("clients_payments");
            const paymentsSnapshot = await paymentsCollection.limit(100).get();

            const analytics = {
                totalPaymentsAmount: 0,
                totalPaidAmount: 0,
                totalPendingAmount: 0,
                clientCount: 0,
                paymentMethodDistribution: {} as Record<string, number>,
                monthlyPaymentsData: [0, 0, 0, 0, 0, 0],
                paymentTypeDistribution: {
                    full: 0,
                    partial: 0
                }
            };

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const currentMonthStart = new Date(currentYear, currentMonth, 1);
            const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

            let currentMonthCollected = 0;
            let currentMonthPending = 0;

            const clientIds: string[] = [];

            paymentsSnapshot.forEach((clientDoc) => {
                const clientPayment = clientDoc.data();
                clientIds.push(clientDoc.id);

                analytics.clientCount++;
                analytics.totalPaymentsAmount += clientPayment.totalPaymentAmount || 0;
                analytics.totalPaidAmount += clientPayment.paidAmount || 0;
                analytics.totalPendingAmount += clientPayment.pendingAmount || 0;

                const monthlyFees = clientPayment.monthlyFees || 0;

                if (clientPayment.startDate) {
                    let startDate: Date;
                    if (clientPayment.startDate.toDate) {
                        startDate = clientPayment.startDate.toDate();
                    } else {
                        startDate = new Date(clientPayment.startDate);
                    }

                    if (startDate <= currentMonthEnd) {
                        currentMonthPending += monthlyFees;
                    }
                }

                if (clientPayment.paymentsCompleted > 0) {
                    if (clientPayment.paidAmount < monthlyFees) {
                        analytics.paymentTypeDistribution.partial++;
                    } else {
                        analytics.paymentTypeDistribution.full++;
                    }
                }
            });

            const maxClientsToProcess = Math.min(clientIds.length, 20);

            const historyPromises = clientIds.slice(0, maxClientsToProcess).map(async (clientId) => {
                const paymentHistoryRef = adminDb!.collection(`clients_payments/${clientId}/payment_history`);
                const historySnapshot = await paymentHistoryRef
                    .where('payment_status', 'in', ['approved', 'Approved'])
                    .limit(5)
                    .get();

                historySnapshot.forEach((paymentDoc) => {
                    const payment = paymentDoc.data();
                    currentMonthCollected += payment.requestedAmount || 0;

                    let dateToCheck: Date | null = null;

                    if (payment.paymentDate) {
                        dateToCheck = payment.paymentDate.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
                    } else if (payment.dateApproved) {
                        dateToCheck = payment.dateApproved.toDate ? payment.dateApproved.toDate() : new Date(payment.dateApproved);
                    } else if (payment.requestDate) {
                        dateToCheck = payment.requestDate.toDate ? payment.requestDate.toDate() : new Date(payment.requestDate);
                    }

                    if (dateToCheck && dateToCheck >= currentMonthStart && dateToCheck <= currentMonthEnd) {
                        // isCurrentMonth = true;
                    } else if (payment.monthNumber === currentMonth + 1) {
                        // isCurrentMonth = true;
                    }
                });
            });

            await Promise.all(historyPromises);

            currentMonthPending = Math.max(0, currentMonthPending - currentMonthCollected);

            const completionRate = analytics.totalPaymentsAmount > 0
                ? Math.round((analytics.totalPaidAmount / analytics.totalPaymentsAmount) * 100)
                : 0;

            const finalPaymentAnalytics = {
                ...analytics,
                completionRate
            };

            const finalCurrentMonthPayments = {
                collected: currentMonthCollected,
                pending: currentMonthPending
            };

            return NextResponse.json({
                paymentAnalytics: finalPaymentAnalytics,
                currentMonthPayments: finalCurrentMonthPayments
            }, {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
                }
            });
        } catch (error) {
            console.error("Error fetching superadmin payment analytics:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    } catch (authError: any) {
        console.error("Authentication Error (superadmin payments):", authError);
        return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }
}
