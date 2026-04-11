import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/firebase/firebase-admin"

export const dynamic = "force-dynamic"

const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/[\s\-$$$$\+]/g, "")
}

import { resolveLeadState } from "@/app/billcutleads/utils/location"

const REQUIRED_FIELDS = [
  "name", "email", "mobile", "phone", "category", "assigned_to", "income", 
  "sales_notes", "salesNotes", "lastModified", "date", "synced_date", "debt_range", 
  "max_dpd", "convertedAt", "address", "latestRemark",
  "state", "State", "state_name", "city", "City", "location", "Location", "region", "Region",
  "pincode", "pin", "postal_code", "postalCode", "zip", "zipcode", "zipCode"
];

export async function GET(request: NextRequest) {
  if (!adminDb || !adminAuth) {
    return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
  }

  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const idToken = authHeader.split("Bearer ")[1]

  try {
    await adminAuth.verifyIdToken(idToken)
    
    const searchParams = request.nextUrl.searchParams
    const searchTerm = searchParams.get("q") || ""
    const respectMyLeadsFilter = searchParams.get("myLeads") === "true"
    const currentUserName = searchParams.get("userName")

    if (!searchTerm.trim()) {
      return NextResponse.json({ leads: [] })
    }

    let baseQuery: FirebaseFirestore.Query = adminDb.collection("billcutLeads")
    
    // Apply My Leads filter at database level for better performance
    if (respectMyLeadsFilter && currentUserName) {
      baseQuery = baseQuery.where("assigned_to", "==", currentUserName)
    }

    const normalizedSearch = searchTerm.toLowerCase().trim()
    const normalizedPhone = normalizePhoneNumber(searchTerm)
    const seenIds = new Set<string>()
    const searchResults: any[] = []

    const searchQueries: FirebaseFirestore.Query[] = []

    // 1. Phone matches
    const phoneDigits = normalizedPhone.replace(/\D/g, "")
    if (phoneDigits.length >= 3) {
      const prefix = phoneDigits
      const prefixEnd = prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1)
      
      // Try multiple variations for exact matches
      searchQueries.push(
        baseQuery.where("mobile", "==", searchTerm),
        baseQuery.where("mobile", "==", normalizedPhone),
        baseQuery.where("phone", "==", searchTerm),
        baseQuery.where("phone", "==", normalizedPhone)
      )
      
      // Try prefix matches
      searchQueries.push(
        baseQuery.where("mobile", ">=", prefix).where("mobile", "<", prefixEnd).limit(50),
        baseQuery.where("phone", ">=", prefix).where("phone", "<", prefixEnd).limit(50)
      )

      // Try country code prefixes if not already there
      if (!prefix.startsWith("91")) {
        const p91 = "91" + prefix
        const p91End = p91.slice(0, -1) + String.fromCharCode(p91.charCodeAt(p91.length - 1) + 1)
        const pp91 = "+91" + prefix
        const pp91End = pp91.slice(0, -1) + String.fromCharCode(pp91.charCodeAt(pp91.length - 1) + 1)
        
        searchQueries.push(
          baseQuery.where("mobile", ">=", p91).where("mobile", "<", p91End).limit(50),
          baseQuery.where("mobile", ">=", pp91).where("mobile", "<", pp91End).limit(50)
        )
      }
      
      if (phoneDigits.length >= 10) {
        const last10 = phoneDigits.slice(-10)
        searchQueries.push(
          baseQuery.where("mobile", "==", last10),
          baseQuery.where("mobile", "==", `+91${last10}`),
          baseQuery.where("mobile", "==", `91${last10}`),
          baseQuery.where("phone", "==", last10),
          baseQuery.where("phone", "==", `+91${last10}`),
          baseQuery.where("phone", "==", `91${last10}`)
        )
      }
    }

    // 2. Email matches (Full match and Prefix)
    if (normalizedSearch.includes("@") || normalizedSearch.length >= 3) {
      const emailPrefix = normalizedSearch
      const emailPrefixEnd = emailPrefix.slice(0, -1) + String.fromCharCode(emailPrefix.charCodeAt(emailPrefix.length - 1) + 1)
      
      searchQueries.push(baseQuery.where("email", "==", normalizedSearch))
      searchQueries.push(baseQuery.where("email", ">=", emailPrefix).where("email", "<", emailPrefixEnd).limit(50))
    }

    // 3. Name prefix search
    if (normalizedSearch.length >= 2) {
      const namePrefix = normalizedSearch
      const namePrefixEnd = namePrefix.slice(0, -1) + String.fromCharCode(namePrefix.charCodeAt(namePrefix.length - 1) + 1)
      searchQueries.push(
        baseQuery.where("name_lowercase", ">=", namePrefix).where("name_lowercase", "<", namePrefixEnd).limit(100)
      )
      
      // Also try direct name field if name_lowercase is missing
      searchQueries.push(
        baseQuery.where("name", ">=", searchTerm).where("name", "<", searchTerm + "\uf8ff").limit(50)
      )
    }

    // 4. Search terms array
    if (normalizedSearch.length > 0) {
        const words = normalizedSearch.split(/\s+/).filter(w => w.length > 1)
        if (words.length > 0) {
            // Firestore limit is 10 for array-contains-any
            searchQueries.push(baseQuery.where("search_terms", "array-contains-any", words.slice(0, 10)).limit(100))
        }
    }

    // Run all queries in parallel for maximum speed
    const finalQueries = searchQueries.map(q => q.select(...REQUIRED_FIELDS))
    const snapshots = await Promise.all(
      finalQueries.map(q => q.get().catch(err => {
        console.warn("Search query failed (might be missing index):", err)
        return { docs: [] } // Return empty docs on failure
      }))
    )

    for (const snap of snapshots) {
        for (const docSnapshot of snap.docs) {
          if (!seenIds.has(docSnapshot.id)) {
            seenIds.add(docSnapshot.id)
            const data = docSnapshot.data()
            
            const getValidNote = (...notes: (string | undefined)[]) => {
              for (const note of notes) {
                if (note && note !== "-" && note !== "–" && note.trim() !== "") {
                  return note
                }
              }
              return ""
            }

            const finalNote = getValidNote(data.latestRemark, data.salesNotes, data.sales_notes)

            let lead = {
              id: docSnapshot.id,
              name: data.name || "",
              email: data.email || "",
              phone: data.mobile || data.phone || "",
              city: resolveLeadState(data),
              status: data.category || "No Status",
              source_database: "Bill Cut",
              assignedTo: data.assigned_to || "",
              monthlyIncome: data.income || "",
              salesNotes: finalNote,
              latestRemark: finalNote,
              lastModified: data.lastModified?.toDate ? data.lastModified.toDate().toISOString() : new Date().toISOString(),
              date: data.date || data.synced_date?.toDate()?.getTime() || Date.now(),
              callbackInfo: null,
              debtRange: data.debt_range || 0,
              maxDpd: data.max_dpd || 0,
              convertedAt: data.convertedAt?.toDate ? data.convertedAt.toDate().toISOString() : data.convertedAt || null,
            }

            // Apply My Leads filter if requested
            if (respectMyLeadsFilter && currentUserName) {
              if (String(lead.assignedTo).trim().toLowerCase() !== String(currentUserName).trim().toLowerCase()) {
                continue
              }
            }

            searchResults.push(lead)
          }
        }
    }

    // Filter by text match in memory to handle "contains" logic more broadly for the results we found
    // This helps if the prefix query was too specific but search_terms caught it
    const finalResults = searchResults.filter(lead => {
      const matchText = `${lead.name} ${lead.email} ${lead.phone}`.toLowerCase()
      return matchText.includes(normalizedSearch) || 
             (normalizedPhone.length >= 6 && normalizePhoneNumber(lead.phone).includes(normalizedPhone))
    })

    // Sort by relevance (Exact matches first, then date)
    finalResults.sort((a, b) => {
      const aLower = a.name.toLowerCase()
      const bLower = b.name.toLowerCase()
      
      // Exact name match
      if (aLower === normalizedSearch && bLower !== normalizedSearch) return -1
      if (aLower !== normalizedSearch && bLower === normalizedSearch) return 1
      
      // Phone match
      const aPhoneMatch = normalizePhoneNumber(a.phone).includes(normalizedPhone)
      const bPhoneMatch = normalizePhoneNumber(b.phone).includes(normalizedPhone)
      if (aPhoneMatch && !bPhoneMatch) return -1
      if (!aPhoneMatch && bPhoneMatch) return 1

      return b.date - a.date
    })

    return NextResponse.json({ leads: finalResults.slice(0, 100) })

  } catch (error: any) {
    console.error("Error in bill-cut-leads search API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
