import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { authFetch } from "@/lib/authFetch"
import { toast } from "react-toastify"
import { Lead, EditingLeadsState } from "../types"
import { LEADS_PER_PAGE, processBillcutLead, getCallbackPriority, parseDebtRangeToNumber } from "../utils/billcutUtils"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore"

export const useBillcutLeads = (userRole: string) => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchResults, setSearchResults] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadAllLoading, setIsLoadAllLoading] = useState(false)
  const [hasMoreLeads, setHasMoreLeads] = useState(true)
  const [page, setPage] = useState(1)
  const [totalFilteredCount, setTotalFilteredCount] = useState(0)
  const [editingLeads, setEditingLeads] = useState<EditingLeadsState>({})

  // Ref to track the listener limit without causing re-subscriptions
  const listenerLimitRef = useRef(LEADS_PER_PAGE)
  // Ref to skip listener updates while API fetch is in-flight
  const isFetchingRef = useRef(false)

  const searchParams = useSearchParams()

  // Filter states (moved from page.tsx)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all")
  const [salesPersonFilter, setSalesPersonFilter] = useState(searchParams.get("salesPerson") || "all")
  const [showMyLeads, setShowMyLeads] = useState(false)
  const [fromDate, setFromDate] = useState(searchParams.get("fromDate") || "")
  const [toDate, setToDate] = useState(searchParams.get("toDate") || "")
  const [activeTab, setActiveTab] = useState<"all" | "callback">("all")
  const [debtRangeSort, setDebtRangeSort] = useState<"none" | "low-to-high" | "high-to-low">("none")
  
  // Admin/Overlord only filter states
  const [convertedFromDate, setConvertedFromDate] = useState("")
  const [convertedToDate, setConvertedToDate] = useState("")
  const [lastModifiedFromDate, setLastModifiedFromDate] = useState("")
  const [lastModifiedToDate, setLastModifiedToDate] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchBillcutLeads = useCallback(
    async (isLoadMore = false) => {
      isFetchingRef.current = true
      if (isLoadMore) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
        setLeads([])
        setPage(1)
        setHasMoreLeads(true)
      }

      try {
        const queryParams = new URLSearchParams({
          fromDate,
          toDate,
          statusFilter,
          salesPersonFilter,
          showMyLeads: String(showMyLeads),
          userName: localStorage.getItem("userName") || "",
          activeTab,
          debtRangeSort,
          userRole,
          page: String(isLoadMore ? page + 1 : 1),
          limit: String(LEADS_PER_PAGE),
          convertedFromDate,
          convertedToDate,
          lastModifiedFromDate,
          lastModifiedToDate
        })

        const response = await authFetch(`/api/bill-cut-leads/list?${queryParams.toString()}`)
        const data = await response.json()

        if (data.error) throw new Error(data.error)

        const fetchedLeads = data.leads
        setTotalFilteredCount(data.totalCount || 0)

        if (fetchedLeads.length === 0) {
          setHasMoreLeads(false)
          if (!isLoadMore) setLeads([])
          return
        }

        setLeads((prevLeads: Lead[]) => {
          const merged = isLoadMore ? [...prevLeads, ...fetchedLeads] : fetchedLeads
          // Update the listener limit ref to cover all loaded leads
          listenerLimitRef.current = Math.max(merged.length, LEADS_PER_PAGE)
          return merged
        })

        setHasMoreLeads(fetchedLeads.length === LEADS_PER_PAGE)
        if (isLoadMore) setPage((prev: number) => prev + 1)

        // Initialize editing state
        const initialEditingState: EditingLeadsState = {}
        fetchedLeads.forEach((lead: Lead) => {
          initialEditingState[lead.id] = { ...lead, salesNotes: lead.salesNotes || "" }
        })

        if (!isLoadMore) {
          setEditingLeads(initialEditingState)
        } else {
          setEditingLeads((prev: EditingLeadsState) => ({ ...prev, ...initialEditingState }))
        }
      } catch (error) {
        console.error("Error fetching billcut leads:", error)
        toast.error("Failed to load billcut leads")
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
        isFetchingRef.current = false
      }
    },
    [fromDate, toDate, statusFilter, salesPersonFilter, showMyLeads, activeTab, debtRangeSort, userRole, page, convertedFromDate, convertedToDate, lastModifiedFromDate, lastModifiedToDate]
  )

  const fetchCallbackInfo = useCallback(async (leadId: string) => {
    try {
      const response = await authFetch(`/api/bill-cut-leads/callback-info?leadId=${leadId}`)
      const data = await response.json()
      
      if (data.callbackInfo) {
        return {
          ...data.callbackInfo,
          scheduled_dt: new Date(data.callbackInfo.scheduled_dt),
          created_at: data.callbackInfo.created_at ? new Date(data.callbackInfo.created_at) : null
        }
      }
      return null
    } catch (error) {
      console.error("Error fetching callback info:", error)
      return null
    }
  }, [])

  const performDatabaseSearch = useCallback(async (searchTerm: string, respectMyLeadsFilter: boolean = false): Promise<Lead[]> => {
    if (!searchTerm.trim()) return []

    setIsSearching(true)
    try {
      const queryParams = new URLSearchParams({
        q: searchTerm,
        myLeads: String(respectMyLeadsFilter),
        userName: localStorage.getItem("userName") || ""
      })
      
      const response = await authFetch(`/api/bill-cut-leads/search?${queryParams.toString()}`)
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      return data.leads || []
    } catch (error) {
      console.error("Error performing database search:", error)
      toast.error("Search failed. Please try again.")
      return []
    } finally {
      setIsSearching(false)
    }
  }, [])

  const loadAllLeads = async () => {
    if (searchQuery.trim()) {
      toast.error("Cannot load all leads while searching. Please clear the search first.")
      return
    }

    setIsLoadAllLoading(true)
    try {
      const queryParams = new URLSearchParams({
        fromDate,
        toDate,
        statusFilter,
        salesPersonFilter,
        showMyLeads: String(showMyLeads),
        userName: localStorage.getItem("userName") || "",
        activeTab,
        debtRangeSort,
        userRole,
        page: "1",
        limit: "1000",
        convertedFromDate,
        convertedToDate,
        lastModifiedFromDate,
        lastModifiedToDate
      })

      const response = await authFetch(`/api/bill-cut-leads/list?${queryParams.toString()}`)
      const data = await response.json()

      if (data.error) throw new Error(data.error)

      setLeads(data.leads)
      setTotalFilteredCount(data.totalCount || data.leads.length)
      setHasMoreLeads(false)

      const initialEditingState: EditingLeadsState = {}
      data.leads.forEach((lead: Lead) => {
        initialEditingState[lead.id] = { ...lead, salesNotes: lead.salesNotes || "" }
      })
      setEditingLeads(initialEditingState)

      toast.success(`Loaded ${data.leads.length} leads`)
    } catch (error) {
      console.error("Error loading all leads:", error)
      toast.error("Failed to load all leads")
    } finally {
      setIsLoadAllLoading(false)
    }
  }

  // Auto-fetch leads when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchBillcutLeads(false)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [fromDate, toDate, statusFilter, salesPersonFilter, showMyLeads, activeTab, debtRangeSort, convertedFromDate, convertedToDate, lastModifiedFromDate, lastModifiedToDate])

  // Handle search debouncing
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim()) {
        const results = await performDatabaseSearch(searchQuery, showMyLeads)
        setSearchResults(results)
      } else {
        setSearchResults([])
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, showMyLeads, performDatabaseSearch])

  // --- Real-time Firestore Listener ---
  useEffect(() => {
    // Determine the current user name for "My Leads" filter
    const currentUserName = localStorage.getItem("userName") || ""
    
    // Only set up real-time listener if we are NOT searching (search is complex)
    // Or if we want real-time for search, we'd need a different query.
    // For now, let's focus on the main list as requested.
    
    let q = query(collection(db, "billcutLeads"))

    // 1. Date filters
    if (fromDate) {
      const start = new Date(`${fromDate}T00:00:00.000Z`)
      start.setTime(start.getTime() - (330 * 60 * 1000))
      q = query(q, where("date", ">=", start.getTime()))
    }
    if (toDate) {
      const end = new Date(`${toDate}T23:59:59.999Z`)
      end.setTime(end.getTime() - (330 * 60 * 1000))
      q = query(q, where("date", "<=", end.getTime()))
    }

    // 2. Status Filter
    if (statusFilter !== "all") {
      if (statusFilter === "No Status") {
        q = query(q, where("category", "in", ["", "-", "No Status"]))
      } else {
        q = query(q, where("category", "==", statusFilter))
      }
    }

    // 3. Salesperson Filter
    if (showMyLeads && currentUserName) {
      q = query(q, where("assigned_to", "==", currentUserName))
    } else if (salesPersonFilter !== "all") {
      if (salesPersonFilter === "-") {
        q = query(q, where("assigned_to", "in", ["", "-"]))
      } else {
        q = query(q, where("assigned_to", "==", salesPersonFilter))
      }
    }

    // 4. Tab Filter
    if (activeTab === "callback") {
      q = query(q, where("category", "==", "Callback"))
    }

    // 5. Admin Advanced Filters
    if (userRole === "admin" || userRole === "overlord") {
      if (convertedFromDate) {
        const start = new Date(convertedFromDate)
        start.setHours(0, 0, 0, 0)
        q = query(q, where("convertedAt", ">=", Timestamp.fromDate(start)))
      }
      if (convertedToDate) {
        const end = new Date(convertedToDate)
        end.setHours(23, 59, 59, 999)
        q = query(q, where("convertedAt", "<=", Timestamp.fromDate(end)))
      }
      if (lastModifiedFromDate) {
        const start = new Date(lastModifiedFromDate)
        start.setHours(0, 0, 0, 0)
        q = query(q, where("lastModified", ">=", Timestamp.fromDate(start)))
      }
      if (lastModifiedToDate) {
        const end = new Date(lastModifiedToDate)
        end.setHours(23, 59, 59, 999)
        q = query(q, where("lastModified", "<=", Timestamp.fromDate(end)))
      }
    }

    // 6. Sorting (Firestore requires explicit order for inequality filters)
    const hasAdvancedDateFilters = (userRole === "admin" || userRole === "overlord") &&
      (!!convertedFromDate || !!convertedToDate || !!lastModifiedFromDate || !!lastModifiedToDate)
    
    if (hasAdvancedDateFilters) {
      if (convertedFromDate || convertedToDate) {
        q = query(q, orderBy("convertedAt", "desc"), orderBy("lastModified", "desc"))
      } else {
        q = query(q, orderBy("lastModified", "desc"))
      }
    } else {
      q = query(q, orderBy("date", "desc"))
    }

    // 7. Limit to current number of loaded leads or first page
    q = query(q, limit(listenerLimitRef.current))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Skip updates if we are searching or if an API fetch is in-flight
      if (searchQuery.trim() || isFetchingRef.current) return

      const snapshotLeadsMap = new Map<string, Lead>()
      snapshot.docs.forEach(doc => {
        const lead = processBillcutLead(doc.id, doc.data())
        snapshotLeadsMap.set(lead.id, lead)
      })
      
      // Merge strategy: update existing leads in-place, preserve leads loaded via pagination
      // that the limited listener query may not have fetched.
      setLeads((prev) => {
        if (prev.length === 0) {
          // No API data yet, use the snapshot directly
          return Array.from(snapshotLeadsMap.values())
        }

        // Update existing leads in-place with real-time data
        let nextLeads = prev.map(existingLead => {
          const updatedLead = snapshotLeadsMap.get(existingLead.id)
          if (updatedLead) {
            // Preserve callbackInfo if the snapshot dropped it
            if (existingLead.callbackInfo && !updatedLead.callbackInfo) {
              return { ...updatedLead, callbackInfo: existingLead.callbackInfo }
            }
            return updatedLead
          }
          // Lead not in snapshot (e.g. loaded from a later page) — keep it as-is
          return existingLead
        })

        // Check if any leads in the snapshot are new (not already in the list)
        snapshotLeadsMap.forEach((lead, id) => {
          if (!nextLeads.find(l => l.id === id)) {
            nextLeads.push(lead)
          }
        })
        
        // Re-apply sorting
        if (activeTab === "callback") {
          nextLeads.sort((a, b) => {
            const priorityA = getCallbackPriority(a)
            const priorityB = getCallbackPriority(b)
            if (priorityA === priorityB && a.callbackInfo?.scheduled_dt && b.callbackInfo?.scheduled_dt) {
               return new Date(a.callbackInfo.scheduled_dt).getTime() - new Date(b.callbackInfo.scheduled_dt).getTime()
            }
            return priorityA - priorityB
          })
        } else if (debtRangeSort !== "none") {
          nextLeads.sort((a, b) => {
            const valA = parseDebtRangeToNumber(a.debtRange)
            const valB = parseDebtRangeToNumber(b.debtRange)
            
            if (valA !== valB) {
              return debtRangeSort === "low-to-high" ? valA - valB : valB - valA
            }
            return (b.date || 0) - (a.date || 0)
          })
        }
        
        return nextLeads
      })

      // Sync editing state for new/updated leads
      setEditingLeads((prev) => {
        const next = { ...prev }
        snapshotLeadsMap.forEach((lead) => {
          if (!next[lead.id]) {
            next[lead.id] = { ...lead, salesNotes: lead.salesNotes || "" }
          }
        })
        return next
      })
    }, (error) => {
      console.error("Firestore listener error:", error)
      // Fallback to fetch if listener fails (e.g. missing index)
    })

    return () => unsubscribe()
  }, [
    fromDate, toDate, statusFilter, salesPersonFilter, showMyLeads, 
    activeTab, userRole, convertedFromDate, convertedToDate, 
    lastModifiedFromDate, lastModifiedToDate, searchQuery
  ])

  // --- Search Results Listener (Simplified) ---
  useEffect(() => {
    if (!searchQuery.trim()) return

    const currentUserName = localStorage.getItem("userName") || ""
    
    // We can't easily replicate the complex multi-query search in a single listener.
    // However, we can listen for leads where the name starts with the search query (simplified)
    // or just listen for any changes to the current search results.
    
    if (searchResults.length === 0) return

    // Listen to changes for specifically the leads in the current search results
    const leadIds = searchResults.map(l => l.id).slice(0, 10) // Limit to avoid too many listeners or complex 'in' query
    if (leadIds.length === 0) return

    const q = query(collection(db, "billcutLeads"), where("__name__", "in", leadIds))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedSearchLeads = snapshot.docs.map(doc => processBillcutLead(doc.id, doc.data()))
      
      setSearchResults(prev => {
        const next = [...prev]
        updatedSearchLeads.forEach(updated => {
          const index = next.findIndex(l => l.id === updated.id)
          if (index !== -1) {
            next[index] = updated
          }
        })
        return next
      })
    })

    return () => unsubscribe()
  }, [searchQuery, searchResults.map(l => l.id).join(",")])

  return {
    leads, setLeads,
    searchResults, setSearchResults,
    isLoading,
    isLoadingMore,
    isSearching,
    isLoadAllLoading,
    hasMoreLeads,
    totalFilteredCount, setTotalFilteredCount,
    editingLeads, setEditingLeads,
    
    // Filters
    statusFilter, setStatusFilter,
    salesPersonFilter, setSalesPersonFilter,
    showMyLeads, setShowMyLeads,
    fromDate, setFromDate,
    toDate, setToDate,
    activeTab, setActiveTab,
    debtRangeSort, setDebtRangeSort,
    convertedFromDate, setConvertedFromDate,
    convertedToDate, setConvertedToDate,
    lastModifiedFromDate, setLastModifiedFromDate,
    lastModifiedToDate, setLastModifiedToDate,
    searchQuery, setSearchQuery,
    
    // Actions
    fetchBillcutLeads,
    performDatabaseSearch,
    loadAllLeads,
    fetchCallbackInfo
  }
}
