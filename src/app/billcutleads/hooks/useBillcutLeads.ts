import { useState, useEffect, useCallback } from "react"
import { authFetch } from "@/lib/authFetch"
import { toast } from "react-toastify"
import { Lead, EditingLeadsState } from "../types"
import { LEADS_PER_PAGE, processBillcutLead } from "../utils/billcutUtils"
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

  // Filter states (moved from page.tsx)
  const [statusFilter, setStatusFilter] = useState("all")
  const [salesPersonFilter, setSalesPersonFilter] = useState("all")
  const [showMyLeads, setShowMyLeads] = useState(false)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
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
          if (isLoadMore) return [...prevLeads, ...fetchedLeads]
          return fetchedLeads
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
    const currentLimit = Math.max(leads.length, LEADS_PER_PAGE)
    q = query(q, limit(currentLimit))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Only update if we are not in searching mode
      if (searchQuery.trim()) return

      const updatedLeads = snapshot.docs.map(doc => processBillcutLead(doc.id, doc.data()))
      
      // Update leads state
      setLeads(updatedLeads)

      // Sync editing state for new/updated leads
      setEditingLeads((prev) => {
        const next = { ...prev }
        updatedLeads.forEach(lead => {
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
    lastModifiedFromDate, lastModifiedToDate, searchQuery,
    leads.length // Re-listen with larger limit when pagination happens
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
