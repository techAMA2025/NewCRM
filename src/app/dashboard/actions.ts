'use server'

import { db } from '@/firebase/firebase-admin'

// Define interfaces for the data structures
export interface SalesUser {
    id: string;
    name?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    uid?: string;
    status?: string;
    identifiers: string[];
    role?: string;
}

export interface TargetData {
    id: string;
    userId?: string;
    userName?: string;
    amountCollected?: number;
    amountCollectedTarget?: number;
    convertedLeads?: number;
    convertedLeadsTarget?: number;
    [key: string]: any;
}

export interface DashboardData {
    salesUsers: SalesUser[];
    targetData: TargetData[];
    stats: {
        totalUsers: number;
        totalSales: number;
        totalAdvocates: number;
    };
}

export interface HistoryData {
    month: string;
    year: number;
    target: number;
    collected: number;
    fullLabel: string;
}

// Helper function to serialize Firestore data
const serializeData = (data: any): any => {
    if (data === null || data === undefined) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(serializeData);
    }

    if (typeof data === 'object') {
        // Handle Firestore Timestamp
        if (data._seconds !== undefined && data._nanoseconds !== undefined) {
            return new Date(data._seconds * 1000).toISOString();
        }

        // Handle Date objects
        if (data instanceof Date) {
            return data.toISOString();
        }

        // Handle other objects recursively
        const serialized: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                serialized[key] = serializeData(data[key]);
            }
        }
        return serialized;
    }

    return data;
};

export async function getAdminDashboardData(month: string, year: number): Promise<DashboardData> {
    try {
        console.time('getAdminDashboardData:Total');
        if (!db) {
            throw new Error('Firebase Admin SDK not initialized');
        }

        const monthDocId = `${month}_${year}`;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const targetMonth = monthNames.indexOf(month);
        const startOfMonth = new Date(year, targetMonth, 1);
        const endOfMonth = new Date(year, targetMonth + 1, 0, 23, 59, 59, 999);
        const startOfMonthStr = startOfMonth.toISOString();
        const endOfMonthStr = endOfMonth.toISOString();

        // Prepare Queries (Start them all at once)
        console.time('getAdminDashboardData:FetchAll');

        // 1. Users Query
        const usersPromise = db.collection('users').where('status', '==', 'active').get();

        // 2. Payments Query (Parallel Timestamp & String)
        const paymentsRef = db.collection('payments');
        const paymentsPromise = Promise.all([
            paymentsRef
                .where('status', '==', 'approved')
                .where('timestamp', '>=', startOfMonth)
                .where('timestamp', '<=', endOfMonth)
                .get(),
            paymentsRef
                .where('status', '==', 'approved')
                .where('timestamp', '>=', startOfMonthStr)
                .where('timestamp', '<=', endOfMonthStr)
                .get()
        ]);

        // 3. Targets Query (Conditional logic wrapped in async function)
        const targetsPromise = (async () => {
            const monthlyDocRef = db.collection('targets').doc(monthDocId);
            const monthlyDocSnap = await monthlyDocRef.get();

            if (monthlyDocSnap.exists) {
                const salesTargetsSnap = await monthlyDocRef.collection('sales_targets').get();
                return { type: 'monthly', doc: monthlyDocSnap, subDocs: salesTargetsSnap };
            } else {
                const targetsSnap = await db.collection('targets').get();
                return { type: 'legacy', docs: targetsSnap };
            }
        })();

        // Await all queries
        const [usersSnap, [timestampSnap, stringSnap], targetsResult] = await Promise.all([
            usersPromise,
            paymentsPromise,
            targetsPromise
        ]);
        console.timeEnd('getAdminDashboardData:FetchAll');

        // --- Process Users ---
        console.time('getAdminDashboardData:ProcessUsers');
        let sales = 0;
        let advocates = 0;
        const salesUsersList: SalesUser[] = [];

        usersSnap.forEach((doc) => {
            const userData = doc.data();
            if (userData.role === 'sales') {
                sales++;
                const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                salesUsersList.push({
                    id: doc.id,
                    uid: userData.uid,
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email,
                    fullName: fullName,
                    status: userData.status,
                    role: userData.role,
                    identifiers: [
                        doc.id,
                        userData.uid || '',
                        userData.firstName || '',
                        userData.lastName || '',
                        fullName,
                        userData.email || ''
                    ].filter(Boolean)
                });
            }
            if (userData.role === 'advocate') advocates++;
        });
        console.timeEnd('getAdminDashboardData:ProcessUsers');

        // --- Process Payments ---
        console.time('getAdminDashboardData:ProcessPayments');
        let individualPayments: { [userId: string]: number } = {};
        let hasPaymentData = false;

        const processPaymentDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
            const payment = doc.data();
            const amount = parseFloat(payment.amount) || 0;
            hasPaymentData = true;

            if (payment.userId || payment.assignedTo || payment.salesperson) {
                const userId = payment.userId || payment.assignedTo || payment.salesperson;
                individualPayments[userId] = (individualPayments[userId] || 0) + amount;
            }
        };

        const processedIds = new Set<string>();
        timestampSnap.forEach(doc => {
            if (!processedIds.has(doc.id)) {
                processPaymentDoc(doc);
                processedIds.add(doc.id);
            }
        });
        stringSnap.forEach(doc => {
            if (!processedIds.has(doc.id)) {
                processPaymentDoc(doc);
                processedIds.add(doc.id);
            }
        });
        console.timeEnd('getAdminDashboardData:ProcessPayments');

        // --- Process Targets ---
        console.time('getAdminDashboardData:ProcessTargets');
        const targetsData: TargetData[] = [];

        if (targetsResult.type === 'monthly' && targetsResult.subDocs) {
            targetsResult.subDocs.forEach(doc => {
                const data = doc.data();
                let collectedAmount = data.amountCollected || 0;

                if (hasPaymentData) {
                    const userIdentifiers = [data.userId, data.userName, doc.id].filter(Boolean);
                    for (const identifier of userIdentifiers) {
                        if (individualPayments[identifier]) {
                            collectedAmount = individualPayments[identifier];
                            break;
                        }
                    }
                }

                targetsData.push({
                    id: doc.id,
                    userId: data.userId,
                    userName: data.userName,
                    amountCollected: collectedAmount,
                    amountCollectedTarget: data.amountCollectedTarget || 0,
                    convertedLeads: data.convertedLeads || 0,
                    convertedLeadsTarget: data.convertedLeadsTarget || 0
                });
            });
        } else if (targetsResult.type === 'legacy' && targetsResult.docs) {
            targetsResult.docs.forEach(doc => {
                const data = doc.data();
                if (data.month && data.year) return; // Skip monthly docs

                let collectedAmount = data.amountCollected || 0;
                if (hasPaymentData) {
                    const userIdentifiers = [data.userId, data.userName, doc.id].filter(Boolean);
                    for (const identifier of userIdentifiers) {
                        if (individualPayments[identifier]) {
                            collectedAmount = individualPayments[identifier];
                            break;
                        }
                    }
                }

                targetsData.push({
                    id: doc.id,
                    ...data,
                    amountCollected: collectedAmount
                });
            });
        }
        console.timeEnd('getAdminDashboardData:ProcessTargets');

        console.timeEnd('getAdminDashboardData:Total');
        return {
            salesUsers: serializeData(salesUsersList),
            targetData: serializeData(targetsData),
            stats: {
                totalUsers: salesUsersList.length,
                totalSales: sales,
                totalAdvocates: advocates
            }
        };

    } catch (error) {
        console.error('Error in getAdminDashboardData:', error);
        throw new Error('Failed to fetch admin dashboard data');
    }
}

