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
            console.warn(`[AUTH] Unauthorized superadmin leads access attempt by UID: ${uid}`);
            return NextResponse.json({ error: "Unauthorized: User not found in database" }, { status: 403 });
        }

        try {
            const searchParams = request.nextUrl.searchParams;
            const startDateParam = searchParams.get("startDate");
            const endDateParam = searchParams.get("endDate");
            const selectedLeadsSalesperson = searchParams.get("selectedLeadsSalesperson");
            const isFilterApplied = searchParams.get("isFilterApplied") === "true";

            const amaLeadsCol = adminDb.collection("ama_leads");
            const billcutLeadsCol = adminDb.collection("billcutLeads");

            const currentDate = new Date();
            const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

            // Base filters
            const applyBaseFilters = (query: FirebaseFirestore.Query, type: 'ama' | 'billcut') => {
                let q = query;
                if (isFilterApplied && (startDateParam || endDateParam)) {
                    if (startDateParam) {
                        const start = new Date(startDateParam);
                        q = q.where(type === 'ama' ? "synced_at" : "synced_date", ">=", Timestamp.fromDate(start));
                    }
                    if (endDateParam) {
                        const end = new Date(`${endDateParam}T23:59:59`);
                        q = q.where(type === 'ama' ? "synced_at" : "synced_date", "<=", Timestamp.fromDate(end));
                    }
                }

                if (selectedLeadsSalesperson && selectedLeadsSalesperson !== "all") {
                    q = q.where("assigned_to", "==", selectedLeadsSalesperson);
                }
                return q;
            };

            const sources = ['settleloans', 'credsettlee', 'ama', 'billcut'];
            const statuses = [
                'Interested', 'Not Interested', 'Not Answering', 'Callback',
                'Converted', 'Loan Required', 'Short Loan', 'Cibil Issue',
                'Closed Lead', 'Language Barrier', 'Future Potential', 'No Status'
            ];

            // 1. Fetch Source Totals
            const sourceTotalPromises = sources.map(async (source) => {
                let q;
                if (source === 'billcut') {
                    q = applyBaseFilters(billcutLeadsCol, 'billcut');
                } else {
                    const dbSources = source === 'settleloans' ? ['Settleloans Contact', 'Settleloans Home'] :
                        source === 'credsettlee' ? ['CREDSETTLE'] :
                            ['AMA'];
                    q = applyBaseFilters(amaLeadsCol, 'ama').where('source', 'in', dbSources);
                }
                const snap = await q.count().get();
                return { source, count: snap.data().count };
            });

            // 2. Fetch Status/Source Matrix
            const matrixPromises = statuses.flatMap(status =>
                sources.map(async (source) => {
                    let q;
                    if (source === 'billcut') {
                        const base = applyBaseFilters(billcutLeadsCol, 'billcut');
                        if (status === 'No Status') {
                            q = base.where('category', 'in', ['No Status', '', null]);
                        } else {
                            q = base.where('category', '==', status);
                        }
                    } else {
                        const dbSources = source === 'settleloans' ? ['Settleloans Contact', 'Settleloans Home'] :
                            source === 'credsettlee' ? ['CREDSETTLE'] :
                                ['AMA'];
                        const base = applyBaseFilters(amaLeadsCol, 'ama').where('source', 'in', dbSources);
                        if (status === 'No Status') {
                            q = base.where('status', 'in', ['No Status', '', null]);
                        } else {
                            q = base.where('status', '==', status);
                        }
                    }
                    const snap = await q.count().get();
                    return { status, source, count: snap.data().count };
                })
            );

            const [sourceResults, matrixResults] = await Promise.all([
                Promise.all(sourceTotalPromises),
                Promise.all(matrixPromises)
            ]);

            // 3. Fetch Salesperson Stats (Interested/Converted)
            const usersRef = adminDb.collection("users");
            const salesUsersSnapshot = await usersRef.where("role", "==", "sales").get();
            const salesUsers: string[] = [];
            salesUsersSnapshot.forEach(doc => {
                const data = doc.data();
                const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
                if (fullName && (data.status === 'active' || !data.status)) {
                    salesUsers.push(fullName);
                }
            });

            const salespersonPromises = salesUsers.flatMap(name => [
                (async () => {
                    const qLeads = applyBaseFilters(amaLeadsCol, 'ama').where('assigned_to', '==', name).where('status', '==', 'Interested');
                    const qBillcut = applyBaseFilters(billcutLeadsCol, 'billcut').where('assigned_to', '==', name).where('category', '==', 'Interested');
                    const [s1, s2] = await Promise.all([qLeads.count().get(), qBillcut.count().get()]);
                    return { name, type: 'interested', count: s1.data().count + s2.data().count };
                })(),
                (async () => {
                    const qLeads = applyBaseFilters(amaLeadsCol, 'ama').where('assigned_to', '==', name).where('status', '==', 'Converted');
                    const qBillcut = applyBaseFilters(billcutLeadsCol, 'billcut').where('assigned_to', '==', name).where('category', '==', 'Converted');
                    const [s1, s2] = await Promise.all([qLeads.count().get(), qBillcut.count().get()]);
                    return { name, type: 'converted', count: s1.data().count + s2.data().count };
                })()
            ]);

            const salespersonResults = await Promise.all(salespersonPromises);

            // Process Results
            const sourceTotalCounts: any = { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 };
            sourceResults.forEach(r => { sourceTotalCounts[r.source] = r.count; });

            const statusCounts: any = {};
            statuses.forEach(s => {
                statusCounts[s] = { settleloans: 0, credsettlee: 0, ama: 0, billcut: 0 };
            });
            matrixResults.forEach(r => {
                statusCounts[r.status][r.source] = r.count;
            });

            const leadsBySalesperson: Record<string, { interested: number; converted: number }> = {};
            salespersonResults.forEach(r => {
                if (!leadsBySalesperson[r.name]) leadsBySalesperson[r.name] = { interested: 0, converted: 0 };
                if (r.type === 'interested') leadsBySalesperson[r.name].interested = r.count;
                else leadsBySalesperson[r.name].converted = r.count;
            });

            const statusColors = [
                'rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)', 'rgba(255, 206, 86, 0.6)',
                'rgba(54, 162, 235, 0.6)', 'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)',
                'rgba(199, 199, 199, 0.6)', 'rgba(83, 102, 255, 0.6)', 'rgba(40, 159, 64, 0.6)',
                'rgba(210, 99, 132, 0.6)', 'rgba(100, 206, 86, 0.6)', 'rgba(150, 162, 235, 0.6)',
            ];

            const datasets = statuses.map((status, index) => ({
                label: status,
                data: [statusCounts[status].settleloans, statusCounts[status].credsettlee, statusCounts[status].ama, statusCounts[status].billcut],
                backgroundColor: statusColors[index % statusColors.length],
            }));

            const totalQueries = sourceResults.length + matrixResults.length;
            console.log(`[API DEBUG] Superadmin Leads: Executed ${totalQueries} count queries. Estimated reads: ${totalQueries / 1000}`);

            return NextResponse.json({
                leadsBySourceData: {
                    labels: ['Settleloans', 'Credsettlee', 'AMA', 'Billcut'],
                    datasets,
                },
                sourceTotals: sourceTotalCounts,
                leadsBySalesperson,
            }, {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
                }
            });
        } catch (error) {
            console.error("Error fetching superadmin leads data:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    } catch (authError: any) {
        console.error("Authentication Error (superadmin leads):", authError);
        return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }
}
