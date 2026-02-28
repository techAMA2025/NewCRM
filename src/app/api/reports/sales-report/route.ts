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

    if (!adminDb) {
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

            const cacheKey = `sales-analytics-${startDateParam}-${endDateParam}`
            const cached = cache.get(cacheKey)

            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                return NextResponse.json(cached.data)
            }

            let query = db.collection("ama_leads")
                .select(
                    "status",
                    "source_database",
                    "date",
                    "assigned_to",
                    "assignedTo",
                    "email",
                    "mobile",
                    "query",
                    "lastNote",
                    "salesNotes"
                ) as FirebaseFirestore.Query

            // Add separate conversion query
            let conversionQuery = db.collection("ama_leads")
                .where("status", "==", "Converted")
                .select(
                    "status",
                    "assigned_to",
                    "assignedTo",
                    "convertedAt"
                ) as FirebaseFirestore.Query

            if (startDateParam) {
                const startDate = new Date(startDateParam)
                startDate.setHours(0, 0, 0, 0)
                query = query.where("date", ">=", startDate.getTime())
                conversionQuery = conversionQuery.where("convertedAt", ">=", startDate)
            }

            if (endDateParam) {
                const endDate = new Date(endDateParam)
                if (endDate.toDateString() === new Date().toDateString()) {
                    endDate.setTime(new Date().getTime())
                } else {
                    endDate.setHours(23, 59, 59, 999)
                }
                query = query.where("date", "<=", endDate.getTime())
                conversionQuery = conversionQuery.where("convertedAt", "<=", endDate)
            }

            // Fetch both queries
            const [querySnapshot, conversionSnapshot] = await Promise.all([
                query.get(),
                conversionQuery.get()
            ])

            const totalLeads = querySnapshot.size
            const convertedLeadsCount = conversionSnapshot.size

            if (totalLeads === 0 && convertedLeadsCount === 0) {
                return NextResponse.json({ analytics: null, estimatedReads: 2 })
            }

            const leads = querySnapshot.docs.map((doc: any) => doc.data())
            const convertedLeadsList = conversionSnapshot.docs.map((doc: any) => doc.data())

            // 1. Category Distribution
            const categoryDistribution: Record<string, number> = {}

            // Map statuses from created leads
            leads.forEach((lead: any) => {
                const status = lead.status === "–" ? "No Status" : (lead.status || "No Status")
                categoryDistribution[status] = (categoryDistribution[status] || 0) + 1
            })

            // Overlay correct Converted count based on conversion date
            // Note: This replaces the "Converted" count derived from creation date logic
            categoryDistribution["Converted"] = convertedLeadsCount

            const categoryData = Object.entries(categoryDistribution).map(([name, value]) => ({
                name,
                value,
                percentage: (value / totalLeads) * 100
            })).sort((a, b) => b.value - a.value)

            // 2. Salesperson Performance
            const activeSalespersonsSnapshot = await db.collection("users")
                .where("role", "in", ["sales", "salesperson"])
                .where("status", "==", "active")
                .get()

            const activeSalespersons = activeSalespersonsSnapshot.docs.map((doc: any) => {
                const data = doc.data()
                return {
                    name: `${data.firstName || ""} ${data.lastName || ""}`.trim()
                }
            }).filter((u: any) => u.name !== "")

            const activeSalespersonNames = new Set(activeSalespersons.map(sp => sp.name))

            // Aggregate salesperson data in memory
            const spStats: Record<string, any> = {}

            // First pass: Process created leads for total leads and non-conversion statuses
            leads.forEach((lead: any) => {
                const name = (lead.assigned_to || lead.assignedTo || "Unassigned").trim()
                if (activeSalespersonNames.has(name)) {
                    if (!spStats[name]) {
                        spStats[name] = {
                            name,
                            totalLeads: 0,
                            interested: 0,
                            converted: 0,
                            statusBreakdown: {}
                        }
                    }
                    const stats = spStats[name]
                    stats.totalLeads++
                    const status = lead.status === "–" ? "No Status" : (lead.status || "No Status")
                    if (status === "Interested") stats.interested++

                    // Skip "Converted" here in statusBreakdown as it will be set by the conversion date logic below
                    if (status !== "Converted") {
                        stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1
                    }
                }
            })

            // Second pass: Process converted leads for the converted metric
            convertedLeadsList.forEach((lead: any) => {
                const name = (lead.assigned_to || lead.assignedTo || "Unassigned").trim()
                if (activeSalespersonNames.has(name)) {
                    if (!spStats[name]) {
                        spStats[name] = {
                            name,
                            totalLeads: 0, // This person might not have had new leads assigned, but had conversions
                            interested: 0,
                            converted: 0,
                            statusBreakdown: {}
                        }
                    }
                    spStats[name].converted++
                    // Also update statusBreakdown for the "Converted" bucket
                    spStats[name].statusBreakdown["Converted"] = (spStats[name].statusBreakdown["Converted"] || 0) + 1
                }
            })

            const salesPerformance = Object.values(spStats).map((sp: any) => ({
                ...sp,
                conversionRate: Math.round((sp.totalLeads > 0 ? ((sp.interested + sp.converted) / sp.totalLeads) * 100 : 0) * 100) / 100
            })).sort((a, b) => b.totalLeads - a.totalLeads)

            // 3. Source Distribution
            const sourceDistribution: Record<string, number> = {}
            leads.forEach((lead: any) => {
                const source = lead.source_database || "Unknown"
                sourceDistribution[source] = (sourceDistribution[source] || 0) + 1
            })

            const sourceDatabaseDistribution = Object.entries(sourceDistribution).map(([name, value]) => ({
                name,
                value
            })).sort((a, b) => b.value - a.value)

            // 4. Monthly Distribution
            const monthlyMap: Record<string, number> = {}
            leads.forEach((lead: any) => {
                const dateNum = lead.date || 0
                if (dateNum) {
                    const date = new Date(dateNum)
                    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
                    monthlyMap[label] = (monthlyMap[label] || 0) + 1
                }
            })

            const monthlyDistribution = Object.entries(monthlyMap).map(([name, value]) => ({
                name,
                value
            })).sort((a, b) => a.name.localeCompare(b.name))

            // 5. Contact Analysis
            const contactAnalysis = {
                hasEmail: leads.filter((l: any) => l.email && l.email !== "").length,
                hasPhone: leads.filter((l: any) => l.mobile && l.mobile > 0).length,
                hasQuery: leads.filter((l: any) => l.query && l.query !== "").length,
                hasNotes: leads.filter((l: any) => l.lastNote && l.lastNote !== "").length,
                hasSalesNotes: leads.filter((l: any) => l.salesNotes && l.salesNotes !== "").length,
            }

            const analyticsResult = {
                totalLeads,
                uniqueAssignees: salesPerformance.length,
                conversionRate: Math.round((totalLeads > 0 ? (convertedLeadsCount / totalLeads) * 100 : 0) * 100) / 100,
                categoryDistribution: categoryData,
                assigneeDistribution: salesPerformance.map(sp => ({ name: sp.name, value: sp.totalLeads })),
                sourceDatabaseDistribution,
                monthlyDistribution,
                salesPerformance,
                contactAnalysis,
            }

            const estimatedReads = totalLeads + convertedLeadsCount + activeSalespersonsSnapshot.size
            console.log(`[Sales Analytics] Phase 3: Fetched ${totalLeads} docs (with select). Total Reads: ${estimatedReads}`)

            const responseData = { analytics: analyticsResult, estimatedReads }
            cache.set(cacheKey, { data: responseData, timestamp: Date.now() })

            return NextResponse.json(responseData)

        } else if (type === "productivity") {
            const range = searchParams.get("range") || "today"
            const customStart = searchParams.get("customStart")
            const customEnd = searchParams.get("customEnd")

            const { startDate, endDate } = getProductivityDateRange(range, customStart, customEnd)

            if (range === "today") {
                // Real-time from ama_leads
                const leadsQuery = db.collection("ama_leads")
                    .where("lastModified", ">=", startDate)
                    .where("lastModified", "<=", endDate)

                const snapshot = await leadsQuery.get()
                const leads = snapshot.docs.map(doc => doc.data())

                const userStats: Record<string, any> = {}

                leads.forEach(lead => {
                    const userId = lead.assigned_to || "Unassigned"
                    if (!userStats[userId]) {
                        userStats[userId] = {
                            userId,
                            userName: userId,
                            date: new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", year: "numeric", month: "short", day: "numeric" }),
                            leadsWorked: 0,
                            lastActivity: new Date(0),
                            statusBreakdown: {},
                        }
                    }

                    const stats = userStats[userId]
                    stats.leadsWorked++

                    const lastMod = lead.lastModified?.toDate ? lead.lastModified.toDate() : new Date(lead.lastModified)
                    if (lastMod > stats.lastActivity) {
                        stats.lastActivity = lastMod
                    }

                    const status = lead.status === "–" ? "No Status" : (lead.status || "No Status")
                    stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1
                })

                const estimatedReads = snapshot.docs.length
                console.log(`[Sales Productivity] Estimated Firestore reads: ${estimatedReads} (Range: today)`)

                return NextResponse.json({
                    productivityStats: Object.values(userStats),
                    estimatedReads
                })
            } else {
                // Historical from snapshots
                const snapshotDates: string[] = []
                const today = new Date()

                if (range === "yesterday") {
                    const yesterday = new Date(today)
                    yesterday.setDate(yesterday.getDate() - 1)
                    snapshotDates.push(yesterday.toISOString().split('T')[0])
                } else if (range === "last7days") {
                    for (let i = 6; i >= 0; i--) {
                        const d = new Date(today)
                        d.setDate(d.getDate() - i)
                        snapshotDates.push(d.toISOString().split('T')[0])
                    }
                } else if (range === "last30days") {
                    for (let i = 29; i >= 0; i--) {
                        const d = new Date(today)
                        d.setDate(d.getDate() - i)
                        snapshotDates.push(d.toISOString().split('T')[0])
                    }
                }

                const userSummaryMap: Record<string, any> = {}

                const snapshotPromises = snapshotDates.map(date => db.collection("productivity_snapshots").doc(date).get())
                const snapshots = await Promise.all(snapshotPromises)

                snapshots.forEach(doc => {
                    if (doc.exists) {
                        const data = doc.data()
                        if (data?.amaLeads?.userProductivity) {
                            data.amaLeads.userProductivity.forEach((userData: any) => {
                                const userId = userData.userId || "Unassigned"
                                if (!userSummaryMap[userId]) {
                                    userSummaryMap[userId] = {
                                        userId,
                                        userName: userData.userName || userId,
                                        date: range === "yesterday" ? "Yesterday" : range === "last7days" ? "Last 7 Days" : "Last 30 Days",
                                        leadsWorked: 0,
                                        lastActivity: new Date(0),
                                        statusBreakdown: {},
                                    }
                                }

                                const summary = userSummaryMap[userId]
                                summary.leadsWorked += userData.leadsWorked || 0

                                const lastAct = userData.lastActivity?.toDate ? userData.lastActivity.toDate() : new Date(userData.lastActivity || 0)
                                if (lastAct > summary.lastActivity) {
                                    summary.lastActivity = lastAct
                                }

                                if (userData.statusBreakdown) {
                                    Object.entries(userData.statusBreakdown).forEach(([status, count]) => {
                                        const normStatus = status === "–" ? "No Status" : status
                                        summary.statusBreakdown[normStatus] = (summary.statusBreakdown[normStatus] || 0) + (count as number)
                                    })
                                }
                            })
                        }
                    }
                })

                const estimatedReads = snapshots.length
                console.log(`[Sales Productivity] Estimated Firestore reads: ${estimatedReads} (Range: ${range})`)

                return NextResponse.json({
                    productivityStats: Object.values(userSummaryMap).sort((a, b) => b.leadsWorked - a.leadsWorked),
                    estimatedReads
                })
            }
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    } catch (error: any) {
        console.error("Sales Report API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

function getProductivityDateRange(range: string, customStart?: string | null, customEnd?: string | null) {
    const now = new Date()
    const getIST = (d: Date) => new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
    const toUTC = (d: Date) => new Date(d.getTime() - 5.5 * 60 * 60 * 1000)

    let startIST = getIST(now)
    let endIST = getIST(now)

    if (range === "today") {
        startIST.setUTCHours(0, 0, 0, 0)
        endIST.setUTCHours(23, 59, 59, 999)
    } else if (range === "yesterday") {
        startIST.setDate(startIST.getDate() - 1)
        startIST.setUTCHours(0, 0, 0, 0)
        endIST = new Date(startIST)
        endIST.setUTCHours(23, 59, 59, 999)
    } else if (range === "last7days") {
        startIST.setDate(startIST.getDate() - 6)
        startIST.setUTCHours(0, 0, 0, 0)
        endIST.setUTCHours(23, 59, 59, 999)
    } else if (range === "last30days") {
        startIST.setDate(startIST.getDate() - 29)
        startIST.setUTCHours(0, 0, 0, 0)
        endIST.setUTCHours(23, 59, 59, 999)
    } else if (range === "custom" && customStart && customEnd) {
        startIST = getIST(new Date(customStart))
        startIST.setUTCHours(0, 0, 0, 0)
        endIST = getIST(new Date(customEnd))
        endIST.setUTCHours(23, 59, 59, 999)
    }

    return { startDate: toUTC(startIST), endDate: toUTC(endIST) }
}