export async function getDashboardHistory(endMonth: string, endYear: number): Promise<HistoryData[]> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Fetch ALL approved payments
        // NOTE: This is still heavy if there are millions of payments. 
        // For "All Time" history, we need all payments. 
        // Optimization: We could cache this or use aggregation queries if Firestore supports it (count/sum).
        // But for now, we keep it as is for payments, but optimize TARGETS below.
        const paymentsRef = db.collection('payments');

        console.time('getDashboardHistory:Payments');
        const paymentsSnap = await paymentsRef
            .where('status', '==', 'approved')
            .get();
        console.timeEnd('getDashboardHistory:Payments');

        // Aggregate payments by month
        const paymentsByMonth: { [key: string]: number } = {};
        const allMonthsSet = new Set<string>();

        paymentsSnap.forEach(doc => {
            const payment = doc.data();
            if (payment.timestamp) {
                let paymentDate: Date;
                if (typeof payment.timestamp === 'string') {
                    paymentDate = new Date(payment.timestamp);
                } else if (payment.timestamp.toDate) {
                    paymentDate = payment.timestamp.toDate();
                } else if (payment.timestamp._seconds) {
                    paymentDate = new Date(payment.timestamp._seconds * 1000);
                } else {
                    paymentDate = new Date(payment.timestamp);
                }

                if (!isNaN(paymentDate.getTime())) {
                    const monthKey = `${monthNames[paymentDate.getMonth()]}_${paymentDate.getFullYear()}`;
                    const amount = parseFloat(payment.amount) || 0;
                    paymentsByMonth[monthKey] = (paymentsByMonth[monthKey] || 0) + amount;
                    allMonthsSet.add(monthKey);
                }
            }
        });

        // Optimizing Target Fetching: 
        // Previously we fetched parent docs 'targets/{Month_Year}' and read 'total' or 'amountCollectedTarget'.
        // However, the source of truth is the 'sales_targets' subcollection which might not be synced to the parent 'total'.
        // To fix the "0 target" bug and ensure consistency with the top dashboard cards, 
        // we must aggregate the subcollections directly.

        console.time('getDashboardHistory:Targets');
        // Use collectionGroup to fetch ALL sales_targets from ALL months
        // This is reasonably efficient as we want the global history.
        const salesTargetsSnap = await db.collectionGroup('sales_targets').get();
        console.timeEnd('getDashboardHistory:Targets');

        const targetsByMonth: { [key: string]: number } = {};

        salesTargetsSnap.forEach(doc => {
            // Path structure: targets/{Month_Year}/sales_targets/{userId}
            // We want {Month_Year} which is the ID of the parent document of the collection.
            const monthDocRef = doc.ref.parent.parent;

            if (monthDocRef) {
                const monthKey = monthDocRef.id;

                // Ensure it's a valid month key (e.g., "Jan_2025")
                if (monthKey.includes('_')) {
                    const data = doc.data();
                    const targetAmount = data.amountCollectedTarget || 0;

                    targetsByMonth[monthKey] = (targetsByMonth[monthKey] || 0) + targetAmount;

                    // CRITICAL FIX: Add this month to allMonthsSet
                    // This ensures that even if there are NO payments for a month (e.g. future month),
                    // it still appears in the chart with the correct target.
                    allMonthsSet.add(monthKey);
                }
            }
        });

        const sortedMonths = Array.from(allMonthsSet).sort((a, b) => {
            const [monthA, yearA] = a.split('_');
            const [monthB, yearB] = b.split('_');

            if (parseInt(yearA) !== parseInt(yearB)) {
                return parseInt(yearA) - parseInt(yearB);
            }
            return monthNames.indexOf(monthA) - monthNames.indexOf(monthB);
        });

        const historyData: HistoryData[] = [];

        for (const monthKey of sortedMonths) {
            const [month, yearStr] = monthKey.split('_');
            const year = parseInt(yearStr);

            historyData.push({
                month: month,
                year: year,
                fullLabel: `${month} ${year}`,
                collected: paymentsByMonth[monthKey] || 0,
                target: targetsByMonth[monthKey] || 0
            });
        }

        return historyData;

    } catch (error) {
        console.error('Error fetching history data:', error);
        return [];
    }
}

