"use client"

import type React from "react"

import { FaFilter, FaUserTie } from "react-icons/fa"
import { toast } from "react-toastify"
import { useEffect, useState, useCallback, useMemo } from "react"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { db as crmDb } from "@/firebase/firebase"
import { debounce } from "lodash"
import CustomDateInput from "./CustomDateInput"

type LeadsFiltersProps = {
  searchQuery: string
  setSearchQuery: (query: string) => void
  sourceFilter: string
  setSourceFilter: (source: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  salesPersonFilter: string
  setSalesPersonFilter: (salesperson: string) => void
  statusOptions: string[]
  teamMembers: any[]
  userRole: string
  filteredLeads: any[]
  leads: any[]
  totalLeadsCount: number
  convertedFilter: boolean | null
  setConvertedFilter: (converted: boolean | null) => void
  fromDate: string
  setFromDate: (date: string) => void
  toDate: string
  setToDate: (date: string) => void
  // New search props
  onSearchResults?: (results: any[]) => void
  isSearching?: boolean
  setIsSearching?: (searching: boolean) => void
  allLeadsCount?: number
  onSearchCleared?: () => void
  databaseFilteredCount?: number // Total count from database matching all filters
  // New optional props for advanced filters
  convertedFromDate?: string
  setConvertedFromDate?: (date: string) => void
  convertedToDate?: string
  setConvertedToDate?: (date: string) => void
  lastModifiedFromDate?: string
  setLastModifiedFromDate?: (date: string) => void
  lastModifiedToDate?: string
  setLastModifiedToDate?: (date: string) => void
  debtRangeSort: "none" | "low-to-high" | "high-to-low"
  setDebtRangeSort: (sort: "none" | "low-to-high" | "high-to-low") => void
}

const AmaLeadsFilters = ({
  searchQuery,
  setSearchQuery,
  sourceFilter,
  setSourceFilter,
  statusFilter,
  setStatusFilter,
  salesPersonFilter,
  setSalesPersonFilter,
  statusOptions,
  teamMembers,
  userRole,
  filteredLeads,
  leads,
  totalLeadsCount,
  convertedFilter,
  setConvertedFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  // New search props
  onSearchResults,
  isSearching = false,
  setIsSearching = () => {},
  allLeadsCount = 0,
  onSearchCleared,
  databaseFilteredCount = 0,
  // New Advanced Date Filters Props
  convertedFromDate,
  setConvertedFromDate,
  convertedToDate,
  setConvertedToDate,
  lastModifiedFromDate,
  setLastModifiedFromDate,
  lastModifiedToDate,
  setLastModifiedToDate,
  debtRangeSort,
  setDebtRangeSort,
}: LeadsFiltersProps) => {
  const [salesUsers, setSalesUsers] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Enhanced search implementation
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [searchResultsCount, setSearchResultsCount] = useState(0)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Normalize phone number for search
  const normalizePhoneNumber = (phone: string | number): string => {
    return String(phone).replace(/[\s\-$$$$+]/g, "")
  }

  // Perform database search using existing fields
  const performDatabaseSearch = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        onSearchResults?.([])
        setSearchResultsCount(0)
        return
      }

      setIsSearching(true)

      try {
        const searchTermLower = searchTerm.toLowerCase().trim()
        const normalizedPhone = normalizePhoneNumber(searchTerm)

        const allResults = new Map() // Use Map to avoid duplicates

        // Search by phone number (handle both string and number fields)
        if (normalizedPhone.length >= 10) {
          try {
            // Try searching mobile as number first
            const phoneAsNumber = Number.parseInt(normalizedPhone)
            if (!isNaN(phoneAsNumber)) {
              const phoneQuery = query(collection(crmDb, "ama_leads"), where("mobile", "==", phoneAsNumber), limit(50))
              const phoneSnapshot = await getDocs(phoneQuery)
              phoneSnapshot.docs.forEach((doc) => {
                allResults.set(doc.id, { id: doc.id, ...doc.data(), searchRelevance: 3 })
              })
            }

            // Also try partial phone matching with string conversion
            const phoneStringQuery = query(collection(crmDb, "ama_leads"), orderBy("mobile"), limit(200))
            const phoneStringSnapshot = await getDocs(phoneStringQuery)
            phoneStringSnapshot.docs.forEach((doc) => {
              const data = doc.data()
              const docPhone = normalizePhoneNumber(data.mobile || "")
              if (docPhone.includes(normalizedPhone)) {
                allResults.set(doc.id, { id: doc.id, ...data, searchRelevance: 2 })
              }
            })
          } catch (error) {
          }
        }

        // Search by name (case-insensitive)
        try {
          // First try exact prefix match
          const nameQuery = query(
            collection(crmDb, "ama_leads"),
            where("name", ">=", searchTermLower),
            where("name", "<=", searchTermLower + "\uf8ff"),
            orderBy("name"),
            limit(50),
          )
          const nameSnapshot = await getDocs(nameQuery)
          nameSnapshot.docs.forEach((doc) => {
            const data = doc.data()
            if (data.name?.toLowerCase().includes(searchTermLower)) {
              const relevance = data.name?.toLowerCase().startsWith(searchTermLower) ? 3 : 2
              allResults.set(doc.id, { id: doc.id, ...data, searchRelevance: relevance })
            }
          })

          // Also try original case for names stored in proper case
          if (searchTerm.length > 0) {
            const properCaseQuery = query(
              collection(crmDb, "ama_leads"),
              where("name", ">=", searchTerm),
              where("name", "<=", searchTerm + "\uf8ff"),
              orderBy("name"),
              limit(50),
            )
            const properCaseSnapshot = await getDocs(properCaseQuery)
            properCaseSnapshot.docs.forEach((doc) => {
              const data = doc.data()
              if (data.name?.toLowerCase().includes(searchTermLower)) {
                const relevance = data.name?.toLowerCase().startsWith(searchTermLower) ? 3 : 2
                allResults.set(doc.id, { id: doc.id, ...data, searchRelevance: relevance })
              }
            })
          }
        } catch (error) {
        }

        // Search by email (case-insensitive)
        if (searchTermLower.includes("@") || searchTermLower.length > 3) {
          try {
            const emailQuery = query(
              collection(crmDb, "ama_leads"),
              where("email", ">=", searchTermLower),
              where("email", "<=", searchTermLower + "\uf8ff"),
              orderBy("email"),
              limit(50),
            )
            const emailSnapshot = await getDocs(emailQuery)
            emailSnapshot.docs.forEach((doc) => {
              const data = doc.data()
              if (data.email?.toLowerCase().includes(searchTermLower)) {
                const relevance = data.email?.toLowerCase().startsWith(searchTermLower) ? 3 : 2
                allResults.set(doc.id, { id: doc.id, ...data, searchRelevance: relevance })
              }
            })
          } catch (error) {
          }
        }

        // Enhanced fallback search: Get more recent leads and filter thoroughly
        if (allResults.size === 0 || searchTermLower.length <= 3) {
          try {
            const fallbackQuery = query(
              collection(crmDb, "ama_leads"),
              orderBy("date", "desc"),
              limit(1500), // Increased limit for better search coverage
            )
            const fallbackSnapshot = await getDocs(fallbackQuery)

            fallbackSnapshot.docs.forEach((doc) => {
              const data = doc.data()
              const name = (data.name || "").toString().toLowerCase()
              const email = (data.email || "").toString().toLowerCase()
              const phone = normalizePhoneNumber(data.mobile || "")

              let matched = false
              let relevance = 1

              // Name matching
              if (name.includes(searchTermLower)) {
                matched = true
                relevance = name.startsWith(searchTermLower) ? 2 : 1
              }

              // Email matching
              if (email.includes(searchTermLower)) {
                matched = true
                relevance = Math.max(relevance, email.startsWith(searchTermLower) ? 2 : 1)
              }

              // Phone matching
              if (phone.includes(normalizedPhone) && normalizedPhone.length >= 4) {
                matched = true
                relevance = Math.max(relevance, 2)
              }

              if (matched) {
                allResults.set(doc.id, { id: doc.id, ...data, searchRelevance: relevance })
              }
            })
          } catch (error) {
          }
        }

        // Convert Map to Array and sort by relevance
        const searchResults = Array.from(allResults.values())
          .sort((a, b) => (b.searchRelevance || 0) - (a.searchRelevance || 0))
          .slice(0, 50) // Limit final results


        // Transform results to match AMA Lead type
        const transformedResults = searchResults.map((data) => {
          // Treat "-" status as "No Status"
          const normalizedStatus = data.status === "-" || data.status === "–" ? "No Status" : data.status || "No Status"

          return {
            id: data.id,
            name: data.name || "",
            email: data.email || "",
            phone: String(data.mobile || ""), // Convert number to string
            address: data.address || "",
            city: data.city || "",
            status: normalizedStatus,
            source: data.source || "",
            source_database: data.source_database || data.source || "", // Use source_database field
            assignedTo: data.assigned_to || "",
            assignedToId: data.assignedToId || "",
            salesNotes: data.salesNotes || data.lastNote || "",
            lastNote: data.lastNote || "",
            query: data.query || "",
            language_barrier: data.language_barrier,
            convertedAt: data.convertedAt,
            convertedToClient: data.convertedToClient,
            lastModified: data.lastModified,
            debt_Range: data.debt_range || data.debt_Range, // Handle both cases
            debt_range: data.debt_range,
            debtRange: data.debt_range,
            synced_at: data.synced_at || (data.synced_date ? new Date(data.synced_date) : data.date ? new Date(data.date) : undefined),
            date: data.date || data.synced_date || Date.now(),
            income: data.income,
          }
        })

        setSearchResultsCount(transformedResults.length)
        onSearchResults?.(transformedResults)

        if (transformedResults.length > 0) {
        } else {
        }
      } catch (error) {
        onSearchResults?.([])
        setSearchResultsCount(0)
      } finally {
        setIsSearching(false)
      }
    },
    [onSearchResults, setIsSearching],
  )

  // Debounced parent update to prevent typing glitches
  const debouncedSetSearchQuery = useMemo(
    () =>
      debounce((value: string) => {
        setSearchQuery(value)
      }, 500),
    [setSearchQuery],
  )

  // Debounced database search function (existing but slightly modified to be purely for side-effect data if needed)
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        if (value.trim()) {
          performDatabaseSearch(value)
        } else {
          onSearchResults?.([])
          setSearchResultsCount(0)
        }
      }, 500),
    [performDatabaseSearch, onSearchResults],
  )

  // Update local search state when parent state changes
  // We strictly check if the values are different to avoid unnecessary resets
  useEffect(() => {
    if (searchQuery !== searchInput) {
        setSearchInput(searchQuery)
    }
  }, [searchQuery])

  // Handle search input changes
  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchInput(value)
      
      // Debounce the parent update so we don't spam fetches and cause re-render loops/glitches
      debouncedSetSearchQuery(value)
      
      // Also debounce the local database search (if used for autocomplete/counts)
      debouncedSearch(value)
    },
    [debouncedSetSearchQuery, debouncedSearch],
  )

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchInput("")
    setSearchQuery("")
    debouncedSetSearchQuery.cancel()
    debouncedSearch.cancel()
    onSearchResults?.([])
    setSearchResultsCount(0)
    onSearchCleared?.()
  }, [setSearchQuery, onSearchResults, debouncedSearch, debouncedSetSearchQuery, onSearchCleared])

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    clearSearch()
    setSourceFilter("all")
    setStatusFilter("all")
    setSalesPersonFilter("all")
    setConvertedFilter(null)
    setFromDate("")
    setToDate("")
    if (setConvertedFromDate) setConvertedFromDate("")
    if (setConvertedToDate) setConvertedToDate("")
    if (setLastModifiedFromDate) setLastModifiedFromDate("")
    if (setLastModifiedToDate) setLastModifiedToDate("")
    setDebtRangeSort("none")
  }, [clearSearch, setSourceFilter, setStatusFilter, setSalesPersonFilter, setConvertedFilter, setFromDate, setToDate, setConvertedFromDate, setConvertedToDate, setLastModifiedFromDate, setLastModifiedToDate, setDebtRangeSort])

  // Check if any filters are active - memoized
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery ||
      sourceFilter !== "all" ||
      statusFilter !== "all" ||
      salesPersonFilter !== "all" ||
      debtRangeSort !== "none" ||
      convertedFilter !== null ||
      fromDate ||
      toDate ||
      convertedFromDate ||
      convertedToDate ||
      lastModifiedFromDate ||
      lastModifiedToDate
    )
  }, [searchQuery, sourceFilter, statusFilter, salesPersonFilter, debtRangeSort, convertedFilter, fromDate, toDate, convertedFromDate, convertedToDate, lastModifiedFromDate, lastModifiedToDate])

  // Fetch sales users
  useEffect(() => {
    const fetchSalesUsers = async () => {
      try {
        setIsLoading(true)
        const salesQuery = query(collection(crmDb, "users"), where("role", "==", "sales"))
        const querySnapshot = await getDocs(salesQuery)

        const users = querySnapshot.docs.map((doc) => {
          const data = doc.data() as any
          return {
            id: doc.id,
            name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.firstName || data.lastName || "Unknown",
            status: data.status
          }
        }).filter(user => user.status?.toLowerCase() === 'active')

        setSalesUsers(users)
      } catch (error) {
        // Error fetching sales users
      } finally {
        setIsLoading(false)
      }
    }

    fetchSalesUsers()
  }, [])

  // Format date for input max attribute
  const today = useMemo(() => {
    const date = new Date()
    return date.toISOString().split("T")[0]
  }, [])

  // Clear date filters
  const clearDateFilters = () => {
    setFromDate("")
    setToDate("")
  }

  // Clear Advanced date filters
  const clearAdvancedDateFilters = () => {
    if (setConvertedFromDate) setConvertedFromDate("")
    if (setConvertedToDate) setConvertedToDate("")
    if (setLastModifiedFromDate) setLastModifiedFromDate("")
    if (setLastModifiedToDate) setLastModifiedToDate("")
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Search bar implementation */}
      <div className="">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#D2A02A]"></div>
            ) : (
              <svg
                className="h-5 w-5 text-[#5A4C33]/50"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-3 border border-[#5A4C33]/20 bg-[#ffffff] text-[#5A4C33] rounded-xl focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] transition-all duration-200 placeholder-[#5A4C33]/50"
            placeholder="Name or Phone Number"
            value={searchInput}
            onChange={handleSearchInputChange}
          />
          {searchInput && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={clearSearch}
                className="text-[#5A4C33]/50 hover:text-[#5A4C33] focus:outline-none"
                aria-label="Clear search"
                type="button"
              >
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Enhanced Search results summary removed */}
      </div>

      {/* Filters section with improved layout */}
      <div className="bg-[#ffffff] border border-[#5A4C33]/10 rounded-lg p-2 shadow-sm">
        <div className="flex items-center mb-0 md:mb-3">
          <FaFilter className="text-[#5A4C33]/70 mr-2" />
          <span className="text-sm font-medium text-[#5A4C33]">Filters</span>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden ml-2 px-2 py-1 text-xs text-[#D2A02A] border border-[#D2A02A]/30 rounded-md hover:bg-[#D2A02A]/5 transition-colors"
          >
            {showMobileFilters ? '▲ Hide' : '▼ Show'}
          </button>

          {/* Results counter moved to the right */}
          <div className="ml-auto flex items-center gap-4">
            <p className="text-sm text-[#5A4C33]/70">
              {(() => {
                // Determine which count to display
                let displayCount: number
                let showLoadedInfo = false
                
                if (searchQuery) {
                  // When searching, show search results count
                  displayCount = searchResultsCount
                } else if (hasActiveFilters) {
                  // When filters are active, show database filtered count
                  displayCount = databaseFilteredCount
                  // Show "loaded X of Y" if we haven't loaded all yet
                  showLoadedInfo = filteredLeads.length < databaseFilteredCount
                } else {
                  // No filters, show total or all leads count
                  displayCount = allLeadsCount || totalLeadsCount
                  // Show loaded info if total is more than currently loaded
                  showLoadedInfo = leads.length > 0 && leads.length < displayCount
                }

                return (
                  <>
                    {showLoadedInfo && (
                      <>
                        <span className="text-[#5A4C33]/50">Showing </span>
                        <span className="text-[#D2A02A] font-medium">{filteredLeads.length}</span>
                        <span className="text-[#5A4C33]/50"> of </span>
                      </>
                    )}
                    <span className="text-[#D2A02A] font-medium">{displayCount}</span>
                    <span> leads</span>
                  </>
                )
              })()}
              {searchQuery && <span className="text-[#D2A02A] ml-1">(from database search)</span>}
              {salesPersonFilter &&
                salesPersonFilter !== "all" &&
                salesPersonFilter === (typeof window !== "undefined" ? localStorage.getItem("userName") : "") && (
                  <span className="ml-2 text-[#D2A02A] text-xs">(My Leads)</span>
                )}
            </p>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#D2A02A] hover:text-[#B8911E] focus:outline-none border border-[#D2A02A]/30 px-2 py-1 rounded-md hover:border-[#D2A02A]/50 transition-colors"
                type="button"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        <div className={`${showMobileFilters ? 'block' : 'hidden'} md:block mt-3 md:mt-0`}>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-2 md:gap-4">
          {/* Source Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-[#5A4C33]/70">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-[#5A4C33]/20 bg-[#ffffff] text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md"
            >
              <option value="all">All Sources</option>
              <option value="AMA">AMA</option>
              <option value="CREDSETTLE">CREDSETTLE</option>
              <option value="Settleloans Contact">Settleloans Contact</option>
              <option value="Settleloans Home">Settleloans Home</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-[#5A4C33]/70">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-[#5A4C33]/20 bg-[#ffffff] text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md"
            >
              <option value="all">All Status</option>
              <option value="No Status">No Status</option>
              {statusOptions
                .filter((status) => status !== "No Status")
                .map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
            </select>
          </div>

          {/* Debt Range Sort */}
          <div className="space-y-1">
            <label className="block text-xs text-[#5A4C33]/70">Debt Range</label>
            <select
              value={debtRangeSort}
              onChange={(e) => setDebtRangeSort(e.target.value as "none" | "low-to-high" | "high-to-low")}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-[#5A4C33]/20 bg-[#ffffff] text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md"
            >
              <option value="none">No Sort</option>
              <option value="low-to-high">Low to High</option>
              <option value="high-to-low">High to Low</option>
            </select>
          </div>

          {/* Salesperson Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-[#5A4C33]/70">Salesperson</label>
            <div className="relative">
              <select
                value={salesPersonFilter}
                onChange={(e) => setSalesPersonFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-sm border border-[#5A4C33]/20 bg-[#ffffff] text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md"
              >
                <option value="all">All Salespersons</option>
                <option value="unassigned">Unassigned</option>
                {isLoading ? (
                  <option value="loading" disabled>
                    Loading...
                  </option>
                ) : (
                  salesUsers.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FaUserTie className="h-4 w-4 text-[#5A4C33]/70" />
              </div>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="col-span-2 md:col-span-1 grid grid-cols-1 md:grid-cols-1 gap-2 md:gap-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 md:space-x-6">
              <div className="flex-1 min-w-[180px] space-y-1">
                <CustomDateInput
                  value={fromDate}
                  onChange={(date) => setFromDate(date)}
                  max={toDate || today}
                  placeholder="From Date"
                  label="From Date"
                  className="w-full"
                />
              </div>

              <div className="flex-1 min-w-[180px] space-y-1">
                <CustomDateInput
                  value={toDate}
                  onChange={(date) => setToDate(date)}
                  min={fromDate}
                  max={today}
                  placeholder="To Date"
                  label="To Date"
                  className="w-full"
                />
              </div>

              {/* My Leads Toggle Switch */}
              <div className="space-y-1 flex-shrink-0">
                <label className="block text-xs text-[#5A4C33]/70">My Leads</label>
                <div className="flex items-center h-[38px]">
                  <button
                      onClick={() => {
                        const currentUserName = typeof window !== "undefined" ? localStorage.getItem("userName") : ""
                        if (currentUserName) {
                          if (salesPersonFilter === currentUserName) {
                            setSalesPersonFilter("all")
                            toast.info("Showing all leads")
                          } else {
                            setSalesPersonFilter(currentUserName)
                            toast.success(`Showing leads for ${currentUserName}`)
                          }
                        } else {
                          toast.error("User name not found. Please log in again.")
                        }
                      }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#D2A02A] focus:ring-offset-2 ${
                      salesPersonFilter === (typeof window !== "undefined" ? localStorage.getItem("userName") : "")
                        ? "bg-[#D2A02A]"
                        : "bg-[#5A4C33]"
                    }`}
                    type="button"
                    role="switch"
                    aria-checked={
                      salesPersonFilter === (typeof window !== "undefined" ? localStorage.getItem("userName") : "")
                    }
                    title={
                      salesPersonFilter === (typeof window !== "undefined" ? localStorage.getItem("userName") : "")
                        ? "Turn off My Leads filter"
                        : "Turn on My Leads filter"
                    }
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        salesPersonFilter === (typeof window !== "undefined" ? localStorage.getItem("userName") : "")
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span
                    className={`ml-2 text-xs ${
                      salesPersonFilter === (typeof window !== "undefined" ? localStorage.getItem("userName") : "")
                        ? "text-[#D2A02A] font-medium"
                        : "text-[#5A4C33]"
                    }`}
                  >
                    {salesPersonFilter === (typeof window !== "undefined" ? localStorage.getItem("userName") : "")
                      ? "ON"
                      : "OFF"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-end">
              {(fromDate || toDate) && (
                <button
                  onClick={clearDateFilters}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-[#ffffff] bg-[#D2A02A] hover:bg-[#B8911E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D2A02A]"
                  type="button"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear date filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Filters section for Admin/Overlord */}
        {(userRole === "admin" || userRole === "overlord") && 
          setConvertedFromDate && setConvertedToDate && 
          setLastModifiedFromDate && setLastModifiedToDate && (
          <div className="mt-4 pt-4 border-t border-[#5A4C33]/10">
            <h3 className="text-sm font-medium text-[#5A4C33] mb-3">Advanced Date Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Converted Date Range */}
              <div className="space-y-1">
                <CustomDateInput
                  value={convertedFromDate || ''}
                  onChange={(date) => setConvertedFromDate(date)}
                  max={convertedToDate || today}
                  placeholder="Converted From"
                  label="Converted From"
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <CustomDateInput
                  value={convertedToDate || ''}
                  onChange={(date) => setConvertedToDate(date)}
                  min={convertedFromDate}
                  max={today}
                  placeholder="Converted To"
                  label="Converted To"
                  className="w-full"
                />
              </div>

              {/* Last Modified Date Range */}
              <div className="space-y-1">
                <CustomDateInput
                  value={lastModifiedFromDate || ''}
                  onChange={(date) => setLastModifiedFromDate(date)}
                  max={lastModifiedToDate || today}
                  placeholder="Modified From"
                  label="Modified From"
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <CustomDateInput
                  value={lastModifiedToDate || ''}
                  onChange={(date) => setLastModifiedToDate(date)}
                  min={lastModifiedFromDate}
                  max={today}
                  placeholder="Modified To"
                  label="Modified To"
                  className="w-full"
                />
              </div>

              {/* Clear Advanced Filters Button */}
              {(convertedFromDate || convertedToDate || lastModifiedFromDate || lastModifiedToDate) && (
                <div className="flex items-end">
                  <button
                    onClick={clearAdvancedDateFilters}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-[#ffffff] bg-[#D2A02A] hover:bg-[#B8911E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D2A02A]"
                    type="button"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear advanced filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default AmaLeadsFilters
