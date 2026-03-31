import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

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
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const userDoc = await adminDb.collection("users").where("uid", "==", uid).limit(1).get();
        if (userDoc.empty) {
            console.warn(`[AUTH] Unauthorized IPRKaro leads access attempt by UID: ${uid}`);
            return NextResponse.json({ error: "Unauthorized: User not found in database" }, { status: 403 });
        }

        const db = adminDb;

        try {
            const searchParams = request.nextUrl.searchParams
            const page = Number.parseInt(searchParams.get("page") || "1")
            const limit = Number.parseInt(searchParams.get("limit") || "50")
            const status = searchParams.get("status")
            const salesperson = searchParams.get("salesperson")
            const search = searchParams.get("search") || ""
            const stateFilter = searchParams.get("state")

            // Date filtering
            const startDateParam = searchParams.get("startDate")
            const endDateParam = searchParams.get("endDate")

            const offset = (page - 1) * limit

            let queryRef: FirebaseFirestore.Query = db.collection("ipr_karo_leads")

            // --- Filtering ---

            // Status filter
            if (status && status !== "all") {
                if (status === "No Status") {
                    queryRef = queryRef.where("status", "in", ["No Status", "–", "-", ""])
                } else {
                    queryRef = queryRef.where("status", "==", status)
                }
            }

            // Salesperson filter
            if (salesperson && salesperson !== "all") {
                if (salesperson === "unassigned") {
                    queryRef = queryRef.where("assigned_to", "in", ["–", "-", ""])
                } else {
                    queryRef = queryRef.where("assigned_to", "==", salesperson)
                }
            }

            // State filter
            if (stateFilter && stateFilter !== "all") {
                queryRef = queryRef.where("state", "==", stateFilter)
            }

            // Date filtering (createdAt)
            if (startDateParam) {
                const start = new Date(`${startDateParam}T00:00:00.000+05:30`)
                queryRef = queryRef.where("createdAt", ">=", Timestamp.fromDate(start))
            }

            if (endDateParam) {
                const end = new Date(`${endDateParam}T23:59:59.999+05:30`)
                queryRef = queryRef.where("createdAt", "<=", Timestamp.fromDate(end))
            }

            // --- Search ---
            let isSearchActive = false
            if (search.trim()) {
                isSearchActive = true
                const searchLower = search.toLowerCase().trim()

                console.log(`[IPRKaro API] Searching for "${search}"`)

                const queries: Promise<FirebaseFirestore.QuerySnapshot>[] = []

                const createBaseQuery = () => {
                    let q = db.collection("ipr_karo_leads") as FirebaseFirestore.Query
                    if (status && status !== "all") {
                        if (status === "No Status") {
                            q = q.where("status", "in", ["No Status", "–", "-", ""])
                        } else {
                            q = q.where("status", "==", status)
                        }
                    }
                    if (salesperson && salesperson !== "all") {
                        q = q.where("assigned_to", "==", salesperson)
                    }
                    if (stateFilter && stateFilter !== "all") {
                        q = q.where("state", "==", stateFilter)
                    }
                    if (startDateParam) {
                        const start = new Date(`${startDateParam}T00:00:00.000+05:30`)
                        q = q.where("createdAt", ">=", Timestamp.fromDate(start))
                    }
                    if (endDateParam) {
                        const end = new Date(`${endDateParam}T23:59:59.999+05:30`)
                        q = q.where("createdAt", "<=", Timestamp.fromDate(end))
                    }
                    return q
                }

                // Phone search
                const stripped = searchLower.replace(/\D/g, "")
                if (stripped.length >= 4) {
                    queries.push(createBaseQuery().where("phone", ">=", stripped).where("phone", "<=", stripped + "\uf8ff").limit(50).get())
                }

                // Name search (multi-case)
                const searchTitle = searchLower.charAt(0).toUpperCase() + searchLower.slice(1)
                const searchUpper = searchLower.toUpperCase()
                const uniqueTerms = new Set([search.trim(), searchLower, searchTitle, searchUpper])

                uniqueTerms.forEach(term => {
                    if (!term) return
                    queries.push(createBaseQuery().where("name", ">=", term).where("name", "<=", term + "\uf8ff").limit(50).get())
                    if (term.length > 2) {
                        queries.push(createBaseQuery().where("email", ">=", term).where("email", "<=", term + "\uf8ff").limit(50).get())
                        queries.push(createBaseQuery().where("trademarkName", ">=", term).where("trademarkName", "<=", term + "\uf8ff").limit(50).get())
                    }
                })

                const snapshots = await Promise.all(queries)

                const mergedDocs = new Map<string, FirebaseFirestore.DocumentSnapshot>()
                snapshots.forEach(snap => {
                    snap.docs.forEach(doc => {
                        if (!mergedDocs.has(doc.id)) mergedDocs.set(doc.id, doc)
                    })
                })

                console.log(`[IPRKaro API] Merged ${mergedDocs.size} docs from parallel queries`)

                const allDocs = Array.from(mergedDocs.values())
                // Sort by createdAt descending (newest first)
                allDocs.sort((a, b) => {
                    const aData = a.data() || {}
                    const bData = b.data() || {}
                    const aTime = aData.createdAt?.toMillis?.() || 0
                    const bTime = bData.createdAt?.toMillis?.() || 0
                    return bTime - aTime
                })
                const total = allDocs.length
                const paginatedDocs = allDocs.slice(offset, offset + limit)

                const serializeDate = (val: any) => {
                    if (val instanceof Timestamp) return val.toDate().toISOString()
                    if (val instanceof Date) return val.toISOString()
                    if (typeof val === "string") return val
                    return null
                }

                const leads = paginatedDocs.map(doc => {
                    const data = doc.data() || {}
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: serializeDate(data.createdAt),
                        synced_at: serializeDate(data.synced_at),
                    }
                })

                return NextResponse.json({
                    leads,
                    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
                }, {
                    headers: {
                        "Cache-Control": "no-store, no-cache, must-revalidate",
                        "Pragma": "no-cache",
                        "Expires": "0",
                    }
                })
            }

            // --- Sorting ---
            if (!isSearchActive) {
                if (startDateParam || endDateParam) {
                    queryRef = queryRef.orderBy("createdAt", "desc")
                } else {
                    queryRef = queryRef.orderBy("createdAt", "desc")
                }
            }

            // --- Get total count ---
            const countSnapshot = await queryRef.count().get()
            const total = countSnapshot.data().count

            // --- Pagination ---
            queryRef = queryRef.limit(limit).offset(offset)

            const snapshot = await queryRef.get()
            console.log(`[IPRKaro API] Total: ${total}, Snapshot: ${snapshot.size}, Offset: ${offset}, Limit: ${limit}`)

            const serializeDate = (val: any) => {
                if (val instanceof Timestamp) return val.toDate().toISOString()
                if (val instanceof Date) return val.toISOString()
                if (typeof val === "string") return val
                return null
            }

            const leads = snapshot.docs.map(doc => {
                const data = doc.data()
                return {
                    id: doc.id,
                    ...data,
                    createdAt: serializeDate(data.createdAt),
                    synced_at: serializeDate(data.synced_at),
                }
            })

            return NextResponse.json({
                leads,
                meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            }, {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                }
            })
        } catch (error: any) {
            console.error("Error fetching IPRKaro leads:", error)
            return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
        }
    } catch (authError) {
        console.error("Authentication Error:", authError);
        return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }
}
