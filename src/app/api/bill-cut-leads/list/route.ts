import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

export const dynamic = "force-dynamic"
import { resolveLeadState } from "@/app/billcutleads/utils/location"

const REQUIRED_FIELDS = [
  "name", "email", "mobile", "category", "assigned_to", "income", 
  "sales_notes", "lastModified", "date", "synced_date", "debt_range", 
  "max_dpd", "convertedAt", "address",
  "state", "State", "state_name", "city", "City", "location", "Location", "region", "Region",
  "pincode", "pin", "postal_code", "postalCode", "zip", "zipcode", "zipCode"
];


/**
 * Helper to get callback priority for sorting (Replicated from client)
 */
const getCallbackPriority = (lead: any): number => {
  if (!lead.callbackInfo || !lead.callbackInfo.scheduled_dt) {
    return 4
  }

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(today.getDate() + 2)

  const scheduledDate = new Date(lead.callbackInfo.scheduled_dt)
  const scheduledDateOnly = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  const dayAfterTomorrowOnly = new Date(
    dayAfterTomorrow.getFullYear(),
    dayAfterTomorrow.getMonth(),
    dayAfterTomorrow.getDate(),
  )

  if (scheduledDateOnly.getTime() === todayOnly.getTime()) return 1
  if (scheduledDateOnly.getTime() === tomorrowOnly.getTime()) return 2
  if (scheduledDateOnly.getTime() >= dayAfterTomorrowOnly.getTime()) return 3
  return 4
}

