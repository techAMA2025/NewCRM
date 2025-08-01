"use client"

import type { FilterState } from "../types/client"

interface FiltersSectionProps {
  filters: FilterState
  onFiltersChange: (filters: Partial<FilterState>) => void
  uniqueCities: string[]
  uniqueSources: string[]
  weekStats: {
    week1: number
    week2: number
    week3: number
    week4: number
    unknown: number
  }
  totalClients: number
  filteredCount: number
}

export default function FiltersSection({
  filters,
  onFiltersChange,
  uniqueCities,
  uniqueSources,
  weekStats,
  totalClients,
  filteredCount,
}: FiltersSectionProps) {
  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: "",
      statusFilter: "all",
      sourceFilter: "all",
      assignmentFilter: "all",
      cityFilter: "all",
      weekFilter: "all",
    })
  }

  const hasActiveFilters =
    filters.searchQuery !== "" ||
    filters.statusFilter !== "all" ||
    filters.sourceFilter !== "all" ||
    filters.assignmentFilter !== "all" ||
    filters.cityFilter !== "all" ||
    filters.weekFilter !== "all"

  return (
    <div className="mb-4 bg-gray-800 p-3 rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search Bar */}
        <div className="col-span-1 md:col-span-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-8 pr-2 py-1.5 border-0 rounded-md bg-gray-700 text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Search by name, phone, or email..."
              value={filters.searchQuery}
              onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filters.statusFilter}
            onChange={(e) => onFiltersChange({ statusFilter: e.target.value })}
            className="block w-full py-1.5 px-2 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Dropped">Dropped</option>
            <option value="Not Responding">Not Responding</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>

        {/* Source Filter */}
        <div>
          <select
            value={filters.sourceFilter}
            onChange={(e) => onFiltersChange({ sourceFilter: e.target.value })}
            className="block w-full py-1.5 px-2 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="all">All Sources</option>
            {uniqueSources.map((source) => (
              <option key={source} value={source}>
                {source === "credsettlee"
                  ? "Cred Settle"
                  : source === "ama"
                    ? "AMA"
                    : source === "settleloans"
                      ? "Settle Loans"
                      : source === "billcut"
                        ? "Bill Cut"
                        : source}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Second Row */}
      <div className="mt-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Assignment Filter */}
          <div>
            <select
              value={filters.assignmentFilter}
              onChange={(e) => onFiltersChange({ assignmentFilter: e.target.value })}
              className="block w-full py-1.5 px-2 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="all">All Assignments</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="both">Primary & Secondary</option>
            </select>
          </div>

          {/* Week Filter */}
          <div>
            <select
              value={filters.weekFilter}
              onChange={(e) => onFiltersChange({ weekFilter: e.target.value })}
              className="block w-full py-1.5 px-2 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="all">All Weeks</option>
              <option value="1">Week 1 (1-7) - {weekStats.week1} clients</option>
              <option value="2">Week 2 (8-14) - {weekStats.week2} clients</option>
              <option value="3">Week 3 (15-21) - {weekStats.week3} clients</option>
              <option value="4">Week 4 (22-31) - {weekStats.week4} clients</option>
            </select>
          </div>

          {/* City Filter */}
          <div>
            <select
              value={filters.cityFilter}
              onChange={(e) => onFiltersChange({ cityFilter: e.target.value })}
              className="block w-full py-1.5 px-2 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="all">All Cities</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Stats */}
          <div className="flex items-end">
            <div className="text-gray-400 text-xs">
              Showing <span className="text-white font-medium">{filteredCount}</span> of{" "}
              <span className="text-white font-medium">{totalClients}</span> clients
              {filters.searchQuery && <span> • Search: "{filters.searchQuery}"</span>}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="ml-2 text-purple-400 hover:text-purple-300 focus:outline-none"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
