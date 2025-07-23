import React from "react"

interface Advocate {
  uid: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  status: string
}

interface ComplaintFiltersProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  dateFilter: string
  setDateFilter: (filter: string) => void
  statusFilter: string
  setStatusFilter: (filter: string) => void
  assignedToFilter: string
  setAssignedToFilter: (filter: string) => void
  issueFilter: string
  setIssueFilter: (filter: string) => void
  advocates: Advocate[]
  totalComplaints: number
  filteredCount: number
  onClearFilters: () => void
}

// Issue types with colors
const ISSUE_TYPES = {
  "NCH": { label: "NCH", color: "bg-red-800 text-red-200" },
  "Harrasement Notice": { label: "Harrasement Notice", color: "bg-orange-800 text-orange-200" },
  "Excessive Flow": { label: "Excessive Flow", color: "bg-yellow-800 text-yellow-200" },
  "RBI/CYBER/NCW": { label: "RBI/CYBER/NCW", color: "bg-purple-800 text-purple-200" }
}

const ComplaintFilters: React.FC<ComplaintFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  dateFilter,
  setDateFilter,
  statusFilter,
  setStatusFilter,
  assignedToFilter,
  setAssignedToFilter,
  issueFilter,
  setIssueFilter,
  advocates,
  totalComplaints,
  filteredCount,
  onClearFilters
}) => {
  const hasActiveFilters = 
    searchQuery !== "" ||
    dateFilter !== "all" ||
    statusFilter !== "all" ||
    assignedToFilter !== "all" ||
    issueFilter !== "all"

  return (
    <div className="mb-6 bg-gray-800 p-4 rounded-lg shadow-md">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
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
            className="block w-full pl-10 pr-3 py-2 border-0 rounded-md bg-gray-700 text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            placeholder="Search by client name, phone, or issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Date Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Date Filter</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="block w-full py-2 px-3 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="lastWeek">Last 7 Days</option>
            <option value="lastMonth">Last 30 Days</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full py-2 px-3 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Assigned To Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Assigned To</label>
          <select
            value={assignedToFilter}
            onChange={(e) => setAssignedToFilter(e.target.value)}
            className="block w-full py-2 px-3 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="all">All Advocates</option>
            {advocates.map((advocate) => (
              <option key={advocate.uid} value={`${advocate.firstName} ${advocate.lastName}`}>
                {advocate.firstName} {advocate.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Issue Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Issue</label>
          <select
            value={issueFilter}
            onChange={(e) => setIssueFilter(e.target.value)}
            className="block w-full py-2 px-3 text-sm border-0 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="all">All Issues</option>
            {Object.entries(ISSUE_TYPES).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Stats and Clear Button */}
        <div className="flex flex-col justify-end">
          <div className="text-gray-400 text-xs mb-2">
            Showing <span className="text-white font-medium">{filteredCount}</span> of{" "}
            <span className="text-white font-medium">{totalComplaints}</span> complaints
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors duration-200"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-400">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-purple-800 text-purple-200 rounded-full text-xs">
                Search: "{searchQuery}"
              </span>
            )}
            {dateFilter !== "all" && (
              <span className="px-2 py-1 bg-blue-800 text-blue-200 rounded-full text-xs">
                Date: {dateFilter}
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="px-2 py-1 bg-green-800 text-green-200 rounded-full text-xs">
                Status: {statusFilter}
              </span>
            )}
            {assignedToFilter !== "all" && (
              <span className="px-2 py-1 bg-yellow-800 text-yellow-200 rounded-full text-xs">
                Assigned: {assignedToFilter}
              </span>
            )}
            {issueFilter !== "all" && (
              <span className={`px-2 py-1 rounded-full text-xs ${ISSUE_TYPES[issueFilter as keyof typeof ISSUE_TYPES]?.color || "bg-gray-800 text-gray-200"}`}>
                Issue: {issueFilter}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ComplaintFilters 