export async function getOpsRevenueHistory(): Promise<HistoryData[]> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Fetch ALL approved ops payments
        const opsPaymentsRef = db.collection('ops_payments');
        const opsPaymentsSnap = await opsPaymentsRef
            .where('status', '==', 'approved')
            .get();

        // Aggregate payments by month
        const paymentsByMonth: { [key: string]: number } = {};
        const allMonthsSet = new Set<string>();

        opsPaymentsSnap.forEach(doc => {
            const payment = doc.data();
            if (payment.timestamp) {
                let paymentDate: Date;
                if (typeof payment.timestamp === 'string') {
                    paymentDate = new Date(payment.timestamp);
                } else if (payment.timestamp.toDate) {
                    paymentDate = payment.timestamp.toDate();
                } else if (payment.timestamp._seconds) {
                    paymentDate = new Date(payment.timestamp._seconds * 1000);
                } else {
                    paymentDate = new Date(payment.timestamp);
                }

                if (!isNaN(paymentDate.getTime())) {
                    const monthKey = `${monthNames[paymentDate.getMonth()]}_${paymentDate.getFullYear()}`;
                    const amount = parseFloat(payment.amount) || 0;
                    paymentsByMonth[monthKey] = (paymentsByMonth[monthKey] || 0) + amount;
                    allMonthsSet.add(monthKey);
                }
            }
        });

        const sortedMonths = Array.from(allMonthsSet).sort((a, b) => {
            const [monthA, yearA] = a.split('_');
            const [monthB, yearB] = b.split('_');

            if (parseInt(yearA) !== parseInt(yearB)) {
                return parseInt(yearA) - parseInt(yearB);
            }
            return monthNames.indexOf(monthA) - monthNames.indexOf(monthB);
        });

        const historyData: HistoryData[] = [];

        for (const monthKey of sortedMonths) {
            const [month, yearStr] = monthKey.split('_');
            const year = parseInt(yearStr);

            historyData.push({
                month: month,
                year: year,
                fullLabel: `${month} ${year}`,
                collected: paymentsByMonth[monthKey] || 0,
                target: 0 // Ops revenue might not have a target in the same way, or we'd need to fetch it if it exists. Assuming 0 for now as per request "ops revenue"
            });
        }

        return historyData;

    } catch (error) {
        console.error('Error fetching ops revenue history:', error);
        return [];
    }
}
export interface WeeklyHistoryData {
    month: string;
    year: number;
    fullLabel: string;
    weeks: {
        week1: number; // Days 1-7
        week2: number; // Days 8-14
        week3: number; // Days 15-21
        week4: number; // Days 22-End
    };
    total: number;
    type: 'sales' | 'ops';
}

export async function getWeeklyRevenueHistory(): Promise<{ sales: WeeklyHistoryData[], ops: WeeklyHistoryData[] }> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Define relevant months (e.g., last 6 months to avoid fetching too much data if possible, 
        // but for now we'll fetch all and filter in memory or just process all since we need history)
        // For performance, we could limit to last 12 months. Let's process all for now as requested "history".

        // --- Helper to process payments into weekly buckets ---
        const processRefIntoWeeks = async (query: FirebaseFirestore.Query, type: 'sales' | 'ops'): Promise<WeeklyHistoryData[]> => {
            const snapshot = await query.get();
            const monthlyData: { [key: string]: WeeklyHistoryData } = {};

            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.timestamp) return;

                let date: Date;
                if (typeof data.timestamp === 'string') {
                    date = new Date(data.timestamp);
                } else if (data.timestamp.toDate) {
                    date = data.timestamp.toDate();
                } else if (data.timestamp._seconds) {
                    date = new Date(data.timestamp._seconds * 1000);
                } else {
                    date = new Date(data.timestamp);
                }

                if (isNaN(date.getTime())) return;

                const monthIndex = date.getMonth();
                const year = date.getFullYear();
                const day = date.getDate();
                const monthName = monthNames[monthIndex];
                const key = `${monthName}_${year}`;

                if (!monthlyData[key]) {
                    monthlyData[key] = {
                        month: monthName,
                        year: year,
                        fullLabel: `${monthName} ${year}`,
                        weeks: { week1: 0, week2: 0, week3: 0, week4: 0 },
                        total: 0,
                        type: type
                    };
                }

                const amount = parseFloat(data.amount) || 0;
                monthlyData[key].total += amount;

                // Determine week (4 weeks logic)
                if (day <= 7) monthlyData[key].weeks.week1 += amount;
                else if (day <= 14) monthlyData[key].weeks.week2 += amount;
                else if (day <= 21) monthlyData[key].weeks.week3 += amount;
                else monthlyData[key].weeks.week4 += amount; // All remaining days in Week 4
            });

            // Convert map to sorted array
            return Object.values(monthlyData).sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
            });
        };

        // 1. Fetch Sales Revenue (All approved payments)
        const salesPromise = processRefIntoWeeks(
            db.collection('payments').where('status', '==', 'approved'),
            'sales'
        );

        // 2. Fetch Ops Revenue (All approved ops_payments)
        const opsPromise = processRefIntoWeeks(
            db.collection('ops_payments').where('status', '==', 'approved'),
            'ops'
        );

        const [salesData, opsData] = await Promise.all([salesPromise, opsPromise]);

        return {
            sales: salesData,
            ops: opsData
        };

    } catch (error) {
        console.error('Error fetching weekly revenue history:', error);
        return { sales: [], ops: [] };
    }
}
// ... (interfaces)

export interface SourceAnalyticsData {
    source: string;
    leadsCount: number;
    revenue: number;
    valuation: number; // Revenue / Leads
}

// ... (previous code)

