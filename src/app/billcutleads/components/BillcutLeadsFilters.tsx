"use client"

import type React from "react"
import { FaFilter, FaUserTie } from "react-icons/fa"
import { useEffect, useState, useCallback, useMemo } from "react"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { db as crmDb } from "@/firebase/firebase"
import { debounce } from "lodash"

type BillcutLeadsFiltersProps = {
  searchQuery: string
  setSearchQuery: (query: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  statusOptions: string[]
  showMyLeads: boolean
  setShowMyLeads: (show: boolean) => void
  fromDate: string
  setFromDate: (date: string) => void
  toDate: string
  setToDate: (date: string) => void
  filteredLeads: any[]
  leads: any[]
  userRole: string
  salesPersonFilter?: string
  setSalesPersonFilter?: (salesperson: string) => void
  salesTeamMembers: any[]
  selectedLeads: string[]
  onBulkAssign: () => void
  onClearSelection: () => void
  debtRangeSort: "none" | "low-to-high" | "high-to-low"
  setDebtRangeSort: (sort: "none" | "low-to-high" | "high-to-low") => void
  allLeadsCount: number
  // New props for search functionality
  onSearchResults?: (results: any[]) => void
  isSearching?: boolean
  setIsSearching?: (searching: boolean) => void
}

const BillcutLeadsFiltersOptimized = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  statusOptions,
  showMyLeads,
  setShowMyLeads,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  filteredLeads,
  leads,
  userRole,
  salesPersonFilter = "",
  setSalesPersonFilter = () => {},
  salesTeamMembers,
  selectedLeads,
  onBulkAssign,
  onClearSelection,
  debtRangeSort,
  setDebtRangeSort,
  allLeadsCount,
  onSearchResults,
  isSearching = false,
  setIsSearching = () => {},
}: BillcutLeadsFiltersProps) => {
  const [salesUsers, setSalesUsers] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [searchResultsCount, setSearchResultsCount] = useState(0)

  // Normalize phone number for search
  const normalizePhoneNumber = (phone: string): string => {
    return phone.replace(/[\s\-$$$$+]/g, "")
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

        // Search by phone number (exact match)
        if (normalizedPhone.length >= 10) {
          try {
            const phoneQuery = query(
              collection(crmDb, "billcutLeads"),
              where("mobile", ">=", normalizedPhone),
              where("mobile", "<=", normalizedPhone + "\uf8ff"),
              orderBy("mobile"),
              limit(50),
            )
            const phoneSnapshot = await getDocs(phoneQuery)
            phoneSnapshot.docs.forEach((doc) => {
              const data = doc.data()
              if (normalizePhoneNumber(data.mobile || "").includes(normalizedPhone)) {
                allResults.set(doc.id, { id: doc.id, ...data, searchRelevance: 1 })
              }
            })
          } catch (error) {
            console.log("Phone search error:", error)
          }
        }

        // Search by name (case-insensitive prefix match)
        try {
          const nameQuery = query(
            collection(crmDb, "billcutLeads"),
            where("name", ">=", searchTermLower),
            where("name", "<=", searchTermLower + "\uf8ff"),
            orderBy("name"),
            limit(50),
          )
          const nameSnapshot = await getDocs(nameQuery)
          nameSnapshot.docs.forEach((doc) => {
            const data = doc.data()
            if (data.name?.toLowerCase().includes(searchTermLower)) {
              const relevance = data.name?.toLowerCase().startsWith(searchTermLower) ? 2 : 1
              allResults.set(doc.id, { id: doc.id, ...data, searchRelevance: relevance })
            }
          })
        } catch (error) {
          console.log("Name search error:", error)
        }

        // Search by email (case-insensitive)
        if (searchTermLower.includes("@") || searchTermLower.length > 3) {
          try {
            const emailQuery = query(
              collection(crmDb, "billcutLeads"),
              where("email", ">=", searchTermLower),
              where("email", "<=", searchTermLower + "\uf8ff"),
              orderBy("email"),
              limit(50),
            )
            const emailSnapshot = await getDocs(emailQuery)
            emailSnapshot.docs.forEach((doc) => {
              const data = doc.data()
              if (data.email?.toLowerCase().includes(searchTermLower)) {
                const relevance = data.email?.toLowerCase().startsWith(searchTermLower) ? 2 : 1
                allResults.set(doc.id, { id: doc.id, ...data, searchRelevance: relevance })
              }
            })
          } catch (error) {
            console.log("Email search error:", error)
          }
        }

        // Alternative search: Get recent leads and filter (fallback)
        if (allResults.size === 0) {
          try {
            const fallbackQuery = query(
              collection(crmDb, "billcutLeads"),
              orderBy("date", "desc"),
              limit(1000), // Search through recent 1000 leads
            )
            const fallbackSnapshot = await getDocs(fallbackQuery)
            fallbackSnapshot.docs.forEach((doc) => {
              const data = doc.data()
              const name = (data.name || "").toLowerCase()
              const email = (data.email || "").toLowerCase()
              const phone = normalizePhoneNumber(data.mobile || "")

              if (
                name.includes(searchTermLower) ||
                email.includes(searchTermLower) ||
                phone.includes(normalizedPhone)
              ) {
                allResults.set(doc.id, { id: doc.id, ...data, searchRelevance: 1 })
              }
            })
          } catch (error) {
            console.log("Fallback search error:", error)
          }
        }

        // Convert Map to Array and sort by relevance
        const searchResults = Array.from(allResults.values())
          .sort((a, b) => (b.searchRelevance || 0) - (a.searchRelevance || 0))
          .slice(0, 100) // Limit final results

        // Transform results to match your Lead type
        const transformedResults = searchResults.map((data) => {
          const address = data.address || ""
          const pincode = extractPincodeFromAddress(address)
          const state = pincode ? getStateFromPincode(pincode) : "Unknown State"

          return {
            id: data.id,
            name: data.name || "",
            email: data.email || "",
            phone: data.mobile || "",
            city: state,
            status: data.category || "No Status",
            source_database: "Bill Cut",
            assignedTo: data.assigned_to || "",
            monthlyIncome: data.income || "",
            salesNotes: data.sales_notes || "",
            lastModified: data.synced_date ? new Date(data.synced_date.seconds * 1000) : new Date(),
            date: data.date || data.synced_date?.seconds * 1000 || Date.now(),
            callbackInfo: null,
            debtRange: data.debt_range || 0,
          }
        })

        setSearchResultsCount(transformedResults.length)
        onSearchResults?.(transformedResults)
      } catch (error) {
        console.error("Search error:", error)
        onSearchResults?.([])
        setSearchResultsCount(0)
      } finally {
        setIsSearching(false)
      }
    },
    [onSearchResults, setIsSearching],
  )

  // Helper functions (you'll need to import these from your existing code)
  const extractPincodeFromAddress = (address: string): string => {
    const pincodeMatch = address.match(/\b\d{6}\b/)
    return pincodeMatch ? pincodeMatch[0] : ""
  }

  const getStateFromPincode = (pincode: string): string => {
    const firstTwoDigits = pincode.substring(0, 2)
    const digits = Number.parseInt(firstTwoDigits)

    if (digits === 11) return "Delhi"
    if (digits >= 12 && digits <= 13) return "Haryana"
    if (digits >= 14 && digits <= 16) return "Punjab"
    // Add other state mappings as needed
    return "Unknown State"
  }

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        if (value.trim()) {
          performDatabaseSearch(value)
        } else {
          setSearchQuery(value)
          onSearchResults?.([])
          setSearchResultsCount(0)
        }
      }, 500),
    [performDatabaseSearch, setSearchQuery, onSearchResults],
  )

  // Update local search state when parent state changes
  useEffect(() => {
    setSearchInput(searchQuery)
  }, [searchQuery])

  // Handle search input changes
  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchInput(value)
      setSearchQuery(value) // Update parent state immediately for UI
      debouncedSearch(value)
    },
    [debouncedSearch, setSearchQuery],
  )

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchInput("")
    setSearchQuery("")
    onSearchResults?.([])
    setSearchResultsCount(0)
    debouncedSearch.cancel()
  }, [setSearchQuery, onSearchResults, debouncedSearch])

  // Fetch sales users - memoized
  const fetchSalesUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const salesQuery = query(collection(crmDb, "users"), where("role", "==", "sales"))
      const querySnapshot = await getDocs(salesQuery)
      const users = querySnapshot.docs.map((doc) => {
        const data = doc.data()
        const fullName =
          data.firstName && data.lastName
            ? `${data.firstName} ${data.lastName}`
            : data.firstName || data.lastName || "Unknown"
        return {
          id: doc.id,
          name: fullName,
        }
      })
      setSalesUsers(users)
    } catch (error) {
      console.error("Error fetching sales users:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSalesUsers()
  }, [fetchSalesUsers])

  // Get current date for max attribute - memoized
  const getCurrentDate = useMemo(() => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }, [])

  // Clear date filters
  const clearDateFilters = useCallback(() => {
    setFromDate("")
    setToDate("")
  }, [setFromDate, setToDate])

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    clearSearch()
    setStatusFilter("all")
    setFromDate("")
    setToDate("")
    setShowMyLeads(false)
    setDebtRangeSort("none")
    if (setSalesPersonFilter) {
      setSalesPersonFilter("all")
    }
  }, [clearSearch, setStatusFilter, setFromDate, setToDate, setShowMyLeads, setDebtRangeSort, setSalesPersonFilter])

  // Check if any filters are active - memoized
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery ||
      statusFilter !== "all" ||
      fromDate ||
      toDate ||
      showMyLeads ||
      debtRangeSort !== "none" ||
      (salesPersonFilter && salesPersonFilter !== "all")
    )
  }, [searchQuery, statusFilter, fromDate, toDate, showMyLeads, debtRangeSort, salesPersonFilter])

  return (
    <div className="space-y-4 mb-8">
      {/* Enhanced Search bar */}
      <div className="">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            ) : (
              <svg
                className="h-5 w-5 text-gray-400"
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
            className="block w-full pl-10 pr-10 py-3 border border-gray-600/50 bg-gray-800/50 text-gray-100 rounded-xl focus:outline-none focus:ring-blue-500 focus:border-blue-400 transition-all duration-200 placeholder-gray-500"
            placeholder="Search by name, email, or phone number... (searches entire database)"
            value={searchInput}
            onChange={handleSearchInputChange}
          />
          {searchInput && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-300 focus:outline-none"
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

        {/* Enhanced Search results summary */}
        {searchQuery && (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">
                {isSearching ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                    Searching database...
                  </span>
                ) : (
                  <>
                    Found <span className="text-blue-400 font-medium">{searchResultsCount}</span> results for "
                    {searchQuery}"
                    {searchResultsCount > 0 && <span className="text-green-400 ml-2">✓ Database search complete</span>}
                  </>
                )}
              </span>
            </div>
            <button
              onClick={clearSearch}
              className="text-xs text-blue-400 hover:text-blue-300 focus:outline-none border border-blue-400/30 px-2 py-1 rounded-md hover:border-blue-300/50 transition-colors"
              type="button"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Rest of your existing filters code remains the same */}
      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FaFilter className="text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-300">Filters</span>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-400">
              Showing{" "}
              <span className="text-blue-400 font-medium">{searchQuery ? searchResultsCount : allLeadsCount}</span>{" "}
              Leads
              {searchQuery && <span className="text-green-400 ml-1">(from database search)</span>}
            </p>

            {selectedLeads.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-300 font-medium">{selectedLeads.length} selected</span>
                <button
                  onClick={onBulkAssign}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium transition-colors duration-200"
                >
                  Bulk Assign
                </button>
                <button
                  onClick={onClearSelection}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg font-medium transition-colors duration-200"
                >
                  Clear
                </button>
              </div>
            )}

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-blue-400 hover:text-blue-300 focus:outline-none border border-blue-400/30 px-2 py-1 rounded-md hover:border-blue-300/50 transition-colors"
                type="button"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Your existing filter grid remains exactly the same */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Status Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
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

          {/* Salesperson Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Salesperson</label>
            <div className="relative">
              <select
                value={salesPersonFilter}
                onChange={(e) => setSalesPersonFilter && setSalesPersonFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
              >
                <option value="all">All Salesperson</option>
                <option value="-">Unassigned</option>
                {isLoading ? (
                  <option value="" disabled>
                    Loading...
                  </option>
                ) : (
                  salesTeamMembers.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <FaUserTie className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* From Date */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate || getCurrentDate}
              className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
              max={getCurrentDate}
              className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
            />
          </div>

          {/* Debt Range Filter */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Debt Range</label>
            <select
              value={debtRangeSort}
              onChange={(e) => setDebtRangeSort(e.target.value as "none" | "low-to-high" | "high-to-low")}
              className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-600/50 bg-gray-700/50 text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-400 rounded-lg transition-all duration-200"
            >
              <option value="none">No Sort</option>
              <option value="low-to-high">Low to High</option>
              <option value="high-to-low">High to Low</option>
            </select>
          </div>

          {/* My Leads Toggle */}
          <div className="space-y-1 flex flex-col justify-end">
            <button
              onClick={() => setShowMyLeads(!showMyLeads)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                showMyLeads
                  ? "bg-blue-500 text-white hover:bg-blue-600 border border-blue-400"
                  : "bg-green-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50"
              }`}
            >
              <svg
                className="w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {showMyLeads ? "All Leads" : "My Leads"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BillcutLeadsFiltersOptimized
