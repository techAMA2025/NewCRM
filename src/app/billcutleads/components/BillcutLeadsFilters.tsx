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
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#D2A02A]"></div>
            ) : (
              <svg
                className="h-5 w-5 text-[#5A4C33]/40"
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
            className="block w-full pl-10 pr-10 py-3 border border-[#5A4C33]/20 bg-white text-[#5A4C33] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D2A02A]/30 focus:border-[#D2A02A] transition-all duration-200 placeholder-[#5A4C33]/40 shadow-sm"
            placeholder="Search by name, email, or phone number... (searches entire database)"
            value={searchInput}
            onChange={handleSearchInputChange}
          />
          {searchInput && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={clearSearch}
                className="text-[#5A4C33]/40 hover:text-[#5A4C33] focus:outline-none"
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

        {/* Search results summary */}
        {searchQuery && (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-[#5A4C33]/60">
                {isSearching ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#D2A02A] mr-2"></div>
                    Searching database...
                  </span>
                ) : (
                  <>
                    Found <span className="text-[#D2A02A] font-bold">{actualSearchResultsCount}</span> results for &quot;
                    <span className="text-[#5A4C33] font-medium">{searchQuery}</span>&quot;
                    {actualSearchResultsCount > 0 && <span className="text-green-600 ml-2 font-medium">✓ Database search complete</span>}
                  </>
                )}
              </span>
            </div>
            <button
              onClick={clearSearch}
              className="text-xs text-[#D2A02A] hover:text-[#B8911E] focus:outline-none border border-[#D2A02A]/30 px-2 py-1 rounded-md hover:border-[#D2A02A]/50 transition-colors font-medium bg-[#D2A02A]/5"
              type="button"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Filters section */}
      <div className="p-0">
        <div className="flex items-center mb-0 md:mb-3">
          <FaFilter className="text-[#5A4C33]/70 mr-2" />
          <span className="text-sm font-medium text-[#5A4C33]">Filters</span>

          {/* Mobile toggle */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden ml-2 px-2 py-1 text-xs text-[#D2A02A] border border-[#D2A02A]/30 rounded-md hover:bg-[#D2A02A]/5 transition-colors"
          >
            {showMobileFilters ? '▲ Hide' : '▼ Show'}
          </button>

          {/* Right side: count + bulk controls + clear all */}
          <div className="ml-auto flex items-center gap-4">
            <p className="text-sm text-[#5A4C33]/70">
              <span className="text-[#D2A02A] font-medium">{searchQuery ? actualSearchResultsCount : allLeadsCount}</span>
              <span> leads</span>
              {searchQuery && <span className="text-[#D2A02A] ml-1">(from database search)</span>}
            </p>

            {selectedLeads.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#D2A02A] font-bold">{selectedLeads.length} selected</span>
                <button
                  onClick={onBulkAssign}
                  className="px-3 py-1 bg-[#D2A02A] hover:bg-[#B8911E] text-white text-xs rounded-lg font-bold transition-all duration-200 shadow-sm"
                >
                  Bulk Assign
                </button>
                {(userRole === 'admin' || userRole === 'overlord') && (
                  <button
                    onClick={onBulkWhatsApp}
                    className="px-3 py-1 bg-[#5A4C33] hover:bg-[#4A3F2A] text-white text-xs rounded-lg font-bold transition-all duration-200 shadow-sm"
                  >
                    Bulk WhatsApp
                  </button>
                )}
                <button
                  onClick={onClearSelection}
                  className="px-3 py-1 bg-white border border-[#5A4C33]/20 text-[#5A4C33] text-xs rounded-lg font-bold hover:bg-gray-50 transition-all duration-200"
                >
                  Clear
                </button>
              </div>
            )}

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

        {/* Prominent Work Mode Toggle for Admins/Overlords */}
        {(userRole === "admin" || userRole === "overlord") &&
         salesPersonFilter !== "all" && salesPersonFilter !== "-" && (
          <div className="mb-4 p-4 bg-[#F8F5EC] border-2 border-[#D2A02A]/30 rounded-2xl flex items-center justify-between shadow-lg ring-1 ring-[#D2A02A]/10 animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#D2A02A] to-[#B8911E] rounded-xl text-white shadow-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <p className="text-base font-bold text-[#5A4C33] leading-tight">Full Edit Access Enabled</p>
                <p className="text-[11px] text-[#5A4C33]/60 mt-1 uppercase font-semibold tracking-wider">
                  Special Work Mode for <span className="text-[#D2A02A]">{salesPersonFilter}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <button
                  onClick={handleWorkModeToggle}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#D2A02A] focus:ring-offset-2 ${
                    salesUsers.find(u => u.name === salesPersonFilter)?.noAnswerWorkModeEnabled
                      ? "bg-[#D2A02A]"
                      : "bg-gray-300"
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
                    salesUsers.find(u => u.name === salesPersonFilter)?.noAnswerWorkModeEnabled ? 'text-[#D2A02A]' : 'text-gray-400'
                  }`}>
                  {salesUsers.find(u => u.name === salesPersonFilter)?.noAnswerWorkModeEnabled ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className={`${showMobileFilters ? 'block' : 'hidden'} md:block mt-3 md:mt-0`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3 md:gap-4">
            {/* Status Filter */}
            <div className="space-y-1">
              <label className="block text-xs text-[#5A4C33]/70">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-sm border border-[#5A4C33]/20 bg-white text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md"
              >
                <option value="all">All Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Salesperson Filter */}
            <div className="space-y-1">
              <label className="block text-xs text-[#5A4C33]/70">Salesperson</label>
              <div className="relative">
                <select
                  value={salesPersonFilter}
                  onChange={(e) => setSalesPersonFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-sm border border-[#5A4C33]/20 bg-white text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md appearance-none"
                >
                  <option value="all">All Salespersons</option>
                  <option value="-">Unassigned</option>
                  {isLoading ? (
                    <option value="" disabled>Loading...</option>
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

            {/* Debt Range Filter */}
            <div className="space-y-1">
              <label className="block text-xs text-[#5A4C33]/70">Debt Range</label>
              <select
                value={debtRangeSort}
                onChange={(e) => setDebtRangeSort(e.target.value as "none" | "low-to-high" | "high-to-low")}
                className="block w-full pl-3 pr-10 py-2 text-sm border border-[#5A4C33]/20 bg-white text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md"
              >
                <option value="none">No Sort</option>
                <option value="low-to-high">Low to High</option>
                <option value="high-to-low">High to Low</option>
              </select>
            </div>

            {/* Date Range + My Leads toggle — grouped like AMA */}
            <div className="sm:col-span-2 md:col-span-3 lg:col-span-2 2xl:col-span-4">
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
                <div className="w-auto min-w-[130px] space-y-1">
                  <BillcutDateInput
                    label="From Date"
                    value={fromDate}
                    onChange={setFromDate}
                    max={toDate || getCurrentDate}
                    placeholder="From Date"
                  />
                </div>

                <div className="w-auto min-w-[130px] space-y-1">
                  <BillcutDateInput
                    label="To Date"
                    value={toDate}
                    onChange={setToDate}
                    min={fromDate}
                    max={getCurrentDate}
                    placeholder="To Date"
                  />
                </div>

                {/* My Leads Toggle — inline switch like AMA */}
                <div className="space-y-1 flex-shrink-0 bg-[#5A4C33]/5 p-2 rounded-lg border border-[#5A4C33]/10">
                  <label className="block text-[10px] uppercase font-bold text-[#5A4C33]/70 mb-1">My Leads</label>
                  <div className="flex items-center h-[26px]">
                    <button
                      onClick={() => setShowMyLeads(!showMyLeads)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#D2A02A] focus:ring-offset-1 ${
                        showMyLeads
                          ? "bg-[#D2A02A] shadow-inner"
                          : "bg-[#5A4C33]/20"
                      }`}
                      type="button"
                      role="switch"
                      aria-checked={showMyLeads}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                          showMyLeads ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span
                      className={`ml-2 text-[10px] font-bold ${
                        showMyLeads ? "text-[#D2A02A]" : "text-[#5A4C33]/40"
                      }`}
                    >
                      {showMyLeads ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>

                {(fromDate || toDate) && (
                  <div className="flex items-end">
                    <button
                      onClick={clearDateFilters}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[#D2A02A] hover:bg-[#B8911E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D2A02A]"
                      type="button"
                    >
                      <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear dates
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Admin/Overlord Advanced Date Filters */}
          {(userRole === "admin" || userRole === "overlord") && (
            <div className="mt-4 pt-4 border-t border-[#5A4C33]/10">
              <h3 className="text-sm font-medium text-[#5A4C33] mb-3">Advanced Date Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Converted Date Range */}
                <div className="space-y-1">
                  <label className="block text-xs text-green-600/80">Converted From</label>
                  <input
                    type="date"
                    value={convertedFromDate}
                    onChange={(e) => setConvertedFromDate(e.target.value)}
                    max={convertedToDate || getCurrentDate}
                    className="block w-full pl-3 pr-3 py-2 text-sm border border-green-600/20 bg-white text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-green-600/80">Converted To</label>
                  <input
                    type="date"
                    value={convertedToDate}
                    onChange={(e) => setConvertedToDate(e.target.value)}
                    min={convertedFromDate}
                    max={getCurrentDate}
                    className="block w-full pl-3 pr-3 py-2 text-sm border border-green-600/20 bg-white text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md"
                  />
                </div>

                {/* Last Modified Date Range */}
                <div className="space-y-1">
                  <label className="block text-xs text-[#D2A02A]">Last Modified From</label>
                  <input
                    type="date"
                    value={lastModifiedFromDate}
                    onChange={(e) => setLastModifiedFromDate(e.target.value)}
                    max={lastModifiedToDate || getCurrentDate}
                    className="block w-full pl-3 pr-3 py-2 text-sm border border-[#D2A02A]/20 bg-white text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-[#D2A02A]">Last Modified To</label>
                  <input
                    type="date"
                    value={lastModifiedToDate}
                    onChange={(e) => setLastModifiedToDate(e.target.value)}
                    min={lastModifiedFromDate}
                    max={getCurrentDate}
                    className="block w-full pl-3 pr-3 py-2 text-sm border border-[#D2A02A]/20 bg-white text-[#5A4C33] focus:outline-none focus:ring-[#D2A02A] focus:border-[#D2A02A] rounded-md"
                  />
                </div>

                {(convertedFromDate || convertedToDate || lastModifiedFromDate || lastModifiedToDate) && (
                  <div className="flex items-end">
                    <button
                      onClick={() => { setConvertedFromDate(""); setConvertedToDate(""); setLastModifiedFromDate(""); setLastModifiedToDate(""); }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[#D2A02A] hover:bg-[#B8911E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D2A02A]"
                      type="button"
                    >
                      <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

export default BillcutLeadsFiltersOptimized