export interface SourceAnalyticsData {
    source: string;
    leadsCount: number;
    revenue: number;
    valuation: number; // Revenue / Leads
}

export async function getSourceAnalyticsData(month: string, year: number): Promise<SourceAnalyticsData[]> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(month);

        if (monthIndex === -1) throw new Error('Invalid month');

        const startOfMonth = new Date(year, monthIndex, 1);
        const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

        // ISO Strings for string-based timestamp comparison
        const startISO = startOfMonth.toISOString();
        const endISO = endOfMonth.toISOString();

        const analyticsData: SourceAnalyticsData[] = [];
        const leadsBySource: Record<string, number> = {};

        // Helper to normalize source names
        const normalizeSource = (source: string): string => {
            if (!source) return 'Unknown';
            const lower = source.toLowerCase().trim();
            if (lower === 'billcut') return 'BillCut';
            if (lower === 'ama') return 'AMA';
            if (lower === 'credsettle' || lower === 'credsettlee') return 'CredSettle';
            if (lower === 'settleloans' || lower === 'settleloans contact') return 'SettleLoans';
            return source; // Return original if no match, or capitalize? Let's keep original for now unless specific
        };

        // 1. Fetch AMA LEADS
        try {
            const amaLeadsRef = db.collection('ama_leads');
            const amaLeadsSnap = await amaLeadsRef
                .where('date', '>=', startOfMonth.getTime())
                .where('date', '<=', endOfMonth.getTime())
                .get();

            amaLeadsSnap.forEach(doc => {
                const data = doc.data();
                const rawSource = data.source || 'AMA';
                const source = normalizeSource(rawSource);
                leadsBySource[source] = (leadsBySource[source] || 0) + 1;
            });
        } catch (e) {
            console.error('Error fetching ama_leads:', e);
        }

        // 2. Fetch BILLCUT LEADS
        try {
            const billcutLeadsRef = db.collection('billcutLeads');
            const billcutLeadsSnap = await billcutLeadsRef
                .where('date', '>=', startOfMonth.getTime())
                .where('date', '<=', endOfMonth.getTime())
                .get();

            billcutLeadsSnap.forEach(doc => {
                const source = 'BillCut';
                leadsBySource[source] = (leadsBySource[source] || 0) + 1;
            });
        } catch (e) {
            console.error('Error fetching billcutLeads:', e);
        }


        // 3. Fetch PAYMENTS (Sales)
        const paymentsRef = db.collection('payments');
        const paymentsSnap = await paymentsRef
            .where('status', '==', 'approved')
            .where('timestamp', '>=', startISO)
            .where('timestamp', '<=', endISO)
            .get();

        const revenueBySource: Record<string, number> = {};
        const paymentEmails: Set<string> = new Set();
        const paymentsMap: Record<string, number> = {}; // email -> amount sum (for those without source)

        paymentsSnap.forEach(doc => {
            const data = doc.data();
            const amount = parseFloat(data.amount) || 0;

            // Check if source is directly available
            if (data.source) {
                const source = normalizeSource(data.source);
                revenueBySource[source] = (revenueBySource[source] || 0) + amount;
            } else {
                // If no source, fall back to email lookup
                const email = data.email || data.clientEmail || data.userEmail || data.payerEmail;
                if (email) {
                    paymentEmails.add(email);
                    paymentsMap[email] = (paymentsMap[email] || 0) + amount;
                }
            }
        });

        // 4. Resolve Sources for Payments MISSING source
        if (paymentEmails.size > 0) {
            const emailsArray = Array.from(paymentEmails);
            const chunkSize = 10;
            const matchedSources: Record<string, string> = {}; // email -> source

            for (let i = 0; i < emailsArray.length; i += chunkSize) {
                const chunk = emailsArray.slice(i, i + chunkSize);
                if (chunk.length === 0) continue;

                // Check AMA Leads
                const amaCheckSnap = await db.collection('ama_leads')
                    .where('email', 'in', chunk)
                    .get();

                amaCheckSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.email) {
                        matchedSources[data.email] = data.source || 'AMA';
                    }
                });

                // Check BillCut Leads (if not found in AMA)
                // Filter out emails already found
                const remainingChunk = chunk.filter(email => !matchedSources[email]);
                if (remainingChunk.length > 0) {
                    const billcutCheckSnap = await db.collection('billcutLeads')
                        .where('email', 'in', remainingChunk)
                        .get();

                    billcutCheckSnap.forEach(doc => {
                        const data = doc.data();
                        if (data.email) {
                            matchedSources[data.email] = 'BillCut';
                        }
                    });
                }
            }

            // Aggregate Revenue for resolved emails
            for (const [email, amount] of Object.entries(paymentsMap)) {
                const source = matchedSources[email] || 'Unknown';
                revenueBySource[source] = (revenueBySource[source] || 0) + amount;
            }
        }

        // 5. Combine Data
        const allSources = new Set([...Object.keys(leadsBySource), ...Object.keys(revenueBySource)]);

        allSources.forEach(source => {
            const leadsCount = leadsBySource[source] || 0;
            const revenue = revenueBySource[source] || 0;
            const valuation = leadsCount > 0 ? revenue / leadsCount : 0;

            analyticsData.push({
                source,
                leadsCount,
                revenue,
                valuation
            });
        });

        // Sort by Revenue descending
        return analyticsData.sort((a, b) => b.revenue - a.revenue);

    } catch (error) {
        console.error('Error fetching source analytics:', error);
        return [];
    }
}

export async function getBillcutPayoutAnalytics(month: string, year: number): Promise<number> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(month);

        if (monthIndex === -1) return 0;

        const startOfMonth = new Date(year, monthIndex, 1);
        const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

        const startISO = startOfMonth.toISOString().split('T')[0];
        const endISO = endOfMonth.toISOString().split('T')[0];

        const payoutSnap = await db.collection('billcutpay')
            .where('date', '>=', startISO)
            .where('date', '<=', endISO)
            .get();

        let totalPaid = 0;
        payoutSnap.forEach(doc => {
            totalPaid += doc.data().amount || 0;
        });

        return totalPaid;
    } catch (error) {
        console.error('Error fetching Billcut payout analytics:', error);
        return 0;
    }
}

