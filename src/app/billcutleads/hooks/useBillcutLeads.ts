import { useState, useEffect, useCallback } from "react"
import { authFetch } from "@/lib/authFetch"
import { toast } from "react-toastify"
import { Lead, EditingLeadsState } from "../types"
import { LEADS_PER_PAGE } from "../utils/billcutUtils"

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
