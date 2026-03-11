import { useState } from "react"
import type { FilterState } from "../types/client"
import { FaFilter, FaSearch, FaTimes, FaChevronDown, FaChevronUp } from "react-icons/fa"

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
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

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
    <div className="mb-4 space-y-3">
      {/* Search and Mobile Toggle */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <FaSearch className="w-3 h-3 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 bg-gray-800 border-0 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-purple-600 focus:outline-none shadow-lg transition-all"
            placeholder="Search name, phone, email..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
          />
        </div>
        
        <button
          onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          className="md:hidden flex items-center justify-between px-4 py-2.5 bg-gray-800 rounded-xl text-white text-sm font-bold shadow-lg border border-gray-700 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2">
            <FaFilter className={hasActiveFilters ? "text-purple-500" : "text-gray-400"} />
            <span>ADVANCED FILTERS</span>
            {hasActiveFilters && (
              <span className="bg-purple-600 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                ACT
              </span>
            )}
          </div>
          {isMobileFiltersOpen ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {/* Filters Content */}
      <div className={`${isMobileFiltersOpen ? 'block' : 'hidden md:block'} animate-fadeIn`}>
        <div className="bg-gray-800 border border-gray-700/50 p-4 md:p-5 rounded-2xl shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
            {/* Status Filter */}
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 block px-1">Status</label>
              <select
                value={filters.statusFilter}
                onChange={(e) => onFiltersChange({ statusFilter: e.target.value })}
                className="block w-full py-2.5 px-3 text-sm border-0 rounded-xl bg-gray-900 text-white focus:ring-2 focus:ring-purple-600 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">ALL STATUSES</option>
                <option value="Active">ACTIVE</option>
                <option value="Inactive">INACTIVE</option>
                <option value="Dropped">DROPPED</option>
                <option value="Not Responding">NOT RESPONDING</option>
                <option value="On Hold">ON HOLD</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 block px-1">Source</label>
              <select
                value={filters.sourceFilter}
                onChange={(e) => onFiltersChange({ sourceFilter: e.target.value })}
                className="block w-full py-2.5 px-3 text-sm border-0 rounded-xl bg-gray-900 text-white focus:ring-2 focus:ring-purple-600 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">ALL SOURCES</option>
                {uniqueSources.map((source) => (
                  <option key={source} value={source}>
                    {(source === "credsettlee" ? "CRED SETTLE" : 
                      source === "ama" ? "AMA" : 
                      source === "settleloans" ? "SETTLE LOANS" : 
                      source === "billcut" ? "BILL CUT" : source).toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment Filter */}
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 block px-1">Assignment</label>
              <select
                value={filters.assignmentFilter}
                onChange={(e) => onFiltersChange({ assignmentFilter: e.target.value })}
                className="block w-full py-2.5 px-3 text-sm border-0 rounded-xl bg-gray-900 text-white focus:ring-2 focus:ring-purple-600 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">ALL ASSIGNMENTS</option>
                <option value="primary">PRIMARY ONLY</option>
                <option value="secondary">SECONDARY ONLY</option>
                <option value="both">BOTH P & S</option>
              </select>
            </div>

            {/* Week Filter */}
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 block px-1">Week Period</label>
              <select
                value={filters.weekFilter}
                onChange={(e) => onFiltersChange({ weekFilter: e.target.value })}
                className="block w-full py-2.5 px-3 text-sm border-0 rounded-xl bg-gray-900 text-white focus:ring-2 focus:ring-purple-600 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">ALL WEEKS</option>
                <option value="1">WEEK 1 (1-7) — {weekStats.week1}</option>
                <option value="2">WEEK 2 (8-14) — {weekStats.week2}</option>
                <option value="3">WEEK 3 (15-21) — {weekStats.week3}</option>
                <option value="4">WEEK 4 (22-31) — {weekStats.week4}</option>
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 block px-1">City Selection</label>
              <select
                value={filters.cityFilter}
                onChange={(e) => onFiltersChange({ cityFilter: e.target.value })}
                className="block w-full py-2.5 px-3 text-sm border-0 rounded-xl bg-gray-900 text-white focus:ring-2 focus:ring-purple-600 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">ALL CITIES</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Footer */}
          <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">
              Showing <span className="text-white">{filteredCount}</span> of <span className="text-white">{totalClients}</span> records
              {filters.searchQuery && <span className="ml-2 text-purple-400 lowercase"> • "{filters.searchQuery}"</span>}
            </div>
            
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-[10px] font-bold rounded-full transition-all border border-red-800/50 uppercase tracking-wider"
              >
                <FaTimes />
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