export interface BillcutHistoryData {
    month: string;
    year: number;
    fullLabel: string;
    paid: number;
    earned: number;
    signupFees: number;
    successFees: number;
}

export async function getBillcutHistoryData(): Promise<BillcutHistoryData[]> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const billcutHistory: Record<string, BillcutHistoryData> = {};

        // 1. Fetch all billcutpay (Paid)
        const payoutSnap = await db.collection('billcutpay').get();
        payoutSnap.forEach(doc => {
            const data = doc.data();
            const dateStr = data.date; // YYYY-MM-DD
            if (dateStr) {
                const [year, month, _] = dateStr.split('-');
                const monthName = monthNames[parseInt(month) - 1];
                const key = `${monthName}_${year}`;

                if (!billcutHistory[key]) {
                    billcutHistory[key] = {
                        month: monthName,
                        year: parseInt(year),
                        fullLabel: `${monthName} ${year}`,
                        paid: 0,
                        earned: 0,
                        signupFees: 0,
                        successFees: 0
                    };
                }
                billcutHistory[key].paid += data.amount || 0;
            }
        });

        // 2. Fetch all approved payments with source "BillCut" (Earned)
        const paymentsSnap = await db.collection('payments')
            .where('status', '==', 'approved')
            .get();

        paymentsSnap.forEach(doc => {
            const data = doc.data();
            const amount = parseFloat(data.amount) || 0;

            // Normalize source
            const rawSource = data.source || '';
            const lower = rawSource.toLowerCase().trim();

            if (lower === 'billcut') {
                let date: Date;
                if (typeof data.timestamp === 'string') {
                    date = new Date(data.timestamp);
                } else if (data.timestamp?.toDate) {
                    date = data.timestamp.toDate();
                } else if (data.timestamp?._seconds) {
                    date = new Date(data.timestamp._seconds * 1000);
                } else {
                    date = new Date(data.timestamp);
                }

                if (!isNaN(date.getTime())) {
                    const monthName = monthNames[date.getMonth()];
                    const year = date.getFullYear();
                    const key = `${monthName}_${year}`;

                    if (!billcutHistory[key]) {
                        billcutHistory[key] = {
                            month: monthName,
                            year: year,
                            fullLabel: `${monthName} ${year}`,
                            paid: 0,
                            earned: 0,
                            signupFees: 0,
                            successFees: 0
                        };
                    }
                    billcutHistory[key].signupFees += amount;
                    billcutHistory[key].earned += amount;
                }
            }
        });

        // 3. Fetch approved OPS payments with source "billcut" (Success Fees + Pending fees)
        const opsPaymentsSnap = await db.collection('ops_payments')
            .where('status', '==', 'approved')
            .where('source', '==', 'billcut')
            .where('type', 'in', ['Success Fees', 'Pending fees'])
            .get();

        opsPaymentsSnap.forEach(doc => {
            const data = doc.data();
            // Double check strict equality just in case, though query should handle it
            if (data.source === 'billcut' && (data.type === 'Success Fees' || data.type === 'Pending fees')) {
                const amount = parseFloat(data.amount) || 0;

                let date: Date;
                if (typeof data.timestamp === 'string') {
                    date = new Date(data.timestamp);
                } else if (data.timestamp?.toDate) {
                    date = data.timestamp.toDate();
                } else if (data.timestamp?._seconds) {
                    date = new Date(data.timestamp._seconds * 1000);
                } else if (data.approvedAt) {
                    // Fallback to approvedAt if timestamp is missing/invalid
                    date = new Date(data.approvedAt);
                } else {
                    date = new Date(); // Fallback to now? Or skip.
                }

                if (!isNaN(date.getTime())) {
                    const monthName = monthNames[date.getMonth()];
                    const year = date.getFullYear();
                    const key = `${monthName}_${year}`;

                    if (!billcutHistory[key]) {
                        billcutHistory[key] = {
                            month: monthName,
                            year: year,
                            fullLabel: `${monthName} ${year}`,
                            paid: 0,
                            earned: 0,
                            signupFees: 0,
                            successFees: 0
                        };
                    }
                    if (data.type === 'Success Fees') {
                        billcutHistory[key].successFees += amount;
                    } else if (data.type === 'Pending fees') {
                        billcutHistory[key].signupFees += amount;
                    }
                    billcutHistory[key].earned += amount;
                }
            }
        });

        // Sort and return
        return Object.values(billcutHistory).sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
        });

    } catch (error) {
        console.error('Error fetching Billcut history data:', error);
        return [];
    }
}

export interface SalespersonWeeklyAnalytics {
    salespersonName: string;
    weeks: {
        week1: number;
        week2: number;
        week3: number;
        week4: number;
    };
    monthlyTotal: number;
    history: {
        [monthLabel: string]: {
            week1: number;
            week2: number;
            week3: number;
            week4: number;
            total: number;
        };
    };
}

export interface ClientAdvocateWeeklyAnalytics {
    advocateName: string;
    weeks: {
        week1: number;
        week2: number;
        week3: number;
        week4: number;
    };
    monthlyTotal: number;
    history: {
        [monthLabel: string]: {
            week1: number;
            week2: number;
            week3: number;
            week4: number;
            total: number;
        };
    };
}

export interface ClientSourceWeeklyAnalytics {
    source: string;
    weeks: {
        week1: number;
        week2: number;
        week3: number;
        week4: number;
    };
    monthlyTotal: number;
    history: {
        [monthLabel: string]: {
            week1: number;
            week2: number;
            week3: number;
            week4: number;
            total: number;
        };
    };
}

