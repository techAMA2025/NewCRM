import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"
import { Timestamp, Filter } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"

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

        // Optional browse: Verify user exists in your 'users' collection
        const userDoc = await adminDb.collection("users").where("uid", "==", uid).limit(1).get();

        if (userDoc.empty) {
            console.warn(`[AUTH] Unauthorized access attempt by UID: ${uid}`);
            return NextResponse.json({ error: "Unauthorized: User not found in database" }, { status: 403 });
        }

        // Authentication successful, proceed with the query logic
        const db = adminDb;

        try {
            const searchParams = request.nextUrl.searchParams
            const page = Number.parseInt(searchParams.get("page") || "1")
            const limit = Number.parseInt(searchParams.get("limit") || "50")
            const status = searchParams.get("status")
            const source = searchParams.get("source")
            const salespersonId = searchParams.get("salespersonId")
            const search = searchParams.get("search") || ""
            const sortKey = searchParams.get("sort") || "synced_at"
            const sortDir = searchParams.get("order") === "asc" ? "asc" : "desc"
            const tab = searchParams.get("tab") || "all"
            const debtRangeSort = searchParams.get("debtRangeSort") || "none"

            // Handle debtRangeSort
            let finalSortKey = sortKey
            let finalSortDir: "asc" | "desc" = sortDir as "asc" | "desc"

            const hasInequalityFilters = !!(
                searchParams.get("startDate") || searchParams.get("endDate") ||
                searchParams.get("convertedStartDate") || searchParams.get("convertedEndDate") ||
                searchParams.get("lastModifiedStartDate") || searchParams.get("lastModifiedEndDate")
            )

            if (debtRangeSort !== "none" && !hasInequalityFilters) {
                finalSortKey = "debt_range"
                finalSortDir = debtRangeSort === "low-to-high" ? "asc" : "desc"
            }
            let queryRef: FirebaseFirestore.Query = db.collection("ama_leads")

            // --- Filtering ---

            // 1. Tab Filters
            if (tab === "callback") {
                queryRef = queryRef.where("status", "==", "Callback")
            } else if (tab === "today") {
                // Logic for "Today" - assuming 'date' or 'synced_at' is used
                const startOfDay = new Date()
                startOfDay.setHours(0, 0, 0, 0)
                const endOfDay = new Date()
                endOfDay.setHours(23, 59, 59, 999)
                queryRef = queryRef
                    .where("synced_at", ">=", Timestamp.fromDate(startOfDay))
                    .where("synced_at", "<=", Timestamp.fromDate(endOfDay))
            }

            // 2. Explicit Filters
            if (status && status !== "all") {
                if (status === "No Status") {
                    // Handle various forms of "No Status"
                    queryRef = queryRef.where("status", "in", ["No Status", "–", "-", "", null])
                } else {
                    queryRef = queryRef.where("status", "==", status)
                }
            }

            if (source && source !== "all") {
                queryRef = queryRef.where("source", "==", source)
            }

            if (salespersonId && salespersonId !== "all") {
                if (salespersonId === "unassigned") {
                    // Handle various forms of "Unassigned"
                    queryRef = queryRef.where("assigned_to", "in", ["–", "-", "", null])
                } else {
                    queryRef = queryRef.where("assigned_to", "==", salespersonId)
                }
            }

            // Date Filtering (synced_at)
            const startDateParam = searchParams.get("startDate")
            const endDateParam = searchParams.get("endDate")

            if (startDateParam) {
                // Explicitly construct UTC date to avoid local timezone interference
                // startDateParam is YYYY-MM-DD
                const start = new Date(`${startDateParam}T00:00:00.000Z`)

                // Adjust for IST (UTC+5:30)
                // We want 00:00 IST, which is Previous Day 18:30 UTC
                // Subtract 5.5 hours (330 minutes * 60 * 1000 ms)
                start.setTime(start.getTime() - (330 * 60 * 1000))

                queryRef = queryRef.where("synced_at", ">=", Timestamp.fromDate(start))
            }

            if (endDateParam) {
                // Explicitly construct UTC date
                const end = new Date(`${endDateParam}T23:59:59.999Z`)

                // Adjust for IST (UTC+5:30)
                // We want 23:59:59 IST, which is Same Day 18:29:59 UTC
                // Subtract 5.5 hours
                end.setTime(end.getTime() - (330 * 60 * 1000))

                queryRef = queryRef.where("synced_at", "<=", Timestamp.fromDate(end))
            }

            // Advanced Date Filters (Converted & Last Modified)
            const convertedFromDate = searchParams.get("convertedStartDate")
            const convertedToDate = searchParams.get("convertedEndDate")
            const lastModifiedFromDate = searchParams.get("lastModifiedStartDate")
            const lastModifiedToDate = searchParams.get("lastModifiedEndDate")

            if (convertedFromDate) {
                const start = new Date(convertedFromDate)
                start.setHours(0, 0, 0, 0)
                queryRef = queryRef.where("convertedAt", ">=", Timestamp.fromDate(start))
            }

            if (convertedToDate) {
                const end = new Date(convertedToDate)
                end.setHours(23, 59, 59, 999)
                queryRef = queryRef.where("convertedAt", "<=", Timestamp.fromDate(end))
            }

            if (lastModifiedFromDate) {
                const start = new Date(lastModifiedFromDate)
                start.setHours(0, 0, 0, 0)
                queryRef = queryRef.where("lastModified", ">=", Timestamp.fromDate(start))
            }

            if (lastModifiedToDate) {
                const end = new Date(lastModifiedToDate)
                end.setHours(23, 59, 59, 999)
                queryRef = queryRef.where("lastModified", "<=", Timestamp.fromDate(end))
            }

            // --- Pagination ---
            // For simple offset pagination (not efficient for massive datasets but easiest to drop-in replace)
            // For cursor pagination, we'd need to pass the last doc snapshot, which is hard via REST API without serializing it.
            // We'll use offset for now, but limit max offset to avoid performance cliffs.
            const offset = (page - 1) * limit

            // 3. Search (Server-side simple search)
            // Note: Firestore doesn't support full-text search natively.
            // We can implement basic prefix matching for Name or Phone if no other filters are active.
            // If complex filters are active + search, it's best to filter in memory or use a dedicated search service (Algolia/Typesense).
            // For this implementation, if search is present, we might need to fetch a bit more data or rely on specific indexes.
            // A common pattern without Algolia is to search by specific fields if the query looks like a phone number.

            let isSearchActive = false
            if (search.trim()) {
                isSearchActive = true
                const searchLower = search.toLowerCase().trim()

                // Unified Parallel Search Logic
                console.log(`[API DEBUG] Searching for "${search}"`)

                const queries: Promise<FirebaseFirestore.QuerySnapshot>[] = []

                // Helper to create.baseQuery with other filters
                const createBaseQuery = () => {
                    let q = db.collection("ama_leads") as FirebaseFirestore.Query
                    if (tab === "callback") q = q.where("status", "==", "Callback")
                    if (status && status !== "all") q = q.where("status", "==", status)
                    if (source && source !== "all") q = q.where("source", "==", source)
                    if (salespersonId && salespersonId !== "all") q = q.where("assigned_to", "==", salespersonId)

                    if (startDateParam) {
                        const start = new Date(startDateParam)
                        start.setHours(0, 0, 0, 0)
                        q = q.where("synced_at", ">=", Timestamp.fromDate(start))
                    }

                    if (endDateParam) {
                        const end = new Date(endDateParam)
                        end.setHours(23, 59, 59, 999)
                        q = q.where("synced_at", "<=", Timestamp.fromDate(end))
                    }

                    if (convertedFromDate) {
                        const start = new Date(convertedFromDate)
                        start.setHours(0, 0, 0, 0)
                        q = q.where("convertedAt", ">=", Timestamp.fromDate(start))
                    }

                    if (convertedToDate) {
                        const end = new Date(convertedToDate)
                        end.setHours(23, 59, 59, 999)
                        q = q.where("convertedAt", "<=", Timestamp.fromDate(end))
                    }

                    if (lastModifiedFromDate) {
                        const start = new Date(lastModifiedFromDate)
                        start.setHours(0, 0, 0, 0)
                        q = q.where("lastModified", ">=", Timestamp.fromDate(start))
                    }

                    if (lastModifiedToDate) {
                        const end = new Date(lastModifiedToDate)
                        end.setHours(23, 59, 59, 999)
                        q = q.where("lastModified", "<=", Timestamp.fromDate(end))
                    }

                    return q
                }

                // 1. Phone Search (if applicable)
                // If it looks like a phone number (allow spaces/dashes in input but strip them)
                const stripped = searchLower.replace(/\D/g, "")
                if (stripped.length >= 4) {
                    const num = Number(stripped)

                    // Exact Number Match
                    if (!isNaN(num)) {
                        queries.push(createBaseQuery().where("mobile", "==", num).limit(50).get())
                        queries.push(createBaseQuery().where("phone", "==", num).limit(50).get())
                        queries.push(createBaseQuery().where("number", "==", num).limit(50).get())
                    }

                    // Numeric Range Match
                    if (stripped.length > 0 && stripped.length < 10 && !isNaN(num)) {
                        const padCount = 10 - stripped.length
                        const min = num * Math.pow(10, padCount)
                        const max = min + Math.pow(10, padCount) - 1
                        queries.push(createBaseQuery().where("mobile", ">=", min).where("mobile", "<=", max).limit(50).get())
                        queries.push(createBaseQuery().where("phone", ">=", min).where("phone", "<=", max).limit(50).get())
                        queries.push(createBaseQuery().where("number", ">=", min).where("number", "<=", max).limit(50).get())
                    }

                    // String Range Match for Phone
                    queries.push(createBaseQuery().where("mobile", ">=", stripped).where("mobile", "<=", stripped + "\uf8ff").limit(50).get())
                    queries.push(createBaseQuery().where("phone", ">=", stripped).where("phone", "<=", stripped + "\uf8ff").limit(50).get())
                    queries.push(createBaseQuery().where("number", ">=", stripped).where("number", "<=", stripped + "\uf8ff").limit(50).get())
                }

                // 2. Name Search (Multi-case)
                const searchOrig = search.trim()
                const searchTitle = searchLower.charAt(0).toUpperCase() + searchLower.slice(1)
                const searchUpper = searchLower.toUpperCase()

                const uniqueSearchTerms = new Set([searchOrig, searchLower, searchTitle, searchUpper])

                uniqueSearchTerms.forEach(term => {
                    if (!term) return
                    queries.push(createBaseQuery().where("name", ">=", term).where("name", "<=", term + "\uf8ff").limit(50).get())
                    // Optional: Search email too if it looks like part of an email? 
                    // Let's stick to name as requested, but maybe add email for completeness if it has '@' or is simple text
                    if (term.length > 2) {
                        queries.push(createBaseQuery().where("email", ">=", term).where("email", "<=", term + "\uf8ff").limit(50).get())
                    }
                })

                const snapshots = await Promise.all(queries)

                // Merge results
                const mergedDocs = new Map<string, FirebaseFirestore.DocumentSnapshot>()
                snapshots.forEach(snap => {
                    snap.docs.forEach(doc => {
                        if (!mergedDocs.has(doc.id)) {
                            mergedDocs.set(doc.id, doc)
                        }
                    })
                })

                console.log(`[API DEBUG] Merged ${mergedDocs.size} docs from parallel queries`)

                // Retrieve paginated subset
                const allDocs = Array.from(mergedDocs.values())
                const total = allDocs.length

                // Slice for pagination
                const paginatedDocs = allDocs.slice(offset, offset + limit)

                // Map to lead objects
                const leads = await Promise.all(paginatedDocs.map(async (doc) => {
                    try {
                        const data = doc.data() || {}
                        let callbackInfo = data.callbackInfo

                        // If in callback tab and missing info on main doc, try to fetch from subcollection
                        if (tab === "callback" && !callbackInfo) {
                            try {
                                const callbackRef = db.collection("ama_leads").doc(doc.id).collection("callback_info")
                                const callbackSnap = await callbackRef.orderBy("scheduled_dt", "desc").limit(1).get()
                                if (!callbackSnap.empty) {
                                    callbackInfo = callbackSnap.docs[0].data()
                                }
                            } catch (e) {
                                console.error(`Error fetching callback info for ${doc.id}:`, e)
                            }
                        }

                        // Helper to serialize Timestamps to ISO strings
                        const serializeDate = (val: any) => {
                            if (val instanceof Timestamp) return val.toDate().toISOString()
                            if (val instanceof Date) return val.toISOString()
                            if (typeof val === 'string') return val
                            return null
                        }

                        return {
                            id: doc.id,
                            ...data,
                            date: serializeDate(data.date),
                            synced_at: serializeDate(data.synced_at),
                            convertedAt: serializeDate(data.convertedAt),
                            mobile: String(data.mobile || data.phone || ""),
                            assignedTo: data.assigned_to || data.assignedTo || "",
                            assignedToId: data.assignedToId || data.assigned_to_id || "",
                            callbackInfo: callbackInfo ? {
                                ...callbackInfo,
                                scheduled_dt: serializeDate(callbackInfo.scheduled_dt),
                                created_at: serializeDate(callbackInfo.created_at),
                                updated_at: serializeDate(callbackInfo.updated_at),
                            } : null,
                        }
                    } catch (err) {
                        console.error(`[API DEBUG] Error mapping doc ${doc.id}:`, err)
                        return null
                    }
                }))

                const validLeads = leads.filter(l => l !== null)

                return NextResponse.json({
                    leads: validLeads,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                    },
                }, {
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        'Surrogate-Control': 'no-store'
                    }
                })
            }

            // --- Sorting ---
            // Only apply sorting if not searching (search usually requires specific order for range queries)
            if (!isSearchActive) {
                // Check for inequality filters which dictate sort order
                if (convertedFromDate || convertedToDate) {
                    // If filtering by convertedAt, we MUST sort by convertedAt first
                    queryRef = queryRef.orderBy("convertedAt", finalSortDir)
                    // Secondary sort can be kept or default
                    if (finalSortKey !== "convertedAt") {
                        queryRef = queryRef.orderBy(finalSortKey, finalSortDir)
                    }
                } else if (lastModifiedFromDate || lastModifiedToDate) {
                    // If filtering by lastModified, we MUST sort by lastModified first
                    queryRef = queryRef.orderBy("lastModified", finalSortDir)
                    // Secondary sort
                    if (finalSortKey !== "lastModified") {
                        queryRef = queryRef.orderBy(finalSortKey, finalSortDir)
                    }
                } else if (startDateParam || endDateParam) {
                    // synced_at filter
                    queryRef = queryRef.orderBy("synced_at", finalSortDir)
                } else if (debtRangeSort !== "none") {
                    // Debt Range Sort (handled by finalSortKey already, but being explicit)
                    queryRef = queryRef.orderBy("debt_range", finalSortDir)
                    // Secondary sort by date (newest first)
                    queryRef = queryRef.orderBy("synced_at", "desc")
                } else {
                    // No inequality filters limiting sort order
                    queryRef = queryRef.orderBy(finalSortKey, finalSortDir)
                }
            }

            // --- Pagination ---
            // For simple offset pagination (not efficient for massive datasets but easiest to drop-in replace)
            // For cursor pagination, we'd need to pass the last doc snapshot, which is hard via REST API without serializing it.
            // We'll use offset for now, but limit max offset to avoid performance cliffs.
            // const offset = (page - 1) * limit (Moved to top)

            // Get total count (for pagination UI)
            // Note: count() is fast and cheap
            const countSnapshot = await queryRef.count().get()
            const total = countSnapshot.data().count

            // Apply limit and offset
            queryRef = queryRef.limit(limit).offset(offset)

            // Execute Query
            const snapshot = await queryRef.get()
            const estimatedCountReads = Math.ceil(total / 1000)
            console.log(`[API DEBUG] fetchLeads: Search: "${search}", Total (Count): ${total}, Estimated Count Reads: ${estimatedCountReads}, Snapshot Size: ${snapshot.size}, Offset: ${offset}, Limit: ${limit}`)

            const leads = await Promise.all(snapshot.docs.map(async (doc) => {
                try {
                    const data = doc.data()
                    let callbackInfo = data.callbackInfo

                    // If in callback tab and missing info on main doc, try to fetch from subcollection
                    if (tab === "callback" && !callbackInfo) {
                        try {
                            const callbackRef = db.collection("ama_leads").doc(doc.id).collection("callback_info")
                            const callbackSnap = await callbackRef.orderBy("scheduled_dt", "desc").limit(1).get()
                            if (!callbackSnap.empty) {
                                callbackInfo = callbackSnap.docs[0].data()
                            }
                        } catch (e) {
                            console.error(`Error fetching callback info for ${doc.id}:`, e)
                        }
                    }

                    // Helper to serialize Timestamps to ISO strings
                    const serializeDate = (val: any) => {
                        if (val instanceof Timestamp) return val.toDate().toISOString()
                        if (val instanceof Date) return val.toISOString()
                        if (typeof val === 'string') return val
                        return null
                    }

                    return {
                        id: doc.id,
                        ...data,
                        date: serializeDate(data.date),
                        synced_at: serializeDate(data.synced_at),
                        convertedAt: serializeDate(data.convertedAt),
                        // Ensure numeric/string fields are consistent
                        mobile: String(data.mobile || data.phone || ""),
                        // Map snake_case fields to camelCase if needed
                        // Prioritize assigned_to as requested by user
                        assignedTo: data.assigned_to || data.assignedTo || "",
                        assignedToId: data.assignedToId || data.assigned_to_id || "",
                        callbackInfo: callbackInfo ? {
                            ...callbackInfo,
                            scheduled_dt: serializeDate(callbackInfo.scheduled_dt),
                            created_at: serializeDate(callbackInfo.created_at),
                            updated_at: serializeDate(callbackInfo.updated_at),
                        } : null,
                    }
                } catch (err) {
                    console.error(`[API DEBUG] Error mapping doc ${doc.id}:`, err)
                    return null
                }
            }))

            // Filter out nulls if any errors occurred
            const validLeads = leads.filter(l => l !== null)
            console.log(`[API DEBUG] Leads returned: ${validLeads.length}`)

            return NextResponse.json({
                leads: validLeads,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            }, {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Surrogate-Control': 'no-store'
                }
            })
        } catch (error: any) {
            console.error("Error fetching leads:", error)
            const errorMessage = error.message || "Internal Server Error"
            return NextResponse.json({ error: errorMessage }, { status: 500 })
        }
    } catch (authError: any) {
        console.error("Authentication Error:", authError);
        return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }
}
