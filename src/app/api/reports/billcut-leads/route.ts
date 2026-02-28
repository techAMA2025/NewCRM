import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/firebase/firebase-admin"
import { verifyAuth } from "@/lib/auth"

export const dynamic = 'force-dynamic'

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

export async function GET(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    console.log(`[API] Request received. Type: ${type}`);
    console.log(`[API] adminDb status: ${adminDb ? 'Initialized' : 'Null'}`);
    console.log(`[API] Env Check - PID: ${process.env.FIREBASE_PROJECT_ID}, Email: ${process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Unset'}, Key: ${process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Unset'}`);

    if (!adminDb) {
        console.error("[API] Firebase Admin SDK not initialized. Missing environment variables.")
        return NextResponse.json(
            { error: "Server-side Firebase Admin SDK is not initialized." },
            { status: 500 }
        )
    }
    const db = adminDb;

    try {
        if (type === "analytics") {
            const startDateParam = searchParams.get("startDate")
            const endDateParam = searchParams.get("endDate")

            // Create cache key based on params
            const cacheKey = `analytics-${startDateParam}-${endDateParam}`
            const cached = cache.get(cacheKey)

            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                console.log(`[DEBUG] Analytics: Returning cached data for ${cacheKey}`);
                return NextResponse.json(cached.data, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
            }

            let baseQuery = db.collection("billcutLeads") as FirebaseFirestore.Query
            let conversionQuery = db.collection("billcutLeads").where("category", "==", "Converted") as FirebaseFirestore.Query

            if (startDateParam) {
                const startDate = new Date(startDateParam)
                startDate.setHours(0, 0, 0, 0)
                baseQuery = baseQuery.where("date", ">=", startDate.getTime())
                conversionQuery = conversionQuery.where("convertedAt", ">=", startDate)
            }

            if (endDateParam) {
                const endDate = new Date(endDateParam)
                if (endDate.toDateString() === new Date().toDateString()) {
                    endDate.setTime(new Date().getTime())
                } else {
                    endDate.setHours(23, 59, 59, 999)
                }
                baseQuery = baseQuery.where("date", "<=", endDate.getTime())
                conversionQuery = conversionQuery.where("convertedAt", "<=", endDate)
            }

            // OPTIMIZATION: Use count() for simple metrics
            const totalLeadsCountPromise = baseQuery.count().get()
            // Modified to use conversionQuery for accurate count based on convertedAt
            const convertedLeadsCountPromise = conversionQuery.count().get()

            // Fetch all docs for detailed analytics (still needed for trends/breakdowns)
            const querySnapshotPromise = baseQuery.get()
            // Fetch converted docs for detailed conversion analytics
            const conversionSnapshotPromise = conversionQuery.get()

            const [totalLeadsSnap, convertedLeadsSnap, querySnapshot, conversionSnapshot] = await Promise.all([
                totalLeadsCountPromise,
                convertedLeadsCountPromise,
                querySnapshotPromise,
                conversionSnapshotPromise
            ])

            const totalLeads = totalLeadsSnap.data().count
            const convertedLeadsCount = convertedLeadsSnap.data().count

            // ESTIMATED READS CALCULATION
            // count() costs 1 read per 1000 docs (min 1)
            const countReads = Math.ceil(totalLeads / 1000) + Math.ceil(convertedLeadsCount / 1000)
            const docReads = querySnapshot.size
            const totalEstimatedReads = countReads + docReads

            console.log(`[DEBUG] Analytics: Fetched ${querySnapshot.size} leads (Total Count: ${totalLeads})`);
            console.log(`[DEBUG] Analytics: Fetched ${conversionSnapshot.size} converted leads (Converted Count: ${convertedLeadsCount})`);

            // Map created leads
            const leads = querySnapshot.docs.map(
                (doc: any) =>
                    ({
                        id: doc.id,
                        ...doc.data(),
                    }) as any,
            )

            // Map converted leads
            const convertedLeadsList = conversionSnapshot.docs.map(
                (doc: any) =>
                    ({
                        id: doc.id,
                        ...doc.data(),
                    }) as any,
            )

            if (!leads.length && !convertedLeadsList.length) {
                return NextResponse.json({ analytics: null }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
            }

            // Basic metrics
            const uniqueAssignees = new Set([...leads, ...convertedLeadsList].map((lead) => lead.assigned_to)).size

            // Calculate average debt range
            const debtRanges: number[] = leads
                .map((lead) => {
                    const range = lead.debt_range || "Not specified"
                    if (range === "Not specified") return null
                    const [min, max] = range.split(" - ").map((r: string) => {
                        const num = parseInt(r)
                        return isNaN(num) ? 0 : num * 100000
                    })
                    return (min + max) / 2
                })
                .filter((val): val is number => val !== null && val > 0)

            const averageDebt =
                debtRanges.length > 0 ? Math.round(debtRanges.reduce((sum, val) => sum + val, 0) / debtRanges.length) : 0

            // Calculate conversion rate using optimized counts
            const conversionRate = (convertedLeadsCount / totalLeads) * 100

            // Short Loan Analytics
            const shortLoanLeads = leads.filter((lead) => lead.category === "Short Loan").length
            const shortLoanRate = (shortLoanLeads / totalLeads) * 100

            // Conversion Time Analysis
            // Conversion Time Analysis - Use convertedLeadsList
            const convertedLeadsWithTime = convertedLeadsList.filter(
                (lead) => lead.convertedAt && (lead.date || lead.synced_date),
            )

            const conversionTimeData = convertedLeadsWithTime.map((lead) => {
                const leadCreationTime =
                    lead.date || (lead.synced_date?.toMillis ? lead.synced_date.toMillis() : lead.synced_date)
                const conversionTime = lead.convertedAt?.toMillis ? lead.convertedAt.toMillis() : lead.convertedAt?.toDate ? lead.convertedAt.toDate().getTime() : new Date(lead.convertedAt).getTime()
                const timeDiffMs = conversionTime - leadCreationTime
                const timeDiffDays = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24))
                const timeDiffHours = Math.floor((timeDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

                return {
                    leadName: lead.name,
                    assignedTo: lead.assigned_to,
                    createdAt: new Date(leadCreationTime),
                    convertedAt: new Date(conversionTime),
                    conversionTimeDays: timeDiffDays,
                    conversionTimeHours: timeDiffHours,
                    conversionTimeMs: timeDiffMs,
                    debtRange: lead.debt_range,
                    income: lead.income,
                }
            })

            // Average conversion time calculation
            const avgConversionTimeMs =
                conversionTimeData.length > 0
                    ? conversionTimeData.reduce((sum, item) => sum + item.conversionTimeMs, 0) / conversionTimeData.length
                    : 0

            const avgConversionTimeDays = Math.floor(avgConversionTimeMs / (1000 * 60 * 60 * 24))
            const avgConversionTimeHours = Math.floor((avgConversionTimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

            // Conversion time distribution (buckets)
            const conversionTimeBuckets = {
                "Same Day (0-24h)": 0,
                "2-3 Days": 0,
                "4-7 Days": 0,
                "1-2 Weeks": 0,
                "2-4 Weeks": 0,
                "1-2 Months": 0,
                "2+ Months": 0,
            }

            conversionTimeData.forEach((item) => {
                const days = item.conversionTimeDays
                if (days === 0) conversionTimeBuckets["Same Day (0-24h)"]++
                else if (days <= 3) conversionTimeBuckets["2-3 Days"]++
                else if (days <= 7) conversionTimeBuckets["4-7 Days"]++
                else if (days <= 14) conversionTimeBuckets["1-2 Weeks"]++
                else if (days <= 30) conversionTimeBuckets["2-4 Weeks"]++
                else if (days <= 60) conversionTimeBuckets["1-2 Months"]++
                else conversionTimeBuckets["2+ Months"]++
            })

            // Lead Entry Timeline Analysis
            // First, populate based on creation date
            const leadEntryTimeline = leads.reduce(
                (acc, lead) => {
                    const creationDate = new Date(
                        lead.date || (lead.synced_date?.toMillis ? lead.synced_date.toMillis() : lead.synced_date),
                    )
                    const dateKey = creationDate.toISOString().split("T")[0]

                    if (!acc[dateKey]) {
                        acc[dateKey] = {
                            date: dateKey,
                            totalLeads: 0,
                            convertedLeads: 0,
                            interestedLeads: 0,
                            notInterestedLeads: 0,
                        }
                    }

                    acc[dateKey].totalLeads++
                    // We only count Interested/Not Interested for leads created in this period
                    // Converted is handled separately below to align with conversion date
                    if (lead.category === "Interested") {
                        acc[dateKey].interestedLeads++
                    } else if (lead.category === "Not Interested") {
                        acc[dateKey].notInterestedLeads++
                    }

                    return acc
                },
                {} as Record<string, any>,
            )

            // Second, overlay conversion data based on conversion date
            convertedLeadsList.forEach(lead => {
                // Determine conversion date string
                let conversionTime;
                if (!lead.convertedAt) return;

                if (lead.convertedAt?.toDate) {
                    conversionTime = lead.convertedAt.toDate();
                } else if (lead.convertedAt?.toMillis) {
                    conversionTime = new Date(lead.convertedAt.toMillis());
                } else {
                    conversionTime = new Date(lead.convertedAt);
                }

                if (isNaN(conversionTime.getTime())) return;

                const dateKey = conversionTime.toISOString().split("T")[0];

                if (!leadEntryTimeline[dateKey]) {
                    leadEntryTimeline[dateKey] = {
                        date: dateKey,
                        totalLeads: 0, // No lead created this day in the filtered range
                        convertedLeads: 0,
                        interestedLeads: 0,
                        notInterestedLeads: 0,
                    }
                }

                leadEntryTimeline[dateKey].convertedLeads++;
            });

            const leadEntryTimelineData = Object.values(leadEntryTimeline)
                .sort((a: any, b: any) => a.date.localeCompare(b.date))
                .slice(-30)

            // Conversion time by salesperson
            const conversionTimeBySalesperson = conversionTimeData.reduce(
                (acc, item) => {
                    if (!acc[item.assignedTo]) {
                        acc[item.assignedTo] = {
                            name: item.assignedTo,
                            conversions: [],
                            avgDays: 0,
                            fastestDays: Number.POSITIVE_INFINITY,
                            slowestDays: 0,
                        }
                    }
                    acc[item.assignedTo].conversions.push(item.conversionTimeDays)
                    return acc
                },
                {} as Record<string, any>,
            )

            Object.values(conversionTimeBySalesperson).forEach((rep: any) => {
                const conversions = rep.conversions
                rep.avgDays = conversions.reduce((sum: number, days: number) => sum + days, 0) / conversions.length
                rep.fastestDays = Math.min(...conversions)
                rep.slowestDays = Math.max(...conversions)
                rep.totalConversions = conversions.length
            })

            const conversionTimeBySalespersonData = Object.values(conversionTimeBySalesperson)

            // Hourly lead entry pattern
            const hourlyPattern = leads.reduce(
                (acc, lead) => {
                    const creationDate = new Date(
                        lead.date || (lead.synced_date?.toMillis ? lead.synced_date.toMillis() : lead.synced_date),
                    )
                    const hour = creationDate.getHours()
                    acc[hour] = (acc[hour] || 0) + 1
                    return acc
                },
                {} as Record<number, number>,
            )

            const hourlyPatternData = Array.from({ length: 24 }, (_, hour) => ({
                hour: `${hour}:00`,
                leads: hourlyPattern[hour] || 0,
            }))

            // Day of week pattern
            const dayOfWeekPattern = leads.reduce(
                (acc, lead) => {
                    const creationDate = new Date(
                        lead.date || (lead.synced_date?.toMillis ? lead.synced_date.toMillis() : lead.synced_date),
                    )
                    const dayOfWeek = creationDate.getDay()
                    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
                    const dayName = dayNames[dayOfWeek]
                    acc[dayName] = (acc[dayName] || 0) + 1
                    return acc
                },
                {} as Record<string, number>,
            )

            const dayOfWeekPatternData = Object.entries(dayOfWeekPattern).map(([day, count]) => ({ day, count }))

            // Category distribution
            const categoryDistribution = leads.reduce(
                (acc, lead) => {
                    const category = lead.category || "Uncategorized"
                    if (category === "Converted") return acc; // Skip "Converted" here, we'll set it accurately below
                    acc[category] = (acc[category] || 0) + 1
                    return acc
                },
                {} as Record<string, number>,
            )
            // Ensure "Converted" count matches leads converted in the period
            categoryDistribution["Converted"] = convertedLeadsCount;

            const categoryData = Object.entries(categoryDistribution).map(([name, value]) => ({
                name,
                value: value as number,
                percentage: ((value as number) / totalLeads) * 100,
            }))

            // Assigned to distribution
            const assigneeDistribution = leads.reduce(
                (acc, lead) => {
                    const assignee = lead.assigned_to || "Unassigned"
                    acc[assignee] = (acc[assignee] || 0) + 1
                    return acc
                },
                {} as Record<string, number>,
            )

            // Debt range distribution
            const debtRangeDistribution = leads.reduce(
                (acc, lead) => {
                    const range = lead.debt_range || "Not specified"
                    acc[range] = (acc[range] || 0) + 1
                    return acc
                },
                {} as Record<string, number>,
            )

            const sortedDebtRanges = Object.entries(debtRangeDistribution)
                .map(([name, value]) => ({ name, value: value as number }))
                .sort((a, b) => {
                    if (a.name === "Not specified") return 1
                    if (b.name === "Not specified") return -1
                    const [aMin] = a.name.split(" - ").map((r: string) => parseInt(r))
                    const [bMin] = b.name.split(" - ").map((r: string) => parseInt(r))
                    return aMin - bMin
                })

            // Income distribution
            const incomeRanges = {
                "0-25K": 0,
                "25K-50K": 0,
                "50K-75K": 0,
                "75K-100K": 0,
                "100K+": 0,
            }

            leads.forEach((lead) => {
                const income = parseInt(lead.income) || 0
                if (income <= 25000) incomeRanges["0-25K"]++
                else if (income <= 50000) incomeRanges["25K-50K"]++
                else if (income <= 75000) incomeRanges["50K-75K"]++
                else if (income <= 100000) incomeRanges["75K-100K"]++
                else incomeRanges["100K+"]++
            })

            // State distribution
            const stateDistribution = leads.reduce(
                (acc, lead) => {
                    const address = lead.address || ""
                    const pincodeMatch = address.match(/\b\d{6}\b/)
                    const pincode = pincodeMatch ? pincodeMatch[0] : ""
                    let state = "Unknown"

                    if (pincode) {
                        const firstTwoDigits = parseInt(pincode.substring(0, 2))
                        if (firstTwoDigits === 11) state = "Delhi"
                        else if (firstTwoDigits >= 12 && firstTwoDigits <= 13) state = "Haryana"
                        else if (firstTwoDigits >= 14 && firstTwoDigits <= 16) state = "Punjab"
                        else if (firstTwoDigits === 17) state = "Himachal Pradesh"
                        else if (firstTwoDigits >= 18 && firstTwoDigits <= 19) state = "Jammu & Kashmir"
                        else if (firstTwoDigits >= 20 && firstTwoDigits <= 28) state = "Uttar Pradesh"
                        else if (firstTwoDigits >= 30 && firstTwoDigits <= 34) state = "Rajasthan"
                        else if (firstTwoDigits >= 36 && firstTwoDigits <= 39) state = "Gujarat"
                        else if (firstTwoDigits >= 40 && firstTwoDigits <= 44) state = "Maharashtra"
                        else if (firstTwoDigits >= 45 && firstTwoDigits <= 48) state = "Madhya Pradesh"
                        else if (firstTwoDigits === 49) state = "Chhattisgarh"
                        else if (firstTwoDigits >= 50 && firstTwoDigits <= 53) state = "Andhra Pradesh/Telangana"
                        else if (firstTwoDigits >= 56 && firstTwoDigits <= 59) state = "Karnataka"
                        else if (firstTwoDigits >= 60 && firstTwoDigits <= 64) state = "Tamil Nadu"
                        else if (firstTwoDigits >= 67 && firstTwoDigits <= 69) state = "Kerala"
                        else if (firstTwoDigits === 682) state = "Lakshadweep"
                        else if (firstTwoDigits >= 70 && firstTwoDigits <= 74) state = "West Bengal"
                        else if (firstTwoDigits === 744) state = "Andaman & Nicobar"
                        else if (firstTwoDigits >= 75 && firstTwoDigits <= 77) state = "Odisha"
                        else if (firstTwoDigits === 78) state = "Assam"
                        else if (firstTwoDigits === 79) state = "North Eastern States"
                        else if (firstTwoDigits >= 80 && firstTwoDigits <= 85) state = "Bihar"
                        else if ((firstTwoDigits >= 80 && firstTwoDigits <= 83) || firstTwoDigits === 92) state = "Jharkhand"
                    }

                    acc[state] = (acc[state] || 0) + 1
                    return acc
                },
                {} as Record<string, number>,
            )

            const sortedStateDistribution = Object.entries(stateDistribution)
                .map(([name, value]) => ({ name, value: value as number }))
                .sort((a, b) => (b.value as number) - (a.value as number))
                .slice(0, 10)

            const monthlyDistribution = leads.reduce(
                (acc, lead) => {
                    const date = new Date(lead.date)
                    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
                    acc[monthYear] = (acc[monthYear] || 0) + 1
                    return acc
                },
                {} as Record<string, number>,
            )

            // Fetch active salespersons to filter salesPerformance
            const activeSalespersonsSnapshot = await db.collection("users")
                .where("role", "in", ["sales", "salesperson"])
                .where("status", "==", "active")
                .get()

            const activeSalespersonNames = new Set(
                activeSalespersonsSnapshot.docs.map(doc => {
                    const data = doc.data()
                    return `${data.firstName || ""} ${data.lastName || ""}`.trim()
                }).filter(name => name !== "")
            )

            const salesPerformance = Object.entries(assigneeDistribution)
                .filter(([name]) => activeSalespersonNames.has(name))
                .map(([name, count]) => {
                    const totalCount = count as number
                    const assigneeLeads = leads.filter((lead) => lead.assigned_to === name)
                    const interestedCount = assigneeLeads.filter((lead) => lead.category === "Interested").length
                    // Calculate converted count from convertedLeadsList (leads converted in this period)
                    const convertedCount = convertedLeadsList.filter((lead) => lead.assigned_to === name).length

                    const conversionRate = totalCount > 0 ? ((interestedCount + convertedCount) / totalCount) * 100 : 0

                    const statusBreakdown = categoryData.reduce((acc, category) => {
                        if (category.name === "Converted") {
                            // Use count of leads converted in this period for this salesperson
                            acc[category.name] = convertedLeadsList.filter((lead) => lead.assigned_to === name).length
                        } else {
                            // Continue using leads created in this period for other statuses
                            acc[category.name] = assigneeLeads.filter((lead) => lead.category === category.name).length
                        }
                        return acc
                    }, {} as Record<string, number>)

                    // Allow statusBreakdown to show "Converted" even if not in created leads, if we want?
                    // But statusBreakdown is based on categoryData which is based on leads created.
                    // Let's leave statusBreakdown as is (breakdown of created leads), 
                    // but the metric `converted` is now based on convertedAt.

                    return {
                        name,
                        totalLeads: count,
                        interested: interestedCount,
                        converted: convertedCount,
                        conversionRate: Math.round(conversionRate * 100) / 100,
                        statusBreakdown
                    }
                })

            const contactAnalysis = {
                hasEmail: leads.filter((lead) => lead.email && lead.email !== "").length,
                hasPhone: leads.filter((lead) => lead.mobile && lead.mobile !== "").length,
                hasNotes: leads.filter((lead) => lead.sales_notes && lead.sales_notes !== "").length,
            }

            const languageBarrierLeads = leads.filter(
                (lead) =>
                    lead.category === "Language Barrier" ||
                    lead.status === "Language Barrier" ||
                    (lead.language_barrier && lead.language_barrier !== ""),
            )

            const languageDistribution = languageBarrierLeads.reduce(
                (acc, lead) => {
                    let language = lead.language_barrier || "Unknown"
                    acc[language] = (acc[language] || 0) + 1
                    return acc
                },
                {} as Record<string, number>,
            )

            const languageDistributionData = Object.entries(languageDistribution)
                .map(([name, value]) => ({ name, value: value as number }))
                .sort((a, b) => (b.value as number) - (a.value as number))

            const analyticsResult = {
                totalLeads,
                uniqueAssignees,
                averageDebt,
                conversionRate: Math.round(conversionRate * 100) / 100,
                shortLoanRate: Math.round(shortLoanRate * 100) / 100,
                conversionTimeData,
                avgConversionTimeDays,
                avgConversionTimeHours,
                conversionTimeBuckets: Object.entries(conversionTimeBuckets).map(([name, value]) => ({ name, value })),
                conversionTimeBySalesperson: conversionTimeBySalespersonData,
                leadEntryTimelineData,
                hourlyPatternData,
                dayOfWeekPatternData,
                languageBarrierLeads: languageBarrierLeads.length,
                languageDistribution: languageDistributionData,
                categoryDistribution: categoryData,
                assigneeDistribution: Object.entries(assigneeDistribution).map(([name, value]) => ({ name, value })),
                debtRangeDistribution: sortedDebtRanges,
                incomeDistribution: Object.entries(incomeRanges).map(([name, value]) => ({ name, value })),
                stateDistribution: sortedStateDistribution,
                monthlyDistribution: Object.entries(monthlyDistribution)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => a.name.localeCompare(b.name)),
                salesPerformance,
                contactAnalysis,
            }

            const responseData = { analytics: analyticsResult, docCount: querySnapshot.size }

            // Cache the result
            cache.set(cacheKey, { data: responseData, timestamp: Date.now() })

            return NextResponse.json(responseData, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
        } else if (type === "productivity") {
            const range = searchParams.get("range") || "today"
            const customStart = searchParams.get("customStart") || undefined
            const customEnd = searchParams.get("customEnd") || undefined

            const { startDate, endDate } = getProductivityDateRange(range, customStart, customEnd)

            // If range is 'today', fetch directly from billcutLeads for real-time data
            if (range === "today") {
                const leadsQuery = db
                    .collection("billcutLeads")
                    .where("lastModified", ">=", startDate)
                    .where("lastModified", "<=", endDate)

                const leadsSnapshot = await leadsQuery.get()
                console.log(`[DEBUG] Productivity (Today): Fetched ${leadsSnapshot.size} leads from billcutLeads`);
                const leads = leadsSnapshot.docs.map((doc: any) => doc.data())

                const userStats: Record<string, ProductivityStats> = {}

                leads.forEach((lead: any) => {
                    const userId = lead.assigned_to || "Unassigned"
                    // Skip unassigned if needed, or keep them
                    if (!userStats[userId]) {
                        userStats[userId] = {
                            userId,
                            userName: lead.assigned_to || "Unassigned", // We might not have user ID, using name as ID for now or need a mapping
                            date: new Date().toISOString(),
                            leadsWorked: 0,
                            convertedLeads: 0,
                            lastActivity: new Date(0).toISOString(),
                            statusBreakdown: {},
                        }
                    }

                    const stats = userStats[userId]
                    stats.leadsWorked++

                    // Check conversion
                    if (lead.category === "Converted") {
                        stats.convertedLeads++
                    }

                    // Update last activity
                    const leadTime = lead.lastModified?.toMillis ? lead.lastModified.toMillis() : new Date(lead.lastModified).getTime()
                    const currentLastActivity = new Date(stats.lastActivity).getTime()
                    if (leadTime > currentLastActivity) {
                        stats.lastActivity = new Date(leadTime).toISOString()
                    }

                    // Update status breakdown
                    const status = lead.category || "Unknown"
                    stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1
                })

                return NextResponse.json({ productivityStats: Object.values(userStats), docCount: leadsSnapshot.size }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
            }

            // For other ranges, use snapshots
            // Fetch productivity snapshots within the date range
            const snapshotsQuery = db
                .collection("productivity_snapshots")
                .where("date", ">=", startDate)
                .where("date", "<=", endDate)

            const snapshotsSnapshot = await snapshotsQuery.get()
            console.log(`[DEBUG] Productivity (Snapshots): Fetched ${snapshotsSnapshot.size} snapshots from productivity_snapshots`);
            console.log(`[DEBUG] Productivity: Estimated Firestore Reads: ${snapshotsSnapshot.size} (Documents: ${snapshotsSnapshot.size})`);
            const snapshots = snapshotsSnapshot.docs.map((doc) => doc.data())

            // Aggregate snapshots by user
            const userStats: Record<string, ProductivityStats> = {}

            snapshots.forEach((snapshot: any) => {
                const billcutData = snapshot.billcutLeads;
                if (billcutData && Array.isArray(billcutData.userProductivity)) {
                    billcutData.userProductivity.forEach((userStat: any) => {
                        const userId = userStat.userId
                        if (!userStats[userId]) {
                            userStats[userId] = {
                                userId,
                                userName: userStat.userName,
                                date: snapshot.date.toDate().toISOString(), // Use snapshot date
                                leadsWorked: 0,
                                convertedLeads: 0,
                                lastActivity: new Date(0).toISOString(),
                                statusBreakdown: {},
                            }
                        }

                        const existing = userStats[userId]

                        // Handle lastActivity safely
                        let statLastActivityTime = 0;
                        if (userStat.lastActivity) {
                            if (userStat.lastActivity.toDate) {
                                statLastActivityTime = userStat.lastActivity.toDate().getTime();
                            } else if (userStat.lastActivity.toMillis) {
                                statLastActivityTime = userStat.lastActivity.toMillis();
                            } else {
                                statLastActivityTime = new Date(userStat.lastActivity).getTime();
                            }
                        }

                        const existingTime = new Date(existing.lastActivity).getTime()

                        // If we have multiple snapshots for the same user (e.g. across days), we might want to sum them up?
                        // The user's request implies "Productivity for the selected date range".
                        // If the range is "today", we just want the latest snapshot.
                        // If the range is "last 7 days", we probably want to SUM the leadsWorked?
                        // The current logic was "take the latest".
                        // But if we have snapshots for Day 1, Day 2, Day 3... we should probably SUM the work done.
                        // However, the snapshot structure seems to be "daily summary".
                        // So for a range, we should sum `leadsWorked` and `convertedLeads`.
                        // And merge `statusBreakdown`.
                        // And take the max `lastActivity`.

                        // Let's implement SUM logic for aggregation across multiple documents (days)

                        userStats[userId] = {
                            ...existing,
                            leadsWorked: existing.leadsWorked + (userStat.leadsWorked || 0),
                            convertedLeads: existing.convertedLeads + (userStat.convertedLeads || 0),
                            lastActivity: statLastActivityTime > existingTime ? new Date(statLastActivityTime).toISOString() : existing.lastActivity,
                            // Merge status breakdown
                            statusBreakdown: { ...existing.statusBreakdown }
                        }

                        if (userStat.statusBreakdown) {
                            Object.entries(userStat.statusBreakdown).forEach(([status, count]) => {
                                userStats[userId].statusBreakdown[status] = (userStats[userId].statusBreakdown[status] || 0) + (count as number)
                            })
                        }
                    })
                }
            })

            return NextResponse.json({ productivityStats: Object.values(userStats), docCount: snapshotsSnapshot.size }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
        }

        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } })
    } catch (error: any) {
        console.error("Error in API route:", error)
        return NextResponse.json(
            {
                error: "Internal Server Error",
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        )
    }
}

// Types
interface BillcutLead {
    id: string
    address: string
    assigned_to: string
    category: string
    date: number
    debt_range: string
    email: string
    income: string
    mobile: string
    name: string
    sales_notes: string
    synced_date: any
    convertedAt?: any
    lastModified?: any
    status?: string
    language_barrier?: string
}

interface ProductivityStats {
    userId: string
    userName: string
    date: string
    leadsWorked: number
    convertedLeads: number
    lastActivity: string // serialized date
    statusBreakdown: { [key: string]: number }
}

interface ProductivityDateRange {
    startDate: Date
    endDate: Date
}

// Helper functions
const getISTDate = (date?: Date): Date => {
    const now = date || new Date()
    // Convert to IST by adding 5.5 hours to UTC
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    return istTime
}

const createISTDateRange = (startHour = 0, endHour = 23, endMinute = 59, endSecond = 59, endMs = 999) => {
    const now = new Date()
    // Get current IST date
    const istNow = getISTDate(now)

    // Create start of day in IST
    const startOfDayIST = new Date(istNow)
    startOfDayIST.setUTCHours(startHour, 0, 0, 0)

    // Create end of day in IST
    const endOfDayIST = new Date(istNow)
    endOfDayIST.setUTCHours(endHour, endMinute, endSecond, endMs)

    // Convert IST times back to UTC for Firestore queries
    const startUTC = new Date(startOfDayIST.getTime() - 5.5 * 60 * 60 * 1000)
    const endUTC = new Date(endOfDayIST.getTime() - 5.5 * 60 * 60 * 1000)

    return { startUTC, endUTC }
}

const getProductivityDateRange = (range: string, customStart?: string, customEnd?: string): ProductivityDateRange => {
    const now = new Date()
    switch (range) {
        case "today": {
            const { startUTC, endUTC } = createISTDateRange()
            return { startDate: startUTC, endDate: endUTC }
        }
        case "yesterday": {
            const yesterday = new Date(now)
            yesterday.setDate(yesterday.getDate() - 1)
            const istYesterday = getISTDate(yesterday)

            // Create start of yesterday in IST
            const startOfYesterdayIST = new Date(istYesterday)
            startOfYesterdayIST.setUTCHours(0, 0, 0, 0)

            // Create end of yesterday in IST
            const endOfYesterdayIST = new Date(istYesterday)
            endOfYesterdayIST.setUTCHours(23, 59, 59, 999)

            // Convert to UTC
            const startUTC = new Date(startOfYesterdayIST.getTime() - 5.5 * 60 * 60 * 1000)
            const endUTC = new Date(endOfYesterdayIST.getTime() - 5.5 * 60 * 60 * 1000)

            return { startDate: startUTC, endDate: endUTC }
        }
        case "last7days": {
            const sevenDaysAgo = new Date(now)
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
            const istSevenDaysAgo = getISTDate(sevenDaysAgo)
            const istNow = getISTDate(now)

            // Start of 7 days ago in IST
            const startOfRangeIST = new Date(istSevenDaysAgo)
            startOfRangeIST.setUTCHours(0, 0, 0, 0)

            // End of today in IST
            const endOfRangeIST = new Date(istNow)
            endOfRangeIST.setUTCHours(23, 59, 59, 999)

            // Convert to UTC
            const startUTC = new Date(startOfRangeIST.getTime() - 5.5 * 60 * 60 * 1000)
            const endUTC = new Date(endOfRangeIST.getTime() - 5.5 * 60 * 60 * 1000)

            return { startDate: startUTC, endDate: endUTC }
        }
        case "last30days": {
            const thirtyDaysAgo = new Date(now)
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
            const istThirtyDaysAgo = getISTDate(thirtyDaysAgo)
            const istNow = getISTDate(now)

            // Start of 30 days ago in IST
            const startOfRangeIST = new Date(istThirtyDaysAgo)
            startOfRangeIST.setUTCHours(0, 0, 0, 0)

            // End of today in IST
            const endOfRangeIST = new Date(istNow)
            endOfRangeIST.setUTCHours(23, 59, 59, 999)

            // Convert to UTC
            const startUTC = new Date(startOfRangeIST.getTime() - 5.5 * 60 * 60 * 1000)
            const endUTC = new Date(endOfRangeIST.getTime() - 5.5 * 60 * 60 * 1000)

            return { startDate: startUTC, endDate: endUTC }
        }
        case "custom": {
            if (!customStart || !customEnd) {
                // Fallback to today if custom dates are missing
                const { startUTC, endUTC } = createISTDateRange()
                return { startDate: startUTC, endDate: endUTC }
            }

            const customStartIST = getISTDate(new Date(customStart))
            customStartIST.setUTCHours(0, 0, 0, 0)
            const customEndIST = getISTDate(new Date(customEnd))
            customEndIST.setUTCHours(23, 59, 59, 999)

            // Convert to UTC
            const startUTC = new Date(customStartIST.getTime() - 5.5 * 60 * 60 * 1000)
            const endUTC = new Date(customEndIST.getTime() - 5.5 * 60 * 60 * 1000)

            return { startDate: startUTC, endDate: endUTC }
        }
        default: {
            const { startUTC, endUTC } = createISTDateRange()
            return { startDate: startUTC, endDate: endUTC }
        }
    }
}