export async function getSalespersonWeeklyAnalytics(): Promise<SalespersonWeeklyAnalytics[]> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // 1. Fetch Active Salespeople to filter results
        const usersSnapshot = await db.collection('users')
            .where('role', 'in', ['sales', 'admin', 'superadmin']) // Include relevant roles that might have payments
            .get();

        const activeSalespeople = new Set<string>();
        const activeSalespeopleById = new Map<string, string>();

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            // User is active if status is not 'inactive'
            if (userData.status !== 'inactive' && fullName) {
                activeSalespeople.add(fullName);
                activeSalespeopleById.set(doc.id, fullName);
            }
        });

        // 2. Fetch all approved payments
        // Limit to reasonable range? Actually, fetching all for now but sorting later.
        const paymentsSnap = await db.collection('payments')
            .where('status', '==', 'approved')
            .get();

        const salespersonData: Record<string, SalespersonWeeklyAnalytics> = {};

        paymentsSnap.forEach(doc => {
            const data = doc.data();

            // Resolve salesperson name from various possible fields
            let salespersonName = data.salesPersonName || data.salespersonName;

            // If name is not directly available, try resolving from IDs
            if (!salespersonName || salespersonName === 'Unknown') {
                const possibleId = data.salesperson || data.userId || data.assignedTo;
                if (possibleId && activeSalespeopleById.has(possibleId)) {
                    salespersonName = activeSalespeopleById.get(possibleId);
                }
            }

            // Fallback or Skip
            if (!salespersonName || salespersonName === 'Unknown') return;

            // FILTER: Skip if salesperson is inactive
            if (!activeSalespeople.has(salespersonName)) return;

            const amount = parseFloat(data.amount) || 0;

            let date: Date;
            if (typeof data.timestamp === 'string') {
                date = new Date(data.timestamp);
            } else if (data.timestamp?.toDate) {
                date = new Date(data.timestamp.toDate());
            } else if (data.timestamp?._seconds) {
                date = new Date(data.timestamp._seconds * 1000);
            } else if (data.timestamp) {
                date = new Date(data.timestamp);
            } else {
                return; // No date, skip
            }

            if (isNaN(date.getTime())) return;

            const paymentMonth = date.getMonth();
            const paymentYear = date.getFullYear();
            const paymentDay = date.getDate();
            const monthLabel = `${monthNames[paymentMonth]} ${paymentYear}`;

            if (!salespersonData[salespersonName]) {
                salespersonData[salespersonName] = {
                    salespersonName,
                    weeks: { week1: 0, week2: 0, week3: 0, week4: 0 },
                    monthlyTotal: 0,
                    history: {}
                };
            }

            const person = salespersonData[salespersonName];

            // Initialize historical month if not exists
            if (!person.history[monthLabel]) {
                person.history[monthLabel] = { week1: 0, week2: 0, week3: 0, week4: 0, total: 0 };
            }

            const historyMonth = person.history[monthLabel];
            historyMonth.total += amount;

            // Determine week (1-7, 8-14, 15-21, 22+)
            let weekKey: 'week1' | 'week2' | 'week3' | 'week4';
            if (paymentDay <= 7) weekKey = 'week1';
            else if (paymentDay <= 14) weekKey = 'week2';
            else if (paymentDay <= 21) weekKey = 'week3';
            else weekKey = 'week4';

            historyMonth[weekKey] += amount;

            // Add to current month weeks (accessor for convenience)
            if (paymentMonth === currentMonth && paymentYear === currentYear) {
                person.monthlyTotal += amount;
                person.weeks[weekKey] += amount;
            }
        });

        return Object.values(salespersonData).sort((a, b) => b.monthlyTotal - a.monthlyTotal);

    } catch (error) {
        console.error('Error fetching salesperson weekly analytics:', error);
        return [];
    }
}

export async function getClientAdvocateWeeklyAnalytics(): Promise<ClientAdvocateWeeklyAnalytics[]> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // reference date "2025-05-03" (string) as deciding factor
        // This is a Saturday. W1 starts on the 3rd.

        const clientsSnap = await db.collection('clients').get();
        const advocateData: Record<string, ClientAdvocateWeeklyAnalytics> = {};

        clientsSnap.forEach(doc => {
            const data = doc.data();
            const advocateName = data.alloc_adv || 'Unassigned';

            // Use convertedAt exclusively as requested
            let date: Date;
            const rawDate = data.convertedAt;

            if (!rawDate) return;

            if (typeof rawDate === 'string') {
                date = new Date(rawDate);
            } else if (rawDate.toDate) {
                date = rawDate.toDate();
            } else if (rawDate._seconds) {
                date = new Date(rawDate._seconds * 1000);
            } else {
                date = new Date(rawDate);
            }

            if (isNaN(date.getTime())) return;

            const paymentMonth = date.getMonth();
            const paymentYear = date.getFullYear();
            const paymentDay = date.getDate();
            const monthLabel = `${monthNames[paymentMonth]} ${paymentYear}`;

            if (!advocateData[advocateName]) {
                advocateData[advocateName] = {
                    advocateName,
                    weeks: { week1: 0, week2: 0, week3: 0, week4: 0 },
                    monthlyTotal: 0,
                    history: {}
                };
            }

            const adv = advocateData[advocateName];

            if (!adv.history[monthLabel]) {
                adv.history[monthLabel] = { week1: 0, week2: 0, week3: 0, week4: 0, total: 0 };
            }

            const historyMonth = adv.history[monthLabel];
            historyMonth.total += 1;

            // Determine week based on "2025-05-03" as W1 start (Day 3)
            // W1 (3-9), W2 (10-16), W3 (17-23), W4+ (24-end)
            // If day is 1-2, it falls into the "previous" month's W4+? 
            // Or just treat it as W1 for simplicity but aligned to the 3rd?
            // "use startDate 2025-05-03 as the week deciding factor"
            // If the user wants W1 to start on the 3rd:

            let weekKey: 'week1' | 'week2' | 'week3' | 'week4';
            if (paymentDay >= 3 && paymentDay <= 9) weekKey = 'week1';
            else if (paymentDay >= 10 && paymentDay <= 16) weekKey = 'week2';
            else if (paymentDay >= 17 && paymentDay <= 23) weekKey = 'week3';
            else if (paymentDay >= 24 || paymentDay < 3) weekKey = 'week4';
            else weekKey = 'week1'; // Should not happen with logic above

            historyMonth[weekKey] += 1;

            if (paymentMonth === currentMonth && paymentYear === currentYear) {
                adv.monthlyTotal += 1;
                adv.weeks[weekKey] += 1;
            }
        });

        return Object.values(advocateData).sort((a, b) => b.monthlyTotal - a.monthlyTotal);

    } catch (error) {
        console.error('Error fetching client advocate weekly analytics:', error);
        return [];
    }
}

