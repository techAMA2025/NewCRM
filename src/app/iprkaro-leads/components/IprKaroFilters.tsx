"use client"

import React, { useState, useMemo } from "react"
import { FaFilter } from "react-icons/fa"
import { debounce } from "lodash"

interface SalesUser {
  id: string
  name: string
}

interface IprKaroFiltersProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  salespersonFilter: string
  setSalespersonFilter: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  fromDate: string
  setFromDate: (val: string) => void
  toDate: string
  setToDate: (val: string) => void
  salesTeamMembers: SalesUser[]
  statusOptions: string[]
  currentUserName: string
  isSearching?: boolean
}

const IprKaroFilters: React.FC<IprKaroFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  salespersonFilter,
  setSalespersonFilter,
  statusFilter,
  setStatusFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  salesTeamMembers,
  statusOptions,
  currentUserName,
  isSearching = false,
}) => {
  const [searchInput, setSearchInput] = useState(searchQuery)

  const debouncedSetSearchQuery = useMemo(
    () =>
      debounce((value: string) => {
        setSearchQuery(value)
      }, 500),
    [setSearchQuery]
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchInput(value)
    debouncedSetSearchQuery(value)
  }

  const clearFilters = () => {
    setSearchInput("")
    setSearchQuery("")
    setSalespersonFilter("all")
    setStatusFilter("all")
    setFromDate("")
    setToDate("")
  }

  const hasActiveFilters = 
    searchQuery || 
    salespersonFilter !== "all" || 
    statusFilter !== "all" || 
    fromDate || 
    toDate

  return (
    <div className="space-y-4 mb-4">
      {/* Search Bar */}
      <div className="relative rounded-md shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#D2A02A]"></div>
          ) : (
            <svg
              className="h-4 w-4 text-[#5A4C33]/40"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
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
          className="block w-full pl-9 pr-10 py-2.5 border border-[#5A4C33]/20 bg-white text-[#5A4C33] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D2A02A]/20 focus:border-[#D2A02A] transition-all placeholder-[#5A4C33]/40 text-sm font-medium"
          placeholder="Search by name, phone, or trademark..."
          value={searchInput}
          onChange={handleSearchChange}
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(""); setSearchQuery(""); }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5A4C33]/40 hover:text-[#5A4C33]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <FaFilter className="text-[#5A4C33]/70 mr-2 text-xs" />
          <span className="text-xs font-semibold text-[#5A4C33]">Filters</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Assignee */}
          <div className="space-y-1 min-w-[140px]">
            <select
              value={salespersonFilter}
              onChange={(e) => setSalespersonFilter(e.target.value)}
              className="block w-full pl-3 pr-8 py-1.5 text-[12px] border border-[#5A4C33]/20 bg-white text-[#5A4C33] rounded-md focus:outline-none focus:ring-2 focus:ring-[#D2A02A]/20 focus:border-[#D2A02A] font-bold"
            >
              <option value="all">Assignee: All</option>
              <option value="unassigned">Unassigned</option>
              {salesTeamMembers.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}{s.name === currentUserName ? " (Me)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1 min-w-[130px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-8 py-1.5 text-[12px] border border-[#5A4C33]/20 bg-white text-[#5A4C33] rounded-md focus:outline-none focus:ring-2 focus:ring-[#D2A02A]/20 focus:border-[#D2A02A] font-bold"
            >
              <option value="all">Status: All</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range - Grouped to fix the gap */}
          <div className="flex items-center gap-1.5 bg-[#F8F5EC]/50 border border-[#5A4C33]/10 rounded-md px-2 py-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-black text-[#5A4C33]/40 tracking-wider">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent border-none p-0 text-[12px] text-[#5A4C33] focus:ring-0 w-[100px] font-bold cursor-pointer"
              />
            </div>
            <div className="w-[1px] h-4 bg-[#5A4C33]/10"></div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-black text-[#5A4C33]/40 tracking-wider">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent border-none p-0 text-[12px] text-[#5A4C33] focus:ring-0 w-[100px] font-bold cursor-pointer"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-[11px] font-bold text-[#D2A02A] border border-[#D2A02A]/30 rounded-md hover:bg-[#D2A02A]/5 transition-all whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default IprKaroFilters