export async function GET(request: NextRequest) {
  if (!adminDb || !adminAuth) {
    return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
  }

  // Auth Check
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const idToken = authHeader.split("Bearer ")[1]

  try {
    await adminAuth.verifyIdToken(idToken)

    const searchParams = request.nextUrl.searchParams
    const fromDate = searchParams.get("fromDate")
    const toDate = searchParams.get("toDate")
    const statusFilter = searchParams.get("statusFilter") || "all"
    const salesPersonFilter = searchParams.get("salesPersonFilter") || "all"
    const showMyLeads = searchParams.get("showMyLeads") === "true"
    const userName = searchParams.get("userName")
    const activeTab = searchParams.get("activeTab") || "all"
    const debtRangeSort = searchParams.get("debtRangeSort") || "none"
    const userRole = searchParams.get("userRole") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limitCount = parseInt(searchParams.get("limit") || "50")

    // Admin/Overlord only filters
    const convertedFromDate = searchParams.get("convertedFromDate")
    const convertedToDate = searchParams.get("convertedToDate")
    const lastModifiedFromDate = searchParams.get("lastModifiedFromDate")
    const lastModifiedToDate = searchParams.get("lastModifiedToDate")

    let queryRef: FirebaseFirestore.Query = adminDb.collection("billcutLeads")

    // Date filters (using 'date' field)
    if (fromDate) {
      const start = new Date(`${fromDate}T00:00:00.000Z`)
      start.setTime(start.getTime() - (330 * 60 * 1000)) // IST Adjust
      queryRef = queryRef.where("date", ">=", start.getTime())
    }
    if (toDate) {
      const end = new Date(`${toDate}T23:59:59.999Z`)
      end.setTime(end.getTime() - (330 * 60 * 1000)) // IST Adjust
      queryRef = queryRef.where("date", "<=", end.getTime())
    }

    // Advanced Date Filters
    if (userRole === "admin" || userRole === "overlord") {
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
    }

    // Status Filter
    if (statusFilter !== "all") {
      if (statusFilter === "No Status") {
        queryRef = queryRef.where("category", "in", ["", "-", "No Status"])
      } else {
        queryRef = queryRef.where("category", "==", statusFilter)
      }
    }

    // Salesperson Filter
    if (showMyLeads && userName) {
      queryRef = queryRef.where("assigned_to", "==", userName)
    } else if (salesPersonFilter !== "all") {
      if (salesPersonFilter === "-") {
        queryRef = queryRef.where("assigned_to", "in", ["", "-"])
      } else {
        queryRef = queryRef.where("assigned_to", "==", salesPersonFilter)
      }
    }

    // Tab Filter
    if (activeTab === "callback") {
      queryRef = queryRef.where("category", "==", "Callback")
    }

    // Determine Sort Order
    const hasInequalityFilters = !!fromDate || !!toDate || !!convertedFromDate || !!convertedToDate || !!lastModifiedFromDate || !!lastModifiedToDate
    const hasAdvancedDateFilters = (userRole === "admin" || userRole === "overlord") &&
      (!!convertedFromDate || !!convertedToDate || !!lastModifiedFromDate || !!lastModifiedToDate)

    if (debtRangeSort !== "none" && !hasInequalityFilters) {
      queryRef = queryRef.orderBy("debt_range", debtRangeSort === "low-to-high" ? "asc" : "desc")
      queryRef = queryRef.orderBy("date", "desc")
    } else if (hasAdvancedDateFilters) {
      if (convertedFromDate || convertedToDate) {
        queryRef = queryRef.orderBy("convertedAt", "desc").orderBy("lastModified", "desc")
      } else {
        queryRef = queryRef.orderBy("lastModified", "desc")
      }
    } else {
      queryRef = queryRef.orderBy("date", "desc")
    }

    // Parallelize Count and Fetch with Field Selection
    const offset = (page - 1) * limitCount;
    const [countSnapshot, snapshot] = await Promise.all([
      queryRef.count().get(),
      queryRef.select(...REQUIRED_FIELDS).limit(limitCount).offset(offset).get()
    ]);
    
    const totalCount = countSnapshot.data().count;

    // Process Results
    const leads = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data()
      const state = resolveLeadState(data)

      const latestNote = data.sales_notes || ""

      let callbackInfo = null
      // ONLY fetch callback info if it's actually the Callback tab 
      // This is the biggest performance boost as it avoids N+1 queries for 90% of requests
      if (activeTab === "callback" && data.category === "Callback") {
        const callbackRef = adminDb!.collection("billcutLeads").doc(doc.id).collection("callback_info")
        const callbackSnap = await callbackRef.orderBy("created_at", "desc").limit(1).get()
        if (!callbackSnap.empty) {
          const cbData = callbackSnap.docs[0].data()
          callbackInfo = {
            id: cbData.id || "attempt_1",
            scheduled_dt: cbData.scheduled_dt?.toDate ? cbData.scheduled_dt.toDate().toISOString() : cbData.scheduled_dt,
            scheduled_by: cbData.scheduled_by || "",
            created_at: cbData.created_at?.toDate ? cbData.created_at.toDate().toISOString() : cbData.created_at,
          }
        }
      }

      return {
        id: doc.id,
        name: data.name || "",
        email: data.email || "",
        phone: data.mobile || "",
        city: state,
        status: data.category || "No Status",
        source_database: "Bill Cut",
        assignedTo: data.assigned_to || "",
        monthlyIncome: data.income || "",
        salesNotes: latestNote,
        lastModified: data.lastModified?.toDate ? data.lastModified.toDate().toISOString() : new Date().toISOString(),
        date: data.date || data.synced_date?.toDate()?.getTime() || Date.now(),
        debtRange: data.debt_range || 0,
        maxDpd: data.max_dpd || 0,
        convertedAt: data.convertedAt?.toDate ? data.convertedAt.toDate().toISOString() : data.convertedAt || null,
        callbackInfo,
        statusHistory: data.statusHistory || [],
      }
    }))

    // Final sorting for special cases that might need client-side logic replication
    let sortedLeads = [...leads]
    if (activeTab === "callback" && !hasAdvancedDateFilters) {
      sortedLeads.sort((a, b) => {
        const priorityA = getCallbackPriority(a)
        const priorityB = getCallbackPriority(b)
        if (priorityA === priorityB && a.callbackInfo?.scheduled_dt && b.callbackInfo?.scheduled_dt) {
          return new Date(a.callbackInfo.scheduled_dt).getTime() - new Date(b.callbackInfo.scheduled_dt).getTime()
        }
        return priorityA - priorityB
      })
    }

    return NextResponse.json({
      leads: sortedLeads,
      totalCount
    })

  } catch (error: any) {
    console.error("Error in bill-cut-leads list API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