// ─── Lead Trend Analytics ─────────────────────────────────────────────────────

export interface LeadTrendWeekData {
    week1: number; // days 1-7
    week2: number; // days 8-14
    week3: number; // days 15-21
    week4: number; // days 22-end
    total: number;
}

export interface LeadTrendData {
    month: string;       // e.g. "Apr"
    year: number;        // e.g. 2026
    fullLabel: string;   // e.g. "Apr 2026"
    sources: {
        AMA: LeadTrendWeekData;
        CredSettle: LeadTrendWeekData;
        SettleLoans: LeadTrendWeekData;
        BillCut: LeadTrendWeekData;
        Total: LeadTrendWeekData;
    };
}

/** Map a raw source string from ama_leads to one of our canonical buckets. */
function normalizeLeadSource(raw: string | undefined): 'AMA' | 'CredSettle' | 'SettleLoans' | null {
    if (!raw) return 'AMA'; // ama_leads with no source → AMA
    const lower = raw.toLowerCase().trim();
    if (lower === 'ama') return 'AMA';
    if (lower === 'credsettle' || lower === 'credsettlee') return 'CredSettle';
    if (lower === 'settleloans' || lower === 'settleloans contact' || lower === 'settleloans home') return 'SettleLoans';
    // BillCut leads never appear in ama_leads; if an unexpected source appears, skip
    return null;
}

function emptyWeekData(): LeadTrendWeekData {
    return { week1: 0, week2: 0, week3: 0, week4: 0, total: 0 };
}

function weekKey(day: number): keyof Omit<LeadTrendWeekData, 'total'> {
    if (day <= 7) return 'week1';
    if (day <= 14) return 'week2';
    if (day <= 21) return 'week3';
    return 'week4';
}

/**
 * Returns weekly lead-count data for all 4 sources (AMA, CredSettle, SettleLoans, BillCut)
 * for every month that has data, or filtered to a specific month+year if provided.
 *
 * Week boundaries (calendar-based, NOT day-of-week):
 *   Week 1 → days  1 –  7
 *   Week 2 → days  8 – 14
 *   Week 3 → days 15 – 21
 *   Week 4 → days 22 – end of month
 */
