"use client"

import type React from "react"
import { FaFilter, FaUserTie } from "react-icons/fa"
import { useEffect, useState, useCallback, useMemo } from "react"
import { authFetch } from "@/lib/authFetch"
import { debounce } from "lodash"
import BillcutDateInput from "./BillcutDateInput"

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
  onBulkWhatsApp: () => void  
  onClearSelection: () => void
  debtRangeSort: "none" | "low-to-high" | "high-to-low"
  setDebtRangeSort: (sort: "none" | "low-to-high" | "high-to-low") => void
  allLeadsCount: number
  onSearchResults?: (results: any[]) => void
  isSearching?: boolean
  setIsSearching?: (searching: boolean) => void
  convertedFromDate?: string
  setConvertedFromDate?: (date: string) => void
  convertedToDate?: string
  setConvertedToDate?: (date: string) => void
  lastModifiedFromDate?: string
  setLastModifiedFromDate?: (date: string) => void
  lastModifiedToDate?: string
  setLastModifiedToDate?: (date: string) => void
  actualSearchResultsCount?: number
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
  onBulkWhatsApp,
  onClearSelection,
  debtRangeSort,
  setDebtRangeSort,
  allLeadsCount,
  onSearchResults,
  isSearching = false,
  setIsSearching = () => {},
  convertedFromDate = "",
  setConvertedFromDate = () => {},
  convertedToDate = "",
  setConvertedToDate = () => {},
  lastModifiedFromDate = "",
  setLastModifiedFromDate = () => {},
  lastModifiedToDate = "",
  setLastModifiedToDate = () => {},
  actualSearchResultsCount = 0,
}: BillcutLeadsFiltersProps) => {
  const [salesUsers, setSalesUsers] = useState<{ id: string; name: string; noAnswerWorkModeEnabled: boolean }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Update local search state when parent state changes
  useEffect(() => {
    setSearchInput(searchQuery)
  }, [searchQuery])

  // Handle search input changes
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchInput(value)
    setSearchQuery(value) // Parent useEffect will handle the API call
  }

  // Clear search function
  const clearSearch = () => {
    setSearchInput("")
    setSearchQuery("")
  }

  // Fetch sales users via API
  const fetchSalesUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await authFetch("/api/users/list?roles=sales,salesperson")
      const users = await response.json()
      setSalesUsers(users)
    } catch (error) {
      console.error("Error fetching sales users:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle Work Mode Toggle via API
  const handleWorkModeToggle = async () => {
    if (userRole !== 'admin' && userRole !== 'overlord') return

    const selectedUser = salesUsers.find(u => u.name === salesPersonFilter)
    if (!selectedUser) {
        import("react-toastify").then(({ toast }) => toast.error("Please select a specific salesperson first"))
        return
    }

    const newMode = !selectedUser.noAnswerWorkModeEnabled
    
    try {
        const response = await authFetch("/api/users/work-mode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: selectedUser.id, enabled: newMode })
        })
        
        const result = await response.json()
        if (result.error) throw new Error(result.error)
        
        // Update local state
        setSalesUsers(prev => prev.map(u => 
            u.id === selectedUser.id ? { ...u, noAnswerWorkModeEnabled: newMode } : u
        ))
        
        import("react-toastify").then(({ toast }) => toast.success(`Work Mode ${newMode ? 'ENABLED' : 'DISABLED'} for ${selectedUser.name}`))
    } catch (error) {
        import("react-toastify").then(({ toast }) => toast.error("Failed to update Work Mode"))
    }
  }

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
    // Clear admin/overlord filters
    setConvertedFromDate("")
    setConvertedToDate("")
    setLastModifiedFromDate("")
    setLastModifiedToDate("")
  }, [clearSearch, setStatusFilter, setFromDate, setToDate, setShowMyLeads, setDebtRangeSort, setSalesPersonFilter, setConvertedFromDate, setConvertedToDate, setLastModifiedFromDate, setLastModifiedToDate])

  // Check if any filters are active - memoized
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery ||
      statusFilter !== "all" ||
      fromDate ||
      toDate ||
      showMyLeads ||
      debtRangeSort !== "none" ||
      (salesPersonFilter && salesPersonFilter !== "all") ||
      convertedFromDate ||
      convertedToDate ||
      lastModifiedFromDate ||
      lastModifiedToDate
    )
  }, [searchQuery, statusFilter, fromDate, toDate, showMyLeads, debtRangeSort, salesPersonFilter, convertedFromDate, convertedToDate, lastModifiedFromDate, lastModifiedToDate])

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
                    Found <span className="text-blue-400 font-medium">{actualSearchResultsCount}</span> results for "
                    {searchQuery}"
                    {actualSearchResultsCount > 0 && <span className="text-green-400 ml-2">✓ Database search complete</span>}
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
            {/* Mobile toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden ml-3 px-2 py-1 text-[10px] font-bold text-blue-400 border border-blue-400/30 rounded uppercase tracking-wider bg-blue-400/5"
            >
              {showMobileFilters ? "▲ Hide" : "▼ Show"}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-400">
              Showing{" "}
              <span className="text-blue-400 font-medium">{searchQuery ? actualSearchResultsCount : allLeadsCount}</span>{" "}
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
                {(userRole === 'admin' || userRole === 'overlord') && (
                <button
                  onClick={onBulkWhatsApp}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium transition-colors duration-200"
                >
                  Bulk WhatsApp
                </button>
                )}
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

        {/* Prominent Work Mode Toggle for Admins/Overlords */}
        {(userRole === "admin" || userRole === "overlord") && 
         salesPersonFilter !== "all" && salesPersonFilter !== "-" && (
          <div className="mb-4 p-4 bg-gray-800/50 border-2 border-blue-500/30 rounded-2xl flex items-center justify-between shadow-lg ring-1 ring-blue-500/10 animate-in fade-in zoom-in duration-500 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl text-white shadow-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <p className="text-base font-bold text-gray-100 leading-tight">Full Edit Access Enabled</p>
                <p className="text-[11px] text-gray-400 mt-1 uppercase font-semibold tracking-wider">
                  Special Work Mode for <span className="text-blue-400">{salesPersonFilter}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <button
                  onClick={handleWorkModeToggle}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    salesUsers.find(u => u.name === salesPersonFilter)?.noAnswerWorkModeEnabled
                      ? "bg-blue-600"
                      : "bg-gray-600"
                  }`}
                  type="button"
                  role="switch"
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition-transform duration-300 ${
                      salesUsers.find(u => u.name === salesPersonFilter)?.noAnswerWorkModeEnabled
                        ? "translate-x-7"
                        : "translate-x-1"
                    }`}
                  />
                </button>
                <span className={`text-[10px] font-black mt-1 ${
                    salesUsers.find(u => u.name === salesPersonFilter)?.noAnswerWorkModeEnabled ? 'text-blue-400' : 'text-gray-500'
                  }`}>
                  {salesUsers.find(u => u.name === salesPersonFilter)?.noAnswerWorkModeEnabled ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className={`${showMobileFilters ? 'block' : 'hidden'} md:block transition-all duration-300`}>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
          {/* Status Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2.5 text-sm border border-gray-700 bg-[#0b1437] text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-xl transition-all duration-200 shadow-sm hover:border-gray-600"
            >
              <option value="all" className="bg-[#0b1437]">All Status</option>
              <option value="No Status" className="bg-[#0b1437]">No Status</option>
              {statusOptions
                .filter((status) => status !== "No Status")
                .map((status) => (
                  <option key={status} value={status} className="bg-[#0b1437]">
                    {status}
                  </option>
                ))}
            </select>
          </div>

          {/* Salesperson Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Salesperson</label>
            <div className="relative">
              <select
                value={salesPersonFilter}
                onChange={(e) => setSalesPersonFilter && setSalesPersonFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2.5 text-sm border border-gray-700 bg-[#0b1437] text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-xl transition-all duration-200 shadow-sm hover:border-gray-600 appearance-none"
              >
                <option value="all" className="bg-[#0b1437]">All Salesperson</option>
                <option value="-" className="bg-[#0b1437]">Unassigned</option>
                {isLoading ? (
                  <option value="" disabled className="bg-[#0b1437]">
                    Loading...
                  </option>
                ) : (
                  salesTeamMembers.map((user) => (
                    <option key={user.id} value={user.name} className="bg-[#0b1437]">
                       {user.name}
                    </option>
                  ))
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                <FaUserTie className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* From Date */}
          <div className="space-y-1">
            <BillcutDateInput
              label="From Date"
              value={fromDate}
              onChange={setFromDate}
              max={toDate || getCurrentDate}
              placeholder="Select start date"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <BillcutDateInput
              label="To Date"
              value={toDate}
              onChange={setToDate}
              min={fromDate}
              max={getCurrentDate}
              placeholder="Select end date"
            />
          </div>

          {/* Debt Range Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Debt Range</label>
            <select
              value={debtRangeSort}
              onChange={(e) => setDebtRangeSort(e.target.value as "none" | "low-to-high" | "high-to-low")}
              className="block w-full pl-3 pr-10 py-2.5 text-sm border border-gray-700 bg-[#0b1437] text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-xl transition-all duration-200 shadow-sm hover:border-gray-600"
            >
              <option value="none" className="bg-[#0b1437]">No Sort</option>
              <option value="low-to-high" className="bg-[#0b1437]">Low to High</option>
              <option value="high-to-low" className="bg-[#0b1437]">High to Low</option>
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

        {/* Admin/Overlord Only Filters */}
        {(userRole === "admin" || userRole === "overlord") && (
          <div className="mt-6 pt-4 border-t border-gray-700/50">
            <div className="flex items-center mb-4">
              <svg className="w-4 h-4 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-yellow-400">Advanced Date Filters</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* Converted Date Range */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-emerald-400 mb-1">Converted From</label>
                <input
                  type="date"
                  value={convertedFromDate}
                  onChange={(e) => setConvertedFromDate(e.target.value)}
                  max={convertedToDate || getCurrentDate}
                  className="block w-full pl-3 pr-3 py-2.5 text-sm border border-emerald-600/50 bg-[#0b1437] text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 rounded-xl transition-all duration-200 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-emerald-400 mb-1">Converted To</label>
                <input
                  type="date"
                  value={convertedToDate}
                  onChange={(e) => setConvertedToDate(e.target.value)}
                  min={convertedFromDate}
                  max={getCurrentDate}
                  className="block w-full pl-3 pr-3 py-2.5 text-sm border border-emerald-600/50 bg-[#0b1437] text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 rounded-xl transition-all duration-200 shadow-sm"
                />
              </div>

              {/* Last Modified Date Range */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-blue-400 mb-1">Last Modified From</label>
                <input
                  type="date"
                  value={lastModifiedFromDate}
                  onChange={(e) => setLastModifiedFromDate(e.target.value)}
                  max={lastModifiedToDate || getCurrentDate}
                  className="block w-full pl-3 pr-3 py-2.5 text-sm border border-blue-600/50 bg-[#0b1437] text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-xl transition-all duration-200 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-blue-400 mb-1">Last Modified To</label>
                <input
                  type="date"
                  value={lastModifiedToDate}
                  onChange={(e) => setLastModifiedToDate(e.target.value)}
                  min={lastModifiedFromDate}
                  max={getCurrentDate}
                  className="block w-full pl-3 pr-3 py-2.5 text-sm border border-blue-600/50 bg-[#0b1437] text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-xl transition-all duration-200 shadow-sm"
                />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default BillcutLeadsFiltersOptimized