export async function getLeadTrendData(
    filterMonth?: number, // 0-indexed (0 = Jan … 11 = Dec), undefined = all months
    filterYear?: number
): Promise<LeadTrendData[]> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const trendMap: Record<string, LeadTrendData> = {};

        // --- helper: get-or-create a month bucket ---
        const getBucket = (monthIndex: number, year: number): LeadTrendData => {
            const monthName = monthNames[monthIndex];
            const key = `${monthName}_${year}`;
            if (!trendMap[key]) {
                trendMap[key] = {
                    month: monthName,
                    year,
                    fullLabel: `${monthName} ${year}`,
                    sources: {
                        AMA:        emptyWeekData(),
                        CredSettle: emptyWeekData(),
                        SettleLoans:emptyWeekData(),
                        BillCut:    emptyWeekData(),
                        Total:      emptyWeekData(),
                    }
                };
            }
            return trendMap[key];
        };

        // --- helper: increment a source+week counter ---
        const increment = (bucket: LeadTrendData, source: 'AMA' | 'CredSettle' | 'SettleLoans' | 'BillCut', day: number) => {
            const wk = weekKey(day);
            bucket.sources[source][wk]++;
            bucket.sources[source].total++;
            bucket.sources.Total[wk]++;
            bucket.sources.Total.total++;
        };

        // Build Firestore date range bounds when filtering by month
        let startMs: number | undefined;
        let endMs: number | undefined;

        if (filterYear !== undefined && filterMonth !== undefined) {
            const startDate = new Date(filterYear, filterMonth, 1);
            const endDate   = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59, 999);
            startMs  = startDate.getTime();
            endMs    = endDate.getTime();
        }

        // ── 1. Fetch AMA leads (contains AMA / CredSettle / SettleLoans) ──────
        try {
            let amaQuery: FirebaseFirestore.Query = db.collection('ama_leads');
            if (startMs !== undefined && endMs !== undefined) {
                // ama_leads stores `date` as epoch milliseconds (number)
                amaQuery = amaQuery
                    .where('date', '>=', startMs)
                    .where('date', '<=', endMs);
            }
            const amaSnap = await amaQuery.get();

            amaSnap.forEach(doc => {
                const data = doc.data();

                // Resolve date from the `date` field (epoch ms number)
                let leadDate: Date | null = null;
                if (typeof data.date === 'number') {
                    leadDate = new Date(data.date);
                } else if (typeof data.date === 'string') {
                    leadDate = new Date(data.date);
                } else if (data.date?.toDate) {
                    leadDate = data.date.toDate();
                } else if (data.date?._seconds) {
                    leadDate = new Date(data.date._seconds * 1000);
                } else if (data.createdAt) {
                    // fallback
                    if (typeof data.createdAt === 'string') leadDate = new Date(data.createdAt);
                    else if (data.createdAt?.toDate) leadDate = data.createdAt.toDate();
                    else if (data.createdAt?._seconds) leadDate = new Date(data.createdAt._seconds * 1000);
                }

                if (!leadDate || isNaN(leadDate.getTime())) return;

                const monthIndex = leadDate.getMonth();
                const year       = leadDate.getFullYear();
                const day        = leadDate.getDate();

                // When NOT filtering, include all months; when filtering, double-check
                if (filterYear !== undefined && filterMonth !== undefined) {
                    if (year !== filterYear || monthIndex !== filterMonth) return;
                }

                const source = normalizeLeadSource(data.source);
                if (!source) return;

                const bucket = getBucket(monthIndex, year);
                increment(bucket, source, day);
            });
        } catch (e) {
            console.error('getLeadTrendData: error fetching ama_leads:', e);
        }

        // ── 2. Fetch BillCut leads ────────────────────────────────────────────
        try {
            let bcQuery: FirebaseFirestore.Query = db.collection('billcutLeads');
            if (startMs !== undefined && endMs !== undefined) {
                bcQuery = bcQuery
                    .where('date', '>=', startMs)
                    .where('date', '<=', endMs);
            }
            const bcSnap = await bcQuery.get();

            bcSnap.forEach(doc => {
                const data = doc.data();

                let leadDate: Date | null = null;
                if (typeof data.date === 'number') {
                    leadDate = new Date(data.date);
                } else if (typeof data.date === 'string') {
                    leadDate = new Date(data.date);
                } else if (data.date?.toDate) {
                    leadDate = data.date.toDate();
                } else if (data.date?._seconds) {
                    leadDate = new Date(data.date._seconds * 1000);
                } else if (data.createdAt) {
                    if (typeof data.createdAt === 'string') leadDate = new Date(data.createdAt);
                    else if (data.createdAt?.toDate) leadDate = data.createdAt.toDate();
                    else if (data.createdAt?._seconds) leadDate = new Date(data.createdAt._seconds * 1000);
                }

                if (!leadDate || isNaN(leadDate.getTime())) return;

                const monthIndex = leadDate.getMonth();
                const year       = leadDate.getFullYear();
                const day        = leadDate.getDate();

                if (filterYear !== undefined && filterMonth !== undefined) {
                    if (year !== filterYear || monthIndex !== filterMonth) return;
                }

                const bucket = getBucket(monthIndex, year);
                increment(bucket, 'BillCut', day);
            });
        } catch (e) {
            console.error('getLeadTrendData: error fetching billcutLeads:', e);
        }

        // ── Sort results chronologically ──────────────────────────────────────
        return Object.values(trendMap).sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
        });

    } catch (error) {
        console.error('Error in getLeadTrendData:', error);
        return [];
    }
}

export async function getClientSourceWeeklyAnalytics(): Promise<ClientSourceWeeklyAnalytics[]> {
    try {
        if (!db) throw new Error('Firebase Admin SDK not initialized');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const clientsSnap = await db.collection('clients').get();
        const sourceData: Record<string, ClientSourceWeeklyAnalytics> = {};

        // Helper to normalize source names
        const normalizeSource = (source: string): string => {
            if (!source) return 'Unknown';
            const lower = source.toLowerCase().trim();
            if (lower === 'billcut' || lower === 'bill cut') return 'BillCut';
            if (lower === 'ama') return 'AMA';
            if (lower === 'credsettle' || lower === 'credsettlee' || lower === 'manual') return 'CredSettle';
            if (lower === 'settleloans' || lower === 'settleloans contact' || lower === 'settleloans home') return 'SettleLoans';
            return source;
        };

        clientsSnap.forEach(doc => {
            const data = doc.data();
            const sourceName = normalizeSource(data.source || data.source_database);

            let date: Date;
            const rawDate = data.convertedAt;

            if (!rawDate) return;

            if (typeof rawDate === 'string') {
                date = new Date(rawDate);
            } else if (rawDate.toDate) {
                date = rawDate.toDate();
            } else if (rawDate._seconds) {
                date = new Date(rawDate._seconds * 1000);
            } else {
                date = new Date(rawDate);
            }

            if (isNaN(date.getTime())) return;

            const paymentMonth = date.getMonth();
            const paymentYear = date.getFullYear();
            const paymentDay = date.getDate();
            const monthLabel = `${monthNames[paymentMonth]} ${paymentYear}`;

            if (!sourceData[sourceName]) {
                sourceData[sourceName] = {
                    source: sourceName,
                    weeks: { week1: 0, week2: 0, week3: 0, week4: 0 },
                    monthlyTotal: 0,
                    history: {}
                };
            }

            const src = sourceData[sourceName];

            if (!src.history[monthLabel]) {
                src.history[monthLabel] = { week1: 0, week2: 0, week3: 0, week4: 0, total: 0 };
            }

            const historyMonth = src.history[monthLabel];
            historyMonth.total += 1;

            let weekKey: 'week1' | 'week2' | 'week3' | 'week4';
            if (paymentDay >= 3 && paymentDay <= 9) weekKey = 'week1';
            else if (paymentDay >= 10 && paymentDay <= 16) weekKey = 'week2';
            else if (paymentDay >= 17 && paymentDay <= 23) weekKey = 'week3';
            else if (paymentDay >= 24 || paymentDay < 3) weekKey = 'week4';
            else weekKey = 'week1';

            historyMonth[weekKey] += 1;

            if (paymentMonth === currentMonth && paymentYear === currentYear) {
                src.monthlyTotal += 1;
                src.weeks[weekKey] += 1;
            }
        });

        return Object.values(sourceData).sort((a, b) => b.monthlyTotal - a.monthlyTotal);

    } catch (error) {
        console.error('Error fetching client source weekly analytics:', error);
        return [];
    }
}
